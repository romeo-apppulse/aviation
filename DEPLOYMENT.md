# Aviation Ape Manager - Deployment Guide

This guide will help you deploy Aviation Ape Manager on your own hosting infrastructure.

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

# Create database and user
CREATE DATABASE aviation_ape_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'aviation_ape_user'@'%' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON aviation_ape_db.* TO 'aviation_ape_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Application Setup

```bash
# Copy production configuration
cp package.production.json package.json
cp vite.production.config.ts vite.config.ts

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env file with your configuration (see Configuration section)

# Build the application
npm run build

# Set up database schema
npm run db:push
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
# Apply schema changes
npm run db:push

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
pg_dump -U aviation_ape_user -h localhost aviation_ape_db > backup.sql

# Restore backup
psql -U aviation_ape_user -h localhost aviation_ape_db < backup.sql
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

## Troubleshooting

### Common Issues

**Application won't start:**
- Check Node.js version: `node --version`
- Verify environment variables in `.env`
- Check PostgreSQL connection
- Review application logs

**Database connection failed:**
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check database credentials in `.env`
- Ensure database exists: `psql -U aviation_ape_user -d aviation_ape_db -c "SELECT 1;"`

**Build errors:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run check`
- Verify all dependencies are installed

### Performance Optimization

1. **Enable Gzip compression** in Nginx
2. **Use Redis** for session storage (replace memorystore)
3. **Implement CDN** for static assets
4. **Database indexing** for frequently queried fields
5. **Connection pooling** for PostgreSQL

## Support

For technical support or deployment assistance, refer to the application documentation or contact the development team.