import { db } from "./db";
import { fraccionamientos, companies } from "../shared/schema";

export async function seedFraccionamientosData() {
  console.log("🏘️  Starting fraccionamientos seeding...");
  
  try {
    // Get existing companies
    const existingCompanies = await db.select().from(companies);
    console.log(`Found ${existingCompanies.length} companies for fraccionamientos seeding`);
    
    if (existingCompanies.length === 0) {
      console.log("❌ No companies found - cannot seed fraccionamientos");
      return;
    }

    // Sample fraccionamientos data for different Mexican cities
    const fraccionamientosData = [
      // Guadalajara, Jalisco
      {
        name: "Fraccionamiento Los Pinos",
        location: "Guadalajara, Jalisco",
        weight: 2.5,
        latitude: 20.6597,
        longitude: -103.3496,
        companyId: existingCompanies[0].id
      },
      {
        name: "Residencial Valle Real",
        location: "Zapopan, Jalisco", 
        weight: 3.2,
        latitude: 20.7214,
        longitude: -103.3918,
        companyId: existingCompanies[0].id
      },
      {
        name: "Colonia Americana",
        location: "Guadalajara, Jalisco",
        weight: 1.8,
        latitude: 20.6736,
        longitude: -103.3370,
        companyId: existingCompanies[0].id
      },
      // Ciudad de México
      {
        name: "Colonia Roma Norte",
        location: "Ciudad de México, CDMX",
        weight: 4.1,
        latitude: 19.4326,
        longitude: -99.1332,
        companyId: existingCompanies[0].id
      },
      {
        name: "Polanco",
        location: "Ciudad de México, CDMX",
        weight: 5.0,
        latitude: 19.4326,
        longitude: -99.1982,
        companyId: existingCompanies[0].id
      },
      // Monterrey, Nuevo León
      {
        name: "San Pedro Garza García",
        location: "Monterrey, Nuevo León",
        weight: 4.8,
        latitude: 25.6866,
        longitude: -100.3161,
        companyId: existingCompanies[0].id
      },
      {
        name: "Residencial Cumbres",
        location: "Monterrey, Nuevo León", 
        weight: 3.5,
        latitude: 25.7617,
        longitude: -100.2892,
        companyId: existingCompanies[0].id
      }
    ];

    // Add more fraccionamientos for additional companies if available
    if (existingCompanies.length > 1) {
      fraccionamientosData.push(
        {
          name: "Fraccionamiento Las Flores",
          location: "León, Guanajuato",
          weight: 2.1,
          latitude: 21.1619,
          longitude: -101.6971,
          companyId: existingCompanies[1].id
        },
        {
          name: "Colonia Centro Histórico",
          location: "Puebla, Puebla",
          weight: 3.8,
          latitude: 19.0414,
          longitude: -98.2063,
          companyId: existingCompanies[1].id
        }
      );
    }

    console.log(`💾 Inserting ${fraccionamientosData.length} fraccionamientos...`);
    
    // Insert fraccionamientos data
    for (const fracData of fraccionamientosData) {
      await db.insert(fraccionamientos).values(fracData);
      console.log(`✅ Inserted fraccionamiento: ${fracData.name} in ${fracData.location}`);
    }

    console.log("🎉 Fraccionamientos seeding completed successfully!");
    return { success: true, count: fraccionamientosData.length };

  } catch (error) {
    console.error("❌ Error seeding fraccionamientos:", error);
    throw error;
  }
}

// Allow direct execution
if (require.main === module) {
  seedFraccionamientosData()
    .then(() => {
      console.log("✅ Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}