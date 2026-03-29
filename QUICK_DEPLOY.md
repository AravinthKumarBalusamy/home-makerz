# 🚀 Quick Deploy Guide - HomeMakerz

## Deploy in 10 Minutes

### Step 1: MongoDB Atlas (3 minutes)

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up (free)
3. Create a free cluster (M0)
4. Click "Connect" → "Connect your application"
5. Copy connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/homemakerz
   ```
6. **Important**: Go to "Network Access" → Add IP Address → Allow Access from Anywhere (`0.0.0.0/0`)

### Step 2: Anthropic API Key (2 minutes) - OPTIONAL

1. Go to https://console.anthropic.com/
2. Sign up
3. Go to "API Keys" → Create Key
4. Copy the key (starts with `sk-ant-`)

**Skip this if you don't need the Bill Scanner feature**

### Step 3: Deploy to Render (5 minutes)

1. Go to https://render.com
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Click "Connect GitHub" → Select your repository:
   ```
   https://github.com/AravinthKumarBalusamy/home-makerz
   ```
5. Fill in:
   - **Name**: `homemakerz`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free

6. Click "Advanced" and add these Environment Variables:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `APP_PIN` | `1234` (change this!) |
   | `MONGODB_URI` | Paste your MongoDB connection string |
   | `ANTHROPIC_API_KEY` | Paste your API key (optional) |

7. Click "Create Web Service"

8. Wait 2-3 minutes... ☕

9. **Done!** Your app is live at: `https://homemakerz.onrender.com`

---

## First Login

1. Visit your Render URL
2. Enter your PIN (the one you set in `APP_PIN`)
3. Start using HomeMakerz!

---

## Important Notes

⚠️ **Free Tier Limitations:**
- App sleeps after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- 750 hours/month free (enough for personal use)

💡 **Upgrade to Paid ($7/month) for:**
- Always-on service
- No sleep time
- Faster performance

---

## Troubleshooting

### "Cannot connect to database"
- Check MongoDB connection string is correct
- Verify IP whitelist includes `0.0.0.0/0` in MongoDB Atlas

### "Invalid PIN"
- Check `APP_PIN` environment variable in Render dashboard
- Try clearing browser cookies

### Bill Scanner not working
- Verify `ANTHROPIC_API_KEY` is set correctly
- Check you have API credits in Anthropic console

---

## Next Steps

1. ✅ Customize your settings (salaries, recurring expenses)
2. ✅ Add your first expense
3. ✅ Try the bill scanner
4. ✅ Create a backup (Settings → Backup)

---

**Need help?** Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.
