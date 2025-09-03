# Aviation Ape Manager - MySQL Production Deployment Guide

This comprehensive guide will help you deploy Aviation Ape Manager on your own hosting infrastructure using MySQL 8.0.

> **Important**: This application uses PostgreSQL for development in Replit, but MySQL for production deployment on your own servers.

## Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **MySQL**: Version 8.0 or higher
- **Linux/Unix server** with sudo access
- **Domain name** (optional, can run on IP address)

## Quick Start

1. **Download the application files** to your server
2. **Run the deployment script**:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```
3. **Configure your environment** (see Configuration section below)
4. **Start the application**:
   ```bash
   npm start
   ```

## Manual Installation

### 1. System Requirements

```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL (if not already installed)
sudo apt-get update
sudo apt-get install mysql-server
```

### 2. Database Setup

```bash
# Start MySQL secure installation
sudo mysql_secure_installation

# Login to MySQL as root
sudo mysql

# Create database and user with UTF8MB4 support
CREATE DATABASE aviation_ape_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'aviation_ape_user'@'%' IDENTIFIED BY 'your-secure-password';
CREATE USER 'aviation_ape_user'@'localhost' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON aviation_ape_db.* TO 'aviation_ape_user'@'%';
GRANT ALL PRIVILEGES ON aviation_ape_db.* TO 'aviation_ape_user'@'localhost';

# Create session table for authentication
USE aviation_ape_db;
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
    expires INT(11) UNSIGNED NOT NULL,
    data TEXT COLLATE utf8mb4_bin,
    PRIMARY KEY (session_id),
    KEY expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

FLUSH PRIVILEGES;
EXIT;
```

### 3. Application Setup

```bash
# Copy MySQL production configuration files
cp package.production.json package.json
cp vite.production.config.ts vite.config.ts
cp drizzle.mysql.config.ts drizzle.config.ts

# Install MySQL dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env file with your MySQL configuration (see Configuration section)

# Build the application
npm run build

# Set up database schema using MySQL config
npm run db:push

# If schema push fails, try force push
npm run db:push:force
```

## Configuration

### Environment Variables (.env file)

```bash
# Database Configuration
DATABASE_URL=mysql://aviation_ape_user:your-secure-password@localhost:3306/aviation_ape_db

# Session Configuration (Generate a secure random string)
SESSION_SECRET=your-super-secure-session-secret-here

# OpenID Connect Configuration (For authentication)
REPL_ID=your-application-id
ISSUER_URL=https://replit.com/oidc
REPLIT_DOMAINS=yourdomain.com,localhost:5000

# Email Configuration (Optional)
SENDGRID_API_KEY=your-sendgrid-api-key-here

# Alternative SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Application Configuration
NODE_ENV=production
PORT=5000
```

### Generating Secure Session Secret

```bash
# Generate a secure session secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Using Process Manager (PM2 - Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start dist/index.js --name "aviation-ape"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Reverse Proxy Setup (Nginx)

Create an nginx configuration file:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

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
    }
}
```

## SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal setup (usually done automatically)
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Authentication Setup

This application uses Replit's OpenID Connect for authentication. For production deployment:

### Option 1: Continue using Replit Auth
- Update `REPLIT_DOMAINS` in your .env file to include your domain
- Register your domain with Replit (contact Replit support)

### Option 2: Implement Alternative Authentication
- Replace the authentication system in `server/replitAuth.ts`
- Consider using Auth0, Firebase Auth, or custom implementation
- Update the frontend authentication hooks in `client/src/hooks/useAuth.ts`

## Database Migrations

```bash
# Apply schema changes (using MySQL config)
npm run db:push

# If the above fails, force the schema push
npm run db:push:force

# View database in browser
npm run db:studio
```

## File Structure

```
aviation-ape-manager/
├── client/                 # React frontend
├── server/                 # Express backend
├── shared/                 # Shared types and schemas
├── attached_assets/        # Static assets (logos, images)
├── dist/                   # Built application (created after build)
├── .env                    # Environment configuration
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite build configuration
└── DEPLOYMENT.md          # This file
```

## Monitoring and Logs

### Using PM2
```bash
# View logs
pm2 logs aviation-ape

