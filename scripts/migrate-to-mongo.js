/**
 * Migration script: JSON files → MongoDB
 * 
 * Usage:
 *   set MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/homemakerz
 *   node scripts/migrate-to-mongo.js
 * 
 * This reads all JSON files from data/ and imports them into MongoDB.
 * Safe to run multiple times — it will skip collections that already have data.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required.');
  console.error('   set MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/homemakerz');
  process.exit(1);
}

const ARRAY_COLLECTIONS = ['tasks', 'expenses', 'income', 'budget', 'goals', 'kids', 'notes', 'savings', 'bills'];

async function migrate() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    console.log('✅ Connected to MongoDB\n');

    // Migrate settings
    const settingsPath = path.join(DATA_DIR, 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      const col = db.collection('settings');
      const existing = await col.findOne({ _id: 'app_settings' });
      if (existing) {
        console.log('⏭️  settings: already exists, skipping');
      } else {
        await col.insertOne({ _id: 'app_settings', ...settings });
        console.log('✅ settings: migrated');
      }
    }

    // Migrate array collections
    for (const name of ARRAY_COLLECTIONS) {
      const filePath = path.join(DATA_DIR, `${name}.json`);
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️  ${name}: no local file, skipping`);
        continue;
      }

      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`⏭️  ${name}: empty, skipping`);
        continue;
      }

      const col = db.collection(name);
      const count = await col.countDocuments();
      if (count > 0) {
        console.log(`⏭️  ${name}: already has ${count} documents, skipping`);
        continue;
      }

      await col.insertMany(data);
      console.log(`✅ ${name}: migrated ${data.length} items`);
    }

    console.log('\n🎉 Migration complete!');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    await client.close();
  }
}

migrate();
