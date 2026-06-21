/**
 * TCF POS System - Google Apps Script Backend
 * 
 * Instructions:
 * 1. Go to script.google.com and create a new project.
 * 2. Paste this entire file into Code.gs.
 * 3. Click "Deploy" > "New deployment".
 * 4. Select type: "Web app".
 * 5. Execute as: "Me" (your google account).
 * 6. Who has access: "Anyone" (important for the API to work).
 * 7. Click Deploy, authorize the app, and copy the "Web app URL".
 * 8. Paste that URL into the POS System's settings.
 */

function doPost(e) {
  try {
    // We expect the payload to be JSON, but sent as text/plain to avoid CORS preflight issues
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === "SYNC_UP") {
      return handleSyncUp(data.spreadsheetId, data.payload);
    } else if (action === "SYNC_DOWN") {
      return handleSyncDown(data.spreadsheetId);
    } else if (action === "initializeDatabase") {
      return initializeDatabase(data.spreadsheetId, data.companyName);
    } else if (action === "updateDatabaseSchema") {
      return updateDatabaseSchema(data.spreadsheetId);
    } else if (action === "repairCounters") {
      var res = repairCounters(data.spreadsheetId);
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Unknown action: " + action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Optional GET handler for quick browser testing
function doGet(e) {
  if (e.parameter.action === "SYNC_DOWN") {
    return handleSyncDown(e.parameter.spreadsheetId);
  }
  return ContentService.createTextOutput("TCF POS Backend is running. Use POST to sync data.")
    .setMimeType(ContentService.MimeType.TEXT);
}

// Initialize a Spreadsheet safely with all POS tabs
function initializeDatabase(existingSpreadsheetId, companyName) {
  var ssName = (companyName || "My Smart Billing") + " Billing Database";
  var ss;
  var spreadsheetId = existingSpreadsheetId;
  
  if (spreadsheetId) {
    try {
      ss = SpreadsheetApp.openById(spreadsheetId);
    } catch (e) {
      ss = SpreadsheetApp.create(ssName);
      spreadsheetId = ss.getId();
    }
  } else {
    ss = SpreadsheetApp.create(ssName);
    spreadsheetId = ss.getId();
  }

  // Protection Flag check
  var settingsSheet = ss.getSheetByName("Settings");
  if (settingsSheet && settingsSheet.getLastRow() > 0) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      spreadsheetId: spreadsheetId,
      spreadsheetName: ss.getName(),
      message: "✓ Database is already initialized. Skipping recreation."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Create required sheets and write columns (camelCase format)
  var sheetsSetup = {
    "Products": ["id", "name", "category", "unit", "price", "color", "material", "brand", "vendor", "purchaseCost", "sellingPrice", "unitsSold", "revenueGenerated", "lastSoldDate", "stockAvailable", "productionTime", "notes", "sku", "warranty", "size", "weight", "imageUrl", "status", "parentId", "isLeaf", "level", "nodeType", "hierarchyPath", "colorVariantsJson", "attributesJson"],
    "Customers": ["id", "name", "mobile", "address", "secondaryPhone", "secondaryContactName", "notes", "currentAddress", "addressHistory"],
    "Invoices": ["invoiceId", "invoiceNo", "invoiceCategory", "date", "customerName", "mobile", "itemCount", "subtotal", "discount", "grandTotal", "status", "paymentType", "amountPaid", "balanceDue", "paymentStatus", "gstType", "taxAmount", "referralAgentId", "referralAgentName", "referralAgentCategory", "referralAgentType", "lastEditedDate", "lastEditedBy"],
    "InvoiceItems": ["invoiceId", "invoiceNo", "productId", "productName", "variant", "quantity", "unitPrice", "amount", "hierarchyNodeId", "skuId", "hierarchyPath", "skuCode"],
    "Agents": ["id", "name", "agentType", "commissionPercentage", "mobile", "email", "status", "notes", "createdDate"],
    "Settings": ["companyName", "shortName", "address", "phone", "email", "gstNumber", "website", "invoiceFooter", "invoiceTerms", "invoicePrefix", "nextInvoiceNumber", "defaultPrintFormat", "defaultDownloadFormat", "companyState", "companyStateCode", "cgstPercentage", "sgstPercentage", "igstPercentage", "gstEnabledByDefault"],
    "PaymentTransactions": ["id", "invoiceId", "invoiceNo", "date", "time", "amount", "collectedBy", "notes"]
  };

  for (var name in sheetsSetup) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    sheet.clear();
    sheet.appendRow(sheetsSetup[name]);
    
    var headerRange = sheet.getRange(1, 1, 1, sheetsSetup[name].length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#E0F2FE");
    headerRange.setHorizontalAlignment("left");
  }

  // Populate default flat settings row
  if (!settingsSheet) settingsSheet = ss.getSheetByName("Settings");
  var defaultSettings = {
    "companyName": companyName || "My Smart Billing",
    "shortName": "TCF Smart Billing",
    "address": "Plot 42, Furniture Showroom Zone, Guntur Road, Tenali-522201",
    "phone": "+91 8644 223400",
    "email": "contact@tcfshowroom.com",
    "gstNumber": "GSTIN-37AAAAT9876C1Z0",
    "website": "www.tcfshowroom.com",
    "invoiceFooter": "Thank you for buying premium furniture from Tenali Central Furniture! We guarantee quality craftsmanship in every piece.",
    "invoiceTerms": "Goods once sold will not be taken back.\nDelivery timelines may vary depending on product availability.\nWarranty terms apply only to eligible products.\nFurniture color and finish may vary slightly from display samples.",
    "invoicePrefix": "YR",
    "nextInvoiceNumber": 1001,
    "defaultPrintFormat": "Receipt",
    "defaultDownloadFormat": "A4",
    "companyState": "Andhra Pradesh",
    "companyStateCode": "37",
    "cgstPercentage": 9,
    "sgstPercentage": 9,
    "igstPercentage": 18,
    "gstEnabledByDefault": false
  };
  
  var settingsHeaders = sheetsSetup["Settings"];
  var settingsValues = settingsHeaders.map(function(h) {
    return defaultSettings[h] !== undefined ? defaultSettings[h] : "";
  });
  
  settingsSheet.clear();
  settingsSheet.appendRow(settingsHeaders);
  settingsSheet.appendRow(settingsValues);

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
function updateDatabaseSchema(spreadsheetId) {
  if (!spreadsheetId) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "No Spreadsheet ID provided." }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheetsSetup = {
    "Products": ["id", "name", "category", "unit", "price", "color", "material", "brand", "vendor", "purchaseCost", "sellingPrice", "unitsSold", "revenueGenerated", "lastSoldDate", "stockAvailable", "productionTime", "notes", "sku", "warranty", "size", "weight", "imageUrl", "status", "parentId", "isLeaf", "level", "nodeType", "hierarchyPath", "colorVariantsJson", "attributesJson"],
    "Customers": ["id", "name", "mobile", "address", "secondaryPhone", "secondaryContactName", "notes", "currentAddress", "addressHistory"],
    "Invoices": ["invoiceId", "invoiceNo", "invoiceCategory", "date", "customerName", "mobile", "itemCount", "subtotal", "discount", "grandTotal", "status", "paymentType", "amountPaid", "balanceDue", "paymentStatus", "gstType", "taxAmount", "referralAgentId", "referralAgentName", "referralAgentCategory", "referralAgentType", "lastEditedDate", "lastEditedBy"],
    "InvoiceItems": ["invoiceId", "invoiceNo", "productId", "productName", "variant", "quantity", "unitPrice", "amount", "hierarchyNodeId", "skuId", "hierarchyPath", "skuCode"],
    "Agents": ["id", "name", "agentType", "commissionPercentage", "mobile", "email", "status", "notes", "createdDate"],
    "Settings": ["companyName", "shortName", "address", "phone", "email", "gstNumber", "website", "invoiceFooter", "invoiceTerms", "invoicePrefix", "nextInvoiceNumber", "defaultPrintFormat", "defaultDownloadFormat", "companyState", "companyStateCode", "cgstPercentage", "sgstPercentage", "igstPercentage", "gstEnabledByDefault"],
    "PaymentTransactions": ["id", "invoiceId", "invoiceNo", "date", "time", "amount", "collectedBy", "notes"]
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

function handleSyncUp(spreadsheetId, payload) {
  const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  
  for (const sheetName in payload) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    const records = payload[sheetName];
    if (records && records.length > 0) {
      // Find all unique keys across all records to use as headers
      const headerSet = new Set();
      records.forEach(r => Object.keys(r).forEach(k => headerSet.add(k)));
      const headers = Array.from(headerSet);
      
      // Map records to 2D array
      const rows = records.map(record => {
        return headers.map(header => {
          let val = record[header];
          if (typeof val === 'object' && val !== null) {
            return JSON.stringify(val); // Serialize nested objects (like invoice lineItems)
          }
          if (val === undefined || val === null) {
            return "";
          }
          return val;
        });
      });
      
      sheet.clear();
      
      // Write headers and freeze them
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f4f6");
      sheet.setFrozenRows(1);
      
      // Write data
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    } else {
       // If empty array passed, just keep headers or clear everything
       const lastCol = sheet.getLastColumn();
       if (lastCol > 0) {
         const lastRow = sheet.getLastRow();
         if (lastRow > 1) {
           sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
         }
       } else {
         sheet.clear();
       }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleSyncDown(spreadsheetId) {
  const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const result = {};
  
  sheets.forEach(sheet => {
    const sheetName = sheet.getName();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      result[sheetName] = [];
      return;
    }
    
    const headers = data[0];
    const records = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const record = {};
      let isEmptyRow = true;
      
      headers.forEach((header, index) => {
        if (!header) return; // Skip empty headers
        
        let val = row[index];
        if (val !== "") isEmptyRow = false;
        
        // Try to parse JSON strings back to objects (like invoice items)
        if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
           try { 
             val = JSON.parse(val); 
           } catch(e) {
             // Leave as string if it's just normal text that happens to start with [
           }
        }
        
        record[header] = val;
      });
      
      if (!isEmptyRow) {
        records.push(record);
      }
    }
    
    result[sheetName] = records;
  });
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, payload: result }))
    .setMimeType(ContentService.MimeType.JSON);
}

