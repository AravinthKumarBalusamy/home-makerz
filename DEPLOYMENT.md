# HomeMakerz Deployment Guide

## Prerequisites

1. **MongoDB Atlas Account** (free tier available)
2. **Anthropic API Key** (for Bill Scanner feature - optional)
3. **Deployment Platform** (choose one):
   - Render.com (recommended - free tier available)
   - Railway.app
   - Heroku
   - Docker-based hosting (DigitalOcean, AWS, etc.)

---

## Step 1: Setup MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string (looks like):
   ```
   mongodb+srv://username:password@cluster.mongodb.net/homemakerz
   ```
5. Replace `<password>` with your actual password
6. Add your IP to the whitelist (or use `0.0.0.0/0` for all IPs)

---

## Step 2: Get Anthropic API Key (Optional)

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up and create an API key
3. Copy the key (starts with `sk-ant-`)

**Note:** Bill Scanner feature won't work without this key, but all other features will work fine.

---

## Step 3: Deploy to Render.com (Recommended)

### 3.1 Create Render Account
1. Go to [Render.com](https://render.com)
2. Sign up with GitHub

### 3.2 Deploy from GitHub
1. Click "New +" → "Web Service"
2. Connect your GitHub repository: `https://github.com/AravinthKumarBalusamy/home-makerz.git`
3. Configure the service:
   - **Name**: `homemakerz` (or your choice)
   - **Region**: Choose closest to you
   - **Branch**: `main` (or `master`)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`

### 3.3 Add Environment Variables
Click "Advanced" → "Add Environment Variable" and add:

| Key | Value | Example |
|-----|-------|---------|
| `NODE_ENV` | `production` | production |
| `PORT` | `3000` | 3000 |
| `APP_PIN` | Your 4-6 digit PIN | `1234` |
| `MONGODB_URI` | Your MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/homemakerz` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (optional) | `sk-ant-xxx...` |

### 3.4 Deploy
1. Click "Create Web Service"
2. Wait 2-3 minutes for deployment
3. Your app will be live at: `https://homemakerz.onrender.com` (or your chosen name)

---

## Step 4: Alternative Deployment Options

### Option A: Railway.app

1. Go to [Railway.app](https://railway.app)
2. Click "Start a New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add environment variables (same as above)
5. Railway will auto-detect Node.js and deploy

### Option B: Docker Deployment

```bash
# Build the image
docker build -t homemakerz .

# Run the container
docker run -d \
  -p 3000:3000 \
  -e APP_PIN=your-pin \
  -e MONGODB_URI=your-mongodb-uri \
  -e ANTHROPIC_API_KEY=your-api-key \
  -e NODE_ENV=production \
  --name homemakerz \
  homemakerz
```

### Option C: Manual VPS Deployment (Ubuntu/Debian)

```bash
# SSH into your server
ssh user@your-server-ip

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/AravinthKumarBalusamy/home-makerz.git
cd home-makerz

# Install dependencies
npm ci --only=production

# Create .env file
nano .env
# Add your environment variables (see .env.example)

# Install PM2 for process management
sudo npm install -g pm2

# Start the app
pm2 start server.js --name homemakerz

# Setup PM2 to start on boot
pm2 startup
pm2 save

# Setup Nginx reverse proxy (optional)
sudo apt install nginx
sudo nano /etc/nginx/sites-available/homemakerz
```

Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/homemakerz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 5: Post-Deployment Setup

### 5.1 First Login
1. Visit your deployed URL
2. Enter your PIN (the one you set in `APP_PIN`)
3. You'll see the dashboard with default data

### 5.2 Customize Settings
1. Go to Settings page
2. Update salaries for husband and wife
3. Modify recurring expenses
4. Customize widgets

### 5.3 Test Bill Scanner
1. Go to Bill Scanner page
2. Upload a sample bill image
3. Verify AI extraction works (requires `ANTHROPIC_API_KEY`)

---

## Step 6: Migrate Existing Data (If Any)

If you have existing data in JSON files:

```bash
# Set environment variable
export MONGODB_URI="your-mongodb-connection-string"

# Run migration
npm run migrate
```

---

## Troubleshooting

### App won't start
- Check logs for errors
- Verify `MONGODB_URI` is correct
- Ensure MongoDB Atlas IP whitelist includes your server IP

### Bill Scanner not working
- Verify `ANTHROPIC_API_KEY` is set correctly
- Check API key has credits/quota
- Look at server logs for specific errors

### Can't login
- Verify `APP_PIN` environment variable is set
- Clear browser cookies and try again
- Check if session cookies are being set (check browser dev tools)

### Database connection fails
- Verify MongoDB Atlas cluster is running
- Check connection string format
- Ensure network access is configured in Atlas

---

## Security Recommendations

1. **Use a strong PIN** - At least 6 digits
2. **Enable HTTPS** - Use Render's automatic SSL or setup Let's Encrypt
3. **Restrict MongoDB access** - Whitelist only your server IP
4. **Keep dependencies updated** - Run `npm audit` regularly
5. **Backup your data** - Use the built-in backup feature regularly

---

## Monitoring & Maintenance

### Health Check
Your app has a built-in health check at: `/api/auth/check`

### Logs
- **Render**: View logs in dashboard
- **Railway**: View logs in project dashboard
- **PM2**: `pm2 logs homemakerz`
- **Docker**: `docker logs homemakerz`

### Backups
1. Login to your app
2. Go to Settings → Backup & Restore
3. Click "Create Backup"
4. Download the JSON file
5. Store it securely

---

## Cost Estimates

### Free Tier (Recommended for personal use)
- **MongoDB Atlas**: Free (512MB storage)
- **Render.com**: Free (750 hours/month, sleeps after 15min inactivity)
- **Anthropic API**: Pay-as-you-go (~$0.25 per 1M tokens)

**Total**: Free for basic usage, ~$1-5/month for bill scanning

### Paid Tier (For always-on service)
- **MongoDB Atlas**: $9/month (Shared M2)
- **Render.com**: $7/month (Starter instance)
- **Anthropic API**: ~$5-10/month (moderate usage)

**Total**: ~$21-26/month

---

## Support

For issues or questions:
1. Check server logs first
2. Review this deployment guide
3. Check MongoDB Atlas connection
4. Verify all environment variables are set correctly

---

## Quick Deploy Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Connection string copied
- [ ] Anthropic API key obtained (optional)
- [ ] Repository connected to Render/Railway
- [ ] Environment variables configured
- [ ] App deployed successfully
- [ ] First login completed
- [ ] Settings customized
- [ ] Backup created

---

**Your app is now live! 🎉**

Access it at your deployment URL and start managing your home finances!
