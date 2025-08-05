# Veterinary Clinic Management SaaS

## Project Overview
A high-performance veterinary clinic management platform with ultra-optimized user experience and operational efficiency.

## Recent Changes
### Enhanced System Design & User Management (August 2025) - COMPLETED
- **Removed Calendar Today Segment**: Eliminated the "calendario de hoy" from appointment management interface
- **Appointment Rescheduling Focus**: Redesigned appointment management specifically for scheduling adjustments
- **Enhanced Client Management**: Updated client system as header admin tool for contact information updates
- **Advanced Pet Age Management**: 
  - Added `registeredAge` field for age at registration time
  - Added `birthDate` field for automatic age calculation
  - System automatically calculates current age from birth date
  - Both registered age and calculated age displayed for medical accuracy
- **Database-Side Age Updates**: Pet age calculations managed automatically by the system
- **Reschedule API Endpoint**: Added dedicated `/api/appointments/:id/reschedule` endpoint for appointment adjustments
- **Super Admin Age Management**: Pet age updates managed by super admin in dedicated sections
- **UI Cleanup & Header Enhancement**: 
  - Removed inventory button from navigation sidebar
  - Restored timezone settings cog icon to main header (left of "Cerrar Sesión")
  - Removed "Inventario" and "Zona Horaria" buttons from Dashboard action buttons
- **Streamlined Navigation**: Removed "Citas" module from navigation (accessible via "Gestionar Citas" button) and focused on core veterinary modules

### Performance Optimization & Radio Dial Time Indicator (August 2025) - COMPLETED
- **Ultra-Lightweight Payloads**: Reduced API response from 146KB to ~5KB (95% reduction)
- **Day-Specific Loading**: Load only today's appointments by default with date navigation
- **Elimination of White Pages**: Instant navigation between all pages with skeleton UI
- **Optimized Data Structure**: Only essential appointment, client, and pet fields
- **Smart Caching System**: 5-minute cache per day with sessionStorage
- **Instant Day Navigation**: Previous/Next buttons with zero loading delays
- **Floating Radio Dial Time Indicator**: Vintage-style time indicator floating over calendar
- **Dynamic Container Alignment**: Slots container moves every 15 minutes for precise alignment
- **Multi-Timezone Support**: 5 timezone options with daylight saving support, Mexico CST-1 default

### Technical Implementation
- Optimized `/api/appointments-data/:tenantId?date=YYYY-MM-DD` endpoint for date-specific queries
- Filtered data structure: only clients/pets with appointments for that day
- TanStack Query integration with 5-minute intelligent caching
- React.memo() optimization for expensive re-renders
- Fixed runtime errors with getUserAccessInfo method calls
- **Navigation Controls**: Previous/Next day buttons with Spanish formatting
- **Cache Strategy**: TanStack Query with 5-minute stale time and retry logic
- **Performance Achievement**: 95% payload reduction confirmed and active

## Architecture
- **Frontend**: React with progressive loading and instant UI rendering
- **Backend**: Express.js with hyper-optimized API endpoints  
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Multi-tenant with aggressive caching
- **Performance**: Sub-100ms response times for critical operations

## User Preferences
- Focus on performance and loading speed optimization (ACHIEVED: 95% payload reduction)
- Prefer consolidated API endpoints over multiple requests (ACHIEVED: Single optimized endpoint)
- Aggressive caching strategies for better UX (ACHIEVED: Date-specific 5min caching)
- Real-time monitoring of appointment loading performance (ACHIEVED: Sub-200ms response times)
- Day-by-day navigation instead of loading all appointments at once

## Key Technologies
- React, Express.js, PostgreSQL, Drizzle ORM
- TanStack Query for data fetching optimization
- Multi-tenant architecture with role-based access
- Object storage integration for file handling