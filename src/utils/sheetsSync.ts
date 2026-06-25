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

import { getTodayStr, isDateInCurrentWeek, getInvoiceDateStr, parseInvoiceDate, getCurrentTimeStr, getThirtyDaysAgoStr } from "./dateUtils";
import { supabase, updateSupabaseClient, getSupabaseConfig } from "./supabaseClient";
import { createClient } from "@supabase/supabase-js";

const TODAY = getTodayStr();

// Professional mock data for immediate out-of-the-box loading
const DEFAULT_EMPLOYEES: Employee[] = [];
const DEFAULT_AGENTS: Agent[] = [];
const DEFAULT_PROMO_CODES: PromoCode[] = [];
const DEFAULT_PRODUCTS: Product[] = [];
const DEFAULT_CUSTOMERS: Customer[] = [];
const DEFAULT_INVOICES: Invoice[] = [];
const DEFAULT_INVOICE_ITEMS: InvoiceItem[] = [];

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
  nextInvoiceNumber: 1001,
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
    mobile: "8919546858",
    role: "Admin",
    status: "Active",
    dateCreated: "2026-06-01",
    lastLogin: TODAY + " 08:30 AM",
    passwordHash: "0192023a7bbd73250516f069df18b500" // MD5 of "admin123"
  }
];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [];
const DEFAULT_ACTIVITIES: UserActivity[] = [];

// ============================================
// DATABASE FIELD MAPPINGS (CAMEL <=> SNAKE)
// ============================================

const mapCompanySettingsFromDb = (row: any): CompanySettings => ({
  companyName: row.company_name,
  shortName: row.short_name,
  address: row.address,
  phone: row.phone,
  email: row.email,
  gstNumber: row.gst_number,
  website: row.website,
  invoiceFooter: row.invoice_footer,
  invoicePrefix: row.invoice_prefix,
  nextInvoiceNumber: Number(row.next_invoice_number) || 1001,
  defaultPrintFormat: row.default_print_format,
  defaultDownloadFormat: row.default_download_format,
  useLogoWatermark: row.use_logo_watermark,
  invoiceTerms: row.invoice_terms,
  companyState: row.company_state,
  companyStateCode: row.company_state_code,
  cgstPercentage: Number(row.cgst_percentage),
  sgstPercentage: Number(row.sgst_percentage),
  igstPercentage: Number(row.igst_percentage),
  gstEnabledByDefault: row.gst_enabled_by_default,
});

const mapCompanySettingsToDb = (s: CompanySettings) => ({
  id: 'SETTINGS_ROW',
  company_name: s.companyName,
  short_name: s.shortName,
  address: s.address,
  phone: s.phone,
  email: s.email,
  gst_number: s.gstNumber,
  website: s.website,
  invoice_footer: s.invoiceFooter,
  invoice_prefix: s.invoicePrefix,
  next_invoice_number: s.nextInvoiceNumber,
  default_print_format: s.defaultPrintFormat,
  default_download_format: s.defaultDownloadFormat,
  use_logo_watermark: s.useLogoWatermark,
  invoice_terms: s.invoiceTerms,
  company_state: s.companyState,
  company_state_code: s.companyStateCode,
  cgst_percentage: s.cgstPercentage,
  sgst_percentage: s.sgstPercentage,
  igst_percentage: s.igstPercentage,
  gst_enabled_by_default: s.gstEnabledByDefault,
});

const mapUserFromDb = (row: any): User => ({
  id: row.id,
  fullName: row.full_name,
  username: row.username,
  email: row.email,
  mobile: row.mobile,
  role: row.role,
  status: row.status,
  dateCreated: row.date_created,
  lastLogin: row.last_login,
  passwordHash: row.password_hash,
});

const mapUserToDb = (u: User) => ({
  id: u.id,
  full_name: u.fullName,
  username: u.username,
  email: u.email,
  mobile: u.mobile,
  role: u.role,
  status: u.status,
  date_created: u.dateCreated,
  last_login: u.lastLogin,
  password_hash: u.passwordHash,
});

const mapProductFromDb = (row: any): Product => ({
  id: row.id,
  name: row.name,
  category: row.category,
  unit: row.unit,
  price: Number(row.price),
  basePrice: row.base_price !== null ? Number(row.base_price) : undefined,
  inventoryType: row.inventory_type,
  variants: row.variants,
  optionGroups: row.option_groups,
  inventoryMode: row.inventory_mode,
  simpleVariants: row.simple_variants,
  colors: row.colors,
  sizes: row.sizes,
  isCombo: row.is_combo,
  comboItems: row.combo_items,
  productOptions: row.product_options,
  trackInventorySeparately: row.track_inventory_separately,
  openingStock: row.opening_stock !== null ? Number(row.opening_stock) : undefined,
  color: row.color,
  material: row.material,
  brand: row.brand,
  vendor: row.vendor,
  purchaseCost: row.purchase_cost !== null ? Number(row.purchase_cost) : undefined,
  sellingPrice: row.selling_price !== null ? Number(row.selling_price) : undefined,
  unitsSold: row.units_sold !== null ? Number(row.units_sold) : undefined,
  revenueGenerated: row.revenue_generated !== null ? Number(row.revenue_generated) : undefined,
  lastSoldDate: row.last_sold_date,
  stockAvailable: row.stock_available !== null ? Number(row.stock_available) : undefined,
  productionTime: row.production_time,
  notes: row.notes,
  sku: row.sku,
  warranty: row.warranty,
  size: row.size,
  weight: row.weight,
  imageUrl: row.image_url,
  status: row.status,
  isArchived: row.is_archived,
  hsnCode: row.hsn_code,
  isSoftDeleted: row.is_soft_deleted,
});

const mapProductToDb = (p: Product) => ({
  id: p.id,
  name: p.name,
  category: p.category ?? null,
  unit: p.unit ?? null,
  price: p.price,
  base_price: p.basePrice ?? null,
  inventory_type: p.inventoryType ?? null,
  variants: p.variants ?? [],
  option_groups: p.optionGroups ?? [],
  inventory_mode: p.inventoryMode ?? 'simple',
  simple_variants: p.simpleVariants ?? [],
  colors: p.colors ?? [],
  sizes: p.sizes ?? [],
  is_combo: p.isCombo ?? false,
  combo_items: p.comboItems ?? [],
  product_options: p.productOptions ?? [],
  track_inventory_separately: p.trackInventorySeparately ?? false,
  opening_stock: p.openingStock ?? 0,
  color: p.color ?? null,
  material: p.material ?? null,
  brand: p.brand ?? null,
  vendor: p.vendor ?? null,
  purchase_cost: p.purchaseCost ?? null,
  selling_price: p.sellingPrice ?? null,
  units_sold: p.unitsSold ?? 0,
  revenue_generated: p.revenueGenerated ?? 0,
  last_sold_date: p.lastSoldDate ?? null,
  stock_available: p.stockAvailable ?? 0,
  production_time: p.productionTime ?? null,
  notes: p.notes ?? null,
  sku: p.sku ?? null,
  warranty: p.warranty ?? null,
  size: p.size ?? null,
  weight: p.weight ?? null,
  image_url: p.imageUrl ?? null,
  status: p.status ?? 'Active',
  is_archived: p.isArchived ?? false,
  hsn_code: p.hsnCode ?? null,
  is_soft_deleted: p.isSoftDeleted ?? false,
});

const mapCustomerFromDb = (row: any): Customer => ({
  id: row.id,
  name: row.name,
  mobile: row.mobile,
  address: row.address,
  secondaryPhone: row.secondary_phone,
  secondaryContactName: row.secondary_contact_name,
  notes: row.notes,
  currentAddress: row.current_address,
  addressHistory: row.address_history,
  isSoftDeleted: row.is_soft_deleted,
});

const mapCustomerToDb = (c: Customer) => ({
  id: c.id,
  name: c.name,
  mobile: c.mobile,
  address: c.address,
  secondary_phone: c.secondaryPhone ?? null,
  secondary_contact_name: c.secondaryContactName ?? null,
  notes: c.notes ?? null,
  current_address: c.currentAddress ?? null,
  address_history: c.addressHistory ?? [],
  is_soft_deleted: c.isSoftDeleted ?? false,
});

