import {
  Product,
  Customer,
  Invoice,
  InvoiceItem,
  ConnectionSettings,
  CompanySettings,
  DashboardStats,
  User,
  UserActivity,
  AuditLog,
  InvoiceStatus,
  Employee,
  PromoCode,
  Agent,
  PaymentTransaction
} from "../types";

import { getTodayStr, isDateInCurrentWeek, getInvoiceDateStr, parseInvoiceDate, getCurrentTimeStr } from "./dateUtils";
import { IndexedDBStorage } from "./indexedDBStorage";

const TODAY = getTodayStr();

// Professional mock data for immediate out-of-the-box loading
const DEFAULT_EMPLOYEES: Employee[] = [];

const DEFAULT_AGENTS: Agent[] = [];

const DEFAULT_PROMO_CODES: PromoCode[] = [];

const DEFAULT_PRODUCTS: Product[] = [];

const DEFAULT_CUSTOMERS: Customer[] = [];

const DEFAULT_INVOICES: Invoice[] = [];

const DEFAULT_INVOICE_ITEMS: InvoiceItem[] = [];

export const HARDCODED_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwbE6busg-nHjZ_w5XX4euz4rVd0jX1d-gMJAdNiD0Z77xPpGfQsD6p8p5TDPzNwVvhuA/exec";
export const HARDCODED_SPREADSHEET_ID = "1x3o0AobotsU6CN9AEhG9wM3D_TicnHApO_rvocKzaOc";

const DEFAULT_CONNECTION_SETTINGS: ConnectionSettings = {
  spreadsheetId: HARDCODED_SPREADSHEET_ID,
  spreadsheetName: "Tenali Central Furniture Billing Database",
  appsScriptUrl: HARDCODED_APPS_SCRIPT_URL,
  apiKey: "",
  isConnected: true, // Default to connected out-of-the-box
  lastSyncTime: "",
  productsSheetName: "Products",
  customersSheetName: "Customers",
  invoicesSheetName: "Invoices",
  invoiceItemsSheetName: "InvoiceItems",
  settingsSheetName: "Settings",
  agentsSheetName: "Agents",
  paymentTransactionsSheetName: "PaymentTransactions",
  connectionMode: "auto",
  backupInterval: "1_day",
};

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: "Tenali Central Furniture",
  shortName: "TCF Smart Billing",
  address: "Opp R.C.M Church, Amaravathi Yards, Chenchupet, Tenali, Andhra Pradesh 522202",
  phone: "8919546858",
  email: "tenalicentralfurnitures@gmail.com",
  gstNumber: "GSTIN-37AIIPM1793Q1ZE",
  website: "www.tenalicentralfurniture.com",
  invoiceFooter: "Thank you for buying premium furniture from Tenali Central Furniture! We guarantee quality craftsmanship in every piece.",
  invoicePrefix: "YR",
  nextInvoiceNumber: 1004,
  defaultPrintFormat: "Receipt",
  defaultDownloadFormat: "A4",
  useLogoWatermark: true,
  invoiceTerms: `1. Cancellation Policy: A 10% deduction will be applied to the advance payment in the event of an order cancellation.

2. Colour Variance (Online Orders): Please note that the actual color of the furniture may vary slightly from the images displayed on your screen due to lighting and monitor settings.

3. Payment Terms: The full outstanding balance must be cleared prior to the delivery of the goods.

4. Warranty Coverage: Major internal wood breakage or deep structural cracks occurring during the warranty period are eligible for replacement.

5. Wear and Tear Exclusions: The warranty does not cover natural wear and tear, including fading polish, minor paint damage, superficial surface cracks, or naturally loosened joints.

6. Customer Damage: Products will not be eligible for replacement if physical damage has been caused by mishandling or misuse by the customer.

7. Transportation Costs: All transport charges related to warranty claims, repairs, or replacements will be borne by the customer.

8. As disputes or subject to tenali jurisdiction only. Terms and conditions are mentioned in our website`,
  companyState: "Andhra Pradesh",
  companyStateCode: "37",
  cgstPercentage: 9,
  sgstPercentage: 9,
  igstPercentage: 18,
  gstEnabledByDefault: false,
};

const DEFAULT_USERS: User[] = [
  {
    id: "USER-1001",
    fullName: "System Admin",
    username: "admin",
    email: "admin@tcfshowroom.com",
    mobile: "9999999990",
    role: "Admin",
    status: "Active",
    dateCreated: "2026-06-01",
    lastLogin: TODAY + " 08:30 AM",
    passwordHash: "0192023a7bbd73250516f069df18b500" // MD5 of "admin123"
  },
  {
    id: "USER-1002",
    fullName: "Operations Manager",
    username: "manager",
    email: "manager@tcfshowroom.com",
    mobile: "9999999991",
    role: "Manager",
    status: "Active",
    dateCreated: "2026-06-02",
    lastLogin: TODAY + " 09:00 AM",
    passwordHash: "0ebedab8890bb86c3677b102b453aeb1" // MD5 of "manager123"
  },
  {
    id: "USER-1003",
    fullName: "Sales Desk Employee",
    username: "employee",
    email: "employee@tcfshowroom.com",
    mobile: "9999999992",
    role: "Employee",
    status: "Active",
    dateCreated: "2026-06-03",
    lastLogin: TODAY + " 09:15 AM",
    passwordHash: "9f57ebbf2138eb15d86b9fcb52994e63" // MD5 of "employee123"
  }
];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [];

const DEFAULT_ACTIVITIES: UserActivity[] = [];

export class SheetsSyncEngine {
  private static isSyncingDown = false;
  private static isSyncingInProgress = false;
  private static hasPendingSyncRequest = false;
  private static backgroundSyncTimeout: any = null;
  private static hasSyncedDownThisSession = false;

  private static syncStatus: "idle" | "syncing" | "success" | "error" = "idle";
  private static lastSyncError: string | null = null;
  private static syncStatusListeners: ((status: "idle" | "syncing" | "success" | "error", error: string | null) => void)[] = [];

  public static registerSyncStatusListener(cb: (status: "idle" | "syncing" | "success" | "error", error: string | null) => void) {
    this.syncStatusListeners.push(cb);
    cb(this.syncStatus, this.lastSyncError);
    return () => {
      this.syncStatusListeners = this.syncStatusListeners.filter(l => l !== cb);
    };
  }

  private static updateSyncStatus(status: "idle" | "syncing" | "success" | "error", error: string | null = null) {
    this.syncStatus = status;
    this.lastSyncError = error;
    this.syncStatusListeners.forEach(cb => {
      try { cb(status, error); } catch(e) {}
    });
  }

  // Local changes registry (dirty tracking)
  public static getLocalChanges(): { [type: string]: { [id: string]: boolean } } {
    return this.getStorageItem<{ [type: string]: { [id: string]: boolean } }>("billing_local_changes", {});
  }

  private static saveLocalChanges(changes: { [type: string]: { [id: string]: boolean } }): void {
    this.setStorageItem("billing_local_changes", changes);
  }

  public static trackLocalChange(type: string, id: string): void {
    const changes = this.getLocalChanges();
    if (!changes[type]) {
      changes[type] = {};
    }
    changes[type][id] = true;
    this.saveLocalChanges(changes);
  }

  public static isLocalChangeDirty(type: string, id: string): boolean {
    const changes = this.getLocalChanges();
    return !!(changes[type] && changes[type][id]);
  }

  public static clearLocalChanges(): void {
    this.saveLocalChanges({});
  }

  private static queueAutomaticSync(): void {
    if (this.isSyncingDown) return;
    const conn = this.getConnectionSettings();
    if (!conn.isConnected || !conn.appsScriptUrl) return;

    if (this.backgroundSyncTimeout) {
      clearTimeout(this.backgroundSyncTimeout);
    }

    this.backgroundSyncTimeout = setTimeout(() => {
      this.triggerBackgroundSync();
    }, 50);
  }
  private static memoryCache: { [key: string]: any } = {};

  public static async preloadCache(): Promise<void> {
    const keys = [
      "billing_products",
      "billing_customers",
      "billing_invoices",
      "billing_invoice_items",
      "billing_agents_registry",
      "billing_conn_settings",
      "billing_company_settings",
      "billing_current_user",
      "billing_payment_transactions",
      "billing_users",
      "billing_promo_codes",
      "billing_user_activities",
      "billing_audit_logs",
      "billing_local_changes",
      "POS_FURNITURE_OPTION_GROUPS_V3",
      "billing_terminal_id"
    ];

    for (const key of keys) {
      const val = await IndexedDBStorage.getItem<any | null>(key, null);
      if (val !== null) {
        this.memoryCache[key] = val;
      }
    }
    
    // Ensure terminal ID is generated if not exists
    this.getTerminalId();
    console.log("[SyncEngine] Cache preloaded successfully.");
  }

