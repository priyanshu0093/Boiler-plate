const path = require('path');
const ioClient = require('../frontend/node_modules/socket.io-client');

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

async function runTests() {
  console.log('================================================================');
  console.log('DESKDROP SAAS FREE PLAN LIMITS & PLATFORM ADMIN VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, debugInfo) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      if (debugInfo) console.error(`   Details:`, debugInfo);
      failed++;
    }
  }

  const timestamp = Date.now();

  try {
    // -------------------------------------------------------------------------
    // 1. Platform Super Admin Authentication & KPI Metrics
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Platform Super Admin Authentication & APIs ---');
    const superAdminLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: 'admin@deskdrop.internal', password: 'password123' }
    });
    assert(superAdminLogin.status === 200, 'Super admin login successful', superAdminLogin.data);
    const superToken = superAdminLogin.data.data?.token;
    assert(superAdminLogin.data.data?.user?.role === 'ADMIN', 'Super admin role is ADMIN');

    const metricsRes = await apiRequest('/platform/metrics', { token: superToken });
    assert(metricsRes.status === 200 && metricsRes.data.success, 'GET /api/platform/metrics returns 200', metricsRes.data);
    assert(typeof metricsRes.data.data?.totalOrganizations === 'number', 'Metrics contain totalOrganizations');
    assert(typeof metricsRes.data.data?.registeredUsers === 'number', 'Metrics contain registeredUsers');
    assert(typeof metricsRes.data.data?.totalResources === 'number', 'Metrics contain totalResources');

    const orgsListRes = await apiRequest('/platform/organizations', { token: superToken });
    assert(orgsListRes.status === 200 && Array.isArray(orgsListRes.data.data), 'GET /api/platform/organizations returns array');
    console.log(`   Total organizations found in platform: ${orgsListRes.data.data.length}`);

    // -------------------------------------------------------------------------
    // 2. Non-Super Admin Requests to Platform APIs are Rejected (403)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Non-Super Admin Platform API Protection ---');
    const tenantUserEmail = `tenant.admin.${timestamp}@acme.test`;
    const regTenant = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Tenant Admin',
        email: tenantUserEmail,
        password: 'Password123!',
        organizationName: `Acme Quota Test ${timestamp}`
      }
    });
    assert(regTenant.status === 201, 'Registered company admin user');
    const tenantToken = regTenant.data.data.token;
    const orgAId = regTenant.data.data.activeOrganization._id;

    const rejectedMetrics = await apiRequest('/platform/metrics', { token: tenantToken });
    assert(rejectedMetrics.status === 403, 'Company admin rejected from /api/platform/metrics (403)', rejectedMetrics.data);
    assert(rejectedMetrics.data.code === 'PLATFORM_ADMIN_REQUIRED', 'Error code is PLATFORM_ADMIN_REQUIRED');

    const rejectedOrgs = await apiRequest('/platform/organizations', { token: tenantToken });
    assert(rejectedOrgs.status === 403, 'Company admin rejected from /api/platform/organizations (403)');

    const rejectedStatus = await apiRequest(`/platform/organizations/${orgAId}/status`, {
      method: 'PATCH',
      token: tenantToken,
      body: { status: 'SUSPENDED' }
    });
    assert(rejectedStatus.status === 403, 'Company admin rejected from suspending organizations (403)');

    // -------------------------------------------------------------------------
    // 3. Company Admin Access is Restricted to its Organization
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Company Admin Scoped Access ---');
    const tenantBEmail = `tenant.b.${timestamp}@globex.test`;
    const regTenantB = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Globex Owner',
        email: tenantBEmail,
        password: 'Password123!',
        organizationName: `Globex Industries ${timestamp}`
      }
    });
    const tenantBToken = regTenantB.data.data.token;
    const orgBId = regTenantB.data.data.activeOrganization._id;

    // Tenant B attempts to access Org A's analytics
    const crossAnalytics = await apiRequest('/bookings/admin/analytics', {
      token: tenantBToken,
      orgId: orgAId
    });
    assert(crossAnalytics.status === 403, 'Tenant B rejected when accessing Org A analytics (403)');

    // Tenant B attempts to access Org A's members
    const crossMembers = await apiRequest('/organizations/current/members', {
      token: tenantBToken,
      orgId: orgAId
    });
    assert(crossMembers.status === 403, 'Tenant B rejected when accessing Org A members (403)');

    // -------------------------------------------------------------------------
    // 4. Centralized Free Plan: 10 Active Resources Limit & Rejection of 11th
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Active Resource Quota Enforcement (Max 10) ---');
    const createdResourceIds = [];

    // Create 10 resources in Org A
    for (let i = 1; i <= 10; i++) {
      const res = await apiRequest('/resources', {
        method: 'POST',
        token: tenantToken,
        orgId: orgAId,
        body: {
          name: `Desk/Room Unit ${i}`,
          category: 'SPACES',
          description: `Ergonomic workstation Pod ${i}`,
          location: `Floor 1 - Pod ${i}`,
          capacity: 2
        }
      });
      assert(res.status === 201 && res.data.success, `Created resource ${i}/10`, res.data);
      if (res.data.data?._id) createdResourceIds.push(res.data.data._id);
    }

    // Attempt to create the 11th active resource -> MUST FAIL with RESOURCE_LIMIT_EXCEEDED
    const eleventhRes = await apiRequest('/resources', {
      method: 'POST',
      token: tenantToken,
      orgId: orgAId,
      body: {
        name: 'Desk Unit 11 (Overflow)',
        category: 'SPACES',
        description: 'Overflow resource exceeding quota',
        location: 'Floor 1 - Pod 11'
      }
    });
    assert([400, 403].includes(eleventhRes.status), '11th active resource rejected with 400/403', eleventhRes.data);
    assert(eleventhRes.data.code === 'RESOURCE_LIMIT_EXCEEDED', 'Error code is RESOURCE_LIMIT_EXCEEDED');
    assert(eleventhRes.data.data?.limit === 10, 'Error payload specifies limit 10');

    // Archive 1 resource (deactivate)
    const archiveRes = await apiRequest(`/resources/${createdResourceIds[0]}`, {
      method: 'PATCH',
      token: tenantToken,
      orgId: orgAId,
      body: { isActive: false }
    });
    assert(archiveRes.status === 200, 'Archived 1 resource (active count now 9)');

    // Now creating a new resource should succeed (taking active count back to 10)
    const replacementRes = await apiRequest('/resources', {
      method: 'POST',
      token: tenantToken,
      orgId: orgAId,
      body: {
        name: 'Desk Unit 10 Replacement',
        category: 'SPACES',
        description: 'Replacement active resource',
        location: 'Floor 1 - Pod Replacement'
      }
    });
    assert(replacementRes.status === 201, 'Created replacement resource when quota had space');

    // Attempting to reactivate the archived resource when already at 10 should fail!
    const reactivateAttempt = await apiRequest(`/resources/${createdResourceIds[0]}`, {
      method: 'PATCH',
      token: tenantToken,
      orgId: orgAId,
      body: { isActive: true }
    });
    assert([400, 403].includes(reactivateAttempt.status), 'Reactivating archived resource at max quota is rejected', reactivateAttempt.data);
    assert(reactivateAttempt.data.code === 'RESOURCE_LIMIT_EXCEEDED', 'Reactivation error code is RESOURCE_LIMIT_EXCEEDED');

    // -------------------------------------------------------------------------
    // 5. Centralized Free Plan: 15 Active Members Limit & Rejection of 16th
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Active Member Quota Enforcement (Max 15) ---');
    // Org A currently has 1 member (the owner). Add 14 more members to hit 15.
    for (let i = 2; i <= 15; i++) {
      const memberUserEmail = `colleague.${i}.${timestamp}@acme.test`;
      // Register user first
      await apiRequest('/auth/register', {
        method: 'POST',
        body: { name: `Colleague ${i}`, email: memberUserEmail, password: 'Password123!' }
      });
      // Add to Org A
      const addRes = await apiRequest('/organizations/current/members', {
        method: 'POST',
        token: tenantToken,
        orgId: orgAId,
        body: { email: memberUserEmail, role: 'MEMBER' }
      });
      assert(addRes.status === 201, `Added member ${i}/15 to organization`);
    }

    // Attempt to add the 16th member -> MUST FAIL with MEMBER_LIMIT_EXCEEDED
    const sixteenthEmail = `colleague.16.${timestamp}@acme.test`;
    await apiRequest('/auth/register', {
      method: 'POST',
      body: { name: 'Colleague 16', email: sixteenthEmail, password: 'Password123!' }
    });
    const sixteenthRes = await apiRequest('/organizations/current/members', {
      method: 'POST',
      token: tenantToken,
      orgId: orgAId,
      body: { email: sixteenthEmail, role: 'MEMBER' }
    });
    assert([400, 403].includes(sixteenthRes.status), '16th member rejected with 400/403', sixteenthRes.data);
    assert(sixteenthRes.data.code === 'MEMBER_LIMIT_EXCEEDED', 'Error code is MEMBER_LIMIT_EXCEEDED');
    assert(sixteenthRes.data.data?.limit === 15, 'Error payload specifies limit 15');

    // Attempt to create invitation for 16th member -> MUST FAIL with MEMBER_LIMIT_EXCEEDED
    const inviteRes = await apiRequest('/organizations/current/invitations', {
      method: 'POST',
      token: tenantToken,
      orgId: orgAId,
      body: { email: `invite.overflow.${timestamp}@acme.test`, role: 'MEMBER' }
    });
    assert([400, 403].includes(inviteRes.status), 'Invitation at max quota rejected with 400/403', inviteRes.data);
    assert(inviteRes.data.code === 'MEMBER_LIMIT_EXCEEDED', 'Invitation error code is MEMBER_LIMIT_EXCEEDED');

    // -------------------------------------------------------------------------
    // 6. Concurrent Requests Cannot Bypass Quotas
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Concurrency Safety: Mutex Prevents Quota Bypass ---');
    const raceOrgOwnerEmail = `race.owner.${timestamp}@racetest.test`;
    const regRace = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Race Owner',
        email: raceOrgOwnerEmail,
        password: 'Password123!',
        organizationName: `Race Mutex Org ${timestamp}`
      }
    });
    const raceToken = regRace.data.data.token;
    const raceOrgId = regRace.data.data.activeOrganization._id;

    // Create 9 resources
    for (let i = 1; i <= 9; i++) {
      await apiRequest('/resources', {
        method: 'POST',
        token: raceToken,
        orgId: raceOrgId,
        body: {
          name: `Race Resource ${i}`,
          category: 'SPACES',
          description: `Resource ${i}`,
          location: `Rm ${i}`
        }
      });
    }

    // Now fire 5 concurrent requests to create resources at the exact same instant
    console.log('   Firing 5 simultaneous resource creation requests at quota 9/10...');
    const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
      apiRequest('/resources', {
        method: 'POST',
        token: raceToken,
        orgId: raceOrgId,
        body: {
          name: `Concurrent Unit ${i}`,
          category: 'SPACES',
          description: `Unit ${i}`,
          location: 'Lab'
        }
      })
    );

    const raceResults = await Promise.all(concurrentRequests);
    const successfulCreates = raceResults.filter(r => r.status === 201);
    const rejectedCreates = raceResults.filter(r => [400, 403].includes(r.status) && r.data.code === 'RESOURCE_LIMIT_EXCEEDED');

    assert(successfulCreates.length === 1, `Exactly 1 concurrent request succeeded (received ${successfulCreates.length})`);
    assert(rejectedCreates.length === 4, `Remaining 4 concurrent requests rejected with RESOURCE_LIMIT_EXCEEDED (received ${rejectedCreates.length})`);

    // Verify DB count
    const raceResList = await apiRequest('/resources', { token: raceToken, orgId: raceOrgId });
    const activeCount = raceResList.data.data?.filter(r => r.isActive).length;
    assert(activeCount === 10, `Database has strictly 10 active resources after concurrency burst (actual: ${activeCount})`);

    // -------------------------------------------------------------------------
    // 7. Booking Window Limited to 7 Days into the Future
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Booking Window Enforcement (7-Day Horizon) ---');
    const validResourceId = createdResourceIds[1]; // Active resource in Org A

    // Valid booking: 2 days in future
    const now = new Date();
    const twoDaysLaterStart = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    twoDaysLaterStart.setHours(10, 0, 0, 0);
    const twoDaysLaterEnd = new Date(twoDaysLaterStart.getTime() + 2 * 60 * 60 * 1000);

    const validBooking = await apiRequest('/bookings', {
      method: 'POST',
      token: tenantToken,
      orgId: orgAId,
      body: {
        resourceId: validResourceId,
        startTime: twoDaysLaterStart.toISOString(),
        endTime: twoDaysLaterEnd.toISOString(),
        purpose: 'Sprint Planning'
      }
    });
    assert(validBooking.status === 201 && validBooking.data.success, 'Booking within 7 days succeeds (201 Created)', validBooking.data);

    // Invalid booking: 8 days in future -> MUST FAIL
    const eightDaysLaterStart = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
    eightDaysLaterStart.setHours(10, 0, 0, 0);
    const eightDaysLaterEnd = new Date(eightDaysLaterStart.getTime() + 2 * 60 * 60 * 1000);

    const invalidBooking = await apiRequest('/bookings', {
      method: 'POST',
      token: tenantToken,
      orgId: orgAId,
      body: {
        resourceId: validResourceId,
        startTime: eightDaysLaterStart.toISOString(),
        endTime: eightDaysLaterEnd.toISOString(),
        purpose: 'Future Sprint Beyond Horizon'
      }
    });
    assert(invalidBooking.status === 400, 'Booking beyond 7 days rejected with 400', invalidBooking.data);
    assert(invalidBooking.data.code === 'BOOKING_WINDOW_EXCEEDED', 'Error code is BOOKING_WINDOW_EXCEEDED');

    // Test checkAvailability beyond 7 days -> MUST FAIL
    const checkBeyond = await apiRequest(`/bookings/availability?resourceId=${validResourceId}&startTime=${eightDaysLaterStart.toISOString()}&endTime=${eightDaysLaterEnd.toISOString()}`, {
      token: tenantToken,
      orgId: orgAId
    });
    assert(checkBeyond.status === 400, 'Availability check beyond 7 days rejected with 400', checkBeyond.data);
    assert(checkBeyond.data.code === 'BOOKING_WINDOW_EXCEEDED', 'Availability error code is BOOKING_WINDOW_EXCEEDED');

    // -------------------------------------------------------------------------
    // 8. Organization Suspension Controls & Prohibited Actions
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Organization Suspension & Real-time Isolation ---');
    // Super admin suspends Org A
    const suspendRes = await apiRequest(`/platform/organizations/${orgAId}/status`, {
      method: 'PATCH',
      token: superToken,
      body: { status: 'SUSPENDED', suspensionReason: 'Terms compliance review' }
    });
    assert(suspendRes.status === 200, 'Super admin suspended organization');
    assert(suspendRes.data.data?.status === 'SUSPENDED', 'Organization status updated to SUSPENDED');

    // Safe Read Access: Org member should still be able to GET resources (so dashboard can render banner)
    const readAfterSuspension = await apiRequest('/resources', {
      token: tenantToken,
      orgId: orgAId
    });
    assert(readAfterSuspension.status === 200, 'Suspended organization allows GET read access');

    // Blocked: Write operation - booking creation
    const writeBookingBlocked = await apiRequest('/bookings', {
      method: 'POST',
      token: tenantToken,
      orgId: orgAId,
      body: {
        resourceId: validResourceId,
        startTime: twoDaysLaterStart.toISOString(),
        endTime: twoDaysLaterEnd.toISOString(),
        purpose: 'Blocked Booking'
      }
    });
    assert(writeBookingBlocked.status === 403, 'Creating booking in suspended organization rejected with 403');
    assert(writeBookingBlocked.data.code === 'ORGANIZATION_SUSPENDED', 'Error code is ORGANIZATION_SUSPENDED');

    // Blocked: Write operation - resource creation
    const writeResourceBlocked = await apiRequest('/resources', {
      method: 'POST',
      token: tenantToken,
      orgId: orgAId,
      body: { name: 'Blocked Resource', category: 'SPACES', description: 'Blocked', location: 'Floor 1' }
    });
    assert(writeResourceBlocked.status === 403, 'Creating resource in suspended org rejected with 403');
    assert(writeResourceBlocked.data.code === 'ORGANIZATION_SUSPENDED', 'Resource error code is ORGANIZATION_SUSPENDED');

    // Blocked: Write operation - invitation creation
    const writeInviteBlocked = await apiRequest('/organizations/current/invitations', {
      method: 'POST',
      token: tenantToken,
      orgId: orgAId,
      body: { email: 'blocked@test.com', role: 'MEMBER' }
    });
    assert(writeInviteBlocked.status === 403, 'Creating invitation in suspended org rejected with 403', writeInviteBlocked.data);
    assert(writeInviteBlocked.data.code === 'ORGANIZATION_SUSPENDED', 'Invitation error code is ORGANIZATION_SUSPENDED');

    // Test Socket Isolation for Suspended Organization
    console.log('   Testing Socket.IO room rejection for suspended workspace...');
    await new Promise((resolve) => {
      const socket = ioClient(SOCKET_URL, {
        auth: { token: tenantToken },
        transports: ['websocket'],
        reconnection: false
      });

      let timeoutId = setTimeout(() => {
        assert(false, 'Socket event timed out');
        socket.disconnect();
        resolve();
      }, 4000);

      socket.on('connect', () => {
        socket.emit('join:org', orgAId);
      });

      socket.on('error:suspended', (payload) => {
        clearTimeout(timeoutId);
        assert(true, 'Socket emitted error:suspended when joining suspended organization');
        assert(payload?.organizationId === orgAId, 'Payload contains correct organizationId');
        socket.disconnect();
        resolve();
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timeoutId);
        console.error('Socket connect error:', err.message);
        socket.disconnect();
        resolve();
      });
    });

    // Super admin reactivates organization
    const reactivateOrgRes = await apiRequest(`/platform/organizations/${orgAId}/status`, {
      method: 'PATCH',
      token: superToken,
      body: { status: 'ACTIVE' }
    });
    assert(reactivateOrgRes.status === 200, 'Super admin reactivated organization');
    assert(reactivateOrgRes.data.data?.status === 'ACTIVE', 'Organization status restored to ACTIVE');

    // -------------------------------------------------------------------------
    // 9. Analytics Capacity Metrics Return Real Quota Usage
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Admin Analytics Free Plan Capacity Quotas ---');
    const analyticsRes = await apiRequest('/bookings/admin/analytics', {
      token: tenantToken,
      orgId: orgAId
    });
    assert(analyticsRes.status === 200, 'GET admin analytics returns 200', analyticsRes.data);
    const planLimits = analyticsRes.data.data?.planLimits;
    assert(planLimits?.maxResources === 10, 'Analytics reports maxResources: 10');
    assert(planLimits?.maxMembers === 15, 'Analytics reports maxMembers: 15');
    assert(planLimits?.maxBookingAdvanceDays === 7, 'Analytics reports maxBookingAdvanceDays: 7');
    assert(typeof planLimits?.resourceCapacityPct === 'number', 'Analytics reports resourceCapacityPct');
    assert(typeof planLimits?.memberCapacityPct === 'number', 'Analytics reports memberCapacityPct');

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log(`\n================================================================`);
    console.log(`FREE PLAN & PLATFORM ADMIN TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log(`================================================================\n`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
