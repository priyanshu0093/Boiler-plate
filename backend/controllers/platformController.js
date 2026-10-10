const { Organization } = require('../models/Organization');
const { OrganizationMember } = require('../models/OrganizationMember');
const { Resource } = require('../models/Resource');
const { Booking } = require('../models/Booking');
const User = require('../models/User');
const { emitOrganizationSuspended } = require('../socket/socketHandler');

// @desc    Get platform-wide aggregated metrics (Super Admin only)
// @route   GET /api/platform/metrics
// @access  Private (Platform Super Admin only)
const getPlatformMetrics = async (req, res, next) => {
  try {
    const [
      totalOrgs,
      activeOrgs,
      suspendedOrgs,
      totalUsers,
      totalResources,
      totalBookings
    ] = await Promise.all([
      Organization.countDocuments(),
      Organization.countDocuments({ status: 'ACTIVE' }),
      Organization.countDocuments({ status: 'SUSPENDED' }),
      User.countDocuments(),
      Resource.countDocuments(),
      Booking.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalOrganizations: totalOrgs,
        activeOrganizations: activeOrgs,
        suspendedOrganizations: suspendedOrgs,
        totalUsers,
        registeredUsers: totalUsers,
        totalResources,
        totalBookings
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List all organizations with owner details and actual usage counts
// @route   GET /api/platform/organizations
// @access  Private (Platform Super Admin only)
const getPlatformOrganizations = async (req, res, next) => {
  try {
    const organizations = await Organization.find()
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Aggregate actual counts for each organization
    const orgSummaries = await Promise.all(
      organizations.map(async (org) => {
        const [memberCount, resourceCount, bookingCount] = await Promise.all([
          OrganizationMember.countDocuments({ organizationId: org._id }),
          Resource.countDocuments({ organizationId: org._id, isActive: true }),
          Booking.countDocuments({ organizationId: org._id })
        ]);

        return {
          ...org,
          memberCount,
          resourceCount,
          bookingCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: orgSummaries.length,
      data: orgSummaries
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed organization profile & member breakdown
// @route   GET /api/platform/organizations/:id
// @access  Private (Platform Super Admin only)
const getPlatformOrganizationDetails = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id)
      .populate('owner', 'name email')
      .lean();

    if (!org) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    const [members, resources, bookingCount] = await Promise.all([
      OrganizationMember.find({ organizationId: org._id })
        .populate('userId', 'name email department phone')
        .sort({ createdAt: 1 })
        .lean(),
      Resource.find({ organizationId: org._id })
        .select('name category status isActive location')
        .lean(),
      Booking.countDocuments({ organizationId: org._id })
    ]);

    res.status(200).json({
      success: true,
      data: {
        organization: org,
        memberCount: members.length,
        resourceCount: resources.filter((r) => r.isActive).length,
        totalResources: resources.length,
        bookingCount,
        members,
        resources
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Suspend or Reactivate an organization
// @route   PATCH /api/platform/organizations/:id/status
// @access  Private (Platform Super Admin only)
const updateOrganizationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !['ACTIVE', 'SUSPENDED'].includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Permitted values: ACTIVE, SUSPENDED'
      });
    }

    const normalizedStatus = status.toUpperCase();

    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    org.status = normalizedStatus;
    await org.save();

    // If suspended, emit real-time event to disconnect and eject connected sockets from tenant room
    if (normalizedStatus === 'SUSPENDED') {
      emitOrganizationSuspended(org._id);
    }

    res.status(200).json({
      success: true,
      message: `Organization "${org.name}" status updated to ${normalizedStatus}`,
      data: org
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlatformMetrics,
  getPlatformOrganizations,
  getPlatformOrganizationDetails,
  updateOrganizationStatus
};