  private static getStorageItem<T>(key: string, defaultValue: T): T {
    if (this.memoryCache[key] !== undefined) {
      return this.memoryCache[key] as T;
    }
    return defaultValue;
  }

  private static setStorageItem<T>(key: string, value: T): void {
    this.memoryCache[key] = value;
    IndexedDBStorage.setItem(key, value).catch(e => {
      console.warn(`[SyncEngine] Background write failed for key "${key}":`, e);
    });
  }

  // Active Session User tracking
  public static getCurrentUser(): User | null {
    return this.getStorageItem<User | null>("billing_current_user", null);
  }

  public static setCurrentUser(user: User | null): void {
    this.setStorageItem("billing_current_user", user);
    if (user) {
      // Update last active time as well
      localStorage.setItem("billing_session_last_active", Date.now().toString());
    } else {
      localStorage.removeItem("billing_session_last_active");
    }
  }

  // General Products Catalog
  public static getProducts(): Product[] {
    const raw = this.getStorageItem<Product[]>("billing_products", DEFAULT_PRODUCTS);
    return this.validateAndRepairProductTree(raw);
  }

  public static saveProducts(products: Product[], isSyncPull = false): void {
    let merged = products;
    if (!isSyncPull) {
      const existingSoftDeleted = this.getProducts().filter(p => p.isSoftDeleted);
      const activeIds = new Set(products.filter(p => !p.isSoftDeleted).map(p => p.id));
      merged = [
        ...products,
        ...existingSoftDeleted.filter(p => !activeIds.has(p.id))
      ];
    }
    const validated = this.validateAndRepairProductTree(merged);
    this.setStorageItem("billing_products", validated);
    if (!isSyncPull) {
      validated.forEach(p => {
        if (p.id) this.trackLocalChange("products", p.id);
      });
    }
    this.queueAutomaticSync();
  }

  // Option Groups persistency helpers
  public static getOptionGroups(): any[] {
    const defaultGroups = [
      { id: "og1", name: "Size", values: ["King", "Queen", "Double", "Single"] },
      { id: "og2", name: "Color", values: ["Brown", "Black", "Walnut", "Teak", "White", "Slate"] },
      { id: "og3", name: "Storage", values: ["Yes", "No"] },
      { id: "og4", name: "Hydraulic", values: ["Yes", "No"] },
      { id: "og5", name: "Thickness", values: ["4 inches", "6 inches", "8 inches", "10 inches"] },
      { id: "og6", name: "Arm Style", values: ["Wooden Arms", "Padded Arms", "Armless"] },
      { id: "og7", name: "Finish", values: ["Matte", "Glossy", "Polished", "Raw"] }
    ];
    return this.getStorageItem<any[]>("POS_FURNITURE_OPTION_GROUPS_V3", defaultGroups);
  }

  public static saveOptionGroups(groups: any[]): void {
    this.setStorageItem("POS_FURNITURE_OPTION_GROUPS_V3", groups);
  }

