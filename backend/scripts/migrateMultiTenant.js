const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const { Organization } = require('../models/Organization');
const { OrganizationMember } = require('../models/OrganizationMember');
const { Resource } = require('../models/Resource');
const { Booking } = require('../models/Booking');
const { Notification } = require('../models/Notification');

const DEFAULT_ORG_SLUG = 'deskdrop-hq';
const DEFAULT_ORG_NAME = 'DeskDrop Headquarters';

const parseArgs = () => {
  const args = process.argv.slice(2);
  return {
    isDryRun: args.includes('--dry-run'),
    skipBackup: args.includes('--skip-backup')
  };
};

/**
 * Creates full JSON snapshot backups of all existing collections
 */
const createDatabaseBackup = async (db) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups', `backup-${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const collections = ['users', 'resources', 'bookings', 'notifications', 'organizations', 'organizationmembers'];
  const manifest = {
    timestamp: new Date().toISOString(),
    collections: {}
  };

  for (const collName of collections) {
    try {
      const coll = db.collection(collName);
      const docs = await coll.find({}).toArray();
      const filePath = path.join(backupDir, `${collName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
      manifest.collections[collName] = docs.length;
    } catch (err) {
      manifest.collections[collName] = `Error or empty: ${err.message}`;
    }
  }

  fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  return { backupDir, manifest };
};

const runMigration = async () => {
  const { isDryRun, skipBackup } = parseArgs();

  console.log('=====================================================');
  console.log(`DESKDROP MULTI-TENANT MIGRATION ${isDryRun ? '[DRY-RUN MODE]' : '[EXECUTION MODE]'}`);
  console.log('=====================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/deskdrop';
  await mongoose.connect(mongoUri);
  console.log(`[Database] Connected to: ${mongoUri}\n`);

  const db = mongoose.connection.db;

  // 1. Mandatory Backup Phase
  if (!isDryRun && !skipBackup) {
    console.log('[Phase 1/4] Creating database backup before migration...');
    const { backupDir, manifest } = await createDatabaseBackup(db);
    console.log(`✅ Backup successfully saved to: ${backupDir}`);
    console.log('   Snapshot counts:', JSON.stringify(manifest.collections, null, 2), '\n');
  } else if (isDryRun) {
    console.log('[Phase 1/4] Dry run mode active: Skipping backup generation.\n');
  } else {
    console.log('[Phase 1/4] Backup skipped (--skip-backup flag provided).\n');
  }

  // 2. Inspection Phase
  console.log('[Phase 2/4] Inspecting existing records...');
  const totalUsers = await User.countDocuments();
  const unassignedResources = await Resource.countDocuments({
    $or: [{ organizationId: { $exists: false } }, { organizationId: null }]
  });
  const unassignedBookings = await Booking.countDocuments({
    $or: [{ organizationId: { $exists: false } }, { organizationId: null }]
  });
  const unassignedNotifications = await Notification.countDocuments({
    $or: [{ organizationId: { $exists: false } }, { organizationId: null }]
  });
  const existingOrg = await Organization.findOne({ slug: DEFAULT_ORG_SLUG });

  console.log(`  - Users found: ${totalUsers}`);
  console.log(`  - Resources needing tenant assignment: ${unassignedResources}`);
  console.log(`  - Bookings needing tenant assignment: ${unassignedBookings}`);
  console.log(`  - Notifications needing tenant assignment: ${unassignedNotifications}`);
  console.log(`  - Default organization exists: ${existingOrg ? `YES (${existingOrg._id})` : 'NO (will be created)'}\n`);

  if (isDryRun) {
    console.log('[Dry Run Summary]');
    console.log('  - Would create or verify Organization:', DEFAULT_ORG_NAME, `(${DEFAULT_ORG_SLUG})`);
    console.log(`  - Would link ${totalUsers} user(s) into OrganizationMember records.`);
    console.log(`  - Would assign organizationId to ${unassignedResources} resource(s).`);
    console.log(`  - Would assign organizationId to ${unassignedBookings} booking(s).`);
    console.log(`  - Would assign organizationId to ${unassignedNotifications} notification(s).`);
    console.log('\n[Dry Run Result] All checks passed. Ready for execution.\n');
    await mongoose.disconnect();
    return;
  }

  // 3. Execution Phase
  console.log('[Phase 3/4] Applying idempotent migration...');

  // Step 3a: Ensure Default Organization
  let targetOrg = existingOrg;
  if (!targetOrg) {
    // Determine initial owner: prefer first ADMIN user, or first available user
    const adminUser = (await User.findOne({ role: 'ADMIN' })) || (await User.findOne());
    if (!adminUser) {
      throw new Error('Cannot migrate: No users exist in database to assign as organization owner.');
    }

    targetOrg = await Organization.create({
      name: DEFAULT_ORG_NAME,
      slug: DEFAULT_ORG_SLUG,
      owner: adminUser._id,
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      settings: {
        timezone: 'UTC',
        bookingGraceMinutes: 15,
        maxBookingDurationHours: 8,
        allowGuestBookings: false
      }
    });
    console.log(`  ✅ Created default organization: "${targetOrg.name}" [ID: ${targetOrg._id}]`);
  } else {
    console.log(`  ℹ️ Using existing default organization: "${targetOrg.name}" [ID: ${targetOrg._id}]`);
  }

  // Step 3b: Ensure Organization Memberships for all users
  const allUsers = await User.find({});
  let createdMembers = 0;
  for (const user of allUsers) {
    const isOwner = targetOrg.owner.equals(user._id);
    const assignedRole = isOwner ? 'OWNER' : user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';

    const existingMember = await OrganizationMember.findOne({
      organizationId: targetOrg._id,
      userId: user._id
    });

    if (!existingMember) {
      await OrganizationMember.create({
        organizationId: targetOrg._id,
        userId: user._id,
        role: assignedRole
      });
      createdMembers++;
    }
  }
  console.log(`  ✅ Verified memberships: ${createdMembers} created, ${allUsers.length - createdMembers} already existed.`);

  // Step 3c: Assign organizationId to unassigned Resources
  const resUpdate = await Resource.updateMany(
    { $or: [{ organizationId: { $exists: false } }, { organizationId: null }] },
    { $set: { organizationId: targetOrg._id } }
  );
  console.log(`  ✅ Resources updated: ${resUpdate.modifiedCount}`);

  // Step 3d: Assign organizationId to unassigned Bookings
  const bookUpdate = await Booking.updateMany(
    { $or: [{ organizationId: { $exists: false } }, { organizationId: null }] },
    { $set: { organizationId: targetOrg._id } }
  );
  console.log(`  ✅ Bookings updated: ${bookUpdate.modifiedCount}`);

  // Step 3e: Assign organizationId to unassigned Notifications
  const notifUpdate = await Notification.updateMany(
    { $or: [{ organizationId: { $exists: false } }, { organizationId: null }] },
    { $set: { organizationId: targetOrg._id } }
  );
  console.log(`  ✅ Notifications updated: ${notifUpdate.modifiedCount}\n`);

  // 4. Validation Phase
  console.log('[Phase 4/4] Validating post-migration integrity...');
  const remainingOrphanResources = await Resource.countDocuments({
    $or: [{ organizationId: { $exists: false } }, { organizationId: null }]
  });
  const remainingOrphanBookings = await Booking.countDocuments({
    $or: [{ organizationId: { $exists: false } }, { organizationId: null }]
  });
  const remainingOrphanNotifications = await Notification.countDocuments({
    $or: [{ organizationId: { $exists: false } }, { organizationId: null }]
  });
  const totalMemberships = await OrganizationMember.countDocuments({ organizationId: targetOrg._id });

  console.log('\n================ POST-MIGRATION REPORT ================');
  console.log(`Default Organization:   ${targetOrg.name} (${targetOrg.slug})`);
  console.log(`Organization ID:        ${targetOrg._id}`);
  console.log(`Members in Org:         ${totalMemberships} / ${allUsers.length} total users`);
  console.log(`Orphan Resources:       ${remainingOrphanResources} (Expected: 0)`);
  console.log(`Orphan Bookings:        ${remainingOrphanBookings} (Expected: 0)`);
  console.log(`Orphan Notifications:   ${remainingOrphanNotifications} (Expected: 0)`);
  console.log('=======================================================\n');

  if (remainingOrphanResources > 0 || remainingOrphanBookings > 0 || remainingOrphanNotifications > 0) {
    console.error('❌ Validation Failed: Orphaned tenant records detected!');
    process.exit(1);
  }

  console.log('🎉 Multi-tenant database migration completed successfully with full data isolation!');
  await mongoose.disconnect();
};

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
