# Troubleshooting Guide

Common issues and solutions for the Photo Booth Backend.

---

## APT Lock Issues

### Problem: "Could not get lock /var/lib/apt/lists/lock"

**Cause:** Another `apt-get` or `apt` process is running.

### Solution 1: Wait for Process to Finish (Recommended)

```bash
# Check what process is using apt
ps aux | grep apt

# Wait a few minutes, then try again
sudo apt-get update
```

### Solution 2: Kill Stuck Process (If Process is Stuck)

```bash
# Find the process ID
ps aux | grep apt

# Kill the process (replace PID with actual process ID)
sudo kill -9 816
sudo kill -9 1447

# Wait a few seconds, then try again
sudo apt-get update
```

### Solution 3: Remove Lock Files (Last Resort)

**Only if processes are definitely not running:**

```bash
# Check if any apt processes are running
ps aux | grep -i apt

# If none are running, remove locks
sudo rm /var/lib/apt/lists/lock
sudo rm /var/lib/dpkg/lock-frontend
sudo rm /var/lib/dpkg/lock

# Try again
sudo apt-get update
```

**⚠️ Warning:** Only remove locks if you're absolutely sure no apt process is running!

---

## Other Common Issues

### Redis Connection Errors

**Problem:** `ECONNREFUSED` when connecting to Redis

**Solution:**
```bash
# Check if Redis is running
sudo systemctl status redis-server

# Start Redis if not running
sudo systemctl start redis-server

# Enable auto-start
sudo systemctl enable redis-server
```

### Port Already in Use

**Problem:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using port 3000
sudo lsof -i :3000
# Or
sudo netstat -tulpn | grep 3000

# Kill the process
sudo kill -9 <PID>

# Or restart PM2
pm2 restart all
```

### Out of Memory

**Problem:** Process killed or out of memory errors

**Solution:**
```bash
# Check memory
free -h

# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### PM2 Not Starting on Reboot

**Solution:**
```bash
pm2 startup
# Run the command it outputs (usually starts with 'sudo')
pm2 save
```

### Nginx Configuration Errors

**Problem:** `nginx: configuration file test failed`

**Solution:**
```bash
# Test configuration
sudo nginx -t

# Check error details
sudo tail -f /var/log/nginx/error.log

# Fix syntax errors in config
sudo nano /etc/nginx/sites-available/photo-booth
```

### SSL Certificate Issues

**Problem:** Certbot fails or certificate expired

**Solution:**
```bash
# Renew certificate
sudo certbot renew

# Get new certificate
sudo certbot --nginx -d api.yourdomain.com --force-renewal

# Check certificate status
sudo certbot certificates
```

---

## Quick Fixes

```bash
# Restart all services
sudo systemctl restart redis-server
pm2 restart all
sudo systemctl restart nginx

# Check all service status
pm2 status
sudo systemctl status redis-server
sudo systemctl status nginx

# View logs
pm2 logs
sudo journalctl -u redis-server -n 50
sudo tail -f /var/log/nginx/error.log
```

