import { db } from "./db";
import { medicalAppointments } from "@shared/schema";

const TENANT_ID = "vetgroom1";
const VETERINARIAN_ID = "vg1-staff-2"; // Dr. María González

// Use existing client IDs from the database
const EXISTING_CLIENTS = [
  "vg1-client-1", "vg1-client-2", "vg1-client-3", "vg1-client-4", "vg1-client-5",
  "d20d8d73-187c-4ad8-89d9-49e360e02701", "75af1621-185f-46c8-b3fb-e0348f2653ad",
  "ac82d099-c406-44b0-8570-44106ad036f2", "f3b3b422-2dd2-48e4-9e7d-455aa9ad1621",
  "f26d4202-13ec-4d54-8643-2e414644c4dd", "e4bfa787-a8aa-4844-a9ee-d931270fa126",
  "4e7006af-485f-4678-8957-79a94de36460", "130e59d5-4c4e-43df-8f69-4cc625d54866",
  "f768808d-3d08-459b-8799-384aa38e76f7", "cf7ff0fa-f8e7-4672-b058-83b2870bb88e"
];

// For pets, we'll use a simple pattern since we know pets exist for these clients
const getPetId = (clientIndex: number) => `pet-${clientIndex + 1}`;

export async function seedFollowUpWorking() {
  console.log("Seeding follow-up medical appointments with existing client data...");

  try {
    // Create follow-up appointments using existing clients
    const followUpAppointments = [
      {
        id: "med-apt-fu-001",
        tenantId: TENANT_ID,
        clientId: EXISTING_CLIENTS[0],
        petId: getPetId(0),
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
        id: "med-apt-fu-002",
        tenantId: TENANT_ID,
        clientId: EXISTING_CLIENTS[1],
        petId: getPetId(1),
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
        id: "med-apt-fu-003",
        tenantId: TENANT_ID,
        clientId: EXISTING_CLIENTS[2],
        petId: getPetId(2),
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
        id: "med-apt-fu-004",
        tenantId: TENANT_ID,
        clientId: EXISTING_CLIENTS[3],
        petId: getPetId(3),
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
        id: "med-apt-fu-005",
        tenantId: TENANT_ID,
        clientId: EXISTING_CLIENTS[4],
        petId: getPetId(4),
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
        id: "med-apt-fu-006",
        tenantId: TENANT_ID,
        clientId: EXISTING_CLIENTS[5],
        petId: getPetId(5),
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
        id: "med-apt-fu-007",
        tenantId: TENANT_ID,
        clientId: EXISTING_CLIENTS[6],
        petId: getPetId(6),
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
        id: "med-apt-fu-008",
        tenantId: TENANT_ID,
        clientId: EXISTING_CLIENTS[7],
        petId: getPetId(7),
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
        id: "med-apt-fu-009",
        tenantId: TENANT_ID,
        clientId: EXISTING_CLIENTS[8],
        petId: getPetId(8),
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
        id: "med-apt-fu-010",
        tenantId: TENANT_ID,
        clientId: EXISTING_CLIENTS[9],
        petId: getPetId(9),
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
        id: "med-apt-fu-011",
        tenantId: TENANT_ID,
        clientId: EXISTING_CLIENTS[10],
        petId: getPetId(10),
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
        id: "med-apt-fu-012",
        tenantId: TENANT_ID,
        clientId: EXISTING_CLIENTS[11],
        petId: getPetId(11),
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
        id: "med-apt-fu-013",
        tenantId: TENANT_ID,
        clientId: EXISTING_CLIENTS[12],
        petId: getPetId(12),
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
        id: "med-apt-fu-014",
        tenantId: TENANT_ID,
        clientId: EXISTING_CLIENTS[13],
        petId: getPetId(13),
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
        id: "med-apt-fu-015",
        tenantId: TENANT_ID,
        clientId: EXISTING_CLIENTS[14],
        petId: getPetId(14),
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

    let successCount = 0;
    let errorCount = 0;

    // Insert medical appointments one by one to handle foreign key errors gracefully
    for (const appointment of followUpAppointments) {
      try {
        await db.insert(medicalAppointments).values(appointment).onConflictDoNothing();
        successCount++;
      } catch (error) {
        console.warn(`⚠️  Skipped appointment ${appointment.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ Successfully seeded ${successCount} medical appointments with follow-up requirements`);
    if (errorCount > 0) {
      console.log(`⚠️  Skipped ${errorCount} appointments due to foreign key constraints`);
    }
    
    const now = new Date();
    const validAppointments = followUpAppointments.slice(0, successCount);
    const overdue = validAppointments.filter(apt => new Date(apt.followUpDate) < now).length;
    const today = validAppointments.filter(apt => {
      const followUpDate = new Date(apt.followUpDate);
      return followUpDate.toDateString() === now.toDateString();
    }).length;
    const future = validAppointments.filter(apt => new Date(apt.followUpDate) > now).length;

    console.log(`📊 Follow-up distribution:`);
    console.log(`   - Overdue: ${overdue} appointments`);
    console.log(`   - Today: ${today} appointments`);
    console.log(`   - Future: ${future} appointments`);
    console.log(`   - Total count for notification: ${overdue + today}`);

  } catch (error) {
    console.error("❌ Error seeding follow-up data:", error);
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFollowUpWorking().then(() => {
    console.log("Follow-up seeding completed");
    process.exit(0);
  }).catch((error) => {
    console.error("Follow-up seeding failed:", error);
    process.exit(1);
  });
}