  /**
   * Ensure uniqueness by ID and return flat products.
   */
  public static validateAndRepairProductTree(products: Product[]): Product[] {
    if (!products || !Array.isArray(products)) return [];

    // Helper: safely parse a value that may be a JSON-stringified array, defaulting to []
    const parseArrayField = <T>(val: any): T[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val as T[];
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('[')) {
          try { 
            const p = JSON.parse(trimmed); 
            return Array.isArray(p) ? p as T[] : []; 
          } catch { 
            return []; 
          }
        }
      }
      return [];
    };

    const idMap = new Map<string, Product>();
    products.forEach(p => {
      if (!p || !p.id) return;
      if (p.id === 'root' || p.id.startsWith('CAT-TEXT-') || (p as any).nodeType === 'Category') return;

      if (!p.inventoryType) {
        p.inventoryType = "Stock Item";
      }

      // Repair JSON-stringified array fields that come back as strings from Google Sheets
      p.colors = parseArrayField<string>(p.colors);
      p.sizes = parseArrayField<any>(p.sizes);
      p.simpleVariants = parseArrayField<any>(p.simpleVariants);
      p.variants = parseArrayField<any>(p.variants);
      p.optionGroups = parseArrayField<any>(p.optionGroups);
      p.comboItems = parseArrayField<any>(p.comboItems);

      if (!idMap.has(p.id)) {
        idMap.set(p.id, p);
      }
    });

    return Array.from(idMap.values());
  }


  // Customers registry
  public static getCustomers(): Customer[] {
    const custs = this.getStorageItem<Customer[]>("billing_customers", DEFAULT_CUSTOMERS);
    let modified = false;

    // Parse invoices ONCE at the top to prevent repeated localStorage parsing
    const allInvs = this.getStorageItem<Invoice[]>("billing_invoices", []);
    const invalidAddresses = ["Registered POS Transaction", "Unknown", "Default Address", "N/A"];

    // Build a map of mobile -> latest valid invoice address
    const mobileToAddressMap = new Map<string, string>();
    allInvs.forEach(inv => {
      if (inv.mobile) {
        const cleanMobile = String(inv.mobile).replace(/\D/g, "");
        const invAddr = inv.customerBusinessAddress || (inv as any).customerAddress || "";
        if (invAddr && !invalidAddresses.includes(invAddr.trim())) {
          mobileToAddressMap.set(cleanMobile, invAddr.trim());
        }
      }
    });

    const sanitized = custs.map((c) => {
      let isChanged = false;
      const currentAddr = c.address ? c.address.trim() : "";

      if (!currentAddr || invalidAddresses.includes(currentAddr)) {
        let bestAddress = "Address Not Available";

        // 1. Try address history
        if (c.addressHistory && c.addressHistory.length > 0) {
          bestAddress = c.addressHistory[0].address;
        } else {
          // 2. Try latest invoice address from the precomputed map (O(1) lookup)
          const cleanMobile = String(c.mobile).replace(/\D/g, "");
          const matchedAddr = mobileToAddressMap.get(cleanMobile);
          if (matchedAddr) {
            bestAddress = matchedAddr;
          }
        }

        c.address = bestAddress;
        c.currentAddress = bestAddress;
        isChanged = true;
      }
      if (isChanged) modified = true;
      return c;
    });

    if (modified) {
      this.saveCustomers(sanitized);

      // Attempt background push for repaired customers
      setTimeout(() => {
        const conn = this.getConnectionSettings();
        if (conn?.appsScriptUrl) {
          sanitized.forEach((c) => {
            this.pushTransaction(conn, "upsertCustomer", c).catch(() => { });
          });
        }
      }, 500);
    }

    return sanitized;
  }

  public static saveCustomers(customers: Customer[], isSyncPull = false): void {
    this.setStorageItem("billing_customers", customers);
    if (!isSyncPull) {
      customers.forEach(c => {
        if (c.id) this.trackLocalChange("customers", c.id);
      });
    }
    this.queueAutomaticSync();
  }

  // Invoice Lookup Handlers
  public static getInvoiceById(invoiceId: string): Invoice | undefined {
    const invoices = this.getInvoices();
    return invoices.find((inv) => inv.invoiceId === invoiceId || inv.invoiceNo === invoiceId);
  }

  public static getInvoiceByNumber(invoiceNo: string): Invoice | undefined {
    const invoices = this.getInvoices();
    return invoices.find((inv) => inv.invoiceNo === invoiceNo);
  }

  // Invoices & Invoice Items (enforce status safety)
  public static getInvoices(): Invoice[] {
    const invs = this.getStorageItem<Invoice[]>("billing_invoices", DEFAULT_INVOICES);
    // Backwards compatibility safety wrapper
    let modified = false;
    const sanitized = invs.map((inv) => {
      let isChanged = false;
      const cleanRaw = inv.status ? String(inv.status).trim() : "";
      if (!cleanRaw || cleanRaw === "null" || cleanRaw === "undefined" || cleanRaw.toUpperCase() === "N/A" || cleanRaw === "") {
        inv.status = "Work In Progress";
        isChanged = true;
      }
      if (!inv.createdBy) {
        inv.createdBy = "admin";
        inv.createdDate = inv.date || TODAY;
        inv.createdTime = "12:00 PM";
        isChanged = true;
      }

      // CRITICAL GST CLASSIFICATION BUG REPAIR
      if (inv.invoiceNo && inv.invoiceNo.startsWith("TCF-G-")) {
        if (inv.invoiceCategory !== "GST") {
          inv.invoiceCategory = "GST";
          isChanged = true;
        }
        if (inv.gstEnabled !== true) {
          inv.gstEnabled = true;
          isChanged = true;
        }
        // Fallback for valid GST type
        if (!inv.gstType || inv.gstType === "No GST" || inv.gstType === "Non-GST") {
          inv.gstType = "Within State GST";
          isChanged = true;
        }
      } else if (inv.invoiceNo && inv.invoiceNo.startsWith("TCF-") && !inv.invoiceNo.startsWith("TCF-G-")) {
        if (inv.invoiceCategory !== "NON_GST") {
          inv.invoiceCategory = "NON_GST";
          isChanged = true;
        }
        if (inv.gstEnabled !== false) {
          inv.gstEnabled = false;
          isChanged = true;
        }
      } else {
        // If category is "GST" but gstEnabled is incorrectly absent
        if (inv.invoiceCategory === "GST") {
          if (inv.gstEnabled !== true) {
            inv.gstEnabled = true;
            isChanged = true;
          }
          if (!inv.gstType || inv.gstType === "No GST" || inv.gstType === "Non-GST") {
            inv.gstType = "Within State GST";
            isChanged = true;
          }
        }
        if (inv.invoiceCategory === "NON_GST") {
          if (inv.gstEnabled !== false) {
            inv.gstEnabled = false;
            isChanged = true;
          }
        }
      }

      if (isChanged) modified = true;
      return inv;
    });

    if (modified) {
      this.saveInvoices(sanitized, false);
    }
    return sanitized;
  }

  public static saveInvoices(invoices: Invoice[], isUserAction: boolean = false, isSyncPull: boolean = false): void {
    const oldInvoices = this.getStorageItem<Invoice[]>("billing_invoices", DEFAULT_INVOICES);
    const currentUser = this.getCurrentUser();
    const userDisplayName = currentUser ? `${currentUser.fullName} (@${currentUser.username})` : "System/Sync Engine";

    const progressStatuses = [
      "Work In Progress",
      "Ready for Delivery",
      "Ready For Delivery",
      "Delivered",
      "Cancelled"
    ];

    const sanitized = invoices.map((inv) => {
      // 0. Normalize date fields — Google Sheets may return Date objects or numbers
      // Convert to YYYY-MM-DD string so all downstream code can call .match() safely
      const toDateStr = (val: any): string | undefined => {
        if (!val) return undefined;
        if (typeof val === 'string') {
          const s = val.trim();
          return (s && s !== 'null' && s !== 'undefined') ? s : undefined;
        }
        if (val instanceof Date) {
          const y = val.getFullYear();
          const m = String(val.getMonth() + 1).padStart(2, '0');
          const d = String(val.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
        if (typeof val === 'number') {
          // Excel serial date: days since 1899-12-30
          const excelEpoch = new Date(1899, 11, 30);
          const d = new Date(excelEpoch.getTime() + val * 86400000);
          const y = d.getFullYear();
          const mo = String(d.getMonth() + 1).padStart(2, '0');
          const dy = String(d.getDate()).padStart(2, '0');
          return `${y}-${mo}-${dy}`;
        }
        return String(val);
      };
      if ((inv as any).date !== undefined) inv.date = toDateStr((inv as any).date) as any;
      if ((inv as any).createdDate !== undefined) inv.createdDate = toDateStr((inv as any).createdDate) as any;

      // 1. Google Sheets Validation & Status Recovery
      const cleanRaw = inv.status ? String(inv.status).trim() : "";
      if (!cleanRaw || cleanRaw === "null" || cleanRaw === "undefined" || cleanRaw.toUpperCase() === "N/A" || cleanRaw === "") {
        inv.status = "Work In Progress";
      }


      // 2. Auto-completion Protection & Status Transition Validation
      const oldInv = oldInvoices.find((old) => (inv.invoiceId && old.invoiceId === inv.invoiceId) || old.invoiceNo === inv.invoiceNo);
      if (oldInv) {
        const oldStatus = oldInv.status || "Work In Progress";
        const newStatus = inv.status;

        if (oldStatus !== newStatus) {
          const isProgressOld = progressStatuses.some(
            (s) => s.toLowerCase() === String(oldStatus).toLowerCase()
          );

          // Prevent background process from auto-completing
          if (isProgressOld && newStatus === "Completed" && !isUserAction) {
            inv.status = oldStatus;
          } else {
            // Record Old Status, New Status, User, Date, Time (automatically handled by addAuditLog)
            this.addAuditLog(
              "Invoice Status Changed",
              userDisplayName,
              `Invoice ${inv.invoiceNo} | Old status: ${oldStatus}`,
              `New status: ${inv.status}`
            );
          }
        }
      }
      return inv;
    });

    this.setStorageItem("billing_invoices", sanitized);
    if (!isSyncPull) {
      sanitized.forEach(inv => {
        const key = inv.invoiceNo || inv.invoiceId;
        if (key) this.trackLocalChange("invoices", key);
      });
    }
    this.queueAutomaticSync();
  }

  public static getInvoiceItems(): InvoiceItem[] {
    return this.getStorageItem<InvoiceItem[]>("billing_invoice_items", DEFAULT_INVOICE_ITEMS);
  }

  public static saveInvoiceItems(items: InvoiceItem[], isSyncPull = false): void {
    this.setStorageItem("billing_invoice_items", items);
    if (!isSyncPull) {
      items.forEach(item => {
        const key = `${item.invoiceId}|${item.productId}|${item.variant}`;
        this.trackLocalChange("invoiceItems", key);
      });
    }
    this.queueAutomaticSync();
  }

  public static getPaymentTransactions(): PaymentTransaction[] {
    return this.getStorageItem<PaymentTransaction[]>("billing_payment_transactions", []);
  }

  public static savePaymentTransactions(txns: PaymentTransaction[], isSyncPull = false): void {
    this.setStorageItem("billing_payment_transactions", txns);
    if (!isSyncPull) {
      txns.forEach(t => {
        if (t.id) this.trackLocalChange("paymentTransactions", t.id);
      });
    }
    this.queueAutomaticSync();
  }

  // Connections and configuration
  public static getConnectionSettings(): ConnectionSettings {
    const settings = this.getStorageItem<ConnectionSettings>("billing_conn_settings", DEFAULT_CONNECTION_SETTINGS);
    
    // FORCE global hardcoded values if in auto mode to overwrite any stale cached data across devices
    if (!settings.connectionMode || settings.connectionMode === "auto") {
      settings.appsScriptUrl = HARDCODED_APPS_SCRIPT_URL;
      settings.spreadsheetId = HARDCODED_SPREADSHEET_ID;
    }

    if (!settings.productsSheetName) settings.productsSheetName = "Products";
    if (!settings.customersSheetName) settings.customersSheetName = "Customers";
    if (!settings.invoicesSheetName) settings.invoicesSheetName = "Invoices";
    if (!settings.invoiceItemsSheetName) settings.invoiceItemsSheetName = "InvoiceItems";
    if (!settings.settingsSheetName) settings.settingsSheetName = "Settings";
    if (!settings.agentsSheetName) settings.agentsSheetName = "Agents";
    if (!settings.paymentTransactionsSheetName) settings.paymentTransactionsSheetName = "PaymentTransactions";
    return settings;
  }

  public static saveConnectionSettings(settings: ConnectionSettings): void {
    this.setStorageItem("billing_conn_settings", settings);
    this.syncGlobalDbConfig(settings);
  }

  private static syncGlobalDbConfig(settings: ConnectionSettings): void {
    fetch("/api/config/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    }).catch(err => {
      console.warn("Failed to sync global DB config to server", err);
    });
  }

  public static getCompanySettings(): CompanySettings {
    const settings = this.getStorageItem<CompanySettings>("billing_company_settings", DEFAULT_COMPANY_SETTINGS);
    if (!settings.defaultPrintFormat) settings.defaultPrintFormat = "Receipt";
    if (!settings.defaultDownloadFormat) settings.defaultDownloadFormat = "A4";
    if (settings.useLogoWatermark === undefined) settings.useLogoWatermark = true;
    if (settings.companyState === undefined) settings.companyState = "Andhra Pradesh";
    if (settings.companyStateCode === undefined) settings.companyStateCode = "37";
    if (settings.cgstPercentage === undefined) settings.cgstPercentage = 9;
    if (settings.sgstPercentage === undefined) settings.sgstPercentage = 9;
    if (settings.igstPercentage === undefined) settings.igstPercentage = 18;
    if (settings.gstEnabledByDefault === undefined) settings.gstEnabledByDefault = false;
    return settings;
  }

  public static saveCompanySettings(settings: CompanySettings, isSyncPull: boolean = false): void {
    this.setStorageItem("billing_company_settings", settings);
    if (!isSyncPull) {
      this.trackLocalChange("settings", "SETTINGS_ROW");
    }
    this.queueAutomaticSync();
  }

  // Draft Invoices
  public static getDrafts(): any[] {
    return this.getStorageItem<any[]>("billing_drafts", []);
  }

  public static saveDrafts(drafts: any[]): void {
    this.setStorageItem("billing_drafts", drafts);
  }

  public static saveDraft(draft: any): void {
    const drafts = this.getDrafts();
    const index = drafts.findIndex(d => d.id === draft.id);
    if (index >= 0) {
      drafts[index] = draft;
    } else {
      drafts.push(draft);
    }
    this.saveDrafts(drafts);
  }

  public static deleteDraft(id: string): void {
    let drafts = this.getDrafts();
    drafts = drafts.filter(d => d.id !== id);
    this.saveDrafts(drafts);
  }

  // RBAC User Management Table
  public static getUsers(): User[] {
    const users = this.getStorageItem<User[]>("billing_user_registry", DEFAULT_USERS);
    // Migration check: If an old plaintext password exists, reset to the new MD5 defaults
    if (users.some(u => u.passwordHash === "admin123" || u.passwordHash === "manager123")) {
      this.setStorageItem("billing_user_registry", DEFAULT_USERS);
      return DEFAULT_USERS;
    }
    return users;
  }

  public static saveUsers(users: User[]): void {
    this.setStorageItem("billing_user_registry", users);
    this.queueAutomaticSync();
  }

  // Dedicated Employees Registry
  public static getEmployees(): Employee[] {
    return this.getStorageItem<Employee[]>("billing_employees_registry", DEFAULT_EMPLOYEES);
  }

  public static saveEmployees(employees: Employee[]): void {
    this.setStorageItem("billing_employees_registry", employees);
    this.queueAutomaticSync();
  }

  // Dedicated Referral & Internal Agents Registry
  public static getAgents(): Agent[] {
    return this.getStorageItem<Agent[]>("billing_agents_registry", DEFAULT_AGENTS);
  }

  public static saveAgents(agents: Agent[], isSyncPull = false): void {
    let merged = agents;
    if (!isSyncPull) {
      const existingSoftDeleted = this.getAgents().filter(a => a.isSoftDeleted);
      const activeIds = new Set(agents.filter(a => !a.isSoftDeleted).map(a => a.id));
      merged = [
        ...agents,
        ...existingSoftDeleted.filter(a => !activeIds.has(a.id))
      ];
    }
    this.setStorageItem("billing_agents_registry", merged);
    this.queueAutomaticSync();
  }

  // Promo Codes Module
  public static getPromoCodes(): PromoCode[] {
    return this.getStorageItem<PromoCode[]>("billing_promo_codes", DEFAULT_PROMO_CODES);
  }

  public static savePromoCodes(promos: PromoCode[], isSyncPull = false): void {
    let merged = promos;
    if (!isSyncPull) {
      const existingSoftDeleted = this.getPromoCodes().filter(p => p.isSoftDeleted);
      const activeCodes = new Set(promos.filter(p => !p.isSoftDeleted).map(p => p.promoCode));
      merged = [
        ...promos,
        ...existingSoftDeleted.filter(p => !activeCodes.has(p.promoCode))
      ];
    }
    this.setStorageItem("billing_promo_codes", merged);
    this.queueAutomaticSync();
  }

  // Cancellation Rules/Settings
  public static getCancellationRules(): { [status: string]: number } {
    const defaultRules = {
      "Draft": 100,
      "Work In Progress": 80,
      "Ready for Delivery": 60,
      "Ready For Delivery": 60,
      "Delivered": 0,
      "Completed": 0
    };
    return this.getStorageItem<{ [status: string]: number }>("billing_cancellation_rules", defaultRules);
  }

  public static saveCancellationRules(rules: { [status: string]: number }): void {
    this.setStorageItem("billing_cancellation_rules", rules);
    this.queueAutomaticSync();
  }

  // Audit Logs (Internal activity trails)
  public static getAuditLogs(): AuditLog[] {
    return this.getStorageItem<AuditLog[]>("billing_audit_logs", DEFAULT_AUDIT_LOGS);
  }

  public static saveAuditLogs(logs: AuditLog[]): void {
    this.setStorageItem("billing_audit_logs", logs);
    this.queueAutomaticSync();
  }

  public static addAuditLog(actionType: string, userName: string, previousValue: string, newValue: string): void {
    const logs = this.getAuditLogs();
    const timeStr = getCurrentTimeStr();
    const newLog: AuditLog = {
      id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
      actionType,
      userName,
      date: getTodayStr(),
      time: timeStr,
      previousValue,
      newValue
    };
    logs.unshift(newLog); // Push to top
    this.saveAuditLogs(logs);
  }

  // User Sessions Activity logs
  public static getUserActivities(): UserActivity[] {
    return this.getStorageItem<UserActivity[]>("billing_user_activities", DEFAULT_ACTIVITIES);
  }

  public static saveUserActivities(activities: UserActivity[]): void {
    this.setStorageItem("billing_user_activities", activities);
    this.queueAutomaticSync();
  }

  // Log a new activity start
  public static recordLoginActivity(username: string): string {
    const list = this.getUserActivities();
    const actId = `ACT-${Date.now()}`;
    const now = new Date();
    const loginTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Parse device/browser
    const userAgent = navigator.userAgent;
    let browser = "Web Browser";
    if (userAgent.indexOf("Chrome") > -1) browser = "Chrome";
    else if (userAgent.indexOf("Safari") > -1) browser = "Safari";
    else if (userAgent.indexOf("Firefox") > -1) browser = "Firefox";
    else if (userAgent.indexOf("Edge") > -1) browser = "Edge";

    let deviceType = "Desktop";
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      deviceType = "Mobile";
    }

    const newActivity: UserActivity = {
      id: actId,
      username,
      loginDate: now.toISOString().split("T")[0],
      loginTime,
      deviceType,
      browser,
      ipAddress: "127.0.0.1 (Local Client)",
      activeSeconds: 0
    };

    list.unshift(newActivity);
    this.saveUserActivities(list);
    return actId;
  }

  // Complete/Update a login activity on logout
  public static recordLogoutActivity(activityId: string): void {
    const list = this.getUserActivities();
    const idx = list.findIndex(a => a.id === activityId);
    if (idx !== -1) {
      const act = list[idx];
      const now = new Date();
      const logoutTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      act.logoutTime = logoutTime;

      // Calculate simple duration from start time or elapsed sessions
      const loginDateToken = new Date(`${act.loginDate} ${act.loginTime}`);
      const secondsDiff = Math.max(60, Math.floor((now.getTime() - loginDateToken.getTime()) / 1000));
      act.activeSeconds = secondsDiff;

      const hrs = Math.floor(secondsDiff / 3600);
      const mins = Math.floor((secondsDiff % 3600) / 60);
      act.sessionDuration = `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
      list[idx] = act;
      this.saveUserActivities(list);
    }
  }

  // Gracefully log session exit, marking session logs complete
  public static logSessionExit(username: string): void {
    const list = this.getUserActivities();
    const activeAct = list.find(a => a.username === username && !a.logoutTime);
    if (activeAct) {
      this.recordLogoutActivity(activeAct.id);
    }
    this.setCurrentUser(null);
  }

  // Calculate stats, with new status parameters
  public static calculateStats(): DashboardStats {
    const currentUser = this.getCurrentUser();
    const userRole = currentUser?.role || "Employee";
    const userFullName = currentUser?.fullName || "";
    const username = currentUser?.username || "";

    // Standard getters (excludes soft deleted invoices)
    let invoices = this.getInvoices().filter(inv => !inv.isSoftDeleted && inv.status !== "Deleted");

    // Employee-level data separation inside backend/data layer
    if (userRole === "Employee") {
      invoices = invoices.filter(
        inv =>
          (inv.assignedEmployee && inv.assignedEmployee.toLowerCase() === userFullName.toLowerCase()) ||
          (inv.createdBy && inv.createdBy.toLowerCase() === username.toLowerCase())
      );
    }

    const items = this.getInvoiceItems();

    let customers = this.getCustomers();
    if (userRole === "Employee") {
      const employeeCustomerNames = new Set(invoices.map(inv => inv.customerName.toLowerCase().trim()));
      customers = customers.filter(c => employeeCustomerNames.has(c.name.toLowerCase().trim()));
    }

    const products = this.getProducts();

    const todayStr = getTodayStr();

    // Today's Sales (Only count non-cancelled, non-draft, non-deleted invoices)
    const validInvoices = invoices.filter(inv => inv.status !== "Cancelled" && inv.status !== "Draft");
    const todayInvoices = validInvoices.filter((inv) => getInvoiceDateStr(inv.date) === todayStr);

    // Weekly Sales
    const weeklyInvoices = validInvoices.filter((inv) => isDateInCurrentWeek(inv.date));

    let weeklySales = 0;

    // Restrict financial data to Admins
    let todaySales = 0;
    if (userRole === "Admin") {
      todaySales = todayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
      weeklySales = weeklyInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    }

    // Filter statuses for indicators
    const wipBillsCount = invoices.filter(i => i.status === "Work In Progress").length;
    const readyBillsCount = invoices.filter(i => i.status === "Ready for Delivery").length;
    const completedBillsCount = invoices.filter(i => i.status === "Completed").length;

    // Deliveries pending: Status is "Delivered" or "Ready for Delivery" that is not closed/complete
    const pendingDeliveriesCount = invoices.filter(i => i.status === "Ready for Delivery" || i.status === "Delivered").length;

    // Top Selling products calculation
    const prodSalesMap: { [name: string]: { qty: number; revenue: number } } = {};
    const invoiceStatusMap = new Map<string, string>();
    invoices.forEach(inv => {
      if (inv.invoiceNo) {
        invoiceStatusMap.set(inv.invoiceNo, inv.status || "");
      }
    });

    items.forEach((item) => {
      const parentStatus = invoiceStatusMap.get(item.invoiceNo);
      if (parentStatus && parentStatus !== "Cancelled" && parentStatus !== "Deleted") {
        if (!prodSalesMap[item.productName]) {
          prodSalesMap[item.productName] = { qty: 0, revenue: 0 };
        }
        prodSalesMap[item.productName].qty += item.quantity;
        prodSalesMap[item.productName].revenue += item.amount;
      }
    });

    const topProducts = Object.keys(prodSalesMap)
      .map((name) => ({
        name: name,
        salesCount: prodSalesMap[name].qty,
        revenue: prodSalesMap[name].revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Monthly summary calculation
    let monthlySales: { month: string; sales: number }[] = [];
    if (userRole === "Admin") {
      const monthlyMap: { [m: string]: number } = {};
      validInvoices.forEach((inv) => {
        const month = inv.date.substring(0, 7);
        monthlyMap[month] = (monthlyMap[month] || 0) + inv.grandTotal;
      });

      const monthsSorted = Object.keys(monthlyMap).sort();
      monthlySales = monthsSorted.map((m) => {
        const parts = m.split("-");
        const dateToken = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
        const label = dateToken.toLocaleString("default", { month: "short", year: "2-digit" });
        return {
          month: label,
          sales: monthlyMap[m],
        };
      });
    }

    let totalGSTCollected = 0;
    let totalAmountReceived = 0;
    let outstandingBalance = 0;

    if (userRole === "Admin") {
      validInvoices.forEach((inv) => {
        totalGSTCollected += (inv.taxAmount || 0);
        totalAmountReceived += (inv.amountPaid !== undefined ? inv.amountPaid : inv.grandTotal);
        outstandingBalance += (inv.balanceDue || 0);
      });
    }

    return {
      todaySales: todaySales,
      todayInvoicesCount: todayInvoices.length,
      weeklySales,
      weeklyInvoicesCount: weeklyInvoices.length,
      totalCustomers: customers.length,
      totalProducts: products.length,
      recentInvoices: invoices.slice(0, 5),
      topProducts: topProducts.length > 0 ? topProducts : [{ name: "No products sold", salesCount: 0, revenue: 0 }],
      monthlySales: monthlySales.length > 0 ? monthlySales : [{ month: "Jun 26", sales: 0 }],

      // New counts
      wipBillsCount,
      readyBillsCount,
      completedBillsCount,
      pendingDeliveriesCount,
      totalGSTCollected,
      totalAmountReceived,
      outstandingBalance
    };
  }

  // Restore defaults
  public static resetToDemoDefaults(): void {
    this.isSyncingDown = true;
    try {
      this.saveProducts(DEFAULT_PRODUCTS);
      this.saveCustomers(DEFAULT_CUSTOMERS);
      this.saveInvoices(DEFAULT_INVOICES);
      this.saveInvoiceItems(DEFAULT_INVOICE_ITEMS);
      this.saveCompanySettings(DEFAULT_COMPANY_SETTINGS);
      this.saveUsers(DEFAULT_USERS);
      this.saveEmployees(DEFAULT_EMPLOYEES);
      this.saveAgents(DEFAULT_AGENTS);
      this.savePromoCodes(DEFAULT_PROMO_CODES);
      this.saveCancellationRules({
        "Draft": 100,
        "Work In Progress": 80,
        "Ready for Delivery": 60,
        "Ready For Delivery": 60,
        "Delivered": 0,
        "Completed": 0
      });
      this.saveAuditLogs(DEFAULT_AUDIT_LOGS);
      this.saveUserActivities(DEFAULT_ACTIVITIES);

      const conn = this.getConnectionSettings();
      conn.isConnected = false;
      this.saveConnectionSettings(conn);
      this.hasSyncedDownThisSession = false;
    } finally {
      this.isSyncingDown = false;
    }
  }

  // Clear all local database records (leaves settings intact)
  public static clearLocalData(): void {
    this.isSyncingDown = true;
    try {
      this.saveProducts([]);
      this.saveCustomers([]);
      this.saveInvoices([]);
      this.saveInvoiceItems([]);
      this.saveAgents([]);
      this.savePaymentTransactions([]);
      this.savePromoCodes([]);
      this.saveAuditLogs([]);
      this.saveUserActivities([]);
      this.hasSyncedDownThisSession = false;
    } finally {
      this.isSyncingDown = false;
    }
  }

  private static isRateLimitError(e: any): boolean {
    if (!e) return false;
    const errString = typeof e === "string" ? e : (e.message || JSON.stringify(e)).toLowerCase();
    return (
      errString.includes("rate") ||
      errString.includes("exceeded") ||
      errString.includes("limit") ||
      errString.includes("quota") ||
      errString.includes("429") ||
      errString.includes("too many requests")
    );
  }

  // ============================================
  // GOOGLE APPS SCRIPT WEB APP API CALLS
  // ============================================

  public static async testAppsScriptConnection(
    url: string,
    spreadsheetId: string,
    customMapping: Partial<ConnectionSettings>
  ): Promise<{ success: boolean; message: string; sheetsFound?: { [key: string]: boolean }; spreadsheetName?: string }> {
    try {
      const payload = {
        action: "SYNC_DOWN",
        spreadsheetId: spreadsheetId
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) return { success: false, message: "HTTP " + response.status };
      const resText = await response.text();
      const result = JSON.parse(resText);

      if (result.success) {
        return { success: true, message: "Connected successfully!", spreadsheetName: "Google Sheet Database" };
      } else {
        return { success: false, message: result.error || "Unknown Apps Script Error" };
      }
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to reach Apps Script URL." };
    }
  }

  public static async initializeDatabaseViaAppsScript(
    url: string,
    companyName: string,
    spreadsheetId?: string
  ): Promise<{ success: boolean; spreadsheetId?: string; spreadsheetName?: string; message: string }> {
    try {
      const payload = {
        action: "initializeDatabase",
        companyName,
        spreadsheetId,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "follow",
      });

      if (!response.ok) {
        throw new Error(`Server status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (e: any) {
      console.error("Spreadsheet Auto-Generation Error:", e);
      const isRate = this.isRateLimitError(e);
      const friendlyMsg = isRate
        ? "⚠️ Google Sheets API capacity limit hit. System has cached configuration. All operations will succeed offline."
        : `Failed to automate sheet creation. Details: ${e.message || e}`;
      return {
        success: false,
        message: friendlyMsg,
      };
    }
  }

  public static async updateDatabaseSchemaViaAppsScript(
    url: string,
    spreadsheetId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const payload = {
        action: "updateDatabaseSchema",
        spreadsheetId,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "follow",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (e: any) {
      console.error("Update schema error:", e);
      return {
        success: false,
        message: `Network Connection Failed. Ensure Apps Script is running correctly. Error: ${e.message || e}`,
      };
    }
  }

  public static async syncDownFromSheets(conn?: ConnectionSettings): Promise<{ success: boolean; message: string }> {
    this.isSyncingDown = true;
    this.updateSyncStatus("syncing");
    try {
      const activeConn = conn || this.getConnectionSettings();
      if (!activeConn.appsScriptUrl) {
        return { success: false, message: "No Apps Script URL configured." };
      }

      const payload = {
        action: "SYNC_DOWN",
        spreadsheetId: activeConn.spreadsheetId,
        sheetsMapping: {
          products: activeConn.productsSheetName,
          customers: activeConn.customersSheetName,
          invoices: activeConn.invoicesSheetName,
          invoiceItems: activeConn.invoiceItemsSheetName,
          settings: activeConn.settingsSheetName,
          agents: activeConn.agentsSheetName,
          paymentTransactions: activeConn.paymentTransactionsSheetName || "PaymentTransactions",
        }
      };

      const response = await fetch(activeConn.appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Sync pull failure: ${response.status}`);
      }

      const resText = await response.text();
      const result = JSON.parse(resText);
      
      if (result.success) {
        // Resolve keys based on mapped sheet names (with lowercase fallback)
        const payloadData = result.payload || result;
        const prodKey = activeConn.productsSheetName || "Products";
        const custKey = activeConn.customersSheetName || "Customers";
        const invKey = activeConn.invoicesSheetName || "Invoices";
        const invItemsKey = activeConn.invoiceItemsSheetName || "InvoiceItems";
        const agentKey = activeConn.agentsSheetName || "Agents";
        const settingsKey = activeConn.settingsSheetName || "Settings";

        const productsList = payloadData[prodKey] || payloadData["products"];
        const customersList = payloadData[custKey] || payloadData["customers"];
        const invoicesList = payloadData[invKey] || payloadData["invoices"];
        const invoiceItemsList = payloadData[invItemsKey] || payloadData["invoiceItems"];
        const agentsList = payloadData[agentKey] || payloadData["agents"];
        const settingsList = payloadData[settingsKey] || payloadData["settings"];
        const paymentTransactionsList = payloadData["PaymentTransactions"] || payloadData["paymentTransactions"];
        const usersList = payloadData["Users"] || payloadData["users"];
        const promoCodesList = payloadData["PromoCodes"] || payloadData["promoCodes"];
        const userActivityList = payloadData["UserActivity"] || payloadData["userActivity"] || payloadData["userActivities"];
        const auditLogList = payloadData["AuditLog"] || payloadData["auditLog"] || payloadData["auditLogs"];

        // 1. Merge Products
        if (productsList) {
          const localProducts = this.getProducts();
          const dbProductsList = Array.isArray(productsList) ? productsList : [];
          
          const mergedProducts = dbProductsList.map((p: Product) => {
            if (this.isLocalChangeDirty("products", p.id)) {
              const matchedLocal = localProducts.find(lp => lp.id === p.id);
              return matchedLocal ? matchedLocal : p;
            }
            return p;
          });

          const mergedIds = new Set<string>(mergedProducts.map((p: any) => p.id));
          localProducts.forEach(lp => {
            if (!mergedIds.has(lp.id)) {
              mergedProducts.push(lp);
            }
          });
          this.saveProducts(mergedProducts, true);
        }

        // 2. Merge Customers
        if (customersList) {
          const localCustomers = this.getCustomers();
          const dbCustomersList = Array.isArray(customersList) ? customersList : [];

          const mergedCustomers = dbCustomersList.map((c: Customer) => {
            if (this.isLocalChangeDirty("customers", c.id)) {
              const matchedLocal = localCustomers.find(lc => lc.id === c.id);
              return matchedLocal ? matchedLocal : c;
            }
            return c;
          });

          const mergedIds = new Set<string>(mergedCustomers.map((c: any) => c.id));
          localCustomers.forEach(lc => {
            if (!mergedIds.has(lc.id)) {
              mergedCustomers.push(lc);
            }
          });
          this.saveCustomers(mergedCustomers, true);
        }

        // 3. Merge Invoices
        if (invoicesList) {
          const localInvoices = this.getInvoices();
          const dbInvoicesList = Array.isArray(invoicesList) ? invoicesList : [];

          const mergedInvoices = dbInvoicesList.map((inv: Invoice) => {
            const invKey = inv.invoiceNo || inv.invoiceId;
            if (invKey && this.isLocalChangeDirty("invoices", invKey)) {
              const matchedLocal = localInvoices.find(li => (li.invoiceNo === inv.invoiceNo) || (li.invoiceId === inv.invoiceId));
              return matchedLocal ? matchedLocal : inv;
            }
            return inv;
          });

          const mergedKeys = new Set<string>();
          mergedInvoices.forEach((inv: any) => {
            if (inv.invoiceNo) mergedKeys.add(inv.invoiceNo);
            if (inv.invoiceId) mergedKeys.add(inv.invoiceId);
          });

          localInvoices.forEach(li => {
            const hasNo = li.invoiceNo && mergedKeys.has(li.invoiceNo);
            const hasId = li.invoiceId && mergedKeys.has(li.invoiceId);
            if (!hasNo && !hasId) {
              mergedInvoices.push(li);
            }
          });
          this.saveInvoices(mergedInvoices, false, true);
        }

        // 4. Merge Invoice Items
        if (invoiceItemsList) {
          const localItems = this.getInvoiceItems();
          const dbItemsList = Array.isArray(invoiceItemsList) ? invoiceItemsList : [];

          const getCompoundKey = (item: InvoiceItem) => `${item.invoiceId}|${item.productId}|${item.variant}`;

          const mergedItems = dbItemsList.map((item: InvoiceItem) => {
            const key = getCompoundKey(item);
            if (this.isLocalChangeDirty("invoiceItems", key)) {
              const matchedLocal = localItems.find(li => getCompoundKey(li) === key);
              return matchedLocal ? matchedLocal : item;
            }
            return item;
          });

          const mergedKeys = new Set<string>(mergedItems.map(getCompoundKey));
          localItems.forEach(li => {
            const key = getCompoundKey(li);
            if (!mergedKeys.has(key)) {
              mergedItems.push(li);
            }
          });
          this.saveInvoiceItems(mergedItems, true);
        }

        // 5. Merge Agents
        if (agentsList) {
          const localAgents = this.getAgents();
          const dbAgentsList = Array.isArray(agentsList) ? agentsList : [];

          const mergedAgents = dbAgentsList.map((a: Agent) => {
            if (this.isLocalChangeDirty("agents", a.id)) {
              const matchedLocal = localAgents.find(la => la.id === a.id);
              return matchedLocal ? matchedLocal : a;
            }
            return a;
          });

          const mergedIds = new Set<string>(mergedAgents.map((a: any) => a.id));
          localAgents.forEach(la => {
            if (!mergedIds.has(la.id)) {
              mergedAgents.push(la);
            }
          });
          this.saveAgents(mergedAgents, true);
        }

        // 6. Merge Payment Transactions
        if (paymentTransactionsList) {
          const localTxns = this.getPaymentTransactions();
          const dbTxnsList = Array.isArray(paymentTransactionsList) ? paymentTransactionsList : [];

          const mergedTxns = dbTxnsList.map((t: PaymentTransaction) => {
            if (this.isLocalChangeDirty("paymentTransactions", t.id)) {
              const matchedLocal = localTxns.find(lt => lt.id === t.id);
              return matchedLocal ? matchedLocal : t;
            }
            return t;
          });

          const mergedIds = new Set<string>(mergedTxns.map((t: any) => t.id));
          localTxns.forEach(lt => {
            if (!mergedIds.has(lt.id)) {
              mergedTxns.push(lt);
            }
          });
          this.savePaymentTransactions(mergedTxns, true);
        }

        if (usersList && Array.isArray(usersList) && usersList.length > 0) this.saveUsers(usersList);
        if (promoCodesList && Array.isArray(promoCodesList)) this.savePromoCodes(promoCodesList, true);
        if (userActivityList && Array.isArray(userActivityList)) this.saveUserActivities(userActivityList);
        if (auditLogList && Array.isArray(auditLogList)) this.saveAuditLogs(auditLogList);

        // Calculate the highest remote sequence number from downloaded invoices
        let maxRemoteSequence = 0;
        if (invoicesList && Array.isArray(invoicesList)) {
          invoicesList.forEach((inv: any) => {
            if (inv.invoiceNo) {
              const match = String(inv.invoiceNo).match(/(\d+)(?:-[A-Za-z][A-Za-z0-9]*)?$/);
              if (match) {
                const seq = parseInt(match[1]);
                if (seq > maxRemoteSequence) {
                  maxRemoteSequence = seq;
                }
              }
            }
          });
        }

        if (settingsList) {
          const companySettings = this.getCompanySettings();
          let name = companySettings.companyName;
          let shortName = companySettings.shortName;
          let addr = companySettings.address;
          let phone = companySettings.phone;
          let email = companySettings.email;
          let gst = companySettings.gstNumber;
          let website = companySettings.website;
          let invoiceFooter = companySettings.invoiceFooter;
          let prefix = companySettings.invoicePrefix;
          let nextInvNum = companySettings.nextInvoiceNumber;
          let defaultPrintFormat = companySettings.defaultPrintFormat;
          let defaultDownloadFormat = companySettings.defaultDownloadFormat;
          let useLogoWatermark = companySettings.useLogoWatermark;
          let invoiceTerms = companySettings.invoiceTerms;
          let companyState = companySettings.companyState;
          let companyStateCode = companySettings.companyStateCode;
          let cgstPercentage = companySettings.cgstPercentage;
          let sgstPercentage = companySettings.sgstPercentage;
          let igstPercentage = companySettings.igstPercentage;
          let gstEnabledByDefault = companySettings.gstEnabledByDefault;

          const firstRow = settingsList[0];
          if (firstRow && (firstRow.nextInvoiceNumber !== undefined || firstRow.nextInvoiceNumber === null)) {
            // Flat format
            if (firstRow.companyName !== undefined && firstRow.companyName !== null) name = String(firstRow.companyName);
            if (firstRow.shortName !== undefined && firstRow.shortName !== null) shortName = String(firstRow.shortName);
            if (firstRow.address !== undefined && firstRow.address !== null) addr = String(firstRow.address);
            if (firstRow.phone !== undefined && firstRow.phone !== null) phone = String(firstRow.phone);
            if (firstRow.email !== undefined && firstRow.email !== null) email = String(firstRow.email);
            if (firstRow.gstNumber !== undefined && firstRow.gstNumber !== null) gst = String(firstRow.gstNumber);
            if (firstRow.website !== undefined && firstRow.website !== null) website = String(firstRow.website);
            if (firstRow.invoiceFooter !== undefined && firstRow.invoiceFooter !== null) invoiceFooter = String(firstRow.invoiceFooter);
            if (firstRow.invoicePrefix !== undefined && firstRow.invoicePrefix !== null) prefix = String(firstRow.invoicePrefix);
            
            const parsedNextInv = parseInt(firstRow.nextInvoiceNumber);
            if (!isNaN(parsedNextInv)) nextInvNum = parsedNextInv;
            
            if (firstRow.defaultPrintFormat !== undefined && firstRow.defaultPrintFormat !== null) defaultPrintFormat = String(firstRow.defaultPrintFormat) as any;
            if (firstRow.defaultDownloadFormat !== undefined && firstRow.defaultDownloadFormat !== null) defaultDownloadFormat = String(firstRow.defaultDownloadFormat) as any;
            
            if (firstRow.useLogoWatermark !== undefined && firstRow.useLogoWatermark !== null && firstRow.useLogoWatermark !== "") {
              useLogoWatermark = String(firstRow.useLogoWatermark) === "true" || firstRow.useLogoWatermark === true;
            } else if (firstRow.useLogoWatermark === "") {
              useLogoWatermark = true;
            }
            if (firstRow.invoiceTerms !== undefined && firstRow.invoiceTerms !== null) invoiceTerms = String(firstRow.invoiceTerms);
            if (firstRow.companyState !== undefined && firstRow.companyState !== null) companyState = String(firstRow.companyState);
            if (firstRow.companyStateCode !== undefined && firstRow.companyStateCode !== null) companyStateCode = String(firstRow.companyStateCode);
            
            const parsedCgst = parseFloat(firstRow.cgstPercentage);
            if (!isNaN(parsedCgst)) cgstPercentage = parsedCgst;
            const parsedSgst = parseFloat(firstRow.sgstPercentage);
            if (!isNaN(parsedSgst)) sgstPercentage = parsedSgst;
            const parsedIgst = parseFloat(firstRow.igstPercentage);
            if (!isNaN(parsedIgst)) igstPercentage = parsedIgst;
            
            if (firstRow.gstEnabledByDefault !== undefined && firstRow.gstEnabledByDefault !== null) {
              gstEnabledByDefault = String(firstRow.gstEnabledByDefault) === "true" || firstRow.gstEnabledByDefault === true;
            }
          } else {
            // Key-Value format
            settingsList.forEach((s: any) => {
              const key = s.key || s.Key;
              const val = s.value !== undefined ? s.value : s.Value;
              if (val === undefined || val === null) return;
              
              if (key === "companyName") name = String(val);
              if (key === "shortName") shortName = String(val);
              if (key === "address") addr = String(val);
              if (key === "phone") phone = String(val);
              if (key === "email") email = String(val);
              if (key === "gstNumber") gst = String(val);
              if (key === "website") website = String(val);
              if (key === "invoiceFooter") invoiceFooter = String(val);
              if (key === "invoicePrefix") prefix = String(val);
              
              if (key === "nextInvoiceNumber") {
                const parsed = parseInt(val);
                if (!isNaN(parsed)) nextInvNum = parsed;
              }
              
              if (key === "defaultPrintFormat") defaultPrintFormat = String(val) as any;
              if (key === "defaultDownloadFormat") defaultDownloadFormat = String(val) as any;
              
              if (key === "useLogoWatermark") {
                useLogoWatermark = val === "" ? true : (String(val) === "true" || val === true);
              }
              if (key === "invoiceTerms") invoiceTerms = String(val);
              if (key === "companyState") companyState = String(val);
              if (key === "companyStateCode") companyStateCode = String(val);
              
              if (key === "cgstPercentage") {
                const parsed = parseFloat(val);
                if (!isNaN(parsed)) cgstPercentage = parsed;
              }
              if (key === "sgstPercentage") {
                const parsed = parseFloat(val);
                if (!isNaN(parsed)) sgstPercentage = parsed;
              }
              if (key === "igstPercentage") {
                const parsed = parseFloat(val);
                if (!isNaN(parsed)) igstPercentage = parsed;
              }
              
              if (key === "gstEnabledByDefault") {
                gstEnabledByDefault = String(val) === "true" || val === true;
              }
            });
          }

          // Force auto-advance settings if remote invoices have a higher sequence
          if (maxRemoteSequence > 0 && maxRemoteSequence >= nextInvNum) {
            nextInvNum = maxRemoteSequence + 1;
          }

          // Only overwrite settings from sheet if they are not locally modified
          if (this.isLocalChangeDirty("settings", "SETTINGS_ROW")) {
            this.saveCompanySettings({
              ...companySettings,
              nextInvoiceNumber: Math.max(companySettings.nextInvoiceNumber, nextInvNum)
            }, true);
          } else {
            this.saveCompanySettings({
              ...companySettings,
              companyName: name,
              shortName,
              address: addr,
              phone,
              email,
              gstNumber: gst,
              website,
              invoiceFooter,
              invoicePrefix: prefix,
              nextInvoiceNumber: nextInvNum,
              defaultPrintFormat,
              defaultDownloadFormat,
              useLogoWatermark,
              invoiceTerms,
              companyState,
              companyStateCode,
              cgstPercentage,
              sgstPercentage,
              igstPercentage,
              gstEnabledByDefault,
            }, true);
          }
        } else if (maxRemoteSequence > 0) {
          const companySettings = this.getCompanySettings();
          if (maxRemoteSequence >= companySettings.nextInvoiceNumber) {
            this.saveCompanySettings({
              ...companySettings,
              nextInvoiceNumber: maxRemoteSequence + 1,
            }, true);
          }
        }

        // Update lastSyncTime to current time
        const updatedConn = {
          ...activeConn,
          lastSyncTime: new Date().toLocaleTimeString(),
        };
        this.saveConnectionSettings(updatedConn);
        this.hasSyncedDownThisSession = true;
        this.updateSyncStatus("success");
        this.saveLocalBackup();

        return { success: true, message: "Database synchronized successfully with Google Sheets." };
      } else {
        const isRate = this.isRateLimitError(result.message);
        const friendlyMsg = isRate
          ? "⚠️ Rate limit exceeded."
          : (result.message || "Database returned sync error.");
        this.updateSyncStatus("error", friendlyMsg);
        return { success: false, message: friendlyMsg };
      }
    } catch (e: any) {
      console.error("Sync pull error:", e);
      const isRate = this.isRateLimitError(e);
      const friendlyMsg = isRate
        ? "⚠️ Google Sheets API quota/rate limit exceeded. All billing data is safely preserved offline. Active features are 100% operational!"
        : `Sync pulling failed: ${e.message || e}`;
      this.updateSyncStatus("error", friendlyMsg);
      return { success: false, message: friendlyMsg };
    } finally {
      this.isSyncingDown = false;
    }
  }

  // Sync queue management
  public static getSyncQueue(): any[] {
    return this.getStorageItem<any[]>("billing_sync_queue", []);
  }

  public static saveSyncQueue(queue: any[]): void {
    this.setStorageItem("billing_sync_queue", queue);
  }

  public static async processSyncQueue(): Promise<{ success: boolean; attempted: number; succeeded: number }> {
    const queue = this.getSyncQueue();
    if (queue.length === 0) return { success: true, attempted: 0, succeeded: 0 };

    const conn = this.getConnectionSettings();
    if (!conn.isConnected || !conn.appsScriptUrl) {
      return { success: false, attempted: 0, succeeded: 0 };
    }

    console.log(`[SYNC ENGINE] Syncing full database state to Google Sheets...`);
    try {
      const payload = {
        action: "SYNC_UP",
        spreadsheetId: conn.spreadsheetId,
        backupInterval: conn.backupInterval || "1_day",
        payload: {
          [conn.productsSheetName || "Products"]: this.getProducts().map(({ inventoryType, ...p }) => p),
          [conn.customersSheetName || "Customers"]: this.getCustomers(),
          [conn.invoicesSheetName || "Invoices"]: this.getInvoices(),
          [conn.invoiceItemsSheetName || "InvoiceItems"]: this.getInvoiceItems(),
          [conn.settingsSheetName || "Settings"]: [this.getCompanySettings()],
          [conn.agentsSheetName || "Agents"]: this.getAgents(),
          "PaymentTransactions": this.getPaymentTransactions(),
          "Users": this.getUsers(),
          "PromoCodes": this.getPromoCodes(),
          "UserActivity": this.getUserActivities(),
          "AuditLog": this.getAuditLogs()
        }
      };

      const response = await fetch(conn.appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const resText = await response.text();
        const result = JSON.parse(resText);
        if (result.success) {
          const syncedIds = new Set<string>(queue.map(x => x.id));
          const currentQueue = this.getSyncQueue();
          const updatedQueue = currentQueue.filter(item => !syncedIds.has(item.id));
          this.saveSyncQueue(updatedQueue);
          return { success: true, attempted: queue.length, succeeded: queue.length };
        }
      }
      return { success: false, attempted: queue.length, succeeded: 0 };
    } catch (e) {
      console.error("[SYNC ENGINE] Background sync failed:", e);
      return { success: false, attempted: queue.length, succeeded: 0 };
    }
  }

  public static async forceUploadAllToSheets(): Promise<{ success: boolean; message: string }> {
    const queue = this.getSyncQueue();
    const conn = this.getConnectionSettings();
    if (!conn.isConnected || !conn.appsScriptUrl) {
      return { success: false, message: "No active Google Sheets connection." };
    }

    console.log(`[SYNC ENGINE] Force uploading all cache to Google Sheets...`);
    try {
      const payload = {
        action: "SYNC_UP",
        spreadsheetId: conn.spreadsheetId,
        backupInterval: conn.backupInterval || "1_day",
        settingsExplicitUpdate: true,
        payload: {
          [conn.productsSheetName || "Products"]: this.getProducts().map(({ inventoryType, ...p }) => p),
          [conn.customersSheetName || "Customers"]: this.getCustomers(),
          [conn.invoicesSheetName || "Invoices"]: this.getInvoices(),
          [conn.invoiceItemsSheetName || "InvoiceItems"]: this.getInvoiceItems(),
          [conn.settingsSheetName || "Settings"]: [this.getCompanySettings()],
          [conn.agentsSheetName || "Agents"]: this.getAgents(),
          "PaymentTransactions": this.getPaymentTransactions(),
          "Users": this.getUsers(),
          "PromoCodes": this.getPromoCodes(),
          "UserActivity": this.getUserActivities(),
          "AuditLog": this.getAuditLogs()
        }
      };

      const response = await fetch(conn.appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const resText = await response.text();
        const result = JSON.parse(resText);
        if (result.success) {
          const syncedIds = new Set<string>(queue.map(x => x.id));
          const currentQueue = this.getSyncQueue();
          const updatedQueue = currentQueue.filter(item => !syncedIds.has(item.id));
          this.saveSyncQueue(updatedQueue);
          this.clearLocalChanges();
          return { success: true, message: "Successfully uploaded local cache to Google Sheets." };
        } else {
          return { success: false, message: result.error || "Google Sheets returned sync failure." };
        }
      }
      return { success: false, message: `Server error: HTTP ${response.status}` };
    } catch (e: any) {
      console.error("[SYNC ENGINE] Force upload failed:", e);
      return { success: false, message: e.message || "Failed to contact Google Apps Script." };
    }
  }

  public static async triggerBackgroundSync(): Promise<void> {
    const conn = this.getConnectionSettings();
    if (!conn.isConnected || !conn.appsScriptUrl) return;

    if (!this.hasSyncedDownThisSession) {
      console.warn("[SYNC ENGINE] Skipping automatic background sync up because initial sync down has not completed successfully in this session. This prevents overwriting remote database with empty/stale local state.");
      return;
    }

    if (this.isSyncingInProgress) {
      this.hasPendingSyncRequest = true;
      return;
    }

    this.isSyncingInProgress = true;
    this.hasPendingSyncRequest = false;

    console.log(`[SYNC ENGINE] Triggering automatic background sync to Google Sheets...`);
    this.updateSyncStatus("syncing");
    try {
      const syncUpPayload: any = {
        [conn.productsSheetName || "Products"]: this.getProducts().map(({ inventoryType, ...p }) => p),
        [conn.customersSheetName || "Customers"]: this.getCustomers(),
        [conn.invoicesSheetName || "Invoices"]: this.getInvoices(),
        [conn.invoiceItemsSheetName || "InvoiceItems"]: this.getInvoiceItems(),
        [conn.agentsSheetName || "Agents"]: this.getAgents(),
        "PaymentTransactions": this.getPaymentTransactions(),
        "Users": this.getUsers(),
        "PromoCodes": this.getPromoCodes(),
        "UserActivity": this.getUserActivities(),
        "AuditLog": this.getAuditLogs()
      };

      if (this.isLocalChangeDirty("settings", "SETTINGS_ROW")) {
        syncUpPayload[conn.settingsSheetName || "Settings"] = [this.getCompanySettings()];
      }

      const payload = {
        action: "SYNC_UP",
        spreadsheetId: conn.spreadsheetId,
        backupInterval: conn.backupInterval || "1_day",
        settingsExplicitUpdate: this.isLocalChangeDirty("settings", "SETTINGS_ROW"),
        payload: syncUpPayload
      };

      const response = await fetch(conn.appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const resText = await response.text();
        const result = JSON.parse(resText);
        if (result.success) {
          console.log(`[SYNC ENGINE] Automatic background sync completed successfully.`);
          this.updateSyncStatus("success");
          this.saveLocalBackup();
          this.clearLocalChanges();
        } else {
          console.warn("[SYNC ENGINE] Background sync failed:", result.error);
          this.updateSyncStatus("error", result.error || "Google Sheets sync returned failure.");
        }
      } else {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
    } catch (e: any) {
      console.warn("[SYNC ENGINE] Automatic background sync failed:", e);
      this.updateSyncStatus("error", e.message || String(e));
    } finally {
      this.isSyncingInProgress = false;
      if (this.hasPendingSyncRequest) {
        setTimeout(() => {
          this.triggerBackgroundSync();
        }, 50);
      }
    }
  }

  // Terminal ID configuration
  public static getTerminalId(): string {
    const tid = this.getStorageItem<string | null>("billing_terminal_id", null);
    if (!tid) {
      const generated = `T${Math.floor(10 + Math.random() * 90)}`;
      this.setStorageItem("billing_terminal_id", generated);
      return generated;
    }
    return tid;
  }

  public static saveTerminalId(id: string): void {
    const sanitized = String(id || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    this.setStorageItem("billing_terminal_id", sanitized);
  }

  public static async pushTransaction(
    conn: ConnectionSettings,
    actionType: string,
    payloadData: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (this.backgroundSyncTimeout) {
        clearTimeout(this.backgroundSyncTimeout);
      }

      this.backgroundSyncTimeout = setTimeout(() => {
        this.triggerBackgroundSync();
      }, 50);
      
      return { success: true, message: "Transaction queued for background sync." };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to queue sync." };
    }
  }

  public static async triggerCloudBackup(): Promise<{ success: boolean; message: string; backupName?: string; backupFileUrl?: string }> {
    try {
      const conn = this.getConnectionSettings();
      if (!conn.appsScriptUrl) {
        return { success: false, message: "No Apps Script URL configured." };
      }

      const payload = {
        action: "CREATE_BACKUP",
        spreadsheetId: conn.spreadsheetId
      };

      const response = await fetch(conn.appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const resText = await response.text();
      const result = JSON.parse(resText);
      
      if (result.success) {
        return {
          success: true,
          message: "Cloud backup completed successfully.",
          backupName: result.backupName,
          backupFileUrl: result.backupFileUrl
        };
      } else {
        return {
          success: false,
          message: result.error || "Failed to create cloud backup."
        };
      }
    } catch (e: any) {
      console.error("[SYNC ENGINE] Cloud backup failed:", e);
      return { success: false, message: e.message || "Failed to contact Google Apps Script." };
    }
  }

  public static saveLocalBackup(): void {
    try {
      const backup = {
        products: this.getProducts(),
        customers: this.getCustomers(),
        invoices: this.getInvoices(),
        invoiceItems: this.getInvoiceItems(),
        company: this.getCompanySettings(),
        timestamp: new Date().toISOString()
      };
      this.setStorageItem("billing_db_backup_last_known_good", backup);
    } catch (e) {
      console.warn("[SYNC ENGINE] Failed to save local backup:", e);
    }
  }

  public static getLocalBackup(): any | null {
    return this.getStorageItem<any | null>("billing_db_backup_last_known_good", null);
  }

  public static restoreLocalBackup(): boolean {
    const backup = this.getLocalBackup();
    if (!backup) return false;
    try {
      if (backup.products) this.saveProducts(backup.products, true);
      if (backup.customers) this.saveCustomers(backup.customers);
      if (backup.invoices) this.saveInvoices(backup.invoices);
      if (backup.invoiceItems) this.saveInvoiceItems(backup.invoiceItems);
      if (backup.company) this.saveCompanySettings(backup.company);
      return true;
    } catch (e) {
      console.error("[SYNC ENGINE] Failed to restore local backup:", e);
      return false;
    }
  }
}
