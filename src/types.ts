export type InventoryType = "Stock Item" | "Made To Order" | "Service";

export interface ColorVariant {
  color: string;
  stock: number;
  unitsSold?: number;
  revenueGenerated?: number;
}

export interface SimpleVariant {
  id: string;
  name: string;
  price: number;
  stock?: number;
}

export interface InventorySKU {
  skuId: string;
  hierarchyNodeId: string;
  skuCode?: string;
  color?: string;
  size?: string;
  material?: string;
  price: number;
  stock: number;
  vendor?: string;
  barcode?: string;
  status?: "Active" | "Inactive";
  unitsSold?: number;
  revenueGenerated?: number;
  hsnCode?: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  hsnCode: string;
}

export interface ProductOptionValue {
  id?: string;
  name?: string;
  value?: string;           // Legacy
  priceModifier?: number;   // Legacy
  priceAdjustment?: number; 
}

export interface ProductOptionGroup {
  id: string;
  name: string;
  values: ProductOptionValue[];
}

export interface ProductOption {
  id: string;
  name: string;
  values: ProductOptionValue[];
}

export interface ProductSize {
  name: string;
  price: number;
}

export interface Product {
  id: string; // E.g., 'PROD-1001'
  name: string;
  category: string;
  unit: string;
  price: number; // Base Price
  basePrice?: number;
  inventoryType?: InventoryType;

  // Modern Architecture Fields
  variants?: ProductVariant[];
  optionGroups?: ProductOptionGroup[];
  inventoryMode?: "simple" | "advanced";

  // Zero Complexity Architecture
  simpleVariants?: SimpleVariant[];
  colors?: string[];
  sizes?: ProductSize[];

  // Combo Architecture
  isCombo?: boolean;
  comboItems?: {
    productId: string;
    variantId: string;
    productName?: string;
    variantName?: string;
    quantity: number;
  }[];

  // Legacy/Other Options
  productOptions?: ProductOption[];
  trackInventorySeparately?: boolean;
  openingStock?: number;

  color?: string;
  material?: string;
  brand?: string;
  vendor?: string;
  purchaseCost?: number;
  sellingPrice?: number;
  unitsSold?: number;
  revenueGenerated?: number;
  lastSoldDate?: string;
  stockAvailable?: number; // Kept for overall stock when not tracked separately.
  productionTime?: string;
  notes?: string;
  sku?: string;
  warranty?: string;
  size?: string;
  weight?: string;
  imageUrl?: string;
  colorVariants?: ColorVariant[]; // Legacy
  variantsEnabled?: boolean; // Legacy
  status?: "Active" | "Archived";
  isArchived?: boolean;
  
  // Tree Hierarchy Fields (Legacy)
  parentId?: string | null;
  level?: number;
  nodeType?: string;
  isLeaf?: boolean;
  hierarchyPath?: string;
  attributes?: { name: string; values: string[] }[];
  barcode?: string;
  selectedOptions?: Record<string, string>;
  hsnCode?: string;

  // New SKUs list
  inventorySkus?: InventorySKU[];
}

export interface AddressHistoryRecord {
  id: string;
  address: string;
  oldAddress: string;
  newAddress: string;
  createdDate: string; // Changed On
  createdBy: string;   // Changed By
  reason: string;
  customerId: string;
  status: "Active" | "Old";
}

export interface Customer {
  id: string; // E.g., 'CUST-1001'
  name: string;
  mobile: string;
  address: string;
  secondaryPhone?: string;
  secondaryContactName?: string;
  notes?: string;
  currentAddress?: string;
  addressHistory?: AddressHistoryRecord[];
}

export type InvoiceStatus =
  | "Draft"
  | "Work In Progress"
  | "Ready for Delivery"
  | "Ready For Delivery"
  | "Delivered"
  | "Completed"
  | "Cancelled"
  | "Deleted";

