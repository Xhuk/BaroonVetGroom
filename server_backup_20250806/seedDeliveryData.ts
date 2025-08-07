import { db } from "./db";
import { appointments, clients, pets, services } from "@shared/schema";
import { nanoid } from "nanoid";

// Zona Cumbres neighborhoods and streets in Monterrey
const cumbresFraccionamientos = [
  "Cumbres 1er Sector",
  "Cumbres 2do Sector", 
  "Cumbres 3er Sector",
  "Cumbres 4to Sector",
  "Cumbres 5to Sector",
  "Cumbres Elite",
  "Cumbres Providencia",
  "Cumbres Madeira",
  "Cumbres San Agustín",
  "Cumbres Bosques",
  "Cumbres Mediterráneo",
  "Cumbres Cristal",
  "Cumbres Renacimiento",
  "Las Cumbres",
  "Portal de Cumbres",
  "Hacienda Cumbres",
];

const cumbresStreets = [
  "Avenida Paseo de los Leones",
  "Boulevard Díaz Ordaz",
  "Avenida Revolución",
  "Calle Sendero del Valle",
  "Avenida Paseo de la Reforma",
  "Calle Monte Líbano",
  "Avenida Aztlán",
  "Calle Sierra Madre",
  "Boulevard San Agustín",
  "Avenida Las Torres",
  "Calle Bosques del Valle",
  "Avenida Mediterráneo",
  "Calle Cristal",
  "Boulevard Cumbres",
  "Avenida Providencia",
  "Calle Madeira",
  "Sendero Elite",
  "Boulevard Renacimiento",
  "Avenida Portal",
  "Calle Hacienda Real",
];

// Pet names common in Mexico
const petNames = [
  "Luna", "Max", "Bella", "Rocky", "Mia", "Zeus", "Coco", "Princesa", "Toby", "Lola",
  "Bruno", "Nina", "Simón", "Canela", "Charlie", "Maya", "Rex", "Dulce", "Jack", "Sofía",
  "Thor", "Perla", "Oscar", "Ruby", "Sam", "Kira", "Leo", "Jade", "Dante", "Nala",
  "Pancho", "Frida", "Bobby", "Kiara", "Duke", "Zara", "Gus", "Chloe", "Bingo", "Moka",
];

// Common Mexican names
const clientNames = [
  "María González", "José Martínez", "Ana Rodríguez", "Carlos Hernández", "Lucia Pérez",
  "Miguel Sánchez", "Sofia Ramírez", "Diego Torres", "Isabel Flores", "Roberto Morales",
  "Carmen Jiménez", "Fernando Ruiz", "Adriana Castro", "Alejandro Vargas", "Daniela Ortiz",
  "Ricardo Delgado", "Paola Guerrero", "Javier Mendoza", "Valentina Aguilar", "Eduardo Medina",
  "Gabriela Contreras", "Andrés Herrera", "Camila Guzmán", "Sergio Reyes", "Mariana Romero",
  "Óscar Moreno", "Natalia Vega", "Rubén Castillo", "Fernanda Silva", "Antonio Ramos",
];

