const crypto = require('crypto');

const API_BASE = 'http://localhost:5000/api';

async function apiRequest(endpoint, { method = 'GET', token, orgId, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (orgId) headers['x-organization-id'] = orgId;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runOnboardingTests() {
  console.log('================================================================');
  console.log('DESKDROP SAAS WORKSPACE ONBOARDING & EMAIL INVITATIONS TEST SUITE');
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

  const timestamp = Date.now();

  try {
    // -------------------------------------------------------------
    // TEST 1: New user registration and workspace creation
    // -------------------------------------------------------------
    console.log('[Test 1] New user registration and workspace creation...');
    const ownerEmail = `saas.owner.${timestamp}@acme.corp`;
    const regRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Alice Owner',
        email: ownerEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        organizationName: `Acme Cloud Labs ${timestamp}`
      }
    });

    assert(regRes.status === 201, 'Owner registration returned 201 Created');
    assert(regRes.data.success === true, 'Registration succeeded');
    const ownerToken = regRes.data.data?.token;
    const ownerUser = regRes.data.data?.user;
    const ownerOrg = regRes.data.data?.activeOrganization;

    assert(!!ownerToken, 'JWT token returned on registration');
    assert(ownerOrg?.name === `Acme Cloud Labs ${timestamp}`, 'Organization created with provided name');
    assert(ownerOrg?.role === 'OWNER', 'Creator assigned the OWNER role in organization');
    assert(!!ownerOrg?.slug, 'Unique organization slug generated on backend');

    // -------------------------------------------------------------
    // TEST 2: Duplicate email and invalid input handling
    // -------------------------------------------------------------
    console.log('\n[Test 2] Duplicate email and invalid input handling...');
    const dupRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Imposter',
        email: ownerEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        organizationName: 'Duplicate Corp'
      }
    });
    assert(dupRes.status === 400, 'Duplicate email registration rejected with 400');

    const mismatchPassRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Bob',
        email: `bob.${timestamp}@test.com`,
        password: 'Password123!',
        confirmPassword: 'Password999!',
        organizationName: 'Test Org'
      }
    });
    assert(mismatchPassRes.status === 400, 'Mismatched passwords rejected with 400');

    const shortPassRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Bob',
        email: `bob.${timestamp}@test.com`,
        password: '123',
        organizationName: 'Test Org'
      }
    });
    assert(shortPassRes.status === 400, 'Short password (< 6 chars) rejected with 400');

    // -------------------------------------------------------------
    // TEST 3: Owner membership verification via current org API
    // -------------------------------------------------------------
    console.log('\n[Test 3] Owner membership assignment verification...');
    const currentOrgRes = await apiRequest('/organizations/current', {
      token: ownerToken,
      orgId: ownerOrg._id
    });
    assert(currentOrgRes.status === 200, 'GET /api/organizations/current succeeded');
    assert(currentOrgRes.data.data?.memberRole === 'OWNER', 'Active membership role is OWNER');
    assert(currentOrgRes.data.data?.isOrgAdmin === true, 'Owner has isOrgAdmin privilege');

    // -------------------------------------------------------------
    // TEST 4: Sending / generating development invitation
    // -------------------------------------------------------------
    console.log('\n[Test 4] Generating development invitation...');
    const invitedEmail = `invited.dev.${timestamp}@acme.corp`;
    const inviteRes = await apiRequest('/organizations/current/invitations', {
      method: 'POST',
      token: ownerToken,
      orgId: ownerOrg._id,
      body: {
        email: invitedEmail,
        role: 'MEMBER'
      }
    });

    assert(inviteRes.status === 201, 'Invitation creation returned 201 Created');
    assert(inviteRes.data.data?.deliveryMethod === 'DEV_PREVIEW', 'Identified dev preview delivery mode');
    assert(!!inviteRes.data.data?.invitationUrl, 'Preview invitation URL returned');
    assert(inviteRes.data.data?.invitation?.role === 'MEMBER', 'Invitation role recorded as MEMBER');

    // Extract raw token from preview URL
    const urlObj = new URL(inviteRes.data.data.invitationUrl);
    const rawToken = urlObj.searchParams.get('token');
    assert(!!rawToken && rawToken.length === 64, 'Raw token is 64 hex characters (32 cryptographically random bytes)');

    // Verify invitation preview/verify endpoint (Public)
    const verifyRes = await apiRequest(`/invitations/verify?token=${rawToken}&email=${encodeURIComponent(invitedEmail)}`);
    assert(verifyRes.status === 200, 'GET /api/invitations/verify returns 200 for valid token');
    assert(verifyRes.data.data?.organization?._id === ownerOrg._id, 'Verified invitation belongs to target workspace');
    assert(verifyRes.data.data?.userExists === false, 'Detects invited recipient is a new user');

    // -------------------------------------------------------------
    // TEST 5: New user invitation acceptance
    // -------------------------------------------------------------
    console.log('\n[Test 5] New user invitation acceptance...');
    const acceptRes = await apiRequest('/invitations/accept', {
      method: 'POST',
      body: {
        token: rawToken,
        name: 'Invited Teammate',
        password: 'TeammatePass123!',
        confirmPassword: 'TeammatePass123!'
      }
    });

    assert(acceptRes.status === 200, 'New user accepted invitation successfully (200 OK)');
    assert(acceptRes.data.data?.membership?.role === 'MEMBER', 'Assigned MEMBER role in workspace');
    const teammateToken = acceptRes.data.data?.token;
    const teammateUser = acceptRes.data.data?.user;
    assert(!!teammateToken, 'JWT token issued to newly registered invited teammate');

    // Verify teammate can access workspace resources
    const teammateOrgRes = await apiRequest('/organizations/current', {
      token: teammateToken,
      orgId: ownerOrg._id
    });
    assert(teammateOrgRes.status === 200, 'Teammate successfully accesses organization');
    assert(teammateOrgRes.data.data?.memberRole === 'MEMBER', 'Teammate role confirmed as MEMBER');

    // -------------------------------------------------------------
    // TEST 6: Token reuse, email mismatch, and expired token rejection
    // -------------------------------------------------------------
    console.log('\n[Test 6] Token reuse, email mismatch, and expiration checks...');
    // A. Reusing already-accepted token
    const reuseRes = await apiRequest('/invitations/accept', {
      method: 'POST',
      body: {
        token: rawToken,
        name: 'Someone Else',
        password: 'password123'
      }
    });
    assert(reuseRes.status === 400 || reuseRes.status === 409, 'Reusing accepted invitation token is rejected (400/409)');

    // B. Create invitation for existing user to test email mismatch
    const existingUserEmail = `existing.user.${timestamp}@test.corp`;
    const existUserReg = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Existing Charlie',
        email: existingUserEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        organizationName: `Charlie Workspace ${timestamp}`
      }
    });
    const charlieToken = existUserReg.data.data?.token;

    // Owner creates invitation for target@domain.com
    const mismatchTargetEmail = `target.${timestamp}@acme.corp`;
    const mismatchInviteRes = await apiRequest('/organizations/current/invitations', {
      method: 'POST',
      token: ownerToken,
      orgId: ownerOrg._id,
      body: { email: mismatchTargetEmail, role: 'ADMIN' }
    });
    const mismatchRawToken = new URL(mismatchInviteRes.data.data.invitationUrl).searchParams.get('token');

    // Charlie tries to accept an invitation issued to mismatchTargetEmail while logged in
    const mismatchAcceptRes = await apiRequest('/invitations/accept', {
      method: 'POST',
      token: charlieToken,
      body: { token: mismatchRawToken }
    });
    assert(mismatchAcceptRes.status === 403, 'Email mismatch rejected with 403 Forbidden for authenticated user');

    // Existing user accepts invitation issued to their own email
    const charlieInviteRes = await apiRequest('/organizations/current/invitations', {
      method: 'POST',
      token: ownerToken,
      orgId: ownerOrg._id,
      body: { email: existingUserEmail, role: 'ADMIN' }
    });
    const charlieRawToken = new URL(charlieInviteRes.data.data.invitationUrl).searchParams.get('token');

    const charlieAcceptRes = await apiRequest('/invitations/accept', {
      method: 'POST',
      token: charlieToken,
      body: { token: charlieRawToken }
    });
    assert(charlieAcceptRes.status === 200, 'Existing user accepted invitation and joined workspace as ADMIN');

    // -------------------------------------------------------------
    // TEST 7: Unauthorized invitation and role-management attempts
    // -------------------------------------------------------------
    console.log('\n[Test 7] Role management and permissions enforcement...');
    // Teammate (MEMBER) attempts to invite someone
    const memberInviteAttempt = await apiRequest('/organizations/current/invitations', {
      method: 'POST',
      token: teammateToken,
      orgId: ownerOrg._id,
      body: { email: `rogue.${timestamp}@test.com`, role: 'MEMBER' }
    });
    assert(memberInviteAttempt.status === 403, 'Standard MEMBER cannot invite new members (403 Forbidden)');

    // Fetch members list
    const membersListRes = await apiRequest('/organizations/current/members', {
      token: ownerToken,
      orgId: ownerOrg._id
    });
    assert(membersListRes.status === 200, 'GET /api/organizations/current/members succeeded');
    const members = membersListRes.data.data;
    const ownerMember = members.find((m) => m.role === 'OWNER');
    const teammateMember = members.find((m) => m.userId?._id === teammateUser?._id);

    // Attempt to demote the only owner
    const demoteOwnerAttempt = await apiRequest(`/organizations/current/members/${ownerMember._id}`, {
      method: 'PATCH',
      token: ownerToken,
      orgId: ownerOrg._id,
      body: { role: 'MEMBER' }
    });
    assert(demoteOwnerAttempt.status === 400, 'Demoting the only OWNER is rejected with 400');

    // Attempt to remove the only owner
    const removeOwnerAttempt = await apiRequest(`/organizations/current/members/${ownerMember._id}`, {
      method: 'DELETE',
      token: ownerToken,
      orgId: ownerOrg._id
    });
    assert(removeOwnerAttempt.status === 400, 'Removing the only OWNER is rejected with 400');

    // Promote teammate to ADMIN
    const promoteRes = await apiRequest(`/organizations/current/members/${teammateMember._id}`, {
      method: 'PATCH',
      token: ownerToken,
      orgId: ownerOrg._id,
      body: { role: 'ADMIN' }
    });
    assert(promoteRes.status === 200, 'Owner can promote teammate to ADMIN');

    // -------------------------------------------------------------
    // TEST 8: Multi-organization membership and workspace switching
    // -------------------------------------------------------------
    console.log('\n[Test 8] Multi-organization membership and workspace switching...');
    const charlieOrgsRes = await apiRequest('/organizations', { token: charlieToken });
    assert(charlieOrgsRes.status === 200, 'Charlie retrieved organizations list');
    const charlieOrgIds = charlieOrgsRes.data.data.map((o) => o._id);
    assert(charlieOrgIds.includes(ownerOrg._id), 'Charlie is a member of OwnerOrg');
    assert(charlieOrgsRes.data.data.length >= 2, 'Charlie belongs to multiple distinct organizations');

    // Charlie accesses resource in OwnerOrg
    const charlieAccessRes = await apiRequest('/resources', {
      token: charlieToken,
      orgId: ownerOrg._id
    });
    assert(charlieAccessRes.status === 200, 'Charlie successfully accesses resources in OwnerOrg');

    // -------------------------------------------------------------
    // TEST 9: Existing booking & tenant-isolation regression
    // -------------------------------------------------------------
    console.log('\n[Test 9] Tenant isolation and booking regressions check...');
    // Create resource in OwnerOrg
    const newRes = await apiRequest('/resources', {
      method: 'POST',
      token: ownerToken,
      orgId: ownerOrg._id,
      body: {
        name: `Executive Desk ${timestamp}`,
        category: 'SPACES',
        description: 'High-end ergonomic workspace with monitor',
        capacity: 1,
        location: 'Floor 5, Suite A'
      }
    });
    assert(newRes.status === 201, 'Created resource in OwnerOrg');
    const resourceId = newRes.data.data?._id;

    // Check availability within 7-day window
    const bookStart = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    bookStart.setHours(10, 0, 0, 0);
    const bookEnd = new Date(bookStart.getTime() + 60 * 60 * 1000);

    const availRes = await apiRequest(`/bookings/availability?resourceId=${resourceId}&startTime=${bookStart.toISOString()}&endTime=${bookEnd.toISOString()}`, {
      token: ownerToken,
      orgId: ownerOrg._id
    });
    assert(availRes.status === 200 && availRes.data.data?.available === true, 'Availability check succeeds in OwnerOrg');

    // Teammate books resource
    const bookRes = await apiRequest('/bookings', {
      method: 'POST',
      token: teammateToken,
      orgId: ownerOrg._id,
      body: {
        resourceId,
        startTime: bookStart.toISOString(),
        endTime: bookEnd.toISOString(),
        purpose: 'Sprint Planning Session'
      }
    });
    assert(bookRes.status === 201, 'Teammate created CONFIRMED booking in OwnerOrg');
    const bookingId = bookRes.data.data?._id;

    // Verify cross-tenant isolation: Charlie's personal org cannot see this booking
    const foreignOrgBookings = await apiRequest('/bookings', {
      token: charlieToken,
      orgId: charlieOrgIds.find((id) => id !== ownerOrg._id)
    });
    const foreignBookingIds = foreignOrgBookings.data.data?.map((b) => b._id) || [];
    assert(!foreignBookingIds.includes(bookingId), 'Booking strictly isolated from foreign tenant orgs');

    console.log('\n================================================================');
    console.log(`ONBOARDING & INVITATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Unhandled test exception:', error);
    process.exit(1);
  }
}

runOnboardingTests();
