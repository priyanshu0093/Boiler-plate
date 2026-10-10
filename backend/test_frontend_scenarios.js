const path = require('path');
const io = require(path.join(__dirname, '../frontend/node_modules/socket.io-client'));

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

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

async function runScenarioTests() {
  console.log('===============================================================');
  console.log('TESTING FRONTEND MULTI-TENANT INTEGRATION SCENARIOS (1 to 7)');
  console.log('===============================================================\n');

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
    // SCENARIO 1: Login and load user's organizations
    // -------------------------------------------------------------
    console.log('[Scenario 1] Login and load user\'s organizations...');
    const userEmail = `multi.tenant.user.${timestamp}@test.internal`;
    const regRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name: 'Multi Tenant User', email: userEmail, password: 'Password123!' }
    });
    assert(regRes.status === 201, 'User registered successfully');
    const token = regRes.data.data.token;
    const userId = regRes.data.data.user._id;

    // Create Organization A
    const orgARes = await apiRequest('/organizations', {
      method: 'POST',
      token,
      body: { name: `Alpha Corp ${timestamp}`, slug: `alpha-${timestamp}` }
    });
    assert(orgARes.status === 201, 'Organization A created');
    const orgAId = orgARes.data.data.organization._id;

    // Create Organization B
    const orgBRes = await apiRequest('/organizations', {
      method: 'POST',
      token,
      body: { name: `Beta Global ${timestamp}`, slug: `beta-${timestamp}` }
    });
    assert(orgBRes.status === 201, 'Organization B created');
    const orgBId = orgBRes.data.data.organization._id;

    // User logs in and fetches list of organizations
    const loginRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: userEmail, password: 'Password123!' }
    });
    assert(loginRes.status === 200, 'User logged in successfully');

    const orgsListRes = await apiRequest('/organizations', { token });
    assert(orgsListRes.status === 200, 'GET /api/organizations returns 200');
    assert(
      orgsListRes.data.data.some((o) => o._id === orgAId) &&
      orgsListRes.data.data.some((o) => o._id === orgBId),
      'User\'s organizations list contains both Org A and Org B'
    );

    // -------------------------------------------------------------
    // SCENARIO 2 & 3: Switch from Org A to Org B and confirm API header
    // -------------------------------------------------------------
    console.log('\n[Scenarios 2 & 3] Switch between organizations and verify x-organization-id header...');

    // Create resource in Org A with header
    const resARes = await apiRequest('/resources', {
      method: 'POST',
      token,
      orgId: orgAId,
      body: {
        name: `Alpha Space ${timestamp}`,
        category: 'SPACES',
        description: 'Room in Org A',
        location: 'Building Alpha'
      }
    });
    assert(resARes.status === 201, 'Created resource in Org A with x-organization-id');
    const resourceAId = resARes.data.data._id;

    // Create resource in Org B with header
    const resBRes = await apiRequest('/resources', {
      method: 'POST',
      token,
      orgId: orgBId,
      body: {
        name: `Beta Lab ${timestamp}`,
        category: 'TESTING_HARDWARE',
        description: 'Lab in Org B',
        location: 'Building Beta'
      }
    });
    assert(resBRes.status === 201, 'Created resource in Org B with x-organization-id');
    const resourceBId = resBRes.data.data._id;

    // Query active organization context when header is Org A vs Org B
    const currOrgARes = await apiRequest('/organizations/current', { token, orgId: orgAId });
    assert(currOrgARes.data.data.organization._id === orgAId, 'Backend verifies current context is Org A');

    const currOrgBRes = await apiRequest('/organizations/current', { token, orgId: orgBId });
    assert(currOrgBRes.data.data.organization._id === orgBId, 'Backend verifies current context switched to Org B');

    // -------------------------------------------------------------
    // SCENARIO 4: Refresh resources, bookings & notifications without leaking stale data
    // -------------------------------------------------------------
    console.log('\n[Scenario 4] Data refresh & prevention of cross-organization stale leakage...');

    // Fetch resources with Org A header
    const listA = await apiRequest('/resources', { token, orgId: orgAId });
    const listAIds = listA.data.data.map((r) => r._id);
    assert(listAIds.includes(resourceAId) && !listAIds.includes(resourceBId), 'Org A catalog only contains Org A resources');

    // Fetch resources with Org B header
    const listB = await apiRequest('/resources', { token, orgId: orgBId });
    const listBIds = listB.data.data.map((r) => r._id);
    assert(listBIds.includes(resourceBId) && !listBIds.includes(resourceAId), 'Org B catalog only contains Org B resources');

    // Create booking in Org A
    const now = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const later = new Date(now.getTime() + 60 * 60 * 1000);
    const bookARes = await apiRequest('/bookings', {
      method: 'POST',
      token,
      orgId: orgAId,
      body: {
        resourceId: resourceAId,
        startTime: now.toISOString(),
        endTime: later.toISOString(),
        purpose: 'Alpha Sync'
      }
    });
    assert(bookARes.status === 201, 'Created booking in Org A');
    const bookingAId = bookARes.data.data._id;

    // Verify bookings query scoped to Org A vs Org B
    const bookingsA = await apiRequest('/bookings', { token, orgId: orgAId });
    const bookingsB = await apiRequest('/bookings', { token, orgId: orgBId });
    assert(bookingsA.data.data.some((b) => b._id === bookingAId), 'Booking visible in Org A bookings');
    assert(!bookingsB.data.data.some((b) => b._id === bookingAId), 'Booking strictly NOT visible in Org B bookings');

    // Verify notifications query scoped to Org A vs Org B
    const notifsA = await apiRequest('/notifications', { token, orgId: orgAId });
    const notifsB = await apiRequest('/notifications', { token, orgId: orgBId });
    assert(notifsA.data.data.length >= 1, 'Notifications visible in Org A');
    assert(notifsB.data.data.length === 0, 'No Org A notifications leak into Org B');

    // -------------------------------------------------------------
    // SCENARIO 5: Live events from Org A DO NOT appear while viewing Org B
    // -------------------------------------------------------------
    console.log('\n[Scenario 5] Socket.IO organization isolation test (No cross-tenant leaks)...');

    // Create 2 socket connections: Socket A joined to Org A, Socket B joined to Org B
    const socketA = io(SOCKET_URL, { auth: { token } });
    const socketB = io(SOCKET_URL, { auth: { token } });

    await new Promise((resolve) => {
      let connectedCount = 0;
      const checkDone = () => {
        connectedCount++;
        if (connectedCount === 2) resolve();
      };
      socketA.on('connect', checkDone);
      socketB.on('connect', checkDone);
    });

    // Socket A joins Org A; Socket B joins Org B
    socketA.emit('join:org', { orgId: orgAId, token });
    socketB.emit('join:org', { orgId: orgBId, token });
    await new Promise((r) => setTimeout(r, 200));

    let socketAReceivedEvent = false;
    let socketBReceivedLeak = false;

    socketA.on('resource:status_changed', (payload) => {
      if (payload.resourceId === resourceAId) {
        socketAReceivedEvent = true;
      }
    });

    socketB.on('resource:status_changed', (payload) => {
      if (payload.resourceId === resourceAId) {
        socketBReceivedLeak = true;
      }
    });

    // Trigger status change in Org A (e.g. check in booking)
    await apiRequest(`/bookings/${bookingAId}/check-in`, {
      method: 'PATCH',
      token,
      orgId: orgAId
    });

    // Wait for event propagation
    await new Promise((r) => setTimeout(r, 500));

    assert(socketAReceivedEvent === true, 'Client connected to Org A received the status change event');
    assert(socketBReceivedLeak === false, 'Client connected to Org B DID NOT receive Org A\'s event (Zero leakage)');

    socketA.disconnect();
    socketB.disconnect();

    // -------------------------------------------------------------
    // SCENARIO 6: Confirm logout clears organization-specific state
    // -------------------------------------------------------------
    console.log('\n[Scenario 6] Logout clears client state & token...');
    // Simulated logout by dropping token and orgId from request
    const unauthOrgReq = await apiRequest('/organizations', {});
    assert(unauthOrgReq.status === 401, 'Unauthenticated request after logout is rejected (401)');

    // -------------------------------------------------------------
    // SCENARIO 7: Confirm forged organization header is rejected
    // -------------------------------------------------------------
    console.log('\n[Scenario 7] Forged organization header security test...');
    // Create an outsider user not in Org A
    const outsiderEmail = `outsider.${timestamp}@test.internal`;
    const regOutsider = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name: 'Outsider Attacker', email: outsiderEmail, password: 'Password123!' }
    });
    const outsiderToken = regOutsider.data.data.token;

    // Outsider tries to access Org A by spoofing header
    const spoofAttempt = await apiRequest('/resources', {
      token: outsiderToken,
      orgId: orgAId // Forged organization header
    });
    assert(
      spoofAttempt.status === 403 && spoofAttempt.data.success === false,
      'Backend rejects forged organization header with 403 Forbidden'
    );

    console.log('\n===============================================================');
    console.log(`SCENARIO TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during scenario verification:', err);
    process.exit(1);
  }
}

runScenarioTests();
