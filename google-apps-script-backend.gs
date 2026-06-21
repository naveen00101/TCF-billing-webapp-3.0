/**
 * SMART BILLING SYSTEM backend script
 * -------------------------------------------
 * Target Platform: Google Sheets (Google Apps Script)
 * Instructions:
 * 1. Open Google Sheets (https://sheets.google.com) or create an empty sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Delete any default code in Code.gs and paste this entire script.
 * 4. Click Deploy > New Deployment.
 * 5. Choose Select type > Web app.
 * 6. Set:
 *    - Description: "Smart Billing Web App Link"
 *    - Execute as: "Me (your-email@gmail.com)"
 *    - Who has access: "Anyone"
 * 7. Click Deploy, Authorize access, and COPY the generated Web App URL.
 * 8. Paste the Web App URL into the "Settings" page of your App !
 */

// Handle CORS preflight by returning simple response
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Google Apps Script endpoint is online and ready for Smart Billing System calls."
  })).setMimeType(ContentService.MimeType.JSON);
}

// Main POST Router
function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var request = JSON.parse(rawData);
    var action = request.action;
    var spreadsheetId = request.spreadsheetId;
    var mapping = request.sheetsMapping || {};

    // 1. INITIALIZE DATABASE ACTION
    if (action === "initializeDatabase") {
      return initializeDatabase(request.spreadsheetId, request.companyName || "My Smart Billing");
    }

    // 1a. BACKUP DATABASE ACTION
    if (action === "backupDatabase") {
      var ss = SpreadsheetApp.openById(spreadsheetId);
      if (!ss) {
        throw new Error("Unable to open Spreadsheet. Verify Spreadsheet ID is accurate and permissions are correct.");
      }
      return backupDatabase(ss, request.data);
    }

    // Connect to spreadsheet
    var ss = SpreadsheetApp.openById(spreadsheetId);
    if (!ss) {
      throw new Error("Unable to open Spreadsheet. Verify Spreadsheet ID is accurate and permissions are correct.");
    }

    // 1b. UPDATE SCHEMA ACTION
    if (action === "updateDatabaseSchema") {
      return updateDatabaseSchema(ss);
    }

    // 2. CONNECTION TEST ACTION
    if (action === "testConnection") {
      return testConnection(ss, mapping);
    }

    // 3. SYNCHRONIZE PUSH AND PULL CONTROLS
    if (action === "syncPull") {
      return pullSpreadsheetData(ss, mapping);
    }

    if (action === "upsertProduct") {
      return upsertProductRow(ss, mapping.products || "Products", request.data);
    }

    if (action === "upsertProductsBatch") {
      return upsertProductsBatchRows(ss, mapping.products || "Products", request.data);
    }

    if (action === "deleteProduct") {
      return deleteProductRow(ss, mapping.products || "Products", request.data.id);
    }

    if (action === "upsertCustomer") {
      return upsertCustomerRow(ss, mapping.customers || "Customers", request.data);
    }

    if (action === "createInvoice") {
      return createFullInvoice(ss, mapping, request.data);
    }

    if (action === "updateInvoiceStatus") {
      return updateInvoiceStatusRow(ss, request.data);
    }

    if (action === "saveSettings") {
      return saveSettingsMap(ss, mapping.settings || "Settings", request.data);
    }

    if (action === "upsertAgent") {
      return upsertAgentRow(ss, mapping.agents || "Agents", request.data);
    }

    if (action === "deleteAgent") {
      return deleteAgentRow(ss, mapping.agents || "Agents", request.data.id);
    }

    if (action === "recordPaymentTransaction") {
      return recordPaymentTransaction(ss, mapping.paymentTransactions || "PaymentTransactions", request.data);
    }

    if (action === "generateInvoiceNumber") {
      var isGst = request.data.isGst;
      var prefix = request.data.prefix || "TCF-";
      var counterName = isGst ? "GST_COUNTER" : "NON_GST_COUNTER";
      var res = _getOrCreateCounter(ss, counterName, prefix, isGst);
      return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "repairCounters") {
      return repairCounters(ss);
    }

    throw new Error("Action service is not supported: " + action);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test Spreadsheet Connection
function testConnection(ss, mapping) {
  var sheetsFound = {};
  var required = ["products", "customers", "invoices", "invoiceItems", "settings", "agents"];
  
  required.forEach(function(key) {
    var sheetName = mapping[key] || getCapitalizedKey(key);
    var sheet = ss.getSheetByName(sheetName);
    sheetsFound[key] = (sheet !== null);
  });

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "✓ Spreadsheet Connected",
    spreadsheetName: ss.getName(),
    sheetsFound: sheetsFound
  })).setMimeType(ContentService.MimeType.JSON);
}

// Initialize a Spreadsheet safely
function initializeDatabase(existingSpreadsheetId, companyName) {
  var ssName = companyName + " Billing Database";
  var ss;
  var spreadsheetId = existingSpreadsheetId;
  
  if (spreadsheetId) {
    try {
      ss = SpreadsheetApp.openById(spreadsheetId);
    } catch (e) {
      // Failed to open existing, create new instead
      ss = SpreadsheetApp.create(ssName);
      spreadsheetId = ss.getId();
    }
  } else {
    ss = SpreadsheetApp.create(ssName);
    spreadsheetId = ss.getId();
  }

  // Protection Flag check
  var settingsSheet = ss.getSheetByName("Settings");
  if (settingsSheet) {
    var data = settingsSheet.getDataRange().getValues();
    for (var r = 0; r < data.length; r++) {
      if (data[r][0] === "DatabaseInitialized" && data[r][1] === true) {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          spreadsheetId: spreadsheetId,
          spreadsheetName: ss.getName(),
          message: "✓ Database is already initialized. Skipping recreation."
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }

  // Create required sheets and write columns
  var sheetsSetup = {
    "Products": ["Product ID", "Product Name", "Category", "Unit", "Price", "Inventory Type", "Color", "Material", "Brand", "Vendor", "Purchase Cost", "Selling Price", "Units Sold", "Revenue Generated", "Last Sold Date", "Stock Available", "Production Time", "Notes", "SKU", "Warranty", "Size", "Weight", "Image URL", "Status", "Parent ID", "Is Leaf", "Level", "Node Type", "Hierarchy Path", "Inventory SKUs JSON", "Color Variants JSON", "Attributes JSON", "Selected Options JSON"],
    "Customers": ["Customer ID", "Customer Name", "Mobile Number", "Address", "Secondary Mobile", "Secondary Contact Name", "Notes", "Address History JSON"],
    "Invoices_GST": ["Invoice ID", "Invoice Number", "Invoice Category", "Date", "Customer Name", "Mobile Number", "Item Count", "Subtotal", "Discount", "Grand Total", "Fulfillment Status", "Payment Type", "Amount Paid", "Balance Due", "Payment Status", "GST Type", "GST Amount", "Referral Agent ID", "Referral Agent Name", "Referral Agent Category", "Referral Agent Type", "Last Updated", "Updated By"],
    "Invoices_NON_GST": ["Invoice ID", "Invoice Number", "Invoice Category", "Date", "Customer Name", "Mobile Number", "Item Count", "Subtotal", "Discount", "Grand Total", "Fulfillment Status", "Payment Type", "Amount Paid", "Balance Due", "Payment Status", "GST Type", "GST Amount", "Referral Agent ID", "Referral Agent Name", "Referral Agent Category", "Referral Agent Type", "Last Updated", "Updated By"],
    "InvoiceItems": ["Invoice ID", "Invoice Number", "Product ID", "Product Name", "Variant", "Quantity", "Unit Price", "Line Total", "Hierarchy Node ID", "SKU ID", "Hierarchy Path", "SKU Code"],
    "Agents": ["Agent ID", "Agent Name", "Agent Category", "Commission Rate", "Phone Number", "Email", "Status", "Notes", "Created Date", "Created By"],
    "Settings": ["Key", "Value"],
    "PaymentTransactions": ["Transaction ID", "Invoice ID", "Date", "Amount", "Collected By", "Notes"],
    "InvoiceCounters": ["Counter Name", "Current Value", "Last Updated"],
    "CounterAuditLog": ["Date", "User", "Counter Type", "Old Value", "New Value", "Generated Invoice Number"]
  };

  for (var name in sheetsSetup) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      if (name === "Sheet1" || name === "Sheet 1") {
        sheet = ss.getSheets()[0];
        sheet.setName(name);
      } else {
        sheet = ss.insertSheet(name);
      }
    }
    sheet.clear();
    sheet.appendRow(sheetsSetup[name]);
    
    // Style header row bold with soft blue background
    var headerRange = sheet.getRange(1, 1, 1, sheetsSetup[name].length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#E0F2FE");
    headerRange.setHorizontalAlignment("left");
  }

  // Populate default settings rows
  if (!settingsSheet) settingsSheet = ss.getSheetByName("Settings");
  settingsSheet.appendRow(["invoicePrefix", "YR"]);
  settingsSheet.appendRow(["nextInvoiceNumber", "1001"]);
  settingsSheet.appendRow(["companyName", companyName]);
  settingsSheet.appendRow(["address", "Update Company Address Here"]);
  settingsSheet.appendRow(["phone", "+1 123 456 7890"]);
  settingsSheet.appendRow(["email", "contact@company.com"]);
  settingsSheet.appendRow(["gstNumber", ""]);
  settingsSheet.appendRow(["DatabaseInitialized", true]); // Protection Flag

  // Delete redundant sheets if exist
  var sheets = ss.getSheets();
  sheets.forEach(function(s) {
    if ((s.getName() === "Sheet1" || s.getName() === "Sheet 1") && ss.getSheets().length > 1) {
      ss.deleteSheet(s);
    }
  });

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    spreadsheetId: spreadsheetId,
    spreadsheetName: ss.getName(),
    message: "✓ Google Billing Spreadsheet created / initialized successfully."
  })).setMimeType(ContentService.MimeType.JSON);
}

