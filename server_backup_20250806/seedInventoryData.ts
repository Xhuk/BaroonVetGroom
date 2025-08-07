import { db } from "./db";
import { inventoryItems, inventoryTransactions } from "@shared/schema";
import { eq } from "drizzle-orm";

// Mexican veterinary inventory with realistic prices in MXN
const veterinaryInventory = [
  // MEDICATIONS - Medicamentos
  {
    name: "Amoxicilina 500mg",
    description: "Antibiótico de amplio espectro para infecciones bacterianas",
    category: "medication",
    sku: "MED-AMX-500",
    unitPrice: 45.00,
    currentStock: 120,
    minStockLevel: 20,
    maxStockLevel: 200,
    unit: "tabletas"
  },
  {
    name: "Meloxicam 1mg/ml",
    description: "Antiinflamatorio no esteroideo para dolor y inflamación",
    category: "medication", 
    sku: "MED-MEL-1ML",
    unitPrice: 180.00,
    currentStock: 50,
    minStockLevel: 10,
    maxStockLevel: 80,
    unit: "frasco 10ml"
  },
  {
    name: "Dexametasona 4mg",
    description: "Corticosteroide para procesos inflamatorios y alérgicos",
    category: "medication",
    sku: "MED-DEX-4MG",
    unitPrice: 25.00,
    currentStock: 80,
    minStockLevel: 15,
    maxStockLevel: 120,
    unit: "ampolleta"
  },
  {
    name: "Ivermectina 1%",
    description: "Antiparasitario interno y externo",
    category: "medication",
    sku: "MED-IVM-1",
    unitPrice: 320.00,
    currentStock: 30,
    minStockLevel: 5,
    maxStockLevel: 50,
    unit: "frasco 50ml"
  },
  {
    name: "Dipirona 500mg",
    description: "Analgésico y antipirético para dolor y fiebre",
    category: "medication",
    sku: "MED-DIP-500",
    unitPrice: 15.00,
    currentStock: 200,
    minStockLevel: 30,
    maxStockLevel: 300,
    unit: "tableta"
  },
  {
    name: "Ranitidina 150mg",
    description: "Protector gástrico, antiácido",
    category: "medication",
    sku: "MED-RAN-150",
    unitPrice: 12.00,
    currentStock: 150,
    minStockLevel: 25,
    maxStockLevel: 200,
    unit: "tableta"
  },
  {
    name: "Enrofloxacina 10%",
    description: "Antibiótico de amplio espectro para infecciones severas",
    category: "medication",
    sku: "MED-ENR-10",
    unitPrice: 280.00,
    currentStock: 25,
    minStockLevel: 5,
    maxStockLevel: 40,
    unit: "frasco 50ml"
  },

  // VACCINES - Vacunas
  {
    name: "Vacuna Séxtuple Canina",
    description: "Protección contra Distemper, Hepatitis, Parvovirus, Parainfluenza, Coronavirus, Leptospira",
    category: "medication",
    sku: "VAC-6PLE-CAN",
    unitPrice: 180.00,
    currentStock: 60,
    minStockLevel: 10,
    maxStockLevel: 100,
    unit: "dosis"
  },
  {
    name: "Vacuna Antirrábica",
    description: "Vacuna contra la rabia para perros y gatos",
    category: "medication",
    sku: "VAC-RAB-001",
    unitPrice: 120.00,
    currentStock: 80,
    minStockLevel: 15,
    maxStockLevel: 120,
    unit: "dosis"
  },
  {
    name: "Vacuna Triple Felina",
    description: "Protección contra Rinotraqueitis, Calicivirus, Panleucopenia",
    category: "medication",
    sku: "VAC-3PLE-FEL",
    unitPrice: 160.00,
    currentStock: 45,
    minStockLevel: 8,
    maxStockLevel: 80,
    unit: "dosis"
  },
  {
    name: "Vacuna Leucemia Felina",
    description: "Protección específica contra virus de leucemia felina",
    category: "medication",
    sku: "VAC-LEUC-FEL",
    unitPrice: 220.00,
    currentStock: 30,
    minStockLevel: 5,
    maxStockLevel: 50,
    unit: "dosis"
  },

  // MEDICAL SUPPLIES - Suministros Médicos
  {
    name: "Jeringas 3ml Desechables",
    description: "Jeringas estériles de 3ml con aguja 21G",
    category: "supplies",
    sku: "SUP-JER-3ML",
    unitPrice: 4.50,
    currentStock: 500,
    minStockLevel: 100,
    maxStockLevel: 1000,
    unit: "pieza"
  },
  {
    name: "Jeringas 5ml Desechables",
    description: "Jeringas estériles de 5ml con aguja 20G",
    category: "supplies",
    sku: "SUP-JER-5ML",
    unitPrice: 5.20,
    currentStock: 300,
    minStockLevel: 50,
    maxStockLevel: 500,
    unit: "pieza"
  },
  {
    name: "Agujas 22G x 1\"",
    description: "Agujas hipodérmicas calibre 22G por 1 pulgada",
    category: "supplies",
    sku: "SUP-AGU-22G",
    unitPrice: 2.80,
    currentStock: 800,
    minStockLevel: 200,
    maxStockLevel: 1200,
    unit: "pieza"
  },
  {
    name: "Gasas Estériles 5x5cm",
    description: "Gasas estériles para curación y limpieza de heridas",
    category: "supplies",
    sku: "SUP-GAS-5X5",
    unitPrice: 3.50,
    currentStock: 600,
    minStockLevel: 100,
    maxStockLevel: 1000,
    unit: "pieza"
  },
  {
    name: "Vendas Elásticas 7.5cm",
    description: "Vendas elásticas para inmovilización y compresión",
    category: "supplies",
    sku: "SUP-VEN-7.5",
    unitPrice: 25.00,
    currentStock: 80,
    minStockLevel: 20,
    maxStockLevel: 150,
    unit: "rollo"
  },
  {
    name: "Suero Fisiológico 500ml",
    description: "Solución salina estéril para hidratación parenteral",
    category: "supplies",
    sku: "SUP-SUE-500",
    unitPrice: 35.00,
    currentStock: 100,
    minStockLevel: 20,
    maxStockLevel: 200,
    unit: "bolsa"
  },
  {
    name: "Catéter Intravenoso 22G",
    description: "Catéter para acceso venoso periférico",
    category: "supplies",
    sku: "SUP-CAT-22G",
    unitPrice: 18.00,
    currentStock: 150,
    minStockLevel: 30,
    maxStockLevel: 250,
    unit: "pieza"
  },
  {
    name: "Guantes Nitrilo Talla M",
    description: "Guantes desechables de nitrilo sin polvo",
    category: "supplies",
    sku: "SUP-GUA-NIT-M",
    unitPrice: 1.20,
    currentStock: 2000,
    minStockLevel: 500,
    maxStockLevel: 3000,
    unit: "pieza"
  },
  {
    name: "Mascarillas Quirúrgicas",
    description: "Mascarillas desechables de 3 capas",
    category: "supplies",
    sku: "SUP-MAS-QUI",
    unitPrice: 2.50,
    currentStock: 1000,
    minStockLevel: 200,
    maxStockLevel: 2000,
    unit: "pieza"
  },
  {
    name: "Alcohol Isopropílico 70%",
    description: "Antiséptico para desinfección de instrumental",
    category: "supplies",
    sku: "SUP-ALC-70",
    unitPrice: 45.00,
    currentStock: 50,
    minStockLevel: 10,
    maxStockLevel: 80,
    unit: "litro"
  },

  // GROOMING SUPPLIES - Suministros de Estética
  {
    name: "Shampoo Antipulgas",
    description: "Shampoo medicado contra pulgas y garrapatas",
    category: "supplies",
    sku: "GRO-SHA-ANTI",
    unitPrice: 85.00,
    currentStock: 40,
    minStockLevel: 8,
    maxStockLevel: 60,
    unit: "frasco 500ml"
  },
  {
    name: "Shampoo Hipoalergénico",
    description: "Shampoo suave para pieles sensibles",
    category: "supplies",
    sku: "GRO-SHA-HIPO",
    unitPrice: 95.00,
    currentStock: 35,
    minStockLevel: 8,
    maxStockLevel: 50,
    unit: "frasco 500ml"
  },
  {
    name: "Acondicionador Desenredante",
    description: "Acondicionador para pelo largo y nudos",
    category: "supplies",
    sku: "GRO-ACO-DES",
    unitPrice: 75.00,
    currentStock: 25,
    minStockLevel: 5,
    maxStockLevel: 40,
    unit: "frasco 500ml"
  },
  {
    name: "Cortauñas Profesional",
    description: "Cortauñas de acero inoxidable para perros y gatos",
    category: "supplies",
    sku: "GRO-COR-PRO",
    unitPrice: 180.00,
    currentStock: 15,
    minStockLevel: 3,
    maxStockLevel: 25,
    unit: "pieza"
  },

  // FOOD AND TREATS - Alimentos
  {
    name: "Alimento Recovery A/D",
    description: "Alimento terapéutico para recuperación post-cirugía",
    category: "food",
    sku: "FOO-REC-AD",
    unitPrice: 420.00,
    currentStock: 20,
    minStockLevel: 5,
    maxStockLevel: 40,
    unit: "lata 156g"
  },
  {
    name: "Dieta Renal Prescription",
    description: "Alimento especializado para problemas renales",
    category: "food",
    sku: "FOO-REN-PRE",
    unitPrice: 1200.00,
    currentStock: 15,
    minStockLevel: 3,
    maxStockLevel: 30,
    unit: "bolsa 3kg"
  },
  {
    name: "Treats Dentales",
    description: "Premios para higiene dental canina",
    category: "food",
    sku: "FOO-TRE-DEN",
    unitPrice: 150.00,
    currentStock: 50,
    minStockLevel: 10,
    maxStockLevel: 80,
    unit: "paquete"
  },

  // ACCESSORIES - Accesorios
  {
    name: "Collar Isabelino 20cm",
    description: "Collar protector post-cirugía talla mediana",
    category: "accessories",
    sku: "ACC-COL-ISA-20",
    unitPrice: 120.00,
    currentStock: 25,
    minStockLevel: 5,
    maxStockLevel: 40,
    unit: "pieza"
  },
  {
    name: "Collar Isabelino 15cm",
    description: "Collar protector post-cirugía talla pequeña",
    category: "accessories",
    sku: "ACC-COL-ISA-15",
    unitPrice: 100.00,
    currentStock: 30,
    minStockLevel: 8,
    maxStockLevel: 50,
    unit: "pieza"
  },
  {
    name: "Collar Isabelino 25cm",
    description: "Collar protector post-cirugía talla grande",
    category: "accessories",
    sku: "ACC-COL-ISA-25",
    unitPrice: 140.00,
    currentStock: 20,
    minStockLevel: 5,
    maxStockLevel: 35,
    unit: "pieza"
  },
  {
    name: "Transportadora Pequeña",
    description: "Transportadora plástica para gatos y perros pequeños",
    category: "accessories",
    sku: "ACC-TRA-PEQ",
    unitPrice: 450.00,
    currentStock: 8,
    minStockLevel: 2,
    maxStockLevel: 15,
    unit: "pieza"
  },
  {
    name: "Transportadora Mediana",
    description: "Transportadora plástica para perros medianos",
    category: "accessories",
    sku: "ACC-TRA-MED",
    unitPrice: 650.00,
    currentStock: 6,
    minStockLevel: 2,
    maxStockLevel: 12,
    unit: "pieza"
  },
  {
    name: "Correa Extensible 5m",
    description: "Correa retráctil para paseo hasta 30kg",
    category: "accessories",
    sku: "ACC-COR-EXT-5",
    unitPrice: 280.00,
    currentStock: 15,
    minStockLevel: 3,
    maxStockLevel: 25,
    unit: "pieza"
  },
  {
    name: "Plato Acero Inoxidable",
    description: "Plato para comida de acero inoxidable antideslizante",
    category: "accessories",
    sku: "ACC-PLA-ACE",
    unitPrice: 85.00,
    currentStock: 40,
    minStockLevel: 10,
    maxStockLevel: 60,
    unit: "pieza"
  }
];

