import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import { getDb } from "./src/utils/db";

dotenv.config();

// Initialize the Google GenAI SDK on the server side
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json({ limit: "10mb" }));

  // Configure persistent storage for database connection
  const CONFIG_FILE = path.join(process.cwd(), "dbConfig.json");

  // API Route: Get Global Database Configuration
  app.get("/api/config/db", async (req, res) => {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        return res.json(JSON.parse(data));
      }
      res.json({}); // return empty if not found
    } catch (err: any) {
      res.status(500).json({ error: "Failed to read configuration." });
    }
  });

  // API Route: Save Global Database Configuration
  app.post("/api/config/db", async (req, res) => {
    try {
      const configData = req.body;
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(configData, null, 2), 'utf-8');
      res.json({ success: true, message: "Configuration saved successfully." });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save configuration." });
    }
  });

  // Reverse Mapping dictionaries for Sheets Backup
  const productMappingReverse: Record<string, string> = {
    id: "Product ID",
    name: "Product Name",
    category: "Category",
    unit: "Unit",
    price: "Price",
    inventoryType: "Inventory Type",
    color: "Color",
    material: "Material",
    brand: "Brand",
    vendor: "Vendor",
    purchaseCost: "Purchase Cost",
    sellingPrice: "Selling Price",
    unitsSold: "Units Sold",
    revenueGenerated: "Revenue Generated",
    lastSoldDate: "Last Sold Date",
    stockAvailable: "Stock Available",
    productionTime: "Production Time",
    notes: "Notes",
    sku: "SKU",
    warranty: "Warranty",
    size: "Size",
    weight: "Weight",
    imageUrl: "Image URL",
    status: "Status",
    parentId: "Parent ID",
    isLeaf: "Is Leaf",
    level: "Level",
    nodeType: "Node Type",
    hierarchyPath: "Hierarchy Path",
    inventorySkus: "Inventory SKUs JSON",
    colorVariants: "Color Variants JSON",
    attributes: "Attributes JSON",
    selectedOptions: "Selected Options JSON"
  };

  const customerMappingReverse: Record<string, string> = {
    id: "Customer ID",
    name: "Customer Name",
    mobile: "Mobile Number",
    address: "Address",
    secondaryMobile: "Secondary Mobile",
    secondaryContactName: "Secondary Contact Name",
    notes: "Notes",
    addressHistory: "Address History JSON"
  };

  const invoiceMappingReverse: Record<string, string> = {
    invoiceId: "Invoice ID",
    invoiceNo: "Invoice Number",
    invoiceCategory: "Invoice Category",
    date: "Date",
    customerName: "Customer Name",
    mobile: "Mobile Number",
    itemCount: "Item Count",
    subtotal: "Subtotal",
    discount: "Discount",
    grandTotal: "Grand Total",
    status: "Fulfillment Status",
    paymentType: "Payment Type",
    amountPaid: "Amount Paid",
    balanceDue: "Balance Due",
    paymentStatus: "Payment Status",
    gstType: "GST Type",
    taxAmount: "GST Amount",
    referralAgentId: "Referral Agent ID",
    referralAgentName: "Referral Agent Name",
    referralAgentCategory: "Referral Agent Category",
    referralAgentType: "Referral Agent Type",
    lastUpdated: "Last Updated",
    updatedBy: "Updated By"
  };

  const invoiceItemMappingReverse: Record<string, string> = {
    invoiceId: "Invoice ID",
    invoiceNo: "Invoice Number",
    productId: "Product ID",
    productName: "Product Name",
    variant: "Variant",
    quantity: "Quantity",
    unitPrice: "Unit Price",
    amount: "Line Total",
    hierarchyNodeId: "Hierarchy Node ID",
    skuId: "SKU ID",
    hierarchyPath: "Hierarchy Path",
    skuCode: "SKU Code"
  };

  const agentMappingReverse: Record<string, string> = {
    id: "Agent ID",
    name: "Agent Name",
    agentType: "Agent Category",
    commissionPercentage: "Commission Rate",
    mobile: "Phone Number",
    email: "Email",
    status: "Status",
    notes: "Notes",
    createdDate: "Created Date"
  };

  const settingMappingReverse: Record<string, string> = {
    key: "Key",
    value: "Value"
  };

  const paymentTransactionMappingReverse: Record<string, string> = {
    id: "Transaction ID",
    invoiceId: "Invoice ID",
    date: "Date",
    amount: "Amount",
    collectedBy: "Collected By",
    notes: "Notes"
  };

  function mapRow(row: any, mapping: Record<string, string>) {
    const mapped: Record<string, any> = {};
    for (const key of Object.keys(mapping)) {
      const sheetCol = mapping[key];
      mapped[sheetCol] = row[key];
    }
    return mapped;
  }

  // API Route: Database Synchronization
  app.post("/api/sync", async (req, res) => {
    try {
      const { action, data } = req.body;
      const db = await getDb();

      if (action === "syncPull") {
        const productsRaw = await db.all("SELECT * FROM products");
        const products = productsRaw.map((p: any) => {
          return {
            ...p,
            isLeaf: p.isLeaf === 1,
            isCombo: p.isCombo === 1,
            inventorySkus: p.inventorySkus ? JSON.parse(p.inventorySkus) : [],
            colorVariants: p.colorVariants ? JSON.parse(p.colorVariants) : [],
            attributes: p.attributes ? JSON.parse(p.attributes) : [],
            selectedOptions: p.selectedOptions ? JSON.parse(p.selectedOptions) : {},
            simpleVariants: p.simpleVariants ? JSON.parse(p.simpleVariants) : [],
            colors: p.colors ? JSON.parse(p.colors) : [],
            sizes: p.sizes ? JSON.parse(p.sizes) : [],
            comboItems: p.comboItems ? JSON.parse(p.comboItems) : [],
            variantsEnabled: (p.inventorySkus && JSON.parse(p.inventorySkus).length > 0) || (p.colorVariants && JSON.parse(p.colorVariants).length > 0)
          };
        });

        const customersRaw = await db.all("SELECT * FROM customers");
        const customers = customersRaw.map((c: any) => ({
          ...c,
          secondaryPhone: c.secondaryMobile,
          addressHistory: c.addressHistory ? JSON.parse(c.addressHistory) : []
        }));

        // Query invoices
        const invoices = await db.all("SELECT * FROM invoices");

        // Query invoice items
        const invoiceItemsRaw = await db.all("SELECT * FROM invoice_items");
        const invoiceItems = invoiceItemsRaw.map(i => ({
          ...i,
          isCombo: i.isCombo === 1,
          comboItems: i.comboItems ? JSON.parse(i.comboItems) : []
        }));

        // Query agents
        const agents = await db.all("SELECT * FROM agents");

        // Query settings
        const settings = await db.all("SELECT * FROM settings");

        // Query payment transactions
        const paymentTransactions = await db.all("SELECT * FROM payment_transactions");

        return res.json({
          success: true,
          products,
          customers,
          invoices,
          invoiceItems,
          agents,
          settings,
          paymentTransactions
        });
      }

      if (action === "upsertProduct") {
        await db.run(`
          INSERT OR REPLACE INTO products (
            id, name, category, unit, price, inventoryType, color, material, brand, vendor, 
            purchaseCost, sellingPrice, unitsSold, revenueGenerated, lastSoldDate, stockAvailable, 
            productionTime, notes, sku, warranty, size, weight, imageUrl, status, parentId, 
            isLeaf, level, nodeType, hierarchyPath, inventorySkus, colorVariants, attributes, selectedOptions,
            simpleVariants, colors, sizes, isCombo, comboItems
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          data.id, data.name, data.category || "", data.unit || "", Number(data.price) || 0, data.inventoryType || "Stock Item",
          data.color || "", data.material || "", data.brand || "", data.vendor || "",
          data.purchaseCost !== undefined ? Number(data.purchaseCost) : null,
          data.sellingPrice !== undefined ? Number(data.sellingPrice) : null,
          data.unitsSold !== undefined ? Number(data.unitsSold) : null,
          data.revenueGenerated !== undefined ? Number(data.revenueGenerated) : null,
          data.lastSoldDate || "",
          data.stockAvailable !== undefined ? Number(data.stockAvailable) : null,
          data.productionTime || "", data.notes || "", data.sku || "", data.warranty || "",
          data.size || "", data.weight || "", data.imageUrl || "", data.status || "Active",
          data.parentId || null, data.isLeaf ? 1 : 0, data.level || 0, data.nodeType || "Product",
          data.hierarchyPath || "",
          JSON.stringify(data.inventorySkus || []),
          JSON.stringify(data.colorVariants || []),
          JSON.stringify(data.attributes || []),
          JSON.stringify(data.selectedOptions || {}),
          JSON.stringify(data.simpleVariants || []),
          JSON.stringify(data.colors || []),
          JSON.stringify(data.sizes || []),
          data.isCombo ? 1 : 0,
          JSON.stringify(data.comboItems || [])
        );
        return res.json({ success: true, message: "Product upserted successfully" });
      }

      if (action === "upsertProductsBatch") {
        await db.run("BEGIN TRANSACTION;");
        try {
          for (const item of data) {
            await db.run(`
              INSERT OR REPLACE INTO products (
                id, name, category, unit, price, inventoryType, color, material, brand, vendor, 
                purchaseCost, sellingPrice, unitsSold, revenueGenerated, lastSoldDate, stockAvailable, 
                productionTime, notes, sku, warranty, size, weight, imageUrl, status, parentId, 
                isLeaf, level, nodeType, hierarchyPath, inventorySkus, colorVariants, attributes, selectedOptions,
                simpleVariants, colors, sizes, isCombo, comboItems
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
              item.id, item.name, item.category || "", item.unit || "", Number(item.price) || 0, item.inventoryType || "Stock Item",
              item.color || "", item.material || "", item.brand || "", item.vendor || "",
              item.purchaseCost !== undefined ? Number(item.purchaseCost) : null,
              item.sellingPrice !== undefined ? Number(item.sellingPrice) : null,
              item.unitsSold !== undefined ? Number(item.unitsSold) : null,
              item.revenueGenerated !== undefined ? Number(item.revenueGenerated) : null,
              item.lastSoldDate || "",
              item.stockAvailable !== undefined ? Number(item.stockAvailable) : null,
              item.productionTime || "", item.notes || "", item.sku || "", item.warranty || "",
              item.size || "", item.weight || "", item.imageUrl || "", item.status || "Active",
              item.parentId || null, item.isLeaf ? 1 : 0, item.level || 0, item.nodeType || "Product",
              item.hierarchyPath || "",
              JSON.stringify(item.inventorySkus || []),
              JSON.stringify(item.colorVariants || []),
              JSON.stringify(item.attributes || []),
              JSON.stringify(item.selectedOptions || {}),
              JSON.stringify(item.simpleVariants || []),
              JSON.stringify(item.colors || []),
              JSON.stringify(item.sizes || []),
              item.isCombo ? 1 : 0,
              JSON.stringify(item.comboItems || [])
            );
          }
          await db.run("COMMIT;");
          return res.json({ success: true, message: `Batch upserted ${data.length} products` });
        } catch (txErr: any) {
          await db.run("ROLLBACK;");
          throw txErr;
        }
      }

      if (action === "deleteProduct") {
        await db.run("DELETE FROM products WHERE id = ?", data.id || data);
        return res.json({ success: true, message: "Product deleted successfully" });
      }

      if (action === "upsertCustomer") {
        const customerMobileClean = String(data.mobile).replace(/\D/g, "");
        await db.run(`
          INSERT OR REPLACE INTO customers (
            id, name, mobile, address, secondaryMobile, secondaryContactName, notes, addressHistory
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
          data.id, data.name, customerMobileClean, data.address || "", data.secondaryPhone || "",
          data.secondaryContactName || "", data.notes || "",
          data.addressHistory ? JSON.stringify(data.addressHistory) : "[]"
        );
        return res.json({ success: true, message: "Customer upserted successfully" });
      }

      if (action === "createInvoice") {
        const header = data.invoice;
        const items = data.items;

        await db.run("BEGIN TRANSACTION;");
        try {
          // Insert Invoice Header
          await db.run(`
            INSERT OR REPLACE INTO invoices (
              invoiceId, invoiceNo, invoiceCategory, date, invoiceDate, invoiceTime, createdTimestamp, 
              customerName, mobile, customerPrimaryPhone, itemCount, subtotal, discount, roAdjustment, 
              grandTotal, status, assignedEmployee, expectedDeliveryDate, deliveryDate, deliveryNotes, 
              createdBy, createdDate, createdTime, lastEditedBy, lastEditedDate, lastEditedTime, lastEditedTimestamp, 
              isSoftDeleted, agentId, agentName, referralAgentId, referralAgentName, referralAgentCategory, referralAgentType, 
              grossAmount, promoCode, promoDiscountAmount, cancellationPercentage, cancellationDeduction, refundAmount, 
              companyRetainedAmount, deletedBy, deletedDate, gstEnabled, gstType, customerGstNo, customerBusinessName, 
              customerBusinessAddress, customerState, customerStateCode, cgstPercentage, sgstPercentage, igstPercentage, 
              cgstAmount, sgstAmount, igstAmount, taxAmount, paymentType, paymentStatus, amountPaid, balanceDue, 
              balanceCollectionStatus, customerSecondaryPhone, customerSecondaryContactName, notes, clientNotes, orderNotes, autoNo, driverName
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
          `,
            header.invoiceId || header.invoiceNo, header.invoiceNo, header.invoiceCategory || "NON_GST", header.date, header.invoiceDate || "", header.invoiceTime || "", header.createdTimestamp || "",
            header.customerName, header.mobile, header.customerPrimaryPhone || "", Number(header.itemCount) || 0, Number(header.subtotal) || 0, Number(header.discount) || 0, Number(header.roAdjustment) || 0,
            Number(header.grandTotal) || 0, header.status || "Work In Progress", header.assignedEmployee || "", header.expectedDeliveryDate || "", header.deliveryDate || "", header.deliveryNotes || "",
            header.createdBy || "admin", header.createdDate || "", header.createdTime || "", header.lastEditedBy || "", header.lastEditedDate || "", header.lastEditedTime || "", header.lastEditedTimestamp || "",
            header.isSoftDeleted ? 1 : 0, header.agentId || "", header.agentName || "", header.referralAgentId || "", header.referralAgentName || "", header.referralAgentCategory || "", header.referralAgentType || "",
            Number(header.grossAmount) || 0, header.promoCode || "", Number(header.promoDiscountAmount) || 0, Number(header.cancellationPercentage) || 0, Number(header.cancellationDeduction) || 0, Number(header.refundAmount) || 0,
            Number(header.companyRetainedAmount) || 0, header.deletedBy || "", header.deletedDate || "", header.gstEnabled ? 1 : 0, header.gstType || "No GST", header.customerGstNo || "", header.customerBusinessName || "",
            header.customerBusinessAddress || "", header.customerState || "", header.customerStateCode || "", Number(header.cgstPercentage) || 0, Number(header.sgstPercentage) || 0, Number(header.igstPercentage) || 0,
            Number(header.cgstAmount) || 0, Number(header.sgstAmount) || 0, Number(header.igstAmount) || 0, Number(header.taxAmount) || 0, header.paymentType || "Full Payment", header.paymentStatus || "Paid", Number(header.amountPaid) || 0, Number(header.balanceDue) || 0,
            header.balanceCollectionStatus || "Pending", header.customerSecondaryPhone || "", header.customerSecondaryContactName || "", header.notes || "", header.clientNotes || "", header.orderNotes || "", header.autoNo || "", header.driverName || ""
          );

          // Delete existing line items if overwrite/update
          await db.run("DELETE FROM invoice_items WHERE invoiceNo = ?", header.invoiceNo);

          // Insert Line Items
          for (const item of items) {
            await db.run(`
              INSERT INTO invoice_items (
                invoiceId, invoiceNo, productId, productName, variant, quantity, unitPrice, amount, 
                selectedColor, hsnCode, hierarchyNodeId, skuId, hierarchyPath, skuCode,
                isCombo, comboItems
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
              header.invoiceId || header.invoiceNo, header.invoiceNo, item.productId, item.productName, item.variant || "",
              Number(item.quantity) || 0, Number(item.unitPrice) || 0, Number(item.amount) || 0,
              item.selectedColor || "", item.hsnCode || "", item.hierarchyNodeId || "", item.skuId || "", item.hierarchyPath || "", item.skuCode || "",
              item.isCombo ? 1 : 0, item.comboItems ? JSON.stringify(item.comboItems) : null
            );
          }

          // Auto-save Customer Profile if walk-in name is not generic
          if (header.customerName && header.customerName !== "Walk-in Customer") {
            const customerMobileClean = String(header.mobile).replace(/\D/g, "");
            const existing = await db.get("SELECT mobile FROM customers WHERE mobile = ?", customerMobileClean);
            if (!existing) {
              const customerId = "CUST-" + Math.floor(1000 + Math.random() * 9000);
              await db.run(`
                INSERT INTO customers (id, name, mobile, address, secondaryMobile, secondaryContactName, notes, addressHistory)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `,
                customerId, header.customerName, customerMobileClean, header.customerBusinessAddress || "",
                header.customerSecondaryPhone || "", header.customerSecondaryContactName || "",
                header.notes || "", "[]"
              );
            }
          }

          // Increment nextInvoiceNumber Counter
          const currentCounter = await db.get("SELECT value FROM settings WHERE key = 'nextInvoiceNumber'");
          if (currentCounter) {
            const val = parseInt(currentCounter.value) || 1000;
            await db.run("UPDATE settings SET value = ? WHERE key = 'nextInvoiceNumber'", (val + 1).toString());
          }

          await db.run("COMMIT;");
          return res.json({ success: true, message: `✓ Invoice ${header.invoiceNo} successfully created on SQLite` });
        } catch (txErr: any) {
          await db.run("ROLLBACK;");
          throw txErr;
        }
      }

      if (action === "updateInvoiceStatus") {
        await db.run(`
          UPDATE invoices SET
            status = ?,
            lastEditedDate = ?,
            lastEditedBy = ?
          WHERE invoiceId = ? OR invoiceNo = ?
        `,
          data.status,
          data.lastUpdated,
          data.updatedBy,
          data.invoiceId || data.invoiceNo,
          data.invoiceId || data.invoiceNo
        );
        return res.json({ success: true, message: "Invoice status updated successfully" });
      }

      if (action === "saveSettings") {
        for (const key of Object.keys(data)) {
          let value = data[key];
          if (typeof value === "object") {
            value = JSON.stringify(value);
          }
          await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", key, String(value));
        }
        return res.json({ success: true, message: "Settings saved successfully" });
      }

      if (action === "upsertAgent") {
        await db.run(`
          INSERT OR REPLACE INTO agents (
            id, name, agentType, commissionPercentage, mobile, email, status, notes, createdDate
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          data.id, data.name, data.agentType || "", Number(data.commissionPercentage) || 0,
          data.mobile || "", data.email || "", data.status || "Active", data.notes || "", data.createdDate || ""
        );
        return res.json({ success: true, message: "Agent upserted successfully" });
      }

      if (action === "deleteAgent") {
        await db.run("DELETE FROM agents WHERE id = ?", data.id || data);
        return res.json({ success: true, message: "Agent deleted successfully" });
      }

      if (action === "recordPaymentTransaction") {
        await db.run("BEGIN TRANSACTION;");
        try {
          await db.run(`
            INSERT OR REPLACE INTO payment_transactions (
              id, invoiceId, date, amount, collectedBy, notes
            ) VALUES (?, ?, ?, ?, ?, ?)
          `,
            data.transactionId || data.id, data.invoiceId || data.invoiceNo, data.date + " " + (data.time || ""),
            Number(data.amount) || 0, data.collectedBy, data.notes || ""
          );

          await db.run(`
            UPDATE invoices SET
              amountPaid = ?,
              balanceDue = ?,
              paymentStatus = ?,
              paymentType = ?,
              lastEditedDate = ?,
              lastEditedBy = ?
            WHERE invoiceId = ? OR invoiceNo = ?
          `,
            Number(data.newAmountPaid), Number(data.newBalanceDue), data.newPaymentStatus, data.newPaymentType,
            data.date + " " + (data.time || ""), data.collectedBy, data.invoiceId || data.invoiceNo, data.invoiceId || data.invoiceNo
          );

          await db.run("COMMIT;");
          return res.json({ success: true, message: "Payment transaction recorded successfully" });
        } catch (txErr: any) {
          await db.run("ROLLBACK;");
          throw txErr;
        }
      }

      throw new Error(`Action "${action}" is not supported locally`);
    } catch (err: any) {
      console.error("Local SQLite Sync Error:", err);
      res.status(500).json({ success: false, message: err.message || err.toString() });
    }
  });

  // API Route: Backup SQLite Database to Google Sheets
  app.post("/api/backup", async (req, res) => {
    try {
      const db = await getDb();
      let { appsScriptUrl, spreadsheetId } = req.body;

      if (!appsScriptUrl || !spreadsheetId) {
        if (fs.existsSync(CONFIG_FILE)) {
          const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
          appsScriptUrl = appsScriptUrl || config.appsScriptUrl;
          spreadsheetId = spreadsheetId || config.spreadsheetId;
        }
      }

      if (!appsScriptUrl || !spreadsheetId) {
        return res.status(400).json({ success: false, message: "Google Sheets connection credentials (URL and Spreadsheet ID) are not configured." });
      }

      // Read all tables from SQLite
      const products = await db.all("SELECT * FROM products");
      const customers = await db.all("SELECT * FROM customers");
      const invoices = await db.all("SELECT * FROM invoices");
      const invoiceItems = await db.all("SELECT * FROM invoice_items");
      const agents = await db.all("SELECT * FROM agents");
      const settings = await db.all("SELECT * FROM settings");
      const paymentTransactions = await db.all("SELECT * FROM payment_transactions");
      const counters = await db.all("SELECT * FROM invoice_counters");

      // Split invoices into GST and NON-GST tables
      const invoicesGst = invoices.filter(i => i.invoiceCategory === "GST").map(i => mapRow(i, invoiceMappingReverse));
      const invoicesNonGst = invoices.filter(i => i.invoiceCategory !== "GST").map(i => mapRow(i, invoiceMappingReverse));

      const backupPayload = {
        Products: products.map(p => mapRow(p, productMappingReverse)),
        Customers: customers.map(c => mapRow(c, customerMappingReverse)),
        Invoices_GST: invoicesGst,
        Invoices_NON_GST: invoicesNonGst,
        InvoiceItems: invoiceItems.map(item => mapRow(item, invoiceItemMappingReverse)),
        Agents: agents.map(a => mapRow(a, agentMappingReverse)),
        Settings: settings.map(s => mapRow(s, settingMappingReverse)),
        PaymentTransactions: paymentTransactions.map(p => mapRow(p, paymentTransactionMappingReverse)),
        InvoiceCounters: counters.map(c => ({ "Counter Name": c.counterName, "Current Value": c.currentValue, "Last Updated": c.lastUpdated }))
      };

      // POST to Google Apps Script Web App
      const response = await fetch(appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "backupDatabase",
          spreadsheetId,
          data: backupPayload
        })
      });

      if (!response.ok) {
        throw new Error(`Backup server returned HTTP status: ${response.status}`);
      }

      const resText = await response.text();
      const result = JSON.parse(resText);

      if (!result.success) {
        throw new Error(result.message || "Spreadsheet rejected backup payload.");
      }

      res.json({ success: true, message: "✓ SQLite database successfully backed up to Google Sheets." });
    } catch (err: any) {
      console.error("Backup Error:", err);
      res.status(500).json({ success: false, message: err.message || err.toString() });
    }
  });

  // API Route: Restore local SQLite Database from Google Sheets
  app.post("/api/restore", async (req, res) => {
    try {
      const db = await getDb();
      let { appsScriptUrl, spreadsheetId } = req.body;

      if (!appsScriptUrl || !spreadsheetId) {
        if (fs.existsSync(CONFIG_FILE)) {
          const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
          appsScriptUrl = appsScriptUrl || config.appsScriptUrl;
          spreadsheetId = spreadsheetId || config.spreadsheetId;
        }
      }

      if (!appsScriptUrl || !spreadsheetId) {
        return res.status(400).json({ success: false, message: "Google Sheets connection credentials (URL and Spreadsheet ID) are not configured." });
      }

      // Sync Pull from Google Sheets Web App
      const payload = {
        action: "syncPull",
        spreadsheetId,
        sheetsMapping: {
          products: "Products",
          customers: "Customers",
          invoices: "Invoices",
          invoiceItems: "InvoiceItems",
          settings: "Settings",
          agents: "Agents",
          paymentTransactions: "PaymentTransactions"
        }
      };

      const response = await fetch(appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Restore server returned HTTP status: ${response.status}`);
      }

      const resText = await response.text();
      const result = JSON.parse(resText);

      if (!result.success) {
        throw new Error(result.message || "Spreadsheet rejected restore sync Pull.");
      }

      // Overwrite SQLite database in a transaction
      await db.run("BEGIN TRANSACTION;");
      try {
        // Clear all tables
        await db.run("DELETE FROM products");
        await db.run("DELETE FROM customers");
        await db.run("DELETE FROM invoices");
        await db.run("DELETE FROM invoice_items");
        await db.run("DELETE FROM agents");
        await db.run("DELETE FROM settings");
        await db.run("DELETE FROM payment_transactions");

        // Insert products
        const productsList = result.products || [];
        for (const item of productsList) {
          await db.run(`
            INSERT OR REPLACE INTO products (
              id, name, category, unit, price, inventoryType, color, material, brand, vendor, 
              purchaseCost, sellingPrice, unitsSold, revenueGenerated, lastSoldDate, stockAvailable, 
              productionTime, notes, sku, warranty, size, weight, imageUrl, status, parentId, 
              isLeaf, level, nodeType, hierarchyPath, inventorySkus, colorVariants, attributes, selectedOptions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
            item.id, item.name, item.category || "", item.unit || "", Number(item.price) || 0, item.inventoryType || "Stock Item",
            item.color || "", item.material || "", item.brand || "", item.vendor || "",
            item.purchaseCost !== undefined ? Number(item.purchaseCost) : null,
            item.sellingPrice !== undefined ? Number(item.sellingPrice) : null,
            item.unitsSold !== undefined ? Number(item.unitsSold) : null,
            item.revenueGenerated !== undefined ? Number(item.revenueGenerated) : null,
            item.lastSoldDate || "",
            item.stockAvailable !== undefined ? Number(item.stockAvailable) : null,
            item.productionTime || "", item.notes || "", item.sku || "", item.warranty || "",
            item.size || "", item.weight || "", item.imageUrl || "", item.status || "Active",
            item.parentId || null, item.isLeaf ? 1 : 0, Number(item.level) || 1, item.nodeType || "", item.hierarchyPath || "",
            item.inventorySkus ? JSON.stringify(item.inventorySkus) : "[]",
            item.colorVariants ? JSON.stringify(item.colorVariants) : "[]",
            item.attributes ? JSON.stringify(item.attributes) : "[]",
            item.selectedOptions ? JSON.stringify(item.selectedOptions) : "{}"
          );
        }

        // Insert customers
        const customersList = result.customers || [];
        for (const item of customersList) {
          const customerMobileClean = String(item.mobile).replace(/\D/g, "");
          await db.run(`
            INSERT OR REPLACE INTO customers (
              id, name, mobile, address, secondaryMobile, secondaryContactName, notes, addressHistory
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
            item.id, item.name, customerMobileClean, item.address || "", item.secondaryPhone || "",
            item.secondaryContactName || "", item.notes || "",
            item.addressHistory ? JSON.stringify(item.addressHistory) : "[]"
          );
        }

        // Insert invoices
        const invoicesList = result.invoices || [];
        for (const header of invoicesList) {
          await db.run(`
            INSERT OR REPLACE INTO invoices (
              invoiceId, invoiceNo, invoiceCategory, date, invoiceDate, invoiceTime, createdTimestamp, 
              customerName, mobile, customerPrimaryPhone, itemCount, subtotal, discount, roAdjustment, 
              grandTotal, status, assignedEmployee, expectedDeliveryDate, deliveryDate, deliveryNotes, 
              createdBy, createdDate, createdTime, lastEditedBy, lastEditedDate, lastEditedTime, lastEditedTimestamp, 
              isSoftDeleted, agentId, agentName, referralAgentId, referralAgentName, referralAgentCategory, referralAgentType, 
              grossAmount, promoCode, promoDiscountAmount, cancellationPercentage, cancellationDeduction, refundAmount, 
              companyRetainedAmount, deletedBy, deletedDate, gstEnabled, gstType, customerGstNo, customerBusinessName, 
              customerBusinessAddress, customerState, customerStateCode, cgstPercentage, sgstPercentage, igstPercentage, 
              cgstAmount, sgstAmount, igstAmount, taxAmount, paymentType, paymentStatus, amountPaid, balanceDue, 
              balanceCollectionStatus, customerSecondaryPhone, customerSecondaryContactName, notes, clientNotes, orderNotes, autoNo, driverName
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
          `,
            header.invoiceId || header.invoiceNo, header.invoiceNo, header.invoiceCategory || "NON_GST", header.date, header.invoiceDate || "", header.invoiceTime || "", header.createdTimestamp || "",
            header.customerName, header.mobile, header.customerPrimaryPhone || "", Number(header.itemCount) || 0, Number(header.subtotal) || 0, Number(header.discount) || 0, Number(header.roAdjustment) || 0,
            Number(header.grandTotal) || 0, header.status || "Work In Progress", header.assignedEmployee || "", header.expectedDeliveryDate || "", header.deliveryDate || "", header.deliveryNotes || "",
            header.createdBy || "admin", header.createdDate || "", header.createdTime || "", header.lastEditedBy || "", header.lastEditedDate || "", header.lastEditedTime || "", header.lastEditedTimestamp || "",
            header.isSoftDeleted ? 1 : 0, header.agentId || "", header.agentName || "", header.referralAgentId || "", header.referralAgentName || "", header.referralAgentCategory || "", header.referralAgentType || "",
            Number(header.grossAmount) || 0, header.promoCode || "", Number(header.promoDiscountAmount) || 0, Number(header.cancellationPercentage) || 0, Number(header.cancellationDeduction) || 0, Number(header.refundAmount) || 0,
            Number(header.companyRetainedAmount) || 0, header.deletedBy || "", header.deletedDate || "", header.gstEnabled ? 1 : 0, header.gstType || "No GST", header.customerGstNo || "", header.customerBusinessName || "",
            header.customerBusinessAddress || "", header.customerState || "", header.customerStateCode || "", Number(header.cgstPercentage) || 0, Number(header.sgstPercentage) || 0, Number(header.igstPercentage) || 0,
            Number(header.cgstAmount) || 0, Number(header.sgstAmount) || 0, Number(header.igstAmount) || 0, Number(header.taxAmount) || 0, header.paymentType || "Full Payment", header.paymentStatus || "Paid", Number(header.amountPaid) || 0, Number(header.balanceDue) || 0,
            header.balanceCollectionStatus || "Pending", header.customerSecondaryPhone || "", header.customerSecondaryContactName || "", header.notes || "", header.clientNotes || "", header.orderNotes || "", header.autoNo || "", header.driverName || ""
          );
        }

        // Insert invoice items
        const invoiceItemsList = result.invoiceItems || [];
        for (const item of invoiceItemsList) {
          await db.run(`
            INSERT INTO invoice_items (
              invoiceId, invoiceNo, productId, productName, variant, quantity, unitPrice, amount, 
              selectedColor, hsnCode, hierarchyNodeId, skuId, hierarchyPath, skuCode,
              isCombo, comboItems
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
            item.invoiceId || item.invoiceNo, item.invoiceNo, item.productId, item.productName, item.variant || "",
            Number(item.quantity) || 0, Number(item.unitPrice) || 0, Number(item.amount) || 0,
            item.selectedColor || "", item.hsnCode || "", item.hierarchyNodeId || "", item.skuId || "", item.hierarchyPath || "", item.skuCode || "",
            item.isCombo ? 1 : 0, item.comboItems ? JSON.stringify(item.comboItems) : null
          );
        }

        // Insert agents
        const agentsList = result.agents || [];
        for (const item of agentsList) {
          await db.run(`
            INSERT OR REPLACE INTO agents (
              id, name, agentType, commissionPercentage, mobile, email, status, notes, createdDate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
            item.id, item.name, item.agentType || "", Number(item.commissionPercentage) || 0,
            item.mobile || "", item.email || "", item.status || "Active", item.notes || "", item.createdDate || ""
          );
        }

        // Insert settings
        const settingsList = result.settings || [];
        for (const item of settingsList) {
          await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", item.key, String(item.value));
        }

        // Insert payment transactions
        const paymentTransactionsList = result.paymentTransactions || [];
        for (const item of paymentTransactionsList) {
          await db.run(`
            INSERT OR REPLACE INTO payment_transactions (
              id, invoiceId, date, amount, collectedBy, notes
            ) VALUES (?, ?, ?, ?, ?, ?)
          `,
            item.id, item.invoiceId || item.invoiceNo, item.date || "", Number(item.amount) || 0, item.collectedBy || "", item.notes || ""
          );
        }

        await db.run("COMMIT;");
        return res.json({ success: true, message: "✓ SQLite database successfully restored from Google Sheets backup!" });
      } catch (txErr: any) {
        await db.run("ROLLBACK;");
        throw txErr;
      }
    } catch (err: any) {
      console.error("Restore Error:", err);
      res.status(500).json({ success: false, message: err.message || err.toString() });
    }
  });

  // API Route: Smart Billing Insights (AI Assistant)
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, businessData } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "No prompt provided" });
      }

      if (!ai) {
        return res.status(503).json({
          error: "AI model not configured. Please ensure GEMINI_API_KEY is configured in Settings > Secrets.",
        });
      }

      const systemPrompt = `You are the "Smart Billing AI Assistant", a smart assistant integrated directly into the "Smart Billing System".
You are configured to analyze business sales, product categories, customer purchase history, and invoices to help the business owner manage operations efficiently.

Here is the current business snapshot in the system:
${JSON.stringify(businessData || {}, null, 2)}

Your tone should be highly professional, objective, supportive, and business-focused.
Provide scannable answers with bullet points when listing ideas or figures.
Never mention internal directory details or secrets. All insights should center on business performance, outstanding customers, sales metrics, or inventory optimization.`;

      const contents = `User query: ${prompt}`;

      // Call the requested high-thinking model gemini-3.1-pro-preview with HIGH thinking level
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: contents,
          config: {
            systemInstruction: systemPrompt,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.HIGH,
            },
          },
        });

        return res.json({ text: response.text });
      } catch (reasoningError: any) {
        // Fall back to gemini-3.5-flash if the user doesn't have a paid/active key or is rate-limited on the preview model
        console.log("Model quota or fallback triggered. Switching to gemini-3.5-flash...");
        const fallbackResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: contents,
          config: {
            systemInstruction: systemPrompt,
          },
        });
        return res.json({ text: fallbackResponse.text, fallbackUsed: true });
      }
    } catch (err: any) {
      console.error("AI Assistant Endpoint Error:", err);
      res.status(500).json({ error: err.message || "An error occurred with the AI model." });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Billing System custom server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start full-stack server:", error);
});
