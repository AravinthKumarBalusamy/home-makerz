# 🏠 HomeMakerz

A comprehensive home management system for couples to manage finances, tasks, and family activities together.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

### 💰 Financial Management
- **Budget Planning** - Set monthly budgets by category
- **Expense Tracking** - Track all expenses with categories and payment methods
- **Income Tracking** - Record salary, bonuses, and other income
- **Savings Management** - Track savings accounts and investments
- **AI Bill Scanner** - Upload bill photos and extract items automatically using Claude AI

### 📋 Household Management
- **Task Management** - Assign tasks to husband, wife, or both
- **Kids Management** - Track kids' activities, milestones, and expenses
- **Sticky Notes** - Quick reminders and notes
- **Goals & Habits** - Set and track personal and family goals

### 📊 Reports & Analytics
- **Monthly Reports** - Expense breakdowns by category
- **Budget vs Actual** - Compare spending against budget
- **Spending Trends** - Visualize spending patterns

### 🔔 Smart Features
- **Expense Reminders** - Get notified about upcoming yearly expenses (insurance, etc.)
- **Recurring Expenses** - Automatic tracking of monthly/yearly bills
- **Mark as Paid** - Quick workflow to record payments and deduct from savings
- **Customizable Widgets** - Personalize your dashboard

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- MongoDB Atlas account (free tier available)
- Anthropic API key (optional, for bill scanner)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/AravinthKumarBalusamy/home-makerz.git
cd home-makerz
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your values
```

Required environment variables:
```env
PORT=3000
NODE_ENV=development
APP_PIN=your-access-pin
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/homemakerz
ANTHROPIC_API_KEY=sk-ant-xxx  # Optional, for bill scanner
```

4. **Start the server**
```bash
npm start
```

5. **Access the app**
Open http://localhost:3000 in your browser

## 📦 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for:
- Render.com (recommended)
- Railway.app
- Docker
- VPS/Manual deployment

## 🏗️ Tech Stack

**Backend:**
- Node.js + Express
- MongoDB (via MongoDB Atlas)
- Anthropic Claude API (for bill scanning)

**Frontend:**
- Vanilla JavaScript (no framework)
- CSS3 with custom design system
- Progressive Web App (PWA) support

**Security:**
- PIN-based authentication
- Session management
- Helmet.js security headers
- Rate limiting

## 📱 Bill Scanner Feature

The AI-powered bill scanner can extract line items from:
- 🛒 Supermarket bills (DMart, LuLu, BigBazaar, etc.)
- 💊 Medical bills and pharmacy receipts
- 📱 UPI transaction history screenshots
- 🍕 Food delivery bills (Swiggy, Zomato)
- 📄 General bills and receipts

**How it works:**
1. Upload a photo or PDF of your bill
2. AI extracts all items, amounts, and categories
3. Review and edit the extracted data
4. Import all expenses with one click

## 🗂️ Project Structure

```
home-makerz/
├── server.js              # Express server
├── db.js                  # MongoDB connection and helpers
├── public/
│   ├── index.html         # Main SPA shell
│   ├── login.html         # Login page
│   ├── css/
│   │   └── styles.css     # All styles
│   └── js/
│       ├── app.js         # Router and app shell
│       ├── api.js         # API client
│       ├── utils.js       # Utilities
│       ├── dashboard.js   # Dashboard page
│       ├── expenses.js    # Expense tracking
│       ├── bills.js       # Bill scanner
│       └── ...            # Other page modules
├── scripts/
│   └── migrate-to-mongo.js # JSON to MongoDB migration
├── data/                  # Local JSON files (legacy)
├── uploads/               # Uploaded bill files
└── backups/               # Backup storage
```

## 🔧 Available Scripts

```bash
npm start          # Start the server
npm run dev        # Start in development mode
npm run migrate    # Migrate JSON data to MongoDB
```

## 🔐 Security

- **PIN Authentication** - Protect your data with a PIN
- **Session Management** - 30-day session expiry
- **HTTP-only Cookies** - Secure session storage
- **Rate Limiting** - Prevent brute force attacks
- **Security Headers** - Helmet.js protection

## 💾 Data Management

### Backup
1. Go to Settings → Backup & Restore
2. Click "Create Backup"
3. Download the JSON file

### Restore
1. Go to Settings → Backup & Restore
2. Upload your backup JSON file
3. Click "Restore"

### Migration from JSON
If you have existing data in JSON files:
```bash
export MONGODB_URI="your-connection-string"
npm run migrate
```

## 🎨 Customization

### Widgets
Customize your dashboard widgets in Settings:
- Daily quotes
- Reminders
- Quick info cards
- Photos

### Categories
Modify expense categories in `public/js/utils.js`:
```javascript
categories: {
  'Food': ['Groceries', 'Dining Out', ...],
  'Transport': ['Fuel', 'Maintenance', ...],
  // Add your own categories
}
```

## 🐛 Troubleshooting

### App won't start
- Check MongoDB connection string
- Verify Node.js version (18+)
- Check if port 3000 is available

### Bill scanner not working
- Verify `ANTHROPIC_API_KEY` is set
- Check API key has credits
- Ensure image is clear and readable

### Can't login
- Verify `APP_PIN` is set in environment
- Clear browser cookies
- Check server logs

## 📊 Database Schema

**Collections:**
- `settings` - App configuration, salaries, recurring expenses
- `expenses` - All expense entries
- `income` - Income entries
- `budget` - Budget allocations
- `tasks` - Task items
- `goals` - Goals and habits
- `kids` - Kids-related data
- `notes` - Sticky notes
- `savings` - Savings accounts
- `bills` - Scanned bill history

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Anthropic Claude](https://www.anthropic.com/) - AI bill scanning
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Database hosting
- [Render.com](https://render.com) - Deployment platform

## 📞 Support

For issues or questions:
1. Check the [Deployment Guide](./DEPLOYMENT.md)
2. Review server logs
3. Open an issue on GitHub

---

**Made with ❤️ for families managing their homes together**
