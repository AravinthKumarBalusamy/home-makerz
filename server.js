const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const sharp = require('sharp');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
const pdfParse = require('pdf-parse');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_PIN = process.env.APP_PIN || null;

// ── Session Store (in-memory) ──────────────────────────────────────
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_SECRET = process.env.APP_SECRET || process.env.APP_PIN || crypto.randomBytes(32).toString('hex');

function issueSessionToken() {
  const ts = Date.now().toString();
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(ts).digest('hex');
  return `${ts}.${sig}`;
}

function isValidSession(token) {
  if (!token) return false;
  const [ts, sig] = token.split('.');
  if (!ts || !sig) return false;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(ts).digest('hex');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;
  if (Date.now() - Number(ts) > SESSION_MAX_AGE) return false;
  return true;
}

// ── Multer config (memory storage — no files saved to disk) ────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.heic'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// ── Security ───────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts in our SPA
  crossOriginEmbedderPolicy: false
}));
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ── Rate limit on login ────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many login attempts. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false
});

// ── Auth Routes (before auth middleware) ────────────────────────────
app.post('/api/auth/login', loginLimiter, (req, res) => {
  if (!APP_PIN) {
    const token = issueSessionToken();
    res.cookie('hm_session', token, {
      httpOnly: true,
      maxAge: SESSION_MAX_AGE,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    return res.json({ success: true });
  }
  const { pin } = req.body;
  if (!pin || pin !== APP_PIN) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  const token = issueSessionToken();
  res.cookie('hm_session', token, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
  res.json({ success: true });
});

app.get('/api/auth/check', (req, res) => {
  if (!APP_PIN) return res.json({ authenticated: true });
  const token = req.cookies?.hm_session;
  res.json({ authenticated: isValidSession(token) });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('hm_session');
  res.json({ success: true });
});

// ── Auth Middleware ─────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  if (!APP_PIN) return next();
  if (req.path.startsWith('/auth/')) return next();
  const token = req.cookies?.hm_session;
  if (!isValidSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.use('/api', authMiddleware);
app.use(express.static(path.join(__dirname, 'public')));

// ── Bill Scanner Routes ────────────────────────────────────────────

// Upload + extract in one step (memory only — no files saved)
app.post('/api/bills/extract', upload.single('bill'), async (req, res) => {
  try {
    if (!req.file && !req.body.filename) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const billType = req.body.billType || 'general';
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: 'ANTHROPIC_API_KEY not set. Set it as an environment variable.'
      });
    }

    let isPdf = false;
    let pdfText = '';
    let imageBuffer;
    let mediaType = 'image/jpeg';

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      isPdf = ext === '.pdf';

      if (isPdf) {
        const pdfData = await pdfParse(req.file.buffer);
        pdfText = pdfData.text;
        if (!pdfText || pdfText.trim().length < 10) {
          return res.status(400).json({ error: 'Could not extract text from PDF. The PDF may be image-based — please take a screenshot instead.' });
        }
      } else {
        try {
          imageBuffer = await sharp(req.file.buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
          mediaType = 'image/jpeg';
        } catch (sharpErr) {
          imageBuffer = req.file.buffer;
          if (ext === '.png') mediaType = 'image/png';
          else if (ext === '.webp') mediaType = 'image/webp';
        }
      }
    }

    // Build prompt based on bill type
    const prompts = {
      supermarket: `You are analyzing a supermarket/grocery store bill (DMart, LuLu Hypermarket, BigBazaar, Reliance Fresh, etc.).
Extract EVERY line item from the bill. For each item extract:
- description: product name as shown on bill
- amount: price in INR (the final price, not MRP unless only MRP is shown)
- category: one of [Food, Shopping, Healthcare, Housing, Kids, Other]
- subcategory: one of [Groceries, Dining Out, Snacks, Beverages, Clothing, Electronics, Home, Personal Care, Medicine, Other]

Also extract:
- store: the store name
- date: bill date in YYYY-MM-DD format
- total: grand total amount
- paymentMethod: one of [UPI, Cash, Credit Card, Debit Card, Bank Transfer, Other]`,

      medical: `You are analyzing a medical bill or pharmacy prescription.
Extract each medicine/item:
- description: medicine name with dosage/quantity
- amount: price in INR
- category: always "Healthcare"
- subcategory: one of [Medicine, Doctor, Lab Tests, Other]

Also extract:
- store: pharmacy/hospital name
- date: bill date in YYYY-MM-DD format
- total: grand total
- paymentMethod: one of [UPI, Cash, Credit Card, Debit Card, Bank Transfer, Other]`,

      upi_history: `You are analyzing UPI transaction history (Paytm, PhonePe, Google Pay, etc.).
Extract EACH transaction as a separate item:
- description: recipient/merchant name and any description
- amount: transaction amount in INR (only debits/payments, skip received money)
- date: transaction date in YYYY-MM-DD format if visible
- category: best guess from [Food, Transport, Utilities, Healthcare, Education, Kids, Entertainment, Shopping, Housing, Savings, Other]
- subcategory: best guess subcategory

Also extract:
- store: the UPI app name
- date: the date range or most recent date
- total: sum of all debited transactions
- paymentMethod: "UPI"`,

      food_delivery: `You are analyzing a food delivery bill (Swiggy, Zomato, etc.).
Extract:
- Each food item as a line item with description and amount
- Delivery charges as a separate item (category: "Food", subcategory: "Dining Out")
- Taxes/fees as a separate item if shown

Also extract:
- store: the restaurant name and delivery platform
- date: order date in YYYY-MM-DD format
- total: grand total including delivery and taxes
- paymentMethod: one of [UPI, Cash, Credit Card, Debit Card, Bank Transfer, Other]`,

      general: `You are analyzing a bill or receipt.
Extract every line item:
- description: item/service name
- amount: price in INR
- category: best guess from [Food, Transport, Utilities, Healthcare, Education, Kids, Entertainment, Shopping, Housing, Savings, Other]
- subcategory: best guess

Also extract:
- store: the vendor/store name
- date: bill date in YYYY-MM-DD format
- total: grand total
- paymentMethod: one of [UPI, Cash, Credit Card, Debit Card, Bank Transfer, Other]`
    };

    const systemPrompt = `You are a bill data extraction assistant. Extract structured data from bills, receipts, and transaction histories.
Rules:
- All amounts must be numbers (no currency symbols)
- Dates must be in YYYY-MM-DD format
- If you cannot determine a value, use reasonable defaults
- For UPI history, each transaction is a separate item
- Return ONLY valid JSON, no markdown or explanations`;

    const userPrompt = `${prompts[billType] || prompts.general}

Respond with ONLY a JSON object in this exact format:
{
  "store": "store name",
  "date": "YYYY-MM-DD",
  "items": [
    { "description": "item name", "amount": 123, "category": "Food", "subcategory": "Groceries" }
  ],
  "total": 456,
  "paymentMethod": "UPI"
}`;

    const client = new Anthropic({ apiKey });
    let response;

    if (isPdf) {
      response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `Here is the text content extracted from a PDF bill/statement:\n\n---\n${pdfText}\n---\n\n${userPrompt}`
        }],
        system: systemPrompt
      });
    } else {
      const base64Image = imageBuffer.toString('base64');
      response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Image }
            },
            { type: 'text', text: userPrompt }
          ]
        }],
        system: systemPrompt
      });
    }

    const text = response.content[0]?.text || '';
    let jsonStr = text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const extracted = JSON.parse(jsonStr);

    if (billType === 'upi_history' && extracted.items) {
      extracted.items = extracted.items.map(item => ({
        ...item,
        date: item.date || extracted.date
      }));
    }

    res.json(extracted);
  } catch (err) {
    console.error('Bill extraction error:', err);
    res.status(500).json({ error: 'Failed to extract bill data: ' + (err.message || 'Unknown error') });
  }
});

