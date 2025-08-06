# Veterinary Clinic Management SaaS

## Overview
A high-performance Software-as-a-Service (SaaS) platform designed for veterinary clinic management, focusing on ultra-optimized user experience and operational efficiency. The project aims to provide a comprehensive solution for managing appointments, clients, pets, and medical records with real-time updates and multi-tenant support. Key capabilities include smart booking, robust client/pet management, and a scalable real-time notification system. The business vision is to deliver a reliable, fast, and feature-rich platform that enhances productivity and decision-making for veterinary practices globally.

## User Preferences
- Focus on performance and loading speed optimization
- Prefer consolidated API endpoints over multiple requests
- Aggressive caching strategies for better UX
- Real-time monitoring of appointment loading performance
- Day-by-day navigation instead of loading all appointments at once
- Professional dark theme across all pages
- Fast loading for all major pages

## System Architecture
The system is built on a modern stack emphasizing speed, scalability, and maintainability.

**UI/UX Decisions:**
- Professional dark theme applied across all pages (BookingWizard, MedicalRecords, Admin, Landing) with deep blue palette and semantic CSS variables.
- Card components feature gray-800 backgrounds with blue-300 text variants for dark mode.
- Non-scrollable app layout where only card content scrolls.
- Navigation width increased to w-72 for improved visibility.
- Calendar slots show time in single-line 24-hour format (07:30, 08:00).
- Increased slot container height to 80px for visual consistency.
- Red current-time indicators are repositioned to the center of containers, with partial indicators for edge slots.
- Dashboard buttons are positioned horizontally at the top.
- Floating radio dial time indicator for precise time visualization on the calendar.

**Technical Implementations:**
- **Core Platform:** React for frontend with progressive loading, Express.js for backend with hyper-optimized API endpoints.
- **Database:** PostgreSQL with Drizzle ORM.
- **Authentication:** Multi-tenant architecture with role-based access and aggressive caching.
- **Time Management:** UTC-based system as the source of truth for all datetime operations, supporting multi-region timezones (e.g., Mexico City, Culiacán, Colombia, Argentina). User timezone selection with localStorage persistence.
- **Data Handling:** All database operations convert user input to UTC for storage and convert UTC back to user's timezone for display. PostgreSQL session timezone is enforced to UTC.
- **Booking System:** Azure Portal-style type-ahead search for clients and pets. Multi-service selection with real-time price calculation. Smart "Crear [name]" buttons for seamless creation of new clients/pets during appointment booking. Integration with WhatsApp for appointment confirmations.
- **Client & Pet Management:** Full CRUD operations with inline editing. Pet lifecycle management (active/inactive status) with automatic age calculation from birth date.
- **Real-Time Updates:** WebSocket-based scalable real-time system replaces API polling for instant updates, significantly reducing server load and bandwidth usage. Automatic heartbeat monitoring and reconnection logic are implemented.
- **Automated Status Updates:** Database cron jobs (PostgreSQL functions) handle automated appointment status transitions (e.g., 'scheduled' to 'in_progress') based on configurable intervals per company, replacing Node.js background services for improved reliability.
- **Performance Optimization:** Ultra-lightweight API payloads (95% reduction), day-specific data loading, elimination of white pages with skeleton UI, optimized data structures, and a smart 5-minute caching system using TanStack Query and sessionStorage. React.memo() is used for performance-critical components.

**Feature Specifications:**
- **Appointment Management:** Redesigned for rescheduling focus, with a dedicated `/api/appointments/:id/reschedule` endpoint. Eliminates complex slot reservation dialogues in favor of a direct booking workflow.
- **User Management:** Enhanced client management as a header admin tool for contact information updates.
- **Pet Age Management:** Tracks `registeredAge` and `birthDate`, automatically calculating current age.
- **Medical Records:** Optimized for fast loading with a single, optimized endpoint (`/api/medical-appointments-fast`) reducing payload by 95% and loading times to sub-200ms.
- **Navigation:** Streamlined navigation focusing on core veterinary modules, with appointment management accessible via a dedicated button.

## Recent Fixes & Updates

### Demo Data Seeding System Implementation (August 6, 2025) - COMPLETED ✅
- **Comprehensive Demo Data Seeder**: Created `server/seedDemoData.ts` for deployment demonstrations
- **Full Organizational Structure**: Generates "Compañía Demo" with 3 tenants, 7+ staff members, and realistic hierarchy
- **45 Days of Appointment Data**: Creates 5-10 appointments per day per tenant with realistic status progression
- **SuperAdmin Integration**: Added demo data seeding panel in SuperAdmin dashboard with one-click execution
- **API Endpoint**: Implemented `/api/seed-demo-data` endpoint with super admin authentication
- **Safe Multi-Run**: Designed to be idempotent and safe to run multiple times for updates
- **Deployment Ready**: Creates minimal but comprehensive dataset for client demonstrations

### Debug Authentication System Database Integration (August 6, 2025) - COMPLETED ✅
- **Removed Hardcoded Values**: Eliminated all hardcoded tenant data from debug authentication system
- **Real Database Integration**: Debug mode now uses `/api/tenants/all` endpoint for authentic tenant data
- **Dynamic Tenant Loading**: Debug tenant selection populated from live database instead of static arrays
- **Data Integrity Compliance**: All tenant information comes from actual database records
- **Seamless Demo Access**: Debug mode can now properly authenticate with any database tenant including demo data

### Medical Appointments Data Recovery (August 6, 2025) - COMPLETED ✅
- **Pet Name Display Fixed**: Resolved "Mascota desconocida" issue by creating proper `getPetsByTenant()` method
- **Database Query Optimization**: Fixed Drizzle JOIN queries with simplified select statements
- **Variable Scope Resolution**: Corrected "Cannot access before initialization" errors
- **Performance Validation**: Endpoint now processes 21 appointments with 216 total pets (10 filtered) successfully
- **Response Time**: Maintained sub-500ms performance (437ms) with full data integrity
- **Error Elimination**: Removed all 500 server errors, restored stable medical appointments page

## External Dependencies
- **PostgreSQL:** Primary database for all application data.
- **Express.js:** Web application framework for backend APIs.
- **React:** Frontend JavaScript library for building user interfaces.
- **Drizzle ORM:** TypeScript ORM for interacting with PostgreSQL.
- **TanStack Query:** Data fetching library for caching, synchronization, and server state management.
- **WebSocket:** For real-time communication and updates.
- **WhatsApp API (Implied):** For sending appointment confirmation messages.
- **Azure Portal (UI/UX inspiration):** For search interface design.