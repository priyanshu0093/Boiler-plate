const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Invitation, INVITATION_ROLES } = require('../models/Invitation');
const { Organization } = require('../models/Organization');
const { OrganizationMember } = require('../models/OrganizationMember');
const User = require('../models/User');
const { getPlanLimits } = require('../config/planLimits');
const { validatePassword } = require('../utils/passwordValidator');
const {
  sendInvitationEmail,
  isEmailConfigured,
  getFrontendUrl
} = require('../utils/emailService');

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

    const frontendBaseUrl = getFrontendUrl();
    const invitationUrl = `${frontendBaseUrl}/invitations/accept?token=${rawToken}`;

    // Real email delivery if external SMTP provider is configured
    if (isEmailConfigured()) {
      try {
        await sendInvitationEmail({
          to: normalizedEmail,
          organizationName: req.organization.name,
          inviterName: req.user.name || 'Workspace Administrator',
          role: normalizedRole,
          invitationUrl,
          expiresDays
        });

        // Email successfully delivered: do NOT return raw tokens or invitationUrl
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
      } catch (deliveryError) {
        // Rollback invitation on delivery failure to avoid leaving dead pending invites
        await Invitation.findByIdAndDelete(invitation._id);
        return res.status(502).json({
          success: false,
          message: `Failed to deliver invitation email to ${normalizedEmail}: ${deliveryError.message || 'SMTP delivery failed'}. Please verify SMTP settings.`
        });
      }
    }

    // If SMTP email service is not configured, do not fall back to DEV_PREVIEW
    // Delete created invitation so we don't leave inactive pending invites
    await Invitation.findByIdAndDelete(invitation._id);
    return res.status(503).json({
      success: false,
      message: 'Email service is not configured. Please configure SMTP credentials (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM) in backend/.env to send invitation emails.'
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

    let targetUser = null;
    let isNewUser = false;

    // Case 1: Caller is authenticated via Bearer token
    if (req.user) {
      if (req.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `This invitation was issued to ${invitation.email}, but you are currently signed in as ${req.user.email}. Please sign out or switch accounts.`
        });
      }
      targetUser = req.user;
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
        targetUser = existingUser;
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

        isNewUser = true;
      }
    }

    // Acquire concurrency lock per organization to guarantee quota limits
    const releaseLock = await acquireOrgMemberLock(invitation.organizationId._id);

    try {
      // Check if user is already an active member of this organization (if existing user)
      if (targetUser) {
        const alreadyMember = await OrganizationMember.findOne({
          organizationId: invitation.organizationId._id,
          userId: targetUser._id
        });

        if (alreadyMember) {
          releaseLock();
          return res.status(400).json({
            success: false,
            message: `User is already a member of this workspace (${alreadyMember.role})`
          });
        }
      }

      // Check organization plan limits before mutating database state
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

      // Atomically transition invitation to ACCEPTED to prevent concurrent acceptance / double-use
      const updatedInvitation = await Invitation.findOneAndUpdate(
        {
          _id: invitation._id,
          status: 'PENDING',
          expiresAt: { $gt: new Date() }
        },
        {
          $set: {
            status: 'ACCEPTED',
            acceptedAt: new Date()
          }
        },
        { new: true }
      );

      if (!updatedInvitation) {
        releaseLock();
        return res.status(409).json({
          success: false,
          message: 'This invitation has already been processed or has expired'
        });
      }

      // If new user, create User account now (bcrypt pre-save hook handles password hash)
      let newlyCreatedUser = null;
      if (isNewUser) {
        try {
          newlyCreatedUser = await User.create({
            name: name.trim(),
            email: invitation.email,
            password,
            role: 'EMPLOYEE'
          });
          targetUser = newlyCreatedUser;
        } catch (createUserErr) {
          // Revert invitation status back to PENDING so user can retry without corrupted state
          await Invitation.updateOne(
            { _id: invitation._id },
            { $set: { status: 'PENDING' }, $unset: { acceptedAt: 1 } }
          );
          releaseLock();
          throw createUserErr;
        }
      }

      // Record acceptedBy user reference
      await Invitation.updateOne(
        { _id: invitation._id },
        { $set: { acceptedBy: targetUser._id } }
      );

      // Add organization membership with the role authorized by the invitation
      let membership = null;
      try {
        membership = await OrganizationMember.findOneAndUpdate(
          {
            organizationId: invitation.organizationId._id,
            userId: targetUser._id
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
      } catch (memberErr) {
        // Rollback: delete created user if membership failed to prevent partial state
        if (newlyCreatedUser) {
          await User.findByIdAndDelete(newlyCreatedUser._id);
        }
        await Invitation.updateOne(
          { _id: invitation._id },
          { $set: { status: 'PENDING' }, $unset: { acceptedAt: 1, acceptedBy: 1 } }
        );
        releaseLock();
        throw memberErr;
      }

      releaseLock();

      const authToken = generateToken(targetUser);
      const orgs = await getUserOrganizationSummaries(targetUser._id);
      const activeOrg = orgs.find((o) => o._id.toString() === invitation.organizationId._id.toString()) || orgs[0];

      res.status(200).json({
        success: true,
        message: `Successfully joined ${invitation.organizationId.name}!`,
        data: {
          user: targetUser,
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
