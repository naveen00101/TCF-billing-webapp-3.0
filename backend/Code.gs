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
      return handleSyncUp(data.spreadsheetId, data.payload, data.backupInterval);
    } else if (action === "SYNC_DOWN") {
      return handleSyncDown(data.spreadsheetId);
    } else if (action === "initializeDatabase") {
      return initializeDatabase(data.spreadsheetId, data.companyName);
    } else if (action === "updateDatabaseSchema") {
      return updateDatabaseSchema(data.spreadsheetId);
    } else if (action === "CREATE_BACKUP") {
      var backupRes = createSpreadsheetBackup(data.spreadsheetId);
      return ContentService.createTextOutput(JSON.stringify(backupRes))
        .setMimeType(ContentService.MimeType.JSON);
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
    "Products": ["id", "name", "category", "unit", "price", "unitsSold", "revenueGenerated", "lastSoldDate", "status", "hsnCode", "simpleVariants", "colors", "sizes", "notes"],
    "Customers": ["id", "name", "mobile", "address", "secondaryPhone", "secondaryContactName", "notes", "currentAddress", "addressHistory"],
    "Invoices": ["invoiceId", "invoiceNo", "invoiceCategory", "date", "customerName", "mobile", "itemCount", "subtotal", "discount", "grandTotal", "status", "paymentType", "amountPaid", "balanceDue", "paymentStatus", "gstType", "taxAmount", "referralAgentId", "referralAgentName", "referralAgentCategory", "referralAgentType", "lastEditedDate", "lastEditedBy"],
    "InvoiceItems": ["invoiceId", "invoiceNo", "productId", "productName", "variant", "quantity", "unitPrice", "amount", "selectedColor", "selectedSize", "hsnCode"],
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
    "Products": ["id", "name", "category", "unit", "price", "unitsSold", "revenueGenerated", "lastSoldDate", "status", "hsnCode", "simpleVariants", "colors", "sizes", "notes"],
    "Customers": ["id", "name", "mobile", "address", "secondaryPhone", "secondaryContactName", "notes", "currentAddress", "addressHistory"],
    "Invoices": ["invoiceId", "invoiceNo", "invoiceCategory", "date", "customerName", "mobile", "itemCount", "subtotal", "discount", "grandTotal", "status", "paymentType", "amountPaid", "balanceDue", "paymentStatus", "gstType", "taxAmount", "referralAgentId", "referralAgentName", "referralAgentCategory", "referralAgentType", "lastEditedDate", "lastEditedBy"],
    "InvoiceItems": ["invoiceId", "invoiceNo", "productId", "productName", "variant", "quantity", "unitPrice", "amount", "selectedColor", "selectedSize", "hsnCode"],
    "Agents": ["id", "name", "agentType", "commissionPercentage", "mobile", "email", "status", "notes", "createdDate"],
    "Settings": ["companyName", "shortName", "address", "phone", "email", "gstNumber", "website", "invoiceFooter", "invoiceTerms", "invoicePrefix", "nextInvoiceNumber", "defaultPrintFormat", "defaultDownloadFormat", "companyState", "companyStateCode", "cgstPercentage", "sgstPercentage", "igstPercentage", "gstEnabledByDefault"],
    "PaymentTransactions": ["id", "invoiceId", "invoiceNo", "date", "time", "amount", "collectedBy", "notes"]
  };

  var deprecatedColumns = {
    "Products": ["color", "material", "brand", "vendor", "purchaseCost", "sellingPrice", "stockAvailable", "productionTime", "sku", "warranty", "size", "weight", "imageUrl", "parentId", "isLeaf", "level", "nodeType", "hierarchyPath", "colorVariantsJson", "attributesJson"],
    "InvoiceItems": ["hierarchyNodeId", "skuId", "hierarchyPath", "skuCode"]
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

    // 1. Delete deprecated columns (from right to left)
    var depColumns = deprecatedColumns[name] || [];
    if (depColumns.length > 0) {
      var colsToDelete = [];
      depColumns.forEach(function(dc) {
        var idx = existingHeaders.indexOf(dc);
        if (idx !== -1) {
          colsToDelete.push(idx + 1); // 1-based index
        }
      });
      
      if (colsToDelete.length > 0) {
        colsToDelete.sort(function(a, b) { return b - a; });
        colsToDelete.forEach(function(colIdx) {
          sheet.deleteColumn(colIdx);
        });
        updates.push("Deleted deprecated columns from " + name + ": " + colsToDelete.length);
        
        // Re-read existing headers after deletion
        if (sheet.getLastColumn() > 0) {
          existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        } else {
          existingHeaders = [];
        }
      }
    }

    // 2. Check for missing columns and append them
    var expectedHeaders = sheetsSetup[name];
    var missingHeaders = [];
    expectedHeaders.forEach(function(eh) {
      if (existingHeaders.indexOf(eh) === -1) {
        missingHeaders.push(eh);
      }
    });

    if (missingHeaders.length > 0) {
      missingHeaders.forEach(function(mh) {
        var newColIndex = sheet.getLastColumn() + 1;
        sheet.getRange(1, newColIndex).setValue(mh);
      });
      updates.push("Added missing columns to " + name + ": " + missingHeaders.join(", "));
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: updates.length > 0 ? "Schema updated: " + updates.join("; ") : "Schema is up to date."
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleSyncUp(spreadsheetId, payload, backupInterval) {
  const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  
  // Daily automatic background backup check
  try {
    if (backupInterval) {
      PropertiesService.getScriptProperties().setProperty("BACKUP_INTERVAL_" + ss.getId(), backupInterval);
    }
    
    var lastBackupTimeStr = PropertiesService.getScriptProperties().getProperty("LAST_BACKUP_TIME_" + ss.getId());
    var currentBackupInterval = PropertiesService.getScriptProperties().getProperty("BACKUP_INTERVAL_" + ss.getId()) || "1_day";
    
    var lastBackupTime = lastBackupTimeStr ? parseInt(lastBackupTimeStr) : 0;
    var currentTime = new Date().getTime();
    
    var msInterval = 86400000; // 1 day default
    if (currentBackupInterval === "2_day") msInterval = 172800000;
    else if (currentBackupInterval === "1_week") msInterval = 604800000;
    else if (currentBackupInterval === "2_week") msInterval = 1209600000;
    else if (currentBackupInterval === "1_month") msInterval = 2592000000; // 30 days
    
    if (currentTime - lastBackupTime >= msInterval) {
      createSpreadsheetBackup(ss.getId());
      PropertiesService.getScriptProperties().setProperty("LAST_BACKUP_TIME_" + ss.getId(), currentTime.toString());
    }
  } catch (backupError) {
    console.error("Auto backup failed: " + backupError.toString());
  }
  
  for (const sheetName in payload) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    const records = payload[sheetName];
    if (!records || records.length === 0) {
      continue; // Skip if no records, NEVER clear/overwrite the sheet!
    }
    
    // Get existing data to find existing headers and rows
    let existingData = sheet.getDataRange().getValues();
    let existingHeaders = [];
    if (existingData.length > 0) {
      existingHeaders = existingData[0];
    }
    
    // Find all unique keys across all records to merge with existing headers
    const headerSet = new Set(existingHeaders.filter(h => h !== ""));
    records.forEach(r => Object.keys(r).forEach(k => headerSet.add(k)));
    const headers = Array.from(headerSet);
    
    // Determine the key extraction function for this sheet name
    const getKey = (rowOrRecord, isRecord) => {
      const getVal = (field) => {
        if (isRecord) {
          return rowOrRecord[field] !== undefined ? String(rowOrRecord[field]) : "";
        } else {
          const idx = headers.indexOf(field);
          return idx !== -1 ? String(rowOrRecord[idx]) : "";
        }
      };
      
      if (sheetName === "InvoiceItems") {
        return getVal("invoiceId") + "|" + getVal("productId") + "|" + getVal("skuId") + "|" + getVal("variant");
      } else if (sheetName === "PromoCodes") {
        return getVal("promoCode");
      } else if (sheetName === "Invoices") {
        return getVal("invoiceNo") || getVal("invoiceId");
      } else if (sheetName === "Settings") {
        return "SETTINGS_ROW"; // Settings is always a single row (row 2)
      } else {
        // Products, Customers, Agents, PaymentTransactions, Users, UserActivity, AuditLog
        return getVal("id");
      }
    };
    
    // Build a map of key -> rowValues (aligned to headers)
    const rowMap = {};
    const keyOrder = [];
    
    // 1. Load existing rows
    for (let i = 1; i < existingData.length; i++) {
      const row = existingData[i];
      const key = getKey(row, false);
      if (!key) continue;
      
      const rowValues = headers.map(header => {
        const oldIdx = existingHeaders.indexOf(header);
        if (oldIdx !== -1) {
          const val = row[oldIdx];
          return val !== undefined ? val : "";
        }
        return "";
      });
      
      if (!rowMap[key]) {
        keyOrder.push(key);
      }
      rowMap[key] = rowValues;
    }
    
    // 2. Clean up temporary mock records that are no longer in the client database
    const targetSheets = ["Invoices", "InvoiceItems", "Products", "Customers", "Agents", "PaymentTransactions"];
    const payloadKeys = new Set(records.map(r => getKey(r, true)));
    
    if (targetSheets.indexOf(sheetName) !== -1) {
      for (const key in rowMap) {
        const isMock = key && (
          key.indexOf("YR-TEMP-") === 0 || 
          key.indexOf("INV-TEMP-") === 0 || 
          key.indexOf("PROD-TEMP-") === 0 || 
          key.indexOf("CUST-TEMP-") === 0 || 
          key.indexOf("AGT-TEMP-") === 0 || 
          key.indexOf("TXN-TEMP-") === 0 ||
          key.includes("|YR-TEMP-") || 
          key.includes("|INV-TEMP-") ||
          key.includes("|PROD-TEMP-")
        );
        if (isMock && !payloadKeys.has(key)) {
          delete rowMap[key];
        }
      }
    }
    
    // 3. Process each record for upsert from payload
    records.forEach(record => {
      const key = getKey(record, true);
      if (!key) return; // Skip if empty key
      
      const rowValues = headers.map(header => {
        let val = record[header];
        if (typeof val === 'object' && val !== null) {
          return JSON.stringify(val); // Serialize nested objects
        }
        if (val === undefined || val === null) {
          return "";
        }
        return val;
      });
      
      if (!rowMap[key]) {
        keyOrder.push(key);
      }
      rowMap[key] = rowValues;
    });
    
    // 4. Reconstruct the 2D array of values
    const finalRows = [headers];
    keyOrder.forEach(key => {
      if (rowMap[key]) {
        finalRows.push(rowMap[key]);
      }
    });
    
    // 5. Write back to sheet in bulk
    sheet.clearContents();
    
    if (sheet.getMaxColumns() < headers.length) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
    }
    
    const range = sheet.getRange(1, 1, finalRows.length, headers.length);
    range.setValues(finalRows);
    
    // Ensure header formatting is restored
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e0f2fe");
    sheet.setFrozenRows(1);
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
        var match = invNo.match(/(\d+)(?:-[A-Za-z][A-Za-z0-9]*)?$/);
        if (match) {
          var num = parseInt(match[1]);
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

function createSpreadsheetBackup(spreadsheetId) {
  try {
    var ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    var ssFile = DriveApp.getFileById(ss.getId());
    
    // Find or create backup folder in the same directory as the spreadsheet
    var parentFolders = ssFile.getParents();
    var parentFolder = parentFolders.hasNext() ? parentFolders.next() : null;
    var backupFolderName = ss.getName() + " - Backups";
    var backupFolder;
    
    if (parentFolder) {
      var folders = parentFolder.getFoldersByName(backupFolderName);
      if (folders.hasNext()) {
        backupFolder = folders.next();
      } else {
        backupFolder = parentFolder.createFolder(backupFolderName);
      }
    } else {
      var folders = DriveApp.getFoldersByName(backupFolderName);
      if (folders.hasNext()) {
        backupFolder = folders.next();
      } else {
        backupFolder = DriveApp.createFolder(backupFolderName);
      }
    }
    
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+5:30", "yyyy-MM-dd_HH-mm-ss");
    var copyName = "Backup_" + timestamp + "_" + ss.getName();
    var copyFile = ssFile.makeCopy(copyName, backupFolder);
    
    // Clean up backups older than 30 days
    var files = backupFolder.getFiles();
    var thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    while (files.hasNext()) {
      var file = files.next();
      if (file.getName().indexOf("Backup_") === 0 && file.getDateCreated() < thirtyDaysAgo) {
        file.setTrashed(true);
      }
    }
    
    return {
      success: true,
      backupName: copyName,
      folderName: backupFolderName,
      backupFileUrl: copyFile.getUrl()
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}