// Update Database Schema Safely
function updateDatabaseSchema(ss) {
  var sheetsSetup = {
    "Products": ["Product ID", "Product Name", "Category", "Unit", "Price", "Inventory Type", "Color", "Material", "Brand", "Vendor", "Purchase Cost", "Selling Price", "Units Sold", "Revenue Generated", "Last Sold Date", "Stock Available", "Production Time", "Notes", "SKU", "Warranty", "Size", "Weight", "Image URL", "Status", "Parent ID", "Is Leaf", "Level", "Node Type", "Hierarchy Path", "Inventory SKUs JSON", "Color Variants JSON", "Attributes JSON", "Selected Options JSON"],
    "Customers": ["Customer ID", "Customer Name", "Mobile Number", "Address", "Secondary Mobile", "Secondary Contact Name", "Notes", "Address History JSON"],
    "Invoices_GST": ["Invoice ID", "Invoice Number", "Invoice Category", "Date", "Customer Name", "Mobile Number", "Item Count", "Subtotal", "Discount", "Grand Total", "Fulfillment Status", "Payment Type", "Amount Paid", "Balance Due", "Payment Status", "GST Type", "GST Amount", "Referral Agent ID", "Referral Agent Name", "Referral Agent Category", "Referral Agent Type", "Last Updated", "Updated By"],
    "Invoices_NON_GST": ["Invoice ID", "Invoice Number", "Invoice Category", "Date", "Customer Name", "Mobile Number", "Item Count", "Subtotal", "Discount", "Grand Total", "Fulfillment Status", "Payment Type", "Amount Paid", "Balance Due", "Payment Status", "GST Type", "GST Amount", "Referral Agent ID", "Referral Agent Name", "Referral Agent Category", "Referral Agent Type", "Last Updated", "Updated By"],
    "InvoiceItems": ["Invoice ID", "Invoice Number", "Product ID", "Product Name", "Variant", "Quantity", "Unit Price", "Line Total", "Hierarchy Node ID", "SKU ID", "Hierarchy Path", "SKU Code"],
    "Agents": ["Agent ID", "Agent Name", "Agent Category", "Commission Rate", "Phone Number", "Email", "Status", "Notes", "Created Date", "Created By"],
    "Settings": ["Key", "Value"],
    "PaymentTransactions": ["Transaction ID", "Invoice ID", "Date", "Amount", "Collected By", "Notes"],
    "InvoiceCounters": ["Counter Name", "Current Value", "Last Updated"],
    "CounterAuditLog": ["Date", "User", "Counter Type", "Old Value", "New Value", "Generated Invoice Number"]
  };

  var updates = [];

  for (var name in sheetsSetup) {
    var sheet = ss.getSheetByName(name);
    // Add missing worksheets
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(sheetsSetup[name]);
      updates.push("Added missing sheet: " + name);
      continue;
    }

    var data = sheet.getDataRange().getValues();
    if (data.length === 0) {
      sheet.appendRow(sheetsSetup[name]);
      updates.push("Added headers to empty sheet: " + name);
      continue;
    }

    var existingHeaders = data[0];
    var expectedHeaders = sheetsSetup[name];
    var missingHeaders = [];

    // Check for missing columns
    expectedHeaders.forEach(function(eh) {
      if (existingHeaders.indexOf(eh) === -1) {
        missingHeaders.push(eh);
      }
    });

    if (missingHeaders.length > 0) {
      missingHeaders.forEach(function(mh) {
        var newColIndex = existingHeaders.length + 1;
        sheet.getRange(1, newColIndex).setValue(mh);
        existingHeaders.push(mh);
      });
      updates.push("Added missing columns to " + name + ": " + missingHeaders.join(", "));
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: updates.length > 0 ? "Schema updated: " + updates.join("; ") : "Schema is up to date."
  })).setMimeType(ContentService.MimeType.JSON);
}