export interface Invoice {
  invoiceId?: string; // Internal reference ID (e.g. INV-001)
  invoiceCategory?: string; // 'GST' or 'NON_GST'
  invoiceNo: string; // E.g., 'INV-1001'
  date: string; // Legacy date string
  invoiceDate?: string; 
  invoiceTime?: string; 
  createdTimestamp?: string;
  customerName: string;
  mobile: string;
  customerPrimaryPhone?: string;
  itemCount: number;
  subtotal: number;
  discount: number;
  roAdjustment?: number;
  grandTotal: number;

  // New Workflow & Delivery Tracking Fields
  status: InvoiceStatus;
  assignedEmployee?: string;
  expectedDeliveryDate?: string;
  deliveryDate?: string;
  deliveryNotes?: string;
  autoNo?: string;
  driverName?: string;

  // ownership tracking
  createdBy: string;
  createdDate: string;
  createdTime: string;
  lastEditedBy?: string;
  lastEditedDate?: string;
  lastEditedTime?: string;
  lastEditedTimestamp?: string;
  isSoftDeleted?: boolean;

  // New Agent / Employee tracking
  agentId?: string;
  agentName?: string;
  referralAgentId?: string;
  referralAgentName?: string;
  referralAgentCategory?: string;
  referralAgentType?: string;

  // Advanced financial tracking
  grossAmount?: number;
  promoCode?: string;
  promoDiscountAmount?: number;
  cancellationPercentage?: number;
  cancellationDeduction?: number;
  refundAmount?: number;
  companyRetainedAmount?: number;

  // Admin deletion records
  deletedBy?: string;
  deletedDate?: string;

  // GST Management fields
  gstEnabled?: boolean;
  gstType?: "CGST_SGST" | "IGST" | "Non-GST" | "No GST" | "Within State GST" | "Out-of-State GST";
  customerGstNo?: string;
  customerBusinessName?: string;
  customerBusinessAddress?: string;
  customerState?: string;
  customerStateCode?: string;
  cgstPercentage?: number;
  sgstPercentage?: number;
  igstPercentage?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  taxAmount?: number;

  // Payment Collection fields
  paymentType?: "Full Payment" | "Advance Payment";
  paymentStatus?: "Paid" | "Partially Paid" | "Balance Pending";
  amountPaid?: number;
  balanceDue?: number;
  balanceCollectionStatus?: "Pending" | "Follow-up" | "Collected";

  // Additional customer contact fields stored on invoice for PDF/Print
  customerSecondaryPhone?: string;
  customerSecondaryContactName?: string;
  notes?: string;
  clientNotes?: string;
  orderNotes?: string;
}

export interface InvoiceItem {
  invoiceId?: string;
  variant?: string;
  invoiceNo: string;
  productId: string;
  productName: string;
  displayName?: string;
  storeName?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  selectedColor?: string;
  selectedSize?: string;
  hsnCode?: string;

  // New SKU Fields
  hierarchyNodeId?: string;
  skuId?: string;
  hierarchyPath?: string;
  skuCode?: string;
  selectedOptions?: Record<string, string>;

  // Combo Billing Fields
  isCombo?: boolean;
  comboItems?: {
    id?: string;
    productId: string;
    variantId?: string;
    productName: string;
    variantName?: string;
    quantity: number;
  }[];
}

export interface ConnectionSettings {
  spreadsheetId: string;
  spreadsheetName: string;
  appsScriptUrl: string;
  apiKey: string;
  isConnected: boolean;
  lastSyncTime: string;
  // Sheet mapping names
  productsSheetName: string;
  customersSheetName: string;
  invoicesSheetName: string;
  invoiceItemsSheetName: string;
  settingsSheetName: string;
  agentsSheetName: string;
  paymentTransactionsSheetName?: string;
}

export interface PaymentTransaction {
  id: string; // Transaction ID
  invoiceId?: string;
  invoiceNo: string;
  date: string; // Format: YYYY-MM-DD
  time: string; // Format: HH:MM AM/PM
  amount: number;
  collectedBy: string;
  notes?: string;
}

