import React, { useState, useEffect, useRef, useMemo } from"react";
import { Plus, Trash2, FileText, Printer, Save, RotateCcw, Search, CheckCircle, UserPlus, Truck, Calendar, Clock, ChevronDown, ChevronUp, Users, X, Download, Sparkles, ShieldCheck, Lock, ChevronRight, Folder, ArrowLeft, Tag, Package, Sliders, ShoppingCart } from"lucide-react";
import { Product, Customer, Invoice, InvoiceItem, CompanySettings, InvoiceStatus, Agent, SimpleVariant, ProductSize } from"../types";
import { SheetsSyncEngine } from"../utils/sheetsSync";
import { getTodayStr, getCurrentTimeStr, getCurrentTimestamp } from '../utils/dateUtils';
import { generateInvoicePDF } from"../utils/pdfGenerator";
import { ProductSearchModal } from "./ProductSearchModal";
import { SimpleProductConfiguratorModal } from "./SimpleProductConfiguratorModal";
import { SimpleProductForm } from "./SimpleProductForm";
import CustomersTab from "./CustomersTab";
import confetti from "canvas-confetti";

interface PosBillingProps {
 products: Product[];
 customers: Customer[];
 company: CompanySettings;
 onInvoiceCreated: () => void;
 onShowNotification: (text: string, type:"success" |"error" |"info") => void;
 onHasUnsavedChanges?: (hasUnsaved: boolean) => void;
 onNavigateToTab?: (tab: string) => void;
}

interface SelectedItem {
 productId: string;
 quantity: number;
 customPrice: number;
 selectedColor?: string;
 selectedSize?: string;
 searchQuery?: string;
 isDropdownOpen?: boolean;
 skuId?: string;
 skuCode?: string;
 hierarchyNodeId?: string;
 hierarchyPath?: string;
 selectedOptions?: Record<string, string>;
 displayName?: string;
 hsnCode?: string;
 isCombo?: boolean;
 comboItems?: any[];
}

