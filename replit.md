# Overview

VetGroom is a comprehensive SaaS platform designed for veterinary clinics that provides multi-tenant functionality for managing veterinary operations including appointments, grooming services, medical visits, inventory, and delivery logistics. The application features a modern web interface built with React and TypeScript, backed by a Node.js/Express server with PostgreSQL database integration.

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
- **Business Logic**: Support for grooming appointments, medical visits, and delivery route management
- **Data Validation**: Zod schemas shared between client and server for consistent validation

## Authentication & Authorization
- **OAuth Provider**: Replit OIDC integration for secure authentication
- **Session Management**: PostgreSQL-backed sessions with configurable TTL
- **Multi-tenant Access Control**: Users can switch between authorized tenants
- **Route Protection**: Server-side middleware and client-side guards for protected resources

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