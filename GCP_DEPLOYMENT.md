# Deploying to Google Cloud Platform (GCP) Free Tier VM

This guide walks you through deploying the AI Photo Booth backend to a GCP Compute Engine VM instance (free tier eligible).

---

## Prerequisites

- Google Cloud account (free tier includes $300 credit for 90 days, then free tier limits apply)
- Basic knowledge of Linux commands
- SSH client (built into most systems)

---

## Step 1: Create GCP Project and VM Instance

### 1.1 Create a GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Name it: `photo-booth-backend` (or your choice)
4. Click **"Create"**

### 1.2 Enable Billing (Required for VM)

- GCP requires billing to be enabled (even for free tier)
- Free tier includes: 1 f1-micro VM per month (US regions only)
- You won't be charged if you stay within free tier limits

### 1.3 Create VM Instance

1. Go to **Compute Engine** → **VM instances**
2. Click **"Create Instance"**
3. Configure:

   **Basic Settings:**
   - **Name:** `photo-booth-backend`
   - **Region:** `us-central1` or `us-east1` (for free tier)
   - **Zone:** Any zone in the selected region

   **Machine Configuration:**
   - **Machine family:** General-purpose
   - **Machine type:** `e2-micro` (1 vCPU, 1 GB memory) - Free tier eligible
   - **Boot disk:** 
     - **Operating system:** Ubuntu 22.04 LTS
     - **Boot disk type:** Standard persistent disk
     - **Size:** 30 GB (free tier includes 30 GB)

   **Firewall:**
   - ✅ Allow HTTP traffic
   - ✅ Allow HTTPS traffic
   - ⚠️ **Important:** We'll configure firewall rules for port 3000 separately

4. Click **"Create"**

**Note:** VM creation takes 1-2 minutes.

---

## Step 2: Configure Firewall Rules

### 2.1 Allow Port 3000

1. Go to **VPC network** → **Firewall**
2. Click **"Create Firewall Rule"**
3. Configure:
   - **Name:** `allow-photo-booth-api`
   - **Direction:** Ingress
   - **Targets:** All instances in the network
   - **Source IP ranges:** `0.0.0.0/0` (or restrict to your IP for security)
   - **Protocols and ports:** 
     - ✅ TCP
     - **Port:** `3000`
4. Click **"Create"**

### 2.2 (Optional) Restrict to Specific IPs

For better security, you can restrict access:
- **Source IP ranges:** `YOUR_IP_ADDRESS/32` (your office/home IP)
- Or use multiple IPs: `IP1/32,IP2/32`

---

## Step 3: Connect to VM via SSH

### Option A: Browser SSH (Easiest)

1. Go to **Compute Engine** → **VM instances**
2. Click **"SSH"** button next to your VM
3. Browser-based SSH terminal opens

### Option B: Command Line SSH

1. Get your VM's external IP:
   - Go to VM instances page
   - Copy the **External IP** address

2. Connect via SSH:
   ```bash
   ssh -i ~/.ssh/gcp_key username@EXTERNAL_IP
   ```

   Or use gcloud CLI:
   ```bash
   gcloud compute ssh photo-booth-backend --zone=us-central1-a
   ```

---

## Step 4: Install Dependencies on VM

Once connected via SSH, run these commands:

### 4.1 Update System

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 4.2 Install Node.js 20

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

### 4.3 Install Redis

```bash
sudo apt-get install -y redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping  # Should return: PONG
```

### 4.4 Install Git (if needed)

```bash
sudo apt-get install -y git
```

### 4.5 Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

PM2 will keep your app running and restart it if it crashes.

---

## Step 5: Deploy Application Code

You have several options to get your code onto the VM. **You don't need to login with GitHub on the VM.**

### Option A: Clone Public Repository (Easiest)

If your repository is **public**:

```bash
cd ~
git clone https://github.com/yourusername/Viz-dhm-backend.git
cd Viz-dhm-backend
```

