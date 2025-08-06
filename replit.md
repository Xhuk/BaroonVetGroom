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

### Debug Mode UI System Enhancement (August 6, 2025) - COMPLETED ✅
- **Reusable DebugBanner Component**: Created standalone component for consistent debug mode UI across all pages
- **Automatic Spacing Management**: DebugBanner includes built-in spacer to prevent content overlap
- **Global Implementation**: Integrated DebugBanner at app level for universal debug mode support
- **Integrated Exit Button**: Moved exit button inside debug ribbon next to "Cambiar Tenant" for better UX
- **UI Overlap Resolution**: Eliminated all debug mode overlap issues across Dashboard, Header, and FastCalendar
- **Clean Architecture**: Removed debug-specific spacing logic from individual components

### Critical Application Stability Fix (August 6, 2025) - COMPLETED ✅
- **React Hooks Error Resolution**: Fixed "Rendered fewer hooks than expected" error in DeliveryPlan component by restructuring hook order
- **Backend Route Recovery**: Restored working routes.ts and storage.ts from backup files to resolve TypeScript compilation errors
- **Missing Storage Methods**: Added getPetById() and getClientById() methods to storage interface
- **Authentication Type Safety**: Fixed TypeScript errors for user claims property in authentication middleware
- **Application Startup**: Successfully restored full application functionality with all services running
- **Error Elimination**: Resolved all critical startup failures and restored stable application state

### Advanced VRP Delivery Planning Implementation (August 6, 2025) - COMPLETED ✅
- **Completed Mascot Filtering**: Enhanced delivery planning to automatically filter completed appointments for pickup routing
- **Pet Address Integration**: Delivery routes now use actual pet owner addresses from client database records
- **Fraccionamiento Weight Prioritization**: Routes organized by neighborhood weight priority for optimized delivery sequencing
- **VRP Algorithm Implementation**: Classic Vehicle Routing Problem solver with nearest neighbor heuristic and capacity constraints
- **Offline Route Optimization**: Comprehensive VRP solution supporting van capacity limits and geographic optimization
- **Smart Route Sequencing**: Eastward movement bias with distance-based nearest neighbor selection for efficient routing
- **Enhanced UI Integration**: Added "Optimizar VRP" button with real-time optimization feedback and route statistics
- **API Endpoint**: New `/api/delivery-routes/optimize/:tenantId` endpoint for VRP-based route optimization

### Flexible Delivery Scheduling System (August 6, 2025) - COMPLETED ✅
- **Dual Delivery Modes**: Toggle between "Wave-based" (fixed 1PM-5PM slots) and "Free Selection" (any hour 8AM-8PM)
- **Admin Configuration Support**: Built-in UI toggle for businesses to choose their preferred delivery scheduling approach
- **Intelligent Fraccionamiento Suggestions**: Free mode displays top 6 neighborhoods sorted by weight priority for optimal routing
- **Flexible Time Selection**: Custom hour picker allowing delivery scheduling at any time during business hours
- **Smart Route Naming**: Automatic route naming based on delivery mode (Wave 1, Wave 2 vs Libre 14:00, Libre 16:30)
- **Cross-Fraccionamiento Delivery**: Dogs can be assigned to any delivery wave regardless of their pickup neighborhood
- **Priority Override System**: Manual mascot assignment to specific delivery times for business flexibility
- **Enhanced User Experience**: Visual mode selection with color-coded delivery type indicators and dynamic form adaptation

### Route Optimization UI Enhancement & Grooming Seeder Fix (August 6, 2025) - COMPLETED ✅
- **Dropdown Route Optimization**: Converted single "Optimizar Ruta" button into "Calcular Ruta" dropdown menu system
- **Dual Optimization Methods**: Added dropdown options for "Optimización Básica" and "Optimizar VRP" with distinct functionality
- **Enhanced VRP Integration**: Integrated VRP optimization mutation with proper error handling and success feedback
- **Professional UI Design**: Added chevron indicator and proper icons (Route for basic, Scale for VRP) with loading states
- **Grooming Staff Role Fix**: Fixed grooming seeder 500 error by correcting staff role filtering from 'grooming' to 'groomer', 'admin', and 'veterinarian'
- **Database Role Compliance**: Updated role matching to align with actual database schema (staff table uses 'groomer' not 'grooming')

### Configurable Seeder Days Parameter Implementation (August 6, 2025) - COMPLETED ✅
- **Demo Data Seeder Enhancement**: Enhanced `seedDemoData()` function to accept configurable days parameter (1-365 days)
- **Grooming Seeder Multi-Day Support**: Updated `seedGroomingAppointmentsToday()` to support multiple days (1-30 days) with automatic appointment distribution
- **SuperAdmin UI Enhancement**: Added input fields for both demo data days and grooming days with validation and dynamic display
- **API Endpoint Updates**: Enhanced both `/api/seed-demo-data` and `/api/seed-grooming-today/:tenantId` endpoints to accept days parameter from request body
- **Dynamic Button Labels**: Buttons automatically display current configured values ("Seed {demoDays} Days Demo Data" and "Seed {groomingDays} Day(s) Grooming")
- **Intelligent Date Distribution**: Grooming seeder distributes appointments evenly across the configured date range instead of just today

## External Dependencies
- **PostgreSQL:** Primary database for all application data.
- **Express.js:** Web application framework for backend APIs.
- **React:** Frontend JavaScript library for building user interfaces.
- **Drizzle ORM:** TypeScript ORM for interacting with PostgreSQL.
- **TanStack Query:** Data fetching library for caching, synchronization, and server state management.
- **WebSocket:** For real-time communication and updates.
- **WhatsApp API (Implied):** For sending appointment confirmation messages.
- **Azure Portal (UI/UX inspiration):** For search interface design.