// Pull all sheets data as JSON
function pullSpreadsheetData(ss, mapping) {
  var products = getSheetDataAsObjects(ss, mapping.products || "Products", {
    "Product ID": "id",
    "Product Name": "name",
    "Category": "category",
    "Unit": "unit",
    "Price": "price",
    "Inventory Type": "inventoryType",
    "Color": "color",
    "Material": "material",
    "Brand": "brand",
    "Vendor": "vendor",
    "Purchase Cost": "purchaseCost",
    "Selling Price": "sellingPrice",
    "Units Sold": "unitsSold",
    "Revenue Generated": "revenueGenerated",
    "Last Sold Date": "lastSoldDate",
    "Stock Available": "stockAvailable",
    "Production Time": "productionTime",
    "Notes": "notes",
    "SKU": "sku",
    "Warranty": "warranty",
    "Size": "size",
    "Weight": "weight",
    "Image URL": "imageUrl",
    "Status": "status",
    "Parent ID": "parentId",
    "Is Leaf": "isLeaf",
    "Level": "level",
    "Node Type": "nodeType",
    "Hierarchy Path": "hierarchyPath",
    "Inventory SKUs JSON": "inventorySkusRaw",
    "Color Variants JSON": "colorVariantsRaw",
    "Attributes JSON": "attributesRaw",
    "Selected Options JSON": "selectedOptionsRaw"
  });

  // Parse JSON objects for products
  products = products.map(function(p) {
    if (p.inventorySkusRaw) {
      try { p.inventorySkus = JSON.parse(p.inventorySkusRaw); } catch(e) { p.inventorySkus = []; }
    } else {
      p.inventorySkus = [];
    }
    delete p.inventorySkusRaw;

    if (p.colorVariantsRaw) {
      try { p.colorVariants = JSON.parse(p.colorVariantsRaw); } catch(e) { p.colorVariants = []; }
    } else {
      p.colorVariants = [];
    }
    delete p.colorVariantsRaw;

    if (p.attributesRaw) {
      try { p.attributes = JSON.parse(p.attributesRaw); } catch(e) { p.attributes = []; }
    } else {
      p.attributes = [];
    }
    delete p.attributesRaw;

    if (p.selectedOptionsRaw) {
      try { p.selectedOptions = JSON.parse(p.selectedOptionsRaw); } catch(e) { p.selectedOptions = {}; }
    } else {
      p.selectedOptions = {};
    }
    delete p.selectedOptionsRaw;
    
    // Also correctly set variantsEnabled flag back for frontend backwards compatibility
    if ((p.inventorySkus && p.inventorySkus.length > 0) || (p.colorVariants && p.colorVariants.length > 0)) {
        p.variantsEnabled = true;
    }

    return p;
  });

  var customers = getSheetDataAsObjects(ss, mapping.customers || "Customers", {
    "Customer ID": "id",
    "Customer Name": "name",
    "Mobile Number": "mobile",
    "Address": "address",
    "Secondary Mobile": "secondaryPhone",
    "Secondary Contact Name": "secondaryContactName",
    "Notes": "notes",
    "Address History JSON": "addressHistoryRaw"
  });
  
  // Parse address history
  customers = customers.map(function(c) {
    if (c.addressHistoryRaw) {
      try {
        c.addressHistory = JSON.parse(c.addressHistoryRaw);
      } catch (e) {
        c.addressHistory = [];
      }
    } else {
      c.addressHistory = [];
    }
    delete c.addressHistoryRaw;
    return c;
  });

  var invoiceMapping = {
    "Invoice ID": "invoiceId",
    "Invoice Number": "invoiceNo",
    "Invoice Category": "invoiceCategory",
    "Date": "date",
    "Customer Name": "customerName",
    "Mobile Number": "mobile",
    "Item Count": "itemCount",
    "Subtotal": "subtotal",
    "Discount": "discount",
    "Grand Total": "grandTotal",
    "Fulfillment Status": "status",
    "Payment Type": "paymentType",
    "Amount Paid": "amountPaid",
    "Balance Due": "balanceDue",
    "Payment Status": "paymentStatus",
    "GST Type": "gstType",
    "GST Amount": "taxAmount",
    "Referral Agent ID": "referralAgentId",
    "Referral Agent Name": "referralAgentName",
    "Referral Agent Category": "referralAgentCategory",
    "Referral Agent Type": "referralAgentType",
    "Last Updated": "lastEditedDate",
    "Updated By": "lastEditedBy"
  };

  var invoicesGst = getSheetDataAsObjects(ss, "Invoices_GST", invoiceMapping);
  var invoicesNonGst = getSheetDataAsObjects(ss, "Invoices_NON_GST", invoiceMapping);
  var invoices = invoicesGst.concat(invoicesNonGst);

  var invoiceItems = getSheetDataAsObjects(ss, mapping.invoiceItems || "InvoiceItems", {
    "Invoice ID": "invoiceId",
    "Invoice Number": "invoiceNo",
    "Product ID": "productId",
    "Product Name": "productName",
    "Variant": "variant",
    "Quantity": "quantity",
    "Unit Price": "unitPrice",
    "Line Total": "amount",
    "Hierarchy Node ID": "hierarchyNodeId",
    "SKU ID": "skuId",
    "Hierarchy Path": "hierarchyPath",
    "SKU Code": "skuCode"
  });

  var agents = getSheetDataAsObjects(ss, mapping.agents || "Agents", {
    "Agent ID": "id",
    "Agent Name": "name",
    "Agent Category": "agentType",
    "Commission Rate": "commissionPercentage",
    "Phone Number": "mobile",
    "Email": "email",
    "Status": "status",
    "Notes": "notes",
    "Created Date": "createdDate"
  });

  var settings = getSheetDataAsObjects(ss, mapping.settings || "Settings", {
    "Key": "key",
    "Value": "value"
  });

  var paymentTransactions = getSheetDataAsObjects(ss, mapping.paymentTransactions || "PaymentTransactions", {
    "Transaction ID": "id",
    "Invoice ID": "invoiceId",
    "Date": "date",
    "Amount": "amount",
    "Collected By": "collectedBy",
    "Notes": "notes"
  });

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    products: products,
    customers: customers,
    invoices: invoices,
    invoiceItems: invoiceItems,
    agents: agents,
    settings: settings,
    paymentTransactions: paymentTransactions
  })).setMimeType(ContentService.MimeType.JSON);
}