const mapInvoiceFromDb = (row: any): Invoice => ({
  invoiceId: row.invoice_id,
  invoiceNo: row.invoice_no,
  invoiceCategory: row.invoice_category,
  date: row.date,
  invoiceDate: row.invoice_date,
  invoiceTime: row.invoice_time,
  createdTimestamp: row.created_timestamp,
  customerName: row.customer_name,
  mobile: row.mobile,
  customerPrimaryPhone: row.customer_primary_phone,
  itemCount: Number(row.item_count),
  subtotal: Number(row.subtotal),
  discount: Number(row.discount),
  roAdjustment: row.ro_adjustment !== null ? Number(row.ro_adjustment) : undefined,
  grandTotal: Number(row.grand_total),
  status: row.status,
  assignedEmployee: row.assigned_employee,
  expectedDeliveryDate: row.expected_delivery_date,
  deliveryDate: row.delivery_date,
  deliveryNotes: row.delivery_notes,
  autoNo: row.auto_no,
  driverName: row.driver_name,
  createdBy: row.created_by,
  createdDate: row.created_date,
  createdTime: row.created_time,
  lastEditedBy: row.last_edited_by,
  lastEditedDate: row.last_edited_date,
  lastEditedTime: row.last_edited_time,
  lastEditedTimestamp: row.last_edited_timestamp,
  isSoftDeleted: row.is_soft_deleted,
  agentId: row.agent_id,
  agentName: row.agent_name,
  referralAgentId: row.referral_agent_id,
  referralAgentName: row.referral_agent_name,
  referralAgentCategory: row.referral_agent_category,
  referralAgentType: row.referral_agent_type,
  grossAmount: row.gross_amount !== null ? Number(row.gross_amount) : undefined,
  promoCode: row.promo_code,
  promoDiscountAmount: row.promo_discount_amount !== null ? Number(row.promo_discount_amount) : undefined,
  cancellationPercentage: row.cancellation_percentage !== null ? Number(row.cancellation_percentage) : undefined,
  cancellationDeduction: row.cancellation_deduction !== null ? Number(row.cancellation_deduction) : undefined,
  refundAmount: row.refund_amount !== null ? Number(row.refund_amount) : undefined,
  companyRetainedAmount: row.company_retained_amount !== null ? Number(row.company_retained_amount) : undefined,
  deletedBy: row.deleted_by,
  deletedDate: row.deleted_date,
  gstEnabled: row.gst_enabled,
  gstType: row.gst_type,
  customerGstNo: row.customer_gst_no,
  customerBusinessName: row.customer_business_name,
  customerBusinessAddress: row.customer_business_address,
  customerState: row.customer_state,
  customerStateCode: row.customer_state_code,
  cgstPercentage: row.cgst_percentage !== null ? Number(row.cgst_percentage) : undefined,
  sgstPercentage: row.sgst_percentage !== null ? Number(row.sgst_percentage) : undefined,
  igstPercentage: row.igst_percentage !== null ? Number(row.igst_percentage) : undefined,
  cgstAmount: row.cgst_amount !== null ? Number(row.cgst_amount) : undefined,
  sgstAmount: row.sgst_amount !== null ? Number(row.sgst_amount) : undefined,
  igstAmount: row.igst_amount !== null ? Number(row.igst_amount) : undefined,
  taxAmount: row.tax_amount !== null ? Number(row.tax_amount) : undefined,
  paymentType: row.payment_type,
  paymentStatus: row.payment_status,
  amountPaid: row.amount_paid !== null ? Number(row.amount_paid) : undefined,
  balanceDue: row.balance_due !== null ? Number(row.balance_due) : undefined,
  balanceCollectionStatus: row.balance_collection_status,
  customerSecondaryPhone: row.customer_secondary_phone,
  customerSecondaryContactName: row.customer_secondary_contact_name,
  notes: row.notes,
  clientNotes: row.client_notes,
  orderNotes: row.order_notes,
});

const mapInvoiceToDb = (inv: Invoice) => ({
  invoice_id: inv.invoiceId || inv.invoiceNo,
  invoice_no: inv.invoiceNo,
  invoice_category: inv.invoiceCategory ?? null,
  date: inv.date,
  invoice_date: inv.invoiceDate ?? null,
  invoice_time: inv.invoiceTime ?? null,
  customer_name: inv.customerName,
  mobile: inv.mobile,
  customer_primary_phone: inv.customerPrimaryPhone ?? null,
  item_count: inv.itemCount,
  subtotal: inv.subtotal,
  discount: inv.discount,
  ro_adjustment: inv.roAdjustment ?? 0,
  grand_total: inv.grandTotal,
  status: inv.status,
  assigned_employee: inv.assignedEmployee ?? null,
  expected_delivery_date: inv.expectedDeliveryDate ?? null,
  delivery_date: inv.deliveryDate ?? null,
  delivery_notes: inv.deliveryNotes ?? null,
  auto_no: inv.autoNo ?? null,
  driver_name: inv.driverName ?? null,
  created_by: inv.createdBy,
  created_date: inv.createdDate,
  created_time: inv.createdTime,
  last_edited_by: inv.lastEditedBy ?? null,
  last_edited_date: inv.lastEditedDate ?? null,
  last_edited_time: inv.lastEditedTime ?? null,
  last_edited_timestamp: inv.lastEditedTimestamp ?? null,
  is_soft_deleted: inv.isSoftDeleted ?? false,
  agent_id: inv.agentId ?? null,
  agent_name: inv.agentName ?? null,
  referral_agent_id: inv.referralAgentId ?? null,
  referral_agent_name: inv.referralAgentName ?? null,
  referral_agent_category: inv.referralAgentCategory ?? null,
  referral_agent_type: inv.referralAgentType ?? null,
  gross_amount: inv.grossAmount ?? 0,
  promo_code: inv.promoCode ?? null,
  promo_discount_amount: inv.promoDiscountAmount ?? 0,
  cancellation_percentage: inv.cancellationPercentage ?? 0,
  cancellation_deduction: inv.cancellationDeduction ?? 0,
  refund_amount: inv.refundAmount ?? 0,
  company_retained_amount: inv.companyRetainedAmount ?? 0,
  deleted_by: inv.deletedBy ?? null,
  deleted_date: inv.deletedDate ?? null,
  gst_enabled: inv.gstEnabled ?? false,
  gst_type: inv.gstType ?? null,
  customer_gst_no: inv.customerGstNo ?? null,
  customer_business_name: inv.customerBusinessName ?? null,
  customer_business_address: inv.customerBusinessAddress ?? null,
  customer_state: inv.customerState ?? null,
  customer_state_code: inv.customerStateCode ?? null,
  cgst_percentage: inv.cgstPercentage ?? 0,
  sgst_percentage: inv.sgstPercentage ?? 0,
  igst_percentage: inv.igstPercentage ?? 0,
  cgst_amount: inv.cgstAmount ?? 0,
  sgst_amount: inv.sgstAmount ?? 0,
  igst_amount: inv.igstAmount ?? 0,
  tax_amount: inv.taxAmount ?? 0,
  payment_type: inv.paymentType ?? null,
  payment_status: inv.paymentStatus ?? null,
  amount_paid: inv.amountPaid ?? 0,
  balance_due: inv.balanceDue ?? 0,
  balance_collection_status: inv.balanceCollectionStatus ?? null,
  customer_secondary_phone: inv.customerSecondaryPhone ?? null,
  customer_secondary_contact_name: inv.customerSecondaryContactName ?? null,
  notes: inv.notes ?? null,
  client_notes: inv.clientNotes ?? null,
  order_notes: inv.orderNotes ?? null,
});

const mapInvoiceItemFromDb = (row: any): InvoiceItem => ({
  invoiceId: row.invoice_id,
  invoiceNo: row.invoice_no,
  productId: row.product_id,
  productName: row.product_name,
  displayName: row.display_name,
  storeName: row.store_name,
  variant: row.variant,
  quantity: Number(row.quantity),
  unitPrice: Number(row.unit_price),
  amount: Number(row.amount),
  selectedColor: row.selected_color,
  selectedSize: row.selected_size,
  hsnCode: row.hsn_code,
  hierarchyNodeId: row.hierarchy_node_id,
  skuId: row.sku_id,
  hierarchyPath: row.hierarchy_path,
  skuCode: row.sku_code,
  selectedOptions: row.selected_options,
  isCombo: row.is_combo,
  comboItems: row.combo_items,
});

const mapInvoiceItemToDb = (item: InvoiceItem) => ({
  invoice_id: item.invoiceId || item.invoiceNo,
  invoice_no: item.invoiceNo,
  product_id: item.productId,
  product_name: item.productName,
  display_name: item.displayName ?? null,
  store_name: item.storeName ?? null,
  variant: item.variant ?? null,
  quantity: item.quantity,
  unit_price: item.unitPrice,
  amount: item.amount,
  selected_color: item.selectedColor ?? null,
  selected_size: item.selectedSize ?? null,
  hsn_code: item.hsnCode ?? null,
  hierarchy_node_id: item.hierarchyNodeId ?? null,
  sku_id: item.skuId ?? null,
  hierarchy_path: item.hierarchyPath ?? null,
  sku_code: item.skuCode ?? null,
  selected_options: item.selectedOptions ?? {},
  is_combo: item.isCombo ?? false,
  combo_items: item.comboItems ?? [],
});

const mapPaymentTransactionFromDb = (row: any): PaymentTransaction => ({
  id: row.id,
  invoiceId: row.invoice_id,
  invoiceNo: row.invoice_no,
  date: row.date,
  time: row.time,
  amount: Number(row.amount),
  collectedBy: row.collected_by,
  notes: row.notes,
});

const mapPaymentTransactionToDb = (t: PaymentTransaction) => ({
  id: t.id,
  invoice_id: t.invoiceId ?? null,
  invoice_no: t.invoiceNo,
  date: t.date,
  time: t.time,
  amount: t.amount,
  collected_by: t.collectedBy,
  notes: t.notes ?? null,
});

const mapAgentFromDb = (row: any): Agent => ({
  id: row.id,
  name: row.name,
  mobile: row.mobile,
  email: row.email,
  agentType: row.agent_type,
  commissionPercentage: Number(row.commission_percentage),
  status: row.status,
  notes: row.notes,
  createdDate: row.created_date,
  isSoftDeleted: row.is_soft_deleted,
});

const mapAgentToDb = (a: Agent) => ({
  id: a.id,
  name: a.name,
  mobile: a.mobile,
  email: a.email ?? null,
  agent_type: a.agentType,
  commission_percentage: a.commissionPercentage,
  status: a.status,
  notes: a.notes ?? null,
  created_date: a.createdDate ?? null,
  is_soft_deleted: a.isSoftDeleted ?? false,
});

