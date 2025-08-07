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