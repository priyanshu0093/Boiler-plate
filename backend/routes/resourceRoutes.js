const express = require('express');
const router = express.Router();
const {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource
} = require('../controllers/resourceController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

router.route('/')
  .get(getResources)
  .post(protect, requireAdmin, createResource);

router.route('/:id')
  .get(getResourceById)
  .patch(protect, requireAdmin, updateResource)
  .delete(protect, requireAdmin, deleteResource);

module.exports = router;