const mapPromoCodeFromDb = (row: any): PromoCode => ({
  promoCode: row.promo_code,
  description: row.description,
  discountType: row.discount_type,
  percentageDiscount: row.percentage_discount !== null ? Number(row.percentage_discount) : undefined,
  fixedDiscount: row.fixed_discount !== null ? Number(row.fixed_discount) : undefined,
  startDate: row.start_date,
  endDate: row.end_date,
  maximumUsage: Number(row.maximum_usage),
  usageCount: Number(row.usage_count),
  activeStatus: row.active_status,
  isSoftDeleted: row.is_soft_deleted,
});

const mapPromoCodeToDb = (p: PromoCode) => ({
  promo_code: p.promoCode,
  description: p.description ?? null,
  discount_type: p.discountType,
  percentage_discount: p.percentageDiscount ?? null,
  fixed_discount: p.fixedDiscount ?? null,
  start_date: p.startDate ?? null,
  end_date: p.endDate ?? null,
  maximum_usage: p.maximumUsage ?? 0,
  usage_count: p.usageCount ?? 0,
  active_status: p.activeStatus ?? 'Active',
  is_soft_deleted: p.isSoftDeleted ?? false,
});

const mapUserActivityFromDb = (row: any): UserActivity => ({
  id: row.id,
  username: row.username,
  loginDate: row.login_date,
  loginTime: row.login_time,
  logoutTime: row.logout_time,
  sessionDuration: row.session_duration,
  deviceType: row.device_type,
  browser: row.browser,
  ipAddress: row.ip_address,
  activeSeconds: Number(row.active_seconds),
  latitude: row.latitude ? Number(row.latitude) : undefined,
  longitude: row.longitude ? Number(row.longitude) : undefined,
  locationName: row.location_name || undefined,
  os: row.os || undefined,
  lastActiveAt: row.last_active_at || undefined,
});

const mapUserActivityToDb = (ua: UserActivity) => ({
  id: ua.id,
  username: ua.username,
  login_date: ua.loginDate ?? null,
  login_time: ua.loginTime ?? null,
  logout_time: ua.logoutTime ?? null,
  session_duration: ua.sessionDuration ?? null,
  device_type: ua.deviceType ?? null,
  browser: ua.browser ?? null,
  ip_address: ua.ipAddress ?? null,
  active_seconds: ua.activeSeconds ?? 0,
  latitude: ua.latitude ?? null,
  longitude: ua.longitude ?? null,
  location_name: ua.locationName ?? null,
  os: ua.os ?? null,
  last_active_at: ua.lastActiveAt ?? null,
});

const mapAuditLogFromDb = (row: any): AuditLog => ({
  id: row.id,
  actionType: row.action_type,
  userName: row.user_name,
  date: row.date,
  time: row.time,
  previousValue: row.previous_value,
  newValue: row.newValue,
});

const mapAuditLogToDb = (al: AuditLog) => ({
  id: al.id,
  action_type: al.actionType,
  user_name: al.userName,
  date: al.date ?? null,
  time: al.time ?? null,
  previous_value: al.previousValue ?? null,
  newValue: al.newValue ?? null,
});

const mapEmployeeFromDb = (row: any): Employee => ({
  id: row.id,
  fullName: row.full_name,
  role: row.role,
  email: row.email,
  mobile: row.mobile,
  status: row.status,
});

const mapEmployeeToDb = (emp: Employee) => ({
  id: emp.id,
  full_name: emp.fullName,
  role: emp.role ?? null,
  email: emp.email ?? null,
  mobile: emp.mobile ?? null,
  status: emp.status ?? 'Active',
});

const mapDraftInvoiceFromDb = (row: any): any => {
  const rawLineItems = row.line_items || [];
  const metaItem = rawLineItems.find((item: any) => item && item.isDraftMeta);
  const cleanLineItems = rawLineItems.filter((item: any) => !item || !item.isDraftMeta);

  return {
    id: row.id,
    createdDate: row.created_date,
    customerName: row.customer_name,
    mobileNumber: row.mobile_number,
    customerState: row.customer_state,
    lineItems: cleanLineItems,
    gstType: row.gst_type,
    gstEnabled: row.gst_enabled,
    promoCodeInput: row.promo_code_input,
    assignedEmployee: row.assigned_employee,
    referralAgentId: row.referral_agent_id,
    referralAgentName: row.referral_agent_name,
    paymentType: row.payment_type,
    amountReceivedInput: row.amount_received_input,
    deliveryNotes: row.delivery_notes,
    notes: row.notes,
    draftAmount: Number(row.draft_amount),
    
    // Unpack meta
    discount: metaItem?.discount ?? 0,
    discountType: metaItem?.discountType ?? 'value',
    roAdjustment: metaItem?.roAdjustment ?? 0,
    isNewCustomer: metaItem?.isNewCustomer ?? false,
    address: metaItem?.address ?? '',
    secondaryPhone: metaItem?.secondaryPhone ?? '',
    secondaryContactName: metaItem?.secondaryContactName ?? '',
    customerGstNo: metaItem?.customerGstNo ?? '',
    customerBusinessName: metaItem?.customerBusinessName ?? '',
    customerBusinessAddress: metaItem?.customerBusinessAddress ?? '',
    customerStateCode: metaItem?.customerStateCode ?? '',
    customerSelectionMode: metaItem?.customerSelectionMode ?? 'existing',
    expectedDeliveryDate: metaItem?.expectedDeliveryDate ?? '',
    autoNo: metaItem?.autoNo ?? '',
    driverName: metaItem?.driverName ?? '',
  };
};

const mapDraftInvoiceToDb = (draft: any) => {
  const metaItem = {
    isDraftMeta: true,
    discount: draft.discount,
    discountType: draft.discountType,
    roAdjustment: draft.roAdjustment,
    isNewCustomer: draft.isNewCustomer,
    address: draft.address,
    secondaryPhone: draft.secondaryPhone,
    secondaryContactName: draft.secondaryContactName,
    customerGstNo: draft.customerGstNo,
    customerBusinessName: draft.customerBusinessName,
    customerBusinessAddress: draft.customerBusinessAddress,
    customerStateCode: draft.customerStateCode,
    customerSelectionMode: draft.customerSelectionMode,
    expectedDeliveryDate: draft.expectedDeliveryDate,
    autoNo: draft.autoNo,
    driverName: draft.driverName,
  };

  const lineItems = draft.lineItems ?? [];
  const lineItemsWithMeta = [...lineItems, metaItem];

  return {
    id: draft.id,
    created_date: draft.createdDate ?? null,
    customer_name: draft.customerName ?? null,
    mobile_number: draft.mobileNumber ?? null,
    customer_state: draft.customerState ?? null,
    line_items: lineItemsWithMeta,
    gst_type: draft.gstType ?? null,
    gst_enabled: draft.gstEnabled ?? false,
    promo_code_input: draft.promoCodeInput ?? null,
    assigned_employee: draft.assignedEmployee ?? null,
    referral_agent_id: draft.referralAgentId ?? null,
    referral_agent_name: draft.referralAgentName ?? null,
    payment_type: draft.paymentType ?? null,
    amount_received_input: draft.amountReceivedInput ?? null,
    delivery_notes: draft.deliveryNotes ?? null,
    notes: draft.notes ?? null,
    draft_amount: draft.draftAmount ?? 0,
  };
};


// ============================================
// ENGINE IMPLEMENTATION
// ============================================

export class SheetsSyncEngine {
  public static isSyncingDown = false;
  public static isSyncingInProgress = false;
  public static hasPendingSyncRequest = false;
  public static backgroundSyncTimeout: any = null;
  public static hasSyncedDownThisSession = false;

  private static syncStatus: "idle" | "syncing" | "success" | "error" = "idle";
  private static lastSyncError: string | null = null;
  private static syncStatusListeners: ((status: "idle" | "syncing" | "success" | "error", error: string | null) => void)[] = [];
  public static realtimeListeners: (() => void)[] = [];
  
  private static memoryCache: { [key: string]: any } = {};
  private static activeSubscription: any = null;

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

  public static registerRealtimeListener(cb: () => void) {
    this.realtimeListeners.push(cb);
    return () => {
      this.realtimeListeners = this.realtimeListeners.filter(l => l !== cb);
    };
  }

