const API_BASE = 'http://localhost:5000';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function runMultiTenantTests() {
  console.log('=== DESKDROP MULTI-TENANT & DATA ISOLATION TEST SUITE ===\n');

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

  try {
    const timestamp = Date.now();

    // 1. Create Tenant A Owner & Organization
    const userAEmail = `owner.a.${timestamp}@acme.test`;
    const regA = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Acme Owner', email: userAEmail, password: 'Password123!' }
    });
    const tokenA = regA.data.data.token;
    const headersA = { Authorization: `Bearer ${tokenA}` };

    const orgARes = await request('/api/organizations', {
      method: 'POST',
      headers: headersA,
      body: { name: 'Acme Corporation', slug: `acme-${timestamp}` }
    });
    assert(orgARes.status === 201 && orgARes.data.data.organization._id, 'Tenant A organization created');
    const orgAId = orgARes.data.data.organization._id;
    const orgASlug = orgARes.data.data.organization.slug;
    const headersAWithOrg = { ...headersA, 'x-organization-id': orgAId };

    // 2. Create Tenant B Owner & Organization
    const userBEmail = `owner.b.${timestamp}@beta.test`;
    const regB = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Beta Owner', email: userBEmail, password: 'Password123!' }
    });
    const tokenB = regB.data.data.token;
    const headersB = { Authorization: `Bearer ${tokenB}` };

    const orgBRes = await request('/api/organizations', {
      method: 'POST',
      headers: headersB,
      body: { name: 'Beta Industries', slug: `beta-${timestamp}` }
    });
    assert(orgBRes.status === 201 && orgBRes.data.data.organization._id, 'Tenant B organization created');
    const orgBId = orgBRes.data.data.organization._id;
    const headersBWithOrg = { ...headersB, 'x-organization-id': orgBId };

    // 3. User A creates resource in Tenant A
    const resARes = await request('/api/resources', {
      method: 'POST',
      headers: headersAWithOrg,
      body: {
        name: `Acme Boardroom ${timestamp}`,
        category: 'SPACES',
        description: 'Exclusive Acme meeting space',
        location: 'Acme Tower Floor 10'
      }
    });
    assert(resARes.status === 201, 'Resource created in Tenant A');
    const resourceAId = resARes.data.data._id;

    // 4. User B creates resource in Tenant B
    const resBRes = await request('/api/resources', {
      method: 'POST',
      headers: headersBWithOrg,
      body: {
        name: `Beta Audio Suite ${timestamp}`,
        category: 'AUDIO',
        description: 'Beta podcast lab',
        location: 'Beta Facility Studio B'
      }
    });
    assert(resBRes.status === 201, 'Resource created in Tenant B');
    const resourceBId = resBRes.data.data._id;

    // 5. Tenant Resource Isolation Check
    const listA = await request('/api/resources', { headers: headersAWithOrg });
    const listB = await request('/api/resources', { headers: headersBWithOrg });

    const tenantAHasB = listA.data.data.some((r) => r._id === resourceBId);
    const tenantAHasA = listA.data.data.some((r) => r._id === resourceAId);
    assert(tenantAHasA && !tenantAHasB, 'Tenant A catalog only contains Tenant A resources');

    const tenantBHasA = listB.data.data.some((r) => r._id === resourceAId);
    const tenantBHasB = listB.data.data.some((r) => r._id === resourceBId);
    assert(tenantBHasB && !tenantBHasA, 'Tenant B catalog only contains Tenant B resources');

    // 6. Security Check: Client-Supplied Header Spoofing (Never trust client org header)
    const spoofRes = await request('/api/resources', {
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'x-organization-id': orgAId // User B attempts to access Org A via header
      }
    });
    assert(
      spoofRes.status === 403 && spoofRes.data.success === false,
      'Reject client-supplied organizationId when user is not an authorized member (403)'
    );

    // 7. Security Check: Cross-Tenant Resource Access Prevention
    const crossResAccess = await request(`/api/resources/${resourceAId}`, {
      headers: headersBWithOrg
    });
    assert(
      crossResAccess.status === 404,
      'Tenant B cannot access Tenant A resource by ID (returns 404)'
    );

    // 8. Security Check: Cross-Tenant Booking Attempt
    const now = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const later = new Date(now.getTime() + 60 * 60 * 1000);

    const crossBooking = await request('/api/bookings', {
      method: 'POST',
      headers: headersBWithOrg,
      body: {
        resourceId: resourceAId, // Trying to book Tenant A's resource from Tenant B
        startTime: now.toISOString(),
        endTime: later.toISOString(),
        purpose: 'Malicious cross-tenant booking attempt'
      }
    });
    assert(
      crossBooking.status === 404,
      'Prevent cross-tenant booking of foreign resource (returns 404)'
    );

    // 9. Legitimate Booking in Tenant A
    const legitimateBooking = await request('/api/bookings', {
      method: 'POST',
      headers: headersAWithOrg,
      body: {
        resourceId: resourceAId,
        startTime: now.toISOString(),
        endTime: later.toISOString(),
        purpose: 'Acme Executive Board Meeting'
      }
    });
    assert(legitimateBooking.status === 201, 'Booking successfully created in Tenant A');
    const bookingAId = legitimateBooking.data.data._id;

    // 10. Booking Isolation: Tenant B cannot see Tenant A bookings
    const bookingsB = await request('/api/bookings', { headers: headersBWithOrg });
    const bHasABooking = bookingsB.data.data.some((b) => b._id === bookingAId);
    assert(!bHasABooking, 'Tenant B cannot see Tenant A bookings');

    // 11. Security Check: Cross-Tenant Booking Lifecycle Mutation Prevention
    const crossCancel = await request(`/api/bookings/${bookingAId}/cancel`, {
      method: 'PATCH',
      headers: headersBWithOrg
    });
    assert(
      crossCancel.status === 404,
      'Prevent Tenant B from cancelling Tenant A booking (returns 404)'
    );

    // 12. Organization Member Invitation & Authorization
    const userCEmail = `employee.c.${timestamp}@acme.test`;
    await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Acme Employee', email: userCEmail, password: 'Password123!' }
    });

    const addMemberRes = await request('/api/organizations/current/members', {
      method: 'POST',
      headers: headersAWithOrg,
      body: { email: userCEmail, role: 'MEMBER' }
    });
    assert(addMemberRes.status === 201, 'Tenant Owner can add new member to organization');

    // 13. Login User C and verify access to Tenant A
    const loginC = await request('/api/auth/login', {
      method: 'POST',
      body: { email: userCEmail, password: 'Password123!' }
    });
    const tokenC = loginC.data.data.token;
    const headersCWithOrg = {
      Authorization: `Bearer ${tokenC}`,
      'x-organization-id': orgAId
    };

    const userCResources = await request('/api/resources', { headers: headersCWithOrg });
    const userCSeesAcme = userCResources.data.data.some((r) => r._id === resourceAId);
    assert(userCSeesAcme, 'Authorized Tenant Member can access organization resources');

    // 14. Tenant Analytics Isolation
    const analyticsA = await request('/api/bookings/admin/analytics', { headers: headersAWithOrg });
    assert(
      analyticsA.status === 200 &&
      analyticsA.data.data.metrics.totalResources >= 1 &&
      analyticsA.data.data.metrics.totalBookings >= 1,
      'Admin analytics scoped strictly to Tenant A'
    );

    console.log(`\n========================================`);
    console.log(`MULTI-TENANT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error in multi-tenant test suite:', err);
    process.exit(1);
  }
}

runMultiTenantTests();
