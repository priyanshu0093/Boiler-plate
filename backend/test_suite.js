const http = require('http');

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
  const data = await response.json();
  return { status: response.status, data };
}

async function runTests() {
  console.log('=== DESKDROP COMPREHENSIVE BACKEND TEST SUITE ===\n');

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
    // 1. Health check
    const health = await request('/health');
    assert(health.status === 200 && health.data.success === true, 'GET /health returns 200 and success: true');

    // 2. Password validation checks on registration
    const weakShort = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Weak', email: `weak1.${Date.now()}@test.internal`, password: 'Short1!' }
    });
    assert(weakShort.status === 400, 'POST /api/auth/register rejects password shorter than 8 characters');

    const weakNoUpper = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Weak', email: `weak2.${Date.now()}@test.internal`, password: 'password123!' }
    });
    assert(weakNoUpper.status === 400, 'POST /api/auth/register rejects password missing uppercase');

    const weakNoLower = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Weak', email: `weak3.${Date.now()}@test.internal`, password: 'PASSWORD123!' }
    });
    assert(weakNoLower.status === 400, 'POST /api/auth/register rejects password missing lowercase');

    const weakNoNum = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Weak', email: `weak4.${Date.now()}@test.internal`, password: 'Password!@#' }
    });
    assert(weakNoNum.status === 400, 'POST /api/auth/register rejects password missing numbers');

    const weakNoSpecial = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Weak', email: `weak5.${Date.now()}@test.internal`, password: 'Password123' }
    });
    assert(weakNoSpecial.status === 400, 'POST /api/auth/register rejects password missing special characters');

    // 2b. Register new employee with valid strong password
    const uniqueEmail = `test.emp.${Date.now()}@deskdrop.internal`;
    const reg = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Automated Tester',
        email: uniqueEmail,
        password: 'Password123!'
      }
    });
    assert(reg.status === 201 && reg.data.data.token, 'POST /api/auth/register creates user and returns token with strong password');

    // 3. Login existing seeded employee
    const login = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'alex.chen@deskdrop.internal',
        password: 'password123'
      }
    });
    assert(login.status === 200 && login.data.data.token, 'POST /api/auth/login succeeds with valid credentials');
    const token = login.data.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@deskdrop.internal',
        password: 'password123'
      }
    });
    const adminHeaders = { Authorization: `Bearer ${adminLogin.data.data.token}` };

    // 4. Test /api/auth/me
    const me = await request('/api/auth/me', { headers: authHeaders });
    assert(me.status === 200 && me.data.data.user.email === 'alex.chen@deskdrop.internal', 'GET /api/auth/me returns employee profile without password');
    assert(me.data.data.user.password === undefined, 'User object omits password hash');

    // 5. Test Resources listing and filtering
    let allResources = await request('/api/resources');

    // Clean up any temporary test resources from previous aborted runs so active quota stays <= 9
    for (const r of (allResources.data.data || [])) {
      if (r.name.startsWith('Temporary Device')) {
        await request(`/api/resources/${r._id}`, { method: 'DELETE', headers: adminHeaders });
      }
    }
    allResources = await request('/api/resources');
    assert(allResources.status === 200 && allResources.data.count >= 9, `GET /api/resources returns seeded resources (count: ${allResources.data.count})`);

    const audioResources = await request('/api/resources?category=AUDIO');
    assert(audioResources.status === 200 && audioResources.data.count >= 2, 'GET /api/resources?category=AUDIO filters correctly');

    const boardroom = allResources.data.data.find(r => r.name.includes('Boardroom Alpha'));
    assert(boardroom !== undefined, 'Boardroom Alpha exists in seed data');
    const resourceId = boardroom._id;

    // 6. Test Create Resource
    const newResource = await request('/api/resources', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: `Temporary Device ${Date.now()}`,
        category: 'TESTING_HARDWARE',
        description: 'Test rig for QA',
        location: 'QA Bench 4'
      }
    });
    assert(newResource.status === 201 && newResource.data.data.name.startsWith('Temporary Device'), 'POST /api/resources creates resource');
    const tempResourceId = newResource.data.data._id;

    // 7. Test Availability API on free slot (use dynamic future time within 7-day limit)
    const randomHours = 24 + Math.floor(Math.random() * 115);
    const baseDate = new Date(Date.now() + randomHours * 60 * 60 * 1000);
    baseDate.setMinutes(0, 0, 0);

    const slotStart = new Date(baseDate.getTime());
    const slotEnd = new Date(baseDate.getTime() + 60 * 60 * 1000);

    const availFree = await request(`/api/bookings/availability?resourceId=${resourceId}&startTime=${slotStart.toISOString()}&endTime=${slotEnd.toISOString()}`);
    assert(availFree.status === 200 && availFree.data.data.available === true, 'GET /api/bookings/availability returns available: true for free slot');

    // 8. Create booking (CONFIRMED)
    const booking1 = await request('/api/bookings', {
      method: 'POST',
      headers: authHeaders,
      body: {
        resourceId,
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        purpose: 'Architecture Review'
      }
    });
    assert(booking1.status === 201 && booking1.data.data.status === 'CONFIRMED', 'POST /api/bookings creates CONFIRMED booking');
    const booking1Id = booking1.data.data._id;

    // 9. Conflict Detection Test 1: Overlapping slot (starts 30m after slotStart) -> MUST BE 409
    const overlap1Start = new Date(slotStart.getTime() + 30 * 60 * 1000);
    const overlap1End = new Date(slotEnd.getTime() + 30 * 60 * 1000);
    const conflictBooking1 = await request('/api/bookings', {
      method: 'POST',
      headers: authHeaders,
      body: {
        resourceId,
        startTime: overlap1Start.toISOString(),
        endTime: overlap1End.toISOString(),
        purpose: 'Conflicting booking partial overlap'
      }
    });
    assert(conflictBooking1.status === 409 && conflictBooking1.data.success === false, 'POST /api/bookings returns 409 on partial overlap (10:30 - 11:30)');

    // 10. Conflict Detection Test 2: Inside slot (15m to 45m inside) -> MUST BE 409
    const overlap2Start = new Date(slotStart.getTime() + 15 * 60 * 1000);
    const overlap2End = new Date(slotStart.getTime() + 45 * 60 * 1000);
    const conflictBooking2 = await request('/api/bookings', {
      method: 'POST',
      headers: authHeaders,
      body: {
        resourceId,
        startTime: overlap2Start.toISOString(),
        endTime: overlap2End.toISOString(),
        purpose: 'Conflicting booking inside slot'
      }
    });
    assert(conflictBooking2.status === 409, 'POST /api/bookings returns 409 on enclosed overlap (10:15 - 10:45)');

    // 11. Availability API returns conflict
    const availConflict = await request(`/api/bookings/availability?resourceId=${resourceId}&startTime=${overlap1Start.toISOString()}&endTime=${overlap1End.toISOString()}`);
    assert(availConflict.data.data.available === false && availConflict.data.data.conflict !== undefined, 'GET /api/bookings/availability returns available: false with conflict details');

    // 12. Non-conflicting adjacent slot (exact back-to-back from slotEnd) -> MUST SUCCEED (201)
    const adjacentStart = new Date(slotEnd.getTime());
    const adjacentEnd = new Date(slotEnd.getTime() + 60 * 60 * 1000);
    const adjacentBooking = await request('/api/bookings', {
      method: 'POST',
      headers: authHeaders,
      body: {
        resourceId,
        startTime: adjacentStart.toISOString(),
        endTime: adjacentEnd.toISOString(),
        purpose: 'Adjacent meeting starting exactly at previous end'
      }
    });
    assert(adjacentBooking.status === 201, 'POST /api/bookings allows back-to-back adjacent booking starting at previous end time');
    const adjacentId = adjacentBooking.data.data._id;

    // 13. Test Check-in Lifecycle on a current booking
    // Create a current booking (starts now, ends in 1 hour)
    const currentStart = new Date(Date.now() + 60 * 1000); // 1 min in future
    const currentEnd = new Date(Date.now() + 60 * 60 * 1000); // 60 mins in future

    const currentBooking = await request('/api/bookings', {
      method: 'POST',
      headers: authHeaders,
      body: {
        resourceId: tempResourceId,
        startTime: currentStart.toISOString(),
        endTime: currentEnd.toISOString(),
        purpose: 'Device QA testing session'
      }
    });
    assert(currentBooking.status === 201, 'Created active window booking for check-in test');
    const liveBookingId = currentBooking.data.data._id;

    // Perform check-in (CONFIRMED -> ACTIVE)
    const checkIn = await request(`/api/bookings/${liveBookingId}/check-in`, {
      method: 'PATCH',
      headers: authHeaders
    });
    assert(checkIn.status === 200 && checkIn.data.data.status === 'ACTIVE', 'PATCH /api/bookings/:id/check-in transitions CONFIRMED -> ACTIVE');

    // 14. Verify resource status became IN_USE
    const resourceInUse = await request(`/api/resources/${tempResourceId}`);
    assert(resourceInUse.data.data.resource.status === 'IN_USE', 'Resource status transitioned to IN_USE after check-in');

    // 15. Invalid transition: CANCEL on ACTIVE must fail
    const invalidCancel = await request(`/api/bookings/${liveBookingId}/cancel`, {
      method: 'PATCH',
      headers: authHeaders
    });
    assert(invalidCancel.status === 400 && invalidCancel.data.success === false, 'PATCH /api/bookings/:id/cancel fails on ACTIVE booking with 400');

    // 16. Perform check-out (ACTIVE -> COMPLETED)
    const checkOut = await request(`/api/bookings/${liveBookingId}/check-out`, {
      method: 'PATCH',
      headers: authHeaders
    });
    assert(checkOut.status === 200 && checkOut.data.data.status === 'COMPLETED', 'PATCH /api/bookings/:id/check-out transitions ACTIVE -> COMPLETED');

    // 17. Verify resource status reverted to AVAILABLE
    const resourceAvail = await request(`/api/resources/${tempResourceId}`);
    assert(resourceAvail.data.data.resource.status === 'AVAILABLE', 'Resource status reverted to AVAILABLE after check-out');

    // 18. Invalid transition: CHECK-IN on COMPLETED must fail
    const invalidCheckIn = await request(`/api/bookings/${liveBookingId}/check-in`, {
      method: 'PATCH',
      headers: authHeaders
    });
    assert(invalidCheckIn.status === 400, 'PATCH /api/bookings/:id/check-in fails on COMPLETED booking with 400');

    // 19. Test Cancellation on CONFIRMED booking (CONFIRMED -> CANCELLED)
    const cancel = await request(`/api/bookings/${adjacentId}/cancel`, {
      method: 'PATCH',
      headers: authHeaders
    });
    assert(cancel.status === 200 && cancel.data.data.status === 'CANCELLED', 'PATCH /api/bookings/:id/cancel transitions CONFIRMED -> CANCELLED');

    // 20. Verify cancelled slot is now available again for booking
    const rebookCancelledSlot = await request('/api/bookings', {
      method: 'POST',
      headers: authHeaders,
      body: {
        resourceId,
        startTime: adjacentStart.toISOString(),
        endTime: adjacentEnd.toISOString(),
        purpose: 'Rebooking previously cancelled slot'
      }
    });
    assert(rebookCancelledSlot.status === 201, 'Cancelled booking frees slot and allows rebooking');

    // 21. Maintenance resource rejection test
    await request(`/api/resources/${tempResourceId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { status: 'MAINTENANCE' }
    });

    const maintBooking = await request('/api/bookings', {
      method: 'POST',
      headers: authHeaders,
      body: {
        resourceId: tempResourceId,
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        purpose: 'Attempt to book maintenance equipment'
      }
    });
    assert(maintBooking.status === 400 && maintBooking.data.message.includes('maintenance'), 'POST /api/bookings rejects booking on MAINTENANCE resource with 400');

    // 22. Past booking rejection test
    const pastBooking = await request('/api/bookings', {
      method: 'POST',
      headers: authHeaders,
      body: {
        resourceId,
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        purpose: 'Past booking'
      }
    });
    assert(pastBooking.status === 400 && pastBooking.data.message.includes('past'), 'POST /api/bookings rejects booking in the past with 400');

    // 23. Invalid date order test (startTime >= endTime)
    const invalidDateOrder = await request('/api/bookings', {
      method: 'POST',
      headers: authHeaders,
      body: {
        resourceId,
        startTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        purpose: 'Backwards time booking'
      }
    });
    assert(invalidDateOrder.status === 400, 'POST /api/bookings rejects startTime >= endTime with 400');

    // Clean up temporary device and test bookings so test is idempotent
    if (tempResourceId) {
      await request(`/api/resources/${tempResourceId}`, {
        method: 'DELETE',
        headers: adminHeaders
      });
    }
    if (booking1Id) {
      await request(`/api/bookings/${booking1Id}/cancel`, {
        method: 'PATCH',
        headers: authHeaders
      });
    }
    if (rebookCancelledSlot?.data?.data?._id) {
      await request(`/api/bookings/${rebookCancelledSlot.data.data._id}/cancel`, {
        method: 'PATCH',
        headers: authHeaders
      });
    }

    console.log(`\n========================================`);
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error in test suite:', err);
    process.exit(1);
  }
}

runTests();
