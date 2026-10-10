const express = require('express');
const router = express.Router();
const {
  verifyInvitation,
  acceptInvitation
} = require('../controllers/invitationController');
const { optionalProtect } = require('../middleware/authMiddleware');

// Public route to verify invitation token & check user existence
router.get('/verify', verifyInvitation);

// Accept invitation: optionalProtect allows logged-in users to accept with existing session
router.post('/accept', optionalProtect, acceptInvitation);

module.exports = router;
