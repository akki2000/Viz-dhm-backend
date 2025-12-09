# Custom Domain & SSL Setup Guide

Quick guide for setting up your custom domain with SSL on GCP VM.

---

## Why Use a Custom Domain?

✅ **Professional:** `https://api.yourdomain.com` looks better than `http://123.45.67.89:3000`  
✅ **Security:** SSL/HTTPS encrypts data in transit  
✅ **Stability:** IP addresses can change, domain stays the same  
✅ **Trust:** Users trust domains more than IP addresses  
✅ **Required:** Many mobile apps require HTTPS  

---

## Step-by-Step Setup

### Step 1: Get Your VM's IP Address

1. Go to **GCP Console** → **Compute Engine** → **VM instances**
2. Copy the **External IP** address
3. Keep this handy for DNS configuration

### Step 2: Configure DNS

**At Your Domain Registrar (GoDaddy, Namecheap, Cloudflare, etc.):**

1. Log into your domain registrar
2. Go to **DNS Management** or **DNS Settings**
3. Add an **A Record**:

   **For subdomain (recommended):**
   - **Type:** A
   - **Name/Host:** `api` (or `photo`, `backend`, etc.)
   - **Value/Points to:** `YOUR_VM_IP_ADDRESS`
   - **TTL:** 3600 (or default)

   **For root domain:**
   - **Type:** A
   - **Name/Host:** `@` (or leave blank)
   - **Value/Points to:** `YOUR_VM_IP_ADDRESS`
   - **TTL:** 3600

4. **Save** the DNS record

**Example:**
- Domain: `example.com`
- Subdomain: `api.example.com`
- A Record: `api` → `34.123.45.67`

### Step 3: Wait for DNS Propagation

- **Usually:** 5-30 minutes
- **Maximum:** Up to 48 hours (rare)
- **Check propagation:**
  ```bash
  # From your local machine
  nslookup api.yourdomain.com
  # Or
  dig api.yourdomain.com
  ```

### Step 4: Install Nginx (if not installed)

```bash
sudo apt-get update
sudo apt-get install -y nginx
```

### Step 5: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/photo-booth
```

**Replace `api.yourdomain.com` with your actual domain:**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # ← Change this to your domain

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
        
        # Long timeout for image processing
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

**Enable the site:**
```bash
sudo ln -s /etc/nginx/sites-available/photo-booth /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

### Step 6: Test HTTP (Before SSL)

```bash
# From your local machine
curl http://api.yourdomain.com/health
```

Should return: `{"status":"ok",...}`

### Step 7: Install Certbot

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

### Step 8: Get SSL Certificate

```bash
sudo certbot --nginx -d api.yourdomain.com
```

**Follow the prompts:**
1. **Email:** Enter your email (for renewal notices)
2. **Terms:** Agree to terms of service
3. **Redirect:** Choose "2" to redirect HTTP to HTTPS (recommended)

**Certbot will:**
- Automatically configure Nginx for SSL
- Set up auto-renewal
- Update your Nginx config

### Step 9: Verify SSL

```bash
# Test HTTPS
curl https://api.yourdomain.com/health

# Check certificate details
sudo certbot certificates
```

### Step 10: Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

Should show: "The dry run was successful"

---

## Update Your Application

### Update iPad App

Change API endpoint from:
```
http://123.45.67.89:3000/api/jobs
```

To:
```
https://api.yourdomain.com/api/jobs
```

### Update Environment (if needed)

If your app needs to know its own domain:

```bash
nano .env
```

Add (optional):
```env
API_BASE_URL=https://api.yourdomain.com
```

---

## Common Issues & Solutions

### DNS Not Propagating

**Problem:** Domain doesn't resolve

**Solutions:**
1. Wait longer (can take up to 48 hours)
2. Check DNS record is correct
3. Clear DNS cache: `sudo systemd-resolve --flush-caches` (Linux)
4. Use different DNS server: `nslookup api.yourdomain.com 8.8.8.8`

### Certbot Fails: "Failed to verify domain"

**Problem:** Certbot can't verify domain ownership

**Solutions:**
1. Ensure DNS has propagated: `nslookup api.yourdomain.com`
2. Ensure port 80 is open in firewall
3. Ensure Nginx is running: `sudo systemctl status nginx`
4. Check domain points to correct IP

### SSL Certificate Expired

**Problem:** Certificate expired

**Solution:**
```bash
# Renew manually
sudo certbot renew

# Check renewal status
sudo certbot certificates
```

Auto-renewal should handle this, but you can renew manually if needed.

### Mixed Content Warnings

**Problem:** Some resources load over HTTP

**Solution:**
- Ensure all API calls use `https://`
- Update iPad app to use HTTPS endpoint
- Check Nginx config redirects HTTP to HTTPS

---

## Multiple Domains/Subdomains

If you want multiple endpoints:

```bash
# Get certificate for multiple domains
sudo certbot --nginx -d api.yourdomain.com -d photo.yourdomain.com
```

Then configure Nginx for both domains.

---

## Security Considerations

### 1. Restrict Firewall

Even with SSL, restrict access:
- Go to **GCP Firewall**
- Edit `allow-photo-booth-api`
- Set **Source IP ranges** to your office/home IPs only

### 2. Rate Limiting (Optional)

Add rate limiting in Nginx to prevent abuse:

```nginx
# In nginx config
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    ...
    location / {
        limit_req zone=api_limit burst=20;
        ...
    }
}
```

### 3. Keep Certificates Updated

Auto-renewal is set up, but monitor:
```bash
# Check certificate expiry
sudo certbot certificates
```

---

## Quick Reference

```bash
# Check DNS
nslookup api.yourdomain.com

# Test HTTP
curl http://api.yourdomain.com/health

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Test HTTPS
curl https://api.yourdomain.com/health

# Renew certificate (manual)
sudo certbot renew

# Check certificates
sudo certbot certificates

# Restart Nginx
sudo systemctl restart nginx

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

---

## Cost

**SSL Certificate:** FREE (Let's Encrypt)  
**Domain:** Your existing domain (no extra cost)  
**Total:** $0 additional cost  

---

## Benefits Summary

✅ Professional HTTPS endpoint  
✅ Secure data transmission  
✅ Better for mobile apps (HTTPS required)  
✅ Easier to remember than IP addresses  
✅ Auto-renewing SSL certificates  
✅ Free SSL via Let's Encrypt  

**Recommendation:** Yes, definitely set up SSL with your custom domain! It's free, secure, and professional. 🚀