// Upsert a Product row
function upsertProductRow(ss, sheetName, item) {
  var sheet = ss.getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  
  if (data.length === 0) {
    sheet.appendRow(["Product ID", "Product Name", "Category", "Unit", "Price", "Inventory Type", "Color", "Material", "Brand", "Vendor", "Purchase Cost", "Selling Price", "Units Sold", "Revenue Generated", "Last Sold Date", "Stock Available", "Production Time", "Notes", "SKU", "Warranty", "Size", "Weight", "Image URL", "Status", "Parent ID", "Is Leaf", "Level", "Node Type", "Hierarchy Path"]);
    data = [["Product ID", "Product Name", "Category", "Unit", "Price", "Inventory Type", "Color", "Material", "Brand", "Vendor", "Purchase Cost", "Selling Price", "Units Sold", "Revenue Generated", "Last Sold Date", "Stock Available", "Production Time", "Notes", "SKU", "Warranty", "Size", "Weight", "Image URL", "Status", "Parent ID", "Is Leaf", "Level", "Node Type", "Hierarchy Path"]];
  }

  var headers = data[0];
  var idColIdx = headers.indexOf("Product ID");
  
  if (idColIdx === -1) {
    // If not found, look for something similar
    for(var i=0; i<headers.length; i++) {
        if (headers[i].toString().toLowerCase() === "product id") idColIdx = i;
    }
    if (idColIdx === -1) throw new Error("Column 'Product ID' not found in Products sheet.");
  }
  
  // Try to find existing product
  for (var r = 1; r < data.length; r++) {
    if (data[r] && data[r][idColIdx] !== undefined && data[r][idColIdx].toString() === item.id.toString()) {
      var rowRange = sheet.getRange(r + 1, 1, 1, headers.length);
      var rowData = new Array(headers.length).fill("");
      
      headers.forEach(function(h, index) {
        if (h === "Product ID") rowData[index] = item.id;
        else if (h === "Product Name") rowData[index] = item.name;
        else if (h === "Category") rowData[index] = item.category || "";
        else if (h === "Unit") rowData[index] = item.unit || "";
        else if (h === "Price") rowData[index] = Number(item.price) || 0;
        else if (h === "Inventory Type") rowData[index] = item.inventoryType || "Ready Stock";
        else if (h === "Color") rowData[index] = item.color || "";
        else if (h === "Material") rowData[index] = item.material || "";
        else if (h === "Brand") rowData[index] = item.brand || "";
        else if (h === "Vendor") rowData[index] = item.vendor || "";
        else if (h === "Purchase Cost") rowData[index] = item.purchaseCost !== undefined ? Number(item.purchaseCost) : "";
        else if (h === "Selling Price") rowData[index] = item.sellingPrice !== undefined ? Number(item.sellingPrice) : "";
        else if (h === "Units Sold") rowData[index] = item.unitsSold !== undefined ? Number(item.unitsSold) : "";
        else if (h === "Revenue Generated") rowData[index] = item.revenueGenerated !== undefined ? Number(item.revenueGenerated) : "";
        else if (h === "Last Sold Date") rowData[index] = item.lastSoldDate || "";
        else if (h === "Stock Available") rowData[index] = item.stockAvailable !== undefined ? Number(item.stockAvailable) : "";
        else if (h === "Production Time") rowData[index] = item.productionTime || "";
        else if (h === "Notes") rowData[index] = item.notes || "";
        else if (h === "SKU") rowData[index] = item.sku || "";
        else if (h === "Warranty") rowData[index] = item.warranty || "";
        else if (h === "Size") rowData[index] = item.size || "";
        else if (h === "Weight") rowData[index] = item.weight || "";
        else if (h === "Image URL") rowData[index] = item.imageUrl || "";
        else if (h === "Status") rowData[index] = item.status || "Active";
        else if (h === "Parent ID") rowData[index] = item.parentId || "";
        else if (h === "Is Leaf") rowData[index] = item.isLeaf !== undefined ? Boolean(item.isLeaf) : "";
        else if (h === "Level") rowData[index] = item.level !== undefined ? Number(item.level) : "";
        else if (h === "Node Type") rowData[index] = item.nodeType || "";
        else if (h === "Hierarchy Path") rowData[index] = item.hierarchyPath || "";
        else if (h === "Inventory SKUs JSON") {
           rowData[index] = item.inventorySkus ? JSON.stringify(item.inventorySkus) : "[]";
        }
        else if (h === "Color Variants JSON") {
           rowData[index] = item.colorVariants ? JSON.stringify(item.colorVariants) : "[]";
        }
        else if (h === "Attributes JSON") {
           rowData[index] = item.attributes ? JSON.stringify(item.attributes) : "[]";
        }
        else if (h === "Selected Options JSON") {
           rowData[index] = item.selectedOptions ? JSON.stringify(item.selectedOptions) : "{}";
        }
        else rowData[index] = data[r][index];
      });
      
      rowRange.setValues([rowData]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Product updated successfully" })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Append new product
  var newRowData = new Array(headers.length).fill("");
  headers.forEach(function(h, index) {
      if (h === "Product ID") newRowData[index] = item.id;
      else if (h === "Product Name") newRowData[index] = item.name;
      else if (h === "Category") newRowData[index] = item.category || "";
      else if (h === "Unit") newRowData[index] = item.unit || "";
      else if (h === "Price") newRowData[index] = Number(item.price) || 0;
      else if (h === "Inventory Type") newRowData[index] = item.inventoryType || "Ready Stock";
      else if (h === "Color") newRowData[index] = item.color || "";
      else if (h === "Material") newRowData[index] = item.material || "";
      else if (h === "Brand") newRowData[index] = item.brand || "";
      else if (h === "Vendor") newRowData[index] = item.vendor || "";
      else if (h === "Purchase Cost") newRowData[index] = item.purchaseCost !== undefined ? Number(item.purchaseCost) : "";
      else if (h === "Selling Price") newRowData[index] = item.sellingPrice !== undefined ? Number(item.sellingPrice) : "";
      else if (h === "Units Sold") newRowData[index] = item.unitsSold !== undefined ? Number(item.unitsSold) : "";
      else if (h === "Revenue Generated") newRowData[index] = item.revenueGenerated !== undefined ? Number(item.revenueGenerated) : "";
      else if (h === "Last Sold Date") newRowData[index] = item.lastSoldDate || "";
      else if (h === "Stock Available") newRowData[index] = item.stockAvailable !== undefined ? Number(item.stockAvailable) : "";
      else if (h === "Production Time") newRowData[index] = item.productionTime || "";
      else if (h === "Notes") newRowData[index] = item.notes || "";
      else if (h === "SKU") newRowData[index] = item.sku || "";
      else if (h === "Warranty") newRowData[index] = item.warranty || "";
      else if (h === "Size") newRowData[index] = item.size || "";
      else if (h === "Weight") newRowData[index] = item.weight || "";
      else if (h === "Image URL") newRowData[index] = item.imageUrl || "";
      else if (h === "Status") newRowData[index] = item.status || "Active";
      else if (h === "Parent ID") newRowData[index] = item.parentId || "";
      else if (h === "Is Leaf") newRowData[index] = item.isLeaf !== undefined ? Boolean(item.isLeaf) : "";
      else if (h === "Level") newRowData[index] = item.level !== undefined ? Number(item.level) : "";
      else if (h === "Node Type") newRowData[index] = item.nodeType || "";
      else if (h === "Hierarchy Path") newRowData[index] = item.hierarchyPath || "";
      else if (h === "Inventory SKUs JSON") {
         newRowData[index] = item.inventorySkus ? JSON.stringify(item.inventorySkus) : "[]";
      }
      else if (h === "Color Variants JSON") {
         newRowData[index] = item.colorVariants ? JSON.stringify(item.colorVariants) : "[]";
      }
      else if (h === "Attributes JSON") {
         newRowData[index] = item.attributes ? JSON.stringify(item.attributes) : "[]";
      }
      else if (h === "Selected Options JSON") {
         newRowData[index] = item.selectedOptions ? JSON.stringify(item.selectedOptions) : "{}";
      }
  });
  
  sheet.appendRow(newRowData);
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Product saved successfully" })).setMimeType(ContentService.MimeType.JSON);
}

// Batch Product Rows Upsert Action
function upsertProductsBatchRows(ss, sheetName, items) {
  var sheet = ss.getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  
  if (data.length === 0) {
    sheet.appendRow(["Product ID", "Product Name", "Category", "Unit", "Price", "Inventory Type", "Color", "Material", "Brand", "Vendor", "Purchase Cost", "Selling Price", "Units Sold", "Revenue Generated", "Last Sold Date", "Stock Available", "Production Time", "Notes", "SKU", "Warranty", "Size", "Weight", "Image URL", "Status", "Parent ID", "Is Leaf", "Level", "Node Type", "Hierarchy Path", "Inventory SKUs JSON", "Color Variants JSON", "Attributes JSON", "Selected Options JSON"]);
    data = [["Product ID", "Product Name", "Category", "Unit", "Price", "Inventory Type", "Color", "Material", "Brand", "Vendor", "Purchase Cost", "Selling Price", "Units Sold", "Revenue Generated", "Last Sold Date", "Stock Available", "Production Time", "Notes", "SKU", "Warranty", "Size", "Weight", "Image URL", "Status", "Parent ID", "Is Leaf", "Level", "Node Type", "Hierarchy Path", "Inventory SKUs JSON", "Color Variants JSON", "Attributes JSON", "Selected Options JSON"]];
  }

  var headers = data[0];
  var idColIdx = headers.indexOf("Product ID");
  
  if (idColIdx === -1) {
    for (var i = 0; i < headers.length; i++) {
      if (headers[i].toString().toLowerCase() === "product id") idColIdx = i;
    }
    if (idColIdx === -1) throw new Error("Column 'Product ID' not found in Products sheet.");
  }
  
  // Build ID lookup maps for performance
  var idToRowMap = {};
  for (var r = 1; r < data.length; r++) {
    if (data[r] && data[r][idColIdx] !== undefined) {
      idToRowMap[data[r][idColIdx].toString()] = r + 1; // row index is index + 1
    }
  }

  items.forEach(function(item) {
    var existingRow = idToRowMap[item.id.toString()];
    var rowData = new Array(headers.length).fill("");
    
    headers.forEach(function(h, index) {
      if (h === "Product ID") rowData[index] = item.id;
      else if (h === "Product Name") rowData[index] = item.name;
      else if (h === "Category") rowData[index] = item.category || "";
      else if (h === "Unit") rowData[index] = item.unit || "";
      else if (h === "Price") rowData[index] = Number(item.price) || 0;
      else if (h === "Inventory Type") rowData[index] = item.inventoryType || "Ready Stock";
      else if (h === "Color") rowData[index] = item.color || "";
      else if (h === "Material") rowData[index] = item.material || "";
      else if (h === "Brand") rowData[index] = item.brand || "";
      else if (h === "Vendor") rowData[index] = item.vendor || "";
      else if (h === "Purchase Cost") rowData[index] = item.purchaseCost !== undefined ? Number(item.purchaseCost) : "";
      else if (h === "Selling Price") rowData[index] = item.sellingPrice !== undefined ? Number(item.sellingPrice) : "";
      else if (h === "Units Sold") rowData[index] = item.unitsSold !== undefined ? Number(item.unitsSold) : "";
      else if (h === "Revenue Generated") rowData[index] = item.revenueGenerated !== undefined ? Number(item.revenueGenerated) : "";
      else if (h === "Last Sold Date") rowData[index] = item.lastSoldDate || "";
      else if (h === "Stock Available") rowData[index] = item.stockAvailable !== undefined ? Number(item.stockAvailable) : "";
      else if (h === "Production Time") rowData[index] = item.productionTime || "";
      else if (h === "Notes") rowData[index] = item.notes || "";
      else if (h === "SKU") rowData[index] = item.sku || "";
      else if (h === "Warranty") rowData[index] = item.warranty || "";
      else if (h === "Size") rowData[index] = item.size || "";
      else if (h === "Weight") rowData[index] = item.weight || "";
      else if (h === "Image URL") rowData[index] = item.imageUrl || "";
      else if (h === "Status") rowData[index] = item.status || "Active";
      else if (h === "Parent ID") rowData[index] = item.parentId || "";
      else if (h === "Is Leaf") rowData[index] = item.isLeaf !== undefined ? Boolean(item.isLeaf) : "";
      else if (h === "Level") rowData[index] = item.level !== undefined ? Number(item.level) : "";
      else if (h === "Node Type") rowData[index] = item.nodeType || "";
      else if (h === "Hierarchy Path") rowData[index] = item.hierarchyPath || "";
      else if (h === "Inventory SKUs JSON") {
         rowData[index] = item.inventorySkus ? JSON.stringify(item.inventorySkus) : "[]";
      }
      else if (h === "Color Variants JSON") {
         rowData[index] = item.colorVariants ? JSON.stringify(item.colorVariants) : "[]";
      }
      else if (h === "Attributes JSON") {
         rowData[index] = item.attributes ? JSON.stringify(item.attributes) : "[]";
      }
      else if (h === "Selected Options JSON") {
         rowData[index] = item.selectedOptions ? JSON.stringify(item.selectedOptions) : "{}";
      }
    });

    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, headers.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
      idToRowMap[item.id.toString()] = sheet.getLastRow();
    }
  });

  return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Batch product rows upsert completed successfully (" + items.length + " items)" })).setMimeType(ContentService.MimeType.JSON);
}

// Delete a Product row
function deleteProductRow(ss, sheetName, productId) {
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    var data = sheet.getDataRange().getValues();
    var idColIdx = data[0].indexOf("Product ID");
    if (idColIdx !== -1) {
      for (var r = 1; r < data.length; r++) {
        if (data[r] && data[r][idColIdx] && data[r][idColIdx].toString() === productId.toString()) {
          sheet.deleteRow(r + 1);
          break;
        }
      }
    }
  }

  // Also remove corresponding rows from ProductVariants table if it exists
  var variantsSheet = ss.getSheetByName("ProductVariants") || ss.getSheetByName("Product Variants");
  if (variantsSheet) {
    var varData = variantsSheet.getDataRange().getValues();
    var varIdIdx = varData[0].indexOf("Product ID");
    if (varIdIdx !== -1) {
      // Loop backward to safely delete rows while walking indices
      for (var vr = varData.length - 1; vr >= 1; vr--) {
        if (varData[vr] && varData[vr][varIdIdx] && varData[vr][varIdIdx].toString() === productId.toString()) {
          variantsSheet.deleteRow(vr + 1);
        }
      }
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Product and associated variant records deleted" })).setMimeType(ContentService.MimeType.JSON);
}

// Upsert a Customer row
function upsertCustomerRow(ss, sheetName, customer) {
  if (!customer.address || customer.address.toString().trim() === "") {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Customer address is required." })).setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = ss.getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var mobColIdx = headers.indexOf("Mobile Number");
  var foundRow = -1;

  for (var r = 1; r < data.length; r++) {
    if (data[r][mobColIdx] !== undefined && data[r][mobColIdx].toString() === customer.mobile.toString()) {
      foundRow = r + 1;
      break;
    }
  }

  var newRowData = new Array(headers.length);
  for (var i = 0; i < headers.length; i++) newRowData[i] = "";

  headers.forEach(function(h, index) {
      if (h === "Customer ID") newRowData[index] = customer.id || "";
      else if (h === "Customer Name") newRowData[index] = customer.name || "";
      else if (h === "Mobile Number") newRowData[index] = customer.mobile || "";
      else if (h === "Address") newRowData[index] = customer.address || "";
      else if (h === "Secondary Mobile") newRowData[index] = customer.secondaryPhone || "";
      else if (h === "Secondary Contact Name") newRowData[index] = customer.secondaryContactName || "";
      else if (h === "Notes") newRowData[index] = customer.notes || "";
      else if (h === "Address History JSON") {
         newRowData[index] = customer.addressHistory ? JSON.stringify(customer.addressHistory) : "[]";
      }
  });

  if (foundRow > -1) {
    // Preserve existing data in unmapped columns
    for (var i = 0; i < headers.length; i++) {
        if (!newRowData[i] && newRowData[i] !== 0) {
            newRowData[i] = data[foundRow - 1][i] || "";
        }
    }
    sheet.getRange(foundRow, 1, 1, headers.length).setValues([newRowData]);
  } else {
    sheet.appendRow(newRowData);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Customer saved" })).setMimeType(ContentService.MimeType.JSON);
}

// Create Invoice Header + Line Items atomically
function createFullInvoice(ss, mapping, invoiceData) {
  var header = invoiceData.invoice;
  var items = invoiceData.items;

  var customerAddress = invoiceData.customerAddress || header.customerAddress || invoiceData.addressLocation || header.customerBusinessAddress || "";
  if (!customerAddress || customerAddress.toString().trim() === "") {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Customer address is required." })).setMimeType(ContentService.MimeType.JSON);
  }

  var category = header.invoiceCategory || "NON_GST";
  var sheetName = category === "GST" ? "Invoices_GST" : "Invoices_NON_GST";
  var invSheet = ss.getSheetByName(sheetName);
  var itemsSheet = ss.getSheetByName(mapping.invoiceItems || "InvoiceItems");
  var custSheet = ss.getSheetByName(mapping.customers || "Customers");
  var settingsSheet = ss.getSheetByName(mapping.settings || "Settings");

  // ["Invoice ID", "Invoice Number", "Invoice Category", "Date", "Customer Name", "Mobile Number", "Item Count", "Subtotal", "Discount", "Grand Total", "Fulfillment Status", "Payment Type", "Amount Paid", "Balance Due", "Payment Status", "GST Type", "GST Amount", "Referral Agent ID", "Referral Agent Name", "Referral Agent Category", "Referral Agent Type", "Last Updated", "Updated By"]
  invSheet.appendRow([
    header.invoiceId || header.invoiceNo,
    header.invoiceNo,
    category,
    header.date,
    header.customerName,
    header.mobile,
    Number(header.itemCount),
    Number(header.subtotal),
    Number(header.discount),
    Number(header.grandTotal),
    header.status || "Work In Progress",
    header.paymentType || "Full Payment",
    Number(header.amountPaid || 0),
    Number(header.balanceDue || 0),
    header.paymentStatus || "Paid",
    header.gstType || "No GST",
    Number(header.taxAmount || 0),
    header.referralAgentId || "",
    header.referralAgentName || "",
    header.referralAgentCategory || "",
    header.referralAgentType || "",
    (header.lastEditedDate && header.lastEditedTime) ? (header.lastEditedDate + " " + header.lastEditedTime) : (header.createdDate + " " + header.createdTime),
    header.lastEditedBy || header.createdBy || "admin"
  ]);

  // 2. Write line items
  // ["Invoice ID", "Invoice Number", "Product ID", "Product Name", "Variant", "Quantity", "Unit Price", "Line Total", "Hierarchy Node ID", "SKU ID", "Hierarchy Path", "SKU Code"]
  items.forEach(function(item) {
    itemsSheet.appendRow([
      header.invoiceId || header.invoiceNo,
      header.invoiceNo,
      item.productId,
      item.productName,
      item.variant || "",
      Number(item.quantity),
      Number(item.unitPrice),
      Number(item.amount),
      item.hierarchyNodeId || "",
      item.skuId || "",
      item.hierarchyPath || "",
      item.skuCode || ""
    ]);
  });

  // 3. Auto-save customer if not existing
  if (header.customerName && header.customerName !== "Walk-in Customer") {
    var custData = custSheet.getDataRange().getValues();
    var mobIdx = custData[0].indexOf("Mobile Number");
    var foundCust = false;
    for (var r = 1; r < custData.length; r++) {
      if (custData[r][mobIdx] !== undefined && custData[r][mobIdx].toString() === header.mobile.toString()) {
        foundCust = true;
        break;
      }
    }
    if (!foundCust) {
      var cHeaders = custData[0];
      var newC = new Array(cHeaders.length);
      for(var i=0; i<cHeaders.length; i++) newC[i] = "";
      cHeaders.forEach(function(ch, idx) {
        if(ch === "Customer ID") newC[idx] = "CUST-" + Math.floor(1000 + Math.random() * 9000);
        else if(ch === "Customer Name") newC[idx] = header.customerName;
        else if(ch === "Mobile Number") newC[idx] = header.mobile;
        else if(ch === "Address") newC[idx] = customerAddress;
        else if(ch === "Notes") newC[idx] = invoiceData.clientNotes || header.clientNotes || "";
        else if(ch === "Secondary Mobile") newC[idx] = invoiceData.secondaryPhone || header.secondaryPhone || "";
        else if(ch === "Secondary Contact Name") newC[idx] = invoiceData.secondaryContactName || header.secondaryContactName || "";
        else if(ch === "Address History JSON") newC[idx] = "[]";
      });
      custSheet.appendRow(newC);
    }
  }

  // 4. Update Settings - Increment invoice number
  var settingsData = settingsSheet.getDataRange().getValues();
  for (var r = 1; r < settingsData.length; r++) {
    if (settingsData[r][0] === "nextInvoiceNumber") {
      var currentVal = parseInt(settingsData[r][1]);
      settingsSheet.getRange(r + 1, 2).setValue(currentVal + 1);
      break;
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "✓ Invoice " + header.invoiceNo + " saved successfully on Google Sheets."
  })).setMimeType(ContentService.MimeType.JSON);
}

// Generic Helper: Get Sheet values mapped as Objects
function getSheetDataAsObjects(ss, sheetName, headerMapping) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length <= 1) return [];

  var headers = values[0];
  var results = [];

  for (var r = 1; r < values.length; r++) {
    var obj = {};
    var emptyRow = true;
    for (var c = 0; c < headers.length; c++) {
      var cellVal = values[r][c];
      if (cellVal !== "") emptyRow = false;
      var headerName = headers[c];
      var objectKey = headerMapping[headerName] || headerName;
      obj[objectKey] = cellVal;
    }
    if (!emptyRow) {
      results.push(obj);
    }
  }
  return results;
}

// Utility formatting helper
function getCapitalizedKey(key) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// Update an Invoice Status row by Invoice ID or Number
function updateInvoiceStatusRow(ss, data) {
  var sheetsToSearch = ["Invoices_GST", "Invoices_NON_GST"];
  var sheet = null;
  var values = [];
  var headers = [];
  var foundRowIdx = -1;
  var invoiceNoColIdx = -1;
  
  var targetInvId = (data.invoiceId || data.invoiceNo).toString().trim().toLowerCase();

  // Find index helper
  function findHeaderIndex(name) {
    var lower = name.toLowerCase().trim();
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i].toString().toLowerCase().trim();
      if (h === lower || h.replace(/\s+/g, "") === lower.replace(/\s+/g, "") || h.replace(/\./g, "") === lower.replace(/\./g, "")) {
        return i;
      }
    }
    return -1;
  }

  for (var s = 0; s < sheetsToSearch.length; s++) {
    var testSheet = ss.getSheetByName(sheetsToSearch[s]);
    if (!testSheet) continue;
    values = testSheet.getDataRange().getValues();
    if(values.length === 0) continue;
    headers = values[0];
    
    // Check Invoice ID primarily, fallback to Invoice No
    invoiceNoColIdx = findHeaderIndex("Invoice ID");
    if (invoiceNoColIdx === -1) invoiceNoColIdx = findHeaderIndex("Invoice No");
    if (invoiceNoColIdx === -1) invoiceNoColIdx = findHeaderIndex("Invoice Number");

    if(invoiceNoColIdx === -1) continue;

    for (var r = 1; r < values.length; r++) {
      if (values[r][invoiceNoColIdx] !== undefined && values[r][invoiceNoColIdx] !== null) {
        var sheetInvNo = values[r][invoiceNoColIdx].toString().trim().toLowerCase();
        if (sheetInvNo === targetInvId) {
          foundRowIdx = r + 1;
          sheet = testSheet;
          break;
        }
      }
    }
    if (foundRowIdx !== -1) break; // Found it
  }

  if (foundRowIdx === -1) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Invoice " + (data.invoiceId || data.invoiceNo) + " not found in Google Sheets."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var statusColIdx = findHeaderIndex("Fulfillment Status");
  if (statusColIdx === -1) statusColIdx = findHeaderIndex("Status");
  var lastUpdatedColIdx = findHeaderIndex("Last Updated");
  var updatedByColIdx = findHeaderIndex("Updated By");

  if (statusColIdx === -1) {
    statusColIdx = headers.length;
    headers.push("Fulfillment Status");
    sheet.getRange(1, statusColIdx + 1).setValue("Fulfillment Status").setFontWeight("bold").setBackground("#E0F2FE");
  }
  if (lastUpdatedColIdx === -1) {
    lastUpdatedColIdx = headers.length;
    headers.push("Last Updated");
    sheet.getRange(1, lastUpdatedColIdx + 1).setValue("Last Updated").setFontWeight("bold").setBackground("#E0F2FE");
  }
  if (updatedByColIdx === -1) {
    updatedByColIdx = headers.length;
    headers.push("Updated By");
    sheet.getRange(1, updatedByColIdx + 1).setValue("Updated By").setFontWeight("bold").setBackground("#E0F2FE");
  }

  var status = data.status;
  var lastUpdated = data.lastUpdated;
  var updatedBy = data.updatedBy;

  sheet.getRange(foundRowIdx, statusColIdx + 1).setValue(status);
  sheet.getRange(foundRowIdx, lastUpdatedColIdx + 1).setValue(lastUpdated);
  sheet.getRange(foundRowIdx, updatedByColIdx + 1).setValue(updatedBy);
  
  // Post-save validation: Re-read status to confirm it matches perfectly
  SpreadsheetApp.flush();
  var updatedVal = sheet.getRange(foundRowIdx, statusColIdx + 1).getValue().toString().trim();
  if (updatedVal.toLowerCase() !== status.toString().trim().toLowerCase()) {
    throw new Error("Validation Failed: Fulfillment Status in Google Sheets (found '" + updatedVal + "') does not match expected '" + status + "'.");
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "✓ Invoice " + (data.invoiceId || data.invoiceNo) + " status updated to " + status + " on Google Sheets."
  })).setMimeType(ContentService.MimeType.JSON);
}

