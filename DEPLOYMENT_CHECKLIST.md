# Aviation Ape Manager - Quick Deployment Checklist

Use this checklist for a smooth VPS deployment with PostgreSQL and Node.js.

## Pre-Deployment

- [ ] VPS provisioned with Ubuntu 20.04+
- [ ] Domain name configured (optional)
- [ ] SSH access to VPS confirmed

## Server Setup (15 minutes)

```bash
# Install all required software
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs postgresql postgresql-contrib nginx
sudo npm install -g pm2
```

- [ ] Node.js 18+ installed
- [ ] PostgreSQL installed
- [ ] Nginx installed
- [ ] PM2 installed

## Database Setup (5 minutes)

```bash
# Create database and user
sudo -u postgres psql
```

```sql
CREATE DATABASE aviation_ape;
CREATE USER aviation_ape_user WITH PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE aviation_ape TO aviation_ape_user;
\c aviation_ape
GRANT ALL ON SCHEMA public TO aviation_ape_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aviation_ape_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aviation_ape_user;
\q
```

- [ ] Database created
- [ ] User created with strong password
- [ ] Privileges granted

## Application Setup (10 minutes)

```bash
# Upload and configure application
sudo mkdir -p /var/www/aviation-ape
sudo chown $USER:$USER /var/www/aviation-ape
cd /var/www/aviation-ape
# Upload your files here (rsync, git, scp)

npm install
cp .env.example .env
nano .env  # Configure DATABASE_URL and SESSION_SECRET

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm run build
npm run db:push
```

- [ ] Files uploaded to `/var/www/aviation-ape`
- [ ] Dependencies installed
- [ ] `.env` configured with secure values
- [ ] Application built
- [ ] Database schema pushed

## Create Admin User (3 minutes)

```bash
# Generate password hash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YOUR_PASSWORD', 12, (err, hash) => { console.log(hash); });"

# Insert admin user
sudo -u postgres psql aviation_ape
```

```sql
INSERT INTO users (email, password_hash, first_name, last_name, role, status, created_at, updated_at)
VALUES ('admin@yourdomain.com', 'PASTE_HASH_HERE', 'Admin', 'User', 'super_admin', 'approved', NOW(), NOW());
\q
```

- [ ] Password hash generated
- [ ] Admin user inserted
- [ ] Admin credentials saved securely

## PM2 Process Manager (3 minutes)

```bash
cd /var/www/aviation-ape
nano ecosystem.config.js  # Create PM2 config (see DEPLOYMENT.md)
mkdir -p logs

pm2 start ecosystem.config.js
pm2 status  # Verify status is "online"
pm2 logs aviation-ape --lines 50  # Check for errors
pm2 save
pm2 startup  # Follow the instructions
```

- [ ] PM2 config created
- [ ] Application started
- [ ] Status verified (online)
- [ ] PM2 startup configured

## Nginx Reverse Proxy (5 minutes)

```bash
sudo nano /etc/nginx/sites-available/aviation-ape
# Add Nginx config (see DEPLOYMENT.md)

sudo ln -s /etc/nginx/sites-available/aviation-ape /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

- [ ] Nginx config created
- [ ] Symbolic link created
- [ ] Config tested
- [ ] Nginx restarted

## SSL Certificate (5 minutes)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot renew --dry-run
```

- [ ] Certbot installed
- [ ] SSL certificate obtained
- [ ] Auto-renewal tested

## Firewall (2 minutes)

```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

- [ ] SSH allowed
- [ ] HTTP/HTTPS allowed
- [ ] Firewall enabled

## Backup Setup (5 minutes)

```bash
nano ~/backup-aviation-ape.sh
# Add backup script (see DEPLOYMENT.md)
chmod +x ~/backup-aviation-ape.sh
~/backup-aviation-ape.sh  # Test it

crontab -e
# Add: 0 2 * * * /home/USERNAME/backup-aviation-ape.sh
```

- [ ] Backup script created
- [ ] Backup tested
- [ ] Cron job configured

## Post-Deployment Verification

```bash
# Test locally
curl http://localhost:5000

# Test via domain
curl https://yourdomain.com

# Check PM2
pm2 status
pm2 logs aviation-ape --lines 20
```

- [ ] Application responds on localhost
- [ ] Application responds on domain
- [ ] No errors in PM2 logs
- [ ] Login page accessible in browser
- [ ] Admin login successful
- [ ] Dashboard loads correctly

## Optional: Email Notifications

```bash
# Add to .env file
nano .env
# Add SMTP or SendGrid credentials
pm2 restart aviation-ape
```

- [ ] Email credentials added
- [ ] Application restarted
- [ ] Email test sent successfully

## Security Hardening

- [ ] Strong database password (16+ chars)
- [ ] Strong admin password (12+ chars)
- [ ] SESSION_SECRET is random (32+ chars)
- [ ] fail2ban installed: `sudo apt install fail2ban`
- [ ] Root SSH disabled in `/etc/ssh/sshd_config`
- [ ] Regular updates scheduled

## Done! 🎉

**Total Time:** ~1 hour

Your Aviation Ape Manager is now live at: `https://yourdomain.com`

**Next Steps:**
1. Login with admin credentials
2. Create additional users
3. Add aircraft, owners, and lessees
4. Configure email notifications (if not done)
5. Monitor logs regularly: `pm2 logs aviation-ape`
6. Schedule regular backups

**Support:**
- Full guide: See `DEPLOYMENT.md`
- Logs: `pm2 logs aviation-ape`
- Restart: `pm2 restart aviation-ape`
- Status: `pm2 status`