export interface CompanySettings {
  companyName: string;
  shortName?: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  website?: string;
  invoiceFooter?: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  defaultPrintFormat?: "Receipt" | "A5" | "A4";
  defaultDownloadFormat?: "Receipt" | "A5" | "A4";
  useLogoWatermark?: boolean;
  invoiceTerms?: string;

  // GST Configuration
  companyState?: string;
  companyStateCode?: string;
  cgstPercentage?: number;
  sgstPercentage?: number;
  igstPercentage?: number;
  gstEnabledByDefault?: boolean;
}

export interface DashboardStats {
  todaySales: number;
  todayInvoicesCount: number;
  weeklySales: number;
  weeklyInvoicesCount: number;
  totalCustomers: number;
  totalProducts: number;
  recentInvoices: Invoice[];
  topProducts: { name: string; salesCount: number; revenue: number }[];
  monthlySales: { month: string; sales: number }[];
  // New metrics
  pendingDeliveriesCount: number;
  wipBillsCount: number;
  readyBillsCount: number;
  completedBillsCount: number;
  totalGSTCollected: number;
  totalAmountReceived: number;
  outstandingBalance: number;
}

export interface MessageFeedback {
  type: "success" | "error" | "info";
  text: string;
}

// Security, RBAC & Log interfaces
export type UserRole = "Admin" | "Manager" | "Employee";

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  mobile: string;
  role: UserRole;
  status: "Active" | "Disabled";
  dateCreated: string;
  lastLogin?: string;
  passwordHash: string; // Text storage for simulated offline engine
}

export interface UserActivity {
  id: string;
  username: string;
  loginDate: string;
  loginTime: string;
  logoutTime?: string;
  sessionDuration?: string; // Formatted E.g., "01h 12m"
  deviceType: string;
  browser: string;
  ipAddress: string;
  activeSeconds: number; // for calculation
}

export interface AuditLog {
  id: string;
  actionType: string; // 'Bill Created' | 'Bill Edited' | 'Bill Deleted' | etc.
  userName: string;
  date: string;
  time: string;
  previousValue: string;
  newValue: string;
}

export interface Employee {
  id: string; // E.g., 'EMP-1001'
  fullName: string;
  role: string;
  email: string;
  mobile: string;
  status: "Active" | "Disabled";
}

export interface PromoCode {
  promoCode: string; // E.g. 'SUMMER20'
  description: string;
  discountType: "Percentage" | "Fixed";
  percentageDiscount?: number;
  fixedDiscount?: number;
  startDate: string;
  endDate: string;
  maximumUsage: number;
  usageCount: number;
  activeStatus: "Active" | "Disabled";
}

export type AgentType =
  | "Employee Agent"
  | "Referral Partner"
  | "Marketing Agent"
  | "Channel Partner"
  | "Freelancer"
  | "External Agent"
  | "Other";

export type AgentStatus = "Active" | "Inactive" | "Suspended";

export interface Agent {
  id: string; // E.g., 'AGT-001'
  name: string;
  mobile: string;
  email: string;
  agentType: AgentType;
  commissionPercentage: number;
  status: AgentStatus;
  notes: string;
  createdDate: string;
}

export interface DraftInvoice {
  id: string;
  createdDate: string;
  customerName: string;
  mobileNumber: string;
  customerState: string;
  lineItems: InvoiceItem[];
  gstType: "Within State GST" | "Out-of-State GST" | "No GST";
  gstEnabled: boolean;
  promoCodeInput: string;
  assignedEmployee: string;
  referralAgentId: string;
  referralAgentName: string;
  paymentType: "Full Payment" | "Advance Payment";
  amountReceivedInput: string;
  deliveryNotes: string;
  notes: string;
  draftAmount: number; // to display summary
}