// Upsert Settings Map
function saveSettingsMap(ss, sheetName, settingsMap) {
  var sheet = ss.getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  
  if (data.length === 0) {
    sheet.appendRow(["Key", "Value"]);
    data = [["Key", "Value"]];
  }
  
  var keyColIdx = data[0].indexOf("Key");
  var valColIdx = data[0].indexOf("Value");
  
  if (keyColIdx === -1 || valColIdx === -1) {
    throw new Error("Columns 'Key' or 'Value' not found in Settings sheet.");
  }
  
  var existingKeys = {};
  for (var r = 1; r < data.length; r++) {
    var k = data[r][keyColIdx];
    existingKeys[k] = r + 1;
  }
  
  for (var key in settingsMap) {
    var value = settingsMap[key];
    if (typeof value === "object") {
      value = JSON.stringify(value); // Important for cancellationRules and other objects
    }
    
    if (existingKeys[key]) {
      sheet.getRange(existingKeys[key], valColIdx + 1).setValue(value);
    } else {
      sheet.appendRow([key, value]);
      existingKeys[key] = sheet.getLastRow();
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Settings saved successfully" })).setMimeType(ContentService.MimeType.JSON);
}

// Upsert Agent Row
function upsertAgentRow(ss, sheetName, agent) {
  var sheet = ss.getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  
  if (data.length === 0) {
    sheet.appendRow(["Agent ID", "Agent Name", "Agent Category", "Commission Rate", "Phone Number", "Email", "Status", "Notes", "Created Date", "Created By"]);
    data = [["Agent ID", "Agent Name", "Agent Category", "Commission Rate", "Phone Number", "Email", "Status", "Notes", "Created Date", "Created By"]];
  }
  
  var headers = data[0];
  var idColIdx = headers.indexOf("Agent ID");
  
  if (idColIdx === -1) throw new Error("Column 'Agent ID' not found in Agents sheet.");
  
  // Try to find existing agent
  for (var r = 1; r < data.length; r++) {
    if (data[r] && data[r][idColIdx] === agent.id) {
      // Update existing
      var rowRange = sheet.getRange(r + 1, 1, 1, headers.length);
      var rowData = new Array(headers.length).fill("");
      
      headers.forEach(function(h, index) {
        if (h === "Agent ID") rowData[index] = agent.id;
        else if (h === "Agent Name") rowData[index] = agent.name;
        else if (h === "Agent Category") rowData[index] = agent.agentType;
        else if (h === "Commission Rate") rowData[index] = agent.commissionPercentage;
        else if (h === "Phone Number") rowData[index] = agent.mobile || "";
        else if (h === "Email") rowData[index] = agent.email || "";
        else if (h === "Status") rowData[index] = agent.status || "Active";
        else if (h === "Notes") rowData[index] = agent.notes || "";
        else if (h === "Created Date") rowData[index] = agent.createdDate || "";
        else if (h === "Created By") rowData[index] = "admin";
        else rowData[index] = data[r][index]; // keep existing for unknown
      });
      
      rowRange.setValues([rowData]);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "✓ Agent " + agent.name + " updated on Google Sheets."
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Append new agent
  var newRowData = new Array(headers.length).fill("");
  headers.forEach(function(h, index) {
    if (h === "Agent ID") newRowData[index] = agent.id;
    else if (h === "Agent Name") newRowData[index] = agent.name;
    else if (h === "Agent Category") newRowData[index] = agent.agentType;
    else if (h === "Commission Rate") newRowData[index] = agent.commissionPercentage;
    else if (h === "Phone Number") newRowData[index] = agent.mobile || "";
    else if (h === "Email") newRowData[index] = agent.email || "";
    else if (h === "Status") newRowData[index] = agent.status || "Active";
    else if (h === "Notes") newRowData[index] = agent.notes || "";
    else if (h === "Created Date") newRowData[index] = agent.createdDate || "";
    else if (h === "Created By") newRowData[index] = "admin";
  });
  
  sheet.appendRow(newRowData);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "✓ New agent " + agent.name + " saved to Google Sheets."
  })).setMimeType(ContentService.MimeType.JSON);
}

// Delete Agent Row
function deleteAgentRow(ss, sheetName, agentId) {
  var sheet = ss.getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  var idColIdx = data[0].indexOf("Agent ID");
  
  for (var r = 1; r < data.length; r++) {
    if (data[r] && data[r][idColIdx] === agentId) {
      sheet.deleteRow(r + 1);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "✓ Agent " + agentId + " removed from Google Sheets."
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Information: Agent not found on Google Sheets."
  })).setMimeType(ContentService.MimeType.JSON);
}

