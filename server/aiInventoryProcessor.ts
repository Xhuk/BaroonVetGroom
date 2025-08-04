import OpenAI from "openai";
import { db } from "./db";
import { inventoryItems, inventoryTransactions } from "@shared/schema";
import { eq } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function processInventoryWithAI(description: string, tenantId: string) {
  console.log(`Processing AI inventory import for tenant ${tenantId}...`);
  
  try {
    // Use OpenAI to process the natural language description
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert veterinary inventory assistant. Parse the user's description and create a structured inventory list for a Mexican veterinary clinic. 

IMPORTANT: Return ONLY valid JSON without any markdown formatting or code blocks.

Generate realistic Mexican veterinary inventory items with:
- Appropriate Spanish names and descriptions
- Mexican peso pricing (realistic market rates)
- Proper categories: "medication", "supplies", "food", "accessories"
- SKU codes following pattern: CAT-NAME-SPEC (e.g., MED-AMX-500, SUP-JER-3ML)
- Realistic stock levels and min/max thresholds
- Mexican units (tabletas, frascos, ml, kg, piezas, etc.)

Categories guidelines:
- medication: antibiotics, anti-inflammatories, vaccines, dewormers, anesthetics
- supplies: syringes, gauze, catheters, gloves, disinfectants, surgical tools
- food: therapeutic diets, treats, supplements
- accessories: collars, carriers, leashes, toys, grooming tools

Return a JSON array with this exact structure:
[
  {
    "name": "Product name in Spanish",
    "description": "Detailed description in Spanish",
    "category": "medication|supplies|food|accessories",
    "sku": "CATEGORY-CODE-SPEC",
    "unitPrice": 0.00,
    "currentStock": 0,
    "minStockLevel": 0,
    "maxStockLevel": 0,
    "unit": "unit in Spanish"
  }
]`
        },
        {
          role: "user", 
          content: `Create veterinary inventory from this description: ${description}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000
    });

    const aiResponse = response.choices[0].message.content;
    if (!aiResponse) {
      throw new Error("No response from OpenAI");
    }

    let inventoryData;
    try {
      // Parse the AI response
      const parsed = JSON.parse(aiResponse);
      // Handle both direct array and object with items property
      inventoryData = Array.isArray(parsed) ? parsed : (parsed.items || parsed.inventory || []);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
      throw new Error("Invalid AI response format");
    }

    if (!Array.isArray(inventoryData) || inventoryData.length === 0) {
      throw new Error("AI did not generate valid inventory items");
    }

    // Clear existing inventory for this tenant (as per requirement)
    console.log(`Clearing existing inventory for tenant ${tenantId}...`);
    await db.delete(inventoryItems).where(eq(inventoryItems.tenantId, tenantId));

    // Process and validate the AI-generated inventory
    const processedItems = inventoryData.map((item: any, index: number) => {
      // Validate and sanitize the data
      const processedItem = {
        name: String(item.name || `Producto ${index + 1}`).trim(),
        description: String(item.description || '').trim(),
        category: ['medication', 'supplies', 'food', 'accessories'].includes(item.category) 
          ? item.category : 'supplies',
        sku: String(item.sku || `GEN-${Date.now()}-${index}`).trim(),
        unitPrice: Math.max(0, parseFloat(item.unitPrice) || 10),
        currentStock: Math.max(0, parseInt(item.currentStock) || 50),
        minStockLevel: Math.max(1, parseInt(item.minStockLevel) || 5),
        maxStockLevel: Math.max(10, parseInt(item.maxStockLevel) || 100),
        unit: String(item.unit || 'pieza').trim(),
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Ensure maxStockLevel is greater than minStockLevel
      if (processedItem.maxStockLevel <= processedItem.minStockLevel) {
        processedItem.maxStockLevel = processedItem.minStockLevel * 3;
      }

      return processedItem;
    });

    // Insert the new inventory items
    console.log(`Inserting ${processedItems.length} AI-generated inventory items...`);
    const insertedItems = await db.insert(inventoryItems)
      .values(processedItems)
      .returning();

    // Create initial stock transactions for each item
    const transactions = insertedItems.map(item => ({
      itemId: item.id,
      tenantId,
      type: 'purchase' as const,
      quantity: item.currentStock,
      unitPrice: item.unitPrice,
      totalAmount: item.currentStock * parseFloat(item.unitPrice.toString()),
      notes: 'Stock inicial - Importación masiva con IA',
      createdAt: new Date()
    }));

    await db.insert(inventoryTransactions).values(transactions);

    console.log(`✅ Successfully imported ${insertedItems.length} inventory items with AI for tenant ${tenantId}`);
    return insertedItems;

  } catch (error) {
    console.error(`❌ Error processing AI inventory import:`, error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error occurred during AI processing");
  }
}