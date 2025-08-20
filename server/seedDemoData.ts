/**
 * Comprehensive Demo Data Seeder for Veterinary Clinic Management SaaS
 * Creates realistic organizational structure and 45 days of appointment data
 */

import { db } from './db';
import { 
  companies, tenants, appointments
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { convertUserDateTimeToUTC } from '@shared/timeUtils';
import { storage } from './storage';

// Demo company and user configuration
const DEMO_CONFIG = {
  companyName: "Compañia Demo",
  companyId: "demo-corp",
  userEmail: "your-email@example.com", // You can change this
  tenants: [
    { id: "demo-vet-1", name: "Clínica Veterinaria Centro", location: "Centro Ciudad" },
    { id: "demo-vet-2", name: "Hospital Veterinario Norte", location: "Zona Norte" },
    { id: "demo-grooming-1", name: "Pet Spa Deluxe", location: "Plaza Comercial" }
  ]
};

// Service categories and rooms configuration
const SERVICE_CATEGORIES = {
  medical: {
    name: "Consulta Médica",
    services: [
      { name: "Consulta General", duration: 30, price: 500 },
      { name: "Consulta Especializada", duration: 45, price: 750 },
      { name: "Cirugía Menor", duration: 60, price: 1500 },
      { name: "Emergencia", duration: 45, price: 1000 }
    ],
    rooms: [
      { name: "Consultorio 1", capacity: 1 },
      { name: "Consultorio 2", capacity: 1 },
      { name: "Sala de Cirugía", capacity: 1 }
    ]
  },
  vaccination: {
    name: "Vacunación",
    services: [
      { name: "Vacuna Antirrábica", duration: 15, price: 200 },
      { name: "Vacuna Múltiple", duration: 20, price: 350 },
      { name: "Refuerzo Anual", duration: 15, price: 300 },
      { name: "Desparasitación", duration: 10, price: 150 }
    ],
    rooms: [
      { name: "Sala de Vacunación", capacity: 2 }
    ]
  },
  grooming: {
    name: "Estética Canina",
    services: [
      { name: "Baño y Secado", duration: 60, price: 400 },
      { name: "Corte Completo", duration: 90, price: 600 },
      { name: "Baño + Corte + Uñas", duration: 120, price: 800 },
      { name: "Tratamiento Spa", duration: 150, price: 1200 }
    ],
    rooms: [
      { name: "Sala de Grooming 1", capacity: 2 },
      { name: "Sala de Grooming 2", capacity: 2 }
    ]
  }
};

// Staff roles and specializations
const STAFF_PROFILES = [
  { name: "Dr. Ana García", role: "veterinarian", specialty: "medicina_general", email: "ana.garcia@demo.vet" },
  { name: "Dr. Carlos Mendoza", role: "veterinarian", specialty: "cirurgia", email: "carlos.mendoza@demo.vet" },
  { name: "Dra. Laura Pérez", role: "veterinarian", specialty: "dermatologia", email: "laura.perez@demo.vet" },
  { name: "María González", role: "groomer", specialty: "grooming", email: "maria.gonzalez@demo.vet" },
  { name: "Sofia Ramírez", role: "groomer", specialty: "grooming", email: "sofia.ramirez@demo.vet" },
  { name: "Juan Torres", role: "assistant", specialty: "asistente", email: "juan.torres@demo.vet" },
  { name: "Patricia López", role: "receptionist", specialty: "recepcion", email: "patricia.lopez@demo.vet" }
];

// Sample client and pet data for realistic appointments
const DEMO_CLIENTS = [
  {
    name: "Roberto Silva", phone: "+52-644-123-4567", email: "roberto.silva@email.com",
    pets: [
      { name: "Max", species: "perro", breed: "Golden Retriever", birthDate: "2020-03-15", weight: 25.5 },
      { name: "Luna", species: "gato", breed: "Siames", birthDate: "2021-07-22", weight: 4.2 }
    ]
  },
  {
    name: "Carmen Morales", phone: "+52-644-234-5678", email: "carmen.morales@email.com",
    pets: [
      { name: "Buddy", species: "perro", breed: "Labrador", birthDate: "2019-11-08", weight: 28.0 }
    ]
  },
  {
    name: "Miguel Hernández", phone: "+52-644-345-6789", email: "miguel.hernandez@email.com",
    pets: [
      { name: "Mimi", species: "gato", breed: "Persa", birthDate: "2022-01-10", weight: 3.8 },
      { name: "Rocky", species: "perro", breed: "Bulldog Frances", birthDate: "2021-05-20", weight: 12.3 }
    ]
  },
  {
    name: "Elena Jiménez", phone: "+52-644-456-7890", email: "elena.jimenez@email.com",
    pets: [
      { name: "Coco", species: "perro", breed: "Chihuahua", birthDate: "2020-09-12", weight: 2.8 }
    ]
  },
  {
    name: "Fernando Castro", phone: "+52-644-567-8901", email: "fernando.castro@email.com",
    pets: [
      { name: "Pelusa", species: "gato", breed: "Maine Coon", birthDate: "2019-12-03", weight: 6.1 },
      { name: "Zeus", species: "perro", breed: "Pastor Alemán", birthDate: "2018-08-15", weight: 32.0 }
    ]
  },
  {
    name: "Ana Ruiz", phone: "+52-644-678-9012", email: "ana.ruiz@email.com",
    pets: [
      { name: "Nala", species: "gato", breed: "Bengala", birthDate: "2021-03-28", weight: 4.5 }
    ]
  },
  {
    name: "Diego Vargas", phone: "+52-644-789-0123", email: "diego.vargas@email.com",
    pets: [
      { name: "Toby", species: "perro", breed: "Beagle", birthDate: "2020-06-14", weight: 15.2 },
      { name: "Whiskers", species: "gato", breed: "Domestico", birthDate: "2022-04-07", weight: 3.5 }
    ]
  },
  {
    name: "Lucía Medina", phone: "+52-644-890-1234", email: "lucia.medina@email.com",
    pets: [
      { name: "Spike", species: "perro", breed: "Pitbull", birthDate: "2019-01-25", weight: 22.8 }
    ]
  }
];

// Inventory items for veterinary clinic
const INVENTORY_ITEMS = [
  { name: "Vacuna Antirrábica", category: "medication", sku: "VAC-001", unitPrice: 120, currentStock: 50, minStockLevel: 10, maxStockLevel: 100, unit: "dosis" },
  { name: "Vacuna Múltiple", category: "medication", sku: "VAC-002", unitPrice: 180, currentStock: 30, minStockLevel: 8, maxStockLevel: 80, unit: "dosis" },
  { name: "Antibiótico Amoxicilina", category: "medication", sku: "MED-001", unitPrice: 60, currentStock: 40, minStockLevel: 12, maxStockLevel: 60, unit: "caja" },
  { name: "Shampoo Medicinal", category: "grooming", sku: "GRM-001", unitPrice: 80, currentStock: 25, minStockLevel: 5, maxStockLevel: 50, unit: "botella" },
  { name: "Collar Isabelino", category: "supplies", sku: "SUP-001", unitPrice: 30, currentStock: 15, minStockLevel: 5, maxStockLevel: 30, unit: "pieza" },
  { name: "Jeringas Desechables", category: "supplies", sku: "SUP-002", unitPrice: 2, currentStock: 200, minStockLevel: 50, maxStockLevel: 500, unit: "pieza" },
  { name: "Alimento Premium Perro", category: "food", sku: "ALM-001", unitPrice: 450, currentStock: 20, minStockLevel: 5, maxStockLevel: 40, unit: "saco" },
  { name: "Alimento Gato Adulto", category: "food", sku: "ALM-002", unitPrice: 350, currentStock: 18, minStockLevel: 4, maxStockLevel: 35, unit: "saco" }
];

export async function seedDemoData(days: number = 45) {
  console.log(`🌱 Starting demo data seeding for ${days} days...`);

  try {
    // 1. Create demo company using storage
    console.log("📊 Creating demo company...");
    
    const existingCompany = await storage.getCompany(DEMO_CONFIG.companyId);
    let companyId = DEMO_CONFIG.companyId;
    
    if (!existingCompany) {
      const company = await storage.createCompany({
        id: companyId,
        name: DEMO_CONFIG.companyName,
        contactEmail: DEMO_CONFIG.userEmail,
        contactPhone: "+52-644-100-0000",
        address: "Av. Principal 123, Ciudad Demo",
        subscriptionTier: "premium",
        isActive: true
      });
      console.log(`✅ Created company: ${company.name}`);
    } else {
      console.log(`✅ Company already exists: ${existingCompany.name}`);
    }

    // 2. Create tenants (veterinary clinics)
    console.log("🏥 Creating tenants...");
    const createdTenants = [];
    
    for (const tenantConfig of DEMO_CONFIG.tenants) {
      const existingTenant = await storage.getTenant(tenantConfig.id);
      
      if (!existingTenant) {
        const tenant = await storage.createTenant({
          id: tenantConfig.id,
          companyId: companyId,
          name: tenantConfig.name,
          subdomain: tenantConfig.id,
          location: tenantConfig.location,
          contactEmail: DEMO_CONFIG.userEmail,
          contactPhone: "+52-644-200-" + Math.floor(Math.random() * 9000 + 1000),
          address: `${tenantConfig.location}, Ciudad Demo`,
          isActive: true
        });
        createdTenants.push(tenant);
        console.log(`✅ Created tenant: ${tenant.name}`);
      } else {
        createdTenants.push(existingTenant);
        console.log(`✅ Tenant already exists: ${existingTenant.name}`);
      }
    }

    // 3. Create services for each tenant using storage
    console.log("🛠️ Creating services...");
    let servicesCreated = 0;
    
    for (const tenant of createdTenants) {
      for (const [categoryKey, categoryData] of Object.entries(SERVICE_CATEGORIES)) {
        for (const serviceData of categoryData.services) {
          try {
            await storage.createService({
              tenantId: tenant.id,
              name: serviceData.name,
              type: categoryKey as 'medical' | 'grooming' | 'vaccination',
              duration: serviceData.duration,
              price: serviceData.price.toString(),
              description: `${categoryData.name} - ${serviceData.name}`,
              isActive: true
            });
            servicesCreated++;
          } catch (error) {
            // Service might already exist, continue
          }
        }
      }
    }
    console.log(`✅ Created/verified ${servicesCreated} services`);

    // 4. Create rooms for each tenant using storage
    console.log("🏠 Creating rooms...");
    let roomsCreated = 0;
    
    for (const tenant of createdTenants) {
      for (const [categoryKey, categoryData] of Object.entries(SERVICE_CATEGORIES)) {
        for (const roomData of categoryData.rooms) {
          try {
            await storage.createRoom({
              tenantId: tenant.id,
              name: roomData.name,
              type: categoryKey,
              capacity: roomData.capacity,
              isActive: true
            });
            roomsCreated++;
          } catch (error) {
            // Room might already exist, continue
          }
        }
      }
    }
    console.log(`✅ Created/verified ${roomsCreated} rooms`);

    // 5. Create staff for each tenant using storage
    console.log("👥 Creating staff members...");
    let staffCreated = 0;
    
    for (const tenant of createdTenants) {
      for (const staffData of STAFF_PROFILES) {
        try {
          await storage.createStaff({
            tenantId: tenant.id,
            name: staffData.name,
            role: staffData.role,
            phone: "+52-644-300-" + Math.floor(Math.random() * 9000 + 1000),
            specialization: staffData.specialty,
            isActive: true
          });
          staffCreated++;
        } catch (error) {
          // Staff might already exist, continue
        }
      }
    }
    console.log(`✅ Created/verified ${staffCreated} staff members`);

    // 6. Create clients and pets using storage
    console.log("🐕 Creating clients and pets...");
    let clientsCreated = 0;
    let petsCreated = 0;
    
    for (const tenant of createdTenants) {
      for (const clientData of DEMO_CLIENTS) {
        try {
          const client = await storage.createClient({
            tenantId: tenant.id,
            name: clientData.name,
            phone: clientData.phone,
            email: clientData.email,
            address: `Calle ${Math.floor(Math.random() * 999) + 1}, Ciudad Demo`,
            isActive: true
          });
          clientsCreated++;
          
          // Create pets for this client
          for (const petData of clientData.pets) {
            try {
              await storage.createPet({
                clientId: client.id,
                tenantId: tenant.id,
                name: petData.name,
                species: petData.species,
                breed: petData.breed,
                birthDate: petData.birthDate,
                weight: petData.weight.toString(),
                registeredAge: Math.floor((new Date().getTime() - new Date(petData.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
                isActive: true
              });
              petsCreated++;
            } catch (error) {
              // Pet might already exist, continue
            }
          }
        } catch (error) {
          // Client might already exist, continue
        }
      }
    }
    console.log(`✅ Created/verified ${clientsCreated} clients and ${petsCreated} pets`);

    // 7. Generate appointments spanning from today to selected days ahead
    console.log(`📅 Generating realistic appointment data spanning ${days} days from today...`);
    let appointmentsCreated = 0;
    
    const startDate = new Date();
    // Start from yesterday to include some past appointments for realism
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days + 1); // +1 to include the final day
    
    for (const tenant of createdTenants) {
      const tenantServices = await storage.getServices(tenant.id);
      const tenantRooms = await storage.getRooms(tenant.id);  
      const tenantStaff = await storage.getStaff(tenant.id);
      const tenantClients = await storage.getClients(tenant.id);
      
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        // Generate 5-10 appointments per day per tenant
        const appointmentsPerDay = Math.floor(Math.random() * 6) + 5;
        
        for (let i = 0; i < appointmentsPerDay; i++) {
          // Random time between 8 AM and 5 PM
          const hour = Math.floor(Math.random() * 9) + 8; // 8-16
          const minute = Math.random() < 0.5 ? 0 : 30; // 0 or 30 minutes
          
          const dateStr = date.toISOString().split('T')[0];
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          
          // Convert to UTC for storage
          const { utcDate, utcTime } = convertUserDateTimeToUTC(dateStr, timeStr);
          
          if (tenantServices.length > 0 && tenantRooms.length > 0 && tenantStaff.length > 0 && tenantClients.length > 0) {
            const randomService = tenantServices[Math.floor(Math.random() * tenantServices.length)];
            const randomRoom = tenantRooms[Math.floor(Math.random() * tenantRooms.length)];
            const randomStaff = tenantStaff[Math.floor(Math.random() * tenantStaff.length)];
            const randomClient = tenantClients[Math.floor(Math.random() * tenantClients.length)];
            
            const clientPets = await storage.getPetsByClient(randomClient.id);
            if (clientPets.length > 0) {
              const randomPet = clientPets[Math.floor(Math.random() * clientPets.length)];
              
              // Determine status based on date
              let status = 'scheduled';
              const today = new Date();
              if (date < today) {
                const rand = Math.random();
                if (rand < 0.7) status = 'completed';
                else if (rand < 0.85) status = 'confirmed';
                else status = 'cancelled';
              } else if (date.toDateString() === today.toDateString()) {
                const rand = Math.random();
                if (rand < 0.3) status = 'in_progress';
                else if (rand < 0.7) status = 'confirmed';
                else status = 'scheduled';
              }
              
              try {
                await storage.createAppointment({
                  tenantId: tenant.id,
                  clientId: randomClient.id,
                  petId: randomPet.id,
                  staffId: randomStaff.id,
                  roomId: randomRoom.id,
                  serviceId: randomService.id,
                  scheduledDate: utcDate,
                  scheduledTime: utcTime,
                  duration: randomService.duration,
                  status: status,
                  type: randomService.type,
                  notes: `${randomService.name} para ${randomPet.name}`,
                  totalCost: parseInt(randomService.price),
                  paymentStatus: status === 'completed' ? 'paid' : 'pending'
                });
                appointmentsCreated++;
              } catch (error) {
                // Skip duplicate appointments (same time/room conflicts)
              }
            }
          }
        }
      }
    }
    
    console.log(`✅ Created ${appointmentsCreated} appointments`);
    console.log("🎉 Demo data seeding completed successfully!");
    
    return { success: true, message: `Demo data created successfully! Generated ${appointmentsCreated} appointments spanning ${days} days of realistic timeline data for ${createdTenants.length} tenants.` };
    
  } catch (error) {
    console.error("❌ Error seeding demo data:", error);
    throw error;
  }
}

// Removed the complex appointment generation function - now handled in main seedDemoData function

// Export function for API endpoint
export async function runDemoDataSeeder(days: number = 45) {
  try {
    const result = await seedDemoData(days);
    return result;
  } catch (error) {
    console.error("Demo data seeding failed:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}