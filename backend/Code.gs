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
      return handleSyncUp(data.payload);
    } else if (action === "SYNC_DOWN") {
      return handleSyncDown();
    } else if (action === "initializeDatabase") {
      return initializeDatabase(data.spreadsheetId, data.companyName);
    } else if (action === "updateDatabaseSchema") {
      return updateDatabaseSchema(data.spreadsheetId);
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
    return handleSyncDown();
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
    "Invoices": ["Invoice ID", "Invoice Number", "Invoice Category", "Date", "Customer Name", "Mobile Number", "Item Count", "Subtotal", "Discount", "Grand Total", "Fulfillment Status", "Payment Type", "Amount Paid", "Balance Due", "Payment Status", "GST Type", "GST Amount", "Referral Agent ID", "Referral Agent Name", "Referral Agent Category", "Referral Agent Type", "Last Updated", "Updated By"],
    "InvoiceItems": ["Invoice ID", "Invoice Number", "Product ID", "Product Name", "Variant", "Quantity", "Unit Price", "Line Total", "Hierarchy Node ID", "SKU ID", "Hierarchy Path", "SKU Code"],
    "Agents": ["Agent ID", "Agent Name", "Agent Category", "Commission Rate", "Phone Number", "Email", "Status", "Notes", "Created Date", "Created By"],
    "Settings": ["Key", "Value"],
    "PaymentTransactions": ["Transaction ID", "Invoice ID", "Date", "Amount", "Collected By", "Notes"]
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

  // Populate default settings rows
  if (!settingsSheet) settingsSheet = ss.getSheetByName("Settings");
  settingsSheet.appendRow(["invoicePrefix", "YR"]);
  settingsSheet.appendRow(["nextInvoiceNumber", 1001]);
  settingsSheet.appendRow(["companyName", companyName || "My Smart Billing"]);
  settingsSheet.appendRow(["address", "Update Company Address Here"]);
  settingsSheet.appendRow(["phone", "+91 99999 99999"]);
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
function updateDatabaseSchema(spreadsheetId) {
  if (!spreadsheetId) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "No Spreadsheet ID provided." }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheetsSetup = {
    "Products": ["Product ID", "Product Name", "Category", "Unit", "Price", "Inventory Type", "Color", "Material", "Brand", "Vendor", "Purchase Cost", "Selling Price", "Units Sold", "Revenue Generated", "Last Sold Date", "Stock Available", "Production Time", "Notes", "SKU", "Warranty", "Size", "Weight", "Image URL", "Status", "Parent ID", "Is Leaf", "Level", "Node Type", "Hierarchy Path", "Inventory SKUs JSON", "Color Variants JSON", "Attributes JSON", "Selected Options JSON"],
    "Customers": ["Customer ID", "Customer Name", "Mobile Number", "Address", "Secondary Mobile", "Secondary Contact Name", "Notes", "Address History JSON"],
    "Invoices": ["Invoice ID", "Invoice Number", "Invoice Category", "Date", "Customer Name", "Mobile Number", "Item Count", "Subtotal", "Discount", "Grand Total", "Fulfillment Status", "Payment Type", "Amount Paid", "Balance Due", "Payment Status", "GST Type", "GST Amount", "Referral Agent ID", "Referral Agent Name", "Referral Agent Category", "Referral Agent Type", "Last Updated", "Updated By"],
    "InvoiceItems": ["Invoice ID", "Invoice Number", "Product ID", "Product Name", "Variant", "Quantity", "Unit Price", "Line Total", "Hierarchy Node ID", "SKU ID", "Hierarchy Path", "SKU Code"],
    "Agents": ["Agent ID", "Agent Name", "Agent Category", "Commission Rate", "Phone Number", "Email", "Status", "Notes", "Created Date", "Created By"],
    "Settings": ["Key", "Value"],
    "PaymentTransactions": ["Transaction ID", "Invoice ID", "Date", "Amount", "Collected By", "Notes"]
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

function handleSyncUp(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
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

function handleSyncDown() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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
