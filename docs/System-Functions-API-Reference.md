# System Functions & API Reference

## Table of Contents
1. [API Endpoints Overview](#api-endpoints-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Multi-tenant Operations](#multi-tenant-operations)
4. [Core Business Functions](#core-business-functions)
5. [Background Services](#background-services)
6. [WebSocket Events](#websocket-events)
7. [Error Handling](#error-handling)
8. [Rate Limiting & Security](#rate-limiting--security)

---

## API Endpoints Overview

### Base URL Structure
```
Production: https://[repl-domain].replit.app
Development: http://localhost:5000
```

### Standard Response Format
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

## Authentication & Authorization

### Authentication Endpoints

#### POST `/api/auth/login`
Local authentication for demo/development users.

**Request Body:**
```typescript
{
  email: string;
  password: string;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    },
    session: string;
  }
}
```

#### GET `/api/auth/user`
Get current authenticated user information.

**Response:**
```typescript
{
  success: true,
  data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    tenants: Array<{
      id: string;
      name: string;
      role: string;
    }>;
  }
}
```

#### GET `/api/auth/access-info`
Get user's access level and permissions.

**Response:**
```typescript
{
  success: true,
  data: {
    accessLevel: 'system' | 'company' | 'tenant';
    roles: Array<{
      roleId: string;
      roleName: string;
      roleDescription: string;
      systemLevel: boolean;
      isActive: boolean;
    }>;
    canAccessAdmin: boolean;
  }
}
```

### Authorization Middleware

#### isAuthenticated
Validates user session and sets user context.

#### isSuperAdmin
Restricts access to system administrators only.

#### checkSubscriptionValidity
Validates tenant subscription status for premium features.

---

## Multi-tenant Operations

### Tenant Management

#### GET `/api/tenants/user`
Get all tenants accessible to the current user.

**Response:**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    userId: string;
    tenantId: string;
    roleId: string;
    roleName: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>
}
```

#### GET `/api/tenants/:tenantId`
Get specific tenant information.

**Response:**
```typescript
{
  success: true,
  data: {
    id: string;
    companyId: string;
    name: string;
    subdomain: string;
    address: string;
    phone: string;
    email: string;
    settings: Record<string, any>;
    businessHours: {
      openTime: string;
      closeTime: string;
      timeSlotDuration: number;
    };
  }
}
```

#### PUT `/api/tenants/:tenantId`
Update tenant configuration.

**Request Body:**
```typescript
{
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  openTime?: string;
  closeTime?: string;
  timeSlotDuration?: number;
  settings?: Record<string, any>;
}
```

### Company Management

#### GET `/api/companies/:companyId`
Get company information and settings.

#### PUT `/api/companies/:companyId/settings`
Update company-wide settings and feature flags.

**Request Body:**
```typescript
{
  deliveryTrackingEnabled?: boolean;
  whatsappEnabled?: boolean;
  followUpHeartBeatEnabled?: boolean;
  autoStatusUpdateEnabled?: boolean;
  followUpNormalThreshold?: number;
  followUpUrgentThreshold?: number;
  // ... other company settings
}
```

---

## Core Business Functions

### Appointment Management

#### GET `/api/appointments-fast/:tenantId`
Get appointments for a tenant with optimized query.

**Query Parameters:**
- `date`: YYYY-MM-DD format (optional, defaults to today)
- `status`: Filter by appointment status
- `type`: Filter by appointment type

**Response:**
```typescript
{
  success: true,
  data: {
    appointments: Array<{
      id: string;
      clientName: string;
      petName: string;
      scheduledDate: string;
      scheduledTime: string;
      status: string;
      type: string;
      roomName?: string;
      staffName?: string;
      serviceName?: string;
      notes?: string;
    }>;
    summary: {
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
    };
  }
}
```

#### POST `/api/appointments/:tenantId`
Create new appointment.

**Request Body:**
```typescript
{
  clientId: string;
  petId: string;
  serviceId: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:MM
  roomId?: string;
  staffId?: string;
  notes?: string;
  type: 'medical' | 'grooming' | 'vaccination';
  logistics?: 'pickup' | 'delivered' | 'walk_in';
}
```

#### PUT `/api/appointments/:tenantId/:appointmentId`
Update existing appointment.

#### DELETE `/api/appointments/:tenantId/:appointmentId`
Cancel/delete appointment.

#### PUT `/api/appointments/:tenantId/:appointmentId/status`
Update appointment status.

**Request Body:**
```typescript
{
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
}
```

### Client & Pet Management

#### GET `/api/clients/:tenantId`
Get all clients for a tenant.

**Query Parameters:**
- `search`: Search by name, email, or phone
- `page`: Page number for pagination
- `limit`: Items per page

#### POST `/api/clients/:tenantId`
Create new client.

**Request Body:**
```typescript
{
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
}
```

#### GET `/api/pets/:tenantId/:clientId`
Get all pets for a specific client.

#### POST `/api/pets/:tenantId`
Create new pet.

**Request Body:**
```typescript
{
  clientId: string;
  name: string;
  species: string;
  breed?: string;
  ageYears?: number;
  ageMonths?: number;
  weight?: number;
  color?: string;
  gender?: 'male' | 'female';
  medicalNotes?: string;
  behavioralNotes?: string;
  microchipId?: string;
}
```

### Medical Records

#### GET `/api/medical-appointments/:tenantId`
Get medical appointments for a tenant.

#### POST `/api/medical-appointments/:tenantId`
Create medical appointment.

**Request Body:**
```typescript
{
  clientId: string;
  petId: string;
  staffId?: string;
  visitDate: string;
  visitTime?: string;
  reasonForVisit: string;
  symptoms?: string;
}
```

#### PUT `/api/medical-appointments/:tenantId/:appointmentId`
Update medical appointment with diagnosis and treatment.

**Request Body:**
```typescript
{
  diagnosis?: string;
  treatment?: string;
  recommendations?: string;
  weight?: number;
  temperature?: number;
  heartRate?: number;
  followUpRequired?: boolean;
  followUpDate?: string;
  totalCost?: number;
  notes?: string;
}
```

#### GET `/api/medical-records/:tenantId/:petId`
Get medical history for a specific pet.

### Inventory Management

#### GET `/api/inventory/:tenantId`
Get inventory items for a tenant.

**Query Parameters:**
- `category`: Filter by category
- `lowStock`: Show only low stock items
- `search`: Search by name or SKU

#### POST `/api/inventory/:tenantId`
Add new inventory item.

**Request Body:**
```typescript
{
  name: string;
  description?: string;
  category?: string;
  sku?: string;
  currentStock: number;
  minimumStock?: number;
  unitCost?: number;
  sellingPrice?: number;
  supplier?: string;
  expiryDate?: string;
}
```

#### PUT `/api/inventory/:tenantId/:itemId/stock`
Update inventory stock levels.

**Request Body:**
```typescript
{
  quantity: number;
  transactionType: 'purchase' | 'sale' | 'adjustment';
  notes?: string;
  unitCost?: number;
}
```

### Billing & Invoicing

#### GET `/api/billing/:tenantId/invoices`
Get billing invoices for a tenant.

#### POST `/api/billing/:tenantId/invoice`
Create new invoice.

**Request Body:**
```typescript
{
  clientId: string;
  items: Array<{
    itemId?: string;
    serviceId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  dueDate?: string;
  notes?: string;
}
```

---

## Background Services

### Follow-up Task Management

#### GET `/api/follow-up/:tenantId`
Get follow-up tasks for a tenant.

**Query Parameters:**
- `status`: Filter by task status
- `priority`: Filter by priority level
- `assignedTo`: Filter by assigned staff member
- `page`, `limit`: Pagination

**Response:**
```typescript
{
  success: true,
  data: {
    tasks: Array<{
      id: string;
      taskType: string;
      title: string;
      description: string;
      priority: 'low' | 'normal' | 'high' | 'urgent';
      status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      dueDate: string;
      assignedTo?: string;
      clientName: string;
      petName: string;
      createdAt: string;
    }>;
    total: number;
  }
}
```

#### PUT `/api/follow-up/:tenantId/:taskId/status`
Update follow-up task status.

**Request Body:**
```typescript
{
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  completedBy?: string;
}
```

### Delivery Tracking

#### GET `/api/delivery/:tenantId/tracking`
Get active deliveries for a tenant.

#### POST `/api/delivery/:tenantId/schedule`
Schedule new delivery.

**Request Body:**
```typescript
{
  appointmentId: string;
  vanId: string;
  pickupAddress: string;
  deliveryAddress: string;
  estimatedPickupTime: string;
  estimatedDeliveryTime: string;
}
```

#### PUT `/api/delivery/:tenantId/:deliveryId/status`
Update delivery status.

**Request Body:**
```typescript
{
  status: 'pending' | 'en_route' | 'picked_up' | 'delivered' | 'cancelled';
  currentLat?: number;
  currentLng?: number;
  notes?: string;
}
```

### Route Optimization

#### POST `/api/delivery/:tenantId/optimize-route`
Optimize delivery route for multiple appointments.

**Request Body:**
```typescript
{
  vanId: string;
  deliveryIds: string[];
  startLocation: {
    lat: number;
    lng: number;
  };
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    optimizedRoute: Array<{
      deliveryId: string;
      order: number;
      estimatedArrival: string;
      travelTime: number;
      distance: number;
    }>;
    totalDistance: number;
    totalTime: number;
  }
}
```

---

## WebSocket Events

### Connection Management

#### Client Connection
```typescript
// Connect to WebSocket
const ws = new WebSocket(`wss://[domain]/ws`);

// Authenticate and join tenant room
ws.send(JSON.stringify({
  type: 'join_tenant',
  tenantId: 'tenant-id',
  authToken: 'jwt-token'
}));
```

### Real-time Events

#### Appointment Updates
```typescript
// Server -> Client
{
  type: 'appointment_updated',
  data: {
    appointmentId: string;
    tenantId: string;
    action: 'created' | 'updated' | 'deleted' | 'status_changed';
    appointment: AppointmentData;
  }
}
```

#### Follow-up Task Notifications
```typescript
// Server -> Client
{
  type: 'follow_up_task_created',
  data: {
    taskId: string;
    tenantId: string;
    priority: string;
    title: string;
    assignedTo?: string;
  }
}
```

#### Delivery Status Updates
```typescript
// Server -> Client
{
  type: 'delivery_status_changed',
  data: {
    deliveryId: string;
    tenantId: string;
    status: string;
    currentLocation?: {
      lat: number;
      lng: number;
    };
    estimatedArrival?: string;
  }
}
```

---

## Error Handling

### Standard Error Responses

#### 400 Bad Request
```typescript
{
  success: false,
  error: "Invalid request data",
  details?: {
    field: string;
    message: string;
  }[]
}
```

#### 401 Unauthorized
```typescript
{
  success: false,
  error: "Authentication required"
}
```

#### 403 Forbidden
```typescript
{
  success: false,
  error: "Insufficient permissions"
}
```

#### 404 Not Found
```typescript
{
  success: false,
  error: "Resource not found"
}
```

#### 429 Too Many Requests
```typescript
{
  success: false,
  error: "Rate limit exceeded",
  retryAfter: number // seconds
}
```

#### 500 Internal Server Error
```typescript
{
  success: false,
  error: "Internal server error",
  requestId?: string
}
```

### Error Categories

#### Validation Errors
- **ZOD_VALIDATION_ERROR**: Schema validation failed
- **BUSINESS_RULE_VIOLATION**: Business logic constraint violated
- **DUPLICATE_RESOURCE**: Attempting to create duplicate entity

#### Permission Errors
- **TENANT_ACCESS_DENIED**: User not authorized for tenant
- **SUBSCRIPTION_EXPIRED**: Subscription required for feature
- **ROLE_INSUFFICIENT**: Role lacks required permissions

#### Resource Errors
- **TENANT_NOT_FOUND**: Tenant does not exist
- **APPOINTMENT_CONFLICT**: Time slot already booked
- **INSUFFICIENT_STOCK**: Not enough inventory

---

## Rate Limiting & Security

### Rate Limiting Rules

#### General API Endpoints
- **Rate**: 100 requests per minute per IP
- **Burst**: 200 requests in 10 seconds

#### Authentication Endpoints
- **Rate**: 10 requests per minute per IP
- **Lockout**: 1 hour after 5 failed attempts

#### File Upload Endpoints
- **Rate**: 20 uploads per minute per user
- **Size Limit**: 10MB per file

#### WebSocket Connections
- **Rate**: 5 connections per minute per IP
- **Max Concurrent**: 10 connections per user

### Security Headers

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-XSS-Protection: 1; mode=block
```

### Input Validation

#### Required Validations
- **SQL Injection**: Parameterized queries with Drizzle ORM
- **XSS Protection**: Input sanitization and output encoding
- **CSRF Protection**: Token validation for state-changing operations
- **File Upload Security**: Type validation and virus scanning

#### Data Sanitization
```typescript
// Example validation schema
const appointmentSchema = z.object({
  clientId: z.string().uuid(),
  petId: z.string().uuid(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(1000).optional(),
});
```

---

This comprehensive API reference provides all the necessary information for integrating with and maintaining the VetGroom platform, including authentication, business operations, real-time features, and security considerations.