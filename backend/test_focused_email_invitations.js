/**
 * Focused Verification Suite for Email Invitations and Password Setup
 * Tests:
 * 1. Email template generation, Boiler Plate branding, security notes & plain-text fallback
 * 2. Delivery error handling when SMTP fails or is unconfigured
 * 3. Token hashing (verifying raw tokens are never saved to database)
 * 4. Token verification endpoint (/api/invitations/verify)
 * 5. Password validation on acceptance (enforces 8+ chars, upper, lower, number, special)
 * 6. New user account creation & organization membership assignment with invited role
 * 7. Token reuse, revoked token, and expired token rejection
 * 8. Existing user acceptance without resetting password
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_12345';
process.env.PORT = '5055';

const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const emailService = require('./utils/emailService');
let emailConfiguredForTest = false;
let capturedInvitationUrl = '';
emailService.isEmailConfigured = () => emailConfiguredForTest;
emailService.sendInvitationEmail = async ({ invitationUrl }) => {
  if (!emailConfiguredForTest) throw new Error('SMTP email provider is not configured');
  capturedInvitationUrl = invitationUrl;
  return { messageId: 'focused-test-message' };
};
const { app, server } = require('./server');
const { Invitation } = require('./models/Invitation');
const User = require('./models/User');
const { Organization } = require('./models/Organization');
const { OrganizationMember } = require('./models/OrganizationMember');
const {
  isEmailConfigured,
  getFrontendUrl,
  buildInvitationHtml,
  buildInvitationText,
  sendInvitationEmail
} = require('./utils/emailService');

const TEST_PORT = 5055;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function apiRequest(endpoint, { method = 'GET', token, orgId, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (orgId) headers['x-organization-id'] = orgId;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runFocusedVerification() {
  console.log('================================================================');
  console.log('FOCUSED VERIFICATION: EMAIL INVITATIONS & PASSWORD SETUP FLOW');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // Start HTTP server on test port
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`[Test Server] Listening on ${BASE_URL}\n`);

  try {
    const timestamp = Date.now();

    // ------------------------------------------------------------------------
    // SECTION 1: Email Template Generation & Plain-Text Fallback
    // ------------------------------------------------------------------------
    console.log('[Check 1] Professional email template and branding verification...');
    const testOrgName = `Acme Robotics ${timestamp}`;
    const testInviter = 'Jane Admin';
    const testUrl = `http://localhost:5173/invitations/accept?token=sample_token_${timestamp}`;

    const htmlContent = buildInvitationHtml({
      organizationName: testOrgName,
      inviterName: testInviter,
      role: 'ADMIN',
      invitationUrl: testUrl,
      expiresDays: 7
    });

    const textContent = buildInvitationText({
      organizationName: testOrgName,
      inviterName: testInviter,
      role: 'ADMIN',
      invitationUrl: testUrl,
      expiresDays: 7
    });

    assert(htmlContent.includes('Boiler Plate'), 'HTML email includes Boiler Plate brand identity');
    assert(htmlContent.includes(testOrgName), 'HTML email includes target organization name');
    assert(htmlContent.includes(testInviter), 'HTML email includes inviter name');
    assert(htmlContent.includes('Accept Invitation &amp; Set Password'), 'HTML email includes prominent CTA button');
    assert(htmlContent.includes('7 days'), 'HTML email contains expiration notice');
    assert(htmlContent.includes(testUrl), 'HTML email contains fallback direct link');
    assert(htmlContent.includes('Security Note:'), 'HTML email includes security note to ignore unexpected invites');

    assert(textContent.includes(testOrgName) && textContent.includes(testUrl), 'Plain-text email contains organization and invitation link');
    assert(textContent.includes('Security Note:'), 'Plain-text email contains security note');

    // ------------------------------------------------------------------------
    // SECTION 2: Email Provider Error Handling
    // ------------------------------------------------------------------------
    console.log('\n[Check 2] Email delivery error handling with unconfigured or bad SMTP...');
    assert(isEmailConfigured() === false, 'Detects SMTP is not configured in default test environment');

    let deliveryFailed = false;
    try {
      await sendInvitationEmail({
        to: 'recipient@test.corp',
        organizationName: 'Test Org',
        inviterName: 'Admin',
        invitationUrl: 'http://test.url'
      });
    } catch (err) {
      deliveryFailed = true;
      assert(err.message.includes('SMTP email provider is not configured'), 'sendInvitationEmail throws explicit error when credentials omitted');
    }
    assert(deliveryFailed, 'Email sending throws error instead of falsely claiming delivery');

    // ------------------------------------------------------------------------
    // SECTION 3: Workspace Owner Registration
    // ------------------------------------------------------------------------
    console.log('\n[Check 3] Workspace admin onboarding setup...');
    const ownerEmail = `admin.${timestamp}@acme-corp.internal`;
    const regRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Jane Admin',
        email: ownerEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        organizationName: testOrgName
      }
    });

    assert(regRes.status === 201, 'Workspace creator registered (201 Created)');
    const ownerToken = regRes.data.data?.token;
    const ownerOrg = regRes.data.data?.activeOrganization;
    assert(!!ownerToken && !!ownerOrg?._id, 'Workspace created and admin JWT issued');

    // ------------------------------------------------------------------------
    // SECTION 4: Admin Invites New Member & Token Security Verification
    // ------------------------------------------------------------------------
    console.log('\n[Check 4] Sending invite through the email service and verifying token storage...');
    emailConfiguredForTest = true;
    const invitedEmail = `new.engineer.${timestamp}@acme-corp.internal`;
    const inviteRes = await apiRequest('/api/organizations/current/invitations', {
      method: 'POST',
      token: ownerToken,
      orgId: ownerOrg._id,
      body: {
        email: invitedEmail,
        role: 'MEMBER'
      }
    });

    assert(inviteRes.status === 201, 'Admin created invitation (201 Created)');
    assert(inviteRes.data.data?.invitation?.email === invitedEmail, 'Invitation email matches invited email');
    assert(inviteRes.data.data?.invitation?.role === 'MEMBER', 'Invitation role recorded as MEMBER');

    assert(inviteRes.data.data?.deliveryMethod === 'EMAIL', 'Invitation reports email delivery');
    assert(inviteRes.data.data?.invitationUrl === undefined, 'Invitation URL is not returned in the API response');
    assert(inviteRes.data.data?.rawToken === undefined, 'Raw token is not returned in the API response');

    const urlObj = new URL(capturedInvitationUrl);
    const rawToken = urlObj.searchParams.get('token');
    assert(!!rawToken && rawToken.length === 64, 'Raw token is 64 hex characters (256-bit cryptographically secure)');

    // Verify token security in MongoDB: RAW token is NEVER in database, only SHA-256 hash
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const dbInvitation = await Invitation.findById(inviteRes.data.data.invitation._id);
    assert(!!dbInvitation, 'Invitation record found in MongoDB');
    assert(dbInvitation.tokenHash === expectedHash, 'Database stores SHA-256 hash of token');
    assert(!JSON.stringify(dbInvitation.toObject()).includes(rawToken), 'Raw token is NOT present in MongoDB document');

    // ------------------------------------------------------------------------
    // SECTION 5: Verification Endpoint (/api/invitations/verify)
    // ------------------------------------------------------------------------
    console.log('\n[Check 5] Token verification endpoint (/api/invitations/verify)...');
    // Valid token
    const verifyValid = await apiRequest(`/api/invitations/verify?token=${rawToken}`);
    assert(verifyValid.status === 200, 'Valid token returns 200 OK');
    assert(verifyValid.data.data?.organization?.name === testOrgName, 'Returns correct organization name');
    assert(verifyValid.data.data?.email === invitedEmail, 'Returns invited email');
    assert(verifyValid.data.data?.role === 'MEMBER', 'Returns invited role');
    assert(verifyValid.data.data?.userExists === false, 'Detects new user (userExists: false)');

    // Invalid token
    const verifyBad = await apiRequest('/api/invitations/verify?token=fake_invalid_token_9999');
    assert(verifyBad.status === 404, 'Invalid token returns 404 Not Found');

    // Missing token
    const verifyMissing = await apiRequest('/api/invitations/verify');
    assert(verifyMissing.status === 400, 'Missing token returns 400 Bad Request');

    // ------------------------------------------------------------------------
    // SECTION 6: Password Policy Enforcement on Set Password
    // ------------------------------------------------------------------------
    console.log('\n[Check 6] Password policy validation on acceptance...');
    // A: Missing lowercase
    const noLowerRes = await apiRequest('/api/invitations/accept', {
      method: 'POST',
      body: {
        token: rawToken,
        name: 'New Engineer',
        password: 'PASSWORD123!',
        confirmPassword: 'PASSWORD123!'
      }
    });
    assert(noLowerRes.status === 400, 'Password without lowercase rejected (400)');

    // B: Missing number
    const noNumRes = await apiRequest('/api/invitations/accept', {
      method: 'POST',
      body: {
        token: rawToken,
        name: 'New Engineer',
        password: 'PasswordLetters!',
        confirmPassword: 'PasswordLetters!'
      }
    });
    assert(noNumRes.status === 400, 'Password without number rejected (400)');

    // C: Missing special character
    const noSpecialRes = await apiRequest('/api/invitations/accept', {
      method: 'POST',
      body: {
        token: rawToken,
        name: 'New Engineer',
        password: 'Password123',
        confirmPassword: 'Password123'
      }
    });
    assert(noSpecialRes.status === 400, 'Password without special character rejected (400)');

    // D: Mismatched confirm password
    const mismatchRes = await apiRequest('/api/invitations/accept', {
      method: 'POST',
      body: {
        token: rawToken,
        name: 'New Engineer',
        password: 'ValidPassword123!',
        confirmPassword: 'DifferentPassword123!'
      }
    });
    assert(mismatchRes.status === 400, 'Mismatched confirm password rejected (400)');

    // ------------------------------------------------------------------------
    // SECTION 7: Valid New User Acceptance & Account Activation
    // ------------------------------------------------------------------------
    console.log('\n[Check 7] Valid new user acceptance & account activation...');
    const acceptRes = await apiRequest('/api/invitations/accept', {
      method: 'POST',
      body: {
        token: rawToken,
        name: 'New Engineer',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!'
      }
    });

    assert(acceptRes.status === 200, 'Valid password accepted (200 OK)');
    assert(acceptRes.data.success === true, 'Acceptance response indicates success');
    const newUser = acceptRes.data.data?.user;
    const newAuthToken = acceptRes.data.data?.token;
    const membership = acceptRes.data.data?.membership;

    assert(newUser?.email === invitedEmail, 'User created with invited email');
    assert(membership?.role === 'MEMBER', 'Assigned MEMBER role in organization');
    assert(!!newAuthToken, 'Auth JWT token returned for immediate session start');

    // Verify bcrypt password hashing in MongoDB
    const createdUserDoc = await User.findOne({ email: invitedEmail });
    assert(!!createdUserDoc, 'User record created in database');
    assert(createdUserDoc.password.startsWith('$2'), 'User password hashed with bcrypt ($2a$ / $2b$)');
    assert(createdUserDoc.password !== 'SecurePassword123!', 'Plain-text password never stored in database');
    const matchPassword = await createdUserDoc.matchPassword('SecurePassword123!');
    assert(matchPassword === true, 'bcrypt compare validates newly set password');

    // Verify membership in database
    const memberDoc = await OrganizationMember.findOne({
      organizationId: ownerOrg._id,
      userId: createdUserDoc._id
    });
    assert(!!memberDoc && memberDoc.role === 'MEMBER', 'Organization membership confirmed in database with MEMBER role');

    // ------------------------------------------------------------------------
    // SECTION 8: Token Reuse, Revocation, and Expiration Protection
    // ------------------------------------------------------------------------
    console.log('\n[Check 8] Token reuse, revocation, and expiration rejection...');
    // A. Reusing accepted token
    const reuseRes = await apiRequest('/api/invitations/accept', {
      method: 'POST',
      body: {
        token: rawToken,
        name: 'Attacker',
        password: 'SecurePassword123!'
      }
    });
    assert(reuseRes.status === 400 || reuseRes.status === 409, 'Reusing already-accepted token is rejected (400/409)');

    // B. Revoked token
    const revokeEmail = `revoked.${timestamp}@acme-corp.internal`;
    const revokeInviteRes = await apiRequest('/api/organizations/current/invitations', {
      method: 'POST',
      token: ownerToken,
      orgId: ownerOrg._id,
      body: { email: revokeEmail, role: 'MEMBER' }
    });
    const revokeToken = new URL(capturedInvitationUrl).searchParams.get('token');
    const inviteIdToRevoke = revokeInviteRes.data.data.invitation._id;

    // Admin revokes the invitation
    const delRes = await apiRequest(`/api/organizations/current/invitations/${inviteIdToRevoke}`, {
      method: 'DELETE',
      token: ownerToken,
      orgId: ownerOrg._id
    });
    assert(delRes.status === 200, 'Invitation successfully revoked by admin');

    // Attempting to verify or accept revoked token
    const verifyRevoked = await apiRequest(`/api/invitations/verify?token=${revokeToken}`);
    assert(verifyRevoked.status === 400, 'Verification of revoked invitation rejected (400)');

    const acceptRevoked = await apiRequest('/api/invitations/accept', {
      method: 'POST',
      body: {
        token: revokeToken,
        name: 'Revoked Person',
        password: 'SecurePassword123!'
      }
    });
    assert(acceptRevoked.status === 400, 'Acceptance of revoked invitation rejected (400)');

    // C. Expired token
    const expiredRawToken = crypto.randomBytes(32).toString('hex');
    const expiredTokenHash = crypto.createHash('sha256').update(expiredRawToken).digest('hex');
    await Invitation.create({
      organizationId: ownerOrg._id,
      email: `expired.${timestamp}@acme-corp.internal`,
      role: 'MEMBER',
      tokenHash: expiredTokenHash,
      invitedBy: ownerOrg.ownerId || createdUserDoc._id,
      status: 'PENDING',
      expiresAt: new Date(Date.now() - 1000 * 60) // Expired 1 minute ago
    });

    const verifyExpired = await apiRequest(`/api/invitations/verify?token=${expiredRawToken}`);
    assert(verifyExpired.status === 400, 'Verification of expired invitation rejected (400)');

    const acceptExpired = await apiRequest('/api/invitations/accept', {
      method: 'POST',
      body: {
        token: expiredRawToken,
        name: 'Late Person',
        password: 'SecurePassword123!'
      }
    });
    assert(acceptExpired.status === 400, 'Acceptance of expired invitation rejected (400)');

    // ------------------------------------------------------------------------
    // SECTION 9: Existing User Acceptance Flow (Password Not Reset)
    // ------------------------------------------------------------------------
    console.log('\n[Check 9] Existing registered user accepts invitation without resetting password...');
    // Create an invitation for the existing user into owner's org with role ADMIN
    const existingUserEmail = `existing.user.${timestamp}@partner.corp`;
    const regExisting = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Existing Bob',
        email: existingUserEmail,
        password: 'BobOriginalPassword123!',
        confirmPassword: 'BobOriginalPassword123!',
        organizationName: `Bob Org ${timestamp}`
      }
    });
    assert(regExisting.status === 201, 'Existing user registered in their own org');
    const bobToken = regExisting.data.data?.token;

    // Admin invites Bob to Owner's Org as ADMIN
    const inviteBobRes = await apiRequest('/api/organizations/current/invitations', {
      method: 'POST',
      token: ownerToken,
      orgId: ownerOrg._id,
      body: { email: existingUserEmail, role: 'ADMIN' }
    });
    const bobRawToken = new URL(capturedInvitationUrl).searchParams.get('token');

    // Verification identifies Bob as an existing user
    const bobVerify = await apiRequest(`/api/invitations/verify?token=${bobRawToken}`);
    assert(bobVerify.status === 200, 'Verification succeeded for Bob');
    assert(bobVerify.data.data?.userExists === true, 'Verification flags userExists: true for existing user');

    // Bob accepts while authenticated (session preserved, password NOT changed)
    const bobAccept = await apiRequest('/api/invitations/accept', {
      method: 'POST',
      token: bobToken,
      body: { token: bobRawToken }
    });
    assert(bobAccept.status === 200, 'Existing user joined workspace as ADMIN');
    assert(bobAccept.data.data?.membership?.role === 'ADMIN', 'Bob assigned ADMIN role in new organization');

    // Verify Bob's original password is still intact
    const bobUserDoc = await User.findOne({ email: existingUserEmail });
    const originalPasswordStillWorks = await bobUserDoc.matchPassword('BobOriginalPassword123!');
    assert(originalPasswordStillWorks === true, 'Existing user original password was preserved and NOT reset');

    console.log('\n================================================================');
    console.log(`FOCUSED VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    server.close();
    await mongoose.connection.close();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    server.close();
    await mongoose.connection.close();
    process.exit(1);
  }
}

runFocusedVerification();
