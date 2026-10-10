const express = require('express');
const router = express.Router();
const {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource
} = require('../controllers/resourceController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const { resolveTenant, requireTenantAdmin } = require('../middleware/tenantMiddleware');

router.route('/')
  .get(optionalProtect, resolveTenant, getResources)
  .post(protect, resolveTenant, requireTenantAdmin, createResource);

router.route('/:id')
  .get(optionalProtect, resolveTenant, getResourceById)
  .patch(protect, resolveTenant, requireTenantAdmin, updateResource)
  .delete(protect, resolveTenant, requireTenantAdmin, deleteResource);

module.exports = router;
