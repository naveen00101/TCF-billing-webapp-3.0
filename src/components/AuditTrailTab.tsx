import React, { useState } from"react";
import { 
 ShieldCheck, 
 RefreshCw, 
 Terminal, 
 Search, 
 Filter, 
 Calendar, 
 User, 
 Database, 
 Clock, 
 X, 
 FileText, 
 Users, 
 CheckCircle2 
} from"lucide-react";
import { SheetsSyncEngine } from"../utils/sheetsSync";
import { AuditLog, Invoice, Customer } from"../types";
import { formatDisplayDate } from"../utils/dateUtils";

// Classify log audit type into module categories
export function getAuditModule(actionType: string): string {
 const at = actionType.toLowerCase();
 if (at.includes("bill") || at.includes("invoice") || at.includes("receipt") || at.includes("checkout") || at.includes("pos")) {
 return"Invoices/POS";
 }
 if (at.includes("customer")) {
 return"Customer Registry";
 }
 if (at.includes("user") || at.includes("clearance") || at.includes("role") || at.includes("session") || at.includes("login") || at.includes("logout") || at.includes("authorization")) {
 return"Access Security";
 }
 if (at.includes("promo") || at.includes("discount")) {
 return"Promotional Codes";
 }
 if (at.includes("agent") || at.includes("commission") || at.includes("referral")) {
 return"Agents Registry";
 }
 if (at.includes("product") || at.includes("price") || at.includes("pricing") || at.includes("catalog")) {
 return"Products Catalog";
 }
 if (at.includes("config") || at.includes("settings") || at.includes("rule")) {
 return"System Settings";
 }
 return"System Admin / Other";
}

interface AuditTrailTabProps {
 initiallySelectedAuditId?: string | null;
 onClearSelected?: () => void;
}