// Veterinary services
const vetServices = [
  { name: "Consulta General", type: "medical", duration: 30, price: 350 },
  { name: "Vacunación", type: "medical", duration: 15, price: 200 },
  { name: "Desparasitación", type: "medical", duration: 15, price: 150 },
  { name: "Baño y Corte", type: "grooming", duration: 60, price: 400 },
  { name: "Corte de Uñas", type: "grooming", duration: 15, price: 80 },
  { name: "Limpieza Dental", type: "medical", duration: 45, price: 600 },
  { name: "Cirugía Menor", type: "medical", duration: 90, price: 1200 },
  { name: "Radiografías", type: "medical", duration: 30, price: 500 },
  { name: "Análisis de Sangre", type: "medical", duration: 20, price: 300 },
  { name: "Spa Canino", type: "grooming", duration: 120, price: 800 },
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getRandomCoordinates(): { lat: number; lng: number } {
  // Zona Cumbres coordinates range
  const baseLat = 25.720;
  const baseLng = -100.350;
  const latRange = 0.040; // ~4.4km
  const lngRange = 0.050; // ~5.5km
  
  return {
    lat: baseLat + (Math.random() - 0.5) * latRange,
    lng: baseLng + (Math.random() - 0.5) * lngRange,
  };
}

function generateAddress(): string {
  const street = getRandomElement(cumbresStreets);
  const number = Math.floor(Math.random() * 9999) + 1;
  const fraccionamiento = getRandomElement(cumbresFraccionamientos);
  return `${street} ${number}, ${fraccionamiento}, Monterrey, N.L.`;
}

function generatePhoneNumber(): string {
  // Mexican mobile format: +52 81 xxxx xxxx
  const prefix = "81";
  const number = Math.floor(Math.random() * 90000000) + 10000000;
  return `+52 ${prefix} ${number.toString().substring(0, 4)} ${number.toString().substring(4)}`;
}

export async function seedDeliveryData() {
  console.log("Starting delivery planning seed data for Zona Cumbres...");
  
  const tenantId = "vetgroom1";
  
  try {
    // Create services first
    const serviceIds: string[] = [];
    for (const service of vetServices) {
      const [newService] = await db.insert(services).values({
        tenantId,
        name: service.name,
        type: service.type as "medical" | "grooming",
        duration: service.duration.toString(),
        price: service.price.toString(),
        description: `Servicio de ${service.name.toLowerCase()} para mascotas`,
      }).returning();
      
      if (newService) {
        serviceIds.push(newService.id);
      }
    }

    // Create clients and pets
    const clientIds: string[] = [];
    const petIds: string[] = [];
    
    for (let i = 0; i < 50; i++) {
      const coords = getRandomCoordinates();
      
      const [newClient] = await db.insert(clients).values({
        tenantId,
        name: getRandomElement(clientNames),
        email: `cliente${i + 1}@email.com`,
        phone: generatePhoneNumber(),
        address: generateAddress(),
        latitude: coords.lat.toString(),
        longitude: coords.lng.toString(),
        fraccionamiento: getRandomElement(cumbresFraccionamientos),
      }).returning();
      
      if (newClient) {
        clientIds.push(newClient.id);

        // Create 1-3 pets per client
        const numPets = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < numPets; j++) {
          const species = Math.random() > 0.3 ? "dog" : "cat";
          
          const [newPet] = await db.insert(pets).values({
            tenantId,
            clientId: newClient.id,
            name: getRandomElement(petNames),
            species,
            breed: species === "dog" 
              ? getRandomElement(["Labrador", "Chihuahua", "Golden Retriever", "Bulldog", "Pastor Alemán", "Poodle", "Schnauzer"])
              : getRandomElement(["Siamés", "Persa", "Maine Coon", "Angora", "Bengalí", "Común Europeo"]),
            age: Math.floor(Math.random() * 15) + 1,
            weight: (species === "dog" 
              ? Math.floor(Math.random() * 40) + 5 
              : Math.floor(Math.random() * 8) + 2).toString(),
            color: getRandomElement(["Café", "Negro", "Blanco", "Gris", "Dorado", "Manchado", "Tricolor"]),
            medicalHistory: "Historial médico básico",
          }).returning();
          
          if (newPet) {
            petIds.push(newPet.id);
          }
        }
      }
    }

    // Create appointments for delivery routes
    const appointmentIds: string[] = [];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30); // Next 30 days

    for (let i = 0; i < 120; i++) {
      const clientId = getRandomElement(clientIds);
      const petId = getRandomElement(petIds);
      const serviceId = getRandomElement(serviceIds);
      const scheduledDate = getRandomDate(startDate, endDate);
      
      // 60% pickup services, 40% drop-off
      const logistics = Math.random() > 0.4 ? "pickup" : "clinic";
      const status = Math.random() > 0.8 ? "completed" : 
                   Math.random() > 0.6 ? "scheduled" : "in_progress";

      const [newAppointment] = await db.insert(appointments).values({
        tenantId,
        clientId,
        petId,
        serviceId,
        scheduledDate: scheduledDate.toISOString().split('T')[0],
        scheduledTime: `${Math.floor(Math.random() * 12) + 8}:${Math.random() > 0.5 ? '00' : '30'}`,
        duration: getRandomElement([30, 45, 60, 90]),
        totalCost: (Math.floor(Math.random() * 800) + 200).toString(),
        status,
        logistics,
        type: Math.random() > 0.6 ? "medical" : "grooming",
        notes: `Cita de ${logistics === "pickup" ? "recogida" : "clínica"} - ${getRandomElement(cumbresFraccionamientos)}`,
      }).returning();
      
      if (newAppointment) {
        appointmentIds.push(newAppointment.id);
      }
    }

    console.log(`✅ Successfully seeded delivery planning data:`);
    console.log(`   - ${vetServices.length} veterinary services`);
    console.log(`   - 50 clients with realistic Zona Cumbres addresses`);
    console.log(`   - ~100 pets with Mexican names`);
    console.log(`   - 120 appointments with pickup/delivery logistics`);
    console.log(`   - All data localized for Monterrey, Zona Cumbres`);

  } catch (error) {
    console.error("❌ Error seeding delivery data:", error);
    throw error;
  }
}