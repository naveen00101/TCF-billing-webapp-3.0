import React, { useState } from"react";
import { 
 Search, 
 Calendar, 
 FileText, 
 Printer, 
 Trash2, 
 X, 
 ChevronRight, 
 Download, 
 RefreshCw, 
 Edit2, 
 AlertTriangle, 
 RotateCcw, 
 Truck, 
 CheckCircle, 
 User, 
 Clock, 
 Award,
 Filter,
 ArrowDownToLine,
 IndianRupee,
 ChevronDown,
 ChevronUp,
 CreditCard,
 MapPin
} from"lucide-react";
import { getTodayStr, isDateInCurrentWeek, isDateInCurrentMonth, isDateInCurrentYear, parseInvoiceDate, getInvoiceDateStr, formatDisplayDate, formatDisplayDateTime, getCurrentTimeStr, getCurrentTimestamp } from"../utils/dateUtils";
import { Invoice, InvoiceItem, CompanySettings, InvoiceStatus, UserRole, Agent, PaymentTransaction, Customer, AddressHistoryRecord } from"../types";
import { SheetsSyncEngine } from"../utils/sheetsSync";
import { generateInvoicePDF } from"../utils/pdfGenerator";

type QuickTimeRange ="All Time" |"Today" |"This Week" |"This Month" |"Last 6 Months" |"This Year";
type PricePreset ="All" |"Below ₹5k" |"₹5k-₹25k" |"₹25k-₹50k" |"₹50k-₹100k" |"Above ₹100k";
type CustomPriceType ="Above" |"Below" |"Between" |"None";

interface HistoryTabProps {
 invoices: Invoice[];
 invoiceItems: InvoiceItem[];
 company: CompanySettings;
 onRefresh: () => void;
 onShowNotification: (text: string, type:"success" |"error" |"info") => void;
 initialStatusFilter?: string;
 onResetStatusFilter?: () => void;
 initiallyInspectedInvoiceNo?: string | null;
 onClearInspected?: () => void;
 onNavigateToTab?: (tab: string, filter?: string, extraState?: any) => void;
}

