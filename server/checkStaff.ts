import { storage } from "./storage.js";

async function checkStaff() {
  try {
    const staff = await storage.getStaff('vetgroom1');
    console.log('Existing staff for vetgroom1:');
    staff.forEach(s => {
      console.log(`- ID: ${s.id}, Name: ${s.name}, Role: ${s.role}`);
    });
  } catch (error) {
    console.error('Error checking staff:', error);
  }
}

checkStaff();