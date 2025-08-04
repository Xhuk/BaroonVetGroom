import { db } from "./db";
import { medicalAppointments } from "@shared/schema";

const TENANT_ID = "vetgroom1";
const VETERINARIAN_ID = "vg1-staff-2"; // Dr. María González

export async function seedFollowUpFinal() {
  console.log("Seeding follow-up medical appointments...");

  try {
    // Create minimal medical appointments with follow-up requirements
    const followUpAppointments = [
      {
        id: "med-apt-fu-01",
        tenantId: TENANT_ID,
        clientId: "client-1",
        petId: "pet-1",
        veterinarianId: VETERINARIAN_ID,
        visitDate: new Date("2025-07-25"),
        visitType: "checkup",
        symptoms: ["Control post-cirugía"],
        diagnosis: "Recuperación satisfactoria",
        treatment: "Limpieza de herida",
        followUpRequired: true,
        followUpDate: new Date("2025-08-01"), // Overdue
        followUpInstructions: "Control de cicatrización",
        status: "completed"
      },
      {
        id: "med-apt-fu-02",
        tenantId: TENANT_ID,
        clientId: "client-2",
        petId: "pet-2",
        veterinarianId: VETERINARIAN_ID,
        visitDate: new Date("2025-07-30"),
        visitType: "vaccination",
        symptoms: ["Vacunación anual"],
        diagnosis: "Animal sano",
        treatment: "Vacuna quíntuple",
        followUpRequired: true,
        followUpDate: new Date("2025-08-03"), // Today
        followUpInstructions: "Verificar reacciones",
        status: "completed"
      },
      {
        id: "med-apt-fu-03",
        tenantId: TENANT_ID,
        clientId: "client-3",
        petId: "pet-3",
        veterinarianId: VETERINARIAN_ID,
        visitDate: new Date("2025-07-20"),
        visitType: "surgery",
        symptoms: ["Fractura de fémur"],
        diagnosis: "Fractura cerrada",
        treatment: "Osteosíntesis",
        followUpRequired: true,
        followUpDate: new Date("2025-08-02"), // Yesterday
        followUpInstructions: "Control radiográfico",
        status: "completed"
      },
      {
        id: "med-apt-fu-04",
        tenantId: TENANT_ID,
        clientId: "client-4",
        petId: "pet-4",
        veterinarianId: VETERINARIAN_ID,
        visitDate: new Date("2025-08-01"),
        visitType: "emergency",
        symptoms: ["Vómitos persistentes"],
        diagnosis: "Gastroenteritis aguda",
        treatment: "Suero intravenoso",
        followUpRequired: true,
        followUpDate: new Date("2025-08-05"), // Future
        followUpInstructions: "Evaluar tolerancia alimentaria",
        status: "completed"
      },
      {
        id: "med-apt-fu-05",
        tenantId: TENANT_ID,
        clientId: "client-5",
        petId: "pet-5",
        veterinarianId: VETERINARIAN_ID,
        visitDate: new Date("2025-07-22"),
        visitType: "dermatology",
        symptoms: ["Dermatitis alérgica"],
        diagnosis: "Dermatitis atópica",
        treatment: "Corticoides tópicos",
        followUpRequired: true,
        followUpDate: new Date("2025-07-30"), // Very overdue
        followUpInstructions: "Evaluar respuesta al tratamiento",
        status: "completed"
      },
      {
        id: "med-apt-fu-06",
        tenantId: TENANT_ID,
        clientId: "client-6",
        petId: "pet-6",
        veterinarianId: VETERINARIAN_ID,
        visitDate: new Date("2025-07-28"),
        visitType: "cardiology",
        symptoms: ["Soplo cardíaco"],
        diagnosis: "Insuficiencia mitral",
        treatment: "Enalapril, dieta",
        followUpRequired: true,
        followUpDate: new Date("2025-08-04"), // Tomorrow
        followUpInstructions: "Ecocardiograma de control",
        status: "completed"
      },
      {
        id: "med-apt-fu-07",
        tenantId: TENANT_ID,
        clientId: "client-7",
        petId: "pet-7",
        veterinarianId: VETERINARIAN_ID,
        visitDate: new Date("2025-08-02"),
        visitType: "oncology",
        symptoms: ["Masa abdominal"],
        diagnosis: "Tumor benigno",
        treatment: "Esplenectomía programada",
        followUpRequired: true,
        followUpDate: new Date("2025-08-06"), // Future
        followUpInstructions: "Pre-quirúrgico",
        status: "completed"
      },
      {
        id: "med-apt-fu-08",
        tenantId: TENANT_ID,
        clientId: "client-8",
        petId: "pet-8",
        veterinarianId: VETERINARIAN_ID,
        visitDate: new Date("2025-07-21"),
        visitType: "dental",
        symptoms: ["Halitosis"],
        diagnosis: "Enfermedad periodontal",
        treatment: "Limpieza dental",
        followUpRequired: true,
        followUpDate: new Date("2025-07-29"), // Very overdue
        followUpInstructions: "Control de cicatrización",
        status: "completed"
      },
      {
        id: "med-apt-fu-09",
        tenantId: TENANT_ID,
        clientId: "client-9",
        petId: "pet-9",
        veterinarianId: VETERINARIAN_ID,
        visitDate: new Date("2025-07-31"),
        visitType: "orthopedics",
        symptoms: ["Cojera persistente"],
        diagnosis: "Displasia de cadera",
        treatment: "Manejo conservador",
        followUpRequired: true,
        followUpDate: new Date("2025-08-07"), // Future
        followUpInstructions: "Evaluación de progreso",
        status: "completed"
      },
      {
        id: "med-apt-fu-10",
        tenantId: TENANT_ID,
        clientId: "client-10",
        petId: "pet-10",
        veterinarianId: VETERINARIAN_ID,
        visitDate: new Date("2025-07-26"),
        visitType: "nephrology",
        symptoms: ["Poliuria"],
        diagnosis: "Insuficiencia renal",
        treatment: "Dieta renal",
        followUpRequired: true,
        followUpDate: new Date("2025-08-01"), // Overdue
        followUpInstructions: "Control de función renal",
        status: "completed"
      },
      {
        id: "med-apt-fu-11",
        tenantId: TENANT_ID,
        clientId: "client-1",
        petId: "pet-1",
        veterinarianId: VETERINARIAN_ID,
        visitDate: new Date("2025-07-27"),
        visitType: "ophthalmology",
        symptoms: ["Conjuntivitis"],
        diagnosis: "Conjuntivitis bacteriana",
        treatment: "Antibióticos tópicos",
        followUpRequired: true,
        followUpDate: new Date("2025-07-31"), // Very overdue
        followUpInstructions: "Control de mejoría ocular",
        status: "completed"
      },
      {
        id: "med-apt-fu-12",
        tenantId: TENANT_ID,
        clientId: "client-2",
        petId: "pet-2",
        veterinarianId: VETERINARIAN_ID,
        visitDate: new Date("2025-07-24"),
        visitType: "neurology",
        symptoms: ["Convulsiones"],
        diagnosis: "Epilepsia idiopática",
        treatment: "Fenobarbital",
        followUpRequired: true,
        followUpDate: new Date("2025-08-02"), // Yesterday
        followUpInstructions: "Evaluación neurológica",
        status: "completed"
      },
      {
        id: "med-apt-fu-13",
        tenantId: TENANT_ID,
        clientId: "client-3",
        petId: "pet-3",
        veterinarianId: VETERINARIAN_ID,
        visitDate: new Date("2025-07-29"),
        visitType: "endocrinology",
        symptoms: ["Polidipsia"],
        diagnosis: "Diabetes mellitus",
        treatment: "Insulina",
        followUpRequired: true,
        followUpDate: new Date("2025-08-05"), // Future
        followUpInstructions: "Control glucémico",
        status: "completed"
      },
      {
        id: "med-apt-fu-14",
        tenantId: TENANT_ID,
        clientId: "client-4",
        petId: "pet-4",
        veterinarianId: VETERINARIAN_ID,
        visitDate: new Date("2025-07-23"),
        visitType: "respiratory",
        symptoms: ["Tos persistente"],
        diagnosis: "Bronquitis crónica",
        treatment: "Broncodilatadores",
        followUpRequired: true,
        followUpDate: new Date("2025-08-01"), // Overdue
        followUpInstructions: "Control respiratorio",
        status: "completed"
      },
      {
        id: "med-apt-fu-15",
        tenantId: TENANT_ID,
        clientId: "client-5",
        petId: "pet-5",
        veterinarianId: VETERINARIAN_ID,
        visitDate: new Date("2025-07-26"),
        visitType: "urology",
        symptoms: ["Disuria"],
        diagnosis: "Cistitis idiopática",
        treatment: "Antiinflamatorios",
        followUpRequired: true,
        followUpDate: new Date("2025-08-03"), // Today
        followUpInstructions: "Control urinario",
        status: "completed"
      }
    ];

    // Insert medical appointments
    for (const appointment of followUpAppointments) {
      await db.insert(medicalAppointments).values(appointment).onConflictDoNothing();
    }

    console.log(`✅ Successfully seeded ${followUpAppointments.length} medical appointments with follow-up requirements`);
    
    const now = new Date();
    const overdue = followUpAppointments.filter(apt => new Date(apt.followUpDate) < now).length;
    const today = followUpAppointments.filter(apt => {
      const followUpDate = new Date(apt.followUpDate);
      return followUpDate.toDateString() === now.toDateString();
    }).length;
    const future = followUpAppointments.filter(apt => new Date(apt.followUpDate) > now).length;

    console.log(`📊 Follow-up distribution:`);
    console.log(`   - Overdue: ${overdue} appointments`);
    console.log(`   - Today: ${today} appointments`);
    console.log(`   - Future: ${future} appointments`);
    console.log(`   - Total count should be: ${overdue + today}`);

  } catch (error) {
    console.error("❌ Error seeding follow-up data:", error);
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFollowUpFinal().then(() => {
    console.log("Follow-up seeding completed");
    process.exit(0);
  }).catch((error) => {
    console.error("Follow-up seeding failed:", error);
    process.exit(1);
  });
}