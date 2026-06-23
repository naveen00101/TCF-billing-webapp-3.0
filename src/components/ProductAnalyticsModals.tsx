import React, { useState, useMemo } from"react";
import { 
 X, Search, Filter, Calendar, Download, Layers, Tag, Package, 
 TrendingUp, Coins, Palette, AlertTriangle, Play, HelpCircle, 
 Edit, Eye, Plus, ShoppingCart, IndianRupee, BarChart2, CheckCircle2,
 Percent, ArrowRightLeft, RefreshCw
} from"lucide-react";
import { Product, Invoice, InvoiceItem } from"../types";

interface ProductAnalyticsModalsProps {
 activeModal:"topSelling" |"bestRevenue" |"mostSoldColor" |"lowStock" |"outOfStock" | null;
 onClose: () => void;
 products: Product[];
 invoices: Invoice[];
 invoiceItems: InvoiceItem[];
 onInspectProduct: (product: Product) => void;
 onTriggerEditForm: (product: Product) => void;
 onQuickUpdateStock: (product: Product, newStock: number) => Promise<void>;
 onShowNotification: (text: string, type:"success" |"error" |"info") => void;
}

export function ProductAnalyticsModals({
 activeModal,
 onClose,
 products,
 invoices,
 invoiceItems,
 onInspectProduct,
 onTriggerEditForm,
 onQuickUpdateStock,
 onShowNotification
}: ProductAnalyticsModalsProps) {

 // Universal inside-modal states
 const [modalSearch, setModalSearch] = useState("");
 const [modalCategory, setModalCategory] = useState("All");
 const [modalColor, setModalColor] = useState("All");
 const [modalStockStatus, setModalStockStatus] = useState("All");
 const [modalDateRange, setModalDateRange] = useState("All Time");

 // Low stock specifiic
 const [lowStockFilterThreshold, setLowStockFilterThreshold] = useState<number>(10);
 const [customThresholdInput, setCustomThresholdInput] = useState("10");

 // Quick Inline Stock State
 const [editingStockId, setEditingStockId] = useState<string | null>(null);
 const [quickStockValue, setQuickStockValue] = useState<number>(0);

 // Filters setup
 const uniqueCategories = useMemo(() => ["All", ...Array.from(new Set(products.map(p => p.category)))], [products]);
 const uniqueColors = useMemo(() => ["All", ...Array.from(new Set(products.map(p => p.color).filter(Boolean)))], [products]);

 // Date range checking
 const isDateInRange = (dateStr: string | undefined, range: string) => {
 if (range ==="All Time") return true;
 if (!dateStr || dateStr ==="-" || dateStr ==="") return false;
 
 try {
 const date = new Date(dateStr);
 if (isNaN(date.getTime())) return false;
 const now = new Date();
 // Set hours to midnight
 const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
 
 if (range ==="Today") {
 return date >= today;
 }
 if (range ==="This Week") {
 const startOfWeek = new Date(today);
 startOfWeek.setDate(today.getDate() - today.getDay());
 return date >= startOfWeek;
 }
 if (range ==="This Month") {
 const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
 return date >= startOfMonth;
 }
 if (range ==="Last 6 Months") {
 const startOf6Months = new Date(today);
 startOf6Months.setMonth(today.getMonth() - 6);
 return date >= startOf6Months;
 }
 if (range ==="This Year") {
 const startOfYear = new Date(today.getFullYear(), 0, 1);
 return date >= startOfYear;
 }
 } catch {
 return false;
 }
 return true;
 };

 // Memoized maps
 const validInvoices = useMemo(() => {
 return invoices.filter(inv => {
 const pStatus = (inv.paymentStatus ||"").toLowerCase();
 const statusVal = (inv.status ||"").toLowerCase();
 return pStatus !=="cancelled" && pStatus !=="deleted" && statusVal !=="cancelled" && statusVal !=="deleted";
 });
 }, [invoices]);

 const validInvoiceItems = useMemo(() => {
 const validNoSet = new Set(validInvoices.map(inv => inv.invoiceNo));
 return invoiceItems.filter(item => validNoSet.has(item.invoiceNo));
 }, [invoiceItems, validInvoices]);

 // Compute live sales metrics filterable inside the modal based on selectedDateRange
 const productLiveSales = useMemo(() => {
 const salesMap: Record<string, { unitsSold: number; revenueGenerated: number; lastSoldDate: string; monthlyTrend: Record<string, number>; weeklyUnits: number; monthlyUnits: number; yearlyUnits: number }> = {};
 
 // Seed
 products.forEach(p => {
 salesMap[p.id] = {
 unitsSold: 0,
 revenueGenerated: 0,
 lastSoldDate:"-",
 monthlyTrend: {},
 weeklyUnits: 0,
 monthlyUnits: 0,
 yearlyUnits: 0
 };
 });

 const now = new Date();
 const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
 const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
 const startOfCurrentYear = new Date(now.getFullYear(), 0, 1);

 validInvoiceItems.forEach(item => {
 const pId = item.productId ||"";
 if (!salesMap[pId]) {
 salesMap[pId] = { unitsSold: 0, revenueGenerated: 0, lastSoldDate:"-", monthlyTrend: {}, weeklyUnits: 0, monthlyUnits: 0, yearlyUnits: 0 };
 }

 const inv = validInvoices.find(v => v.invoiceNo === item.invoiceNo);
 const invDateStr = inv?.date ||"";
 const invDate = invDateStr ? new Date(invDateStr) : null;

 // Filter check based on active parameters
 if (inv && invDate) {
 const matchesDateRange = isDateInRange(invDateStr, modalDateRange);
 
 if (matchesDateRange) {
 salesMap[pId].unitsSold += (item.quantity || 0);
 salesMap[pId].revenueGenerated += (item.amount || 0);

 if (salesMap[pId].lastSoldDate ==="-" || new Date(invDateStr) > new Date(salesMap[pId].lastSoldDate)) {
 salesMap[pId].lastSoldDate = invDateStr;
 }

 // Compute monthly trend keys
 const mKey = `${invDate.toLocaleString('default', { month: 'short' })} ${invDate.getFullYear()}`;
 salesMap[pId].monthlyTrend[mKey] = (salesMap[pId].monthlyTrend[mKey] || 0) + (item.amount || 0);

 // Compute interval counters
 if (invDate >= oneWeekAgo) {
 salesMap[pId].weeklyUnits += (item.quantity || 0);
 }
 if (invDate >= oneMonthAgo) {
 salesMap[pId].monthlyUnits += (item.quantity || 0);
 }
 if (invDate >= startOfCurrentYear) {
 salesMap[pId].yearlyUnits += (item.quantity || 0);
 }
 }
 }
 });

 return salesMap;
 }, [products, validInvoiceItems, validInvoices, modalDateRange]);

 const getProductLiveSales = (id: string) => {
 return productLiveSales[id] || { 
 unitsSold: 0, 
 revenueGenerated: 0, 
 lastSoldDate:"-", 
 monthlyTrend: {} as Record<string, number>, 
 weeklyUnits: 0, 
 monthlyUnits: 0, 
 yearlyUnits: 0 
 };
 };

 // Variant intelligence metrics computed live
 const calculatedVariantMetrics = useMemo(() => {
 const variantSalesMap: Record<string, { 
 productId: string; 
 productName: string; 
 color: string; 
 unitsSold: number; 
 revenueGenerated: number; 
 currentStock: number; 
 skuCode?: string;
 }> = {};

  // 1. Pre-populate with all actual active products and their defined variants / SKUs
  products.forEach(p => {
  if (p.simpleVariants && p.simpleVariants.length > 0) {
  p.simpleVariants.forEach(v => {
  const key = v.id;
  variantSalesMap[key] = {
  productId: p.id,
  productName: p.name,
  color: v.name,
  unitsSold: 0,
  revenueGenerated: 0,
  currentStock: 0,
  skuCode: v.name
  };
  });
  }
  });

 // 2. Accumulate actual sales from validInvoiceItems
 validInvoiceItems.forEach(item => {
 const pId = item.productId ||"";
 if (item.skuId) {
 const key = item.skuId;
 if (!variantSalesMap[key]) {
 const prod = products.find(p => p.id === pId);
 variantSalesMap[key] = {
 productId: pId,
 productName: prod ? prod.name :"Unknown Product",
 color: item.skuCode ||"Unknown SKU",
 unitsSold: 0,
 revenueGenerated: 0,
 currentStock: 0,
 skuCode: item.skuCode
 };
 }
 variantSalesMap[key].unitsSold += (item.quantity || 0);
 variantSalesMap[key].revenueGenerated += (item.amount || 0);
 } else if (item.selectedColor) {
 const color = item.selectedColor;
 const key = `${pId}|${color}`;
 if (!variantSalesMap[key]) {
 const prod = products.find(p => p.id === pId);
 variantSalesMap[key] = {
 productId: pId,
 productName: prod ? prod.name :"Unknown Product",
 color: color,
 unitsSold: 0,
 revenueGenerated: 0,
 currentStock: 0
 };
 }
 variantSalesMap[key].unitsSold += (item.quantity || 0);
 variantSalesMap[key].revenueGenerated += (item.amount || 0);
 }
 });

 // Filter by modal parameters
 const searchLower = modalSearch.toLowerCase();
 let results = Object.values(variantSalesMap).filter(item => {
 const matchesSearch = item.productName.toLowerCase().includes(searchLower) || item.productId.toLowerCase().includes(searchLower) || item.color.toLowerCase().includes(searchLower) || (item.skuCode ||"").toLowerCase().includes(searchLower);
 const prod = products.find(p => p.id === item.productId);
 const matchesCat = modalCategory ==="All" || (prod && prod.category === modalCategory);
 return matchesSearch && matchesCat;
 });
 
 // Sort by unitsSold descending first, then revenue descending
 results.sort((a, b) => b.unitsSold - a.unitsSold || b.revenueGenerated - a.revenueGenerated);

 return results;
 }, [products, validInvoiceItems, modalSearch, modalCategory]);

 // EXPORT FUNCTIONS
 const handleExportCSV = (headers: string[], rows: any[][], fileName: string) => {
 const csvRows = [headers.join(",")];
 rows.forEach(r => {
 const cleanRow = r.map(val => {
 const str = String(val).replace(/"/g, '""');
 return `"${str}"`;
 });
 csvRows.push(cleanRow.join(","));
 });
 const csvContent ="data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
 const encodedUri = encodeURI(csvContent);
 const link = document.createElement("a");
 link.setAttribute("href", encodedUri);
 link.setAttribute("download", `${fileName}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 onShowNotification(`✓ Exported ${fileName}.csv successfully!`,"success");
 };

 const handleExportExcel = (headers: string[], rows: any[][], fileName: string) => {
 let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"><Worksheet ss:Name="Sheet1"><Table>`;
 xml += '<Row>';
 headers.forEach(h => {
 xml += `<Cell><Data ss:Type="String">${h}</Data></Cell>`;
 });
 xml += '</Row>';
 rows.forEach(r => {
 xml += '<Row>';
 r.forEach(v => {
 const type = typeof v === 'number' ? 'Number' : 'String';
 xml += `<Cell><Data ss:Type="${type}">${v}</Data></Cell>`;
 });
 xml += '</Row>';
 });
 xml += '</Table></Worksheet></Workbook>';
 const blob = new Blob([xml], { type:"application/vnd.ms-excel" });
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.setAttribute("href", url);
 link.setAttribute("download", `${fileName}.xls`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 onShowNotification(`✓ Exported ${fileName}.xls successfully!`,"success");
 };

 if (!activeModal) return null;

 return (
 <div className="fixed inset-0 z-40 flex items-center justify-center bg-card/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
 <div className="w-full max-w-4xl bg-card rounded-2xl shadow-2xl border border-default flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
 
 {/* MODAL HEADER */}
 <div className="flex items-center justify-between px-6 py-4.5 border-b border-default bg-surface/50 /40">
 <div className="flex items-center gap-2.5">
 {activeModal ==="topSelling" && <Layers className="h-5 w-5 text-blue-600" />}
 {activeModal ==="bestRevenue" && <Coins className="h-5 w-5 text-emerald-600" />}
 {activeModal ==="mostSoldColor" && <Palette className="h-5 w-5 text-purple-600" />}
 {activeModal ==="lowStock" && <AlertTriangle className="h-5 w-5 text-orange-500" />}
 {activeModal ==="outOfStock" && <X className="h-5 w-5 text-red-500" />}
 <div>
 <h2 className="text-base font-bold text-primary dark:text-gray-100 uppercase tracking-tight">
 {activeModal ==="topSelling" &&"Top Selling Product Intelligence"}
 {activeModal ==="bestRevenue" &&"Core Revenue Drivers Performance"}
 {activeModal ==="mostSoldColor" &&"SKU Intelligence Explorer"}
 {activeModal ==="lowStock" &&"Active Low Stock Management Panel"}
 {activeModal ==="outOfStock" &&"Out of Stock Recovery Drawer"}
 </h2>
 <p className="text-[10.5px] text-muted dark:text-muted font-medium">
 {activeModal ==="topSelling" &&"In-depth insights, monthly sales trend, and full sales index for high volume items."}
 {activeModal ==="bestRevenue" &&"Analytics around highest revenue generators, trends, and profitability index."}
 {activeModal ==="mostSoldColor" &&"In-depth insights and performance trackers of product SKUs based on actual invoices."}
 {activeModal ==="lowStock" &&"Assess and restock ready-stock catalogue products displaying low inventory count."}
 {activeModal ==="outOfStock" &&"Identify missing stock items instantly and deploy immediate re-order protocols."}
 </p>
 </div>
 </div>
 <button 
 onClick={onClose} 
 className="p-1.5 rounded-lg text-muted hover:text-primary dark:hover:text-primary hover:bg-card-secondary dark:hover:bg-zinc-800 transition-colors cursor-pointer border-none bg-transparent"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 {/* MODAL CONTROL BAR (Universal search & filters) */}
 <div className="p-4 px-6 border-b border-default bg-surface/20  flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
 
 {/* Universal Search inside modal */}
 <div className="relative flex-1 max-w-md">
 <input
 type="text"
 placeholder="Search by product name, ID, category, or color..."
 value={modalSearch}
 onChange={(e) => setModalSearch(e.target.value)}
 className="w-full text-xs rounded-lg border border-default bg-surface/50 pl-8.5 pr-4 py-2 outline-none focus:border-blue-500 focus:bg-card text-primary dark:text-gray-100 font-medium"
 />
 <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
 </div>

 {/* Modal specific toggles and export */}
 <div className="flex flex-wrap items-center gap-2 text-xs">
 
 {/* Category Filter */}
 {activeModal !=="mostSoldColor" && (
 <div className="flex items-center gap-1 bg-surface/50 border border-default rounded-lg px-2 shrink-0">
 <Filter className="h-3 w-3 text-muted" />
 <select 
 value={modalCategory} 
 onChange={(e) => setModalCategory(e.target.value)}
 className="bg-transparent py-1.5 text-xs text-secondary dark:text-muted outline-none border-none font-semibold cursor-pointer"
 >
 <option value="All">All Categories</option>
 {uniqueCategories.filter(c => c !=="All").map(c => (
 <option key={c} value={c}>{c}</option>
 ))}
 </select>
 </div>
 )}

 {/* In-Modal Color Filter */}
 {["topSelling","bestRevenue","lowStock","outOfStock"].includes(activeModal) && (
 <div className="flex items-center gap-1 bg-surface/50 border border-default rounded-lg px-2 shrink-0">
 <Palette className="h-3 w-3 text-muted" />
 <select 
 value={modalColor} 
 onChange={(e) => setModalColor(e.target.value)}
 className="bg-transparent py-1.5 text-xs text-secondary dark:text-muted outline-none border-none font-semibold cursor-pointer"
 >
 <option value="All">All Colors</option>
 {uniqueColors.filter(col => col !=="All").map(col => (
 <option key={col} value={col}>{col}</option>
 ))}
 </select>
 </div>
 )}

 {/* Date Range Filter (Very important!) */}
 <div className="flex items-center gap-1 bg-surface/50 border border-default rounded-lg px-2 shrink-0">
 <Calendar className="h-3 w-3 text-muted" />
 <select 
 value={modalDateRange} 
 onChange={(e) => setModalDateRange(e.target.value)}
 className="bg-transparent py-1.5 text-xs text-secondary dark:text-muted outline-none border-none font-semibold cursor-pointer"
 >
 <option value="All Time">All Time</option>
 <option value="Today">Today</option>
 <option value="This Week">This Week</option>
 <option value="This Month">This Month</option>
 <option value="Last 6 Months">Last 6 Months</option>
 <option value="This Year">This Year</option>
 </select>
 </div>

 {/* Low stock threshold options */}
 {activeModal ==="lowStock" && (
 <div className="flex items-center gap-1 bg-orange-50/40 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-lg px-2 text-orange-700 dark:text-orange-400">
 <span className="font-bold">Threshold:</span>
 <select 
 value={lowStockFilterThreshold} 
 onChange={(e) => setLowStockFilterThreshold(Number(e.target.value))}
 className="bg-transparent py-1.5 text-xs outline-none border-none font-bold text-orange-850 cursor-pointer"
 >
 <option value={5}>&le; 5 units</option>
 <option value={10}>&le; 10 units</option>
 <option value={20}>&le; 20 units</option>
 <option value={100}>&le; Custom</option>
 </select>
 {lowStockFilterThreshold === 100 && (
 <input
 type="number"
 value={customThresholdInput}
 onChange={(e) => {
 setCustomThresholdInput(e.target.value);
 const parsed = parseInt(e.target.value);
 if (!isNaN(parsed) && parsed > 0) {
 setLowStockFilterThreshold(parsed);
 }
 }}
 className="w-10 text-center rounded border border-orange-200 dark:border-orange-800 bg-card font-mono text-[10.5px] font-bold py-0.5 outline-none px-1"
 placeholder="25"
 />
 )}
 </div>
 )}
 </div>
 </div>

 {/* MODAL WORKSPACE */}
 <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
 
 {/* =======================================
 CARD 1: TOP SELLING PRODUCT DETAILS 
 ======================================= */}
 {activeModal ==="topSelling" && (
 <div className="space-y-6">
 {/* Core metrics grid */}
 {(() => {
 // Determine top seller inside range
 const sorted = [...products].map(p => ({
 product: p,
 sales: getProductLiveSales(p.id)
 })).sort((a,b) => b.sales.unitsSold - a.sales.unitsSold);

 const currentTop = sorted[0]?.product;
 const currentSalesObj = sorted[0]?.sales || getProductLiveSales("");

 if (!currentTop) {
 return <div className="p-12 text-center text-sm text-muted italic">No top seller identified for this criteria.</div>;
 }

 return (
 <div className="space-y-6 animate-in fade-in duration-200">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Champion Block */}
 <div onClick={() => onInspectProduct(currentTop)} className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 dark:border-blue-950/40  col-span-1 md:col-span-2 flex items-center justify-between cursor-pointer hover:shadow-sm">
 <div className="flex items-center gap-3.5">
 <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/60 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 p-2.5 font-bold"><Layers className="h-6 w-6" /></div>
 <div>
 <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">Top Selling Product</span>
 <h4 className="text-base font-bold text-primary dark:text-gray-100">{currentTop.name}</h4>
 <p className="text-[10.5px] text-muted font-mono">{currentTop.id} • Color: {currentTop.color ||"None"}</p>
 </div>
 </div>
 <div className="text-right text-xs">
 <div className="font-mono text-xl font-black text-blue-700 dark:text-blue-300">{currentSalesObj.unitsSold}</div>
 <span className="text-muted text-[10px] font-bold uppercase">Units Sold</span>
 </div>
 </div>

 {/* Revenue generated block */}
 <div className="p-4 rounded-xl border border-default bg-surface/30 /10 flex items-center justify-between">
 <div>
 <span className="text-[9.5px] uppercase font-bold text-muted tracking-wider">Revenue Earned</span>
 <h4 className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">₹{currentSalesObj.revenueGenerated.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h4>
 <span className="text-[9.5px] text-muted">Stock Available: <strong>{currentTop.stockAvailable ?? 0} {currentTop.unit}</strong></span>
 </div>
 <IndianRupee className="h-9 w-9 text-muted/40" />
 </div>
 </div>

 {/* Sales Sub-analytics counters */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="bg-card border border-default dark:border-default p-3 h-full rounded-xl">
 <span className="text-[9px] uppercase font-semibold text-muted">Units This Week</span>
 <div className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-lg mt-0.5">{currentSalesObj.weeklyUnits}</div>
 </div>
 <div className="bg-card border border-default dark:border-default p-3 h-full rounded-xl">
 <span className="text-[9px] uppercase font-semibold text-muted">Units This Month</span>
 <div className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-lg mt-0.5">{currentSalesObj.monthlyUnits}</div>
 </div>
 <div className="bg-card border border-default dark:border-default p-3 h-full rounded-xl">
 <span className="text-[9px] uppercase font-semibold text-muted">Units This Year</span>
 <div className="font-mono font-extrabold text-purple-600 dark:text-purple-400 text-lg mt-0.5">{currentSalesObj.yearlyUnits}</div>
 </div>
 <div className="bg-card border border-default dark:border-default p-3 h-full rounded-xl">
 <span className="text-[9px] uppercase font-semibold text-muted">Last Sale Date</span>
 <div className="font-mono font-bold text-secondary dark:text-muted text-xs mt-1.5">{currentSalesObj.lastSoldDate}</div>
 </div>
 </div>

 {/* Sales Trend representation */}
 <div className="bg-surface/50 /30 rounded-xl border border-default dark:border-default p-4 space-y-3">
 <h4 className="text-xs font-bold text-secondary dark:text-zinc-300 uppercase tracking-wide flex items-center gap-1.5"><BarChart2 className="h-4 w-4 text-blue-600" /> Dynamic Monthly Revenue Trend</h4>
 {Object.keys(currentSalesObj.monthlyTrend).length > 0 ? (
 <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5 pt-2">
 {Object.entries(currentSalesObj.monthlyTrend).map(([mon, value]) => (
 <div key={mon} className="p-2 bg-card rounded-lg shadow-xs border border-default text-center space-y-0.5">
 <span className="text-[9px] text-muted font-bold block truncate">{mon}</span>
 <span className="font-mono text-emerald-600 dark:text-emerald-450 text-[11px] font-bold block">₹{value.toLocaleString()}</span>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-[10.5px] text-muted italic">No incremental monthly trend data recorded during this date range.</p>
 )}
 </div>
 </div>
 );
 })()}

 {/* Table listing all products sorted descending by Units Sold */}
 {(() => {
 const searchLower = modalSearch.toLowerCase();
 const processedList = products
 .filter(p => {
 const matchesSearch = p.name.toLowerCase().includes(searchLower) || p.id.toLowerCase().includes(searchLower) || (p.category ||"").toLowerCase().includes(searchLower) || (p.color ||"").toLowerCase().includes(searchLower);
 const matchesCat = modalCategory ==="All" || p.category === modalCategory;
 const matchesColor = modalColor ==="All" || p.color === modalColor;
 return matchesSearch && matchesCat && matchesColor;
 })
 .map(p => ({
 ...p,
 sales: getProductLiveSales(p.id)
 }))
 .sort((a,b) => b.sales.unitsSold - a.sales.unitsSold);

 return (
 <div className="space-y-3.5">
 <div className="flex justify-between items-center">
 <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Sales Intelligence Product Index ({processedList.length})</h4>
 <div className="flex gap-2.5">
 <button 
 onClick={() => handleExportCSV(
 ["Product ID","Name","Category","Color","Units Sold","Revenue Generated","Stock Remaining"],
 processedList.map(item => [item.id, item.name, item.category, item.color ||"None", item.sales.unitsSold, item.sales.revenueGenerated, item.stockAvailable || 0]),
"TopSellingProducts"
 )}
 className="flex items-center gap-1 bg-card hover:bg-surface border border-default dark:hover:bg-zinc-800 rounded-lg px-2.5 py-1 text-[10.5px] font-bold text-muted dark:text-muted cursor-pointer"
 >
 <Download className="h-3 w-3" /> CSV
 </button>
 <button 
 onClick={() => handleExportExcel(
 ["Product ID","Name","Category","Color","Units Sold","Revenue Generated","Stock Remaining"],
 processedList.map(item => [item.id, item.name, item.category, item.color ||"None", item.sales.unitsSold, item.sales.revenueGenerated, item.stockAvailable || 0]),
"TopSellingProducts"
 )}
 className="flex items-center gap-1 bg-card hover:bg-surface border border-default dark:hover:bg-zinc-800 rounded-lg px-2.5 py-1 text-[10.5px] font-bold text-muted dark:text-muted cursor-pointer"
 >
 <Download className="h-3 w-3" /> Excel
 </button>
 </div>
 </div>

 <div className="overflow-hidden border border-default dark:border-default rounded-xl bg-card">
 <table className="min-w-full text-left text-xs">
 <thead className="bg-table-header border-b border-default dark:border-default font-bold uppercase tracking-wider text-[9.5px] text-muted">
 <tr>
 <th className="px-4 py-2.5">Product</th>
 <th className="px-4 py-2.5">Category</th>
 <th className="px-4 py-2.5 text-center">Units Sold</th>
 <th className="px-4 py-2.5 text-right">Revenue</th>
 <th className="px-4 py-2.5 text-center">Stock Remaining</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 dark:divide-zinc-850/50">
 {processedList.length > 0 ? processedList.map((item, idx) => (
 <tr 
 key={item.id} 
 onClick={() => {
 onClose();
 onInspectProduct(item);
 }}
 className="hover:bg-blue-50/20 dark:hover:bg-blue-950/10 cursor-pointer transition-colors"
 >
 <td className="px-4 py-2.5">
 <div className="font-bold text-primary dark:text-gray-100">{item.name}</div>
 <span className="text-[9px] text-muted font-mono uppercase">{item.id} • Color: {item.color ||"None"}</span>
 </td>
 <td className="px-4 py-2.5 font-medium text-muted dark:text-muted">{item.category}</td>
 <td className="px-4 py-2.5 text-center font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{item.sales.unitsSold}</td>
 <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{item.sales.revenueGenerated.toLocaleString()}</td>
 <td className="px-4 py-2.5 text-center">
 <span className={`font-mono font-extrabold px-2 py-0.5 rounded text-[10px] ${(item.stockAvailable || 0) <= 0 ? 'bg-red-50 text-red-600 dark:bg-red-950/20' : (item.stockAvailable || 0) <= 10 ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'}`}>
 {item.stockAvailable || 0}
 </span>
 </td>
 </tr>
 )) : (
 <tr>
 <td colSpan={5} className="p-8 text-center text-muted">No matching product sales entries found.</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 );
 })()}
 </div>
 )}

 {/* =======================================
 CARD 2: REVENUE DRIVERS PERFORMANCE 
 ======================================= */}
 {activeModal ==="bestRevenue" && (
 <div className="space-y-6">
 {/* Champion layout */}
 {(() => {
 const sorted = [...products].map(p => ({
 product: p,
 sales: getProductLiveSales(p.id)
 })).sort((a,b) => b.sales.revenueGenerated - a.sales.revenueGenerated);

 const topRevProd = sorted[0]?.product;
 const topRevObj = sorted[0]?.sales || getProductLiveSales("");

 if (!topRevProd) {
 return <div className="p-12 text-center text-sm text-muted italic">No revenue data available.</div>;
 }

 return (
 <div className="space-y-6 animate-in fade-in duration-200">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Champion Card */}
 <div onClick={() => onInspectProduct(topRevProd)} className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 dark:border-emerald-950/40 dark:bg-emerald-950/10 col-span-1 md:col-span-2 flex items-center justify-between cursor-pointer hover:shadow-xs">
 <div className="flex items-center gap-3.5">
 <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 p-2.5 font-bold"><Coins className="h-6 w-6" /></div>
 <div>
 <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Top Revenue Champion</span>
 <h4 className="text-base font-bold text-primary dark:text-gray-100">{topRevProd.name}</h4>
 <p className="text-[10.5px] text-muted font-mono">{topRevProd.id} • Color: {topRevProd.color ||"None"}</p>
 </div>
 </div>
 <div className="text-right">
 <div className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">₹{topRevObj.revenueGenerated.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
 <span className="text-muted text-[10px] font-bold uppercase block mt-0.5">Total Revenue</span>
 </div>
 </div>

 {/* Summary block */}
 <div className="p-4 rounded-xl border border-default bg-surface/30 /10 flex flex-col justify-center">
 <span className="text-[9px] uppercase font-bold text-muted tracking-wider block">Avg Selling Rate</span>
 <h4 className="text-xl font-bold font-mono text-secondary dark:text-zinc-300 mt-1">₹{topRevProd.price.toFixed(2)}</h4>
 <span className="text-[9px] text-muted block mt-1">Average Profit Margin: <strong>{(((topRevProd.price - (topRevProd.purchaseCost || 0)) / topRevProd.price) * 100).toFixed(1)}%</strong></span>
 </div>
 </div>

 {/* Table of items sorted descending by revenue */}
 {(() => {
 const searchLower = modalSearch.toLowerCase();
 const processedRevList = products
 .filter(p => {
 const matchesSearch = p.name.toLowerCase().includes(searchLower) || p.id.toLowerCase().includes(searchLower) || (p.category ||"").toLowerCase().includes(searchLower);
 const matchesCat = modalCategory ==="All" || p.category === modalCategory;
 const matchesColor = modalColor ==="All" || p.color === modalColor;
 return matchesSearch && matchesCat && matchesColor;
 })
 .map(p => ({
 ...p,
 sales: getProductLiveSales(p.id)
 }))
 .sort((a,b) => b.sales.revenueGenerated - a.sales.revenueGenerated);

 return (
 <div className="space-y-3.5">
 <div className="flex justify-between items-center">
 <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Enterprise Revenue Scorecard ({processedRevList.length})</h4>
 <div className="flex gap-2">
 <button 
 onClick={() => handleExportCSV(
 ["Product ID","Product","Category","Units Sold","Average Price","Total Revenue","Remaining Stock"],
 processedRevList.map(item => [item.id, item.name, item.category, item.sales.unitsSold, item.price, item.sales.revenueGenerated, item.stockAvailable || 0]),
"RevenueChampions"
 )}
 className="flex items-center gap-1 bg-card hover:bg-surface border border-default dark:hover:bg-zinc-800 rounded-lg px-2.5 py-1 text-[10.5px] font-bold text-muted dark:text-muted cursor-pointer"
 >
 <Download className="h-3 w-3" /> CSV
 </button>
 <button 
 onClick={() => handleExportExcel(
 ["Product ID","Product","Category","Units Sold","Average Price","Total Revenue","Remaining Stock"],
 processedRevList.map(item => [item.id, item.name, item.category, item.sales.unitsSold, item.price, item.sales.revenueGenerated, item.stockAvailable || 0]),
"RevenueChampions"
 )}
 className="flex items-center gap-1 bg-card hover:bg-surface border border-default dark:hover:bg-zinc-800 rounded-lg px-2.5 py-1 text-[10.5px] font-bold text-muted dark:text-muted cursor-pointer"
 >
 <Download className="h-3 w-3" /> Excel
 </button>
 </div>
 </div>

 <div className="overflow-hidden border border-default dark:border-default rounded-xl bg-card">
 <table className="min-w-full text-left text-xs">
 <thead className="bg-table-header border-b border-default dark:border-default font-bold uppercase tracking-wider text-[9.5px] text-muted">
 <tr>
 <th className="px-4 py-2.5">Product</th>
 <th className="px-4 py-2.5">Category</th>
 <th className="px-4 py-2.5 text-center">Units Sold</th>
 <th className="px-4 py-2.5 text-right">Avg Price</th>
 <th className="px-4 py-2.5 text-right font-black text-emerald-800 dark:text-emerald-450">Total Revenue</th>
 <th className="px-4 py-2.5 text-center">Stock</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 dark:divide-zinc-850/50">
 {processedRevList.length > 0 ? processedRevList.map((item) => (
 <tr 
 key={item.id} 
 onClick={() => {
 onClose();
 onInspectProduct(item);
 }}
 className="hover:bg-emerald-50/10 dark:hover:bg-emerald-950/10 cursor-pointer transition-colors"
 >
 <td className="px-4 py-2.5">
 <div className="font-bold text-primary dark:text-gray-100">{item.name}</div>
 <span className="text-[9px] text-muted font-mono uppercase">{item.id} • Brand: {item.brand ||"N/A"}</span>
 </td>
 <td className="px-4 py-2.5 text-muted dark:text-muted">{item.category}</td>
 <td className="px-4 py-2.5 text-center font-mono font-bold text-secondary dark:text-muted">{item.sales.unitsSold}</td>
 <td className="px-4 py-2.5 text-right font-mono">₹{item.price.toFixed(2)}</td>
 <td className="px-4 py-2.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">₹{item.sales.revenueGenerated.toLocaleString()}</td>
 <td className="px-4 py-2.5 text-center">
 <span className={`font-mono text-xs font-bold ${(item.stockAvailable || 0) <= 0 ? 'text-red-500' : 'text-muted dark:text-muted'}`}>
 {item.stockAvailable || 0}
 </span>
 </td>
 </tr>
 )) : (
 <tr>
 <td colSpan={6} className="p-8 text-center text-muted">No premium revenue items matching queries.</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 );
 })()}
 </div>
 );
 })()}
 </div>
 )}

 {/* =======================================
 CARD 3: SKU INTELLIGENCE EXPLORER
 ======================================= */}
 {activeModal ==="mostSoldColor" && (
 <div className="space-y-6">
 {/* Top summary card */}
 {(() => {
 const variants = calculatedVariantMetrics;
 const champion = variants.length > 0 ? variants[0] : null;

 if (!champion) {
 return <div className="p-12 text-center text-sm text-muted italic font-mono">No SKU metrics recorded. Please save an invoice with a SKU.</div>;
 }

 const totalRevenue = variants.reduce((sum, v) => sum + v.revenueGenerated, 0);

 return (
 <div className="space-y-5 animate-in fade-in duration-200">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Champion aesthetic card */}
 <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/20 dark:border-purple-950/40 dark:bg-purple-950/10 col-span-1 md:col-span-2 flex items-center justify-between">
 <div className="flex items-center gap-3.5">
 <div className="h-10 w-10 bg-card rounded-full flex items-center justify-center shadow border-2 border-white">
 <Tag className="h-4.5 w-4.5 text-purple-600 dark:text-purple-300" />
 </div>
 <div>
 <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 tracking-wider">Top Selling SKU Champion</span>
 <h4 className="text-sm font-bold text-primary dark:text-gray-100">{champion.productName} ({champion.color})</h4>
 <p className="text-[10px] text-muted">Champion SKU by total invoiced units sold.</p>
 </div>
 </div>
 <div className="text-right">
 <div className="font-mono text-lg font-black text-purple-600 dark:text-purple-300">{champion.unitsSold} Pcs</div>
 <span className="text-muted text-[9px] font-bold uppercase block mt-0.5">Total Sold</span>
 </div>
 </div>

 {/* Revenue cumulative stat box */}
 <div className="p-4 rounded-xl border border-default dark:border-default bg-surface/30 /10 flex flex-col justify-center">
 <span className="text-[9px] uppercase font-bold text-muted tracking-wider block">Combined Sales Volume</span>
 <h4 className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h4>
 <span className="text-[9px] text-muted mt-1 block">Spans over <strong>{variants.length}</strong> active SKUs.</span>
 </div>
 </div>

 {/* Unified variant table */}
 <div className="space-y-3.5">
 <div className="flex justify-between items-center">
 <h4 className="text-xs font-bold uppercase tracking-wider text-muted">SKU Performance Register ({variants.length})</h4>
 <div className="flex gap-2">
 <button 
 onClick={() => handleExportCSV(
 ["Product Name","SKU Name","Units Sold","Revenue Generated","Current Stock"],
 variants.map(v => [v.productName, v.color, v.unitsSold, v.revenueGenerated, v.currentStock]),
"SKUPerformance"
 )}
 className="flex items-center gap-1 bg-card hover:bg-surface border border-default dark:hover:bg-zinc-800 rounded-lg px-2.5 py-1 text-[10.5px] font-bold text-muted dark:text-muted cursor-pointer"
 >
 <Download className="h-3 w-3" /> CSV
 </button>
 </div>
 </div>

 <div className="overflow-hidden border border-default dark:border-default rounded-xl bg-card">
 <div className="overflow-x-auto">
 <table className="min-w-full text-left text-xs">
 <thead className="bg-table-header border-b border-default dark:border-default font-bold uppercase tracking-wider text-[9.5px] text-muted">
 <tr>
 <th className="px-4 py-2.5">Product Details</th>
 <th className="px-4 py-2.5">SKU Name</th>
 <th className="px-4 py-2.5 text-center">Current Stock</th>
 <th className="px-4 py-2.5 text-center">Volume Sold</th>
 <th className="px-4 py-2.5 text-right">Invoice Revenue</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 dark:divide-zinc-850/50">
 {variants.map((v, i) => (
 <tr key={i} className="hover:bg-purple-50/10 dark:hover:bg-purple-950/10 transition-colors">
 <td className="px-4 py-2.5">
 <div className="font-bold text-primary dark:text-gray-100">{v.productName}</div>
 <div className="text-[10px] text-muted font-mono">{v.productId}</div>
 </td>
 <td className="px-4 py-2.5">
 <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-card-secondary dark:bg-zinc-800 text-secondary dark:text-gray-200">
 {v.color}
 </span>
 </td>
 <td className="px-4 py-2.5 text-center font-mono font-semibold text-muted dark:text-muted">
 {v.currentStock} pcs
 </td>
 <td className="px-4 py-2.5 text-center font-mono font-black text-purple-600 dark:text-purple-450">
 {v.unitsSold} sold
 </td>
 <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-450">
 ₹{v.revenueGenerated.toLocaleString()}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </div>
 );
 })()}
 </div>
 )}

 {/* =======================================
 CARD 4: ACTIVE LOW STOCK MANAGEMENT
 ======================================= */}
 {activeModal ==="lowStock" && (
 <div className="space-y-4">
 {(() => {
 const searchLower = modalSearch.toLowerCase();
 const readyLowStock = products
 .filter(p => (p.inventoryType ==="Stock Item" || !p.inventoryType) && p.stockAvailable !== undefined && p.stockAvailable <= lowStockFilterThreshold)
 .filter(p => {
 const matchesSearch = p.name.toLowerCase().includes(searchLower) || p.id.toLowerCase().includes(searchLower) || (p.color ||"").toLowerCase().includes(searchLower);
 const matchesCat = modalCategory ==="All" || p.category === modalCategory;
 const matchesColor = modalColor ==="All" || p.color === modalColor;
 return matchesSearch && matchesCat && matchesColor;
 });

 return (
 <div className="space-y-4">
 <div className="flex justify-between items-center bg-orange-50/10 dark:bg-orange-950/5 border border-orange-100 dark:border-orange-900/10 p-3 rounded-xl">
 <div className="flex items-center gap-2">
 <AlertTriangle className="h-4.5 w-4.5 text-orange-500 animate-pulse" />
 <span className="text-xs text-orange-850 dark:text-orange-300 font-bold">Identified {readyLowStock.length} items exhibiting potential inventory stock deficiencies (&le; {lowStockFilterThreshold} units).</span>
 </div>
 <button 
 onClick={() => handleExportCSV(
 ["Product ID","Product","Category","Color","Stock Remaining","Low Stock Status"],
 readyLowStock.map(p => [p.id, p.name, p.category, p.color ||"None", p.stockAvailable || 0,"Low Stock"]),
"LowStockCatalog"
 )}
 className="bg-card hover:bg-surface border border-default dark:hover:bg-zinc-800 rounded-lg px-2 py-1 text-[10.5px] font-bold text-muted dark:text-muted cursor-pointer"
 >
 <Download className="h-3 w-3" /> Export List
 </button>
 </div>

 <div className="overflow-hidden border border-default dark:border-default rounded-xl bg-card">
 <table className="min-w-full text-left text-xs">
 <thead className="bg-table-header border-b border-default dark:border-default font-bold uppercase tracking-wider text-[9.5px] text-muted">
 <tr>
 <th className="px-4 py-2.5">Product Design</th>
 <th className="px-4 py-2.5">Category</th>
 <th className="px-4 py-2.5">Hue / Dye</th>
 <th className="px-4 py-2.5 text-center">Remaining Stock</th>
 <th className="px-4 py-2.5 text-center">Stock Index Status</th>
 <th className="px-4 py-2.5 text-center">Intervention Control</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 dark:divide-zinc-850/50">
 {readyLowStock.length > 0 ? readyLowStock.map(p => (
 <tr key={p.id} className="hover:bg-orange-50/5 dark:hover:bg-orange-950/5 transition-colors">
 <td onClick={() => { onClose(); onInspectProduct(p); }} className="px-4 py-2.5 cursor-pointer">
 <div className="font-bold text-primary dark:text-gray-100">{p.name}</div>
 <span className="text-[9px] text-muted font-mono">{p.id}</span>
 </td>
 <td className="px-4 py-2.5 text-muted dark:text-muted font-medium">{p.category}</td>
 <td className="px-4 py-2.5 font-bold text-muted">{p.color ||"None"}</td>
 <td className="px-4 py-2.5 text-center">
 {editingStockId === p.id ? (
 <div className="flex items-center justify-center gap-1">
 <input
 type="number"
 value={quickStockValue}
 onChange={(e) => setQuickStockValue(Math.max(0, parseInt(e.target.value) || 0))}
 className="w-12 text-center rounded border border-default bg-card p-0.5 text-xs font-mono font-bold"
 />
 <button 
 onClick={async () => {
 await onQuickUpdateStock(p, quickStockValue);
 setEditingStockId(null);
 }}
 className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer border-none"
 title="Save stock value"
 >
 <CheckCircle2 className="h-3 w-3" />
 </button>
 </div>
 ) : (
 <span className={`font-mono font-black text-sm ${(p.stockAvailable || 0) <= 0 ? 'text-red-600' : 'text-orange-500'}`}>
 {p.stockAvailable || 0}
 </span>
 )}
 </td>
 <td className="px-4 py-2.5 text-center">
 <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${(p.stockAvailable || 0) === 0 ? 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400' : 'bg-orange-100 text-orange-850 dark:bg-orange-950/20 dark:text-orange-400'}`}>
 {(p.stockAvailable || 0) === 0 ?"Deficit Out" :"Low Reserve"}
 </span>
 </td>
 <td className="px-4 py-2.5 text-center">
 <div className="flex items-center justify-center gap-2">
 <button 
 onClick={() => {
 setEditingStockId(p.id);
 setQuickStockValue(p.stockAvailable || 0);
 }}
 className="px-2 py-1 bg-surface hover:bg-card-secondary dark:hover:bg-zinc-800 text-[10px] font-bold rounded-md text-orange-600 cursor-pointer border border-default"
 >
 Adjust Stock
 </button>
 <button 
 onClick={() => {
 onClose();
 onTriggerEditForm(p);
 }}
 className="px-2 py-1 bg-surface hover:bg-card-secondary dark:hover:bg-zinc-800 text-[10px] font-bold rounded-md text-blue-600 cursor-pointer border border-default"
 >
 Full Edit
 </button>
 </div>
 </td>
 </tr>
 )) : (
 <tr>
 <td colSpan={6} className="p-8 text-center text-muted">All ready-stock products fully provisioned. Zero low stock items found!</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 );
 })()}
 </div>
 )}

 {/* =======================================
 CARD 5: OUT OF STOCK RECOVERY
 ======================================= */}
 {activeModal ==="outOfStock" && (
 <div className="space-y-4">
 {(() => {
 const searchLower = modalSearch.toLowerCase();
 const outOfStockList = products
 .filter(p => (p.inventoryType ==="Stock Item" || !p.inventoryType) && (p.stockAvailable || 0) <= 0)
 .filter(p => {
 const matchesSearch = p.name.toLowerCase().includes(searchLower) || p.id.toLowerCase().includes(searchLower) || (p.color ||"").toLowerCase().includes(searchLower);
 const matchesCat = modalCategory ==="All" || p.category === modalCategory;
 const matchesColor = modalColor ==="All" || p.color === modalColor;
 return matchesSearch && matchesCat && matchesColor;
 });

 return (
 <div className="space-y-4 animate-in fade-in duration-200">
 <div className="bg-red-50/10 dark:bg-red-950/5 border border-red-150 dark:border-red-900/10 p-3 rounded-xl flex justify-between items-center">
 <div className="flex items-center gap-2 text-xs font-bold text-red-700 dark:text-red-400">
 <AlertTriangle className="h-4.5 w-4.5 text-red-600 animate-bounce" />
 <span>Crucial alerts: {outOfStockList.length} ready-stock designs displaying 0 remaining inventories.</span>
 </div>
 <button 
 onClick={() => handleExportCSV(
 ["Product ID","Product Name","Category","Color","Last Sold Date"],
 outOfStockList.map(p => [p.id, p.name, p.category, p.color ||"None", p.lastSoldDate ||"None"]),
"OutOfStockCatalog"
 )}
 className="bg-card hover:bg-surface border border-default dark:hover:bg-zinc-800 rounded-lg px-2 py-1 text-[10.5px] font-bold text-muted dark:text-muted cursor-pointer"
 >
 <Download className="h-3 w-3" /> Export List
 </button>
 </div>

 <div className="overflow-hidden border border-default dark:border-default rounded-xl bg-card">
 <table className="min-w-full text-left text-xs">
 <thead className="bg-table-header border-b border-default dark:border-default font-bold uppercase tracking-wider text-[9.5px] text-muted">
 <tr>
 <th className="px-4 py-2.5">Deficit Product</th>
 <th className="px-4 py-2.5">Category</th>
 <th className="px-4 py-2.5">Aesthetic Color</th>
 <th className="px-4 py-2.5 text-center">Last Dispatched Date</th>
 <th className="px-4 py-2.5 text-center">Supply Action Recovery</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 dark:divide-zinc-850/50">
 {outOfStockList.length > 0 ? outOfStockList.map(p => (
 <tr key={p.id} className="hover:bg-red-50/5 dark:hover:bg-red-950/5 transition-colors">
 <td onClick={() => { onClose(); onInspectProduct(p); }} className="px-4 py-2.5 cursor-pointer">
 <div className="font-bold text-primary dark:text-gray-100">{p.name}</div>
 <span className="text-[9px] text-muted font-mono tracking-tight">{p.id}</span>
 </td>
 <td className="px-4 py-2.5 text-muted dark:text-muted font-medium">{p.category}</td>
 <td className="px-4 py-2.5 text-muted font-bold">{p.color ||"None"}</td>
 <td className="px-4 py-2.5 text-center font-mono text-muted">{p.lastSoldDate ||"Never Dispatched"}</td>
 <td className="px-4 py-2.5 text-center">
 {editingStockId === p.id ? (
 <div className="flex items-center justify-center gap-1.5 animate-in slide-in-from-right-2 duration-150">
 <input
 type="number"
 placeholder="Stock"
 value={quickStockValue}
 onChange={(e) => setQuickStockValue(Math.max(0, parseInt(e.target.value) || 0))}
 className="w-14 text-center rounded border border-default bg-card p-0.5 text-xs font-mono font-bold"
 />
 <button 
 onClick={async () => {
 await onQuickUpdateStock(p, quickStockValue);
 setEditingStockId(null);
 }}
 className="px-2.5 py-0.5 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer text-[10.5px] border-none"
 >
 Save
 </button>
 </div>
 ) : (
 <div className="flex items-center justify-center gap-2">
 <button 
 onClick={() => {
 setEditingStockId(p.id);
 setQuickStockValue(10); // Default restock to 10 units
 }}
 className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 rounded-lg cursor-pointer border border-emerald-100 dark:border-emerald-900/40"
 >
 Quick Restock
 </button>
 <button 
 onClick={() => {
 onClose();
 onTriggerEditForm(p);
 }}
 className="px-2.5 py-1 bg-surface hover:bg-card-secondary dark:hover:bg-zinc-800 text-[10px] font-bold rounded-lg text-blue-600 cursor-pointer border border-default"
 >
 Modify Details
 </button>
 </div>
 )}
 </td>
 </tr>
 )) : (
 <tr>
 <td colSpan={5} className="p-8 text-center text-muted">Perfect scorecard! Zero catalogs completely depleted.</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 );
 })()}
 </div>
 )}

 </div>

 {/* MODAL FOOTER */}
 <div className="px-6 py-3 border-t border-default bg-surface/50 /30 flex items-center justify-between text-xs shrink-0">
 <span className="text-muted font-mono">Date Range Context: <strong>{modalDateRange}</strong></span>
 <button 
 onClick={onClose} 
 className="rounded-lg border border-default hover:bg-card-secondary dark:hover:bg-zinc-850 bg-card text-secondary dark:text-muted px-4 py-1.5 font-bold cursor-pointer"
 >
 Dismiss Panel
 </button>
 </div>

 </div>
 </div>
 );
}

// Collapsible Dashboard Advanced & Furniture Section
interface AdvancedAnalyticsDashboardProps {
 products: Product[];
 invoices: Invoice[];
 invoiceItems: InvoiceItem[];
}

export function AdvancedAnalyticsDashboard({
 products,
 invoices,
 invoiceItems
}: AdvancedAnalyticsDashboardProps) {
 const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false);

 // Computations
 const validInvoices = useMemo(() => {
 return invoices.filter(inv => {
 const pStatus = (inv.paymentStatus ||"").toLowerCase();
 const statusVal = (inv.status ||"").toLowerCase();
 return pStatus !=="cancelled" && pStatus !=="deleted" && statusVal !=="cancelled" && statusVal !=="deleted";
 });
 }, [invoices]);

 const validInvoiceItems = useMemo(() => {
 const validNoSet = new Set(validInvoices.map(inv => inv.invoiceNo));
 return invoiceItems.filter(item => validNoSet.has(item.invoiceNo));
 }, [invoiceItems, validInvoices]);

 const productSalesMap = useMemo(() => {
 const map: Record<string, { unitsSold: number; revenueGenerated: number }> = {};
 products.forEach(p => {
 map[p.id] = { unitsSold: 0, revenueGenerated: 0 };
 });
 validInvoiceItems.forEach(item => {
 const pId = item.productId ||"";
 if (!map[pId]) {
 map[pId] = { unitsSold: 0, revenueGenerated: 0 };
 }
 map[pId].unitsSold += (item.quantity || 0);
 map[pId].revenueGenerated += (item.amount || 0);
 });
 return map;
 }, [products, validInvoiceItems]);

 const advancedStats = useMemo(() => {
 // Top sold category
 const catRevenueMap: Record<string, number> = {};
 const catUnitsMap: Record<string, number> = {};
 products.forEach(p => {
 const sales = productSalesMap[p.id] || { unitsSold: 0, revenueGenerated: 0 };
 catRevenueMap[p.category] = (catRevenueMap[p.category] || 0) + sales.revenueGenerated;
 catUnitsMap[p.category] = (catUnitsMap[p.category] || 0) + sales.unitsSold;
 });

 let bestCategory = { category:"N/A", revenue: 0, units: 0 };
 Object.entries(catRevenueMap).forEach(([cat, rev]) => {
 if (rev > bestCategory.revenue) {
 bestCategory = { category: cat, revenue: rev, units: catUnitsMap[cat] || 0 };
 }
 });

 // Helper keyword extractor
 const getFurnitureStats = (keyword: string) => {
 const filtered = products.filter(p => 
 p.name.toLowerCase().includes(keyword.toLowerCase()) || 
 p.category.toLowerCase().includes(keyword.toLowerCase())
 );
 if (filtered.length === 0) return { name:"N/A", unitsSold: 0 };
 let best = filtered[0];
 let maxSold = -1;
 filtered.forEach(p => {
 const sold = productSalesMap[p.id]?.unitsSold || 0;
 if (sold > maxSold) {
 maxSold = sold;
 best = p;
 }
 });
 return { name: best.name, unitsSold: maxSold };
 };

 const mostSoldChair = getFurnitureStats("Chair");
 const mostSoldSofa = getFurnitureStats("Sofa");
 const mostSoldDiningSet = getFurnitureStats("Dining");
 const mostSoldCot = getFurnitureStats("Cot");
 const mostSoldWardrobe = getFurnitureStats("Wardrobe");

 // Top Selling by Hierarchy Type
 const soldNodesMap: Record<string, { unitsSold: number, revenueGenerated: number }> = {};
 products.forEach(p => { soldNodesMap[p.id] = { unitsSold: 0, revenueGenerated: 0 }; });

 // Accumulate sales at product level
 validInvoiceItems.forEach(item => {
   const qty = item.quantity || 0;
   const rev = item.amount || 0;
   const currentId = item.productId;
   if (currentId) {
     if (!soldNodesMap[currentId]) soldNodesMap[currentId] = { unitsSold: 0, revenueGenerated: 0 };
     soldNodesMap[currentId].unitsSold += qty;
     soldNodesMap[currentId].revenueGenerated += rev;
   }
 });

 // Calculate top category by grouping products
 const categorySales: Record<string, number> = {};
 products.forEach(p => {
   const cat = p.category || "General";
   const stats = soldNodesMap[p.id] || { unitsSold: 0, revenueGenerated: 0 };
   categorySales[cat] = (categorySales[cat] || 0) + stats.unitsSold;
 });
 let topCategory = { name: "N/A", units: 0 };
 Object.entries(categorySales).forEach(([name, units]) => {
   if (units > topCategory.units) {
     topCategory = { name, units };
   }
 });

 let topFamily = { name: "N/A", units: 0 };
 let topModel = { name: "N/A", units: 0 };
 let topSkuUnits = { name: "N/A", units: 0 };
 let topSkuRev = { name: "N/A", rev: 0 };

 products.forEach(p => {
   const stats = soldNodesMap[p.id] || { unitsSold: 0, revenueGenerated: 0 };
   if (stats.unitsSold > topSkuUnits.units) {
     topSkuUnits = { name: p.name, units: stats.unitsSold };
   }
   if (stats.revenueGenerated > topSkuRev.rev) {
     topSkuRev = { name: p.name, rev: stats.revenueGenerated };
   }
 });
 topFamily = topSkuUnits;
 topModel = topSkuUnits;

 // Most Profitable Product: product with highest total margin = (price - purchaseCost) * unitsSold
 let mostProfitableProduct = { name:"N/A", profit: 0 };
 let maxProfit = -1;
 products.forEach(p => {
 const sold = productSalesMap[p.id]?.unitsSold || 0;
 const profit = (p.price - (p.purchaseCost || 0)) * sold;
 if (profit > maxProfit) {
 maxProfit = profit;
 mostProfitableProduct = { name: p.name, profit };
 }
 });

 // Top Revenue Color
 const colRevMap: Record<string, number> = {};
 products.forEach(p => {
 const col = p.color ||"None";
 const sales = productSalesMap[p.id] || { revenueGenerated: 0 };
 colRevMap[col] = (colRevMap[col] || 0) + sales.revenueGenerated;
 });
 let topColor = { color:"None", revenue: 0 };
 Object.entries(colRevMap).forEach(([col, rev]) => {
 if (rev > topColor.revenue && col !=="None") {
 topColor = { color: col, revenue: rev };
 }
 });

 // Average Order Value
 const totalOrderRevenue = validInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
 const averageOrderValue = validInvoices.length > 0 ? totalOrderRevenue / validInvoices.length : 0;

 // Margin analysis
 let highestMargin = { name:"N/A", marginPercent: 0 };
 let lowestMargin = { name:"N/A", marginPercent: 100 };
 products.filter(p => p.price > 0).forEach(p => {
 const percent = ((p.price - (p.purchaseCost || 0)) / p.price) * 100;
 if (percent > highestMargin.marginPercent) highestMargin = { name: p.name, marginPercent: percent };
 if (percent < lowestMargin.marginPercent) lowestMargin = { name: p.name, marginPercent: percent };
 });

 // Cancelled items (returns)
 const cancelledInvs = invoices.filter(inv => (inv.paymentStatus ||"").toLowerCase() ==="cancelled" || (inv.status ||"").toLowerCase() ==="cancelled");
 const cancelledNos = new Set(cancelledInvs.map(inv => inv.invoiceNo));
 const cancelledItems = invoiceItems.filter(item => cancelledNos.has(item.invoiceNo));
 const returnsMap: Record<string, number> = {};
 cancelledItems.forEach(item => {
 returnsMap[item.productId] = (returnsMap[item.productId] || 0) + (item.quantity || 0);
 });
 let mostReturned = { name:"None", quantity: 0 };
 Object.entries(returnsMap).forEach(([pId, qty]) => {
 const p = products.find(prod => prod.id === pId);
 if (p && qty > mostReturned.quantity) {
 mostReturned = { name: p.name, quantity: qty };
 }
 });

 // Fastest / Slowest moving
 let fastest = { name:"N/A", unitsSold: 0 };
 let slowest = { name:"N/A", unitsSold: 999999 };
 products.forEach(p => {
 const sold = productSalesMap[p.id]?.unitsSold || 0;
 if (sold > fastest.unitsSold) fastest = { name: p.name, unitsSold: sold };
 if (sold < slowest.unitsSold) slowest = { name: p.name, unitsSold: sold };
 });
 if (slowest.unitsSold === 999999) slowest = { name:"N/A", unitsSold: 0 };

 return {
 topCategory,
 topFamily,
 topModel,
 topSkuUnits,
 topSkuRev,
 bestCategory,
 mostSoldChair,
 mostSoldSofa,
 mostSoldDiningSet,
 mostSoldCot,
 mostSoldWardrobe,
 mostProfitableProduct,
 topColor,
 averageOrderValue,
 highestMargin,
 lowestMargin,
 mostReturned,
 fastest,
 slowest
 };
 }, [products, productSalesMap, validInvoices, invoices, invoiceItems]);

 return (
 <div className="bg-card border border-default dark:border-default rounded-xl p-4 transition-all">
 <div className="flex items-center justify-between pb-3 border-b border-default dark:border-default">
 <div className="flex items-center gap-2">
 <BarChart2 className="h-5 w-5 text-indigo-600" />
 <div>
 <h4 className="font-bold text-primary dark:text-gray-100 text-sm">Modular Advanced Product Intelligence Center</h4>
 <p className="text-[10px] text-muted">Deep mathematical insights, profit margins, and furniture business niche indicators.</p>
 </div>
 </div>
 <button
 onClick={() => setShowAdvancedAnalytics(!showAdvancedAnalytics)}
 className="px-3.5 py-1.5 bg-blue-50 text-blue-700  dark:text-blue-300 font-extrabold text-xs rounded-xl hover:bg-blue-100 transition-colors cursor-pointer border-none"
 >
 {showAdvancedAnalytics ?"Colapse Intelligence" :"Expand Deep Analytics"}
 </button>
 </div>

 {showAdvancedAnalytics && (
 <div className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 animate-in slide-in-from-top-4 duration-300">
 
 {/* Hierarchy Performance Block */}
 <div className="p-4 bg-surface/20 /20 border border-default dark:border-default rounded-xl space-y-3">
 <h5 className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Top Sellers By Hierarchy</h5>
 <div className="space-y-1.5 text-xs text-muted dark:text-muted">
 <div className="flex justify-between border-b border-dashed border-default dark:border-default pb-1">
 <span>Category Leader:</span>
 <span className="font-bold truncate max-w-[120px] text-primary dark:text-primary" title={advancedStats.topCategory.name}>{advancedStats.topCategory.name}</span>
 </div>
 <div className="flex justify-between border-b border-dashed border-default dark:border-default pb-1">
 <span>Family Leader:</span>
 <span className="font-bold truncate max-w-[120px] text-primary dark:text-primary" title={advancedStats.topFamily.name}>{advancedStats.topFamily.name}</span>
 </div>
 <div className="flex justify-between border-b border-dashed border-default dark:border-default pb-1">
 <span>Model Leader:</span>
 <span className="font-bold truncate max-w-[120px] text-primary dark:text-primary" title={advancedStats.topModel.name}>{advancedStats.topModel.name}</span>
 </div>
 <div className="flex justify-between border-b border-dashed border-default dark:border-default pb-1">
 <span>Top Selling SKU:</span>
 <span className="font-bold truncate max-w-[120px] text-primary dark:text-primary" title={advancedStats.topSkuUnits.name}>{advancedStats.topSkuUnits.name}</span>
 </div>
 <div className="flex justify-between pb-1">
 <span>Highest Revenue SKU:</span>
 <span className="font-bold text-blue-600 dark:text-blue-400 truncate max-w-[120px]" title={advancedStats.topSkuRev.name}>{advancedStats.topSkuRev.name}</span>
 </div>
 </div>
 </div>

 {/* Niche Furniture Block */}
 <div className="p-4 bg-surface/20 /20 border border-default dark:border-default rounded-xl space-y-3">
 <h5 className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1.5"><ShoppingCart className="h-3.5 w-3.5" /> Furniture Niche Dispatches</h5>
 <div className="space-y-1.5 text-xs text-muted dark:text-muted">
 <div className="flex justify-between border-b border-dashed border-default dark:border-default pb-1">
 <span>Top Chair Sold:</span>
 <span className="font-bold truncate max-w-[120px] text-primary dark:text-primary" title={advancedStats.mostSoldChair.name}>{advancedStats.mostSoldChair.name}</span>
 </div>
 <div className="flex justify-between border-b border-dashed border-default dark:border-default pb-1">
 <span>Top Sofa Sold:</span>
 <span className="font-bold truncate max-w-[120px] text-primary dark:text-primary" title={advancedStats.mostSoldSofa.name}>{advancedStats.mostSoldSofa.name}</span>
 </div>
 <div className="flex justify-between border-b border-dashed border-default dark:border-default pb-1">
 <span>Top Dining Set:</span>
 <span className="font-bold truncate max-w-[120px] text-primary dark:text-primary" title={advancedStats.mostSoldDiningSet.name}>{advancedStats.mostSoldDiningSet.name}</span>
 </div>
 <div className="flex justify-between border-b border-dashed border-default dark:border-default pb-1">
 <span>Top Cot/Bed:</span>
 <span className="font-bold truncate max-w-[120px] text-primary dark:text-primary" title={advancedStats.mostSoldCot.name}>{advancedStats.mostSoldCot.name}</span>
 </div>
 <div className="flex justify-between pb-1">
 <span>Top Wardrobe:</span>
 <span className="font-bold truncate max-w-[120px] text-primary dark:text-primary" title={advancedStats.mostSoldWardrobe.name}>{advancedStats.mostSoldWardrobe.name}</span>
 </div>
 </div>
 </div>

 {/* Core Profit & Enterprise Blocks */}
 <div className="p-4 bg-surface/20 /20 border border-default dark:border-default rounded-xl space-y-3">
 <h5 className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1.5"><Coins className="h-3.5 w-3.5" /> High Margin Profitability Index</h5>
 <div className="space-y-1.5 text-xs text-muted dark:text-muted">
 <div className="flex justify-between border-b border-dashed border-default dark:border-default pb-1">
 <span>Most Profitable:</span>
 <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate max-w-[100px]" title={advancedStats.mostProfitableProduct.name}>{advancedStats.mostProfitableProduct.name}</span>
 </div>
 <div className="flex justify-between border-b border-dashed border-default dark:border-default pb-1">
 <span>Category Leader:</span>
 <span className="font-bold truncate max-w-[100px]" title={advancedStats.bestCategory.category}>{advancedStats.bestCategory.category}</span>
 </div>
 <div className="flex justify-between border-b border-dashed border-default dark:border-default pb-1">
 <span>Best Color Revenue:</span>
 <span className="font-bold text-purple-600 dark:text-purple-405">{advancedStats.topColor.color} (₹{Math.round(advancedStats.topColor.revenue).toLocaleString()})</span>
 </div>
 <div className="flex justify-between pb-1">
 <span>Average Order:</span>
 <span className="font-bold font-mono text-emerald-600">₹{Math.round(advancedStats.averageOrderValue).toLocaleString()}</span>
 </div>
 </div>
 </div>

 {/* Supply Chain Velocity Block */}
 <div className="p-4 bg-surface/20 /20 border border-default dark:border-default rounded-xl space-y-3">
 <h5 className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 tracking-wider flex items-center gap-1.5"><ArrowRightLeft className="h-3.5 w-3.5" /> Velocity & Risk Analysis</h5>
 <div className="space-y-1.5 text-xs text-muted dark:text-muted">
 <div className="flex justify-between border-b border-dashed border-default dark:border-default pb-1">
 <span>Fastest Moving:</span>
 <span className="font-bold truncate max-w-[110px]" title={advancedStats.fastest.name}>{advancedStats.fastest.name}</span>
 </div>
 <div className="flex justify-between border-b border-dashed border-default dark:border-default pb-1">
 <span>Slowest Moving:</span>
 <span className="font-bold text-red-500 truncate max-w-[110px]" title={advancedStats.slowest.name}>{advancedStats.slowest.name}</span>
 </div>
 <div className="flex justify-between border-b border-dashed border-default dark:border-default pb-1">
 <span>Best Markup Ratio:</span>
 <span className="font-bold text-emerald-600 truncate max-w-[110px]" title={advancedStats.highestMargin.name}>{Math.round(advancedStats.highestMargin.marginPercent)}%</span>
 </div>
 <div className="flex justify-between pb-1">
 <span>Most Returned (Cancelled):</span>
 <span className="font-bold text-red-500 truncate max-w-[100px]" title={advancedStats.mostReturned.name}>{advancedStats.mostReturned.name}</span>
 </div>
 </div>
 </div>

 </div>
 )}
 </div>
 );
}
