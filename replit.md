# Overview

VetGroom is a comprehensive SaaS platform designed for veterinary clinics that provides multi-tenant functionality for managing veterinary operations including appointments, grooming services, medical visits, inventory, and delivery logistics. The application features a modern web interface built with React and TypeScript, backed by a Node.js/Express server with PostgreSQL database integration.

## Recent Changes (August 2025)
- **Smart Breed Caching**: Implemented intelligent pet breed filtering with browser memory caching to reduce database calls
- **Enhanced Map Markers**: Fixed customer location markers to appear precisely at right-click position without repositioning
- **Dynamic Pet Forms**: Breed dropdown now automatically filters based on selected species with comprehensive database integration
- **Performance Optimization**: Added 30-minute cache headers for pet breed data with fallback options
- **Multi-Pet Customer Support**: Added intelligent customer lookup that handles multiple pets per customer with selection interface
- **Customer Auto-Fill**: System now auto-fills customer information when name, phone, and email match existing records
- **Service Selection Enhancement**: Fixed service loading and display in booking wizard with proper error handling
- **CSS Import Order**: Resolved Leaflet map rendering by correcting CSS import precedence over Tailwind
- **Enhanced Booking Workflow**: Added appointment time selection to step 1 with date/time validation
- **Slot Reservation System**: Implemented temporary slot reservation with UUID tracking and auto-cleanup
- **Missing Services Endpoint**: Added `/api/services/:tenantId` endpoint to fix empty service selection
- **Business Hours Configuration**: Added tenant-specific business hours with admin configuration page
- **Smart Time Selection**: Time slots now respect tenant's open/close hours and time slot duration
- **Configurable Reservations**: Slot reservation timeout is now tenant-configurable through admin interface
- **Smart Availability Checking**: Auto-validates appointment slots and advances to confirmation when free
- **Alternative Slot Suggestions**: System proposes 3 alternative times when requested slot is unavailable
- **WhatsApp Integration**: Appointment confirmations sent via n8n webhook to WhatsApp API
- **Auto-Step Progression**: Available time slots automatically advance booking wizard to confirmation step
- **Comprehensive Webhook Monitoring**: Full error logging, automatic retry with exponential backoff, and super admin dashboard
- **Maintenance Mode Handling**: Graceful degradation when n8n webhook is unavailable with user-friendly Spanish messages
- **Smart Error Deduplication**: Prevents spam logging of identical webhook failures within 5-minute windows
- **Delivery Planning Data**: Generated comprehensive seed data for Monterrey Zona Cumbres with 50 clients, 100+ pets, and 120 pickup/delivery appointments across 15 fraccionamientos
- **Comprehensive Delivery Tracking System**: Multi-driver real-time monitoring with delay detection and emergency alert management
- **Smart Weight Statistics**: Implemented accurate pet weight calculations with inventory cage tare weights for precise load planning
- **WhatsApp Emergency Notifications**: Integrated n8n webhook alerts for critical delays and emergency situations with multi-stakeholder notifications
- **Delivery Monitoring Service**: Automated background service checking delivery status every 5 minutes with configurable alert thresholds
- **Driver Check-in System**: Real-time location tracking with missed check-in detection and automatic escalation protocols
- **Scalable Monitoring Architecture**: Batch processing with concurrency limits for high-volume tenant environments (1000+ tenants)
- **Cost-Efficient Design**: Optimized for minimal server resource usage with smart batching and delay management
- **BETA Feature Control**: Super admin can enable/disable delivery tracking per company and tenant with usage analytics
- **Route Optimization Caching**: Saves optimized routes to avoid recalculation unless new delivery points are added
- **Smart Route Management**: Automatically detects when route needs recalculation based on appointment changes
- **Comprehensive RBAC System**: Full role-based access control with system roles, company roles, and page-level permissions
- **Debug Tenant Selection**: VetGroom developers can access any tenant through debug mode with secure session management
- **System Admin Dashboard**: Super admin interface for role management, user assignments, and debug access control
- **Multi-Level Access Control**: Hierarchical system from VetGroom sysadmin → supertenant → tenant users with debug capabilities
- **RBAC Page Integration**: RBAC management now exclusively accessible through SuperAdmin dashboard, not standalone navigation
- **Database Schema Fixes**: Added missing domain and settings columns to companies table for proper schema alignment
- **Endpoint Route Ordering**: Fixed API route precedence to prevent tenant-specific middleware from blocking system admin endpoints
- **Comprehensive Error System**: Implemented automatic debug info copying with red error popups that instantly copy full debug context to clipboard
- **Enhanced Error Toast**: All error messages now automatically copy complete debugging information including stack traces, user context, and browser details
- **Role Impersonation System**: Complete implementation of "View As" dropdown for debug mode with seamless role switching without authentication changes
- **Debug User Authentication Fix**: Resolved tenant context logic to properly handle users with both debug privileges and regular tenant assignments
- **Enhanced Tenant Context**: Fixed priority-based tenant selection logic that correctly handles debug users, regular assignments, and debug mode activation

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React with TypeScript**: Modern SPA using functional components and hooks
- **Vite**: Fast build tool and development server with HMR support
- **Routing**: Wouter for client-side routing with role-based page access
- **UI Framework**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom veterinary theme colors and CSS variables
- **State Management**: TanStack Query for server state and React Context for tenant management
- **Form Handling**: React Hook Form with Zod validation schemas
- **Debug System**: Tenant selection interface for VetGroom developers with session-based switching

