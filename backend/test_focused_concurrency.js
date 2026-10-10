require('dotenv').config();
const mongoose = require('mongoose');
const { Booking } = require('./models/Booking');
const { Resource } = require('./models/Resource');
const { Organization } = require('./models/Organization');
const { ResourceLock } = require('./models/ResourceLock');

const BASE_URL = 'http://localhost:5000';

async function postBooking(body, headers) {
  try {
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return { status: res.status, data };
  } catch (err) {
    return { status: 500, data: { message: err.message } };
  }
}

async function runFocusedConcurrencyTest() {
  console.log('================================================================');
  console.log('DESKDROP FOCUSED BOOKING CONCURRENCY PROTECTION VERIFICATION');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/deskdrop');

  // Login as seeded user to get legitimate JWT and active organization
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'alex.chen@deskdrop.internal',
      password: 'password123'
    })
  });
  const loginJson = await loginRes.json();
  if (!loginJson.success || !loginJson.data?.token) {
    throw new Error('Failed to login as alex.chen: ' + JSON.stringify(loginJson));
  }

  const token = loginJson.data.token;
  const orgId = loginJson.data.activeOrganization._id;

  const headers = {
    Authorization: `Bearer ${token}`,
    'x-organization-id': orgId.toString()
  };

  // Create or retrieve two dedicated test resources
  let resA = await Resource.findOne({ name: 'Concurrency Room Alpha', organizationId: orgId });
  if (!resA) {
    resA = await Resource.create({
      organizationId: orgId,
      name: 'Concurrency Room Alpha',
      category: 'SPACES',
      description: 'Test Room for Concurrency',
      location: 'Floor 1',
      status: 'AVAILABLE',
      isActive: true
    });
  }

  let resB = await Resource.findOne({ name: 'Concurrency Room Beta', organizationId: orgId });
  if (!resB) {
    resB = await Resource.create({
      organizationId: orgId,
      name: 'Concurrency Room Beta',
      category: 'SPACES',
      description: 'Second Test Room for Concurrency',
      location: 'Floor 2',
      status: 'AVAILABLE',
      isActive: true
    });
  }

  // Clear any existing bookings/locks for these test resources
  await Booking.deleteMany({
    resourceId: { $in: [resA._id, resB._id] },
    organizationId: orgId
  });
  await ResourceLock.deleteMany({
    _id: { $in: [resA._id, resB._id] }
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setMinutes(0, 0, 0);

  // --------------------------------------------------------------------------
  // TEST 1: Simultaneous Overlapping Bookings for the SAME Resource
  // --------------------------------------------------------------------------
  console.log('[Test 1] 10 Simultaneous requests for overlapping slot on Room Alpha...');
  const slot1Start = new Date(tomorrow);
  slot1Start.setHours(10, 0, 0, 0);
  const slot1End = new Date(tomorrow);
  slot1End.setHours(11, 0, 0, 0);

  const concurrencyCount = 10;
  const simultaneousRequests = Array.from({ length: concurrencyCount }, (_, i) => {
    return postBooking(
      {
        resourceId: resA._id.toString(),
        startTime: slot1Start.toISOString(),
        endTime: slot1End.toISOString(),
        purpose: `Race Condition Candidate #${i + 1}`
      },
      headers
    );
  });

  const results1 = await Promise.all(simultaneousRequests);

  const successCount = results1.filter((r) => r.status === 201).length;
  const conflictCount = results1.filter((r) => r.status === 409).length;
  const conflictCodes = results1
    .filter((r) => r.status === 409)
    .map((r) => r.data.code);

  console.log(` -> HTTP 201 Created: ${successCount}`);
  console.log(` -> HTTP 409 Conflict: ${conflictCount}`);

  if (successCount !== 1) {
    console.error('All responses:', results1);
    throw new Error(`Expected exactly 1 booking to succeed, but ${successCount} succeeded!`);
  }
  if (conflictCount !== concurrencyCount - 1) {
    throw new Error(`Expected ${concurrencyCount - 1} conflicts, but got ${conflictCount}!`);
  }

  const allHaveConflictCode = conflictCodes.every((c) => c === 'BOOKING_CONFLICT');
  if (!allHaveConflictCode) {
    throw new Error('Not all 409 responses contained code: BOOKING_CONFLICT');
  }

  // Verify database count
  const dbBookingsA = await Booking.find({
    resourceId: resA._id,
    startTime: slot1Start,
    endTime: slot1End,
    status: { $in: ['CONFIRMED', 'ACTIVE'] }
  });

  if (dbBookingsA.length !== 1) {
    throw new Error(`Database check failed: found ${dbBookingsA.length} confirmed bookings in DB!`);
  }
  console.log('✅ [PASS] Exactly 1 booking confirmed, 9 rejected with 409 BOOKING_CONFLICT, 0 double-bookings in DB.\n');

  // --------------------------------------------------------------------------
  // TEST 2: Simultaneous NON-Overlapping Bookings on the SAME Resource
  // --------------------------------------------------------------------------
  console.log('[Test 2] Simultaneous requests for NON-overlapping slots on Room Alpha...');
  const nonOverlappingSlots = [
    { startHours: 13, endHours: 14, purpose: 'Afternoon Slot 1' },
    { startHours: 14, endHours: 15, purpose: 'Afternoon Slot 2' },
    { startHours: 15, endHours: 16, purpose: 'Afternoon Slot 3' }
  ];

  const nonOverlappingReqs = nonOverlappingSlots.map((slot) => {
    const s = new Date(tomorrow);
    s.setHours(slot.startHours, 0, 0, 0);
    const e = new Date(tomorrow);
    e.setHours(slot.endHours, 0, 0, 0);
    return postBooking(
      {
        resourceId: resA._id.toString(),
        startTime: s.toISOString(),
        endTime: e.toISOString(),
        purpose: slot.purpose
      },
      headers
    );
  });

  const results2 = await Promise.all(nonOverlappingReqs);
  const successCount2 = results2.filter((r) => r.status === 201).length;
  console.log(` -> HTTP 201 Created: ${successCount2} / ${nonOverlappingSlots.length}`);

  if (successCount2 !== nonOverlappingSlots.length) {
    throw new Error(`Expected all ${nonOverlappingSlots.length} non-overlapping bookings to succeed, but got ${successCount2}!`);
  }
  console.log('✅ [PASS] All valid non-overlapping bookings for the same resource succeeded.\n');

  // --------------------------------------------------------------------------
  // TEST 3: Simultaneous Bookings for DIFFERENT Resources at the Same Time
  // --------------------------------------------------------------------------
  console.log('[Test 3] Simultaneous requests for DIFFERENT resources (Room Alpha & Room Beta)...');
  const slot3Start = new Date(tomorrow);
  slot3Start.setHours(17, 0, 0, 0);
  const slot3End = new Date(tomorrow);
  slot3End.setHours(18, 0, 0, 0);

  const diffResourceReqs = [resA, resB].map((r, idx) => {
    return postBooking(
      {
        resourceId: r._id.toString(),
        startTime: slot3Start.toISOString(),
        endTime: slot3End.toISOString(),
        purpose: `Concurrent Resource Test ${idx + 1}`
      },
      headers
    );
  });

  const results3 = await Promise.all(diffResourceReqs);
  const successCount3 = results3.filter((r) => r.status === 201).length;
  console.log(` -> HTTP 201 Created: ${successCount3} / 2`);

  if (successCount3 !== 2) {
    throw new Error(`Expected both different-resource bookings to succeed, but got ${successCount3}!`);
  }
  console.log('✅ [PASS] Concurrent bookings for different resources both succeeded without blocking each other.\n');

  // --------------------------------------------------------------------------
  // TEST 4: Direct Database Atomic Lock & Lease Expiration Verification
  // --------------------------------------------------------------------------
  console.log('[Test 4] Direct MongoDB ResourceLock atomicity & lease expiry test...');
  const dummyResId = new mongoose.Types.ObjectId();
  const token1 = 'token_worker_A';
  const token2 = 'token_worker_B';
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 500); // 500ms short lease

  // Worker A acquires lock
  const doc1 = await ResourceLock.findOneAndUpdate(
    {
      _id: dummyResId,
      $or: [{ expiresAt: { $lt: now } }, { expiresAt: { $exists: false } }]
    },
    {
      $set: { organizationId: orgId, lockId: token1, expiresAt: expiresAt }
    },
    { upsert: true, new: true }
  );

  if (!doc1 || doc1.lockId !== token1) {
    throw new Error('Worker A failed to acquire initial lock');
  }

  // Worker B immediately tries to acquire while Worker A holds it
  let workerBSuccess = false;
  try {
    const doc2 = await ResourceLock.findOneAndUpdate(
      {
        _id: dummyResId,
        $or: [{ expiresAt: { $lt: new Date() } }, { expiresAt: { $exists: false } }]
      },
      {
        $set: { organizationId: orgId, lockId: token2, expiresAt: new Date(Date.now() + 500) }
      },
      { upsert: true, new: true }
    );
    if (doc2 && doc2.lockId === token2) workerBSuccess = true;
  } catch (err) {
    if (err.code === 11000) {
      workerBSuccess = false;
    } else {
      throw err;
    }
  }

  if (workerBSuccess) {
    throw new Error('Worker B acquired lock while Worker A held active lease!');
  }

  // Wait for 600ms for Worker A lease to expire
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Worker B retries after lease expired -> must succeed!
  const doc3 = await ResourceLock.findOneAndUpdate(
    {
      _id: dummyResId,
      $or: [{ expiresAt: { $lt: new Date() } }, { expiresAt: { $exists: false } }]
    },
    {
      $set: { organizationId: orgId, lockId: token2, expiresAt: new Date(Date.now() + 1000) }
    },
    { upsert: true, new: true }
  );

  if (!doc3 || doc3.lockId !== token2) {
    throw new Error('Worker B failed to acquire lock after Worker A lease expired!');
  }

  // Worker B releases
  await ResourceLock.deleteOne({ _id: dummyResId, lockId: token2 });
  console.log('✅ [PASS] Direct MongoDB atomic lock, mutual exclusion, and lease recovery verified.\n');

  // Clean up test resources and bookings
  await Booking.deleteMany({
    resourceId: { $in: [resA._id, resB._id] },
    organizationId: orgId
  });
  await Resource.deleteMany({ _id: { $in: [resA._id, resB._id] } });
  await ResourceLock.deleteMany({ _id: { $in: [resA._id, resB._id, dummyResId] } });

  console.log('================================================================');
  console.log('ALL FOCUSED CONCURRENCY CHECKS PASSED SUCCESSFULLY!');
  console.log('================================================================');

  await mongoose.disconnect();
}

runFocusedConcurrencyTest().catch((err) => {
  console.error('\n❌ CONCURRENCY TEST FAILED:', err.message);
  process.exit(1);
});
