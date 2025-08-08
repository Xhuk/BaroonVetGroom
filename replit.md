# Veterinary Clinic Management SaaS

## Overview
A high-performance Software-as-a-Service (SaaS) platform for veterinary clinic management with comprehensive tablet optimization. It provides a complete solution for managing appointments, clients, pets, and medical records with real-time updates and multi-tenant support. Key capabilities include smart booking, robust client/pet management, scalable real-time notification system, and intelligent tablet adaptation that automatically adjusts the interface for optimal use on 8+ inch tablets through desktop computers. The project delivers a reliable, fast, and feature-rich platform optimized for modern veterinary practices.

## User Preferences
- Focus on performance and loading speed optimization
- Prefer consolidated API endpoints over multiple requests
- Aggressive caching strategies for better UX
- Real-time monitoring of appointment loading performance
- Day-by-day navigation instead of loading all appointments at once
- Professional dark theme across all pages
- Fast loading for all major pages
- Responsive design for 8+ inch tablets through desktop computers
- Auto-collapsible navigation showing only icons on 8-10 inch tablets like Xiaomi Tab 8
- Full navigation maintained on 10+ inch tablets and desktop computers  
- Touch-friendly interface with optimized button sizes and spacing
- Block phone access except for SuperAdmin role for administrative tasks
- Comprehensive responsive breakpoints for different tablet sizes
- Spanish localization support with "Caja" instead of "Facturación"
- Ethereal pulse effect for current time red line with adjustable transparency and thickness
- **SuperAdmin Architecture:** SuperAdmin role must be completely tenant-independent, acting as the "ruler over all" companies and services without any tenant:id dependency

## System Architecture
The system is built on a modern stack emphasizing speed, scalability, and maintainability.

**UI/UX Decisions:**
- Professional dark theme with a deep blue palette and semantic CSS variables.
- Card components use gray-800 backgrounds with blue-300 text.
- Non-scrollable app layout where only card content scrolls.
- Navigation width is `w-72`.
- Calendar slots show time in single-line 24-hour format.
- Slot container height is 80px.
- Red current-time indicators are centered, with partial indicators for edge slots.
- Dashboard buttons are positioned horizontally at the top.
- Floating radio dial time indicator for precise time visualization on the calendar.

