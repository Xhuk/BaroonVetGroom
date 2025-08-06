import { storage } from "./storage";
import { nanoid } from "nanoid";

interface AppointmentSeed {
  clientName: string;
  petName: string;
  petBreed: string;
  address: string;
  fraccionamiento: string;
  phone: string;
  services: string[];
  totalAmount: number;
  time: string;
}

// Generate 30 realistic grooming appointments for today
const appointmentSeeds: AppointmentSeed[] = [
  // Villa del Real (Weight: 9.2)
  { clientName: "María González", petName: "Luna", petBreed: "Golden Retriever", address: "Calle Jazmín 234, Villa del Real", fraccionamiento: "Villa del Real", phone: "+52 667 123 4567", services: ["Baño y corte", "Corte de uñas"], totalAmount: 450, time: "09:00" },
  { clientName: "Carlos Ruiz", petName: "Max", petBreed: "Pastor Alemán", address: "Blvd. Villa del Real 567, Villa del Real", fraccionamiento: "Villa del Real", phone: "+52 667 234 5678", services: ["Baño completo", "Desenredado"], totalAmount: 380, time: "09:30" },
  { clientName: "Ana López", petName: "Bella", petBreed: "Labrador", address: "Privada Los Cedros 123, Villa del Real", fraccionamiento: "Villa del Real", phone: "+52 667 345 6789", services: ["Baño y corte", "Limpieza de oídos"], totalAmount: 420, time: "10:00" },
  
  // Las Quintas (Weight: 8.8)
  { clientName: "Pedro Sánchez", petName: "Rocky", petBreed: "Bulldog Francés", address: "Av. Las Quintas 890, Las Quintas", fraccionamiento: "Las Quintas", phone: "+52 667 456 7890", services: ["Baño especializado", "Corte de uñas"], totalAmount: 350, time: "10:30" },
  { clientName: "Luis Morales", petName: "Coco", petBreed: "Poodle", address: "Calle Primavera 456, Las Quintas", fraccionamiento: "Las Quintas", phone: "+52 667 567 8901", services: ["Baño y corte", "Pedicure"], totalAmount: 400, time: "11:00" },
  { clientName: "Jessica Torres", petName: "Princesa", petBreed: "Shih Tzu", address: "Priv. Las Flores 789, Las Quintas", fraccionamiento: "Las Quintas", phone: "+52 667 678 9012", services: ["Baño de lujo", "Corte estilizado"], totalAmount: 480, time: "11:30" },
  
  // Chapultepec (Weight: 8.5)
  { clientName: "Roberto Díaz", petName: "Zeus", petBreed: "Rottweiler", address: "Blvd. Chapultepec 321, Chapultepec", fraccionamiento: "Chapultepec", phone: "+52 667 789 0123", services: ["Baño completo", "Desenredado"], totalAmount: 360, time: "12:00" },
  { clientName: "Carmen Flores", petName: "Mia", petBreed: "Yorkshire", address: "Calle Insurgentes 654, Chapultepec", fraccionamiento: "Chapultepec", phone: "+52 667 890 1234", services: ["Baño y corte", "Limpieza dental"], totalAmount: 390, time: "12:30" },
  { clientName: "Miguel Herrera", petName: "Toby", petBreed: "Beagle", address: "Av. Revolución 987, Chapultepec", fraccionamiento: "Chapultepec", phone: "+52 667 901 2345", services: ["Baño básico", "Corte de uñas"], totalAmount: 320, time: "13:00" },
  
  // Stanza Toscana (Weight: 8.0)
  { clientName: "Patricia Vega", petName: "Simba", petBreed: "Husky Siberiano", address: "Residencial Toscana 147, Stanza Toscana", fraccionamiento: "Stanza Toscana", phone: "+52 667 012 3456", services: ["Baño desenredante", "Corte estacional"], totalAmount: 520, time: "13:30" },
  { clientName: "Ricardo Mendoza", petName: "Lola", petBreed: "Chihuahua", address: "Priv. Toscana 258, Stanza Toscana", fraccionamiento: "Stanza Toscana", phone: "+52 667 123 4567", services: ["Baño suave", "Pedicure"], totalAmount: 280, time: "14:00" },
  { clientName: "Sofía Castro", petName: "Bruno", petBreed: "Boxer", address: "Calle Florencia 369, Stanza Toscana", fraccionamiento: "Stanza Toscana", phone: "+52 667 234 5678", services: ["Baño y corte", "Limpieza de oídos"], totalAmount: 410, time: "14:30" },
  
  // Villa Fontana (Weight: 7.5)
  { clientName: "Alejandro Ramos", petName: "Kira", petBreed: "Pastor Belga", address: "Av. Fontana 741, Villa Fontana", fraccionamiento: "Villa Fontana", phone: "+52 667 345 6789", services: ["Baño completo", "Desenredado profundo"], totalAmount: 450, time: "15:00" },
  { clientName: "Claudia Jiménez", petName: "Nala", petBreed: "Cocker Spaniel", address: "Blvd. Los Álamos 852, Villa Fontana", fraccionamiento: "Villa Fontana", phone: "+52 667 456 7890", services: ["Baño de lujo", "Corte profesional"], totalAmount: 480, time: "15:30" },
  { clientName: "Fernando Silva", petName: "Rambo", petBreed: "Doberman", address: "Calle Las Palmas 963, Villa Fontana", fraccionamiento: "Villa Fontana", phone: "+52 667 567 8901", services: ["Baño básico", "Corte de uñas"], totalAmount: 340, time: "16:00" },
  
  // Los Pinos (Weight: 7.0)
  { clientName: "Gabriela Rojas", petName: "Maya", petBreed: "Border Collie", address: "Priv. Los Pinos 159, Los Pinos", fraccionamiento: "Los Pinos", phone: "+52 667 678 9012", services: ["Baño y corte", "Limpieza dental"], totalAmount: 420, time: "16:30" },
  { clientName: "David Ortega", petName: "Rex", petBreed: "German Shorthaired", address: "Calle Cedro 357, Los Pinos", fraccionamiento: "Los Pinos", phone: "+52 667 789 0123", services: ["Baño desenredante", "Pedicure"], totalAmount: 380, time: "17:00" },
  { clientName: "Mónica Vargas", petName: "Canela", petBreed: "Maltés", address: "Av. Los Pinos 468, Los Pinos", fraccionamiento: "Los Pinos", phone: "+52 667 890 1234", services: ["Baño suave", "Corte estilizado"], totalAmount: 350, time: "17:30" },
  
  // Tres Ríos (Weight: 6.8)
  { clientName: "Javier Cruz", petName: "Duque", petBreed: "San Bernardo", address: "Blvd. Tres Ríos 789, Tres Ríos", fraccionamiento: "Tres Ríos", phone: "+52 667 901 2345", services: ["Baño extra grande", "Desenredado"], totalAmount: 580, time: "18:00" },
  { clientName: "Adriana Peña", petName: "Chispa", petBreed: "Jack Russell", address: "Calle del Río 246, Tres Ríos", fraccionamiento: "Tres Ríos", phone: "+52 667 012 3456", services: ["Baño básico", "Corte de uñas"], totalAmount: 300, time: "18:30" },
  { clientName: "Arturo Montes", petName: "Oso", petBreed: "Mastín", address: "Priv. Río Grande 135, Tres Ríos", fraccionamiento: "Tres Ríos", phone: "+52 667 123 4567", services: ["Baño completo", "Limpieza de oídos"], totalAmount: 520, time: "19:00" },
  
  // Real del Country (Weight: 6.5)
  { clientName: "Valeria Guerrero", petName: "Chloe", petBreed: "Cavalier King Charles", address: "Country Club 357, Real del Country", fraccionamiento: "Real del Country", phone: "+52 667 234 5678", services: ["Baño de lujo", "Corte profesional"], totalAmount: 460, time: "08:30" },
  { clientName: "Sergio León", petName: "Thor", petBreed: "American Bully", address: "Av. Country 468, Real del Country", fraccionamiento: "Real del Country", phone: "+52 667 345 6789", services: ["Baño especializado", "Pedicure"], totalAmount: 420, time: "09:30" },
  { clientName: "Elena Martín", petName: "Luna", petBreed: "Schnauzer", address: "Calle Golf 579, Real del Country", fraccionamiento: "Real del Country", phone: "+52 667 456 7890", services: ["Baño y corte", "Limpieza dental"], totalAmount: 390, time: "10:30" },
  
  // Montecarlo (Weight: 6.0)
  { clientName: "Hugo Delgado", petName: "Dante", petBreed: "Pitbull", address: "Residencial Montecarlo 147, Montecarlo", fraccionamiento: "Montecarlo", phone: "+52 667 567 8901", services: ["Baño básico", "Corte de uñas"], totalAmount: 320, time: "11:30" },
  { clientName: "Isabel Campos", petName: "Estrella", petBreed: "Spaniel Bretón", address: "Blvd. Montecarlo 258, Montecarlo", fraccionamiento: "Montecarlo", phone: "+52 667 678 9012", services: ["Baño completo", "Desenredado"], totalAmount: 380, time: "12:30" },
  { clientName: "Rodrigo Santos", petName: "Pelusa", petBreed: "Bichón Frisé", address: "Priv. Casino 369, Montecarlo", fraccionamiento: "Montecarlo", phone: "+52 667 789 0123", services: ["Baño de lujo", "Corte estilizado"], totalAmount: 440, time: "13:30" },
  
  // Additional appointments to reach 30
  { clientName: "Alejandra Robles", petName: "Coco", petBreed: "Akita", address: "Calle Jazmín 789, Villa del Real", fraccionamiento: "Villa del Real", phone: "+52 667 890 1234", services: ["Baño completo", "Corte de uñas"], totalAmount: 420, time: "14:30" },
  { clientName: "Manuel Torres", petName: "Pancho", petBreed: "Chihuahua Mix", address: "Av. Las Quintas 321, Las Quintas", fraccionamiento: "Las Quintas", phone: "+52 667 901 2345", services: ["Baño suave", "Pedicure"], totalAmount: 290, time: "15:30" },
  { clientName: "Rosa Herrera", petName: "Negra", petBreed: "Labrador Mix", address: "Calle Insurgentes 987, Chapultepec", fraccionamiento: "Chapultepec", phone: "+52 667 012 3456", services: ["Baño y corte", "Limpieza de oídos"], totalAmount: 380, time: "16:30" },
  { clientName: "Enrique Medina", petName: "Firulais", petBreed: "Mestizo", address: "Blvd. Toscana 654, Stanza Toscana", fraccionamiento: "Stanza Toscana", phone: "+52 667 123 4567", services: ["Baño básico", "Corte de uñas"], totalAmount: 300, time: "17:30" }
];

