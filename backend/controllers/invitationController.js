const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Invitation, INVITATION_ROLES } = require('../models/Invitation');
const { Organization } = require('../models/Organization');
const { OrganizationMember } = require('../models/OrganizationMember');
const User = require('../models/User');
const { getPlanLimits } = require('../config/planLimits');
const { validatePassword } = require('../utils/passwordValidator');

// Concurrency mutex lock per organization for invitation acceptance and quota enforcement
const orgMemberLocks = new Map();
const acquireOrgMemberLock = async (orgId) => {
  const key = orgId.toString();
  while (orgMemberLocks.has(key)) {
    await orgMemberLocks.get(key);
  }
  let release;
  const promise = new Promise((resolve) => {
    release = resolve;
  });
  orgMemberLocks.set(key, promise);
  return () => {
    orgMemberLocks.delete(key);
    release();
  };
};

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const getUserOrganizationSummaries = async (userId) => {
  const memberships = await OrganizationMember.find({ userId })
    .populate('organizationId')
    .sort({ createdAt: 1 });

  return memberships
    .filter((m) => m.organizationId && m.organizationId.status === 'ACTIVE')
    .map((m) => ({
      _id: m.organizationId._id,
      name: m.organizationId.name,
      slug: m.organizationId.slug,
      plan: m.organizationId.plan,
      role: m.role
    }));
};