export default function AuditTrailTab({ initiallySelectedAuditId, onClearSelected }: AuditTrailTabProps = {}) {
 const [logs, setLogs] = useState<AuditLog[]>(() => SheetsSyncEngine.getAuditLogs());
 const [search, setSearch] = useState("");
 const [timeFilter, setTimeFilter] = useState<"Today" |"Week" |"Month" |"Year" |"All Time">("All Time");
 const [sortBy, setSortBy] = useState<"id" |"user" |"action" |"module" |"timestamp">("timestamp");
 const [sortOrder, setSortOrder] = useState<"asc" |"desc">("desc");
 const [currentPage, setCurrentPage] = useState(1);
 const itemsPerPage = 10;

 // Selected audit log for detail view modal
 const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

 // Handle prop-driven auto selection for audit log drill-downs
 React.useEffect(() => {
 if (initiallySelectedAuditId) {
 const match = logs.find(log => log.id === initiallySelectedAuditId);
 if (match) {
 setSelectedAuditLog(match);
 if (onClearSelected) onClearSelected();
 }
 }
 }, [initiallySelectedAuditId, logs, onClearSelected]);

 const handleClearLogs = () => {
 const confirmClear = window.confirm("Are you sure you want to clear system audit trail archives? This task cannot be undone.");
 if (!confirmClear) return;
 
 const initialLog: AuditLog = {
 id: `AUDIT-CLEARED-${Date.now()}`,
 actionType:"Audit cleared",
 userName: SheetsSyncEngine.getCurrentUser()?.fullName ||"System Admin",
 date: new Date().toISOString().split("T")[0],
 time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 previousValue:"Previous audit trail",
 newValue:"Log history cleared and resynchronized by authorized Admin."
 };

 SheetsSyncEngine.saveAuditLogs([initialLog]);
 setLogs([initialLog]);
 setCurrentPage(1);
 };

 const reloadLogs = () => {
 setLogs(SheetsSyncEngine.getAuditLogs());
 setCurrentPage(1);
 };

 // Filter logs dynamically
 const filteredLogs = logs.filter((log) => {
 // 1. Search filter: User, Action, Module, ID
 const sTerm = search.toLowerCase();
 const matchesId = log.id.toLowerCase().includes(sTerm);
 const matchesUser = log.userName.toLowerCase().includes(sTerm);
 const matchesAction = log.actionType.toLowerCase().includes(sTerm);
 const matchesModule = getAuditModule(log.actionType).toLowerCase().includes(sTerm);

 if (search.trim() && !matchesId && !matchesUser && !matchesAction && !matchesModule) {
 return false;
 }

 // 2. Time filter
 const logDate = new Date(log.date);
 const today = new Date();
 today.setHours(0, 0, 0, 0);

 if (timeFilter ==="Today") {
 const todayStr = new Date().toISOString().split("T")[0];
 return log.date === todayStr;
 } else if (timeFilter ==="Week") {
 const oneWeekAgo = new Date();
 oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
 return logDate >= oneWeekAgo;
 } else if (timeFilter ==="Month") {
 const oneMonthAgo = new Date();
 oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
 return logDate >= oneMonthAgo;
 } else if (timeFilter ==="Year") {
 const oneYearAgo = new Date();
 oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
 return logDate >= oneYearAgo;
 }

 return true;
 });

 // Sort logs
 const sortedLogs = [...filteredLogs].sort((a, b) => {
 let comparison = 0;
 if (sortBy ==="id") {
 comparison = a.id.localeCompare(b.id);
 } else if (sortBy ==="user") {
 comparison = a.userName.localeCompare(b.userName);
 } else if (sortBy ==="action") {
 comparison = a.actionType.localeCompare(b.actionType);
 } else if (sortBy ==="module") {
 comparison = getAuditModule(a.actionType).localeCompare(getAuditModule(b.actionType));
 } else if (sortBy ==="timestamp") {
 const timeStrA = `${a.date} ${a.time}`;
 const timeStrB = `${b.date} ${b.time}`;
 comparison = new Date(timeStrA ||"").getTime() - new Date(timeStrB ||"").getTime();
 }
 return sortOrder ==="asc" ? comparison : -comparison;
 });

 // Pagination indexing
 const totalPages = Math.ceil(sortedLogs.length / itemsPerPage);
 const activePage = Math.min(currentPage, Math.max(1, totalPages));
 const paginatedLogs = sortedLogs.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

 // Resolve related Customer and Invoice for modal details and table view
 const getRelatedEntities = (log: AuditLog) => {
 const textContext = `${log.actionType} ${log.previousValue} ${log.newValue}`.toLowerCase();
 
 // Find matching Invoice
 const allInvoices = SheetsSyncEngine.getInvoices();
 const relatedInvoice = allInvoices.find(
 (inv) => textContext.includes(inv.invoiceNo.toLowerCase())
 );

 // Find matching Customer
 const allCustomers = SheetsSyncEngine.getCustomers();
 const relatedCustomer = allCustomers.find(
 (cust) => 
 textContext.includes(cust.id.toLowerCase()) || 
 textContext.includes(cust.name.toLowerCase()) ||
 textContext.includes(String(cust.mobile ||"").replace(/\D/g,""))
 );

 return { relatedInvoice, relatedCustomer };
 };

 const handleRequestSort = (field:"id" |"user" |"action" |"module" |"timestamp") => {
 if (sortBy === field) {
 setSortOrder(sortOrder ==="asc" ?"desc" :"asc");
 } else {
 setSortBy(field);
 setSortOrder("desc");
 }
 setCurrentPage(1);
 };

 return (
 <div className="space-y-6 animate-in fade-in duration-300 text-left font-sans">
 
 {/* HEADER CONTROLS */}
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-default pb-4">
 <div>
 <h1 className="text-xl font-extrabold tracking-tight text-primary font-sans flex items-center gap-2">
 <ShieldCheck className="h-5.5 w-5.5 text-blue-600" />
 <span>Cryptographic General Audit Trail</span>
 </h1>
 <p className="text-xs text-secondary font-sans mt-0.5">
 Security audit logs registering critical transactions, role alterations, pricing revisions, and operator access controls.
 </p>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={reloadLogs}
 className="inline-flex items-center gap-1.5 hover:bg-surface dark:hover:bg-zinc-850 bg-card border border-default rounded-lg px-3 py-1.5 text-xs text-secondary font-bold active:scale-95 transition-all cursor-pointer"
 >
 <RefreshCw className="h-3.5 w-3.5" />
 <span>Reload Logs</span>
 </button>
 
 <button
 onClick={handleClearLogs}
 className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-200 dark:border-rose-900/40 rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-950/30 active:scale-95 transition-all cursor-pointer"
 >
 <span>Purge Ledger</span>
 </button>
 </div>
 </div>

 {/* SEARCH AND SEARCH FILTERS BAR */}
 <div className="grid gap-3 md:grid-cols-3 bg-card p-4 rounded-xl border border-default shadow-sm">
 <div className="relative">
 <input
 type="text"
 placeholder="Search User, Action Type, Module, or ID..."
 value={search}
 onChange={(e) => {
 setSearch(e.target.value);
 setCurrentPage(1);
 }}
 className="w-full rounded-lg border border-default bg-surface  pl-9 pr-4 py-2 text-xs text-primary dark:text-primary outline-none focus:border-blue-500 focus:bg-card"
 />
 <span className="absolute left-3 top-2.5 text-muted">
 <Search className="h-4 w-4" />
 </span>
 </div>

 <div className="flex items-center gap-2 md:col-span-2 justify-end">
 <span className="text-[11px] font-bold text-muted uppercase flex items-center gap-1">
 <Filter className="h-3.5 w-3.5" />
 <span>Time Scope:</span>
 </span>
 <div className="flex bg-card-secondary p-1 rounded-lg gap-1 border border-default/40 /60">
 {(["All Time","Today","Week","Month","Year"] as const).map((opt) => (
 <button
 key={opt}
 onClick={() => {
 setTimeFilter(opt);
 setCurrentPage(1);
 }}
 className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
 timeFilter === opt
 ?"bg-blue-600 text-white shadow-sm font-bold"
 :"text-muted hover:text-primary dark:text-muted dark:hover:text-primary bg-transparent"
 }`}
 >
 {opt}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* SYSTEM AUDIT DETAILS PAGE */}
 <div className="rounded-xl border border-default bg-card p-5 shadow-sm">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-1.5">
 <Terminal className="h-4.5 w-4.5 text-blue-500" />
 <h3 className="font-bold text-primary text-sm">Action Logging Ledger</h3>
 </div>
 <span className="text-[10px] uppercase font-bold text-muted font-mono">
 {sortedLogs.length} OF {logs.length} TRANSACTION ENTRIES MATCHED
 </span>
 </div>

 <div className="overflow-x-auto">
 <table className="min-w-full table-auto text-left text-xs text-muted">
 <thead className="bg-table-header text-[10px] uppercase font-bold text-secondary dark:text-muted border-b border-default select-none">
 <tr>
 <th 
 onClick={() => handleRequestSort("id")}
 className="px-4 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition"
 >
 <div className="flex items-center gap-1">
 <span>Audit ID</span>
 {sortBy ==="id" && (sortOrder ==="asc" ?"▲" :"▼")}
 </div>
 </th>
 <th 
 onClick={() => handleRequestSort("user")}
 className="px-4 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition"
 >
 <div className="flex items-center gap-1">
 <span>User</span>
 {sortBy ==="user" && (sortOrder ==="asc" ?"▲" :"▼")}
 </div>
 </th>
 <th 
 onClick={() => handleRequestSort("action")}
 className="px-4 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition"
 >
 <div className="flex items-center gap-1">
 <span>Action</span>
 {sortBy ==="action" && (sortOrder ==="asc" ?"▲" :"▼")}
 </div>
 </th>
 <th 
 onClick={() => handleRequestSort("module")}
 className="px-4 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition"
 >
 <div className="flex items-center gap-1">
 <span>Module</span>
 {sortBy ==="module" && (sortOrder ==="asc" ?"▲" :"▼")}
 </div>
 </th>
 <th 
 onClick={() => handleRequestSort("timestamp")}
 className="px-4 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition"
 >
 <div className="flex items-center gap-1">
 <span>Date</span>
 {sortBy ==="timestamp" && (sortOrder ==="asc" ?"▲" :"▼")}
 </div>
 </th>
 <th className="px-4 py-3">Time</th>
 <th className="px-4 py-3">Old Value</th>
 <th className="px-4 py-3">New Value</th>
 <th className="px-4 py-3">Related Record</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
 {paginatedLogs.map((log) => {
 const moduleLabel = getAuditModule(log.actionType);
 const { relatedInvoice, relatedCustomer } = getRelatedEntities(log);
 const relatedRecordLabel = relatedInvoice 
 ? `Invoice: ${relatedInvoice.invoiceNo}` 
 : relatedCustomer 
 ? `Customer: ${relatedCustomer.name}` 
 :"None";

 return (
 <tr 
 key={log.id} 
 onClick={() => setSelectedAuditLog(log)}
 className="hover:bg-blue-50/25 dark:hover:bg-card/30 cursor-pointer transition-colors"
 title="Click row to drill down complete audit details"
 >
 <td className="px-4 py-3 font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
 {log.id}
 </td>
 <td className="px-4 py-3">
 <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-650 dark:text-sky-400 border border-sky-500/20 font-bold uppercase font-sans">
 {log.userName}
 </span>
 </td>
 <td className="px-4 py-3">
 <span className={`font-semibold text-xs ${
 log.actionType.includes("Deleted") || log.actionType.includes("Purge") || log.actionType.includes("Removed") ?"text-rose-500 font-bold" :
 log.actionType.includes("Created") || log.actionType.includes("Added") || log.actionType.includes("Enrolled") ?"text-emerald-500 font-bold" :
 log.actionType.includes("Edited") || log.actionType.includes("Modified") ?"text-amber-500 font-bold" :"text-indigo-650 dark:text-indigo-400 font-medium"
 }`}>
 {log.actionType}
 </span>
 </td>
 <td className="px-4 py-3">
 <span className="px-1.5 py-0.5 rounded font-bold text-[9px] bg-card-secondary dark:bg-zinc-800 text-muted dark:text-muted border border-default dark:border-zinc-700 capitalize font-mono">
 {moduleLabel}
 </span>
 </td>
 <td className="px-4 py-3 font-mono text-[11px] font-bold text-primary">
 {formatDisplayDate(log.date)}
 </td>
 <td className="px-4 py-3 font-mono text-[11px] text-muted dark:text-muted">
 {log.time}
 </td>
 <td className="px-4 py-3 text-xs font-mono text-zinc-450 dark:text-muted max-w-[120px] truncate animate-none" title={log.previousValue}>
 {log.previousValue}
 </td>
 <td className="px-4 py-3 text-xs font-mono text-primary font-medium max-w-[150px] truncate" title={log.newValue}>
 {log.newValue}
 </td>
 <td className="px-4 py-3">
 <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
 relatedRecordLabel !=="None" 
 ?"bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-bold border border-purple-200 dark:border-purple-900/30" 
 :"bg-card-secondary text-muted"
 }`}>
 {relatedRecordLabel}
 </span>
 </td>
 </tr>
 );
 })}
 {paginatedLogs.length === 0 && (
 <tr>
 <td colSpan={9} className="py-12 text-center text-muted font-sans">
 No matches found inside secure audit logs for this search or scope.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* PAGINATION CONTROLS */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between border-t border-default pt-4 mt-4 text-xs font-sans">
 <span className="text-muted">
 Showing page <strong>{activePage}</strong> of <strong>{totalPages}</strong> ({sortedLogs.length} total entries)
 </span>
 <div className="flex items-center gap-1.5">
 <button
 onClick={() => setCurrentPage(Math.max(1, activePage - 1))}
 disabled={activePage === 1}
 className="px-3 py-1.5 rounded-lg border border-default disabled:opacity-50 text-secondary hover:text-primary transition bg-card  cursor-pointer"
 >
 Previous
 </button>
 {[...Array(totalPages)].map((_, i) => {
 const pg = i + 1;
 // Only render limited page buttons if many
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
 ?"bg-blue-600 border-blue-600 text-primary font-bold"
 :"border-default text-secondary hover:bg-surface dark:hover:bg-card cursor-pointer"
 }`}
 >
 {pg}
 </button>
 );
 })}
 <button
 onClick={() => setCurrentPage(Math.min(totalPages, activePage + 1))}
 disabled={activePage === totalPages}
 className="px-3 py-1.5 rounded-lg border border-default disabled:opacity-50 text-secondary hover:text-primary transition bg-card  cursor-pointer"
 >
 Next
 </button>
 </div>
 </div>
 )}
 </div>

 {/* AUDIT DETAILS DRILL DOWN MODAL */}
 {selectedAuditLog && (() => {
 const { relatedInvoice, relatedCustomer } = getRelatedEntities(selectedAuditLog);
 const moduleLabel = getAuditModule(selectedAuditLog.actionType);

 // Resolve metadata helpers
 const userObj = SheetsSyncEngine.getUsers().find(u => u.fullName.toLowerCase() === selectedAuditLog.userName.toLowerCase() || u.username.toLowerCase() === selectedAuditLog.userName.toLowerCase());
 const userRoleMatch = userObj ? userObj.role :"Admin"; 
 
 const lastActivity = SheetsSyncEngine.getUserActivities()
 .filter(act => act.username.toLowerCase() === (userObj?.username || selectedAuditLog.userName).toLowerCase())
 .sort((a,b) => b.loginDate.localeCompare(a.loginDate) || b.loginTime.localeCompare(a.loginTime))[0];

 const device = lastActivity?.deviceType ||"Desktop Workstation";
 const ipAddress = lastActivity?.ipAddress ||"192.168.1.185 (Secured LAN)";
 const relatedUserString = userObj 
 ? `${userObj.fullName} (@${userObj.username} - ${userObj.email})` 
 : `${selectedAuditLog.userName} (System Profile)`;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card/60 backdrop-blur-xs animate-fade-in">
 <div className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-card  border border-default shadow-2xl animate-in zoom-in-95 duration-150">
 
 {/* Modal Header */}
 <div className="flex items-center justify-between border-b border-default/80 bg-surface px-6 py-4/5">
 <div className="flex items-center gap-2">
 <ShieldCheck className="h-5.5 w-5.5 text-blue-600" />
 <div>
 <h3 className="text-sm font-extrabold text-primary">Complete Audit Record Detailed Information</h3>
 <p className="text-[10px] font-mono text-muted uppercase">TRAIL HELD AT CORE LEDGER SYSTEM</p>
 </div>
 </div>
 <button
 onClick={() => setSelectedAuditLog(null)}
 className="rounded-lg p-1 text-muted hover:bg-card-secondary dark:hover:bg-zinc-800 hover:text-secondary dark:hover:text-primary transition bg-transparent"
 >
 <X className="h-4.5 w-4.5" />
 </button>
 </div>

 {/* Modal Body */}
 <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
 
 {/* Audit metadata layout */}
 <div className="grid gap-4 sm:grid-cols-2 bg-surface/80 p-4 rounded-xl border border-default">
 <div className="space-y-1 text-xs">
 <span className="text-[10px] font-bold text-muted dark:text-zinc-550 uppercase">Audit Transaction ID</span>
 <p className="font-mono font-bold text-blue-600 dark:text-blue-400">{selectedAuditLog.id}</p>
 </div>
 <div className="space-y-1 text-xs">
 <span className="text-[10px] font-bold text-muted dark:text-zinc-550 uppercase">Authorized Security Operator</span>
 <p className="font-semibold text-primary flex items-center gap-1">
 <User className="h-3.5 w-3.5 text-muted" />
 <span>{selectedAuditLog.userName}</span>
 </p>
 </div>
 <div className="space-y-1 text-xs">
 <span className="text-[10px] font-bold text-muted dark:text-zinc-550 uppercase">Operator Role</span>
 <p className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
 {userRoleMatch}
 </p>
 </div>
 <div className="space-y-1 text-xs">
 <span className="text-[10px] font-bold text-muted dark:text-zinc-550 uppercase">Operational CRM Module</span>
 <p className="font-mono font-semibold text-primary">{moduleLabel}</p>
 </div>
 <div className="space-y-1 text-xs">
 <span className="text-[10px] font-bold text-muted dark:text-zinc-550 uppercase">Timestamp Header</span>
 <p className="font-mono text-primary flex items-center gap-1">
 <Clock className="h-3.5 w-3.5 text-muted" />
 <span>{formatDisplayDate(selectedAuditLog.date)} @ {selectedAuditLog.time}</span>
 </p>
 </div>
 <div className="space-y-1 text-xs">
 <span className="text-[10px] font-bold text-muted dark:text-zinc-550 uppercase">Session Device</span>
 <p className="font-mono text-primary font-semibold">{device}</p>
 </div>
 <div className="space-y-1 text-xs">
 <span className="text-[10px] font-bold text-muted dark:text-zinc-550 uppercase">IP Address</span>
 <p className="font-mono text-primary font-semibold">{ipAddress}</p>
 </div>
 <div className="space-y-1 text-xs">
 <span className="text-[10px] font-bold text-muted dark:text-zinc-550 uppercase">Related User Record</span>
 <p className="font-mono text-primary font-semibold truncate" title={relatedUserString}>{relatedUserString}</p>
 </div>
 </div>

 {/* Values State Comparison */}
 <div className="space-y-4">
 <div className="space-y-1 text-xs">
 <span className="text-[10px] font-bold text-muted dark:text-zinc-550 uppercase">Action Completed Descriptor</span>
 <p className="font-bold text-secondary dark:text-primary border px-3 py-1.5 rounded-lg bg-card border-default/50 /50">
 {selectedAuditLog.actionType}
 </p>
 </div>

 <div className="grid gap-4 sm:grid-cols-2">
 <div className="space-y-1 text-xs">
 <span className="text-[10px] font-bold text-rose-500 uppercase">Old / Previous State State</span>
 <pre className="p-3 bg-rose-50/50 dark:bg-rose-950/5 text-[11px] font-mono text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200/40 dark:border-rose-900/10 min-h-24 whitespace-pre-wrap break-words">
 {selectedAuditLog.previousValue ||"(Nil or initial state)"}
 </pre>
 </div>
 <div className="space-y-1 text-xs">
 <span className="text-[10px] font-bold text-emerald-500 uppercase">New / Updated State Value</span>
 <pre className="p-3 bg-emerald-50/50 dark:bg-emerald-950/5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200/40 dark:border-emerald-900/10 min-h-24 whitespace-pre-wrap break-words">
 {selectedAuditLog.newValue ||"(Nil or blank value cleared)"}
 </pre>
 </div>
 </div>
 </div>

 {/* Contextual Linkage Section */}
 <div className="border-t border-default/80 pt-4 space-y-3">
 <h4 className="text-[10px] uppercase font-bold text-muted">Linked Database Associations</h4>
 
 <div className="grid gap-3 sm:grid-cols-2">
 
 {/* Related Invoice Linkage */}
 <div className="p-3 rounded-lg border border-default bg-card/40 text-xs flex items-center justify-between">
 <div className="flex items-center gap-2">
 <FileText className="h-4 w-4 text-indigo-500" />
 <div>
 <p className="font-bold text-primary">Related Invoice Record</p>
 <p className="text-[10px] text-muted font-mono">
 {relatedInvoice ? `${relatedInvoice.invoiceNo} (${relatedInvoice.customerName})` :"No linked invoice found"}
 </p>
 </div>
 </div>
 {relatedInvoice && (
 <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">
 RESOLVED
 </span>
 )}
 </div>

 {/* Related Customer Linkage */}
 <div className="p-3 rounded-lg border border-default bg-card/40 text-xs flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Users className="h-4 w-4 text-emerald-500" />
 <div>
 <p className="font-bold text-primary">Related Customer Record</p>
 <p className="text-[10px] text-muted font-mono">
 {relatedCustomer ? `${relatedCustomer.name} (${relatedCustomer.id})` :"No linked customer found"}
 </p>
 </div>
 </div>
 {relatedCustomer && (
 <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">
 RESOLVED
 </span>
 )}
 </div>

 </div>
 </div>

 </div>

 {/* Close controls footer */}
 <div className="flex justify-end gap-2 border-t border-default dark:border-[#222] bg-surface px-6 py-4">
 <button
 type="button"
 onClick={() => setSelectedAuditLog(null)}
 className="rounded-lg border border-default bg-card dark:bg-zinc-905 px-4 py-2 text-xs font-bold text-secondary hover:text-primary transition cursor-pointer"
 >
 Close Insights
 </button>
 </div>

 </div>
 </div>
 );
 })()}

 </div>
 );
}
