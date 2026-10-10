const mongoose = require('mongoose');
const { Resource, RESOURCE_CATEGORIES, RESOURCE_STATUSES } = require('../models/Resource');
const { Booking } = require('../models/Booking');
const { emitResourceStatusChanged } = require('../socket/socketHandler');
const { getPlanLimits } = require('../config/planLimits');

// Concurrency mutex lock per organization for resource creation and quota enforcement
const orgResourceLocks = new Map();
const acquireOrgResourceLock = async (orgId) => {
  const key = orgId.toString();
  while (orgResourceLocks.has(key)) {
    await orgResourceLocks.get(key);
  }
  let release;
  const promise = new Promise((resolve) => {
    release = resolve;
  });
  orgResourceLocks.set(key, promise);
  return () => {
    orgResourceLocks.delete(key);
    release();
  };
};

// @desc    Get all resources with optional filtering (scoped to tenant organization)
// @route   GET /api/resources
// @access  Public (or authenticated)
const getResources = async (req, res, next) => {
  try {
    const { category, status, search, includeInactive } = req.query;

    const query = {
      organizationId: req.organization._id
    };

    // Default to active resources unless specifically requested
    if (includeInactive !== 'true') {
      query.isActive = true;
    }

    if (category) {
      const upperCategory = category.toUpperCase();
      if (RESOURCE_CATEGORIES.includes(upperCategory)) {
        query.category = upperCategory;
      } else {
        return res.status(400).json({
          success: false,
          message: `Invalid category filter: ${category}. Allowed categories: ${RESOURCE_CATEGORIES.join(', ')}`
        });
      }
    }

    if (status) {
      const upperStatus = status.toUpperCase();
      if (RESOURCE_STATUSES.includes(upperStatus)) {
        query.status = upperStatus;
      } else {
        return res.status(400).json({
          success: false,
          message: `Invalid status filter: ${status}. Allowed statuses: ${RESOURCE_STATUSES.join(', ')}`
        });
      }
    }

    if (search) {
      query.$and = [
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    const resources = await Resource.find(query).sort({ category: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: resources.length,
      data: resources
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single resource by ID (scoped to tenant organization)
// @route   GET /api/resources/:id
// @access  Public (or authenticated)
const getResourceById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID format'
      });
    }

    const resource = await Resource.findOne({
      _id: req.params.id,
      organizationId: req.organization._id
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Include upcoming active/confirmed bookings for schedule visibility within tenant
    const upcomingBookings = await Booking.find({
      resourceId: resource._id,
      organizationId: req.organization._id,
      status: { $in: ['CONFIRMED', 'ACTIVE'] },
      endTime: { $gt: new Date() }
    })
      .select('startTime endTime status purpose userId')
      .populate('userId', 'name email')
      .sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      data: {
        resource,
        upcomingBookings
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new resource (scoped to tenant organization)
// @route   POST /api/resources
// @access  Private (Org Admin / Owner / Platform Admin)
const createResource = async (req, res, next) => {
  const releaseLock = await acquireOrgResourceLock(req.organization._id);

  try {
    const { name, category, description, location, image, specifications, status } = req.body;

    if (!name || !category || !description || !location) {
      releaseLock();
      return res.status(400).json({
        success: false,
        message: 'Please provide name, category, description, and location'
      });
    }

    const upperCategory = category.toUpperCase();
    if (!RESOURCE_CATEGORIES.includes(upperCategory)) {
      releaseLock();
      return res.status(400).json({
        success: false,
        message: `Invalid category: ${category}. Allowed categories: ${RESOURCE_CATEGORIES.join(', ')}`
      });
    }

    // Free plan quota enforcement: maximum active resources per organization
    const limits = getPlanLimits(req.organization.plan);
    const activeCount = await Resource.countDocuments({
      organizationId: req.organization._id,
      isActive: true
    });

    if (activeCount >= limits.maxResources) {
      releaseLock();
      return res.status(400).json({
        success: false,
        code: 'RESOURCE_LIMIT_EXCEEDED',
        message: `Free plan limit reached: Maximum ${limits.maxResources} active resources allowed per organization. Deactivate an existing resource to add more.`,
        data: {
          current: activeCount,
          limit: limits.maxResources
        }
      });
    }

    let initialStatus = 'AVAILABLE';
    if (status) {
      const upperStatus = status.toUpperCase();
      if (!RESOURCE_STATUSES.includes(upperStatus)) {
        releaseLock();
        return res.status(400).json({
          success: false,
          message: `Invalid status: ${status}. Allowed statuses: ${RESOURCE_STATUSES.join(', ')}`
        });
      }
      initialStatus = upperStatus;
    }

    const resource = await Resource.create({
      organizationId: req.organization._id,
      name: name.trim(),
      category: upperCategory,
      description: description.trim(),
      location: location.trim(),
      image: image || '',
      specifications: specifications || {},
      status: initialStatus,
      isActive: true
    });

    releaseLock();

    res.status(201).json({
      success: true,
      data: resource
    });
  } catch (error) {
    releaseLock();
    next(error);
  }
};

// @desc    Update resource details or status (scoped to tenant organization)
// @route   PATCH /api/resources/:id
// @access  Private (Org Admin / Owner / Platform Admin)
const updateResource = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID format'
      });
    }

    const resource = await Resource.findOne({
      _id: req.params.id,
      organizationId: req.organization._id
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    const { name, category, description, location, image, specifications, status, isActive } = req.body;

    // If reactivating an inactive resource, enforce plan limits
    if (isActive === true && resource.isActive === false) {
      const limits = getPlanLimits(req.organization.plan);
      const activeCount = await Resource.countDocuments({
        organizationId: req.organization._id,
        isActive: true
      });

      if (activeCount >= limits.maxResources) {
        return res.status(400).json({
          success: false,
          code: 'RESOURCE_LIMIT_EXCEEDED',
          message: `Free plan limit reached: Maximum ${limits.maxResources} active resources allowed per organization. Deactivate an existing resource before reactivating this one.`,
          data: {
            current: activeCount,
            limit: limits.maxResources
          }
        });
      }
    }

    if (name) resource.name = name.trim();
    if (description) resource.description = description.trim();
    if (location) resource.location = location.trim();
    if (image !== undefined) resource.image = image;
    if (specifications !== undefined) resource.specifications = specifications;
    if (isActive !== undefined) resource.isActive = isActive;

    if (category) {
      const upperCategory = category.toUpperCase();
      if (!RESOURCE_CATEGORIES.includes(upperCategory)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category: ${category}. Allowed categories: ${RESOURCE_CATEGORIES.join(', ')}`
        });
      }
      resource.category = upperCategory;
    }

    let statusChanged = false;
    if (status) {
      const upperStatus = status.toUpperCase();
      if (!RESOURCE_STATUSES.includes(upperStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status: ${status}. Allowed statuses: ${RESOURCE_STATUSES.join(', ')}`
        });
      }

      if (upperStatus !== resource.status) {
        resource.status = upperStatus;
        statusChanged = true;
      }
    }

    await resource.save();

    if (statusChanged) {
      emitResourceStatusChanged({
        organizationId: req.organization._id,
        resourceId: resource._id,
        status: resource.status,
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      data: resource
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete or deactivate a resource (scoped to tenant organization)
// @route   DELETE /api/resources/:id
// @access  Private (Org Admin / Owner / Platform Admin)
const deleteResource = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID format'
      });
    }

    const resource = await Resource.findOne({
      _id: req.params.id,
      organizationId: req.organization._id
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Check if there are active or upcoming bookings within this tenant
    const activeBooking = await Booking.findOne({
      resourceId: resource._id,
      organizationId: req.organization._id,
      status: { $in: ['CONFIRMED', 'ACTIVE'] },
      endTime: { $gt: new Date() }
    });

    if (activeBooking) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete resource with active or upcoming bookings. Cancel those bookings first or deactivate the resource.'
      });
    }

    // Soft delete to preserve historical integrity
    resource.isActive = false;
    await resource.save();

    res.status(200).json({
      success: true,
      message: 'Resource successfully deactivated',
      data: resource
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource
};