// Fix dates where AI extracted wrong year
function fixExtractedDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const parsed = new Date(dateStr);
  if (isNaN(parsed)) return new Date().toISOString().split('T')[0];
  const now = new Date();
  const diffMs = now - parsed;
  if (diffMs > 6 * 30 * 24 * 60 * 60 * 1000) {
    parsed.setFullYear(now.getFullYear());
  }
  return parsed.toISOString().split('T')[0];
}

// Import extracted bill items as expenses
app.post('/api/bills/import', async (req, res) => {
  try {
    const { items, store, date, billType, total, paidBy, paymentMethod } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'No items to import' });

    const billId = uuidv4();
    const importedExpenseIds = [];

    for (const item of items) {
      if (item.excluded) continue;
      const expense = {
        id: uuidv4(),
        amount: Number(item.amount) || 0,
        date: fixExtractedDate(item.date || date),
        description: item.description || 'Bill item',
        category: item.category || 'Other',
        subcategory: item.subcategory || 'Miscellaneous',
        paidBy: paidBy || 'husband',
        paymentMethod: item.paymentMethod || paymentMethod || 'UPI',
        isRecurring: false,
        notes: `Imported from ${store || 'bill'} (${billType || 'general'})`,
        source: 'bill-import',
        billId,
        createdAt: new Date().toISOString()
      };
      importedExpenseIds.push(expense.id);
      await db.insertOne('expenses', expense);
    }

    const bill = {
      id: billId,
      billType: billType || 'general',
      store: store || 'Unknown',
      date: date || new Date().toISOString().split('T')[0],
      total: Number(total) || items.reduce((s, i) => s + (Number(i.amount) || 0), 0),
      itemCount: importedExpenseIds.length,
      importedExpenseIds,
      paidBy: paidBy || 'husband',
      paymentMethod: paymentMethod || 'UPI',
      createdAt: new Date().toISOString()
    };
    await db.insertOne('bills', bill);

    res.json({ success: true, bill, expensesCreated: importedExpenseIds.length });
  } catch (err) {
    console.error('Bill import error:', err);
    res.status(500).json({ error: 'Failed to import bill: ' + (err.message || 'Unknown error') });
  }
});

