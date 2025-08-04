import { seedDeliveryData } from "./seedDeliveryData";

async function runSeed() {
  try {
    console.log("🌱 Starting delivery planning seed process...");
    await seedDeliveryData();
    console.log("🎉 Seed process completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("💥 Seed process failed:", error);
    process.exit(1);
  }
}

runSeed();