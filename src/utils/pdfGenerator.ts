import { jsPDF } from "jspdf";
import { formatInTimeZone } from "date-fns-tz";
import { Invoice, InvoiceItem, CompanySettings } from "../types";
import { formatDisplayDate, formatDisplayTime, formatDisplayDateTime } from "./dateUtils";
import { SheetsSyncEngine } from "./sheetsSync";
import { SYSTEM_LOGO } from "../constants/branding";

const TIMEZONE = "Asia/Kolkata";

// Vector drawing helper for the Indian Rupee symbol to overcome jspdf Helvetica character mapping limitation
function drawRupeeVector(doc: jsPDF, x: number, y: number, fontSize: number = 9) {
  const currentDraw = doc.getDrawColor();
  const currentLineWidth = doc.getLineWidth();

  // Color matches standard dark gray text [55, 65, 81]
  doc.setDrawColor(55, 65, 81);
  doc.setLineWidth(0.18 * (fontSize / 9));

  // Font height estimation
  const h = fontSize * 0.33; 
  const w = h * 0.55; 

  const topY = y - h + (h * 0.12);
  const midY = y - (h * 0.48);

  // 1. Double horizontal bars at top
  doc.line(x, topY, x + w, topY);
  doc.line(x, topY + (h * 0.18), x + w * 0.85, topY + (h * 0.18));

  // 2. Curve like 'C'
  const steps = 6;
  const cx = x + w * 0.22;
  const cy = topY + h * 0.32;
  const rx = w * 0.42;
  const ry = h * 0.2;
  
  let prevPt = { x: x + w * 0.2, y: topY };
  for (let i = 1; i <= steps; i++) {
    const angle = -Math.PI / 2 + (i / steps) * Math.PI;
    const px = cx + rx * Math.cos(angle);
    const py = cy + ry * Math.sin(angle);
    doc.line(prevPt.x, prevPt.y, px, py);
    prevPt = { x: px, y: py };
  }

  // 3. Connection to center vertical axis
  doc.line(x, midY, prevPt.x, prevPt.y);

  // 4. Downward diagonal slash leg
  doc.line(prevPt.x - w * 0.08, prevPt.y, x + w * 0.85, y);

  // Restore previous color & linewidth
  // @ts-ignore
  doc.setDrawColor(currentDraw);
  doc.setLineWidth(currentLineWidth);
}

// Wrapper utility to draw text with seamless Indian Rupee symbols
export function drawTextWithRupee(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  align: "left" | "right" = "left",
  fontSize: number = 9
) {
  doc.setFontSize(fontSize);
  if (text.includes("₹")) {
    const parts = text.split("₹");
    const numValue = parts[1] || "";
    
    if (align === "right") {
      const numWidth = doc.getTextWidth(numValue);
      const symbolWidth = fontSize * 0.23;
      doc.text(numValue, x, y, { align: "right" });
      drawRupeeVector(doc, x - numWidth - symbolWidth + 0.3, y, fontSize);
    } else {
      const symbolWidth = fontSize * 0.23;
      drawRupeeVector(doc, x, y, fontSize);
      doc.text(numValue, x + symbolWidth + 0.3, y);
    }
  } else {
    doc.text(text, x, y, { align });
  }
}

/**
 * Unified Master Invoice Generator - Single Source of Truth
 */