export async function seedInventoryData(tenantId: string) {
  console.log(`Seeding inventory data for tenant ${tenantId}...`);
  
  try {
    // Clear existing inventory for this tenant
    await db.delete(inventoryItems).where(eq(inventoryItems.tenantId, tenantId));
    
    // Insert new inventory items
    const itemsToInsert = veterinaryInventory.map(item => ({
      ...item,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    const insertedItems = await db.insert(inventoryItems)
      .values(itemsToInsert)
      .returning();
    
    // Create initial stock transactions for each item
    const transactions = insertedItems.map(item => ({
      itemId: item.id,
      tenantId,
      type: 'purchase' as const,
      quantity: item.currentStock,
      unitPrice: item.unitPrice,
      totalAmount: item.currentStock * parseFloat(item.unitPrice.toString()),
      notes: 'Stock inicial del sistema',
      createdAt: new Date()
    }));
    
    await db.insert(inventoryTransactions).values(transactions);
    
    console.log(`✅ Successfully seeded ${insertedItems.length} inventory items for tenant ${tenantId}`);
    return insertedItems;
    
  } catch (error) {
    console.error(`❌ Error seeding inventory data for tenant ${tenantId}:`, error);
    throw error;
  }
}

// Function to seed all tenants
export async function seedAllTenantsInventory() {
  const tenants = ['vetgroom1', 'tenant-1']; // Add more tenant IDs as needed
  
  for (const tenantId of tenants) {
    await seedInventoryData(tenantId);
  }
  
  console.log('🎉 Inventory seeding completed for all tenants!');
}