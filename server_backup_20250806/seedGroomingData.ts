import { db } from "./db";
import { groomingRecords } from "@shared/schema";
import { eq } from "drizzle-orm";

const groomingDemoData = [
  {
    id: "groom-001",
    tenantId: "vetgroom1",
    petId: "vg1-pet-1", // Luna (Golden Retriever)
    groomerId: "vg1-staff-4", // Dr. Ana García
    groomingDate: new Date("2024-12-20"),
    services: ["full_bath", "haircut", "nail_trimming", "ear_cleaning"],
    notes: "Muy tranquila durante el baño. Le encanta que le cepillen el pelo. Usar champú hipoalergénico. Corte estilo teddy bear. Excelente comportamiento. Cliente muy satisfecho con el resultado.",
    totalCost: 850,
    nextAppointmentRecommended: true,
    nextAppointmentDate: new Date("2025-02-20")
  },
  {
    id: "groom-002", 
    tenantId: "vetgroom1",
    petId: "vg1-pet-2", // Max (Pastor Alemán)
    groomerId: "vg1-staff-4",
    groomingDate: new Date("2024-12-18"),
    services: ["full_bath", "brushing", "nail_trimming", "anal_glands"],
    behaviorNotes: "Un poco nervioso al principio, pero se calmó rápidamente.",
    specialInstructions: "Cepillado intensivo para pelaje doble. Cuidado con las patas traseras.",
    duration: 75,
    totalCost: 650,
    clientSatisfaction: 4,
    notes: "Pelaje muy denso requirió tiempo extra de cepillado.",
    nextGroomingDate: new Date("2025-03-18"),
    createdAt: new Date("2024-12-18"),
    updatedAt: new Date("2024-12-18")
  },
  {
    id: "groom-003",
    tenantId: "vetgroom1", 
    petId: "vg1-pet-3", // Mimi (Persa)
    groomerId: "vg1-staff-4",
    groomingDate: new Date("2024-12-15"),
    services: ["full_bath", "haircut", "brushing", "eye_cleaning"],
    behaviorNotes: "Algo estresada, pero cooperativa. Necesita descansos frecuentes.",
    specialInstructions: "Corte higiénico. Cuidado especial con nudos en el pelaje.",
    duration: 120,
    totalCost: 950,
    clientSatisfaction: 5,
    notes: "Transformación increíble. Pelaje completamente desenredado.",
    nextGroomingDate: new Date("2025-01-15"),
    createdAt: new Date("2024-12-15"),
    updatedAt: new Date("2024-12-15")
  },
  {
    id: "groom-004",
    tenantId: "vetgroom1",
    petId: "vg1-pet-4", // Whiskers (Maine Coon)
    groomerId: "vg1-staff-4",
    groomingDate: new Date("2024-12-22"),
    services: ["brushing", "nail_trimming", "ear_cleaning"], 
    behaviorNotes: "Muy calmado y cooperativo durante todo el proceso.",
    specialInstructions: "Solo mantenimiento. Cliente prefiere baños en casa.",
    duration: 45,
    totalCost: 350,
    clientSatisfaction: 4,
    notes: "Servicio de mantenimiento rutinario. Gato muy bien cuidado.",
    nextGroomingDate: new Date("2025-02-22"),
    createdAt: new Date("2024-12-22"),
    updatedAt: new Date("2024-12-22")
  },
  {
    id: "groom-005",
    tenantId: "vetgroom1",
    petId: "vg1-pet-5", // Rocky (Bulldog Francés)
    groomerId: "vg1-staff-4",
    groomingDate: new Date("2024-12-19"),
    services: ["full_bath", "nail_trimming", "ear_cleaning", "facial_cleaning"],
    behaviorNotes: "Respiración pesada pero normal para la raza. Muy amigable.",
    specialInstructions: "Champú para piel sensible. Secar bien los pliegues faciales.",
    duration: 60,
    totalCost: 550,
    clientSatisfaction: 5,
    notes: "Cuidado especial en pliegues. Excelente resultado final.",
    nextGroomingDate: new Date("2025-01-19"),
    createdAt: new Date("2024-12-19"),
    updatedAt: new Date("2024-12-19")
  },
  {
    id: "groom-006",
    tenantId: "vetgroom1",
    petId: "vg1-pet-6", // Bella (Caniche)
    groomerId: "vg1-staff-4",
    groomingDate: new Date("2024-12-21"),
    services: ["full_bath", "haircut", "nail_trimming", "ear_cleaning", "paw_care"],
    behaviorNotes: "Perfectamente acostumbrada al grooming. Muy colaboradora.",
    specialInstructions: "Corte continental clásico. Mantener pompones en patas.",
    duration: 105,
    totalCost: 780,
    clientSatisfaction: 5,
    notes: "Corte de exhibición perfectamente ejecutado. Cliente encantado.",
    nextGroomingDate: new Date("2025-02-21"),
    createdAt: new Date("2024-12-21"),
    updatedAt: new Date("2024-12-21")
  },
  {
    id: "groom-007",
    tenantId: "vetgroom1",
    petId: "vg1-pet-7", // Charlie (Beagle)
    groomerId: "vg1-staff-4",
    groomingDate: new Date("2024-12-17"),
    services: ["full_bath", "brushing", "nail_trimming"],
    behaviorNotes: "Muy enérgico pero obediente. Le gusta el agua.",
    specialInstructions: "Baño con champú desodorante. Cepillado suave.",
    duration: 50,
    totalCost: 450,
    clientSatisfaction: 4,
    notes: "Pelaje corto fácil de mantener. Perro muy sano.",
    nextGroomingDate: new Date("2025-03-17"),
    createdAt: new Date("2024-12-17"),
    updatedAt: new Date("2024-12-17")
  },
  {
    id: "groom-008",
    tenantId: "vetgroom1",
    petId: "vg1-pet-8", // Shadow (Siamés)
    groomerId: "vg1-staff-4",
    groomingDate: new Date("2024-12-16"),
    services: ["brushing", "nail_trimming", "ear_cleaning"],
    behaviorNotes: "Inicialmente reacio pero se acostumbró rápidamente.",
    specialInstructions: "Gato de pelo corto, solo mantenimiento básico.",
    duration: 30,
    totalCost: 250,
    clientSatisfaction: 4,
    notes: "Mantenimiento preventivo. Gato en excelente condición.",
    nextGroomingDate: new Date("2025-03-16"),
    createdAt: new Date("2024-12-16"),
    updatedAt: new Date("2024-12-16")
  }
];

export async function seedGroomingData() {
  console.log("Seeding grooming records...");
  
  try {
    // Clear existing grooming records for this tenant
    await db.delete(groomingRecords).where(eq(groomingRecords.tenantId, "vetgroom1"));
    
    // Insert demo grooming records
    for (const record of groomingDemoData) {
      await db.insert(groomingRecords).values(record);
    }
    
    console.log(`✓ Successfully seeded ${groomingDemoData.length} grooming records`);
  } catch (error) {
    console.error("Error seeding grooming data:", error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedGroomingData()
    .then(() => {
      console.log("Grooming data seeding completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}