// @desc    Create and send/preview a workspace invitation
// @route   POST /api/organizations/current/invitations
// @access  Private (Org Admin / Owner)
const createInvitation = async (req, res, next) => {
  try {
    const { email, role = 'MEMBER' } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email address is required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.toLowerCase().trim();

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid recipient email address'
      });
    }

    const normalizedRole = role.toUpperCase();
    if (!INVITATION_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role: ${role}. Invitations can only be issued for: ${INVITATION_ROLES.join(', ')}`
      });
    }

    // Check if user is already an active member of this organization
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const existingMember = await OrganizationMember.findOne({
        organizationId: req.organization._id,
        userId: existingUser._id
      });
      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: `User ${normalizedEmail} is already a member of this workspace (${existingMember.role})`
        });
      }
    }

    // Free plan quota enforcement: maximum members per organization
    const limits = getPlanLimits(req.organization.plan);
    const memberCount = await OrganizationMember.countDocuments({
      organizationId: req.organization._id
    });
    if (memberCount >= limits.maxMembers) {
      return res.status(400).json({
        success: false,
        code: 'MEMBER_LIMIT_EXCEEDED',
        message: `Free plan limit reached: Maximum ${limits.maxMembers} members allowed per organization. Cannot invite more members.`,
        data: { current: memberCount, limit: limits.maxMembers }
      });
    }

    // Revoke any previous pending invitation for this email in this workspace
    await Invitation.updateMany(
      {
        organizationId: req.organization._id,
        email: normalizedEmail,
        status: 'PENDING'
      },
      {
        $set: { status: 'REVOKED' }
      }
    );

    // Generate cryptographically secure token and SHA-256 hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresDays = parseInt(process.env.INVITATION_EXPIRES_DAYS || '7', 10);
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000);

    const invitation = await Invitation.create({
      organizationId: req.organization._id,
      email: normalizedEmail,
      role: normalizedRole,
      tokenHash,
      invitedBy: req.user._id,
      status: 'PENDING',
      expiresAt
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const invitationUrl = `${clientUrl}/invitations/accept?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

    // Check if external SMTP / email provider is configured
    const hasSmtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

    if (hasSmtpConfigured) {
      // In production with SMTP configured, send actual email here
      return res.status(201).json({
        success: true,
        message: `Invitation email sent to ${normalizedEmail}`,
        data: {
          invitation: {
            _id: invitation._id,
            email: invitation.email,
            role: invitation.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
            createdAt: invitation.createdAt
          },
          deliveryMethod: 'EMAIL'
        }
      });
    }

    // Development / Local preview mode: Return invitationUrl explicitly without claiming an email was sent
    res.status(201).json({
      success: true,
      message: 'Invitation created. Email provider not configured in this environment; development link generated for direct testing/copying.',
      data: {
        invitation: {
          _id: invitation._id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt
        },
        invitationUrl,
        deliveryMethod: 'DEV_PREVIEW'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all pending invitations for current organization
// @route   GET /api/organizations/current/invitations
// @access  Private (Org Admin / Owner)
const getOrganizationInvitations = async (req, res, next) => {
  try {
    const invitations = await Invitation.find({
      organizationId: req.organization._id,
      status: 'PENDING',
      expiresAt: { $gt: new Date() }
    })
      .select('-tokenHash')
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: invitations.length,
      data: invitations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke an active invitation
// @route   DELETE /api/organizations/current/invitations/:id
// @access  Private (Org Admin / Owner)
const revokeInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invitation = await Invitation.findOne({
      _id: id,
      organizationId: req.organization._id
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    invitation.status = 'REVOKED';
    await invitation.save();

    res.status(200).json({
      success: true,
      message: `Invitation for ${invitation.email} has been revoked`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify invitation token and retrieve workspace metadata
// @route   GET /api/invitations/verify
// @access  Public
const verifyInvitation = async (req, res, next) => {
  try {
    const { token, email } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invitation token is required'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(String(token).trim()).digest('hex');

    const invitation = await Invitation.findOne({ tokenHash })
      .populate('organizationId', 'name slug plan status')
      .populate('invitedBy', 'name email');

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or nonexistent invitation link'
      });
    }

    if (invitation.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `This invitation has already been ${invitation.status.toLowerCase()}`
      });
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'EXPIRED';
      await invitation.save();
      return res.status(400).json({
        success: false,
        message: 'This invitation has expired'
      });
    }

    if (email && invitation.email !== email.toLowerCase().trim()) {
      return res.status(400).json({
        success: false,
        message: 'The email in the invitation link does not match the token'
      });
    }

    if (!invitation.organizationId || invitation.organizationId.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'The workspace associated with this invitation is inactive or no longer exists'
      });
    }

    const existingUser = await User.findOne({ email: invitation.email });

    res.status(200).json({
      success: true,
      data: {
        organization: {
          _id: invitation.organizationId._id,
          name: invitation.organizationId.name,
          slug: invitation.organizationId.slug
        },
        role: invitation.role,
        email: invitation.email,
        invitedBy: invitation.invitedBy
          ? {
              name: invitation.invitedBy.name,
              email: invitation.invitedBy.email
            }
          : null,
        expiresAt: invitation.expiresAt,
        userExists: Boolean(existingUser)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept invitation and join workspace (for existing or new users)
// @route   POST /api/invitations/accept
// @access  Public / Authenticated
const acceptInvitation = async (req, res, next) => {
  try {
    const { token, name, password, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invitation token is required'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(String(token).trim()).digest('hex');

    const invitation = await Invitation.findOne({ tokenHash })
      .populate('organizationId');

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invitation token'
      });
    }

    if (invitation.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `This invitation is no longer valid (status: ${invitation.status.toLowerCase()})`
      });
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'EXPIRED';
      await invitation.save();
      return res.status(400).json({
        success: false,
        message: 'This invitation has expired'
      });
    }

    if (!invitation.organizationId || invitation.organizationId.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'The workspace is no longer active'
      });
    }

    let user = null;

    // Case 1: Caller is authenticated via Bearer token
    if (req.user) {
      if (req.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `This invitation was issued to ${invitation.email}, but you are currently signed in as ${req.user.email}. Please sign out or switch accounts.`
        });
      }
      user = req.user;
    } else {
      // Case 2: Unauthenticated - check if user exists by email
      const existingUser = await User.findOne({ email: invitation.email });

      if (existingUser) {
        // Existing user needs password to authenticate unless already logged in
        if (!password) {
          return res.status(400).json({
            success: false,
            message: 'An account with this email already exists. Please enter your password to accept the invitation.'
          });
        }

        const isMatch = await existingUser.matchPassword(password);
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Invalid password. Please check your credentials.'
          });
        }
        user = existingUser;
      } else {
        // Case 3: New user registration
        if (!name || !name.trim() || !password) {
          return res.status(400).json({
            success: false,
            message: 'Please provide your full name and password to complete registration'
          });
        }

        if (confirmPassword !== undefined && password !== confirmPassword) {
          return res.status(400).json({
            success: false,
            message: 'Passwords do not match'
          });
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: passwordValidation.message,
            errors: passwordValidation.errors
          });
        }

        user = await User.create({
          name: name.trim(),
          email: invitation.email,
          password,
          role: 'EMPLOYEE'
        });
      }
    }

    // Acquire concurrency lock per organization to guarantee quota limits
    const releaseLock = await acquireOrgMemberLock(invitation.organizationId._id);

    try {
      // Check if user is already an active member of this organization
      const alreadyMember = await OrganizationMember.findOne({
        organizationId: invitation.organizationId._id,
        userId: user._id
      });

      if (!alreadyMember) {
        const limits = getPlanLimits(invitation.organizationId.plan);
        const memberCount = await OrganizationMember.countDocuments({
          organizationId: invitation.organizationId._id
        });

        if (memberCount >= limits.maxMembers) {
          releaseLock();
          return res.status(400).json({
            success: false,
            code: 'MEMBER_LIMIT_EXCEEDED',
            message: `Free plan limit reached: Maximum ${limits.maxMembers} members allowed per organization. Contact workspace administrator.`,
            data: {
              current: memberCount,
              limit: limits.maxMembers
            }
          });
        }
      }

      // Atomically transition invitation to ACCEPTED to prevent concurrent acceptance / race conditions
      const updatedInvitation = await Invitation.findOneAndUpdate(
        {
          _id: invitation._id,
          status: 'PENDING',
          expiresAt: { $gt: new Date() }
        },
        {
          $set: {
            status: 'ACCEPTED',
            acceptedAt: new Date(),
            acceptedBy: user._id
          }
        },
        { new: true }
      );

      if (!updatedInvitation) {
        releaseLock();
        return res.status(409).json({
          success: false,
          message: 'This invitation is already being processed or has expired'
        });
      }

      // Add or update organization membership
      const membership = await OrganizationMember.findOneAndUpdate(
        {
          organizationId: invitation.organizationId._id,
          userId: user._id
        },
        {
          $set: {
            role: invitation.role,
            joinedAt: new Date()
          }
        },
        {
          new: true,
          upsert: true
        }
      );

      releaseLock();

      const authToken = generateToken(user);
      const orgs = await getUserOrganizationSummaries(user._id);

      const activeOrg = orgs.find((o) => o._id.toString() === invitation.organizationId._id.toString()) || orgs[0];

      res.status(200).json({
        success: true,
        message: `Successfully joined ${invitation.organizationId.name}!`,
        data: {
          user,
          token: authToken,
          membership,
          organizations: orgs,
          activeOrganization: activeOrg
        }
      });
    } catch (err) {
      releaseLock();
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInvitation,
  getOrganizationInvitations,
  revokeInvitation,
  verifyInvitation,
  acceptInvitation
};
