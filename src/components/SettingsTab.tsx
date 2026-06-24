import React, { useState, useEffect } from "react";
import { Info, Settings, Database, Server, RefreshCw, Copy, Check, ShieldAlert, Download, Upload, AlertCircle, Sparkles, Lock, ShieldCheck, Sun, Moon, Laptop, User, Trash2 } from"lucide-react";
import { ConnectionSettings, CompanySettings, Invoice, InvoiceItem, InvoiceStatus, Product, Customer, Agent, PaymentTransaction } from "../types";
import { SheetsSyncEngine } from"../utils/sheetsSync";
import { SYSTEM_LOGO } from"../constants/branding";
const SQL_SCHEMA = `-- 1. Create company_settings table
CREATE TABLE company_settings (
  id TEXT PRIMARY KEY DEFAULT 'SETTINGS_ROW',
  company_name TEXT NOT NULL,
  short_name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  gst_number TEXT,
  website TEXT,
  invoice_footer TEXT,
  invoice_prefix TEXT DEFAULT 'YR',
  next_invoice_number INTEGER DEFAULT 1001,
  default_print_format TEXT DEFAULT 'Receipt',
  default_download_format TEXT DEFAULT 'A4',
  use_logo_watermark BOOLEAN DEFAULT TRUE,
  invoice_terms TEXT,
  company_state TEXT DEFAULT 'Andhra Pradesh',
  company_state_code TEXT DEFAULT '37',
  cgst_percentage NUMERIC DEFAULT 9,
  sgst_percentage NUMERIC DEFAULT 9,
  igst_percentage NUMERIC DEFAULT 18,
  gst_enabled_by_default BOOLEAN DEFAULT FALSE,
  cancellation_rules JSONB DEFAULT '{}'::jsonb
);

-- Seed initial company settings
INSERT INTO company_settings (
  company_name, short_name, address, phone, email, gst_number, website, invoice_footer, invoice_terms, cancellation_rules
) VALUES (
  'Tenali Central Furniture',
  'TCF Smart Billing',
  'Opp R.C.M Church, Amaravathi Yards, Chenchupet, Tenali, Andhra Pradesh 522202',
  '8919546858',
  'tenalicentralfurnitures@gmail.com',
  'GSTIN-37AIIPM1793Q1ZE',
  'www.tenalicentralfurniture.com',
  'Thank you for buying premium furniture from Tenali Central Furniture! We guarantee quality craftsmanship in every piece.',
  E'1. Cancellation Policy: A 10% deduction will be applied to the advance payment in the event of an order cancellation.\\n\\n2. Colour Variance (Online Orders): Please note that the actual color of the furniture may vary slightly from the images displayed on your screen due to lighting and monitor settings.\\n\\n3. Payment Terms: The full outstanding balance must be cleared prior to the delivery of the goods.\\n\\n4. Warranty Coverage: Major internal wood breakage or deep structural cracks occurring during the warranty period are eligible for replacement.\\n\\n5. Wear and Tear Exclusions: The warranty does not cover natural wear and tear, including fading polish, minor paint damage, superficial surface cracks, or naturally loosened joints.\\n\\n6. Customer Damage: Products will not be eligible for replacement if physical damage has been caused by mishandling or misuse by the customer.\\n\\n7. Transportation Costs: All transport charges related to warranty claims, repairs, or replacements will be borne by the customer.\\n\\n8. As disputes or subject to tenali jurisdiction only. Terms and conditions are mentioned in our website',
  '{"Draft": 100, "Work In Progress": 80, "Ready for Delivery": 60, "Ready For Delivery": 60, "Delivered": 0, "Completed": 0}'::jsonb
) ON CONFLICT DO NOTHING;

-- 2. Create users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  mobile TEXT,
  role TEXT DEFAULT 'Employee',
  status TEXT DEFAULT 'Active',
  date_created TEXT,
  last_login TEXT,
  password_hash TEXT NOT NULL
);

-- Seed default admin user (password: admin123)
INSERT INTO users (id, full_name, username, role, status, password_hash)
VALUES ('USER-1001', 'System Admin', 'admin', 'Admin', 'Active', '0192023a7bbd73250516f069df18b500')
ON CONFLICT DO NOTHING;

-- 3. Create products table
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  price NUMERIC NOT NULL,
  base_price NUMERIC,
  inventory_type TEXT,
  variants JSONB DEFAULT '[]'::jsonb,
  option_groups JSONB DEFAULT '[]'::jsonb,
  inventory_mode TEXT DEFAULT 'simple',
  simple_variants JSONB DEFAULT '[]'::jsonb,
  colors JSONB DEFAULT '[]'::jsonb,
  sizes JSONB DEFAULT '[]'::jsonb,
  is_combo BOOLEAN DEFAULT FALSE,
  combo_items JSONB DEFAULT '[]'::jsonb,
  product_options JSONB DEFAULT '[]'::jsonb,
  track_inventory_separately BOOLEAN DEFAULT FALSE,
  opening_stock NUMERIC DEFAULT 0,
  color TEXT,
  material TEXT,
  brand TEXT,
  vendor TEXT,
  purchase_cost NUMERIC,
  selling_price NUMERIC,
  units_sold INTEGER DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  last_sold_date TEXT,
  stock_available NUMERIC DEFAULT 0,
  production_time TEXT,
  notes TEXT,
  sku TEXT,
  warranty TEXT,
  size TEXT,
  weight TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'Active',
  is_archived BOOLEAN DEFAULT FALSE,
  hsn_code TEXT,
  is_soft_deleted BOOLEAN DEFAULT FALSE
);

-- 4. Create customers table
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT,
  secondary_phone TEXT,
  secondary_contact_name TEXT,
  notes TEXT,
  current_address TEXT,
  address_history JSONB DEFAULT '[]'::jsonb,
  is_soft_deleted BOOLEAN DEFAULT FALSE
);

-- 5. Create invoices table
CREATE TABLE invoices (
  invoice_id TEXT PRIMARY KEY,
  invoice_no TEXT UNIQUE NOT NULL,
  invoice_category TEXT,
  date TEXT,
  invoice_date TEXT,
  invoice_time TEXT,
  created_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  customer_primary_phone TEXT,
  item_count INTEGER DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  ro_adjustment NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  assigned_employee TEXT,
  expected_delivery_date TEXT,
  delivery_date TEXT,
  delivery_notes TEXT,
  auto_no TEXT,
  driver_name TEXT,
  created_by TEXT,
  created_date TEXT,
  created_time TEXT,
  last_edited_by TEXT,
  last_edited_date TEXT,
  last_edited_time TEXT,
  last_edited_timestamp TEXT,
  is_soft_deleted BOOLEAN DEFAULT FALSE,
  agent_id TEXT,
  agent_name TEXT,
  referral_agent_id TEXT,
  referral_agent_name TEXT,
  referral_agent_category TEXT,
  referral_agent_type TEXT,
  gross_amount NUMERIC DEFAULT 0,
  promo_code TEXT,
  promo_discount_amount NUMERIC DEFAULT 0,
  cancellation_percentage NUMERIC DEFAULT 0,
  cancellation_deduction NUMERIC DEFAULT 0,
  refund_amount NUMERIC DEFAULT 0,
  company_retained_amount NUMERIC DEFAULT 0,
  deleted_by TEXT,
  deleted_date TEXT,
  gst_enabled BOOLEAN DEFAULT FALSE,
  gst_type TEXT,
  customer_gst_no TEXT,
  customer_business_name TEXT,
  customer_business_address TEXT,
  customer_state TEXT,
  customer_state_code TEXT,
  cgst_percentage NUMERIC DEFAULT 9,
  sgst_percentage NUMERIC DEFAULT 9,
  igst_percentage NUMERIC DEFAULT 18,
  cgst_amount NUMERIC DEFAULT 0,
  sgst_amount NUMERIC DEFAULT 0,
  igst_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  payment_type TEXT,
  payment_status TEXT,
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  balance_collection_status TEXT,
  customer_secondary_phone TEXT,
  customer_secondary_contact_name TEXT,
  notes TEXT,
  client_notes TEXT,
  order_notes TEXT
);

-- 6. Create invoice_items table
CREATE TABLE invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id TEXT REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  invoice_no TEXT,
  product_id TEXT,
  product_name TEXT,
  display_name TEXT,
  store_name TEXT,
  variant TEXT,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  selected_color TEXT,
  selected_size TEXT,
  hsn_code TEXT,
  hierarchy_node_id TEXT,
  sku_id TEXT,
  hierarchy_path TEXT,
  sku_code TEXT,
  selected_options JSONB DEFAULT '{}'::jsonb,
  is_combo BOOLEAN DEFAULT FALSE,
  combo_items JSONB DEFAULT '[]'::jsonb
);

-- 7. Create payment_transactions table
CREATE TABLE payment_transactions (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  invoice_no TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  collected_by TEXT NOT NULL,
  notes TEXT
);

-- 8. Create agents table
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  agent_type TEXT,
  commission_percentage NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Active',
  notes TEXT,
  created_date TEXT,
  is_soft_deleted BOOLEAN DEFAULT FALSE
);

-- 9. Create promo_codes table
CREATE TABLE promo_codes (
  promo_code TEXT PRIMARY KEY,
  description TEXT,
  discount_type TEXT NOT NULL,
  percentage_discount NUMERIC,
  fixed_discount NUMERIC,
  start_date TEXT,
  end_date TEXT,
  maximum_usage INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  active_status TEXT DEFAULT 'Active',
  is_soft_deleted BOOLEAN DEFAULT FALSE
);

-- 10. Create user_activities table
CREATE TABLE user_activities (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  login_date TEXT,
  login_time TEXT,
  logout_time TEXT,
  session_duration TEXT,
  device_type TEXT,
  browser TEXT,
  ip_address TEXT,
  active_seconds INTEGER DEFAULT 0
);

-- 11. Create audit_logs table
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  user_name TEXT NOT NULL,
  date TEXT,
  time TEXT,
  previous_value TEXT,
  newValue TEXT
);

-- 12. Create employees table
CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  mobile TEXT,
  status TEXT DEFAULT 'Active'
);

INSERT INTO employees (id, full_name, role, status) VALUES 
('EMP-1001', 'Rajesh Kumar', 'Senior Carpentry', 'Active'),
('EMP-1002', 'Suresh Naidu', 'Delivery Driver', 'Active')
ON CONFLICT DO NOTHING;

-- 13. Create draft_invoices table
CREATE TABLE draft_invoices (
  id TEXT PRIMARY KEY,
  created_date TEXT,
  customer_name TEXT,
  mobile_number TEXT,
  customer_state TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  gst_type TEXT,
  gst_enabled BOOLEAN,
  promo_code_input TEXT,
  assigned_employee TEXT,
  referral_agent_id TEXT,
  referral_agent_name TEXT,
  payment_type TEXT,
  amount_received_input TEXT,
  delivery_notes TEXT,
  notes TEXT,
  draft_amount NUMERIC
);

-- 14. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE 
  company_settings, 
  users, 
  products, 
  customers, 
  invoices, 
  invoice_items, 
  payment_transactions, 
  agents, 
  promo_codes, 
  user_activities, 
  audit_logs, 
  employees, 
  draft_invoices;
`;

