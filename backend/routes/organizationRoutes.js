const express = require('express');
const router = express.Router();
const {
  createOrganization,
  getUserOrganizations,
  getCurrentOrganization,
  updateCurrentOrganization,
  getOrganizationMembers,
  addOrganizationMember,
  updateMemberRole,
  removeOrganizationMember
} = require('../controllers/organizationController');
const {
  createInvitation,
  getOrganizationInvitations,
  revokeInvitation
} = require('../controllers/invitationController');
const { protect } = require('../middleware/authMiddleware');
const { resolveTenant, requireTenantAdmin } = require('../middleware/tenantMiddleware');

// All organization routes require authenticated user
router.use(protect);

router.post('/', createOrganization);
router.get('/', getUserOrganizations);

// Current tenant operations
router.get('/current', resolveTenant, getCurrentOrganization);
router.patch('/current', resolveTenant, requireTenantAdmin, updateCurrentOrganization);

// Current tenant members management
router.get('/current/members', resolveTenant, requireTenantAdmin, getOrganizationMembers);
router.post('/current/members', resolveTenant, requireTenantAdmin, addOrganizationMember);
router.patch('/current/members/:memberId', resolveTenant, requireTenantAdmin, updateMemberRole);
router.delete('/current/members/:memberId', resolveTenant, requireTenantAdmin, removeOrganizationMember);

// Current tenant invitations management
router.get('/current/invitations', resolveTenant, requireTenantAdmin, getOrganizationInvitations);
router.post('/current/invitations', resolveTenant, requireTenantAdmin, createInvitation);
router.delete('/current/invitations/:id', resolveTenant, requireTenantAdmin, revokeInvitation);

module.exports = router;