export async function generateInvoicePDF(
  invoiceId: string,
  action: "print" | "download" = "download"
): Promise<boolean> {
  // Load database items to guarantee database / offline sync source of truth
  console.log(`[PDF Generator] Lookup Started for: ${invoiceId}`);
  const invoice = SheetsSyncEngine.getInvoiceById(invoiceId);
  const items = SheetsSyncEngine.getInvoiceItems().filter(
    (item) => item.invoiceId === invoiceId || item.invoiceNo === (invoice?.invoiceNo || invoiceId)
  );
  const company = SheetsSyncEngine.getCompanySettings();

  // Data Integrity verification checking
  if (!invoice) {
    console.error(`[PDF Generator] Invoice ${invoiceId} not found.`);
    alert(`Invoice ${invoiceId} not found.`);
    return false;
  }
  
  const targetCategory = invoice.invoiceCategory || "NON_GST";
  console.log(`[PDF Generator] Invoice Found - Category: ${targetCategory}`);
  if (action === "print") {
    console.log(`[PDF Generator] Print Started`);
  } else {
    console.log(`[PDF Generator] Download Started`);
  }

  const calculatedSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
  if (items.length === 0 || Math.abs(invoice.subtotal - calculatedSubtotal) > 1.0) {
    console.error(`[PDF Generator] Invoice Items data mismatch for ${invoiceId}. Please sync database.`);
    alert(`Invoice ${invoiceId} Line Items unavailable. Please sync database.`);
    return false;
  }


  const isGstActive = invoice.gstEnabled && (invoice.gstType as string) !== "No GST" && (invoice.gstType as string) !== "Non-GST" && (invoice.gstType as string) !== "Non GST";

  // Load logo image as base64 dynamically
  let logoBase64: string | null = null;
  let logoAspect = 1.33; // Standard aspect ratio fallback
  try {
    const imgResponse = await fetch(SYSTEM_LOGO);
    if (imgResponse.ok) {
      const contentType = imgResponse.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        console.warn("SYSTEM_LOGO returned HTML instead of an image. Likely a base path routing issue.");
      } else {
        const blob = await imgResponse.blob();
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        if (logoBase64) {
          const img = new Image();
          img.src = logoBase64;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
          if (img.width && img.height) {
            logoAspect = img.width / img.height;
          }
        }
      }
    }
  } catch (e) {
    console.error(`System logo not found: ${SYSTEM_LOGO}`, e);
  }
  const logoSrc = logoBase64;

  // Invoice is strictly 100% formatted using professional A4 sheet layout
  const doc = new jsPDF("p", "mm", "a4");
  const marginX = 16;
  let currentY = 16;

  // Color theme: Professional Blue, Dark Gray, Black
  const colorPrimary = [30, 58, 138]; // Deep Royal Navy Blue
  const colorTextActive = [17, 24, 39]; // High Contrast Dark Indigo/Black
  const colorTextMuted = [71, 85, 105]; // Slate Dark Gray
  const colorTableGray = [243, 244, 246]; // Cool light gray background

  // Watermark Generator
  const drawWatermark = (docObj: jsPDF) => {
    const showWatermark = company.useLogoWatermark ?? true;
    if (!showWatermark) return;
    try {
      // @ts-ignore
      const gState = new docObj.GState({ opacity: 0.06 }); // Low opacity 5-8%
      // @ts-ignore
      docObj.saveGraphicsState();
      // @ts-ignore
      docObj.setGState(gState);
      
      if (logoSrc) {
        const w = 110;
        const h = w / logoAspect;
        docObj.addImage(logoSrc, "JPEG", 105 - w / 2, 148.5 - h / 2, w, h);
      } else {
        docObj.setTextColor(230, 230, 230);
        docObj.setFont("helvetica", "bold");
        docObj.setFontSize(44);
        docObj.text("TCF FURNITURE", 105, 148.5, { align: "center", angle: 45 });
      }
      // @ts-ignore
      docObj.restoreGraphicsState();
    } catch (e) {
      console.warn("Watermark rendering warning:", e);
    }
  };

  drawWatermark(doc);

  // Top color ribbon
  doc.setFillColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
  doc.rect(0, 0, 210, 4, "F");

  currentY = 12;

  // 1. Brand & Header Block
  let leftBrandOffset = marginX;
  if (logoSrc) {
    try {
      const h = 18.5; // 70px height (roughly 18.5mm)
      const w = h * logoAspect;
      doc.addImage(logoSrc, "JPEG", marginX, currentY, w, h);
      leftBrandOffset += w + 6;
    } catch (e) {
      console.warn("Could not load header logo", e);
    }
  }

  // Company Name & Sub details
  doc.setTextColor(colorTextActive[0], colorTextActive[1], colorTextActive[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15.5);
  doc.text("Tenali Central Furniture", leftBrandOffset, currentY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
  doc.text("TCF Smart Billing", leftBrandOffset, currentY + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(colorTextMuted[0], colorTextMuted[1], colorTextMuted[2]);
  doc.text(company.address || "Address Not Provided", leftBrandOffset, currentY + 13.5);
  
  const sanitizedPhone = company.phone && !String(company.phone).includes("ERROR") ? company.phone : "Not Configured";
  doc.text(`Phone: ${sanitizedPhone}  |  Email: ${company.email || "Email Not Configured"}`, leftBrandOffset, currentY + 17.5);

  if (company.gstNumber && isGstActive) {
    doc.text(`GSTIN / TAX ID: ${company.gstNumber.toUpperCase()}`, leftBrandOffset, currentY + 21.5);
  }

  // Right Block: Invoice Meta Information
  doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text("INVOICE", 210 - marginX, currentY + 5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(colorTextActive[0], colorTextActive[1], colorTextActive[2]);
  doc.text(`Invoice No: ${invoice.invoiceNo}`, 210 - marginX, currentY + 10, { align: "right" });
  
  doc.setTextColor(colorTextMuted[0], colorTextMuted[1], colorTextMuted[2]);
  doc.text(`Invoice Date: ${formatDisplayDate(invoice.createdTimestamp || invoice.date)}`, 210 - marginX, currentY + 14, { align: "right" });
  doc.text(`Invoice Time: ${formatDisplayTime(invoice.createdTimestamp || invoice.invoiceTime)}`, 210 - marginX, currentY + 18, { align: "right" });

  currentY += 28;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(marginX, currentY, 210 - marginX, currentY);
  currentY += 6;

  // 2. Customer recipient data block
  const matchedCust = SheetsSyncEngine.getCustomers().find(
    (c) => c.mobile && c.mobile !== "N/A" && String(c.mobile).replace(/\D/g, "") === String(invoice.mobile).replace(/\D/g, "")
  );

  let rawAddress = invoice.customerBusinessAddress?.trim();
  const invalidAddrs = ["Registered POS Transaction", "Unknown", "Default Address", "N/A"];
  if (!rawAddress || invalidAddrs.includes(rawAddress)) {
    rawAddress = matchedCust?.address?.trim();
  }
  if (!rawAddress || invalidAddrs.includes(rawAddress)) {
    rawAddress = "Address Not Available";
  }
  
  const secMobile = invoice.customerSecondaryPhone || matchedCust?.secondaryPhone || "Not Provided";
  const secContact = invoice.customerSecondaryContactName || matchedCust?.secondaryContactName || "Not Provided";
  const gstTypeToDisplay = invoice.gstType || "No GST";

  // Left Block: CUSTOMER DETAILS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
  doc.text("CUSTOMER DETAILS", marginX, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(colorTextActive[0], colorTextActive[1], colorTextActive[2]);
  
  let cdY = currentY + 5;
  doc.text(`Customer Name: ${invoice.customerName || "Not Provided"}`, marginX, cdY);
  cdY += 4.2;
  doc.text(`Primary Mobile: ${String(invoice.customerPrimaryPhone || invoice.mobile || "").trim() || "Not Provided"}`, marginX, cdY);
  cdY += 4.2;
  
  if (secMobile !== "Not Provided" && secMobile.trim() !== "") {
    doc.text(`Secondary Mobile: ${secMobile.trim()}`, marginX, cdY);
    cdY += 4.2;
  }
  
  const formattedAddress = (!rawAddress || invalidAddrs.includes(rawAddress) || rawAddress.trim() === "") ? "Not Available" : rawAddress;
  const addressLines = doc.splitTextToSize(`Address: ${formattedAddress}`, 90);
  addressLines.forEach((line: string) => {
    doc.text(line, marginX, cdY);
    cdY += 4.2;
  });

  // Right Block: TRANSACTION INFO
  const rightColX = 135;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
  doc.text("TRANSACTION DETAILS", rightColX, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(colorTextActive[0], colorTextActive[1], colorTextActive[2]);

  let tdY = currentY + 5;
  doc.text(`Status: ${invoice.status}`, rightColX, tdY);
  if (invoice.assignedEmployee) {
    tdY += 4.2;
    doc.text(`Staff: ${invoice.assignedEmployee}`, rightColX, tdY);
  }
  if (invoice.expectedDeliveryDate) {
    tdY += 4.2;
    doc.text(`Expected Delivery: ${invoice.expectedDeliveryDate}`, rightColX, tdY);
  }
  if ((invoice as any).autoNo) {
    tdY += 4.2;
    doc.text(`Auto/Vehicle No: ${(invoice as any).autoNo}`, rightColX, tdY);
  }
  if ((invoice as any).driverName) {
    tdY += 4.2;
    doc.text(`Driver Name: ${(invoice as any).driverName}`, rightColX, tdY);
  }
  if (isGstActive && invoice.customerGstNo) {
    tdY += 4.2;
    doc.text(`Customer GSTIN: ${invoice.customerGstNo.toUpperCase()}`, rightColX, tdY);
  }

  currentY = Math.max(cdY, tdY) + 7;

  const showHsn = isGstActive;

  // 3. Product Billing Line Items Table
  doc.setFillColor(colorTableGray[0], colorTableGray[1], colorTableGray[2]);
  doc.rect(marginX, currentY, 210 - marginX * 2, 7.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(colorTextActive[0], colorTextActive[1], colorTextActive[2]);
  
  doc.text("#", marginX + 3, currentY + 5);
  doc.text("PRODUCT NAME", marginX + 11, currentY + 5);
  if (showHsn) {
    doc.text("HSN/SAC", marginX + 82, currentY + 5);
  }
  doc.text("QUANTITY", 210 - marginX - 60, currentY + 5, { align: "right" });
  doc.text("UNIT PRICE", 210 - marginX - 28, currentY + 5, { align: "right" });
  doc.text("AMOUNT", 210 - marginX - 2, currentY + 5, { align: "right" });

  currentY += 7.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  items.forEach((item, idx) => {
    if (currentY > 230) {
      doc.addPage();
      drawWatermark(doc);
      currentY = 16;
      doc.setFillColor(colorTableGray[0], colorTableGray[1], colorTableGray[2]);
      doc.rect(marginX, currentY, 210 - marginX * 2, 7.5, "F");
      doc.setFont("helvetica", "bold");
      doc.text("#", marginX + 3, currentY + 5);
      doc.text("PRODUCT NAME", marginX + 11, currentY + 5);
      if (showHsn) {
        doc.text("HSN/SAC", marginX + 82, currentY + 5);
      }
      doc.text("QUANTITY", 210 - marginX - 60, currentY + 5, { align: "right" });
      doc.text("UNIT PRICE", 210 - marginX - 28, currentY + 5, { align: "right" });
      doc.text("AMOUNT", 210 - marginX - 2, currentY + 5, { align: "right" });
      currentY += 7.5;
      doc.setFont("helvetica", "normal");
    }

    const allProducts = SheetsSyncEngine.getProducts();
    const rawDisplayName = item.displayName || item.productName || item.storeName || "Unnamed Product";
    const prodName = item.productName || "";
    
    // Clean up product names from paths, quotes, and metadata to return pristine display names
    let printableName = rawDisplayName;
    if (rawDisplayName.includes(">") || rawDisplayName.includes("➔") || rawDisplayName.includes("/")) {
      const parts = rawDisplayName.split(/[➔>\/]/).map(p => p.trim()).filter(Boolean);
      if (parts.length > 1) {
         if (prodName && rawDisplayName.toLowerCase().includes(prodName.toLowerCase())) {
            const indexFound = parts.findIndex(p => p.toLowerCase() === prodName.toLowerCase());
            if (indexFound !== -1) {
               const afterProductParts = parts.slice(indexFound + 1);
               if (afterProductParts.length > 0) {
                  printableName = `${prodName} (${afterProductParts.join(" ")})`;
               } else {
                  printableName = prodName;
               }
            } else {
               printableName = prodName;
            }
         } else {
            const lastPart = parts[parts.length - 1];
            const secondLastPart = parts[parts.length - 2];
            printableName = `${secondLastPart} (${lastPart})`;
         }
      } else {
         printableName = parts[0] || rawDisplayName;
      }
    }
    
    printableName = printableName.replace(/\s+/g, " ").trim();

    // Check available column width and split text automatically to support beautiful wrapping
    const maxColumnWidth = showHsn ? 65 : 84; 
    const lines: string[] = doc.splitTextToSize(printableName, maxColumnWidth);
    if (item.isCombo && item.comboItems && item.comboItems.length > 0) {
      item.comboItems.forEach(c => {
        const cName = c.productName || "";
        const cQty = c.quantity || 1;
        if (cName) {
          const indentedLine = `  - ${cName} (Qty: ${cQty})`;
          const cLines: string[] = doc.splitTextToSize(indentedLine, maxColumnWidth);
          lines.push(...cLines);
        }
      });
    }
    const rowHeight = Math.max(6.5, 4.0 + lines.length * 4.0);

    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(marginX, currentY, 210 - marginX * 2, rowHeight, "F");
    }

    doc.setTextColor(colorTextActive[0], colorTextActive[1], colorTextActive[2]);
    
    // Compute vertically centered text-Y coordinate for other columns
    const centerYOffset = currentY + (rowHeight / 2) + 1.0;

    doc.text((idx + 1).toString(), marginX + 3, centerYOffset - 1.0);
    
    // Output all wrapped text lines
    lines.forEach((lineText: string, lIdx: number) => {
      doc.text(lineText, marginX + 11, currentY + 4.2 + lIdx * 4.0);
    });

    if (showHsn) {
      const hsnValue = item.hsnCode || "9403";
      doc.text(hsnValue, marginX + 82, centerYOffset - 1.0);
    }

    doc.text(item.quantity.toString(), 210 - marginX - 60, centerYOffset - 1.0, { align: "right" });
    
    // Fix Unit Price and Amount alignment with vector currency helper
    drawTextWithRupee(doc, `₹${item.unitPrice.toFixed(2)}`, 210 - marginX - 28, centerYOffset - 1.0, "right", 8.5);
    drawTextWithRupee(doc, `₹${item.amount.toFixed(2)}`, 210 - marginX - 2, centerYOffset - 1.0, "right", 8.5);

    currentY += rowHeight;
  });

  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.35);
  doc.line(marginX, currentY, 210 - marginX, currentY);
  currentY += 5;

  // 4. Financial Summary breakdown layout
  const summaryX = 210 - marginX;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(colorTextMuted[0], colorTextMuted[1], colorTextMuted[2]);

  doc.text("Subtotal:", summaryX - 54, currentY);
  drawTextWithRupee(doc, `₹${invoice.subtotal.toFixed(2)}`, summaryX - 2, currentY, "right", 8.5);
  currentY += 4.5;

  if (invoice.discount && invoice.discount > 0.01) {
    doc.text("Discount:", summaryX - 54, currentY);
    drawTextWithRupee(doc, `-₹${invoice.discount.toFixed(2)}`, summaryX - 2, currentY, "right", 8.5);
    currentY += 4.5;
  }

  // Handle promo discount if exists and > 0
  if (invoice.promoDiscountAmount && invoice.promoDiscountAmount > 0.01) {
    doc.text("Promo Discount:", summaryX - 54, currentY);
    drawTextWithRupee(doc, `-₹${invoice.promoDiscountAmount.toFixed(2)}`, summaryX - 2, currentY, "right", 8.5);
    currentY += 4.5;
  }

  if (isGstActive) {
    const taxableBase = invoice.subtotal - invoice.discount - (invoice.promoDiscountAmount || 0);
    doc.text("Taxable Value:", summaryX - 54, currentY);
    drawTextWithRupee(doc, `₹${taxableBase.toFixed(2)}`, summaryX - 2, currentY, "right", 8.5);
    currentY += 4.5;

    const isWithinState = invoice.gstType === "Within State GST" || invoice.gstType === "CGST_SGST";
    if (isWithinState) {
      doc.text(`CGST (${invoice.cgstPercentage ?? 9}%):`, summaryX - 54, currentY);
      drawTextWithRupee(doc, `₹${(invoice.cgstAmount ?? 0).toFixed(2)}`, summaryX - 2, currentY, "right", 8.5);
      currentY += 4.5;

      doc.text(`SGST (${invoice.sgstPercentage ?? 9}%):`, summaryX - 54, currentY);
      drawTextWithRupee(doc, `₹${(invoice.sgstAmount ?? 0).toFixed(2)}`, summaryX - 2, currentY, "right", 8.5);
      currentY += 4.5;
    } else {
      doc.text(`IGST (${invoice.igstPercentage ?? 18}%):`, summaryX - 54, currentY);
      drawTextWithRupee(doc, `₹${(invoice.igstAmount ?? 0).toFixed(2)}`, summaryX - 2, currentY, "right", 8.5);
      currentY += 4.5;
    }

    doc.text("Total GST:", summaryX - 54, currentY);
    drawTextWithRupee(doc, `₹${(invoice.taxAmount ?? 0).toFixed(2)}`, summaryX - 2, currentY, "right", 8.5);
    currentY += 5;
  }

  // RO Adjustment conditional row
  if (invoice.roAdjustment && Math.abs(invoice.roAdjustment) > 0.01) {
    doc.text("RO Adjustment:", summaryX - 54, currentY);
    const sign = invoice.roAdjustment >= 0 ? "+" : "";
    drawTextWithRupee(doc, `${sign}₹${invoice.roAdjustment.toFixed(2)}`, summaryX - 2, currentY, "right", 8.5);
    currentY += 4.5;
  }

  // Divider
  doc.setDrawColor(229, 231, 235);
  doc.line(summaryX - 60, currentY, summaryX, currentY);
  currentY += 1.5;

  // Grand Total banner card
  doc.setFillColor(colorTableGray[0], colorTableGray[1], colorTableGray[2]);
  doc.rect(summaryX - 58, currentY, 58, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
  doc.text("Grand Total:", summaryX - 54, currentY + 5.2);
  drawTextWithRupee(doc, `₹${invoice.grandTotal.toFixed(2)}`, summaryX - 3, currentY + 5.2, "right", 9.5);

  currentY += 11;

  // Payment Tracking (Advance Payment vs Full Payment visibility)
  const parsedAmountPaid = invoice.amountPaid !== undefined ? invoice.amountPaid : invoice.grandTotal;
  const parsedBalanceDue = invoice.balanceDue !== undefined ? invoice.balanceDue : 0;
  const parsedPaymentStatus = invoice.paymentStatus || "Paid";
  const parsedPaymentType = invoice.paymentType || "Full Payment";

  const isAdvancePayment = invoice.paymentType === "Advance Payment" || parsedBalanceDue > 0.05;

  if (isAdvancePayment) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(colorTextMuted[0], colorTextMuted[1], colorTextMuted[2]);

    doc.text("Payment Status:", summaryX - 54, currentY);
    doc.text(`${parsedPaymentStatus}`, summaryX - 2, currentY, { align: "right" });
    currentY += 4.2;

    doc.text("Payment Type:", summaryX - 54, currentY);
    doc.text(`${parsedPaymentType}`, summaryX - 2, currentY, { align: "right" });
    currentY += 4.2;

    doc.text("Amount Paid:", summaryX - 54, currentY);
    drawTextWithRupee(doc, `₹${parsedAmountPaid.toFixed(2)}`, summaryX - 2, currentY, "right", 8.5);
    currentY += 4.2;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.text("Balance Due:", summaryX - 54, currentY);
    drawTextWithRupee(doc, `₹${parsedBalanceDue.toFixed(2)}`, summaryX - 2, currentY, "right", 8.5);
    currentY += 5;
  }

  // 1. Terms & Conditions
  const termsText = company.invoiceTerms && String(company.invoiceTerms).trim() !== "" ? String(company.invoiceTerms) : "";
  const termsLines = termsText ? doc.splitTextToSize(termsText, 178) : [];
  const estimatedTermsHeight = termsText ? 8 + (termsLines.length * 2.3) : 0;

  const bottomY = 274;

  if (currentY + estimatedTermsHeight > bottomY - 30) {
    doc.addPage();
    drawWatermark(doc);
    currentY = 16;
  } else {
    currentY = Math.max(currentY + 5, bottomY - 48 - estimatedTermsHeight);
  }

  // Final calculation of block sizes
  const termsHeight = termsText ? (3.5 + 3.0 + termsLines.length * 2.3) : 0;
  const signatureHeight = 15;
  const blockHeight = Math.max(termsHeight, signatureHeight);

  if (currentY + blockHeight > bottomY - 5) {
    doc.addPage();
    drawWatermark(doc);
    currentY = 16;
  }

  doc.setLineWidth(0.2);
  doc.setDrawColor(229, 231, 235);
  doc.line(marginX, currentY, 210 - marginX, currentY);
  currentY += 3.5;

  let termsY = currentY;

  if (termsText) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.text("TERMS & CONDITIONS", marginX, termsY);
    termsY += 3.0;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(colorTextMuted[0], colorTextMuted[1], colorTextMuted[2]);
    
    termsLines.forEach((tLine: string) => {
      doc.text(tLine, marginX, termsY);
      termsY += 2.3;
    });
  }

  // Authorized Signature (Right align)
  const sigLineWidth = 44;
  const sigLineRightX = 210 - marginX;
  const sigLineLeftX = sigLineRightX - sigLineWidth;
  
  // Align the signature block top slightly below the currentY
  let sigY = currentY + 3.0;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(colorTextActive[0], colorTextActive[1], colorTextActive[2]);
  doc.text("Authorized Signature", sigLineRightX - (sigLineWidth / 2), sigY, { align: "center" });

  sigY += 5; // Space for signature drawing
  
  doc.setLineWidth(0.3);
  doc.setDrawColor(156, 163, 175);
  doc.line(sigLineLeftX, sigY, sigLineRightX, sigY);

  // 3. System meta stamp details (Strictly at bottom margins in precise sequence order)
  doc.setLineWidth(0.2);
  doc.setDrawColor(229, 231, 235);
  doc.line(marginX, bottomY - 3, 210 - marginX, bottomY - 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(colorTextMuted[0], colorTextMuted[1], colorTextMuted[2]);
  
  const generatedDateStr = formatInTimeZone(new Date(), TIMEZONE, "dd/MM/yyyy");
  const generatedTimeStr = formatInTimeZone(new Date(), TIMEZONE, "hh:mm a").toUpperCase();
  const timestampStr = `${generatedDateStr} ${generatedTimeStr}`;

  const companyWebsite = company.website && String(company.website).trim() !== "" && !String(company.website).includes("ERROR") ? String(company.website) : "www.tenalicentralfurniture.com";
  const companyEmail = company.email && String(company.email).trim() !== "" && !String(company.email).includes("ERROR") ? String(company.email) : "tenalicentralfurnitures@gmail.com";
  const companyPhone = company.phone && String(company.phone).trim() !== "" && !String(company.phone).includes("ERROR") ? String(company.phone) : "8919546858";

  // Left Column: Email & Phone
  doc.setFont("helvetica", "bold");
  doc.text("Email:", marginX, bottomY);
  doc.setFont("helvetica", "normal");
  doc.text(companyEmail, marginX, bottomY + 3.2);

  doc.setFont("helvetica", "bold");
  doc.text("Phone:", marginX, bottomY + 7.2);
  doc.setFont("helvetica", "normal");
  doc.text(companyPhone, marginX, bottomY + 10.4);

  // Right Column: Generated By
  const rightAlignX = 210 - marginX;
  doc.setFont("helvetica", "bold");
  doc.text("Generated By:", rightAlignX, bottomY, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text("TCF Smart Billing", rightAlignX, bottomY + 3.2, { align: "right" });

  // Center Block: Website (above generated timestamp)
  const centerX = 105;
  doc.setFont("helvetica", "bold");
  doc.text("Website:", centerX, bottomY, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(companyWebsite, centerX, bottomY + 3.2, { align: "center" });

  // Timestamp Center Aligned at the very bottom
  doc.setFont("helvetica", "normal");
  doc.text(timestampStr, centerX, bottomY + 10.4, { align: "center" });

  // Handle Output action
  if (action === "print") {
    doc.autoPrint();
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    
    // Create hidden iframe to print reliably without popup blocking inside iframes
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    printFrame.src = url;
    document.body.appendChild(printFrame);
    
    printFrame.onload = () => {
       setTimeout(() => {
          try {
             printFrame.contentWindow?.focus();
             printFrame.contentWindow?.print();
          } catch (e) {
             console.error("Iframe native print error:", e);
             window.open(url, "_blank");
          }
          setTimeout(() => {
             try {
                document.body.removeChild(printFrame);
             } catch (e) {}
          }, 3000);
       }, 500);
    };
  } else {
    doc.save(`Invoice_${invoice.invoiceNo}.pdf`);
  }

  return true;
}

// Legacy backward-compatibility overrides to prevent compile failures
export async function generateInvoicePdf(
  invoice: Invoice,
  items: InvoiceItem[],
  company: CompanySettings,
  format: "Receipt" | "A5" | "A4" = "A4"
): Promise<boolean> {
  return generateInvoicePDF(invoice.invoiceNo, "download");
}

export function getInvoicePrintHtml(
  invoice: Invoice,
  items: InvoiceItem[],
  company: CompanySettings,
  format: "Receipt" | "A5" | "A4"
): string {
  // Simple trigger wrapper
  setTimeout(() => {
    generateInvoicePDF(invoice.invoiceNo, "print");
  }, 100);
  return `<html><body style="font-family:sans-serif; text-align:center; padding: 40px; color: #444;">
    <h2>Processing Master Print...</h2>
    <p>Please wait for the printable document preview.</p>
    <script>window.onload = function() { setTimeout(function() { window.close(); }, 2000); }</script>
  </body></html>`;
}