## Backend Architecture
- **Express.js**: RESTful API server with middleware for logging and error handling
- **TypeScript**: End-to-end type safety with shared schema definitions
- **Authentication**: Replit OAuth integration with Passport.js and session management
- **Multi-tenancy**: Hierarchical structure with Companies → Tenants → Users
- **Database Layer**: Drizzle ORM with connection pooling via Neon serverless PostgreSQL

## Database Design
- **Session Storage**: PostgreSQL-backed session store for authentication persistence
- **Multi-tenant Schema**: Companies contain multiple tenants, users can belong to multiple tenants
- **Core Entities**: Rooms, Staff, Clients, Pets, Appointments with proper foreign key relationships
- **Seeded Data**: Pre-populated with common veterinary services (consultations, vaccinations, grooming, surgeries)
- **Business Logic**: Support for grooming appointments, medical visits, and delivery route management
- **Data Validation**: Zod schemas shared between client and server for consistent validation
- **Enhanced Map Zoom**: Ultra-precise zoom with 0.5km minimum level and 3x extended range for detailed planning

## Authentication & Authorization
- **OAuth Provider**: Replit OIDC integration for secure authentication
- **Session Management**: PostgreSQL-backed sessions with configurable TTL
- **Multi-tenant Access Control**: Users can switch between authorized tenants
- **Route Protection**: Server-side middleware and client-side guards for protected resources
- **RBAC System**: Complete role-based access control with system roles, company roles, and page permissions
- **Debug Access**: Secure tenant selection system for VetGroom developers and system administrators

## Multi-tenancy Implementation
- **Tenant Context**: React context provider for current tenant state management
- **Data Isolation**: All business operations scoped by tenant ID
- **Subdomain Support**: Tenant identification through subdomain routing
- **User-Tenant Relationships**: Many-to-many relationships with role-based access

# External Dependencies

## Core Infrastructure
- **Database**: Neon PostgreSQL serverless with connection pooling
- **Authentication**: Replit OAuth/OIDC service integration
- **Build System**: Vite with React plugin and runtime error overlay
- **Type System**: TypeScript with strict configuration and path mapping

## UI and Styling
- **Component Library**: Radix UI primitives for accessible components
- **Design System**: shadcn/ui component collection with Tailwind CSS
- **Styling Framework**: Tailwind CSS with PostCSS and Autoprefixer
- **Icons**: Lucide React icon library

## Development Tools
- **ORM**: Drizzle with PostgreSQL dialect and migration support
- **Validation**: Zod for runtime type checking and schema validation
- **HTTP Client**: Native fetch with TanStack Query for caching and synchronization
- **Session Storage**: connect-pg-simple for PostgreSQL session management

## Production Considerations
- **Build Pipeline**: ESBuild for server bundling, Vite for client optimization
- **Environment**: Replit deployment with cartographer plugin for development
- **Database Migrations**: Drizzle Kit for schema management and deployment
- **Error Handling**: Comprehensive error boundaries and logging middleware