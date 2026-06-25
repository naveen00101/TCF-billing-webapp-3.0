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
  CheckCircle2,
  Volume2,
  VolumeX
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

  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("telemetry_sound_enabled") === "true";
    }
    return false;
  });

  // Telemetry simulation state for Superadmin God-mode Dashboard
  const [telemetry, setTelemetry] = useState({
    cpu: 12.4,
    memory: 342,
    latency: 42,
    network: "CONNECTED",
  });

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

  const [shellLogs, setShellLogs] = useState<string[]>([
    "TCF-Core OS [Version 3.0.45]",
    "(c) 2026 Tenali Central Furniture. All rights reserved.",
    "System security clearance: SUPERUSER",
    "Database link: SUPABASE_LIVE_NODE_01 (CONNECTED)",
    "Type 'help' to display available command vector list.",
    ""
  ]);
  const [shellInput, setShellInput] = useState("");
  const consoleInputRef = React.useRef<HTMLInputElement>(null);
  const terminalLogsRef = React.useRef<HTMLDivElement>(null);

  const handleShellCommand = () => {
    const cmd = shellInput.trim();
    if (!cmd) return;

    const newLogs = [...shellLogs, `guest@tcf_core:~$ ${cmd}`];
    if (soundEnabled) playBeep(700, 0.05, "sine");

    const cmdTokens = cmd.split(" ");
    const cleanCmd = cmdTokens[0].toLowerCase();
    let response: string[] = [];

    switch (cleanCmd) {
      case "help":
        response = [
          "Available terminal command shunts:",
          "  help               - Show this interface",
          "  status             - Read current node telemetry metrics",
          "  sysinfo            - Print database node system parameters",
          "  logs               - Dump recent security audit indices",
          "  optimize           - Execute database indexing shunts (vacuum)",
          "  operator <name>    - Lock GPS map tracking onto active operator",
          "  teleport <name>    - Lock GPS map tracking onto active operator",
          "  sound              - Toggle audio telemetry feedback chime status",
          "  matrix             - Trigger scrolling digital intrusion shunts",
          "  trash              - Query soft deleted items and auto-purge status",
          "  clear              - Clear console display buffer"
        ];
        break;
      case "clear":
        setShellLogs([]);
        setShellInput("");
        return;
      case "status":
        response = [
          `[NODE STATUS REPORT]`,
          `  CPU Load:      ${telemetry.cpu}%`,
          `  Heap Alloc:    ${telemetry.memory} MB`,
          `  Latency:       ${telemetry.latency} ms`,
          `  Connection:    CONNECTED`,
          `  Access level:  GOD_MODE`
        ];
        break;
      case "sysinfo":
        response = [
          `[SYSTEM INDEX]`,
          `  Host Node ID:  SUPABASE_MAIN_01`,
          `  Region:        AP-SOUTH-1`,
          `  DB Engine:     PostgreSQL 15.6 (Supabase)`,
          `  Terminal ID:   ${SheetsSyncEngine.getTerminalId()}`,
          `  Current User:  ${currentUser?.fullName} (@${currentUser?.username})`,
          `  Active Role:   ${currentUser?.role}`
        ];
        break;
      case "logs":
        const rawLogs = SheetsSyncEngine.getAuditLogs().slice(0, 3);
        if (rawLogs.length === 0) {
          response = ["No security records found in database."];
        } else {
          response = ["Recent Audit Traces:"];
          rawLogs.forEach(l => {
            response.push(`  [${l.time}] ${l.actionType} by @${l.userName} (${l.id})`);
          });
        }
        break;
      case "optimize":
        response = [
          "Launching database indexing optimization shunt...",
          "Vacuuming descriptors...",
          "Rebuilding indexes..."
        ];
        if (soundEnabled) {
          setTimeout(() => playBeep(200, 0.4, "triangle"), 100);
          setTimeout(() => playBeep(400, 0.4, "triangle"), 300);
          setTimeout(() => playBeep(800, 0.6, "sine"), 500);
        }
        setTimeout(() => {
          setShellLogs(prev => [
            ...prev,
            "Optimization complete. Reclaimed 0.45MB unused row descriptors."
          ]);
        }, 1200);
        break;
      case "operator":
      case "teleport":
        const targetUser = cmdTokens[1];
        if (!targetUser) {
          response = ["Error: Please specify operator username (e.g. 'operator admin')."];
        } else {
          const liveActs = SheetsSyncEngine.getUserActivities();
          const found = liveActs.find(act => act.username.toLowerCase() === targetUser.toLowerCase());
          if (found) {
            setSelectedGpsUsername(found.username);
            response = [
              `Target locked: @${found.username}`,
              `Resolving telemetry coordinates...`,
              `Location: ${found.locationName || "Unknown"}`,
              `Coords: ${found.latitude}, ${found.longitude}`,
              `Map focus synchronized.`
            ];
            if (soundEnabled) {
              playBeep(450, 0.1, "sine");
              setTimeout(() => playBeep(900, 0.2, "sine"), 100);
            }
          } else {
            response = [`Error: Operator @${targetUser} not found in telemetry registry.`];
          }
        }
        break;
      case "sound":
        const nextSound = !soundEnabled;
        setSoundEnabled(nextSound);
        localStorage.setItem("telemetry_sound_enabled", nextSound ? "true" : "false");
        response = [`Sound output state changed: ${nextSound ? "ACTIVE" : "MUTED"}`];
        if (nextSound) playBeep(600, 0.15, "triangle");
        break;
      case "matrix":
      case "rain":
        response = [
          "01001101 01000001 01010100 01010010 01001001 01011000",
          "  SYSTEM: INTRUSION_DETECTION_SHUNTS: ACTIVE",
          "  [x] DECRYPTING ENVELOPE SECTORS...",
          "  [x] REROUTING SUBNET INJECTORS...",
          "  [x] VACUUMING TEMPORARY REGISTERS...",
          "  >> OMNI CORE TELEMETRY RECONCILIATION COMPLETED <<",
          "  " + Array.from({ length: 4 }, () => Math.random().toString(36).substring(2, 15).toUpperCase()).join(" :: ")
        ];
        if (soundEnabled) {
          playBeep(800, 0.05, "triangle");
          setTimeout(() => playBeep(600, 0.05, "triangle"), 80);
          setTimeout(() => playBeep(1000, 0.05, "triangle"), 160);
        }
        break;
      case "trash":
        const trashItems = SheetsSyncEngine.getInvoices().filter(inv => inv.isSoftDeleted || inv.status === "Deleted");
        response = [
          `[TRASH RETENTION ENGINE]`,
          `  Soft deleted rows: ${trashItems.length}`,
          `  Retention policy:  ${localStorage.getItem("trash_retention_days") || "Disabled"}`
        ];
        break;
      default:
        response = [`Command not found: '${cleanCmd}'. Type 'help' for command vector list.`];
    }

    setShellLogs([...newLogs, ...response, ""]);
    setShellInput("");
  };

  const [localNotification, setLocalNotification] = useState<string | null>(null);
  const [isVacuuming, setIsVacuuming] = useState(false);
  const [selectedGpsUsername, setSelectedGpsUsername] = useState<string | null>(null);

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
      if (soundEnabled) {
        playBeep(120, 0.01, "sine");
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [isSuperadmin, soundEnabled]);

  // Auto-scroll terminal logs to bottom
  useEffect(() => {
    if (terminalLogsRef.current) {
      terminalLogsRef.current.scrollTop = terminalLogsRef.current.scrollHeight;
    }
  }, [shellLogs]);

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
  const activities = SheetsSyncEngine.getUserActivities();
  const limitLogs = SheetsSyncEngine.getAuditLogs().slice(0, 5);

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
    if (!activeMapSession?.latitude || !activeMapSession?.longitude) return;
    const lat = Number(activeMapSession.latitude);
    const lon = Number(activeMapSession.longitude);
    if (!prevCoordsRef.current || prevCoordsRef.current.lat !== lat || prevCoordsRef.current.lon !== lon) {
      prevCoordsRef.current = { lat, lon };
      if (iframeRef.current) {
        iframeRef.current.src = `https://maps.google.com/maps?q=${lat},${lon}&hl=en&z=13&output=embed`;
      }
    }
  }, [activeMapSession?.latitude, activeMapSession?.longitude, isSuperadmin]);

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
    const cpuBarLength = Math.max(0, Math.min(20, Math.round((telemetry?.cpu || 0) / 5)));
    const cpuBar = "█".repeat(cpuBarLength) + "░".repeat(20 - cpuBarLength);

    return (
      <div className="min-h-screen bg-black text-lime-400 p-0 overflow-x-hidden relative select-none font-mono">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-2 border-lime-400 bg-black px-6 py-4 gap-4">
          <div className="flex items-center gap-8">
            <span className="text-2xl font-black tracking-tighter text-lime-400 hover:scale-105 transition-transform duration-100 cursor-pointer">CYBR_</span>
            <nav className="flex flex-wrap items-center gap-6 text-[10px] font-bold text-lime-400 uppercase tracking-widest">
              <a href="#work" className="hover:text-white transition duration-100">WORK +</a>
              <a href="#services" className="hover:text-white transition duration-100">SERVICES +</a>
              <a href="#about" className="hover:text-white transition duration-100">ABOUT +</a>
              <a href="#labs" className="hover:text-white transition duration-100">LABS +</a>
              <a href="#contact" className="hover:text-white transition duration-100">CONTACT +</a>
            </nav>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-6 text-lime-400">
            <div className="text-right leading-tight">
              <div className="text-zinc-550 font-bold uppercase tracking-wider text-[8px]">SYS_TIME</div>
              <div className="font-bold text-xs">{liveTime}</div>
              <div className="text-[7px] text-zinc-550">UTC+0</div>
            </div>
            <button className="bg-lime-400 text-black px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-100">
              <span>Start a Project</span>
              <span className="font-sans text-xs">↗</span>
            </button>
          </div>
        </header>

        {/* HERO SECTION /01 */}
        <section className="grid md:grid-cols-12 border-b-2 border-lime-400 min-h-[500px]">
          {/* Hero Left Column */}
          <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-between border-r-0 md:border-r-2 border-lime-400 space-y-8">
            <div className="text-xs font-bold tracking-widest text-lime-500">/01 HERO</div>
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-lime-400 uppercase leading-none">
                Cyber<br />Brutalism
              </h1>
              <h2 className="text-sm font-bold tracking-widest text-lime-500 uppercase">
                The future isn't minimal. It's systematic.
              </h2>
              <p className="text-zinc-400 text-xs leading-relaxed max-w-lg font-sans">
                Cyber Brutalism is raw, digital, and unapologetically functional. A new visual language for the machine age.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={() => onNavigateToTab("revenue")}
                className="bg-lime-400 text-black px-6 py-3 text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white transition duration-100"
              >
                <span>Explore Work</span>
                <span className="font-sans text-sm">↗</span>
              </button>
              <button 
                onClick={() => onNavigateToTab("audit")}
                className="border-2 border-lime-400 text-lime-400 px-6 py-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-lime-400 hover:text-black transition duration-100"
              >
                <span>View Manifesto</span>
                <span>[ ]</span>
              </button>
            </div>
          </div>

          {/* Hero Right Column */}
          <div className="md:col-span-5 relative bg-[#090d10] p-6 flex flex-col justify-between overflow-hidden min-h-[400px] md:min-h-auto">
            {/* Background Grid Lines Overlay */}
            <div className="absolute inset-0 bg-grid-line opacity-10 pointer-events-none" />
            
            {/* Scanning details overlay */}
            <div className="flex justify-between items-start z-10 text-[9px] text-lime-500 font-bold uppercase">
              <div className="animate-pulse flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-ping" />
                <span>&gt; RENDERING... 87%</span>
              </div>
              <div className="text-right">SYS_SCN: ACTIVE</div>
            </div>

            {/* Wireframe Head Render */}
            <div className="absolute inset-0 flex items-center justify-center p-8 z-0">
              <img 
                src="/cyber_head.png" 
                alt="Cyber Brutalist Head Scan" 
                className="max-h-[85%] max-w-[85%] object-contain filter brightness-110 contrast-125 select-none pointer-events-none"
              />
            </div>

            {/* Coordinate values overlay */}
            <div className="flex justify-between items-end z-10 text-[9px] text-lime-500 font-mono tracking-wider pt-24">
              <div className="space-y-0.5 bg-black/75 p-2 border border-lime-400/20">
                <div>X_142.9</div>
                <div>Y_88.3</div>
                <div>Z_55.6</div>
              </div>
              <div className="bg-black/75 p-2 border border-lime-400/20">
                <span>//SCN_01</span>
              </div>
            </div>
          </div>
        </section>

        {/* CORE PRINCIPLES /02 */}
        <section className="border-b-2 border-lime-400">
          <div className="border-b border-lime-400/30 px-6 py-4 flex justify-between items-center bg-black/45">
            <span className="text-[10px] font-bold tracking-widest text-lime-500">/02 CORE PRINCIPLES</span>
            <span className="text-[9px] text-zinc-550">SYSTEMATIC_METADATA_ARRAY</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 lg:divide-x-2 divide-lime-400">
            {/* Principle 1 */}
            <div className="p-6 flex flex-col justify-between space-y-6 bg-[#070b0e]/30 hover:bg-lime-400/5 transition duration-150">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-lime-500 uppercase tracking-widest">FUNCTION OVER FORM</span>
                <span className="text-zinc-650">+</span>
              </div>
              <div className="py-2">
                <svg className="h-8 w-8 text-lime-400 stroke-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5M2 7v10M12 12v10M22 7v10" />
                </svg>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal font-sans">
                Design is built to serve. Nothing more.
              </p>
            </div>
            
            {/* Principle 2 */}
            <div className="p-6 flex flex-col justify-between space-y-6 bg-[#070b0e]/30 hover:bg-lime-400/5 transition duration-150">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-lime-500 uppercase tracking-widest">SYSTEMS THINKING</span>
                <span className="text-zinc-650">+</span>
              </div>
              <div className="py-2">
                <svg className="h-8 w-8 text-lime-400 stroke-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <path d="M12 2v20M2 12h20" stroke-dasharray="1 1" />
                </svg>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal font-sans">
                Grids. Modules. Data. Everything is connected.
              </p>
            </div>

            {/* Principle 3 */}
            <div className="p-6 flex flex-col justify-between space-y-6 bg-[#070b0e]/30 hover:bg-lime-400/5 transition duration-150">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-lime-500 uppercase tracking-widest">DIGITAL AESTHETICS</span>
                <span className="text-zinc-650">+</span>
              </div>
              <div className="py-2">
                <svg className="h-8 w-8 text-lime-400 stroke-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 6h16M2 10h20M5 14h14M3 18h18" stroke-dasharray="3 3" />
                  <path d="M8 3v18M16 3v18" stroke-opacity="0.2" />
                </svg>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal font-sans">
                Glitch, noise, scanlines, and hardware vibes.
              </p>
            </div>

            {/* Principle 4 */}
            <div className="p-6 flex flex-col justify-between space-y-6 bg-[#070b0e]/30 hover:bg-lime-400/5 transition duration-150">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-lime-500 uppercase tracking-widest">BOLD CONTRAST</span>
                <span className="text-zinc-650">+</span>
              </div>
              <div className="py-2">
                <svg className="h-8 w-8 text-lime-400 stroke-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" />
                </svg>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal font-sans">
                High contrast. Harsh colors. No soft tones.
              </p>
            </div>

            {/* Principle 5 */}
            <div className="p-6 flex flex-col justify-between space-y-6 bg-[#070b0e]/30 hover:bg-lime-400/5 transition duration-150">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-lime-500 uppercase tracking-widest">RAW & AUTHENTIC</span>
                <span className="text-zinc-650">+</span>
              </div>
              <div className="py-2">
                <svg className="h-8 w-8 text-lime-400 stroke-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="2" y="2" width="6" height="6" />
                  <rect x="9" y="2" width="6" height="6" />
                  <rect x="16" y="2" width="6" height="6" />
                  <rect x="2" y="9" width="6" height="6" />
                  <rect x="16" y="9" width="6" height="6" />
                  <rect x="2" y="16" width="6" height="6" />
                  <rect x="9" y="16" width="6" height="6" />
                  <rect x="16" y="16" width="6" height="6" />
                </svg>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal font-sans">
                No fluff. No polish. No compromise.
              </p>
            </div>
          </div>
        </section>

        {/* SELECTED WORK /03 */}
        <section className="border-b-2 border-lime-400">
          <div className="border-b border-lime-400/30 px-6 py-4 flex justify-between items-center bg-black/45">
            <span className="text-[10px] font-bold tracking-widest text-lime-500">/03 SELECTED WORK</span>
            <span className="text-[9px] text-zinc-550">CLICK_CARD_TO_ROUTE_CONTROL_SYSTEM</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x-2 divide-lime-400">
            {/* Card 1: Data Portal */}
            <div 
              onClick={() => onNavigateToTab("audit")}
              className="p-6 flex flex-col justify-between h-[360px] cursor-pointer bg-[#0c0f13] hover:bg-lime-400/5 transition duration-150 group"
            >
              <div className="relative aspect-video overflow-hidden border border-lime-400/35 bg-black">
                <img src="/data_portal.png" alt="Data Portal" className="h-full w-full object-cover filter brightness-95 group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="space-y-1.5 pt-4">
                <span className="text-[9px] font-bold text-lime-500 uppercase tracking-widest block">[01] SYSTEM_CORE</span>
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-sm text-lime-400 uppercase tracking-wider">DATA_PORTAL</h4>
                  <span className="text-lime-400 font-sans text-xs group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-sans">Security audit logs & system actions tracker.</p>
              </div>
            </div>

            {/* Card 2: Neural Net */}
            <div 
              onClick={() => onNavigateToTab("users")}
              className="p-6 flex flex-col justify-between h-[360px] cursor-pointer bg-[#0c0f13] hover:bg-lime-400/5 transition duration-150 group"
            >
              <div className="relative aspect-video overflow-hidden border border-lime-400/35 bg-black">
                <img src="/neural_net.png" alt="Neural Net" className="h-full w-full object-cover filter brightness-95 group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="space-y-1.5 pt-4">
                <span className="text-[9px] font-bold text-lime-500 uppercase tracking-widest block">[02] STAFF_INDEX</span>
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-sm text-lime-400 uppercase tracking-wider">NEURAL_NET</h4>
                  <span className="text-lime-400 font-sans text-xs group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-sans">User personnel registry & access permissions.</p>
              </div>
            </div>

            {/* Card 3: Void System */}
            <div 
              onClick={() => onNavigateToTab("trash")}
              className="p-6 flex flex-col justify-between h-[360px] cursor-pointer bg-[#0c0f13] hover:bg-lime-400/5 transition duration-150 group"
            >
              <div className="relative aspect-video overflow-hidden border border-lime-400/35 bg-black">
                <img src="/void_system.png" alt="Void System" className="h-full w-full object-cover filter brightness-95 group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="space-y-1.5 pt-4">
                <span className="text-[9px] font-bold text-lime-500 uppercase tracking-widest block">[03] SYSTEM_SHUNTS</span>
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-sm text-lime-400 uppercase tracking-wider">VOID_SYSTEM</h4>
                  <span className="text-lime-400 font-sans text-xs group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-sans">Trash manager & soft deletion retention.</p>
              </div>
            </div>

            {/* Card 4: Gridline */}
            <div 
              onClick={() => onNavigateToTab("revenue")}
              className="p-6 flex flex-col justify-between h-[360px] cursor-pointer bg-[#0c0f13] hover:bg-lime-400/5 transition duration-150 group"
            >
              <div className="relative aspect-video overflow-hidden border border-lime-400/35 bg-black">
                <img src="/gridline.png" alt="Gridline" className="h-full w-full object-cover filter brightness-95 group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="space-y-1.5 pt-4">
                <span className="text-[9px] font-bold text-lime-500 uppercase tracking-widest block">[04] ANALYTICS</span>
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-sm text-lime-400 uppercase tracking-wider">GRIDLINE</h4>
                  <span className="text-lime-400 font-sans text-xs group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-sans">Revenue analytics, weekly bills & monthly sales.</p>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM METADATA GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x-2 divide-lime-400 border-b-2 border-lime-400">
          {/* Join The Resistance /04 */}
          <div className="lg:col-span-4 p-8 flex flex-col justify-between space-y-6">
            <div className="text-[10px] font-bold tracking-widest text-lime-500">/04 JOIN THE RESISTANCE</div>
            <div className="space-y-4">
              <h3 className="text-2xl font-black uppercase tracking-tight leading-none text-lime-400">
                Join the<br />resistance
              </h3>
              <p className="text-zinc-400 text-xs font-sans leading-relaxed">
                Cyber Brutalism is more than a style. It's a statement. Let's build the future together.
              </p>
            </div>
            <button 
              onClick={() => onNavigateToTab("billing")}
              className="bg-lime-400 text-black px-6 py-2.5 text-xs font-black uppercase tracking-widest flex items-center justify-between hover:bg-white active:scale-[0.98] transition-all cursor-pointer self-start"
            >
              <span>Let's Build</span>
              <span className="font-sans text-xs ml-3">↗</span>
            </button>
          </div>

          {/* System Status /05 */}
          <div className="lg:col-span-4 p-8 flex flex-col justify-between space-y-6">
            <div className="text-[10px] font-bold tracking-widest text-lime-500">/05 SYSTEM STATUS</div>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-lime-400/20 pb-1">
                <span className="text-zinc-550">CPU_USAGE</span>
                <span className="text-lime-400 font-bold tracking-tighter flex items-center gap-2">
                  <span className="text-[9px] font-bold">{cpuBar}</span>
                  <span>{telemetry.cpu}%</span>
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-lime-400/20 pb-1">
                <span className="text-zinc-550">MEMORY</span>
                <span className="text-lime-400 font-bold">{telemetry.memory} MB / 16 GB</span>
              </div>
              <div className="flex justify-between items-center border-b border-lime-400/20 pb-1">
                <span className="text-zinc-550">UPTIME</span>
                <span className="text-lime-400 font-bold">7D 14H 22M</span>
              </div>
              <div className="flex justify-between items-center border-b border-lime-400/20 pb-1">
                <span className="text-zinc-550">NETWORK</span>
                <span className="text-lime-400 font-bold">SECURE</span>
              </div>
            </div>
            <div className="px-3 py-1.5 border border-lime-400/35 text-[9px] font-black uppercase tracking-wider text-lime-400 flex items-center justify-center gap-1.5 bg-lime-400/5">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse" />
              <span>All Systems Operational</span>
            </div>
          </div>

          {/* Subscribe to Signal /06 */}
          <div className="lg:col-span-4 p-8 flex flex-col justify-between space-y-6">
            <div className="text-[10px] font-bold tracking-widest text-lime-500">/06 SUBSCRIBE TO SIGNAL</div>
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold uppercase tracking-wide text-lime-400 leading-tight">
                Subscribe to signal
              </h3>
              <p className="text-zinc-400 text-xs font-sans leading-relaxed">
                Updates on trends, drops, and experiments from the lab.
              </p>
            </div>
            <div className="flex gap-2 w-full">
              <input 
                type="email" 
                placeholder="ENTER EMAIL"
                className="flex-1 bg-black border border-lime-400 text-lime-400 text-xs px-3 py-2 outline-none placeholder-lime-400/30"
              />
              <button className="bg-lime-400 text-black px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1 hover:bg-white active:scale-95 transition-all">
                <span>Subscribe</span>
                <span className="font-sans text-xs">↗</span>
              </button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="p-8 md:p-12 bg-black text-lime-400 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 space-y-4">
              <span className="text-3xl font-black tracking-tighter block">CYBR_</span>
              <p className="text-[9px] text-zinc-550 font-sans leading-relaxed">
                © 2026 CYBR STUDIO.<br />ALL RIGHTS RESERVED.
              </p>
            </div>
            
            {/* Nav links */}
            <div className="md:col-span-2 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Navigation</div>
              <ul className="text-xs space-y-2 text-lime-500 font-bold">
                <li><a href="#work" className="hover:text-white">Work</a></li>
                <li><a href="#services" className="hover:text-white">Services</a></li>
                <li><a href="#about" className="hover:text-white">About</a></li>
                <li><a href="#labs" className="hover:text-white">Labs</a></li>
                <li><a href="#contact" className="hover:text-white">Contact</a></li>
              </ul>
            </div>

            {/* Resources links */}
            <div className="md:col-span-2 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Resources</div>
              <ul className="text-xs space-y-2 text-lime-500 font-bold">
                <li><a href="#manifesto" className="hover:text-white">Manifesto</a></li>
                <li><a href="#blog" className="hover:text-white">Blog</a></li>
                <li><a href="#styleguide" className="hover:text-white">Style Guide</a></li>
                <li><a href="#newsletter" className="hover:text-white">Newsletter</a></li>
                <li><a href="#careers" className="hover:text-white">Careers</a></li>
              </ul>
            </div>

            {/* Socials links */}
            <div className="md:col-span-2 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Socials</div>
              <ul className="text-xs space-y-2 text-lime-500 font-bold">
                <li><a href="#twitter" className="hover:text-white">X(Twitter)</a></li>
                <li><a href="#discord" className="hover:text-white">Discord</a></li>
                <li><a href="#github" className="hover:text-white">GitHub</a></li>
                <li><a href="#behance" className="hover:text-white">Behance</a></li>
                <li><a href="#youtube" className="hover:text-white">YouTube</a></li>
              </ul>
            </div>

            {/* Global Node Map */}
            <div className="md:col-span-2 space-y-3 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-550 block">Global Node</div>
              <div className="text-xs font-bold text-lime-500">LON + NY + TYO + BER</div>
              <div className="inline-block mt-2 opacity-65 grayscale hover:grayscale-0 transition duration-150">
                {/* Minimal world radar grid */}
                <svg className="h-10 w-24 text-lime-400 stroke-1" viewBox="0 0 100 40" fill="none" stroke="currentColor">
                  <path d="M5 20c25-10 65-10 90 0M5 10c25-5 65-5 90 0M5 30c25 5 65 5 90 0M10 5v30M30 5v30M50 5v30M70 5v30M90 5v30" stroke-dasharray="1 3" />
                  <circle cx="50" cy="20" r="1.5" fill="#ccff00" />
                  <circle cx="30" cy="15" r="1.5" fill="#ccff00" />
                  <circle cx="70" cy="25" r="1.5" fill="#ccff00" />
                </svg>
              </div>
            </div>
          </div>
        </footer>

        {/* HAZARD ACCENT BAR */}
        <div className="cyber-hazard-bar flex items-center justify-center">
          <span className="bg-black text-[#ccff00] text-[9px] font-black tracking-widest px-4 py-0.5 border border-[#ccff00] select-none">
            &gt; ACCESS GRANTED_
          </span>
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
