const mongoose = require('mongoose');
const { Organization } = require('../models/Organization');
const { OrganizationMember, MEMBER_ROLES } = require('../models/OrganizationMember');
const User = require('../models/User');

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// @desc    Create a new organization (User becomes OWNER)
// @route   POST /api/organizations
// @access  Private
const createOrganization = async (req, res, next) => {
  try {
    const { name, slug, timezone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required'
      });
    }

    let orgSlug = slug ? generateSlug(slug) : generateSlug(name);
    if (!orgSlug) {
      orgSlug = `org-${Date.now().toString(36)}`;
    }

    // Ensure unique slug
    const existing = await Organization.findOne({ slug: orgSlug });
    if (existing) {
      orgSlug = `${orgSlug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const organization = await Organization.create({
      name: name.trim(),
      slug: orgSlug,
      owner: req.user._id,
      plan: 'FREE',
      status: 'ACTIVE',
      settings: {
        timezone: timezone || 'UTC'
      }
    });

    const membership = await OrganizationMember.create({
      organizationId: organization._id,
      userId: req.user._id,
      role: 'OWNER'
    });

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: {
        organization,
        membership
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all organizations the authenticated user belongs to
// @route   GET /api/organizations
// @access  Private
const getUserOrganizations = async (req, res, next) => {
  try {
    const memberships = await OrganizationMember.find({ userId: req.user._id })
      .populate('organizationId')
      .sort({ createdAt: 1 });

    const organizations = memberships
      .filter((m) => m.organizationId && m.organizationId.status === 'ACTIVE')
      .map((m) => ({
        ...m.organizationId.toObject(),
        memberRole: m.role,
        joinedAt: m.joinedAt
      }));

    res.status(200).json({
      success: true,
      count: organizations.length,
      data: organizations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current active organization details and current user's membership
// @route   GET /api/organizations/current
// @access  Private
const getCurrentOrganization = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        organization: req.organization,
        memberRole: req.orgMember?.role || 'MEMBER',
        isOrgAdmin: req.isOrgAdmin
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current organization settings (Admin / Owner only)
// @route   PATCH /api/organizations/current
// @access  Private (Org Admin / Owner)
const updateCurrentOrganization = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organization._id);
    if (!org) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    const { name, settings } = req.body;

    if (name && name.trim()) {
      org.name = name.trim();
    }

    if (settings && typeof settings === 'object') {
      if (settings.timezone !== undefined) org.settings.timezone = settings.timezone;
      if (settings.bookingGraceMinutes !== undefined) {
        org.settings.bookingGraceMinutes = Math.max(1, Math.min(120, Number(settings.bookingGraceMinutes)));
      }
      if (settings.maxBookingDurationHours !== undefined) {
        org.settings.maxBookingDurationHours = Math.max(1, Math.min(72, Number(settings.maxBookingDurationHours)));
      }
      if (settings.allowGuestBookings !== undefined) {
        org.settings.allowGuestBookings = Boolean(settings.allowGuestBookings);
      }
    }

    await org.save();

    res.status(200).json({
      success: true,
      message: 'Organization settings updated',
      data: org
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List members of current organization
// @route   GET /api/organizations/current/members
// @access  Private (Org Admin / Owner)
const getOrganizationMembers = async (req, res, next) => {
  try {
    const members = await OrganizationMember.find({ organizationId: req.organization._id })
      .populate('userId', 'name email role department phone')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add / invite member to current organization
// @route   POST /api/organizations/current/members
// @access  Private (Org Admin / Owner)
const addOrganizationMember = async (req, res, next) => {
  try {
    const { email, role = 'MEMBER' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'User email is required'
      });
    }

    const normalizedRole = role.toUpperCase();
    if (!MEMBER_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role: ${role}. Allowed roles: ${MEMBER_ROLES.join(', ')}`
      });
    }

    const targetUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: `No user found with email ${email}`
      });
    }

    const existingMember = await OrganizationMember.findOne({
      organizationId: req.organization._id,
      userId: targetUser._id
    });

    if (existingMember) {
      existingMember.role = normalizedRole;
      await existingMember.save();

      return res.status(200).json({
        success: true,
        message: `Member role updated to ${normalizedRole}`,
        data: existingMember
      });
    }

    // Free plan quota enforcement: maximum members per organization
    const { getPlanLimits } = require('../config/planLimits');
    const limits = getPlanLimits(req.organization.plan);
    const currentMemberCount = await OrganizationMember.countDocuments({
      organizationId: req.organization._id
    });

    if (currentMemberCount >= limits.maxMembers) {
      return res.status(400).json({
        success: false,
        code: 'MEMBER_LIMIT_EXCEEDED',
        message: `Free plan limit reached: Maximum ${limits.maxMembers} members allowed per organization.`,
        data: {
          current: currentMemberCount,
          limit: limits.maxMembers
        }
      });
    }

    const newMember = await OrganizationMember.create({
      organizationId: req.organization._id,
      userId: targetUser._id,
      role: normalizedRole
    });

    res.status(201).json({
      success: true,
      message: `User ${email} added to organization as ${normalizedRole}`,
      data: newMember
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a member's role within current organization
// @route   PATCH /api/organizations/current/members/:memberId
// @access  Private (Org Admin / Owner)
const updateMemberRole = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role is required'
      });
    }

    const normalizedRole = role.toUpperCase();
    if (!MEMBER_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role: ${role}. Allowed roles: ${MEMBER_ROLES.join(', ')}`
      });
    }

    const targetMember = await OrganizationMember.findOne({
      _id: memberId,
      organizationId: req.organization._id
    }).populate('userId', 'name email role');

    if (!targetMember) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in this organization'
      });
    }

    const callerRole = req.orgMember?.role || (req.user?.role === 'ADMIN' ? 'OWNER' : 'MEMBER');

    // Only OWNER can promote someone to OWNER or modify an existing OWNER
    if (
      (normalizedRole === 'OWNER' || targetMember.role === 'OWNER') &&
      callerRole !== 'OWNER' &&
      req.user.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace owners can promote or modify owner roles'
      });
    }

    // Prevent demoting the last OWNER
    if (targetMember.role === 'OWNER' && normalizedRole !== 'OWNER') {
      const ownerCount = await OrganizationMember.countDocuments({
        organizationId: req.organization._id,
        role: 'OWNER'
      });
      if (ownerCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the only organization owner. Promote another member to owner first.'
        });
      }
    }

    targetMember.role = normalizedRole;
    await targetMember.save();

    res.status(200).json({
      success: true,
      message: `Member role updated to ${normalizedRole}`,
      data: targetMember
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a member from current organization
// @route   DELETE /api/organizations/current/members/:memberId
// @access  Private (Org Admin / Owner)
const removeOrganizationMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    const targetMember = await OrganizationMember.findOne({
      _id: memberId,
      organizationId: req.organization._id
    });

    if (!targetMember) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in this organization'
      });
    }

    const callerRole = req.orgMember?.role || (req.user?.role === 'ADMIN' ? 'OWNER' : 'MEMBER');

    // Non-owners cannot remove owners
    if (targetMember.role === 'OWNER' && callerRole !== 'OWNER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only workspace owners can remove an owner'
      });
    }

    // Prevent removing the last OWNER
    if (targetMember.role === 'OWNER') {
      const ownerCount = await OrganizationMember.countDocuments({
        organizationId: req.organization._id,
        role: 'OWNER'
      });
      if (ownerCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove the only organization owner'
        });
      }
    }

    await OrganizationMember.findByIdAndDelete(memberId);

    res.status(200).json({
      success: true,
      message: 'Member removed from organization'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrganization,
  getUserOrganizations,
  getCurrentOrganization,
  updateCurrentOrganization,
  getOrganizationMembers,
  addOrganizationMember,
  updateMemberRole,
  removeOrganizationMember
};