# Monitor resources
pm2 monit

# Restart application
pm2 restart aviation-ape
```

### Log Files
- Application logs: Check PM2 logs or console output
- Nginx logs: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`
- PostgreSQL logs: `/var/log/postgresql/`

## Backup Strategy

### Database Backup
```bash
# Create backup
mysqldump -u aviation_ape_user -p aviation_ape_db > backup_$(date +%Y%m%d).sql

# Restore from backup
mysql -u aviation_ape_user -p aviation_ape_db < backup_20240101.sql
```

### Application Files Backup
```bash
# Backup uploaded files and configuration
tar -czf aviation-ape-backup.tar.gz .env attached_assets/
```

## Security Checklist

- [ ] Use strong, unique passwords for database
- [ ] Generate secure session secret
- [ ] Configure firewall (only allow necessary ports)
- [ ] Use HTTPS with valid SSL certificate
- [ ] Keep dependencies updated (`npm audit fix`)
- [ ] Regular database backups
- [ ] Monitor system logs for suspicious activity
- [ ] Use PM2 or similar process manager
- [ ] Configure proper file permissions

## MySQL Troubleshooting Guide

### Database Connection Issues

**Error: "connect ECONNREFUSED 127.0.0.1:3306"**
```bash
# Check if MySQL is running
sudo systemctl status mysql

# Start MySQL if stopped
sudo systemctl start mysql

# Enable auto-start on boot
sudo systemctl enable mysql

# Check if MySQL is listening on port 3306
sudo netstat -tlnp | grep :3306
```

**Error: "Access denied for user"**
```bash
# Reset MySQL root password if needed
sudo mysql_secure_installation

# Verify user permissions
sudo mysql -u root -p
SHOW GRANTS FOR 'aviation_ape_user'@'%';
SHOW GRANTS FOR 'aviation_ape_user'@'localhost';

# Recreate user if needed
DROP USER IF EXISTS 'aviation_ape_user'@'%';
CREATE USER 'aviation_ape_user'@'%' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON aviation_ape_db.* TO 'aviation_ape_user'@'%';
FLUSH PRIVILEGES;
```

**Error: "Unknown database 'aviation_ape_db'"**
```bash
# Check if database exists
sudo mysql -u root -p -e "SHOW DATABASES;"

# Recreate database
sudo mysql -u root -p -e "CREATE DATABASE aviation_ape_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Or run the setup script
sudo mysql < mysql-setup.sql
```

### Schema Migration Issues

**Error: "drizzle-kit command not found"**
```bash
# Install drizzle-kit globally
npm install -g drizzle-kit

# Or use npx
npx drizzle-kit push --config=drizzle.mysql.config.ts
```

**Error: "Table already exists" during migration**
```bash
# Force push schema changes
npm run db:push:force

# Or manually drop tables and recreate
sudo mysql -u aviation_ape_user -p aviation_ape_db -e "DROP DATABASE aviation_ape_db;"
sudo mysql -u aviation_ape_user -p -e "CREATE DATABASE aviation_ape_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
npm run db:push
```

### Application Startup Issues

**Port already in use:**
```bash
# Find process using port 5000
sudo lsof -i :5000
# Kill process
sudo kill -9 <PID>

# Or use a different port
export PORT=8080
npm start
```

**Node.js version issues:**
```bash
# Check Node.js version
node --version

# Install Node.js 18+ if needed
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Performance Optimization

**MySQL Performance Tuning:**
```bash
# Add to /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
max_connections = 200
query_cache_size = 32M
query_cache_type = 1

# Restart MySQL after changes
sudo systemctl restart mysql
```

**Memory Issues:**
```bash
# Check memory usage
free -h
htop

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Support

For technical support or deployment assistance, refer to the application documentation or contact the development team.