// Record Payment Transaction and Update Invoice atomically
function recordPaymentTransaction(ss, paymentSheetName, data) {
  var paySheet = ss.getSheetByName(paymentSheetName || "PaymentTransactions");
  if (!paySheet) {
    paySheet = ss.insertSheet(paymentSheetName || "PaymentTransactions");
    paySheet.appendRow(["Transaction ID", "Invoice ID", "Date", "Amount", "Collected By", "Notes"]);
    var headerRange = paySheet.getRange(1, 1, 1, 6);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#E0F2FE");
    headerRange.setHorizontalAlignment("left");
  }

  // Append payment transaction row
  paySheet.appendRow([
    data.transactionId || data.id,
    data.invoiceId || data.invoiceNo,
    data.date + " " + (data.time || ""),
    Number(data.amount) || 0,
    data.collectedBy,
    data.notes || ""
  ]);

  // Update Invoices sheet to reflect the new payment status
  var sheetsToSearch = ["Invoices_GST", "Invoices_NON_GST"];
  var invSheet = null;
  var invValues = [];
  var invHeaders = [];
  var foundRowIdx = -1;
  var invoiceNoColIdx = -1;
  
  var targetInvId = (data.invoiceId || data.invoiceNo).toString().trim().toLowerCase();

  function findHeaderIndex(name) {
    var lower = name.toLowerCase().trim();
    for (var i = 0; i < invHeaders.length; i++) {
      var h = invHeaders[i].toString().toLowerCase().trim();
      if (h === lower || h.replace(/\s+/g, "") === lower.replace(/\s+/g, "") || h.replace(/\./g, "") === lower.replace(/\./g, "")) {
        return i;
      }
    }
    return -1;
  }

  for (var s = 0; s < sheetsToSearch.length; s++) {
    var testSheet = ss.getSheetByName(sheetsToSearch[s]);
    if (!testSheet) continue;
    invValues = testSheet.getDataRange().getValues();
    if(invValues.length === 0) continue;
    invHeaders = invValues[0];
    
    // Check Invoice ID primarily, fallback to Invoice No
    invoiceNoColIdx = findHeaderIndex("Invoice ID");
    if (invoiceNoColIdx === -1) invoiceNoColIdx = findHeaderIndex("Invoice No");
    if (invoiceNoColIdx === -1) invoiceNoColIdx = findHeaderIndex("Invoice Number");

    if (invoiceNoColIdx === -1) continue;

    for (var r = 1; r < invValues.length; r++) {
      if (invValues[r][invoiceNoColIdx] !== undefined && invValues[r][invoiceNoColIdx] !== null) {
        var sheetInvNo = invValues[r][invoiceNoColIdx].toString().trim().toLowerCase();
        if (sheetInvNo === targetInvId) {
          foundRowIdx = r + 1;
          invSheet = testSheet;
          break;
        }
      }
    }
    if (foundRowIdx !== -1) break;
  }

  if (invSheet && foundRowIdx > -1) {
    var amountPaidColIdx = findHeaderIndex("Amount Paid");
    var balanceDueColIdx = findHeaderIndex("Balance Due");
    var paymentStatusColIdx = findHeaderIndex("Payment Status");
    var paymentTypeColIdx = findHeaderIndex("Payment Type");
    var lastUpdatedColIdx = findHeaderIndex("Last Updated");
    var updatedByColIdx = findHeaderIndex("Updated By");

    if (amountPaidColIdx > -1) invSheet.getRange(foundRowIdx, amountPaidColIdx + 1).setValue(Number(data.newAmountPaid));
    if (balanceDueColIdx > -1) invSheet.getRange(foundRowIdx, balanceDueColIdx + 1).setValue(Number(data.newBalanceDue));
    if (paymentStatusColIdx > -1) invSheet.getRange(foundRowIdx, paymentStatusColIdx + 1).setValue(data.newPaymentStatus);
    if (paymentTypeColIdx > -1) invSheet.getRange(foundRowIdx, paymentTypeColIdx + 1).setValue(data.newPaymentType);
    if (lastUpdatedColIdx > -1) invSheet.getRange(foundRowIdx, lastUpdatedColIdx + 1).setValue(data.date + " " + (data.time || ""));
    if (updatedByColIdx > -1) invSheet.getRange(foundRowIdx, updatedByColIdx + 1).setValue(data.collectedBy);
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "✓ Payment of ₹" + Number(data.amount).toFixed(2) + " collected successfully on Google Sheets."
  })).setMimeType(ContentService.MimeType.JSON);
}