interface SettingsTabProps {
 connSettings: ConnectionSettings;
 companySettings: CompanySettings;
 onRefresh: () => void;
 onShowNotification: (text: string, type:"success" |"error" |"info") => void;
 currentUserTheme: string;
 onUpdateTheme: (theme:"light" |"dark" |"system") => void;
}

export default function SettingsTab({
 connSettings,
 companySettings,
 onRefresh,
 onShowNotification,
 currentUserTheme,
 onUpdateTheme,
}: SettingsTabProps) {
 const currentUser = SheetsSyncEngine.getCurrentUser();
 const userRole = currentUser?.role ||"Employee";
 const isAdmin = userRole ==="Admin";

 // Sync Status
 const [isSyncing, setIsSyncing] = useState(false);
 const [localTerminalId, setLocalTerminalId] = useState(SheetsSyncEngine.getTerminalId());

 // Cancellation refund settings state
 const [cancellationRules, setCancellationRules] = useState<{ [status: string]: number }>(() =>
 SheetsSyncEngine.getCancellationRules()
 );

  // Connection settings states
   const [supabaseUrl, setSupabaseUrl] = useState(connSettings.supabaseUrl || "");
   const [supabaseAnonKey, setSupabaseAnonKey] = useState(connSettings.supabaseAnonKey || "");
   const [spreadsheetName, setSpreadsheetName] = useState(connSettings.isConnected ? "Supabase Database" : "Not Connected");
   const [isConnected, setIsConnected] = useState(connSettings.isConnected);

 // Company settings states
 const [companyName, setCompanyName] = useState(String(companySettings.companyName ||""));
 const [shortName, setShortName] = useState(String(companySettings.shortName ||"TCF Smart Billing"));
 const [address, setAddress] = useState(String(companySettings.address ||""));
 const [phone, setPhone] = useState(String(companySettings.phone ||""));
 const [email, setEmail] = useState(String(companySettings.email ||""));
 const [gstNumber, setGstNumber] = useState(String(companySettings.gstNumber ||""));
 const [website, setWebsite] = useState(String(companySettings.website ||"www.tcfshowroom.com"));
 const [invoiceFooter, setInvoiceFooter] = useState(String(companySettings.invoiceFooter ||""));
 const [invoicePrefix, setInvoicePrefix] = useState(String(companySettings.invoicePrefix ||"YR"));
 const [nextInvoiceNumber, setNextInvoiceNumber] = useState(companySettings.nextInvoiceNumber || 1001);
 const [defaultPrintFormat, setDefaultPrintFormat] = useState<"Receipt" |"A5" |"A4">(companySettings.defaultPrintFormat ||"Receipt");
 const [defaultDownloadFormat, setDefaultDownloadFormat] = useState<"Receipt" |"A5" |"A4">(companySettings.defaultDownloadFormat ||"A4");
 const [useLogoWatermark, setUseLogoWatermark] = useState<boolean>(companySettings.useLogoWatermark ?? true);
 const [invoiceTerms, setInvoiceTerms] = useState(String(companySettings.invoiceTerms ||""));

 // GST Settings States
 const [companyState, setCompanyState] = useState(companySettings.companyState ||"Andhra Pradesh");
 const [companyStateCode, setCompanyStateCode] = useState(companySettings.companyStateCode ||"37");
 const [cgstPercentage, setCgstPercentage] = useState(companySettings.cgstPercentage ?? 9);
 const [sgstPercentage, setSgstPercentage] = useState(companySettings.sgstPercentage ?? 9);
 const [igstPercentage, setIgstPercentage] = useState(companySettings.igstPercentage ?? 18);
 const [gstEnabledByDefault, setGstEnabledByDefault] = useState(companySettings.gstEnabledByDefault ?? false);

 // File Copy helpers
 const [copiedCode, setCopiedCode] = useState(false);

 // Submit company info settings
 const handleSaveCompany = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!isAdmin) {
 onShowNotification("Clearance Blocked: Only Admin role can alter company credentials.","error");
 return;
 }
 if (!companyName.trim()) {
 onShowNotification("Company Name cannot be empty.","error");
 return;
 }

 const payload: CompanySettings = {
  ...companySettings,
  companyName: companyName.trim(),
  shortName: shortName.trim(),
  address: address.trim(),
  phone: phone.trim(),
  email: email.trim(),
  gstNumber: gstNumber.trim(),
  website: website.trim(),
  invoiceFooter: invoiceFooter.trim(),
  invoiceTerms: invoiceTerms,
  invoicePrefix: invoicePrefix.trim().toUpperCase(),
  nextInvoiceNumber: Number(nextInvoiceNumber) || 1001,
  defaultPrintFormat,
  defaultDownloadFormat,
  useLogoWatermark,
 };

 SheetsSyncEngine.saveCompanySettings(payload);
 
 // Sync to Sheets
 if (connSettings.isConnected) {
 try {
 await SheetsSyncEngine.pushTransaction(connSettings,"saveSettings", payload);
 } catch (err) {
 console.error("Failed to sync company settings to Sheets", err);
 onShowNotification("Saved locally, but failed to sync to Google Sheets.","error");
 }
 }

 // Audit Log trace
 SheetsSyncEngine.addAuditLog(
"Settings Modified",
 currentUser?.fullName ||"System Admin",
"Prior Company Settings",
 `Saved Company branding: ${companyName}`
 );

 onShowNotification("✓ Company branding settings saved successfully.","success");
 onRefresh();
 };

 // Save cancellation rules
 const handleSaveCancellationRules = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!isAdmin) {
 onShowNotification("Clearance Blocked: Only Admin role can alter cancellation rules.","error");
 return;
 }

 SheetsSyncEngine.saveCancellationRules(cancellationRules);

 if (connSettings.isConnected) {
 try {
 await SheetsSyncEngine.pushTransaction(connSettings,"saveSettings", { cancellationRules: JSON.stringify(cancellationRules) });
 } catch (err) {
 console.error("Failed to sync cancellation rules to Sheets", err);
 }
 }

 // Audit Log trace
 SheetsSyncEngine.addAuditLog(
"Cancellation Policy Modified",
 currentUser?.fullName ||"System Admin",
"Prior Refund Coefficients",
 `Saved status refunds: ${JSON.stringify(cancellationRules)}`
 );

 onShowNotification("✓ Cancellation refund percentages saved successfully.","success");
 onRefresh();
 };

 // Submit GST Settings
 const handleSaveGstSettings = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!isAdmin) {
 onShowNotification("Clearance Blocked: Only Admin role can alter GST settings.","error");
 return;
 }

 const currentCompany = SheetsSyncEngine.getCompanySettings();
 const updatedCompany: CompanySettings = {
 ...currentCompany,
 gstNumber: gstNumber.trim(),
 companyState: companyState.trim(),
 companyStateCode: companyStateCode.trim(),
 cgstPercentage: Number(cgstPercentage),
 sgstPercentage: Number(sgstPercentage),
 igstPercentage: Number(igstPercentage),
 gstEnabledByDefault: gstEnabledByDefault
 };

 SheetsSyncEngine.saveCompanySettings(updatedCompany);

 if (connSettings.isConnected) {
 try {
 await SheetsSyncEngine.pushTransaction(connSettings,"saveSettings", updatedCompany);
 } catch (err) {
 console.error("Failed to sync GST settings to Sheets", err);
 }
 }

 SheetsSyncEngine.addAuditLog(
"GST Settings Modified",
 currentUser?.fullName ||"System Admin",
 `State: ${currentCompany.companyState ||"Andhra Pradesh"}, CGST: ${currentCompany.cgstPercentage ?? 9}%`,
 `State: ${companyState}, CGST: ${cgstPercentage}%`
 );

 onShowNotification("✓ GST configuration saved successfully.","success");
 onRefresh();
 };

  // Validate current Supabase connection parameters
  const handleTestConnection = async () => {
    if (!isAdmin) return;
    if (!supabaseUrl.trim()) {
      onShowNotification("A valid Supabase Project URL is required.", "error");
      return;
    }
    if (!supabaseAnonKey.trim()) {
      onShowNotification("A valid Supabase Anon Key is required.", "error");
      return;
    }

    setIsSyncing(true);
    onShowNotification("Pinging Supabase database...", "info");

    const result = await SheetsSyncEngine.testAppsScriptConnection(
      supabaseUrl.trim(),
      supabaseAnonKey.trim()
    );

    setIsSyncing(false);

    if (result.success) {
      const dbName = result.spreadsheetName || "Supabase Database";
      setSpreadsheetName(dbName);
      setIsConnected(true);

      const updatedConn: ConnectionSettings = {
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim(),
        isConnected: true,
        lastSyncTime: new Date().toLocaleTimeString(),
        spreadsheetId: "",
        spreadsheetName: dbName,
        appsScriptUrl: "",
        apiKey: "",
        productsSheetName: "products",
        customersSheetName: "customers",
        invoicesSheetName: "invoices",
        invoiceItemsSheetName: "invoice_items",
        settingsSheetName: "company_settings",
        agentsSheetName: "agents"
      };

      SheetsSyncEngine.saveConnectionSettings(updatedConn);
      
      SheetsSyncEngine.addAuditLog(
        "Database Linked",
        currentUser?.fullName || "System Admin",
        "Disconnected",
        `Linked active Supabase project: ${supabaseUrl.trim()}`
      );

      onShowNotification("✓ Supabase connection verified and saved!", "success");
      onRefresh();
    } else {
      setIsConnected(false);
      setSpreadsheetName("Not Connected");
      onShowNotification(`Test Failed: ${result.message}`, "error");
    }
  };

  const copySqlSchema = async () => {
    try {
      await navigator.clipboard.writeText(SQL_SCHEMA);
      setCopiedCode(true);
      onShowNotification("PostgreSQL schema copied to clipboard! Paste it in your Supabase SQL Editor.", "success");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      onShowNotification("Copy failed.", "error");
    }
  };

  const handleSyncPull = async () => {
    if (!isAdmin) return;
    setIsSyncing(true);
    onShowNotification("Refreshing local cache from Supabase...", "info");
    
    await SheetsSyncEngine.preloadCache();
    setIsSyncing(false);
    onShowNotification("✓ Cache refreshed successfully from Supabase.", "success");
    onRefresh();
  };

  const handleResetDefaults = () => {
    if (!isAdmin) return;
    const confirmReset = window.confirm(
      "Restore Default Demo Logs? This cleans Supabase database tables and fills standard Products, Customers, and Invoices."
    );
    if (!confirmReset) return;

    SheetsSyncEngine.resetToDemoDefaults();
    setSupabaseUrl("");
    setSupabaseAnonKey("");
    setSpreadsheetName("Not Connected");
    setIsConnected(false);

    onShowNotification("✓ Application restarted with demo files. All sync logs disconnected.", "success");
    onRefresh();
  };

  const handleClearLocalData = () => {
    if (!isAdmin) return;
    const confirmClear = window.confirm(
      "⚠️ WARNING: This will permanently delete all products, customers, invoices, and transaction logs from your Supabase database! Are you sure you want to clear all data?"
    );
    if (!confirmClear) return;

    SheetsSyncEngine.clearLocalData();
    onShowNotification("✓ All database data cleared successfully.", "success");
    onRefresh();
  };

  const handleGenerateMockData = () => {
    if (!isAdmin) return;

    // 1. Generate 8 Mock Products
    const mockCategories = ["Chair", "Table", "Sofa", "Bed"];
    const mockProductNames = [
      { name: "Ergonomic Desk Chair", category: "Chair", price: 6500 },
      { name: "Executive Leather Sofa", category: "Sofa", price: 45000 },
      { name: "Teak Wood Dining Table", category: "Table", price: 28000 },
      { name: "King Size Storage Bed", category: "Bed", price: 35000 },
      { name: "Accent Lounge Chair", category: "Chair", price: 12000 },
      { name: "Study Table with Drawers", category: "Table", price: 8500 },
      { name: "Recliner Single Seater", category: "Sofa", price: 18000 },
      { name: "Orthopedic Mattress", category: "Bed", price: 15000 }
    ];

    const mockProducts: Product[] = mockProductNames.map((p, idx) => ({
      id: `PROD-TEMP-${1001 + idx}`,
      name: `[Mock] ${p.name}`,
      category: p.category,
      unit: "pcs",
      price: p.price,
      basePrice: p.price,
      unitsSold: 0,
      revenueGenerated: 0,
      status: "Active"
    }));

    // 2. Generate 20 Mock Customers
    const mockCustomers: Customer[] = [];
    for (let i = 1; i <= 20; i++) {
      mockCustomers.push({
        id: `CUST-TEMP-${1000 + i}`,
        name: `[Mock] Customer ${i}`,
        mobile: `9100000${String(i).padStart(3, '0')}`,
        address: `${10 + i}, Tenali Main Road, Guntur`,
        notes: "Regular retail test customer."
      });
    }

    // 3. Generate 4 Mock Agents
    const mockAgents: Agent[] = [];
    const agentTypes = ["Referral Partner", "Freelancer", "Channel Partner"];
    for (let i = 1; i <= 4; i++) {
      mockAgents.push({
        id: `AGT-TEMP-${1000 + i}`,
        name: `[Mock] Agent ${String.fromCharCode(64 + i)}`,
        mobile: `9200000${String(i).padStart(3, '0')}`,
        email: `agent${i}@example.com`,
        agentType: agentTypes[i % agentTypes.length] as any,
        commissionPercentage: 2 + i,
        status: "Active",
        notes: "Standard agent.",
        createdDate: "2025-06-01"
      });
    }

    // 4. Generate 1000 Mock Invoices distributed over 12 months (June 2025 - June 2026)
    const newInvoices: Invoice[] = [];
    const newItems: InvoiceItem[] = [];
    const newTxns: PaymentTransaction[] = [];

    const operators = [
      { username: "admin", name: "System Admin" },
      { username: "manager_suresh", name: "Suresh (Manager)" },
      { username: "operator_ramesh", name: "Ramesh (Employee)" }
    ];

    const statuses: InvoiceStatus[] = ["Completed", "Work In Progress", "Ready for Delivery", "Cancelled"];

    const now = new Date();
    const months = [];
    for (let m = 0; m < 12; m++) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const y = d.getFullYear();
      const monthIdx = d.getMonth() + 1;
      const days = new Date(y, monthIdx, 0).getDate();

      let weight = 1.0;
      if (monthIdx === 10 || monthIdx === 11 || monthIdx === 12) weight = 1.6;
      else if (monthIdx === 1 || monthIdx === 2) weight = 0.7;

      months.push({ year: y, month: monthIdx, days, weight });
    }

    const totalWeight = months.reduce((sum, m) => sum + m.weight, 0);
    let invoiceCounter = 1;

    months.forEach((m) => {
      const monthInvoicesCount = Math.floor((m.weight / totalWeight) * 1000);

      for (let i = 0; i < monthInvoicesCount; i++) {
        const invId = `INV-TEMP-${m.year}-${String(m.month).padStart(2, '0')}-${10000 + invoiceCounter}`;
        const invNo = `YR-TEMP-${10000 + invoiceCounter}`;
        invoiceCounter++;

        const cust = mockCustomers[Math.floor(Math.random() * mockCustomers.length)];
        const op = operators[Math.floor(Math.random() * operators.length)];

        const day = Math.floor(1 + Math.random() * m.days);
        const dateStr = `${m.year}-${String(m.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const itemsCount = Math.floor(1 + Math.random() * 3);
        let subtotal = 0;

        for (let k = 0; k < itemsCount; k++) {
          const p = mockProducts[Math.floor(Math.random() * mockProducts.length)];
          const qty = Math.floor(1 + Math.random() * 2);
          const itemPrice = p.price;
          const amt = qty * itemPrice;
          subtotal += amt;

          newItems.push({
            invoiceId: invId,
            invoiceNo: invNo,
            productId: p.id,
            productName: p.name,
            quantity: qty,
            unitPrice: itemPrice,
            amount: amt
          });
        }

        let discount = 0;
        if (Math.random() > 0.6) {
          discount = Math.random() > 0.5 ? Math.floor(subtotal * 0.05) : 500;
        }

        const grandTotal = subtotal - discount;
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        let paymentType = "Full Payment";
        let amtPaid = grandTotal;
        let balDue = 0;
        let payStatus = "Paid";

        if (randomStatus === "Cancelled") {
          amtPaid = 0;
          balDue = 0;
          payStatus = "Balance Pending";
        } else if (randomStatus === "Work In Progress" || randomStatus === "Ready for Delivery") {
          if (Math.random() > 0.4) {
            paymentType = "Advance Payment";
            amtPaid = Math.floor(grandTotal * 0.4);
            balDue = grandTotal - amtPaid;
            payStatus = "Partially Paid";

            newTxns.push({
              id: `TXN-TEMP-${invId}-1`,
              invoiceId: invId,
              invoiceNo: invNo,
              date: dateStr,
              time: "11:30 AM",
              amount: amtPaid,
              collectedBy: op.name,
              notes: "Advance payment received."
            });
          }
        }

        const hasAgent = Math.random() > 0.8;
        const agent = hasAgent ? mockAgents[Math.floor(Math.random() * mockAgents.length)] : null;

        newInvoices.push({
          invoiceId: invId,
          invoiceNo: invNo,
          invoiceCategory: "NON_GST",
          date: dateStr,
          invoiceDate: dateStr,
          invoiceTime: "11:30 AM",
          createdTimestamp: String(new Date(dateStr + "T11:30:00").getTime()),
          customerName: cust.name,
          mobile: cust.mobile,
          itemCount: itemsCount,
          subtotal: subtotal,
          discount: discount,
          grandTotal: grandTotal,
          status: randomStatus,
          paymentType: paymentType as any,
          amountPaid: amtPaid,
          balanceDue: balDue,
          paymentStatus: payStatus as any,
          createdBy: op.name,
          createdDate: dateStr,
          createdTime: "11:30 AM",
          referralAgentId: agent ? agent.id : undefined,
          referralAgentName: agent ? agent.name : undefined,
          referralAgentType: agent ? agent.agentType : undefined
        });
      }
    });

    const currentProducts = SheetsSyncEngine.getProducts();
    const currentCustomers = SheetsSyncEngine.getCustomers();
    const currentAgents = SheetsSyncEngine.getAgents();
    const currentInvoices = SheetsSyncEngine.getInvoices();
    const currentItems = SheetsSyncEngine.getInvoiceItems();
    const currentTxns = SheetsSyncEngine.getPaymentTransactions();

    SheetsSyncEngine.saveProducts([...mockProducts, ...currentProducts]);
    SheetsSyncEngine.saveCustomers([...mockCustomers, ...currentCustomers]);
    SheetsSyncEngine.saveAgents([...mockAgents, ...currentAgents]);
    SheetsSyncEngine.savePaymentTransactions([...newTxns, ...currentTxns]);
    SheetsSyncEngine.saveInvoices([...newInvoices, ...currentInvoices], true);
    SheetsSyncEngine.saveInvoiceItems([...newItems, ...currentItems]);

    onShowNotification("✓ Generated 1-year extreme simulation data: 1000+ invoices, 8 products, 20 customers, 4 agents!", "success");
    onRefresh();
  };

  const handleClearMockData = () => {
    if (!isAdmin) return;
    const currentProducts = SheetsSyncEngine.getProducts();
    const currentCustomers = SheetsSyncEngine.getCustomers();
    const currentAgents = SheetsSyncEngine.getAgents();
    const currentInvoices = SheetsSyncEngine.getInvoices();
    const currentItems = SheetsSyncEngine.getInvoiceItems();
    const currentTxns = SheetsSyncEngine.getPaymentTransactions();

    const cleanProducts = currentProducts.filter(p => !p.id.startsWith("PROD-TEMP-"));
    const cleanCustomers = currentCustomers.filter(c => !c.id.startsWith("CUST-TEMP-"));
    const cleanAgents = currentAgents.filter(a => !a.id.startsWith("AGT-TEMP-"));
    const cleanInvoices = currentInvoices.filter(inv => !inv.invoiceId?.startsWith("INV-TEMP-") && !inv.invoiceNo?.startsWith("YR-TEMP-"));
    const cleanItems = currentItems.filter(item => !item.invoiceId?.startsWith("INV-TEMP-") && !item.invoiceNo?.startsWith("YR-TEMP-"));
    const cleanTxns = currentTxns.filter(t => !t.id.startsWith("TXN-TEMP-"));

    SheetsSyncEngine.saveProducts(cleanProducts);
    SheetsSyncEngine.saveCustomers(cleanCustomers);
    SheetsSyncEngine.saveAgents(cleanAgents);
    SheetsSyncEngine.savePaymentTransactions(cleanTxns);
    SheetsSyncEngine.saveInvoices(cleanInvoices, true);
    SheetsSyncEngine.saveInvoiceItems(cleanItems);

    onShowNotification("✓ Successfully cleared all mock simulation records!", "success");
    onRefresh();
  };

 const handleBackupExportJson = () => {
 if (!isAdmin) return;
 const payload = {
 products: SheetsSyncEngine.getProducts(),
 customers: SheetsSyncEngine.getCustomers(),
 invoices: SheetsSyncEngine.getInvoices(),
 invoiceItems: SheetsSyncEngine.getInvoiceItems(),
 company: SheetsSyncEngine.getCompanySettings(),
 exportedAt: new Date().toISOString(),
 };

 const dataStr ="data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
 const downloadAnchor = document.createElement("a");
 downloadAnchor.setAttribute("href", dataStr);
 downloadAnchor.setAttribute("download", `TCFERP_Backup_${new Date().toISOString().split("T")[0]}.json`);
 document.body.appendChild(downloadAnchor);
 downloadAnchor.click();
 downloadAnchor.remove();

 onShowNotification("✓ Comprehensive JSON Backup downloaded successfully.","success");
 };

 const handleProductCsvExport = () => {
 if (!isAdmin) return;
 const products = SheetsSyncEngine.getProducts();
 const csvRows = [
 ["Product ID","Product Name","Category","Unit","Price"],
 ...products.map((p) => [p.id, p.name, p.category, p.unit, p.price]),
 ];

 const csvContent ="data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
 const downloadAnchor = document.createElement("a");
 downloadAnchor.setAttribute("href", encodeURI(csvContent));
 downloadAnchor.setAttribute("download","Products_Catalog.csv");
 document.body.appendChild(downloadAnchor);
 downloadAnchor.click();
 downloadAnchor.remove();

 onShowNotification("✓ Catalog exported to CSV.","success");
 };

 const handleRestoreBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (!isAdmin) return;
 const files = e.target.files;
 if (!files || files.length === 0) return;

 const fileReader = new FileReader();
 fileReader.onload = (fileEvent) => {
 try {
 const textStr = fileEvent.target?.result as string;
 const backupData = JSON.parse(textStr);

 if (backupData.products) SheetsSyncEngine.saveProducts(backupData.products);
 if (backupData.customers) SheetsSyncEngine.saveCustomers(backupData.customers);
 if (backupData.invoices) SheetsSyncEngine.saveInvoices(backupData.invoices, true);
 if (backupData.invoiceItems) SheetsSyncEngine.saveInvoiceItems(backupData.invoiceItems);
 if (backupData.company) SheetsSyncEngine.saveCompanySettings(backupData.company);

 onShowNotification("✓ System restore completed from JSON backup successfully.","success");
 onRefresh();
 } catch (err) {
 onShowNotification("Restore Error: Selected file has corrupted syntax.","error");
 }
 };
 fileReader.readAsText(files[0]);
 };

 return (
 <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in duration-300">
 
 {/* COLUMN LEFT: COMPANY SETTINGS & CANCELLATION POLICIES */}
 <div className="space-y-6 lg:col-span-1">

 {/* OPERATOR PROFILE & THEME PREFERENCES (Saves per active user) */}
 <div className="rounded-xl border border-default dark:border-default bg-card p-5 shadow-sm space-y-4 h-fit transition-colors">
 <div className="flex items-center justify-between border-b border-default pb-2">
 <div className="flex items-center gap-1.5">
 <User className="h-4 w-4 text-blue-600" />
 <h2 className="font-bold text-primary dark:text-primary text-sm">Operator Profile Settings</h2>
 </div>
 <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded font-extrabold font-mono flex items-center gap-0.5">ACTIVE</span>
 </div>

 <div className="space-y-4">
 <div className="flex items-center gap-3 bg-surface p-3 rounded-lg border border-default">
 <div className="h-9 w-9 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 text-sm font-bold font-mono">
 {currentUser?.username?.substring(0, 2).toUpperCase() ||"OP"}
 </div>
 <div>
 <h4 className="text-xs font-bold text-primary">{currentUser?.fullName}</h4>
 <p className="text-[10px] text-muted font-mono">@{currentUser?.username} • {currentUser?.role}</p>
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] uppercase font-bold text-muted block pb-0.5">Theme Preference</label>
  <div className="grid grid-cols-3 gap-2">
 {(["light","dark","system"] as const).map((pref) => {
 const isActive = currentUserTheme === pref;
 return (
 <button
 key={pref}
 type="button"
 onClick={() => {
 onUpdateTheme(pref);
 onShowNotification(`✓ Theme preference updated to ${pref.toUpperCase()}`,"success");
 }}
 className={`py-2 px-1 rounded-lg border text-xs font-semibold capitalize flex items-center justify-center gap-1.5 cursor-pointer outline-none transition-all ${
 isActive
 ?"bg-blue-600 border-blue-600 text-primary font-bold"
 :"bg-surface border-default hover:bg-card-secondary text-secondary"
 }`}
 >
 {pref ==="light" && <Sun className="h-3.5 w-3.5" />}
 {pref ==="dark" && <Moon className="h-3.5 w-3.5" />}
 {pref ==="system" && <Laptop className="h-3.5 w-3.5" />}
 <span>{pref}</span>
 </button>
 );
 })}
 </div>
  <p className="text-[10px] text-muted font-sans leading-tight mt-1">
  Your theme is synchronized to your specific operator session: <strong>@{currentUser?.username}</strong>.
  </p>
  </div>

  {/* Terminal Configuration Section */}
  <div className="space-y-2 pt-3 border-t border-default">
    <label className="text-[10px] uppercase font-bold text-muted block pb-0.5">Terminal ID (Local Device)</label>
    <div className="flex gap-2">
      <input
        type="text"
        maxLength={5}
        value={localTerminalId}
        onChange={(e) => {
          const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
          setLocalTerminalId(val);
        }}
        placeholder="E.g., T1, T2"
        className="flex-1 rounded-lg border border-default bg-surface px-3 py-1.5 text-xs text-primary focus:border-blue-500 outline-none font-mono uppercase"
      />
      <button
        type="button"
        onClick={() => {
          if (!localTerminalId.trim()) {
            onShowNotification("Terminal ID cannot be empty.", "error");
            return;
          }
          SheetsSyncEngine.saveTerminalId(localTerminalId);
          onShowNotification(`✓ Local Terminal ID saved as: ${localTerminalId}`, "success");
          onRefresh(); // Refresh settings state
        }}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-primary text-xs font-semibold rounded-lg border-none cursor-pointer outline-none transition-colors"
      >
        Save
      </button>
    </div>
    <p className="text-[10px] text-muted leading-tight">
      Used as a suffix (e.g. <code>-T1</code>) to prevent duplicate invoice overwrites during concurrent checkouts.
    </p>
  </div>

  </div>
  </div>
 
 {/* COMPANY BRANDING */}
 <div className="rounded-xl border border-default dark:border-default bg-card p-5 shadow-sm space-y-4 h-fit transition-colors">
 <div className="flex items-center justify-between border-b border-default pb-2">
 <div className="flex items-center gap-1.5">
 <Settings className="h-4 w-4 text-blue-600" />
 <h2 className="font-bold text-primary dark:text-primary text-sm">Company branding</h2>
 </div>
 {isAdmin ? (
 <span className="text-[9px] bg-blue-500/15 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-extrabold font-mono flex items-center gap-0.5"><ShieldCheck className="h-2.5 w-2.5" /> EDIT</span>
 ) : (
 <span className="text-[9px] bg-red-950/20 text-red-500 px-1.5 py-0.5 rounded font-extrabold font-mono flex items-center gap-0.5"><Lock className="h-2.5 w-2.5" /> READ ONLY</span>
 )}
 </div>

 <form onSubmit={handleSaveCompany} className="space-y-4">
 {/* Logo Settings Card (Logo Management System) */}
 <div className="bg-surface  p-4 rounded-xl border border-default space-y-3 transition-colors">
 <span className="text-[10px] uppercase font-bold text-muted dark:text-muted block tracking-wide">Logo Settings</span>
 <div className="flex items-center gap-4">
 {/* Preview Logo */}
 <div className="h-14 w-14 rounded-xl border border-default bg-card flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
 <img src={SYSTEM_LOGO} alt="Corporate Logo Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
 </div>
 {/* Actions */}
 <div className="flex-1 space-y-1.5">
 <p className="text-[11px] font-semibold text-secondary dark:text-muted">
 System Logo
 </p>
 <p className="text-[9px] text-muted dark:text-muted font-sans tracking-wide">
 Master logo loaded statically from <span className="font-mono">public/logo.jpeg</span>. Logo file dynamic overrides have been disabled.
 </p>
 </div>
 </div>
 </div>

 <div className="grid gap-3 grid-cols-2">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Company Name</label>
 <input
 type="text"
 required
 disabled={!isAdmin}
 value={companyName}
 onChange={(e) => setCompanyName(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface  px-3 py-2 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none disabled:opacity-75 font-sans"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Short Name (App Name)</label>
 <input
 type="text"
 required
 disabled={!isAdmin}
 value={shortName}
 onChange={(e) => setShortName(e.target.value)}
 placeholder="TCF Smart Billing"
 className="w-full rounded-lg border border-default bg-surface  px-3 py-2 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none disabled:opacity-75 font-sans"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Postal Address</label>
 <textarea
 rows={2}
 required
 disabled={!isAdmin}
 value={address}
 onChange={(e) => setAddress(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface  px-3 py-2 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none disabled:opacity-75 font-sans"
 />
 </div>

 <div className="grid gap-3 grid-cols-2">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Telephone</label>
 <input
 type="text"
 required
 disabled={!isAdmin}
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface  px-3 py-2 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none disabled:opacity-75 font-sans"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">E-mail</label>
 <input
 type="email"
 required
 disabled={!isAdmin}
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface  px-3 py-2 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none disabled:opacity-75 font-sans"
 />
 </div>
 </div>

 <div className="grid gap-3 grid-cols-2">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Tax ID / GSTIN</label>
 <input
 type="text"
 disabled={!isAdmin}
 placeholder="GST-12AB34CD"
 value={gstNumber}
 onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
 className="w-full rounded-lg border border-default bg-surface  px-3 py-2 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none font-mono disabled:opacity-75 uppercase"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Website URL</label>
 <input
 type="text"
 disabled={!isAdmin}
 placeholder="www.tcfshowroom.com"
 value={website}
 onChange={(e) => setWebsite(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface  px-3 py-2 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none disabled:opacity-75 font-sans"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Invoice Terms & Conditions</label>
 <textarea
 rows={3}
 disabled={!isAdmin}
 placeholder="Declare return policies, warranties, or legal checkout stipulations..."
 value={invoiceTerms}
 onChange={(e) => setInvoiceTerms(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface  px-3 py-2 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none disabled:opacity-75 font-sans"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Invoice Footer Note</label>
 <textarea
 rows={2}
 disabled={!isAdmin}
 placeholder="Custom corporate thank-you message..."
 value={invoiceFooter}
 onChange={(e) => setInvoiceFooter(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface  px-3 py-2 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none disabled:opacity-75 font-sans"
 />
 </div>

 <div className="grid gap-3 grid-cols-2">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Prefix</label>
 <input
 type="text"
 required
 disabled={!isAdmin}
 value={invoicePrefix}
 onChange={(e) => setInvoicePrefix(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface  px-3 py-2 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none font-mono uppercase disabled:opacity-75"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Next Number</label>
 <input
 type="number"
 required
 disabled={!isAdmin}
 value={nextInvoiceNumber}
 onChange={(e) => setNextInvoiceNumber(parseInt(e.target.value) || 1001)}
 className="w-full rounded-lg border border-default bg-surface  px-3 py-2 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none font-mono disabled:opacity-75"
 />
 </div>
 </div>

 {isAdmin && (
 <button
 type="submit"
 className="flex w-full items-center justify-center rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-primary hover:bg-blue-700 outline-none border-none cursor-pointer"
 >
 Update Company Branding
 </button>
 )}
 </form>
 </div>

 {/* PRINT SETTINGS CARD */}
 <div className="rounded-xl border border-default dark:border-default bg-card p-5 shadow-sm space-y-4 h-fit transition-colors">
 <div className="flex items-center justify-between border-b border-default pb-2">
 <div className="flex items-center gap-1.5">
 <Settings className="h-4 w-4 text-blue-600" />
 <h2 className="font-bold text-primary dark:text-primary text-sm">Print Settings</h2>
 </div>
 {isAdmin ? (
 <span className="text-[9px] bg-blue-500/15 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-extrabold font-mono flex items-center gap-0.5"><ShieldCheck className="h-2.5 w-2.5" /> ADMIN</span>
 ) : (
 <span className="text-[9px] bg-red-950/20 text-red-500 px-1.5 py-0.5 rounded font-extrabold font-mono flex items-center gap-0.5"><Lock className="h-2.5 w-2.5" /> READ ONLY</span>
 )}
 </div>

 <p className="text-[11px] text-muted leading-relaxed font-sans">
 Configure system-wide default layouts for printed physical slips and digital document downloads.
 </p>

 <form onSubmit={(e) => {
 e.preventDefault();
 if (!isAdmin) {
 onShowNotification("Access Denied: Admin role required.","error");
 return;
 }
 const payload: CompanySettings = {
 ...companySettings,
 defaultPrintFormat,
 defaultDownloadFormat,
 useLogoWatermark,
 };
 SheetsSyncEngine.saveCompanySettings(payload);
 
 SheetsSyncEngine.addAuditLog(
"Print Settings Modified",
 currentUser?.fullName ||"System Admin",
 `Old Layouts`,
 `Print: ${defaultPrintFormat} | Download: ${defaultDownloadFormat} | Watermark: ${useLogoWatermark}`
 );

 onShowNotification("✓ Print Settings updated and saved.","success");
 onRefresh();
 }} className="space-y-4">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Default Print Format</label>
 <select
 disabled={!isAdmin}
 value={defaultPrintFormat}
 onChange={(e) => setDefaultPrintFormat(e.target.value as"Receipt" |"A5" |"A4")}
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs text-primary focus:border-blue-500 outline-none disabled:opacity-75"
 >
 <option value="Receipt">Receipt (80mm Thermal Slip)</option>
 <option value="A5">A5 Invoice (Compact Page)</option>
 <option value="A4">A4 Invoice (Standard Page)</option>
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Default Download Format</label>
 <select
 disabled={!isAdmin}
 value={defaultDownloadFormat}
 onChange={(e) => setDefaultDownloadFormat(e.target.value as"Receipt" |"A5" |"A4")}
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs text-primary focus:border-blue-500 outline-none disabled:opacity-75"
 >
 <option value="Receipt">Receipt PDF (80mm Continuous)</option>
 <option value="A5">A5 PDF (Compact Sheet)</option>
 <option value="A4">A4 PDF (Standard Sheet)</option>
 </select>
 </div>

 <div className="space-y-1 pt-2">
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 disabled={!isAdmin}
 checked={useLogoWatermark}
 onChange={(e) => setUseLogoWatermark(e.target.checked)}
 className="rounded border-default text-blue-600 focus:ring-blue-500 h-4 w-4 disabled:opacity-50"
 />
 <span className="text-xs font-semibold text-secondary dark:text-muted">Use Logo Watermark</span>
 </label>
 <p className="text-[10px] text-muted ml-6">Render the company logo dynamically as a centered watermark on A4 and A5 PDFs.</p>
 </div>

 {isAdmin && (
 <button
 type="submit"
 className="flex w-full items-center justify-center rounded-lg bg-surface py-2.5 text-xs font-semibold text-primary hover:bg-zinc-850 outline-none border-none cursor-pointer"
 >
 Save Print Settings
 </button>
 )}
 </form>
 </div>

 {/* INVOICE SETTINGS CARD */}
 <div className="rounded-xl border border-default dark:border-default bg-card p-5 shadow-sm space-y-4 h-fit transition-colors">
 <div className="flex items-center justify-between border-b border-default pb-2">
 <div className="flex items-center gap-1.5">
 <Settings className="h-4 w-4 text-blue-600" />
 <h2 className="font-bold text-primary dark:text-primary text-sm">Invoice Settings</h2>
 </div>
 {isAdmin ? (
 <span className="text-[9px] bg-blue-500/15 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-extrabold font-mono flex items-center gap-0.5"><ShieldCheck className="h-2.5 w-2.5" /> ADMIN</span>
 ) : (
 <span className="text-[9px] bg-red-950/20 text-red-500 px-1.5 py-0.5 rounded font-extrabold font-mono flex items-center gap-0.5"><Lock className="h-2.5 w-2.5" /> READ ONLY</span>
 )}
 </div>

 <p className="text-[11px] text-muted leading-relaxed font-sans">
 Manage the dynamic Terms &amp; Conditions printed on each customer invoice. Multi-line values are fully supported.
 </p>

 <form onSubmit={(e) => {
 e.preventDefault();
 if (!isAdmin) {
 onShowNotification("Access Denied: Admin role required.","error");
 return;
 }
 const payload: CompanySettings = {
 ...companySettings,
 invoiceTerms,
 };
 SheetsSyncEngine.saveCompanySettings(payload);
 
 SheetsSyncEngine.addAuditLog(
"Invoice Settings Modified",
 currentUser?.fullName ||"System Admin",
 `Old Terms`,
 `Invoice terms and conditions updated.`
 );

 onShowNotification("✓ Invoice Settings successfully updated.","success");
 onRefresh();
 }} className="space-y-4">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Invoice Terms &amp; Conditions</label>
 <textarea
 rows={5}
 disabled={!isAdmin}
 placeholder="Goods once sold will not be taken back..."
 value={invoiceTerms}
 onChange={(e) => setInvoiceTerms(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface  px-3 py-2 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none disabled:opacity-75 font-sans"
 />
 </div>

 {isAdmin && (
 <button
 type="submit"
 className="flex w-full items-center justify-center rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-primary hover:bg-blue-700 outline-none border-none cursor-pointer"
 >
 Save Invoice Settings
 </button>
 )}
 </form>
 </div>

 {/* CANCELLATION REFUND POLICY SETTINGS CARD */}
 <div className="rounded-xl border border-default dark:border-default bg-card p-5 shadow-sm space-y-4 h-fit transition-colors">
 <div className="flex items-center justify-between border-b border-default pb-2">
 <div className="flex items-center gap-1.5">
 <AlertCircle className="h-4 w-4 text-red-500" />
 <h2 className="font-bold text-primary dark:text-primary text-sm">Cancellation Refund Policy</h2>
 </div>
 {isAdmin ? (
 <span className="text-[9px] bg-red-500/15 border border-red-500/20 text-red-500 px-1.5 py-0.5 rounded font-extrabold font-mono flex items-center gap-0.5"><ShieldCheck className="h-2.5 w-2.5 animate-pulse" /> EDIT</span>
 ) : (
 <span className="text-[9px] bg-red-950/20 text-red-500 px-1.5 py-0.5 rounded font-extrabold font-mono flex items-center gap-0.5"><Lock className="h-2.5 w-2.5" /> READ ONLY</span>
 )}
 </div>

 <p className="text-[11px] text-muted leading-relaxed font-sans">
 Define the percentage refund coefficients for clients when orders with different progress statuses are cancelled. The remaining percentage will be securely retained as company processing penalties.
 </p>

 <form onSubmit={handleSaveCancellationRules} className="space-y-4.5 pt-1">
 <div className="space-y-3.5">
 {Object.keys(cancellationRules).map((statusKey) => {
 if (statusKey ==="Ready For Delivery") return null; // Deduplicate alternate casing representation
 const displayLabel = statusKey;
 return (
 <div key={statusKey} className="grid grid-cols-3 items-center gap-3">
 <label className="text-[11px] font-semibold text-muted col-span-2 truncate">
 {displayLabel} Stage Refund
 </label>
 <div className="relative col-span-1">
 <input
 type="number"
 min="0"
 max="100"
 required
 disabled={!isAdmin}
 value={cancellationRules[statusKey] ?? 0}
 onChange={(e) => {
 const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
 setCancellationRules(prev => {
 const updated = { ...prev, [statusKey]: val };
 if (statusKey ==="Ready for Delivery") {
 updated["Ready For Delivery"] = val;
 }
 return updated;
 });
 }}
 className="w-full rounded-lg border border-default bg-surface pl-2 pr-6 py-1.5 text-xs text-right font-mono text-primary focus:border-red-500 outline-none disabled:opacity-75"
 />
 <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted pointer-events-none">%</span>
 </div>
 </div>
 );
 })}
 </div>

 {isAdmin && (
 <button
 type="submit"
 className="flex w-full items-center justify-center rounded-lg bg-surface py-2.5 text-xs font-semibold text-primary hover:bg-zinc-850 outline-none border-none cursor-pointer"
 >
 Save Cancellation Refund Policy
 </button>
 )}
 </form>
 </div>

 {/* GST CONFIGURATION SETTINGS CARD (Admin Only or Read-Only for others) */}
 <div className="rounded-xl border border-default dark:border-default bg-card p-5 shadow-sm space-y-4 h-fit transition-colors">
 <div className="flex items-center justify-between border-b border-default pb-2">
 <div className="flex items-center gap-1.5">
 <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
 <h2 className="font-bold text-primary dark:text-primary text-sm">GST Configuration</h2>
 </div>
 {isAdmin ? (
 <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded font-extrabold font-mono flex items-center gap-0.5"><ShieldCheck className="h-2.5 w-2.5" /> EDIT</span>
 ) : (
 <span className="text-[9px] bg-red-950/20 text-red-500 px-1.5 py-0.5 rounded font-extrabold font-mono flex items-center gap-0.5"><Lock className="h-2.5 w-2.5" /> READ ONLY</span>
 )}
 </div>

 <p className="text-[11px] text-muted leading-relaxed font-sans">
 Configure default corporate GST numbers, state identification, tax percentages, and initial system toggles. Tax values are fully editable.
 </p>

 <form onSubmit={handleSaveGstSettings} className="space-y-4 pt-1">
 <div className="space-y-3">
 <div>
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted block pb-1">Company GSTIN</label>
 <input
 type="text"
 required
 disabled={!isAdmin}
 value={gstNumber}
 onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
 placeholder="E.g., 37AAAAT9876C1Z0"
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 text-xs text-primary focus:border-blue-500 outline-none disabled:opacity-75"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted block pb-1">Company State</label>
 <input
 type="text"
 required
 disabled={!isAdmin}
 value={companyState}
 onChange={(e) => setCompanyState(e.target.value)}
 placeholder="Andhra Pradesh"
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 text-xs text-primary focus:border-blue-500 outline-none disabled:opacity-75"
 />
 </div>
 <div>
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted block pb-1">State Code</label>
 <input
 type="text"
 required
 disabled={!isAdmin}
 value={companyStateCode}
 onChange={(e) => setCompanyStateCode(e.target.value)}
 placeholder="37"
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 text-xs text-primary focus:border-blue-500 outline-none disabled:opacity-75"
 />
 </div>
 </div>

 <div className="grid grid-cols-3 gap-2 pt-1 border-t border-default">
 <div>
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted block pb-1">CGST (%)</label>
 <input
 type="number"
 step="0.01"
 min="0"
 max="100"
 required
 disabled={!isAdmin}
 value={cgstPercentage}
 onChange={(e) => setCgstPercentage(parseFloat(e.target.value) || 0)}
 className="w-full rounded-lg border border-default bg-surface px-2 py-1.5 text-xs text-right font-mono text-primary focus:border-blue-500 outline-none disabled:opacity-75"
 />
 </div>
 <div>
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted block pb-1">SGST (%)</label>
 <input
 type="number"
 step="0.01"
 min="0"
 max="100"
 required
 disabled={!isAdmin}
 value={sgstPercentage}
 onChange={(e) => setSgstPercentage(parseFloat(e.target.value) || 0)}
 className="w-full rounded-lg border border-default bg-surface px-2 py-1.5 text-xs text-right font-mono text-primary focus:border-blue-500 outline-none disabled:opacity-75"
 />
 </div>
 <div>
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted block pb-1">IGST (%)</label>
 <input
 type="number"
 step="0.01"
 min="0"
 max="100"
 required
 disabled={!isAdmin}
 value={igstPercentage}
 onChange={(e) => setIgstPercentage(parseFloat(e.target.value) || 0)}
 className="w-full rounded-lg border border-default bg-surface px-2 py-1.5 text-xs text-right font-mono text-primary focus:border-blue-500 outline-none disabled:opacity-75"
 />
 </div>
 </div>

 <div className="flex items-center gap-2 pt-2">
 <input
 type="checkbox"
 id="gstEnabledByDefault"
 disabled={!isAdmin}
 checked={gstEnabledByDefault}
 onChange={(e) => setGstEnabledByDefault(e.target.checked)}
 className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 border-default cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
 />
 <label htmlFor="gstEnabledByDefault" className="text-xs font-semibold text-secondary dark:text-zinc-300 cursor-pointer disabled:opacity-75">
 GST Billing Enabled by Default
 </label>
 </div>
 </div>

 {isAdmin && (
 <button
 type="submit"
 className="flex w-full items-center justify-center rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-primary hover:bg-emerald-700 outline-none border-none cursor-pointer"
 >
 Save GST Configuration
 </button>
 )}
 </form>
 </div>

 </div>

 {/* SENSITIVE BLOCKS: HIDDEN OR SEVERELY LOCKED FOR NON-ADMINS */}
 {isAdmin ? (
    <div className="space-y-6 lg:col-span-2 h-fit mb-6 animate-in zoom-in-95 duration-200">
      {/* Supabase Connection Settings Card */}
      <div className="rounded-xl border border-default dark:border-default bg-card p-5 shadow-sm space-y-4 transition-colors">
        <div className="flex items-center gap-1.5 border-b border-default pb-3">
          <Server className="h-4 w-4 text-blue-600" />
          <h2 className="font-bold text-primary dark:text-primary text-sm font-sans">Supabase Database Connection</h2>
        </div>

        <div className="rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 space-y-2 text-xs leading-relaxed text-muted dark:text-muted">
          <div className="flex items-start gap-1.5 font-bold text-blue-700 dark:text-blue-400">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Connect to your Supabase Project</span>
          </div>
          <p>
            Connect your Smart Billing System directly to your own Supabase instance.
            Make sure to copy the SQL schema script below and execute it in your Supabase dashboard SQL Editor first.
          </p>
        </div>

        {/* CONNECTION SETTINGS FIELDS */}
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted">
              Supabase Project URL
            </label>
            <input
              type="text"
              placeholder="https://your-project-id.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs focus:border-blue-500 outline-none font-mono text-primary dark:text-gray-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted">
              Supabase Anon Key (API Key)
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs focus:border-blue-500 outline-none font-mono text-primary dark:text-gray-100"
            />
          </div>
        </div>

        {/* ACTION HANDLERS */}
        <div className="flex flex-col gap-2 pt-3 border-t border-default">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={async () => {
                if (!isAdmin) return;
                const updatedConn: ConnectionSettings = {
                  supabaseUrl: supabaseUrl.trim(),
                  supabaseAnonKey: supabaseAnonKey.trim(),
                  isConnected: isConnected,
                  lastSyncTime: connSettings.lastSyncTime || new Date().toLocaleTimeString(),
                  spreadsheetId: "",
                  spreadsheetName: isConnected ? "Supabase Database" : "Not Connected",
                  appsScriptUrl: "",
                  apiKey: "",
                  productsSheetName: "products",
                  customersSheetName: "customers",
                  invoicesSheetName: "invoices",
                  invoiceItemsSheetName: "invoice_items",
                  settingsSheetName: "company_settings",
                  agentsSheetName: "agents"
                };
                SheetsSyncEngine.saveConnectionSettings(updatedConn);
                onShowNotification("✓ Supabase connection parameters saved.", "success");
              }}
              disabled={isSyncing}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-600 bg-blue-600 py-2.5 text-xs font-semibold text-primary hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              <Server className="h-4 w-4" />
              <span>Save Configuration</span>
            </button>
            <button
              onClick={handleTestConnection}
              disabled={isSyncing}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-default dark:border-zinc-700 py-2.5 text-xs font-semibold text-secondary dark:text-gray-200 hover:bg-surface dark:hover:bg-zinc-800 disabled:opacity-50 cursor-pointer bg-card"
            >
              <Check className="h-4 w-4" />
              <span>Test Connection</span>
            </button>
            <button
              onClick={() => {
                if (!isAdmin) return;
                if (!confirm("Are you sure you want to clear the Supabase connection configuration?")) return;
                setSupabaseUrl("");
                setSupabaseAnonKey("");
                setIsConnected(false);
                setSpreadsheetName("Not Connected");
                
                const updatedConn: ConnectionSettings = {
                  supabaseUrl: "",
                  supabaseAnonKey: "",
                  isConnected: false,
                  lastSyncTime: "",
                  spreadsheetId: "",
                  spreadsheetName: "Not Connected",
                  appsScriptUrl: "",
                  apiKey: "",
                  productsSheetName: "products",
                  customersSheetName: "customers",
                  invoicesSheetName: "invoices",
                  invoiceItemsSheetName: "invoice_items",
                  settingsSheetName: "company_settings",
                  agentsSheetName: "agents"
                };
                SheetsSyncEngine.saveConnectionSettings(updatedConn);
                onShowNotification("Connection defaults cleared globally.", "info");
              }}
              disabled={isSyncing}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-900/30 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50 cursor-pointer bg-card"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reset Connection</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <button
              onClick={handleSyncPull}
              disabled={isSyncing || !isConnected}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-primary hover:bg-blue-700 disabled:opacity-50 border-none cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              <span>Force Sync Cache (Pull)</span>
            </button>
            <button
              onClick={copySqlSchema}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 py-2.5 text-xs font-semibold text-primary hover:bg-purple-700 border-none cursor-pointer"
            >
              {copiedCode ? <Check className="h-4 w-4 text-emerald-100" /> : <Copy className="h-4 w-4" />}
              <span>Copy SQL Initialization Schema</span>
            </button>
          </div>
        </div>
      </div>

      {/* SQL Script Viewer */}
      <div className="rounded-xl border border-default dark:border-default bg-card p-5 shadow-sm space-y-3 transition-colors">
        <div className="flex justify-between items-center border-b border-default pb-2">
          <div className="flex items-center gap-1.5">
            <Database className="h-4 w-4 text-purple-600" />
            <h3 className="font-bold text-primary text-sm font-sans">SQL Initialization Schema</h3>
          </div>
        </div>
        <p className="text-[11px] text-muted leading-relaxed font-sans text-left">
          Execute this script in the **SQL Editor** of your Supabase dashboard to set up the necessary database tables and seeding.
        </p>
        <textarea
          readOnly
          value={SQL_SCHEMA}
          className="w-full h-44 font-mono text-[10px] bg-surface border border-default rounded-lg p-2.5 outline-none resize-y text-secondary"
        />
      </div>

      {/* System Administration Tools */}
      <div className="rounded-xl border border-default dark:border-default bg-card p-5 shadow-sm space-y-4 transition-colors">
        <div className="flex items-center gap-1.5 border-b border-default pb-3">
          <Database className="h-4 w-4 text-blue-600" />
          <h3 className="font-bold text-primary text-xs">System Administration</h3>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={handleBackupExportJson}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-default bg-card py-2 text-xs font-medium text-secondary hover:bg-surface cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>JSON Complete Backup</span>
          </button>

          <button
            onClick={handleProductCsvExport}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-default bg-card py-2 text-xs font-medium text-secondary hover:bg-surface cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>CSV Catalog Export</span>
          </button>
        </div>

        <div className="flex flex-col gap-2.5 rounded-xl border border-dashed border-default p-4">
          <div className="flex items-start gap-2 text-[11px] text-muted">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
            <p>Import a JSON file to restore complete database structures or refresh standard session grids.</p>
          </div>
          <div className="flex gap-2">
            <label className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-default bg-card px-3 py-2 text-xs font-semibold text-secondary hover:bg-surface cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              <span>Restore JSON backup</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreBackupJson}
                className="hidden"
              />
            </label>
            <button
              onClick={handleResetDefaults}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-red-200 hover:border-red-300 text-red-600 hover:bg-red-50/55 px-3 py-2 text-xs font-bold bg-transparent cursor-pointer"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
              <span>Reset Demo Logs</span>
            </button>
            <button
              onClick={handleClearLocalData}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-rose-200 hover:border-rose-300 text-rose-600 hover:bg-rose-50/55 px-3 py-2 text-xs font-bold bg-transparent cursor-pointer"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
              <span>Remove Local Data</span>
            </button>
          </div>
        </div>
      </div>


  {/* Performance & Scale Testing Section */}
  <div className="border-t border-default pt-4 mt-4 space-y-3">
    <div className="flex items-center gap-1.5">
      <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
      <h4 className="font-bold text-primary text-xs">Performance &amp; Scale Testing Bench</h4>
    </div>
    <p className="text-[11px] text-muted leading-relaxed font-sans">
      Populate your database with 1,000+ mock invoices distributed across a 12-month period. Bypasses simple checks to support advance payments, referral commissions, multi-operator billing logs, and holiday sales spikes to test the app's performance under extreme usage.
    </p>
    <div className="flex gap-2 pt-1">
      <button
        onClick={handleGenerateMockData}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-default bg-card hover:bg-surface px-3 py-2 text-xs font-semibold text-secondary hover:text-primary cursor-pointer transition"
      >
        <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
        <span>Generate 1-Year Simulation Data</span>
      </button>
      <button
        onClick={handleClearMockData}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-default bg-card hover:bg-surface px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer transition"
      >
        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
        <span>Clear Temporary Mock Invoices</span>
      </button>
    </div>
  </div>

  </div>
  ) : (
 /* LOCK SCREEN ACCORDION PANEL FOR EMPLOYEES & MANAGERS */
 <div className="rounded-xl border border-default dark:border-default bg-card p-8 shadow-sm text-center space-y-4 lg:col-span-2 flex flex-col justify-center items-center transition-colors">
 <Lock className="h-10 w-10 text-amber-600 animate-bounce" />
 <div className="max-w-[340px] space-y-1.5">
 <h3 className="font-bold text-primary dark:text-primary text-sm">Clearance Bound Lockout</h3>
 <p className="text-[11px] text-muted leading-relaxed font-sans">
 Google Sheet synchronization, database migrations, backup configurations and full JSON data registers are managed exclusively by authorized <strong>System Administrators</strong>.
 </p>
 </div>
 </div>
 )}
 </div>
 );
}