### Option B: Clone Private Repository with SSH Key

If your repository is **private**, set up SSH key:

1. **On VM, generate SSH key:**
   ```bash
   ssh-keygen -t ed25519 -C "vm-deploy" -f ~/.ssh/github_key
   cat ~/.ssh/github_key.pub
   ```

2. **Copy the public key** and add it to GitHub:
   - Go to GitHub → Settings → SSH and GPG keys
   - Click "New SSH key"
   - Paste the public key

3. **Clone using SSH:**
   ```bash
   cd ~
   git clone git@github.com:yourusername/Viz-dhm-backend.git
   cd Viz-dhm-backend
   ```

### Option C: Clone Private Repository with Personal Access Token

1. **Create GitHub Personal Access Token:**
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` scope
   - Copy the token

2. **Clone using token:**
   ```bash
   cd ~
   git clone https://YOUR_TOKEN@github.com/yourusername/Viz-dhm-backend.git
   cd Viz-dhm-backend
   ```

### Option D: Upload Files via SCP (No Git Needed)

**From your local machine:**

```bash
# Upload entire project
scp -r -i ~/.ssh/gcp_key ./Viz-dhm-backend username@VM_IP:~/Viz-dhm-backend

# Or using gcloud
gcloud compute scp --recurse ./Viz-dhm-backend photo-booth-backend:~/ --zone=us-central1-a
```

### Option E: Upload via Browser SSH

1. Connect via browser SSH in GCP console
2. Use the file upload feature (if available)
3. Or create files manually (not recommended for large projects)

### Option F: Use GitHub Actions / CI/CD (Advanced)

Set up automated deployment from GitHub to VM (see advanced section).

---

## Recommended Approach

**For simplicity:** Use **Option A** (public repo) or **Option C** (private repo with token)

**For security:** Use **Option B** (SSH key) for private repos

**For quick testing:** Use **Option D** (SCP upload)

### 5.2 Install Dependencies

```bash
npm install
```

### 5.3 Build TypeScript

```bash
npm run build
```

---

## Step 6: Configure Environment Variables

### 6.1 Create .env File

```bash
nano .env
```

Add your configuration:

```env
PORT=3000
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your-actual-gemini-api-key-here
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

### 6.2 Secure the .env File

```bash
chmod 600 .env  # Restrict permissions
```

---

## Step 7: Set Up Background Images

### 7.1 Create Directories

```bash
mkdir -p assets/backgrounds/stadium
mkdir -p assets/backgrounds/captains
```

### 7.2 Upload Background Images

**Option A: Using SCP (from your local machine):**

```bash
# From your local machine
scp -i ~/.ssh/gcp_key stadium1.jpg username@EXTERNAL_IP:~/Viz-dhm-backend/assets/backgrounds/stadium/
scp -i ~/.ssh/gcp_key captain1.jpg username@EXTERNAL_IP:~/Viz-dhm-backend/assets/backgrounds/captains/
```

**Option B: Using gcloud (from your local machine):**

```bash
gcloud compute scp stadium1.jpg photo-booth-backend:~/Viz-dhm-backend/assets/backgrounds/stadium/ --zone=us-central1-a
```

**Option C: Upload via Browser SSH:**

- Use the file upload feature in browser SSH
- Or use `nano` to create files (not recommended for images)

---

## Step 8: Run Application with PM2

### 8.1 Start API Server

```bash
cd ~/Viz-dhm-backend
pm2 start dist/server.js --name "photo-booth-api"
```

### 8.2 Start Worker

```bash
pm2 start dist/workers/photoProcessing.worker.js --name "photo-booth-worker"
```

### 8.3 Check Status

```bash
pm2 status
pm2 logs
```

### 8.4 Save PM2 Configuration

```bash
pm2 save
pm2 startup
# Run the command it outputs (usually starts with 'sudo')
```

This ensures PM2 starts on system reboot.

---

## Step 9: Configure Nginx (Optional but Recommended)