// ── API Routes ─────────────────────────────────────────────────────

// Get entire collection
app.get('/api/:collection', async (req, res) => {
  try {
    const name = req.params.collection;
    if (name === 'settings') {
      return res.json(await db.getSettings());
    }
    if (!db.ARRAY_COLLECTIONS.includes(name)) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    const data = await db.getAll(name);
    // Strip MongoDB _id
    res.json(data.map(({ _id, ...rest }) => rest));
  } catch (err) {
    console.error(`GET /api/${req.params.collection} error:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single item by id
app.get('/api/:collection/:id', async (req, res) => {
  try {
    const name = req.params.collection;
    if (!db.ARRAY_COLLECTIONS.includes(name)) {
      return res.status(400).json({ error: 'Not an array collection' });
    }
    const item = await db.getById(name, req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    delete item._id;
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create item or update settings
app.post('/api/:collection', async (req, res) => {
  try {
    const name = req.params.collection;
    if (name === 'settings') {
      const updated = await db.updateSettings(req.body);
      return res.json(updated);
    }
    if (!db.ARRAY_COLLECTIONS.includes(name)) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    const item = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
    const created = await db.insertOne(name, item);
    res.status(201).json(created);
  } catch (err) {
    console.error(`POST /api/${req.params.collection} error:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update item by id
app.put('/api/:collection/:id', async (req, res) => {
  try {
    const name = req.params.collection;
    if (name === 'settings') {
      const updated = await db.updateSettings(req.body);
      return res.json(updated);
    }
    if (!db.ARRAY_COLLECTIONS.includes(name)) {
      return res.status(400).json({ error: 'Collection not found' });
    }
    const updated = await db.updateOne(name, req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Item not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete item by id
app.delete('/api/:collection/:id', async (req, res) => {
  try {
    const name = req.params.collection;
    if (!db.ARRAY_COLLECTIONS.includes(name)) {
      return res.status(400).json({ error: 'Cannot delete from this collection' });
    }
    const deleted = await db.deleteOne(name, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Backup — download all data as JSON
app.post('/api/system/backup', async (req, res) => {
  try {
    const data = await db.exportAll();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Disposition', `attachment; filename=homemakerz-backup-${timestamp}.json`);
    res.json({ success: true, backup: `backup-${timestamp}`, data });
  } catch (err) {
    res.status(500).json({ error: 'Backup failed' });
  }
});

// List backups (returns empty — backups are now downloaded as files)
app.get('/api/system/backups', (req, res) => {
  res.json([]);
});

// Restore from uploaded JSON
app.post('/api/system/restore', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'No backup data provided' });
    await db.importAll(data);
    res.json({ success: true, restored: Object.keys(data).length });
  } catch (err) {
    res.status(500).json({ error: 'Restore failed: ' + err.message });
  }
});

// ── SPA fallback ───────────────────────────────────────────────────
app.get('*', (req, res) => {
  if (APP_PIN) {
    const token = req.cookies?.hm_session;
    if (!isValidSession(token)) {
      return res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global error handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────────────
async function start() {
  await db.connect();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HomeMakerz running at http://localhost:${PORT}`);
    if (APP_PIN) console.log('🔒 PIN authentication enabled');
    else console.log('⚠️  No APP_PIN set — app is unprotected. Set APP_PIN env variable to enable auth.');
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// ── Graceful shutdown ──────────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  await db.close();
  process.exit(0);
});

start();
