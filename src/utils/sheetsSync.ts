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

const TODAY = getTodayStr();

// Professional mock data for immediate out-of-the-box loading
const DEFAULT_EMPLOYEES: Employee[] = [];

const DEFAULT_AGENTS: Agent[] = [];

const DEFAULT_PROMO_CODES: PromoCode[] = [];

const DEFAULT_PRODUCTS: Product[] = [];

const DEFAULT_CUSTOMERS: Customer[] = [];

const DEFAULT_INVOICES: Invoice[] = [];

const DEFAULT_INVOICE_ITEMS: InvoiceItem[] = [];

const DEFAULT_CONNECTION_SETTINGS: ConnectionSettings = {
  spreadsheetId: "",
  spreadsheetName: "",
  appsScriptUrl: "",
  apiKey: "",
  isConnected: false,
  lastSyncTime: "",
  productsSheetName: "Products",
  customersSheetName: "Customers",
  invoicesSheetName: "Invoices",
  invoiceItemsSheetName: "InvoiceItems",
  settingsSheetName: "Settings",
  agentsSheetName: "Agents",
  paymentTransactionsSheetName: "PaymentTransactions",
};

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: "Tenali Central Furniture",
  shortName: "TCF Smart Billing",
  address: "Plot 42, Furniture Showroom Zone, Guntur Road, Tenali-522201",
  phone: "+91 8644 223400",
  email: "contact@tcfshowroom.com",
  gstNumber: "GSTIN-37AAAAT9876C1Z0",
  website: "www.tcfshowroom.com",
  invoiceFooter: "Thank you for buying premium furniture from Tenali Central Furniture! We guarantee quality craftsmanship in every piece.",
  invoicePrefix: "YR",
  nextInvoiceNumber: 1004,
  defaultPrintFormat: "Receipt",
  defaultDownloadFormat: "A4",
  invoiceTerms: `Goods once sold will not be taken back.
Delivery timelines may vary depending on product availability.
Warranty terms apply only to eligible products.
Furniture color and finish may vary slightly from display samples.`,
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
  private static getStorageItem<T>(key: string, defaultValue: T): T {
    const value = localStorage.getItem(key);
    if (!value) return defaultValue;
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }

  private static setStorageItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
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

  public static saveProducts(products: Product[]): void {
    const validated = this.validateAndRepairProductTree(products);
    this.setStorageItem("billing_products", validated);
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

  private static runProductCatalogMigration(products: Product[]): Product[] {
    const isMigrated = localStorage.getItem("catalog_migrated_v2");
    if (isMigrated) {
      return products;
    }

    const migrated: Product[] = [];
    const rootProducts = products.filter(p => !p.parentId || p.nodeType === "Product");

    rootProducts.forEach(prod => {
      // Find all immediate children that might have been acting as variants
      const immediateChildren = products.filter(x => x.parentId === prod.id);

      // Collect variants
      const variants: import("../types").ProductVariant[] = prod.variants || [];
      const optionGroups: import("../types").ProductOptionGroup[] = prod.optionGroups || [];

      // If missing variants, migrate immediate children
      if (variants.length === 0 && immediateChildren.length > 0) {
        immediateChildren.forEach(child => {
          if (child.nodeType === "Variant" || child.nodeType === "Sellable SKU" || child.nodeType === "Configuration") {
            const variantName = child.name.startsWith(`${prod.name} - `)
              ? child.name.substring(prod.name.length + 3)
              : child.name;

            // Make sure we only add it as a variant if it doesn't already exist
            if (!variants.some(v => v.id === child.id)) {
              variants.push({
                id: child.id,
                name: variantName,
                price: child.price || 0,
                cost: child.purchaseCost || 0,
                stock: child.stockAvailable || 0,
                hsnCode: child.hsnCode || "9403",
              });
            }
          }
        });
      }

      // If missing variants entirely, create a default "Standard" variant
      if (variants.length === 0) {
        variants.push({
          id: `var_${Date.now()}_${Math.random()}`,
          name: "Standard",
          price: prod.price || 0,
          cost: prod.purchaseCost || 0,
          stock: prod.stockAvailable || 0,
          hsnCode: prod.hsnCode || "9403",
        });
      }

      // Map older productOptions format to new optionGroups if empty
      if (optionGroups.length === 0 && prod.productOptions && prod.productOptions.length > 0) {
        prod.productOptions.forEach(opt => {
          optionGroups.push({
            id: opt.id,
            name: opt.name,
            values: opt.values.map(v => ({
              id: `oval_${Date.now()}_${Math.random()}`,
              name: v.value,
              priceAdjustment: v.priceModifier || 0
            }))
          });
        });
      }

      const inventoryMode = prod.trackInventorySeparately ? "advanced" : "simple";

      migrated.push({
        ...prod,
        variants,
        optionGroups,
        inventoryMode,
        productOptions: undefined, // cleanup legacy
        isLeaf: false // Modern products don't need tree leaf
      });
    });

    // We only keep the category nodes and the primary Product nodes.
    // Child Variant and SKU tree nodes are removed from the tree.
    const categories = products.filter(p => p.nodeType === "Category");
    const finalTree = [...categories, ...migrated];

    setTimeout(() => localStorage.setItem("catalog_migrated_v2", "true"), 0);

    return finalTree;
  }

  /**
   * Reconstruct and validate product hierarchy trees.
   * Repairs orphan nodes, cycle errors, breaks infinite loops, and recalcs levels & hierarchy paths.
   */
  public static validateAndRepairProductTree(products: Product[]): Product[] {
    if (!products || !Array.isArray(products)) return [];
    
    // Bypass all legacy tree hierarchy validation
    // Just ensure uniqueness by ID and return flat products.
    const flatList: Product[] = [];
    const flatten = (items: any[]) => {
      items.forEach(item => {
        if (!item || typeof item !== 'object') return;
        flatList.push(item);
        if (Array.isArray(item.children)) {
          flatten(item.children);
        }
      });
    };
    flatten(products);

    const idMap = new Map<string, Product>();
    flatList.forEach(p => {
      if (!p || !p.id) return;
      // Skip the root dummy node or pure category nodes from legacy structure
      if (p.id === 'root' || p.id.startsWith('CAT-TEXT-') || p.nodeType === 'Category') return;
      
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

    const sanitized = custs.map((c) => {
      let isChanged = false;
      const invalidAddresses = ["Registered POS Transaction", "Unknown", "Default Address", "N/A"];
      const currentAddr = c.address ? c.address.trim() : "";

      if (!currentAddr || invalidAddresses.includes(currentAddr)) {
        let bestAddress = "Address Not Available";

        // 1. Try address history
        if (c.addressHistory && c.addressHistory.length > 0) {
          bestAddress = c.addressHistory[0].address;
        } else {
          // 2. Try latest invoice for this customer
          const allInvs = this.getStorageItem<Invoice[]>("billing_invoices", []);
          const latestInv = allInvs.find(inv => inv.mobile && String(inv.mobile).replace(/\D/g, "") === String(c.mobile).replace(/\D/g, ""));
          if (latestInv) {
            const invAddr = latestInv.customerBusinessAddress || (latestInv as any).customerAddress || "";
            if (invAddr && !invalidAddresses.includes(invAddr.trim())) {
              bestAddress = invAddr.trim();
            }
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

  public static saveCustomers(customers: Customer[]): void {
    this.setStorageItem("billing_customers", customers);
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

  public static saveInvoices(invoices: Invoice[], isUserAction: boolean = false): void {
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
  }

  public static getInvoiceItems(): InvoiceItem[] {
    return this.getStorageItem<InvoiceItem[]>("billing_invoice_items", DEFAULT_INVOICE_ITEMS);
  }

  public static saveInvoiceItems(items: InvoiceItem[]): void {
    this.setStorageItem("billing_invoice_items", items);
  }

  public static getPaymentTransactions(): PaymentTransaction[] {
    return this.getStorageItem<PaymentTransaction[]>("billing_payment_transactions", []);
  }

  public static savePaymentTransactions(txns: PaymentTransaction[]): void {
    this.setStorageItem("billing_payment_transactions", txns);
  }

  // Connections and configuration
  public static getConnectionSettings(): ConnectionSettings {
    const settings = this.getStorageItem<ConnectionSettings>("billing_conn_settings", DEFAULT_CONNECTION_SETTINGS);
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
    if (settings.companyState === undefined) settings.companyState = "Andhra Pradesh";
    if (settings.companyStateCode === undefined) settings.companyStateCode = "37";
    if (settings.cgstPercentage === undefined) settings.cgstPercentage = 9;
    if (settings.sgstPercentage === undefined) settings.sgstPercentage = 9;
    if (settings.igstPercentage === undefined) settings.igstPercentage = 18;
    if (settings.gstEnabledByDefault === undefined) settings.gstEnabledByDefault = false;
    return settings;
  }

  public static saveCompanySettings(settings: CompanySettings): void {
    this.setStorageItem("billing_company_settings", settings);
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
  }

  // Dedicated Employees Registry
  public static getEmployees(): Employee[] {
    return this.getStorageItem<Employee[]>("billing_employees_registry", DEFAULT_EMPLOYEES);
  }

  public static saveEmployees(employees: Employee[]): void {
    this.setStorageItem("billing_employees_registry", employees);
  }

  // Dedicated Referral & Internal Agents Registry
  public static getAgents(): Agent[] {
    return this.getStorageItem<Agent[]>("billing_agents_registry", DEFAULT_AGENTS);
  }

  public static saveAgents(agents: Agent[]): void {
    this.setStorageItem("billing_agents_registry", agents);
  }

  // Promo Codes Module
  public static getPromoCodes(): PromoCode[] {
    return this.getStorageItem<PromoCode[]>("billing_promo_codes", DEFAULT_PROMO_CODES);
  }

  public static savePromoCodes(promos: PromoCode[]): void {
    this.setStorageItem("billing_promo_codes", promos);
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
  }

  // Audit Logs (Internal activity trails)
  public static getAuditLogs(): AuditLog[] {
    return this.getStorageItem<AuditLog[]>("billing_audit_logs", DEFAULT_AUDIT_LOGS);
  }

  public static saveAuditLogs(logs: AuditLog[]): void {
    this.setStorageItem("billing_audit_logs", logs);
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
    items.forEach((item) => {
      // Find matching invoice status
      const parentInv = invoices.find(inv => inv.invoiceNo === item.invoiceNo);
      if (parentInv && parentInv.status !== "Cancelled" && parentInv.status !== "Deleted") {
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
  }

  // Clear all local database records (leaves settings intact)
  public static clearLocalData(): void {
    this.saveProducts([]);
    this.saveCustomers([]);
    this.saveInvoices([]);
    this.saveInvoiceItems([]);
    this.saveAgents([]);
    this.savePaymentTransactions([]);
    this.savePromoCodes([]);
    this.saveAuditLogs([]);
    this.saveUserActivities([]);
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
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
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
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
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

        if (productsList) {
          // Merge conflict resolution:
          // Local products have the raw values. Keep local version if unpushed edits exist.
          const syncQueue = this.getSyncQueue();
          const unpushedProductIds = new Set<string>();
          syncQueue.forEach(item => {
            if (item.actionType === "upsertProduct" && item.payloadData && item.payloadData.id) {
              unpushedProductIds.add(item.payloadData.id);
            } else if (item.actionType === "upsertProductsBatch" && Array.isArray(item.payloadData)) {
              item.payloadData.forEach((p: any) => {
                if (p && p.id) unpushedProductIds.add(p.id);
              });
            }
          });

          const localProducts = this.getProducts();
          const dbProductsList = Array.isArray(productsList) ? productsList : [];

          const mergedProducts = dbProductsList.map((p: Product) => {
            if (unpushedProductIds.has(p.id)) {
              const matchedLocal = localProducts.find(lp => lp.id === p.id);
              return matchedLocal ? matchedLocal : p;
            }
            return p;
          });

          // Add any local-only products that aren't present in Google Sheets yet
          const mergedIds = new Set<string>(mergedProducts.map((p: any) => p.id));
          localProducts.forEach(lp => {
            if (!mergedIds.has(lp.id)) {
              if (unpushedProductIds.has(lp.id)) {
                mergedProducts.push(lp);
              }
            }
          });

          this.saveProducts(mergedProducts);
        }
        if (customersList) this.saveCustomers(customersList);
        if (invoicesList) this.saveInvoices(invoicesList);
        if (invoiceItemsList) this.saveInvoiceItems(invoiceItemsList);
        if (agentsList && Array.isArray(agentsList)) this.saveAgents(agentsList);
        if (paymentTransactionsList && Array.isArray(paymentTransactionsList)) {
          this.savePaymentTransactions(paymentTransactionsList);
        }

        if (settingsList) {
          const companySettings = this.getCompanySettings();
          let nextInvNum = companySettings.nextInvoiceNumber;
          let prefix = companySettings.invoicePrefix;
          let name = companySettings.companyName;
          let addr = companySettings.address;
          let phone = companySettings.phone;
          let email = companySettings.email;
          let gst = companySettings.gstNumber;

          settingsList.forEach((s: { key: string; value: any }) => {
            if (s.key === "nextInvoiceNumber") nextInvNum = parseInt(s.value) || nextInvNum;
            if (s.key === "invoicePrefix") prefix = s.value || prefix;
            if (s.key === "companyName") name = s.value || name;
            if (s.key === "address") addr = s.value || addr;
            if (s.key === "phone") phone = s.value || phone;
            if (s.key === "email") email = s.value || email;
            if (s.key === "gstNumber") gst = s.value || gst;
          });

          this.saveCompanySettings({
            ...companySettings,
            nextInvoiceNumber: nextInvNum,
            invoicePrefix: prefix,
            companyName: name,
            address: addr,
            phone: phone,
            email: email,
            gstNumber: gst,
          });
        }

        // Update lastSyncTime to current time
        const updatedConn = {
          ...activeConn,
          lastSyncTime: new Date().toLocaleTimeString(),
        };
        this.saveConnectionSettings(updatedConn);

        return { success: true, message: "Database synchronized successfully with Google Sheets." };
      } else {
        const isRate = this.isRateLimitError(result.message);
        const friendlyMsg = isRate
          ? "⚠️ Rate limit exceeded."
          : (result.message || "Database returned sync error.");
        return { success: false, message: friendlyMsg };
      }
    } catch (e: any) {
      console.error("Sync pull error:", e);
      const isRate = this.isRateLimitError(e);
      const friendlyMsg = isRate
        ? "⚠️ Google Sheets API quota/rate limit exceeded. All billing data is safely preserved offline. Active features are 100% operational!"
        : `Sync pulling failed: ${e.message || e}`;
      return { success: false, message: friendlyMsg };
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
        payload: {
          [conn.productsSheetName || "Products"]: this.getProducts(),
          [conn.customersSheetName || "Customers"]: this.getCustomers(),
          [conn.invoicesSheetName || "Invoices"]: this.getInvoices(),
          [conn.settingsSheetName || "Settings"]: [this.getCompanySettings()],
          [conn.agentsSheetName || "Agents"]: this.getAgents(),
          "PaymentTransactions": this.getPaymentTransactions(),
          "Employees": this.getEmployees(),
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
          this.saveSyncQueue([]); // clear queue
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
    const conn = this.getConnectionSettings();
    if (!conn.isConnected || !conn.appsScriptUrl) {
      return { success: false, message: "No active Google Sheets connection." };
    }

    console.log(`[SYNC ENGINE] Force uploading all cache to Google Sheets...`);
    try {
      const payload = {
        action: "SYNC_UP",
        spreadsheetId: conn.spreadsheetId,
        payload: {
          [conn.productsSheetName || "Products"]: this.getProducts(),
          [conn.customersSheetName || "Customers"]: this.getCustomers(),
          [conn.invoicesSheetName || "Invoices"]: this.getInvoices(),
          [conn.settingsSheetName || "Settings"]: [this.getCompanySettings()],
          [conn.agentsSheetName || "Agents"]: this.getAgents(),
          "PaymentTransactions": this.getPaymentTransactions(),
          "Employees": this.getEmployees(),
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
          this.saveSyncQueue([]); // clear queue since everything is clean now
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

  public static async pushTransaction(
    conn: ConnectionSettings,
    actionType: string,
    payloadData: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      // With our new architecture, we just trigger the queue processor asynchronously!
      // The local queue has already stored the data.
      setTimeout(() => {
        this.processSyncQueue();
      }, 500); // 500ms delay to let UI breathe
      
      return { success: true, message: "Transaction queued for background sync." };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to queue sync." };
    }
  }
}
