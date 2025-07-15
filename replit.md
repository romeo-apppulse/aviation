# AeroLease Manager - Aircraft Management System

## Overview

AeroLease Manager is a full-stack aircraft management system built for tracking aircraft leases, owners, lessees (flight schools), payments, and maintenance schedules. The application provides a comprehensive dashboard for managing aircraft fleet operations with real-time updates and detailed reporting capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### Image Fallback System (January 2025)
- Created AeroLeaseIcon component with branded blue gradient design
- Implemented AircraftImage component with proper error handling
- Added fallback to AeroLease icon when aircraft images fail to load
- Updated all aircraft image displays across the application
- Enhanced user experience by eliminating broken image icons

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