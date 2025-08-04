import { db } from "./db";
import { inventoryItems, inventoryTransactions } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function processCsvInventory(csvData: string, tenantId: string) {
  console.log(`Processing CSV inventory import for tenant ${tenantId}...`);
  
  try {
    // Parse CSV data
    const lines = csvData.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error("El archivo CSV debe contener al menos una fila de encabezados y una fila de datos");
    }
    
    // Get headers and validate required columns
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const requiredColumns = ['Categoria', 'Nombre', 'Descripcion', 'Precio Proveedor (MXN)', 'Precio Venta (MXN)', 'SKU', 'Stock', 'Unidad'];
    
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Faltan las siguientes columnas requeridas: ${missingColumns.join(', ')}`);
    }
    
    // Clear existing inventory for this tenant (as per requirement)
    console.log(`Clearing existing inventory for tenant ${tenantId}...`);
    await db.delete(inventoryItems).where(eq(inventoryItems.tenantId, tenantId));

    // Process data rows
    const inventoryData = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line (handle quoted values with commas)
      const values = parseCSVLine(line);
      
      if (values.length < headers.length) {
        console.warn(`Skipping line ${i + 1}: insufficient columns`);
        continue;
      }
      
      const rowData: any = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index]?.trim().replace(/"/g, '') || '';
      });
      
      // Map to inventory item structure
      const category = mapCategory(rowData['Categoria']);
      const supplierPrice = parseFloat(rowData['Precio Proveedor (MXN)']) || 0;
      const salePrice = parseFloat(rowData['Precio Venta (MXN)']) || supplierPrice * 1.5;
      const stock = parseInt(rowData['Stock']) || 0;
      
      const inventoryItem = {
        name: rowData['Nombre'] || `Producto ${i}`,
        description: rowData['Descripcion'] || '',
        category,
        sku: rowData['SKU'] || `CSV-${Date.now()}-${i}`,
        unitPrice: salePrice, // Use sale price as unit price
        currentStock: stock,
        minStockLevel: Math.max(1, Math.floor(stock * 0.1)), // 10% of current stock
        maxStockLevel: Math.max(10, stock * 2), // 200% of current stock
        unit: rowData['Unidad'] || 'pieza',
        supplier: rowData['Proveedor'] || '',
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      inventoryData.push(inventoryItem);
    }
    
    if (inventoryData.length === 0) {
      throw new Error("No se encontraron productos válidos en el archivo CSV");
    }
    
    // Insert the new inventory items
    console.log(`Inserting ${inventoryData.length} inventory items from CSV...`);
    const insertedItems = await db.insert(inventoryItems)
      .values(inventoryData)
      .returning();

    // Create initial stock transactions for each item
    const transactions = insertedItems.map(item => ({
      itemId: item.id,
      tenantId,
      type: 'purchase' as const,
      quantity: item.currentStock,
      unitPrice: item.unitPrice,
      totalAmount: item.currentStock * parseFloat(item.unitPrice.toString()),
      notes: 'Stock inicial - Importación CSV',
      createdAt: new Date()
    }));

    await db.insert(inventoryTransactions).values(transactions);

    console.log(`✅ Successfully imported ${insertedItems.length} inventory items from CSV for tenant ${tenantId}`);
    return insertedItems;

  } catch (error) {
    console.error(`❌ Error processing CSV inventory import:`, error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Error desconocido durante el procesamiento del CSV");
  }
}

// Helper function to parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Helper function to map category names to system categories
function mapCategory(csvCategory: string): string {
  const categoryMap: { [key: string]: string } = {
    'vacuna': 'medication',
    'medicamento': 'medication',
    'medico': 'medication',
    'medicina': 'medication',
    'accesorio': 'accessories',
    'accesorios': 'accessories',
    'grooming': 'supplies',
    'estetica': 'supplies',
    'estética': 'supplies',
    'alimento': 'food',
    'comida': 'food',
    'juguete': 'accessories',
    'juguetes': 'accessories',
    'suministro': 'supplies',
    'suministros': 'supplies'
  };
  
  const normalized = csvCategory.toLowerCase().trim();
  return categoryMap[normalized] || 'supplies';
}