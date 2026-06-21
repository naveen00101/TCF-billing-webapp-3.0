import React, { useState, useMemo, useEffect } from"react";
import { 
 TrendingUp, 
 Search, 
 Calendar, 
 IndianRupee, 
 Percent, 
 RotateCcw, 
 Building, 
 ShieldCheck, 
 FileSpreadsheet,
 Coins,
 ChevronRight,
 ChevronLeft,
 X,
 ArrowDownToLine,
 ChevronUp,
 ChevronDown,
 Users,
 Package,
 Award,
 Filter,
 Layers,
 HelpCircle,
 FileText,
 Clock,
 Printer,
 Compass,
 ArrowUpRight,
 ShieldAlert
} from"lucide-react";
import { jsPDF } from"jspdf";
import { 
 ResponsiveContainer as RechartsResponsiveContainer, 
 BarChart, 
 Bar, 
 XAxis, 
 YAxis, 
 CartesianGrid, 
 Tooltip, 
 Legend,
 LineChart,
 Line,
 AreaChart,
 Area,
 PieChart,
 Pie,
 Cell
} from"recharts";
import { Invoice, InvoiceStatus, Customer, Product, InvoiceItem } from"../types";
import { formatIndianCurrencyShort } from"../utils/currencyUtils";
import { AnalyticsPreferenceService } from"../utils/analyticsPreferenceService";
import { 
 getTodayStr, 
 isDateInCurrentWeek, 
 isDateInCurrentMonth, 
 isDateInCurrentYear, 
 getInvoiceDateStr, 
 formatDisplayDate, 
 formatDisplayDateTime 
} from"../utils/dateUtils";
import { formatInTimeZone, toDate } from"date-fns-tz";

interface RevenueAnalyticsTabProps {
 invoices: Invoice[];
 onShowNotification: (text: string, type:"success" |"error" |"info") => void;
 onRefresh: () => void;
 customers?: Customer[];
 products?: Product[];
 invoiceItems?: InvoiceItem[];
 userRole?: string;
 onNavigateToTab?: (tab: string, filter?: string, extraState?: any) => void;
 initiallySelectedModule?: string | null;
 onClearSelectedModule?: () => void;
}

type DatePreset ="Today" |"This Week" |"This Month" |"6 Months" |"This Year" |"All Time";
type AnalyticsModule = 
 |"Gross Revenue" 
 |"GST Collected" 
 |"Amount Received" 
 |"Outstanding Balance" 
 |"Discounts" 
 |"Refunds" 
 |"Corporate Retained" 
 |"Net Revenue" 
 |"Revenue Distribution"
 |"Customer Analytics"
 |"Product Analytics"
 |"Weekly Bills"
 |"Pending Deliveries"
 |"Work In Progress"
 |"Ready For Delivery"
 |"Completed Cycles"
 | null;

const ResponsiveContainer = ({ children, ...props }: any) => {
 const [dim, setDim] = useState({ w: 0, h: 0 });
 const ref = React.useRef<HTMLDivElement>(null);
 useEffect(() => {
 if (!ref.current) return;
 const ob = new ResizeObserver((entries) => {
 if (entries[0]) {
 setDim({ w: entries[0].contentRect.width, h: entries[0].contentRect.height });
 }
 });
 ob.observe(ref.current);
 return () => ob.disconnect();
 }, []);
 return (
 <div ref={ref} style={{ width: '100%', height: '100%' }}>
 {dim.w > 0 && dim.h > 0 ? (
 <RechartsResponsiveContainer {...props}>{children}</RechartsResponsiveContainer>
 ) : (
 <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
 Loading chart...
 </div>
 )}
 </div>
 );
};

