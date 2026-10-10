const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Organization } = require('../models/Organization');
const { OrganizationMember } = require('../models/OrganizationMember');
const { validatePassword } = require('../utils/passwordValidator');

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

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// @desc    Register a new employee
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, organizationName } = req.body;

    if (!name || !name.trim() || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.toLowerCase().trim();

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
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

    // Check if user already exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An employee with this email already exists'
      });
    }

    // Safe creation with cleanup rollback to avoid orphaned records
    let user = null;
    let createdOrg = null;
    let createdMember = null;

    try {
      // Strictly enforce role: 'EMPLOYEE' - never trust client input
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        role: 'EMPLOYEE'
      });

      if (organizationName && organizationName.trim()) {
        let baseSlug = generateSlug(organizationName.trim()) || 'workspace';
        let orgSlug = baseSlug;
        const existingOrg = await Organization.findOne({ slug: orgSlug });
        if (existingOrg) {
          orgSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
        }

        createdOrg = await Organization.create({
          name: organizationName.trim(),
          slug: orgSlug,
          owner: user._id,
          plan: 'FREE',
          status: 'ACTIVE',
          settings: { timezone: 'UTC' }
        });

        createdMember = await OrganizationMember.create({
          organizationId: createdOrg._id,
          userId: user._id,
          role: 'OWNER'
        });
      } else {
        // Automatically associate new user with default organization if available (legacy fallback)
        let defaultOrg = await Organization.findOne({ slug: 'deskdrop-hq', status: 'ACTIVE' });
        if (!defaultOrg) {
          defaultOrg = await Organization.findOne({ status: 'ACTIVE' }).sort({ createdAt: 1 });
        }
        if (defaultOrg) {
          createdMember = await OrganizationMember.create({
            organizationId: defaultOrg._id,
            userId: user._id,
            role: 'MEMBER'
          });
        }
      }
    } catch (creationError) {
      // Safe cleanup rollback on any creation failure
      if (createdMember) {
        await OrganizationMember.findByIdAndDelete(createdMember._id).catch(() => {});
      }
      if (createdOrg) {
        await Organization.findByIdAndDelete(createdOrg._id).catch(() => {});
      }
      if (user) {
        await User.findByIdAndDelete(user._id).catch(() => {});
      }
      throw creationError;
    }

    const token = generateToken(user);
    const orgs = await getUserOrganizationSummaries(user._id);

    res.status(201).json({
      success: true,
      message: 'Employee account created successfully',
      data: {
        user,
        token,
        organizations: orgs,
        activeOrganization: orgs[0] || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate employee & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user);
    const orgs = await getUserOrganizationSummaries(user._id);

    res.status(200).json({
      success: true,
      data: {
        user,
        token,
        organizations: orgs,
        activeOrganization: orgs[0] || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current authenticated user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const orgs = await getUserOrganizationSummaries(user._id);

    res.status(200).json({
      success: true,
      data: {
        user,
        organizations: orgs,
        activeOrganization: orgs[0] || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile
// @route   PATCH /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { name, phone, department } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty'
        });
      }
      if (name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot exceed 100 characters'
        });
      }
      user.name = name.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone format'
        });
      }
      const trimmedPhone = phone.trim();
      if (trimmedPhone.length > 30) {
        return res.status(400).json({
          success: false,
          message: 'Phone number cannot exceed 30 characters'
        });
      }
      user.phone = trimmedPhone;
    }

    if (department !== undefined) {
      if (typeof department !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid department format'
        });
      }
      const trimmedDept = department.trim();
      if (trimmedDept.length > 80) {
        return res.status(400).json({
          success: false,
          message: 'Department cannot exceed 80 characters'
        });
      }
      user.department = trimmedDept;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};