// --- INVOICE COUNTER SYSTEM ---
function _getOrCreateCounter(ss, counterName, defaultPrefix, isGst) {
  var sheet = ss.getSheetByName("InvoiceCounters") || initializeCounters(ss);
  var auditSheet = ss.getSheetByName("CounterAuditLog");
  if(!auditSheet) {
    auditSheet = ss.insertSheet("CounterAuditLog");
    auditSheet.appendRow(["Date", "User", "Counter Type", "Old Value", "New Value", "Generated Invoice Number"]);
  }
  
  if (defaultPrefix.length > 0 && defaultPrefix.charAt(defaultPrefix.length - 1) !== "-") {
    defaultPrefix += "-";
  }

  // Use LockService for atomic operations
  var lock = LockService.getScriptLock();
  lock.waitLock(10000); // 10 seconds max wait
  
  try {
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    var currentValue = 0;
    
    for (var r = 1; r < data.length; r++) {
      if (data[r][0] === counterName) {
        rowIndex = r + 1;
        currentValue = parseInt(data[r][1], 10) || 0;
        break;
      }
    }
    
    // If counter not found, initialize it based on highest number found in invoices
    if (rowIndex === -1) {
      currentValue = _findHighestInvoiceNumber(ss, defaultPrefix + (isGst ? "G" : ""));
      if(currentValue < 1) currentValue = 1000;
      rowIndex = sheet.getLastRow() + 1;
      sheet.appendRow([counterName, currentValue, new Date()]);
    }
    
    // Generate next invoice
    var newValue = currentValue + 1;
    var generatedInvoiceNumber = defaultPrefix + (isGst ? "G-" : "") + newValue;
    
    // Update counter
    sheet.getRange(rowIndex, 2).setValue(newValue);
    sheet.getRange(rowIndex, 3).setValue(new Date());
    
    // Audit log
    if (auditSheet) {
      auditSheet.appendRow([new Date(), Session.getActiveUser().getEmail() || "admin", counterName, currentValue, newValue, generatedInvoiceNumber]);
    }
    
    return { success: true, invoiceNumber: generatedInvoiceNumber, counter: newValue };
  } finally {
    lock.releaseLock();
  }
}

