# Aviation Ape Manager - VPS Deployment Guide (PostgreSQL + Node.js)

This guide will help you deploy Aviation Ape Manager on your VPS using Node.js and PostgreSQL.

## Prerequisites

- **VPS** with Ubuntu 20.04+ or similar Linux distribution
- **Root or sudo access**
- **Domain name** (optional but recommended)
- **PostgreSQL 14+** installed
- **Node.js 18+** installed
- **Nginx** (for reverse proxy)

## 1. Server Setup

### Install Required Software

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2 (process manager for Node.js)
sudo npm install -g pm2
```

## 2. PostgreSQL Database Setup

### Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE DATABASE aviation_ape;
CREATE USER aviation_ape_user WITH PASSWORD 'REPLACE_WITH_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE aviation_ape TO aviation_ape_user;

# For PostgreSQL 15+, also grant schema privileges
\c aviation_ape
GRANT ALL ON SCHEMA public TO aviation_ape_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aviation_ape_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aviation_ape_user;

# Exit PostgreSQL
\q
```

### Configure PostgreSQL (Optional - for remote access)

> **Note:** PostgreSQL config paths may vary by version. Replace `14` with your version (e.g., `15`, `16`).  
> Check your version: `psql --version`

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: listen_addresses = 'localhost'

# Edit pg_hba.conf for authentication
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: host aviation_ape aviation_ape_user 127.0.0.1/32 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## 3. Application Deployment

### Upload Your Application Files

```bash
# Create application directory
sudo mkdir -p /var/www/aviation-ape
sudo chown $USER:$USER /var/www/aviation-ape
cd /var/www/aviation-ape

# Option 1: Upload files using rsync from your local machine
# rsync -avz --exclude 'node_modules' --exclude '.git' \
#   /path/to/local/project/ user@your-vps:/var/www/aviation-ape/

# Option 2: Use git clone (if using version control)
# git clone https://github.com/your-repo/aviation-ape.git .

# Option 3: Use scp to copy files
# scp -r /path/to/project/* user@your-vps:/var/www/aviation-ape/
```

### Install Dependencies

```bash
cd /var/www/aviation-ape
npm install
```

### Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add the following (update with your actual values):

```env
# Node Environment
NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://aviation_ape_user:REPLACE_WITH_SECURE_PASSWORD@localhost:5432/aviation_ape

# Session Secret (REQUIRED - generate a secure random string)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=REPLACE_WITH_LONG_RANDOM_STRING_AT_LEAST_32_CHARS

# Email Configuration (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=noreply@yourdomain.com

# Or use SendGrid instead of SMTP
# SENDGRID_API_KEY=your_sendgrid_api_key
# SENDGRID_FROM_EMAIL=noreply@yourdomain.com
# SENDGRID_FROM_NAME=Aviation Ape Manager
```

**Generate Secure SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Setup Database Schema

```bash
# Push database schema to PostgreSQL
npm run db:push

# If you get errors, try force push
npm run db:push -- --force
```

### Build the Application

```bash
# Build frontend and backend for production
npm run build
```

## 4. Create Initial Super Admin User

Create the first admin user manually in the database:

```bash
# Generate password hash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YOUR_ADMIN_PASSWORD', 12, (err, hash) => { console.log(hash); });"
# Copy the hash output

# Connect to PostgreSQL
sudo -u postgres psql aviation_ape

# Insert super admin user (replace values with your details)
INSERT INTO users (email, password_hash, first_name, last_name, role, status, created_at, updated_at)
VALUES (
  'admin@yourdomain.com',
  'PASTE_PASSWORD_HASH_HERE',
  'Admin',
  'User',
  'super_admin',
  'approved',
  NOW(),
  NOW()
);

# Verify user was created
SELECT email, first_name, last_name, role, status FROM users;

# Exit PostgreSQL
\q
```

## 5. PM2 Process Management

### Create PM2 Ecosystem File

```bash
cd /var/www/aviation-ape
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'aviation-ape',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
};
```

### Start Application with PM2

```bash
# Create logs directory
mkdir -p logs

# Start the application
pm2 start ecosystem.config.js

# Verify application is running
pm2 status
# Ensure status shows "online" before proceeding

# View logs to check for errors
pm2 logs aviation-ape --lines 50

# If everything looks good, save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions from the output

# View application status
pm2 status
```

## 6. Nginx Reverse Proxy Setup

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/aviation-ape
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Increase max upload size for aircraft images
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Enable Site and Restart Nginx

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/aviation-ape /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 7. SSL Certificate with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts and select redirect HTTP to HTTPS

# Test auto-renewal
sudo certbot renew --dry-run
```

## 8. Firewall Configuration

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow ssh
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Or manually:
# sudo ufw allow 80/tcp
# sudo ufw allow 443/tcp

# Check firewall status
sudo ufw status
```

## 9. Application Maintenance

### Update Application

```bash
cd /var/www/aviation-ape

# Pull latest changes (if using git)
git pull origin main

# Or upload new files via rsync/scp

# Install any new dependencies
npm install

# Rebuild application
npm run build

# Restart with PM2
pm2 restart aviation-ape

# Or reload for zero-downtime
pm2 reload aviation-ape
```

### Database Backups

Create a backup script:

