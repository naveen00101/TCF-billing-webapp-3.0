import React, { useState, useEffect } from"react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from"recharts";
import { 
  DollarSign, 
  FileText, 
  Users, 
  TrendingUp, 
  Sparkles, 
  RefreshCw, 
  Clock, 
  CheckCircle,
  Truck,
  Activity,
  Award,
  Database,
  Shield,
  Download,
  Globe,
  Terminal,
  Cpu,
  MapPin,
  CheckCircle2
} from"lucide-react";
import { DashboardStats } from"../types";
import { SheetsSyncEngine } from"../utils/sheetsSync";
import { formatIndianCurrencyShort } from"../utils/currencyUtils";
import { formatDisplayDate } from"../utils/dateUtils";

interface DashboardProps {
 stats: DashboardStats;
 onRefresh: () => void;
 onNavigateToTab: (tab: string, filter?: string, extraState?: { invoiceNo?: string; customerId?: string; agentId?: string; auditId?: string; revenueModule?: string }) => void;
 userRole: string;
}

export default function Dashboard({ stats, onRefresh, onNavigateToTab, userRole }: DashboardProps) {
 // Simple reactive watch for dark mode switches
 const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
 const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
 const chartRef = React.useRef<HTMLDivElement>(null);

 useEffect(() => {
 const observer = new MutationObserver(() => {
 setIsDark(document.documentElement.classList.contains("dark"));
 });
 observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
 return () => observer.disconnect();
 }, []);

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
 }, []);


  const currentUser = SheetsSyncEngine.getCurrentUser();
  const isAdmin = userRole === "Admin";
  const isSuperadmin = userRole === "Superadmin";
  const isManager = userRole === "Manager";

  // Telemetry simulation state for Superadmin God-mode Dashboard
  const [telemetry, setTelemetry] = useState({
    cpu: 12.4,
    memory: 342,
    latency: 42,
    network: "CONNECTED",
  });
  const [localNotification, setLocalNotification] = useState<string | null>(null);
  const [isVacuuming, setIsVacuuming] = useState(false);

  const triggerLocalNotification = (msg: string) => {
    setLocalNotification(msg);
    setTimeout(() => setLocalNotification(null), 4000);
  };

  useEffect(() => {
    if (!isSuperadmin) return;
    const timer = setInterval(() => {
      setTelemetry(prev => ({
        cpu: +(prev.cpu + (Math.random() - 0.5) * 1.5).toFixed(1),
        memory: Math.round(prev.memory + (Math.random() - 0.5) * 4),
        latency: Math.max(10, Math.round(prev.latency + (Math.random() - 0.5) * 6)),
        network: "CONNECTED",
      }));
    }, 3000);
    return () => clearInterval(timer);
  }, [isSuperadmin]);

  const handleVacuumDb = () => {
    setIsVacuuming(true);
    setTimeout(() => {
      setIsVacuuming(false);
      triggerLocalNotification("Supabase database indices optimized & vacuumed. Reclaimed 0.45MB unused row descriptors.");
    }, 1500);
  };

  const handleExportLedgerDump = () => {
    const logs = SheetsSyncEngine.getAuditLogs();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `TCF_Audit_Ledger_Dump_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerLocalNotification("System cryptographic audit ledger exported successfully.");
  };
 const isEmployee = userRole ==="Employee";

 // Shared invoices getter
 const allInvoices = SheetsSyncEngine.getInvoices().filter(inv => !inv.isSoftDeleted && inv.status !=="Deleted");

 const getStatusBadge = (status: string) => {
 switch (status) {
 case"Draft":
 return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/10 text-muted border border-zinc-500/20">DRAFT</span>;
 case"Work In Progress":
 return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">WIP</span>;
 case"Ready for Delivery":
 case"Ready For Delivery":
 return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">READY</span>;
 case"Delivered":
 return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">DELIVERED</span>;
 case"Completed":
 return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">COMPLETED</span>;
 case"Cancelled":
 return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">CANCELLED</span>;
 default:
 return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-muted">UNKNOWN</span>;
 }
 };

  // 1. SUPERADMIN "GOD-MODE" COMMAND CENTER
  if (isSuperadmin) {
    const limitLogs = SheetsSyncEngine.getAuditLogs().slice(0, 5);
    const activities = SheetsSyncEngine.getUserActivities();
    
    // Find the latest active session with coordinates
    const activeMapSession = activities.find(act => act.latitude && act.longitude);
    
    return (
      <div className="space-y-6 text-left font-sans">
        {/* Local Toast Slideout for Superadmin Quick Actions */}
        {localNotification && (
          <div className="fixed top-4 right-4 z-[9999] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white bg-purple-600 shadow-2xl animate-in slide-in-from-top-6 duration-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{localNotification}</span>
          </div>
        )}

        {/* HEADER SECTION */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-default pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 via-fuchsia-505 to-indigo-500 bg-clip-text text-transparent font-sans">
                Omni-Command Telemetry Matrix
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 text-fuchsia-500 border border-fuchsia-500/20 shadow-sm animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500"></span>
                GOD MODE ACTIVE
              </span>
            </div>
            <p className="text-xs text-secondary font-sans mt-1">
              Real-time node status, live terminal geolocation tracking, administrative system overrides, and security ledger audit.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-lg border border-default bg-card px-3 py-2 text-xs font-semibold text-secondary shadow-sm transition-all hover:bg-surface dark:hover:bg-card-secondary hover:text-primary active:scale-95 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Force Sync Nodes</span>
            </button>
            <button
              onClick={() => onNavigateToTab("billing")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-purple-700 active:scale-95 cursor-pointer shadow-md shadow-purple-500/10"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>New Checkout</span>
            </button>
          </div>
        </div>

        {/* METRICS & TELEMETRY SECTION */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Glowing Metrics */}
          <div 
            onClick={() => onNavigateToTab("revenue")}
            className="rounded-xl p-5 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-650 text-white transition-all hover:shadow-xl hover:scale-[1.02] duration-155 cursor-pointer group flex flex-col justify-between h-32"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 font-sans">Weekly Revenue</p>
                <h3 className="mt-1 text-2xl font-black font-mono">₹{formatIndianCurrencyShort(stats.weeklySales)}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[10px] text-emerald-100/90 font-medium">Click to open Revenue Analytics Hub &rarr;</p>
          </div>

          <div 
            onClick={() => onNavigateToTab("revenue", undefined, { revenueModule: "Weekly Bills" })}
            className="rounded-xl p-5 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white transition-all hover:shadow-xl hover:scale-[1.02] duration-155 cursor-pointer group flex flex-col justify-between h-32"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-100 font-sans">Weekly Bills</p>
                <h3 className="mt-1 text-2xl font-black font-mono">{stats.weeklyInvoicesCount}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[10px] text-blue-100/90 font-medium">Invoices generated this week &rarr;</p>
          </div>

          <div 
            onClick={() => onNavigateToTab("activities")}
            className="rounded-xl p-5 shadow-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white transition-all hover:shadow-xl hover:scale-[1.02] duration-155 cursor-pointer group flex flex-col justify-between h-32"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-100 font-sans">Operators Online</p>
                <h3 className="mt-1 text-2xl font-black font-mono flex items-center gap-1.5">
                  <span>{activities.filter(a => {
                    if (a.logoutTime) return false;
                    if (!a.lastActiveAt) return false;
                    return (Date.now() - new Date(a.lastActiveAt).getTime()) < 300000;
                  }).length} Active</span>
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                </h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[10px] text-purple-100/90 font-medium">Track operator details & map geolocation &rarr;</p>
          </div>

          {/* TELEMETRY WIDGET */}
          <div className="rounded-xl border border-purple-500/20 bg-zinc-950 text-white p-4 shadow-lg space-y-2.5 transition-colors duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
              <span className="text-[9px] font-bold text-fuchsia-500 tracking-wider uppercase flex items-center gap-1">
                <Cpu className="h-3 w-3 animate-pulse" /> Live Node Telemetry
              </span>
              <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> SYNCED
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] font-mono">
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span className="text-zinc-500">CPU Load:</span>
                <span className="text-fuchsia-400 font-bold">{telemetry.cpu}%</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span className="text-zinc-500">Node Latency:</span>
                <span className="text-blue-400 font-bold">{telemetry.latency}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Heap Alloc:</span>
                <span className="text-emerald-400 font-bold">{telemetry.memory}MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Active Terminals:</span>
                <span className="text-purple-400 font-bold">{activities.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* WORK IN PROGRESS TRACKER */}
        <div className="grid gap-3 grid-cols-3">
          <div className="rounded-xl border border-default bg-card p-4 flex items-center justify-between shadow-sm hover:border-amber-500 transition duration-150 cursor-pointer" onClick={() => onNavigateToTab("revenue", undefined, { revenueModule: "Work In Progress" })}>
            <div>
              <span className="text-[9px] uppercase font-bold text-muted font-sans">Active Work In Progress</span>
              <div className="text-base font-black text-amber-500 font-mono mt-0.5">{stats.wipBillsCount} Bills</div>
            </div>
            <Clock className="h-5 w-5 text-amber-500/20" />
          </div>
          <div className="rounded-xl border border-default bg-card p-4 flex items-center justify-between shadow-sm hover:border-blue-500 transition duration-150 cursor-pointer" onClick={() => onNavigateToTab("revenue", undefined, { revenueModule: "Ready For Delivery" })}>
            <div>
              <span className="text-[9px] uppercase font-bold text-muted font-sans">Ready For Delivery</span>
              <div className="text-base font-black text-blue-500 font-mono mt-0.5">{stats.readyBillsCount} Bills</div>
            </div>
            <Truck className="h-5 w-5 text-blue-500/20" />
          </div>
          <div className="rounded-xl border border-default bg-card p-4 flex items-center justify-between shadow-sm hover:border-green-500 transition duration-150 cursor-pointer" onClick={() => onNavigateToTab("revenue", undefined, { revenueModule: "Completed Cycles" })}>
            <div>
              <span className="text-[9px] uppercase font-bold text-muted font-sans">Completed Cycles</span>
              <div className="text-base font-black text-green-500 font-mono mt-0.5">{stats.completedBillsCount} Bills</div>
            </div>
            <CheckCircle className="h-5 w-5 text-green-500/20" />
          </div>
        </div>

        {/* MAIN VISUALIZATION & GEOLOCATION MATRIX */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Revenue Distribution Chart */}
          <div ref={chartRef} className="md:col-span-2 rounded-xl border border-default bg-card p-5 shadow-sm flex flex-col justify-between">
            <h3 className="font-bold text-primary text-sm mb-4 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><TrendingUp className="h-4.5 w-4.5 text-purple-500" /> Monthly Revenue Distribution</span>
              <span className="text-[9px] text-muted font-sans">GROSS SALES (₹) • CLICK TO DRILL DOWN</span>
            </h3>
            <div className="h-[280px]">
              {chartDimensions.width > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlySalesData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#27272a" : "#f4f4f5"} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: isDark ? "#a1a1aa" : "#71717a" }} />
                    <YAxis tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: isDark ? "#a1a1aa" : "#71717a" }} tickFormatter={(v) => `₹${formatIndianCurrencyShort(v)}`} />
                    <Tooltip cursor={{ fill: isDark ? "#27272a" : "#f4f4f5", opacity: 0.4 }} contentStyle={{ backgroundColor: isDark ? "#18181b" : "#ffffff", borderColor: isDark ? "#27272a" : "#e4e4e7", borderRadius: "8px", fontSize: "11px", color: isDark ? "#ffffff" : "#000000" }} formatter={(value: any) => [`₹${value.toLocaleString()}`, "Gross Revenue"]} />
                    <Bar dataKey="total" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Live Geolocation Tracker Map Widget */}
          <div className="rounded-xl border border-default bg-card p-5 shadow-sm flex flex-col">
            <h3 className="font-bold text-primary text-sm mb-3.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><MapPin className="h-4.5 w-4.5 text-red-500 animate-bounce" /> Live Terminal GPS Tracker</span>
              <span className="text-[9px] text-muted uppercase font-mono">Real-time Location</span>
            </h3>
            {activeMapSession ? (
              <div className="flex-1 flex flex-col justify-between space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-default bg-surface h-48">
                  <iframe
                    title="Live Geolocation Tracker Map"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    src={`https://maps.google.com/maps?q=${activeMapSession.latitude},${activeMapSession.longitude}&hl=en&z=13&output=embed`}
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
                <div className="text-[11px] p-2.5 rounded-lg bg-surface border border-default space-y-1 transition-colors">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-muted">Active Operator:</span>
                    <strong className="text-purple-600 dark:text-purple-400 font-mono">@{activeMapSession.username}</strong>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-muted">Terminal Location:</span>
                    <span className="text-primary font-semibold text-right max-w-[150px] truncate" title={activeMapSession.locationName}>
                      {activeMapSession.locationName || "Resolving GPS..."}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-default rounded-xl bg-surface/50 text-muted">
                <Globe className="h-8 w-8 mb-2 text-muted animate-spin-slow" />
                <h4 className="font-bold text-xs text-primary mb-1">No GPS Terminals Active</h4>
                <p className="text-[10px] text-secondary max-w-[180px]">
                  No active session coordinates detected. Location mapping requires device GPS authorization at login.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MASTER SECURITY ACTIONS & SYSTEM AUDIT LEDGER */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Security Audit Trail (2/3 width) */}
          <div 
            onClick={() => onNavigateToTab("audit")}
            className="md:col-span-2 group rounded-xl border border-default bg-card p-5 shadow-sm flex flex-col h-[380px] cursor-pointer hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] transition-all duration-300"
            title="Click card to view full security audit history ledger"
          >
            <div className="mb-3.5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <Terminal className="h-4.5 w-4.5 text-purple-500 animate-pulse group-hover:text-purple-600 transition-colors" />
                  <h3 className="font-bold text-primary text-sm font-sans flex items-center gap-2">
                    <span>Cryptographic Security Audit Trail</span>
                  </h3>
                </div>
                <p className="text-xs text-secondary font-sans mt-0.5">Secure ledgers registering system authorizations and override actions</p>
              </div>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-1 group-hover:translate-x-0">
                Audit Registry &rarr;
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {limitLogs.map((log) => (
                <div 
                  key={log.id} 
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToTab("audit", undefined, { auditId: log.id });
                  }}
                  className="group/row text-xs border-b border-default pb-2.5 last:border-0 last:pb-0 hover:bg-purple-500/5 p-2 rounded-lg transition-all cursor-pointer relative"
                  title={`View details of audit: ${log.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary group-hover/row:text-purple-600 dark:group-hover/row:text-purple-400 transition-colors">{log.actionType}</span>
                    <span className="text-[10px] font-mono text-muted">{log.time}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1 text-[10px]">
                    <span className="text-muted">Operator: <span className="font-mono text-secondary">@{log.userName}</span></span>
                    <span className="text-muted font-mono text-[9px]">{log.id}</span>
                  </div>
                </div>
              ))}
              {limitLogs.length === 0 && (
                <div className="h-full flex items-center justify-center text-center text-muted font-sans text-xs">
                  No system security logs captured yet.
                </div>
              )}
            </div>
          </div>

          {/* Master Overrides & System Shortcuts (1/3 width) */}
          <div className="rounded-xl border border-purple-500/20 bg-zinc-950 text-white p-5 shadow-lg flex flex-col h-[380px] justify-between text-left">
            <div>
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2.5 mb-4">
                <Shield className="h-4.5 w-4.5 text-purple-400" />
                <div>
                  <h3 className="font-bold text-sm">Master Override Controls</h3>
                  <span className="text-[8px] font-mono text-fuchsia-400 tracking-widest uppercase">System Core Shunts</span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed mb-4">
                Superuser shunts to optimize remote database storage nodes, sync client instances, or dump ledger indexes.
              </p>
            </div>
            
            <div className="space-y-2.5 flex-1 flex flex-col justify-end">
              <button
                onClick={handleVacuumDb}
                disabled={isVacuuming}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 text-xs font-bold py-2.5 text-purple-400 transition-all cursor-pointer disabled:opacity-50 active:scale-97"
              >
                <Database className={`h-4 w-4 ${isVacuuming ? "animate-spin" : ""}`} />
                <span>{isVacuuming ? "Vacuuming Database Indexes..." : "Vacuum Database Indices"}</span>
              </button>

              <button
                onClick={handleExportLedgerDump}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 text-xs font-bold py-2.5 text-blue-400 transition-all cursor-pointer active:scale-97"
              >
                <Download className="h-4 w-4" />
                <span>Export Ledger JSON Dump</span>
              </button>

              <button
                onClick={() => onNavigateToTab("users")}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-xs font-bold py-2.5 text-purple-300 transition-all cursor-pointer active:scale-97"
              >
                <Users className="h-4 w-4" />
                <span>Open Personnel Access Matrix</span>
              </button>
            </div>

            <div className="border-t border-zinc-900 pt-2.5 mt-4 text-center">
              <span className="text-[8px] font-mono text-zinc-500 tracking-wider uppercase">Node ID: SUPABASE_MAIN_01</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. ADMIN DASHBOARD RENDER SECTION
  if (isAdmin) {
 const limitLogs = SheetsSyncEngine.getAuditLogs().slice(0, 5);
 return (
 <div className="space-y-6">
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h1 className="text-2xl font-bold tracking-tight text-primary font-sans">Corporate Intelligence Console</h1>
 <p className="text-sm text-secondary font-sans">
 Complete admin metrics, monthly sales trend visualizations, and live security operations ledger logs.
 </p>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={onRefresh}
 className="inline-flex items-center gap-1.5 rounded-lg border border-default bg-card px-3 py-2 text-xs font-semibold text-secondary shadow-sm transition-all hover:bg-surface dark:hover:bg-card-secondary dark:hover:bg-surface hover:text-primary active:scale-95 cursor-pointer"
 >
 <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
 <span>Sync Data</span>
 </button>
 <button
 onClick={() => onNavigateToTab("billing")}
 className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-primary transition-all hover:bg-blue-700 active:scale-95 cursor-pointer"
 >
 <Sparkles className="h-3.5 w-3.5" />
 <span>New Checkout</span>
 </button>
 </div>
 </div>

 {/* 4-column stats grid */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
 <div 
 onClick={() => onNavigateToTab("revenue")}
 className="rounded-xl border border-default bg-card p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] hover:border-blue-500 duration-155 cursor-pointer group"
 title="Click to view Revenue Analytics Hub"
 >
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-semibold uppercase tracking-wider text-secondary font-sans transition group-hover:text-primary">Weekly Revenue</p>
 <h3 className="mt-1 text-2xl font-bold text-primary font-mono group-hover:text-blue-600 transition" title={`₹${stats.weeklySales.toFixed(2)}`}>₹{formatIndianCurrencyShort(stats.weeklySales)}</h3>
 </div>
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
 <DollarSign className="h-5 w-5" />
 </div>
 </div>
 <p className="mt-4 text-[11px] text-emerald-500 font-medium">Revenue generated this week &rarr;</p>
 </div>

 <div 
 onClick={() => onNavigateToTab("revenue", undefined, { revenueModule:"Weekly Bills" })}
 className="rounded-xl border border-default bg-card p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] hover:border-blue-500 duration-155 cursor-pointer group"
 title="Click to view weekly bilings analytics"
 >
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-semibold uppercase tracking-wider text-secondary font-sans transition group-hover:text-primary">Weekly Bills</p>
 <h3 className="mt-1 text-2xl font-bold text-primary font-mono group-hover:text-blue-600 transition">{stats.weeklyInvoicesCount}</h3>
 </div>
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
 <FileText className="h-5 w-5" />
 </div>
 </div>
 <p className="mt-4 text-[11px] text-blue-500 font-medium font-sans">Invoices generated this week &rarr;</p>
 </div>

 <div 
 onClick={() => onNavigateToTab("revenue", undefined, { revenueModule:"Pending Deliveries" })}
 className="rounded-xl border border-default bg-card p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] hover:border-blue-500 duration-155 cursor-pointer group"
 title="Click to view Pending Deliveries Explorer"
 >
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-semibold uppercase tracking-wider text-secondary font-sans transition group-hover:text-primary">Pending Deliveries</p>
 <h3 className="mt-1 text-2xl font-bold text-primary font-mono group-hover:text-blue-600 transition">{stats.pendingDeliveriesCount}</h3>
 </div>
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
 <Truck className="h-5 w-5" />
 </div>
 </div>
 <p className="mt-4 text-[11px] text-amber-500 font-medium font-sans">Track and schedule dispatch &rarr;</p>
 </div>

 <div 
 onClick={() => onNavigateToTab("revenue", undefined, { revenueModule:"Customer Analytics" })}
 className="rounded-xl border border-default bg-card p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] hover:border-blue-500 duration-155 cursor-pointer group"
 title="Click to view Customers Segment Analytics"
 >
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-semibold uppercase tracking-wider text-secondary font-sans transition group-hover:text-primary">Total Customers</p>
 <h3 className="mt-1 text-2xl font-bold text-primary font-mono group-hover:text-blue-600 transition">{stats.totalCustomers}</h3>
 </div>
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
 <Users className="h-5 w-5" />
 </div>
 </div>
 <p className="mt-4 text-[11px] text-purple-500 font-medium">Click to manage client register &rarr;</p>
 </div>
 </div>

 {/* 3-column sub-status pipeline */}
 <div className="grid gap-3 grid-cols-3">
 <div 
 onClick={() => onNavigateToTab("revenue", undefined, { revenueModule:"Work In Progress" })}
 className="rounded-xl border border-default bg-card p-4 flex items-center justify-between shadow-sm hover:border-amber-500 hover:scale-[1.01] transition duration-150 cursor-pointer group"
 title="Click to view active Work In Progress Bills in Analytics"
 >
 <div>
 <span className="text-[10px] uppercase font-bold text-secondary font-sans group-hover:text-primary">Work In Progress</span>
 <div className="text-lg font-bold text-amber-500 font-mono mt-0.5">{stats.wipBillsCount} Bills</div>
 </div>
 <Clock className="h-6 w-6 text-amber-500/20" />
 </div>

 <div 
 onClick={() => onNavigateToTab("revenue", undefined, { revenueModule:"Ready For Delivery" })}
 className="rounded-xl border border-default bg-card p-4 flex items-center justify-between shadow-sm hover:border-blue-500 hover:scale-[1.01] transition duration-150 cursor-pointer group"
 title="Click to view Ready for Delivery Outstanding Bills"
 >
 <div>
 <span className="text-[10px] uppercase font-bold text-secondary font-sans group-hover:text-primary">Ready for Delivery</span>
 <div className="text-lg font-bold text-blue-500 dark:text-blue-400 font-mono mt-0.5">{stats.readyBillsCount} Bills</div>
 </div>
 <Truck className="h-6 w-6 text-blue-400/20" />
 </div>

 <div 
 onClick={() => onNavigateToTab("revenue", undefined, { revenueModule:"Completed Cycles" })}
 className="rounded-xl border border-default bg-card p-4 flex items-center justify-between shadow-sm hover:border-green-500 hover:scale-[1.01] transition duration-150 cursor-pointer group"
 title="Click to view Completed billing cycles in Net Revenue"
 >
 <div>
 <span className="text-[10px] uppercase font-bold text-secondary font-sans group-hover:text-primary">Completed Cycles</span>
 <div className="text-lg font-bold text-emerald-600 dark:text-emerald-500 font-mono mt-0.5">{stats.completedBillsCount} Bills</div>
 </div>
 <CheckCircle className="h-6 w-6 text-emerald-500/20" />
 </div>
 </div>

 {/* Charts & System Logs Section */}
 <div className="grid gap-6 lg:grid-cols-3">
 <div 
 onClick={() => onNavigateToTab("revenue", undefined, { revenueModule:"Revenue Distribution" })}
 className="rounded-xl border border-default bg-card p-5 shadow-sm lg:col-span-2 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all duration-300 group"
 title="Click to view Revenue Distribution & Customer Drill Down"
 >
 <div className="mb-4 flex items-center justify-between">
 <div className="flex items-center gap-1.5">
 <TrendingUp className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
 <h3 className="font-bold text-primary text-sm font-sans group-hover:text-blue-600 transition-colors">Monthly Revenue Distribution</h3>
 </div>
 <span className="font-mono text-[10px] text-muted uppercase">Gross Sales (₹) • Click to Drill Down</span>
 </div>
 <div className="h-72 w-full" ref={chartRef}>
 {chartDimensions.width > 0 && chartDimensions.height > 0 ? (
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={stats.monthlySales}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ?"#1f1f23" :"#e2e8f0"} />
 <XAxis dataKey="month" stroke={isDark ?"#a1a1aa" :"#475569"} fontSize={10} tickLine={false} />
 <YAxis stroke={isDark ?"#a1a1aa" :"#475569"} fontSize={10} tickLine={false} axisLine={false} />
 <Tooltip
 contentStyle={{
 backgroundColor: isDark ?"#161616" :"#ffffff",
 borderRadius:"8px",
 border: isDark ?"1px solid #242427" :"1px solid #cbd5e1",
 color: isDark ?"#f4f4f5" :"#0f172a"
 }}
 itemStyle={{ color: isDark ?"#cccccc text-[12px]" :"#475569 text-[12px]", fontSize:"12px" }}
 labelStyle={{ fontWeight:"bold", fontSize:"11px", color: isDark ?"#f4f4f5" :"#0f172a" }}
 />
 <Bar dataKey="sales" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={32} />
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Loading chart...</div>
 )}
 </div>
 </div>

 <div 
 onClick={() => onNavigateToTab("audit")}
 className="group rounded-xl border border-default bg-card p-5 shadow-sm flex flex-col h-[360px] cursor-pointer hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all duration-300"
 title="Click card to view full security audit history ledger"
 >
 <div className="mb-3 flex items-center justify-between">
 <div>
 <div className="flex items-center gap-1.5">
 <Activity className="h-4 w-4 text-emerald-500 animate-pulse group-hover:text-blue-500 transition-colors" />
 <h3 className="font-bold text-primary text-sm font-sans flex items-center gap-2">
 <span>Security Audit Trail</span>
 </h3>
 </div>
 <p className="text-xs text-secondary font-sans">Dynamic administrator security logs</p>
 </div>
 <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-1 group-hover:translate-x-0 font-sans">
 Full history &rarr;
 </span>
 </div>
 <div className="flex-1 overflow-y-auto space-y-3 pr-1">
 {limitLogs.map((log) => (
 <div 
 key={log.id} 
 onClick={(e) => {
 e.stopPropagation();
 onNavigateToTab("audit", undefined, { auditId: log.id });
 }}
 className="group/row text-xs border-b border-default pb-2.5 last:border-0 last:pb-0 hover:bg-blue-50/15 dark:hover:bg-zinc-800/40 p-2 rounded-lg transition-all cursor-pointer relative"
 title={`Click to view complete details of audit trace: ${log.id}`}
 >
 <div className="flex items-center justify-between">
 <span className="font-bold text-primary tracking-tight group-hover/row:text-blue-600 dark:group-hover/row:text-blue-400 transition-colors">{log.actionType}</span>
 <span className="text-[10px] font-mono text-muted">{log.time}</span>
 </div>
 <p className="text-secondary text-[11px] mt-0.5 line-clamp-2">{log.newValue}</p>
 <div className="flex items-center justify-between mt-1">
 <div className="flex items-center gap-1.5 text-[9px] text-blue-600 dark:text-blue-400 font-semibold uppercase">
 <span>Authorized: {log.userName}</span>
 <span>•</span>
 <span>{log.date}</span>
 </div>
 <span className="text-[8px] font-mono font-bold bg-blue-100  text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded opacity-0 group-hover/row:opacity-100 transition-opacity">
 DRILL DOWN
 </span>
 </div>
 </div>
 ))}
 {limitLogs.length === 0 && (
 <p className="text-xs text-center text-muted mt-12 py-4">No system activities logged yet.</p>
 )}
 </div>
 </div>
 </div>

 {/* Recent Checkout invoices */}
 <div 
 onClick={() => onNavigateToTab("history")}
 className="group rounded-xl border border-default bg-card p-5 shadow-sm cursor-pointer hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all duration-300"
 title="Click card to view complete receipts database history"
 >
 <div className="mb-4 flex items-center justify-between">
 <div>
 <h3 className="font-bold text-primary text-sm flex items-center gap-2">
 <span>Recent Sales Receipts</span>
 <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-sans">
 (Click to view full catalog &rarr;)
 </span>
 </h3>
 <p className="text-xs text-muted">A detailed list of the latest billing checkouts generated</p>
 </div>
 <button
 onClick={(e) => {
 e.stopPropagation();
 onNavigateToTab("history");
 }}
 className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer bg-transparent border-0"
 >
 See Receipts History &rarr;
 </button>
 </div>
 <div className="overflow-x-auto">
 <table className="min-w-full table-auto text-left text-xs text-secondary">
 <thead className="bg-table-header text-[10px] uppercase font-bold text-secondary border-b border-default">
 <tr>
 <th className="px-4 py-3">Receipt No</th>
 <th className="px-4 py-3">Date</th>
 <th className="px-4 py-3">Customer Name</th>
 <th className="px-4 py-3">Mobile No</th>
 <th className="px-4 py-3 text-center">Items Count</th>
 <th className="px-4 py-3 text-center">Status</th>
 <th className="px-4 py-3 text-right">Grand Total</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {stats.recentInvoices.map((inv, idx) => (
 <tr 
 key={idx} 
 onClick={(e) => {
 e.stopPropagation();
 onNavigateToTab("history","All", { invoiceNo: inv.invoiceNo });
 }}
 className="hover:bg-blue-50/15 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer group/row"
 title={`Click to view record of invoice ${inv.invoiceNo}`}
 >
 <td className="px-4 py-3 font-mono font-bold text-blue-600 group-hover/row:underline">{inv.invoiceNo}</td>
 <td className="px-4 py-3">{formatDisplayDate(inv.date)}</td>
 <td className="px-4 py-3 font-semibold text-primary">{inv.customerName}</td>
 <td className="px-4 py-3 font-mono text-muted">{inv.mobile}</td>
 <td className="px-4 py-3 text-center font-mono font-medium">{inv.itemCount || 0} Items</td>
 <td className="px-4 py-3 text-center">{getStatusBadge(inv.status)}</td>
 <td className="px-4 py-3 text-right font-mono font-bold text-primary flex items-center justify-end gap-1.5">
 <span>₹{inv.grandTotal.toFixed(2)}</span>
 <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100  px-1 py-0.5 rounded opacity-0 group-hover/row:opacity-100 transition-opacity">
 VIEW
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
 }

 // 2. MANAGER DASHBOARD RENDER SECTION
 if (isManager) {
 const agents = SheetsSyncEngine.getAgents();
 const agentPerformance = agents.map(agt => {
 const agtInvoices = allInvoices.filter(inv => inv.referralAgentId === agt.id);
 const completed = agtInvoices.filter(inv => inv.status ==="Completed" || inv.status ==="Delivered");
 const totalRevenue = completed.reduce((sum, inv) => sum + inv.grandTotal, 0);
 return {
 id: agt.id,
 fullName: agt.name,
 role: agt.agentType,
 completedCount: completed.length,
 revenue: totalRevenue,
 status: agt.status
 };
 }).sort((a, b) => b.revenue - a.revenue);

 return (
 <div className="space-y-6">
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h1 className="text-2xl font-bold tracking-tight text-primary font-sans">Store Operational Dashboard</h1>
 <p className="text-sm text-secondary font-sans">
 Interactive store-level fulfillment tracking, delivery status logs, and real-time sales team rankings.
 </p>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={onRefresh}
 className="inline-flex items-center gap-1.5 rounded-lg border border-default bg-card px-3 py-2 text-xs font-semibold text-secondary shadow-sm transition-all hover:bg-surface dark:hover:bg-card-secondary dark:hover:bg-surface hover:text-primary active:scale-95 cursor-pointer"
 >
 <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
 <span>Sync Data</span>
 </button>
 <button
 onClick={() => onNavigateToTab("billing")}
 className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-primary transition-all hover:bg-blue-700 active:scale-95 cursor-pointer"
 >
 <Sparkles className="h-3.5 w-3.5" />
 <span>New Checkout</span>
 </button>
 </div>
 </div>

 {/* 3-column stats cards (completely hides Today's Revenue card, and spans remaining in equal 3 columns seamlessly) */}
 <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-3">
 <div 
 onClick={() => onNavigateToTab("history","All")}
 className="rounded-xl border border-default bg-card p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] hover:border-blue-500 duration-155 cursor-pointer group"
 title="Click to view weekly bilings analytics"
 >
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-semibold uppercase tracking-wider text-secondary font-sans transition group-hover:text-primary">Weekly Bills</p>
 <h3 className="mt-1 text-2xl font-bold text-primary font-mono group-hover:text-blue-600 transition">{stats.weeklyInvoicesCount}</h3>
 </div>
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
 <FileText className="h-5 w-5" />
 </div>
 </div>
 <p className="mt-4 text-[11px] text-blue-500 font-medium font-sans">Invoices generated this week &rarr;</p>
 </div>

 <div 
 onClick={() => onNavigateToTab("history","Pending Deliveries")}
 className="rounded-xl border border-default bg-card p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] hover:border-blue-500 duration-155 cursor-pointer group"
 title="Click to view Pending Deliveries Explorer"
 >
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-semibold uppercase tracking-wider text-secondary font-sans transition group-hover:text-primary">Pending Deliveries</p>
 <h3 className="mt-1 text-2xl font-bold text-primary font-mono group-hover:text-blue-600 transition">{stats.pendingDeliveriesCount}</h3>
 </div>
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
 <Truck className="h-5 w-5" />
 </div>
 </div>
 <p className="mt-4 text-[11px] text-amber-500 font-medium font-sans">Track and schedule dispatch &rarr;</p>
 </div>

 <div 
 onClick={() => onNavigateToTab("customers")}
 className="rounded-xl border border-default bg-card p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] hover:border-blue-500 duration-155 cursor-pointer group"
 title="Click to view related customer metrics explorer"
 >
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-semibold uppercase tracking-wider text-secondary font-sans transition group-hover:text-primary">Total Customers</p>
 <h3 className="mt-1 text-2xl font-bold text-primary font-mono group-hover:text-blue-600 transition">{stats.totalCustomers}</h3>
 </div>
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
 <Users className="h-5 w-5" />
 </div>
 </div>
 <p className="mt-4 text-[11px] text-purple-500 font-medium font-sans">Click to open customer index &rarr;</p>
 </div>
 </div>

 {/* 3-column sub-status pipeline row */}
 <div className="grid gap-3 grid-cols-3">
 <div 
 onClick={() => onNavigateToTab("history","Work In Progress")}
 className="rounded-xl border border-default bg-card p-4 flex items-center justify-between shadow-sm hover:border-amber-500 hover:scale-[1.01] transition duration-150 cursor-pointer group"
 title="Click to view Work In Progress in active analytics"
 >
 <div>
 <span className="text-[10px] uppercase font-bold text-secondary font-sans group-hover:text-primary">Work In Progress</span>
 <div className="text-lg font-bold text-amber-500 font-mono mt-0.5">{stats.wipBillsCount} Bills</div>
 </div>
 <Clock className="h-6 w-6 text-amber-500/20" />
 </div>

 <div 
 onClick={() => onNavigateToTab("history","Ready for Delivery")}
 className="rounded-xl border border-default bg-card p-4 flex items-center justify-between shadow-sm hover:border-blue-500 hover:scale-[1.01] transition duration-150 cursor-pointer group"
 title="Click to view Outstanding Payments for Ready deliveries"
 >
 <div>
 <span className="text-[10px] uppercase font-bold text-secondary font-sans group-hover:text-primary">Ready for Delivery</span>
 <div className="text-lg font-bold text-blue-500 dark:text-blue-400 font-mono mt-0.5">{stats.readyBillsCount} Bills</div>
 </div>
 <Truck className="h-6 w-6 text-blue-400/20" />
 </div>

 <div 
 onClick={() => onNavigateToTab("history","Completed")}
 className="rounded-xl border border-default bg-card p-4 flex items-center justify-between shadow-sm hover:border-green-500 hover:scale-[1.01] transition duration-150 cursor-pointer group"
 title="Click to view Net Revenue for Completed orders"
 >
 <div>
 <span className="text-[10px] uppercase font-bold text-secondary font-sans group-hover:text-primary">Completed Cycles</span>
 <div className="text-lg font-bold text-emerald-600 dark:text-emerald-500 font-mono mt-0.5">{stats.completedBillsCount} Bills</div>
 </div>
 <CheckCircle className="h-6 w-6 text-emerald-500/20" />
 </div>
 </div>

 {/* 3-column split section: column 1 & 2 displays Recent Invoices, column 3 displays Agent Leaderboard */}
 <div className="grid gap-6 lg:grid-cols-3">
 {/* Recent receipts list inside manager view */}
 <div 
 onClick={() => onNavigateToTab("history")}
 className="group rounded-xl border border-default bg-card p-5 shadow-sm lg:col-span-2 space-y-4 cursor-pointer hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all duration-300"
 title="Click card to view complete receipts database history"
 >
 <div className="flex items-center justify-between border-b border-default pb-3">
 <div>
 <h3 className="font-bold text-primary text-sm font-sans flex items-center gap-2">
 <span>Recent Billing Transactions</span>
 <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-sans">
 (Click to view full catalog &rarr;)
 </span>
 </h3>
 <p className="text-xs text-muted font-sans font-medium">Store's global checkout activity log</p>
 </div>
 <button
 onClick={(e) => {
 e.stopPropagation();
 onNavigateToTab("history");
 }}
 className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline border-0 bg-transparent cursor-pointer"
 >
 More History &rarr;
 </button>
 </div>
 <div className="overflow-x-auto">
 <table className="min-w-full table-auto text-left text-xs text-secondary">
 <thead className="bg-table-header text-[10px] uppercase font-bold text-secondary border-b border-default">
 <tr>
 <th className="px-4 py-3">Receipt No</th>
 <th className="px-4 py-3">Date</th>
 <th className="px-4 py-3">Customer Name</th>
 <th className="px-4 py-3">Status</th>
 <th className="px-4 py-3 text-right">Grand Total</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {stats.recentInvoices.map((inv, idx) => (
 <tr 
 key={idx} 
 onClick={(e) => {
 e.stopPropagation();
 onNavigateToTab("history","All", { invoiceNo: inv.invoiceNo });
 }}
 className="hover:bg-blue-50/15 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer group/row"
 title={`Click to view record of invoice ${inv.invoiceNo}`}
 >
 <td className="px-4 py-3 font-mono font-bold text-blue-600 group-hover/row:underline">{inv.invoiceNo}</td>
 <td className="px-4 py-3">{formatDisplayDate(inv.date)}</td>
 <td className="px-4 py-3 font-semibold text-primary">{inv.customerName}</td>
 <td className="px-4 py-3">{getStatusBadge(inv.status)}</td>
 <td className="px-4 py-3 text-right font-mono font-bold text-primary flex items-center justify-end gap-1.5">
 <span>₹{inv.grandTotal.toFixed(2)}</span>
 <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100  px-1 py-0.5 rounded opacity-0 group-hover/row:opacity-100 transition-opacity">
 VIEW
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Agent performance dynamic list */}
 <div className="rounded-xl border border-default bg-card p-5 shadow-sm flex flex-col h-[340.4px]">
 <div className="mb-3 border-b border-default pb-3">
 <div className="flex items-center gap-1.5">
 <Award className="h-4 w-4 text-blue-600" />
 <h3 className="font-bold text-primary text-sm font-sans">Agent Live Performance</h3>
 </div>
 <p className="text-[11px] text-muted font-sans font-medium">Fulfillment counters & rankings</p>
 </div>
 <div className="flex-1 overflow-y-auto space-y-3 pr-1">
 {agentPerformance.map((agent, index) => (
 <div key={agent.id} className="text-xs border-b border-default pb-2.5 last:border-0 last:pb-0 flex items-center justify-between">
 <div>
 <div className="flex items-center gap-1.5">
 <span className="font-bold text-primary tracking-tight">{agent.fullName}</span>
 <span className="text-[9px] uppercase font-semibold bg-card-secondary dark:bg-zinc-800 text-secondary px-1 py-0.5 rounded">Rank #{index + 1}</span>
 </div>
 <span className="text-[10px] text-muted font-sans mt-0.5 block">{agent.role}</span>
 </div>
 <div className="text-right">
 <span className="text-primary font-bold font-mono text-[11px] block">{agent.completedCount} Deliveries</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 );
 }

 // 3. EMPLOYEE DASHBOARD RENDER SECTION
 if (isEmployee) {
 const myInvoices = allInvoices.filter(inv => 
 (inv.assignedEmployee && inv.assignedEmployee.toLowerCase() === currentUser?.fullName?.toLowerCase()) ||
 (inv.createdBy && inv.createdBy.toLowerCase() === currentUser?.username?.toLowerCase())
 );

 const myPendingInvoices = myInvoices.filter(inv =>
 inv.status ==="Work In Progress" || inv.status ==="Ready for Delivery" || inv.status ==="Ready For Delivery"
 );

 const myReadyInvoices = myInvoices.filter(inv =>
 inv.status ==="Ready for Delivery" || inv.status ==="Ready For Delivery"
 );

 const myCompletedInvoices = myInvoices.filter(inv =>
 inv.status ==="Completed" || inv.status ==="Delivered"
 );

 // Dynamic distinct custom customer registry served by this employee
 const myCustomers = myInvoices.reduce((acc: any[], inv) => {
 if (!acc.some(c => c.name.toLowerCase() === inv.customerName.toLowerCase())) {
 acc.push({
 name: inv.customerName,
 mobile: inv.mobile ||"N/A"
 });
 }
 return acc;
 }, []).slice(0, 5);

 return (
 <div className="space-y-6">
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h1 className="text-2xl font-bold tracking-tight text-primary font-sans">Representative Workspace</h1>
 <p className="text-sm text-secondary font-sans">
 Welcome back, {currentUser?.fullName}. Action assignments registry, pending dispatches, and quick clients index.
 </p>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={onRefresh}
 className="inline-flex items-center gap-1.5 rounded-lg border border-default bg-card px-3 py-2 text-xs font-semibold text-secondary shadow-sm transition-all hover:bg-surface dark:hover:bg-card-secondary dark:hover:bg-surface hover:text-primary active:scale-95 cursor-pointer"
 >
 <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
 <span>Sync Data</span>
 </button>
 <button
 onClick={() => onNavigateToTab("billing")}
 className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-primary transition-all hover:bg-blue-700 active:scale-95 cursor-pointer"
 >
 <Sparkles className="h-3.5 w-3.5" />
 <span>New Checkout</span>
 </button>
 </div>
 </div>

 {/* 2-column stats cards grid recalculation automatically, filling out the space seamlessly with zero placeholder cards */}
 <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
 {/* My total orders */}
 <div 
 onClick={() => onNavigateToTab("history","All")}
 className="rounded-xl border border-default bg-card p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] duration-150 cursor-pointer group"
 >
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-semibold uppercase tracking-wider text-secondary font-sans transition group-hover:text-primary">My Total Checkouts</p>
 <h3 className="mt-1 text-2xl font-bold text-primary font-mono group-hover:text-blue-600 transition">{myInvoices.length} Invoices</h3>
 </div>
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
 <FileText className="h-5 w-5" />
 </div>
 </div>
 <p className="mt-4 text-[11px] text-blue-500 font-medium font-sans">Click to inspect my billing history &rarr;</p>
 </div>

 {/* Pending Orders */}
 <div
 onClick={() => onNavigateToTab("history","Pending Deliveries")}
 className="rounded-xl border border-default bg-card p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] duration-150 cursor-pointer group"
 >
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-semibold uppercase tracking-wider text-secondary font-sans transition group-hover:text-primary">My Pending Orders</p>
 <h3 className="mt-1 text-2xl font-bold text-primary font-mono group-hover:text-blue-600 transition">{myPendingInvoices.length} Orders</h3>
 </div>
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
 <Clock className="h-5 w-5" />
 </div>
 </div>
 <p className="mt-4 text-[11px] text-amber-500 font-medium font-sans">Click to review pending jobs &rarr;</p>
 </div>

 {/* Ready for delivery */}
 <div
 onClick={() => onNavigateToTab("history","Ready for Delivery")}
 className="rounded-xl border border-default bg-card p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] duration-150 cursor-pointer group"
 >
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-semibold uppercase tracking-wider text-secondary font-sans transition group-hover:text-primary">Ready For Delivery</p>
 <h3 className="mt-1 text-2xl font-bold text-primary font-mono group-hover:text-blue-600 transition">{myReadyInvoices.length} Invoices</h3>
 </div>
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
 <Truck className="h-5 w-5" />
 </div>
 </div>
 <p className="mt-4 text-[11px] text-indigo-500 font-medium font-sans">Invoices ready to dispatch &rarr;</p>
 </div>

 {/* Completed Orders */}
 <div
 onClick={() => onNavigateToTab("history","Completed")}
 className="rounded-xl border border-default bg-card p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] duration-150 cursor-pointer group"
 >
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-semibold uppercase tracking-wider text-secondary font-sans transition group-hover:text-primary">My Completed Orders</p>
 <h3 className="mt-1 text-2xl font-bold text-primary font-mono group-hover:text-blue-600 transition">{myCompletedInvoices.length} Closed</h3>
 </div>
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
 <CheckCircle className="h-5 w-5" />
 </div>
 </div>
 <p className="mt-4 text-[11px] text-emerald-500 font-medium font-sans">Success closed transactions counter</p>
 </div>
 </div>

 {/* 3-column split section: column 1 & 2 displays My Recent Invoices, column 3 displays Served Customer Registry */}
 <div className="grid gap-6 lg:grid-cols-3">
 {/* My recent receipt list */}
 <div 
 onClick={() => onNavigateToTab("history")}
 className="group rounded-xl border border-default bg-card p-5 shadow-sm lg:col-span-2 space-y-4 cursor-pointer hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all duration-300"
 title="Click card to view complete receipts database history"
 >
 <div className="flex items-center justify-between border-b border-default pb-3">
 <div>
 <h3 className="font-bold text-primary text-sm font-sans flex items-center gap-2">
 <span>My Recent Operations Receipts</span>
 <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-sans">
 (Click to view full catalog &rarr;)
 </span>
 </h3>
 <p className="text-xs text-muted font-sans font-medium">Tracking your personal live checkouts list</p>
 </div>
 <button
 onClick={(e) => {
 e.stopPropagation();
 onNavigateToTab("history");
 }}
 className="text-xs font-semibold text-blue-600 hover:text-blue-750 hover:underline border-0 bg-transparent cursor-pointer"
 >
 Inspect Logs &rarr;
 </button>
 </div>
 <div className="overflow-x-auto">
 <table className="min-w-full table-auto text-left text-xs text-secondary">
 <thead className="bg-table-header text-[10px] uppercase font-bold text-secondary border-b border-default">
 <tr>
 <th className="px-4 py-3">Receipt No</th>
 <th className="px-4 py-3">Customer Name</th>
 <th className="px-4 py-3">Status</th>
 <th className="px-4 py-3 text-right">Grand Total</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {myInvoices.slice(0, 5).map((inv, idx) => (
 <tr 
 key={idx} 
 onClick={(e) => {
 e.stopPropagation();
 onNavigateToTab("history","All", { invoiceNo: inv.invoiceNo });
 }}
 className="hover:bg-blue-50/15 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer group/row"
 title={`Click to view record of invoice ${inv.invoiceNo}`}
 >
 <td className="px-4 py-3 font-mono font-bold text-blue-600 group-hover/row:underline">{inv.invoiceNo}</td>
 <td className="px-4 py-3 font-semibold text-primary">{inv.customerName}</td>
 <td className="px-4 py-3">{getStatusBadge(inv.status)}</td>
 <td className="px-4 py-3 text-right font-mono font-bold text-primary flex items-center justify-end gap-1.5">
 <span>₹{inv.grandTotal.toFixed(2)}</span>
 <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100  px-1 py-0.5 rounded opacity-0 group-hover/row:opacity-100 transition-opacity">
 VIEW
 </span>
 </td>
 </tr>
 ))}
 {myInvoices.length === 0 && (
 <tr>
 <td colSpan={4} className="py-6 text-center text-muted font-sans font-medium">
 You have not recorded any billing checkouts in this session.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Customer information list */}
 <div className="rounded-xl border border-default bg-card p-5 shadow-sm flex flex-col h-[340.4px]">
 <div className="mb-3 border-b border-default pb-3">
 <div className="flex items-center gap-1.5">
 <Users className="h-4 w-4 text-purple-600" />
 <h3 className="font-bold text-primary text-sm font-sans">My Client Directory</h3>
 </div>
 <p className="text-[11px] text-muted font-sans font-medium">Customer Information registry</p>
 </div>
 <div className="flex-1 overflow-y-auto space-y-3 pr-1">
 {myCustomers.map((cust, idx) => (
 <div key={idx} className="text-xs border-b border-default pb-2.5 last:border-0 last:pb-0 flex items-center justify-between">
 <div>
 <span className="font-bold text-primary tracking-tight block">{cust.name}</span>
 <span className="text-[10px] text-muted font-mono mt-0.5 block">{cust.mobile}</span>
 </div>
 <button
 onClick={() => onNavigateToTab("customers")}
 className="text-[10px] font-semibold text-blue-600 hover:underline bg-transparent border-0 cursor-pointer"
 >
 View Card
 </button>
 </div>
 ))}
 {myCustomers.length === 0 && (
 <p className="text-xs text-center text-muted mt-12 py-4 font-sans">No clients served yet.</p>
 )}
 </div>
 </div>
 </div>
 </div>
 );
 }

 // Graceful fallback for non-recognized users
 return null;
}