function _findHighestInvoiceNumber(ss, matchPrefix) {
  var invSheet = ss.getSheetByName("Invoices");
  if (!invSheet) return 1000;
  
  var data = invSheet.getDataRange().getValues();
  if (data.length <= 1) return 1000;
  
  var maxNum = 0;
  for (var i = 1; i < data.length; i++) {
    var invNo = data[i][0] ? data[i][0].toString() : "";
    if (invNo.indexOf(matchPrefix) === 0) {
      var parts = invNo.split("-");
      var numPart = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }
  return maxNum;
}

function initializeCounters(ss) {
  var existing = ss.getSheetByName("InvoiceCounters");
  if (!existing) {
    existing = ss.insertSheet("InvoiceCounters");
    existing.appendRow(["Counter Name", "Current Value", "Last Updated"]);
  }
  return existing;
}

function repairCounters(ss) {
  var settingsSheet = ss.getSheetByName("Settings");
  var defaultPrefix = "TCF";
  if (settingsSheet) {
    var sData = settingsSheet.getDataRange().getValues();
    for (var s = 1; s < sData.length; s++) {
      if (sData[s][0] === "invoicePrefix") {
        defaultPrefix = sData[s][1];
      }
    }
  }
  
  if(defaultPrefix.charAt(defaultPrefix.length - 1) !== "-") {
    defaultPrefix += "-";
  }

  var gstMax = _findHighestInvoiceNumber(ss, defaultPrefix + "G");
  var nonGstMax = _findHighestInvoiceNumber(ss, defaultPrefix);
  
  if(gstMax === 0) gstMax = 1000;
  if(nonGstMax === 0) nonGstMax = 1000;

  var sheet = ss.getSheetByName("InvoiceCounters") || initializeCounters(ss);
  
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    var data = sheet.getDataRange().getValues();
    
    var gstFound = false;
    var nonGstFound = false;
    
    for (var r = 1; r < data.length; r++) {
      if (data[r][0] === "GST_COUNTER") {
        sheet.getRange(r + 1, 2).setValue(gstMax);
        sheet.getRange(r + 1, 3).setValue(new Date());
        gstFound = true;
      } else if (data[r][0] === "NON_GST_COUNTER") {
        sheet.getRange(r + 1, 2).setValue(nonGstMax);
        sheet.getRange(r + 1, 3).setValue(new Date());
        nonGstFound = true;
      }
    }
    
    if (!gstFound) {
      sheet.appendRow(["GST_COUNTER", gstMax, new Date()]);
    }
    if (!nonGstFound) {
      sheet.appendRow(["NON_GST_COUNTER", nonGstMax, new Date()]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Counters repaired successfully."
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Bulk overwrite sheets for backup
function backupDatabase(ss, backupData) {
  try {
    var sheetsSetup = {
      "Products": ["Product ID", "Product Name", "Category", "Unit", "Price", "Inventory Type", "Color", "Material", "Brand", "Vendor", "Purchase Cost", "Selling Price", "Units Sold", "Revenue Generated", "Last Sold Date", "Stock Available", "Production Time", "Notes", "SKU", "Warranty", "Size", "Weight", "Image URL", "Status", "Parent ID", "Is Leaf", "Level", "Node Type", "Hierarchy Path", "Inventory SKUs JSON", "Color Variants JSON", "Attributes JSON", "Selected Options JSON"],
      "Customers": ["Customer ID", "Customer Name", "Mobile Number", "Address", "Secondary Mobile", "Secondary Contact Name", "Notes", "Address History JSON"],
      "Invoices_GST": ["Invoice ID", "Invoice Number", "Invoice Category", "Date", "Customer Name", "Mobile Number", "Item Count", "Subtotal", "Discount", "Grand Total", "Fulfillment Status", "Payment Type", "Amount Paid", "Balance Due", "Payment Status", "GST Type", "GST Amount", "Referral Agent ID", "Referral Agent Name", "Referral Agent Category", "Referral Agent Type", "Last Updated", "Updated By"],
      "Invoices_NON_GST": ["Invoice ID", "Invoice Number", "Invoice Category", "Date", "Customer Name", "Mobile Number", "Item Count", "Subtotal", "Discount", "Grand Total", "Fulfillment Status", "Payment Type", "Amount Paid", "Balance Due", "Payment Status", "GST Type", "GST Amount", "Referral Agent ID", "Referral Agent Name", "Referral Agent Category", "Referral Agent Type", "Last Updated", "Updated By"],
      "InvoiceItems": ["Invoice ID", "Invoice Number", "Product ID", "Product Name", "Variant", "Quantity", "Unit Price", "Line Total", "Hierarchy Node ID", "SKU ID", "Hierarchy Path", "SKU Code"],
      "Agents": ["Agent ID", "Agent Name", "Agent Category", "Commission Rate", "Phone Number", "Email", "Status", "Notes", "Created Date", "Created By"],
      "Settings": ["Key", "Value"],
      "PaymentTransactions": ["Transaction ID", "Invoice ID", "Date", "Amount", "Collected By", "Notes"],
      "InvoiceCounters": ["Counter Name", "Current Value", "Last Updated"]
    };

    for (var name in sheetsSetup) {
      var sheet = ss.getSheetByName(name);
      if (!sheet) {
        sheet = ss.insertSheet(name);
      }
      sheet.clear();
      sheet.appendRow(sheetsSetup[name]);
      
      // Style header row bold with soft blue background
      var headerRange = sheet.getRange(1, 1, 1, sheetsSetup[name].length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#E0F2FE");
      headerRange.setHorizontalAlignment("left");
      
      var rows = backupData[name] || [];
      if (rows.length > 0) {
        // Map objects to array of values based on columns
        var values = rows.map(function(item) {
          return sheetsSetup[name].map(function(colName) {
            var val = item[colName];
            if (val === undefined || val === null) return "";
            return val;
          });
        });
        sheet.getRange(2, 1, values.length, sheetsSetup[name].length).setValues(values);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "✓ SQLite database backup successfully written to Google Sheets."
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Backup error: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}