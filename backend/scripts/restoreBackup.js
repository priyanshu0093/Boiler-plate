const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const restoreBackup = async () => {
  const targetDir = process.argv[2];
  if (!targetDir) {
    console.error('Usage: node scripts/restoreBackup.js <path-to-backup-dir>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(targetDir);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Backup directory not found: ${resolvedPath}`);
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/deskdrop';
  console.log(`[Restore] Connecting to ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  const files = fs.readdirSync(resolvedPath).filter((f) => f.endsWith('.json') && f !== 'manifest.json');

  console.log(`[Restore] Found ${files.length} collection dumps in ${resolvedPath}.`);

  for (const file of files) {
    const collName = path.basename(file, '.json');
    const content = JSON.parse(fs.readFileSync(path.join(resolvedPath, file), 'utf-8'));

    if (Array.isArray(content) && content.length > 0) {
      console.log(`  - Restoring ${collName} (${content.length} docs)...`);
      const coll = db.collection(collName);
      await coll.deleteMany({});
      await coll.insertMany(content);
      console.log(`    ✅ ${collName} restored.`);
    } else {
      console.log(`  - ${collName}: 0 records to restore, skipping.`);
    }
  }

  console.log('\n✅ Restore completed successfully.');
  await mongoose.disconnect();
};

restoreBackup().catch((err) => {
  console.error('Restore failed:', err);
  process.exit(1);
});
