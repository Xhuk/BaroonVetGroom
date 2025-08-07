import { db } from "./storage.ts";
import { groomingRecords } from "../shared/schema.ts";
import { eq } from "drizzle-orm";

const minimalGroomingData = [
  {
    id: "groom-001",
    tenantId: "vetgroom1",
    petId: "vg1-pet-1", // Luna
    groomerId: "vg1-staff-4", 
    groomingDate: new Date("2024-12-20"),
    services: ["full_bath", "haircut", "nail_trimming", "ear_cleaning"],
    notes: "Muy tranquila durante el baño. Excelente comportamiento.",
    totalCost: "850.00"
  },
  {
    id: "groom-002",
    tenantId: "vetgroom1", 
    petId: "vg1-pet-2", // Max
    groomerId: "vg1-staff-4",
    groomingDate: new Date("2024-12-18"),
    services: ["full_bath", "brushing", "nail_trimming"],
    notes: "Un poco nervioso al principio, pero se calmó rápidamente.",
    totalCost: "650.00"
  },
  {
    id: "groom-003",
    tenantId: "vetgroom1",
    petId: "vg1-pet-3", // Mimi
    groomerId: "vg1-staff-4",
    groomingDate: new Date("2024-12-15"),
    services: ["full_bath", "haircut", "brushing"],
    notes: "Algo estresada, pero cooperativa. Transformación increíble.",
    totalCost: "950.00"
  },
  {
    id: "groom-004",
    tenantId: "vetgroom1",
    petId: "vg1-pet-4", // Whiskers
    groomerId: "vg1-staff-4",
    groomingDate: new Date("2024-12-22"),
    services: ["brushing", "nail_trimming", "ear_cleaning"],
    notes: "Muy calmado y cooperativo durante todo el proceso.",
    totalCost: "350.00"
  },
  {
    id: "groom-005",
    tenantId: "vetgroom1",
    petId: "vg1-pet-5", // Rocky
    groomerId: "vg1-staff-4",
    groomingDate: new Date("2024-12-19"),
    services: ["full_bath", "nail_trimming", "ear_cleaning"],
    notes: "Respiración pesada pero normal para la raza. Muy amigable.",
    totalCost: "550.00"
  }
];

export async function seedMinimalGroomingData() {
  console.log("Seeding minimal grooming records...");
  
  try {
    // Clear existing grooming records for this tenant
    await db.delete(groomingRecords).where(eq(groomingRecords.tenantId, "vetgroom1"));
    
    // Insert demo grooming records
    for (const record of minimalGroomingData) {
      await db.insert(groomingRecords).values(record);
    }
    
    console.log(`✓ Successfully seeded ${minimalGroomingData.length} grooming records`);
  } catch (error) {
    console.error("Error seeding grooming data:", error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedMinimalGroomingData()
    .then(() => {
      console.log("Grooming data seeding completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}