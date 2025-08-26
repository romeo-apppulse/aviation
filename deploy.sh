#!/bin/bash

# Aviation Ape Manager Deployment Script
echo "🛩️ Starting Aviation Ape Manager deployment..."

# Exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Node.js version $NODE_VERSION is too old. Please install Node.js 18 or higher."
    exit 1
fi

print_status "Node.js version check passed: $NODE_VERSION"

# Check if PostgreSQL is accessible
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL client not found. Make sure PostgreSQL is installed and accessible."
fi

# Copy production files
print_status "Setting up production configuration..."
cp package.production.json package.json
cp vite.production.config.ts vite.config.ts

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Copying .env.example..."
    cp .env.example .env
    print_warning "Please edit .env file with your configuration before running the application."
fi

# Install dependencies
print_status "Installing dependencies..."
npm install

# Build the application
print_status "Building the application..."
npm run build

# Run database migrations
print_status "Running database migrations..."
if [ -f ".env" ]; then
    source .env
    if [ -n "$DATABASE_URL" ]; then
        npm run db:push
        print_status "Database schema updated successfully"
    else
        print_warning "DATABASE_URL not set in .env file. Please configure database connection."
    fi
else
    print_warning "No .env file found. Database migrations skipped."
fi

print_status "Deployment completed successfully!"
echo ""
echo "🚀 To start the application:"
echo "   npm start"
echo ""
echo "📋 Make sure to:"
echo "   1. Configure your .env file with proper database and secrets"
echo "   2. Set up your PostgreSQL database"
echo "   3. Configure your reverse proxy (nginx/apache) if needed"
echo ""
echo "🌐 The application will be available at http://localhost:5000"