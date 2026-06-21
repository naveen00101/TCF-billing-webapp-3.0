import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const dbPath = path.join(process.cwd(), "tcf_billing.db");

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Optimize SQLite parameters
  await dbInstance.exec("PRAGMA journal_mode = WAL;");
  await dbInstance.exec("PRAGMA foreign_keys = ON;");

  await initializeSchema(dbInstance);

  return dbInstance;
}

async function initializeSchema(db: Database): Promise<void> {
  // 1. Products Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT,
      category TEXT,
      unit TEXT,
      price REAL,
      inventoryType TEXT,
      color TEXT,
      material TEXT,
      brand TEXT,
      vendor TEXT,
      purchaseCost REAL,
      sellingPrice REAL,
      unitsSold INTEGER,
      revenueGenerated REAL,
      lastSoldDate TEXT,
      stockAvailable REAL,
      productionTime TEXT,
      notes TEXT,
      sku TEXT,
      warranty TEXT,
      size TEXT,
      weight TEXT,
      imageUrl TEXT,
      status TEXT,
      parentId TEXT,
      isLeaf INTEGER,
      level INTEGER,
      nodeType TEXT,
      hierarchyPath TEXT,
      inventorySkus TEXT,
      colorVariants TEXT,
      attributes TEXT,
      selectedOptions TEXT,
      simpleVariants TEXT,
      colors TEXT,
      sizes TEXT,
      isCombo INTEGER,
      comboItems TEXT
    )
  `);

  // Auto-upgrade schema: Add missing columns if table existed before
  const addColumnIfNotExists = async (table: string, column: string, type: string) => {
    try {
      await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`Added column ${column} to ${table}`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.error(`Error adding column ${column}:`, e.message);
      }
    }
  };

  await addColumnIfNotExists('products', 'simpleVariants', 'TEXT');
  await addColumnIfNotExists('products', 'colors', 'TEXT');
  await addColumnIfNotExists('products', 'sizes', 'TEXT');
  await addColumnIfNotExists('products', 'isCombo', 'INTEGER');
  await addColumnIfNotExists('products', 'comboItems', 'TEXT');

  // 2. Customers Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT,
      name TEXT,
      mobile TEXT PRIMARY KEY,
      address TEXT,
      secondaryMobile TEXT,
      secondaryContactName TEXT,
      notes TEXT,
      addressHistory TEXT
    )
  `);

  // 3. Invoices Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      invoiceId TEXT PRIMARY KEY,
      invoiceNo TEXT,
      invoiceCategory TEXT,
      date TEXT,
      invoiceDate TEXT,
      invoiceTime TEXT,
      createdTimestamp TEXT,
      customerName TEXT,
      mobile TEXT,
      customerPrimaryPhone TEXT,
      itemCount INTEGER,
      subtotal REAL,
      discount REAL,
      roAdjustment REAL,
      grandTotal REAL,
      status TEXT,
      assignedEmployee TEXT,
      expectedDeliveryDate TEXT,
      deliveryDate TEXT,
      deliveryNotes TEXT,
      createdBy TEXT,
      createdDate TEXT,
      createdTime TEXT,
      lastEditedBy TEXT,
      lastEditedDate TEXT,
      lastEditedTime TEXT,
      lastEditedTimestamp TEXT,
      isSoftDeleted INTEGER,
      agentId TEXT,
      agentName TEXT,
      referralAgentId TEXT,
      referralAgentName TEXT,
      referralAgentCategory TEXT,
      referralAgentType TEXT,
      grossAmount REAL,
      promoCode TEXT,
      promoDiscountAmount REAL,
      cancellationPercentage REAL,
      cancellationDeduction REAL,
      refundAmount REAL,
      companyRetainedAmount REAL,
      deletedBy TEXT,
      deletedDate TEXT,
      gstEnabled INTEGER,
      gstType TEXT,
      customerGstNo TEXT,
      customerBusinessName TEXT,
      customerBusinessAddress TEXT,
      customerState TEXT,
      customerStateCode TEXT,
      cgstPercentage REAL,
      sgstPercentage REAL,
      igstPercentage REAL,
      cgstAmount REAL,
      sgstAmount REAL,
      igstAmount REAL,
      taxAmount REAL,
      paymentType TEXT,
      paymentStatus TEXT,
      amountPaid REAL,
      balanceDue REAL,
      balanceCollectionStatus TEXT,
      customerSecondaryPhone TEXT,
      customerSecondaryContactName TEXT,
      notes TEXT,
      clientNotes TEXT,
      orderNotes TEXT
    )
  `);

  // 4. Invoice Items Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceId TEXT,
      invoiceNo TEXT,
      productId TEXT,
      productName TEXT,
      variant TEXT,
      quantity REAL,
      unitPrice REAL,
      amount REAL,
      selectedColor TEXT,
      hsnCode TEXT,
      hierarchyNodeId TEXT,
      skuId TEXT,
      hierarchyPath TEXT,
      skuCode TEXT
    )
  `);

  try { await db.exec(`ALTER TABLE invoice_items ADD COLUMN isCombo INTEGER DEFAULT 0`); } catch (e) {}
  try { await db.exec(`ALTER TABLE invoice_items ADD COLUMN comboItems TEXT`); } catch (e) {}
  try { await db.exec(`ALTER TABLE invoices ADD COLUMN autoNo TEXT`); } catch (e) {}
  try { await db.exec(`ALTER TABLE invoices ADD COLUMN driverName TEXT`); } catch (e) {}

  // 5. Agents Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT,
      agentType TEXT,
      commissionPercentage REAL,
      mobile TEXT,
      email TEXT,
      status TEXT,
      notes TEXT,
      createdDate TEXT
    )
  `);

  // 6. Settings Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // 7. Payment Transactions Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      invoiceId TEXT,
      date TEXT,
      amount REAL,
      collectedBy TEXT,
      notes TEXT
    )
  `);

  // 8. Invoice Counters Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_counters (
      counterName TEXT PRIMARY KEY,
      currentValue INTEGER,
      lastUpdated TEXT
    )
  `);
}
