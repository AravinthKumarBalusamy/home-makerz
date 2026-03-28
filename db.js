const { MongoClient, ObjectId } = require('mongodb');

let client = null;
let db = null;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homemakerz';
const DB_NAME = process.env.DB_NAME || 'homemakerz';

// ── Default seed data ──────────────────────────────────────────────
const DEFAULTS = {
  settings: {
    _id: 'app_settings',
    salaries: { husband: 215000, wife: 73000 },
    recurringExpenses: [
      { id: 'r1', name: 'Rent', amount: 30000, frequency: 'monthly', category: 'Housing', subcategory: 'Rent', months: null },
      { id: 'r2', name: 'Maid', amount: 2500, frequency: 'monthly', category: 'Housing', subcategory: 'Maintenance', months: null },
      { id: 'r3', name: 'WiFi', amount: 915, frequency: 'monthly', category: 'Utilities', subcategory: 'Internet', months: null },
      { id: 'r4', name: 'RDC', amount: 15000, frequency: 'monthly', category: 'Savings', subcategory: 'RD', months: null },
      { id: 'r5', name: 'Education Loan', amount: 3500, frequency: 'monthly', category: 'Education', subcategory: 'Tuition', months: null },
      { id: 'r6', name: 'Health Insurance', amount: 20000, frequency: 'yearly', category: 'Healthcare', subcategory: 'Insurance Premium', months: [12] },
      { id: 'r7', name: 'Term Insurance', amount: 15000, frequency: 'yearly', category: 'Healthcare', subcategory: 'Insurance Premium', months: [1] },
      { id: 'r8', name: 'i20 Insurance', amount: 15000, frequency: 'yearly', category: 'Transport', subcategory: 'Maintenance', months: [12] },
      { id: 'r9', name: 'Wagnor Insurance', amount: 12000, frequency: 'yearly', category: 'Transport', subcategory: 'Maintenance', months: [1] },
      { id: 'r10', name: 'Bike Insurance', amount: 2000, frequency: 'yearly', category: 'Transport', subcategory: 'Maintenance', months: [9] },
      { id: 'r11', name: 'Cook Salary', amount: 8500, frequency: 'monthly', category: 'Housing', subcategory: 'Maintenance', months: null },
      { id: 'r12', name: 'Car Parking Fee', amount: 2000, frequency: 'monthly', category: 'Housing', subcategory: 'Maintenance', months: null }
    ],
    recurringIncome: [
      { id: 'ri1', name: 'Variable Pay', amount: 10000, person: 'wife', frequency: 'quarterly', months: [3, 6, 9, 12], type: 'Bonus' }
    ],
    paidReminders: [],
    widgets: {
      left: [
        { id: 'w1', type: 'quote', title: 'Daily Inspiration', content: '' },
        { id: 'w2', type: 'reminder', title: 'Reminders', items: ['Review monthly budget', 'Check kids school calendar'] }
      ],
      right: [
        { id: 'w3', type: 'text', title: 'Quick Info', content: 'Emergency: 112\\nAmbulance: 108' }
      ]
    }
  }
};

// Collections that store arrays of items (each item has an `id` field)
const ARRAY_COLLECTIONS = ['tasks', 'expenses', 'income', 'budget', 'goals', 'kids', 'notes', 'savings', 'bills'];

// ── Connect ────────────────────────────────────────────────────────
async function connect() {
  if (db) return db;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB');
    await seed();
    return db;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

// ── Seed defaults ──────────────────────────────────────────────────
async function seed() {
  // Seed settings if not present
  const settingsCol = db.collection('settings');
  const existing = await settingsCol.findOne({ _id: 'app_settings' });
  if (!existing) {
    await settingsCol.insertOne(DEFAULTS.settings);
    console.log('  Seeded default settings');
  }
}

// ── Settings helpers (single-document pattern) ─────────────────────
async function getSettings() {
  const col = db.collection('settings');
  const doc = await col.findOne({ _id: 'app_settings' });
  if (!doc) return DEFAULTS.settings;
  delete doc._id;
  return doc;
}

async function updateSettings(data) {
  const col = db.collection('settings');
  // Remove _id from data if present to avoid immutable field error
  const { _id, ...updateData } = data;
  await col.updateOne(
    { _id: 'app_settings' },
    { $set: updateData },
    { upsert: true }
  );
  return getSettings();
}

// ── Array collection helpers ───────────────────────────────────────
async function getAll(collection) {
  const col = db.collection(collection);
  return col.find({}).toArray();
}

async function getById(collection, id) {
  const col = db.collection(collection);
  return col.findOne({ id });
}

async function insertOne(collection, item) {
  const col = db.collection(collection);
  await col.insertOne(item);
  // Return without MongoDB's _id
  const { _id, ...rest } = item;
  return rest;
}

async function updateOne(collection, id, data) {
  const col = db.collection(collection);
  const { _id, ...updateData } = data;
  await col.updateOne({ id }, { $set: { ...updateData, updatedAt: new Date().toISOString() } });
  const updated = await col.findOne({ id });
  if (updated) delete updated._id;
  return updated;
}

async function deleteOne(collection, id) {
  const col = db.collection(collection);
  const result = await col.deleteOne({ id });
  return result.deletedCount > 0;
}

async function insertMany(collection, items) {
  if (!items.length) return;
  const col = db.collection(collection);
  await col.insertMany(items);
}

// ── Backup / Restore ───────────────────────────────────────────────
async function exportAll() {
  const data = {};
  data.settings = await getSettings();
  for (const col of ARRAY_COLLECTIONS) {
    const docs = await getAll(col);
    data[col] = docs.map(({ _id, ...rest }) => rest);
  }
  return data;
}

async function importAll(data) {
  // Settings
  if (data.settings) {
    await updateSettings(data.settings);
  }
  // Array collections
  for (const col of ARRAY_COLLECTIONS) {
    if (data[col] && Array.isArray(data[col]) && data[col].length > 0) {
      const collection = db.collection(col);
      await collection.deleteMany({});
      await collection.insertMany(data[col]);
    }
  }
}

// ── Graceful shutdown ──────────────────────────────────────────────
async function close() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

module.exports = {
  connect,
  close,
  getSettings,
  updateSettings,
  getAll,
  getById,
  insertOne,
  updateOne,
  deleteOne,
  insertMany,
  exportAll,
  importAll,
  ARRAY_COLLECTIONS
};