export async function seedGroomingAppointmentsToday(tenantId: string): Promise<void> {
  console.log(`Creating 30 grooming appointments for today for tenant ${tenantId}...`);
  
  // Get today's date in the format YYYY-MM-DD
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  try {
    // Get existing services for this tenant
    const services = await storage.getServices(tenantId);
    const groomingServices = services.filter(s => s.type === 'grooming');
    
    if (groomingServices.length === 0) {
      console.log("No grooming services found, creating default services...");
      
      // Create default grooming services
      const defaultServices = [
        { name: "Baño básico", description: "Baño con champú estándar", price: "200", duration: 60, type: "grooming", tenantId },
        { name: "Baño completo", description: "Baño, secado y cepillado", price: "280", duration: 90, type: "grooming", tenantId },
        { name: "Baño de lujo", description: "Baño premium con productos especiales", price: "350", duration: 120, type: "grooming", tenantId },
        { name: "Baño y corte", description: "Baño completo más corte de pelo", price: "400", duration: 150, type: "grooming", tenantId },
        { name: "Corte de uñas", description: "Corte profesional de uñas", price: "80", duration: 30, type: "grooming", tenantId },
        { name: "Desenredado", description: "Desenredado profundo del pelaje", price: "150", duration: 60, type: "grooming", tenantId },
        { name: "Limpieza de oídos", description: "Limpieza profesional de oídos", price: "100", duration: 30, type: "grooming", tenantId },
        { name: "Limpieza dental", description: "Limpieza básica de dientes", price: "120", duration: 45, type: "grooming", tenantId },
        { name: "Pedicure", description: "Cuidado completo de patas", price: "90", duration: 30, type: "grooming", tenantId },
        { name: "Corte estilizado", description: "Corte de pelo especializado", price: "250", duration: 120, type: "grooming", tenantId },
        { name: "Baño desenredante", description: "Baño especial para pelo enredado", price: "320", duration: 150, type: "grooming", tenantId },
        { name: "Baño especializado", description: "Baño para pieles sensibles", price: "300", duration: 90, type: "grooming", tenantId },
        { name: "Baño suave", description: "Baño delicado para cachorros", price: "180", duration: 60, type: "grooming", tenantId },
        { name: "Corte profesional", description: "Corte de competencia", price: "380", duration: 180, type: "grooming", tenantId },
        { name: "Desenredado profundo", description: "Tratamiento intensivo anti-nudos", price: "200", duration: 90, type: "grooming", tenantId },
        { name: "Baño extra grande", description: "Baño para razas gigantes", price: "450", duration: 180, type: "grooming", tenantId },
        { name: "Corte estacional", description: "Corte adaptado a la temporada", price: "280", duration: 120, type: "grooming", tenantId }
      ];
      
      for (const serviceData of defaultServices) {
        await storage.createService(serviceData);
      }
      
      console.log("Default grooming services created successfully");
    }
    
    // Refresh services list
    const allServices = await storage.getServices(tenantId);
    const serviceMap = new Map(allServices.map(s => [s.name, s]));
    
    // Get staff for grooming
    const staff = await storage.getStaff(tenantId);
    const groomingStaff = staff.filter(s => s.role?.includes('grooming') || s.role?.includes('admin'));
    
    if (groomingStaff.length === 0) {
      throw new Error("No grooming staff found for tenant");
    }
    
    let createdCount = 0;
    
    for (const appointmentSeed of appointmentSeeds) {
      try {
        // Create or get client
        let client = await storage.getClientByPhone(tenantId, appointmentSeed.phone);
        
        if (!client) {
          const clientData = {
            name: appointmentSeed.clientName,
            phone: appointmentSeed.phone,
            email: `${appointmentSeed.clientName.toLowerCase().replace(' ', '.')}@example.com`,
            address: appointmentSeed.address,
            tenantId,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          client = await storage.createClient(clientData);
        }
        
        // Create pet for client
        const birthDate = new Date(Date.now() - Math.random() * 3 * 365 * 24 * 60 * 60 * 1000);
        const petData = {
          name: appointmentSeed.petName,
          species: "dog",
          breed: appointmentSeed.petBreed,
          birthDate: birthDate.toISOString().split('T')[0], // Convert to string format
          weight: (Math.round((Math.random() * 30 + 5) * 10) / 10).toString(), // Random weight 5-35 kg
          clientId: client.id,
          tenantId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const pet = await storage.createPet(petData);
        
        // Select random staff member
        const randomStaff = groomingStaff[Math.floor(Math.random() * groomingStaff.length)];
        
        // Get services for this appointment
        const appointmentServices = appointmentSeed.services.map(serviceName => {
          const service = serviceMap.get(serviceName);
          if (!service) {
            console.warn(`Service not found: ${serviceName}`);
            return null;
          }
          return service;
        }).filter((service): service is NonNullable<typeof service> => service !== null);
        
        if (appointmentServices.length === 0) {
          console.warn(`No valid services found for appointment: ${appointmentSeed.petName}`);
          continue;
        }
        
        // Calculate total duration
        const totalDuration = appointmentServices.reduce((sum, service) => sum + (service?.duration || 60), 0);
        
        // Create appointment time for today
        const [hours, minutes] = appointmentSeed.time.split(':').map(Number);
        const appointmentDateTime = new Date(today);
        appointmentDateTime.setHours(hours, minutes, 0, 0);
        
        // Create appointment using correct schema
        const appointmentData = {
          tenantId,
          type: "grooming",
          clientId: client.id,
          petId: pet.id,
          scheduledDate: todayString,
          scheduledTime: appointmentSeed.time,
          logistics: "entrega_domicilio", // Mark for home delivery
          status: "completed", // Mark as completed so it's ready for delivery
          notes: `Servicios: ${appointmentSeed.services.join(', ')}. Cliente: ${appointmentSeed.clientName}. Mascota: ${appointmentSeed.petName} (${appointmentSeed.petBreed}). Domicilio: ${appointmentSeed.address}`,
          totalAmount: appointmentSeed.totalAmount,
          paymentStatus: "paid", // Mark as paid
          paymentMethod: Math.random() > 0.5 ? "card" : "cash",
          staffId: randomStaff.id,
          serviceId: appointmentServices[0].id,
          duration: totalDuration,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const appointment = await storage.createAppointment(appointmentData);
        createdCount++;
        
        console.log(`Created appointment ${createdCount}/30: ${appointmentSeed.petName} (${appointmentSeed.clientName}) - ${appointmentSeed.fraccionamiento} - $${appointmentSeed.totalAmount}`);
        
      } catch (error) {
        console.error(`Error creating appointment for ${appointmentSeed.petName}:`, error);
      }
    }
    
    console.log(`Successfully created ${createdCount} grooming appointments for today (${todayString})`);
    console.log("All appointments are marked as 'completed' and 'paid' - ready for delivery planning");
    
  } catch (error) {
    console.error("Error seeding grooming appointments:", error);
    throw error;
  }
}