function repairCounters(spreadsheetId) {
  if (!spreadsheetId) {
    return { success: false, message: "No Spreadsheet ID provided." };
  }
  
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var invoiceSheet = ss.getSheetByName("Invoices");
  var settingsSheet = ss.getSheetByName("Settings");
  
  if (!invoiceSheet || !settingsSheet) {
    return { success: false, message: "Required sheets (Invoices/Settings) not found." };
  }
  
  var invoiceData = invoiceSheet.getDataRange().getValues();
  var maxNum = 1000;
  
  if (invoiceData.length > 1) {
    var headers = invoiceData[0];
    var invNoIdx = headers.indexOf("Invoice Number");
    if (invNoIdx === -1) {
      invNoIdx = headers.indexOf("invoiceNo");
    }
    if (invNoIdx !== -1) {
      for (var i = 1; i < invoiceData.length; i++) {
        var invNo = String(invoiceData[i][invNoIdx]);
        var match = invNo.match(/\d+$/);
        if (match) {
          var num = parseInt(match[0]);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
  }
  
  var nextInvoiceNumber = maxNum + 1;
  
  var settingsData = settingsSheet.getDataRange().getValues();
  if (settingsData.length > 0) {
    var headers = settingsData[0];
    var nextInvColIdx = headers.indexOf("nextInvoiceNumber");
    if (nextInvColIdx !== -1 && settingsData.length > 1) {
      // Flat format: update in row 2
      settingsSheet.getRange(2, nextInvColIdx + 1).setValue(nextInvoiceNumber);
      return { success: true, message: "Invoice counters successfully repaired to next number: " + nextInvoiceNumber };
    }
  }
  
  var updated = false;
  for (var r = 0; r < settingsData.length; r++) {
    if (settingsData[r][0] === "nextInvoiceNumber") {
      settingsSheet.getRange(r + 1, 2).setValue(nextInvoiceNumber);
      updated = true;
      break;
    }
  }
  
  if (!updated) {
    settingsSheet.appendRow(["nextInvoiceNumber", nextInvoiceNumber]);
  }
  
  return { success: true, message: "Invoice counters successfully repaired to next number: " + nextInvoiceNumber };
}