export default function HistoryTab({
 invoices,
 invoiceItems,
 company,
 onRefresh,
 onShowNotification,
 initialStatusFilter ="All",
 onResetStatusFilter,
 initiallyInspectedInvoiceNo,
 onClearInspected,
 onNavigateToTab,
}: HistoryTabProps) {
 const currentUser = SheetsSyncEngine.getCurrentUser();
 const userRole = currentUser?.role ||"Employee";

 const [search, setSearch] = useState("");
 const [startDate, setStartDate] = useState("");
 const [endDate, setEndDate] = useState("");
 const [statusFilter, setStatusFilter] = useState(initialStatusFilter);

 const [agentFilter, setAgentFilter] = useState("All");
 const [gstFilter, setGstFilter] = useState<"All" |"GST" |"Non-GST" |"WithinState" |"OutOfState">("All");
 const [paymentStatusFilter, setPaymentStatusFilter] = useState<"All" |"Paid" |"Partially Paid" |"Balance Pending">("All");
 const [paymentTypeFilter, setPaymentTypeFilter] = useState<"All" |"Full Payment" |"Advance Payment">("All");

 const [quickTimeRange, setQuickTimeRange] = useState<QuickTimeRange>(() => {
 return (localStorage.getItem("tcf_history_timeRange") as QuickTimeRange) ||"This Week";
 });

 const [sortType, setSortType] = useState(() => {
 return localStorage.getItem("tcf_history_sort") ||"Newest First";
 });

 React.useEffect(() => {
 localStorage.setItem("tcf_history_timeRange", quickTimeRange);
 }, [quickTimeRange]);

 React.useEffect(() => {
 localStorage.setItem("tcf_history_sort", sortType);
 }, [sortType]);
 
 const [pricePreset, setPricePreset] = useState<PricePreset>("All");
 const [customPriceType, setCustomPriceType] = useState<CustomPriceType>("None");
 const [customPriceMin, setCustomPriceMin] = useState("");
 const [customPriceMax, setCustomPriceMax] = useState("");

 const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

 // Sync state if initialStatusFilter changes
 React.useEffect(() => {
 setStatusFilter(initialStatusFilter ||"All");
 }, [initialStatusFilter]);

 const handleStatusFilterChange = (val: string) => {
 setStatusFilter(val);
 if (val ==="All" && onResetStatusFilter) {
 onResetStatusFilter();
 }
 };
 
 // Status filtering (e.g. Active vs. Soft Deleted)
 const [showSoftDeletedOnly, setShowSoftDeletedOnly] = useState(false);

 // Pagination states
 const [currentPage, setCurrentPage] = useState(1);
 const itemsPerPage = 20;

 // Reset page when any filter criteria change to prevent empty pages
 React.useEffect(() => {
   setCurrentPage(1);
 }, [
   search,
   startDate,
   endDate,
   statusFilter,
   agentFilter,
   gstFilter,
   paymentStatusFilter,
   paymentTypeFilter,
   pricePreset,
   customPriceType,
   customPriceMin,
   customPriceMax,
   quickTimeRange,
   sortType,
   showSoftDeletedOnly
 ]);
 
 // Selected invoice for detail drawer inspection
 const [inspectedInvoice, setInspectedInvoice] = useState<Invoice | null>(null);

 // Collect Payment Workflow states
 const [showCollectPaymentModal, setShowCollectPaymentModal] = useState(false);
 const [collectAmountInput, setCollectAmountInput] = useState("");
 const [collectNotesInput, setCollectNotesInput] = useState("");

 // Edit Address Modal States
 const [showEditAddressModal, setShowEditAddressModal] = useState(false);
 const [editAddressCurrent, setEditAddressCurrent] = useState("");
 const [editAddressNew, setEditAddressNew] = useState("");
 const [editAddressReason, setEditAddressReason] = useState("");

 // Handle prop-driven auto inspection of specific invoice
 React.useEffect(() => {
 if (initiallyInspectedInvoiceNo) {
 const match = invoices.find(inv => inv.invoiceNo === initiallyInspectedInvoiceNo);
 if (match) {
 setInspectedInvoice(match);
 if (onClearInspected) onClearInspected();
 }
 }
 }, [initiallyInspectedInvoiceNo, invoices]);

 // Edit fields states
 const [isEditing, setIsEditing] = useState(false);
 const [editStatus, setEditStatus] = useState<InvoiceStatus>("Work In Progress");
 const [editAssignedEmployee, setEditAssignedEmployee] = useState("");
 const [editExpectedDeliveryDate, setEditExpectedDeliveryDate] = useState("");
 const [editDeliveryNotes, setEditDeliveryNotes] = useState("");

 const activeStaff = SheetsSyncEngine.getEmployees().filter(e => e.status ==="Active");

 // Filters logic
 const filteredInvoices = invoices.filter((inv) => {
 // Soft Delete check
 const isDeletedFlag = inv.isSoftDeleted || inv.status ==="Deleted";
 if (showSoftDeletedOnly) {
 if (!isDeletedFlag) return false;
 } else {
 if (isDeletedFlag) return false;
 }

 // Role-based restrictions: Employee can only view OWN bills!
 if (userRole ==="Employee" && currentUser) {
 if (inv.createdBy !== currentUser.username && inv.assignedEmployee !== currentUser.username) {
 return false;
 }
 }

 // Dynamic Fulfillment Status Filter
 if (statusFilter !=="All") {
 if (statusFilter ==="Pending Deliveries") {
 if (inv.status !=="Ready for Delivery" && inv.status !=="Ready For Delivery" && inv.status !=="Delivered") {
 return false;
 }
 } else {
 if (inv.status?.toLowerCase() !== statusFilter?.toLowerCase()) {
 return false;
 }
 }
 }

 // Agent filter
 if (agentFilter !=="All") {
 if (inv.referralAgentId !== agentFilter) {
 return false;
 }
 }

 // GST Class categories matching
 if (gstFilter !=="All") {
 if (gstFilter ==="GST") {
 if (!inv.gstEnabled) return false;
 } else if (gstFilter ==="Non-GST") {
 if (inv.gstEnabled) return false;
 } else if (gstFilter ==="WithinState") {
 if (!inv.gstEnabled || inv.gstType !=="CGST_SGST") return false;
 } else if (gstFilter ==="OutOfState") {
 if (!inv.gstEnabled || inv.gstType !=="IGST") return false;
 }
 }

 // Payment Status filter
 if (paymentStatusFilter !=="All") {
 if (inv.paymentStatus !== paymentStatusFilter) return false;
 }

 if (paymentTypeFilter !=="All") {
 if ((inv.paymentType ||"Full Payment") !== paymentTypeFilter) return false;
 }

 // Price Filtering
 const revenue = inv.grandTotal;
 if (pricePreset !=="All") {
 if (pricePreset ==="Below ₹5k" && revenue >= 5000) return false;
 if (pricePreset ==="₹5k-₹25k" && (revenue < 5000 || revenue >= 25000)) return false;
 if (pricePreset ==="₹25k-₹50k" && (revenue < 25000 || revenue >= 50000)) return false;
 if (pricePreset ==="₹50k-₹100k" && (revenue < 50000 || revenue >= 100000)) return false;
 if (pricePreset ==="Above ₹100k" && revenue < 100000) return false;
 }

 if (customPriceType !=="None") {
 const pMin = parseFloat(customPriceMin) || 0;
 const pMax = parseFloat(customPriceMax) || 0;
 if (customPriceType ==="Above" && pMin > 0 && revenue <= pMin) return false;
 if (customPriceType ==="Below" && pMax > 0 && revenue >= pMax) return false;
 if (customPriceType ==="Between" && pMin > 0 && pMax > 0) {
 if (revenue < pMin || revenue > pMax) return false;
 }
 }

 // Search term matching (Smart Search)
 const sTerm = search.toLowerCase();
 let searchMatch = true;
 if (sTerm) {
 searchMatch =
 inv.invoiceNo.toLowerCase().includes(sTerm) ||
 inv.customerName.toLowerCase().includes(sTerm) ||
 (inv.mobile && String(inv.mobile).toLowerCase().includes(sTerm)) ||
 (inv.assignedEmployee && inv.assignedEmployee.toLowerCase().includes(sTerm)) ||
 (inv.referralAgentId && inv.referralAgentId.toLowerCase().includes(sTerm)) ||
 (inv.referralAgentName && inv.referralAgentName.toLowerCase().includes(sTerm)) ||
 (inv.deliveryNotes && inv.deliveryNotes.toLowerCase().includes(sTerm)) ||
 invoiceItems.filter(it => (it.invoiceId === inv.invoiceId) || (it.invoiceNo === inv.invoiceNo)).some(it => 
 (it.productName && it.productName.toLowerCase().includes(sTerm)) ||
 (it.productId && it.productId.toLowerCase().includes(sTerm))
 );
 }

 // Date range matching
 let dateMatch = true;
 const normalizedInvDate = getInvoiceDateStr(inv.date);
 
 // Quick Date Range Filter
 if (quickTimeRange !=="All Time") {
 if (quickTimeRange ==="Today") {
 if (normalizedInvDate !== getTodayStr()) return false;
 } else if (quickTimeRange ==="This Week") {
 if (!isDateInCurrentWeek(inv.date)) return false;
 } else if (quickTimeRange ==="This Month") {
 if (!isDateInCurrentMonth(inv.date)) return false;
 } else if (quickTimeRange ==="This Year") {
 if (!isDateInCurrentYear(inv.date)) return false;
 } else if (quickTimeRange ==="Last 6 Months") {
 const invDateObj = parseInvoiceDate(inv.date);
 const sixMonthsAgo = parseInvoiceDate(getTodayStr());
 sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
 if (invDateObj < sixMonthsAgo) return false;
 }
 }

 // Advanced manual date filters Overwrite Check
 if (startDate) {
 dateMatch = dateMatch && normalizedInvDate >= startDate;
 }
 if (endDate) {
 dateMatch = dateMatch && normalizedInvDate <= endDate;
 }

 return searchMatch && dateMatch;
 }).sort((a, b) => {
    const getSortTime = (inv: Invoice) => {
      if (inv.createdTimestamp) {
        const t = new Date(inv.createdTimestamp).getTime();
        if (!isNaN(t)) return t;
      }
      return parseInvoiceDate(inv.date).getTime();
    };

    switch (sortType) {
      case "Oldest First": return getSortTime(a) - getSortTime(b);
      case "Highest Bill Amount": return b.grandTotal - a.grandTotal;
      case "Lowest Bill Amount": return a.grandTotal - b.grandTotal;
      case "Highest Balance Due": return (b.balanceDue || 0) - (a.balanceDue || 0);
      case "Lowest Balance Due": return (a.balanceDue || 0) - (b.balanceDue || 0);
      case "Customer Name A-Z": return a.customerName.localeCompare(b.customerName);
      case "Customer Name Z-A": return b.customerName.localeCompare(a.customerName);
      case "Invoice Number A-Z": return a.invoiceNo.localeCompare(b.invoiceNo);
      case "Invoice Number Z-A": return b.invoiceNo.localeCompare(a.invoiceNo);
      case "Work In Progress First": {
        const valA = a.status === "Work In Progress" ? 0 : 1;
        const valB = b.status === "Work In Progress" ? 0 : 1;
        return valA !== valB ? valA - valB : getSortTime(b) - getSortTime(a);
      }
      case "Ready First": {
        const valA = a.status === "Ready for Delivery" ? 0 : 1;
        const valB = b.status === "Ready for Delivery" ? 0 : 1;
        return valA !== valB ? valA - valB : getSortTime(b) - getSortTime(a);
      }
      case "Completed First": {
        const valA = a.status === "Completed" ? 0 : 1;
        const valB = b.status === "Completed" ? 0 : 1;
        return valA !== valB ? valA - valB : getSortTime(b) - getSortTime(a);
      }
      case "Cancelled First": {
        const valA = a.status === "Cancelled" ? 0 : 1;
        const valB = b.status === "Cancelled" ? 0 : 1;
        return valA !== valB ? valA - valB : getSortTime(b) - getSortTime(a);
      }
      case "Paid First": {
        const valA = a.paymentStatus === "Paid" ? 0 : 1;
        const valB = b.paymentStatus === "Paid" ? 0 : 1;
        return valA !== valB ? valA - valB : getSortTime(b) - getSortTime(a);
      }
      case "Partially Paid First": {
        const valA = a.paymentStatus === "Partially Paid" ? 0 : 1;
        const valB = b.paymentStatus === "Partially Paid" ? 0 : 1;
        return valA !== valB ? valA - valB : getSortTime(b) - getSortTime(a);
      }
      case "Balance Pending First": {
        const valA = a.paymentStatus === "Balance Pending" ? 0 : 1;
        const valB = b.paymentStatus === "Balance Pending" ? 0 : 1;
        return valA !== valB ? valA - valB : getSortTime(b) - getSortTime(a);
      }
      case "Newest First":
      default:
        return getSortTime(b) - getSortTime(a);
    }
  });

 // Pagination calculations
 const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
 const activePage = Math.min(currentPage, Math.max(1, totalPages));
 const paginatedInvoices = filteredInvoices.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

 // Calculate summaries for UI
 const filteredMetrics = React.useMemo(() => {
 return filteredInvoices.reduce(
 (acc, inv) => {
 acc.totalRecords += 1;
 acc.totalRevenue += inv.grandTotal;
 if (inv.gstEnabled || inv.gstType) {
 let cgst = typeof inv.cgstAmount === 'string' ? parseFloat(inv.cgstAmount) : (inv.cgstAmount || 0);
 let sgst = typeof inv.sgstAmount === 'string' ? parseFloat(inv.sgstAmount) : (inv.sgstAmount || 0);
 let igst = typeof inv.igstAmount === 'string' ? parseFloat(inv.igstAmount) : (inv.igstAmount || 0);
 let taxAmt = typeof inv.taxAmount === 'string' ? parseFloat(inv.taxAmount) : (inv.taxAmount || 0);

 let gstAcc = 0;
 if (cgst > 0 || sgst > 0 || igst > 0) {
 gstAcc = (Number.isNaN(cgst) ? 0 : cgst) + (Number.isNaN(sgst) ? 0 : sgst) + (Number.isNaN(igst) ? 0 : igst);
 } else if (taxAmt > 0 && !Number.isNaN(taxAmt)) {
 gstAcc = taxAmt;
 }
 acc.gstRevenue += gstAcc;
 }
 if (inv.balanceDue && inv.balanceDue > 0) acc.outstandingBalance += inv.balanceDue;
 
 const s = inv.status.toLowerCase();
 if (s.includes("pending") || s ==="work in progress") acc.pending += 1;
 if (s ==="ready for delivery") acc.ready += 1;
 if (s ==="completed" || s ==="delivered") acc.completed += 1;

 return acc;
 },
 {
 totalRecords: 0,
 totalRevenue: 0,
 gstRevenue: 0,
 outstandingBalance: 0,
 pending: 0,
 ready: 0,
 completed: 0,
 }
 );
 }, [filteredInvoices]);

 // Fetch inspected invoice's items
 const inspectedItems = inspectedInvoice
 ? invoiceItems.filter((item) => (item.invoiceId === inspectedInvoice.invoiceId) || (item.invoiceNo === inspectedInvoice.invoiceNo))
 : [];

 // Format modal states
 const [showPrintModal, setShowPrintModal] = useState(false);
 const [showDownloadModal, setShowDownloadModal] = useState(false);
 const [selectedPrintFormat, setSelectedPrintFormat] = useState<"Receipt" |"A5" |"A4">("Receipt");
 const [selectedDownloadFormat, setSelectedDownloadFormat] = useState<"Receipt" |"A5" |"A4">("A4");

 const handleExecutePrint = () => {
 setShowPrintModal(false);
 if (!inspectedInvoice) return;
 const docId = inspectedInvoice.invoiceId || inspectedInvoice.invoiceNo;
 generateInvoicePDF(docId,"print");
 onShowNotification(`✓ Printed invoice ${inspectedInvoice.invoiceNo}`,"success");
 };

 const handleExecuteDownload = () => {
 setShowDownloadModal(false);
 if (!inspectedInvoice) return;
 const docId = inspectedInvoice.invoiceId || inspectedInvoice.invoiceNo;
 generateInvoicePDF(docId,"download");
 onShowNotification(`✓ Downloaded PDF invoice for ${inspectedInvoice.invoiceNo}`,"success");
 };

 const handleCollectPayment = async () => {
 if (!inspectedInvoice) return;

 const amt = parseFloat(collectAmountInput);
 if (isNaN(amt) || amt <= 0) {
 onShowNotification("Please enter a valid amount greater than zero.","error");
 return;
 }

 const currentBalance = inspectedInvoice.balanceDue ?? 0;
 if (amt > currentBalance + 0.01) {
 onShowNotification(`Amount received cannot exceed the balance due of ₹${currentBalance.toFixed(2)}.`,"error");
 return;
 }

 const TODAY_ISO = getTodayStr();
 const TIME_STR = getCurrentTimeStr();
 const TIMESTAMP_STR = getCurrentTimestamp();

 const currentAmountPaid = inspectedInvoice.amountPaid !== undefined 
 ? inspectedInvoice.amountPaid 
 : (inspectedInvoice.grandTotal - currentBalance);

 const calculatedNewAmountPaid = currentAmountPaid + amt;
 const calculatedNewBalanceDue = Math.max(0, currentBalance - amt);

 // Strict validation
 if (calculatedNewAmountPaid > inspectedInvoice.grandTotal + 0.01) {
 onShowNotification("Validation Error: Amount paid cannot exceed grand total.","error");
 return;
 }
 if (calculatedNewBalanceDue < -0.01) {
 onShowNotification("Validation Error: Balance due cannot be negative.","error");
 return;
 }
 const diff = Math.abs(calculatedNewAmountPaid + calculatedNewBalanceDue - inspectedInvoice.grandTotal);
 if (diff > 0.05) {
 onShowNotification("Validation Error: Mathematical mismatch on payment total.","error");
 return;
 }

 const newPaymentStatus:"Paid" |"Partially Paid" |"Balance Pending" = calculatedNewBalanceDue === 0 ?"Paid" :"Partially Paid";
 const newPaymentType = inspectedInvoice.paymentType ||"Full Payment";

 // Create unique Transaction ID
 const transactionId = `TXN-${inspectedInvoice.invoiceNo}-${Date.now()}`;

 // Create payment transaction object
 const newTxn: PaymentTransaction = {
 id: transactionId,
 invoiceNo: inspectedInvoice.invoiceNo,
 date: TODAY_ISO,
 time: TIME_STR,
 amount: amt,
 collectedBy: currentUser?.username ||"admin",
 notes: collectNotesInput.trim() || undefined
 };

 // Update LOCAL INVOICES LIST
 const updatedInvoices = invoices.map(inv => {
 if (inv.invoiceNo === inspectedInvoice.invoiceNo) {
 return {
 ...inv,
 amountPaid: calculatedNewAmountPaid,
 balanceDue: calculatedNewBalanceDue,
 paymentStatus: newPaymentStatus,
 lastEditedBy: currentUser?.username ||"admin",
 lastEditedDate: TODAY_ISO,
 lastEditedTime: TIME_STR,
 lastEditedTimestamp: TIMESTAMP_STR
 };
 }
 return inv;
 });

 // 1. Save updated invoices to localStorage
 SheetsSyncEngine.saveInvoices(updatedInvoices, true);

 // 2. Save payment transaction locally
 const existingTxns = SheetsSyncEngine.getPaymentTransactions();
 SheetsSyncEngine.savePaymentTransactions([...existingTxns, newTxn]);

 // 3. Add audit log
 SheetsSyncEngine.addAuditLog(
"Payment Collected",
 currentUser?.fullName ||"System Admin",
 `Invoice: ${inspectedInvoice.invoiceNo} | Collected: ₹${amt.toFixed(2)}`,
 `New Paid: ₹${calculatedNewAmountPaid.toFixed(2)}, Balance Due: ₹${calculatedNewBalanceDue.toFixed(2)}`
 );

 // Refresh UI state
 const freshlyUpdated = updatedInvoices.find(v => v.invoiceNo === inspectedInvoice.invoiceNo);
 setInspectedInvoice(freshlyUpdated || null);
 setShowCollectPaymentModal(false);
 setCollectAmountInput("");
 setCollectNotesInput("");
 onRefresh();

 onShowNotification(`✓ Received ₹${amt.toFixed(2)} for Invoice ${inspectedInvoice.invoiceNo}.`,"success");

 // 4. Sync online with Google Sheets
 const conn = SheetsSyncEngine.getConnectionSettings();
 if (conn.isConnected && conn.appsScriptUrl) {
 onShowNotification("Recording payment transaction on Google Sheets...","info");
 try {
 const payload = {
 transactionId: transactionId,
 invoiceId: inspectedInvoice.invoiceId || inspectedInvoice.invoiceNo,
 invoiceNo: inspectedInvoice.invoiceNo,
 date: TODAY_ISO,
 time: TIME_STR,
 amount: amt,
 collectedBy: currentUser?.username ||"admin",
 notes: collectNotesInput.trim() || `Collected ₹${amt.toFixed(2)}`,
 newAmountPaid: calculatedNewAmountPaid,
 newBalanceDue: calculatedNewBalanceDue,
 newPaymentStatus: newPaymentStatus,
 newPaymentType: newPaymentType
 };

 const result = await SheetsSyncEngine.pushTransaction(conn,"recordPaymentTransaction", payload);
 if (result.success) {
 onShowNotification(result.message,"success");
 } else {
 onShowNotification(`Payment logged locally. Sync failed: ${result.message}`,"error");
 }
 } catch (err: any) {
 onShowNotification(`Recorded payment offline. Sync failed: ${err.message || err}`,"error");
 }
 }
 };

 // Handle Address Edit & Saving with proper Address History
 const handleSaveAddress = async () => {
 if (userRole !== "Superadmin") {
 onShowNotification("Access Denied: Only Superadmin has clearance to modify customer primary addresses.","error");
 return;
 }
 if (!inspectedInvoice) return;

 const matchedCust = SheetsSyncEngine.getCustomers().find(
 (c) =>
 (c.mobile && c.mobile !=="N/A" && String(c.mobile).replace(/\D/g,"") === String(inspectedInvoice.mobile).replace(/\D/g,"")) ||
 c.name.toLowerCase() === inspectedInvoice.customerName.toLowerCase()
 );

 if (!matchedCust) {
 onShowNotification("Error: Associated customer record could not be found to apply address update.","error");
 return;
 }

 const oldAddress = (matchedCust.address || matchedCust.currentAddress ||"").trim();
 const newAddress = editAddressNew.trim();

 if (!newAddress) {
 onShowNotification("Please provide a valid address string.","error");
 return;
 }

 if (oldAddress.toLowerCase() === newAddress.toLowerCase()) {
 onShowNotification("No changes detected. The new address matches the current address.","info");
 setShowEditAddressModal(false);
 return;
 }

 // 1. Create a new AddressHistoryRecord
 const historyId = `ADDR-${Math.floor(1000 + Math.random() * 9000)}`;
 const now = new Date();
 const displayDate = now.toLocaleDateString("en-IN", {
 day:"2-digit",
 month:"short",
 year:"numeric"
 }) +"" + now.toLocaleTimeString("en-IN", {
 hour:"2-digit",
 minute:"2-digit",
 hour12: true
 });

 const historyRecord: AddressHistoryRecord = {
 id: historyId,
 address: oldAddress ||"Not Provided",
 oldAddress: oldAddress ||"Not Provided",
 newAddress: newAddress,
 createdDate: displayDate,
 createdBy: currentUser?.fullName || currentUser?.username ||"Admin",
 reason: editAddressReason.trim() ||"Address corrected from receipt ledger",
 customerId: matchedCust.id,
 status:"Old"
 };

 // Update customer records
 const updatedHistory = matchedCust.addressHistory ? [historyRecord, ...matchedCust.addressHistory] : [historyRecord];
 const updatedCust: Customer = {
 ...matchedCust,
 address: newAddress,
 currentAddress: newAddress,
 addressHistory: updatedHistory
 };

 // Save updated customer on master sheet
 const currentCustomers = SheetsSyncEngine.getCustomers();
 const updatedCustomersList = currentCustomers.map(c => c.id === matchedCust.id ? updatedCust : c);
 SheetsSyncEngine.saveCustomers(updatedCustomersList);

 // Audit Log for address change
 SheetsSyncEngine.addAuditLog(
"Address Updated",
 currentUser?.fullName || currentUser?.username ||"Admin",
 oldAddress ||"Not Provided",
 `New Address: ${newAddress} | Reason: ${editAddressReason.trim() || 'Correction'} (Customer ID: ${matchedCust.id})`
 );

 // Update address across all matching invoices for consistency
 const allInvoices = SheetsSyncEngine.getInvoices();
 const updatedInvoicesList = allInvoices.map((inv) => {
 const isMatch = (inv.mobile && inv.mobile !=="N/A" && String(inv.mobile).replace(/\D/g,"") === String(inspectedInvoice.mobile).replace(/\D/g,"")) ||
 inv.customerName.toLowerCase() === inspectedInvoice.customerName.toLowerCase();
 if (isMatch) {
 return {
 ...inv,
 customerBusinessAddress: newAddress,
 lastEditedBy: currentUser?.username ||"admin",
 lastEditedDate: now.toISOString().split('T')[0],
 lastEditedTimestamp: now.toISOString()
 };
 }
 return inv;
 });
 SheetsSyncEngine.saveInvoices(updatedInvoicesList);

 // Update currently inspected local state
 setInspectedInvoice({
 ...inspectedInvoice,
 customerBusinessAddress: newAddress
 });

 setShowEditAddressModal(false);
 setEditAddressReason("");
 onRefresh();

 onShowNotification("✓ Primary address updated successfully and change logged in history.","success");

 // 2. Sync changes online if connection exists
 const conn = SheetsSyncEngine.getConnectionSettings();
 if (conn.isConnected && conn.appsScriptUrl) {
 try {
 const payload = {
 customerId: matchedCust.id,
 address: newAddress,
 updatedHistoryJson: JSON.stringify(updatedHistory),
 updatedBy: currentUser?.username ||"admin"
 };
 const result = await SheetsSyncEngine.pushTransaction(conn,"updateCustomerAddress", payload);
 if (result.success) {
 onShowNotification("✓ Customer address update successfully synchronized with Sheets.","success");
 }
 } catch (err: any) {
 console.warn("Sheets address sync failed:", err);
 }
 }
 };

 // Switch to Editing view
 const startEditingInvoice = (inv: Invoice) => {
 if (userRole !== "Superadmin") {
 onShowNotification("Access Denied: Only Superadmin has clearance to edit invoices.","error");
 return;
 }
 setEditStatus(inv.status);
 setEditAssignedEmployee(inv.assignedEmployee ||"");
 setEditExpectedDeliveryDate(inv.expectedDeliveryDate ||"");
 setEditDeliveryNotes(inv.deliveryNotes ||"");
 setIsEditing(true);
 };

 // Submit invoice fields alteration
 const handleSaveEditInvoice = async () => {
 if (!inspectedInvoice) return;
 if (userRole !== "Superadmin") {
 onShowNotification("Access Denied: Only Superadmin has clearance to save changes to invoices.","error");
 return;
 }

 const TODAY_ISO = getTodayStr();
 const TIME_STR = getCurrentTimeStr();
 const TIMESTAMP_STR = getCurrentTimestamp();

 // Cancellation logic variables
 const rules = SheetsSyncEngine.getCancellationRules();
 const prevStatus = inspectedInvoice.status;
 const ruleRefundPercentage = rules[prevStatus] !== undefined ? rules[prevStatus] : 100; // default 100% refund
 const cancellationPercentage = 100 - ruleRefundPercentage;
 const grandPaid = inspectedInvoice.grandTotal;
 const cancellationDeduction = grandPaid * (cancellationPercentage / 100);
 const refundAmount = grandPaid * (ruleRefundPercentage / 100);

 const isStatusChanged = prevStatus !== editStatus;

 const updatedInvoices = invoices.map(inv => {
 if (inv.invoiceNo === inspectedInvoice.invoiceNo) {
 let cancellationProps = {};
 if (editStatus ==="Cancelled" && inv.status !=="Cancelled") {
 cancellationProps = {
 cancellationPercentage: cancellationPercentage,
 cancellationDeduction: cancellationDeduction,
 refundAmount: refundAmount,
 companyRetainedAmount: cancellationDeduction,
 deletedBy: currentUser?.username ||"admin",
 deletedDate: TODAY_ISO,
 };
 } else if (editStatus !=="Cancelled") {
 cancellationProps = {
 cancellationPercentage: undefined,
 cancellationDeduction: undefined,
 refundAmount: undefined,
 companyRetainedAmount: editStatus ==="Completed" ? inv.grandTotal : 0,
 deletedBy: undefined,
 deletedDate: undefined,
 };
 }

 return {
 ...inv,
 ...cancellationProps,
 status: editStatus,
 assignedEmployee: editAssignedEmployee || undefined,
 expectedDeliveryDate: editExpectedDeliveryDate || undefined,
 deliveryNotes: editDeliveryNotes || undefined,
 lastEditedBy: currentUser?.username ||"admin",
 lastEditedDate: TODAY_ISO,
 lastEditedTime: TIME_STR,
 lastEditedTimestamp: TIMESTAMP_STR
 };
 }
 return inv;
 });

 // Step 1: Optimistic Local State & Cache Update
 SheetsSyncEngine.saveInvoices(updatedInvoices, true);

 // Update inventory stock levels and sales logs if status changed to/from Cancelled
 if (isStatusChanged && (editStatus ==="Cancelled" || prevStatus ==="Cancelled")) {
 const isCancellation = editStatus ==="Cancelled";

 if (inspectedInvoice.promoCode) {
 const promoList = SheetsSyncEngine.getPromoCodes();
 const updatedPromos = promoList.map(p => {
 if (p.promoCode === inspectedInvoice.promoCode) {
 const change = isCancellation ? -1 : 1;
 return { ...p, usageCount: Math.max(p.usageCount + change, 0) };
 }
 return p;
 });
 SheetsSyncEngine.savePromoCodes(updatedPromos);
 }
 const activeItems = invoiceItems.filter(item => 
 (item.invoiceId === inspectedInvoice.invoiceId) || (item.invoiceNo === inspectedInvoice.invoiceNo)
 );

 if (activeItems.length > 0) {
 const currentProds = SheetsSyncEngine.getProducts();
 let modifiedProducts = false;
 const updatedProducts = currentProds.map(p => {
 const soldItemsForThisNode = activeItems.filter(i => i.productId === p.id);
 
 if (soldItemsForThisNode.length > 0) {
 modifiedProducts = true;
 const totalQtySold = soldItemsForThisNode.reduce((sum, item) => sum + item.quantity, 0);
 const totalAmountSold = soldItemsForThisNode.reduce((sum, item) => sum + item.amount, 0);

 // Multiplier: cancellation removes revenue (-rev).
 // Un-cancelling/restoring adds revenue (+rev).
 const revMultiplier = isCancellation ? -1 : 1;

 return {
 ...p,
 unitsSold: Math.max((p.unitsSold || 0) + (totalQtySold * revMultiplier), 0),
 revenueGenerated: Math.max((p.revenueGenerated || 0) + (totalAmountSold * revMultiplier), 0)
 };
 }
 return p;
 });

 if (modifiedProducts) {
 SheetsSyncEngine.saveProducts(updatedProducts);
 setTimeout(() => {
 const connAsync = SheetsSyncEngine.getConnectionSettings();
 if (connAsync && connAsync.appsScriptUrl) {
 activeItems.forEach(async (item) => {
 const matchedProduct = updatedProducts.find(prod => prod.id === item.productId || prod.id === item.skuId);
 if (matchedProduct) {
 await SheetsSyncEngine.pushTransaction(connAsync,"upsertProduct", matchedProduct).catch(() => {});
 }
 });
 }
 }, 250);
 }
 }
 }

 // Save audit log locally with requested signature formats
 if (isStatusChanged) {
 SheetsSyncEngine.addAuditLog(
"Invoice Status Changed",
 currentUser?.fullName ||"System Admin",
 `Invoice ${inspectedInvoice.invoiceNo} | Old status: ${prevStatus}`,
 `New status: ${editStatus}`
 );
 } else {
 SheetsSyncEngine.addAuditLog(
"Bill Edited",
 currentUser?.fullName ||"System Admin",
 `Invoice: ${inspectedInvoice.invoiceNo} (Status: ${inspectedInvoice.status})`,
 `Refitted Status: ${editStatus}, Assignee: ${editAssignedEmployee ||"none"}`
 );
 }

 if (editStatus ==="Cancelled" && prevStatus !=="Cancelled") {
 SheetsSyncEngine.addAuditLog(
"Invoice Cancelled",
 currentUser?.fullName ||"System Admin",
 `Invoice: ${inspectedInvoice.invoiceNo}`,
 `Cancellation policy applied: ${ruleRefundPercentage}% refund, deduction: ₹${cancellationDeduction.toFixed(2)}, refund: ₹${refundAmount.toFixed(2)}.`
 );
 }

 // Refresh display
 const freshlyUpdated = updatedInvoices.find(v => v.invoiceNo === inspectedInvoice.invoiceNo);
 setInspectedInvoice(freshlyUpdated || null);
 setIsEditing(false);
 onRefresh();

 // Step 2 & 3 & 4: Push to Google Sheets & handle failure/sync
 const conn = SheetsSyncEngine.getConnectionSettings();
 if (conn.isConnected && isStatusChanged) {
 onShowNotification("Saving status update to Google Sheets...","info");
 try {
 const payload = {
 invoiceId: inspectedInvoice.invoiceId || inspectedInvoice.invoiceNo,
 invoiceNo: inspectedInvoice.invoiceNo,
 status: editStatus,
 lastUpdated: `${TODAY_ISO} ${TIME_STR}`,
 updatedBy: currentUser?.username ||"admin"
 };
 const syncResult = await SheetsSyncEngine.pushTransaction(conn,"updateInvoiceStatus", payload);
 if (!syncResult.success) {
 onShowNotification(`Status update failed: ${syncResult.message ||"Google Sheets could not be updated."}`,"error");

 // Transaction rollback
 const revertedInvoices = invoices.map(inv => {
 if (inv.invoiceNo === inspectedInvoice.invoiceNo) {
 return { ...inv, status: prevStatus };
 }
 return inv;
 });
 SheetsSyncEngine.saveInvoices(revertedInvoices, true);
 const revertedMatch = revertedInvoices.find(v => v.invoiceNo === inspectedInvoice.invoiceNo);
 setInspectedInvoice(revertedMatch || null);
 onRefresh();
 } else {
 onShowNotification(`✓ Invoice ${inspectedInvoice.invoiceNo} status updated successfully.`,"success");
 }
 } catch (e: any) {
 onShowNotification(`Status update failed: ${e.message || e}`,"error");

 // Transaction rollback
 const revertedInvoices = invoices.map(inv => {
 if (inv.invoiceNo === inspectedInvoice.invoiceNo) {
 return { ...inv, status: prevStatus };
 }
 return inv;
 });
 SheetsSyncEngine.saveInvoices(revertedInvoices, true);
 const revertedMatch = revertedInvoices.find(v => v.invoiceNo === inspectedInvoice.invoiceNo);
 setInspectedInvoice(revertedMatch || null);
 onRefresh();
 }
 } else {
 onShowNotification(`✓ Invoice ${inspectedInvoice.invoiceNo} revised successfully.`,"success");
 }
 };

 // Delete invoice with confirm options (Hard Purge vs Soft delete)
 const handleDeleteInvoice = async (inv: Invoice) => {
 if (userRole !== "Admin" && userRole !== "Superadmin") {
 onShowNotification("Access Denied: Only Admin users are cleared to delete invoices.","error");
 return;
 }

 const hardPurge = window.confirm(
 `DELETE INVOICE ACTION (${inv.invoiceNo})\n\n` +
 `Click"OK" to SOFT DELETE the receipt (Invoice remains stored, status becomes"Deleted", restore is possible).\n` +
 `Click"Cancel" to abort removal entirely.`
 );

 if (!hardPurge) return;

 const TODAY_ISO = getTodayStr();
 const TIME_STR = getCurrentTimeStr();
 const TIMESTAMP_STR = getCurrentTimestamp();
 const prevStatus = inv.status;
 const newStatus ="Deleted" as InvoiceStatus;

 try {
    // Reconcile Promo Code usage count if deleting an active invoice
    if (prevStatus !== "Cancelled" && inv.promoCode) {
      const promoList = SheetsSyncEngine.getPromoCodes();
      const updatedPromos = promoList.map(p => {
        if (p.promoCode === inv.promoCode) {
          return { ...p, usageCount: Math.max(p.usageCount - 1, 0) };
        }
        return p;
      });
      SheetsSyncEngine.savePromoCodes(updatedPromos);
    }

    // Reconcile Product Sales metrics if deleting an active invoice
    if (prevStatus !== "Cancelled") {
      const activeItems = invoiceItems.filter(item => 
        (item.invoiceId === inv.invoiceId) || (item.invoiceNo === inv.invoiceNo)
      );

      if (activeItems.length > 0) {
        const currentProds = SheetsSyncEngine.getProducts();
        let modifiedProducts = false;
        const updatedProducts = currentProds.map(p => {
          const soldItemsForThisNode = activeItems.filter(i => i.productId === p.id);
          
          if (soldItemsForThisNode.length > 0) {
            modifiedProducts = true;
            const totalQtySold = soldItemsForThisNode.reduce((sum, item) => sum + item.quantity, 0);
            const totalAmountSold = soldItemsForThisNode.reduce((sum, item) => sum + item.amount, 0);

            return {
              ...p,
              unitsSold: Math.max((p.unitsSold || 0) - totalQtySold, 0),
              revenueGenerated: Math.max((p.revenueGenerated || 0) - totalAmountSold, 0)
            };
          }
          return p;
        });

        if (modifiedProducts) {
          SheetsSyncEngine.saveProducts(updatedProducts);
        }
      }
    }

    const currentInvoices = SheetsSyncEngine.getInvoices();
    const updatedInvoices = currentInvoices.map((i) => {
 if (i.invoiceNo === inv.invoiceNo) {
 return {
 ...i,
 status: newStatus,
 isSoftDeleted: true,
 lastEditedBy: currentUser?.username ||"admin",
 lastEditedDate: TODAY_ISO,
 lastEditedTime: TIME_STR,
 lastEditedTimestamp: TIMESTAMP_STR
 };
 }
 return i;
 });

 // Optimistic update
 SheetsSyncEngine.saveInvoices(updatedInvoices, true);
 
 SheetsSyncEngine.addAuditLog(
"Invoice Status Changed",
 currentUser?.fullName ||"System Admin",
 `Invoice ${inv.invoiceNo} | Old status: ${prevStatus}`,
 `New status: ${newStatus}`
 );

 SheetsSyncEngine.addAuditLog(
"Bill Deleted",
 currentUser?.fullName ||"System Admin",
 `${inv.invoiceNo} valued at ₹${inv.grandTotal}`,
 `Soft-deleted invoice. Moved to admin deleted archives.`
 );

 setInspectedInvoice(null);
 setIsEditing(false);
 onRefresh();

 const conn = SheetsSyncEngine.getConnectionSettings();
 if (conn.isConnected) {
 onShowNotification("Deleting status on Google Sheets...","info");
 try {
 const payload = {
 invoiceId: inv.invoiceId || inv.invoiceNo,
 invoiceNo: inv.invoiceNo,
 status: newStatus,
 lastUpdated: `${TODAY_ISO} ${TIME_STR}`,
 updatedBy: currentUser?.username ||"admin"
 };
 const syncResult = await SheetsSyncEngine.pushTransaction(conn,"updateInvoiceStatus", payload);
 if (!syncResult.success) {
 onShowNotification(`Status update failed: ${syncResult.message ||"Google Sheets could not be updated."}`,"error");
 
 // Revert changes
 const revertedInvoices = currentInvoices.map(i => {
 if (i.invoiceNo === inv.invoiceNo) {
 return { ...i, status: prevStatus, isSoftDeleted: false };
 }
 return i;
 });
 SheetsSyncEngine.saveInvoices(revertedInvoices, true);
 setInspectedInvoice(inv);
 onRefresh();
 } else {
 onShowNotification(`✓ Invoice ${inv.invoiceNo} deleted successfully.`,"success");
 }
 } catch (e: any) {
 onShowNotification(`Status update failed: ${e.message || e}`,"error");
 
 // Revert changes
 const revertedInvoices = currentInvoices.map(i => {
 if (i.invoiceNo === inv.invoiceNo) {
 return { ...i, status: prevStatus, isSoftDeleted: false };
 }
 return i;
 });
 SheetsSyncEngine.saveInvoices(revertedInvoices, true);
 setInspectedInvoice(inv);
 onRefresh();
 }
 } else {
 onShowNotification(`✓ Invoice ${inv.invoiceNo} soft-deleted. Status changed to"Deleted".`,"success");
 }
 } catch (e) {
 onShowNotification("Error during invoice deletion.","error");
 }
 };

 // Restore Soft-Deleted Invoice
 const handleRestoreInvoice = async (inv: Invoice) => {
 if (userRole !== "Admin" && userRole !== "Superadmin") {
 onShowNotification("Access Denied: Only Admin can restore invoices.","error");
 return;
 }

 const TODAY_ISO = getTodayStr();
 const TIME_STR = getCurrentTimeStr();
 const TIMESTAMP_STR = getCurrentTimestamp();
 const prevStatus = inv.status;
 const newStatus ="Work In Progress" as InvoiceStatus;

 const currentInvoices = SheetsSyncEngine.getInvoices();
 const updatedInvoices = currentInvoices.map((i) => {
 if (i.invoiceNo === inv.invoiceNo) {
 return {
 ...i,
 status: newStatus,
 isSoftDeleted: false,
 lastEditedBy: currentUser?.username ||"admin",
 lastEditedDate: TODAY_ISO,
 lastEditedTime: TIME_STR,
 lastEditedTimestamp: TIMESTAMP_STR
 };
 }
 return i;
 });

 // Optimistic Update
 SheetsSyncEngine.saveInvoices(updatedInvoices, true);

 SheetsSyncEngine.addAuditLog(
"Invoice Status Changed",
 currentUser?.fullName ||"System Admin",
 `Invoice ${inv.invoiceNo} | Old status: ${prevStatus}`,
 `New status: ${newStatus}`
 );

 SheetsSyncEngine.addAuditLog(
"Bill Restored",
 currentUser?.fullName ||"System Admin",
 `${inv.invoiceNo} (Soft Deleted)`,
 `Restored status back to Work In Progress`
 );

 setInspectedInvoice(null);
 onRefresh();

 const conn = SheetsSyncEngine.getConnectionSettings();
 if (conn.isConnected) {
 onShowNotification("Restoring status on Google Sheets...","info");
 try {
 const payload = {
 invoiceId: inv.invoiceId || inv.invoiceNo,
 invoiceNo: inv.invoiceNo,
 status: newStatus,
 lastUpdated: `${TODAY_ISO} ${TIME_STR}`,
 updatedBy: currentUser?.username ||"admin"
 };
 const syncResult = await SheetsSyncEngine.pushTransaction(conn,"updateInvoiceStatus", payload);
 if (!syncResult.success) {
 onShowNotification(`Status update failed: ${syncResult.message ||"Google Sheets could not be updated."}`,"error");
 
 // Revert changes
 const revertedInvoices = currentInvoices.map(i => {
 if (i.invoiceNo === inv.invoiceNo) {
 return { ...i, status: prevStatus, isSoftDeleted: true };
 }
 return i;
 });
 SheetsSyncEngine.saveInvoices(revertedInvoices, true);
 setInspectedInvoice(inv);
 onRefresh();
 } else {
 onShowNotification(`✓ Invoice ${inv.invoiceNo} restored successfully.`,"success");
 }
 } catch (e: any) {
 onShowNotification(`Status update failed: ${e.message || e}`,"error");
 
 // Revert changes
 const revertedInvoices = currentInvoices.map(i => {
 if (i.invoiceNo === inv.invoiceNo) {
 return { ...i, status: prevStatus, isSoftDeleted: true };
 }
 return i;
 });
 SheetsSyncEngine.saveInvoices(revertedInvoices, true);
 setInspectedInvoice(inv);
 onRefresh();
 }
 } else {
 onShowNotification(`✓ Invoice ${inv.invoiceNo} restored back to active records.`,"success");
 }
 };

 // Helper colors mapping for status badges
 const getStatusBadge = (status: string) => {
 switch (status) {
 case"Draft":
 return <span className="inline-block px-2.5 py-1 text-[9px] font-extrabold rounded-full bg-card-secondary text-muted dark:text-muted border border-default">DRAFT</span>;
 case"Work In Progress":
 return <span className="inline-block px-2.5 py-1 text-[9px] font-extrabold rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">WORK IN PROGRESS</span>;
 case"Ready for Delivery":
 return <span className="inline-block px-2.5 py-1 text-[9px] font-extrabold rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">READY FOR DELIVERY</span>;
 case"Delivered":
 return <span className="inline-block px-2.5 py-1 text-[9px] font-extrabold rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">DELIVERED</span>;
 case"Completed":
 return <span className="inline-block px-2.5 py-1 text-[9px] font-extrabold rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 animate-pulse">COMPLETED</span>;
 case"Cancelled":
 return <span className="inline-block px-2.5 py-1 text-[9px] font-extrabold rounded-full bg-red-50 dark:bg-red-500/10 text-red-655 dark:text-red-400 border border-red-200 dark:border-red-500/20">CANCELLED</span>;
 case"Deleted":
 return <span className="inline-block px-2.5 py-1 text-[9px] font-extrabold rounded-full bg-stone-50 dark:bg-stone-950/20 text-stone-600 dark:text-red-400 border border-stone-200 dark:border-stone-850 line-through">DELETED</span>;
 default:
 return <span className="inline-block px-2.5 py-1 text-[9px] font-extrabold rounded-full bg-slate-500/10 text-muted">STATELESS</span>;
 }
 };

 // Renders visual progress timeline checks
 const renderTimeline = (status: InvoiceStatus) => {
 const listStages: { key: InvoiceStatus; label: string }[] = [
 { key:"Draft", label:"Bill Created" },
 { key:"Work In Progress", label:"In Production" },
 { key:"Ready for Delivery", label:"Ready to go" },
 { key:"Delivered", label:"Dispatched" },
 { key:"Completed", label:"Closed" }
 ];

 // Find index of current status in timeline progression
 let currentIdx = listStages.findIndex(s => s.key.toLowerCase() === status.toLowerCase());
 if (status ==="Cancelled" || status ==="Deleted") {
 // Return brief alert
 return (
 <div className="bg-red-500/10 border border-red-950/30 rounded-xl p-3.5 text-center text-xs text-red-400 font-semibold uppercase leading-relaxed tracking-wide">
 ⚠️ Timeline Interrupted: BILL IS ${status.toUpperCase()}
 </div>
 );
 }

 if (currentIdx === -1) {
 // Default fallback
 currentIdx = 1;
 }

 return (
 <div className="space-y-4 pt-1">
 <h4 className="text-[10px] uppercase font-bold text-muted font-sans tracking-widest">Fulfillment timeline</h4>
 <div className="relative pl-6 space-y-4">
 <span className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-800" />
 {listStages.map((st, sIdx) => {
 const isActive = sIdx <= currentIdx;
 const isLatest = sIdx === currentIdx;
 return (
 <div key={st.key} className="relative flex gap-3.5 items-center text-xs">
 <span className={`absolute -left-5 h-3 w-3 rounded-full border-2 border-default z-10 transition-colors ${
 isLatest ?"bg-blue-500 ring-4 ring-blue-500/25 border-default" :
 isActive ?"bg-green-500" :"bg-neutral-800"
 }`} />
 <span className={`font-sans font-bold ${
 isLatest ?"text-blue-400 font-bold" :
 isActive ?"text-primary" :"text-muted"
 }`}>
 {st.label}
 </span>
 {isLatest && <span className="text-[9px] bg-blue-500/15 border border-blue-500/35 px-1.5 py-0.2 rounded text-blue-400 uppercase font-extrabold">CURRENT</span>}
 </div>
 );
 })}
 </div>
 </div>
 );
 };

 const activeFilterCount = 
 (agentFilter !=="All" ? 1 : 0) +
 (paymentStatusFilter !=="All" ? 1 : 0) +
 (paymentTypeFilter !=="All" ? 1 : 0) +
 (gstFilter !=="All" ? 1 : 0) +
 ((startDate || endDate) ? 1 : 0) +
 ((pricePreset !=="All" || customPriceType !=="None") ? 1 : 0);

 return (
 <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in duration-300">
 {/* LEFT: INVOICES FILTERS & LIST */}
 <div className="rounded-xl border border-default bg-card p-5 shadow-sm lg:col-span-2 space-y-4 h-fit transition-colors">
 <div className="flex flex-col gap-1.5 border-b border-default pb-3 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h1 className="text-xl font-bold tracking-tight text-primary font-sans">Transaction & Dispatch History</h1>
 <p className="text-xs text-muted">Query and amend statuses, filter dates, track employees, or print.</p>
 </div>
 <div className="flex items-center gap-2">
 {(userRole === "Admin" || userRole === "Superadmin") && (
 <button
 onClick={() => { setShowSoftDeletedOnly(!showSoftDeletedOnly); setInspectedInvoice(null); }}
 className={`text-[10px] uppercase font-bold py-1 px-2.5 rounded border transition-colors ${
 showSoftDeletedOnly ?"bg-red-500/10 text-red-500 border-red-500/25" :"bg-transparent text-muted border-default hover:text-primary"
 }`}
 >
 {showSoftDeletedOnly ?"Showing Deleted Log" :"Inspect Trash"}
 </button>
 )}
 <button
 onClick={onRefresh}
 className="inline-flex items-center gap-1 text-[10px] font-bold text-muted hover:text-blue-600"
 >
 <RefreshCw className="h-3 w-3" />
 <span>Reload Db</span>
 </button>
 </div>
 </div>

 {/* REDESIGNED SEARCH & COLLAPSED FILTERS TOOLBAR */}
  <div className="flex flex-col gap-2 font-sans mb-3">
    {/* Row 1: Search & Sort + Filters Toggle */}
    <div className="flex flex-col md:flex-row gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          placeholder="Search by Invoice No, Customer Name, Mobile Number, Agent, Product, Notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-default bg-surface/50 pl-11 pr-4 py-3 text-sm font-medium focus:border-blue-500 outline-none transition-colors dark:text-primary"
        />
      </div>
      <div className="flex gap-2">
        <select
          value={sortType}
          onChange={(e) => setSortType(e.target.value)}
          className="rounded-xl border border-default bg-surface/50 px-4 py-3 text-xs font-semibold focus:border-blue-500 outline-none transition-colors dark:text-primary cursor-pointer max-w-[150px]"
        >
          <option value="Newest First">Newest First</option>
          <option value="Oldest First">Oldest First</option>
          <option value="Highest Bill Amount">Highest Amount</option>
          <option value="Lowest Bill Amount">Lowest Amount</option>
          <option value="Highest Balance Due">Highest Bal Due</option>
          <option value="Lowest Balance Due">Lowest Bal Due</option>
          <option value="Customer Name A-Z">Customer A-Z</option>
          <option value="Customer Name Z-A">Customer Z-A</option>
          <option value="Invoice Number A-Z">Invoice A-Z</option>
          <option value="Invoice Number Z-A">Invoice Z-A</option>
          <option value="Work In Progress First">WIP First</option>
          <option value="Ready First">Ready First</option>
          <option value="Completed First">Completed First</option>
          <option value="Cancelled First">Cancelled First</option>
          <option value="Paid First">Paid First</option>
          <option value="Partially Paid First">Partial Paid First</option>
          <option value="Balance Pending First">Bal Pending First</option>
        </select>
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`flex items-center gap-1.5 px-4 py-3 rounded-xl border transition-all cursor-pointer text-xs font-bold uppercase shrink-0 ${
            showAdvancedFilters 
              ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
              : "bg-surface/50 border-default text-secondary hover:bg-card hover:text-primary"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}</span>
          {showAdvancedFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>

    {/* Row 2: Prominent GST Category Horizontal Tabs */}
    <div className="flex flex-wrap items-center gap-1.5 mt-1 border-b border-default pb-2.5">
      {([
        { value: "All", label: "All Receipts" },
        { value: "GST", label: "GST Bills" },
        { value: "Non-GST", label: "Non-GST Bills" },
        { value: "WithinState", label: "State GST" }
      ] as const).map((tab) => (
        <button
          key={tab.value}
          onClick={() => {
            setGstFilter(tab.value);
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
            gstFilter === tab.value
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-surface/30 border-default text-muted hover:text-primary hover:bg-surface"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>

    {/* Collapsible Drawer for Advanced Options */}
    {showAdvancedFilters && (
      <div className="p-4 border border-default rounded-xl bg-surface/50 dark:bg-card/30 space-y-4 animate-in slide-in-from-top-2">
        {/* Quick Presets & Status */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-muted block">Quick Date Preset</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(["All Time","Today","This Week","This Month","Last 6 Months","This Year"] as QuickTimeRange[]).map((qr) => (
                <button
                  key={qr}
                  onClick={() => { setQuickTimeRange(qr); setStartDate(""); setEndDate(""); }}
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full transition-colors cursor-pointer border ${
                    quickTimeRange === qr 
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 border-blue-200 dark:border-blue-800"
                      : "bg-card border-default text-muted hover:text-primary"
                  }`}
                >
                  {qr}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-muted block">Status Filter</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(["All","Work In Progress","Ready for Delivery","Pending Deliveries","Completed","Cancelled"] as const).map(st => (
                <button
                  key={st}
                  onClick={() => handleStatusFilterChange(st)}
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border transition-colors cursor-pointer ${
                    statusFilter === st
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 border-blue-200 dark:border-blue-800"
                      : "bg-card text-muted border-default hover:text-primary"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-default/50">
          <div className="bg-card border border-default p-2.5 rounded-lg flex flex-col justify-center leading-tight">
            <span className="text-[9px] font-bold text-muted tracking-wider uppercase mb-1">Filtered Results</span>
            <span className="text-lg font-bold font-mono text-primary">{filteredMetrics.totalRecords}</span>
          </div>
          <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 p-2.5 rounded-lg flex flex-col justify-center leading-tight">
            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-500 tracking-wider uppercase mb-1">Pending</span>
            <span className="text-lg font-bold font-mono text-amber-600 truncate">{filteredMetrics.pending}</span>
          </div>
          <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 p-2.5 rounded-lg flex flex-col justify-center leading-tight">
            <span className="text-[9px] font-bold text-blue-700 dark:text-blue-500 tracking-wider uppercase mb-1">Ready</span>
            <span className="text-lg font-bold font-mono text-blue-600 truncate">{filteredMetrics.ready}</span>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 p-2.5 rounded-lg flex flex-col justify-center leading-tight">
            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-500 tracking-wider uppercase mb-1">Closed</span>
            <span className="text-lg font-bold font-mono text-emerald-600 truncate">{filteredMetrics.completed}</span>
          </div>
        </div>

        {/* Amount range and other detailed dropdowns */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 pt-2 border-t border-default/50">
          <div className="col-span-full border border-default p-3 rounded-lg bg-surface/50">
            <span className="text-[10px] font-bold uppercase text-muted block mb-2">Amount Filters</span>
            <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {(["All","Below ₹5k","₹5k-₹25k","₹25k-₹50k","₹50k-₹100k","Above ₹100k"] as const).map(pr => (
                  <button
                    key={pr}
                    onClick={() => { setPricePreset(pr); setCustomPriceType("None"); }}
                    className={`px-3 py-1 text-[10px] uppercase font-bold rounded border transition-colors cursor-pointer shrink-0 ${
                      pricePreset === pr && customPriceType ==="None"
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 border-emerald-200 dark:border-emerald-800"
                        : "bg-card text-muted border-default hover:bg-surface"
                    }`}
                  >
                    {pr}
                  </button>
                ))}
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-2 xl:mt-0">
                <select
                  value={customPriceType}
                  onChange={(e) => { setCustomPriceType(e.target.value as any); setPricePreset("All"); }}
                  className="rounded-md border border-default bg-card px-2 py-1.5 text-[10px] uppercase font-bold outline-none cursor-pointer text-primary"
                >
                  <option value="None">Custom Range</option>
                  <option value="Above">Above Amount</option>
                  <option value="Below">Below Amount</option>
                  <option value="Between">Between Amount Range</option>
                </select>

                {customPriceType !=="None" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted" />
                      <input 
                        type="number" 
                        placeholder={customPriceType ==="Between" ?"Min" :"Amount"} 
                        value={customPriceType ==="Below" ? customPriceMax : customPriceMin}
                        onChange={(e) => customPriceType ==="Below" ? setCustomPriceMax(e.target.value) : setCustomPriceMin(e.target.value)}
                        className="rounded-md border border-default bg-card text-primary pl-6 pr-2 py-1.5 text-xs font-mono outline-none w-24"
                      />
                    </div>
                    {customPriceType ==="Between" && (
                      <>
                        <span className="text-xs font-bold text-muted">to</span>
                        <div className="relative">
                          <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted" />
                          <input 
                            type="number" 
                            placeholder="Max"
                            value={customPriceMax}
                            onChange={(e) => setCustomPriceMax(e.target.value)}
                            className="rounded-md border border-default bg-card text-primary pl-6 pr-2 py-1.5 text-xs font-mono outline-none w-24"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted">Date From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-default bg-surface px-2.5 py-1.5 text-xs font-mono outline-none text-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted">Date To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-default bg-surface px-2.5 py-1.5 text-xs font-mono outline-none text-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted">Referral Agent</label>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="w-full rounded-md border border-default bg-surface px-2.5 py-1.5 text-xs outline-none cursor-pointer text-primary"
            >
              <option value="All">All Agents</option>
              {SheetsSyncEngine.getAgents().map(agt => <option key={agt.id} value={agt.id}>{agt.id} - {agt.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted">Payment Status</label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
              className="w-full rounded-md border border-default bg-surface px-2.5 py-1.5 text-xs outline-none cursor-pointer text-primary"
            >
              <option value="All">All Payment Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Balance Pending">Balance Pending</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted">Payment Type</label>
            <select
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value as any)}
              className="w-full rounded-md border border-default bg-surface px-2.5 py-1.5 text-xs outline-none cursor-pointer text-primary"
            >
              <option value="All">All Types</option>
              <option value="Full Payment">Full Payment</option>
              <option value="Advance Payment">Advance Payment</option>
            </select>
          </div>
          
          {activeFilterCount > 0 && (
            <div className="col-span-full mt-2">
              <button 
                onClick={() => {
                  setAgentFilter("All");
                  setPaymentStatusFilter("All");
                  setPaymentTypeFilter("All");
                  setGstFilter("All");
                  setStartDate("");
                  setEndDate("");
                  setPricePreset("All");
                  setCustomPriceType("None");
                  setCustomPriceMin("");
                  setCustomPriceMax("");
                }}
                className="text-[10px] uppercase font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded transition-colors"
              >
                Clear Advanced Filters
              </button>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
  
{/* INVOICES TABLE LOGS */}
  <div className="overflow-x-auto pt-2">
    {gstFilter === "GST" || gstFilter === "WithinState" ? (
      /* GST Bills Table Layout */
      <table className="min-w-full table-auto text-left text-[11px] text-muted">
        <thead className="bg-table-header text-[10px] uppercase font-extrabold text-muted border-b border-default">
          <tr>
            <th className="px-3 py-3">Receipt No</th>
            <th className="px-3 py-3">Date</th>
            <th className="px-3 py-3">Customer Profile</th>
            <th className="px-3 py-3 text-center">GST Type</th>
            <th className="px-3 py-3 text-right">Taxable Amt</th>
            <th className="px-3 py-3 text-right">CGST</th>
            <th className="px-3 py-3 text-right">SGST</th>
            <th className="px-3 py-3 text-right">IGST</th>
            <th className="px-3 py-3 text-right">Tax Amt</th>
            <th className="px-3 py-3 text-right">Grand Total</th>
            <th className="px-3 py-3 text-center">Fulfillment</th>
            <th className="px-3 py-3 text-center">Payment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {paginatedInvoices.map((inv, idx) => {
            const cgst = inv.cgstAmount || 0;
            const sgst = inv.sgstAmount || 0;
            const igst = inv.igstAmount || 0;
            const taxAmt = inv.taxAmount || (cgst + sgst + igst);
            const taxableAmt = inv.grandTotal - taxAmt;
            return (
              <tr
                key={idx}
                onClick={() => { setInspectedInvoice(inv); setIsEditing(false); }}
                className={`cursor-pointer transition-colors ${
                  inspectedInvoice?.invoiceNo === inv.invoiceNo
                    ? "bg-blue-50/50 dark:bg-blue-900/10 hover:bg-shadow"
                    : "hover:bg-table-hover dark:hover:bg-card/40"
                }`}
              >
                <td className="px-3 py-3 font-mono font-bold text-blue-600">{inv.invoiceNo}</td>
                <td className="px-3 py-3 whitespace-nowrap">{formatDisplayDate(inv.date)}</td>
                <td className="px-3 py-3 font-sans">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-primary capitalize truncate max-w-[110px]">{inv.customerName}</div>
                    {inv.referralAgentName && <span className="text-[9px] bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1 rounded ml-1 truncate max-w-[70px]" title={inv.referralAgentName}>{inv.referralAgentName}</span>}
                  </div>
                  <div className="text-[10px] text-muted font-mono">{inv.mobile}</div>
                  {inv.customerGstNo && <div className="text-[9px] text-emerald-600 font-mono mt-0.5">GSTIN: {inv.customerGstNo.toUpperCase()}</div>}
                </td>
                <td className="px-3 py-3 text-center font-semibold">
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded uppercase">
                    {inv.gstType === "CGST_SGST" ? "CGST/SGST" : inv.gstType === "IGST" ? "IGST" : "GST"}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono">₹{taxableAmt.toFixed(2)}</td>
                <td className="px-3 py-3 text-right font-mono">{cgst > 0 ? `₹${cgst.toFixed(2)}` : "-"}</td>
                <td className="px-3 py-3 text-right font-mono">{sgst > 0 ? `₹${sgst.toFixed(2)}` : "-"}</td>
                <td className="px-3 py-3 text-right font-mono">{igst > 0 ? `₹${igst.toFixed(2)}` : "-"}</td>
                <td className="px-3 py-3 text-right font-mono text-amber-600 dark:text-amber-400">₹{taxAmt.toFixed(2)}</td>
                <td className="px-3 py-3 text-right font-mono font-bold text-primary">₹{inv.grandTotal.toFixed(2)}</td>
                <td className="px-3 py-3 text-center">{getStatusBadge(inv.status)}</td>
                <td className="px-3 py-3 text-center">
                  <span className={`inline-block px-1.5 text-[9px] uppercase tracking-wide font-bold py-0.5 rounded-full ${inv.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : inv.paymentStatus === 'Partially Paid' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'}`}>{inv.paymentStatus || 'Paid'}</span>
                </td>
              </tr>
            );
          })}
          {filteredInvoices.length === 0 && (
            <tr>
              <td colSpan={12} className="py-8 text-center text-muted">No active GST invoice records found.</td>
            </tr>
          )}
        </tbody>
      </table>
    ) : gstFilter === "Non-GST" ? (
      /* Non-GST Bills Table Layout */
      <table className="min-w-full table-auto text-left text-xs text-muted">
        <thead className="bg-table-header text-[10px] uppercase font-bold text-muted border-b border-default">
          <tr>
            <th className="px-4 py-3">Receipt No</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Customer Profile</th>
            <th className="px-4 py-3 text-center">Item Count</th>
            <th className="px-4 py-3 text-center">Fulfillment Status</th>
            <th className="px-4 py-3 text-center">Payment Status</th>
            <th className="px-4 py-3 text-right">Amt Paid</th>
            <th className="px-4 py-3 text-right">Bal Due</th>
            <th className="px-4 py-3 text-right">Grand Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {paginatedInvoices.map((inv, idx) => (
            <tr
              key={idx}
              onClick={() => { setInspectedInvoice(inv); setIsEditing(false); }}
              className={`cursor-pointer transition-colors ${
                inspectedInvoice?.invoiceNo === inv.invoiceNo
                  ? "bg-blue-50/50 dark:bg-blue-900/10 hover:bg-shadow"
                  : "hover:bg-table-hover dark:hover:bg-card/40"
              }`}
            >
              <td className="px-4 py-3 font-mono font-bold text-blue-600">{inv.invoiceNo}</td>
              <td className="px-4 py-3">{formatDisplayDate(inv.date)}</td>
              <td className="px-4 py-3 font-sans">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-primary capitalize truncate max-w-[120px]">{inv.customerName}</div>
                  {inv.referralAgentName && <span className="text-[9px] bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1 rounded ml-1 truncate max-w-[80px]" title={inv.referralAgentName}>{inv.referralAgentName}</span>}
                </div>
                <div className="text-[10px] text-muted font-mono">{inv.mobile}</div>
              </td>
              <td className="px-4 py-3 text-center font-mono">{inv.itemCount}</td>
              <td className="px-4 py-3 text-center">{getStatusBadge(inv.status)}</td>
              <td className="px-4 py-3 text-center">
                <span className={`inline-block px-2 text-[9px] uppercase tracking-wide font-bold py-0.5 rounded-full ${inv.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : inv.paymentStatus === 'Partially Paid' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'}`}>{inv.paymentStatus || 'Paid'}</span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">₹{(inv.amountPaid ?? inv.grandTotal).toFixed(2)}</td>
              <td className="px-4 py-3 text-right font-mono font-medium text-rose-600 dark:text-rose-400">{inv.balanceDue ? `₹${inv.balanceDue.toFixed(2)}` : "-"}</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-primary">₹{inv.grandTotal.toFixed(2)}</td>
            </tr>
          ))}
          {filteredInvoices.length === 0 && (
            <tr>
              <td colSpan={9} className="py-8 text-center text-muted">No active Non-GST invoice records found.</td>
            </tr>
          )}
        </tbody>
      </table>
    ) : (
      /* Unified Table Layout (All Receipts) */
      <table className="min-w-full table-auto text-left text-xs text-muted">
        <thead className="bg-table-header text-[10px] uppercase font-bold text-muted dark:text-muted border-b border-default">
          <tr>
            <th className="px-4 py-3">Receipt No</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Customer Profile</th>
            <th className="px-4 py-3 text-center">Fulfillment Status</th>
            <th className="px-4 py-3 text-center">GST Type</th>
            <th className="px-4 py-3 text-center">Payment Status</th>
            <th className="px-4 py-3 text-right">Amnt Paid</th>
            <th className="px-4 py-3 text-right">Bal Due</th>
            <th className="px-4 py-3 text-right">Grand Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {paginatedInvoices.map((inv, idx) => (
            <tr
              key={idx}
              onClick={() => { setInspectedInvoice(inv); setIsEditing(false); }}
              className={`cursor-pointer transition-colors ${
                inspectedInvoice?.invoiceNo === inv.invoiceNo
                  ? "bg-blue-50/50 dark:bg-blue-900/10 hover:bg-shadow"
                  : "hover:bg-table-hover dark:hover:bg-card/40"
              }`}
            >
              <td className="px-4 py-3 font-mono font-bold text-blue-600">{inv.invoiceNo}</td>
              <td className="px-4 py-3">{formatDisplayDate(inv.date)}</td>
              <td className="px-4 py-3 font-sans">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-primary dark:text-primary capitalize truncate max-w-[120px] sm:max-w-[160px]">{inv.customerName}</div>
                  {inv.referralAgentName && <span className="text-[9px] bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1 rounded ml-1 truncate max-w-[80px]" title={inv.referralAgentName}>{inv.referralAgentName}</span>}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-muted font-mono">{inv.mobile}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-center">{getStatusBadge(inv.status)}</td>
              <td className="px-4 py-3 text-center font-bold">
                {inv.gstEnabled ? <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded uppercase">{inv.gstType || 'GST'}</span> : <span className="text-[9px] text-muted">NON-GST</span>}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`inline-block px-2 text-[9px] uppercase tracking-wide font-bold py-0.5 rounded-full ${inv.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : inv.paymentStatus === 'Partially Paid' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'}`}>{inv.paymentStatus || 'Paid'}</span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">₹{(inv.amountPaid ?? inv.grandTotal).toFixed(2)}</td>
              <td className="px-4 py-3 text-right font-mono font-medium text-rose-600 dark:text-rose-400">{inv.balanceDue ? `₹${inv.balanceDue.toFixed(2)}` : "-"}</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-primary dark:text-primary">₹{inv.grandTotal.toFixed(2)}</td>
            </tr>
          ))}
          {filteredInvoices.length === 0 && (
            <tr>
              <td colSpan={9} className="py-8 text-center text-muted text-xs">
                No active transaction log records located.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    )}
  </div>
{/* Pagination Section */}
 {totalPages > 1 && (
 <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-default text-xs mt-4">
 <span className="text-muted font-sans">
 Showing page <strong>{activePage}</strong> of <strong>{totalPages}</strong> ({filteredInvoices.length} total entries)
 </span>
 <div className="flex items-center gap-1.5">
 <button
 onClick={() => setCurrentPage(Math.max(1, activePage - 1))}
 disabled={activePage === 1}
 className="px-3 py-1.5 rounded-lg border border-default disabled:opacity-50 text-secondary hover:text-primary transition bg-card cursor-pointer"
 >
 Previous
 </button>
 {[...Array(totalPages)].map((_, i) => {
 const pg = i + 1;
 if (totalPages > 5 && Math.abs(pg - activePage) > 1 && pg !== 1 && pg !== totalPages) {
 if (pg === 2 || pg === totalPages - 1) {
 return <span key={pg} className="px-1 text-muted">...</span>;
 }
 return null;
 }
 return (
 <button
 key={pg}
 onClick={() => setCurrentPage(pg)}
 className={`px-3 py-1.5 rounded-lg border transition ${
 activePage === pg
 ? "bg-blue-600 border-blue-600 text-primary font-bold"
 : "border-default text-secondary hover:bg-surface dark:hover:bg-card cursor-pointer"
 }`}
 >
 {pg}
 </button>
 );
 })}
 <button
 onClick={() => setCurrentPage(Math.min(totalPages, activePage + 1))}
 disabled={activePage === totalPages}
 className="px-3 py-1.5 rounded-lg border border-default disabled:opacity-50 text-secondary hover:text-primary transition bg-card cursor-pointer"
 >
 Next
 </button>
 </div>
 </div>
 )}

 </div>

 {/* RIGHT: DETAILED DISPATCH DRAWER INSPECTION */}
 <div className="rounded-xl border border-default bg-card p-5 shadow-sm space-y-5 h-fit transition-colors">
 {inspectedInvoice ? (
 <div className="space-y-4 animate-in slide-in-from-right duration-250 text-left">
 
 {/* Header detail */}
 <div className="flex items-center justify-between border-b border-default pb-2">
 <div>
 <h2 className="font-bold text-primary text-sm">Receipt Ledger Details</h2>
 <span className="font-mono text-xs font-semibold text-muted">{inspectedInvoice.invoiceNo}</span>
 </div>
 <button
 onClick={() => { setInspectedInvoice(null); setIsEditing(false); }}
 className="rounded-lg p-1.5 text-muted hover:bg-card-secondary dark:hover:bg-zinc-800 cursor-pointer border-none bg-transparent"
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 {/* Read / Edit panels */}
 {!isEditing ? (
 <div className="space-y-4">
 
 {/* 1. PAYMENT INFORMATION */}
 <div className="bg-surface p-4 rounded-xl border border-default text-[11px] leading-tight text-primary dark:text-primary relative">
 <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-600 dark:text-blue-400 mb-2">Payment Information</div>
 <div className="space-y-1.5">
 <div><strong>Invoice Status:</strong> {getStatusBadge(inspectedInvoice.status)}</div>
 <div>
 <strong>Payment Status:</strong> <span className={`inline-block px-2 text-[9px] uppercase tracking-wide font-bold py-0.5 rounded-full ${inspectedInvoice.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : inspectedInvoice.paymentStatus === 'Partially Paid' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'}`}>{inspectedInvoice.paymentStatus || 'Paid'}</span>
 </div>
 <div><strong>Payment Type:</strong> <span className="text-muted dark:text-muted font-semibold">{inspectedInvoice.paymentType || 'Full Payment'}</span></div>
 <div><strong>Paid Amount:</strong> <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{(inspectedInvoice.amountPaid ?? (inspectedInvoice.grandTotal - (inspectedInvoice.balanceDue || 0))).toFixed(2)}</span></div>
 {inspectedInvoice.balanceDue && inspectedInvoice.balanceDue > 0 ? (
 <div className="space-y-1 mt-1.5 pt-1.5 border-t border-dashed border-default">
 <div className="flex justify-between items-center">
 <span><strong>Balance Due:</strong></span>
 <span className="font-mono font-bold text-rose-500 text-xs">₹{inspectedInvoice.balanceDue.toFixed(2)}</span>
 </div>
 <button
 onClick={() => {
 setCollectAmountInput(inspectedInvoice.balanceDue!.toString());
 setCollectNotesInput("");
 setShowCollectPaymentModal(true);
 }}
 className="w-full flex items-center justify-center gap-1 my-1 rounded bg-emerald-600 hover:bg-emerald-700 text-primary font-bold text-[10px] uppercase py-1 mt-1.5 transition-all active:scale-95 cursor-pointer border-none"
 >
 <CreditCard className="h-3 w-3" /> Collect Payment
 </button>
 </div>
 ) : null}
 </div>
 {userRole === "Superadmin" && (
 <button
 onClick={() => startEditingInvoice(inspectedInvoice)}
 className="absolute right-3.5 top-3.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 bg-transparent border-none cursor-pointer"
 >
 <Edit2 className="h-3 w-3" /> Edit
 </button>
 )}
 </div>

 {/* 2. CUSTOMER LOCATION & INFO */}
 <div className="bg-surface p-4 rounded-xl border border-default text-[11px] leading-tight text-primary dark:text-primary relative">
 <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-600 dark:text-blue-400 block mb-2">CUSTOMER LOCATION & INFO</span>
 {(() => {
 const matchedCustForLedger = SheetsSyncEngine.getCustomers().find(
 (c) => c.mobile && c.mobile !=="N/A" && String(c.mobile).replace(/\D/g,"") === String(inspectedInvoice.mobile).replace(/\D/g,"") || c.name.toLowerCase() === inspectedInvoice.customerName.toLowerCase()
 );
 const ledgerSecMobile = inspectedInvoice.customerSecondaryPhone || matchedCustForLedger?.secondaryPhone;
 const ledgerSecContact = inspectedInvoice.customerSecondaryContactName || matchedCustForLedger?.secondaryContactName;
 
 let ledgerAddress = inspectedInvoice.customerBusinessAddress?.trim();
 const invalidLedgerAddrs = ["Registered POS Transaction","Unknown","Default Address","N/A"];
 if (!ledgerAddress || invalidLedgerAddrs.includes(ledgerAddress)) {
 ledgerAddress = (matchedCustForLedger?.address || matchedCustForLedger?.currentAddress ||"").trim();
 }
 if (!ledgerAddress || invalidLedgerAddrs.includes(ledgerAddress)) {
 ledgerAddress ="Address Not Available";
 }
 const displayAddressText = ledgerAddress;

 const clientNotesText = (inspectedInvoice.notes || inspectedInvoice.clientNotes || inspectedInvoice.orderNotes ||"").trim();

 return (
 <div className="space-y-3.5">
 {/* A. CUSTOMER INFO ROW */}
 <div className="grid grid-cols-2 gap-2 text-[10px] pb-2 border-b border-default">
 <div>
 <span className="text-muted uppercase tracking-tighter self-start font-medium block">Customer</span>
 <button
 onClick={() => {
 if (onNavigateToTab) {
 setInspectedInvoice(null);
 setIsEditing(false);
 onNavigateToTab("customers","All", { customerId: matchedCustForLedger?.id });
 }
 }}
 className="text-blue-600 dark:text-blue-400 font-bold hover:underline bg-transparent border-none text-left p-0 cursor-pointer inline text-xs mt-0.5"
 >
 {inspectedInvoice.customerName}
 </button>
 </div>
 <div>
 <span className="text-muted uppercase tracking-tighter font-medium block">Primary Mobile</span>
 <span className="font-mono text-secondary dark:text-muted font-semibold block mt-0.5">{inspectedInvoice.mobile}</span>
 </div>
 {ledgerSecMobile && (
 <div className="col-span-2 pt-1 border-t border-dashed border-default mt-1">
 <span className="text-muted uppercase tracking-tighter font-medium block">Secondary Phone</span>
 <span className="font-mono text-secondary dark:text-muted font-semibold block mt-0.5">{ledgerSecMobile}</span>
 </div>
 )}
 </div>

 {/* B. ADDRESS */}
 <div>
 <div className="flex justify-between items-center mb-1">
 <strong className="text-[10px] uppercase text-muted">Address:</strong>
 {userRole === "Superadmin" && matchedCustForLedger && (
 <button
 onClick={() => {
 setEditAddressCurrent(displayAddressText);
 setEditAddressNew(displayAddressText ==="Not Provided" ?"" : displayAddressText);
 setEditAddressReason("");
 setShowEditAddressModal(true);
 }}
 className="text-[9px] bg-blue-50 hover:bg-blue-100 dark:bg-zinc-800 dark:text-blue-400 dark:hover:bg-zinc-700 text-blue-600 font-semibold px-2 py-0.5 rounded border border-blue-200/30 dark:border-zinc-700 cursor-pointer text-right inline-block"
 >
 Edit
 </button>
 )}
 </div>
 <div className="text-secondary dark:text-gray-105 font-medium bg-card-secondary/40 /40 p-2.5 rounded border border-default/20 break-words whitespace-pre-wrap leading-relaxed">
 {displayAddressText}
 </div>
 </div>

 {/* C. CLIENT & ORDER NOTES */}
 {clientNotesText && (
 <div className="space-y-1">
 <strong className="text-[10px] uppercase text-muted block">Client Notes:</strong>
 <div className="bg-amber-50 dark:bg-amber-950/15 border border-amber-150 dark:border-amber-900/30 text-amber-900 dark:text-amber-200 p-2.5 rounded text-[11px] leading-normal italic whitespace-pre-wrap font-medium">
 {clientNotesText}
 </div>
 </div>
 )}

 {/* D. REFERRAL AGENT */}
 {inspectedInvoice.referralAgentId && (
 <div className="space-y-1">
 <strong className="text-[10px] uppercase text-muted block">Referral Agent:</strong>
 <div className="text-purple-900 dark:text-purple-200 font-extrabold bg-purple-50/50 dark:bg-purple-950/20 p-2.5 rounded border border-purple-200/25 dark:border-purple-800/30 text-xs">
 {inspectedInvoice.referralAgentName ||"Usaman"} ({inspectedInvoice.referralAgentId})
 </div>
 </div>
 )}
 </div>
 );
 })()}
 </div>

 {/* GST Details block if enabled */}
 {inspectedInvoice.gstEnabled && (
 <div className="bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/10 dark:border-emerald-500/20 p-2.5 rounded-lg space-y-1 mt-2 text-[10px] text-emerald-800 dark:text-emerald-400 text-left">
 <div className="font-bold flex items-center justify-between border-b border-emerald-500/10 pb-1">
 <span>GST ENHANCED BILL ({inspectedInvoice.gstType})</span>
 <span className="bg-emerald-500 text-primary font-mono text-[9px] px-1 rounded font-extrabold">ACTIVE</span>
 </div>
 {inspectedInvoice.customerGstNo && <div><strong>GST Number:</strong> <span className="font-mono">{inspectedInvoice.customerGstNo.toUpperCase()}</span></div>}
 {inspectedInvoice.customerBusinessName && <div><strong>Business Name:</strong> {inspectedInvoice.customerBusinessName}</div>}
 {inspectedInvoice.customerState && <div><strong>State / Code:</strong> {inspectedInvoice.customerState} ({inspectedInvoice.customerStateCode ||"N/A"})</div>}
 </div>
 )}

 {/* Dispatch Dispatchers Details */}
 {inspectedInvoice.assignedEmployee && (
 <div className="bg-surface p-3 rounded-xl border border-default space-y-1 text-muted dark:text-muted text-[10px]">
 <div>🚚 <strong>Assignee dispatcher:</strong> @{inspectedInvoice.assignedEmployee}</div>
 {inspectedInvoice.expectedDeliveryDate && <div>📅 <strong>Expected Fulfill date:</strong> {inspectedInvoice.expectedDeliveryDate}</div>}
 {inspectedInvoice.deliveryNotes && <div className="italic text-muted dark:text-muted font-sans font-medium mt-1">"{inspectedInvoice.deliveryNotes}"</div>}
 </div>
 )}

 {/* 5. FULFILLMENT TIMELINE */}
 {renderTimeline(inspectedInvoice.status)}

 {/* 6. AUDIT TRAIL */}
 <div className="bg-surface p-4 rounded-xl border border-default text-[10px] text-muted space-y-2 font-sans">
 <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-600 dark:text-blue-400 mb-1">Audit Trail & Referral Details</div>
 <div className="flex gap-2">
 <User className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
 <div className="flex flex-col leading-tight">
 <span>Created By: <strong>@{inspectedInvoice.createdBy ||"system"}</strong></span>
 <span className="text-muted font-mono mt-0.5 tracking-tight">{formatDisplayDateTime(inspectedInvoice.createdTimestamp || inspectedInvoice.date)}</span>
 </div>
 </div>
 {inspectedInvoice.lastEditedBy && (
 <div className="flex gap-2 border-t border-default pt-2">
 <Award className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
 <div className="flex flex-col leading-tight">
 <span>Last Edited By: <strong>@{inspectedInvoice.lastEditedBy}</strong></span>
 <span className="text-muted font-mono mt-0.5 tracking-tight">{formatDisplayDateTime(inspectedInvoice.lastEditedTimestamp || inspectedInvoice.lastEditedDate)}</span>
 </div>
 </div>
 )}
 {inspectedInvoice.referralAgentId && (() => {
 const agentObj = SheetsSyncEngine.getAgents().find(a => a.id === inspectedInvoice.referralAgentId);
 const estCommission = agentObj ? (inspectedInvoice.grandTotal * agentObj.commissionPercentage) / 100 : 0;
 return (
 <div className="flex items-center gap-1.5 pt-2 border-t border-default">
 <Award className="h-3.5 w-3.5 text-purple-500 animate-pulse" />
 <span>
 Referral Partner:{""}
 <button
 onClick={() => {
 if (onNavigateToTab) {
 setInspectedInvoice(null);
 setIsEditing(false);
 onNavigateToTab("agents","All", { agentId: inspectedInvoice.referralAgentId });
 }
 }}
 className="text-purple-650 dark:text-purple-400 font-extrabold hover:underline bg-transparent border-none p-0 cursor-pointer text-[10px]"
 >
 {inspectedInvoice.referralAgentId} - {inspectedInvoice.referralAgentName || agentObj?.name} {inspectedInvoice.referralAgentCategory || agentObj?.agentType ? `[${inspectedInvoice.referralAgentCategory ||"External"}]` :""}
 </button>{""}
 {estCommission > 0 ? `(Est. Commission: ₹${estCommission.toFixed(2)} - ${agentObj?.commissionPercentage || 0}%)` :""}
 </span>
 </div>
 );
 })()}
 </div>

 {/* Shopping line items */}
 <div className="space-y-2 border-t border-gray-50 pt-3">
 <h3 className="text-[10px] uppercase font-bold text-muted">Basket products</h3>
 <div className="space-y-1.5 px-1 max-h-48 overflow-y-auto">
 {inspectedItems.map((item, i) => {
 const isNonGst = (inspectedInvoice.gstType as string) ==="Non-GST" || (inspectedInvoice.gstType as string) ==="No GST" || (inspectedInvoice.gstType as string) ==="Non GST" || !inspectedInvoice.gstEnabled;
 return (
 <div key={i} className="flex justify-between items-start text-xs border-b border-zinc-50/20 pb-1.5 last:border-0 last:pb-0">
 <div>
 <div className="font-semibold text-primary dark:text-gray-100">
 {item.displayName || item.productName}
 {item.selectedColor && (
 <span className="ml-1.5 inline-flex items-center rounded-md bg-blue-50  px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:text-blue-400 font-mono">
 {item.selectedColor}
 </span>
 )}
 </div>
 <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] text-muted font-mono mt-0.5">
 {!isNonGst && (
 <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-1 py-0.2 rounded font-semibold text-[9px]">HSN: {item.hsnCode ||"9403"}</span>
 )}
 <span>Qty: {item.quantity}</span>
 <span>Price: ₹{item.unitPrice.toFixed(2)}</span>
 </div>
 </div>
 <span className="font-mono font-bold text-primary dark:text-gray-100 whitespace-nowrap">₹{item.amount.toFixed(2)}</span>
 </div>
 );
 })}
 </div>
 </div>

 {/* Financial overview */}
 <div className="space-y-2 border-t border-gray-50 pt-3 text-xs leading-none">
 <div className="flex justify-between text-muted">
 <span>Invoice Subtotal</span>
 <span className="font-mono">₹{inspectedInvoice.subtotal.toFixed(2)}</span>
 </div>
 {inspectedInvoice.discount > 0 && (
 <div className="flex justify-between text-red-500 font-medium font-mono">
 <span>Applied discount</span>
 <span className="font-mono">-₹{inspectedInvoice.discount.toFixed(2)}</span>
 </div>
 )}
 {inspectedInvoice.promoCode && (
 <div className="flex justify-between text-emerald-600 font-medium font-sans">
 <span>Promo applied ({inspectedInvoice.promoCode})</span>
 <span className="font-mono">-₹{(inspectedInvoice.promoDiscountAmount || 0).toFixed(2)}</span>
 </div>
 )}

 {inspectedInvoice.gstEnabled && (
 <div className="bg-emerald-500/5 dark:bg-emerald-950/10 p-2.5 rounded-lg space-y-1.5 my-2 text-[10.5px] text-emerald-800 dark:text-emerald-400 font-sans text-left border border-emerald-500/10">
 <div className="flex justify-between font-bold border-b border-emerald-500/10 pb-0.5 mb-1 text-[10px] uppercase">
 <span>GST DETAILS</span>
 <span>{inspectedInvoice.gstType ==="CGST_SGST" ?"intra-state" :"inter-state"}</span>
 </div>
 <div className="flex justify-between text-muted">
 <span>Taxable Amount:</span>
 <span className="font-mono">
 ₹{(inspectedInvoice.subtotal - inspectedInvoice.discount - (inspectedInvoice.promoDiscountAmount || 0)).toFixed(2)}
 </span>
 </div>
 {inspectedInvoice.gstType ==="CGST_SGST" ? (
 <>
 <div className="flex justify-between">
 <span>CGST ({inspectedInvoice.cgstPercentage ?? 9}%):</span>
 <span className="font-mono">₹{(inspectedInvoice.cgstAmount ?? 0).toFixed(2)}</span>
 </div>
 <div className="flex justify-between">
 <span>SGST ({inspectedInvoice.sgstPercentage ?? 9}%):</span>
 <span className="font-mono">₹{(inspectedInvoice.sgstAmount ?? 0).toFixed(2)}</span>
 </div>
 </>
 ) : (
 <div className="flex justify-between">
 <span>IGST ({inspectedInvoice.igstPercentage ?? 18}%):</span>
 <span className="font-mono">₹{(inspectedInvoice.igstAmount ?? 0).toFixed(2)}</span>
 </div>
 )}
 <div className="flex justify-between font-bold border-t border-dashed border-emerald-500/20 pt-1 text-[11px]">
 <span>CGST/SGST/IGST Included:</span>
 <span className="font-mono text-emerald-700 dark:text-emerald-300">₹{(inspectedInvoice.taxAmount ?? 0).toFixed(2)}</span>
 </div>
 </div>
 )}

 <div className="flex justify-between items-baseline pt-2 text-sm border-t border-zinc-50 font-sans">
 <span className="font-extrabold text-primary dark:text-primary">Paid Grand Total</span>
 <span className="font-mono font-extrabold text-blue-600">₹{inspectedInvoice.grandTotal.toFixed(2)}</span>
 </div>

 {/* Cancellation Financial breakdown */}
 {inspectedInvoice.status ==="Cancelled" && (
 <div className="mt-2 bg-red-50 p-2.5 rounded-lg border border-red-100 text-[11px] text-red-800 space-y-1">
 <div className="font-bold uppercase tracking-wider text-[10px]">Cancellation Policy Applied</div>
 <div className="flex justify-between">
 <span>Retained Rate ({inspectedInvoice.cancellationPercentage ?? 0}%):</span>
 <span className="font-mono font-bold">₹{(inspectedInvoice.cancellationDeduction ?? 0).toFixed(2)}</span>
 </div>
 <div className="flex justify-between text-emerald-700 font-semibold border-t border-red-200/50 pt-1">
 <span>Customer Refund Amt:</span>
 <span className="font-mono">₹{(inspectedInvoice.refundAmount ?? 0).toFixed(2)}</span>
 </div>
 </div>
 )}

 {inspectedInvoice.isSoftDeleted && (
 <div className="mt-2 bg-red-50 p-2.5 rounded-lg border border-red-100 text-[11px] text-red-900 dark:text-zinc-350 space-y-1 transition-colors">
 <div className="font-bold text-red-600 dark:text-red-400 text-[10px]">SOFT DELETED STATUS</div>
 <div>Deleted By: <strong>@{inspectedInvoice.deletedBy ||"admin"}</strong></div>
 {inspectedInvoice.deletedDate && <div>Deleted On: {formatDisplayDate(inspectedInvoice.deletedDate)}</div>}
 </div>
 )}
 </div>

 {/* Payment Transactions Log */}
 <div className="space-y-2 border-t border-gray-50 pt-3">
 <h3 className="text-[10px] uppercase font-bold text-muted">Payment History Log</h3>
 {(() => {
 const txns = SheetsSyncEngine.getPaymentTransactions().filter(
 t => t.invoiceNo === inspectedInvoice.invoiceNo
 );
 if (txns.length === 0) {
 return <p className="text-[10px] text-muted italic px-1">No payment transactions recorded.</p>;
 }
 return (
 <div className="space-y-1.5 px-1 max-h-32 overflow-y-auto">
 {txns.map((txn, i) => (
 <div key={txn.id || i} className="bg-surface dark:bg-zinc-905 border border-default p-2 rounded-lg text-[10.5px] leading-tight space-y-1">
 <div className="flex justify-between font-bold">
 <span className="text-emerald-600 dark:text-emerald-400">₹{txn.amount.toFixed(2)}</span>
 <span className="font-mono text-[9px] text-muted">{txn.date} {txn.time}</span>
 </div>
 <div className="text-muted flex justify-between text-[9.5px]">
 <span>By: @{txn.collectedBy}</span>
 {txn.notes && <span className="italic truncate max-w-[120px]">"{txn.notes}"</span>}
 </div>
 </div>
 ))}
 </div>
 );
 })()}
 </div>

 {/* Action panel triggers */}
 <div className="grid gap-2 pt-2 border-t border-gray-50">
 <button
 id="btn-print"
 onClick={() => {
 setSelectedPrintFormat(company.defaultPrintFormat ||"Receipt");
 setShowPrintModal(true);
 }}
 className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-default py-1.5 text-xs font-semibold text-secondary hover:bg-surface cursor-pointer bg-card"
 >
 <Printer className="h-3.5 w-3.5" />
 <span>Print</span>
 </button>
 <button
 id="btn-download"
 onClick={() => {
 setShowDownloadModal(true);
 }}
 className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-default py-1.5 text-xs font-semibold text-secondary hover:bg-surface cursor-pointer bg-card"
 >
 <Download className="h-3.5 w-3.5" />
 <span>Download</span>
 </button>
 
 {(userRole === "Admin" || userRole === "Superadmin") && !inspectedInvoice.isSoftDeleted && (
 <button
 onClick={() => handleDeleteInvoice(inspectedInvoice)}
 className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-100 hover:border-red-200 bg-red-50/50 hover:bg-red-50 py-1.5 text-xs font-bold text-red-600 cursor-pointer"
 >
 <Trash2 className="h-3.5 w-3.5" />
 <span>Soft Delete (Archive Trash)</span>
 </button>
 )}

 {(userRole === "Admin" || userRole === "Superadmin") && inspectedInvoice.isSoftDeleted && (
 <button
 onClick={() => handleRestoreInvoice(inspectedInvoice)}
 className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-green-200 hover:border-green-300 bg-green-50/60 hover:bg-green-50 py-1.5 text-xs font-bold text-green-600 cursor-pointer"
 >
 <RotateCcw className="h-3.5 w-3.5" />
 <span>Restore Invoice to WIP</span>
 </button>
 )}
 </div>

 </div>
 ) : (
 /* ACTIVE INLINE EDIT COMPARTMENT FOR ADMIN / MANAGER */
 <div className="space-y-4 animate-in slide-in-from-top-2 duration-250">
 <div className="bg-amber-500/10 border border-amber-950/20 p-3.5 rounded-lg text-[11px] text-amber-500 leading-normal flex items-start gap-2 font-sans">
 <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
 <span>You are editing invoice properties as an authorized {userRole}. All changes write immediately.</span>
 </div>

 <div className="space-y-3">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Operations Status</label>
 <select
 value={editStatus}
 onChange={(e) => setEditStatus(e.target.value as InvoiceStatus)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none"
 >
 <option value="Draft">Draft</option>
 <option value="Work In Progress">Work In Progress</option>
 <option value="Ready for Delivery">Ready for Delivery</option>
 <option value="Delivered">Delivered</option>
 <option value="Completed">Completed</option>
 <option value="Cancelled">Cancelled</option>
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Assigned Delivery Staff</label>
 <select
 value={editAssignedEmployee}
 onChange={(e) => setEditAssignedEmployee(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none"
 >
 <option value="">-- Unassigned --</option>
 {activeStaff.map(s => (
 <option key={s.id} value={s.fullName}>{s.fullName} ({s.role})</option>
 ))}
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Expected Dispatch Date</label>
 <input
 type="date"
 value={editExpectedDeliveryDate}
 onChange={(e) => setEditExpectedDeliveryDate(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 text-xs text-primary dark:text-primary focus:border-blue-500 font-mono"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Fulfillment Remarks</label>
 <textarea
 value={editDeliveryNotes}
 onChange={(e) => setEditDeliveryNotes(e.target.value)}
 placeholder="Special instructions..."
 rows={3}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none"
 />
 </div>
 </div>

 <div className="flex gap-2 pt-2">
 <button
 onClick={handleSaveEditInvoice}
 className="flex-1 bg-blue-600 hover:bg-blue-700 text-primary rounded-lg py-1.5 text-xs font-bold active:scale-95 transition-all outline-none border-none cursor-pointer"
 >
 Save Changes
 </button>
 <button
 onClick={() => setIsEditing(false)}
 className="bg-card-secondary  border border-default hover:bg-gray-200 dark:hover:bg-neutral-800 text-muted dark:text-muted rounded-lg px-4 py-1.5 text-xs font-bold active:scale-95 transition-all outline-none cursor-pointer"
 >
 Cancel
 </button>
 </div>
 </div>
 )}

 </div>
 ) : (
 <div className="py-24 text-center text-muted space-y-2 font-sans">
 <FileText className="h-10 w-10 mx-auto text-gray-200" />
 <h3 className="font-bold text-xs text-muted">Select an Invoice</h3>
 <p className="text-[10px] leading-relaxed mx-auto max-w-[180px]">
 Click on any row transaction code in the left history table to display customer lists, ownership tracers, and timelines.
 </p>
 </div>
 )}
 </div>

 {/* COLLECT PAYMENT MODAL */}
 {showCollectPaymentModal && inspectedInvoice && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/60 p-4 animate-in fade-in duration-200">
 <div className="w-full max-w-sm rounded-xl border border-default bg-card p-5 shadow-lg space-y-4 animate-in zoom-in-95 duration-200">
 <div className="flex items-center justify-between border-b border-gray-50 pb-2.5">
 <div className="flex items-center gap-1.5 min-w-0">
 <CreditCard className="h-4.5 w-4.5 text-emerald-600" />
 <h3 className="font-bold text-primary dark:text-gray-100 text-sm truncate">Collect Payment</h3>
 </div>
 <button
 onClick={() => setShowCollectPaymentModal(false)}
 className="text-muted hover:text-muted dark:hover:text-gray-200 cursor-pointer p-0.5 border-none bg-transparent"
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 <div className="space-y-4">
 <div className="text-xs text-muted dark:text-muted space-y-1">
 <div>Invoice Reference: <strong className="font-mono text-primary dark:text-muted">{inspectedInvoice.invoiceNo}</strong></div>
 <div>Outstanding Balance: <strong className="text-rose-500">₹{(inspectedInvoice.balanceDue || 0).toFixed(2)}</strong></div>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Amount Received (₹) <span className="text-rose-500">*</span></label>
 <input
 type="number"
 step="0.01"
 required
 placeholder="e.g. 1000"
 value={collectAmountInput}
 onChange={(e) => setCollectAmountInput(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 text-xs text-primary dark:text-primary focus:border-blue-500 font-mono outline-none"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Notes / Remarks</label>
 <input
 type="text"
 placeholder="e.g. Part payment cash"
 value={collectNotesInput}
 onChange={(e) => setCollectNotesInput(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none"
 />
 </div>

 <div className="flex gap-2 pt-2">
 <button
 onClick={handleCollectPayment}
 className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-primary rounded-lg py-1.5 text-xs font-bold active:scale-95 transition-all outline-none border-none cursor-pointer"
 >
 Confirm Payment
 </button>
 <button
 onClick={() => setShowCollectPaymentModal(false)}
 className="bg-card-secondary  border border-default hover:bg-gray-200 dark:hover:bg-neutral-800 text-muted dark:text-muted rounded-lg px-4 py-1.5 text-xs font-bold active:scale-95 transition-all outline-none cursor-pointer"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* EDIT ADDRESS MODAL */}
 {showEditAddressModal && inspectedInvoice && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/60 p-4 animate-in fade-in duration-200">
 <div className="w-full max-w-md rounded-xl border border-default bg-card  p-5 shadow-lg space-y-4 animate-in zoom-in-95 duration-200 text-left">
 <div className="flex items-center justify-between border-b border-gray-50 pb-2.5">
 <div className="flex items-center gap-1.5 min-w-0">
 <MapPin className="h-4.5 w-4.5 text-blue-600" />
 <h3 className="font-bold text-primary dark:text-gray-100 text-sm truncate">Edit Customer Address</h3>
 </div>
 <button
 onClick={() => setShowEditAddressModal(false)}
 className="text-muted hover:text-muted dark:hover:text-gray-200 cursor-pointer p-0.5 border-none bg-transparent"
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 <div className="space-y-4">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Current Address</label>
 <div className="w-full bg-card-secondary p-2.5 rounded-lg border border-default text-xs text-muted dark:text-muted font-mono select-all break-words whitespace-pre-wrap">
 {editAddressCurrent ||"Not Provided"}
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted font-semibold mb-1">New Address <span className="text-rose-500">*</span></label>
 <textarea
 required
 rows={3}
 placeholder="Enter the complete corrected address details..."
 value={editAddressNew}
 onChange={(e) => setEditAddressNew(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none resize-none font-sans"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted font-semibold mb-1">Reason for Change <span className="text-rose-500">*</span></label>
 <input
 type="text"
 required
 placeholder="e.g. Typo correction, block change"
 value={editAddressReason}
 onChange={(e) => setEditAddressReason(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none font-sans"
 />
 </div>

 <div className="flex gap-2 pt-2">
 <button
 onClick={handleSaveAddress}
 className="flex-1 bg-blue-600 hover:bg-blue-700 text-primary rounded-lg py-1.5 text-xs font-bold active:scale-95 transition-all outline-none border-none cursor-pointer"
 >
 Save Address
 </button>
 <button
 onClick={() => setShowEditAddressModal(false)}
 className="bg-gray-105 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-muted dark:text-muted rounded-lg px-4 py-1.5 text-xs font-bold active:scale-95 transition-all outline-none border-none cursor-pointer"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* SELECT PRINT FORMAT MODAL */}
 {showPrintModal && inspectedInvoice && (
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
 Select the physical output sizing layout for printing invoice <strong>{inspectedInvoice.invoiceNo}</strong>:
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
 name="print-format"
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
 {showDownloadModal && inspectedInvoice && (
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
 Select the digital PDF document layout for downloading invoice <strong>{inspectedInvoice.invoiceNo}</strong>:
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
 name="download-format"
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
 </div>
 );
}
