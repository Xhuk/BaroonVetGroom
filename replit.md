# Veterinary Clinic Management SaaS

## Overview
A high-performance Software-as-a-Service (SaaS) platform for veterinary clinic management with comprehensive tablet optimization. It provides a complete solution for managing appointments, clients, pets, and medical records with real-time updates and multi-tenant support. Key capabilities include smart booking, robust client/pet management, scalable real-time notification system, and intelligent tablet adaptation that automatically adjusts the interface for optimal use on 8+ inch tablets through desktop computers. The project delivers a reliable, fast, and feature-rich platform optimized for modern veterinary practices with significant market potential.

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
- Calendar widget with full-width days for optimal container utilization
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
- Tablet optimization: full-width calendar, optimized ribbon navigation, compact header, responsive padding, and optimized icon/text sizing for touch targets.

**Technical Implementations:**
- **Core Platform:** React for frontend with progressive loading, Express.js for backend with optimized API endpoints.
- **Database:** PostgreSQL with Drizzle ORM.
- **Authentication:** Multi-tenant architecture with role-based access and aggressive caching. SuperAdmin is tenant-independent.
- **Time Management:** UTC-based system for all datetime operations, supporting multi-region timezones with persistent user timezone selection.
- **Data Handling:** All database operations convert user input to UTC for storage and convert UTC back to user's timezone for display. PostgreSQL session timezone is enforced to UTC.
- **Booking System:** Azure Portal-style type-ahead search for clients and pets, multi-service selection with real-time price calculation, smart "Crear [name]" buttons, and WhatsApp integration for confirmations.
- **Client & Pet Management:** Full CRUD operations with inline editing and pet lifecycle management (active/inactive) with automatic age calculation.
- **Real-Time Updates:** WebSocket-based scalable system replaces API polling for instant updates, with automatic heartbeat monitoring and reconnection.
- **Automated Status Updates:** PostgreSQL functions (database cron jobs) handle automated appointment status transitions.
- **Performance Optimization:** Ultra-lightweight API payloads, day-specific data loading, skeleton UI, optimized data structures, 5-minute caching with TanStack Query and sessionStorage, and React.memo().
- **Deployment-Aware Feature Management:** Versioned feature system with deployment tiers (Basic, Professional, Enterprise, Development) and a real-time configuration API.
- **Demo Data Seeding:** Comprehensive system (`server/seedDemoData.ts`) to generate realistic demo data.
- **Debug Authentication System:** Uses live database data from `/api/tenants/all` for dynamic tenant selection.
- **Medical Records Optimization:** `/api/medical-appointments-fast` endpoint for fast loading with reduced payload.
- **Advanced VRP Delivery Planning:** Vehicle Routing Problem (VRP) solver with nearest neighbor heuristic for optimizing delivery routes based on pet addresses and neighborhood priority.
- **Flexible Delivery Scheduling:** Toggle between "Wave-based" and "Free Selection" modes, including intelligent neighborhood suggestions.
- **Mobile SuperAdmin Dashboard:** Optimized for mobile devices with touch-friendly navigation, database-driven analytics, and mobile client onboarding/subscription management endpoints.
- **Comprehensive Pickup & Delivery System:** Redesigned interface with separate Inbound (Pickup) and Outbound (Delivery) tabs, mobile driver dashboard (`/driver-mobile`) with real-time GPS tracking, navigation app export, and appointment completion workflow.
- **Advanced Responsive Design System:** Intelligent device detection using `useScreenSize` hook. `ResponsiveNavigation` component for adaptive navigation. `DeviceBlocker` component restricts phone access (except SuperAdmin). `ResponsiveLayout` component for consistent tablet-friendly layouts.
- **Complete Billing & Subscription Management SaaS:** Full enterprise billing system with three-tier structure (EnterpriseVet, TenantVet, VetSites). Features smart product search, TenantBillingAdmin dashboard with Excel export, EnterpriseSubscriptionAdmin for plan management, API endpoints for billing summaries, real-time revenue tracking, and automated invoice generation. Supports Trial/Basic, Medium, Large, and Extra Large tiers.
- **Comprehensive Fraccionamiento Management System:** Complete fraccionamiento management system with database-backed weight configuration (1.0-10.0), full CRUD operations via AdminFraccionamientos page, Spanish localization, and integrated navigation. Includes realistic Mexican city seeding data for delivery route optimization.
- **Subscription Expiration Validation System:** Automatic subscription monitoring with `checkSubscriptionValidity` middleware that enforces expiration dates and VetSite limits. Includes alerts, status display components, and APIs for renewals. SuperAdmin maintains full access.
- **Intelligent Email Reminder System:** Subscription expiration email reminder system with Resend provider support, automatic daily monitoring, smart reminders, professional HTML email templates in Spanish, SuperAdmin configuration interface, and automatic email logging.
- **Tenant-Independent SuperAdmin System:** Complete architectural implementation of SuperAdmin as a global system administrator operating without any tenant:id dependencies. SuperAdmin routes (`/api/superadmin/*`) use `isSuperAdmin` middleware and access system-wide data. All SuperAdmin pages (`/superadmin/*`) are decoupled from tenant context.
- **JSON Bulk Import System:** Advanced subscription plan configuration allowing SuperAdmin to paste JSON for bulk import/reconfiguration with validation, upsert logic, and toast notifications.
- **Scalability Benchmark Analysis:** Comprehensive performance analysis showing the platform can support 500-1,000 active clinics. Current system handles 5 tenants with 1,195 appointments in 11MB database. Response times: 3ms (basic queries), 486-526ms (concurrent load). Architecture supports linear scaling with proper optimization including Redis caching, database sharding, and load balancing.
- **Follow-Up Tasks System:** Comprehensive task management system for tracking missing information and required actions in medical and grooming records. Features include automatic task generation for incomplete records (missing diagnosis, prices, treatments), manual task creation, priority-based filtering, status tracking (pending/in-progress/completed/cancelled), Spanish localization, and integrated navigation. Auto-generation detects medical appointments missing diagnosis and grooming records missing prices, creating prioritized follow-up tasks automatically.

**Feature Specifications:**
- **Appointment Management:** Redesigned for rescheduling focus, with dedicated `/api/appointments/:id/reschedule` endpoint.
- **Calendar System:** Integrated calendar navigation with monthly view leveraging booking wizard for creation. Dashboard provides daily view with real-time updates.
- **User Management:** Enhanced client management as a header admin tool.
- **Pet Age Management:** Tracks `registeredAge` and `birthDate` with automatic current age calculation.
- **Navigation:** Streamlined navigation focusing on core veterinary modules, with calendar and appointment management accessible via dedicated interface.

## External Dependencies
- **PostgreSQL:** Primary database.
- **Express.js:** Backend API framework.
- **React:** Frontend library.
- **Drizzle ORM:** TypeScript ORM for PostgreSQL.
- **TanStack Query:** Data fetching and caching.
- **WebSocket:** Real-time communication.
- **WhatsApp API:** For appointment confirmations.
- **Azure Portal (UI/UX inspiration):** For search interface design.
- **Resend:** Email delivery provider.
- **Waze/Google Maps:** For navigation app export in driver mobile dashboard.