**Technical Implementations:**
- **Core Platform:** React for frontend with progressive loading, Express.js for backend with optimized API endpoints.
- **Database:** PostgreSQL with Drizzle ORM.
- **Authentication:** Multi-tenant architecture with role-based access and aggressive caching.
- **Time Management:** UTC-based system for all datetime operations, supporting multi-region timezones. User timezone selection is persistent.
- **Data Handling:** All database operations convert user input to UTC for storage and convert UTC back to user's timezone for display. PostgreSQL session timezone is enforced to UTC.
- **Booking System:** Azure Portal-style type-ahead search for clients and pets. Multi-service selection with real-time price calculation. Smart "Crear [name]" buttons for new client/pet creation during booking. Integration with WhatsApp for appointment confirmations.
- **Client & Pet Management:** Full CRUD operations with inline editing. Pet lifecycle management (active/inactive) with automatic age calculation.
- **Real-Time Updates:** WebSocket-based scalable system replaces API polling for instant updates, with automatic heartbeat monitoring and reconnection.
- **Automated Status Updates:** PostgreSQL functions (database cron jobs) handle automated appointment status transitions based on configurable intervals per company.
- **Performance Optimization:** Ultra-lightweight API payloads, day-specific data loading, skeleton UI for white pages, optimized data structures, and a 5-minute caching system using TanStack Query and sessionStorage. React.memo() is used for performance-critical components.
- **Deployment-Aware Feature Management:** Versioned feature system with deployment tiers (Basic, Professional, Enterprise, Development), real-time configuration API, and a SuperAdmin dashboard for managing feature rollouts.
- **Demo Data Seeding:** A comprehensive system (`server/seedDemoData.ts`) to generate realistic demo data including organizational structure, staff, and 45 days of appointment data, accessible via a SuperAdmin panel and API.
- **Debug Authentication System:** Uses live database data from `/api/tenants/all` for dynamic tenant selection, replacing hardcoded values.
- **Medical Records Optimization:** `/api/medical-appointments-fast` endpoint provides fast loading with reduced payload and sub-200ms loading times.
- **Advanced VRP Delivery Planning:** Vehicle Routing Problem (VRP) solver with nearest neighbor heuristic for optimizing delivery routes based on pet addresses and neighborhood priority. Supports filtering completed appointments.
- **Flexible Delivery Scheduling:** Toggle between "Wave-based" (fixed slots) and "Free Selection" (any hour) modes. Includes intelligent neighborhood suggestions and flexible time selection.
- **Mobile SuperAdmin Dashboard:** Optimized for mobile devices (e.g., Samsung Galaxy S25 Ultra) with touch-friendly navigation, database-driven analytics, and mobile client onboarding/subscription management endpoints.
- **Comprehensive Pickup & Delivery System:** Redesigned interface with separate Inbound (Pickup) and Outbound (Delivery) tabs for distinct pet transportation workflows. Includes route type selection, mobile driver dashboard at `/driver-mobile` with real-time GPS tracking, navigation app export (Waze/Google Maps), appointment completion workflow, and location-based progress monitoring.
- **Advanced Responsive Design System:** Complete tablet optimization system with intelligent device detection using `useScreenSize` hook that accurately identifies tablets like Xiaomi Tab 8. Features `ResponsiveNavigation` component that automatically collapses to icon-only mode on 8-10 inch tablets while maintaining full navigation on larger devices. Includes `DeviceBlocker` component restricting phone access except for SuperAdmin users, `ResponsiveLayout` component for consistent tablet-friendly layouts, and comprehensive touch-friendly CSS with responsive breakpoints for optimal tablet experience. Dashboard and core pages fully adapted for tablet use.
- **Complete Billing & Subscription Management SaaS:** Full enterprise billing system with three-tier structure: EnterpriseVet (VetGroom) manages TenantVet customers, each having multiple VetSites (clinic locations) with configurable subscription plans. Features include smart product search with client-side caching for instant filtering, TenantBillingAdmin dashboard with Excel export capabilities, EnterpriseSubscriptionAdmin for plan management, comprehensive API endpoints for billing summaries and subscription control, real-time revenue tracking, and automated invoice generation. Supports Trial/Basic (1 site), Medium (3 sites), Large (5 sites), and Extra Large (7-10+ sites) subscription tiers.
- **Subscription Expiration Validation System:** Automatic subscription monitoring with `checkSubscriptionValidity` middleware that enforces expiration dates and VetSite limits across all tenant-specific routes. The system automatically blocks access to expired subscriptions, updates status to 'expired' in the database, and provides detailed error messages with renewal prompts. Includes expiring subscription alerts in the EnterpriseSubscriptionAdmin dashboard, subscription status display components for tenant dashboards, and comprehensive subscription management APIs for renewals and status checking. SuperAdmin users maintain full access regardless of subscription status for administrative purposes.
- **Intelligent Email Reminder System:** Complete subscription expiration email reminder system with Resend provider support, automatic daily monitoring at 9 AM, smart reminders at 30, 14, 7, 3, and 1 days before expiration, professional HTML email templates in Spanish, SuperAdmin email configuration interface at `/superadmin/email-config`, and automatic email logging for audit purposes. Features fastload optimization with aggressive caching and elegant dark mode styling across all admin interfaces.
- **Tenant-Independent SuperAdmin System:** Complete architectural implementation of SuperAdmin as a global system administrator operating without any tenant:id dependencies. SuperAdmin routes (`/api/superadmin/*`) use `isSuperAdmin` middleware for security and access system-wide data across all companies and tenants. All SuperAdmin pages (`/superadmin/*`) are completely decoupled from tenant context, enabling global management of webhook monitoring, route configuration, billing management, subscription administration, and user onboarding. The system enforces the principle that SuperAdmin acts as the "ruler over all" companies and services, with unrestricted access to system-wide administration functions.
- **JSON Bulk Import System:** Advanced subscription plan configuration system allowing SuperAdmin to paste JSON configurations for bulk import/reconfiguration. Features comprehensive validation, smart upsert logic (updates existing plans by name or creates new ones), toast notifications, and support for the specific JSON format with trial_days, monthly_multiplier, and plans arrays. Includes full data transformation from JSON format to database schema with proper error handling and user feedback in Spanish.

**Feature Specifications:**
- **Appointment Management:** Redesigned for rescheduling focus, with a dedicated `/api/appointments/:id/reschedule` endpoint.
- **Calendar System:** Integrated calendar navigation with monthly view that leverages the existing booking wizard for appointment creation. Dashboard provides daily calendar view with real-time updates.
- **User Management:** Enhanced client management as a header admin tool.
- **Pet Age Management:** Tracks `registeredAge` and `birthDate` with automatic current age calculation.
- **Navigation:** Streamlined navigation focusing on core veterinary modules, with calendar and appointment management accessible via dedicated interface. Calendar page integrates with booking wizard to maintain existing workflows.

## External Dependencies
- **PostgreSQL:** Primary database.
- **Express.js:** Backend API framework.
- **React:** Frontend library.
- **Drizzle ORM:** TypeScript ORM for PostgreSQL.
- **TanStack Query:** Data fetching and caching.
- **WebSocket:** Real-time communication.
- **WhatsApp API (Implied):** For appointment confirmations.
- **Azure Portal (UI/UX inspiration):** For search interface design.

## Recent Debugging Session (2025-08-08)
Successfully debugged and resolved multiple error IDs:
- **cea41a366faa40988f3263a012662660**: Fixed TypeScript compilation errors (32→0 LSP diagnostics), restored authentication
- **59826432f2934684b1cf39d36beba056**: Fixed TypeScript compilation errors (9→0 LSP diagnostics), corrected route optimization and billing configurations  
- **f2bd1ee2c2c34c4a8aefb41e71e90dca**: Session-related authentication issue resolved through restart
- **e97ff3aa56124744bdad34f6141550e3**: Automatically resolved upon server restart
- **13438d947e96458b89d671a3517aab84**: Automatically resolved upon server restart
- **f4f85e2587884235abc2906ffa061e83**: Port conflict (EADDRINUSE) resolved by workflow restart

**Current Status**: Application fully operational with 0 LSP diagnostics, authentication working, all services running. Ready for deployment.