```bash
nano ~/backup-aviation-ape.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/aviation-ape"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U aviation_ape_user -h localhost aviation_ape > $BACKUP_DIR/aviation_ape_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "aviation_ape_*.sql" -mtime +7 -delete

echo "Backup completed: aviation_ape_$DATE.sql"
```

```bash
# Make executable
chmod +x ~/backup-aviation-ape.sh

# Test backup
~/backup-aviation-ape.sh

# Setup daily cron job at 2 AM
crontab -e
# Add: 0 2 * * * /home/yourusername/backup-aviation-ape.sh
```

### Restore from Backup

```bash
# Stop the application
pm2 stop aviation-ape

# Restore database
psql -U aviation_ape_user -h localhost aviation_ape < /var/backups/aviation-ape/aviation_ape_20240101_020000.sql

# Start the application
pm2 start aviation-ape
```

### Monitoring and Logs

```bash
# View application logs
pm2 logs aviation-ape

# View last 100 lines
pm2 logs aviation-ape --lines 100

# Monitor resources
pm2 monit

# View application metrics
pm2 status

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

## 10. Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs aviation-ape --lines 100

# Check if port 5000 is available
sudo netstat -tulpn | grep 5000

# Restart application
pm2 restart aviation-ape

# Check environment variables
pm2 env 0
```

### Database Connection Issues

```bash
# Test database connection
psql -U aviation_ape_user -h localhost aviation_ape

# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### Permission Issues

```bash
# Fix application directory permissions
sudo chown -R $USER:$USER /var/www/aviation-ape

# Fix logs directory permissions
chmod 755 /var/www/aviation-ape/logs
```

## 11. Security Best Practices

1. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Use strong passwords:**
   - Database password (min 16 characters)
   - Admin account password (min 12 characters)
   - SESSION_SECRET (32+ characters)

3. **Enable fail2ban:**
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

4. **Regular backups:**
   - Database backups (daily)
   - Application files backups (weekly)

5. **Monitor logs regularly:**
   ```bash
   pm2 logs aviation-ape
   sudo tail -f /var/log/nginx/error.log
   ```

6. **Keep dependencies updated:**
   ```bash
   npm audit
   npm audit fix
   npm update
   ```

7. **Disable root SSH login:**
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Set: PermitRootLogin no
   sudo systemctl restart sshd
   ```

## 12. Production Checklist

- [ ] PostgreSQL installed and running
- [ ] Database `aviation_ape` created
- [ ] Database user created with secure password
- [ ] Environment variables configured in `.env`
- [ ] SESSION_SECRET generated (32+ characters)
- [ ] Dependencies installed (`npm install`)
- [ ] Database schema pushed (`npm run db:push`)
- [ ] Application built (`npm run build`)
- [ ] Super admin user created in database
- [ ] PM2 configured and application running
- [ ] PM2 startup script configured
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Firewall configured (UFW)
- [ ] Backup script created and tested
- [ ] Cron job for daily backups configured
- [ ] Application accessible via domain
- [ ] Email notifications configured (optional)
- [ ] Monitoring and logging verified
- [ ] Security best practices implemented
- [ ] Post-deployment smoke test completed (see below)

## 13. Post-Deployment Verification

After completing all deployment steps, verify everything is working correctly:

```bash
# Test 1: Check PM2 process is running
pm2 status
# Should show "aviation-ape" with status "online"

# Test 2: Check application is responding
curl http://localhost:5000
# Should return HTML from the application

# Test 3: Test from public domain (if SSL configured)
curl https://yourdomain.com
# Should return HTML from the application

# Test 4: Verify database connection
pm2 logs aviation-ape --lines 20
# Should NOT show database connection errors

# Test 5: Access the application in browser
# Navigate to: https://yourdomain.com
# You should see the Aviation Ape Manager login page

# Test 6: Login with super admin account
# Email: admin@yourdomain.com
# Password: (the password you set when creating the admin user)
# Should successfully login and see the dashboard
```

**If any test fails:**
- Check PM2 logs: `pm2 logs aviation-ape`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Check database connectivity: `psql -U aviation_ape_user -h localhost aviation_ape`
- Verify environment variables in `.env` file
- Ensure all firewall rules are correctly configured

## 14. Performance Optimization

### PostgreSQL Tuning

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Add/update these settings:

```
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB
```

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Node.js Performance

In `ecosystem.config.js`, adjust based on your server:

```javascript
instances: 2, // Or number of CPU cores
max_memory_restart: '500M', // Adjust based on available RAM
```

## 15. Quick Commands Reference

```bash
# Start application
pm2 start aviation-ape

# Stop application
pm2 stop aviation-ape

# Restart application
pm2 restart aviation-ape

# View logs
pm2 logs aviation-ape

# Monitor
pm2 monit

# Backup database
~/backup-aviation-ape.sh

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# View firewall status
sudo ufw status

# Renew SSL certificate
sudo certbot renew
```

## Support

For issues or questions:
- Check application logs: `pm2 logs aviation-ape`
- Check Nginx logs: `/var/log/nginx/error.log`
- Check PostgreSQL logs: `/var/log/postgresql/`
- Review this documentation

---

**Application:** Aviation Ape Manager  
**Database:** PostgreSQL  
**Platform:** Node.js  
**Version:** 1.0.0
