import React, { useState, useEffect, useMemo } from"react";
import {
 Users,
 Search,
 Phone,
 MapPin,
 TrendingUp,
 Calendar,
 CreditCard,
 Plus,
 Edit2,
 Check,
 X,
 FileText,
 ChevronRight,
 UserPlus,
 AlertCircle
} from"lucide-react";
import { Customer, Invoice, User, AddressHistoryRecord } from"../types";
import { formatIndianCurrencyShort } from"../utils/currencyUtils";
import { SheetsSyncEngine } from"../utils/sheetsSync";

interface CustomersTabProps {
 customers: Customer[];
 invoices: Invoice[];
 onRefresh?: () => void;
 onShowNotification?: (text: string, type:"success" |"error" |"info") => void;
 initiallySelectedCustomerId?: string;
 onClearSelected?: () => void;
 onNavigateToTab?: (tab: string, filter?: string, extraState?: any) => void;
 onSelectCustomer?: (customer: Customer) => void;
}

export default function CustomersTab({
 customers,
 invoices,
 onRefresh,
 onShowNotification,
 initiallySelectedCustomerId,
 onClearSelected,
 onNavigateToTab,
 onSelectCustomer
}: CustomersTabProps) {
 const [search, setSearch] = useState("");
 const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
 
 // Creation / Edit states
 const [isAddingNew, setIsAddingNew] = useState(false);
 const [isEditing, setIsEditing] = useState(false);

 // Form Fields State
 const [formName, setFormName] = useState("");
 const [formMobile, setFormMobile] = useState("");
 const [formSecondaryPhone, setFormSecondaryPhone] = useState("");
 const [formSecondaryContactName, setFormSecondaryContactName] = useState("");
 const [formAddress, setFormAddress] = useState("");
 const [formNotes, setFormNotes] = useState("");

 // Sorting state
 const [sortColumn, setSortColumn] = useState<string | null>(null);
 const [sortDirection, setSortDirection] = useState<"asc" |"desc">("asc");

 // Pagination state
 const [currentPage, setCurrentPage] = useState(1);
 const CUSTOMERS_PER_PAGE = 20;

 // Reset page when filtering or sorting changes
 useEffect(() => {
   setCurrentPage(1);
 }, [search, sortColumn, sortDirection]);

 const handleSort = (column: string) => {
 if (sortColumn === column) {
 setSortDirection(sortDirection ==="asc" ?"desc" :"asc");
 } else {
 setSortColumn(column);
 setSortDirection("asc");
 }
 };

 const currentUser = SheetsSyncEngine.getCurrentUser();

 // Handle deep-linking on load / prop change
 useEffect(() => {
 if (initiallySelectedCustomerId) {
 setSelectedCustomerId(initiallySelectedCustomerId);
 setIsAddingNew(false);
 setIsEditing(false);
 
 // Clean up search so the deep-linked customer is visible or reset deep link prop
 const matched = customers.find(c => c.id === initiallySelectedCustomerId);
 if (matched && onClearSelected) {
 onClearSelected();
 }
 }
 }, [initiallySelectedCustomerId, customers]);

 // Clean customer list with dynamic lifetime spend calculation
 const mappedCustomers = useMemo(() => {
    const invoicesByMobile = new Map<string, Invoice[]>();
    invoices.forEach((inv) => {
      const cleanMobile = String(inv.mobile || "").replace(/\D/g, "");
      if (cleanMobile) {
        if (!invoicesByMobile.has(cleanMobile)) {
          invoicesByMobile.set(cleanMobile, []);
        }
        invoicesByMobile.get(cleanMobile)!.push(inv);
      }
    });

    return customers.map((c) => {
      const cleanMobile = String(c.mobile || "").replace(/\D/g, "");
      const matchingInvoices = cleanMobile ? (invoicesByMobile.get(cleanMobile) || []) : [];
      const invoiceCount = matchingInvoices.length;
      const totalSpent = matchingInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
      const lastVisit = matchingInvoices.length > 0 ? matchingInvoices[0].date : "N/A";

      return {
        ...c,
        invoiceCount,
        totalSpent,
        lastVisit,
        matchingInvoices
      };
    });
  }, [customers, invoices]);

 const filteredCustomers = useMemo(() => {
 let result = mappedCustomers.filter((c) => {
 const sTerm = search.toLowerCase();
 return (
 c.name.toLowerCase().includes(sTerm) ||
 String(c.mobile ||"").replace(/\D/g,"").includes(sTerm) ||
 (c.address && c.address.toLowerCase().includes(sTerm))
 );
 });

 if (!sortColumn) {
 return result.sort((a, b) => b.totalSpent - a.totalSpent); // default sorted by highest spenders
 }

 result.sort((a, b) => {
 let valA: any ="";
 let valB: any ="";

 switch (sortColumn) {
 case"Client Code":
 valA = parseInt(a.id.replace(/\D/g,""), 10) || 0;
 valB = parseInt(b.id.replace(/\D/g,""), 10) || 0;
 break;
 case"Full Name":
 valA = a.name.toLowerCase();
 valB = b.name.toLowerCase();
 break;
 case"Contact Info":
 valA = parseInt(String(a.mobile ||"").replace(/\D/g,"") ||"0", 10);
 valB = parseInt(String(b.mobile ||"").replace(/\D/g,"") ||"0", 10);
 break;
 case"Invoices":
 valA = a.invoiceCount;
 valB = b.invoiceCount;
 break;
 case"Lifetime Spend":
 valA = a.totalSpent;
 valB = b.totalSpent;
 break;
 }

 if (valA < valB) return sortDirection ==="asc" ? -1 : 1;
 if (valA > valB) return sortDirection ==="asc" ? 1 : -1;
 return 0;
 });

 return result;
 }, [mappedCustomers, search, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE) || 1;
  const activePage = Math.min(currentPage, Math.max(1, totalPages));

  const paginatedCustomers = useMemo(() => {
    const startIndex = (activePage - 1) * CUSTOMERS_PER_PAGE;
    return filteredCustomers.slice(startIndex, startIndex + CUSTOMERS_PER_PAGE);
  }, [filteredCustomers, activePage]);

 // Selected customer profile metrics
 const activeCustomer = mappedCustomers.find(c => c.id === selectedCustomerId);

 // Status breakdown metrics
 const getCustomerMetrics = (cMobile: string) => {
 const clientMobileClean = String(cMobile ||"").replace(/\D/g,"");
 const clientInvoices = invoices.filter(inv => String(inv.mobile ||"").replace(/\D/g,"") === clientMobileClean);
 
 const countTotal = clientInvoices.length;
 const countCompleted = clientInvoices.filter(inv => inv.status ==="Completed").length;
 const countPending = clientInvoices.filter(inv => 
 ["Work In Progress","Ready for Delivery","Pending Deliveries","Delivered"].includes(inv.status)
 ).length;
 const countCancelled = clientInvoices.filter(inv => inv.status ==="Cancelled").length;
 const countDraft = clientInvoices.filter(inv => inv.status ==="Draft").length;

 // Total revenue sum (exclude cancelled invoices count)
 const revenueSum = clientInvoices
 .filter(inv => inv.status !=="Cancelled")
 .reduce((sum, inv) => sum + inv.grandTotal, 0);

 return {
 countTotal,
 countCompleted,
 countPending,
 countCancelled,
 countDraft,
 revenueSum
 };
 };

 // Trigger Edit customer
 const triggerStartEdit = () => {
 if (!activeCustomer) return;
 setFormName(activeCustomer.name);
 setFormMobile(activeCustomer.mobile);
 setFormSecondaryPhone(activeCustomer.secondaryPhone ||"");
 setFormSecondaryContactName(activeCustomer.secondaryContactName ||"");
 setFormAddress(activeCustomer.address ||"");
 setFormNotes(activeCustomer.notes ||"");
 setIsEditing(true);
 setIsAddingNew(false);
 };

 // Trigger Add customer
 const triggerStartAdd = () => {
 setFormName("");
 setFormMobile("");
 setFormSecondaryPhone("");
 setFormSecondaryContactName("");
 setFormAddress("");
 setFormNotes("");
 setIsAddingNew(true);
 setIsEditing(false);
 };

 // Save changes (both Add / Edit)
 const handleSaveCustomer = async () => {
 if (!formAddress || formAddress.trim() ==="") {
 if (onShowNotification) onShowNotification("Address is required.","error");
 return;
 }

 if (!formName.trim() || !formMobile.trim()) {
 if (onShowNotification) onShowNotification("Customer Name and Primary Mobile are mandatory.","error");
 return;
 }

 const cleanedMobile = String(formMobile ||"").replace(/\D/g,"");
 if (cleanedMobile.length < 8) {
 if (onShowNotification) onShowNotification("Please enter a valid primary mobile number.","error");
 return;
 }

 const cleanPrim = String(formMobile ||"").replace(/\D/g,"");
 const cleanSec = String(formSecondaryPhone ||"").replace(/\D/g,"");
 if (cleanSec !=="" && cleanPrim === cleanSec) {
 if (onShowNotification) onShowNotification("Primary and Secondary Mobile Numbers cannot be identical.","error");
 return;
 }

 const currentCustomers = SheetsSyncEngine.getCustomers();

 if (isAddingNew) {
 // Check duplicate mobile in existing customers list
 const dup = currentCustomers.find(c => String(c.mobile ||"").replace(/\D/g,"") === cleanedMobile);
 if (dup) {
 if (onShowNotification) onShowNotification(`Primary Mobile already linked to ${dup.name}`,"error");
 return;
 }

 const newCust: Customer = {
 id: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
 name: formName.trim(),
 mobile: formMobile.trim(),
 secondaryPhone: formSecondaryPhone.trim() || undefined,
 secondaryContactName: formSecondaryContactName.trim() || undefined,
 address: formAddress.trim(),
 currentAddress: formAddress.trim(),
 addressHistory: [],
 notes: formNotes.trim() || undefined
 };

 try {
 const updated = [newCust, ...currentCustomers];
 SheetsSyncEngine.saveCustomers(updated);
 
 // Audit log action
 SheetsSyncEngine.addAuditLog(
"Customer Added",
 currentUser?.fullName ||"Admin",
"None",
 `Client ${newCust.name} (${newCust.id}) registered in Customer Registry. Primary: ${newCust.mobile}.`
 );

 if (onShowNotification) onShowNotification(`✓ Customer ${newCust.name} successfully registered.`,"success");
 setIsAddingNew(false);
 setSelectedCustomerId(newCust.id); // select newly added user
 if (onRefresh) onRefresh();
 } catch (err) {
 if (onShowNotification) onShowNotification("Failed to save new customer.","error");
 }

 } else if (isEditing && activeCustomer) {
 // Check duplicate mobile in other customers
 const dup = currentCustomers.find(c => String(c.mobile ||"").replace(/\D/g,"") === cleanedMobile && c.id !== activeCustomer.id);
 if (dup) {
 if (onShowNotification) onShowNotification(`Primary Mobile registered with another customer: ${dup.name}`,"error");
 return;
 }

 const oldAddress = activeCustomer.address ||"";
 const newAddress = formAddress.trim();
 let updatedHistory = activeCustomer.addressHistory || [];

 if (oldAddress.toLowerCase() !== newAddress.toLowerCase() && oldAddress !=="") {
 // Move old address to history!
 const historyRecord: AddressHistoryRecord = {
 id: `ADDR-${Math.floor(1000 + Math.random() * 9000)}`,
 address: oldAddress,
 oldAddress: oldAddress,
 newAddress: newAddress,
 reason:"Manually edited customer profile",
 customerId: activeCustomer.id,
 createdDate: new Date().toLocaleDateString("en-IN", {
 day:"2-digit",
 month:"short",
 year:"numeric"
 }) +"" + new Date().toLocaleTimeString("en-IN", {
 hour:"2-digit",
 minute:"2-digit",
 hour12: true
 }),
 createdBy: currentUser?.fullName ||"Admin",
 status:"Old"
 };
 updatedHistory = [historyRecord, ...updatedHistory];

 // Audit entry: Address change audit log
 SheetsSyncEngine.addAuditLog(
"Address Updated",
 currentUser?.fullName ||"Admin",
 oldAddress,
 `New Address: ${newAddress} (Customer ID: ${activeCustomer.id})`
 );
 }

 const updatedCust: Customer = {
 ...activeCustomer,
 name: formName.trim(),
 mobile: formMobile.trim(),
 secondaryPhone: formSecondaryPhone.trim() || undefined,
 secondaryContactName: formSecondaryContactName.trim() || undefined,
 address: newAddress,
 currentAddress: newAddress,
 addressHistory: updatedHistory,
 notes: formNotes.trim() || undefined
 };

 try {
 const updatedList = currentCustomers.map(c => c.id === activeCustomer.id ? updatedCust : c);
 SheetsSyncEngine.saveCustomers(updatedList);

 SheetsSyncEngine.addAuditLog(
"Customer Edit",
 currentUser?.fullName ||"Admin",
 JSON.stringify(activeCustomer),
 JSON.stringify(updatedCust)
 );

 if (onShowNotification) onShowNotification(`✓ Profile details for ${updatedCust.name} successfully updated.`,"success");
 setIsEditing(false);
 if (onRefresh) onRefresh();
 } catch (err) {
 if (onShowNotification) onShowNotification("Failed to update customer.","error");
 }
 }
 };

 const handleRestoreAddress = (hist: AddressHistoryRecord) => {
 if (!activeCustomer) return;
 const oldAddress = activeCustomer.address ||"";
 const newAddress = hist.address;

 let updatedHistory = activeCustomer.addressHistory || [];
 updatedHistory = updatedHistory.filter(h => h.id !== hist.id);

 if (oldAddress.trim() !=="") {
 const historyRecord: AddressHistoryRecord = {
 id: `ADDR-${Math.floor(1000 + Math.random() * 9000)}`,
 address: oldAddress,
 oldAddress: oldAddress,
 newAddress: newAddress,
 reason: `Restored historical address`,
 customerId: activeCustomer.id,
 createdDate: new Date().toLocaleDateString("en-IN", {
 day:"2-digit",
 month:"short",
 year:"numeric"
 }) +"" + new Date().toLocaleTimeString("en-IN", {
 hour:"2-digit",
 minute:"2-digit",
 hour12: true
 }),
 createdBy: currentUser?.fullName ||"Admin",
 status:"Old"
 };
 updatedHistory = [historyRecord, ...updatedHistory];
 }

 const updatedCust: Customer = {
 ...activeCustomer,
 address: newAddress,
 currentAddress: newAddress,
 addressHistory: updatedHistory
 };

 const currentCustomers = SheetsSyncEngine.getCustomers();
 const updatedList = currentCustomers.map(c => c.id === activeCustomer.id ? updatedCust : c);
 SheetsSyncEngine.saveCustomers(updatedList);

 SheetsSyncEngine.addAuditLog(
"Address Updated",
 currentUser?.fullName ||"Admin",
 oldAddress,
 `Restored Address: ${newAddress} (Customer ID: ${activeCustomer.id})`
 );

 if (onShowNotification) onShowNotification(`✓ Restored address successfully:"${newAddress}"`,"success");
 if (onRefresh) onRefresh();
 };

 const handleDeleteAddressHistory = (id: string) => {
 if (currentUser?.role !=="Admin") {
 if (onShowNotification) onShowNotification("Only Admin can delete address history records.","error");
 return;
 }
 if (!activeCustomer) return;

 const recordToDelete = activeCustomer.addressHistory?.find(h => h.id === id);
 if (!recordToDelete) return;

 if (!window.confirm(`Are you sure you want to delete this address history record:"${recordToDelete.address}"?`)) {
 return;
 }

 const updatedHistory = (activeCustomer.addressHistory || []).filter(h => h.id !== id);
 const updatedCust: Customer = {
 ...activeCustomer,
 addressHistory: updatedHistory
 };

 const currentCustomers = SheetsSyncEngine.getCustomers();
 const updatedList = currentCustomers.map(c => c.id === activeCustomer.id ? updatedCust : c);
 SheetsSyncEngine.saveCustomers(updatedList);

 SheetsSyncEngine.addAuditLog(
"Address History Delete",
 currentUser?.fullName ||"Admin",
 recordToDelete.address,
 `Deleted address history record from Customer registry (Customer ID: ${activeCustomer.id})`
 );

 if (onShowNotification) onShowNotification("✓ Address history record removed.","success");
 if (onRefresh) onRefresh();
 };

 return (
 <div className="space-y-6 animate-in fade-in duration-300">
 
 {/* HEADER ROW */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h1 className="text-xl font-extrabold tracking-tight text-primary font-sans">CRM Customer Registry</h1>
 <p className="text-xs text-secondary">
 Monitor client parameters, orders status matrices, and unified billing trace.
 </p>
 </div>
 <button
 onClick={triggerStartAdd}
 className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold text-primary px-4 py-2 text-xs transition duration-150 shadow shadow-blue-500/10 cursor-pointer border-none"
 >
 <Plus className="h-4 w-4" />
 <span>Add New Customer</span>
 </button>
 </div>

 {/* SPLIT EXPERIENCES GRID */}
 <div className="grid gap-6 lg:grid-cols-3">
 
 {/* LEFT COLUMN: CUSTOMERS DIRECTORY (2-cols span) */}
 <div className="rounded-xl border border-default bg-card p-5 shadow-sm space-y-4 lg:col-span-2">
 
 <div className="relative">
 <input
 type="text"
 placeholder="Search core customers by Name, cellphone number, or address..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface pl-9 pr-3.5 py-2.5 text-xs text-primary outline-none focus:border-blue-500"
 />
 <span className="absolute left-3 top-3 text-muted">
 <Search className="h-4 w-4" />
 </span>
 </div>

 <div className="overflow-x-auto">
 <table className="min-w-full table-auto text-left text-xs text-primary bg-card">
 <thead className="bg-table-header text-[10px] uppercase font-bold text-secondary border-b border-default select-none">
 <tr>
 <th className="px-4 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort("Client Code")}>
 Client Code {sortColumn ==="Client Code" ? (sortDirection ==="asc" ?"↑" :"↓") :""}
 </th>
 <th className="px-4 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort("Full Name")}>
 Full Name {sortColumn ==="Full Name" ? (sortDirection ==="asc" ?"↑" :"↓") :""}
 </th>
 <th className="px-4 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort("Contact Info")}>
 Contact info {sortColumn ==="Contact Info" ? (sortDirection ==="asc" ?"↑" :"↓") :""}
 </th>
 <th className="px-4 py-3 text-center cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort("Invoices")}>
 Invoices {sortColumn ==="Invoices" ? (sortDirection ==="asc" ?"↑" :"↓") :""}
 </th>
 <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort("Lifetime Spend")}>
 Lifetime Spend {sortColumn ==="Lifetime Spend" ? (sortDirection ==="asc" ?"↑" :"↓") :""}
 </th>
 </tr>
 </thead>
  <tbody className="divide-y divide-gray-100">
  {paginatedCustomers.map((c) => (
  <tr
  key={c.id}
  onClick={() => {
  setSelectedCustomerId(c.id);
  setIsAddingNew(false);
  setIsEditing(false);
  }}
  className={`cursor-pointer transition-colors ${
  selectedCustomerId === c.id
  ?"bg-blue-50/50 dark:bg-blue-955/20 hover:bg-blue-50/70"
  :"hover:bg-table-hover transition-colors"
  }`}
  >
  <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">{c.id}</td>
  <td className="px-4 py-3 font-semibold text-primary">{c.name}</td>
  <td className="px-4 py-3 font-mono text-xs">{c.mobile}</td>
  <td className="px-4 py-3 text-center font-mono font-semibold text-blue-600 dark:text-blue-400">
  {c.invoiceCount} invoices
  </td>
  <td className="px-4 py-3 text-right font-mono font-extrabold text-primary">
  <span title={`₹${c.totalSpent.toFixed(2)}`}>₹{formatIndianCurrencyShort(c.totalSpent)}</span>
  </td>
  </tr>
  ))}
  {filteredCustomers.length === 0 && (
  <tr>
  <td colSpan={5} className="py-12 text-center text-muted dark:text-muted">
  No active customer records located matching selection criteria.
  </td>
  </tr>
  )}
  </tbody>
  </table>
  </div>

  {/* Pagination Section */}
  {totalPages > 1 && (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-default text-xs mt-4">
      <span className="text-muted font-sans">
        Showing page <strong>{activePage}</strong> of <strong>{totalPages}</strong> ({filteredCustomers.length} total entries)
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
                  ? "bg-blue-600 border-blue-600 text-white font-bold"
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

 {/* RIGHT COLUMN: PROFESSIONAL DRILL-DOWN CUSTOMER PROFILE CARD or FORMS */}
 <div className="rounded-xl border border-default bg-card p-5 shadow-sm text-left">
 
 {/* STATE A: ADD NEW CUSTOMER FORM */}
 {isAddingNew && (
 <div className="space-y-4 animate-in slide-in-from-right duration-200">
 <div className="flex items-center justify-between border-b border-gray-50 pb-2.5">
 <div className="flex items-center gap-1.5 text-blue-600 font-bold text-sm">
 <UserPlus className="h-4.5 w-4.5 animate-pulse" />
 <span>Register Fresh Client</span>
 </div>
 <button
 onClick={() => setIsAddingNew(false)}
 className="p-1 text-muted hover:bg-card-secondary dark:hover:bg-card rounded-lg bg-transparent border-none"
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 <div className="space-y-3.5 text-xs text-primary dark:text-primary">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Customer Name *</label>
 <input
 type="text"
 required
 placeholder="E.g. Alexander Pierce"
 value={formName}
 onChange={(e) => setFormName(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 focus:border-blue-500 font-semibold"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Primary Mobile *</label>
 <input
 type="text"
 required
 placeholder="E.g. +14545550198"
 value={formMobile}
 onChange={(e) => setFormMobile(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 focus:border-blue-500 font-mono"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Secondary Mobile No (Optional)</label>
 <input
 type="text"
 placeholder="Alternative Phone Details"
 value={formSecondaryPhone}
 onChange={(e) => setFormSecondaryPhone(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 focus:border-blue-500 font-mono"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Secondary Contact Name (Optional)</label>
 <input
 type="text"
 placeholder="E.g. Elizabeth Pierce (Spouse)"
 value={formSecondaryContactName}
 onChange={(e) => setFormSecondaryContactName(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 focus:border-blue-500"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Mailing Address Address</label>
 <input
 type="text"
 placeholder="E.g. Suite 45, 908 Hudson Blvd, NY"
 value={formAddress}
 onChange={(e) => setFormAddress(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 focus:border-blue-500"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Administrative Notes</label>
 <textarea
 placeholder="Specific constraints, custom tags, credits..."
 rows={3}
 value={formNotes}
 onChange={(e) => setFormNotes(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 focus:border-blue-500"
 />
 </div>
 </div>

 <div className="flex gap-2 pt-3 border-t border-gray-50">
 <button
 type="button"
 onClick={handleSaveCustomer}
 className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 py-2 text-xs font-bold text-primary transition active:scale-95 border-none cursor-pointer"
 >
 Create Record
 </button>
 <button
 type="button"
 onClick={() => setIsAddingNew(false)}
 className="rounded-lg bg-card-secondary hover:bg-gray-200 text-secondary dark:text-muted px-3 py-2 text-xs font-bold tracking-tight outline-none border-none cursor-pointer"
 >
 Cancel
 </button>
 </div>
 </div>
 )}

 {/* STATE B: EDIT CUSTOMER FORM */}
 {isEditing && activeCustomer && (
 <div className="space-y-4 animate-in slide-in-from-right duration-200">
 <div className="flex items-center justify-between border-b border-gray-55 pb-2.5">
 <div>
 <h3 className="font-extrabold text-primary dark:text-primary text-sm">Edit Profile Parameters</h3>
 <span className="text-[10px] font-mono text-muted uppercase font-bold">{activeCustomer.id}</span>
 </div>
 <button
 onClick={() => setIsEditing(false)}
 className="p-1 text-muted hover:bg-card-secondary dark:hover:bg-card rounded-lg bg-transparent border-none"
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 <div className="space-y-3.5 text-xs text-primary dark:text-primary">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Customer Name *</label>
 <input
 type="text"
 required
 value={formName}
 onChange={(e) => setFormName(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 focus:border-blue-500 font-semibold"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Primary Mobile *</label>
 <input
 type="text"
 required
 value={formMobile}
 onChange={(e) => setFormMobile(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 focus:border-blue-500 font-mono"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Secondary Mobile No (Optional)</label>
 <input
 type="text"
 placeholder="Alternative Contact Number"
 value={formSecondaryPhone}
 onChange={(e) => setFormSecondaryPhone(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 focus:border-blue-500 font-mono"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Secondary Contact Name (Optional)</label>
 <input
 type="text"
 placeholder="E.g. Linda Pierce (Daughter-in-law)"
 value={formSecondaryContactName}
 onChange={(e) => setFormSecondaryContactName(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 focus:border-blue-500"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Mailing Address Location</label>
 <input
 type="text"
 value={formAddress}
 onChange={(e) => setFormAddress(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 focus:border-blue-500"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Administrative Notes</label>
 <textarea
 placeholder="Any administrative notes..."
 rows={3}
 value={formNotes}
 onChange={(e) => setFormNotes(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 focus:border-blue-500"
 />
 </div>
 </div>

 <div className="flex gap-2 pt-3 border-t border-gray-50">
 <button
 type="button"
 onClick={handleSaveCustomer}
 className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 py-2 text-xs font-bold text-primary transition active:scale-95 border-none cursor-pointer"
 >
 Save Changes
 </button>
 <button
 type="button"
 onClick={() => setIsEditing(false)}
 className="rounded-lg bg-card-secondary hover:bg-gray-200 text-secondary dark:text-muted px-3 py-2 text-xs font-bold tracking-tight outline-none border-none cursor-pointer"
 >
 Cancel
 </button>
 </div>
 </div>
 )}

 {/* STATE C: ACTIVE CUSTOMER DRILL-DOWN DISPLAY PROFILE PAGE */}
 {!isAddingNew && !isEditing && activeCustomer && (
 <div className="space-y-5 animate-in slide-in-from-right duration-250">
 {onSelectCustomer && (
 <button
 type="button"
 onClick={() => onSelectCustomer(activeCustomer)}
 className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white transition active:scale-95 border-none cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
 >
 <Check className="h-4 w-4" />
 <span>Link to Billing Invoice</span>
 </button>
 )}

 {/* Header profile title */}
 <div className="flex items-center justify-between border-b border-default pb-3">
 <div>
 <h2 className="font-extrabold text-primary dark:text-primary text-sm tracking-tight">{activeCustomer.name}</h2>
 <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{activeCustomer.id}</span>
 </div>
 <button
 onClick={triggerStartEdit}
 className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline cursor-pointer bg-transparent border-none outline-none"
 >
 <Edit2 className="h-3 w-3" /> Edit Profile
 </button>
 </div>

 {/* CRM Parameters Display */}
 <div className="bg-surface p-4 rounded-xl border border-default text-xs text-secondary dark:text-zinc-300 space-y-2 relative">
 <div className="flex justify-between">
 <span className="text-muted font-semibold uppercase text-[9px] tracking-wide">Primary Phone:</span>
 <span className="font-mono text-primary dark:text-primary font-bold">{activeCustomer.mobile}</span>
 </div>

 <div className="flex justify-between border-t border-default pt-2">
 <span className="text-muted font-semibold uppercase text-[9px] tracking-wide">Secondary Phone:</span>
 <span className="font-mono text-primary dark:text-teal-400">{activeCustomer.secondaryPhone ||"Not Available"}</span>
 </div>

 {activeCustomer.secondaryContactName && (
 <div className="flex justify-between border-t border-default pt-2">
 <span className="text-muted font-semibold uppercase text-[9px] tracking-wide">Alt contact name:</span>
 <span className="font-semibold text-primary dark:text-primary">{activeCustomer.secondaryContactName}</span>
 </div>
 )}

 {/* Current address and history management panel */}
 <div className="border-t border-default pt-2.5 space-y-2">
 <span className="text-muted font-semibold uppercase text-[9px] tracking-wide block">Address History & Management</span>
 
 {/* Current Address display */}
 <div className="rounded-lg bg-blue-50/50  p-2.5 border border-blue-100/30 dark:border-blue-900/20 text-xs">
 <div className="flex items-center justify-between font-bold text-blue-600 dark:text-blue-400 text-[10px] uppercase mb-1">
 <span>Current Primary Address</span>
 <span className="bg-blue-500 text-white font-semibold font-sans text-[8px] px-1 py-0.5 rounded uppercase tracking-wide">Active</span>
 </div>
 <p className="text-secondary dark:text-gray-200 font-semibold">{activeCustomer.address || activeCustomer.currentAddress ||"Not Provided"}</p>
 </div>

 {/* History List */}
 <div className="space-y-1.5 pt-1">
 <span className="text-[10px] font-bold text-muted uppercase tracking-wide">Historical Locations</span>
 {activeCustomer.addressHistory && activeCustomer.addressHistory.length > 0 ? (
 <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
 {activeCustomer.addressHistory.map((hist) => (
 <div key={hist.id} className="p-2 bg-surface  rounded border border-default dark:border-default text-[11px] leading-tight flex justify-between gap-2">
 <div className="flex-1 min-w-0">
 <p className="font-semibold text-secondary dark:text-gray-200 break-words">{hist.address}</p>
 <div className="text-[9px] text-muted mt-1">
 Added by: <span className="font-semibold text-muted">{hist.createdBy}</span> on {hist.createdDate}
 </div>
 </div>
 <div className="flex flex-col items-end gap-1.5 justify-center">
 {/* Status badge */}
 <span className="bg-card-secondary text-muted dark:bg-zinc-800 dark:text-muted text-[8px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">{hist.status}</span>
 
 {/* Action controls */}
 <div className="flex items-center gap-1.5">
 <button
 type="button"
 onClick={() => handleRestoreAddress(hist)}
 className="text-[9px] text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-none p-0 cursor-pointer font-bold inline-block"
 title="Restore this address as active primary"
 >
 Restore
 </button>
 {currentUser?.role ==="Admin" && (
 <button
 type="button"
 onClick={() => handleDeleteAddressHistory(hist.id)}
 className="text-[9px] text-rose-600 hover:underline bg-transparent border-none p-0 cursor-pointer font-bold inline-block"
 title="Delete this history record"
 >
 Delete
 </button>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-[11px] text-muted italic">No previous addresses in file history.</p>
 )}
 </div>
 </div>

 {activeCustomer.notes && (
 <div className="border-t border-default dark:border-grey-805 pt-2 bg-yellow-500/5 p-2 rounded-lg border border-yellow-700/10 mt-1">
 <span className="text-yellow-600 dark:text-yellow-400 font-mono uppercase text-[9px] tracking-wide block mb-0.5 font-bold">Administrative Note Log:</span>
 <p className="text-muted dark:text-muted italic">"{activeCustomer.notes}"</p>
 </div>
 )}
 </div>

 {/* ERP Unified Transaction Status Metrics */}
 {(() => {
 const metrics = getCustomerMetrics(activeCustomer.mobile);
 return (
 <div className="space-y-3.5">
 <h3 className="text-[10px] uppercase font-bold tracking-wider text-muted border-b border-gray-50 pb-1">Client History Overview</h3>

 <div className="grid grid-cols-2 gap-3">
 <div className="bg-emerald-500/10 border border-emerald-900/10 p-3 rounded-lg text-center dark:bg-emerald-950/20">
 <span className="text-[9px] font-bold text-emerald-600 uppercase">Lifetime Revenue</span>
 <p className="text-lg font-mono font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5" title={`₹${metrics.revenueSum.toFixed(2)}`}>₹{formatIndianCurrencyShort(metrics.revenueSum)}</p>
 </div>
 <div className="bg-blue-500/10 border border-blue-900/10 p-3 rounded-lg text-center ">
 <span className="text-[9px] font-bold text-blue-600 uppercase">Transaction count</span>
 <p className="text-lg font-mono font-extrabold text-blue-700 dark:text-blue-400 mt-0.5">{metrics.countTotal} bills</p>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-2 text-center text-[10px] leading-tight pt-1">
 <div className="bg-card-secondary  rounded p-2 border border-transparent">
 <span className="text-muted font-bold block">COMPLETED</span>
 <span className="font-mono font-extrabold text-emerald-600 text-xs">{metrics.countCompleted}</span>
 </div>
 <div className="bg-card-secondary  rounded p-2 border border-transparent">
 <span className="text-muted font-bold block">WIP / PENDING</span>
 <span className="font-mono font-extrabold text-amber-500 text-xs">{metrics.countPending}</span>
 </div>
 <div className="bg-card-secondary  rounded p-2 border border-transparent">
 <span className="text-muted font-bold block">CANCELLED</span>
 <span className="font-mono font-extrabold text-red-500 text-xs">{metrics.countCancelled}</span>
 </div>
 </div>

 {/* RECENT INVOICES LIST */}
 <div className="space-y-2 border-t border-gray-50 pt-3">
 <h4 className="text-[10px] uppercase font-bold text-muted">Recent customer invoices</h4>
 <div className="space-y-2 max-h-48 overflow-y-auto px-0.5">
 {activeCustomer.matchingInvoices.map((inv) => (
 <div
 key={inv.invoiceNo}
 onClick={() => {
 if (onNavigateToTab) {
 onNavigateToTab("history","All", { invoiceNo: inv.invoiceNo });
 }
 }}
 className="bg-surface/50 hover:bg-blue-50/20  border border-default p-2.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition"
 >
 <div>
 <div className="font-mono font-bold text-blue-600 dark:text-blue-400">{inv.invoiceNo}</div>
 <span className="text-[10px] text-muted">{inv.date}</span>
 </div>
 <div className="text-right">
 <span className="font-mono font-extrabold text-primary dark:text-primary block">₹{inv.grandTotal.toFixed(2)}</span>
 <span className={`text-[8.5px] uppercase font-bold px-1 rounded ${
 inv.status ==="Completed"
 ?"bg-emerald-500/10 text-emerald-600"
 : inv.status ==="Cancelled"
 ?"bg-red-500/10 text-red-500"
 :"bg-blue-500/10 text-blue-500"
 }`}>{inv.status}</span>
 </div>
 </div>
 ))}
 {activeCustomer.matchingInvoices.length === 0 && (
 <p className="text-[11px] text-muted italic text-center py-4">No active registered transactions for this client.</p>
 )}
 </div>
 </div>

 </div>
 );
 })()}
 </div>
 )}

 {/* STATE D: EMPTY SELECTION STATE */}
 {!isAddingNew && !isEditing && !activeCustomer && (
 <div className="py-28 text-center text-muted space-y-2">
 <Users className="h-10 w-10 mx-auto text-gray-200" />
 <h3 className="font-bold text-xs text-muted">Select Customer Profile</h3>
 <p className="text-[10px] leading-relaxed mx-auto max-w-[190px]">
 Click on any client directory row on the left side to display advanced contacts, secondary details, and lifecycle invoices history.
 </p>
 </div>
 )}

 </div>

 </div>

 </div>
 );
}
