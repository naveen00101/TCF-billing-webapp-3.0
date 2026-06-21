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
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Unknown action" }))
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
