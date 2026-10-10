const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

const API_BASE = 'http://localhost:5000/api';

async function apiRequest(endpoint, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runPasswordValidationTests() {
  console.log('================================================================');
  console.log('DESKDROP STRONG PASSWORD VALIDATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      if (details) console.error('   Details:', details);
      failed++;
    }
  }

  const timestamp = Date.now();

  try {
    // -------------------------------------------------------------
    // TEST 1: Missing uppercase letter
    // -------------------------------------------------------------
    console.log('[Test 1] Missing uppercase letter...');
    const noUpperEmail = `no.upper.${timestamp}@deskdrop.internal`;
    const resNoUpper = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'No Upper User',
        email: noUpperEmail,
        password: 'password123!',
        confirmPassword: 'password123!'
      }
    });
    assert(resNoUpper.status === 400, 'Registration rejected when password lacks uppercase letter (400)');
    assert(resNoUpper.data.success === false, 'Response indicates success: false');
    assert(
      resNoUpper.data.message && resNoUpper.data.message.toLowerCase().includes('uppercase'),
      'Error message explicitly specifies missing uppercase requirement'
    );

    // -------------------------------------------------------------
    // TEST 2: Missing lowercase letter
    // -------------------------------------------------------------
    console.log('\n[Test 2] Missing lowercase letter...');
    const noLowerEmail = `no.lower.${timestamp}@deskdrop.internal`;
    const resNoLower = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'No Lower User',
        email: noLowerEmail,
        password: 'PASSWORD123!',
        confirmPassword: 'PASSWORD123!'
      }
    });
    assert(resNoLower.status === 400, 'Registration rejected when password lacks lowercase letter (400)');
    assert(
      resNoLower.data.message && resNoLower.data.message.toLowerCase().includes('lowercase'),
      'Error message explicitly specifies missing lowercase requirement'
    );

    // -------------------------------------------------------------
    // TEST 3: Missing number
    // -------------------------------------------------------------
    console.log('\n[Test 3] Missing number...');
    const noNumberEmail = `no.number.${timestamp}@deskdrop.internal`;
    const resNoNumber = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'No Number User',
        email: noNumberEmail,
        password: 'Password!@#',
        confirmPassword: 'Password!@#'
      }
    });
    assert(resNoNumber.status === 400, 'Registration rejected when password lacks numbers (400)');
    assert(
      resNoNumber.data.message && resNoNumber.data.message.toLowerCase().includes('number'),
      'Error message explicitly specifies missing number requirement'
    );

    // -------------------------------------------------------------
    // TEST 4: Missing special character
    // -------------------------------------------------------------
    console.log('\n[Test 4] Missing special character...');
    const noSpecialEmail = `no.special.${timestamp}@deskdrop.internal`;
    const resNoSpecial = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'No Special User',
        email: noSpecialEmail,
        password: 'Password123',
        confirmPassword: 'Password123'
      }
    });
    assert(resNoSpecial.status === 400, 'Registration rejected when password lacks special character (400)');
    assert(
      resNoSpecial.data.message && resNoSpecial.data.message.toLowerCase().includes('special'),
      'Error message explicitly specifies missing special character requirement'
    );

    // -------------------------------------------------------------
    // TEST 5: Password shorter than 8 characters
    // -------------------------------------------------------------
    console.log('\n[Test 5] Password shorter than 8 characters...');
    const shortEmail = `short.${timestamp}@deskdrop.internal`;
    const resShort = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Short Pass User',
        email: shortEmail,
        password: 'Ab1!xyz', // 7 chars
        confirmPassword: 'Ab1!xyz'
      }
    });
    assert(resShort.status === 400, 'Registration rejected when password has fewer than 8 characters (400)');
    assert(
      resShort.data.message && resShort.data.message.includes('8'),
      'Error message explicitly specifies minimum length of 8 characters'
    );

    // -------------------------------------------------------------
    // TEST 6: A valid password meeting all requirements
    // -------------------------------------------------------------
    console.log('\n[Test 6] Valid password meeting all requirements...');
    const validEmail = `valid.strong.${timestamp}@deskdrop.internal`;
    const validPlainPassword = 'StrongDeskDrop#2026!';
    const resValid = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Strong Password User',
        email: validEmail,
        password: validPlainPassword,
        confirmPassword: validPlainPassword,
        organizationName: `Security Corp ${timestamp}`
      }
    });
    assert(resValid.status === 201, 'Registration succeeds with 201 Created for valid password');
    assert(resValid.data.success === true, 'Response indicates success: true');
    assert(!!resValid.data.data?.token, 'JWT authentication token returned on successful registration');
    assert(resValid.data.data?.user?.email === validEmail, 'Registered user returned in response');
    assert(resValid.data.data?.user?.password === undefined, 'Password is not exposed in API response');
    const validUserToken = resValid.data.data?.token;

    // -------------------------------------------------------------
    // TEST 7: Invitation acceptance with invalid passwords
    // -------------------------------------------------------------
    console.log('\n[Test 7] Invitation acceptance with invalid passwords...');
    // Create an invitation using the valid user account
    const inviteeEmail = `invitee.${timestamp}@deskdrop.internal`;
    const inviteRes = await apiRequest('/organizations/current/invitations', {
      method: 'POST',
      token: validUserToken,
      body: {
        email: inviteeEmail,
        role: 'MEMBER'
      }
    });
    assert(inviteRes.status === 201, 'Invitation created successfully (201)');
    const inviteUrl = inviteRes.data.data?.invitationUrl;
    const rawToken = inviteRes.data.data?.invitation?.token || new URL(inviteUrl).searchParams.get('token');
    assert(!!rawToken, 'Extracted invitation token for recipient');

    // Attempt to accept invitation with an invalid password (e.g. no special char)
    const invalidAcceptRes = await apiRequest('/invitations/accept', {
      method: 'POST',
      body: {
        token: rawToken,
        name: 'New Invitee',
        password: 'InvalidPassword123',
        confirmPassword: 'InvalidPassword123'
      }
    });
    assert(
      invalidAcceptRes.status === 400,
      'Invitation acceptance with weak password rejected with 400 Bad Request'
    );
    assert(
      invalidAcceptRes.data.success === false,
      'Invitation acceptance failure returns success: false'
    );

    // Accept invitation with a valid strong password
    const validAcceptPassword = 'InviteePassword999$';
    const validAcceptRes = await apiRequest('/invitations/accept', {
      method: 'POST',
      body: {
        token: rawToken,
        name: 'New Invitee',
        password: validAcceptPassword,
        confirmPassword: validAcceptPassword
      }
    });
    assert(
      validAcceptRes.status === 200,
      'Invitation acceptance with strong password succeeds with 200 OK'
    );
    assert(
      !!validAcceptRes.data.data?.token,
      'JWT token issued for newly registered invited employee'
    );

    // -------------------------------------------------------------
    // TEST 8: Existing users logging in with current credentials
    // -------------------------------------------------------------
    console.log('\n[Test 8] Existing users logging in with current passwords...');
    // Seeded accounts have existing password "password123" (does not satisfy new complexity rules)
    const seededEmployeeLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: {
        email: 'alex.chen@deskdrop.internal',
        password: 'password123'
      }
    });
    assert(
      seededEmployeeLogin.status === 200,
      'Existing seeded employee with legacy password successfully logs in (200 OK)'
    );
    assert(
      !!seededEmployeeLogin.data.data?.token,
      'JWT token returned for existing account with legacy password'
    );

    const seededAdminLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@deskdrop.internal',
        password: 'password123'
      }
    });
    assert(
      seededAdminLogin.status === 200,
      'Existing seeded admin with legacy password successfully logs in (200 OK)'
    );

    // Also verify that newly registered user can log in with their strong password
    const strongLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: {
        email: validEmail,
        password: validPlainPassword
      }
    });
    assert(strongLogin.status === 200, 'User with strong password logs in successfully (200 OK)');

    // -------------------------------------------------------------
    // TEST 9: Confirming passwords are hashed before storage
    // -------------------------------------------------------------
    console.log('\n[Test 9] Confirming passwords are hashed before storage in database...');
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/deskdrop';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    const storedUser = await User.findOne({ email: validEmail });
    assert(!!storedUser, 'Queried registered user record directly from database');
    assert(
      storedUser.password !== validPlainPassword,
      'Database stored password is NOT plain text'
    );
    assert(
      storedUser.password.startsWith('$2a$') || storedUser.password.startsWith('$2b$'),
      `Stored password is valid bcrypt hash format (${storedUser.password.substring(0, 7)}...)`
    );
    assert(
      storedUser.password.length === 60,
      'Stored password hash is standard 60-character bcrypt hash'
    );

    const isBcryptMatch = await bcrypt.compare(validPlainPassword, storedUser.password);
    assert(isBcryptMatch, 'Bcrypt compare verifies stored hash matches plain-text password');

    const isWrongMatch = await bcrypt.compare('WrongPassword123!', storedUser.password);
    assert(!isWrongMatch, 'Bcrypt compare rejects incorrect password against stored hash');

    // Confirm toJSON() method omits password
    const jsonUser = storedUser.toJSON();
    assert(jsonUser.password === undefined, 'User toJSON() cleanly omits password field');

    await mongoose.disconnect();

    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unhandled test exception:', err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
}

runPasswordValidationTests();
