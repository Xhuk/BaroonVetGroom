import { storage } from "./storage.js";

async function checkClients() {
  try {
    const clients = await storage.getClients('vetgroom1');
    console.log('Existing clients for vetgroom1:');
    clients.forEach((c, i) => {
      console.log(`- ID: ${c.id}, Name: ${c.name}`);
      if (i >= 9) return; // Show first 10
    });
    console.log(`Total clients: ${clients.length}`);
  } catch (error) {
    console.error('Error checking clients:', error);
  }
}

checkClients();