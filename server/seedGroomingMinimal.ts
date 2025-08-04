import { db } from "./db";
import { groomingRecords } from "@shared/schema";
import { eq } from "drizzle-orm";

const minimalGroomingData = [
  {
    id: "groom-001",
    tenantId: "vetgroom1",
    petId: "vg1-pet-1", // Firulais
    groomerId: "vg1-staff-4", 
    groomingDate: new Date("2024-12-20"),
    services: ["full_bath", "haircut", "nail_trimming", "ear_cleaning"],
    notes: "Muy tranquilo durante el baño. Excelente comportamiento.",
    totalCost: 850,
    nextAppointmentRecommended: true,
    nextAppointmentDate: new Date("2025-02-20")
  },
  {
    id: "groom-002",
    tenantId: "vetgroom1", 
    petId: "vg1-pet-2", // Whiskers
    groomerId: "vg1-staff-4",
    groomingDate: new Date("2024-12-18"),
    services: ["full_bath", "brushing", "nail_trimming"],
    notes: "Un poco nervioso al principio, pero se calmó rápidamente.",
    totalCost: 650,
    nextAppointmentRecommended: true,
    nextAppointmentDate: new Date("2025-03-18")
  },
  {
    id: "groom-003",
    tenantId: "vetgroom1",
    petId: "vg1-pet-3", // Bobby
    groomerId: "vg1-staff-4",
    groomingDate: new Date("2024-12-15"),
    services: ["full_bath", "haircut", "brushing"],
    notes: "Algo estresado, pero cooperativo. Transformación increíble.",
    totalCost: 950,
    nextAppointmentRecommended: true,
    nextAppointmentDate: new Date("2025-01-15")
  },
  {
    id: "groom-004",
    tenantId: "vetgroom1",
    petId: "vg1-pet-4", // Princess
    groomerId: "vg1-staff-4",
    groomingDate: new Date("2024-12-22"),
    services: ["brushing", "nail_trimming", "ear_cleaning"],
    notes: "Muy calmada y cooperativa durante todo el proceso.",
    totalCost: 350,
    nextAppointmentRecommended: true,
    nextAppointmentDate: new Date("2025-02-22")
  },
  {
    id: "groom-005",
    tenantId: "vetgroom1",
    petId: "vg1-pet-1", // Firulais
    groomerId: "vg1-staff-5",
    groomingDate: new Date("2024-12-19"),
    services: ["full_bath", "nail_trimming", "ear_cleaning"],
    notes: "Respiración pesada pero normal. Muy amigable.",
    totalCost: 550,
    nextAppointmentRecommended: true,
    nextAppointmentDate: new Date("2025-01-19")
  },
  {
    id: "groom-006",
    tenantId: "vetgroom1",
    petId: "vg1-pet-2", // Whiskers
    groomerId: "vg1-staff-5",
    groomingDate: new Date("2024-12-21"),
    services: ["full_bath", "haircut", "nail_trimming", "ear_cleaning"],
    notes: "Perfectamente acostumbrado al grooming. Muy colaborador.",
    totalCost: 780,
    nextAppointmentRecommended: true,
    nextAppointmentDate: new Date("2025-02-21")
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