  // Preload cache from Supabase
  public static async preloadCache(): Promise<void> {
    this.updateSyncStatus("syncing");
    
    // Check if Supabase client is initialized
    if (!supabase) {
      // Load local credentials config if saved
      const config = this.getConnectionSettings();
      if (config.supabaseUrl && config.supabaseAnonKey) {
        updateSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
      }
    }

    if (!supabase) {
      console.warn("[SyncEngine] Supabase is not configured yet. Using default mock datasets.");
      this.loadDefaultsIntoCache();
      this.updateSyncStatus("idle");
      return;
    }

    console.log("[SyncEngine] Preloading cache from Supabase...");
    try {
      // Purge audit logs and operator activities older than 30 days to optimize database space
      try {
        const thresholdDateStr = getThirtyDaysAgoStr();
        console.log(`[SyncEngine] Purging audit logs & operator activities older than 30 days (${thresholdDateStr})...`);
        await Promise.all([
          supabase.from("audit_logs").delete().lt("date", thresholdDateStr),
          supabase.from("user_activities").delete().lt("login_date", thresholdDateStr)
        ]);
      } catch (purgeErr) {
        console.error("[SyncEngine] Failed to purge old audits/activities from Supabase:", purgeErr);
      }

      await Promise.all([
        this.reloadTable("company_settings"),
        this.reloadTable("users"),
        this.reloadTable("products"),
        this.reloadTable("customers"),
        this.reloadTable("invoices"),
        this.reloadTable("invoice_items"),
        this.reloadTable("payment_transactions"),
        this.reloadTable("agents"),
        this.reloadTable("promo_codes"),
        this.reloadTable("user_activities"),
        this.reloadTable("audit_logs"),
        this.reloadTable("employees"),
        this.reloadTable("draft_invoices")
      ]);

      // Seed admin user locally if no users exist in database
      const usersList = this.memoryCache["billing_user_registry"] || [];
      if (usersList.length === 0) {
        this.memoryCache["billing_user_registry"] = DEFAULT_USERS;
        await supabase.from("users").insert(DEFAULT_USERS.map(mapUserToDb));
      }

      // Run auto purge for expired trash if currentUser is Superadmin
      try {
        await this.runAutoPurgeTrash();
      } catch (purgeErr) {
        console.error("[SyncEngine] Failed to run trash auto-purge:", purgeErr);
      }

      this.hasSyncedDownThisSession = true;
      this.updateSyncStatus("success");
      this.subscribeToRealtime();
    } catch (e: any) {
      console.error("[SyncEngine] Failed to preload cache:", e);
      this.updateSyncStatus("error", e.message || "Failed to fetch from Supabase");
      this.loadDefaultsIntoCache();
    }
  }

  private static loadDefaultsIntoCache(): void {
    this.memoryCache["billing_products"] = DEFAULT_PRODUCTS;
    this.memoryCache["billing_customers"] = DEFAULT_CUSTOMERS;
    this.memoryCache["billing_invoices"] = DEFAULT_INVOICES;
    this.memoryCache["billing_invoice_items"] = DEFAULT_INVOICE_ITEMS;
    this.memoryCache["billing_agents_registry"] = DEFAULT_AGENTS;
    this.memoryCache["billing_company_settings"] = DEFAULT_COMPANY_SETTINGS;
    this.memoryCache["billing_user_registry"] = DEFAULT_USERS;
    this.memoryCache["billing_payment_transactions"] = [];
    this.memoryCache["billing_promo_codes"] = DEFAULT_PROMO_CODES;
    this.memoryCache["billing_user_activities"] = DEFAULT_ACTIVITIES;
    this.memoryCache["billing_audit_logs"] = DEFAULT_AUDIT_LOGS;
    this.memoryCache["billing_employees_registry"] = DEFAULT_EMPLOYEES;
    this.memoryCache["billing_drafts"] = [];
    this.memoryCache["billing_cancellation_rules"] = {
      "Draft": 100,
      "Work In Progress": 80,
      "Ready for Delivery": 60,
      "Ready For Delivery": 60,
      "Delivered": 0,
      "Completed": 0
    };
  }

  // Reload single table into cache
  public static async reloadTable(table: string): Promise<void> {
    if (!supabase) return;
    
    switch (table) {
      case "company_settings": {
        const { data, error } = await supabase.from("company_settings").select("*");
        if (error) throw error;
        if (data && data.length > 0) {
          this.memoryCache["billing_company_settings"] = mapCompanySettingsFromDb(data[0]);
          if (data[0].cancellation_rules) {
            this.memoryCache["billing_cancellation_rules"] = data[0].cancellation_rules;
          }
        } else {
          this.memoryCache["billing_company_settings"] = DEFAULT_COMPANY_SETTINGS;
        }
        break;
      }
      case "users": {
        const { data, error } = await supabase.from("users").select("*");
        if (error) throw error;
        this.memoryCache["billing_user_registry"] = data ? data.map(mapUserFromDb) : [];
        break;
      }
      case "products": {
        const { data, error } = await supabase.from("products").select("*");
        if (error) throw error;
        this.memoryCache["billing_products"] = data ? data.map(mapProductFromDb) : [];
        break;
      }
      case "customers": {
        const { data, error } = await supabase.from("customers").select("*");
        if (error) throw error;
        this.memoryCache["billing_customers"] = data ? data.map(mapCustomerFromDb) : [];
        break;
      }
      case "invoices": {
        const { data, error } = await supabase.from("invoices").select("*");
        if (error) throw error;
        this.memoryCache["billing_invoices"] = data ? data.map(mapInvoiceFromDb) : [];
        break;
      }
      case "invoice_items": {
        const { data, error } = await supabase.from("invoice_items").select("*");
        if (error) throw error;
        this.memoryCache["billing_invoice_items"] = data ? data.map(mapInvoiceItemFromDb) : [];
        break;
      }
      case "payment_transactions": {
        const { data, error } = await supabase.from("payment_transactions").select("*");
        if (error) throw error;
        this.memoryCache["billing_payment_transactions"] = data ? data.map(mapPaymentTransactionFromDb) : [];
        break;
      }
      case "agents": {
        const { data, error } = await supabase.from("agents").select("*");
        if (error) throw error;
        this.memoryCache["billing_agents_registry"] = data ? data.map(mapAgentFromDb) : [];
        break;
      }
      case "promo_codes": {
        const { data, error } = await supabase.from("promo_codes").select("*");
        if (error) throw error;
        this.memoryCache["billing_promo_codes"] = data ? data.map(mapPromoCodeFromDb) : [];
        break;
      }
      case "user_activities": {
        const { data, error } = await supabase.from("user_activities").select("*");
        if (error) throw error;
        this.memoryCache["billing_user_activities"] = data ? data.map(mapUserActivityFromDb) : [];
        break;
      }
      case "audit_logs": {
        const { data, error } = await supabase.from("audit_logs").select("*");
        if (error) throw error;
        this.memoryCache["billing_audit_logs"] = data ? data.map(mapAuditLogFromDb) : [];
        break;
      }
      case "employees": {
        const { data, error } = await supabase.from("employees").select("*");
        if (error) throw error;
        this.memoryCache["billing_employees_registry"] = data ? data.map(mapEmployeeFromDb) : [];
        break;
      }
      case "draft_invoices": {
        const { data, error } = await supabase.from("draft_invoices").select("*");
        if (error) throw error;
        this.memoryCache["billing_drafts"] = data ? data.map(mapDraftInvoiceFromDb) : [];
        break;
      }
    }
  }

