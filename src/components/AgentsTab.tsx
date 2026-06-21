import React, { useState } from"react";
import { 
 Award, 
 TrendingUp, 
 Users, 
 Target, 
 ShieldCheck, 
 Mail, 
 Phone, 
 Edit2, 
 Trash2, 
 CheckCircle2, 
 AlertCircle, 
 FileText, 
 Ban, 
 Plus, 
 Search, 
 ArrowLeft, 
 Percent,
 Calendar,
 DollarSign
} from"lucide-react";
import { Agent, Invoice, UserRole, AgentType, AgentStatus } from"../types";
import { formatIndianCurrencyShort } from"../utils/currencyUtils";
import { SheetsSyncEngine } from"../utils/sheetsSync";

interface AgentsTabProps {
 onShowNotification: (text: string, type:"success" |"error" |"info") => void;
 onRefresh: () => void;
 initiallySelectedAgentId?: string | null;
 onClearSelected?: () => void;
}

export default function AgentsTab({
 onShowNotification,
 onRefresh,
 initiallySelectedAgentId,
 onClearSelected
}: AgentsTabProps) {
 const currentUser = SheetsSyncEngine.getCurrentUser();
 const userRole: UserRole = currentUser?.role ||"Employee";
 
 const isAdmin = userRole ==="Admin";
 const isManager = userRole ==="Manager";
 const isEmployee = userRole ==="Employee";

 // Data state
 const [agents, setAgents] = useState<Agent[]>(() => SheetsSyncEngine.getAgents());
 const [invoices, setInvoices] = useState<Invoice[]>(() => SheetsSyncEngine.getInvoices());

 // Navigation state within Agents tab
 const [activeSubTab, setActiveSubTab] = useState<"directory" |"analytics">("directory");
 // Drill-down detailed state
 const [selectedAgentForHistory, setSelectedAgentForHistory] = useState<Agent | null>(null);

 // Handle deep-link agent auto inspection
 React.useEffect(() => {
 if (initiallySelectedAgentId) {
 const match = agents.find(ag => ag.id === initiallySelectedAgentId);
 if (match) {
 setSelectedAgentForHistory(match);
 setActiveSubTab("directory"); // ensure Directory tab is active so they can see history/drill-down
 if (onClearSelected) onClearSelected();
 }
 }
 }, [initiallySelectedAgentId, agents]);

 // Filter state inside drill-down sales page
 const [timeFilter, setTimeFilter] = useState<"Today" |"This Week" |"This Month" |"This Year" |"All Time">("All Time");
 const [historySearch, setHistorySearch] = useState("");

 // Create / Edit agent states
 const [isAddingNew, setIsAddingNew] = useState(false);
 const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
 
 // Delete / Deactivate states
 const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

 // Form Fields
 const [agentName, setAgentName] = useState("");
 const [mobileNumber, setMobileNumber] = useState("");
 const [email, setEmail] = useState("");
 const [agentType, setAgentType] = useState<AgentType>("Referral Partner");
 const [commissionPercentage, setCommissionPercentage] = useState<number>(5);
 const [status, setStatus] = useState<AgentStatus>("Active");
 const [notes, setNotes] = useState("");

 const reloadData = () => {
 setAgents(SheetsSyncEngine.getAgents());
 setInvoices(SheetsSyncEngine.getInvoices());
 onRefresh();
 };

 const resetForm = () => {
 setAgentName("");
 setMobileNumber("");
 setEmail("");
 setAgentType("Referral Partner");
 setCommissionPercentage(5);
 setStatus("Active");
 setNotes("");
 setEditingAgent(null);
 };

 // Helper: compute analytics metrics for a given agent
 const getAgentMetrics = (agtId: string) => {
 const agentInvoices = invoices.filter(
 (inv) => inv.referralAgentId === agtId && !inv.isSoftDeleted
 );

 const completed = agentInvoices.filter((inv) => inv.status ==="Completed" || inv.status ==="Delivered");
 const cancelled = agentInvoices.filter((inv) => inv.status ==="Cancelled");
 const pending = agentInvoices.filter(
 (inv) => inv.status ==="Work In Progress" || inv.status ==="Ready for Delivery" || inv.status ==="Ready For Delivery" || inv.status ==="Draft"
 );

 const handledDeliveriesInvoices = invoices.filter(
 (inv) => inv.agentId === agtId && !inv.isSoftDeleted
 );

 const revenue = completed.reduce((sum, inv) => sum + inv.grandTotal, 0);
 const totalOrders = agentInvoices.length;
 const avgOrderValue = completed.length > 0 ? revenue / completed.length : 0;

 return {
 totalOrders,
 completedOrders: completed.length,
 cancelledOrders: cancelled.length,
 pendingOrders: pending.length,
 handledDeliveries: handledDeliveriesInvoices.length,
 revenue,
 avgOrderValue
 };
 };

 // 1. ADD / EDIT AGENTS
 const handleSubmitAgent = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!isAdmin) {
 onShowNotification("Access Denied: Only Admin users can manage agent directory listings.","error");
 return;
 }

 if (!String(agentName ||"").trim() || !String(email ||"").trim() || !String(mobileNumber ||"").trim()) {
 onShowNotification("Please complete all required fields.","error");
 return;
 }

 const currentList = SheetsSyncEngine.getAgents();
 let targetAgent: Agent;

 // Duplicate Mobile check
 const duplicateMobile = currentList.find(a => 
 String(a.mobile ||"").trim() === String(mobileNumber ||"").trim() && 
 (!editingAgent || a.id !== editingAgent.id)
 );

 if (duplicateMobile) {
 onShowNotification("This mobile number is already assigned to another agent.","error");
 return;
 }
 
 // Duplicate Email check
 const duplicateEmail = currentList.find(a => 
 String(a.email ||"").trim().toLowerCase() === String(email ||"").trim().toLowerCase() && 
 (!editingAgent || a.id !== editingAgent.id)
 );

 if (duplicateEmail) {
 onShowNotification("This email address is already assigned to another agent.","error");
 return;
 }

 if (editingAgent) {
 const updated = currentList.map((a) => {
 if (a.id === editingAgent.id) {
 targetAgent = {
 ...a,
 name: String(agentName ||"").trim(),
 mobile: String(mobileNumber ||"").trim(),
 email: String(email ||"").trim(),
 agentType,
 commissionPercentage: Number(commissionPercentage),
 status,
 notes: String(notes ||"").trim(),
 };
 return targetAgent;
 }
 return a;
 });

 SheetsSyncEngine.saveAgents(updated);
 await SheetsSyncEngine.pushTransaction(SheetsSyncEngine.getConnectionSettings(),"upsertAgent", targetAgent!);

 SheetsSyncEngine.addAuditLog(
"Agent Modified",
 currentUser?.fullName ||"System Admin",
 `Agent: ${editingAgent.id}`,
 `Updated parameters for Agent ${String(agentName ||"").trim()} (${agentType})`
 );

 onShowNotification(`✓ Agent ${String(agentName ||"").trim()} updated successfully.`,"success");
 setEditingAgent(null);
 } else {
 const nextId ="AGT-" + String(currentList.length + 1).padStart(3,"0");
 targetAgent = {
 id: nextId,
 name: String(agentName ||"").trim(),
 mobile: String(mobileNumber ||"").trim(),
 email: String(email ||"").trim(),
 agentType,
 commissionPercentage: Number(commissionPercentage),
 status,
 notes: String(notes ||"").trim(),
 createdDate: new Date().toISOString().split("T")[0]
 };

 SheetsSyncEngine.saveAgents([targetAgent, ...currentList]);
 await SheetsSyncEngine.pushTransaction(SheetsSyncEngine.getConnectionSettings(),"upsertAgent", targetAgent);

 SheetsSyncEngine.addAuditLog(
"Agent Enrolled",
 currentUser?.fullName ||"System Admin",
"None",
 `Enrolled agent '${String(agentName ||"").trim()}' with ID ${nextId} under category ${agentType}`
 );

 onShowNotification(`✓ Agent ${agentName} successfully enrolled with ID ${nextId}.`,"success");
 setIsAddingNew(false);
 }

 resetForm();
 reloadData();
 };

 // 2. DELETE AGENT - triggers the modal
 const handleDeleteAgent = (agt: Agent) => {
 if (!isAdmin) {
 onShowNotification("Access Denied: Only Administrator accounts can delete Agent records.","error");
 return;
 }
 setAgentToDelete(agt);
 };

 const confirmDeleteAgent = async () => {
 if (!agentToDelete) return;
 const agt = agentToDelete;

 const currentList = SheetsSyncEngine.getAgents();
 const updated = currentList.filter((a) => a.id !== agt.id);
 SheetsSyncEngine.saveAgents(updated);
 
 await SheetsSyncEngine.pushTransaction(SheetsSyncEngine.getConnectionSettings(),"deleteAgent", { id: agt.id })
 .catch((e) => console.warn("Failed to delete agent remotely:", e));

 SheetsSyncEngine.addAuditLog(
"Agent Deleted",
 currentUser?.fullName ||"System Admin",
 `Agent ID: ${agt.id}`,
 `Deleted agent '${agt.name}' from the dashboard database.`
 );

 onShowNotification(`✓ Agent record '${agt.name}' has been successfully removed.`,"success");
 setAgentToDelete(null);
 reloadData();
 };

 const confirmDeactivateAgent = async () => {
 if (!agentToDelete) return;
 const agt = agentToDelete;

 const currentList = SheetsSyncEngine.getAgents();
 const updated = currentList.map((a) => a.id === agt.id ? { ...a, status:"Inactive" as AgentStatus } : a);
 SheetsSyncEngine.saveAgents(updated);
 
 const targetAgent = updated.find(a => a.id === agt.id);
 if (targetAgent) {
 await SheetsSyncEngine.pushTransaction(SheetsSyncEngine.getConnectionSettings(),"upsertAgent", targetAgent)
 .catch((e) => console.warn("Failed to deactivate agent remotely:", e));
 }

 SheetsSyncEngine.addAuditLog(
"Agent Deactivated",
 currentUser?.fullName ||"System Admin",
 `Agent ID: ${agt.id}`,
 `Deactivated agent '${agt.name}' in the dashboard database.`
 );

 onShowNotification(`✓ Agent record '${agt.name}' has been successfully deactivated.`,"info");
 setAgentToDelete(null);
 reloadData();
 };

 const triggerEdit = (agt: Agent) => {
 setEditingAgent(agt);
 setAgentName(agt.name);
 setMobileNumber(agt.mobile);
 setEmail(agt.email);
 setAgentType(agt.agentType);
 setCommissionPercentage(agt.commissionPercentage);
 setStatus(agt.status);
 setNotes(agt.notes);
 setIsAddingNew(false);
 };

 // --- FILTER DRILL DOWN SALES ---
 const getFilteredInvoices = (agtId: string) => {
 let list = invoices.filter(inv => inv.referralAgentId === agtId && !inv.isSoftDeleted);

 // Search query match
 if (String(historySearch ||"").trim()) {
 const term = String(historySearch ||"").trim().toLowerCase();
 list = list.filter(inv => 
 inv.invoiceNo.toLowerCase().includes(term) ||
 inv.customerName.toLowerCase().includes(term) ||
 String(inv.mobile ||"").includes(term)
 );
 }

 // Time query match
 const todayStr = new Date().toISOString().split("T")[0];
 if (timeFilter ==="Today") {
 list = list.filter(inv => inv.date === todayStr);
 } else if (timeFilter ==="This Week") {
 const sevenDaysAgo = new Date();
 sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
 const str = sevenDaysAgo.toISOString().split("T")[0];
 list = list.filter(inv => inv.date >= str);
 } else if (timeFilter ==="This Month") {
 const monthPrefix = todayStr.substring(0, 7); // YYYY-MM
 list = list.filter(inv => inv.date.startsWith(monthPrefix));
 } else if (timeFilter ==="This Year") {
 const yearPrefix = todayStr.substring(0, 4); // YYYY
 list = list.filter(inv => inv.date.startsWith(yearPrefix));
 }

 return list;
 };

 // Core Employee visibility matching logic
 const myLinkedAgent = isEmployee
 ? agents.find(
 (a) =>
 a.name.toLowerCase() === currentUser?.fullName?.toLowerCase() ||
 a.email.toLowerCase() === currentUser?.email?.toLowerCase()
 )
 : null;

 // Render Employee own dashboard 
 if (isEmployee) {
 if (!myLinkedAgent) {
 return (
 <div className="rounded-xl border border-default bg-card  p-8 text-center space-y-4 font-sans max-w-lg mx-auto mt-10">
 <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
 <h2 className="text-base font-bold text-primary dark:text-primary">Linked Agent Account Needed</h2>
 <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
 Your system account role is <strong>Employee</strong>, but no matching <strong>Agent Record</strong> was found with your name (<em>{currentUser?.fullName}</em>) or email (<em>{currentUser?.email}</em>) inside the Agents module.
 </p>
 <div className="text-[10px] text-muted border-t border-default pt-3 italic">
 Please ask your system administrator to enroll you as an"Employee Agent" in the Agents Directory to review your commission percentages and sales targets.
 </div>
 </div>
 );
 }

 // Let's render the employee's personal Agent drills directly!
 const stats = getAgentMetrics(myLinkedAgent.id);
 const myInvoices = getFilteredInvoices(myLinkedAgent.id);

 return (
 <div className="space-y-6 animate-in fade-in duration-300 font-sans">
 {/* Header */}
 <div className="flex flex-col gap-2 border-b border-default pb-4">
 <h1 className="text-xl font-bold tracking-tight text-primary dark:text-primary flex items-center gap-2">
 <Award className="h-5.5 w-5.5 text-blue-500" />
 <span>My Agent Performance Profile</span>
 </h1>
 <p className="text-xs text-muted dark:text-muted">
 Secure self-service ledger tracking is limited exclusively to your personal referral accounts.
 </p>
 </div>

 {/* Profile Card */}
 <div className="grid gap-4 md:grid-cols-3">
 <div className="rounded-xl border border-default bg-card  p-5 space-y-3 shadow-sm md:col-span-2">
 <span className="inline-block px-2.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-150">
 {myLinkedAgent.agentType}
 </span>
 <h2 className="text-lg font-bold text-primary dark:text-primary">{myLinkedAgent.name}</h2>
 <div className="grid grid-cols-2 gap-4 text-xs font-sans text-muted dark:text-muted">
 <div><strong>Agent ID:</strong> <span className="font-mono">{myLinkedAgent.id}</span></div>
 <div><strong>Mobile:</strong> {myLinkedAgent.mobile}</div>
 <div><strong>Email:</strong> {myLinkedAgent.email}</div>
 <div><strong>Payout Rate:</strong> {myLinkedAgent.commissionPercentage}%</div>
 </div>
 {myLinkedAgent.notes && (
 <p className="text-[11px] text-muted italic bg-surface dark:bg-zinc-805 p-2 rounded">
 Notes: {myLinkedAgent.notes}
 </p>
 )}
 </div>

 <div className="rounded-xl border border-blue-150 dark:border-blue-900/40 bg-blue-50/20 p-5 space-y-4">
 <h3 className="font-bold text-blue-600 dark:text-blue-400 text-xs uppercase tracking-wider">Commission Overview</h3>
 <div className="space-y-1">
 <span className="text-[10px] text-muted uppercase">Estimated Payout Earnings</span>
 <h2 className="text-3xl font-bold text-primary dark:text-primary font-mono" title={`₹${((stats.revenue * myLinkedAgent.commissionPercentage) / 100).toFixed(2)}`}>
 ₹{formatIndianCurrencyShort((stats.revenue * myLinkedAgent.commissionPercentage) / 100)}
 </h2>
 <span className="text-[10px] text-emerald-500 font-bold block">Calculated at {myLinkedAgent.commissionPercentage}% flat rate of Completed Sales</span>
 </div>
 </div>
 </div>

 {/* Statistics Widgets */}
 <div className="grid gap-4 grid-cols-2 sm:grid-cols-5">
 <div className="rounded-xl border border-default bg-card  p-4 text-center">
 <span className="text-[10px] text-muted uppercase font-bold block">Total Invoiced</span>
 <div className="text-xl font-bold font-mono text-secondary dark:text-primary mt-1">{stats.totalOrders}</div>
 </div>
 <div className="rounded-xl border border-emerald-150 dark:border-emerald-900/35 bg-emerald-500/5 p-4 text-center">
 <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold block">Completed</span>
 <div className="text-xl font-bold font-mono text-emerald-600 mt-1">{stats.completedOrders}</div>
 </div>
 <div className="rounded-xl border border-yellow-150 dark:border-yellow-905/35 bg-yellow-500/5 p-4 text-center">
 <span className="text-[10px] text-yellow-600 uppercase font-bold block">Work-In-Progress</span>
 <div className="text-xl font-bold font-mono text-yellow-600 mt-1">{stats.pendingOrders}</div>
 </div>
 <div className="rounded-xl border border-rose-150 dark:border-rose-900/35 bg-rose-500/5 p-4 text-center">
 <span className="text-[10px] text-rose-500 uppercase font-bold block">Cancelled</span>
 <div className="text-xl font-bold font-mono text-rose-500 mt-1">{stats.cancelledOrders}</div>
 </div>
 <div className="rounded-xl border border-blue-150 dark:border-blue-900/35 bg-blue-500/5 p-4 text-center col-span-2 sm:col-span-1">
 <span className="text-[10px] text-blue-500 uppercase font-bold block">Revenue Shared</span>
 <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1" title={`₹${stats.revenue.toFixed(2)}`}>₹{formatIndianCurrencyShort(stats.revenue)}</div>
 </div>
 </div>

 {/* Ledger */}
 <div className="rounded-xl border border-default bg-card  p-5 shadow-sm space-y-4">
 <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-default pb-3">
 <h3 className="font-bold text-primary dark:text-primary text-sm flex items-center gap-1.5 font-sans">
 <FileText className="h-4 w-4 text-muted" />
 <span>Personal Sales Tracing Ledger</span>
 </h3>

 {/* Time controls & Search */}
 <div className="flex flex-wrap items-center gap-2">
 <select
 value={timeFilter}
 onChange={(e) => setTimeFilter(e.target.value as any)}
 className="rounded-lg border border-default bg-surface  px-2.5 py-1 text-xs text-primary dark:text-primary cursor-pointer outline-none font-sans"
 >
 <option value="All Time">All Time</option>
 <option value="Today">Today</option>
 <option value="This Week">This Week</option>
 <option value="This Month">This Month</option>
 <option value="This Year">This Year</option>
 </select>
 <input
 type="text"
 placeholder="Search Receipt, Customer..."
 value={historySearch}
 onChange={(e) => setHistorySearch(e.target.value)}
 className="rounded-lg border border-default bg-surface  px-2.5 py-1 text-xs text-primary dark:text-primary outline-none font-sans"
 />
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="min-w-full table-auto text-left text-xs text-muted">
 <thead className="bg-table-header text-[10px] uppercase font-bold text-secondary dark:text-muted border-b border-default">
 <tr>
 <th className="px-4 py-3">Receipt No</th>
 <th className="px-4 py-3">Client</th>
 <th className="px-4 py-3 text-center">Date Code</th>
 <th className="px-4 py-3 text-right">Invoice Sum</th>
 <th className="px-4 py-3 text-right">Commission ({myLinkedAgent.commissionPercentage}%)</th>
 <th className="px-4 py-3 text-center">Status Badge</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
 {myInvoices.map((inv) => (
 <tr key={inv.invoiceNo} className="hover:bg-table-hover transition-colors">
 <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{inv.invoiceNo}</td>
 <td className="px-4 py-3 font-semibold text-primary dark:text-primary">{inv.customerName}</td>
 <td className="px-4 py-3 text-center font-mono text-[10px]">{inv.date}</td>
 <td className="px-4 py-3 text-right font-mono font-bold text-primary dark:text-primary">₹{inv.grandTotal.toFixed(2)}</td>
 <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
 ${inv.status ==="Completed" || inv.status ==="Delivered" 
 ? ((inv.grandTotal * myLinkedAgent.commissionPercentage) / 100).toFixed(2)
 :"0.00"
 }
 </td>
 <td className="px-4 py-3 text-center">
 <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-extrabold ${
 inv.status ==="Completed"
 ?"bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800"
 : inv.status ==="Cancelled"
 ?"bg-rose-50 text-rose-500 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-900"
 :"bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800"
 }`}>
 {inv.status}
 </span>
 </td>
 </tr>
 ))}
 {myInvoices.length === 0 && (
 <tr>
 <td colSpan={6} className="py-8 text-center text-muted dark:text-zinc-650">
 No matching records found.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
 }

 // Helper if drill-down is opened (SelectedAgentForHistory !== null)
 if (selectedAgentForHistory) {
 const stats = getAgentMetrics(selectedAgentForHistory.id);
 const historyInvoices = getFilteredInvoices(selectedAgentForHistory.id);

 return (
 <div className="space-y-6 animate-in fade-in duration-300 font-sans">
 {/* Back navigation header */}
 <div className="flex items-center gap-3">
 <button
 onClick={() => { setSelectedAgentForHistory(null); reloadData(); }}
 className="p-1 px-3 rounded-lg border border-default bg-card text-xs font-semibold text-secondary hover:text-blue-600 dark:text-muted dark:hover:text-blue-400 flex items-center gap-1.5 transition cursor-pointer"
 >
 <ArrowLeft className="h-4 w-4" />
 <span>Back to Analytics</span>
 </button>
 </div>

 {/* Drill-down Header */}
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-default pb-4">
 <div>
 <h1 className="text-xl font-bold tracking-tight text-primary dark:text-primary font-sans flex items-center gap-2">
 <span>Agent Overview: {selectedAgentForHistory.name}</span>
 </h1>
 <p className="text-xs text-muted dark:text-muted">
 Drill-down audit ledger, commissions tracking, and trace parameters for {selectedAgentForHistory.id}
 </p>
 </div>
 <span className={`px-3 py-1 font-extrabold text-[10px] rounded-lg border text-center uppercase tracking-wider ${
 selectedAgentForHistory.status ==="Active"
 ?"bg-emerald-50 text-emerald-600 border-emerald-250 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900"
 : selectedAgentForHistory.status ==="Inactive"
 ?"bg-surface text-muted border-zinc-250 dark:bg-zinc-500/10 dark:text-muted"
 :"bg-red-50 text-red-500 border-red-250 dark:bg-red-500/10 dark:text-red-400 dark:border-red-900"
 }`}>
 {selectedAgentForHistory.status}
 </span>
 </div>

 {/* Info Grid */}
 <div className="grid gap-4 md:grid-cols-3">
 <div className="rounded-xl border border-default' bg-card  p-5 space-y-4 shadow-sm md:col-span-2">
 <h3 className="font-bold text-primary dark:text-primary text-xs uppercase tracking-wider border-b border-gray-50 pb-1.5">Agent Details</h3>
 <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs font-sans text-muted dark:text-muted">
 <div><strong>Agent ID:</strong> <span className="font-mono">{selectedAgentForHistory.id}</span></div>
 <div><strong>Category:</strong> {selectedAgentForHistory.agentType}</div>
 <div><strong>Phone Number:</strong> {selectedAgentForHistory.mobile}</div>
 <div><strong>Email Address:</strong> {selectedAgentForHistory.email}</div>
 <div><strong>Commission rate:</strong> {selectedAgentForHistory.commissionPercentage}%</div>
 <div><strong>Creation date:</strong> {selectedAgentForHistory.createdDate}</div>
 </div>
 {selectedAgentForHistory.notes && (
 <div className="p-3 bg-surface/50 rounded text-xs text-muted dark:text-muted border border-default">
 <strong>Administrative Notes:</strong> {selectedAgentForHistory.notes}
 </div>
 )}
 </div>

 <div className="rounded-xl border border-indigo-150 dark:border-indigo-900/40 bg-indigo-50/25 p-5 flex flex-col justify-between">
 <div className="space-y-1">
 <span className="text-[10px] text-muted uppercase tracking-wider block font-semibold">Total Share Volume</span>
 <h2 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono" title={`₹${stats.revenue.toFixed(2)}`}>₹{formatIndianCurrencyShort(stats.revenue)}</h2>
 <span className="text-[10px] text-muted block pb-4">Completed order transaction value.</span>
 </div>
 <div className="border-t border-indigo-100 dark:border-indigo-900/50 pt-3 flex items-center justify-between">
 <div className="space-y-0.5">
 <span className="text-[9px] text-muted font-semibold block uppercase">Commissions Earned</span>
 <span className="text-lg font-bold text-primary dark:text-primary font-mono" title={`₹${((stats.revenue * selectedAgentForHistory.commissionPercentage) / 100).toFixed(2)}`}>₹{formatIndianCurrencyShort((stats.revenue * selectedAgentForHistory.commissionPercentage) / 100)}</span>
 </div>
 <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded">
 {selectedAgentForHistory.commissionPercentage}% Flat
 </span>
 </div>
 </div>
 </div>

 {/* Drill-down Quick Metrics */}
 <div className="grid gap-2 grid-cols-2 md:grid-cols-6 font-sans">
 <div className="rounded-xl border border-default bg-card  p-3 text-center">
 <span className="text-[10px] text-muted uppercase block">Total Placed</span>
 <div className="text-lg font-extrabold font-mono text-secondary dark:text-primary">{stats.totalOrders}</div>
 </div>
 <div className="rounded-xl border border-default bg-card  p-3 text-center">
 <span className="text-[10px] text-emerald-600 uppercase block">Completed</span>
 <div className="text-lg font-extrabold font-mono text-emerald-600">{stats.completedOrders}</div>
 </div>
 <div className="rounded-xl border border-default bg-card  p-3 text-center">
 <span className="text-[10px] text-amber-500 uppercase block">WIP / Pending</span>
 <div className="text-lg font-extrabold font-mono text-amber-600">{stats.pendingOrders}</div>
 </div>
 <div className="rounded-xl border border-default bg-card  p-3 text-center">
 <span className="text-[10px] text-rose-500 block">Cancelled</span>
 <div className="text-lg font-extrabold font-mono text-rose-500">{stats.cancelledOrders}</div>
 </div>
 <div className="text-center p-2 rounded-lg bg-surface border border-default col-span-1">
 <span className="block text-[9px] text-muted uppercase font-bold tracking-wider mb-1">Handled Deliveries</span>
 <span className="text-sm font-mono font-semibold text-purple-600 dark:text-purple-400">{stats.handledDeliveries}</span>
 </div>
 <div className="rounded-xl border border-default bg-card  p-3 text-center">
 <span className="text-[10px] text-blue-500 uppercase block">Avg. Order Value</span>
 <div className="text-lg font-extrabold font-mono text-blue-600 dark:text-blue-400" title={`₹${stats.avgOrderValue.toFixed(2)}`}>₹{formatIndianCurrencyShort(stats.avgOrderValue)}</div>
 </div>
 </div>

 {/* Invoice table for drill-down */}
 <div className="rounded-xl border border-default bg-card  p-5 shadow-sm space-y-4">
 <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-default pb-2">
 <h3 className="font-bold text-primary dark:text-primary text-sm flex items-center gap-1.5">
 <FileText className="h-4 w-4 text-muted" />
 <span>Traceable Checkout Receipts</span>
 </h3>

 {/* Drill-down filters */}
 <div className="flex flex-wrap items-center gap-2">
 <select
 value={timeFilter}
 onChange={(e) => setTimeFilter(e.target.value as any)}
 className="rounded-lg border border-default bg-surface  px-2.5 py-1 text-xs text-secondary underline-none text-primary dark:text-primary font-sans outline-none cursor-pointer"
 >
 <option value="All Time">All Time</option>
 <option value="Today">Today</option>
 <option value="This Week">This Week</option>
 <option value="This Month">This Month</option>
 <option value="This Year">This Year</option>
 </select>
 <input
 type="text"
 placeholder="Search Receipt, Client, Mobile..."
 value={historySearch}
 onChange={(e) => setHistorySearch(e.target.value)}
 className="rounded-lg border border-default bg-surface  px-2.5 py-1 text-xs text-primary dark:text-primary outline-none font-sans"
 />
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="min-w-full table-auto text-left text-xs text-muted">
 <thead className="bg-table-header text-[10px] uppercase font-bold text-secondary dark:text-muted border-b border-default">
 <tr>
 <th className="px-4 py-3">Receipt No</th>
 <th className="px-4 py-3">Client</th>
 <th className="px-4 py-3 text-center font-mono">Date Code</th>
 <th className="px-4 py-3 text-center">Receipt Operator</th>
 <th className="px-4 py-3 text-center">Assigned Dispatcher</th>
 <th className="px-4 py-3 text-right">Invoice Sum</th>
 <th className="px-4 py-3 text-center">Status Badge</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
 {historyInvoices.map((inv) => (
 <tr key={inv.invoiceNo} className="hover:bg-table-hover transition-colors">
 <td className="px-4 py-3 font-mono font-bold text-indigo-650 dark:text-indigo-400">{inv.invoiceNo}</td>
 <td className="px-4 py-3 font-semibold text-primary dark:text-primary">{inv.customerName}</td>
 <td className="px-4 py-3 text-center font-mono text-[10px]">{inv.date}</td>
 <td className="px-4 py-3 text-center">{inv.createdBy}</td>
 <td className="px-4 py-3 text-center">{inv.assignedEmployee ||"None"}</td>
 <td className="px-4 py-3 text-right font-mono font-bold text-primary dark:text-primary">₹{inv.grandTotal.toFixed(2)}</td>
 <td className="px-4 py-3 text-center">
 <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-extrabold ${
 inv.status ==="Completed"
 ?"bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800"
 : inv.status ==="Cancelled"
 ?"bg-rose-50 text-rose-500 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-900"
 :"bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800"
 }`}>
 {inv.status}
 </span>
 </td>
 </tr>
 ))}
 {historyInvoices.length === 0 && (
 <tr>
 <td colSpan={7} className="py-8 text-center text-muted dark:text-zinc-650">
 No invoices currently archived under this lookup query.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
 }

 // Render for ADMIN & MANAGER tabs
 return (
 <div className="space-y-6 animate-in fade-in duration-300 font-sans text-left">
 {/* Delete Agent Modal */}
 {agentToDelete && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/40 backdrop-blur-sm p-4 animate-in fade-in">
 <div className="w-full max-w-sm rounded-xl border border-default bg-card  shadow-2xl relative">
 <div className="p-6">
 <h2 className="mb-2 text-lg font-bold text-primary dark:text-primary">Delete Agent</h2>
 <p className="mb-4 text-sm font-semibold text-secondary dark:text-muted">Agent Name: {agentToDelete.name}</p>
 
 {getAgentMetrics(agentToDelete.id).totalOrders > 0 ? (
 <div className="mb-6 rounded-lg bg-red-50 dark:bg-rose-900/10 p-4 border border-red-100 dark:border-rose-900/30">
 <p className="text-sm text-red-600 dark:text-rose-400 font-medium">This agent has invoice history.</p>
 <p className="text-xs text-red-500 dark:text-rose-500 mt-1">Agent cannot be deleted.</p>
 <div className="mt-4 flex gap-3">
 <button
 onClick={() => setAgentToDelete(null)}
 className="flex-1 rounded-lg border border-default dark:border-default px-4 py-2 text-sm font-bold text-secondary dark:text-muted hover:bg-surface dark:hover:bg-gray-800 transition cursor-pointer"
 >
 Cancel
 </button>
 <button
 onClick={confirmDeactivateAgent}
 className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-primary hover:bg-amber-600 transition cursor-pointer"
 >
 Deactivate Agent
 </button>
 </div>
 </div>
 ) : (
 <>
 <p className="mb-6 text-sm text-muted dark:text-muted">This action cannot be undone.</p>
 <div className="flex gap-3">
 <button
 onClick={() => setAgentToDelete(null)}
 className="flex-1 rounded-lg border border-default dark:border-default px-4 py-2 text-sm font-bold text-secondary dark:text-muted hover:bg-surface dark:hover:bg-gray-800 transition cursor-pointer"
 >
 Cancel
 </button>
 <button
 onClick={confirmDeleteAgent}
 className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-primary hover:bg-red-700 transition cursor-pointer"
 >
 Delete Agent
 </button>
 </div>
 </>
 )}
 </div>
 </div>
 </div>
 )}

 {/* MODULE HEADER TITLE */}
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-default pb-4">
 <div>
 <h1 className="text-xl font-bold tracking-tight text-primary font-sans flex items-center gap-2">
 <Award className="h-5.5 w-5.5 text-blue-500" />
 <span>Agent Referral Management</span>
 </h1>
 <p className="text-xs text-secondary">
 Regulate commission-based referrers, verify payouts, monitor referral analytics dashboard, or audit trace files.
 </p>
 </div>

 {isAdmin && !isAddingNew && !editingAgent && (
 <button
 onClick={() => { resetForm(); setIsAddingNew(true); }}
 className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-primary hover:bg-blue-700 transition cursor-pointer"
 >
 <Plus className="h-4 w-4" />
 <span>Enroll New Agent</span>
 </button>
 )}
 </div>

 {/* DUAL SUB TABS FOR DIRECTORY AND ANALYTICS */}
 <div className="flex border-b border-default pb-px gap-6">
 <button
 onClick={() => { setActiveSubTab("directory"); setIsAddingNew(false); resetForm(); }}
 className={`pb-2.5 text-xs font-bold tracking-wide uppercase transition-colors flex items-center gap-2 border-b-2 bg-transparent cursor-pointer ${
 activeSubTab ==="directory" && !isAddingNew && !editingAgent
 ?"border-blue-600 text-blue-600 dark:text-blue-400"
 :"border-transparent text-muted hover:text-muted dark:hover:text-primary"
 }`}
 >
 <Users className="h-4 w-4" />
 <span>Agent Directory Ledger</span>
 </button>
 <button
 onClick={() => { setActiveSubTab("analytics"); setIsAddingNew(false); resetForm(); }}
 className={`pb-2.5 text-xs font-bold tracking-wide uppercase transition-colors flex items-center gap-2 border-b-2 bg-transparent cursor-pointer ${
 activeSubTab ==="analytics"
 ?"border-blue-600 text-blue-600 dark:text-blue-400"
 :"border-transparent text-muted hover:text-muted dark:hover:text-primary"
 }`}
 >
 <TrendingUp className="h-4 w-4" />
 <span>Agent Sales Analytics ({agents.length})</span>
 </button>
 </div>

 {/* MAIN SCREEN GRID */}
 <div className="grid gap-6 lg:grid-cols-3">
 {/* LEFT: MAIN LIST DIRECTORY OR ANALYTICS */}
 <div className="lg:col-span-2 space-y-6">
 {/* DIRECTORY VIEW */}
 {activeSubTab ==="directory" && !isAddingNew && !editingAgent && (
 <div className="rounded-xl border border-default bg-card  p-5 shadow-sm space-y-4">
 <h3 className="font-bold text-primary dark:text-primary text-sm">Registered Referral Profiles</h3>
 <div className="overflow-x-auto">
 <table className="min-w-full table-auto text-left text-xs text-muted">
 <thead className="bg-table-header text-[10px] uppercase font-bold text-secondary dark:text-muted border-b border-default">
 <tr>
 <th className="px-4 py-3">Agent ID</th>
 <th className="px-4 py-3">Full Name</th>
 <th className="px-4 py-3">Contact</th>
 <th className="px-4 py-3">Category</th>
 <th className="px-4 py-3 text-center">Commission Rate</th>
 <th className="px-4 py-3 text-center">Status</th>
 <th className="px-4 py-3 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
 {agents.map((agt) => (
 <tr key={agt.id} className="hover:bg-table-hover transition-colors">
 <td className="px-4 py-3 font-mono font-bold text-indigo-650 dark:text-indigo-400">{agt.id}</td>
 <td className="px-4 py-3">
 <div className="font-semibold text-primary dark:text-primary leading-tight">{agt.name}</div>
 <div className="text-[10px] text-muted truncate">{agt.email}</div>
 </td>
 <td className="px-4 py-3 font-mono text-[11px] text-primary dark:text-primary">{agt.mobile}</td>
 <td className="px-4 py-3">
 <span className="inline-block rounded bg-card-secondary dark:bg-zinc-800 px-2 py-0.5 text-[9px] font-semibold text-muted uppercase">
 {agt.agentType}
 </span>
 </td>
 <td className="px-4 py-3 text-center font-mono font-bold text-primary dark:text-primary">
 {agt.commissionPercentage}%
 </td>
 <td className="px-4 py-3 text-center">
 <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold border ${
 agt.status ==="Active"
 ?"bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900"
 : agt.status ==="Inactive"
 ?"bg-stone-50 text-stone-500 border-stone-200 dark:bg-stone-500/10 dark:text-stone-400 dark:border-stone-800"
 :"bg-red-50 text-red-600 border-red-150 dark:bg-red-500/10 dark:text-red-400 dark:border-red-900"
 }`}>
 {agt.status}
 </span>
 </td>
 <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
 {isAdmin ? (
 <>
 <button
 onClick={() => triggerEdit(agt)}
 className="p-1 rounded text-muted hover:text-blue-500 inline-block bg-transparent cursor-pointer"
 title="Edit Agent Parameters"
 >
 <Edit2 className="h-3.5 w-3.5" />
 </button>
 <button
 onClick={() => handleDeleteAgent(agt)}
 className="p-1 rounded text-muted hover:text-red-500 inline-block bg-transparent cursor-pointer"
 title="Delete Agent Ledger Record"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </>
 ) : (
 <span className="text-[10px] text-muted italic">Read-only code</span>
 )}
 </td>
 </tr>
 ))}
 {agents.length === 0 && (
 <tr>
 <td colSpan={7} className="py-8 text-center text-muted">
 Empty ledger list. Enroll referral agents on the right panel to initialize stats.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* ANALYTICS VIEW */}
 {activeSubTab ==="analytics" && (
 <div className="rounded-xl border border-default bg-card  p-5 shadow-sm space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="font-bold text-primary dark:text-primary text-sm">Product Sales Referral Performance</h3>
 <span className="text-[10px] font-mono text-muted uppercase tracking-wide">Click any row to drill down details</span>
 </div>
 <div className="overflow-x-auto">
 <table className="min-w-full table-auto text-left text-xs text-muted">
 <thead className="bg-table-header text-[10px] uppercase font-bold text-secondary dark:text-muted border-b border-default">
 <tr>
 <th className="px-4 py-3">Agent ID</th>
 <th className="px-4 py-3">Name</th>
 <th className="px-4 py-3 text-center">Total Bookings</th>
 <th className="px-4 py-3 text-center">Completed</th>
 <th className="px-4 py-3 text-center">Pending</th>
 <th className="px-4 py-3 text-center">Cancelled</th>
 <th className="px-4 py-3 text-right">Generated Revenue</th>
 <th className="px-4 py-3 text-right">Average Ticket Value</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 dark:divide-gray-805/50">
 {agents.map((agt) => {
 const metrics = getAgentMetrics(agt.id);
 return (
 <tr 
 key={agt.id} 
 onClick={() => {
 setSelectedAgentForHistory(agt);
 setTimeFilter("All Time");
 setHistorySearch("");
 }}
 className="hover:bg-blue-50/20 dark:hover:bg-blue-950/10 cursor-pointer transition-colors"
 title="Click to view detailed invoice records for this agent"
 >
 <td className="px-4 py-3 font-mono font-bold text-indigo-650 dark:text-indigo-400">{agt.id}</td>
 <td className="px-4 py-3 leading-tight">
 <div className="font-semibold text-primary dark:text-primary">{agt.name}</div>
 <div className="text-[9px] text-zinc-550 italic">{agt.agentType}</div>
 </td>
 <td className="px-4 py-3 text-center font-bold font-mono text-primary dark:text-primary">{metrics.totalOrders}</td>
 <td className="px-4 py-3 text-center font-bold font-mono text-emerald-600 dark:text-emerald-400">{metrics.completedOrders}</td>
 <td className="px-4 py-3 text-center font-bold font-mono text-yellow-600 dark:text-yellow-400">{metrics.pendingOrders}</td>
 <td className="px-4 py-3 text-center font-mono text-muted">{metrics.cancelledOrders}</td>
 <td className="px-4 py-3 text-right font-bold text-blue-650 dark:text-blue-400 font-mono" title={`₹${metrics.revenue.toFixed(2)}`}>₹{formatIndianCurrencyShort(metrics.revenue)}</td>
 <td className="px-4 py-3 text-right font-mono text-muted" title={`₹${metrics.avgOrderValue.toFixed(2)}`}>₹{formatIndianCurrencyShort(metrics.avgOrderValue)}</td>
 </tr>
 );
 })}
 {agents.length === 0 && (
 <tr>
 <td colSpan={8} className="py-8 text-center text-muted">
 Empty analytics stream. Establish active referrers to gather metrics.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* IF FORM IS OPEN: SHOW IT FULL WIDTH OR BESIDE VIEW */}
 {(isAddingNew || editingAgent) && (
 <div className="rounded-xl border border-default bg-card  p-5 shadow-sm space-y-4">
 <h3 className="font-bold text-primary dark:text-primary text-sm border-b border-gray-50 pb-2">
 {editingAgent ? `Amending Agent ID profile: ${editingAgent.id}` :"Enroll New Sales Referral Agent"}
 </h3>
 <form onSubmit={handleSubmitAgent} className="grid gap-4 sm:grid-cols-2">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted block">Agent Name *</label>
 <input
 type="text"
 required
 placeholder="Referral full name or vendor"
 value={agentName}
 onChange={(e) => setAgentName(e.target.value)}
 className="w-full rounded-lg border border-default dark:border-default bg-input/10 px-3 py-2 text-xs text-primary dark:text-primary outline-none"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted block">Contact Mobile Number *</label>
 <input
 type="text"
 required
 placeholder="E.g. 9876543210"
 value={mobileNumber}
 onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9+]/g,""))}
 className="w-full rounded-lg border border-default dark:border-default bg-input/10 px-3 py-2 text-xs text-primary dark:text-primary outline-none font-mono"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted block">Payout Email ID Address *</label>
 <input
 type="email"
 required
 placeholder="contact@referralagent.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full rounded-lg border border-default dark:border-default bg-input/10 px-3 py-2 text-xs text-primary dark:text-primary outline-none"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted block">Referral Category Type</label>
 <select
 value={agentType}
 onChange={(e) => setAgentType(e.target.value as AgentType)}
 className="w-full rounded-lg border border-default dark:border-default bg-input/10 px-3 py-2 text-xs text-primary dark:text-primary outline-none"
 >
 <option value="Employee Agent">Employee Agent</option>
 <option value="Referral Partner">Referral Partner</option>
 <option value="Marketing Agent">Marketing Agent</option>
 <option value="Channel Partner">Channel Partner</option>
 <option value="Freelancer">Freelancer</option>
 <option value="External Agent">External Agent</option>
 <option value="Other">Other</option>
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted block">Commission Cut Percentage (%)</label>
 <div className="relative">
 <input
 type="number"
 min={0}
 max={100}
 required
 value={commissionPercentage}
 onChange={(e) => setCommissionPercentage(Number(e.target.value))}
 className="w-full rounded-lg border border-default dark:border-default bg-input/10 px-3 pr-8 py-2 text-xs text-primary dark:text-primary outline-none font-mono"
 />
 <span className="absolute right-3 top-2.5 text-muted">
 <Percent className="h-3.5 w-3.5" />
 </span>
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted block">Operational Status</label>
 <select
 value={status}
 onChange={(e) => setStatus(e.target.value as AgentStatus)}
 className="w-full rounded-lg border border-default dark:border-default bg-input/10 px-3 py-2 text-xs text-primary dark:text-primary outline-none"
 >
 <option value="Active">🟢 Active Referrer</option>
 <option value="Inactive">⚪ Inactive Account</option>
 <option value="Suspended">🔴 Suspended Link</option>
 </select>
 </div>

 <div className="sm:col-span-2 space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted block">Administrative Notes (Logistics details, terms...)</label>
 <textarea
 rows={2}
 placeholder="Enter notes, targets, or specific commission policies here..."
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="w-full rounded-lg border border-default dark:border-default bg-input/10 px-3 py-1.5 text-xs text-primary dark:text-primary outline-none"
 />
 </div>

 <div className="sm:col-span-2 flex gap-3 pt-2">
 <button
 type="submit"
 className="flex-1 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-primary hover:bg-blue-700 transition cursor-pointer"
 >
 Commit Agent Profile
 </button>
 <button
 type="button"
 onClick={() => { setIsAddingNew(false); setEditingAgent(null); resetForm(); }}
 className="rounded-lg border border-default bg-card px-5 text-xs font-bold text-muted dark:text-muted hover:bg-surface dark:hover:bg-zinc-800 cursor-pointer"
 >
 Cancel
 </button>
 </div>
 </form>
 </div>
 )}
 </div>

 {/* RIGHT: CLEARANCES INFORMATION SIDE PANEL */}
 <div className="space-y-4">
 <div className="rounded-xl border border-default dark:border-default bg-blue-50/50 dark:bg-blue-900/20  p-5 shadow-sm space-y-3 font-sans h-fit">
 <h4 className="font-bold text-primary text-xs flex items-center gap-1.5 font-sans border-b border-default dark:border-default pb-2">
 <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
 <span>Agent Management Protocols</span>
 </h4>
 <p className="text-[11px] text-secondary leading-relaxed font-sans">
 Commission calculations, referral lead distribution, and trace reports are subject to permission filters.
 </p>
 <ul className="text-[11px] text-secondary space-y-2.5 list-disc pl-4 font-sans leading-relaxed">
 <li><strong>ADMIN:</strong> Manage team profile sheets, assign roles, edit tracking ID tags, adjust referral payouts, and erase profiles.</li>
 <li><strong>MANAGER:</strong> View profile list and performance stats drill-downs; creation and edits are locked.</li>
 <li><strong>EMPLOYEE AGENTS:</strong> Blocked from accessing other agents. Employees are limited solely to reviewing their linked trace ledger.</li>
 </ul>
 </div>

 <div className="rounded-xl border border-default dark:border-default bg-surface/5 p-5 space-y-3 font-mono text-[10px] text-muted leading-relaxed h-fit">
 <h4 className="font-bold text-secondary uppercase tracking-widest text-[10px] block">Trace Records Database</h4>
 <p>Every checkout billed with a mapped"Referral Agent" updates statistics instantly.</p>
 <p className="text-zinc-550 border-t border-zinc-150 pt-2 font-sans italic">
 * Note: Employees and referral agents are handled as distinct entities, enabling the inclusion of external vendors, promoters, and marketing channels.
 </p>
 </div>
 </div>
 </div>
 </div>
 );
}
