# Aviation Ape Manager - Deployment Package

This package contains everything needed to deploy Aviation Ape Manager on your own infrastructure.

## 🚀 Quick Start

### Option 1: Automated Deployment (Linux/Unix)
```bash
# Make the deployment script executable and run it
chmod +x deploy.sh
./deploy.sh
```

### Option 2: Docker Deployment
```bash
# Copy environment template and configure
cp .env.example .env
# Edit .env with your configuration

# Start with Docker Compose
docker-compose up -d
```

### Option 3: Manual Installation
Follow the detailed instructions in `DEPLOYMENT.md`

## 📦 Package Contents

### Core Application Files
- `client/` - React frontend application
- `server/` - Express.js backend API
- `shared/` - Shared types and database schemas
- `attached_assets/` - Static assets and logos

### Deployment Configuration
- `package.production.json` - Production dependencies (cleaned of Replit-specific packages)
- `vite.production.config.ts` - Production Vite configuration
- `.env.example` - Environment variables template
- `deploy.sh` - Automated deployment script
- `DEPLOYMENT.md` - Comprehensive deployment guide

### Database Setup
- `init-database.sql` - Database initialization script
- `drizzle.config.ts` - Database migration configuration

### Production Services
- `aviation-ape.service` - SystemD service file for Linux servers
- `Dockerfile` - Docker container configuration
- `docker-compose.yml` - Multi-container Docker setup
- `nginx.conf` - Nginx reverse proxy configuration

## 🔧 Environment Configuration

Create a `.env` file with these variables:

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/aviation_ape_db

# Security
SESSION_SECRET=your-64-character-random-string

# Authentication (if keeping Replit auth)
REPL_ID=your-app-id
REPLIT_DOMAINS=yourdomain.com

# Email (optional)
SENDGRID_API_KEY=your-sendgrid-key

# Application
NODE_ENV=production
PORT=5000
```

## 🗄️ Database Setup

### MySQL Installation & Setup
```bash
# Install MySQL
sudo apt-get install mysql-server

# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user (run mysql-setup.sql script)
sudo mysql < mysql-setup.sql

# OR manually:
sudo mysql
CREATE DATABASE aviation_ape_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'aviation_ape_user'@'%' IDENTIFIED BY 'secure-password';
GRANT ALL PRIVILEGES ON aviation_ape_db.* TO 'aviation_ape_user'@'%';
FLUSH PRIVILEGES;
EXIT;

# Initialize database schema
npm run db:push
# If that fails, use:
npm run db:push:force
```

## 🌐 Deployment Options

### 1. VPS/Dedicated Server
- Use the automated `deploy.sh` script
- Configure Nginx reverse proxy
- Set up SSL with Let's Encrypt
- Use PM2 or SystemD for process management

### 2. Docker Container
- Use provided `docker-compose.yml`
- Includes PostgreSQL and Nginx
- Easy scaling and maintenance

### 3. Cloud Platforms
- **AWS**: EC2 + RDS PostgreSQL
- **DigitalOcean**: App Platform or Droplet
- **Google Cloud**: Cloud Run + Cloud SQL
- **Azure**: App Service + PostgreSQL

## 🔒 Security Checklist

- [ ] Use strong, unique database passwords
- [ ] Generate secure session secret (64+ characters)
- [ ] Configure firewall (only allow ports 80, 443, 22)
- [ ] Set up SSL certificate
- [ ] Configure rate limiting in Nginx
- [ ] Regular security updates
- [ ] Database backups
- [ ] Monitor access logs

## 📊 Monitoring & Maintenance

### Application Monitoring
```bash
# With PM2
pm2 monit

# Check logs
pm2 logs aviation-ape

# With SystemD
sudo systemctl status aviation-ape
sudo journalctl -u aviation-ape -f
```

### Database Backup
```bash
# Create backup
pg_dump -U aviation_ape_user aviation_ape_db > backup-$(date +%Y%m%d).sql

# Restore backup
psql -U aviation_ape_user aviation_ape_db < backup-20240126.sql
```

## 🔄 Updates & Maintenance

### Application Updates
```bash
# Pull new code
git pull origin main

# Install dependencies
npm install

# Rebuild application
npm run build

# Restart service
pm2 restart aviation-ape
# OR
sudo systemctl restart aviation-ape
```

### Database Schema Updates
```bash
# Apply new schema changes
npm run db:push
```

## 🆘 Troubleshooting

### Common Issues

**Port 5000 already in use:**
```bash
# Find process using port 5000
sudo lsof -i :5000
# Kill the process
sudo kill -9 <PID>
```

**Database connection failed:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql
# Test connection
psql -U aviation_ape_user -d aviation_ape_db -h localhost
```

**Application crashes:**
```bash
# Check logs
pm2 logs aviation-ape --lines 100
# Check system resources
htop
df -h
```

## 📞 Support

For deployment assistance:
1. Check `DEPLOYMENT.md` for detailed instructions
2. Review application logs for error messages
3. Verify all environment variables are set correctly
4. Ensure database is accessible and schema is up to date

## 📄 License

This deployment package is provided as-is for the Aviation Ape Manager application.