# Overview

VetGroom is a comprehensive SaaS platform designed for veterinary clinics, providing multi-tenant functionality for managing operations including appointments, grooming, medical visits, inventory, and delivery logistics. The platform features a modern web interface, a robust backend, and PostgreSQL database integration. Its vision is to streamline veterinary practice management, enhance customer service, and enable efficient delivery operations, offering significant market potential in the pet care industry.

# User Preferences

Preferred communication style: Simple, everyday language.
Performance preference: Fast loading over complex UI animations.
Dashboard preference: Replace Calendar with "good looking list of appointments per hour"

# System Architecture

## Frontend Architecture
- **Technology Stack**: React with TypeScript, Vite for fast builds, Wouter for routing.
- **UI/UX**: shadcn/ui component library built on Radix UI, styled with Tailwind CSS using a custom veterinary theme.
- **State Management**: TanStack Query for server state; React Context for tenant management.
- **Form Handling**: React Hook Form with Zod validation.
- **Debug System**: Session-based tenant selection interface for developers and system administrators.

## Backend Architecture
- **Technology Stack**: Express.js with TypeScript for RESTful APIs.
- **Authentication**: Replit OAuth integration with Passport.js for session management.
- **Multi-tenancy**: Hierarchical structure: Companies → Tenants → Users, ensuring data isolation.
- **Database Layer**: Drizzle ORM with Neon serverless PostgreSQL.

## Database Design
- **Session Storage**: PostgreSQL-backed.
- **Multi-tenant Schema**: Companies contain tenants, users can belong to multiple tenants.
- **Core Entities**: Rooms, Staff, Clients, Pets, Appointments, with robust relationships.
- **Business Logic Support**: Grooming, medical visits, delivery route management.
- **Data Validation**: Zod schemas shared between client and server.
- **Enhanced Map Zoom**: Precise mapping capabilities for detailed planning.

## Authentication & Authorization
- **OAuth Provider**: Replit OIDC for secure authentication.
- **Session Management**: PostgreSQL-backed sessions.
- **Multi-tenant Access Control**: Users can switch between authorized tenants.
- **Route Protection**: Server-side middleware and client-side guards.
- **RBAC System**: Comprehensive role-based access control (system, company, page permissions).
- **Debug Access**: Secure, read-only tenant selection for developers.

## Multi-tenancy Implementation
- **Tenant Context**: React Context for current tenant state.
- **Data Isolation**: All operations scoped by tenant ID.
- **User-Tenant Relationships**: Many-to-many with role-based access.

# External Dependencies

## Core Infrastructure
- **Database**: Neon PostgreSQL serverless.
- **Authentication**: Replit OAuth/OIDC.
- **Build System**: Vite (client), ESBuild (server).

## UI and Styling
- **Component Library**: Radix UI, shadcn/ui.
- **Design System**: Tailwind CSS.
- **Icons**: Lucide React.

## Development Tools
- **ORM**: Drizzle.
- **Validation**: Zod.
- **HTTP Client**: Native fetch with TanStack Query.
- **Session Storage**: connect-pg-simple.

## Integrations
- **Messaging**: n8n for WhatsApp API integration (for confirmations/notifications).

## Performance Optimizations
- **Query Caching**: TanStack Query with stale-time optimization (5-60 minutes based on data type)
- **Loading States**: Fast, lightweight loading animations instead of complex UI
- **API Optimization**: Reduced auto-refresh intervals from 30 seconds to 5+ minutes