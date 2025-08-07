import { db } from "./db";
import { 
  medicalAppointments, 
  medicalRecords, 
  clients, 
  pets,
  prescriptions
} from "@shared/schema";

const TENANT_ID = "vetgroom1";

export async function seedFollowUpData() {
  console.log("Seeding follow-up sample data...");

  try {
    // Create sample medical appointments with follow-up requirements
    const followUpAppointments = [
      {
        id: "med-apt-1",
        tenantId: TENANT_ID,
        clientId: "client-1",
        petId: "pet-1",
        visitType: "checkup",
        visitDate: new Date("2025-07-25"),
        veterinarianId: "staff-vet-1",
        symptoms: ["Control post-cirugía"],
        diagnosis: "Recuperación satisfactoria post-esterilización",
        treatment: "Limpieza de herida, antibióticos",
        medicines: { prescriptions: "Amoxicilina 250mg cada 8 horas por 7 días" },
        notes: "Revisar cicatrización en 5 días",
        followUpRequired: true,
        followUpDate: new Date("2025-08-01"), // Overdue
        followUpInstructions: "Control de cicatrización post-quirúrgica",
        status: "completed"
      },
      {
        id: "med-apt-2",
        tenantId: TENANT_ID,
        clientId: "client-2", 
        petId: "pet-2",
        visitType: "vaccination",
        visitDate: new Date("2025-07-30"),
        veterinarianId: "staff-vet-1",
        symptoms: ["Vacunación anual"],
        diagnosis: "Animal sano para vacunación",
        treatment: "Vacuna quíntuple + antirrábica",
        medicines: { prescriptions: "Ninguna" },
        notes: "Próxima vacunación en 1 año",
        followUpRequired: true,
        followUpDate: new Date("2025-08-03"), // Today
        followUpInstructions: "Verificar reacciones post-vacunación",
        status: "completed"
      },
      {
        id: "med-apt-3",
        tenantId: TENANT_ID,
        clientId: "client-3",
        petId: "pet-3", 
        type: "surgery",
        symptoms: "Fractura de fémur",
        diagnosis: "Fractura cerrada de fémur derecho",
        treatment: "Osteosíntesis con placa y tornillos",
        prescriptions: "Tramadol 2mg/kg cada 8 horas, Meloxicam 0.1mg/kg cada 24 horas",
        notes: "Reposo absoluto por 6 semanas",
        followUpRequired: true,
        followUpDate: new Date("2025-08-02"), // Yesterday
        followUpNotes: "Control radiográfico de consolidación",
        appointmentDate: new Date("2025-07-20"),
        status: "completed"
      },
      {
        id: "med-apt-4",
        tenantId: TENANT_ID,
        clientId: "client-4",
        petId: "pet-4",
        type: "emergency",
        symptoms: "Vómitos y diarrea persistente",
        diagnosis: "Gastroenteritis aguda",
        treatment: "Suero intravenoso, antieméticos",
        prescriptions: "Omeprazol 1mg/kg cada 12 horas, dieta blanda",
        notes: "Mejoría notable, continuar tratamiento",
        followUpRequired: true,
        followUpDate: new Date("2025-08-05"), // Future
        followUpNotes: "Evaluar tolerancia alimentaria",
        appointmentDate: new Date("2025-08-01"),
        status: "completed"
      },
      {
        id: "med-apt-5",
        tenantId: TENANT_ID,
        clientId: "client-5",
        petId: "pet-5",
        type: "dermatology",
        symptoms: "Dermatitis alérgica severa",
        diagnosis: "Dermatitis atópica",
        treatment: "Corticoides tópicos, champú medicado",
        prescriptions: "Prednisolona 1mg/kg cada 24 horas por 5 días",
        notes: "Evitar alérgenos identificados",
        followUpRequired: true,
        followUpDate: new Date("2025-07-30"), // Very overdue
        followUpNotes: "Evaluar respuesta al tratamiento",
        appointmentDate: new Date("2025-07-22"),
        status: "completed"
      },
      {
        id: "med-apt-6",
        tenantId: TENANT_ID,
        clientId: "client-6",
        petId: "pet-6",
        type: "cardiology",
        symptoms: "Soplo cardíaco detectado",
        diagnosis: "Insuficiencia mitral grado II",
        treatment: "Enalapril, dieta hiposódica",
        prescriptions: "Enalapril 0.5mg/kg cada 12 horas",
        notes: "Control ecocardiográfico necesario",
        followUpRequired: true,
        followUpDate: new Date("2025-08-04"), // Tomorrow
        followUpNotes: "Ecocardiograma de control",
        appointmentDate: new Date("2025-07-28"),
        status: "completed"
      },
      {
        id: "med-apt-7",
        tenantId: TENANT_ID,
        clientId: "client-7",
        petId: "pet-7",
        type: "oncology",
        symptoms: "Masa abdominal palpable",
        diagnosis: "Tumor benigno de bazo",
        treatment: "Esplenectomía programada",
        prescriptions: "Pre-quirúrgico: ayuno 12 horas",
        notes: "Cirugía programada para la próxima semana",
        followUpRequired: true,
        followUpDate: new Date("2025-08-06"), // Future
        followUpNotes: "Pre-quirúrgico y consentimiento",
        appointmentDate: new Date("2025-08-02"),
        status: "completed"
      },
      {
        id: "med-apt-8",
        tenantId: TENANT_ID,
        clientId: "client-8",
        petId: "pet-8",
        type: "dental",
        symptoms: "Halitosis y dolor al masticar",
        diagnosis: "Enfermedad periodontal grado III",
        treatment: "Limpieza dental bajo anestesia",
        prescriptions: "Antibióticos post-procedimiento",
        notes: "Extracciones múltiples realizadas",
        followUpRequired: true,
        followUpDate: new Date("2025-07-29"), // Very overdue  
        followUpNotes: "Control de cicatrización gingival",
        appointmentDate: new Date("2025-07-21"),
        status: "completed"
      },
      {
        id: "med-apt-9",
        tenantId: TENANT_ID,
        clientId: "client-9",
        petId: "pet-9",
        type: "orthopedics",
        symptoms: "Cojera persistente",
        diagnosis: "Displasia de cadera bilateral",
        treatment: "Manejo conservador, fisioterapia",
        prescriptions: "Condroprotectores, analgésicos",
        notes: "Valorar cirugía si no mejora",
        followUpRequired: true,
        followUpDate: new Date("2025-08-07"), // Future
        followUpNotes: "Evaluación de progreso",
        appointmentDate: new Date("2025-07-31"),
        status: "completed"
      },
      {
        id: "med-apt-10",
        tenantId: TENANT_ID,
        clientId: "client-10",
        petId: "pet-10",
        type: "nephrology",
        symptoms: "Poliuria y polidipsia",
        diagnosis: "Insuficiencia renal crónica",
        treatment: "Dieta renal, fluidoterapia",
        prescriptions: "Dieta k/d, suplementos",
        notes: "Monitoreo de función renal",
        followUpRequired: true,
        followUpDate: new Date("2025-08-01"), // Overdue
        followUpNotes: "Control de creatinina y BUN",
        appointmentDate: new Date("2025-07-26"),
        status: "completed"
      }
    ];

    // Insert medical appointments
    for (const appointment of followUpAppointments) {
      await db.insert(medicalAppointments).values(appointment).onConflictDoNothing();
    }

    console.log(`✅ Successfully seeded ${followUpAppointments.length} medical appointments with follow-up requirements`);
    console.log(`📊 Follow-up dates distribution:`);
    
    const now = new Date();
    const overdue = followUpAppointments.filter(apt => new Date(apt.followUpDate) < now).length;
    const today = followUpAppointments.filter(apt => {
      const followUpDate = new Date(apt.followUpDate);
      return followUpDate.toDateString() === now.toDateString();
    }).length;
    const future = followUpAppointments.filter(apt => new Date(apt.followUpDate) > now).length;

    console.log(`   - Overdue: ${overdue} appointments`);
    console.log(`   - Today: ${today} appointments`);
    console.log(`   - Future: ${future} appointments`);

  } catch (error) {
    console.error("❌ Error seeding follow-up data:", error);
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFollowUpData().then(() => {
    console.log("Follow-up seeding completed");
    process.exit(0);
  }).catch((error) => {
    console.error("Follow-up seeding failed:", error);
    process.exit(1);
  });
}