  // Subscribe to Postgres database realtime updates
  public static subscribeToRealtime(): void {
    if (this.activeSubscription) {
      this.activeSubscription.unsubscribe();
      this.activeSubscription = null;
    }
    
    if (!supabase) return;
    
    const handleRealtimeChange = async (payload: any) => {
      const { table } = payload;
      console.log(`[Realtime Sync] Table "${table}" changed on database. Refreshing cache...`);
      try {
        await this.reloadTable(table);
        // Dispatch UI update trigger
        this.realtimeListeners.forEach(cb => {
          try { cb(); } catch (e) {}
        });
      } catch (err) {
        console.warn(`[Realtime Sync] Failed to hot-reload table "${table}":`, err);
      }
    };

    this.activeSubscription = supabase
      .channel("supabase-realtime-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public"
        },
        (payload) => {
          handleRealtimeChange(payload);
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime Sync] WebSockets subscription connection status: ${status}`);
      });
  }

  private static getStorageItem<T>(key: string, defaultValue: T): T {
    if (this.memoryCache[key] !== undefined) {
      return this.memoryCache[key] as T;
    }
    return defaultValue;
  }

  private static setStorageItem<T>(key: string, value: T): void {
    this.memoryCache[key] = value;
  }

  // Active Session User tracking
  public static getCurrentUser(): User | null {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("billing_current_user");
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch (e) {}
      }
    }
    return null;
  }

  public static setCurrentUser(user: User | null): void {
    if (typeof window !== "undefined") {
      if (user) {
        localStorage.setItem("billing_current_user", JSON.stringify(user));
        localStorage.setItem("billing_session_last_active", Date.now().toString());
      } else {
        localStorage.removeItem("billing_current_user");
        localStorage.removeItem("billing_session_last_active");
      }
    }
  }

  // General Products Catalog
  public static getProducts(): Product[] {
    const raw = this.getStorageItem<Product[]>("billing_products", DEFAULT_PRODUCTS);
    return this.validateAndRepairProductTree(raw);
  }

  public static saveProducts(products: Product[], isSyncPull = false): void {
    const validated = this.validateAndRepairProductTree(products);
    this.setStorageItem("billing_products", validated);
    
    if (supabase && !isSyncPull) {
      const dbRows = validated.map(mapProductToDb);
      supabase.from("products").upsert(dbRows).then(({ error }) => {
        if (error) console.error("Error upserting products to Supabase:", error);
      });
    }
  }

  // Option Groups persistence
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

  public static validateAndRepairProductTree(products: Product[]): Product[] {
    if (!products || !Array.isArray(products)) return [];

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

  // Customers Registry
  public static getCustomers(): Customer[] {
    return this.getStorageItem<Customer[]>("billing_customers", DEFAULT_CUSTOMERS);
  }

  public static saveCustomers(customers: Customer[], isSyncPull = false): void {
    this.setStorageItem("billing_customers", customers);
    
    if (supabase && !isSyncPull) {
      const dbRows = customers.map(mapCustomerToDb);
      supabase.from("customers").upsert(dbRows).then(({ error }) => {
        if (error) console.error("Error upserting customers to Supabase:", error);
      });
    }
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

  // Invoices & Invoice Items
  public static getInvoices(): Invoice[] {
    return this.getStorageItem<Invoice[]>("billing_invoices", DEFAULT_INVOICES);
  }

  public static saveInvoices(invoices: Invoice[], isUserAction: boolean = false, isSyncPull = false): void {
    this.setStorageItem("billing_invoices", invoices);

    if (supabase && !isSyncPull) {
      const dbRows = invoices.map(mapInvoiceToDb);
      supabase.from("invoices").upsert(dbRows).then(({ error }) => {
        if (error) console.error("Error upserting invoices to Supabase:", error);
      });
    }
  }

  public static getInvoiceItems(): InvoiceItem[] {
    return this.getStorageItem<InvoiceItem[]>("billing_invoice_items", DEFAULT_INVOICE_ITEMS);
  }

  public static saveInvoiceItems(items: InvoiceItem[], isSyncPull = false): void {
    this.setStorageItem("billing_invoice_items", items);

    if (supabase && !isSyncPull) {
      const dbRows = items.map(mapInvoiceItemToDb);
      supabase.from("invoice_items").upsert(dbRows).then(({ error }) => {
        if (error) console.error("Error upserting invoice items to Supabase:", error);
      });
    }
  }

  public static getPaymentTransactions(): PaymentTransaction[] {
    return this.getStorageItem<PaymentTransaction[]>("billing_payment_transactions", []);
  }

  public static savePaymentTransactions(txns: PaymentTransaction[], isSyncPull = false): void {
    this.setStorageItem("billing_payment_transactions", txns);

    if (supabase && !isSyncPull) {
      const dbRows = txns.map(mapPaymentTransactionToDb);
      supabase.from("payment_transactions").upsert(dbRows).then(({ error }) => {
        if (error) console.error("Error upserting payment transactions to Supabase:", error);
      });
    }
  }

  // Connections and Configuration
  public static getConnectionSettings(): ConnectionSettings {
    const defaultSettings: ConnectionSettings = {
      supabaseUrl: "https://xzfrbhtrcjtaafjkonbo.supabase.co",
      supabaseAnonKey: "sb_publishable_6hdjwsq0hLbulI0k2LiZjA_d9ItftE0",
      isConnected: true,
      lastSyncTime: "",
      // Keep legacy properties matching interface to prevent compile errors
      spreadsheetId: "",
      spreadsheetName: "Supabase Database",
      appsScriptUrl: "",
      apiKey: "",
      productsSheetName: "products",
      customersSheetName: "customers",
      invoicesSheetName: "invoices",
      invoiceItemsSheetName: "invoice_items",
      settingsSheetName: "company_settings",
      agentsSheetName: "agents"
    };
    
    if (typeof window !== "undefined") {
      const url = localStorage.getItem("VITE_SUPABASE_URL") || "https://xzfrbhtrcjtaafjkonbo.supabase.co";
      const key = localStorage.getItem("VITE_SUPABASE_ANON_KEY") || "sb_publishable_6hdjwsq0hLbulI0k2LiZjA_d9ItftE0";
      const isConnected = !!(url && key);
      return {
        supabaseUrl: url,
        supabaseAnonKey: key,
        isConnected,
        lastSyncTime: localStorage.getItem("billing_last_sync_time") || "",
        // Legacy stubs
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
    }
    return defaultSettings;
  }

  public static saveConnectionSettings(settings: ConnectionSettings): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("VITE_SUPABASE_URL", settings.supabaseUrl);
      localStorage.setItem("VITE_SUPABASE_ANON_KEY", settings.supabaseAnonKey);
      localStorage.setItem("billing_last_sync_time", new Date().toLocaleTimeString());
      
      const newClient = updateSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
      if (newClient) {
        this.preloadCache();
      }
    }
  }

  public static getCompanySettings(): CompanySettings {
    return this.getStorageItem<CompanySettings>("billing_company_settings", DEFAULT_COMPANY_SETTINGS);
  }

  public static saveCompanySettings(settings: CompanySettings, isSyncPull = false): void {
    this.setStorageItem("billing_company_settings", settings);

    if (supabase && !isSyncPull) {
      const dbRow = mapCompanySettingsToDb(settings);
      // Attach cancellation rules
      (dbRow as any).cancellation_rules = this.getCancellationRules();
      supabase.from("company_settings").upsert(dbRow).then(({ error }) => {
        if (error) console.error("Error upserting company settings to Supabase:", error);
      });
    }
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

    if (supabase) {
      const dbRow = mapDraftInvoiceToDb(draft);
      supabase.from("draft_invoices").upsert(dbRow).then(({ error }) => {
        if (error) console.error("Error upserting draft invoice to Supabase:", error);
      });
    }
  }

  public static deleteDraft(id: string): void {
    let drafts = this.getDrafts();
    drafts = drafts.filter(d => d.id !== id);
    this.saveDrafts(drafts);

    if (supabase) {
      supabase.from("draft_invoices").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("Error deleting draft invoice from Supabase:", error);
      });
    }
  }

  // Users registry
  public static getUsers(): User[] {
    return this.getStorageItem<User[]>("billing_user_registry", DEFAULT_USERS);
  }

  public static saveUsers(users: User[]): void {
    this.setStorageItem("billing_user_registry", users);
    
    if (supabase) {
      const dbRows = users.map(mapUserToDb);
      supabase.from("users").upsert(dbRows).then(({ error }) => {
        if (error) console.error("Error upserting users to Supabase:", error);
      });
    }
  }

  // Employees registry
  public static getEmployees(): Employee[] {
    return this.getStorageItem<Employee[]>("billing_employees_registry", DEFAULT_EMPLOYEES);
  }

  public static saveEmployees(employees: Employee[]): void {
    this.setStorageItem("billing_employees_registry", employees);

    if (supabase) {
      const dbRows = employees.map(mapEmployeeToDb);
      supabase.from("employees").upsert(dbRows).then(({ error }) => {
        if (error) console.error("Error upserting employees to Supabase:", error);
      });
    }
  }

  // Agents registry
  public static getAgents(): Agent[] {
    return this.getStorageItem<Agent[]>("billing_agents_registry", DEFAULT_AGENTS);
  }

  public static saveAgents(agents: Agent[], isSyncPull = false): void {
    this.setStorageItem("billing_agents_registry", agents);

    if (supabase && !isSyncPull) {
      const dbRows = agents.map(mapAgentToDb);
      supabase.from("agents").upsert(dbRows).then(({ error }) => {
        if (error) console.error("Error upserting agents to Supabase:", error);
      });
    }
  }

  // Promo Codes module
  public static getPromoCodes(): PromoCode[] {
    return this.getStorageItem<PromoCode[]>("billing_promo_codes", DEFAULT_PROMO_CODES);
  }

  public static savePromoCodes(promos: PromoCode[], isSyncPull = false): void {
    this.setStorageItem("billing_promo_codes", promos);

    if (supabase && !isSyncPull) {
      const dbRows = promos.map(mapPromoCodeToDb);
      supabase.from("promo_codes").upsert(dbRows).then(({ error }) => {
        if (error) console.error("Error upserting promo codes to Supabase:", error);
      });
    }
  }

  // Cancellation Rules
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
    if (supabase) {
      supabase.from("company_settings").update({ cancellation_rules: rules }).eq("id", "SETTINGS_ROW").then(({ error }) => {
        if (error) console.error("Error updating cancellation rules in Supabase:", error);
      });
    }
  }

  // Audit Logs
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
    logs.unshift(newLog);
    const thresholdDateStr = getThirtyDaysAgoStr();
    const cleanLogs = logs.filter(log => (log.date || "") >= thresholdDateStr);
    this.memoryCache["billing_audit_logs"] = cleanLogs;
    
    if (supabase) {
      supabase.from("audit_logs").insert(mapAuditLogToDb(newLog)).then(({ error }) => {
        if (error) console.error("Error inserting audit log to Supabase:", error);
      });
    }
  }

  public static async clearAuditLogs(): Promise<void> {
    this.memoryCache["billing_audit_logs"] = [];
    this.saveAuditLogs([]);
    
    if (supabase) {
      this.updateSyncStatus("syncing");
      try {
        const { error } = await supabase.from("audit_logs").delete().neq("id", "root");
        if (error) throw error;
        this.updateSyncStatus("success");
      } catch (err: any) {
        console.error("[SyncEngine] Failed to clear audit logs in Supabase:", err);
        this.updateSyncStatus("error", err.message || "Failed to clear audits");
        throw err;
      }
    }
    
    // Add a single audit log entry recording that the trail was purged
    this.addAuditLog("Purge Audit Ledger", "Superadmin", "Audit logs cleared from database.", "Success");
  }

  // User Sessions Activity
  public static getUserActivities(): UserActivity[] {
    return this.getStorageItem<UserActivity[]>("billing_user_activities", DEFAULT_ACTIVITIES);
  }

  public static saveUserActivities(activities: UserActivity[]): void {
    this.setStorageItem("billing_user_activities", activities);
  }

  public static recordLoginActivity(username: string): string {
    const list = this.getUserActivities();
    const actId = `ACT-${Date.now()}`;
    const now = new Date();
    const loginTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
    const thresholdDateStr = getThirtyDaysAgoStr();
    const cleanList = list.filter(act => (act.loginDate || "") >= thresholdDateStr);
    this.memoryCache["billing_user_activities"] = cleanList;
    
    if (supabase) {
      supabase.from("user_activities").insert(mapUserActivityToDb(newActivity)).then(({ error }) => {
        if (error) console.error("Error inserting login activity to Supabase:", error);
      });
    }
    
    return actId;
  }

  public static recordLogoutActivity(activityId: string): void {
    const list = this.getUserActivities();
    const idx = list.findIndex(a => a.id === activityId);
    if (idx !== -1) {
      const act = list[idx];
      const now = new Date();
      const logoutTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      act.logoutTime = logoutTime;

      const loginDateToken = new Date(`${act.loginDate} ${act.loginTime}`);
      const secondsDiff = Math.max(60, Math.floor((now.getTime() - loginDateToken.getTime()) / 1000));
      act.activeSeconds = secondsDiff;

      const hrs = Math.floor(secondsDiff / 3600);
      const mins = Math.floor((secondsDiff % 3600) / 60);
      act.sessionDuration = `${act.activeSeconds >= 3600 ? hrs + 'h ' : ''}${mins}m`;
      list[idx] = act;
      this.memoryCache["billing_user_activities"] = list;

      if (supabase) {
        supabase.from("user_activities").update(mapUserActivityToDb(act)).eq("id", activityId).then(({ error }) => {
          if (error) console.error("Error updating logout activity in Supabase:", error);
        });
      }
    }
  }

  public static async updateActivityDetails(
    activityId: string,
    ip: string,
    locationName: string,
    lat: number | null,
    lon: number | null,
    os: string
  ): Promise<void> {
    const list = this.getUserActivities();
    const idx = list.findIndex(a => a.id === activityId);
    if (idx !== -1) {
      list[idx].ipAddress = ip;
      list[idx].locationName = locationName;
      list[idx].latitude = lat ?? undefined;
      list[idx].longitude = lon ?? undefined;
      list[idx].os = os;
      list[idx].lastActiveAt = new Date().toISOString();
      this.memoryCache["billing_user_activities"] = list;

      if (supabase) {
        try {
          const payload = mapUserActivityToDb(list[idx]);
          const { error } = await supabase
            .from("user_activities")
            .update(payload)
            .eq("id", activityId);
          if (error) {
            console.warn("[SyncEngine] Failed to update user activity details in Supabase:", error.message);
          }
        } catch (e) {
          console.warn("[SyncEngine] DB update for activity details failed:", e);
        }
      }
    }
  }

  public static async updateActivityHeartbeat(activityId: string): Promise<void> {
    const list = this.getUserActivities();
    const idx = list.findIndex(a => a.id === activityId);
    const nowStr = new Date().toISOString();
    if (idx !== -1) {
      list[idx].lastActiveAt = nowStr;
      this.memoryCache["billing_user_activities"] = list;

      if (supabase) {
        try {
          const { error } = await supabase
            .from("user_activities")
            .update({ last_active_at: nowStr })
            .eq("id", activityId);
          if (error) {
            console.warn("[SyncEngine] Failed to update activity heartbeat in Supabase:", error.message);
          }
        } catch (e) {
          console.warn("[SyncEngine] DB update for activity heartbeat failed:", e);
        }
      }
    }
  }

  public static logSessionExit(username: string): void {
    const list = this.getUserActivities();
    const activeAct = list.find(a => a.username === username && !a.logoutTime);
    if (activeAct) {
      this.recordLogoutActivity(activeAct.id);
    }
    this.setCurrentUser(null);
  }

  // Dashboard Stats
  public static calculateStats(): DashboardStats {
    const currentUser = this.getCurrentUser();
    const userRole = currentUser?.role || "Employee";
    const userFullName = currentUser?.fullName || "";
    const username = currentUser?.username || "";

    let invoices = this.getInvoices().filter(inv => !inv.isSoftDeleted && inv.status !== "Deleted");

    if (userRole === "Employee") {
      invoices = invoices.filter(
        inv =>
          (inv.assignedEmployee && inv.assignedEmployee.toLowerCase() === userFullName.toLowerCase()) ||
          (inv.createdBy && inv.createdBy.toLowerCase() === username.toLowerCase())
      );
    }

    const items = this.getInvoiceItems();

    let customers = this.getCustomers().filter(c => !c.isSoftDeleted);
    if (userRole === "Employee") {
      const employeeCustomerNames = new Set(invoices.map(inv => inv.customerName.toLowerCase().trim()));
      customers = customers.filter(c => employeeCustomerNames.has(c.name.toLowerCase().trim()));
    }

    const products = this.getProducts();
    const todayStr = getTodayStr();

    const validInvoices = invoices.filter(inv => inv.status !== "Cancelled" && inv.status !== "Draft");
    const todayInvoices = validInvoices.filter((inv) => getInvoiceDateStr(inv.date) === todayStr);
    const weeklyInvoices = validInvoices.filter((inv) => isDateInCurrentWeek(inv.date));

    let weeklySales = 0;
    let todaySales = 0;
    if (userRole === "Admin" || userRole === "Superadmin") {
      todaySales = todayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
      weeklySales = weeklyInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    }

    const wipBillsCount = invoices.filter(i => i.status === "Work In Progress").length;
    const readyBillsCount = invoices.filter(i => i.status === "Ready for Delivery").length;
    const completedBillsCount = invoices.filter(i => i.status === "Completed").length;
    const pendingDeliveriesCount = invoices.filter(i => i.status === "Ready for Delivery" || i.status === "Delivered").length;

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

    let monthlySales: { month: string; sales: number }[] = [];
    if (userRole === "Admin") {
      const monthlyMap: { [m: string]: number } = {};
      validInvoices.forEach((inv) => {
        if (inv.date) {
          const month = inv.date.substring(0, 7);
          monthlyMap[month] = (monthlyMap[month] || 0) + inv.grandTotal;
        }
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
      todaySales,
      todayInvoicesCount: todayInvoices.length,
      weeklySales,
      weeklyInvoicesCount: weeklyInvoices.length,
      totalCustomers: customers.length,
      totalProducts: products.length,
      recentInvoices: invoices.slice(0, 5),
      topProducts: topProducts.length > 0 ? topProducts : [{ name: "No products sold", salesCount: 0, revenue: 0 }],
      monthlySales: monthlySales.length > 0 ? monthlySales : [{ month: "Jun 26", sales: 0 }],
      wipBillsCount,
      readyBillsCount,
      completedBillsCount,
      pendingDeliveriesCount,
      totalGSTCollected,
      totalAmountReceived,
      outstandingBalance
    };
  }

  // Reset to Demo Defaults
  public static resetToDemoDefaults(): void {
    if (!supabase) return;
    this.updateSyncStatus("syncing");
    
    // Perform deletions of everything in Supabase
    Promise.all([
      supabase.from("products").delete().neq("id", "root"),
      supabase.from("customers").delete().neq("id", "root"),
      supabase.from("invoices").delete().neq("invoice_id", "root"),
      supabase.from("payment_transactions").delete().neq("id", "root"),
      supabase.from("agents").delete().neq("id", "root"),
      supabase.from("promo_codes").delete().neq("promo_code", "root"),
      supabase.from("audit_logs").delete().neq("id", "root"),
      supabase.from("user_activities").delete().neq("id", "root"),
      supabase.from("draft_invoices").delete().neq("id", "root"),
      supabase.from("employees").delete().neq("id", "root")
    ]).then(() => {
      this.loadDefaultsIntoCache();
      this.updateSyncStatus("success");
    }).catch(err => {
      console.error("[SyncEngine] Failed to reset data:", err);
      this.updateSyncStatus("error", err.message || "Failed to reset");
    });
  }

  // Clear all database records
  public static clearLocalData(): void {
    this.resetToDemoDefaults();
  }

  // Test Supabase credentials connection (re-uses Apps Script function name to prevent compile errors in SettingsTab)
  public static async testAppsScriptConnection(
    url: string,
    key: string,
    customMapping?: any
  ): Promise<{ success: boolean; message: string; sheetsFound?: { [key: string]: boolean }; spreadsheetName?: string }> {
    try {
      const tempClient = createClient(url.trim(), key.trim());
      // Test select setting table count
      const { error } = await tempClient.from("company_settings").select("id").limit(1);
      
      if (error) {
        if (error.code === "P0001" || error.message.includes("relation") || error.code === "42P01") {
          // Relational error means credential is correct but tables are not created/initialized yet
          return {
            success: true,
            message: "Credentials valid! Please run the SQL schema creation script.",
            spreadsheetName: "Supabase Database (Schema Needed)"
          };
        }
        return { success: false, message: error.message || "Query failed" };
      }
      
      return {
        success: true,
        message: "Connected to Supabase successfully!",
        spreadsheetName: "Supabase Database"
      };
    } catch (e: any) {
      return { success: false, message: e.message || "Network error. Double check project URL." };
    }
  }

  // Legacy Apps Script stubs
  public static async initializeDatabaseViaAppsScript(url: string, companyName: string): Promise<any> {
    return { success: false, message: "Initialize database is handled via copyable SQL scripts in Supabase version." };
  }
  public static async updateDatabaseSchemaViaAppsScript(url: string, spreadsheetId: string): Promise<any> {
    return { success: false, message: "Database schema is updated via the SQL Editor inside the Supabase dashboard." };
  }
  public static async syncDownFromSheets(conn?: ConnectionSettings): Promise<{ success: boolean; message: string }> {
    await this.preloadCache();
    return { success: true, message: "Synced with Supabase successfully." };
  }
  public static async triggerCloudBackup(): Promise<any> {
    return { success: false, message: "Cloud backup is managed automatically by Supabase." };
  }
  public static getLocalBackup(): any | null { return null; }
  public static restoreLocalBackup(): boolean { return false; }

  // Direct sync write operations via pushTransaction
  public static async pushTransaction(
    conn: ConnectionSettings,
    actionType: string,
    payloadData: any
  ): Promise<{ success: boolean; message: string }> {
    if (!supabase) {
      return { success: false, message: "Supabase client is not initialized. Please connect via Settings tab." };
    }

    try {
      switch (actionType) {
        case "createInvoice": {
          const { invoice, items } = payloadData;
          // 1. Upsert invoice
          const dbInvoice = mapInvoiceToDb(invoice);
          const { error: invErr } = await supabase.from("invoices").upsert(dbInvoice);
          if (invErr) throw invErr;
          
          // 2. Delete and insert items (cleans old items in case of edit)
          const { error: delErr } = await supabase.from("invoice_items").delete().eq("invoice_id", invoice.invoiceId || invoice.invoiceNo);
          if (delErr) throw delErr;
          
          const dbItems = items.map(mapInvoiceItemToDb);
          const { error: itemsErr } = await supabase.from("invoice_items").insert(dbItems);
          if (itemsErr) throw itemsErr;
          
          break;
        }
        case "updateInvoiceStatus": {
          const { invoiceId, status } = payloadData;
          const isSoftDeleted = status === "Deleted";
          const { error } = await supabase
            .from("invoices")
            .update({ status, is_soft_deleted: isSoftDeleted })
            .eq("invoice_id", invoiceId);
          if (error) throw error;
          break;
        }
        case "recordPaymentTransaction": {
          const {
            transactionId,
            invoiceId,
            invoiceNo,
            date,
            time,
            amount,
            collectedBy,
            notes,
            newAmountPaid,
            newBalanceDue,
            newPaymentStatus,
            newPaymentType
          } = payloadData;

          // 1. Update invoice paid state
          const { error: invErr } = await supabase
            .from("invoices")
            .update({
              amount_paid: newAmountPaid,
              balance_due: newBalanceDue,
              payment_status: newPaymentStatus,
              payment_type: newPaymentType
            })
            .eq("invoice_id", invoiceId);
          if (invErr) throw invErr;

          // 2. Insert transaction entry
          const txnRow = {
            id: transactionId,
            invoice_id: invoiceId,
            invoice_no: invoiceNo,
            date,
            time,
            amount,
            collected_by: collectedBy,
            notes
          };
          const { error: txnErr } = await supabase.from("payment_transactions").insert(txnRow);
          if (txnErr) throw txnErr;
          
          break;
        }
        case "updateCustomerAddress": {
          const { customerId, address, updatedHistoryJson } = payloadData;
          const { error } = await supabase
            .from("customers")
            .update({
              address,
              current_address: address,
              address_history: JSON.parse(updatedHistoryJson)
            })
            .eq("id", customerId);
          if (error) throw error;
          break;
        }
        case "upsertProduct": {
          const dbRow = mapProductToDb(payloadData);
          const { error } = await supabase.from("products").upsert(dbRow);
          if (error) throw error;
          break;
        }
        case "upsertAgent": {
          const dbRow = mapAgentToDb(payloadData);
          const { error } = await supabase.from("agents").upsert(dbRow);
          if (error) throw error;
          break;
        }
        case "upsertCustomer": {
          const dbRow = mapCustomerToDb(payloadData);
          const { error } = await supabase.from("customers").upsert(dbRow);
          if (error) throw error;
          break;
        }
        case "saveSettings": {
          if (payloadData.cancellationRules) {
            const rules = JSON.parse(payloadData.cancellationRules);
            const { error } = await supabase.from("company_settings").update({ cancellation_rules: rules }).eq("id", "SETTINGS_ROW");
            if (error) throw error;
          } else {
            const dbRow = mapCompanySettingsToDb(payloadData);
            (dbRow as any).cancellation_rules = this.getCancellationRules();
            const { error } = await supabase.from("company_settings").upsert(dbRow);
            if (error) throw error;
          }
          break;
        }
        default:
          console.warn(`[SyncEngine] Unhandled pushTransaction action: ${actionType}`);
      }
      return { success: true, message: "Database synchronized successfully with Supabase." };
    } catch (e: any) {
      console.error(`[SyncEngine] Transaction sync failed for action: ${actionType}:`, e);
      return { success: false, message: e.message || String(e) };
    }
  }

  // Admin Deletion Hijacking Utilities
  public static tagAsAdminDeleted(text: string | undefined | null): string {
    const timestamp = new Date().toISOString();
    const tag = `[AdminDeleted:${timestamp}]`;
    if (!text) return tag;
    if (text.includes("[AdminDeleted:")) {
      return text.replace(/\[AdminDeleted:[^\]]+\]/, tag);
    }
    return `${tag} ${text}`;
  }

  public static isAdminDeleted(text: string | undefined | null): boolean {
    return !!text && text.includes("[AdminDeleted:");
  }

  public static getAdminDeletedTimestamp(text: string | undefined | null): string | null {
    if (!text) return null;
    const match = text.match(/\[AdminDeleted:([^\]]+)\]/);
    return match ? match[1] : null;
  }

  public static stripAdminDeletedTag(text: string | undefined | null): string {
    if (!text) return "";
    return text.replace(/\[AdminDeleted:[^\]]+\]/, "").trim();
  }

  // Auto Purge Retention Logic
  public static async runAutoPurgeTrash(): Promise<void> {
    const currentUser = this.getCurrentUser();
    if (currentUser?.role !== "Superadmin") return;

    if (typeof window === "undefined") return;
    const retentionVal = localStorage.getItem("trash_retention_days");
    if (!retentionVal || retentionVal === "disabled" || retentionVal === "Disabled") {
      return;
    }

    // Parse retention days
    let days = 0;
    if (retentionVal === "1 week") days = 7;
    else if (retentionVal === "2 weeks") days = 14;
    else if (retentionVal === "15 days") days = 15;
    else if (retentionVal === "1 month") days = 30;
    else {
      const parsed = parseInt(retentionVal, 10);
      if (isNaN(parsed) || parsed <= 0) return;
      days = parsed;
    }

    const maxAgeMs = days * 24 * 60 * 60 * 1000;
    const now = Date.now();

    console.log(`[SyncEngine] Running trash auto-purge for Superadmin. Retention: ${days} days (${retentionVal}).`);

    const isExpired = (timestampStr: string | null): boolean => {
      if (!timestampStr) return false;
      try {
        const deletedTime = new Date(timestampStr).getTime();
        return (now - deletedTime) > maxAgeMs;
      } catch (e) {
        return false;
      }
    };

    // 1. Products
    const products = this.getProducts();
    for (const p of products) {
      if (p.isSoftDeleted && this.isAdminDeleted(p.notes)) {
        const ts = this.getAdminDeletedTimestamp(p.notes);
        if (isExpired(ts)) {
          console.log(`[SyncEngine] Auto-purging expired product: ${p.name} (${p.id})`);
          await this.deleteProductPermanently(p.id, true);
        }
      }
    }

    // 2. Customers
    const customers = this.getCustomers();
    for (const c of customers) {
      if (c.isSoftDeleted && this.isAdminDeleted(c.notes)) {
        const ts = this.getAdminDeletedTimestamp(c.notes);
        if (isExpired(ts)) {
          console.log(`[SyncEngine] Auto-purging expired customer: ${c.name} (${c.id})`);
          await this.deleteCustomerPermanently(c.id, true);
        }
      }
    }

    // 3. Agents
    const agents = this.getAgents();
    for (const a of agents) {
      if (a.isSoftDeleted && this.isAdminDeleted(a.notes)) {
        const ts = this.getAdminDeletedTimestamp(a.notes);
        if (isExpired(ts)) {
          console.log(`[SyncEngine] Auto-purging expired agent: ${a.name} (${a.id})`);
          await this.deleteAgentPermanently(a.id, true);
        }
      }
    }

    // 4. Promo Codes
    const promos = this.getPromoCodes();
    for (const p of promos) {
      if (p.isSoftDeleted && this.isAdminDeleted(p.description)) {
        const ts = this.getAdminDeletedTimestamp(p.description);
        if (isExpired(ts)) {
          console.log(`[SyncEngine] Auto-purging expired promo: ${p.promoCode}`);
          await this.deletePromoCodePermanently(p.promoCode, true);
        }
      }
    }

    // 5. Users
    const users = this.getUsers();
    for (const u of users) {
      if (u.status === "Deleted" && this.isAdminDeleted(u.fullName)) {
        const ts = this.getAdminDeletedTimestamp(u.fullName);
        if (isExpired(ts)) {
          console.log(`[SyncEngine] Auto-purging expired user: ${u.fullName} (${u.id})`);
          await this.deleteUserPermanently(u.id, true);
        }
      }
    }

    // 6. Invoices
    const invoices = this.getInvoices();
    for (const inv of invoices) {
      if (inv.isSoftDeleted && this.isAdminDeleted(inv.deletedBy)) {
        const ts = this.getAdminDeletedTimestamp(inv.deletedBy);
        if (isExpired(ts)) {
          console.log(`[SyncEngine] Auto-purging expired invoice: ${inv.invoiceNo}`);
          await this.deleteInvoicePermanently(inv.invoiceId || inv.invoiceNo, true);
        }
      }
    }
  }

  // Permanent Deletion Handlers
  public static async deleteProductPermanently(productId: string, forcePurge = false): Promise<void> {
    const currentUser = this.getCurrentUser();
    const isSuper = currentUser?.role === "Superadmin" || forcePurge;

    if (isSuper) {
      const list = this.getProducts().filter(p => p.id !== productId);
      this.memoryCache["billing_products"] = list;
      if (supabase) {
        const { error } = await supabase.from("products").delete().eq("id", productId);
        if (error) console.error("[SyncEngine] Error deleting product permanently:", error);
      }
    } else {
      const list = this.getProducts();
      const idx = list.findIndex(p => p.id === productId);
      if (idx !== -1) {
        const prod = { ...list[idx] };
        prod.notes = this.tagAsAdminDeleted(prod.notes);
        prod.isSoftDeleted = true;
        list[idx] = prod;
        this.memoryCache["billing_products"] = [...list];
        if (supabase) {
          const { error } = await supabase
            .from("products")
            .update({ notes: prod.notes, is_soft_deleted: true })
            .eq("id", productId);
          if (error) console.error("[SyncEngine] Error hijacking product delete:", error);
        }
      }
    }
  }

  public static async deleteUserPermanently(userId: string, forcePurge = false): Promise<void> {
    const currentUser = this.getCurrentUser();
    const isSuper = currentUser?.role === "Superadmin" || forcePurge;

    if (isSuper) {
      const list = this.getUsers().filter(u => u.id !== userId);
      this.memoryCache["billing_user_registry"] = list;
      if (supabase) {
        const { error } = await supabase.from("users").delete().eq("id", userId);
        if (error) console.error("[SyncEngine] Error deleting user permanently:", error);
      }
    } else {
      const list = this.getUsers();
      const idx = list.findIndex(u => u.id === userId);
      if (idx !== -1) {
        const user = { ...list[idx] };
        user.fullName = this.tagAsAdminDeleted(user.fullName);
        user.status = "Deleted";
        list[idx] = user;
        this.memoryCache["billing_user_registry"] = [...list];
        if (supabase) {
          const { error } = await supabase
            .from("users")
            .update({ full_name: user.fullName, status: "Deleted" })
            .eq("id", userId);
          if (error) console.error("[SyncEngine] Error hijacking user delete:", error);
        }
      }
    }
  }

  public static async deletePromoCodePermanently(code: string, forcePurge = false): Promise<void> {
    const currentUser = this.getCurrentUser();
    const isSuper = currentUser?.role === "Superadmin" || forcePurge;

    if (isSuper) {
      const list = this.getPromoCodes().filter(p => p.promoCode !== code);
      this.memoryCache["billing_promo_codes"] = list;
      if (supabase) {
        const { error } = await supabase.from("promo_codes").delete().eq("promo_code", code);
        if (error) console.error("[SyncEngine] Error deleting promo code permanently:", error);
      }
    } else {
      const list = this.getPromoCodes();
      const idx = list.findIndex(p => p.promoCode === code);
      if (idx !== -1) {
        const promo = { ...list[idx] };
        promo.description = this.tagAsAdminDeleted(promo.description);
        promo.isSoftDeleted = true;
        list[idx] = promo;
        this.memoryCache["billing_promo_codes"] = [...list];
        if (supabase) {
          const { error } = await supabase
            .from("promo_codes")
            .update({ description: promo.description, is_soft_deleted: true })
            .eq("promo_code", code);
          if (error) console.error("[SyncEngine] Error hijacking promo delete:", error);
        }
      }
    }
  }

  public static async deleteAgentPermanently(agentId: string, forcePurge = false): Promise<void> {
    const currentUser = this.getCurrentUser();
    const isSuper = currentUser?.role === "Superadmin" || forcePurge;

    if (isSuper) {
      const list = this.getAgents().filter(a => a.id !== agentId);
      this.memoryCache["billing_agents_registry"] = list;
      if (supabase) {
        const { error } = await supabase.from("agents").delete().eq("id", agentId);
        if (error) console.error("[SyncEngine] Error deleting agent permanently:", error);
      }
    } else {
      const list = this.getAgents();
      const idx = list.findIndex(a => a.id === agentId);
      if (idx !== -1) {
        const agent = { ...list[idx] };
        agent.notes = this.tagAsAdminDeleted(agent.notes);
        agent.isSoftDeleted = true;
        list[idx] = agent;
        this.memoryCache["billing_agents_registry"] = [...list];
        if (supabase) {
          const { error } = await supabase
            .from("agents")
            .update({ notes: agent.notes, is_soft_deleted: true })
            .eq("id", agentId);
          if (error) console.error("[SyncEngine] Error hijacking agent delete:", error);
        }
      }
    }
  }

  public static async deleteCustomerPermanently(customerId: string, forcePurge = false): Promise<void> {
    const currentUser = this.getCurrentUser();
    const isSuper = currentUser?.role === "Superadmin" || forcePurge;

    if (isSuper) {
      const list = this.getCustomers().filter(c => c.id !== customerId);
      this.memoryCache["billing_customers"] = list;
      this.setStorageItem("billing_customers", list);
      if (supabase) {
        const { error } = await supabase.from("customers").delete().eq("id", customerId);
        if (error) console.error("[SyncEngine] Error deleting customer permanently:", error);
      }
    } else {
      const list = this.getCustomers();
      const idx = list.findIndex(c => c.id === customerId);
      if (idx !== -1) {
        const cust = { ...list[idx] };
        cust.notes = this.tagAsAdminDeleted(cust.notes);
        cust.isSoftDeleted = true;
        list[idx] = cust;
        this.memoryCache["billing_customers"] = [...list];
        this.setStorageItem("billing_customers", [...list]);
        if (supabase) {
          const { error } = await supabase
            .from("customers")
            .update({ notes: cust.notes, is_soft_deleted: true })
            .eq("id", customerId);
          if (error) console.error("[SyncEngine] Error hijacking customer delete:", error);
        }
      }
    }
  }

  public static async deleteInvoicePermanently(invoiceId: string, forcePurge = false): Promise<void> {
    const currentUser = this.getCurrentUser();
    const isSuper = currentUser?.role === "Superadmin" || forcePurge;

    if (isSuper) {
      const invoices = this.getInvoices().filter(inv => inv.invoiceId !== invoiceId && inv.invoiceNo !== invoiceId);
      this.memoryCache["billing_invoices"] = invoices;

      const items = this.getInvoiceItems().filter(item => item.invoiceId !== invoiceId && item.invoiceNo !== invoiceId);
      this.memoryCache["billing_invoice_items"] = items;

      const txns = this.getPaymentTransactions().filter(t => t.invoiceId !== invoiceId && t.invoiceNo !== invoiceId);
      this.memoryCache["billing_payment_transactions"] = txns;

      if (supabase) {
        // 1. Delete transactions
        await supabase.from("payment_transactions").delete().eq("invoice_id", invoiceId);
        // 2. Delete invoice (cascades to invoice_items via DB schema)
        const { error } = await supabase.from("invoices").delete().eq("invoice_id", invoiceId);
        if (error) console.error("[SyncEngine] Error deleting invoice permanently:", error);
      }
    } else {
      const list = this.getInvoices();
      const idx = list.findIndex(inv => inv.invoiceId === invoiceId || inv.invoiceNo === invoiceId);
      if (idx !== -1) {
        const inv = { ...list[idx] };
        const userTag = currentUser?.username || "admin";
        inv.deletedBy = this.tagAsAdminDeleted(inv.deletedBy || userTag);
        inv.isSoftDeleted = true;
        list[idx] = inv;
        this.memoryCache["billing_invoices"] = [...list];
        if (supabase) {
          const { error } = await supabase
            .from("invoices")
            .update({ deleted_by: inv.deletedBy, is_soft_deleted: true })
            .eq("invoice_id", invoiceId);
          if (error) console.error("[SyncEngine] Error hijacking invoice delete:", error);
        }
      }
    }
  }

  public static async clearAllTrashOfType(type: "products" | "invoices" | "agents" | "customers" | "users" | "promo_codes"): Promise<void> {
    if (type === "products") {
      const deletedProds = this.getProducts().filter(p => p.isSoftDeleted);
      for (const p of deletedProds) {
        await this.deleteProductPermanently(p.id);
      }
    } else if (type === "agents") {
      const deletedAgents = this.getAgents().filter(a => a.isSoftDeleted);
      for (const a of deletedAgents) {
        await this.deleteAgentPermanently(a.id);
      }
    } else if (type === "invoices") {
      const deletedInvs = this.getInvoices().filter(i => i.isSoftDeleted);
      for (const inv of deletedInvs) {
        await this.deleteInvoicePermanently(inv.invoiceId || inv.invoiceNo);
      }
    } else if (type === "customers") {
      const deletedCusts = this.getCustomers().filter(c => c.isSoftDeleted);
      for (const c of deletedCusts) {
        await this.deleteCustomerPermanently(c.id);
      }
    } else if (type === "users") {
      const deletedUsers = this.getUsers().filter(u => u.status === "Deleted");
      for (const u of deletedUsers) {
        await this.deleteUserPermanently(u.id);
      }
    } else if (type === "promo_codes") {
      const deletedPromos = this.getPromoCodes().filter(p => p.isSoftDeleted);
      for (const p of deletedPromos) {
        await this.deletePromoCodePermanently(p.promoCode);
      }
    }
  }

  // Terminal ID helper
  public static getTerminalId(): string {
    if (typeof window !== "undefined") {
      let tid = localStorage.getItem("billing_terminal_id");
      if (!tid) {
        tid = `T${Math.floor(10 + Math.random() * 90)}`;
        localStorage.setItem("billing_terminal_id", tid);
      }
      return tid;
    }
    return "T01";
  }

  public static saveTerminalId(id: string): void {
    const sanitized = String(id || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (typeof window !== "undefined") {
      localStorage.setItem("billing_terminal_id", sanitized);
    }
  }
}