export default function PosBilling({
 products,
 customers,
 company,
 onInvoiceCreated,
 onShowNotification,
 onHasUnsavedChanges,
 onNavigateToTab,
}: PosBillingProps) {
 // Current user validation
 const currentUser = SheetsSyncEngine.getCurrentUser();

 // POS States
 const [invoiceNo, setInvoiceNo] = useState("");
 const [customerSearch, setCustomerSearch] = useState("");
 const [mobileNumber, setMobileNumber] = useState("");
 const [customerName, setCustomerName] = useState("");
 const [isNewCustomer, setIsNewCustomer] = useState(false);
 const [lineItems, setLineItems] = useState<SelectedItem[]>([
 { productId:"", quantity: 1, customPrice: 0 },
 ]);
 const [searchRowIndex, setSearchRowIndex] = useState<number | null>(null);
 const [configuratorRowIndex, setConfiguratorRowIndex] = useState<number | null>(null);
 const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"value" | "percent">("value");
  const [roAdjustment, setRoAdjustment] = useState<number>(0);

 // GST Management States & Helpers
 const [gstType, setGstType] = useState<"No GST" |"Within State GST" |"Out-of-State GST">("Within State GST");
 const [customerState, setCustomerState] = useState("");

 const [customerGstNo, setCustomerGstNo] = useState("");
 const [customerBusinessName, setCustomerBusinessName] = useState("");
 const [customerBusinessAddress, setCustomerBusinessAddress] = useState("");
 const [customerStateCode, setCustomerStateCode] = useState("");

 const gstEnabled = gstType !=="No GST";
 const isWithinState = gstType ==="Within State GST";

 const prefillGstDetailsFromHistory = (mobileNum: string) => {
 try {
 const invoicesList = SheetsSyncEngine.getInvoices();
 const matched = invoicesList.filter(
 (inv) => String(inv.mobile ||"").replace(/\D/g,"") === String(mobileNum ||"").replace(/\D/g,"") && (inv.gstType ==="Out-of-State GST" || inv.customerState)
 );
 if (matched.length > 0) {
 const latest = matched[0];
 setGstType(
 latest.gstType ==="Within State GST" || latest.gstType ==="CGST_SGST"
 ?"Within State GST"
 : latest.gstType ==="Out-of-State GST" || latest.gstType ==="IGST"
 ?"Out-of-State GST"
 :"No GST"
 );
 setCustomerState(latest.customerState ||"");
 onShowNotification(`✓ Prefilled customer state from existing billing archives.`,"info");
 }
 } catch (err) {
 console.warn("Failed to lookup GST history.", err);
 }
 };

 // Advanced Selection Modalities
 const [customerSelectionMode, setCustomerSelectionMode] = useState<"existing" |"new">("existing");
 const [existingCustomerSearch, setExistingCustomerSearch] = useState("");
 const [showExistingCustomerList, setShowExistingCustomerList] = useState(false);
 const [allowDuplicateCustomer, setAllowDuplicateCustomer] = useState(false);
 const [quickCustomerSearch, setQuickCustomerSearch] = useState("");
 const [showQuickCustomerSearchList, setShowQuickCustomerSearchList] = useState(false);

 // Direct modal creation states
 const [showAddProductModal, setShowAddProductModal] = useState(false);
 const [showCustomerRegistryModal, setShowCustomerRegistryModal] = useState(false);

 const handleSaveNewProduct = async (productData: any) => {
   try {
     const dataToSave = { ...productData };
     if (!dataToSave.id) {
       dataToSave.id = `PROD-${Date.now()}`;
       dataToSave.nodeType = "Product";
       dataToSave.isLeaf = true;
     }
     
     const newProducts = [...products.filter(p => p.id !== dataToSave.id), dataToSave as Product];
     await SheetsSyncEngine.saveProducts(newProducts);
     SheetsSyncEngine.pushTransaction(SheetsSyncEngine.getConnectionSettings(), "upsertProduct", dataToSave).catch(console.error);
     onShowNotification("Product saved successfully", "success");
     setShowAddProductModal(false);
     if (onInvoiceCreated) onInvoiceCreated();
   } catch (e) {
     console.error(e);
     onShowNotification("Error saving product", "error");
   }
 };

 // Advanced Customer Details states
 const [showCustomerDetails, setShowCustomerDetails] = useState(false);
 const [address, setAddress] = useState("");
 const [secondaryPhone, setSecondaryPhone] = useState("");
 const [secondaryContactName, setSecondaryContactName] = useState("");
 const [notes, setNotes] = useState("");

 // Promo Code States
 const [promoCodeInput, setPromoCodeInput] = useState("");
 const [appliedPromo, setAppliedPromo] = useState<any | null>(null);
 const [promoDiscountAmount, setPromoDiscountAmount] = useState<number>(0);

 // Workflow & Delivery States
 const [status, setStatus] = useState<InvoiceStatus>("Work In Progress");
 const [showDeliveryDetails, setShowDeliveryDetails] = useState(false);
 const [assignedEmployee, setAssignedEmployee] = useState("");
 const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
 const [deliveryNotes, setDeliveryNotes] = useState("");
 const [autoNo, setAutoNo] = useState("");
 const [driverName, setDriverName] = useState("");

 // Referral Agent States
 const [referralAgentId, setReferralAgentId] = useState("");
 const [referralAgentName, setReferralAgentName] = useState("");
 const [agentSearch, setAgentSearch] = useState("");
 const [showAgentList, setShowAgentList] = useState(false);
 const [highlightedAgentIndex, setHighlightedAgentIndex] = useState(-1);

 // Payment Modal States
 const [showPaymentModal, setShowPaymentModal] = useState(false);
 const [paymentType, setPaymentType] = useState<"Full Payment" |"Advance Payment">("Full Payment");
 const [amountReceivedInput, setAmountReceivedInput] = useState<string>("");

 // Post-Save State
 const [savedInvoiceData, setSavedInvoiceData] = useState<{ invoice: Invoice; items: InvoiceItem[] } | null>(null);

 // Advanced Quick Search Shortcut State
 const [pickerSearchQuery, setPickerSearchQuery] = useState("");

 const getColorHex = (colorName: string): string => {
 const name = colorName.toLowerCase().trim();
 if (name ==="brown") return"#8B4513";
 if (name ==="walnut") return"#5C4033";
 if (name ==="black") return"#1A1A1A";
 if (name ==="white") return"#FFFFFF";
 if (name ==="grey" || name ==="gray") return"#808080";
 if (name ==="red") return"#EF4444";
 if (name ==="blue") return"#3B82F6";
 if (name ==="green") return"#10B981";
 if (name ==="teak") return"#D2B48C";
 if (name ==="natural") return"#F5DEB3";
 return"";
 };

 const visualCategories = useMemo(() => {
  const uniqueCats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  return uniqueCats.map((cat, idx) => ({
  id: `CAT-TEXT-${idx}`,
  name: cat,
  category: cat,
  isLeaf: false,
  price: 0,
  unit:"Pcs",
  } as any as Product));
  }, [products]);


 // Load staff list (active employees) for assignment from registered Employees Table
 const activeStaff = SheetsSyncEngine.getEmployees().filter(e => e.status ==="Active");

  // Auto-generate invoice number on load
  useEffect(() => {
    const prefix = company.invoicePrefix || "YR";
    const nextNum = company.nextInvoiceNumber || 1001;
    const terminalId = SheetsSyncEngine.getTerminalId();
    const suffix = terminalId ? `-${terminalId}` : "";
    setInvoiceNo(`${prefix}-${nextNum}${suffix}`);
  }, [company]);

 // Handle auto-detecting customer profile from mobile input
 const handleMobileChange = (num: string) => {
 const cleaned = String(num ||"").replace(/\D/g,"");
 setMobileNumber(cleaned);

 if (cleaned.length >= 8) {
 const match = customers.find((c) => String(c.mobile ||"").replace(/\D/g,"") === cleaned);
 if (match) {
 setCustomerName(match.name);
 setAddress(match.address ||"");
 setSecondaryPhone(match.secondaryPhone ||"");
 setSecondaryContactName(match.secondaryContactName ||"");
 setNotes(match.notes ||"");
 setIsNewCustomer(false);
 onShowNotification(`✓ Profile Detected: ${match.name}`,"info");
 prefillGstDetailsFromHistory(cleaned);
 } else {
 setIsNewCustomer(true);
 setAddress("");
 setSecondaryPhone("");
 setSecondaryContactName("");
 setNotes("");
 // Clear customer specific GST variables for new client
 setCustomerState("");
 setGstType(company.gstEnabledByDefault ?"Within State GST" :"No GST");
 setCustomerGstNo("");
 setCustomerBusinessName("");
 setCustomerBusinessAddress("");
 setCustomerStateCode("");
 }
 } else {
 setIsNewCustomer(false);
 }
 };

 // Merge duplicate line items: if same product, same color, and same price, combine them
 const mergeDuplicateLineItems = (items: SelectedItem[]): SelectedItem[] => {
 const merged: SelectedItem[] = [];
 items.forEach((item) => {
 if (!item.productId) {
 merged.push(item);
 return;
 }
 const matchIndex = merged.findIndex(
 (m) =>
 m.productId === item.productId &&
 (m.selectedColor ||"") === (item.selectedColor ||"") &&
 m.customPrice === item.customPrice
 );
 if (matchIndex > -1) {
 merged[matchIndex].quantity += item.quantity;
 } else {
 merged.push({ ...item });
 }
 });
 return merged;
 };

 // Add empty row
 const addRow = () => {
 setLineItems([...lineItems, { productId:"", quantity: 1, customPrice: 0, searchQuery:"", isDropdownOpen: true }]);
 };

 // Remove row
 const removeRow = (index: number) => {
 if (lineItems.length === 1) {
 setLineItems([{ productId:"", quantity: 1, customPrice: 0, searchQuery:"", isDropdownOpen: false }]);
 return;
 }
 const updated = [...lineItems];
 updated.splice(index, 1);
 setLineItems(updated);
 };

 const updateRowSearchQuery = (index: number, query: string) => {
 const updated = [...lineItems];
 updated[index].searchQuery = query;
 updated[index].isDropdownOpen = true;
 setLineItems(updated);
 };

 const sellableOptions = useMemo(() => {
    const options: { 
      type: "Product"; 
      product: Product; 
      id: string; // unique key
      displayText: string; 
      searchableText: string;
      price: number;
      skuCode?: string;
    }[] = [];
    products.forEach(p => {
      options.push({
        type: "Product",
        product: p,
        id: p.id,
        displayText: p.name + (p.category ? ` (${p.category})` : ""),
        searchableText: (p.name + " " + (p.sku || "") + " " + (p.category || "")).toLowerCase(),
        price: p.price || 0,
        skuCode: p.sku
      });
    });

    return options;
  }, [products]);

 const filteredPickerOptions = useMemo(() => {
 if (!pickerSearchQuery.trim()) return [];
 const lower = pickerSearchQuery.toLowerCase().trim();
 return sellableOptions.filter(o => o.searchableText.includes(lower)).slice(0, 5);
 }, [pickerSearchQuery, sellableOptions]);

 const setRowDropdownOpen = (index: number, isOpen: boolean) => {
 const updated = [...lineItems];
 updated[index].isDropdownOpen = isOpen;
 setLineItems(updated);
 };

 const updateRowProductVariant = (index: number, product: Product, variant: SimpleVariant, color?: string, size?: ProductSize) => {
    const updated = [...lineItems];
    updated[index].productId = product.id;
    updated[index].hierarchyNodeId = product.id;
    updated[index].skuId = variant.id;
    updated[index].skuCode = variant.name;
    updated[index].customPrice = variant.price + (size?.price || 0);
    
    // Format product name as: Product Name Variant Name Color Size
    let pathComplete = [product.name, variant.name !== "Standard" && variant.name !== "Bundle" ? variant.name : null, color, size?.name].filter(Boolean).join(" ");
    if (product.isCombo && product.comboItems && product.comboItems.length > 0) {
      pathComplete += ` (Includes: ${product.comboItems.map(c => c.productName).join(", ")})`;
    }
    
    updated[index].hierarchyPath = pathComplete;
    updated[index].searchQuery = pathComplete;
    updated[index].displayName = pathComplete;
    updated[index].isDropdownOpen = false;
    updated[index].selectedColor = color;
    updated[index].selectedSize = size?.name;
    updated[index].isCombo = product.isCombo;
    updated[index].comboItems = product.isCombo && product.comboItems ? [...product.comboItems] : [];
    
    setLineItems(updated);
  };

 const updateRowQty = (index: number, qty: number) => {
 const updated = [...lineItems];
 updated[index].quantity = Math.max(1, qty);
 setLineItems(updated);
 };

 const updateRowPrice = (index: number, price: number) => {
 const updated = [...lineItems];
 updated[index].customPrice = Math.max(0, price);
 setLineItems(mergeDuplicateLineItems(updated));
 };

 const updateRowColor = (index: number, color: string) => {
 const updated = [...lineItems];
 updated[index].selectedColor = color;
 setLineItems(mergeDuplicateLineItems(updated));
 };

 // Compute Subtotal
 let subtotal = 0;
 lineItems.forEach((row) => {
 subtotal += row.quantity * row.customPrice;
 });

 // Compute Discount
 const computedDiscount =
 discountType ==="percent" ? subtotal * (discount / 100) : discount;

 // Let's dynamically update promo code discount when subtotal changes
 const activePromoDiscount = (() => {
 if (!appliedPromo) return 0;
 let amt = 0;
 if (appliedPromo.discountType ==="Percentage" && appliedPromo.percentageDiscount) {
 amt = subtotal * (appliedPromo.percentageDiscount / 100);
 } else if (appliedPromo.discountType ==="Fixed" && appliedPromo.fixedDiscount) {
 amt = appliedPromo.fixedDiscount;
 }
 const rem = Math.max(0, subtotal - computedDiscount);
 return Math.min(amt, rem);
 })();

 // Compute subtotals and discounts
 const taxableSubtotal = Math.max(0, subtotal - computedDiscount - activePromoDiscount);

 const cgstPercentage = company.cgstPercentage ?? 9;
 const sgstPercentage = company.sgstPercentage ?? 9;
 const igstPercentage = company.igstPercentage ?? 18;

 let cgstAmount = 0;
 let sgstAmount = 0;
 let igstAmount = 0;
 let taxAmount = 0;

 if (gstEnabled) {
 if (isWithinState) {
 cgstAmount = taxableSubtotal * (cgstPercentage / 100);
 sgstAmount = taxableSubtotal * (sgstPercentage / 100);
 taxAmount = cgstAmount + sgstAmount;
 } else {
 igstAmount = taxableSubtotal * (igstPercentage / 100);
 taxAmount = igstAmount;
 }
 }

 const subtotalWithTax = taxableSubtotal + taxAmount;
 const grandTotal = Math.max(0, subtotalWithTax + roAdjustment);

 // Apply promo code dynamically if typed
 const handleApplyPromoCode = () => {
 if (!promoCodeInput.trim()) {
 onShowNotification("Please enter a voucher code.","error");
 return;
 }
 const cleanInp = promoCodeInput.trim().toUpperCase();
 const available = SheetsSyncEngine.getPromoCodes();
 const found = available.find(p => p.promoCode === cleanInp);

 if (!found) {
 onShowNotification(`Coupon Code '${cleanInp}' is invalid or has expired.`,"error");
 setAppliedPromo(null);
 return;
 }

 if (found.activeStatus !=="Active") {
 onShowNotification(`Coupon Code '${cleanInp}' is disabled.`,"error");
 return;
 }

 const todayStr = new Date().toISOString().split("T")[0];
 if (todayStr < found.startDate || todayStr > found.endDate) {
 onShowNotification(`Coupon Code '${cleanInp}' is out of validity range.`,"error");
 return;
 }

 if (found.usageCount >= found.maximumUsage) {
 onShowNotification(`Coupon Code '${cleanInp}' usage quota of ${found.maximumUsage} has been exhausted.`,"error");
 return;
 }

 setAppliedPromo(found);
 onShowNotification(`✓ Promotion applied: ${found.description}`,"success");
 };

 const handleRemovePromoCode = () => {
 setAppliedPromo(null);
 setPromoCodeInput("");
 onShowNotification("Promotion removed.","info");
 };

 // Draft States
 const [draftId, setDraftId] = useState<string>(`DRAFT-${Date.now()}`);
 const [hasDraftPrompt, setHasDraftPrompt] = useState(false);
 const [loadedDrafts, setLoadedDrafts] = useState<any[]>([]);

 useEffect(() => {
 // Check initial drafts
 const drafts = SheetsSyncEngine.getDrafts();
 if (drafts && drafts.length > 0) {
 setLoadedDrafts(drafts);
 setHasDraftPrompt(true);
 }
 }, []);

 const saveDraftSilent = () => {
 if (hasDraftPrompt) return;
 if (!mobileNumber && lineItems.length === 1 && !lineItems[0].productId) return;
 
 // Auto-save doesn't require address. 
 // We remove the address required block from here.
 
 // We map SelectedItem to InvoiceItem structure roughly so it's consistent
 const mappedLineItems: any[] = lineItems.map((row) => {
 const prod = products.find(p => p.id === row.productId);
 return {
 productId: row.productId,
 productName: prod ? prod.name :"",
 displayName: row.displayName || row.hierarchyPath || (prod ? prod.name :""),
 quantity: row.quantity,
 unitPrice: row.customPrice,
 amount: row.quantity * row.customPrice,
 selectedColor: row.selectedColor,
 hierarchyNodeId: row.productId,
 skuId: row.skuId,
 hierarchyPath: row.hierarchyPath,
 skuCode: row.skuCode
 };
 });

 const draft = {
 id: draftId,
 createdDate: new Date().toISOString(),
 customerName, mobileNumber, customerState,
 lineItems: mappedLineItems, gstType, gstEnabled, promoCodeInput,
 assignedEmployee, referralAgentId, referralAgentName,
 paymentType, amountReceivedInput, deliveryNotes, notes,
 draftAmount: grandTotal,
 discount, discountType, roAdjustment,
 isNewCustomer, address, secondaryPhone, secondaryContactName,
 customerGstNo, customerBusinessName, customerBusinessAddress, customerStateCode,
 customerSelectionMode, expectedDeliveryDate, autoNo, driverName
 };
 SheetsSyncEngine.saveDraft(draft);
 if (onHasUnsavedChanges) onHasUnsavedChanges(true);
 };

 useEffect(() => {
 const timer = setInterval(() => {
 saveDraftSilent();
 }, 5000); // Check every 5s instead
 return () => clearInterval(timer);
 }, [
 draftId, customerName, mobileNumber, customerState, lineItems, gstType, promoCodeInput,
 assignedEmployee, referralAgentId, referralAgentName, paymentType, amountReceivedInput,
 deliveryNotes, notes, grandTotal, discount, discountType, roAdjustment, isNewCustomer, address,
 secondaryPhone, secondaryContactName, customerGstNo, customerBusinessName,
 customerBusinessAddress, customerStateCode, customerSelectionMode, hasDraftPrompt, expectedDeliveryDate, autoNo, driverName
 ]);

 // Sync draft event listeners
 useEffect(() => {
 const handleClear = () => SheetsSyncEngine.deleteDraft(draftId);
 const handleSave = () => saveDraftSilent();
 window.addEventListener('clear-draft', handleClear);
 window.addEventListener('save-draft', handleSave);
 return () => {
 window.removeEventListener('clear-draft', handleClear);
 window.removeEventListener('save-draft', handleSave);
 }
 }, [draftId, saveDraftSilent]);

 // Check if we have changed any data
 useEffect(() => {
 const hasData = (mobileNumber.trim().length > 0) || (lineItems.some(i => i.productId !==""));
 const timer = setTimeout(() => {
 if (onHasUnsavedChanges) onHasUnsavedChanges(hasData);
 }, 100);
 return () => clearTimeout(timer);
 }, [mobileNumber, lineItems, onHasUnsavedChanges]);

 const loadDraft = (draft: any) => {
    console.log("Loading draft:", draft);
    setDraftId(draft.id);
    setCustomerName(draft.customerName || "");
    setMobileNumber(draft.mobileNumber || "");
    setCustomerState(draft.customerState || "");
    
    // UI states
    const isNew = draft.customerSelectionMode === "new" || draft.isNewCustomer || false;
    setCustomerSelectionMode(isNew ? "new" : "existing");
    
    if (!isNew && draft.mobileNumber) {
      const cleanedMobile = String(draft.mobileNumber).replace(/\D/g, "");
      const customerList = customers.length > 0 ? customers : SheetsSyncEngine.getCustomers();
      const matchedCust = customerList.find(c => String(c.mobile || "").replace(/\D/g, "") === cleanedMobile);
      if (matchedCust) {
        setExistingCustomerSearch(`${matchedCust.id} - ${matchedCust.name}`);
        setCustomerName(draft.customerName || matchedCust.name || "");
        setMobileNumber(draft.mobileNumber || String(matchedCust.mobile || ""));
        setAddress(draft.address || matchedCust.address || "");
        setSecondaryPhone(draft.secondaryPhone || matchedCust.secondaryPhone || "");
        setSecondaryContactName(draft.secondaryContactName || matchedCust.secondaryContactName || "");
        setNotes(draft.notes || matchedCust.notes || "");
      } else {
        setExistingCustomerSearch(draft.mobileNumber);
      }
    }
 
 // Restore line items
 if (draft.lineItems && draft.lineItems.length > 0) {
 setLineItems(draft.lineItems.map((item: any) => ({
 productId: item.productId,
 quantity: item.quantity,
 customPrice: item.unitPrice,
 selectedColor: item.selectedColor,
 skuId: item.skuId,
 hierarchyNodeId: item.hierarchyNodeId || item.productId,
 hierarchyPath: item.hierarchyPath,
 skuCode: item.skuCode,
 displayName: item.displayName || item.hierarchyPath || item.productName,
 searchQuery: item.skuId ? item.hierarchyPath : (products.find(p => p.id === item.productId) ? products.find(p => p.id === item.productId)!.name :""),
 isCombo: item.isCombo,
 comboItems: item.comboItems || [],
 isDropdownOpen: false
 })));
 } else {
 setLineItems([{ productId:"", quantity: 1, customPrice: 0 }]);
 }
 
 setGstType(draft.gstType ||"Within State GST");
 setPromoCodeInput(draft.promoCodeInput ||"");
 setAssignedEmployee(draft.assignedEmployee ||"");
 setExpectedDeliveryDate(draft.expectedDeliveryDate ||"");
 setDeliveryNotes(draft.deliveryNotes ||"");
 setAutoNo(draft.autoNo ||"");
 setDriverName(draft.driverName ||"");
 
 setReferralAgentId(draft.referralAgentId ||"");
 setReferralAgentName(draft.referralAgentName ||"");
 setAgentSearch(draft.referralAgentName ||""); // Update UI search field
 
 setPaymentType(draft.paymentType ||"Full Payment");
 setAmountReceivedInput(draft.amountReceivedInput !== undefined ? draft.amountReceivedInput.toString() :"");
 setNotes(draft.notes ||"");
 setDiscount(draft.discount || 0);
 setDiscountType(draft.discountType ||"value");
 setRoAdjustment(draft.roAdjustment || 0);
 setIsNewCustomer(draft.isNewCustomer || false);
 setAddress(draft.address ||"");
 setSecondaryPhone(draft.secondaryPhone ||"");
 setSecondaryContactName(draft.secondaryContactName ||"");
 setCustomerGstNo(draft.customerGstNo ||"");
 setCustomerBusinessName(draft.customerBusinessName ||"");
 setCustomerBusinessAddress(draft.customerBusinessAddress ||"");
 setCustomerStateCode(draft.customerStateCode ||"");
 
 setHasDraftPrompt(false);
 setLoadedDrafts([]);
 if (onHasUnsavedChanges) onHasUnsavedChanges(true);
 onShowNotification("Draft restored successfully.","success");
 console.log("Draft restored successfully!");
 };

 const discardDrafts = () => {
 SheetsSyncEngine.saveDrafts([]);
 setHasDraftPrompt(false);
 setLoadedDrafts([]);
 onShowNotification("Drafts discarded.","info");
 };

 const clearForm = () => {
 const prefix = company.invoicePrefix || "YR";
 const nextNum = company.nextInvoiceNumber || 1001;
 const terminalId = SheetsSyncEngine.getTerminalId();
 const suffix = terminalId ? `-${terminalId}` : "";
 setInvoiceNo(`${prefix}-${nextNum}${suffix}`);
 setMobileNumber("");
 setCustomerName("");
 setCustomerSearch("");
 setIsNewCustomer(false);
 setDiscount(0);
 setRoAdjustment(0);
 setLineItems([{ productId:"", quantity: 1, customPrice: 0 }]);
 setStatus("Work In Progress");
 setAssignedEmployee("");
 setExpectedDeliveryDate("");
 setDeliveryNotes("");
 setAutoNo("");
 setDriverName("");
 setShowDeliveryDetails(false);

 // Draft wipe
 SheetsSyncEngine.deleteDraft(draftId);
 setDraftId(`DRAFT-${Date.now()}`);
 if (onHasUnsavedChanges) onHasUnsavedChanges(false);

 // Reset Advanced Selection states
 setCustomerSelectionMode("existing");
 setExistingCustomerSearch("");
 setShowExistingCustomerList(false);
 setAllowDuplicateCustomer(false);
 setQuickCustomerSearch("");
 setShowQuickCustomerSearchList(false);

 // Reset advanced details
 setShowCustomerDetails(false);
 setAddress("");
 setSecondaryPhone("");
 setSecondaryContactName("");
 setNotes("");

 // Reset Referral Agent states
 setReferralAgentId("");
 setReferralAgentName("");
 setAgentSearch("");
 setShowAgentList(false);

 // Reset Promo settings
 setPromoCodeInput("");
 setAppliedPromo(null);

 // Reset GST parameters
 setGstType(company.gstEnabledByDefault ?"Within State GST" :"No GST");
 setCustomerState("");
 setCustomerGstNo("");
 setCustomerBusinessName("");
 setCustomerBusinessAddress("");
 setCustomerStateCode("");
 };

 // Dynamic Format modal states
 const [showPrintModal, setShowPrintModal] = useState(false);
 const [showDownloadModal, setShowDownloadModal] = useState(false);
 const [selectedPrintFormat, setSelectedPrintFormat] = useState<"Receipt" |"A5" |"A4">("Receipt");
 const [selectedDownloadFormat, setSelectedDownloadFormat] = useState<"Receipt" |"A5" |"A4">("A4");

 // Print raw HTML invoice using standard print window
 const printReceiptNative = () => {
 if (lineItems.some((item) => !item.productId)) {
 onShowNotification("Please select products for all billing rows before printing.","error");
 return;
 }
 setSelectedPrintFormat(company.defaultPrintFormat ||"Receipt");
 setShowPrintModal(true);
 };

 // Download PDF A4 Trigger
 const downloadInvoicePdf = () => {
 if (lineItems.some((item) => !item.productId)) {
 onShowNotification("Please select products inside all rows before downloading.","error");
 return;
 }
 setSelectedDownloadFormat(company.defaultDownloadFormat ||"A4");
 setShowDownloadModal(true);
 };

 const handleExecutePrint = () => {
 setShowPrintModal(false);

 if (!savedInvoiceData) {
 onShowNotification("Please save the invoice before printing.","error");
 return;
 }

 const docId = savedInvoiceData.invoice.invoiceId || savedInvoiceData.invoice.invoiceNo;
 generateInvoicePDF(docId,"print");
 onShowNotification(`✓ Printed invoice ${savedInvoiceData.invoice.invoiceNo}`,"success");
 };

 const handleExecuteDownload = () => {
 setShowDownloadModal(false);

 if (!savedInvoiceData) {
 onShowNotification("Please save the invoice before downloading.","error");
 return;
 }

 const docId = savedInvoiceData.invoice.invoiceId || savedInvoiceData.invoice.invoiceNo;
 generateInvoicePDF(docId,"download");
 onShowNotification(`✓ Downloaded PDF invoice for ${savedInvoiceData.invoice.invoiceNo}`,"success");
 };

 // Submit Invoice to active databases
 const handleCompleteClick = () => {
 if (lineItems.some((item) => !item.productId)) {
 onShowNotification("Please configure valid products for all active rows.","error");
 return;
 }

 if (!customerName.trim() || !mobileNumber.trim()) {
 onShowNotification("Please fill in name and mobile details (*)","error");
 return;
 }
 
 if (!address || address.trim() ==="") {
 onShowNotification("Address is required.","error"); 
 return;
 }

 const cleanPrim = String(mobileNumber ||"").replace(/\D/g,"");
 const cleanSec = String(secondaryPhone ||"").replace(/\D/g,"");
 if (cleanSec !=="" && cleanPrim === cleanSec) {
 onShowNotification("Primary and Secondary Mobile Numbers cannot be identical.","error");
 return;
 }

 const cleanedMobile = String(mobileNumber ||"").replace(/\D/g,"");
 if (customerSelectionMode ==="new" && cleanedMobile.length >= 8) {
 const duplicateFound = customers.find((c) => String(c.mobile ||"").replace(/\D/g,"") === cleanedMobile);
 if (duplicateFound && !allowDuplicateCustomer) {
 if (currentUser?.role ==="Admin") {
 onShowNotification("Duplicate mobile detected. Click 'Create Anyway' to authorize bypass as Admin.","error");
 return;
 } else {
 onShowNotification("Duplicate mobile detected! Please link to existing customer or register with a unique mobile number.","error");
 return;
 }
 }
 }

 setShowPaymentModal(true);
 setPaymentType("Full Payment");
 setAmountReceivedInput(grandTotal.toString());
 };

 const handleSaveInvoice = async () => {
 if (!address || address.trim() ==="") {
 onShowNotification("Cannot create invoice without customer address.","error");
 return;
 }

 const cleanPrim = String(mobileNumber ||"").replace(/\D/g,"");
 const cleanSec = String(secondaryPhone ||"").replace(/\D/g,"");
 if (cleanSec !=="" && cleanPrim === cleanSec) {
 onShowNotification("Primary and Secondary Mobile Numbers cannot be identical.","error");
 return;
 }

 let finalAmountPaid = grandTotal;
 let finalBalanceDue = 0;
 let finalPaymentStatus:"Paid" |"Partially Paid" |"Balance Pending" ="Paid";
 
 if (paymentType ==="Advance Payment") {
 const amt = parseFloat(amountReceivedInput);
 if (isNaN(amt) || amt <= 0 || amt > grandTotal) {
 onShowNotification("Invalid Advance Payment amount.","error");
 return;
 }
 finalAmountPaid = amt;
 finalBalanceDue = grandTotal - amt;
 finalPaymentStatus = finalBalanceDue === grandTotal ?"Balance Pending" :"Partially Paid";
 }

 setShowPaymentModal(false);

 let finalInvoiceNo = invoiceNo;
 const conn = SheetsSyncEngine.getConnectionSettings();
 if (conn.isConnected && conn.appsScriptUrl) {
 onShowNotification("Generating secure invoice number from server...","info");
 try {
 const payload = {
 action:"generateInvoiceNumber",
 spreadsheetId: conn.spreadsheetId,
 data: {
 isGst: gstEnabled,
 prefix: company.invoicePrefix ||"TCF"
 }
 };
 const res = await fetch(conn.appsScriptUrl, {
 method:"POST", mode:"cors", headers: {"Content-Type":"text/plain;charset=utf-8" }, body: JSON.stringify(payload)
 });
  const resJson = await res.json();
  if (resJson.success && resJson.invoiceNumber) {
    const terminalId = SheetsSyncEngine.getTerminalId();
    const suffix = terminalId ? `-${terminalId}` : "";
    let secureNo = resJson.invoiceNumber;
    if (terminalId && !secureNo.endsWith(`-${terminalId}`)) {
      secureNo = `${secureNo}${suffix}`;
    }
    finalInvoiceNo = secureNo;
    setInvoiceNo(finalInvoiceNo);
  }
 } catch (e) {
 console.warn("Counter sequence fetch failed, falling back to local.", e);
 }
 }

 const TODAY_STR = getTodayStr();
 const TIME_STR = getCurrentTimeStr();
 const CREATED_TIMESTAMP = getCurrentTimestamp();

 const activeAgent = referralAgentId ? SheetsSyncEngine.getAgents().find(a => a.id === referralAgentId) : null;
 const isGstEnabledVal = gstEnabled;
 const category = isGstEnabledVal ?"GST" :"NON_GST";
 
 if (gstEnabled && category !=="GST") {
 onShowNotification("GST classification mismatch detected.","error");
 return;
 }

 const internalInvoiceId = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

 const activeInvoice: Invoice = {
 invoiceId: internalInvoiceId,
 invoiceCategory: category,
 invoiceNo: finalInvoiceNo,
 date: TODAY_STR, // Legacy
 invoiceDate: TODAY_STR,
 invoiceTime: TIME_STR,
 createdTimestamp: CREATED_TIMESTAMP,
 customerName: String(customerName ||"").trim() ||"Walk-in Customer",
 mobile: String(mobileNumber ||"").trim() ||"N/A",
 customerPrimaryPhone: String(mobileNumber ||"").trim() ||"N/A",
 customerBusinessAddress: String(address ||"").trim(),
 customerSecondaryPhone: String(secondaryPhone ||"").trim(),
 customerSecondaryContactName: String(secondaryContactName ||"").trim(),
 notes: String(notes ||"").trim() || undefined,
 itemCount: lineItems.length,
 subtotal: subtotal,
 discount: computedDiscount,
 roAdjustment: roAdjustment,
 grandTotal: grandTotal,
 
 // Extended workflow details
 status: status,
 assignedEmployee: assignedEmployee || undefined,
 expectedDeliveryDate: expectedDeliveryDate || undefined,
 deliveryNotes: deliveryNotes || undefined,
 autoNo: autoNo || undefined,
 driverName: driverName || undefined,
 
 // Billing Ownership trace controls
 createdBy: currentUser?.username ||"admin",
 createdDate: TODAY_STR, // Legacy
 createdTime: TIME_STR, // Legacy

 // Payment Collection fields
 paymentType: paymentType,
 amountPaid: finalAmountPaid,
 balanceDue: finalBalanceDue,
 paymentStatus: finalPaymentStatus,

 // Advanced financial tracking and agent linkages
 grossAmount: subtotal,
 promoCode: appliedPromo?.promoCode || undefined,
 promoDiscountAmount: activePromoDiscount || undefined,
 agentId: SheetsSyncEngine.getAgents().find(a => a.name === assignedEmployee)?.id || undefined,
 agentName: assignedEmployee || undefined,
 referralAgentId: referralAgentId || undefined,
 referralAgentName: referralAgentName || undefined,
 referralAgentCategory: activeAgent ?"External" : undefined, // fallback
 referralAgentType: activeAgent?.agentType || undefined,
 companyRetainedAmount: status ==="Cancelled" ? 0 : grandTotal,

 // GST Management fields
 gstEnabled: gstEnabled,
 gstType: gstType,
 customerState: gstType ==="Out-of-State GST" ? String(customerState ||"").trim() : undefined,
 cgstPercentage: gstType ==="Within State GST" ? cgstPercentage : undefined,
 sgstPercentage: gstType ==="Within State GST" ? sgstPercentage : undefined,
 igstPercentage: gstType ==="Out-of-State GST" ? igstPercentage : undefined,
 cgstAmount: gstType ==="Within State GST" ? cgstAmount : undefined,
 sgstAmount: gstType ==="Within State GST" ? sgstAmount : undefined,
 igstAmount: gstType ==="Out-of-State GST" ? igstAmount : undefined,
 taxAmount: gstEnabled ? taxAmount : undefined,
 };

 const activeItems: InvoiceItem[] = lineItems.filter(row => row.productId).map((row) => {
 const prod = products.find((p) => p.id === row.productId);
 
 let rowHsn = row.hsnCode;
 if (rowHsn === undefined || rowHsn.trim() ==="") {
  rowHsn = "";
  if (prod) {
  rowHsn = prod.hsnCode || "";
  }
 }
 if (!rowHsn || rowHsn.trim() ==="") {
  rowHsn ="9403";
 }

 return {
 invoiceId: internalInvoiceId,
 invoiceNo: finalInvoiceNo,
 productId: row.productId,
 productName: prod ? prod.name :"N/A",
 displayName: row.displayName || row.hierarchyPath || (prod ? prod.name :"N/A"),
 variant: row.selectedColor ||"",
 quantity: row.quantity,
 unitPrice: row.customPrice,
 amount: row.quantity * row.customPrice,
 selectedColor: row.selectedColor,
 hierarchyNodeId: row.productId,
 skuId: row.skuId,
 hierarchyPath: row.hierarchyPath,
 skuCode: row.skuCode,
 selectedOptions: row.selectedOptions,
 hsnCode: rowHsn.trim(),
 isCombo: row.isCombo,
 comboItems: row.comboItems
 };
 });

 try {
 // 1. Update client local-storage first
 const currentInvoices = SheetsSyncEngine.getInvoices();
 const currentItems = SheetsSyncEngine.getInvoiceItems();
 const currentCustomers = SheetsSyncEngine.getCustomers();

 // Advanced customer records update
 let finalCustomers = [...currentCustomers];
 if (activeInvoice.customerName !=="Walk-in Customer" && activeInvoice.mobile !=="N/A" && activeInvoice.mobile !=="") {
 const existingIdx = currentCustomers.findIndex((c) => String(c.mobile ||"").replace(/\D/g,"") === String(activeInvoice.mobile ||"").replace(/\D/g,""));
 if (existingIdx === -1 || (customerSelectionMode ==="new" && allowDuplicateCustomer)) {
 const freshCust: Customer = {
 id: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
 name: activeInvoice.customerName,
 mobile: activeInvoice.mobile,
 address: address ||"POS Checkout Client",
 secondaryPhone: secondaryPhone || undefined,
 secondaryContactName: secondaryContactName || undefined,
 notes: notes || undefined,
 };
 finalCustomers = [freshCust, ...currentCustomers];
 } else {
 finalCustomers[existingIdx] = {
 ...finalCustomers[existingIdx],
 name: activeInvoice.customerName,
 address: address || finalCustomers[existingIdx].address,
 secondaryPhone: secondaryPhone || finalCustomers[existingIdx].secondaryPhone,
 secondaryContactName: secondaryContactName || finalCustomers[existingIdx].secondaryContactName,
 notes: notes || finalCustomers[existingIdx].notes,
 };
 }
 SheetsSyncEngine.saveCustomers(finalCustomers);
 }

 // Record promo code increment usage counts
 if (appliedPromo) {
 const promoList = SheetsSyncEngine.getPromoCodes();
 const updatedPromos = promoList.map(p => {
 if (p.promoCode === appliedPromo.promoCode) {
 return { ...p, usageCount: p.usageCount + 1 };
 }
 return p;
 });
 SheetsSyncEngine.savePromoCodes(updatedPromos);
 }

 // Track Product Analytics increments
 const productsList = SheetsSyncEngine.getProducts();
 let modifiedProducts = false;
 const updatedProducts = productsList.map(p => {
 // Find all matching sold active items for this product
 const soldItemsForThisProduct = activeItems.filter(i => i.productId === p.id);
 if (soldItemsForThisProduct.length > 0) {
 modifiedProducts = true;
 const totalQtySold = soldItemsForThisProduct.reduce((sum, item) => sum + item.quantity, 0);
 const totalAmountSold = soldItemsForThisProduct.reduce((sum, item) => sum + item.amount, 0);

 return {
 ...p,
 unitsSold: (p.unitsSold || 0) + totalQtySold,
 revenueGenerated: (p.revenueGenerated || 0) + totalAmountSold,
 lastSoldDate: activeInvoice.date
 };
 }
 return p;
 });

   if (modifiedProducts) {
    SheetsSyncEngine.saveProducts(updatedProducts);
    // Push product updates in background silently
    setTimeout(() => {
      const connAsync = SheetsSyncEngine.getConnectionSettings();
      if (connAsync && connAsync.appsScriptUrl) {
        const uniqueProductIds = Array.from(new Set(activeItems.map(item => item.productId).filter(Boolean)));
        
        const runSequentialProductUpdates = async () => {
          for (const prodId of uniqueProductIds) {
            const matchedProduct = updatedProducts.find(p => p.id === prodId);
            if (matchedProduct) {
              await SheetsSyncEngine.pushTransaction(connAsync, "upsertProduct", matchedProduct).catch((err) => {
                console.error("Failed to push sequential product stats update:", err);
              });
            }
          }
        };
        runSequentialProductUpdates();
      }
    }, 250);
  }

 // Prepend fresh records
 SheetsSyncEngine.saveInvoices([activeInvoice, ...currentInvoices], true);
 SheetsSyncEngine.saveInvoiceItems([...activeItems, ...currentItems]);

 // Increment Company settings local number mapping
 const updatedCompany = { ...company, nextInvoiceNumber: company.nextInvoiceNumber + 1 };
 SheetsSyncEngine.saveCompanySettings(updatedCompany);

 // Audit log recording
 SheetsSyncEngine.addAuditLog(
"Bill Created",
 currentUser?.fullName ||"System Admin",
"None",
 `Invoice ${invoiceNo} generated for ${activeInvoice.customerName} with grand total ₹${grandTotal.toFixed(2)}. Status: ${status}.`
 );

 // 2. Synchronize upstream
 const conn = SheetsSyncEngine.getConnectionSettings();
 onShowNotification("Saving Invoice details...","info");
 
 const syncResult = await SheetsSyncEngine.pushTransaction(conn,"createInvoice", {
 invoice: activeInvoice,
 items: activeItems,
 customerAddress: address,
 clientNotes: notes,
 secondaryPhone: secondaryPhone,
 secondaryContactName: secondaryContactName
 });

 if (syncResult.success) {
 onShowNotification(`✓ Invoice ${invoiceNo} saved & synced successfully to Google Sheets.`,"success");
 } else {
 onShowNotification(`Success: Invoice ${invoiceNo} recorded locally. Sheets pending.`,"success");
 }

 confetti({
 particleCount: 80,
 spread: 60,
 origin: { y: 0.8 },
 colors: ["#2563EB","#16A34A","#FBBF24"],
 });

 setSavedInvoiceData({ invoice: activeInvoice, items: activeItems });

 clearForm();
 // Restore savedInvoiceData since clearForm might not touch it, or does it? Wait, let's look at clearForm first... 
 // Actually, I should just set it *after* clearForm just in case.
 setSavedInvoiceData({ invoice: activeInvoice, items: activeItems });

 onInvoiceCreated();

 } catch (e: any) {
 console.error("Save invoice defect:", e);
 onShowNotification("Verification Error: Failed to commit checkout transaction.","error");
 }
  };

  return (
 <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in duration-300 relative">
 {hasDraftPrompt && loadedDrafts.length > 0 && (
 <div className="absolute inset-0 z-50 flex items-center justify-center bg-card/40 backdrop-blur-sm rounded-xl">
 <div className="w-full max-w-sm rounded-[24px] bg-card shadow-2xl p-6">
 <h2 className="text-lg font-bold text-primary dark:text-primary mb-2">Unsaved Draft Found</h2>
 <p className="text-sm border-t border-default pt-3 pb-4 text-muted font-sans">
 There is an unsaved invoice draft from {new Date(loadedDrafts[0].createdDate).toLocaleString()}. Do you want to resume?
 </p>
 <div className="flex gap-3">
 <button
 onClick={discardDrafts}
 className="flex-1 rounded-xl bg-card-secondary px-4 py-2.5 text-xs font-semibold text-muted dark:text-muted hover:bg-gray-200 dark:hover:bg-zinc-800 border-none cursor-pointer"
 >
 Discard Draft
 </button>
 <button
 onClick={() => loadDraft(loadedDrafts[0])}
 className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-primary hover:bg-blue-700 active:scale-95 border-none cursor-pointer"
 >
 Resume Draft
 </button>
 </div>
 </div>
 </div>
 )}

 {/* LEFT: PRODUCTS COUNTER POS SHEET */}
 <div className="rounded-xl border border-default bg-card p-5 shadow-sm lg:col-span-2 space-y-6 transition-colors">
 <div className="flex items-center justify-between border-b border-gray-50 dark:border-default/60 pb-3">
 <h2 className="font-bold text-primary dark:text-primary text-sm">POS Billing Basket</h2>
 <div className="flex items-center gap-2">
 <span className="text-[10px] uppercase font-bold text-muted">OPERATOR:</span>
 <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
 @{currentUser?.username ||"admin"}
 </span>
 <span className="font-mono text-xs font-semibold text-muted"># {invoiceNo}</span>
 </div>
 </div>



 {/* ROW COLUMN PRODUCTS ADDING SHEET (Checkout Products Table - Reordered to the Top) */}
 <div className="space-y-3 border-b border-default/50 dark:border-default/30 pb-6">
 <div className="flex items-center justify-between">
 <h3 className="font-bold text-secondary dark:text-zinc-200 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
 <ShoppingCart className="h-4 w-4 text-blue-600" />
 <span>Checkout Products</span>
 </h3>
 <div className="flex items-center gap-3">
 {onNavigateToTab && (
 <button
 type="button"
 onClick={() => setShowAddProductModal(true)}
 className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded cursor-pointer border-none"
 >
 <Plus className="h-3 w-3" />
 <span>New Product</span>
 </button>
 )}
 <button
 onClick={addRow}
 className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700 cursor-pointer border-none bg-transparent p-0 px-2 py-0.5 rounded"
 >
 <Plus className="h-3.5 w-3.5" />
 <span>Add Row</span>
 </button>
 </div>
 </div>

 <div className="space-y-2.5">
 {/* Desktop Table Headers */}
 <div className="hidden sm:flex items-center gap-4 px-3 py-1 text-[10px] uppercase font-bold text-muted dark:text-muted border-b border-default pb-2">
 <div className="flex-1">Product</div>
 {gstEnabled && <div className="w-24 text-center">HSN</div>}
 <div className="w-28 text-center">Qty</div>
 <div className="w-28 text-center sm:text-left">Rate</div>
 <div className="w-28 text-right">Amount</div>
 <div className="w-12 text-center">Actions</div>
 </div>

 {lineItems.map((item, index) => {
 const selectedProd = products.find((p) => p.id === item.productId);
 const isSearching = searchRowIndex === index;
 return (
 <div key={index} className="flex flex-col gap-2">
 <div
 className={`flex flex-col gap-3 rounded-lg border ${isSearching ? 'border-blue-500 bg-blue-50/20' : 'border-default bg-surface/50'} p-3 sm:flex-row sm:items-center sm:gap-4 transition-all`}
 >
 {/* Column 1: Product Selection */}
 <div className="flex-1 space-y-0.5 relative">
 <span className="text-[9px] text-muted uppercase font-bold sm:hidden block mb-1">Product</span>
 <button
 type="button"
 onClick={() => {
     setSearchRowIndex(index);
 }}
 className={`w-full rounded-md border bg-card px-3 py-1.5 text-xs font-semibold text-left focus:outline-none flex items-center justify-between shadow-sm transition-colors ${isSearching ? 'border-blue-500 text-blue-700' : 'border-default text-secondary dark:text-zinc-300 hover:border-blue-400'}`}
 >
 <div className="flex items-center flex-wrap gap-2 pr-4">
  <span className={item.productId ?"text-primary dark:text-primary font-semibold text-xs" :"text-muted text-xs"}>
  {item.productId ? (item.displayName || (selectedProd ? selectedProd.name :"Unnamed Product")) :"Click to select Product/SKU..."}
  </span>
  {item.isCombo && (
  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wide">
  Combo price - {item.customPrice || selectedProd?.price || 0}
  </span>
  )}
  </div>
 <Search className="h-3.5 w-3.5 text-muted" />
 </button>
 {item.productId && (() => {
  const hsn = selectedProd?.hsnCode;
  return (
  <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-mono px-0.5 text-muted dark:text-muted">
  {item.skuCode && <span className="bg-card-secondary/60 px-1.5 py-0.5 rounded">SKU Code: {item.skuCode}</span>}
  {gstEnabled && hsn && <span className="bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-extrabold">HSN: {hsn}</span>}
  </div>
  );
  })()}
 </div>

 {/* Column 1.5: HSN (Editable if GST Enabled) */}
 {gstEnabled && (
 <div className="flex flex-col gap-1 sm:w-24">
 <span className="text-[9px] text-muted uppercase font-bold sm:hidden block mb-1">HSN</span>
 <input
 type="text"
 placeholder="9403"
 value={item.hsnCode !== undefined ? item.hsnCode : (selectedProd?.hsnCode || "9403")}
 onChange={(e) => {
 const updated = [...lineItems];
 updated[index] = {
 ...updated[index],
 hsnCode: e.target.value
 };
 setLineItems(updated);
 saveDraftSilent();
 }}
 className="w-full rounded-md border border-default dark:border-zinc-700 bg-card px-2 py-1 text-xs font-semibold font-mono text-center text-primary dark:text-primary focus:border-blue-500 outline-none"
 />
 </div>
 )}

 {/* Column 2: Qty with click triggers [-] 1 [+] */}
 <div className="flex flex-col gap-1 sm:w-28 sm:items-center">
 <span className="text-[9px] text-muted uppercase font-bold sm:hidden block">Quantity</span>
 <div className="flex items-center gap-1">
 <button
 type="button"
 onClick={() => updateRowQty(index, Math.max(1, item.quantity - 1))}
 className="rounded bg-card-secondary hover:bg-gray-200 text-secondary dark:bg-zinc-800 dark:hover:bg-zinc-700 font-bold px-2 py-1 text-xs border-none cursor-pointer"
 >
 -
 </button>
 <input
 type="number"
 min="1"
 value={item.quantity}
 onChange={(e) => updateRowQty(index, parseInt(e.target.value) || 1)}
 className="w-10 rounded border border-default dark:border-zinc-700 bg-card text-center text-xs font-mono font-bold text-primary dark:text-primary px-1 py-1 focus:border-blue-500 outline-none"
 />
 <button
 type="button"
 onClick={() => updateRowQty(index, item.quantity + 1)}
 className="rounded bg-card-secondary hover:bg-gray-200 text-secondary dark:bg-zinc-800 dark:hover:bg-zinc-700 font-bold px-2 py-1 text-xs border-none cursor-pointer"
 >
 +
 </button>
 </div>
 </div>

 {/* Column 3: Rate (Inline editable price edit) */}
 <div className="flex flex-col gap-1 sm:w-28">
 <span className="text-[9px] text-muted uppercase font-bold sm:hidden block">Rate</span>
 <div className="relative w-full">
 <span className="absolute left-2.5 top-1.5 text-[10px] text-muted">₹</span>
 <input
 type="number"
 step="0.01"
 value={item.customPrice ||""}
 onChange={(e) => updateRowPrice(index, parseFloat(e.target.value) || 0)}
 className="w-full rounded-md border border-default dark:border-zinc-700 bg-card pl-5 pr-2 py-1 text-xs font-semibold font-mono text-primary dark:text-primary focus:border-blue-500 outline-none"
 placeholder="0.00"
 />
 </div>
 </div>

 {/* Column 4: Amount */}
 <div className="flex flex-col gap-1 sm:w-28 sm:text-right">
 <span className="text-[9px] text-muted uppercase font-bold sm:hidden block">Amount</span>
 <span className="text-sm font-mono font-bold text-secondary dark:text-zinc-200 pr-1">
 ₹{(item.quantity * item.customPrice).toFixed(2)}
 </span>
 </div>

 {/* Column 5: Actions */}
 <div className="flex flex-col gap-1 sm:w-12 sm:items-center">
 <span className="text-[9px] text-muted uppercase font-bold sm:hidden block">Actions</span>
 <button
 type="button"
 onClick={() => removeRow(index)}
 className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-500 dark:hover:bg-zinc-800 dark:hover:text-red-400 transition-colors border-none cursor-pointer"
 >
 <Trash2 className="h-4 w-4" />
 </button>
 </div>
 </div>

 {item.isCombo && item.comboItems && (
  <div className="ml-8 border-l-2 border-blue-200 dark:border-blue-800 pl-4 space-y-2 mb-2 mt-2">
  <h4 className="text-[10px] font-bold text-secondary uppercase tracking-wider">Combo Contents:</h4>
  {item.comboItems.map((cItem, cIdx) => (
  <div key={cIdx} className="flex items-center gap-3 text-xs">
  <span className="text-muted mr-1">-</span>
  <input 
  className="bg-card border border-default px-2 py-1 rounded w-64 text-primary text-xs outline-none focus:border-blue-500" 
  value={cItem.productName}
  placeholder="Type product name..."
  onChange={(e) => {
  const updated = [...lineItems];
  updated[index].comboItems![cIdx].productName = e.target.value;
  setLineItems(updated);
  saveDraftSilent();
  }}
  />
  <div className="flex items-center gap-1">
  <button
  type="button"
  onClick={() => {
  const updated = [...lineItems];
  const currentQty = updated[index].comboItems![cIdx].quantity || 1;
  updated[index].comboItems![cIdx].quantity = Math.max(1, currentQty - 1);
  setLineItems(updated);
  saveDraftSilent();
  }}
  className="rounded bg-card-secondary hover:bg-gray-200 text-secondary dark:bg-zinc-800 dark:hover:bg-zinc-700 font-bold px-1.5 py-0.5 text-[10px] border-none cursor-pointer"
  >
  -
  </button>
  <span className="w-6 text-center font-mono font-bold text-xs text-primary">
  {cItem.quantity || 1}
  </span>
  <button
  type="button"
  onClick={() => {
  const updated = [...lineItems];
  const currentQty = updated[index].comboItems![cIdx].quantity || 1;
  updated[index].comboItems![cIdx].quantity = currentQty + 1;
  setLineItems(updated);
  saveDraftSilent();
  }}
  className="rounded bg-card-secondary hover:bg-gray-200 text-secondary dark:bg-zinc-800 dark:hover:bg-zinc-700 font-bold px-1.5 py-0.5 text-[10px] border-none cursor-pointer"
  >
  +
  </button>
  </div>
  <button 
  type="button" 
  className="text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 rounded border-none cursor-pointer"
  onClick={() => {
  const updated = [...lineItems];
  updated[index].comboItems!.splice(cIdx, 1);
  setLineItems(updated);
  saveDraftSilent();
  }}
  >
  <X className="w-3.5 h-3.5" />
  </button>
  </div>
  ))}
  <button 
  type="button"
  onClick={() => {
  const updated = [...lineItems];
  updated[index].comboItems = updated[index].comboItems || [];
  updated[index].comboItems!.push({ id: `ci_${Date.now()}`, productId: `custom_${Date.now()}`, variantId: "", productName: "", quantity: 1 });
  setLineItems(updated);
  saveDraftSilent();
  }}
  className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700 bg-blue-50 dark:bg-zinc-850 dark:text-blue-400 px-2 py-1 rounded mt-1 border-none cursor-pointer w-fit"
  >
  <Plus className="w-3.5 h-3.5" />
  Add Row
  </button>
  </div>
  )}
 </div>
 );
 })}
 </div>
 </div>

 {/* CUSTOMER PROFILES DATA */}
 <div className="flex items-center justify-between mb-0 mt-[-10px]">
 <h3 className="font-semibold text-secondary dark:text-zinc-200 text-[11px] uppercase tracking-wide">Customer Details</h3>
 {onNavigateToTab && (
 <button
 type="button"
 onClick={() => setShowCustomerRegistryModal(true)}
 className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded cursor-pointer border-none"
 >
 <UserPlus className="h-3 w-3" />
 <span>Full Customer Registry</span>
 </button>
 )}
 </div>
 <div className="grid gap-4 sm:grid-cols-2 mt-2">
 {/* Selector pills for existing or register new customer */}
 <div className="sm:col-span-2">
 <div className="flex bg-card-secondary p-1 rounded-xl border border-default/50 gap-1.5 w-full">
 <button
 type="button"
 onClick={() => {
 setCustomerSelectionMode("existing");
 setAllowDuplicateCustomer(false);
 }}
 className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all border-none ${
 customerSelectionMode ==="existing"
 ?"bg-blue-600 text-white shadow-sm font-extrabold"
 :"text-muted dark:text-muted hover:text-secondary dark:hover:text-primary bg-transparent cursor-pointer"
 }`}
 >
 🔍 Option 1: Existing Customer
 </button>
 <button
 type="button"
 onClick={() => {
 setCustomerSelectionMode("new");
 setCustomerName("");
 setMobileNumber("");
 setAddress("");
 setSecondaryPhone("");
 setSecondaryContactName("");
 setNotes("");
 setIsNewCustomer(true);
 setExistingCustomerSearch("");
 }}
 className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all border-none ${
 customerSelectionMode ==="new"
 ?"bg-blue-600 text-white shadow-sm font-extrabold"
 :"text-muted dark:text-muted hover:text-secondary dark:hover:text-primary bg-transparent cursor-pointer"
 }`}
 >
 ➕ Option 2: Register New Customer
 </button>
 </div>
 </div>

 {/* Option 1 dropdown block */}
 {customerSelectionMode ==="existing" && (
 <div className="sm:col-span-2 relative space-y-1 text-left">
 <label className="text-xs font-semibold text-muted font-sans">Search and Link Existing Customer</label>
 <div className="relative">
 <input
 type="text"
 placeholder="Type Customer ID, Name or mobile to bind..."
 value={existingCustomerSearch}
 onChange={(e) => {
 setExistingCustomerSearch(e.target.value);
 setShowExistingCustomerList(true);
 }}
 onFocus={() => setShowExistingCustomerList(true)}
 className="w-full rounded-lg border border-default bg-surface  px-3.5 pr-10 py-2 text-xs text-secondary outline-none focus:border-blue-500 focus:bg-card focus:ring-1 focus:ring-blue-500"
 />
 <div className="absolute right-3 top-2 flex items-center gap-1">
 {existingCustomerSearch && (
 <button
 type="button"
 onClick={() => {
 setExistingCustomerSearch("");
 setCustomerName("");
 setMobileNumber("");
 setSecondaryPhone("");
 setSecondaryContactName("");
 setAddress("");
 setNotes("");
 setIsNewCustomer(false);
 setShowExistingCustomerList(false);
 }}
 className="text-[10px] text-muted hover:text-rose-500 cursor-pointer bg-transparent border-none p-0.5"
 >
 ✕
 </button>
 )}
 <ChevronDown className="h-3.5 w-3.5 text-muted" />
 </div>

 {showExistingCustomerList && (
 <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto rounded-lg border border-default bg-card  p-1 shadow-lg divide-y divide-zinc-100 dark:divide-zinc-900 text-xs text-left">
 {customers
 .filter(c =>
 c.id.toLowerCase().includes(existingCustomerSearch.toLowerCase()) ||
 c.name.toLowerCase().includes(existingCustomerSearch.toLowerCase()) ||
 String(c.mobile ||"").replace(/\D/g,"").includes(existingCustomerSearch.toLowerCase())
 ).map(c => (
 <div
 key={c.id}
 onClick={() => {
 setCustomerName(c.name);
 setMobileNumber(String(c.mobile ||""));
 setSecondaryPhone(c.secondaryPhone ||"");
 setSecondaryContactName(c.secondaryContactName ||"");
 setAddress(c.address ||"");
 setNotes(c.notes ||"");
 setIsNewCustomer(false);
 setExistingCustomerSearch(`${c.id} - ${c.name}`);
 setShowExistingCustomerList(false);
 setShowCustomerDetails(true);
 onShowNotification(`✓ Profile bound successfully: ${c.name}`,"success");
 prefillGstDetailsFromHistory(c.mobile);
 }}
 className="cursor-pointer px-3 py-2 hover:bg-blue-50/40 dark:hover:bg-card rounded flex items-center justify-between"
 >
 <div>
 <strong className="text-blue-600 font-mono font-bold">{c.id}</strong>
 <span className="font-semibold text-primary dark:text-primary">{c.name}</span>
 <p className="text-[10px] text-muted font-mono mt-0.5">{c.mobile}</p>
 </div>
 <div className="text-right text-[10px] text-muted truncate max-w-[140px]">
 {c.address ||"No Address Saved"}
 </div>
 </div>
 ))}
 {customers.filter(c =>
 c.id.toLowerCase().includes(existingCustomerSearch.toLowerCase()) ||
 c.name.toLowerCase().includes(existingCustomerSearch.toLowerCase()) ||
 String(c.mobile ||"").replace(/\D/g,"").includes(existingCustomerSearch.toLowerCase())
 ).length === 0 && (
 <div className="p-3 text-muted text-center font-sans">
 No registered customer matches located.
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 )}

 {/* Option 2 input block */}
 {customerSelectionMode ==="new" && (
 <>
 <div className="space-y-1 text-left">
 <label className="text-xs font-semibold text-muted font-sans">New Customer Mobile</label>
 <input
 id="customer-search-input"
 type="text"
 placeholder="Enter 10-digit mobile number"
 value={mobileNumber}
 onChange={(e) => {
 const cleaned = String(e.target.value ||"").replace(/\D/g,"");
 setMobileNumber(cleaned);
 setAllowDuplicateCustomer(false);
 }}
 className="w-full rounded-lg border border-default bg-surface pl-3 py-2 text-xs focus:border-blue-500 focus:bg-card focus:ring-1 focus:ring-blue-500 font-mono outline-none"
 />
 </div>

 <div className="space-y-1 text-left">
 <label className="text-xs font-semibold text-muted font-sans">New Customer Name</label>
 <input
 type="text"
 placeholder="Full human name (Required)..."
 value={customerName}
 onChange={(e) => setCustomerName(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs focus:border-blue-500 focus:bg-card focus:ring-1 focus:ring-blue-500 outline-none"
 />
 </div>

 {/* Duplicate check info block */}
 {(() => {
 const cleanedMobile = String(mobileNumber ||"").replace(/\D/g,"");
 if (cleanedMobile.length >= 8) {
 const duplicateMatch = customers.find(c => String(c.mobile ||"").replace(/\D/g,"") === cleanedMobile);
 if (duplicateMatch) {
 const isAdminUser = currentUser?.role ==="Admin";
 return (
 <div className="sm:col-span-2 p-3 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 rounded-xl space-y-2 font-sans animate-in slide-in-from-top-1 text-left">
 <h4 className="font-extrabold flex items-center gap-1 uppercase tracking-wide text-xs">
 ⚠️ Existing Customer Found!
 </h4>
 <p className="leading-normal text-[11px]">
 A customer named <strong>{duplicateMatch.name}</strong> ({duplicateMatch.id}) already operates with phone number <strong>{duplicateMatch.mobile}</strong>.
 </p>
 <div className="flex gap-2 flex-wrap pt-1 mr-auto pb-0.5">
 <button
 type="button"
 onClick={() => {
 setCustomerSelectionMode("existing");
 setExistingCustomerSearch(`${duplicateMatch.id} - ${duplicateMatch.name}`);
 setCustomerName(duplicateMatch.name);
 setMobileNumber(String(duplicateMatch.mobile ||""));
 setAddress(duplicateMatch.address ||"");
 setSecondaryPhone(duplicateMatch.secondaryPhone ||"");
 setSecondaryContactName(duplicateMatch.secondaryContactName ||"");
 setNotes(duplicateMatch.notes ||"");
 setIsNewCustomer(false);
 setShowCustomerDetails(true);
 onShowNotification(`✓ Profile linked: ${duplicateMatch.name}`,"success");
 prefillGstDetailsFromHistory(duplicateMatch.mobile);
 }}
 className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 text-primary text-[10px] font-bold hover:scale-95 transition-all duration-150 border-none cursor-pointer"
 >
 Use Existing Customer
 </button>

 {isAdminUser ? (
 <button
 type="button"
 onClick={() => {
 setAllowDuplicateCustomer(!allowDuplicateCustomer);
 if (!allowDuplicateCustomer) {
 onShowNotification("Bypassed: Duplicate duplicate will be created on save.","info");
 }
 }}
 className={`px-3 py-1 rounded text-[10px] font-bold transition-all hover:scale-95 duration-150 border-none cursor-pointer ${
 allowDuplicateCustomer
 ?"bg-emerald-600 text-white"
 :"bg-red-500 text-primary hover:bg-red-650"
 }`}
 >
 {allowDuplicateCustomer ?"✓ Authorized bypass enabled" :"Create Anyway (Admin Only)"}
 </button>
 ) : (
 <span className="text-[9.5px] uppercase font-bold text-muted leading-none flex items-center py-1">
 Only Admin can override duplicates
 </span>
 )}
 </div>
 </div>
 );
 }
 }
 return null;
 })()}
 </>
 )}

 {/* Referral Agent searchable dropdown */}
 {(() => {
 const filteredActiveAgents = SheetsSyncEngine.getAgents()
 .filter(agt => agt.status ==="Active")
 .filter(agt => 
 agt.id.toLowerCase().includes(agentSearch.toLowerCase()) ||
 agt.name.toLowerCase().includes(agentSearch.toLowerCase())
 );

 const handleAgentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
 if (!showAgentList) {
 if (e.key ==="ArrowDown" || e.key ==="ArrowUp") {
 setShowAgentList(true);
 setHighlightedAgentIndex(0);
 e.preventDefault();
 }
 return;
 }

 if (e.key ==="ArrowDown") {
 e.preventDefault();
 setHighlightedAgentIndex(prev => {
 const next = prev + 1;
 return next >= filteredActiveAgents.length ? 0 : next;
 });
 } else if (e.key ==="ArrowUp") {
 e.preventDefault();
 setHighlightedAgentIndex(prev => {
 const next = prev - 1;
 return next < 0 ? filteredActiveAgents.length - 1 : next;
 });
 } else if (e.key ==="Enter") {
 e.preventDefault();
 if (highlightedAgentIndex >= 0 && highlightedAgentIndex < filteredActiveAgents.length) {
 const selected = filteredActiveAgents[highlightedAgentIndex];
 setReferralAgentId(selected.id);
 setReferralAgentName(selected.name);
 setAgentSearch(`${selected.id} - ${selected.name}`);
 setShowAgentList(false);
 setHighlightedAgentIndex(-1);
 }
 } else if (e.key ==="Tab") {
 if (highlightedAgentIndex >= 0 && highlightedAgentIndex < filteredActiveAgents.length) {
 const selected = filteredActiveAgents[highlightedAgentIndex];
 setReferralAgentId(selected.id);
 setReferralAgentName(selected.name);
 setAgentSearch(`${selected.id} - ${selected.name}`);
 setShowAgentList(false);
 setHighlightedAgentIndex(-1);
 } else if (filteredActiveAgents.length > 0 && referralAgentId ==="") {
 const selected = filteredActiveAgents[0];
 setReferralAgentId(selected.id);
 setReferralAgentName(selected.name);
 setAgentSearch(`${selected.id} - ${selected.name}`);
 setShowAgentList(false);
 setHighlightedAgentIndex(-1);
 }
 } else if (e.key ==="Escape") {
 e.preventDefault();
 setShowAgentList(false);
 setHighlightedAgentIndex(-1);
 }
 };

 return (
 <div className="space-y-1 sm:col-span-2 relative text-left">
 <label className="text-xs font-semibold text-muted font-sans block">Referral Agent</label>
 <div className="relative">
 <input
 type="text"
 placeholder="Search Agent ID or Name... (Type & press ↓ / ↑ / Enter, or Click ▼)"
 value={agentSearch}
 onChange={(e) => {
 setAgentSearch(e.target.value);
 setShowAgentList(true);
 setHighlightedAgentIndex(0);
 }}
 onFocus={() => {
 setShowAgentList(true);
 setHighlightedAgentIndex(0);
 }}
 onKeyDown={handleAgentKeyDown}
 className="w-full rounded-lg border border-default bg-surface px-3 pl-3 pr-12 py-2 text-xs focus:border-blue-500 focus:bg-card focus:ring-1 focus:ring-blue-500 text-primary font-sans"
 />
 {agentSearch && (
 <button
 type="button"
 tabIndex={-1}
 onClick={() => {
 setAgentSearch("");
 setReferralAgentId("");
 setReferralAgentName("");
 setShowAgentList(false);
 setHighlightedAgentIndex(-1);
 }}
 className="absolute right-8 top-2 text-muted hover:text-rose-500 text-xs px-1 cursor-pointer bg-transparent"
 >
 ✕
 </button>
 )}
 <button
 type="button"
 tabIndex={-1}
 onClick={() => {
 setShowAgentList(!showAgentList);
 if (!showAgentList) setHighlightedAgentIndex(0);
 }}
 className="absolute right-3 top-2.5 text-muted hover:text-secondary bg-transparent cursor-pointer"
 >
 <ChevronDown className="h-3.5 w-3.5" />
 </button>
 
 {showAgentList && (
 <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto rounded-lg border border-default bg-card p-1 shadow-lg divide-y divide-zinc-50 font-sans text-left">
 {filteredActiveAgents.map((agt, idx) => (
 <div
 key={agt.id}
 onClick={() => {
 setReferralAgentId(agt.id);
 setReferralAgentName(agt.name);
 setAgentSearch(`${agt.id} - ${agt.name}`);
 setShowAgentList(false);
 setHighlightedAgentIndex(-1);
 }}
 className={`cursor-pointer px-3 py-2 text-xs rounded flex items-center justify-between transition-colors ${
 idx === highlightedAgentIndex
 ?"bg-blue-105/60 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-semibold"
 :"text-primary hover:bg-blue-50/50"
 }`}
 >
 <div>
 <strong className="text-blue-600 font-mono font-bold">{agt.id}</strong> - <span className="font-semibold text-secondary">{agt.name}</span>
 </div>
 <span className="text-[10px] font-semibold text-muted bg-card-secondary px-1.5 py-0.5 rounded uppercase">
 {agt.commissionPercentage}% [Commission]
 </span>
 </div>
 ))}
 {filteredActiveAgents.length === 0 && (
 <div className="p-3 text-xs text-muted text-center font-sans">
 No active agents found matching criteria.
 </div>
 )}
 </div>
 )}
 </div>

 {/* Agent selection verification segment */}
 {referralAgentId && (() => {
 const selectedAgent = SheetsSyncEngine.getAgents().find(a => a.id === referralAgentId);
 if (selectedAgent) {
 return (
 <div className="mt-1.5 p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg flex items-center gap-2 text-xs">
 <span className="text-emerald-700 dark:text-emerald-400 font-bold font-sans shrink-0">✓ Selection Verified:</span>
 <div className="text-secondary dark:text-muted">
 <strong className="text-primary dark:text-primary">{selectedAgent.name}</strong> ({selectedAgent.id}) — <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{selectedAgent.commissionPercentage}% Commission</span>
 </div>
 </div>
 );
 }
 return null;
 })()}
 </div>
 );
 })()}
 </div>

 {/* ADVANCED CUSTOMER DETAILS */}
 <div className="bg-surface/50 rounded-xl border border-default p-3 space-y-3.5">
 <label className="text-[11px] font-bold text-muted uppercase tracking-wide flex items-center gap-1.5">
 <Users className="h-4 w-4 text-muted" />
 <span>Customer Details</span>
 </label>
 
 <div className="grid gap-3 sm:grid-cols-2 pt-1">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Secondary Mobile No</label>
 <input
 type="text"
 placeholder="Alternative contact (Optional)"
 value={secondaryPhone}
 onChange={(e) => setSecondaryPhone(e.target.value)}
 className="w-full rounded-lg border border-default bg-card px-3 py-1.5 text-xs text-primary outline-none focus:border-blue-500 font-mono"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Secondary Contact Name</label>
 <input
 type="text"
 placeholder="Alternate Contact Person (Optional)"
 value={secondaryContactName}
 onChange={(e) => setSecondaryContactName(e.target.value)}
 className="w-full rounded-lg border border-default bg-card px-3 py-1.5 text-xs text-primary outline-none"
 />
 </div>

 <div className="space-y-1 sm:col-span-2">
 <label className="text-[10px] uppercase font-bold text-muted">Address Location *</label>
 <input
 type="text"
 placeholder="Street details, city, zip (Required)"
 value={address}
 onChange={(e) => setAddress(e.target.value)}
 required
 className="w-full rounded-lg border border-default bg-card px-3 py-1.5 text-xs text-primary outline-none"
 />
 </div>

 <div className="space-y-1 sm:col-span-2">
 <label className="text-[10px] uppercase font-bold text-muted">Client / Order Notes</label>
 <textarea
 placeholder="Extra instructions, notes, preferences... (Optional)"
 rows={2}
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="w-full rounded-lg border border-default bg-card px-3 py-1.5 text-xs text-primary outline-none"
 />
 </div>
 </div>
 </div>

 {/* GST PARAMETERS & DETAILED BILLING CARD */}
 <div className="bg-emerald-500/5 dark:bg-emerald-950/10 rounded-xl border border-emerald-500/10 dark:border-emerald-500/20 p-4 space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/10 pb-3">
 <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
 <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse" />
 <span>GST Billing Configuration</span>
 </span>
 <div className="text-right">
 <span className="text-[10px] uppercase font-bold text-muted dark:text-muted">Default: Non-GST</span>
 </div>
 </div>

 <div className="space-y-3.5 text-left">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted block">GST Type</label>
 <select
 value={gstType}
 onChange={(e) => {
 const val = e.target.value as"No GST" |"Within State GST" |"Out-of-State GST";
 setGstType(val);
 }}
 className="w-full rounded-lg border border-default dark:border-zinc-700 bg-card  px-3 py-1.5 text-xs text-primary dark:text-primary outline-none focus:border-emerald-500"
 >
 <option value="No GST">No GST</option>
 <option value="Within State GST">Within State GST (CGST + SGST)</option>
 <option value="Out-of-State GST">Out-of-State GST (IGST)</option>
 </select>
 </div>

 {gstType ==="Out-of-State GST" && (
 <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted block">Customer State (for record-keeping)</label>
 <input
 type="text"
 placeholder="E.g., Telangana, Karnataka, Tamil Nadu"
 value={customerState}
 onChange={(e) => setCustomerState(e.target.value)}
 className="w-full rounded-lg border border-default dark:border-zinc-700 bg-card  px-3 py-1.5 text-xs text-primary dark:text-primary outline-none focus:border-emerald-500"
 />
 </div>
 )}

 {gstType !=="No GST" && (
 <div className="bg-emerald-500/5 dark:bg-emerald-950/20 rounded-lg p-2.5 border border-emerald-500/10 text-[10px] space-y-1 text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-250">
 <div className="flex justify-between font-bold items-center">
 <span className="flex items-center gap-1.5">Selected Tax Schedule:</span>
 <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 underline underline-offset-2">
 {isWithinState ?"Within State (CGST + SGST)" :"Outside State (IGST)"}
 </span>
 </div>
 {isWithinState ? (
 <div className="flex justify-between font-mono text-[9px] text-muted">
 <span>CGST / SGST rates applicable:</span>
 <span>{cgstPercentage}% / {sgstPercentage}%</span>
 </div>
 ) : (
 <div className="flex justify-between font-mono text-[9px] text-muted">
 <span>IGST rate applicable:</span>
 <span>{igstPercentage}%</span>
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 {/* DELIVERY LOGISTICS (ENHANCED FIELD INSTRUCTIONS) */}
 <div className="bg-surface rounded-xl border border-default p-4 space-y-3 transition-colors">
 <button
 type="button"
 onClick={() => setShowDeliveryDetails(!showDeliveryDetails)}
 className="w-full flex items-center justify-between text-left text-xs font-bold text-primary dark:text-primary uppercase tracking-wider"
 >
 <span className="flex items-center gap-1.5">
 <Truck className="h-4 w-4 text-emerald-500" />
 <span>Fulfillment & Delivery Details (Optional)</span>
 </span>
 {showDeliveryDetails ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
 </button>

 {showDeliveryDetails && (
 <div className="grid gap-3 sm:grid-cols-2 pt-2 animate-in slide-in-from-top-2 duration-200">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Assigned Dispatcher</label>
 <select
 value={assignedEmployee}
 onChange={(e) => setAssignedEmployee(e.target.value)}
 className="w-full rounded-lg border border-default bg-card  px-3 py-2 text-xs outline-none text-primary dark:text-primary focus:border-blue-500"
 >
 <option value="">-- No Assignment --</option>
 {SheetsSyncEngine.getAgents().filter(a => a.status === "Active").map(agent => (
 <option key={agent.id} value={agent.name}>
 {agent.name}
 </option>
 ))}
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Expected Delivery </label>
 <input
 type="date"
 value={expectedDeliveryDate}
 onChange={(e) => setExpectedDeliveryDate(e.target.value)}
 className="w-full rounded-lg border border-default bg-card  px-3 py-2 text-xs outline-none text-primary dark:text-primary focus:border-blue-500 font-mono"
 />
 </div>

 <div className="sm:col-span-2 space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Delivery Notes</label>
 <textarea
 value={deliveryNotes}
 onChange={(e) => setDeliveryNotes(e.target.value)}
 placeholder="E.g., apartment door code, phone verification on delivery..."
 rows={2}
 className="w-full rounded-lg border border-default bg-card  px-3 py-2 text-xs outline-none text-primary dark:text-primary focus:border-blue-500"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Auto No / Vehicle No</label>
 <input
 type="text"
 value={autoNo}
 onChange={(e) => setAutoNo(e.target.value)}
 placeholder="E.g., AP 07 AB 1234"
 className="w-full rounded-lg border border-default bg-card px-3 py-2 text-xs outline-none text-primary dark:text-primary focus:border-blue-500 font-mono"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Driver Name</label>
 <input
 type="text"
 value={driverName}
 onChange={(e) => setDriverName(e.target.value)}
 placeholder="Driver's Name"
 className="w-full rounded-lg border border-default bg-card px-3 py-2 text-xs outline-none text-primary dark:text-primary focus:border-blue-500"
 />
 </div>
 </div>
 )}
 </div>




 {/* Checkout Products Table reordered and updated above */}
 </div>

 {/* RIGHT: OVERALL BILL CALCULATOR BREAKDOWN SUMMARY */}
 <div className="rounded-xl border border-default dark:border-default bg-card p-5 shadow-sm h-fit space-y-6 transition-colors font-sans">
 <h2 className="font-bold text-primary dark:text-primary text-sm border-b border-gray-50 dark:border-default/60 pb-3">Bill Breakdown</h2>

 <div className="space-y-3.5">
 {/* Status picker */}
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Operation Status</label>
 <select
 value={status}
 onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 text-xs text-primary focus:bg-card outline-none border-none"
 >
 <option value="Draft">Draft (Grey Badge)</option>
 <option value="Work In Progress">Work In Progress (Orange)</option>
 <option value="Ready for Delivery">Ready for Delivery (Blue)</option>
 <option value="Delivered">Delivered (Purple)</option>
 <option value="Completed">Completed (Green)</option>
 <option value="Cancelled">Cancelled (Red)</option>
 </select>
 </div>

 <div className="flex justify-between text-xs text-muted dark:text-zinc-450 font-sans pt-1 pb-1 border-b border-gray-50">
 <span>Subtotal</span>
 <span className="font-mono font-bold text-primary dark:text-primary">₹{subtotal.toFixed(2)}</span>
 </div>

 {/* Interactive Offer Discount */}
 <div className="space-y-1.5 pt-1.5">
 <div className="flex items-center justify-between">
 <label className="text-xs font-semibold text-muted font-sans">Offer Discount</label>
 <div className="flex rounded-md bg-card-secondary p-0.5 border border-default/40">
 <button
 type="button"
 onClick={() => setDiscountType("value")}
 className={`rounded px-2 py-0.5 text-[10px] font-bold border-none cursor-pointer ${
 discountType ==="value" ?"bg-input text-primary dark:text-primary" :"text-muted bg-transparent"
 }`}
 >
 ₹ Cash
 </button>
 <button
 type="button"
 onClick={() => setDiscountType("percent")}
 className={`rounded px-1.5 py-0.5 text-[10px] font-bold border-none cursor-pointer ${
 discountType ==="percent" ?"bg-input text-primary dark:text-primary" :"text-muted bg-transparent"
 }`}
 >
 % Ratio
 </button>
 </div>
 </div>
 <div className="relative">
 <input
 id="global-discount-input"
 type="number"
 min="0"
 value={discount ||""}
 onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
 className="w-full rounded-lg bg-surface/60 border border-default/50 dark:border-default px-3 py-1.5 text-xs font-mono text-secondary dark:text-primary outline-none focus:border-blue-500"
 placeholder="Enter discount allowance"
 />
 </div>
 </div>

 {computedDiscount > 0 && (
 <div className="flex justify-between text-xs text-red-500 font-sans">
 <span>Applied Discount</span>
 <span className="font-mono font-semibold">-₹{computedDiscount.toFixed(2)}</span>
 </div>
 )}

 {/* Promo code input */}
 <div className="space-y-1.5 pt-2 border-t border-default dark:border-default/40">
 <label className="text-[10px] uppercase font-bold text-muted font-sans">Promo Voucher Code</label>
 <div className="flex gap-2">
 <input
 type="text"
 placeholder="Enter promo coupon..."
 value={promoCodeInput}
 onChange={(e) => setPromoCodeInput(e.target.value)}
 disabled={!!appliedPromo}
 className="w-full rounded-lg bg-surface/60 border border-default/50 dark:border-default px-3 py-1.5 text-xs font-mono text-primary dark:text-primary uppercase placeholder:text-muted outline-none"
 />
 {appliedPromo ? (
 <button
 type="button"
 onClick={handleRemovePromoCode}
 className="rounded-lg bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-950/20 dark:text-red-400 px-3 py-1 text-xs font-bold font-sans cursor-pointer border-none"
 >
 Clear
 </button>
 ) : (
 <button
 type="button"
 onClick={handleApplyPromoCode}
 className="rounded-lg bg-blue-105 hover:bg-blue-200 text-blue-600  dark:text-blue-400 px-3 py-1 text-xs font-bold font-sans cursor-pointer border-none"
 >
 Apply
 </button>
 )}
 </div>
 {appliedPromo && (
 <p className="text-[10px] text-emerald-600 font-sans font-bold flex items-center gap-1">
 ✓ Coupon Applied: {appliedPromo.description}
 </p>
 )}
 </div>

 {activePromoDiscount > 0 && (
 <div className="flex justify-between text-xs text-emerald-600 font-sans font-bold">
 <span>Promo Discount ({appliedPromo?.promoCode})</span>
 <span className="font-mono font-semibold">-₹{activePromoDiscount.toFixed(2)}</span>
 </div>
 )}

 {/* GST breakdown block if enabled */}
 {gstEnabled && (
 <div className="space-y-1.5 pt-2 border-t border-dashed border-default">
 <div className="flex justify-between text-xs text-muted font-sans">
 <span>Taxable Value</span>
 <span className="font-mono font-semibold text-secondary dark:text-zinc-200">₹{taxableSubtotal.toFixed(2)}</span>
 </div>
 {isWithinState ? (
 <>
 <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-sans">
 <span>CGST ({cgstPercentage}%)</span>
 <span className="font-mono font-semibold">₹{cgstAmount.toFixed(2)}</span>
 </div>
 <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-sans">
 <span>SGST ({sgstPercentage}%)</span>
 <span className="font-mono font-semibold">₹{sgstAmount.toFixed(2)}</span>
 </div>
 </>
 ) : (
 <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-sans">
 <span>IGST ({igstPercentage}%)</span>
 <span className="font-mono font-semibold">₹{igstAmount.toFixed(2)}</span>
 </div>
 )}
 <div className="flex justify-between text-xs text-secondary dark:text-zinc-300 font-sans font-bold border-t border-dashed border-default pt-1">
 <span>Total GST Taxed</span>
 <span className="font-mono text-primary dark:text-primary">₹{taxAmount.toFixed(2)}</span>
 </div>
 </div>
 )}

 {/* TOTAL Row Before RO adjustment */}
 <div className="flex justify-between text-xs text-primary dark:text-zinc-150 font-sans font-bold pt-2 border-t border-default/80">
 <span>Total (Before Round Off)</span>
 <span className="font-mono">₹{subtotalWithTax.toFixed(2)}</span>
 </div>

 {/* RO Adjustment controls */}
 <div className="space-y-2 pt-2 border-t border-dashed border-default dark:border-default/60">
 <div className="flex items-center justify-between">
 <label className="text-[10px] uppercase font-bold text-muted font-sans">RO Adjustment</label>
 <div className="flex gap-1.5">
 <button
 type="button"
 onClick={() => {
 const diff = Math.round(subtotalWithTax) - subtotalWithTax;
 setRoAdjustment(parseFloat(diff.toFixed(2)));
 onShowNotification(`✓ Applied rounded decimal offset: ${diff >= 0 ?"+" :""}${diff.toFixed(2)}`,"info");
 }}
 className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-blue-50 hover:bg-blue-101 dark:text-blue-400 hover:text-blue-800 text-blue-700 border-none cursor-pointer"
 >
 Auto Center (.00)
 </button>
 <button
 type="button"
 onClick={() => setRoAdjustment(0)}
 className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-card-secondary hover:bg-gray-200 dark:bg-zinc-800 text-muted dark:text-muted border-none cursor-pointer"
 >
 Reset
 </button>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <div className="relative flex-1">
 <span className="absolute left-2.5 top-1.5 text-xs text-muted">₹</span>
 <input
 type="number"
 step="0.01"
 value={roAdjustment ||""}
 onChange={(e) => setRoAdjustment(parseFloat(e.target.value) || 0)}
 className="w-full rounded-md border border-default bg-surface/65 pl-5 pr-2 py-1 text-xs font-semibold font-mono text-primary dark:text-primary outline-none focus:bg-card"
 placeholder="0.00"
 />
 </div>
 <div className="flex gap-1 shrink-0">
 <button
 type="button"
 onClick={() => {
 setRoAdjustment(prev => prev + 100);
 }}
 className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-bold px-2.5 py-1 text-xs border border-emerald-255 hover:bg-emerald-100 dark:border-emerald-900 cursor-pointer"
 >
 +100
 </button>
 <button
 type="button"
 onClick={() => {
 setRoAdjustment(prev => prev - 50);
 }}
 className="rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 font-bold px-2.5 py-1 text-xs border border-red-255 hover:bg-red-100 dark:border-red-900 cursor-pointer"
 >
 -50
 </button>
 </div>
 </div>
 </div>

 {/* Grand Total Row */}
 <div className="border-t border-default pt-3.5 flex justify-between items-baseline">
 <span className="font-bold text-primary dark:text-primary text-sm">Grand Total</span>
 <span className="font-mono text-xl font-extrabold text-blue-600 dark:text-blue-400">₹{grandTotal.toFixed(2)}</span>
 </div>

 {/* Selected items summary logs list */}
 {lineItems.filter(item => item.productId).length > 0 && (
 <div className="bg-surface/30 border border-default dark:border-default p-2.5 rounded-lg space-y-1 mt-2.5">
 <details className="group">
 <summary className="flex items-center justify-between text-[11px] font-bold text-muted dark:text-muted uppercase cursor-pointer outline-none">
 <span className="flex items-center gap-1.5 mt-0.5">
 <ShoppingCart className="h-3.5 w-3.5 text-blue-600" />
 <span>{lineItems.filter(item => item.productId).length} Items Selected</span>
 </span>
 <ChevronDown className="h-3.5 w-3.5 text-muted group-open:rotate-180 transition-transform" />
 </summary>
 <ul className="mt-2 text-[11px] text-muted dark:text-muted list-none pl-0 divide-y divide-gray-100/50 /40 max-h-48 overflow-y-auto">
 {lineItems.filter(item => item.productId).map((item, idx) => {
 const prod = products.find(p => p.id === item.productId);
 const nameStr = item.displayName || prod?.name ||"Unnamed Item";
 return (
 <li key={idx} className="py-1.5 flex justify-between items-center bg-transparent">
 <span className="truncate max-w-[140px] font-medium" title={nameStr}>
 • {nameStr}
 </span>
 <span className="font-mono text-[10px] text-muted dark:text-muted shrink-0">
 {item.quantity}x @ ₹{item.customPrice.toFixed(0)}
 </span>
 </li>
 );
 })}
 </ul>
 </details>
 </div>
 )}
 </div>

 {/* INTERACTIVE COMPONENT BUTTON TRIGGERS */}
 <div className="grid gap-2.5 pt-4">
 {savedInvoiceData ? (
 <div className="flex flex-col gap-3 rounded-xl border border-green-200 bg-green-50/50 p-4 animate-in fade-in zoom-in-95 duration-300">
 <div className="flex items-center gap-2 text-green-700 font-bold justify-center pb-2 border-b border-green-200/50">
 <CheckCircle className="h-5 w-5" />
 <span>Invoice saved successfully.</span>
 </div>
 <div className="grid grid-cols-2 gap-2 mt-1">
 <button
 onClick={() => {
 setSelectedPrintFormat(company.defaultPrintFormat ||"Receipt");
 setShowPrintModal(true);
 }}
 className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-card border border-default py-2.5 text-xs font-semibold text-secondary shadow-sm hover:bg-surface cursor-pointer"
 >
 <Printer className="h-4 w-4 text-blue-600" />
 <span>Print Invoice</span>
 </button>
 <button
 onClick={() => {
 setSelectedDownloadFormat(company.defaultDownloadFormat ||"A4");
 setShowDownloadModal(true);
 }}
 className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-card border border-default py-2.5 text-xs font-semibold text-secondary shadow-sm hover:bg-surface cursor-pointer"
 >
 <Download className="h-4 w-4 text-blue-600" />
 <span>Download PDF</span>
 </button>
 </div>
 <button
 onClick={() => setSavedInvoiceData(null)}
 className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-primary shadow-md hover:bg-blue-700 mt-1 cursor-pointer border-none"
 >
 <Plus className="h-4 w-4" />
 <span>Create New Invoice</span>
 </button>
 </div>
 ) : (
 <>
 <div className="grid grid-cols-2 gap-2">
 <button
 onClick={() => {
 saveDraftSilent();
 onShowNotification("Draft saved securely.","success");
 }}
 disabled={!mobileNumber && lineItems.every(i => !i.productId)}
 className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 border border-transparent py-2.5 text-xs font-semibold text-primary transition-all hover:bg-amber-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
 >
 <Save className="h-4 w-4" />
 <span>Save Draft</span>
 </button>
 <button
 onClick={handleCompleteClick}
 className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-primary shadow-md transition-all hover:bg-blue-700 active:scale-95 border-none cursor-pointer"
 >
 <Save className="h-4 w-4" />
 <span>Checkout</span>
 </button>
 </div>

 <div className="grid grid-cols-2 gap-2 group">
 <button
 disabled
 title="Invoice must be saved before printing or downloading."
 className="flex items-center justify-center gap-1.5 rounded-lg border border-default py-2 text-xs font-medium text-muted bg-surface cursor-not-allowed opacity-70"
 >
 <Printer className="h-3.5 w-3.5" />
 <span>Print</span>
 </button>
 <button
 disabled
 title="Invoice must be saved before printing or downloading."
 className="flex items-center justify-center gap-1.5 rounded-lg border border-default py-2 text-xs font-medium text-muted bg-surface cursor-not-allowed opacity-70"
 >
 <Download className="h-3.5 w-3.5" />
 <span>Download</span>
 </button>
 </div>

 <button
 onClick={clearForm}
 className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-default py-1.5 text-[11px] font-semibold text-muted hover:border-red-500 hover:text-red-500 bg-transparent cursor-pointer"
 >
 <RotateCcw className="h-3.5 w-3.5" />
 <span>Cancel / Reset POS</span>
 </button>
 </>
 )}
 </div>
 </div>

 {/* SELECT PRINT FORMAT MODAL */}
 {showPrintModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/60 p-4 animate-in fade-in duration-200">
 <div className="w-full max-w-sm rounded-xl border border-default bg-card  p-5 shadow-lg space-y-4 animate-in zoom-in-95 duration-200">
 <div className="flex items-center justify-between border-b border-gray-50 pb-2.5">
 <div className="flex items-center gap-1.5 min-w-0">
 <Printer className="h-4.5 w-4.5 text-blue-600" />
 <h3 className="font-bold text-primary dark:text-gray-100 text-sm truncate">Select Print Format</h3>
 </div>
 <button
 onClick={() => setShowPrintModal(false)}
 className="text-muted hover:text-muted dark:hover:text-gray-200 cursor-pointer p-0.5 border-none bg-transparent"
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 <div className="space-y-3">
 <p className="text-xs text-muted dark:text-muted">
 Select the physical output sizing layout for printing invoice <strong>{invoiceNo ||"Draft"}</strong>:
 </p>

 <div className="space-y-2">
 {(["Receipt","A5","A4"] as const).map((fmt) => (
 <label
 key={fmt}
 onClick={() => setSelectedPrintFormat(fmt)}
 className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
 selectedPrintFormat === fmt
 ?"bg-blue-50/50  border-blue-500 text-blue-600"
 :"bg-card dark:bg-transparent border-default text-secondary dark:text-muted hover:bg-surface dark:hover:bg-card"
 }`}
 >
 <input
 type="radio"
 name="pos-print-format"
 checked={selectedPrintFormat === fmt}
 onChange={() => setSelectedPrintFormat(fmt)}
 className="accent-blue-600 h-3.5 w-3.5"
 />
 <div className="flex-1 text-left">
 <div className="text-xs font-bold leading-none">
 {fmt ==="Receipt" ?"Receipt (Thermal Slip)" : fmt ==="A5" ?"A5 Invoice" :"A4 Invoice"}
 </div>
 <div className="text-[10px] text-muted mt-1.5 dark:text-muted leading-none font-medium">
 {fmt ==="Receipt" ?"80mm continuous roll format" : fmt ==="A5" ?"Compact 148x210 mm grid layout" :"Standard 210x297 mm corporate sheet"}
 </div>
 </div>
 </label>
 ))}
 </div>
 </div>

 <div className="flex gap-2.5 pt-1.5">
 <button
 onClick={handleExecutePrint}
 className="flex-1 bg-blue-600 hover:bg-blue-700 text-primary rounded-lg py-2 text-xs font-semibold active:scale-95 transition-all outline-none border-none cursor-pointer"
 >
 Print
 </button>
 <button
 onClick={() => setShowPrintModal(false)}
 className="flex-1 bg-card-secondary text-secondary dark:text-muted hover:bg-gray-200 dark:hover:bg-zinc-850 rounded-lg py-2 text-xs font-semibold active:scale-95 transition-all border-none"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 )}

 {/* SELECT DOWNLOAD FORMAT MODAL */}
 {showDownloadModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/60 p-4 animate-in fade-in duration-200">
 <div className="w-full max-w-sm rounded-xl border border-default bg-card  p-5 shadow-lg space-y-4 animate-in zoom-in-95 duration-200">
 <div className="flex items-center justify-between border-b border-gray-50 pb-2.5">
 <div className="flex items-center gap-1.5 min-w-0">
 <Download className="h-4.5 w-4.5 text-blue-600" />
 <h3 className="font-bold text-primary dark:text-gray-100 text-sm truncate">Select Download Format</h3>
 </div>
 <button
 onClick={() => setShowDownloadModal(false)}
 className="text-muted hover:text-muted dark:hover:text-gray-200 cursor-pointer p-0.5 border-none bg-transparent"
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 <div className="space-y-3">
 <p className="text-xs text-muted dark:text-muted">
 Select the digital PDF document layout for downloading invoice <strong>{invoiceNo ||"Draft"}</strong>:
 </p>

 <div className="space-y-2">
 {(["Receipt","A5","A4"] as const).map((fmt) => (
 <label
 key={fmt}
 onClick={() => setSelectedDownloadFormat(fmt)}
 className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
 selectedDownloadFormat === fmt
 ?"bg-blue-50/50  border-blue-500 text-blue-600"
 :"bg-card dark:bg-transparent border-default text-secondary dark:text-muted hover:bg-surface dark:hover:bg-card"
 }`}
 >
 <input
 type="radio"
 name="pos-download-format"
 checked={selectedDownloadFormat === fmt}
 onChange={() => setSelectedDownloadFormat(fmt)}
 className="accent-blue-600 h-3.5 w-3.5"
 />
 <div className="flex-1 text-left">
 <div className="text-xs font-bold leading-none">
 {fmt ==="Receipt" ?"Receipt PDF" : fmt ==="A5" ?"A5 PDF" :"A4 PDF"}
 </div>
 <div className="text-[10px] text-muted mt-1.5 dark:text-muted leading-none font-medium">
 {fmt ==="Receipt" ?"80mm continuous roll format" : fmt ==="A5" ?"Compact 148x210 mm grid layout" :"Standard 210x297 mm corporate sheet"}
 </div>
 </div>
 </label>
 ))}
 </div>
 </div>

 <div className="flex gap-2.5 pt-1.5">
 <button
 onClick={handleExecuteDownload}
 className="flex-1 bg-blue-600 hover:bg-blue-700 text-primary rounded-lg py-2 text-xs font-semibold active:scale-95 transition-all outline-none border-none cursor-pointer"
 >
 Download
 </button>
 <button
 onClick={() => setShowDownloadModal(false)}
 className="flex-1 bg-card-secondary text-secondary dark:text-muted hover:bg-gray-200 dark:hover:bg-zinc-850 rounded-lg py-2 text-xs font-semibold active:scale-95 transition-all border-none"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 )}

 {/* PRODUCT SEARCH MODAL */}
 {searchRowIndex !== null && (
   <ProductSearchModal
     products={products}
     onClose={() => setSearchRowIndex(null)}
     onSelectProduct={(product) => {
       const updated = [...lineItems];
       updated[searchRowIndex].productId = product.id;
       setLineItems(updated);
       if (product.simpleVariants && product.simpleVariants.length > 0) {
         setConfiguratorRowIndex(searchRowIndex);
       } else {
         updateRowProductVariant(searchRowIndex, product, { id: 'fallback', name: 'Standard', price: product.price });
       }
       setSearchRowIndex(null);
     }}
   />
 )}

 {/* SMART PRODUCT CONFIGURATOR MODAL */}
 {configuratorRowIndex !== null && (
 <SimpleProductConfiguratorModal 
   product={products.find(p => p.id === lineItems[configuratorRowIndex].productId) || products[0]}
   onClose={() => setConfiguratorRowIndex(null)}
   onSelect={(variant, color, size) => {
     const prod = products.find(p => p.id === lineItems[configuratorRowIndex].productId);
     if (prod) {
       updateRowProductVariant(configuratorRowIndex, prod, variant, color, size);
     }
     setConfiguratorRowIndex(null);
   }}
 />
 )}

 {/* PAYMENT COLLECTION MODAL */}
 {showPaymentModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/60 p-4 animate-in fade-in duration-200">
 <div className="w-full max-w-sm rounded-[24px] bg-card shadow-2xl p-6 relative">
 <button 
 onClick={() => setShowPaymentModal(false)}
 className="absolute top-4 right-4 text-muted hover:text-muted dark:text-muted dark:hover:text-zinc-300 cursor-pointer border-none bg-transparent"
 >
 <X className="h-5 w-5" />
 </button>
 
 <h2 className="text-lg font-bold text-primary dark:text-primary mb-6">Payment Collection</h2>
 
 <div className="space-y-5">
 <div className="bg-surface clear-left rounded-xl p-4 flex justify-between items-center">
 <span className="text-sm font-semibold text-muted dark:text-muted">Grand Total</span>
 <span className="text-xl font-bold font-mono text-primary dark:text-primary">₹{grandTotal.toFixed(2)}</span>
 </div>
 
 <div className="space-y-2">
 <label className="text-[11px] font-bold text-muted uppercase tracking-wide">Payment Type</label>
 <div className="grid grid-cols-2 gap-2">
 <button
 onClick={() => {
 setPaymentType("Full Payment");
 setAmountReceivedInput(grandTotal.toString());
 }}
 className={`py-3 rounded-xl border text-sm font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
 paymentType ==="Full Payment" ?"bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400" :"bg-card border-default text-muted dark:text-muted hover:bg-surface dark:hover:bg-zinc-800"
 }`}
 >
 <span>Full Payment</span>
 </button>
 <button
 onClick={() => {
 setPaymentType("Advance Payment");
 setAmountReceivedInput("");
 }}
 className={`py-3 rounded-xl border text-sm font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
 paymentType ==="Advance Payment" ?"bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400" :"bg-card border-default text-muted dark:text-muted hover:bg-surface dark:hover:bg-zinc-800"
 }`}
 >
 <span>Advance Payment</span>
 </button>
 </div>
 </div>

 {paymentType ==="Advance Payment" && (
 <div className="space-y-4 animate-in slide-in-from-top-2 duration-300 fade-in">
 <div className="space-y-1">
 <label className="text-[11px] font-bold text-muted uppercase tracking-wide">Amount Received (₹)</label>
 <input
 type="number"
 placeholder="e.g. 5000"
 value={amountReceivedInput}
 onChange={(e) => setAmountReceivedInput(e.target.value)}
 className="w-full text-lg font-mono font-bold rounded-xl outline-none bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30 px-4 py-3 placeholder:text-blue-300 dark:placeholder:text-blue-900 text-primary dark:text-primary"
 />
 </div>
 
 <div className="flex justify-between items-center text-sm px-1">
 <span className="font-semibold text-muted font-sans">Calculated Balance Due</span>
 <span className="font-mono font-bold text-rose-500">
 ₹{Math.max(0, grandTotal - (parseFloat(amountReceivedInput) || 0)).toFixed(2)}
 </span>
 </div>
 </div>
 )}

 <button
 onClick={handleSaveInvoice}
 className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-primary shadow-md transition-all hover:bg-blue-700 active:scale-95 border-none mt-2 cursor-pointer"
 >
        <Save className="h-4 w-4" />
        <span>Confirm & Save</span>
      </button>
    </div>
  </div>
</div>
)}

  {/* NEW PRODUCT CREATION MODAL */}
  {showAddProductModal && (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <SimpleProductForm
          initialProduct={null}
          allProducts={products}
          onSave={handleSaveNewProduct}
          onCancel={() => setShowAddProductModal(false)}
        />
      </div>
    </div>
  )}

  {/* CUSTOMER REGISTRY MODAL */}
  {showCustomerRegistryModal && (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden bg-card border border-default p-6 max-h-[90vh] flex flex-col relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={() => setShowCustomerRegistryModal(false)}
          className="absolute top-4 right-4 p-2 rounded-lg text-muted hover:bg-surface border-none bg-transparent cursor-pointer z-50"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <CustomersTab
            customers={customers}
            invoices={SheetsSyncEngine.getInvoices()}
            onRefresh={onInvoiceCreated}
            onShowNotification={onShowNotification}
            onSelectCustomer={(matched) => {
              setCustomerSelectionMode("existing");
              setExistingCustomerSearch(`${matched.id} - ${matched.name}`);
              setCustomerName(matched.name);
              setMobileNumber(String(matched.mobile || ""));
              setAddress(matched.address || "");
              setSecondaryPhone(matched.secondaryPhone || "");
              setSecondaryContactName(matched.secondaryContactName || "");
              setNotes(matched.notes || "");
              setShowCustomerRegistryModal(false);
            }}
          />
        </div>
      </div>
    </div>
  )}
    </div>
  );
}
