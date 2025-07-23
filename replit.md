# Aviation Ape Manager - Aircraft Management System

## Overview

Aviation Ape Manager is a full-stack aircraft management system built for tracking aircraft leases, owners, lessees (flight schools), payments, and maintenance schedules. The application provides a comprehensive dashboard for managing aircraft fleet operations with real-time updates and detailed reporting capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### Aircraft Image Upload & Error Handling Fixes (January 2025)
- Fixed 413 "request entity too large" error by increasing Express body limits to 10MB
- Reduced client-side image upload limit to 2MB for better performance
- Enhanced AircraftImage component with proper fallback handling and loading states
- Added comprehensive error handling for FileReader operations in image upload
- Implemented base64 image storage with proper database persistence
- Fixed API request format issues in aircraft and user management operations
- Updated aircraft image display across all pages to use consistent AircraftImage component
- Added branded fallback icons with blue gradient styling for broken/missing images
- Fixed dynamic image updates with proper query cache invalidation and component re-rendering
- Corrected AeroLeaseIcon component to properly import and display aircraft asset image

### Super Admin User Management System (January 2025)
- Fixed aircraft edit modal to include image upload/remove functionality with file upload support
- Enhanced user management system with proper protection for permanent admin (Zach)
- Removed horizontal scroll from admin users page for consistent layout
- Added server-side protection to prevent modification/deletion of Zach's account
- Improved user interface with tooltips and better responsive design in user management table
- Added image upload validation (5MB limit) with preview functionality in aircraft editor

### Scroll Layout Optimization (January 2025)
- Fixed multiple scroll bar issues across the application
- Implemented single page scroll with sticky sidebar navigation
- Updated main App.tsx layout from h-screen to min-h-screen for natural page flow
- Modified sidebar to use sticky positioning (md:sticky md:top-0) instead of fixed
- Restructured email notification page to use consistent Card layout pattern
- Eliminated nested scrollable containers and overflow constraints
- Achieved clean, professional layout with sidebar staying fixed during content scrolling

### Email Notification System Implementation (January 2025)
- Implemented comprehensive email notification system using nodemailer
- Added email preferences management with granular controls:
  - Master email notifications toggle
  - Payment due reminders 
  - Maintenance alerts
  - Lease expiration alerts
  - System updates and announcements
- Created email service with test account for development
- Added automatic email sending when notifications are created
- Built email testing interface in settings page with status monitoring
- Updated database schema with user email preference fields
- Added API endpoints for updating email preferences (/api/auth/email-preferences)
- Enhanced notification creation to respect user email preferences

### Image Fallback System (January 2025)
- Created AeroLeaseIcon component with branded blue gradient design
- Implemented AircraftImage component with proper error handling
- Added fallback to AeroLease icon when aircraft images fail to load
- Updated all aircraft image displays across the application
- Enhanced user experience by eliminating broken image icons

### Help & Support Page Implementation (January 2025)
- Created comprehensive Help & Support page with company contact information
- Added company phone number: 1-800-AERO-LEASE (1-800-237-6532)
- Emergency hotline: 1-800-AERO-911 for critical aircraft issues
- Support request form with categories (technical, billing, feature, bug, general)
- Priority levels (low, medium, high, urgent) for proper ticket routing
- Form validation with proper error handling and success states
- Backend API endpoint for processing support requests with validation
- Professional contact information layout with office address and hours
- Success confirmation screen with request ID tracking

### Updated Aircraft Images (January 2025)
- Fixed expired Pixabay URLs with fresh aircraft images
- Updated database with working image URLs for all aircraft
- Cessna 172 (N159G): Fresh Pixabay image from 2022
- Piper Cherokee (N428KS): Dreamstime aircraft image
- Cessna 182 (N891TB): Updated Pixabay image from 2016
- Piper Archer (N247JP): Dreamstime aircraft image
- All images verified and tested for accessibility

### Authentication System Implementation (January 2025)
- Implemented Replit OpenID Connect authentication system
- Added user authentication tables (users, sessions) to PostgreSQL database
- Created login/logout functionality with automatic redirects
- Added protected routes requiring authentication
- Implemented landing page for unauthenticated users
- Updated header component with user profile and logout button
- Added authentication middleware to protect API endpoints
- Created comprehensive home page for authenticated users

## System Architecture

### Full-Stack Architecture
- **Frontend**: React with TypeScript using Vite as the build tool
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing

### Directory Structure
```
├── client/          # React frontend application
├── server/          # Express.js backend API
├── shared/          # Shared types and schemas
├── migrations/      # Database migration files
└── dist/           # Build output directory
```

## Key Components

### Frontend Architecture
- **Component Library**: Built on Radix UI primitives with shadcn/ui styling
- **Theme System**: Next-themes for light/dark mode support
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Responsive Design**: Mobile-first approach with responsive layouts

### Backend Architecture
- **API Design**: RESTful API with Express.js
- **Database Layer**: Drizzle ORM with PostgreSQL
- **Connection Pooling**: Neon Database serverless connection pooling
- **Error Handling**: Centralized error handling with Zod validation
- **Development**: Hot reload with tsx for TypeScript execution

### Database Schema
The system manages six core entities:
- **Aircraft**: Registration, specifications, ownership, and status
- **Owners**: Contact information and payment details
- **Lessees**: Flight schools and their contact information
- **Leases**: Agreements between owners and lessees
- **Payments**: Lease payment tracking and status
- **Maintenance**: Scheduled and completed maintenance records
- **Documents**: File attachments for various entities

## Data Flow

### Client-Server Communication
1. React components use TanStack Query for API calls
2. API requests go through a centralized `apiRequest` function
3. Server validates requests using Zod schemas
4. Database operations handled by Drizzle ORM
5. Responses include proper error handling and status codes

### Real-time Updates
- Dashboard refreshes every 30 seconds for live data
- Payment and maintenance data auto-refresh every 60 seconds
- Manual refresh capabilities throughout the application

### Form Handling
- React Hook Form for form state management
- Zod schemas for validation on both client and server
- Optimistic updates with query invalidation

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Database connection and querying
- **drizzle-orm**: Type-safe database queries and migrations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI components
- **react-hook-form**: Form state management
- **zod**: Runtime type validation
- **tailwindcss**: Utility-first CSS framework

### Development Tools
- **vite**: Frontend build tool and dev server
- **tsx**: TypeScript execution for development
- **esbuild**: Backend bundling for production
- **@replit/vite-plugin-***: Replit-specific development plugins

## Deployment Strategy

### Build Process
1. **Frontend**: Vite builds React app to `dist/public`
2. **Backend**: esbuild bundles Express server to `dist/index.js`
3. **Database**: Drizzle handles schema migrations

### Environment Configuration
- **Development**: Uses `tsx` for hot reload and Vite dev server
- **Production**: Serves built static files from Express server
- **Database**: Configured via `DATABASE_URL` environment variable

### Scripts
- `npm run dev`: Start development server with hot reload
- `npm run build`: Build both frontend and backend for production
- `npm run start`: Start production server
- `npm run db:push`: Push database schema changes

### Hosting Considerations
- Backend serves both API routes and static frontend files
- Database connection pooling configured for serverless environments
- Environment variables required: `DATABASE_URL`, `NODE_ENV`
- Static assets served from `/dist/public` directory

The application is designed to work seamlessly in both development and production environments, with proper error handling, responsive design, and real-time data updates for an optimal user experience.