const CustomChartTooltip = ({ active, payload, label }: any) => {
 if (active && payload && payload.length) {
 const data = payload[0].payload;
 const dateLabel = data?.tooltipDate || label ||"Unknown Date";
 const count = data?.count || 0;
 
 return (
 <div className="bg-card border border-default p-3 rounded-lg shadow-lg text-xs leading-normal">
 <p className="font-semibold text-primary dark:text-zinc-50 font-sans mb-1">
 Date: <span className="font-mono">{dateLabel}</span>
 </p>
 <p className="text-muted dark:text-muted font-sans">
 Invoices: <span className="font-mono font-bold text-secondary dark:text-zinc-200">{count}</span>
 </p>
 {payload.map((entry: any, i: number) => {
 const valAsNum = Number(entry.value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
 return (
 <p key={i} className="text-muted dark:text-muted font-sans mt-0.5">
 {entry.name ||"Value"}: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">₹{valAsNum}</span>
 </p>
 );
 })}
 </div>
 );
 }
 return null;
};

export default function RevenueAnalyticsTab({ 
 invoices, 
 onShowNotification, 
 onRefresh,
 customers = [],
 products = [],
 invoiceItems = [],
 userRole ="Admin",
 onNavigateToTab,
 initiallySelectedModule,
 onClearSelectedModule
}: RevenueAnalyticsTabProps) {
 if (userRole !=="Admin") {
 return (
 <div className="flex h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50/50 p-8 text-center dark:border-red-900/30 dark:bg-red-950/20">
 <ShieldAlert className="h-12 w-12 text-red-500 mb-4 opacity-80" />
 <h2 className="text-lg font-bold text-red-700 dark:text-red-400">Access Denied</h2>
 <p className="mt-2 text-sm text-red-600 dark:text-red-300 max-w-sm font-medium">
 Revenue Analytics is restricted to Administrators.
 </p>
 </div>
 );
 }

 // Load initial preferences from AnalyticsPreferenceService
 const initialPageKey = initiallySelectedModule ||"General";

 // Filters & State Registers
 const [datePreset, setDatePreset] = useState<DatePreset>(() => 
 AnalyticsPreferenceService.loadDateRangePreference(initialPageKey,"This Month") as DatePreset
 );
 const [searchQuery, setSearchQuery] = useState("");
 const [activeModule, setActiveModule] = useState<AnalyticsModule>(null);
 const [showFilters, setShowFilters] = useState(false);
 
 // Advanced filters state
 const [filterCustomer, setFilterCustomer] = useState("");
 const [filterProduct, setFilterProduct] = useState("");
 const [filterCategory, setFilterCategory] = useState("");
 const [filterAgent, setFilterAgent] = useState("");
 const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
 const [filterInvoiceStatus, setFilterInvoiceStatus] = useState("");
 const [filterStockStatus, setFilterStockStatus] = useState("");
 const [filterGstType, setFilterGstType] = useState("");

 // Helpers to link invoice items robustly (case-insensitive and support invoiceNo and invoiceId matches)
 const matchInvoiceItem = (item: InvoiceItem, inv: Invoice) => {
 const itemNo = String(item.invoiceNo ||"").trim().toLowerCase();
 const invNo = String(inv.invoiceNo ||"").trim().toLowerCase();
 const itemId = String(item.invoiceId ||"").trim().toLowerCase();
 const invId = String(inv.invoiceId ||"").trim().toLowerCase();
 if (invNo && itemNo && invNo === itemNo) return true;
 if (invId && itemId && invId === itemId) return true;
 return false;
 };

 // Defensive validation helper: Trace and compute actual physical quantity sold, never summing monetary amounts/prices
 const getInvoiceItemQuantity = (item: InvoiceItem): number => {
 if (!item) return 0;
 let qty = typeof item.quantity ==="number" ? item.quantity : parseFloat(String(item.quantity || 0));
 
 if (!Number.isFinite(qty) || qty < 0) {
 return 0;
 }

 // Defensive check: A physical item quantity per invoice line item should never exceed a reasonable ceiling
 // in a furniture context (e.g. 500 units). If the quantity is exactly equal to the unitPrice, legacy price,
 // item.amount, or resembles a database ID or HSN code (e.g. 9403, 94031000), it's a monetary field mismatch.
 const isMonetaryMismatch = 
 qty === item.unitPrice || 
 qty === item.amount || 
 qty >= 10000 || // clearly a monetary rate, barcode, or HSN identifier
 (item.unitPrice && qty >= item.unitPrice && qty > 500) ||
 (item.amount && qty === item.amount);

 if (isMonetaryMismatch) {
 // Reconcile and calculate a realistic physical quantity:
 // If the amount is valid and unitPrice is valid, quantity = amount / unitPrice. Otherwise default to 1.
 if (item.amount && item.unitPrice && item.unitPrice > 0) {
 const calculatedQty = Math.round(item.amount / item.unitPrice);
 return Number.isFinite(calculatedQty) && calculatedQty > 0 && calculatedQty < 100 ? calculatedQty : 1;
 }
 return 1;
 }

 return qty;
 };

 // Helper to safely get total GST from an invoice, dealing with missing fields or string formats
 const getInvoiceGst = (inv: Invoice): number => {
 let cgst = typeof inv.cgstAmount === 'string' ? parseFloat(inv.cgstAmount) : (inv.cgstAmount || 0);
 let sgst = typeof inv.sgstAmount === 'string' ? parseFloat(inv.sgstAmount) : (inv.sgstAmount || 0);
 let igst = typeof inv.igstAmount === 'string' ? parseFloat(inv.igstAmount) : (inv.igstAmount || 0);
 let taxAmt = typeof inv.taxAmount === 'string' ? parseFloat(inv.taxAmount) : (inv.taxAmount || 0);
 
 let total = 0;
 if (cgst > 0 || sgst > 0 || igst > 0) {
 total = (Number.isNaN(cgst) ? 0 : cgst) + (Number.isNaN(sgst) ? 0 : sgst) + (Number.isNaN(igst) ? 0 : igst);
 } else if (taxAmt > 0 && !Number.isNaN(taxAmt)) {
 total = taxAmt;
 }
 return total;
 };

 const getInvoiceCgst = (inv: Invoice): number => {
 let cgst = typeof inv.cgstAmount === 'string' ? parseFloat(inv.cgstAmount) : (inv.cgstAmount || 0);
 if (Number.isNaN(cgst) || cgst === 0) {
 // fallback to guessing from taxAmount if it's within state
 let taxAmt = typeof inv.taxAmount === 'string' ? parseFloat(inv.taxAmount) : (inv.taxAmount || 0);
 if (taxAmt > 0 && !Number.isNaN(taxAmt) && (inv.gstType ==="Within State GST" || !inv.gstType)) return Math.floor(taxAmt / 2);
 }
 return Number.isNaN(cgst) ? 0 : cgst;
 };

 const getInvoiceSgst = (inv: Invoice): number => {
 let sgst = typeof inv.sgstAmount === 'string' ? parseFloat(inv.sgstAmount) : (inv.sgstAmount || 0);
 if (Number.isNaN(sgst) || sgst === 0) {
 // fallback to guessing from taxAmount if it's within state
 let taxAmt = typeof inv.taxAmount === 'string' ? parseFloat(inv.taxAmount) : (inv.taxAmount || 0);
 if (taxAmt > 0 && !Number.isNaN(taxAmt) && (inv.gstType ==="Within State GST" || !inv.gstType)) return Math.ceil(taxAmt / 2);
 }
 return Number.isNaN(sgst) ? 0 : sgst;
 };

 const getInvoiceIgst = (inv: Invoice): number => {
 let igst = typeof inv.igstAmount === 'string' ? parseFloat(inv.igstAmount) : (inv.igstAmount || 0);
 if (Number.isNaN(igst) || igst === 0) {
 let taxAmt = typeof inv.taxAmount === 'string' ? parseFloat(inv.taxAmount) : (inv.taxAmount || 0);
 if (taxAmt > 0 && !Number.isNaN(taxAmt) && inv.gstType ==="Out-of-State GST") return taxAmt;
 }
 return Number.isNaN(igst) ? 0 : igst;
 };

 // Chart configuration state
 const [chartType, setChartType] = useState<"Bar" |"Line" |"Area" |"Pie" |"Donut">(() => 
 AnalyticsPreferenceService.loadChartPreference(initialPageKey,"Line") as any
 );
 const [distributionView, setDistributionView] = useState<"Daily" |"Weekly" |"Monthly" |"Quarterly" |"Yearly">(() => 
 AnalyticsPreferenceService.loadGroupingPreference(initialPageKey,"Monthly") as any
 );

 const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
 const chartRef = React.useRef<HTMLDivElement>(null);

 useEffect(() => {
 if (!chartRef.current) return;
 const observer = new ResizeObserver((entries) => {
 const entry = entries[0];
 if (entry && entry.contentRect) {
 setChartDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
 }
 });
 observer.observe(chartRef.current);
 return () => observer.disconnect();
 }, [activeModule]);

 // Load preferences when activeModule changes
 useEffect(() => {
 const pageKey = activeModule ||"General";
 const savedPreset = AnalyticsPreferenceService.loadDateRangePreference(pageKey,"This Month") as DatePreset;
 setDatePreset(savedPreset);
 const savedChart = AnalyticsPreferenceService.loadChartPreference(pageKey,"Line") as any;
 setChartType(savedChart);
 const savedGrouping = AnalyticsPreferenceService.loadGroupingPreference(pageKey,"Monthly") as any;
 setDistributionView(savedGrouping);
 }, [activeModule]);

 // Preference Saver helpers
 const handleDatePresetChange = (preset: DatePreset) => {
 setDatePreset(preset);
 const pageKey = activeModule ||"General";
 AnalyticsPreferenceService.saveDateRangePreference(pageKey, preset);
 };

 const handleChartTypeChange = (type:"Bar" |"Line" |"Area" |"Pie" |"Donut") => {
 setChartType(type);
 const pageKey = activeModule ||"General";
 AnalyticsPreferenceService.saveChartPreference(pageKey, type);
 };

 const handleDistributionViewChange = (view:"Daily" |"Weekly" |"Monthly" |"Quarterly" |"Yearly") => {
 setDistributionView(view);
 const pageKey = activeModule ||"General";
 AnalyticsPreferenceService.saveGroupingPreference(pageKey, view);
 };

 // Multi-tier Drilldown Navigation Chain State
 const [selectedMonth, setSelectedMonth] = useState<string | null>(null); // e.g."2026-06"
 const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null); // e.g."Vennala"
 const [selectedInvoiceNo, setSelectedInvoiceNo] = useState<string | null>(null); // e.g."YR-1001"

 // Sliding Drawers Inspection registers
 const [inspectCustomerName, setInspectCustomerName] = useState<string | null>(null);
 const [inspectInvoiceNo, setInspectInvoiceNo] = useState<string | null>(null);
 const [inspectProductName, setInspectProductName] = useState<string | null>(null);

 // Sorting ledger
 const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

 // Sync initial module from deep linking (optional but beautiful)
 useEffect(() => {
 if (initiallySelectedModule) {
 setActiveModule(initiallySelectedModule as AnalyticsModule);
 if (onClearSelectedModule) onClearSelectedModule();
 }
 }, [initiallySelectedModule, onClearSelectedModule]);

 // Set default view / defaults as requested on mount
 useEffect(() => {
 setDatePreset("This Month");
 setChartType("Line");
 }, []);

 // Master Fallback database registers to guarantee offline sync capabilities
 const fallbackCustomers = useMemo<Customer[]>(() => {
 if (customers && customers.length > 0) return customers;
 try {
 const raw = localStorage.getItem("billing_customers");
 return raw ? JSON.parse(raw) : [];
 } catch { return []; }
 }, [customers]);

 const fallbackProducts = useMemo<Product[]>(() => {
 if (products && products.length > 0) return products;
 try {
 const raw = localStorage.getItem("billing_products");
 return raw ? JSON.parse(raw) : [];
 } catch { return []; }
 }, [products]);

 const fallbackInvoiceItems = useMemo<InvoiceItem[]>(() => {
 if (invoiceItems && invoiceItems.length > 0) return invoiceItems;
 try {
 const raw = localStorage.getItem("billing_invoice_items");
 return raw ? JSON.parse(raw) : [];
 } catch { return []; }
 }, [invoiceItems]);

 const activeInvoices = useMemo(() => {
 return invoices.filter(inv => !inv.isSoftDeleted && inv.status !=="Deleted");
 }, [invoices]);

 // Comprehensive multi-dimensional invoice database filtering
 const filteredInvoices = useMemo(() => {
 return activeInvoices.filter(inv => {
 // 1. Date Preset filters
 if (datePreset ==="Today") {
 if (getInvoiceDateStr(inv.date) !== getTodayStr()) return false;
 } else if (datePreset ==="This Week") {
 if (!isDateInCurrentWeek(inv.date)) return false;
 } else if (datePreset ==="This Month") {
 if (!isDateInCurrentMonth(inv.date)) return false;
 } else if (datePreset ==="6 Months") {
 const invDate = new Date(inv.date);
 const limitDate = new Date();
 limitDate.setMonth(limitDate.getMonth() - 6);
 if (invDate < limitDate) return false;
 } else if (datePreset ==="This Year") {
 if (!isDateInCurrentYear(inv.date)) return false;
 }

 // 2. Search query filter
 if (searchQuery.trim()) {
 const query = searchQuery.toLowerCase().trim();
 const matchesInvoiceNo = inv.invoiceNo.toLowerCase().includes(query);
 const matchesCustomer = inv.customerName.toLowerCase().includes(query);
 const matchesAgent = (inv.assignedEmployee ||"").toLowerCase().includes(query) || 
 (inv.lastEditedBy ||"").toLowerCase().includes(query);
 const matchesMobile = String(inv.mobile ||"").includes(query);
 const matchesBusiness = (inv.customerBusinessName ||"").toLowerCase().includes(query);
 
 if (!matchesInvoiceNo && !matchesCustomer && !matchesAgent && !matchesMobile && !matchesBusiness) {
 return false;
 }
 }

 // 3. Drill-down Month Filter
 if (selectedMonth) {
 const invMonth = inv.date.substring(0, 7); // e.g.,"2026-06"
 if (invMonth !== selectedMonth) return false;
 }

 // 4. Drill-down Customer Name Filter
 if (selectedCustomerName) {
 if (inv.customerName !== selectedCustomerName) return false;
 }

 // 5. Advanced Interactive Filters
 if (filterCustomer.trim() && !inv.customerName.toLowerCase().includes(filterCustomer.toLowerCase().trim())) {
 return false;
 }
 if (filterAgent && inv.assignedEmployee !== filterAgent) {
 return false;
 }
 if (filterPaymentStatus && inv.paymentStatus !== filterPaymentStatus) {
 return false;
 }
 if (filterInvoiceStatus && inv.status !== filterInvoiceStatus) {
 return false;
 }
 if (filterGstType && inv.gstType !== filterGstType) {
 return false;
 }

 // 6. Link itemised filters (Product level, Category level, Stock thresholds)
 if (filterProduct || filterCategory || filterStockStatus) {
 const matchingItems = fallbackInvoiceItems.filter(item => item.invoiceNo === inv.invoiceNo);
 if (matchingItems.length === 0) return false;

 let hasProductMatch = !filterProduct;
 let hasCategoryMatch = !filterCategory;
 let hasStockMatch = !filterStockStatus;

 matchingItems.forEach(item => {
 const detail = fallbackProducts.find(p => p.id === item.productId);
 if (detail) {
 if (filterProduct && detail.id === filterProduct) hasProductMatch = true;
 if (filterCategory && detail.category === filterCategory) hasCategoryMatch = true;
 if (filterStockStatus) {
 const stock = detail.stockAvailable || 0;
 if (filterStockStatus ==="In Stock" && stock > 10) hasStockMatch = true;
 if (filterStockStatus ==="Low Stock" && stock > 0 && stock <= 10) hasStockMatch = true;
 if (filterStockStatus ==="Out of Stock" && stock === 0) hasStockMatch = true;
 }
 }
 });

 if (!hasProductMatch || !hasCategoryMatch || !hasStockMatch) {
 return false;
 }
 }

 return true;
 });
 }, [
 activeInvoices, 
 datePreset, 
 searchQuery, 
 selectedMonth, 
 selectedCustomerName,
 filterCustomer, 
 filterAgent, 
 filterPaymentStatus, 
 filterInvoiceStatus, 
 filterGstType, 
 filterProduct, 
 filterCategory, 
 filterStockStatus,
 fallbackInvoiceItems,
 fallbackProducts
 ]);

 // Compute metrics dynamic sums
 const metrics = useMemo(() => {
 let gross = 0;
 let discounts = 0;
 let refunds = 0;
 let corporateRetained = 0;
 let gstCollected = 0;
 let amountReceived = 0;
 let outstandingBalance = 0;

 filteredInvoices.forEach(inv => {
 const isCancelled = inv.status ==="Cancelled";
 if (!isCancelled) {
 gross += inv.grandTotal;
 discounts += inv.discount || 0;

 const cgst = getInvoiceCgst(inv);
 const sgst = getInvoiceSgst(inv);
 const igst = getInvoiceIgst(inv);
 gstCollected += cgst + sgst + igst;
 
 amountReceived += (inv.amountPaid !== undefined ? inv.amountPaid : inv.grandTotal);
 outstandingBalance += (inv.balanceDue || 0);
 corporateRetained += inv.grandTotal;
 } else {
 const retained = inv.cancellationDeduction || 0;
 gross += retained;
 discounts += inv.discount || 0;
 refunds += inv.refundAmount || 0;
 corporateRetained += retained;
 }
 });

 const net = gross;

 return {
 gross,
 discounts,
 refunds,
 corporateRetained,
 gstCollected,
 amountReceived,
 outstandingBalance,
 net
 };
 }, [filteredInvoices]);

 // Custom aggregations for charts and explorer analytics panels
 const trendsAndBreakdowns = useMemo(() => {
 // Determine the calculated range duration in days for adaptive grouping
 let diffDays = 30; // default to Month ("This Month")
 if (selectedMonth) {
 diffDays = 30; // viewing a single month means we aggregate and group by DAY
 } else if (datePreset ==="Today") {
 diffDays = 1;
 } else if (datePreset ==="This Week") {
 diffDays = 7;
 } else if (datePreset ==="This Month") {
 diffDays = 30;
 } else if (datePreset ==="6 Months") {
 diffDays = 180;
 } else if (datePreset ==="This Year") {
 diffDays = 365;
 } else if (datePreset ==="All Time") {
 if (filteredInvoices.length > 0) {
 const dates = filteredInvoices.map(inv => new Date(inv.date).getTime()).filter(t => !isNaN(t));
 if (dates.length > 0) {
 const earliest = Math.min(...dates);
 const latest = Math.max(...dates);
 diffDays = Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24)) || 1;
 } else {
 diffDays = 999;
 }
 } else {
 diffDays = 1;
 }
 }

 // 1. Grouped timeline breakdown (monthsMap)
 const monthsMap: Record<string, { 
 month: string, 
 dateKey: string,
 tooltipDate: string,
 gross: number, 
 gst: number, 
 received: number, 
 outstanding: number, 
 discounts: number, 
 refunds: number, 
 corporateRetained: number,
 net: number, 
 count: number 
 }> = {};

 const todayStrInKolkata = getTodayStr(); // Resolves missing ReferenceError for charts filter later

 const monthsAbbr = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

 // 2. Product breakdown
 const productsMap: Record<string, { id: string, name: string, quantity: number, revenue: number, category: string }> = {};

 // 3. Category breakdown
 const categoriesMap: Record<string, { name: string, revenue: number, count: number }> = {};

 // 4. Customer breakdown
 const customersMap: Record<string, { name: string, revenue: number, paid: number, outstanding: number, orders: number }> = {};

 // 5. Agent representative leaderboard
 const agentsMap: Record<string, { name: string, revenue: number, orders: number }> = {};

 // 6. GST Types categorization
 const gstMap: Record<string, { name: string, cgst: number, sgst: number, igst: number, total: number }> = {
"CGST_SGST": { name:"Within State CGST+SGST", cgst: 0, sgst: 0, igst: 0, total: 0 },
"IGST": { name:"Out of State IGST", cgst: 0, sgst: 0, igst: 0, total: 0 },
"Non-GST": { name:"Non-GST Bills", cgst: 0, sgst: 0, igst: 0, total: 0 },
"No GST": { name:"Exempted / Plain", cgst: 0, sgst: 0, igst: 0, total: 0 },
 };

 filteredInvoices.forEach(inv => {
 // Normalize dates before grouping to ensure consistent formatting
 const rawDate = inv.date || inv.invoiceDate;
 if (!rawDate) return;
 
 const parsedDateTest = new Date(rawDate);
 if (isNaN(parsedDateTest.getTime())) return;
 
 const normalizedDate = getInvoiceDateStr(rawDate);
 const parts = normalizedDate.split("-");
 if (parts.length < 3) return;
 
 const yearStr = parts[0];
 const monthStrRaw = parts[1];
 const dayStrRaw = parts[2].substring(0, 2);

 const monthIdx = parseInt(monthStrRaw, 10) - 1;
 if (monthIdx < 0 || monthIdx > 11) return;
 
 const monthShort = monthsAbbr[monthIdx];

 let mLabel ="";
 let displayLabel ="";
 let tooltipLabel ="";

 if (diffDays <= 31) {
 // Rule 1: Group by DAY
 mLabel = `${yearStr}-${monthStrRaw}-${dayStrRaw}`;
 displayLabel = `${monthShort} ${dayStrRaw}`;
 tooltipLabel = `${parseInt(dayStrRaw, 10)} ${monthShort} ${yearStr}`;
 } else if (diffDays <= 365) {
 // Rule 2: Group by MONTH
 mLabel = `${yearStr}-${monthStrRaw}`;
 displayLabel = `${yearStr}-${monthStrRaw}`;
 tooltipLabel = `${monthShort} ${yearStr}`;
 } else {
 // Rule 3: Group by YEAR
 mLabel = yearStr;
 displayLabel = yearStr;
 tooltipLabel = yearStr;
 }

 if (!monthsMap[mLabel]) {
 monthsMap[mLabel] = { 
 month: displayLabel, 
 dateKey: mLabel,
 tooltipDate: tooltipLabel,
 gross: 0, 
 gst: 0, 
 received: 0, 
 outstanding: 0, 
 discounts: 0, 
 refunds: 0, 
 corporateRetained: 0,
 net: 0, 
 count: 0 
 };
 }
 
 monthsMap[mLabel].count += 1;
 monthsMap[mLabel].discounts += inv.discount || 0;
 
 const isCancelled = inv.status ==="Cancelled";
 if (!isCancelled) {
 monthsMap[mLabel].gross += inv.grandTotal;
 const gstVal = getInvoiceGst(inv);
 monthsMap[mLabel].gst += gstVal;
 monthsMap[mLabel].received += (inv.amountPaid !== undefined ? inv.amountPaid : inv.grandTotal);
 monthsMap[mLabel].outstanding += (inv.balanceDue || 0);
 monthsMap[mLabel].net += inv.grandTotal;
 monthsMap[mLabel].corporateRetained += inv.grandTotal;
 } else {
 const retained = inv.cancellationDeduction || 0;
 monthsMap[mLabel].gross += retained;
 monthsMap[mLabel].refunds += inv.refundAmount || 0;
 monthsMap[mLabel].net += retained;
 monthsMap[mLabel].corporateRetained += retained;
 }

 // Customer aggregation
 const custName = inv.customerName;
 if (!customersMap[custName]) {
 customersMap[custName] = { name: custName, revenue: 0, paid: 0, outstanding: 0, orders: 0 };
 }
 customersMap[custName].orders += 1;
 if (!isCancelled) {
 customersMap[custName].revenue += inv.grandTotal;
 customersMap[custName].paid += (inv.amountPaid !== undefined ? inv.amountPaid : inv.grandTotal);
 customersMap[custName].outstanding += (inv.balanceDue || 0);
 } else {
 const retained = inv.cancellationDeduction || 0;
 customersMap[custName].revenue += retained;
 customersMap[custName].paid += retained;
 }

 // Agent representative
 const agent = inv.assignedEmployee ||"Self (Admin)";
 if (!agentsMap[agent]) {
 agentsMap[agent] = { name: agent, revenue: 0, orders: 0 };
 }
 agentsMap[agent].orders += 1;
 if (!isCancelled) {
 agentsMap[agent].revenue += inv.grandTotal;
 } else {
 agentsMap[agent].revenue += (inv.cancellationDeduction || 0);
 }

 // GST Breakdown
 const gType = inv.gstType ||"Non-GST";
 const key = (gType.includes("CGST") || gType.includes("Within State")) ?"CGST_SGST" : 
 (gType.includes("IGST") || gType.includes("Out-of-State")) ?"IGST" :"Non-GST";
 if (gstMap[key]) {
 gstMap[key].cgst += getInvoiceCgst(inv);
 gstMap[key].sgst += getInvoiceSgst(inv);
 gstMap[key].igst += getInvoiceIgst(inv);
 gstMap[key].total += getInvoiceGst(inv);
 }

 // Itemized extraction
 const items = fallbackInvoiceItems.filter(item => matchInvoiceItem(item, inv));
 items.forEach(item => {
 // Product
 const pId = item.productId;
 if (!productsMap[pId]) {
 productsMap[pId] = { id: pId, name: item.productName, quantity: 0, revenue: 0, category:"Unknown" };
 
 let pDet = fallbackProducts.find(p => p.id === pId || p.name.toLowerCase() === item.productName.toLowerCase());
 
 // Try to locate parent reference from SKU configurations
 if (!pDet && item.skuId) {
 pDet = fallbackProducts.find(p => p.inventorySkus?.some(s => s.skuId === item.skuId));
 }
 if (!pDet && pId) {
 pDet = fallbackProducts.find(p => p.inventorySkus?.some(s => s.skuId === pId));
 }

 let resolvedCategory ="Unknown";
 if (pDet) {
 let curr: Product | undefined = pDet;
 let safety = 0;
 const visited = new Set<string>();
 while (curr && safety < 100 && !visited.has(curr.id)) {
 visited.add(curr.id);
 if (curr.category && curr.category.trim() !=="" && curr.category.trim().toLowerCase() !=="unknown") {
 resolvedCategory = curr.category.trim();
 break;
 }
 if (curr.nodeType ==="Category" && curr.name && curr.name.trim() !=="") {
 resolvedCategory = curr.name.trim();
 break;
 }
 if (curr.parentId) {
 curr = fallbackProducts.find(p => p.id === curr!.parentId);
 } else {
 curr = undefined;
 }
 safety++;
 }
 }

 // Semantic matching fallback based on categories present in fallbackProducts
 if (resolvedCategory ==="Unknown") {
 const catOptions = Array.from(new Set(fallbackProducts.map(p => p.category).filter(c => c && c.trim() !=="" && c.trim().toLowerCase() !=="unknown")));
 const nameLower = item.productName.toLowerCase();
 const displayNameLower = (item.displayName ||"").toLowerCase();
 const hierarchyLower = (item.hierarchyPath ||"").toLowerCase();
 
 const matchedCat = catOptions.find(cat => 
 nameLower.includes(cat.toLowerCase()) || 
 displayNameLower.includes(cat.toLowerCase()) ||
 hierarchyLower.includes(cat.toLowerCase())
 );
 if (matchedCat) {
 resolvedCategory = matchedCat;
 }
 }

 productsMap[pId].category = resolvedCategory;
 }
 
 let qty = getInvoiceItemQuantity(item);
 if (!Number.isFinite(qty)) {
 qty = 0;
 }
 productsMap[pId].quantity += qty;
 productsMap[pId].revenue += item.amount;

 // Category
 const cat = productsMap[pId].category ||"Unknown";
 if (!categoriesMap[cat]) {
 categoriesMap[cat] = { name: cat, revenue: 0, count: 0 };
 }
 categoriesMap[cat].count += qty;
 categoriesMap[cat].revenue += item.amount;
 });
 });

 return {
 months: Object.values(monthsMap)
 .filter(m => {
 // Strict validation: Never allow data points beyond today
 if (m.dateKey.length === 10) { // yyyy-MM-dd
 return m.dateKey <= todayStrInKolkata;
 } else if (m.dateKey.length === 7) { // yyyy-MM
 return m.dateKey <= todayStrInKolkata.substring(0, 7);
 } else if (m.dateKey.length === 4) { // yyyy
 return m.dateKey <= todayStrInKolkata.substring(0, 4);
 }
 return true;
 })
 .sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
 products: Object.values(productsMap).sort((a, b) => b.revenue - a.revenue),
 categories: Object.values(categoriesMap).sort((a, b) => b.revenue - a.revenue),
 customers: Object.values(customersMap).sort((a, b) => b.revenue - a.revenue),
 agents: Object.values(agentsMap).sort((a, b) => b.revenue - a.revenue),
 gstTypes: Object.values(gstMap)
 };
 }, [filteredInvoices, fallbackInvoiceItems, fallbackProducts, datePreset, selectedMonth]);

 // Robust decoupled computation exclusively for the Monthly Contributions cards
 const monthlyContributions = useMemo(() => {
 // Only use actually valid invoices
 const monthsMap: Record<string, { 
 label: string, 
 dateKey: string,
 gross: number, 
 gst: number, 
 received: number, 
 outstanding: number, 
 count: number 
 }> = {};

 const monthsAbbr = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

 // Ignore drilldown level filters if we are showing the root months list, but we still respect filteredInvoices
 // Wait; if filteredInvoices is heavily filtered by `selectedMonth` drilldown, it only contains one month.
 // That's fine! If they drilled down, the cards are replaced by Customers anyway.
 
 filteredInvoices.forEach(inv => {
 const rawDate = inv.date || inv.invoiceDate;
 if (!rawDate) return;
 const parsedDateTest = new Date(rawDate);
 if (isNaN(parsedDateTest.getTime())) return;
 
 const parts = rawDate.split("-");
 if (parts.length < 3) return;
 
 const yearStr = parts[0];
 const monthStrRaw = parts[1];
 const monthIdx = parseInt(monthStrRaw, 10) - 1;
 if (monthIdx < 0 || monthIdx > 11) return;
 
 const monthKey = `${yearStr}-${monthStrRaw}`; // grouping key: YYYY-MM
 const displayLabel = `${monthsAbbr[monthIdx]} ${yearStr}`;

 if (!monthsMap[monthKey]) {
 monthsMap[monthKey] = {
 label: displayLabel,
 dateKey: monthKey,
 gross: 0,
 gst: 0,
 received: 0,
 outstanding: 0,
 count: 0
 };
 }
 
 monthsMap[monthKey].count += 1;
 const isCancelled = inv.status ==="Cancelled";
 if (!isCancelled) {
 monthsMap[monthKey].gross += inv.grandTotal;
 monthsMap[monthKey].gst += getInvoiceGst(inv);
 monthsMap[monthKey].received += (inv.amountPaid !== undefined ? inv.amountPaid : inv.grandTotal);
 monthsMap[monthKey].outstanding += (inv.balanceDue || 0);
 } else {
 const retained = inv.cancellationDeduction || 0;
 monthsMap[monthKey].gross += retained;
 }
 });

 // Output only months that have invoices, newest first
 return Object.values(monthsMap).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
 }, [filteredInvoices]);

 // Unique lists for filtering dropdowns (memoized for premium performance)
 const filterOptions = useMemo(() => {
 const agents = Array.from(new Set(activeInvoices.map(i => i.assignedEmployee).filter(Boolean)));
 const categories = Array.from(new Set(fallbackProducts.map(p => p.category).filter(Boolean)));
 const productsList = fallbackProducts.map(p => ({ id: p.id, name: p.name }));
 return { agents, categories, productsList };
 }, [activeInvoices, fallbackProducts]);

 // Sort helper
 const handleSort = (key: string) => {
 let direction: 'asc' | 'desc' = 'asc';
 if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
 direction = 'desc';
 }
 setSortConfig({ key, direction });
 };

 const getSortedInvoices = (invoicesList: Invoice[]) => {
 if (!sortConfig) return invoicesList;
 const sorted = [...invoicesList];
 sorted.sort((a, b) => {
 let valA: any = a[sortConfig.key as keyof Invoice] ?? '';
 let valB: any = b[sortConfig.key as keyof Invoice] ?? '';

 if (sortConfig.key ==="grandTotal" || sortConfig.key ==="amountPaid" || sortConfig.key ==="balanceDue") {
 return sortConfig.direction === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
 }
 return sortConfig.direction === 'asc' 
 ? String(valA).localeCompare(String(valB)) 
 : String(valB).localeCompare(String(valA));
 });
 return sorted;
 };

 // CSV Data Downloader formatter
 const downloadCSV = () => {
 const headers = ["Invoice No","Date","Customer Name","Agent Representative","Status","Grand Total","Amount Paid","Balance Due"];
 const rows = filteredInvoices.map(inv => [
 inv.invoiceNo,
 inv.date,
 inv.customerName,
 inv.assignedEmployee ||"Self-Admin",
 inv.status,
 inv.grandTotal.toFixed(2),
 (inv.amountPaid !== undefined ? inv.amountPaid : inv.grandTotal).toFixed(2),
 (inv.balanceDue || 0).toFixed(2)
 ]);
 handleExportCSV("Billing Registry", headers, rows,"invoice_billing_analytics.csv");
 };

 // PDF Ledger exporter (using jsPDF to generate a client-side beautiful financial report)
 const downloadPDFLedger = () => {
 const title = `${activeModule ||"General Revenue"} Ledger Report - ${datePreset}`;
 const headers = ["InvoiceNo","Date","Customer","Subtotal","GST Tax","Grand Total","Amount Paid","Balance"];
 const data = filteredInvoices.map(inv => {
 const tax = getInvoiceGst(inv);
 return [
 inv.invoiceNo,
 inv.date.substring(0, 10),
 inv.customerName.length > 18 ? inv.customerName.substring(0, 16) + '..' : inv.customerName,
 (inv.subtotal || 0).toFixed(2),
 tax.toFixed(2),
 inv.grandTotal.toFixed(2),
 (inv.amountPaid !== undefined ? inv.amountPaid : inv.grandTotal).toFixed(2),
 (inv.balanceDue || 0).toFixed(2)
 ];
 });
 
 // Add Summary Row at end
 const totalTax = filteredInvoices.reduce((sum, inv) => sum + (inv.status !=="Cancelled" ? getInvoiceGst(inv) : 0), 0);
 const totalGrand = filteredInvoices.reduce((sum, inv) => sum + (inv.status !=="Cancelled" ? inv.grandTotal : (inv.cancellationDeduction || 0)), 0);
 const totalPaid = filteredInvoices.reduce((sum, inv) => sum + (inv.status !=="Cancelled" ? (inv.amountPaid !== undefined ? inv.amountPaid : inv.grandTotal) : (inv.cancellationDeduction || 0)), 0);
 const totalBal = filteredInvoices.reduce((sum, inv) => sum + (inv.status !=="Cancelled" ? (inv.balanceDue || 0) : 0), 0);
 
 data.push([
"TOTALS",
"-",
"-",
"-",
 totalTax.toFixed(2),
 totalGrand.toFixed(2),
 totalPaid.toFixed(2),
 totalBal.toFixed(2)
 ]);

 handleExportPDF(title, headers, data,"enterprise_ledgers.pdf");
 };

 const handleExportCSV = (title: string, headers: string[], data: any[][], fileName: string) => {
 try {
 const csvContent ="data:text/csv;charset=utf-8," 
 + [headers.join(","), ...data.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
 const encodedUri = encodeURI(csvContent);
 const link = document.createElement("a");
 link.setAttribute("href", encodedUri);
 link.setAttribute("download", fileName);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 onShowNotification(`${title} CSV downloaded representing active ledger.`,"success");
 } catch {
 onShowNotification("Failed to export ledger to CSV","error");
 }
 };

 const handleExportPDF = (title: string, headers: string[], data: any[][], fileName: string) => {
 try {
 const doc = new jsPDF();
 
 // Header branding
 doc.setFillColor(15, 23, 42); // slate 900
 doc.rect(0, 0, 210, 40,"F");
 
 doc.setTextColor(255, 255, 255);
 doc.setFont("Helvetica","bold");
 doc.setFontSize(18);
 doc.text("AUTO-GEN ENTERPRISE LEDGERS", 15, 18);
 
 doc.setFont("Helvetica","normal");
 doc.setFontSize(10);
 doc.setTextColor(226, 232, 240); // slate 200
 doc.text(`Report Type: ${title}`, 15, 26);
 doc.text(`Export Timestamp: ${new Date().toLocaleString()} (Local Time)`, 15, 32);

 let startY = 50;
 doc.setTextColor(15, 23, 42);
 
 // Render simple table of items
 doc.setFont("Helvetica","bold");
 doc.setFontSize(8);
 
 let colX = 12;
 const colWidths = [18, 20, 38, 22, 22, 22, 22, 20]; // fits 8 columns perfectly (sum=184)
 
 // Render headers
 let tempX = colX;
 headers.forEach((h, idx) => {
 doc.text(h, tempX, startY);
 tempX += colWidths[idx];
 });
 
 startY += 4;
 doc.setDrawColor(203, 213, 225); // slate 300
 doc.line(10, startY - 1, 200, startY - 1);
 
 doc.setFont("Helvetica","normal");
 
 // Rows
 data.forEach((row, rowIdx) => {
 if (startY > 275) {
 doc.addPage();
 startY = 20;
 doc.setDrawColor(203, 213, 225);
 doc.setFont("Helvetica","bold");
 let tx = colX;
 headers.forEach((h, idx) => {
 doc.text(h, tx, startY);
 tx += colWidths[idx];
 });
 startY += 4;
 doc.line(10, startY - 1, 200, startY - 1);
 doc.setFont("Helvetica","normal");
 }
 
 let rx = colX;
 // Make the TOTALS row look bold and nice
 if (row[0] ==="TOTALS") {
 doc.setFont("Helvetica","bold");
 doc.line(10, startY - 2, 200, startY - 2);
 }
 
 row.forEach((cell, cellIdx) => {
 doc.text(String(cell), rx, startY);
 rx += colWidths[cellIdx];
 });
 
 startY += 6;
 });

 doc.save(fileName);
 onShowNotification(`${title} PDF saved successfully!`,"success");
 } catch (err) {
 console.error(err);
 onShowNotification("Failed to export PDF file","error");
 }
 };

 // Status badging formatter helper
 const getStatusBadge = (status: InvoiceStatus) => {
 switch (status) {
 case"Completed":
 case"Delivered":
 return <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Completed</span>;
 case"Work In Progress":
 return <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">In Progress</span>;
 case"Ready For Delivery":
 case"Ready for Delivery":
 return <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Ready/Dispatch</span>;
 case"Cancelled":
 return <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Cancelled</span>;
 default:
 return <span className="rounded bg-surface/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted">{status}</span>;
 }
 };

 // Sort Icon component
 const SortIcon = ({ colKey }: { colKey: string }) => {
 if (!sortConfig || sortConfig.key !== colKey) {
 return <ChevronDown className="inline h-3 w-3 text-muted/40 ml-1" />;
 }
 return sortConfig.direction === 'asc' ? 
 <ChevronUp className="inline h-3 w-3 text-blue-600 ml-1" /> : 
 <ChevronDown className="inline h-3 w-3 text-blue-600 ml-1" />;
 };

 // Reset drilldown hierarchy states
 const handleResetDrilldown = () => {
 setSelectedMonth(null);
 setSelectedCustomerName(null);
 setSelectedInvoiceNo(null);
 };

 // Compute Universal search matches
 const universalSearchMatches = useMemo(() => {
 if (!searchQuery.trim() || searchQuery.length < 2) return null;
 const query = searchQuery.toLowerCase().trim();

 // Customers match
 const matchingCusts = fallbackCustomers.filter(c => 
 c.name.toLowerCase().includes(query) || 
 String(c.mobile ||"").includes(query)
 );

 // Products match
 const matchingProds = fallbackProducts.filter(p => 
 p.name.toLowerCase().includes(query) || 
 (p.sku && p.sku.toLowerCase().includes(query)) ||
 (p.id && p.id.toLowerCase().includes(query))
 );

 // Invoices match
 const matchingInvoices = activeInvoices.filter(i => 
 i.invoiceNo.toLowerCase().includes(query) || 
 i.customerName.toLowerCase().includes(query)
 );

 return {
 customers: matchingCusts.slice(0, 4),
 products: matchingProds.slice(0, 4),
 invoices: matchingInvoices.slice(0, 4)
 };
 }, [searchQuery, fallbackCustomers, fallbackProducts, activeInvoices]);

 // Back button routing inside drill down
 const navigateBackIndex = (level: number) => {
 if (level === 0) {
 handleResetDrilldown();
 } else if (level === 1) {
 setSelectedCustomerName(null);
 setSelectedInvoiceNo(null);
 } else if (level === 2) {
 setSelectedInvoiceNo(null);
 }
 };

 // Dedicated Visual Charts Selector
 const renderChartSelector = () => {
 return (
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-default pb-3 mb-4 gap-2">
 <div>
 <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">Interactive Performance Graph</h3>
 <p className="text-[10px] text-muted">Aesthetic visualization with interactive hover telemetry. Toggle types to view.</p>
 </div>
 <div className="flex items-center gap-1 bg-surface p-0.5 rounded-lg border border-default text-[10px] font-bold select-none w-fit">
 {(["Bar","Line","Area","Pie","Donut"] as const).map(type => (
 <button
 key={type}
 onClick={() => handleChartTypeChange(type)}
 className={`px-2.5 py-1 rounded transition cursor-pointer ${
 chartType === type 
 ?"bg-input text-blue-600 shadow" 
 :"text-secondary hover:text-primary"
 }`}
 >
 {type}
 </button>
 ))}
 </div>
 </div>
 );
 };

 // Reusable sub-ledger billing table
 const renderTableOfInvoices = (invoiceList: Invoice[]) => {
 return (
 <div className="bg-card rounded-xl border border-default shadow-sm p-5 space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">Matching Records ledger ({invoiceList.length})</h3>
 <span className="text-[10px] px-2 py-0.5 font-mono text-muted bg-card-secondary dark:bg-zinc-800 rounded">Interactive items list</span>
 </div>
 <div className="overflow-x-auto">
 <table className="min-w-full table-auto text-left text-xs">
 <thead className="bg-table-header text-[10px] uppercase font-bold text-secondary border-b border-default">
 <tr>
 <th className="px-3 py-2.5">Invoice No</th>
 <th className="px-3 py-2.5">Date</th>
 <th className="px-3 py-2.5">Customer Client</th>
 <th className="px-3 py-2.5">Representative Agent</th>
 <th className="px-3 py-2.5">Workflow Status</th>
 <th className="px-3 py-2.5 text-right">Items</th>
 <th className="px-3 py-2.5 text-right">Total Amount</th>
 <th className="px-3 py-2.5 text-right">Amt Paid</th>
 <th className="px-3 py-2.5 text-right">Remaining Due</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 /40">
 {invoiceList.map(inv => (
 <tr 
 key={inv.invoiceNo} 
 onClick={() => setInspectInvoiceNo(inv.invoiceNo)}
 className="hover:bg-blue-50/50 dark:hover:bg-zinc-800/20 cursor-pointer transition-colors"
 >
 <td className="px-3 py-2.5 font-mono font-bold text-blue-600">{inv.invoiceNo}</td>
 <td className="px-3 py-2.5 text-muted font-mono">{formatDisplayDate(inv.date)}</td>
 <td className="px-3 py-2.5 font-semibold text-primary">{inv.customerName}</td>
 <td className="px-3 py-2.5 text-secondary">{inv.assignedEmployee ||"Self (Admin)"}</td>
 <td className="px-3 py-2.5">{getStatusBadge(inv.status)}</td>
 <td className="px-3 py-2.5 text-right font-mono">{inv.itemCount || 0}</td>
 <td className="px-3 py-2.5 text-right font-mono font-bold text-primary">₹{inv.grandTotal.toFixed(2)}</td>
 <td className="px-3 py-2.5 text-right font-mono text-emerald-600">₹{(inv.amountPaid !== undefined ? inv.amountPaid : inv.grandTotal).toFixed(2)}</td>
 <td className="px-3 py-2.5 text-right font-mono text-rose-500">₹{(inv.balanceDue || 0).toFixed(2)}</td>
 </tr>
 ))}
 {invoiceList.length === 0 && (
 <tr>
 <td colSpan={9} className="py-8 text-center text-muted italic text-xs">No matching invoices found in this view.</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 );
 };

 // Reusable sub-chart rendering function
 const renderStandardChart = (
 data: any[], 
 xKey: string, 
 dataKey: string, 
 labelName: string, 
 fillColor: string
 ) => {
 if (data.length === 0) {
 return (
 <div className="h-full flex items-center justify-center text-xs text-muted italic">
 No metrics available to plot for current filter range.
 </div>
 );
 }
 if (chartType ==="Bar") {
 return (
 <BarChart data={data}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
 <XAxis dataKey={xKey} stroke="#888888" fontSize={9} />
 <YAxis stroke="#888888" fontSize={9} />
 <Tooltip content={<CustomChartTooltip />} cursor={{ fill:"rgba(0,0,0,0.03)" }} />
 <Legend wrapperStyle={{ fontSize: 10 }} />
 <Bar dataKey={dataKey} name={labelName} fill={fillColor} radius={[4, 4, 0, 0]} />
 </BarChart>
 );
 } else if (chartType ==="Line") {
 return (
 <LineChart data={data}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
 <XAxis dataKey={xKey} stroke="#888888" fontSize={9} />
 <YAxis stroke="#888888" fontSize={9} />
 <Tooltip content={<CustomChartTooltip />} />
 <Legend wrapperStyle={{ fontSize: 10 }} />
 <Line type="monotone" dataKey={dataKey} name={labelName} stroke={fillColor} strokeWidth={2.5} activeDot={{ r: 5 }} />
 </LineChart>
 );
 } else if (chartType ==="Area") {
 return (
 <AreaChart data={data}>
 <defs>
 <linearGradient id="gradItem" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor={fillColor} stopOpacity={0.25}/>
 <stop offset="95%" stopColor={fillColor} stopOpacity={0}/>
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
 <XAxis dataKey={xKey} stroke="#888888" fontSize={9} />
 <YAxis stroke="#888888" fontSize={9} />
 <Tooltip content={<CustomChartTooltip />} />
 <Area type="monotone" dataKey={dataKey} name={labelName} stroke={fillColor} strokeWidth={2} fillOpacity={1} fill="url(#gradItem)" />
 </AreaChart>
 );
 } else {
 // Pie / Donut
 const pieData = data.slice(0, 10).map((item) => ({
 name: String(item[xKey] ||"Other"),
 value: Number(item[dataKey] || 0)
 })).filter(v => v.value > 0);
 const PIE_COLORS = ["#3b82f6","#10b981","#ef4444","#f59e0b","#8b5cf6","#ec4899","#14b8a6","#f43f5e","#06b6d4"];
 return (
 <PieChart>
 <Pie
 data={pieData}
 cx="50%"
 cy="50%"
 innerRadius={chartType ==="Donut" ? 50 : 0}
 outerRadius={75}
 paddingAngle={2}
 dataKey="value"
 label={({ name, percent }) => `${name.substring(0, 12)} (${(percent * 100).toFixed(0)}%)`}
 >
 {pieData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
 ))}
 </Pie>
 <Tooltip content={<CustomChartTooltip />} />
 <Legend wrapperStyle={{ fontSize: 10 }} />
 </PieChart>
 );
 }
 };

 // Render the Dedicated Analytics Subviews
 const renderActiveModuleContent = () => {
 switch (activeModule) {
 case"Gross Revenue": {
 const rawUnits = trendsAndBreakdowns.products.reduce((acc, p) => acc + p.quantity, 0);
 const itemUnits = Number.isFinite(rawUnits) ? rawUnits : 0;
 const avgInvoice = filteredInvoices.length > 0 ? (metrics.gross / filteredInvoices.length) : 0;
 return (
 <div className="space-y-6 animate-in fade-in duration-250">
 {/* Title Block */}
 <div className="bg-card p-5 border border-default rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-lg font-bold text-primary font-sans">Gross Revenue Explorer</h2>
 <p className="text-xs text-secondary">Comprehensive overview of total sales generated from checkout transactions.</p>
 </div>
 <button 
 onClick={() => setActiveModule(null)}
 className="cursor-pointer text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-default"
 >
 &larr; Back to Overview
 </button>
 </div>

 {/* Quick Metrics Grid */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Gross Sales Intake</span>
 <h3 className="text-xl font-mono font-bold text-blue-600 mt-2">₹{metrics.gross.toLocaleString("en-IN")}</h3>
 <p className="text-[10px] text-muted mt-1">Pre-deductions cash intake</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Average Ticket Size</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">₹{avgInvoice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</h3>
 <p className="text-[10px] text-muted mt-1">Weighted average per checkout</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Total Placed Invoices</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">{filteredInvoices.length} Bills</h3>
 <p className="text-[10px] text-muted mt-1">Completed order checkouts</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Physical Units Sold</span>
 <h3 className="text-xl font-mono font-bold text-emerald-600 mt-2">{itemUnits} Units</h3>
 <p className="text-[10px] text-muted mt-1">Materials and products distributed</p>
 </div>
 </div>

 {/* Main Interactive Chart Section */}
 <div className="bg-card rounded-xl border border-default p-5 shadow-sm space-y-4">
 {renderChartSelector()}
 <div className="h-72 w-full">
 <ResponsiveContainer width="100%" height="100%">
 {renderStandardChart(trendsAndBreakdowns.months,"month","gross","Gross Revenue (₹)","#3b82f6")}
 </ResponsiveContainer>
 </div>
 </div>

 {/* Bottom details split */}
 <div className="grid gap-6 md:grid-cols-3">
 <div className="bg-card border border-default rounded-xl p-5 space-y-3">
 <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">Material Performance</h3>
 <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
 {trendsAndBreakdowns.categories.map(cat => {
 const maxVal = trendsAndBreakdowns.categories[0]?.revenue || 1;
 const pct = (cat.revenue / maxVal) * 100;
 return (
 <div key={cat.name} className="space-y-1">
 <div className="flex justify-between text-xs font-semibold">
 <span className="text-primary">{cat.name ||"Default Category"}</span>
 <span className="text-secondary">₹{cat.revenue.toLocaleString("en-IN")}</span>
 </div>
 <div className="w-full bg-card-secondary dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
 <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 <div className="md:col-span-2 space-y-4">
 {renderTableOfInvoices(filteredInvoices)}
 </div>
 </div>
 </div>
 );
 }
 case"GST Collected": {
 const gstVal = metrics.gstCollected;
 const cgstSum = filteredInvoices.reduce((acc, inv) => acc + (inv.status !=="Cancelled" ? getInvoiceCgst(inv) : 0), 0);
 const sgstSum = filteredInvoices.reduce((acc, inv) => acc + (inv.status !=="Cancelled" ? getInvoiceSgst(inv) : 0), 0);
 const igstSum = filteredInvoices.reduce((acc, inv) => acc + (inv.status !=="Cancelled" ? getInvoiceIgst(inv) : 0), 0);
 
 // Group by Customer state for state-wise GST
 const stateGst: Record<string, { state: string, gst: number, count: number }> = {};
 filteredInvoices.forEach(inv => {
 if (inv.status !=="Cancelled") {
 const state = inv.customerState ||"Unknown State";
 const amt = getInvoiceGst(inv);
 if (amt > 0) {
 if (!stateGst[state]) stateGst[state] = { state, gst: 0, count: 0 };
 stateGst[state].gst += amt;
 stateGst[state].count += 1;
 }
 }
 });
 const stateGstList = Object.values(stateGst).sort((a,b) => b.gst - a.gst);

 return (
 <div className="space-y-6 animate-in fade-in duration-250">
 {/* Title Block */}
 <div className="bg-card p-5 border border-default rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-lg font-bold text-emerald-600 font-sans">GST & Taxes Analytics Suite</h2>
 <p className="text-xs text-secondary">Tax breakdown showing CGST, SGST, IGST contributions, state-wise compliance ratios, and audits.</p>
 </div>
 <button 
 onClick={() => setActiveModule(null)}
 className="cursor-pointer text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-default"
 >
 &larr; Back to Overview
 </button>
 </div>

 {/* Quick Metrics Grid */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Total Net Tax Collected</span>
 <h3 className="text-xl font-mono font-bold text-emerald-600 mt-2">₹{gstVal.toLocaleString("en-IN")}</h3>
 <p className="text-[10px] text-muted mt-1">CGST + SGST + IGST</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Within State CGST</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">₹{cgstSum.toLocaleString("en-IN")}</h3>
 <p className="text-[10px] text-muted mt-1">Central GST share (Local)</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Within State SGST</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">₹{sgstSum.toLocaleString("en-IN")}</h3>
 <p className="text-[10px] text-muted mt-1">State GST share (Local)</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Out of State IGST</span>
 <h3 className="text-xl font-mono font-bold text-purple-600 mt-2">₹{igstSum.toLocaleString("en-IN")}</h3>
 <p className="text-[10px] text-muted mt-1">Integrated GST (Interstate)</p>
 </div>
 </div>

 {/* Interactive Graph */}
 <div className="bg-card rounded-xl border border-default p-5 shadow-sm space-y-4">
 {renderChartSelector()}
 <div className="h-72 w-full">
 <ResponsiveContainer width="100%" height="100%">
 {renderStandardChart(trendsAndBreakdowns.months,"month","gst","GST Collected (₹)","#10b981")}
 </ResponsiveContainer>
 </div>
 </div>

 {/* Split */}
 <div className="grid gap-6 md:grid-cols-3">
 <div className="bg-card border border-default rounded-xl p-5 space-y-3">
 <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">GST Collections by State</h3>
 <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
 {stateGstList.map(st => (
 <div key={st.state} className="flex justify-between items-center text-xs border-b border-default py-1.5 font-sans">
 <div>
 <span className="font-semibold text-primary">{st.state}</span>
 <span className="text-[9px] text-muted block">{st.count} invoices</span>
 </div>
 <span className="font-mono text-emerald-600 font-semibold">₹{st.gst.toFixed(2)}</span>
 </div>
 ))}
 {stateGstList.length === 0 && (
 <p className="text-xs text-muted italic text-center py-4">No state-wise tax data captured.</p>
 )}
 </div>
 </div>

 <div className="md:col-span-2">
 {renderTableOfInvoices(filteredInvoices.filter(i => getInvoiceGst(i) > 0))}
 </div>
 </div>
 </div>
 );
 }
 case"Amount Received": {
 const receivedSum = metrics.amountReceived;
 const paidCount = filteredInvoices.filter(i => i.paymentStatus ==="Paid").length;
 const partialCount = filteredInvoices.filter(i => i.paymentStatus ==="Partially Paid").length;
 const collectionPct = (receivedSum / (metrics.gross || 1)) * 100;
 return (
 <div className="space-y-6 animate-in fade-in duration-250">
 {/* Title Block */}
 <div className="bg-card p-5 border border-default rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-lg font-bold text-emerald-600 font-sans">Amount Received & Collections</h2>
 <p className="text-xs text-secondary">Details on payment transactions, collections efficiency, and paid checkout status.</p>
 </div>
 <button 
 onClick={() => setActiveModule(null)}
 className="cursor-pointer text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-default"
 >
 &larr; Back to Overview
 </button>
 </div>

 {/* Metrics */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Total Funds Received</span>
 <h3 className="text-xl font-mono font-bold text-emerald-600 mt-2">₹{receivedSum.toLocaleString("en-IN")}</h3>
 <p className="text-[10px] text-muted mt-1">Net payments collected</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Collection Efficiency</span>
 <h3 className="text-xl font-mono font-bold text-blue-600 mt-2">{collectionPct.toFixed(1)}%</h3>
 <p className="text-[10px] text-muted mt-1">Paid share of total gross deals</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Fully Paid Checkouts</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">{paidCount} Bills</h3>
 <p className="text-[10px] text-muted mt-1">Perfect zero balance invoices</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Installment Pending Bills</span>
 <h3 className="text-xl font-mono font-bold text-amber-600 mt-2">{partialCount} Bills</h3>
 <p className="text-[10px] text-muted mt-1">Partial deposit received</p>
 </div>
 </div>

 {/* Chart */}
 <div className="bg-card rounded-xl border border-default p-5 shadow-sm space-y-4">
 {renderChartSelector()}
 <div className="h-72 w-full">
 <ResponsiveContainer width="100%" height="100%">
 {renderStandardChart(trendsAndBreakdowns.months,"month","received","Collections (₹)","#10b981")}
 </ResponsiveContainer>
 </div>
 </div>

 {renderTableOfInvoices(filteredInvoices.filter(i => (i.amountPaid || 0) > 0))}
 </div>
 );
 }
 case"Outstanding Balance": {
 const outstanding = metrics.outstandingBalance;
 const overdueCount = filteredInvoices.filter(i => (i.balanceDue || 0) > 0).length;
 const sortedCustomersWithDue = [...trendsAndBreakdowns.customers].filter(c => c.outstanding > 0).sort((a,b) => b.outstanding - a.outstanding);
 const recoveryPct = ((metrics.amountReceived / (metrics.amountReceived + outstanding || 1)) * 100);
 return (
 <div className="space-y-6 animate-in fade-in duration-250">
 {/* Title Block */}
 <div className="bg-card p-5 border border-default rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-lg font-bold text-rose-500 font-sans">Outstanding Balances & Recovery</h2>
 <p className="text-xs text-secondary">Overview of pending client dues, collection pipelines, and overdue aging ledgers.</p>
 </div>
 <button 
 onClick={() => setActiveModule(null)}
 className="cursor-pointer text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-default"
 >
 &larr; Back to Overview
 </button>
 </div>

 {/* Metrics */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Outstanding Balance Due</span>
 <h3 className="text-xl font-mono font-bold text-rose-500 mt-2">₹{outstanding.toLocaleString("en-IN")}</h3>
 <p className="text-[10px] text-muted mt-1">Pending collection reserves</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Overdue Invoices Count</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">{overdueCount} Invoices</h3>
 <p className="text-[10px] text-muted mt-1">Unpaid order checkouts</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Debtor Client Database</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">{sortedCustomersWithDue.length} Clients</h3>
 <p className="text-[10px] text-muted mt-1">Unique clients with balances</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Pipeline Recovery Rate</span>
 <h3 className="text-xl font-mono font-bold text-emerald-600 mt-2">{recoveryPct.toFixed(1)}%</h3>
 <p className="text-[10px] text-muted mt-1">Closed cash vs due ledger ratio</p>
 </div>
 </div>

 {/* Chart */}
 <div className="bg-card rounded-xl border border-default p-5 shadow-sm space-y-4">
 {renderChartSelector()}
 <div className="h-72 w-full">
 <ResponsiveContainer width="100%" height="100%">
 {renderStandardChart(trendsAndBreakdowns.months,"month","outstanding","Outstanding Dues (₹)","#f43f5e")}
 </ResponsiveContainer>
 </div>
 </div>

 {/* Due Ranking Split */}
 <div className="grid gap-6 md:grid-cols-3">
 <div className="bg-card border border-default rounded-xl p-5 space-y-3">
 <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">Outstanding by Customer</h3>
 <div className="space-y-2 max-h-68 overflow-y-auto pr-1">
 {sortedCustomersWithDue.map(c => (
 <div 
 key={c.name} 
 onClick={() => setInspectCustomerName(c.name)}
 className="flex justify-between items-center text-xs py-2 border-b border-default hover:bg-surface dark:hover:bg-zinc-800 cursor-pointer p-1 transition"
 >
 <div>
 <span className="font-semibold text-primary">{c.name}</span>
 <span className="text-[9px] text-muted block">{c.orders} invoices</span>
 </div>
 <span className="font-mono text-rose-500 font-bold">₹{c.outstanding.toLocaleString("en-IN")}</span>
 </div>
 ))}
 {sortedCustomersWithDue.length === 0 && (
 <p className="text-xs text-muted italic text-center py-4">No outstanding balances recorded!</p>
 )}
 </div>
 </div>

 <div className="md:col-span-2">
 {renderTableOfInvoices(filteredInvoices.filter(i => (i.balanceDue || 0) > 0))}
 </div>
 </div>
 </div>
 );
 }
 case"Discounts": {
 const discountCount = filteredInvoices.filter(i => i.discount && i.discount > 0).length;
 const discountPct = (metrics.discounts / (metrics.gross || 1)) * 100;
 return (
 <div className="space-y-6 animate-in fade-in duration-250">
 {/* Title Block */}
 <div className="bg-card p-5 border border-default rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-lg font-bold text-amber-600 font-sans">Applied Discounts & Promotions</h2>
 <p className="text-xs text-secondary">Summary and tracking of marketing campaigns, coupon claims, and manual cash adjustments.</p>
 </div>
 <button 
 onClick={() => setActiveModule(null)}
 className="cursor-pointer text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-default"
 >
 &larr; Back to Overview
 </button>
 </div>

 {/* Metrics */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Total Discounts Granted</span>
 <h3 className="text-xl font-mono font-bold text-amber-600 mt-2">₹{metrics.discounts.toLocaleString("en-IN")}</h3>
 <p className="text-[10px] text-muted mt-1">Capital given to client concessions</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Average Concession Ratio</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">{discountPct.toFixed(1)}%</h3>
 <p className="text-[10px] text-muted mt-1">Discount portion of total gross value</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Discounted Invoices Volume</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">{discountCount} Invoices</h3>
 <p className="text-[10px] text-muted mt-1">Orders claiming promotion codes</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Concession average</span>
 <h3 className="text-xl font-mono font-bold text-emerald-600 mt-2">₹{(metrics.discounts / (discountCount || 1)).toFixed(1)}</h3>
 <p className="text-[10px] text-muted mt-1">Average savings per promo order</p>
 </div>
 </div>

 {/* Interactive Graph */}
 <div className="bg-card rounded-xl border border-default p-5 shadow-sm space-y-4">
 {renderChartSelector()}
 <div className="h-72 w-full">
 <ResponsiveContainer width="100%" height="100%">
 {renderStandardChart(trendsAndBreakdowns.months,"month","discounts","Promo Concessions (₹)","#f59e0b")}
 </ResponsiveContainer>
 </div>
 </div>

 {renderTableOfInvoices(filteredInvoices.filter(i => (i.discount || 0) > 0))}
 </div>
 );
 }
 case"Refunds": {
 const cancelledCount = filteredInvoices.filter(i => i.status ==="Cancelled").length;
 return (
 <div className="space-y-6 animate-in fade-in duration-250">
 {/* Title Block */}
 <div className="bg-card p-5 border border-default rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-lg font-bold text-red-500 font-sans">Cancellation Refunds & Returns</h2>
 <p className="text-xs text-secondary">Review returned capital amounts and order cancellations ledgers.</p>
 </div>
 <button 
 onClick={() => setActiveModule(null)}
 className="cursor-pointer text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-default"
 >
 &larr; Back to Overview
 </button>
 </div>

 {/* Quick Metrics Grid */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Returned Capital Sum</span>
 <h3 className="text-xl font-mono font-bold text-red-500 mt-2">₹{metrics.refunds.toLocaleString("en-IN")}</h3>
 <p className="text-[10px] text-muted mt-1">Paid back refunds</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Cancelled Invoices Count</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">{cancelledCount} Bills</h3>
 <p className="text-[10px] text-muted mt-1">Voided transaction entries</p>
 </div>
 </div>

 {/* Graph */}
 <div className="bg-card rounded-xl border border-default p-5 shadow-sm space-y-4">
 {renderChartSelector()}
 <div className="h-72 w-full">
 <ResponsiveContainer width="100%" height="100%">
 {renderStandardChart(trendsAndBreakdowns.months,"month","refunds","Refunds Given (₹)","#ef4444")}
 </ResponsiveContainer>
 </div>
 </div>

 {renderTableOfInvoices(filteredInvoices.filter(i => i.status ==="Cancelled"))}
 </div>
 );
 }
 case"Corporate Retained": {
 const completedTotal = filteredInvoices.filter(i => i.status !=="Cancelled").reduce((acc, i) => acc + i.grandTotal, 0);
 const cancellationDeductions = filteredInvoices.filter(i => i.status ==="Cancelled").reduce((acc, i) => acc + (i.cancellationDeduction || 0), 0);
 return (
 <div className="space-y-6 animate-in fade-in duration-250">
 {/* Title Block */}
 <div className="bg-card p-5 border border-default rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-lg font-bold text-purple-600 font-sans">Corporate Retained Capital</h2>
 <p className="text-xs text-secondary">Summary of all funds permanently retained by the corporation, combining completed sales and void penalty logs.</p>
 </div>
 <button 
 onClick={() => setActiveModule(null)}
 className="cursor-pointer text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-default"
 >
 &larr; Back to Overview
 </button>
 </div>

 {/* Metrics */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Corporate Held Volume</span>
 <h3 className="text-xl font-mono font-bold text-purple-600 mt-2">₹{metrics.corporateRetained.toLocaleString("en-IN")}</h3>
 <p className="text-[10px] text-muted mt-1">Total permanent retained intake</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Fulfillment Base Intake</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">₹{completedTotal.toLocaleString("en-IN")}</h3>
 <p className="text-[10px] text-muted mt-1">Safe non-cancelled checkout value</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Retained Void Penalty intake</span>
 <h3 className="text-xl font-mono font-bold text-emerald-600 mt-2">₹{cancellationDeductions.toLocaleString("en-IN")}</h3>
 <p className="text-[10px] text-muted mt-1">Retained cancellation deduction reserves</p>
 </div>
 </div>

 {/* Graph */}
 <div className="bg-card rounded-xl border border-default p-5 shadow-sm space-y-4">
 {renderChartSelector()}
 <div className="h-72 w-full">
 <ResponsiveContainer width="100%" height="100%">
 {renderStandardChart(trendsAndBreakdowns.months,"month","corporateRetained","Corporate intake (₹)","#8b5cf6")}
 </ResponsiveContainer>
 </div>
 </div>

 {renderTableOfInvoices(filteredInvoices)}
 </div>
 );
 }
 case"Net Revenue": {
 const netOpRatio = (metrics.net / (metrics.gross || 1)) * 100;
 return (
 <div className="space-y-6 animate-in fade-in duration-250">
 {/* Title Block */}
 <div className="bg-card p-5 border border-default rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400 font-sans">Net Earnings Dashboard</h2>
 <p className="text-xs text-secondary">Aesthetic review of cash flow intake minus actual voided payments returned.</p>
 </div>
 <button 
 onClick={() => setActiveModule(null)}
 className="cursor-pointer text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-default"
 >
 &larr; Back to Overview
 </button>
 </div>

 {/* Metrics */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Net Operating Revenue</span>
 <h3 className="text-xl font-mono font-bold text-blue-600 mt-2">₹{metrics.net.toLocaleString("en-IN")}</h3>
 <p className="text-[10px] text-muted mt-1">Total revenue minus refunds</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Net Efficiency Ratio</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">{netOpRatio.toFixed(1)}%</h3>
 <p className="text-[10px] text-muted mt-1">Actual retained portion of gross checkouts</p>
 </div>
 </div>

 {/* Graph */}
 <div className="bg-card rounded-xl border border-default p-5 shadow-sm space-y-4">
 {renderChartSelector()}
 <div className="h-72 w-full">
 <ResponsiveContainer width="100%" height="100%">
 {renderStandardChart(trendsAndBreakdowns.months,"month","net","Net Income (₹)","#1d4ed8")}
 </ResponsiveContainer>
 </div>
 </div>

 {renderTableOfInvoices(filteredInvoices)}
 </div>
 );
 }
 case"Revenue Distribution": {
 // Render detailed distribution grouping cards
 return (
 <div className="space-y-6 animate-in fade-in duration-250">
 {/* Title Block */}
 <div className="bg-card p-5 border border-default rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-lg font-bold text-primary font-sans">Monthly & Period Revenue Distribution</h2>
 <p className="text-xs text-secondary">View periodic gross trends grouped dynamically by specified groupings (Daily, Weekly, Monthly, Quarterly, Yearly).</p>
 </div>
 <button 
 onClick={() => setActiveModule(null)}
 className="cursor-pointer text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-default"
 >
 &larr; Back to Overview
 </button>
 </div>

 {/* Toggles */}
 <div className="flex rounded-lg border border-default p-0.5 bg-surface text-[11px] font-bold font-mono w-fit">
 {(["Daily","Weekly","Monthly","Quarterly","Yearly"] as const).map(viewType => (
 <button
 key={viewType}
 onClick={() => handleDistributionViewChange(viewType)}
 className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
 distributionView === viewType 
 ?"bg-input text-blue-600 shadow" 
 :"text-secondary hover:text-primary"
 }`}
 >
 {viewType} Grouping
 </button>
 ))}
 </div>

 {/* Chart */}
 <div className="bg-card rounded-xl border border-default p-5 shadow-sm space-y-4">
 {renderChartSelector()}
 <div className="h-72 w-full">
 <ResponsiveContainer width="100%" height="100%">
 {renderStandardChart(trendsAndBreakdowns.months,"month","gross", `${distributionView} Gross Distribution (₹)`,"#3b82f6")}
 </ResponsiveContainer>
 </div>
 </div>

 {renderTableOfInvoices(filteredInvoices)}
 </div>
 );
 }
 case"Customer Analytics": {
 const repeatCount = trendsAndBreakdowns.customers.filter(c => c.orders > 1).length;
 const platinumCount = trendsAndBreakdowns.customers.filter(c => c.revenue > 30000).length;
 return (
 <div className="space-y-6 animate-in fade-in duration-250">
 {/* Title Block */}
 <div className="bg-card p-5 border border-default rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-lg font-bold text-purple-600 font-sans">Customer Lifecycle Dashboard</h2>
 <p className="text-xs text-secondary">Aesthetic overview of repeat client acquisition ratios, loyalty tier summaries, and ledger value rankings.</p>
 </div>
 <button 
 onClick={() => setActiveModule(null)}
 className="cursor-pointer text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-default"
 >
 &larr; Back to Overview
 </button>
 </div>

 {/* Metrics */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Registered Client Database</span>
 <h3 className="text-xl font-mono font-bold text-purple-600 mt-2">{fallbackCustomers.length} Clients</h3>
 <p className="text-[10px] text-muted mt-1">Unique contacts registered</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Repeat Buyer Clientele</span>
 <h3 className="text-xl font-mono font-bold text-blue-600 mt-2">{repeatCount} Clients</h3>
 <p className="text-[10px] text-muted mt-1">Buyers placing more than one deal</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Platinum Premium Accounts</span>
 <h3 className="text-xl font-mono font-bold text-emerald-600 mt-2">{platinumCount} Clients</h3>
 <p className="text-[10px] text-muted mt-1">Account checkouts exceeding ₹30k</p>
 </div>
 </div>

 {/* Customer ranking list and stats split */}
 <div className="grid gap-6 md:grid-cols-3">
 <div className="bg-card border border-default rounded-xl p-5 space-y-3">
 <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">Customer Value Ranking</h3>
 <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
 {trendsAndBreakdowns.customers.map((c, idx) => (
 <div 
 key={c.name} 
 onClick={() => setInspectCustomerName(c.name)}
 className="flex justify-between items-center text-xs py-2 border-b border-default hover:bg-surface dark:hover:bg-zinc-800 cursor-pointer p-1 transition"
 >
 <div className="flex items-center gap-1.5">
 <span className="text-[9px] font-mono text-muted bg-card-secondary dark:bg-zinc-800 px-1 py-0.25 rounded">#{idx+1}</span>
 <span className="font-semibold text-primary">{c.name}</span>
 </div>
 <span className="font-mono text-primary font-bold">₹{c.revenue.toLocaleString("en-IN")}</span>
 </div>
 ))}
 </div>
 </div>

 <div className="md:col-span-2 space-y-4">
 {renderTableOfInvoices(filteredInvoices)}
 </div>
 </div>
 </div>
 );
 }
 case"Product Analytics": {
 const topProduct = trendsAndBreakdowns.products[0]?.name ||"None Yet";
 const rawItemsCount = trendsAndBreakdowns.products.reduce((acc, p) => acc + p.quantity, 0);
 const totalItemsCount = Number.isFinite(rawItemsCount) ? rawItemsCount : 0;
 return (
 <div className="space-y-6 animate-in fade-in duration-250">
 {/* Title Block */}
 <div className="bg-card p-5 border border-default rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-lg font-bold text-emerald-600 font-sans">Product Catalog Performance Analytics</h2>
 <p className="text-xs text-secondary">In-depth tracking of top selling items, quantities, material categories, and stock availability.</p>
 </div>
 <button 
 onClick={() => setActiveModule(null)}
 className="cursor-pointer text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-default"
 >
 &larr; Back to Overview
 </button>
 </div>

 {/* Metrics */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Top Selling Product</span>
 <h3 className="text-base font-bold text-emerald-600 mt-2 truncate" title={topProduct}>{topProduct}</h3>
 <p className="text-[10px] text-muted mt-1">Highest billing generated</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Product Catalog DB</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">{fallbackProducts.length} Items</h3>
 <p className="text-[10px] text-muted mt-1">Unique products configured</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Physical Quantities sold</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">{totalItemsCount} Units</h3>
 <p className="text-[10px] text-muted mt-1">Total physical dispatch elements</p>
 </div>
 </div>

 {/* Product Rank Lists */}
 <div className="grid gap-6 md:grid-cols-3">
 <div className="bg-card border border-default rounded-xl p-5 space-y-3">
 <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">Item Sales Rankings</h3>
 <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
 {trendsAndBreakdowns.products.map((p, idx) => (
 <div 
 key={p.id} 
 onClick={() => setInspectProductName(p.name)}
 className="flex justify-between items-center text-xs py-2 border-b border-default hover:bg-surface dark:hover:bg-zinc-800 cursor-pointer p-1 transition"
 >
 <div className="flex items-center gap-1.5">
 <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-1 py-0.25 rounded">P{idx+1}</span>
 <div>
 <span className="font-semibold text-primary block truncate max-w-44">{p.name}</span>
 <span className="text-[9px] text-secondary block">{p.quantity} Units</span>
 </div>
 </div>
 <span className="font-mono text-primary font-bold">₹{p.revenue.toLocaleString("en-IN")}</span>
 </div>
 ))}
 {trendsAndBreakdowns.products.length === 0 && (
 <p className="text-xs text-muted italic text-center py-4">No product sales computed.</p>
 )}
 </div>
 </div>

 <div className="md:col-span-2 space-y-4">
 {renderTableOfInvoices(filteredInvoices)}
 </div>
 </div>
 </div>
 );
 }
 case"Weekly Bills": {
 const weeklyInvoices = filteredInvoices.filter(i => isDateInCurrentWeek(i.date));
 const weeklyRevenueSum = weeklyInvoices.reduce((acc, i) => acc + i.grandTotal, 0);
 const weeklyCompleted = weeklyInvoices.filter(i => i.status ==="Completed").length;
 return (
 <div className="space-y-6 animate-in fade-in duration-250">
 {/* Title Block */}
 <div className="bg-card p-5 border border-default rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-lg font-bold text-primary font-sans">Weekly Activity & Bills Ledger</h2>
 <p className="text-xs text-secondary">Summary of bills, transactions, and status distributions processed in the current calendar week.</p>
 </div>
 <button 
 onClick={() => setActiveModule(null)}
 className="cursor-pointer text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-default"
 >
 &larr; Back to Overview
 </button>
 </div>

 {/* Metrics */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Weekly Billing Volume</span>
 <h3 className="text-xl font-mono font-bold text-blue-600 mt-2">₹{weeklyRevenueSum.toLocaleString("en-IN")}</h3>
 <p className="text-[10px] text-muted mt-1">Value generated this week</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Bills Created (This Week)</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">{weeklyInvoices.length} Bills</h3>
 <p className="text-[10px] text-muted mt-1">Processed entries</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Completed Cycles (This Week)</span>
 <h3 className="text-xl font-mono font-bold text-emerald-600 mt-2">{weeklyCompleted} Invoices</h3>
 <p className="text-[10px] text-muted mt-1">Cycle-closed transactions</p>
 </div>
 </div>

 {renderTableOfInvoices(weeklyInvoices)}
 </div>
 );
 }
 case"Pending Deliveries": {
 const waitingDispatch = filteredInvoices.filter(i => i.status ==="Ready For Delivery" || i.status ==="Ready for Delivery");
 const delayedDeliveries = filteredInvoices.filter(i => {
 const elapsed = Math.floor((Date.now() - new Date(i.date).getTime()) / (1000 * 60 * 60 * 24));
 return elapsed > 7 && i.status !=="Completed" && i.status !=="Cancelled";
 });
 return (
 <div className="space-y-6 animate-in fade-in duration-250">
 {/* Title Block */}
 <div className="bg-card p-5 border border-default rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-lg font-bold text-blue-600 font-sans">Pending Deliveries & Dispatch Pipeline</h2>
 <p className="text-xs text-secondary">Fulfillment speed tracker, delayed queues, and packages ready for transport.</p>
 </div>
 <button 
 onClick={() => setActiveModule(null)}
 className="cursor-pointer text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-default"
 >
 &larr; Back to Overview
 </button>
 </div>

 {/* Metrics */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Ready For Delivery / Dispatch</span>
 <h3 className="text-xl font-mono font-bold text-blue-600 mt-2">{waitingDispatch.length} Cargoes</h3>
 <p className="text-[10px] text-muted mt-1">Waiting courier dispatch</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Delayed Dispatch Alert (&gt;7 Days)</span>
 <h3 className="text-xl font-mono font-bold text-rose-500 mt-2">{delayedDeliveries.length} Packages</h3>
 <p className="text-[10px] text-muted mt-1">Exceeded default prep windows</p>
 </div>
 </div>

 {renderTableOfInvoices(filteredInvoices.filter(i => i.status !=="Completed" && i.status !=="Cancelled"))}
 </div>
 );
 }
 case"Work In Progress": {
 const wipInvoices = filteredInvoices.filter(i => i.status ==="Work In Progress");
 const wipValue = wipInvoices.reduce((acc, i) => acc + i.grandTotal, 0);
 return (
 <div className="space-y-6 animate-in fade-in duration-250">
 {/* Title Block */}
 <div className="bg-card p-5 border border-default rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-lg font-bold text-amber-600 font-sans">Work In Progress Backlog Suite</h2>
 <p className="text-xs text-secondary">Summary and tracker for craft projects, representative backlogs, and expected delivery pipelines.</p>
 </div>
 <button 
 onClick={() => setActiveModule(null)}
 className="cursor-pointer text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-default"
 >
 &larr; Back to Overview
 </button>
 </div>

 {/* Metrics */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Active WIP Projects</span>
 <h3 className="text-xl font-mono font-bold text-amber-600 mt-2">{wipInvoices.length} orders</h3>
 <p className="text-[10px] text-muted mt-1">Actively being prepared/crafted</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Craft Backlog Financial Value</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">₹{wipValue.toLocaleString("en-IN")}</h3>
 <p className="text-[10px] text-muted mt-1">Pending fulfillment release</p>
 </div>
 </div>

 {renderTableOfInvoices(wipInvoices)}
 </div>
 );
 }
 case"Ready For Delivery": {
 const readyInvoices = filteredInvoices.filter(i => i.status ==="Ready For Delivery" || i.status ==="Ready for Delivery");
 const readyValue = readyInvoices.reduce((acc, i) => acc + i.grandTotal, 0);
 return (
 <div className="space-y-6 animate-in fade-in duration-250">
 {/* Title Block */}
 <div className="bg-card p-5 border border-default rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-lg font-bold text-blue-600 font-sans">Ready For Delivery Packages</h2>
 <p className="text-xs text-secondary">Telemetry for parcels securely packed and cleared for transport and client handovers.</p>
 </div>
 <button 
 onClick={() => setActiveModule(null)}
 className="cursor-pointer text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-default"
 >
 &larr; Back to Overview
 </button>
 </div>

 {/* Metrics */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Parcels cleared for Handover</span>
 <h3 className="text-xl font-mono font-bold text-blue-600 mt-2">{readyInvoices.length} Cargoes</h3>
 <p className="text-[10px] text-muted mt-1">Packages labeled and waiting Courier</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Ready Cargo Valuation</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">₹{readyValue.toLocaleString("en-IN")}</h3>
 <p className="text-[10px] text-muted mt-1">Completed inventory ready to clear</p>
 </div>
 </div>

 {renderTableOfInvoices(readyInvoices)}
 </div>
 );
 }
 case"Completed Cycles": {
 const completedInvoices = filteredInvoices.filter(i => i.status ==="Completed");
 const completedValue = completedInvoices.reduce((acc, i) => acc + i.grandTotal, 0);
 return (
 <div className="space-y-6 animate-in fade-in duration-250">
 {/* Title Block */}
 <div className="bg-card p-5 border border-default rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-lg font-bold text-emerald-600 font-sans">Completed Billing Cycles</h2>
 <p className="text-xs text-secondary">Historical ledger archives of orders completely fulfilled and fully completed.</p>
 </div>
 <button 
 onClick={() => setActiveModule(null)}
 className="cursor-pointer text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-default"
 >
 &larr; Back to Overview
 </button>
 </div>

 {/* Metrics */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Closed Cycle transactions</span>
 <h3 className="text-xl font-mono font-bold text-emerald-600 mt-2">{completedInvoices.length} Invoices</h3>
 <p className="text-[10px] text-muted mt-1">Perfect closed deals archive</p>
 </div>
 <div className="p-4 border border-default bg-card rounded-xl shadow-sm">
 <span className="text-[10px] font-bold text-secondary uppercase block">Secured Revenue intake</span>
 <h3 className="text-xl font-mono font-bold text-primary mt-2">₹{completedValue.toLocaleString("en-IN")}</h3>
 <p className="text-[10px] text-muted mt-1">Completed order gross</p>
 </div>
 </div>

 {renderTableOfInvoices(completedInvoices)}
 </div>
 );
 }
 default:
 return null;
 }
 };

 return (
 <div id="revenue-explorer-tab" className="space-y-6">
 
 {/* HEADER SECTION WITH FILTER DROPDOWN & BREADCRUMBS */}
 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card p-4 rounded-xl border border-default shadow-sm">
 <div>
 <div className="flex items-center gap-2">
 <TrendingUp className="h-5 w-5 text-blue-600" />
 <h1 className="text-xl font-bold tracking-tight text-primary font-sans leading-none">Enterprise Analytics Explorer</h1>
 </div>
 <p className="text-xs text-secondary mt-1">Multi-dimensional operational tracking and dynamic drill-downs.</p>
 </div>

 {/* Global Controls */}
 <div className="flex flex-wrap items-center gap-2">
 {/* Preset Buttons */}
 <div className="flex rounded-lg border border-default p-0.5 bg-surface text-[11px] font-bold font-mono">
 {(["Today","This Week","This Month","6 Months","This Year","All Time"] as DatePreset[]).map((preset) => (
 <button
 key={preset}
 onClick={() => handleDatePresetChange(preset)}
 className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
 datePreset === preset 
 ?"bg-input text-blue-600 shadow" 
 :"text-secondary hover:text-primary hover:bg-gray-200 dark:hover:bg-card"
 }`}
 >
 {preset}
 </button>
 ))}
 </div>

 <button
 onClick={() => setShowFilters(!showFilters)}
 className={`cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
 showFilters || filterAgent || filterCategory || filterInvoiceStatus || filterPaymentStatus || filterProduct || filterStockStatus
 ?"bg-blue-600 text-white border-blue-600"
 :"bg-card text-secondary border-default hover:bg-card-secondary dark:hover:bg-card"
 }`}
 >
 <Filter className="h-3.5 w-3.5" />
 <span>Filters</span>
 </button>

 <button
 onClick={downloadPDFLedger}
 className="cursor-pointer inline-flex items-center gap-1 bg-card text-secondary border border-default hover:bg-card-secondary dark:hover:bg-card px-3 py-1.5 text-xs font-semibold rounded-lg transition"
 title="Export beautiful PDF report"
 >
 <Printer className="h-3.5 w-3.5 text-blue-500" />
 <span>Export PDF</span>
 </button>

 <button
 onClick={downloadCSV}
 className="cursor-pointer inline-flex items-center gap-1 bg-card text-secondary border border-default hover:bg-card-secondary dark:hover:bg-card px-3 py-1.5 text-xs font-semibold rounded-lg transition"
 title="Download CSV spreadsheet"
 >
 <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
 <span>Export CSV</span>
 </button>
 </div>
 </div>

 {/* EXPANDABLE MULTI-FACETED ADVANCED FILTERS PANEL */}
 {(showFilters || filterAgent || filterCategory || filterInvoiceStatus || filterGstType || filterPaymentStatus || filterProduct || filterStockStatus) && (
 <div className="bg-surface/40 p-5 rounded-xl border border-default shadow-inner grid gap-4 grid-cols-2 md:grid-cols-4 animate-in fade-in slide-in-from-top-3 duration-200">
 <div>
 <label className="text-[10px] uppercase font-bold text-secondary tracking-wider block mb-1">Customer Filter</label>
 <input
 type="text"
 placeholder="Search Customer name..."
 value={filterCustomer}
 onChange={(e) => setFilterCustomer(e.target.value)}
 className="w-full rounded-lg border border-default bg-card px-3 py-1.5 text-xs text-primary focus:border-blue-500 outline-none"
 />
 </div>

 <div>
 <label className="text-[10px] uppercase font-bold text-secondary tracking-wider block mb-1">Representative Agent</label>
 <select
 value={filterAgent}
 onChange={(e) => setFilterAgent(e.target.value)}
 className="w-full rounded-lg border border-default bg-card px-2.5 py-1.5 text-xs text-primary focus:border-blue-500 outline-none cursor-pointer"
 >
 <option value="">All Representatives</option>
 {filterOptions.agents.map(ag => (
 <option key={ag} value={ag}>{ag}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="text-[10px] uppercase font-bold text-secondary tracking-wider block mb-1">Product Filter</label>
 <select
 value={filterProduct}
 onChange={(e) => setFilterProduct(e.target.value)}
 className="w-full rounded-lg border border-default bg-card px-2.5 py-1.5 text-xs text-primary focus:border-blue-500 outline-none cursor-pointer"
 >
 <option value="">All Products</option>
 {filterOptions.productsList.map(p => (
 <option key={p.id} value={p.id}>{p.name}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="text-[10px] uppercase font-bold text-secondary tracking-wider block mb-1">Material/Category</label>
 <select
 value={filterCategory}
 onChange={(e) => setFilterCategory(e.target.value)}
 className="w-full rounded-lg border border-default bg-card px-2.5 py-1.5 text-xs text-primary focus:border-blue-500 outline-none cursor-pointer"
 >
 <option value="">All Categories</option>
 {filterOptions.categories.map(c => (
 <option key={c} value={c}>{c}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="text-[10px] uppercase font-bold text-secondary tracking-wider block mb-1">Payment Status</label>
 <select
 value={filterPaymentStatus}
 onChange={(e) => setFilterPaymentStatus(e.target.value)}
 className="w-full rounded-lg border border-default bg-card px-2.5 py-1.5 text-xs text-primary focus:border-blue-500 outline-none cursor-pointer"
 >
 <option value="">All Payment Statuses</option>
 <option value="Paid">Paid Only</option>
 <option value="Partially Paid">Partially Paid</option>
 <option value="Balance Pending">Balance Pending</option>
 </select>
 </div>

 <div>
 <label className="text-[10px] uppercase font-bold text-secondary tracking-wider block mb-1">Invoice / Delivery Status</label>
 <select
 value={filterInvoiceStatus}
 onChange={(e) => setFilterInvoiceStatus(e.target.value)}
 className="w-full rounded-lg border border-default bg-card px-2.5 py-1.5 text-xs text-primary focus:border-blue-500 outline-none cursor-pointer"
 >
 <option value="">All Statuses</option>
 <option value="Completed">Completed / Delivered</option>
 <option value="Work In Progress">Work In Progress</option>
 <option value="Ready For Delivery">Ready For Delivery / Dispatch</option>
 <option value="Cancelled">Cancelled Only</option>
 </select>
 </div>

 <div>
 <label className="text-[10px] uppercase font-bold text-secondary tracking-wider block mb-1">Product Stock Level</label>
 <select
 value={filterStockStatus}
 onChange={(e) => setFilterStockStatus(e.target.value)}
 className="w-full rounded-lg border border-default bg-card px-2.5 py-1.5 text-xs text-primary focus:border-blue-500 outline-none cursor-pointer"
 >
 <option value="">Any Stock Status</option>
 <option value="In Stock">In Stock (&gt;10)</option>
 <option value="Low Stock">Low Stock (1-10)</option>
 <option value="Out of Stock">Out of Stock (=0)</option>
 </select>
 </div>

 <div className="flex items-end">
 <button
 onClick={() => {
 setFilterCustomer("");
 setFilterAgent("");
 setFilterProduct("");
 setFilterCategory("");
 setFilterPaymentStatus("");
 setFilterInvoiceStatus("");
 setFilterStockStatus("");
 setFilterGstType("");
 }}
 className="w-full text-center py-1.5 text-xs font-bold font-sans text-rose-500 border border-rose-500/30 rounded-lg hover:bg-rose-50/50 hover:border-rose-500 transition cursor-pointer"
 >
 Reset All Filters
 </button>
 </div>
 </div>
 )}

 {/* ENTERPRISE REVENUE ANALYTICS SUB-TAB BAR */}
 <div className="border-b border-default select-none bg-card p-2 px-4 rounded-xl shadow-sm border flex flex-wrap gap-1 md:gap-2">
 {[
 { key:"Overview", label:"Overview", active: activeModule === null, onClick: () => { setActiveModule(null); handleResetDrilldown(); } },
 { key:"Gross Revenue", label:"Gross Revenue", active: activeModule ==="Gross Revenue", onClick: () => { setActiveModule("Gross Revenue"); handleResetDrilldown(); } },
 { key:"GST Collected", label:"GST Collected", active: activeModule ==="GST Collected", onClick: () => { setActiveModule("GST Collected"); handleResetDrilldown(); } },
 { key:"Amount Received", label:"Amount Received", active: activeModule ==="Amount Received", onClick: () => { setActiveModule("Amount Received"); handleResetDrilldown(); } },
 ].concat(
 (activeModule && activeModule !=="Gross Revenue" && activeModule !=="GST Collected" && activeModule !=="Amount Received") ? [{
 key: activeModule,
 label: activeModule,
 active: true,
 onClick: () => {}
 }] : []
 ).map((tab) => {
 return (
 <button
 key={tab.key}
 onClick={tab.onClick}
 className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all transition-colors cursor-pointer outline-none ${
 tab.active
 ?"bg-blue-600 text-white shadow-sm font-bold"
 :"text-secondary hover:text-primary hover:bg-card-secondary dark:hover:bg-zinc-800"
 }`}
 >
 {tab.label}
 </button>
 );
 })}
 </div>

 {/* DYNAMIC NAVIGATION BREADCRUMBS RAIL (SECTION 18) */}
 {/* DYNAMIC NAVIGATION BREADCRUMBS RAIL */}
 <div id="breadcrumb-navigation" className="flex flex-wrap items-center gap-1.5 text-xs bg-surface border border-default p-3 rounded-lg select-none">
 <button 
 onClick={() => onNavigateToTab?.("dashboard")}
 className="text-secondary hover:text-blue-500 font-medium hover:underline transition"
 >
 Dashboard
 </button>
 <ChevronRight className="h-3 w-3 text-muted/60" />
 <button 
 onClick={() => {
 setActiveModule(null);
 handleResetDrilldown();
 }}
 className={`font-medium hover:underline transition ${!activeModule ?"text-primary font-bold" :"text-secondary hover:text-blue-500"}`}
 >
 Revenue Analytics
 </button>
 
 {activeModule && (
 <>
 <ChevronRight className="h-3 w-3 text-muted/60" />
 <button 
 onClick={() => {
 handleResetDrilldown();
 }}
 className={`font-semibold hover:underline ${!selectedMonth ?"text-primary font-bold" :"text-blue-600"}`}
 >
 {activeModule}
 </button>
 </>
 )}

 {selectedMonth && (
 <>
 <ChevronRight className="h-3 w-3 text-muted/60" />
 <button 
 onClick={() => navigateBackIndex(1)}
 className={`font-semibold hover:underline ${!selectedCustomerName ?"text-primary font-bold" :"text-blue-600"}`}
 >
 {selectedMonth}
 </button>
 </>
 )}

 {selectedCustomerName && (
 <>
 <ChevronRight className="h-3 w-3 text-muted/60" />
 <button 
 onClick={() => navigateBackIndex(2)}
 className={`font-semibold hover:underline ${!selectedInvoiceNo ?"text-primary font-bold" :"text-blue-600"}`}
 >
 {selectedCustomerName}
 </button>
 </>
 )}

 {selectedInvoiceNo && (
 <>
 <ChevronRight className="h-3 w-3 text-muted/60" />
 <span className="text-primary font-bold font-mono">Invoice #{selectedInvoiceNo}</span>
 </>
 )}
 </div>

 {activeModule ? (
 renderActiveModuleContent()
 ) : (
 <>
 {/* UNIVERSAL CORE STATS GRID CARDS (CLICKABLE WITH ANIMATIONS AND TOOLTIPS) */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
 
 {/* CARD 1: GROSS REVENUE */}
 <div 
 onClick={() => {
 setActiveModule("Gross Revenue");
 handleResetDrilldown();
 }}
 className={`cursor-pointer rounded-xl border p-5 shadow-sm transition-all duration-200 group relative ${
 activeModule ==="Gross Revenue" 
 ?"border-emerald-600 bg-emerald-500/5 shadow-md" 
 :"border-default bg-card hover:border-emerald-500 hover:shadow-md hover:scale-[1.01]"
 }`}
 title="Click to view details"
 >
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold uppercase tracking-wider text-secondary group-hover:text-primary transition-colors">Gross Revenue</span>
 <div className="h-7 w-7 rounded bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
 <Coins className="h-4 w-4" />
 </div>
 </div>
 <h3 className="text-xl font-bold tracking-tight text-primary font-mono mt-3 group-hover:text-blue-600 transition-colors" title={`₹${metrics.gross.toFixed(2)}`}>
 ₹{formatIndianCurrencyShort(metrics.gross)}
 </h3>
 <p className="text-[10px] text-muted mt-1">Total checkout value generated</p>
 </div>

 {/* CARD 2: GST COLLECTED */}
 <div 
 onClick={() => {
 setActiveModule("GST Collected");
 handleResetDrilldown();
 }}
 className={`cursor-pointer rounded-xl border p-5 shadow-sm transition-all duration-200 group relative ${
 activeModule ==="GST Collected" 
 ?"border-emerald-600 bg-emerald-500/5 shadow-md" 
 :"border-default bg-card hover:border-emerald-500 hover:shadow-md hover:scale-[1.01]"
 }`}
 title="Click to view details"
 >
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold uppercase tracking-wider text-secondary group-hover:text-primary transition-colors">GST Collected</span>
 <div className="h-7 w-7 rounded bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
 <Building className="h-4 w-4" />
 </div>
 </div>
 <h3 className="text-xl font-bold tracking-tight text-emerald-600 font-mono mt-3" title={`₹${metrics.gstCollected.toFixed(2)}`}>
 ₹{formatIndianCurrencyShort(metrics.gstCollected)}
 </h3>
 <p className="text-[10px] text-muted mt-1">All State CGST+SGST+IGST</p>
 </div>

 {/* CARD 3: AMOUNT RECEIVED */}
 <div 
 onClick={() => {
 setActiveModule("Amount Received");
 handleResetDrilldown();
 }}
 className={`cursor-pointer rounded-xl border p-5 shadow-sm transition-all duration-200 group relative ${
 activeModule ==="Amount Received" 
 ?"border-emerald-600 bg-emerald-500/5 shadow-md" 
 :"border-default bg-card hover:border-emerald-500 hover:shadow-md hover:scale-[1.01]"
 }`}
 title="Click to view details"
 >
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold uppercase tracking-wider text-secondary group-hover:text-primary transition-colors">Amount Received</span>
 <div className="h-7 w-7 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
 <IndianRupee className="h-4 w-4" />
 </div>
 </div>
 <h3 className="text-xl font-bold tracking-tight text-emerald-600 font-mono mt-3" title={`₹${metrics.amountReceived.toFixed(2)}`}>
 ₹{formatIndianCurrencyShort(metrics.amountReceived)}
 </h3>
 <p className="text-[10px] text-muted mt-1">Total payments collected</p>
 </div>

 {/* CARD 4: OUTSTANDING BALANCE */}
 <div 
 onClick={() => {
 setActiveModule("Outstanding Balance");
 handleResetDrilldown();
 }}
 className={`cursor-pointer rounded-xl border p-5 shadow-sm transition-all duration-200 group relative ${
 activeModule ==="Outstanding Balance" 
 ?"border-rose-600 bg-rose-500/5 shadow-md" 
 :"border-default bg-card hover:border-rose-500 hover:shadow-md hover:scale-[1.01]"
 }`}
 title="Click to view details"
 >
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold uppercase tracking-wider text-secondary group-hover:text-primary transition-colors">Outstanding Balance</span>
 <div className="h-7 w-7 rounded bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
 <RotateCcw className="h-4 w-4" />
 </div>
 </div>
 <h3 className="text-xl font-bold tracking-tight text-rose-500 font-mono mt-3" title={`₹${metrics.outstandingBalance.toFixed(2)}`}>
 ₹{formatIndianCurrencyShort(metrics.outstandingBalance)}
 </h3>
 <p className="text-[10px] text-muted mt-1">Total pending installments</p>
 </div>

 {/* CARD 5: DISCOUNTS */}
 <div 
 onClick={() => {
 setActiveModule("Discounts");
 handleResetDrilldown();
 }}
 className={`cursor-pointer rounded-xl border p-5 shadow-sm transition-all duration-200 group relative ${
 activeModule ==="Discounts" 
 ?"border-amber-600 bg-amber-50/5 shadow-md" 
 :"border-default bg-card hover:border-amber-500 hover:shadow-md hover:scale-[1.01]"
 }`}
 title="Click to view details"
 >
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold uppercase tracking-wider text-secondary group-hover:text-primary transition-colors">Discounts Applied</span>
 <div className="h-7 w-7 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
 <Percent className="h-4 w-4" />
 </div>
 </div>
 <h3 className="text-xl font-bold tracking-tight text-primary font-mono mt-3 group-hover:text-amber-600 transition-colors" title={`-₹${metrics.discounts.toFixed(2)}`}>
 -₹{formatIndianCurrencyShort(metrics.discounts)}
 </h3>
 <p className="text-[10px] text-muted mt-1">Promo discounts authorized</p>
 </div>

 {/* CARD 6: REFUNDS */}
 <div 
 onClick={() => {
 setActiveModule("Refunds");
 handleResetDrilldown();
 }}
 className={`cursor-pointer rounded-xl border p-5 shadow-sm transition-all duration-200 group relative ${
 activeModule ==="Refunds" 
 ?"border-red-600 bg-red-500/5 shadow-md" 
 :"border-default bg-card hover:border-red-500 hover:shadow-md hover:scale-[1.01]"
 }`}
 title="Click to view details"
 >
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold uppercase tracking-wider text-secondary group-hover:text-primary transition-colors">Cancellation Refunds</span>
 <div className="h-7 w-7 rounded bg-red-500/10 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
 <RotateCcw className="h-4 w-4" />
 </div>
 </div>
 <h3 className="text-xl font-bold tracking-tight text-primary font-mono mt-3 group-hover:text-red-500 transition-colors" title={`-₹${metrics.refunds.toFixed(2)}`}>
 -₹{formatIndianCurrencyShort(metrics.refunds)}
 </h3>
 <p className="text-[10px] text-muted mt-1">Returned client capital</p>
 </div>

 {/* CARD 7: COMPANY RETAINED */}
 <div 
 onClick={() => {
 setActiveModule("Corporate Retained");
 handleResetDrilldown();
 }}
 className={`cursor-pointer rounded-xl border p-5 shadow-sm transition-all duration-200 group relative ${
 activeModule ==="Corporate Retained" 
 ?"border-purple-600 bg-purple-500/5 shadow-md" 
 :"border-default bg-card hover:border-purple-500 hover:shadow-md hover:scale-[1.01]"
 }`}
 title="Click to view details"
 >
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold uppercase tracking-wider text-secondary group-hover:text-primary transition-colors">Corporate Retained</span>
 <div className="h-7 w-7 rounded bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
 <Building className="h-4 w-4" />
 </div>
 </div>
 <h3 className="text-xl font-bold tracking-tight text-primary font-mono mt-3 group-hover:text-purple-600 transition-colors" title={`₹${metrics.corporateRetained.toFixed(2)}`}>
 ₹{formatIndianCurrencyShort(metrics.corporateRetained)}
 </h3>
 <p className="text-[10px] text-muted mt-1">Intake plus cancellation status</p>
 </div>

 {/* CARD 8: NET REVENUE */}
 <div 
 onClick={() => {
 setActiveModule("Net Revenue");
 handleResetDrilldown();
 }}
 className={`cursor-pointer rounded-xl border p-5 shadow-sm transition-all duration-200 group relative ${
 activeModule ==="Net Revenue" 
 ?"bg-blue-600/5 border-blue-600 shadow-md" 
 :"border-default bg-card hover:border-blue-600 hover:shadow-md hover:scale-[1.01]"
 }`}
 title="Click to view details"
 >
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Net Revenue</span>
 <div className="h-7 w-7 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow group-hover:scale-110 transition-transform">
 ★
 </div>
 </div>
 <h3 className="text-xl font-bold tracking-tight text-blue-700 dark:text-blue-400 font-mono mt-3" title={`₹${metrics.net.toFixed(2)}`}>
 ₹{formatIndianCurrencyShort(metrics.net)}
 </h3>
 <p className="text-[10px] text-blue-500/80 mt-1">Gross sales minus cancellation refunds</p>
 </div>
 </div>

 {/* UNIVERSAL ANALYTICS SMART SEARCH ROW */}
 <div className="relative">
 <div className="relative">
 <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted" />
 <input
 type="text"
 placeholder="Universal Analytics Search (Customer Name, Product, Invoice#, Agent, Mobile, Color, Category...)"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full rounded-xl border border-default bg-card pl-10 pr-4 py-2.5 text-xs text-primary focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm transition-colors"
 />
 </div>

 {/* Dropdown with instant entities matches (Section 14 UI) */}
 {universalSearchMatches && (
 <div className="absolute left-0 right-0 top-12 z-20 bg-card rounded-xl border border-default shadow-xl max-h-80 overflow-y-auto p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
 <div className="text-[10px] uppercase font-bold tracking-wider text-muted">UNIVERSAL MATCHED ENTITIES</div>
 
 {/* Matches details */}
 <div className="grid gap-3 sm:grid-cols-3">
 {/* Customers matches */}
 <div>
 <div className="text-[9px] uppercase font-bold text-secondary flex items-center gap-1 mb-1">
 <Users className="h-3 w-3 text-purple-500" />
 <span>Customers</span>
 </div>
 {universalSearchMatches.customers.length === 0 ? (
 <p className="text-[11px] text-muted italic">No customer matches</p>
 ) : (
 <div className="space-y-1">
 {universalSearchMatches.customers.map(c => (
 <div 
 key={c.id} 
 onClick={() => {
 setInspectCustomerName(c.name);
 setSearchQuery("");
 }}
 className="p-1 px-2 text-[11px] font-semibold text-primary rounded hover:bg-blue-50 dark:hover:bg-zinc-800 cursor-pointer flex justify-between items-center transition"
 >
 <span>{c.name}</span>
 <ArrowUpRight className="h-3 w-3 text-secondary" />
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Products matches */}
 <div>
 <div className="text-[9px] uppercase font-bold text-secondary flex items-center gap-1 mb-1">
 <Package className="h-3 w-3 text-blue-500" />
 <span>Products</span>
 </div>
 {universalSearchMatches.products.length === 0 ? (
 <p className="text-[11px] text-muted italic">No product matches</p>
 ) : (
 <div className="space-y-1">
 {universalSearchMatches.products.map(p => (
 <div 
 key={p.id} 
 onClick={() => {
 setInspectProductName(p.name);
 setSearchQuery("");
 }}
 className="p-1 px-2 text-[11px] font-semibold text-primary rounded hover:bg-blue-50 dark:hover:bg-zinc-800 cursor-pointer flex justify-between items-center transition"
 >
 <span>{p.name}</span>
 <ArrowUpRight className="h-3 w-3 text-secondary" />
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Invoices matches */}
 <div>
 <div className="text-[9px] uppercase font-bold text-secondary flex items-center gap-1 mb-1">
 <FileText className="h-3 w-3 text-emerald-500" />
 <span>Invoices</span>
 </div>
 {universalSearchMatches.invoices.length === 0 ? (
 <p className="text-[11px] text-muted italic">No invoice matches</p>
 ) : (
 <div className="space-y-1">
 {universalSearchMatches.invoices.map(i => (
 <div 
 key={i.invoiceNo} 
 onClick={() => {
 setInspectInvoiceNo(i.invoiceNo);
 setSearchQuery("");
 }}
 className="p-1 px-2 text-[11px] font-semibold text-primary rounded hover:bg-blue-50 dark:hover:bg-zinc-800 cursor-pointer flex justify-between items-center transition"
 >
 <span className="font-mono">{i.invoiceNo} ({i.customerName})</span>
 <ArrowUpRight className="h-3 w-3 text-secondary" />
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </div>

 {/* DYNAMIC WORKSPACE EXPLORER VIEWS */}
 <div className="grid gap-6 lg:grid-cols-3">
 
 {/* VIEW 1: DYNAMICAL TRENDS CHART CONTAINER (SPAN COLUMN 2 IN DESKTOP) */}
 <div className="lg:col-span-2 bg-card rounded-xl border border-default p-5 shadow-sm space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-default pb-3 gap-2">
 <div>
 <h2 className="font-bold text-primary font-sans text-sm">
 {activeModule ||"Corporate Overall Sales"} Dynamics Trend
 </h2>
 <p className="text-[10px] text-secondary">
 Graphing computed active invoices grouped by timing thresholds.
 </p>
 </div>
 {/* Chart controls */}
 <div className="flex items-center gap-1 bg-surface p-0.5 rounded-lg border border-default text-[10px] font-bold">
 {(["Bar","Line","Area"] as const).map(type => (
 <button
 key={type}
 onClick={() => setChartType(type)}
 className={`px-2.5 py-1 rounded transition cursor-pointer ${
 chartType === type 
 ?"bg-input text-blue-600 shadow" 
 :"text-secondary hover:text-primary"
 }`}
 >
 {type}
 </button>
 ))}
 </div>
 </div>

 {/* RENDERING THE RECHARTS GRAPHS DYNAMICALLY BASED ON ACTIVE MODULE */}
 <div className="h-68 w-full select-none">
 <ResponsiveContainer width="100%" height="100%">
 {chartType ==="Bar" ? (
 <BarChart data={trendsAndBreakdowns.months}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
 <XAxis dataKey="month" stroke="#888888" fontSize={9} />
 <YAxis stroke="#888888" fontSize={9} />
 <Tooltip content={<CustomChartTooltip />} cursor={{ fill:"rgba(0,0,0,0.03)" }} />
 <Legend wrapperStyle={{ fontSize: 10 }} />
 {(!activeModule || activeModule ==="Gross Revenue") && <Bar dataKey="gross" name="Gross Revenue (₹)" fill="#3b82f6" radius={[4, 4, 0, 0]} />}
 {activeModule ==="GST Collected" && <Bar dataKey="gst" name="GST Collected (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />}
 {activeModule ==="Amount Received" && <Bar dataKey="received" name="Amount Received (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />}
 {activeModule ==="Outstanding Balance" && <Bar dataKey="outstanding" name="Outstanding Balance (₹)" fill="#f43f5e" radius={[4, 4, 0, 0]} />}
 {activeModule ==="Discounts" && <Bar dataKey="discounts" name="Discounts (₹)" fill="#f59e0b" radius={[4, 4, 0, 0]} />}
 {activeModule ==="Refunds" && <Bar dataKey="refunds" name="Refunds Paid (₹)" fill="#ef4444" radius={[4, 4, 0, 0]} />}
 {activeModule ==="Corporate Retained" && <Bar dataKey="corporateRetained" name="Corporate Intake (₹)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />}
 {activeModule ==="Net Revenue" && <Bar dataKey="net" name="Net Revenue (₹)" fill="#1d4ed8" radius={[4, 4, 0, 0]} />}
 </BarChart>
 ) : chartType ==="Line" ? (
 <LineChart data={trendsAndBreakdowns.months}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
 <XAxis dataKey="month" stroke="#888888" fontSize={9} />
 <YAxis stroke="#888888" fontSize={9} />
 <Tooltip content={<CustomChartTooltip />} />
 <Legend wrapperStyle={{ fontSize: 10 }} />
 {(!activeModule || activeModule ==="Gross Revenue") && <Line type="monotone" dataKey="gross" name="Gross Revenue (₹)" stroke="#3b82f6" strokeWidth={2} />}
 {activeModule ==="GST Collected" && <Line type="monotone" dataKey="gst" name="GST Collected (₹)" stroke="#10b981" strokeWidth={2} />}
 {activeModule ==="Amount Received" && <Line type="monotone" dataKey="received" name="Amount Received (₹)" stroke="#10b981" strokeWidth={2} />}
 {activeModule ==="Outstanding Balance" && <Line type="monotone" dataKey="outstanding" name="Outstanding Balance (₹)" stroke="#f43f5e" strokeWidth={2} />}
 {activeModule ==="Discounts" && <Line type="monotone" dataKey="discounts" name="Discounts (₹)" stroke="#f59e0b" strokeWidth={2} />}
 {activeModule ==="Refunds" && <Line type="monotone" dataKey="refunds" name="Refunds (₹)" stroke="#ef4444" strokeWidth={2} />}
 {activeModule ==="Corporate Retained" && <Line type="monotone" dataKey="corporateRetained" name="Corporate (₹)" stroke="#8b5cf6" strokeWidth={2} />}
 {activeModule ==="Net Revenue" && <Line type="monotone" dataKey="net" name="Net Revenue (₹)" stroke="#1d4ed8" strokeWidth={2} />}
 </LineChart>
 ) : (
 <AreaChart data={trendsAndBreakdowns.months}>
 <defs>
 <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
 <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
 <XAxis dataKey="month" stroke="#888888" fontSize={9} />
 <YAxis stroke="#888888" fontSize={9} />
 <Tooltip content={<CustomChartTooltip />} />
 <Area type="monotone" dataKey={
 !activeModule || activeModule ==="Gross Revenue" ?"gross" :
 activeModule ==="GST Collected" ?"gst" :
 activeModule ==="Amount Received" ?"received" :
 activeModule ==="Outstanding Balance" ?"outstanding" :
 activeModule ==="Discounts" ?"discounts" :
 activeModule ==="Refunds" ?"refunds" :
 activeModule ==="Corporate Retained" ?"corporateRetained" :"net"
 } name="Aggregate" stroke="#2563eb" fillOpacity={1} fill="url(#chartGrad)" />
 </AreaChart>
 )}
 </ResponsiveContainer>
 </div>
 </div>

 {/* DETAILS GRID COLUMN 3: CATEGORIES AND LEADERBOARD (BENTO-STYLE SECTIONS) */}
 <div className="bg-card rounded-xl border border-default p-5 shadow-sm space-y-4">
 <div>
 <h2 className="font-bold text-primary font-sans text-sm">Revenue by Material Category</h2>
 <p className="text-[10px] text-secondary">Categorized listing of materials sold.</p>
 </div>
 
 <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
 {trendsAndBreakdowns.categories.map((cat) => {
 const maxVal = trendsAndBreakdowns.categories[0]?.revenue || 1;
 const pct = (cat.revenue / maxVal) * 100;
 return (
 <div key={cat.name} className="space-y-1">
 <div className="flex justify-between text-xs">
 <span className="font-semibold text-primary">{cat.name ||"Default Category"}</span>
 <span className="font-mono text-secondary">₹{cat.revenue.toFixed(2)} ({cat.count} units)</span>
 </div>
 <div className="w-full bg-card-secondary dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
 <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${pct}%` }}></div>
 </div>
 </div>
 );
 })}
 {trendsAndBreakdowns.categories.length === 0 && (
 <p className="text-xs text-muted italic text-center py-4">No product category billing records found.</p>
 )}
 </div>
 </div>
 </div>

 {/* CORE DRILL-DOWN AND SUB-SECTION LEDGERS CHANGER */}
 <div className="bg-card rounded-xl border border-default p-5 shadow-sm space-y-4">
 
 {/* Dynamic Drill Down headers */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-default pb-3 gap-2">
 <div>
 <h2 className="font-bold text-primary font-sans text-sm">
 {!selectedMonth ?"Monthly Contributions" : 
 !selectedCustomerName ? `${selectedMonth} Client Contributors` : 
 `${selectedCustomerName} Invoices Ledger in ${selectedMonth}`}
 </h2>
 <p className="text-[10px] text-secondary">
 {!selectedMonth ?"Click on a Month below to filter and drill down customers" :
 !selectedCustomerName ?"Click a customer to view their precise invoices list" :
"Showing final billing transactions for matching client records. Click to inspect invoice details."}
 </p>
 </div>

 {/* Reset button inside explorer view */}
 {(selectedMonth || selectedCustomerName) && (
 <button
 onClick={handleResetDrilldown}
 className="cursor-pointer text-xs font-semibold text-rose-500 hover:underline inline-flex items-center gap-1"
 >
 <Compass className="h-3.5 w-3.5 animate-spin" />
 <span>Reset Drilldown Hierarchy</span>
 </button>
 )}
 </div>

 {/* INTERACTIVE MULTI-STAGE DISPLAY CONTENT */}
 {!selectedMonth ? (
 /* LEVEL 0: Monthly clean list */
 <div className="space-y-2">
 {monthlyContributions.map(m => (
 <div
 key={m.dateKey}
 onClick={() => setSelectedMonth(m.dateKey)}
 className="cursor-pointer flex items-center justify-between p-3 border border-default bg-card hover:bg-blue-50/30 dark:hover:bg-zinc-800/40 hover:border-blue-300 rounded-lg transition-all group"
 >
 <div className="flex items-center gap-4 w-1/4">
 <span className="font-sans font-bold text-sm text-primary group-hover:text-blue-600 transition-colors">
 {m.label}
 </span>
 </div>
 
 <div className="flex-1 flex justify-between items-center px-4">
 <span className="text-xs font-mono bg-card-secondary dark:bg-zinc-800 text-secondary px-2 py-1 rounded">
 {m.count} Bills
 </span>
 
 <div className="flex text-xs font-mono space-x-6 text-right">
 <div className="w-20"><span className="text-[10px] text-muted block lowercase">gross</span>₹{formatIndianCurrencyShort(m.gross)}</div>
 <div className="w-20"><span className="text-[10px] text-muted block lowercase">gst</span>₹{formatIndianCurrencyShort(m.gst)}</div>
 <div className="w-20"><span className="text-[10px] text-muted block lowercase">recv</span><span className="text-emerald-600">₹{formatIndianCurrencyShort(m.received)}</span></div>
 <div className="w-16"><span className="text-[10px] text-muted block lowercase">out</span><span className="text-rose-500">₹{formatIndianCurrencyShort(m.outstanding)}</span></div>
 </div>
 </div>

 <div className="w-6 flex justify-end text-muted group-hover:text-blue-500 transition-colors">
 &rarr;
 </div>
 </div>
 ))}
 {monthlyContributions.length === 0 && (
 <div className="py-8 text-center text-muted text-xs italic">
 No monthly transactions recorded yet.
 </div>
 )}
 </div>
 ) : !selectedCustomerName ? (
 /* LEVEL 1: Customers Contributors matching June Month */
 <div className="overflow-x-auto">
 <table className="min-w-full table-auto text-left text-xs">
 <thead className="bg-table-header text-[10px] uppercase font-bold text-secondary border-b border-default">
 <tr>
 <th className="px-4 py-3">Customer Client Name</th>
 <th className="px-4 py-3 text-center">Orders Count</th>
 <th className="px-4 py-3 text-right">Revenue Contributed</th>
 <th className="px-4 py-3 text-right">Amount Paid</th>
 <th className="px-4 py-3 text-right text-rose-500">Outstanding Balance</th>
 <th className="px-4 py-3 text-center">Action View</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 /40">
 {trendsAndBreakdowns.customers.map(c => (
 <tr 
 key={c.name}
 onClick={() => setSelectedCustomerName(c.name)}
 className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
 >
 <td className="px-4 py-3 font-semibold text-primary">{c.name}</td>
 <td className="px-4 py-3 text-center font-mono text-primary font-bold">{c.orders} Invoices</td>
 <td className="px-4 py-3 text-right font-mono font-bold text-primary">₹{c.revenue.toFixed(2)}</td>
 <td className="px-4 py-3 text-right font-mono text-emerald-600">₹{c.paid.toFixed(2)}</td>
 <td className="px-4 py-3 text-right font-mono text-rose-500">₹{c.outstanding.toFixed(2)}</td>
 <td className="px-4 py-3 text-center">
 <button 
 className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
 onClick={(e) => {
 e.stopPropagation();
 setSelectedCustomerName(c.name);
 }}
 >
 Drill Down &rarr;
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 ) : (
 /* LEVEL 2: Invoices billing lists for Customer */
 <div className="overflow-x-auto">
 <table className="min-w-full table-auto text-left text-xs">
 <thead className="bg-table-header text-[10px] uppercase font-bold text-secondary border-b border-default">
 <tr>
 <th className="px-4 py-3 cursor-pointer group" onClick={() => handleSort('invoiceNo')}>
 Invoice No <SortIcon colKey="invoiceNo" />
 </th>
 <th className="px-4 py-3 cursor-pointer group" onClick={() => handleSort('date')}>
 Date <SortIcon colKey="date" />
 </th>
 <th className="px-4 py-3">Representative Agent</th>
 <th className="px-4 py-3 text-center">Status</th>
 <th className="px-4 py-3 text-right">Items</th>
 <th className="px-4 py-3 text-right cursor-pointer group" onClick={() => handleSort('grandTotal')}>
 Grand Total <SortIcon colKey="grandTotal" />
 </th>
 <th className="px-4 py-3 text-right">Amt Paid</th>
 <th className="px-4 py-3 text-right">Balance</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 /40">
 {getSortedInvoices(filteredInvoices).map((inv) => (
 <tr 
 key={inv.invoiceNo}
 onClick={() => {
 setInspectInvoiceNo(inv.invoiceNo);
 }}
 className="hover:bg-blue-50/50 dark:hover:bg-zinc-800/20 cursor-pointer transition-colors"
 >
 <td className="px-4 py-3 font-mono font-bold text-blue-600">{inv.invoiceNo}</td>
 <td className="px-4 py-3 font-mono text-muted">{formatDisplayDate(inv.date)}</td>
 <td className="px-4 py-3 font-semibold text-primary">{inv.assignedEmployee ||"Self (Admin)"}</td>
 <td className="px-4 py-3 text-center">{getStatusBadge(inv.status)}</td>
 <td className="px-4 py-3 text-right font-mono">{inv.itemCount} items</td>
 <td className="px-4 py-3 text-right font-mono font-bold text-primary">₹{inv.grandTotal.toFixed(2)}</td>
 <td className="px-4 py-3 text-right font-mono text-emerald-600">₹{(inv.amountPaid !== undefined ? inv.amountPaid : inv.grandTotal).toFixed(2)}</td>
 <td className="px-4 py-3 text-right font-mono text-rose-500">₹{(inv.balanceDue || 0).toFixed(2)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* DENSE LEADERBOARDS OF TOP PERFORMERS */}
 <div className="grid gap-6 md:grid-cols-2">
 {/* Leaderboard 1: Agent Representative Performance */}
 <div className="bg-card rounded-xl border border-default p-5 shadow-sm space-y-4">
 <div>
 <h2 className="font-bold text-primary font-sans text-sm">Representative Sales leaderboard</h2>
 <p className="text-[10px] text-secondary">Leaderboard representing orders and client value created.</p>
 </div>

 <div className="space-y-3">
 {trendsAndBreakdowns.agents.map((ag, idx) => {
 return (
 <div key={ag.name} className="flex items-center justify-between p-2.5 rounded-lg bg-surface/60 border border-default">
 <div className="flex items-center gap-2.5">
 <div className="h-6 w-6 rounded-full bg-blue-100  text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center font-mono">
 #{idx + 1}
 </div>
 <div>
 <h4 className="text-xs font-bold text-primary">{ag.name}</h4>
 <p className="text-[9px] text-secondary">{ag.orders} sales closed</p>
 </div>
 </div>
 <span className="font-mono text-xs font-bold text-primary">₹{ag.revenue.toFixed(2)}</span>
 </div>
 );
 })}
 {trendsAndBreakdowns.agents.length === 0 && (
 <p className="text-xs text-muted italic text-center py-4">No Closed Agent representative deals computed.</p>
 )}
 </div>
 </div>

 {/* Leaderboard 2: Top Selling Products */}
 <div className="bg-card rounded-xl border border-default p-5 shadow-sm space-y-4">
 <div>
 <h2 className="font-bold text-primary font-sans text-sm">Top Performance Selling Products</h2>
 <p className="text-[10px] text-secondary">Billing distribution by product metrics.</p>
 </div>

 <div className="space-y-3">
 {trendsAndBreakdowns.products.slice(0, 6).map((prod, idx) => {
 return (
 <div key={prod.id} className="flex items-center justify-between p-2.5 rounded-lg bg-surface/60 border border-default hover:border-blue-500 cursor-pointer transition"
 onClick={() => setInspectProductName(prod.name)}
 >
 <div className="flex items-center gap-2.5">
 <div className="h-6 w-6 rounded font-bold text-[9px] font-mono bg-emerald-100 text-emerald-800 flex items-center justify-center uppercase">
 P{idx+1}
 </div>
 <div>
 <h4 className="text-xs font-bold text-primary">{prod.name}</h4>
 <p className="text-[9px] text-secondary">{prod.quantity} units sold • {prod.category}</p>
 </div>
 </div>
 <span className="font-mono text-xs font-bold text-emerald-600">₹{prod.revenue.toFixed(2)}</span>
 </div>
 );
 })}
 {trendsAndBreakdowns.products.length === 0 && (
 <p className="text-xs text-muted italic text-center py-4">No matched products computed in transactions.</p>
 )}
 </div>
 </div>
 </div>
 </>)}

 {/* ============================================================== */}
 {/* 1. SLIDING CUSTOMER ANALYTICS DRAWER (SECTION 10) */}
 {/* ============================================================== */}
 {inspectCustomerName && (() => {
 const client = fallbackCustomers.find(c => c.name.toLowerCase() === inspectCustomerName.toLowerCase());
 const clientInvoices = activeInvoices.filter(i => i.customerName === inspectCustomerName);
 const totalRevenueVal = clientInvoices.reduce((s, i) => s + i.grandTotal, 0);
 const totalOutstandingVal = clientInvoices.reduce((s, i) => s + (i.balanceDue || 0), 0);
 const totalPaidVal = clientInvoices.reduce((s, i) => s + (i.amountPaid !== undefined ? i.amountPaid : i.grandTotal), 0);
 const totalItemsVal = clientInvoices.reduce((s, i) => s + i.itemCount, 0);
 const averageOrderVal = clientInvoices.length > 0 ? (totalRevenueVal / clientInvoices.length) : 0;
 
 // Find most bought product
 const items = fallbackInvoiceItems.filter(item => clientInvoices.some(cl => cl.invoiceNo === item.invoiceNo));
 const prodCount: Record<string, number> = {};
 items.forEach(it => {
 prodCount[it.productName] = (prodCount[it.productName] || 0) + it.quantity;
 });
 const favoriteProduct = Object.entries(prodCount).sort((a,b) => b[1] - a[1])[0]?.[0] ||"None Yet";

 return (
 <div className="fixed inset-0 z-50 flex justify-end bg-card/40 backdrop-blur-sm animate-in fade-in duration-200">
 <div className="w-full max-w-lg bg-card shadow-2xl h-full flex flex-col border-l border-default animate-in slide-in-from-right-8 duration-300">
 
 <div className="px-5 py-4 border-b border-default flex items-center justify-between bg-surface">
 <div>
 <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Client Analytics Ledger</span>
 <h2 className="font-bold text-lg text-primary tracking-tight font-sans">{inspectCustomerName}</h2>
 </div>
 <button 
 onClick={() => setInspectCustomerName(null)}
 className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
 title="Close Slider"
 >
 <X className="h-5 w-5 text-secondary" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm">
 
 {/* Visual quick info */}
 <div className="grid grid-cols-2 gap-4 bg-surface rounded-lg p-4 font-sans text-xs">
 <div>
 <span className="text-[10px] uppercase font-bold text-secondary tracking-wider block">Mobile Contract</span>
 <p className="font-bold text-primary mt-0.5">{client?.mobile ||"No Mobile Specified"}</p>
 </div>
 <div>
 <span className="text-[10px] uppercase font-bold text-secondary tracking-wider block">Base State Address</span>
 <p className="font-medium text-secondary mt-0.5 truncate" title={client?.address}>{client?.address ||"No Address Set"}</p>
 </div>
 </div>

 {/* Analytical Numbers Block */}
 <div className="grid grid-cols-2 gap-3">
 <div className="border border-default p-4 rounded-xl bg-card">
 <span className="text-[10px] font-bold text-secondary uppercase block">Orders Closed</span>
 <span className="text-xl font-bold text-primary font-mono block mt-1">{clientInvoices.length} Invoices</span>
 </div>

 <div className="border border-default p-4 rounded-xl bg-card">
 <span className="text-[10px] font-bold text-secondary uppercase block">Average Order Value</span>
 <span className="text-xl font-bold text-emerald-600 font-mono block mt-1">₹{averageOrderVal.toFixed(2)}</span>
 </div>

 <div className="border border-default p-4 rounded-xl bg-card">
 <span className="text-[10px] font-bold text-secondary uppercase block">Cumulative Value</span>
 <span className="text-xl font-bold text-blue-600 font-mono block mt-1">₹{totalRevenueVal.toFixed(2)}</span>
 </div>

 <div className="border border-default p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20">
 <span className="text-[10px] font-bold text-rose-600 uppercase block">Outstanding Balance</span>
 <span className="text-xl font-bold text-rose-600 font-mono block mt-1">₹{totalOutstandingVal.toFixed(2)}</span>
 </div>
 </div>

 {/* Micro behavior analysis */}
 <div className="bg-surface rounded-lg p-4 font-mono text-xs space-y-2">
 <div className="flex justify-between">
 <span className="text-secondary font-sans font-semibold">Prevalent Product:</span>
 <span className="text-primary font-bold">{favoriteProduct}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-secondary font-sans font-semibold">Total items purchased:</span>
 <span className="text-primary font-bold">{totalItemsVal} items</span>
 </div>
 </div>

 {/* Order logs */}
 <div className="space-y-2">
 <h3 className="font-bold text-primary font-sans">Payment Transaction Records</h3>
 <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
 {clientInvoices.map(inv => (
 <div 
 key={inv.invoiceNo}
 onClick={() => {
 setInspectInvoiceNo(inv.invoiceNo);
 }}
 className="p-2.5 rounded-lg border border-default hover:border-blue-500 cursor-pointer flex justify-between items-center transition bg-card"
 >
 <div>
 <span className="font-mono font-bold text-blue-600 block text-xs">{inv.invoiceNo}</span>
 <span className="text-[10px] text-muted">{formatDisplayDate(inv.date)}</span>
 </div>
 <div className="text-right">
 <span className="font-mono font-bold text-primary text-xs block">₹{inv.grandTotal.toFixed(2)}</span>
 {getStatusBadge(inv.status)}
 </div>
 </div>
 ))}
 {clientInvoices.length === 0 && (
 <p className="text-xs text-muted italic text-center py-4">No billing history files resolved for this client.</p>
 )}
 </div>
 </div>

 </div>
 <div className="p-4 border-t border-default bg-surface/50">
 <button 
 onClick={() => setInspectCustomerName(null)}
 className="w-full rounded-lg bg-gray-200 dark:bg-zinc-800 text-primary py-2.5 font-bold hover:bg-gray-300 dark:hover:bg-zinc-700 transition cursor-pointer"
 >
 Close Analytics Ledger
 </button>
 </div>
 </div>
 </div>
 );
 })()}


 {/* ============================================================== */}
 {/* 2. ENRICHED DETAILED INVOICE DETAILS DRAWER (SECTION 11) */}
 {/* ============================================================== */}
 {inspectInvoiceNo && (() => {
 const inv = activeInvoices.find(i => i.invoiceNo === inspectInvoiceNo);
 if (!inv) return null;
 const linkedItems = fallbackInvoiceItems.filter(it => matchInvoiceItem(it, inv));

 return (
 <div className="fixed inset-0 z-50 flex justify-end bg-card/40 backdrop-blur-sm animate-in fade-in duration-200">
 <div className="w-full max-w-lg bg-card shadow-2xl h-full flex flex-col border-l border-default animate-in slide-in-from-right-8 duration-300">
 
 <div className="px-5 py-4 border-b border-default flex items-center justify-between bg-surface">
 <div>
 <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Receipt Ledger Details</span>
 <div className="flex gap-2 items-center mt-1">
 <h2 className="font-mono font-bold text-blue-600 text-base">{inv.invoiceNo}</h2>
 {getStatusBadge(inv.status)}
 </div>
 </div>
 <button 
 onClick={() => setInspectInvoiceNo(null)}
 className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
 title="Close Slider"
 >
 <X className="h-5 w-5 text-secondary" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm">
 {/* 1. GST AUDIT SUMMARY OR FINANCIAL SUMMARY */}
 {activeModule ==="GST Collected" ? (
 <div className="bg-card text-primary border border-default rounded-xl p-5 shadow space-y-4">
 <h3 className="font-bold text-emerald-400 text-xs uppercase tracking-wider font-sans border-b border-white/10 pb-2">GST Audit Summary</h3>
 <div className="grid grid-cols-2 gap-4 text-xs font-mono">
 <div>
 <span className="text-muted block text-[9px] uppercase font-sans">GST Type:</span>
 <span className="text-base font-bold text-emerald-400">{inv.gstType ||"Non-GST"}</span>
 </div>
 <div>
 <span className="text-muted block text-[9px] uppercase font-sans">Taxable Value (Subtotal):</span>
 <span className="text-base font-bold text-primary">₹{Math.max(0, (inv.subtotal || 0) - (inv.discount || 0)).toFixed(2)}</span>
 </div>
 <div className="border-t border-white/10 pt-3 col-span-2 grid grid-cols-3 gap-2 mt-1">
 <div>
 <span className="text-muted block text-[9px] uppercase font-sans">CGST amount:</span>
 <span className="font-bold text-blue-300">₹{getInvoiceCgst(inv).toFixed(2)}</span>
 </div>
 <div>
 <span className="text-muted block text-[9px] uppercase font-sans">SGST amount:</span>
 <span className="font-bold text-amber-300">₹{getInvoiceSgst(inv).toFixed(2)}</span>
 </div>
 <div>
 <span className="text-muted block text-[9px] uppercase font-sans">IGST amount:</span>
 <span className="font-bold text-purple-300">₹{getInvoiceIgst(inv).toFixed(2)}</span>
 </div>
 </div>
 <div className="border-t border-white/10 pt-3 col-span-2 flex justify-between items-center mt-1">
 <div>
 <span className="text-muted block text-[9px] uppercase font-sans">Total GST Collected:</span>
 <span className="text-xl font-bold tracking-tight text-emerald-400">₹{getInvoiceGst(inv).toFixed(2)}</span>
 </div>
 <div className="text-right">
 <span className="text-muted block text-[9px] uppercase font-sans">State:</span>
 <span className="font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">{inv.customerState ||"Unknown"}</span>
 </div>
 </div>
 </div>
 </div>
 ) : (
 <div className="bg-card text-primary border border-default rounded-xl p-5 shadow space-y-4">
 <h3 className="font-bold text-neutral-200 text-xs uppercase tracking-wider font-sans border-b border-white/10 pb-2">Invoice Financial Summary</h3>
 <div className="grid grid-cols-2 gap-4 text-xs font-mono">
 <div>
 <span className="text-muted block text-[9px] uppercase font-sans">Checkout Value:</span>
 <span className="text-base font-bold">₹{inv.grandTotal.toFixed(2)}</span>
 </div>
 <div>
 <span className="text-emerald-400 block text-[9px] uppercase font-sans">Discounts Applied:</span>
 <span className="text-amber-400">₹{(inv.discount || 0).toFixed(2)}</span>
 </div>
 <div className="border-t border-white/10 pt-2 col-span-2 grid grid-cols-2 gap-2 mt-1">
 <div>
 <span className="text-emerald-400 block text-[9px] uppercase font-sans">Payment Amount Received:</span>
 <span className="text-emerald-400 font-bold">₹{(inv.amountPaid !== undefined ? inv.amountPaid : inv.grandTotal).toFixed(2)}</span>
 </div>
 <div>
 <span className="text-rose-400 block text-[9px] uppercase font-sans">Outstanding Due Balance:</span>
 <span className="text-rose-400 font-bold">₹{(inv.balanceDue || 0).toFixed(2)}</span>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Transaction list items */}
 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <h4 className="font-bold text-primary font-sans">{activeModule ==="GST Collected" ? `Product Tax Breakdown (${linkedItems.length})` : `Itemized Checkout Products (${linkedItems.length})`}</h4>
 <span className="text-[10px] text-muted italic">Click product name for drawer analytics</span>
 </div>
 
 <div className="border border-default rounded-xl overflow-hidden bg-card text-xs">
 <div className="bg-surface px-3 py-2 border-b border-default font-bold flex justify-between text-secondary text-[10px] uppercase">
 <span>Product Details</span>
 <span>Total Sum</span>
 </div>
 <div className="divide-y divide-gray-100">
 {linkedItems.map((it, itemIdx) => {
 const isGSTModule = activeModule ==="GST Collected";
 const isGSTInvoice = inv.gstEnabled && inv.gstType && inv.gstType !=="No GST" && inv.gstType.indexOf("Non") === -1;
 
 // Calculate proportionate item tax
 let itemTaxable = it.amount;
 if (inv.subtotal && inv.subtotal > 0 && inv.discount && inv.discount > 0) {
 itemTaxable = it.amount - (inv.discount * (it.amount / inv.subtotal));
 itemTaxable = Math.max(0, itemTaxable);
 }
 
 let iCgst = 0, iSgst = 0, iIgst = 0, iGst = 0, gstPercent = 0;
 if (isGSTInvoice) {
 if (inv.cgstPercentage && inv.sgstPercentage) {
 iCgst = itemTaxable * (inv.cgstPercentage / 100);
 iSgst = itemTaxable * (inv.sgstPercentage / 100);
 iGst = iCgst + iSgst;
 gstPercent = inv.cgstPercentage + inv.sgstPercentage;
 } else if (inv.igstPercentage) {
 iIgst = itemTaxable * (inv.igstPercentage / 100);
 iGst = iIgst;
 gstPercent = inv.igstPercentage;
 }
 }

 return (
 <div key={(it.productId ||"") +"-" + itemIdx} className="px-3 py-2.5 flex flex-col gap-1 hover:bg-table-hover">
 <div className="flex justify-between items-start gap-4">
 <span 
 onClick={() => {
 setInspectProductName(it.productName);
 }}
 className="font-bold text-blue-600 hover:underline cursor-pointer break-words"
 title="Open Product Drawer"
 >
 {it.displayName || it.productName}
 </span>
 <span className="font-mono text-right text-primary font-bold whitespace-nowrap">₹{it.amount.toFixed(2)}</span>
 </div>
 
 {!isGSTModule ? (
 <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-muted font-mono mt-1">
 {isGSTInvoice && (
 <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-1 py-0.2 rounded font-semibold text-[9px]">HSN: {it.hsnCode ||"9403"}</span>
 )}
 <span>Qty: {it.quantity}</span>
 <span>Price: ₹{it.unitPrice.toFixed(2)}</span>
 </div>
 ) : (
 <div className="mt-2 bg-surface border border-dashed border-default rounded p-2 text-[10px] font-mono grid grid-cols-2 gap-x-4 gap-y-1">
 <div className="text-muted dark:text-muted flex justify-between">
 <span>HSN Code:</span> <span className="font-bold text-primary">{it.hsnCode ||"9403"}</span>
 </div>
 <div className="text-muted dark:text-muted flex justify-between">
 <span>Quantity:</span> <span className="font-bold text-primary">{it.quantity}</span>
 </div>
 <div className="text-muted dark:text-muted flex justify-between">
 <span>Taxable Value:</span> <span className="font-bold text-primary">₹{itemTaxable.toFixed(2)}</span>
 </div>
 <div className="text-muted dark:text-muted flex justify-between">
 <span>GST ({gstPercent}%):</span> <span className="font-bold text-emerald-600 dark:text-emerald-400 line-clamp-1">₹{iGst.toFixed(2)}</span>
 </div>
 {iCgst > 0 && (
 <div className="text-muted dark:text-muted flex justify-between">
 <span>CGST ({inv.cgstPercentage}%):</span> <span className="font-bold text-blue-500">₹{iCgst.toFixed(2)}</span>
 </div>
 )}
 {iSgst > 0 && (
 <div className="text-muted dark:text-muted flex justify-between">
 <span>SGST ({inv.sgstPercentage}%):</span> <span className="font-bold text-amber-500">₹{iSgst.toFixed(2)}</span>
 </div>
 )}
 {iIgst > 0 && (
 <div className="text-muted dark:text-muted flex justify-between">
 <span>IGST ({inv.igstPercentage}%):</span> <span className="font-bold text-purple-500">₹{iIgst.toFixed(2)}</span>
 </div>
 )}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>
 </div>

 {/* System Audit trace */}
 <div className="bg-surface rounded-lg p-4 font-mono text-xs space-y-2">
 <h4 className="font-sans font-bold text-primary mb-1 text-xs">Audit Verification Trail</h4>
 <div className="flex justify-between">
 <span className="text-secondary font-sans">Handled Agent:</span>
 <span className="text-primary font-bold">{inv.assignedEmployee ||"Self-Admin"}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-secondary font-sans">Created By:</span>
 <span className="text-primary font-bold">@{inv.createdBy ||"admin"}</span>
 </div>
 {inv.lastEditedBy && (
 <div className="flex justify-between">
 <span className="text-secondary font-sans">Last Modified:</span>
 <span className="text-primary font-semibold">@{inv.lastEditedBy} ({inv.lastEditedDate})</span>
 </div>
 )}
 </div>

 </div>
 <div className="p-4 border-t border-default bg-surface/50">
 <button 
 onClick={() => setInspectInvoiceNo(null)}
 className="w-full rounded-lg bg-gray-200 dark:bg-zinc-800 text-primary py-2.5 font-bold hover:bg-gray-300 dark:hover:bg-zinc-700 transition cursor-pointer"
 >
 Close Receipt
 </button>
 </div>
 </div>
 </div>
 );
 })()}


 {/* ============================================================== */}
 {/* 3. COHESIVE SLIDING PRODUCT ANALYTICS DRAWER (SECTION 12) */}
 {/* ============================================================== */}
 {inspectProductName && (() => {
 const prod = fallbackProducts.find(p => p.name.toLowerCase() === inspectProductName.toLowerCase());
 
 // Compute stats
 const relevantItems = fallbackInvoiceItems.filter(it => it.productName.toLowerCase() === inspectProductName.toLowerCase());
 const unitsSoldRaw = relevantItems.reduce((sum, item) => sum + getInvoiceItemQuantity(item), 0);
 const unitsSold = Number.isFinite(unitsSoldRaw) ? unitsSoldRaw : 0;
 const revenueGenerated = relevantItems.reduce((sum, item) => sum + item.amount, 0);
 
 // Top Customers buying this product
 const customerPurchase: Record<string, { name: string, quantity: number, value: number }> = {};
 relevantItems.forEach(it => {
 const matchingInvoiceObj = activeInvoices.find(v => v.invoiceNo === it.invoiceNo);
 if (matchingInvoiceObj) {
 const cName = matchingInvoiceObj.customerName;
 if (!customerPurchase[cName]) customerPurchase[cName] = { name: cName, quantity: 0, value: 0 };
 const qty = getInvoiceItemQuantity(it);
 customerPurchase[cName].quantity += Number.isFinite(qty) ? qty : 0;
 customerPurchase[cName].value += it.amount;
 }
 });
 const topCustomers = Object.values(customerPurchase).sort((a,b) => b.quantity - a.quantity).slice(0, 4);

 // Top Agents Closed
 const agentSales: Record<string, number> = {};
 relevantItems.forEach(it => {
 const matchingInvoiceObj = activeInvoices.find(v => v.invoiceNo === it.invoiceNo);
 if (matchingInvoiceObj) {
 const ag = matchingInvoiceObj.assignedEmployee ||"Self-Admin";
 const qty = getInvoiceItemQuantity(it);
 agentSales[ag] = (agentSales[ag] || 0) + (Number.isFinite(qty) ? qty : 0);
 }
 });
 const topAgents = Object.entries(agentSales).sort((a,b) => b[1] - a[1]).slice(0, 4);

 return (
 <div className="fixed inset-0 z-50 flex justify-end bg-card/40 backdrop-blur-sm animate-in fade-in duration-200">
 <div className="w-full max-w-lg bg-card shadow-2xl h-full flex flex-col border-l border-default animate-in slide-in-from-right-8 duration-300">
 
 <div className="px-5 py-4 border-b border-default flex items-center justify-between bg-surface">
 <div>
 <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Product Performance Analytics</span>
 <h2 className="font-bold text-lg text-primary tracking-tight font-sans">{inspectProductName}</h2>
 </div>
 <button 
 onClick={() => setInspectProductName(null)}
 className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
 title="Close Slider"
 >
 <X className="h-5 w-5 text-secondary" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm">
 
 {/* Product Metadata Bento Cards */}
 <div className="grid grid-cols-2 gap-4 bg-surface rounded-lg p-4 font-sans text-xs">
 <div>
 <span className="text-[10px] uppercase font-bold text-secondary tracking-wider block">Material Category</span>
 <p className="font-bold text-primary mt-0.5">{prod?.category ||"Unknown"}</p>
 </div>
 <div>
 <span className="text-[10px] uppercase font-bold text-secondary tracking-wider block">ID Key</span>
 <p className="font-mono text-secondary mt-0.5">{prod?.id ||"PROD-NONE"}</p>
 </div>
 <div>
 <span className="text-[10px] uppercase font-bold text-secondary tracking-wider block">Color Specification</span>
 <p className="font-semibold text-primary mt-0.5">{prod?.color ||"N/A"}</p>
 </div>
 <div>
 <span className="text-[10px] uppercase font-bold text-secondary tracking-wider block">Physical Stock Available</span>
 <span className={`font-mono font-bold block mt-0.5 ${
 (prod?.stockAvailable || 0) === 0 ?"text-rose-500" :
 (prod?.stockAvailable || 0) <= 10 ?"text-amber-500" :"text-emerald-500"
 }`}>
 {prod?.stockAvailable !== undefined ? `${prod.stockAvailable} units` :"N/A (Check Sheets)"}
 </span>
 </div>
 </div>

 {/* Core Sales Numbers */}
 <div className="grid grid-cols-2 gap-3">
 <div className="border border-default p-4 rounded-xl bg-card">
 <span className="text-[10px] font-bold text-secondary uppercase block">Quantity Sold</span>
 <span className="text-xl font-bold text-primary font-mono block mt-1">{unitsSold} Units</span>
 </div>

 <div className="border border-default p-4 rounded-xl bg-card">
 <span className="text-[10px] font-bold text-secondary uppercase block">Total Generated Sum</span>
 <span className="text-xl font-bold text-emerald-600 font-mono block mt-1">₹{revenueGenerated.toFixed(2)}</span>
 </div>
 </div>

 {/* Top Buying Clients list */}
 <div className="space-y-2">
 <h3 className="font-bold text-primary font-sans text-xs uppercase tracking-wider text-secondary">Top Buyers for Product</h3>
 <div className="space-y-2">
 {topCustomers.map(tc => (
 <div key={tc.name} className="p-2.5 rounded-lg bg-surface border border-default flex justify-between items-center text-xs">
 <span className="font-semibold text-primary">{tc.name}</span>
 <span className="font-mono text-secondary font-bold">{tc.quantity} units purchased (₹{tc.value.toFixed(2)})</span>
 </div>
 ))}
 {topCustomers.length === 0 && (
 <p className="text-xs text-muted italic text-center py-2">No buyers resolved inside active date preset.</p>
 )}
 </div>
 </div>

 {/* Top closed representative matches */}
 <div className="space-y-2">
 <h3 className="font-bold text-primary font-sans text-xs uppercase tracking-wider text-secondary">Representatives Closed</h3>
 <div className="space-y-2">
 {topAgents.map(([agentName, count]) => (
 <div key={agentName} className="p-2.5 rounded-lg bg-surface border border-default flex justify-between items-center text-xs">
 <span className="font-semibold text-primary">{agentName}</span>
 <span className="font-mono text-secondary font-bold">{count} units closed</span>
 </div>
 ))}
 {topAgents.length === 0 && (
 <p className="text-xs text-muted italic text-center py-2">No agents matches resolved.</p>
 )}
 </div>
 </div>

 </div>
 <div className="p-4 border-t border-default bg-surface/50">
 <button 
 onClick={() => setInspectProductName(null)}
 className="w-full rounded-lg bg-gray-200 dark:bg-zinc-800 text-primary py-2.5 font-bold hover:bg-gray-300 dark:hover:bg-zinc-700 transition cursor-pointer"
 >
 Close Product Analytics
 </button>
 </div>
 </div>
 </div>
 );
 })()}

 </div>
 );
}
