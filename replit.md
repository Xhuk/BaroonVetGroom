# Overview

VetGroom is a comprehensive SaaS platform designed for veterinary clinics, offering multi-tenant functionality for managing operations like appointments, grooming, medical visits, inventory, and delivery logistics. The platform features a modern web interface built with React and TypeScript, backed by a Node.js/Express server with PostgreSQL. Its business vision is to streamline veterinary practice management, enhance customer experience through features like integrated WhatsApp notifications, and optimize logistical challenges such as pet delivery and pickup. The project aims to provide a scalable, cost-efficient solution with ambitions for high-volume tenant environments and precise operational control.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Technology Stack**: React with TypeScript for a modern SPA, using Vite for fast builds and HMR.
- **Routing**: Wouter for client-side routing with role-based access.
- **UI/UX**: `shadcn/ui` component library built on Radix UI primitives, styled with Tailwind CSS using custom veterinary theme colors.
- **State Management**: TanStack Query for server state and React Context for tenant management.
- **Form Handling**: React Hook Form with Zod validation.
- **Debug System**: Tenant selection interface for VetGroom developers allowing session-based switching and read-only debugger permissions.

## Backend Architecture
- **Technology Stack**: Express.js for a RESTful API server with TypeScript for end-to-end type safety.
- **Authentication**: Replit OAuth integration with Passport.js and PostgreSQL-backed session management.
- **Multi-tenancy**: Hierarchical structure: Companies → Tenants → Users, with data isolation by tenant ID.
- **Database Layer**: Drizzle ORM with connection pooling via Neon serverless PostgreSQL.
- **Delivery Tracking System**: Multi-driver real-time monitoring, delay detection, and emergency alerts. Includes pet weight calculations with cage tare weights for load planning.
- **Automated Notifications**: Integration with n8n webhooks for configurable notifications (payment reminders, delivery updates, appointment reminders) with retry logic and error deduplication.
- **Business Logic Automation**: Automatic invoice generation for medical appointments and delivery scheduling for grooming services, with intelligent automation based on company billing configurations. Inventory stock is automatically reduced upon payment processing.
- **RBAC System**: Comprehensive role-based access control with system roles, company roles, and page-level permissions, accessible via a SuperAdmin dashboard. Includes role impersonation for debugging.

## Database Design
- **Schema**: Multi-tenant schema with core entities like Rooms, Staff, Clients, Pets, and Appointments.
- **Seeded Data**: Pre-populated with common veterinary services.
- **Mapping Data**: Enhanced map zoom for detailed planning and precise customer location markers.

# External Dependencies

## Core Infrastructure
- **Database**: Neon PostgreSQL serverless with connection pooling.
- **Authentication**: Replit OAuth/OIDC service.
- **Build System**: Vite (client), ESBuild (server).

## UI and Styling
- **Component Library**: Radix UI primitives, `shadcn/ui`.
- **Styling**: Tailwind CSS.
- **Icons**: Lucide React.

## Development Tools
- **ORM**: Drizzle.
- **Validation**: Zod.
- **HTTP Client**: Native fetch with TanStack Query.
- **Session Storage**: `connect-pg-simple`.

## Integrations
- **WhatsApp**: Via n8n webhooks for appointment confirmations and emergency notifications (manual user action required for sending).
- **AI**: OpenAI for bulk inventory import processing natural language descriptions.