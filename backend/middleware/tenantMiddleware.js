const mongoose = require('mongoose');
const { Organization } = require('../models/Organization');
const { OrganizationMember } = require('../models/OrganizationMember');

/**
 * Helper to retrieve the system default active organization
 */
const getDefaultOrganization = async () => {
  let defaultOrg = await Organization.findOne({ slug: 'deskdrop-hq', status: 'ACTIVE' });
  if (!defaultOrg) {
    defaultOrg = await Organization.findOne({ status: 'ACTIVE' }).sort({ createdAt: 1 });
  }
  return defaultOrg;
};

/**
 * Middleware: Derive authorized organization membership from the authenticated user.
 * Never trust a client-supplied organizationId without verifying membership and permissions.
 */
const resolveTenant = async (req, res, next) => {
  try {
    const rawHint =
      req.headers['x-organization-id'] ||
      req.headers['x-tenant-id'] ||
      req.headers['x-organization-slug'] ||
      req.query.organizationId ||
      req.query.orgSlug;

    let targetOrg = null;

    // 1. If client provided a tenant hint, locate that specific organization
    if (rawHint) {
      if (mongoose.Types.ObjectId.isValid(rawHint)) {
        targetOrg = await Organization.findById(rawHint);
      } else {
        targetOrg = await Organization.findOne({ slug: String(rawHint).toLowerCase().trim() });
      }

      if (!targetOrg) {
        return res.status(404).json({
          success: false,
          message: 'Specified organization not found'
        });
      }

      // If user is authenticated, strictly verify membership
      if (req.user) {
        const membership = await OrganizationMember.findOne({
          userId: req.user._id,
          organizationId: targetOrg._id
        });

        // Platform ADMIN can bypass or access, but normal users MUST have verified membership
        if (!membership && req.user.role !== 'ADMIN') {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You are not an authorized member of this organization'
          });
        }

        req.organization = targetOrg;
        req.orgMember = membership || {
          role: req.user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
          organizationId: targetOrg._id,
          userId: req.user._id
        };
        req.isOrgAdmin =
          (membership && ['OWNER', 'ADMIN'].includes(membership.role)) ||
          req.user.role === 'ADMIN';

        // Suspended organization policy: block all mutations/writes while allowing read access for existing sessions
        if (targetOrg.status === 'SUSPENDED' && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
          return res.status(403).json({
            success: false,
            code: 'ORGANIZATION_SUSPENDED',
            message: 'This organization is suspended. All write actions, resource creation, and bookings are prohibited.'
          });
        }

        return next();
      }

      // For unauthenticated requests: block write actions on suspended organizations
      if (targetOrg.status === 'SUSPENDED' && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
        return res.status(403).json({
          success: false,
          code: 'ORGANIZATION_SUSPENDED',
          message: 'This organization is suspended. Write operations are disabled.'
        });
      }

      // For unauthenticated requests with a valid org hint (e.g., public catalog view)
      req.organization = targetOrg;
      return next();
    }

    // 2. If NO tenant hint was supplied, derive from authenticated user
    if (req.user) {
      const primaryMembership = await OrganizationMember.findOne({
        userId: req.user._id
      }).populate('organizationId');

      if (
        primaryMembership &&
        primaryMembership.organizationId &&
        primaryMembership.organizationId.status === 'ACTIVE'
      ) {
        req.organization = primaryMembership.organizationId;
        req.orgMember = primaryMembership;
        req.isOrgAdmin =
          ['OWNER', 'ADMIN'].includes(primaryMembership.role) || req.user.role === 'ADMIN';
        return next();
      }

      // User has no membership record yet - link to default organization for backward compatibility
      const defaultOrg = await getDefaultOrganization();
      if (defaultOrg) {
        const role = req.user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
        const newMembership = await OrganizationMember.findOneAndUpdate(
          { organizationId: defaultOrg._id, userId: req.user._id },
          { $setOnInsert: { organizationId: defaultOrg._id, userId: req.user._id, role } },
          { new: true, upsert: true }
        );

        req.organization = defaultOrg;
        req.orgMember = newMembership;
        req.isOrgAdmin = ['OWNER', 'ADMIN'].includes(role) || req.user.role === 'ADMIN';
        return next();
      }
    }

    // 3. Fallback for unauthenticated requests (e.g. public availability or resources)
    const defaultOrg = await getDefaultOrganization();
    if (defaultOrg) {
      req.organization = defaultOrg;
      return next();
    }

    return res.status(400).json({
      success: false,
      message: 'No active organization found. Please run database migration or specify organization.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Require Organization Admin or Owner role
 */
const requireTenantAdmin = (req, res, next) => {
  if (req.isOrgAdmin || (req.user && req.user.role === 'ADMIN')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied: Organization admin or owner role required'
  });
};

/**
 * Middleware: Require Organization Owner role
 */
const requireTenantOwner = (req, res, next) => {
  if (
    (req.orgMember && req.orgMember.role === 'OWNER') ||
    (req.user && req.user.role === 'ADMIN')
  ) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied: Organization owner role required'
  });
};

/**
 * Middleware: Require Platform Super Admin role (user.role === 'ADMIN')
 * Distinct from organization/tenant admin (orgMember.role === 'ADMIN')
 */
const requirePlatformAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    return next();
  }
  return res.status(403).json({
    success: false,
    code: 'PLATFORM_ADMIN_REQUIRED',
    message: 'Access denied: Platform Super Admin role required'
  });
};

module.exports = {
  getDefaultOrganization,
  resolveTenant,
  requireTenantAdmin,
  requireTenantOwner,
  requirePlatformAdmin
};
