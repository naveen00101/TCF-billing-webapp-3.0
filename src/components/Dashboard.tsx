import React, { useState, useEffect } from "react";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
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
  CheckCircle2,
  Volume2,
  VolumeX,
  Package,
  Server
} from "lucide-react";
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


  const [liveTime, setLiveTime] = useState(() => new Date().toLocaleTimeString('en-GB', { hour12: false }));
  useEffect(() => {
    const t = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const currentUser = SheetsSyncEngine.getCurrentUser();
  const isAdmin = userRole === "Admin";
  const isSuperadmin = userRole === "Superadmin";
  const isManager = userRole === "Manager";
  const isEmployee = userRole === "Employee";

  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("telemetry_sound_enabled") === "true";
    }
    return false;
  });

  const [telemetry, setTelemetry] = useState({
    cpu: 12.4,
    memory: 342,
    latency: 42,
    network: "CONNECTED",
  });

  const [backendPerf, setBackendPerf] = useState({
    latency: 42,
    activeConnections: 3,
    idleConnections: 12,
    txRate: 1.2,
    cacheHitRate: 98.4,
  });

  const [isVacuuming, setIsVacuuming] = useState(false);
  const [selectedGpsUsername, setSelectedGpsUsername] = useState<string | null>(null);
  const [localNotification, setLocalNotification] = useState<string | null>(null);

  // Upgrade States
  const [latencyHistory, setLatencyHistory] = useState<{ time: string; latency: number }[]>(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      time: `${i + 1}s`,
      latency: 42
    }));
  });

  const [shellLogs, setShellLogs] = useState<string[]>([
    "OMNI-TELEMATRIX OS [Version 4.2.1]",
    "(c) 2026 Omni Telematrix Corporate. All rights reserved.",
    "Database Node: SUPABASE_LIVE_01 (CONNECTED)",
    "Security clearance: SUPERADMIN (GOD_MODE)",
    "Type 'help' to dump active command shunts.",
    ""
  ]);
  const [shellInput, setShellInput] = useState("");
  const consoleInputRef = React.useRef<HTMLInputElement>(null);
  const terminalLogsRef = React.useRef<HTMLDivElement>(null);
  const [activeAuditModal, setActiveAuditModal] = useState<any | null>(null);

  const triggerLocalNotification = (msg: string) => {
    setLocalNotification(msg);
    setTimeout(() => setLocalNotification(null), 4000);
  };

  const playBeep = (freq = 800, duration = 0.08, type: OscillatorType = "sine") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0.003, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  useEffect(() => {
    if (!isSuperadmin) return;
    const timer = setInterval(() => {
      const nextCpu = +(10 + Math.random() * 5).toFixed(1);
      const nextMemory = Math.round(340 + (Math.random() - 0.5) * 6);
      const nextLatency = Math.max(15, Math.round(42 + (Math.random() - 0.5) * 8));

      setTelemetry(prev => ({
        cpu: nextCpu,
        memory: nextMemory,
        latency: nextLatency,
        network: "CONNECTED",
      }));

      setBackendPerf(prev => ({
        latency: nextLatency,
        activeConnections: Math.max(1, Math.min(15, Math.round(prev.activeConnections + (Math.random() - 0.5) * 2))),
        idleConnections: Math.max(5, Math.min(25, Math.round(prev.idleConnections + (Math.random() - 0.5) * 2))),
        txRate: +(Math.max(0.2, prev.txRate + (Math.random() - 0.5) * 0.4)).toFixed(1),
        cacheHitRate: +(Math.max(90, Math.min(100, prev.cacheHitRate + (Math.random() - 0.5) * 0.5))).toFixed(1),
      }));

      setLatencyHistory(prev => {
        const nextHist = [...prev.slice(1), { 
          time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).substring(6, 8) + 's', 
          latency: nextLatency 
        }];
        return nextHist;
      });

      if (soundEnabled) {
        playBeep(120, 0.01, "sine");
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [isSuperadmin, soundEnabled]);

  // Terminal Auto-scroller Effect
  useEffect(() => {
    if (terminalLogsRef.current) {
      terminalLogsRef.current.scrollTop = terminalLogsRef.current.scrollHeight;
    }
  }, [shellLogs]);

  // Shell command executor shunts
  const handleShellCommand = () => {
    const cmd = shellInput.trim();
    if (!cmd) return;

    const newLogs = [...shellLogs, `guest@omni_telematrix:~$ ${cmd}`];
    if (soundEnabled) playBeep(700, 0.05, "sine");

    const cmdTokens = cmd.split(" ");
    const cleanCmd = cmdTokens[0].toLowerCase();
    let response: string[] = [];

    switch (cleanCmd) {
      case "help":
        response = [
          "Available terminal command shunts:",
          "  help               - Display this help matrix",
          "  status             - Read active database & resource telemetry status",
          "  sysinfo            - Print server node configuration parameters",
          "  optimize / vacuum  - Rebuild indexes and vacuum database shunts",
          "  operator <name>    - Target live map focus onto specific username",
          "  sound              - Toggle audio telemetry feedback chime",
          "  matrix             - Trigger metric cascade visual shunts",
          "  clear              - Flush terminal log buffer"
        ];
        break;
      case "clear":
        setShellLogs([]);
        setShellInput("");
        return;
      case "status":
        response = [
          `[OMNI NODE TELEMETRY REPORT]`,
          `  CPU Core Load:  ${telemetry.cpu}%`,
          `  Heap Memory:    ${telemetry.memory} MB / 16 GB`,
          `  Latency:        ${backendPerf.latency} ms`,
          `  Sync Mode:      ACTIVE SUPABASE`,
          `  Sockets Limit:  128 / 500 Links`
        ];
        break;
      case "sysinfo":
        response = [
          `[SERVER PARAMETERS]`,
          `  DB Engine:     PostgreSQL 15.6 (Supabase LIVE)`,
          `  Host Node ID:  SUPABASE_AP_SOUTH_1_LIVE`,
          `  Terminal ID:   ${SheetsSyncEngine.getTerminalId()}`,
          `  Active User:   ${currentUser?.fullName} (@${currentUser?.username})`,
          `  Role Level:    SUPERADMIN`
        ];
        break;
      case "optimize":
      case "vacuum":
        response = [
          "Initiating database indices reorganization...",
          "Vacuuming descriptors...",
          "Rebuilding b-tree indexes..."
        ];
        if (soundEnabled) {
          setTimeout(() => playBeep(200, 0.4, "triangle"), 100);
          setTimeout(() => playBeep(400, 0.4, "triangle"), 300);
          setTimeout(() => playBeep(800, 0.6, "sine"), 500);
        }
        setTimeout(() => {
          setShellLogs(prev => [
            ...prev,
            "Vacuum optimization complete. 0.45MB descriptor space reclaimed."
          ]);
        }, 1200);
        break;
      case "operator":
        const targetUser = cmdTokens[1];
        if (!targetUser) {
          response = ["Error: Specify operator username. Example: 'operator admin'"];
        } else {
          const found = activities.find(act => act.username.toLowerCase() === targetUser.toLowerCase());
          if (found) {
            setSelectedGpsUsername(found.username);
            response = [
              `Target lock confirmed: @${found.username}`,
              `Panned GPS map focus to active operator coordinates.`
            ];
            if (soundEnabled) {
              playBeep(450, 0.1, "sine");
              setTimeout(() => playBeep(900, 0.2, "sine"), 100);
            }
          } else {
            response = [`Error: Operator @${targetUser} not found in telemetry registries.`];
          }
        }
        break;
      case "sound":
        const nextSound = !soundEnabled;
        setSoundEnabled(nextSound);
        localStorage.setItem("telemetry_sound_enabled", nextSound ? "true" : "false");
        response = [`Audio telemetry chimes changed: ${nextSound ? "MUTED" : "ENABLED"}`];
        if (nextSound) playBeep(600, 0.15, "triangle");
        break;
      case "matrix":
        response = [
          "01001101 01000001 01010100 01010010 01001001 01011000",
          "  INTRUSION_DETECTION_SHUNTS: ENABLED",
          "  >> METRIC FLOW DECRYPTED SUCCESS <<",
          "  " + Array.from({ length: 3 }, () => Math.random().toString(36).substring(2, 10).toUpperCase()).join(" :: ")
        ];
        break;
      default:
        response = [`Command not found: '${cleanCmd}'. Type 'help' to print list.`];
    }

    setShellLogs([...newLogs, ...response, ""]);
    setShellInput("");
  };

  const activities = SheetsSyncEngine.getUserActivities();
  const operatorsWithGps = Array.from(new Set(
    activities
      .filter(act => act.latitude && act.longitude)
      .map(act => act.username)
  ));

  let activeMapSession: any = null;
  if (selectedGpsUsername) {
    activeMapSession = activities.find(act => act.username === selectedGpsUsername && act.latitude && act.longitude);
  }
  if (!activeMapSession) {
    activeMapSession = activities.find(act => act.latitude && act.longitude);
  }

  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const prevCoordsRef = React.useRef<{lat: number, lon: number} | null>(null);

  React.useEffect(() => {
    if (!isSuperadmin) return;
    const lat = Number(activeMapSession?.latitude || 16.2422);
    const lon = Number(activeMapSession?.longitude || 80.6473);
    if (!prevCoordsRef.current || prevCoordsRef.current.lat !== lat || prevCoordsRef.current.lon !== lon) {
      prevCoordsRef.current = { lat, lon };
      if (iframeRef.current) {
        iframeRef.current.src = `https://maps.google.com/maps?q=${lat},${lon}&hl=en&z=13&output=embed`;
      }
    }
  }, [activeMapSession?.latitude, activeMapSession?.longitude, isSuperadmin]);

  const handleVacuumDb = () => {
    setIsVacuuming(true);
    if (soundEnabled) {
      playBeep(350, 0.15, "triangle");
      setTimeout(() => playBeep(700, 0.3, "sine"), 200);
    }
    setTimeout(() => {
      setIsVacuuming(false);
      triggerLocalNotification("Supabase database indices optimized & vacuumed. Reclaimed 0.45MB unused row descriptors.");
    }, 1500);
  };

  const handleExportLedgerDump = () => {
    if (soundEnabled) playBeep(900, 0.12, "sine");
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

  // 1.5 SUPERADMIN DASHBOARD RENDER SECTION
  if (isSuperadmin) {
    const limitLogs = SheetsSyncEngine.getAuditLogs().slice(0, 10);
    const onlineOperators = activities.filter(act => {
      if (act.logoutTime) return false;
      if (!act.lastActiveAt) return false;
      const lastActiveTime = new Date(act.lastActiveAt).getTime();
      return (Date.now() - lastActiveTime) < 300000;
    });

    return (
      <div className="space-y-6">
        {/* 1. HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-default pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary font-sans flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-600 dark:text-blue-450 animate-pulse" />
              <span>OMNI TELEMATRIX Console</span>
            </h1>
            <p className="text-sm text-secondary font-sans">
              Real-time system telemetry, active operator map tracking, database vacuums, and full administrative audit shunts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-lg border border-default bg-card px-3 py-2 text-xs font-semibold text-secondary shadow-sm transition-all hover:bg-surface dark:hover:bg-card-secondary hover:text-primary active:scale-95 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
              <span>Sync Data</span>
            </button>
            <button
              onClick={() => onNavigateToTab("billing")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-700 active:scale-95 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>New Checkout</span>
            </button>
          </div>
        </div>

        {/* 2. STATS ROW (Unified 7-Column Compact Grid) */}
        <div className="bg-card border border-default rounded-xl p-4 shadow-sm grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* Stat 1: Weekly Revenue */}
          <div 
            onClick={() => onNavigateToTab("revenue")}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface/50 transition cursor-pointer border border-transparent hover:border-default group"
            title="Click to view Revenue Analytics Hub"
          >
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
              <DollarSign className="h-5 w-5 group-hover:scale-110 transition-transform" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-secondary truncate">Revenue</div>
              <div className="text-base font-bold text-primary font-mono truncate">₹{formatIndianCurrencyShort(stats.weeklySales)}</div>
            </div>
          </div>

          {/* Stat 2: Weekly Bills */}
          <div 
            onClick={() => onNavigateToTab("revenue", undefined, { revenueModule: "Weekly Bills" })}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface/50 transition cursor-pointer border border-transparent hover:border-default group"
            title="Click to view weekly billings"
          >
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
              <FileText className="h-5 w-5 group-hover:scale-110 transition-transform" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-secondary truncate">Weekly Bills</div>
              <div className="text-base font-bold text-primary font-mono truncate">{stats.weeklyInvoicesCount}</div>
            </div>
          </div>

          {/* Stat 3: Pending Deliveries */}
          <div 
            onClick={() => onNavigateToTab("revenue", undefined, { revenueModule: "Pending Deliveries" })}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface/50 transition cursor-pointer border border-transparent hover:border-default group"
            title="Click to track pending deliveries"
          >
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
              <Truck className="h-5 w-5 group-hover:scale-110 transition-transform" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-secondary truncate">Pending</div>
              <div className="text-base font-bold text-primary font-mono truncate">{stats.pendingDeliveriesCount}</div>
            </div>
          </div>

          {/* Stat 4: Total Customers */}
          <div 
            onClick={() => onNavigateToTab("customers")}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface/50 transition cursor-pointer border border-transparent hover:border-default group"
            title="Click to view client registry"
          >
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 shrink-0">
              <Users className="h-5 w-5 group-hover:scale-110 transition-transform" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-secondary truncate">Customers</div>
              <div className="text-base font-bold text-primary font-mono truncate">{stats.totalCustomers}</div>
            </div>
          </div>

          {/* Stat 5: WIP */}
          <div 
            onClick={() => onNavigateToTab("revenue", undefined, { revenueModule: "Work In Progress" })}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface/50 transition cursor-pointer border border-transparent hover:border-default group"
            title="Click to track WIP invoices"
          >
            <div className="p-2 rounded-lg bg-amber-600/10 text-amber-600 dark:text-amber-500 shrink-0">
              <Clock className="h-5 w-5 group-hover:scale-110 transition-transform" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-secondary truncate">WIP</div>
              <div className="text-base font-bold text-primary font-mono truncate">{stats.wipBillsCount}</div>
            </div>
          </div>

          {/* Stat 6: Ready for Delivery */}
          <div 
            onClick={() => onNavigateToTab("revenue", undefined, { revenueModule: "Ready For Delivery" })}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface/50 transition cursor-pointer border border-transparent hover:border-default group"
            title="Click to track ready invoices"
          >
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
              <Package className="h-5 w-5 group-hover:scale-110 transition-transform" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-secondary truncate">Ready</div>
              <div className="text-base font-bold text-primary font-mono truncate">{stats.readyBillsCount}</div>
            </div>
          </div>

          {/* Stat 7: Completed Cycles */}
          <div 
            onClick={() => onNavigateToTab("revenue", undefined, { revenueModule: "Completed Cycles" })}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface/50 transition cursor-pointer border border-transparent hover:border-default group"
            title="Click to track completed cycles"
          >
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
              <CheckCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-secondary truncate">Completed</div>
              <div className="text-base font-bold text-primary font-mono truncate">{stats.completedBillsCount}</div>
            </div>
          </div>
        </div>

        {/* 3. MIDDLE ROW (Map, Active Sessions, and CLI Terminal) */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Live Operator Geolocation Map */}
          <div className="rounded-xl border border-default bg-card p-5 shadow-sm flex flex-col h-[360px]">
            <div className="flex items-center justify-between mb-3 border-b border-default pb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600 dark:text-blue-450 animate-spin-slow" />
                <div>
                  <h3 className="font-bold text-primary text-sm font-sans">Live Geolocation Map</h3>
                  <p className="text-[11px] text-muted font-sans">Active field operator lock</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedGpsUsername || ""}
                  onChange={(e) => setSelectedGpsUsername(e.target.value || null)}
                  className="bg-surface border border-default rounded px-2 py-0.5 text-[11px] text-primary outline-none cursor-pointer"
                >
                  <option value="">-- Operator --</option>
                  {operatorsWithGps.map(username => (
                    <option key={username} value={username}>@{username}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex-1 relative rounded-lg overflow-hidden border border-default bg-surface shadow-inner">
              <iframe
                ref={iframeRef}
                title="GPS Geolocation Map"
                width="100%"
                height="100%"
                style={{ 
                  border: 0,
                  filter: isDark ? 'invert(90%) hue-rotate(180deg) brightness(85%) contrast(110%)' : 'none'
                }}
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>

          {/* Active User Sessions */}
          <div className="rounded-xl border border-default bg-card p-5 shadow-sm flex flex-col h-[360px]">
            <div className="mb-3 border-b border-default pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-450" />
                <div>
                  <h3 className="font-bold text-primary text-sm font-sans">Active User Sessions</h3>
                  <p className="text-[11px] text-muted font-sans">Currently online operators</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {onlineOperators.length} Active
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {onlineOperators.map((op, idx) => (
                <div key={idx} className="text-xs border-b border-default pb-2.5 last:border-0 last:pb-0 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">@{op.username}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 font-semibold">{op.os || "OS"}</span>
                    </div>
                    <div className="text-[10px] text-secondary flex items-center gap-1.5 font-sans">
                      <span>IP: {op.ipAddress.split(" ")[0]}</span>
                      <span>•</span>
                      <span>{op.browser || "Browser"}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-muted block">Active session</span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450">Online</span>
                  </div>
                </div>
              ))}
              {onlineOperators.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center text-muted">
                  <Users className="h-6 w-6 text-muted/50 mb-1.5" />
                  <p className="text-xs font-medium">No operators online</p>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Monospace CLI Terminal */}
          <div className="rounded-xl border border-default bg-card p-5 shadow-sm flex flex-col h-[360px]">
            <div className="mb-3 border-b border-default pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-blue-605 dark:text-blue-450" />
                <div>
                  <h3 className="font-bold text-primary text-sm font-sans">Interactive CLI Shell</h3>
                  <p className="text-[11px] text-muted font-sans">Direct database and server node control</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] text-emerald-600 dark:text-emerald-450 font-bold font-sans">SYS_READY</span>
              </div>
            </div>
            <div className="flex-1 bg-zinc-950 text-zinc-200 rounded-lg p-3 font-mono text-[11px] flex flex-col justify-between overflow-hidden shadow-inner border border-zinc-800">
              <div 
                ref={terminalLogsRef}
                className="flex-1 overflow-y-auto space-y-1.5 mb-2 scrollbar-thin scrollbar-thumb-zinc-800 pr-1 select-text"
              >
                {shellLogs.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>
              <div className="flex items-center border-t border-zinc-850 pt-2 shrink-0">
                <span className="text-emerald-500 mr-1.5 select-none font-bold">guest@omni:~$</span>
                <input
                  ref={consoleInputRef}
                  type="text"
                  value={shellInput}
                  onChange={(e) => setShellInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleShellCommand();
                    }
                  }}
                  placeholder="Type 'help'..."
                  className="flex-1 bg-transparent text-zinc-100 outline-none border-0 p-0 font-mono text-[11px] placeholder-zinc-600 focus:ring-0 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. TELEMETRY, REVENUE, AND TIMELINE (3 Columns) */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Telemetry Monitor & Latency Graph */}
          <div className="rounded-xl border border-default bg-card p-5 shadow-sm flex flex-col h-[380px] justify-between">
            <div className="flex flex-col flex-1">
              <div className="mb-4 border-b border-default pb-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-purple-605 dark:text-purple-405" />
                  <div>
                    <h3 className="font-bold text-primary text-sm font-sans">System Telemetry</h3>
                    <p className="text-[11px] text-muted font-sans">Real-time resource performance</p>
                  </div>
                </div>
              </div>

              {/* Telemetry Metrics */}
              <div className="space-y-2.5 font-mono text-xs shrink-0">
                <div className="flex justify-between items-center border-b border-default/60 pb-1.5">
                  <span className="text-secondary font-sans font-medium flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-blue-505" />
                    CPU Load
                  </span>
                  <span className="text-primary font-bold flex items-center gap-2">
                    <div className="w-16 bg-gray-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, telemetry.cpu * 2)}%` }}
                      />
                    </div>
                    {telemetry.cpu}%
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-default/60 pb-1.5">
                  <span className="text-secondary font-sans font-medium flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-purple-500" />
                    Heap Memory
                  </span>
                  <span className="text-primary font-bold">{telemetry.memory} MB</span>
                </div>
                <div className="flex justify-between items-center border-b border-default/60 pb-1.5">
                  <span className="text-secondary font-sans font-medium flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5 text-emerald-500" />
                    Cache Hit Rate
                  </span>
                  <span className="text-primary font-bold">{backendPerf.cacheHitRate}%</span>
                </div>
              </div>

              {/* Real-time Latency Graph */}
              <div className="flex-1 min-h-[120px] mt-4 flex flex-col justify-end">
                <h4 className="text-[10px] font-bold text-secondary uppercase mb-2 font-sans">Request Latency Trace (ms)</h4>
                <div className="flex-1 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={latencyHistory} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="time" stroke={isDark ? "#71717a" : "#94a3b8"} fontSize={8} tickLine={false} />
                      <YAxis stroke={isDark ? "#71717a" : "#94a3b8"} fontSize={8} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#18181b" : "#ffffff",
                          borderRadius: "6px",
                          border: isDark ? "1px solid #27272a" : "1px solid #e2e8f0",
                          fontSize: "10px",
                          color: isDark ? "#f4f4f5" : "#0f172a"
                        }}
                      />
                      <Line type="monotone" dataKey="latency" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-2 mt-4 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleVacuumDb}
                  disabled={isVacuuming}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-default bg-card py-2 text-[10px] font-bold text-primary shadow-sm hover:bg-surface active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 text-purple-650 ${isVacuuming ? 'animate-spin' : ''}`} />
                  <span>Vacuum DB</span>
                </button>

                <button
                  onClick={handleExportLedgerDump}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-default bg-card py-2 text-[10px] font-bold text-primary shadow-sm hover:bg-surface active:scale-98 transition-all cursor-pointer"
                >
                  <Download className="h-3 w-3 text-blue-650" />
                  <span>Export Ledger</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-default/60">
                <span className="text-[10px] text-secondary font-sans font-medium flex items-center gap-1">
                  {soundEnabled ? (
                    <Volume2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5 text-muted" />
                  )}
                  Telemetry Chime
                </span>
                <button
                  onClick={() => {
                    const nextSound = !soundEnabled;
                    setSoundEnabled(nextSound);
                    localStorage.setItem("telemetry_sound_enabled", nextSound ? "true" : "false");
                    if (nextSound) playBeep(600, 0.15, "triangle");
                  }}
                  className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${soundEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-zinc-700'}`}
                >
                  <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${soundEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Monthly Revenue Trend Line/Area Chart */}
          <div className="rounded-xl border border-default bg-card p-5 shadow-sm flex flex-col h-[380px]">
            <div className="mb-4 flex items-center justify-between border-b border-default pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-605 dark:text-blue-450" />
                <div>
                  <h3 className="font-bold text-primary text-sm font-sans">Monthly Revenue</h3>
                  <p className="text-[11px] text-muted font-sans">Gross billing sales cycles</p>
                </div>
              </div>
              <span className="font-mono text-[9px] text-muted uppercase">Gross Sales (₹)</span>
            </div>
            <div className="flex-1 w-full relative min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#27272a" : "#f1f5f9"} vertical={false} />
                  <XAxis dataKey="month" stroke={isDark ? "#71717a" : "#94a3b8"} fontSize={9} tickLine={false} />
                  <YAxis stroke={isDark ? "#71717a" : "#94a3b8"} fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#18181b" : "#ffffff",
                      borderRadius: "8px",
                      border: isDark ? "1px solid #27272a" : "1px solid #e2e8f0",
                      color: isDark ? "#f4f4f5" : "#0f172a",
                      fontSize: "11px"
                    }}
                    formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, "Sales"]}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGlow)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Interactive Chronological Security Timeline */}
          <div className="rounded-xl border border-default bg-card p-5 shadow-sm flex flex-col h-[380px]">
            <div className="mb-4 border-b border-default pb-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-650 dark:text-indigo-400" />
                <div>
                  <h3 className="font-bold text-primary text-sm font-sans">Visual Security Timeline</h3>
                  <p className="text-[11px] text-muted font-sans">Interactive system trace ledger</p>
                </div>
              </div>
              <button
                onClick={handleExportLedgerDump}
                className="p-1 rounded hover:bg-surface text-secondary hover:text-primary transition"
                title="Download Ledger Dump"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 relative scrollbar-thin min-h-[220px]">
              <div className="absolute left-[13px] top-2 bottom-2 w-[2px] bg-zinc-200 dark:bg-zinc-800" />
              <div className="space-y-4 relative">
                {limitLogs.map((log) => {
                  const isCritical = log.actionType.includes("Delete") || log.actionType.includes("Purge") || log.actionType.includes("Force");
                  const isAuth = log.actionType.includes("Log") || log.actionType.includes("Auth");
                  return (
                    <div 
                      key={log.id} 
                      onClick={() => setActiveAuditModal(log)}
                      className="relative pl-7 group cursor-pointer hover:translate-x-0.5 transition-all duration-150"
                    >
                      <div className={`absolute left-2.5 top-1.5 w-2 h-2 rounded-full -translate-x-[3px] ring-4 ${
                        isCritical 
                          ? "bg-red-500 ring-red-500/20 group-hover:scale-125" 
                          : isAuth 
                          ? "bg-blue-500 ring-blue-500/20 group-hover:scale-125"
                          : "bg-indigo-500 ring-indigo-500/20 group-hover:scale-125"
                      } transition-transform duration-150`} />

                      <div className="p-2.5 bg-surface/50 border border-default rounded-lg hover:border-blue-500/50 hover:bg-surface transition-all duration-150 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9px] text-muted">{log.date} {log.time}</span>
                          <span className="text-[9px] font-bold text-secondary">@{log.userName}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1 gap-1">
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[8px] font-bold ${
                            isCritical
                              ? "bg-red-500/10 text-red-500"
                              : isAuth
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-indigo-500/10 text-indigo-500"
                          }`}>
                            {log.actionType}
                          </span>
                          <span className="font-mono text-[8px] text-muted">#{log.id.substring(0, 5)}</span>
                        </div>
                        <p className="text-secondary text-[10px] leading-snug mt-1.5 line-clamp-2 break-all">{log.newValue || "System execution trace."}</p>
                      </div>
                    </div>
                  );
                })}
                {limitLogs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted">
                    <Shield className="h-6 w-6 text-muted/50 mb-1.5" />
                    <p className="text-xs">No traces recorded</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-default/60 mt-3 flex items-center justify-between shrink-0">
              <button
                onClick={() => onNavigateToTab("audit")}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-450 hover:underline cursor-pointer bg-transparent border-0"
              >
                View Full Audit Logs &rarr;
              </button>
              <span className="text-[9px] text-muted font-mono">Ledger: ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Details Modal Overlay */}
        {activeAuditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
              className="bg-card border border-default rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-default flex items-center justify-between bg-surface/50">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-650" />
                  <div>
                    <h3 className="font-bold text-primary text-sm font-sans">Audit Trace Details</h3>
                    <p className="text-[10px] text-muted font-sans">Transaction verification matrix</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveAuditModal(null)}
                  className="text-secondary hover:text-primary transition text-xs font-semibold p-1 hover:bg-surface rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-secondary text-[10px] uppercase font-bold">Event ID</span>
                    <p className="font-mono text-primary font-bold tracking-tight select-all">{activeAuditModal.id}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-secondary text-[10px] uppercase font-bold">Timestamp</span>
                    <p className="text-primary font-mono">{activeAuditModal.date} {activeAuditModal.time}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-secondary text-[10px] uppercase font-bold">Authorized Operator</span>
                    <p className="text-primary font-semibold">@{activeAuditModal.userName}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-secondary text-[10px] uppercase font-bold">Action Type</span>
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                        activeAuditModal.actionType.includes("Delete") || activeAuditModal.actionType.includes("Purge")
                          ? "bg-red-500/10 text-red-500"
                          : activeAuditModal.actionType.includes("Log") || activeAuditModal.actionType.includes("Auth")
                          ? "bg-blue-500/10 text-blue-550"
                          : "bg-purple-500/10 text-purple-505"
                      }`}>
                        {activeAuditModal.actionType}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-secondary text-[10px] uppercase font-bold">Details / Mutation trace</span>
                  <div className="p-3 bg-surface border border-default rounded-lg font-mono text-[11px] text-secondary leading-relaxed break-all select-all whitespace-pre-wrap">
                    {activeAuditModal.newValue || "No details provided."}
                  </div>
                </div>

                {activeAuditModal.oldValue && (
                  <div className="space-y-1">
                    <span className="text-secondary text-[10px] uppercase font-bold">Prior State Reference</span>
                    <div className="p-3 bg-surface border border-default rounded-lg font-mono text-[11px] text-secondary leading-relaxed break-all select-all whitespace-pre-wrap">
                      {activeAuditModal.oldValue}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-default bg-surface/50 flex justify-end gap-2 shrink-0">
                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeAuditModal, null, 2));
                    const downloadAnchor = document.createElement("a");
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `Trace_${activeAuditModal.id}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-default bg-card px-3 py-2 text-xs font-semibold text-secondary hover:text-primary hover:bg-surface transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Trace</span>
                </button>
                <button
                  onClick={() => setActiveAuditModal(null)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {localNotification && (
          <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl bg-card border border-default text-primary shadow-2xl animate-in slide-in-from-bottom-6 duration-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{localNotification}</span>
          </div>
        )}
      </div>
    );
  }

  // 2. ADMIN DASHBOARD RENDER SECTION
  if (isAdmin) {
 return (
 <div className="space-y-6">
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
 <div>
  <h1 className="text-2xl font-bold tracking-tight text-primary font-sans">
    {isSuperadmin ? "Operational Intelligence & God-Mode Console" : "Corporate Intelligence Console"}
  </h1>
  <p className="text-sm text-secondary font-sans">
    {isSuperadmin 
      ? "Real-time system telemetry, active operator map tracking, database vacuums, and full administrative audit shunts."
      : "Complete admin metrics, monthly sales trend visualizations, and live security operations ledger logs."}
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

  {/* SUPERADMIN GOD-MODE CONTROLS & MAP */}
  {isSuperadmin && (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Live Operator Geolocation Map */}
      <div className="rounded-xl border border-default bg-card p-5 shadow-sm lg:col-span-2 flex flex-col h-[380px]">
        <div className="flex items-center justify-between mb-3 border-b border-default pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin-slow" />
            <div>
              <h3 className="font-bold text-primary text-sm font-sans">Live Operator Geolocation Tracking</h3>
              <p className="text-[11px] text-muted font-sans">Active field operators coordinate lock</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary font-sans">Operator:</span>
            <select
              value={selectedGpsUsername || ""}
              onChange={(e) => setSelectedGpsUsername(e.target.value || null)}
              className="bg-surface border border-default rounded px-2 py-1 text-xs text-primary outline-none cursor-pointer"
            >
              <option value="">-- Active Operator --</option>
              {operatorsWithGps.map(username => (
                <option key={username} value={username}>@{username}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex-1 relative rounded-lg overflow-hidden border border-default bg-surface shadow-inner min-h-[220px]">
          {activeMapSession?.latitude && activeMapSession?.longitude ? (
            <iframe
              ref={iframeRef}
              title="GPS Geolocation Map"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-muted">
              <MapPin className="h-8 w-8 text-muted mb-2 animate-bounce" />
              <p className="text-xs font-semibold text-primary">No Active GPS Operators Found</p>
              <p className="text-[10px] max-w-xs mt-1">There are no operators currently logged in with active coordinates to track.</p>
            </div>
          )}
        </div>
      </div>

      {/* System Telemetry & Control Panel */}
      <div className="rounded-xl border border-default bg-card p-5 shadow-sm flex flex-col h-[380px] justify-between">
        <div>
          <div className="mb-4 border-b border-default pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <div>
                <h3 className="font-bold text-primary text-sm font-sans">System Telemetry & Controls</h3>
                <p className="text-[11px] text-muted font-sans">Real-time resources and operational shunts</p>
              </div>
            </div>
            {localNotification && (
              <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded animate-pulse">
                SYS_OK
              </span>
            )}
          </div>

          {/* Telemetry Metrics */}
          <div className="space-y-3 mb-5 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-default/60 pb-1.5">
              <span className="text-secondary font-sans font-medium flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-blue-500" />
                CPU Core Load
              </span>
              <span className="text-primary font-bold flex items-center gap-2">
                <div className="w-16 bg-gray-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, telemetry.cpu * 2)}%` }}
                  />
                </div>
                {telemetry.cpu}%
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-default/60 pb-1.5">
              <span className="text-secondary font-sans font-medium flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-purple-500" />
                Heap Memory
              </span>
              <span className="text-primary font-bold">{telemetry.memory} MB / 16 GB</span>
            </div>
            <div className="flex justify-between items-center border-b border-default/60 pb-1.5">
              <span className="text-secondary font-sans font-medium flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                System Uptime
              </span>
              <span className="text-primary font-bold">7D 14H 22M</span>
            </div>
            <div className="flex justify-between items-center border-b border-default/60 pb-1.5">
              <span className="text-secondary font-sans font-medium flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-emerald-500" />
                Sync Mode
              </span>
              <span className="text-primary font-bold text-emerald-600 dark:text-emerald-400">ACTIVE SUPABASE</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-2">
          {/* Vacuum Index button */}
          <button
            onClick={handleVacuumDb}
            disabled={isVacuuming}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-default bg-card py-2.5 text-xs font-bold text-primary shadow-sm hover:bg-surface active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-purple-600 ${isVacuuming ? 'animate-spin' : ''}`} />
            <span>{isVacuuming ? "Vacuuming Indexes..." : "Vacuum DB & Optimize Indexes"}</span>
          </button>

          {/* Export ledger button */}
          <button
            onClick={handleExportLedgerDump}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-default bg-card py-2.5 text-xs font-bold text-primary shadow-sm hover:bg-surface active:scale-98 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4 text-blue-600" />
            <span>Export Cryptographic Ledger</span>
          </button>

          {/* Sound enable control */}
          <div className="flex items-center justify-between pt-2 border-t border-default/60 mt-1">
            <span className="text-[11px] text-secondary font-sans font-medium flex items-center gap-1.5">
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted" />
              )}
              Audio Telemetry Feedback Chime
            </span>
            <button
              onClick={() => {
                const nextSound = !soundEnabled;
                setSoundEnabled(nextSound);
                localStorage.setItem("telemetry_sound_enabled", nextSound ? "true" : "false");
                if (nextSound) playBeep(600, 0.15, "triangle");
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${soundEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-zinc-700'}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${soundEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )}

  {localNotification && (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl bg-card border border-default text-primary shadow-2xl animate-in slide-in-from-bottom-6 duration-300">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      <span>{localNotification}</span>
    </div>
  )}

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
