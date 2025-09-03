# Aviation Ape Manager - Aircraft Management System

A comprehensive full-stack aircraft management system built for tracking aircraft leases, owners, lessees (flight schools), payments, and maintenance schedules.

## 🚀 Quick Start

### Development (Replit)
This application runs on PostgreSQL in the Replit environment:

```bash
npm install
npm run dev
```

### Production Deployment (MySQL)
For deployment on your own hosting infrastructure:

1. **Copy deployment files to your server**
2. **Install MySQL 8.0+**
3. **Run the setup script:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

## 📁 Deployment Package

Your deployment package includes these MySQL-ready files:

### Core Configuration
- `package.production.json` - Production dependencies with MySQL drivers
- `drizzle.mysql.config.ts` - MySQL-specific database configuration
- `.env.example` - Environment template with MySQL connection strings

### Database Setup
- `mysql-setup.sql` - Complete MySQL database initialization script
- `init-database.sql` - Database schema setup with proper charset (UTF8MB4)

### Automation Scripts
- `deploy.sh` - Automated deployment script with MySQL connection testing
- Includes dependency installation, database setup, and application building

### Docker Support
- `Dockerfile` - Container configuration optimized for production
- `docker-compose.yml` - Multi-container setup with MySQL 8.0
- `nginx.conf` - Reverse proxy configuration for production

### Documentation
- `DEPLOYMENT.md` - Complete MySQL deployment guide
- `deployment-checklist.md` - Step-by-step deployment verification
- `README-DEPLOYMENT.md` - Quick start deployment instructions

## 🗄️ Database Support

### Development Environment
- **PostgreSQL** (Replit hosted) - For development and testing
- Automatic schema synchronization with `npm run db:push`

### Production Environment  
- **MySQL 8.0+** - For independent hosting deployment
- UTF8MB4 charset for full Unicode support
- Optimized connection pooling and session management

## 🔧 MySQL Production Setup

### 1. Database Installation
```bash
# Install MySQL 8.0
sudo apt-get install mysql-server

# Secure installation
sudo mysql_secure_installation

# Create database and user
sudo mysql < mysql-setup.sql
```

### 2. Application Deployment
```bash
# Clone/copy files to server
# Update .env with your MySQL credentials
DATABASE_URL=mysql://aviation_ape_user:your-password@localhost:3306/aviation_ape_db

# Run deployment
./deploy.sh
```

### 3. Database Schema
```bash
# Initialize schema (using MySQL config)
npm run db:push

# Force push if needed
npm run db:push:force

# Access database browser
npm run db:studio
```

## 🏗️ System Architecture

### Frontend
- **React + TypeScript** with Vite build system
- **Tailwind CSS** with shadcn/ui components
- **TanStack Query** for server state management
- **Wouter** for client-side routing

### Backend
- **Express.js** with TypeScript
- **Drizzle ORM** with database-agnostic design
- **Replit OpenID Connect** authentication
- **Session management** with database storage

### Database Design
Core entities managed by the system:
- **Aircraft** - Registration, specifications, ownership
- **Owners** - Contact information and payment details  
- **Lessees** - Flight schools and contact information
- **Leases** - Agreements between owners and lessees
- **Payments** - Lease payment tracking and status
- **Maintenance** - Scheduled and completed maintenance records
- **Documents** - File attachments for various entities
- **Notifications** - System alerts and user notifications

## 🌐 Deployment Options

### 1. VPS/Dedicated Server
- Manual installation using provided scripts
- Full control over server configuration
- Recommended for production environments

### 2. Docker Deployment
```bash
# Using Docker Compose
docker-compose up -d

# Or build manually
docker build -t aviation-ape .
docker run -d -p 5000:5000 aviation-ape
```

### 3. Cloud Hosting
- AWS, DigitalOcean, Linode, Vultr
- Configure MySQL RDS or self-hosted database
- Use provided environment configuration

## 📋 Production Requirements

### System Requirements
- **Node.js** 18.0+ 
- **MySQL** 8.0+
- **Memory** 2GB RAM minimum (4GB+ recommended)
- **Storage** 10GB free space minimum
- **Network** Ports 80, 443, 22 configured

### Environment Variables
```bash
# Database Connection
DATABASE_URL=mysql://user:password@host:3306/database

# Session Security
SESSION_SECRET=your-64-character-random-string

# Authentication Domains
REPLIT_DOMAINS=your-domain.com

# Email Service (Optional)
SENDGRID_API_KEY=your-sendgrid-key
```

## 🔧 Development Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Database (MySQL Production)
npm run db:push      # Push schema changes
npm run db:push:force # Force schema push
npm run db:studio    # Database browser interface

# Utilities
npm run check        # TypeScript type checking
```

## 📖 Feature Overview

### Dashboard & Analytics
- Real-time aircraft fleet overview
- Payment status tracking and alerts
- Maintenance schedule monitoring  
- Revenue and financial reporting

### Aircraft Management
- Complete aircraft registry with specifications
- Image upload and management
- Owner assignment and transfer
- Status tracking (Available, Leased, Maintenance)

### Lease Management
- Lease agreement creation and tracking
- Automated payment generation
- Document attachment and storage
- Lease renewal and termination

### Payment Processing
- Payment due date tracking
- Invoice generation and management
- Payment status monitoring
- Automated reminder notifications

### Maintenance Scheduling
- Preventive maintenance scheduling
- Maintenance history and records
- Cost tracking and reporting
- Service provider management

### User Management & Security
- Multi-role user system (User, Admin, Super Admin)
- Account approval workflow
- Session-based authentication
- Secure file upload handling

## 🚀 Getting Started

1. **Review the deployment checklist** (`deployment-checklist.md`)
2. **Follow the deployment guide** (`DEPLOYMENT.md`)
3. **Configure your environment** using `.env.example`
4. **Run the deployment script** (`./deploy.sh`)
5. **Access your application** at your configured domain

## 📞 Support

For deployment assistance or technical support:
- Review the comprehensive documentation in the deployment package
- Check the troubleshooting section in `DEPLOYMENT.md`
- Verify your MySQL configuration matches the requirements

---

**Aviation Ape Manager** - Professional aircraft fleet management solution with MySQL deployment support.