Nginx acts as a reverse proxy and can handle SSL/HTTPS.

### 9.1 Install Nginx

```bash
sudo apt-get install -y nginx
```

### 9.2 Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/photo-booth
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Increase upload size limit
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for long-running requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

**Save and exit:** `Ctrl+X`, `Y`, `Enter`

### 9.3 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/photo-booth /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

### 9.4 Update Firewall

Allow HTTP/HTTPS if not already allowed:
- Go to **VPC network** → **Firewall**
- Ensure rules for ports 80 and 443 exist

---

## Step 10: Set Up Custom Domain with SSL (Highly Recommended)

**Why use a custom domain with SSL?**
- ✅ Professional appearance (`https://api.yourdomain.com` vs `http://IP:3000`)
- ✅ Required for many mobile apps (HTTPS)
- ✅ Secure data transmission
- ✅ Free SSL via Let's Encrypt
- ✅ Auto-renewing certificates

**See `DOMAIN_SETUP.md` for detailed step-by-step instructions.**

### Quick Setup:

### 10.1 Point Your Domain to VM

1. **Get your VM's External IP:**
   - Go to **Compute Engine** → **VM instances**
   - Copy the **External IP** address

2. **Configure DNS:**
   - Go to your domain registrar (GoDaddy, Namecheap, etc.)
   - Add an **A record**:
     - **Type:** A
     - **Name:** `@` or `api` (for api.yourdomain.com)
     - **Value:** Your VM's External IP
     - **TTL:** 3600 (or default)

   **Example:**
   - If you want `api.yourdomain.com`:
     - Add A record: `api` → `YOUR_VM_IP`
   - If you want `yourdomain.com`:
     - Add A record: `@` → `YOUR_VM_IP`

3. **Wait for DNS Propagation:**
   - Can take 5 minutes to 48 hours
   - Check with: `nslookup api.yourdomain.com` or `dig api.yourdomain.com`

### 10.2 Install Nginx (if not already installed)

```bash
sudo apt-get install -y nginx
```

### 10.3 Configure Nginx for Your Domain

```bash
sudo nano /etc/nginx/sites-available/photo-booth
```

Replace with your domain:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com yourdomain.com;  # Replace with your domain

    # Increase upload size limit
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for long-running requests (image processing)
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

**Save and enable:**
```bash
sudo ln -s /etc/nginx/sites-available/photo-booth /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

### 10.4 Install Certbot and Get SSL Certificate

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

**Get SSL certificate:**
```bash
sudo certbot --nginx -d api.yourdomain.com
# Or if using root domain:
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Follow the prompts:**
- Enter your email address
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 10.5 Verify SSL

```bash
# Test SSL
curl https://api.yourdomain.com/health

# Check certificate
sudo certbot certificates
```

### 10.6 Auto-Renewal (Automatic)

Certbot sets up auto-renewal automatically. Test it:

```bash
sudo certbot renew --dry-run
```

Certificates auto-renew 30 days before expiration.

### 10.7 Update Firewall for HTTPS

Ensure port 443 (HTTPS) is allowed:
- Go to **VPC network** → **Firewall**
- Check that default `allow-https` rule exists
- Or create custom rule for port 443

### 10.8 Update Your API Endpoint

Now your API is available at:
```
https://api.yourdomain.com/api/jobs
```

Update your iPad app to use this URL instead of the IP address.

---

## Step 11: Test Deployment

### 11.1 Check API Health

```bash
curl http://localhost:3000/health
```

Or from your local machine:
```bash
curl http://EXTERNAL_IP:3000/health
```

### 11.2 Check Queue Status

```bash
curl http://EXTERNAL_IP:3000/health/queue
```

### 11.3 Test Job Submission

Use Postman to submit a job to:
```
http://EXTERNAL_IP:3000/api/jobs
```

Or if using Nginx:
```
http://EXTERNAL_IP/api/jobs
```

---

