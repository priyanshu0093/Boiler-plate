const express = require('express');
const router = express.Router();
const {
  getPlatformMetrics,
  getPlatformOrganizations,
  getPlatformOrganizationDetails,
  updateOrganizationStatus
} = require('../controllers/platformController');
const { protect } = require('../middleware/authMiddleware');
const { requirePlatformAdmin } = require('../middleware/tenantMiddleware');

// All platform routes strictly require authenticated platform Super Admin (user.role === 'ADMIN')
router.use(protect);
router.use(requirePlatformAdmin);

router.get('/metrics', getPlatformMetrics);
router.get('/organizations', getPlatformOrganizations);
router.get('/organizations/:id', getPlatformOrganizationDetails);
router.patch('/organizations/:id/status', updateOrganizationStatus);

module.exports = router;