## Step 12: Monitoring and Maintenance

### 12.1 View Application Logs

```bash
# PM2 logs
pm2 logs photo-booth-api
pm2 logs photo-booth-worker

# Or view all
pm2 logs
```

### 12.2 Check System Resources

```bash
# CPU and memory usage
htop

# Disk usage
df -h

# Redis status
redis-cli ping
sudo systemctl status redis-server
```

### 12.3 Restart Services

```bash
# Restart API
pm2 restart photo-booth-api

# Restart Worker
pm2 restart photo-booth-worker

# Restart Redis
sudo systemctl restart redis-server

# Restart Nginx
sudo systemctl restart nginx
```

---

## Step 13: Update Application

When you need to update the code:

```bash
cd ~/Viz-dhm-backend

# Pull latest changes
git pull

# Install new dependencies (if any)
npm install

# Rebuild
npm run build

# Restart services
pm2 restart photo-booth-api
pm2 restart photo-booth-worker
```

---

## Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs

# Check if port is in use
sudo netstat -tulpn | grep 3000

# Check Node.js version
node --version
```

### Redis Connection Issues

```bash
# Check Redis is running
sudo systemctl status redis-server

# Test Redis connection
redis-cli ping

# Check Redis logs
sudo journalctl -u redis-server -n 50
```

### Out of Memory

If you get out of memory errors:

1. **Increase swap space:**
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

2. **Or upgrade VM** (not free tier):
   - Change to `e2-small` (2 vCPU, 2 GB) - costs ~$10/month

### Firewall Issues

```bash
# Check firewall rules
gcloud compute firewall-rules list

# Test connection from local machine
telnet EXTERNAL_IP 3000
```

### PM2 Not Starting on Reboot

```bash
# Re-run startup command
pm2 startup
# Copy and run the output command
```

---

## Cost Considerations (Free Tier)

### Free Tier Limits:

- **1 f1-micro or e2-micro VM** per month (US regions)
- **30 GB standard persistent disk**
- **1 GB network egress** per month
- **After free tier:** e2-micro costs ~$6-8/month

### To Stay in Free Tier:

- Use `e2-micro` machine type
- Stay in US regions (us-central1, us-east1)
- Keep disk under 30 GB
- Minimize network egress

### Estimated Monthly Cost (After Free Tier):

- **e2-micro VM:** ~$6-8/month
- **30 GB disk:** ~$1/month
- **Network egress:** First 1 GB free, then ~$0.12/GB
- **Total:** ~$7-10/month if you exceed free tier

---

## Security Best Practices

### 1. Restrict Firewall Access

Only allow your office/home IP addresses:
- Go to Firewall rules
- Edit `allow-photo-booth-api`
- Set **Source IP ranges** to your IPs only

### 2. Use SSH Keys

Disable password authentication:
```bash
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

### 3. Keep System Updated

```bash
sudo apt-get update && sudo apt-get upgrade -y
```

### 4. Use Environment Variables

Never commit `.env` file to git.

### 5. Regular Backups

```bash
# Backup application
tar -czf backup-$(date +%Y%m%d).tar.gz ~/Viz-dhm-backend

# Backup Redis (if needed)
redis-cli SAVE
```

---

## Quick Reference Commands

```bash
# View logs
pm2 logs

# Restart services
pm2 restart all

# Check status
pm2 status
sudo systemctl status redis-server
sudo systemctl status nginx

# View resources
htop
df -h

# Test API
curl http://localhost:3000/health
```

---

## Next Steps

1. ✅ Set up domain name (optional)
2. ✅ Configure SSL/HTTPS
3. ✅ Set up monitoring/alerting
4. ✅ Configure automated backups
5. ✅ Set up CI/CD for deployments

---

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs`
2. Check system logs: `sudo journalctl -xe`
3. Verify all services are running: `pm2 status`
4. Test Redis: `redis-cli ping`
5. Check firewall rules in GCP console

Good luck with your deployment! 🚀

