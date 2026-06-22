import React, { useState, useEffect } from"react";
import {
 LayoutDashboard,
 ShoppingCart,
 Package,
 Users,
 History,
 Settings,
 Menu,
 X,
 Bell,
 CheckCircle2,
 AlertTriangle,
 Lightbulb,
 Database,
 CloudLightning,
 Sparkles,
 ShieldAlert,
 ShieldCheck,
 Activity,
 LogOut,
 HelpCircle,
 FileCheck,
 Award,
 Ticket,
 Sun,
 Moon,
 Laptop,
 ChevronDown,
 TrendingUp,
 Save,
 Trash2
} from"lucide-react";

// Import custom tabs
import Dashboard from"./components/Dashboard";
import PosBilling from"./components/PosBilling";
import ProductsTab from"./components/ProductsTab";
import CustomersTab from"./components/CustomersTab";
import HistoryTab from"./components/HistoryTab";
import DraftsTab from"./components/DraftsTab";
import SettingsTab from"./components/SettingsTab";
import AiAssistant from"./components/AiAssistant";
import PromoCodesTab from"./components/PromoCodesTab";
import AgentsTab from"./components/AgentsTab";
import RevenueAnalyticsTab from"./components/RevenueAnalyticsTab";
import TrashTab from"./components/TrashTab";

// RBAC user flow entries
import LoginPage from"./components/LoginPage";
import UserControlsTab from"./components/UserControlsTab";
import UserActivitiesTab from"./components/UserActivitiesTab";
import AuditTrailTab from"./components/AuditTrailTab";
import HelpSetupTab from"./components/HelpSetupTab";

// Import modules
import { Product, Customer, Invoice, InvoiceItem, ConnectionSettings, CompanySettings, MessageFeedback } from"./types";
import { SheetsSyncEngine } from"./utils/sheetsSync";
import { SYSTEM_LOGO } from"./constants/branding";

export default function App() {
 const currentUser = SheetsSyncEngine.getCurrentUser();
 const userRole = currentUser?.role ||"Employee";

 // Validate Logo on Startup
 useEffect(() => {
 const checkLogo = async () => {
 try {
 const response = await fetch(SYSTEM_LOGO, { method: 'HEAD' });
 if (!response.ok) {
 console.warn("Logo file invalid or corrupted.");
 }
 } catch (err) {
 console.warn("Logo file invalid or corrupted.");
 }
 };
 checkLogo();
 }, []);

 // Load/apply theme preference on active user changes
 const [currentUserTheme, setCurrentUserTheme] = useState<string>(() => {
    const userStr = localStorage.getItem("billing_current_user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.username) {
          return localStorage.getItem(`theme_pref_${user.username}`) || "system";
        }
      } catch (e) {}
    }
    return localStorage.getItem("theme_pref_global") || "system";
  });

 useEffect(() => {
 if (currentUser) {
 const stored = localStorage.getItem(`theme_pref_${currentUser.username}`);
 if (stored) {
 setCurrentUserTheme(stored);
 } else {
 setCurrentUserTheme("system");
 }
 } else {
 const storedGlobal = localStorage.getItem("theme_pref_global");
 if (storedGlobal) {
 setCurrentUserTheme(storedGlobal);
 } else {
 setCurrentUserTheme("system");
 }
 }
 }, [currentUser]);

 useEffect(() => {
 const applyTheme = (theme: string) => {
 const root = window.document.documentElement;
 root.classList.remove("light","dark");
 
 let actualTheme = theme;
 if (theme ==="system") {
 const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
 actualTheme = systemPrefersDark ?"dark" :"light";
 }
 
 root.classList.add(actualTheme);
 };

 applyTheme(currentUserTheme);

 if (currentUserTheme ==="system") {
 const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
 const listener = (e: MediaQueryListEvent) => {
 const root = window.document.documentElement;
 root.classList.remove("light","dark");
 root.classList.add(e.matches ?"dark" :"light");
 };
 mediaQuery.addEventListener("change", listener);
 return () => mediaQuery.removeEventListener("change", listener);
 }
 }, [currentUserTheme]);

 const handleUpdateTheme = (theme:"light" |"dark" |"system") => {
 setCurrentUserTheme(theme);
 if (currentUser) {
 localStorage.setItem(`theme_pref_${currentUser.username}`, theme);
 localStorage.setItem("theme_pref_global", theme);
 } else {
 localStorage.setItem("theme_pref_global", theme);
 }
 };

 // Mobile drawer State
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 const [isAiOpen, setIsAiOpen] = useState(false);
 const [activeTab, setActiveTab] = useState(() => {
 if (typeof window !=="undefined" && window.location.pathname ==="/analytics/revenue") {
 const uRole = SheetsSyncEngine.getCurrentUser()?.role ||"Employee";
 if (uRole !=="Admin") {
 return"dashboard";
 }
 return"revenue";
 }
 return"dashboard";
 });
 const [historyStatusFilter, setHistoryStatusFilter] = useState("All");

 useEffect(() => {
 const handlePopState = () => {
 if (window.location.pathname ==="/analytics/revenue") {
 const uRole = SheetsSyncEngine.getCurrentUser()?.role ||"Employee";
 if (uRole !=="Admin") {
 setActiveTab("dashboard");
 window.history.replaceState(null,"","/");
 } else {
 setActiveTab("revenue");
 }
 } else {
 setActiveTab("dashboard");
 }
 };
 window.addEventListener("popstate", handlePopState);
 return () => window.removeEventListener("popstate", handlePopState);
 }, []);

 // Advanced CRM / ERP deep linking state registers
 const [selectedInvoiceNo, setSelectedInvoiceNo] = useState<string | null>(null);
 const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
 const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
 const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
 const [selectedRevenueModule, setSelectedRevenueModule] = useState<string | null>(null);

 // Master navigation routing interceptor for ERP drill-downs
 const [hasUnsavedInvoice, setHasUnsavedInvoice] = useState(false);
 const [pendingNavigation, setPendingNavigation] = useState<{tab: string, filter?: string, extraState?: { invoiceNo?: string; customerId?: string; agentId?: string; auditId?: string; revenueModule?: string }} | null>(null);

 const executeNavigation = (tab: string, filter?: string, extraState?: { invoiceNo?: string; customerId?: string; agentId?: string; auditId?: string; revenueModule?: string }) => {
 if (tab ==="revenue" && userRole !=="Admin") {
 showNotification("Access Denied: Revenue Analytics is restricted to Administrators.","error");
 tab ="dashboard";
 }

 setActiveTab(tab);
 if (tab ==="revenue") {
 window.history.pushState(null,"","/analytics/revenue");
 } else {
 if (window.location.pathname ==="/analytics/revenue") {
 window.history.pushState(null,"","/");
 }
 }
 if (tab ==="history" && filter) {
 setHistoryStatusFilter(filter);
 }
 if (extraState) {
 if (extraState.invoiceNo) setSelectedInvoiceNo(extraState.invoiceNo);
 if (extraState.customerId) setSelectedCustomerId(extraState.customerId);
 if (extraState.agentId) setSelectedAgentId(extraState.agentId);
 if (extraState.auditId) setSelectedAuditId(extraState.auditId);
 if (extraState.revenueModule) setSelectedRevenueModule(extraState.revenueModule);
 }
 };

 const handleNavigateToTab = (tab: string, filter?: string, extraState?: { invoiceNo?: string; customerId?: string; agentId?: string; auditId?: string; revenueModule?: string }) => {
 if (activeTab ==="billing" && tab !=="billing" && hasUnsavedInvoice) {
 setPendingNavigation({ tab, filter, extraState });
 return;
 }
 executeNavigation(tab, filter, extraState);
 };

 // Global entities loaded from storage engine
 const [products, setProducts] = useState<Product[]>([]);
 const [customers, setCustomers] = useState<Customer[]>([]);
 const [invoices, setInvoices] = useState<Invoice[]>([]);
 const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
 const [connection, setConnection] = useState<ConnectionSettings | null>(null);
 const [company, setCompany] = useState<CompanySettings | null>(null);

 // Computed dashboard statistics
 const [stats, setStats] = useState(SheetsSyncEngine.calculateStats());

 // Global Notification Banner
 const [notification, setNotification] = useState<MessageFeedback | null>(null);

 // Sync state alert helpers
 const showNotification = (text: string, type:"success" |"error" |"info" ="success") => {
 setNotification({ text, type });
 setTimeout(() => {
 setNotification(null);
 }, 4500);
 };

 // Synchronous State Initializer
  const reloadApplicationState = () => {
    const prods = SheetsSyncEngine.getProducts().filter(p => !p.isSoftDeleted);
    const custs = SheetsSyncEngine.getCustomers().filter(c => !c.isSoftDeleted);
    const invs = SheetsSyncEngine.getInvoices().filter(i => !i.isSoftDeleted);
    const items = SheetsSyncEngine.getInvoiceItems();
    const conn = SheetsSyncEngine.getConnectionSettings();
    const comp = SheetsSyncEngine.getCompanySettings();

    setProducts(prods);
    setCustomers(custs);
    setInvoices(invs);
    setInvoiceItems(items);
    setConnection(conn);
    setCompany(comp);

    // Compute stats
    setStats(SheetsSyncEngine.calculateStats());
  };

 // Auto Logout idle detection (Auto-Logout after 5 minutes of inactivity)
 useEffect(() => {
 let idleTimer: NodeJS.Timeout | null = null;
 const idleLimitMs = 300 * 1000; // 5 minutes

 const handleResetIdle = () => {
 if (idleTimer) clearTimeout(idleTimer);
 idleTimer = setTimeout(() => {
 const activeUser = SheetsSyncEngine.getCurrentUser();
 if (activeUser) {
 SheetsSyncEngine.logSessionExit(activeUser.username);
 showNotification("Session expired: Automatically logged out due to idleness.","info");
 reloadApplicationState();
 }
 }, idleLimitMs);
 };

 const activeUser = SheetsSyncEngine.getCurrentUser();
 if (activeUser) {
 handleResetIdle();
 // Listen to interaction triggers
 window.addEventListener("mousemove", handleResetIdle);
 window.addEventListener("click", handleResetIdle);
 window.addEventListener("keydown", handleResetIdle);
 window.addEventListener("scroll", handleResetIdle);
 }

 return () => {
 if (idleTimer) clearTimeout(idleTimer);
 window.removeEventListener("mousemove", handleResetIdle);
 window.removeEventListener("click", handleResetIdle);
 window.removeEventListener("keydown", handleResetIdle);
 window.removeEventListener("scroll", handleResetIdle);
 };
 }, [currentUser]); // renew on auth status switches

 // Mount loading
 useEffect(() => {
    async function bootSequence() {
      // 1. First, attempt to load persistent deployment configuration
      try {
        const configRes = await fetch("/api/config/db");
        if (configRes.ok) {
          const configData = await configRes.json();
          if (configData && configData.appsScriptUrl) {
            const currentConn = SheetsSyncEngine.getConnectionSettings();
            
            // Only update if missing or if the server config is more recent/valid
            // Overwrite local if we have a valid global config
            currentConn.appsScriptUrl = configData.appsScriptUrl;
            if (configData.spreadsheetId) currentConn.spreadsheetId = configData.spreadsheetId;
            if (configData.spreadsheetName) currentConn.spreadsheetName = configData.spreadsheetName;
            if (configData.isConnected !== undefined) currentConn.isConnected = configData.isConnected;
            if (configData.connectionMode !== undefined) currentConn.connectionMode = configData.connectionMode;
            
            SheetsSyncEngine.saveConnectionSettings(currentConn);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch persistent DB config:", err);
      }

      // 2. Hydrate application state with newly synchronized settings
      reloadApplicationState();
      
      // 3. Attempt background sync from Google Sheets unconditionally if configured
      const conn = SheetsSyncEngine.getConnectionSettings();
      if (conn.isConnected && conn.appsScriptUrl) {
        SheetsSyncEngine.syncDownFromSheets(conn)
          .then((result) => {
            if (result.success) {
              reloadApplicationState();
            }
          })
          .catch(() => {
            console.warn("Failed to automatically synchronize with Google Sheets.");
          });
      }
    }

    bootSequence();

    // Start 30-second periodic auto-sync (pull remote updates)
    const syncInterval = setInterval(() => {
      const conn = SheetsSyncEngine.getConnectionSettings();
      if (conn.isConnected && conn.appsScriptUrl) {
        console.log("[Auto-Sync] Periodically fetching latest Google Sheets data...");
        SheetsSyncEngine.syncDownFromSheets(conn)
          .then((result) => {
            if (result.success) {
              reloadApplicationState();
            }
          })
          .catch((err) => {
            console.warn("[Auto-Sync] Periodic sync failed:", err);
          });
      }
    }, 30000); // 30 seconds

    return () => {
      clearInterval(syncInterval);
    };
  }, []);

 const handleForceSync = async () => {
 const conn = SheetsSyncEngine.getConnectionSettings();
 if (!conn.appsScriptUrl) {
   showNotification("Database is offline. Configure Google Apps Script in Settings.", "error");
   return;
 }
 showNotification("Refreshing data from Google Sheets...","info");
 const result = await SheetsSyncEngine.syncDownFromSheets(conn);
 if (result.success) {
 reloadApplicationState();
 showNotification("✓ Data refreshed successfully.","success");
 } else {
 showNotification(`Failed to refresh: ${result.message}`,"error");
 }
 };

 const handleLogout = () => {
 if (currentUser) {
 SheetsSyncEngine.logSessionExit(currentUser.username);
 showNotification(`Sign out successful. See you soon @${currentUser.username}!`,"success");
 setIsMobileMenuOpen(false);
 setActiveTab("dashboard");
 reloadApplicationState();
 }
 };

 // If no user is logged in, show the absolute secure LoginPage gate
 if (!currentUser) {
 return (
 <div className="min-h-screen bg-surface flex items-center justify-center font-sans">
 {notification && (
 <div className="fixed top-4 right-4 z-[9999] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white bg-blue-600 shadow-2xl animate-in slide-in-from-top-6 duration-300">
 <CheckCircle2 className="h-4 w-4 shrink-0" />
 <span>{notification.text}</span>
 </div>
 )}
 <LoginPage
 onLoginSuccess={(u) => reloadApplicationState()}
 onShowNotification={showNotification}
 />
 </div>
 );
 }

 // Sidebar Menu options construction based on RBAC roles
 const menuItems = [
 { id:"dashboard", label:"Dashboard Logs", icon: LayoutDashboard },
 { id:"billing", label:"New POS Checkout", icon: ShoppingCart },
 { id:"drafts", label:"Draft Invoices", icon: FileCheck },
 { id:"products", label:"Products Catalog", icon: Package },
 { id:"customers", label:"Customer Registry", icon: Users },
 { id:"history", label:"Receipts History", icon: History },
 { id:"agents", label:"Agent Analytics", icon: Award },
 ];

 // Render extra tabs only for Admin users
  if (userRole ==="Admin") {
  menuItems.push(
  { id:"revenue", label:"Revenue Analytics", icon: TrendingUp },
  { id:"users", label:"User Management", icon: ShieldAlert },
  { id:"activities", label:"Operator Activities", icon: Activity },
  { id:"audit", label:"System Audit Trail", icon: ShieldCheck },
  { id:"promos", label:"Promo Manager", icon: Ticket },
  { id:"trash", label:"Trash Bin", icon: Trash2 }
  );
  }

 // Static items for everyone
 menuItems.push(
 { id:"help", label:"Google Sheets Guide", icon: HelpCircle },
 { id:"settings", label:"Settings Panel", icon: Settings }
 );

 return (
 <div className="min-h-screen bg-surface flex flex-col font-sans">
 
 {/* GLOBAL TOAST BANNER SLIDEOUT */}
 {notification && (
 <div
 id="toast-notification"
 className={`fixed top-4 right-4 z-[9999] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-primary shadow-2xl animate-in slide-in-from-top-6 duration-300 ${
 notification.type ==="success"
 ?"bg-emerald-600"
 : notification.type ==="error"
 ?"bg-rose-600"
 :"bg-blue-600"
 }`}
 >
 {notification.type ==="success" ? (
 <CheckCircle2 className="h-4 w-4 shrink-0" />
 ) : (
 <AlertTriangle className="h-4 w-4 shrink-0" />
 )}
 <span>{notification.text}</span>
 <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-85 font-bold">
 &times;
 </button>
 </div>
 )}

 {/* MOBILE HEADER NAVIGATION */}
 <header className="flex items-center justify-between bg-card px-4 py-3 lg:hidden shadow-sm border-b border-default/80 sticky top-0 z-40 transition-colors">
 <div className="flex items-center gap-2">
 <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs overflow-hidden shrink-0">
 <img src={SYSTEM_LOGO} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
 </div>
 <div>
 <span className="font-bold text-sm text-primary dark:text-primary tracking-tight leading-none block">{company?.shortName ||"TCF Smart Billing"}</span>
 <span className="text-[10px] text-muted dark:text-muted block font-mono">@{currentUser.username} ({currentUser.role})</span>
 </div>
 </div>
 <div className="flex items-center gap-3">
 {/* Mobile Theme Switcher */}
 <div className="flex items-center gap-0.5 bg-surface dark:bg-card-secondary border border-default dark:border-default rounded-lg p-0.5">
 {(["light","dark","system"] as const).map((pref) => {
 const isPrefActive = currentUserTheme === pref;
 return (
 <button
 key={pref}
 onClick={() => handleUpdateTheme(pref)}
 title={`Switch to ${pref} theme`}
 className={`p-1 rounded cursor-pointer outline-none border-none flex items-center justify-center transition-all ${
 isPrefActive
 ?"bg-blue-600 text-white shadow-sm"
 :"text-muted hover:text-muted dark:text-muted dark:hover:text-primary"
 }`}
 >
 {pref ==="light" && <Sun className="h-3.5 w-3.5" />}
 {pref ==="dark" && <Moon className="h-3.5 w-3.5" />}
 {pref ==="system" && <Laptop className="h-3.5 w-3.5" />}
 </button>
 );
 })}
 </div>

 {connection?.isConnected ? (
 <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" title="Online Database Connected" />
 ) : (
 <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500" title="Offline Sandbox Database" />
 )}
 <button
 onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
 className="rounded-lg p-1.5 text-muted hover:bg-card-secondary dark:hover:bg-card-secondary dark:hover:bg-zinc-800"
 >
 {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
 </button>
 </div>
 </header>

 <div className="flex-1 flex max-w-[1600px] w-full mx-auto relative">
 
 {/* DESKTOP SIDEBAR PANEL */}
 <aside className="hidden lg:flex w-64 border-r border-default bg-card flex-col shrink-0 sticky top-0 h-screen select-none text-primary">
 {/* Branding */}
 <div className="p-6 border-b border-zinc-905 flex items-center justify-between">
 <div className="flex items-center gap-2.5 min-w-0">
 <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold text-sm overflow-hidden shrink-0">
 <img src={SYSTEM_LOGO} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
 </div>
 <div className="min-w-0 flex-1">
 <h2 className="font-extrabold text-sm text-primary tracking-tight leading-none truncate">{company?.shortName ||"TCF Smart Billing"}</h2>
 <span className="text-[10px] text-muted font-medium font-sans block truncate mt-1">v{company?.gstNumber ?"Corporate" :"Standard"} Manager</span>
 </div>
 </div>
 </div>

 {/* Quick Operator identification Card */}
 <div className="px-6 py-4 border-b border-zinc-905 bg-card-secondary/40 flex items-center gap-3">
 <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-450 flex items-center justify-center border border-blue-500/20 text-xs font-bold font-mono shrink-0">
 {currentUser.username.substring(0, 2).toUpperCase()}
 </div>
 <div className="min-w-0 flex-1">
 <h4 className="text-xs font-bold truncate leading-none text-primary">{currentUser.fullName}</h4>
 <p className="text-[9px] text-zinc-550 font-mono mt-1 uppercase tracking-wider">{currentUser.role} Account</p>
 </div>
 <button
 onClick={handleLogout}
 className="rounded p-1 text-muted hover:text-rose-500 hover:bg-rose-500/5 cursor-pointer bg-transparent border-none active:scale-95 transition-transform shrink-0"
 title="Terminate Operator Session"
 >
 <LogOut className="h-4 w-4" />
 </button>
 </div>

 {/* Database Synchronization Status Bar */}
 <div className="m-4 rounded-xl bg-card-secondary/60 border border-default p-3.5 space-y-1.5">
 <div className="flex items-baseline justify-between text-[10px] uppercase font-bold text-muted font-sans">
 <span>Database Sync</span>
 <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
 connection?.isConnected ?"bg-emerald-500/10 text-emerald-400" :"bg-amber-500/10 text-amber-400"
 }`}>
 {connection?.isConnected ?"Online" :"Sandbox"}
 </span>
 </div>
 <div className="text-xs truncate font-semibold text-primary font-sans">
 {connection?.isConnected ? connection.spreadsheetName :"Offline Session Storage"}
 </div>
 {connection?.isConnected && (
 <p className="text-[9px] text-muted font-mono">Synced {connection.lastSyncTime ||"just now"}</p>
 )}
 </div>

 {/* Sidebar Menu options */}
 <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
 {menuItems.map((item) => {
 const Icon = item.icon;
 const isActive = activeTab === item.id;
 return (
 <button
 key={item.id}
 onClick={() => handleNavigateToTab(item.id)}
 className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wide transition-all ${
 isActive
 ?"bg-blue-600 text-white shadow-sm font-bold"
 :"text-muted hover:bg-surface hover:text-primary"
 }`}
 >
 <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ?"text-primary" :"text-muted"}`} />
 <span>{item.label}</span>
 </button>
 );
 })}
 </nav>

 {/* Credits Block */}
 <div className="p-4 border-t border-zinc-905 text-center">
 <p className="text-[9px] text-muted font-mono">
 v2.2.0-RBAC • TCF ERP Platform
 </p>
 </div>
 </aside>

 {/* MOBILE COLLAPSIBLE DRAWER */}
 {isMobileMenuOpen && (
 <div
 id="mobile-nav-panel"
 className="fixed inset-0 z-50 bg-card/60 lg:hidden animate-in fade-in duration-200"
 onClick={() => setIsMobileMenuOpen(false)}
 >
 <div
 className="w-72 bg-card text-primary h-full flex flex-col shadow-2xl border-r border-default animate-in slide-in-from-left duration-250"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="p-4 border-b border-default flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs">
 {currentUser.username.substring(0,2).toUpperCase()}
 </div>
 <div>
 <span className="font-bold text-sm block text-primary">@{currentUser.username}</span>
 <span className="text-[10px] text-muted block font-mono">{currentUser.role} Account</span>
 </div>
 </div>
 <button
 onClick={() => setIsMobileMenuOpen(false)}
 className="rounded-lg p-1.5 text-muted hover:bg-card-secondary dark:hover:bg-zinc-800"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 {/* Status block inside mobile panel */}
 <div className="m-4 rounded-xl bg-card-secondary p-3.5 space-y-1 text-xs text-primary border border-default">
 <div className="flex items-center justify-between text-[10px] font-bold text-muted uppercase">
 <span>Database status</span>
 <span>{connection?.isConnected ?"🟢 Online" :"🟡 Sandbox"}</span>
 </div>
 <div className="font-semibold text-primary truncate">
 {connection?.isConnected ? connection.spreadsheetName :"Offline Sandbox Session"}
 </div>
 </div>

 {/* Navigation lists */}
 <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
 {menuItems.map((item) => {
 const Icon = item.icon;
 const isActive = activeTab === item.id;
 return (
 <button
 key={item.id}
 onClick={() => {
 handleNavigateToTab(item.id);
 setIsMobileMenuOpen(false);
 }}
 className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-xs font-semibold ${
 isActive ?"bg-blue-600 text-white font-bold" :"text-muted hover:bg-card-secondary hover:text-primary"
 }`}
 >
 <Icon className="h-4.5 w-4.5 shrink-0" />
 <span>{item.label}</span>
 </button>
 );
 })}

 <button
 onClick={handleLogout}
 className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-xs font-semibold text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 pt-4 text-left"
 >
 <LogOut className="h-4.5 w-4.5 text-rose-500" />
 <span>Log Out of POS</span>
 </button>
 </nav>

 <div className="p-4 border-t border-default text-center text-[9px] text-muted font-mono">
 {company?.shortName ||"TCF Smart Billing"} Platform v2.2.0-RBAC
 </div>
 </div>
 </div>
 )}

 {/* PENDING NAVIGATION WARNING MODAL */}
 {pendingNavigation && (
 <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-card/60 backdrop-blur-sm p-4">
 <div className="bg-card rounded-xl max-w-md w-full p-6 shadow-2xl border border-default animate-in fade-in zoom-in-95 duration-200">
 <div className="flex items-center gap-3 text-rose-500 mb-4">
 <AlertTriangle className="h-6 w-6" />
 <h3 className="text-lg font-bold text-primary dark:text-primary">Unsaved Invoice Changes</h3>
 </div>
 <p className="text-sm text-muted dark:text-muted mb-6">
 You have unsaved changes in the New POS Checkout. Do you want to save them as a Draft before leaving?
 </p>
 
 <div className="flex flex-col sm:flex-row justify-end gap-3">
 <button
 type="button"
 onClick={() => setPendingNavigation(null)}
 className="px-4 py-2 text-sm font-semibold text-primary bg-card-secondary hover:bg-gray-200 dark:bg-zinc-800 dark:text-primary dark:hover:bg-zinc-700 rounded-lg cursor-pointer border-none"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={() => {
 setHasUnsavedInvoice(false);
 window.dispatchEvent(new CustomEvent('clear-draft'));
 executeNavigation(pendingNavigation.tab, pendingNavigation.filter, pendingNavigation.extraState);
 setPendingNavigation(null);
 }}
 className="px-4 py-2 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 rounded-lg cursor-pointer border-none"
 >
 Leave Anyway
 </button>
 <button
 type="button"
 onClick={() => {
 window.dispatchEvent(new CustomEvent('save-draft'));
 setHasUnsavedInvoice(false);
 executeNavigation(pendingNavigation.tab, pendingNavigation.filter, pendingNavigation.extraState);
 setPendingNavigation(null);
 }}
 className="px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer border-none"
 >
 <Save className="h-4 w-4" /> Save Draft
 </button>
 </div>
 </div>
 </div>
 )}

 {/* CONTAINER WORKSPACE STAGE */}
 <main className="flex-1 min-w-0 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6">
 
 {/* DESKTOP TOP NAVIGATION BAR */}
 <header className="hidden lg:flex items-center justify-between border-b border-default pb-4 transition-colors">
 <div>
 <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-muted uppercase tracking-widest">
 <span>Console Gateway</span>
 <span>/</span>
 <span className="text-blue-500">{activeTab}</span>
 </div>
 <h1 className="text-xl font-display font-extrabold text-primary capitalize tracking-tight mt-1">
 {activeTab ==="dashboard" ?"Operational Intelligence" : 
 activeTab ==="billing" ?"Smart POS Checkout" : 
 activeTab ==="products" ?"Enterprise Directory" : 
 activeTab ==="customers" ?"Client Registry" : 
 activeTab ==="history" ?"Receipts History" : 
 activeTab ==="agents" ?"Operator Analytics" : 
 activeTab ==="promos" ?"Voucher Operations" : 
 activeTab ==="users" ?"Personnel Security" : 
 activeTab ==="revenue" ?"Revenue Analytics" : 
 activeTab ==="help" ?"System Documentation" :
 activeTab ==="settings" ?"Configuration Manager" :
 activeTab ==="trash" ?"Trash Bin Manager" :
 activeTab}
 </h1>
 </div>

 <div className="flex items-center gap-4">
 {/* Theme Switcher in Top Navigation Bar */}
 <div className="relative" id="top-nav-theme-selector">
 <div className="flex items-center gap-1 bg-card  border border-default dark:border-gray-850 rounded-xl p-1 shadow-sm">
 {(["light","dark","system"] as const).map((pref) => {
 const isPrefActive = currentUserTheme === pref;
 return (
 <button
 key={pref}
 onClick={() => handleUpdateTheme(pref)}
 title={`Switch to ${pref} theme`}
 className={`p-1.5 rounded-lg transition-all cursor-pointer outline-none border-none flex items-center justify-center ${
 isPrefActive
 ?"bg-blue-600 text-white shadow-sm"
 :"text-muted hover:text-muted dark:hover:text-gray-300 hover:bg-surface dark:hover:bg-[#111111]"
 }`}
 >
 {pref ==="light" && <Sun className="h-4 w-4" />}
 {pref ==="dark" && <Moon className="h-4 w-4" />}
 {pref ==="system" && <Laptop className="h-4 w-4" />}
 </button>
 );
 })}
 </div>
 </div>

 {/* Ask AI Assistant - Desktop Header Button */}
 <button
 id="btn-ai-header"
 onClick={() => setIsAiOpen(!isAiOpen)}
 className={`flex items-center gap-2 border rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all outline-none cursor-pointer active:scale-95 ${
 isAiOpen
 ?"bg-blue-600 border-blue-600 text-primary hover:bg-blue-700 hover:border-blue-700"
 :"bg-card border-default text-secondary dark:text-gray-200 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:bg-surface dark:hover:bg-surface"
 }`}
 title="Ask smart AI business, sales, or checkout intelligence"
 >
 <Sparkles className={`h-4 w-4 ${isAiOpen ?"text-yellow-300 fill-yellow-300 animate-none" :"text-blue-600 dark:text-blue-400 animate-pulse"}`} />
 <span>Ask AI Assistant</span>
 </button>

 {/* User Profile Menu with internal theme preference selector */}
 <div className="relative group">
 <button className="flex items-center gap-2.5 bg-card border border-default rounded-xl px-3.5 py-1.5 text-left shadow-sm hover:border-gray-250 dark:hover:border-gray-700 transition-all outline-none cursor-pointer">
 <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/10">
 {currentUser.username.substring(0,2).toUpperCase()}
 </div>
 <div>
 <span className="block text-xs font-bold text-primary dark:text-primary leading-tight">{currentUser.fullName}</span>
 <span className="block text-[9px] text-muted font-mono leading-none mt-0.5 uppercase">{currentUser.role}</span>
 </div>
 <ChevronDown className="h-3.5 w-3.5 text-muted group-hover:translate-y-0.5 transition-transform" />
 </button>

 {/* Dropdown Menu on hover / trigger */}
 <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-default bg-card p-2 shadow-2xl scale-95 opacity-0 invisible group-hover:scale-100 group-hover:opacity-100 group-hover:visible transition-all duration-150 origin-top-right z-50">
 <div className="px-3 py-2 border-b border-default dark:border-gray-850 text-left">
 <span className="block text-[10px] uppercase font-bold text-gray-450">Authenticated Session</span>
 <span className="block text-xs font-extrabold text-primary dark:text-primary mt-0.5">{currentUser.fullName}</span>
 <span className="block text-[9px] text-muted font-mono">@{currentUser.username} • {currentUser.role}</span>
 </div>
 <div className="p-2 space-y-1.5">
 <span className="block text-[9px] uppercase font-mono font-bold text-muted px-1">Theme preference</span>
 <div className="grid grid-cols-3 gap-1 p-1 bg-surface  rounded-lg border border-default dark:border-gray-850">
 {(["light","dark","system"] as const).map((pref) => {
 const isSelected = currentUserTheme === pref;
 return (
 <button
 key={pref}
 onClick={() => handleUpdateTheme(pref)}
 className={`py-1 text-[10px] font-bold rounded capitalize flex flex-col items-center justify-center gap-0.5 cursor-pointer outline-none transition-all ${
 isSelected
 ?"bg-card text-blue-600 shadow-sm border border-default/50"
 :"text-muted hover:text-gray-950 dark:hover:text-primary hover:bg-card-secondary dark:hover:bg-[#1a1a1a] border border-transparent"
 }`}
 >
 {pref ==="light" && <Sun className="h-3 w-3" />}
 {pref ==="dark" && <Moon className="h-3.5 w-3.5" />}
 {pref ==="system" && <Laptop className="h-3 w-3" />}
 <span className="text-[8px] tracking-wide font-sans">{pref}</span>
 </button>
 );
 })}
 </div>
 </div>
 <div className="border-t border-default dark:border-gray-850 my-1" />
 <button
 onClick={handleLogout}
 className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 cursor-pointer outline-none border-none"
 >
 <LogOut className="h-4 w-4 text-rose-500" />
 <span>Terminate Session</span>
 </button>
 </div>
 </div>
 </div>
 </header>
 
 {/* INJECT SELECTED VIEW SCREEN */}
 <div className="flex-1">
 {activeTab ==="dashboard" && (
 <Dashboard
 stats={stats}
 onRefresh={handleForceSync}
 onNavigateToTab={handleNavigateToTab}
 userRole={userRole}
 />
 )}

 {activeTab ==="billing" && (
 <PosBilling
 products={products}
 customers={customers}
 company={company || {
 companyName:"Tenali Central Furniture",
 address:"Guntur Road, Tenali-522201",
 phone:"+91 8644 223400",
 email:"contact@tcfshowroom.com",
 gstNumber:"GSTIN-37AAAAT9876C1Z0",
 invoicePrefix:"YR",
 nextInvoiceNumber: 1001,
 }}
 onInvoiceCreated={reloadApplicationState}
 onShowNotification={showNotification}
 onHasUnsavedChanges={setHasUnsavedInvoice}
 onNavigateToTab={handleNavigateToTab}
 />
 )}

 {activeTab ==="drafts" && (
 <DraftsTab
 onNavigateToTab={handleNavigateToTab}
 onShowNotification={showNotification}
 />
 )}

 {activeTab ==="products" && (
 <ProductsTab
 products={products}
 invoices={invoices}
 invoiceItems={invoiceItems}
 onRefresh={reloadApplicationState}
 onShowNotification={showNotification}
 />
 )}

 {activeTab ==="customers" && (
 <CustomersTab
 customers={customers}
 invoices={invoices}
 onRefresh={reloadApplicationState}
 onShowNotification={showNotification}
 initiallySelectedCustomerId={selectedCustomerId}
 onClearSelected={() => setSelectedCustomerId(null)}
 onNavigateToTab={handleNavigateToTab}
 />
 )}

 {activeTab ==="history" && (
 <HistoryTab
 invoices={invoices}
 invoiceItems={invoiceItems}
 company={company || {
 companyName:"Tenali Central Furniture",
 address:"Guntur Road, Tenali-522201",
 phone:"+91 8644 223400",
 email:"contact@tcfshowroom.com",
 gstNumber:"GSTIN-37AAAAT9876C1Z0",
 invoicePrefix:"YR",
 nextInvoiceNumber: 1001,
 }}
 onRefresh={reloadApplicationState}
 onShowNotification={showNotification}
 initialStatusFilter={historyStatusFilter}
 onResetStatusFilter={() => setHistoryStatusFilter("All")}
 initiallyInspectedInvoiceNo={selectedInvoiceNo}
 onClearInspected={() => setSelectedInvoiceNo(null)}
 onNavigateToTab={handleNavigateToTab}
 />
 )}

 {activeTab ==="revenue" && userRole ==="Admin" && (
 <RevenueAnalyticsTab
 invoices={invoices}
 customers={customers}
 products={products}
 invoiceItems={invoiceItems}
 onRefresh={reloadApplicationState}
 onShowNotification={showNotification}
 onNavigateToTab={handleNavigateToTab}
 userRole={userRole}
 initiallySelectedModule={selectedRevenueModule}
 onClearSelectedModule={() => setSelectedRevenueModule(null)}
 />
 )}

 {activeTab ==="agents" && (
 <AgentsTab
 onRefresh={reloadApplicationState}
 onShowNotification={showNotification}
 initiallySelectedAgentId={selectedAgentId}
 onClearSelected={() => setSelectedAgentId(null)}
 />
 )}

 {activeTab ==="promos" && userRole ==="Admin" && (
 <PromoCodesTab
 onRefresh={reloadApplicationState}
 onShowNotification={showNotification}
 />
 )}

 {/* Render unique Admin-restricted Custom tab views */}
 {activeTab ==="users" && userRole ==="Admin" && (
 <UserControlsTab
 onShowNotification={showNotification}
 onRefresh={reloadApplicationState}
 />
 )}

 {activeTab ==="activities" && userRole ==="Admin" && (
 <UserActivitiesTab />
 )}

 {activeTab ==="audit" && userRole ==="Admin" && (
 <AuditTrailTab 
 initiallySelectedAuditId={selectedAuditId}
 onClearSelected={() => setSelectedAuditId(null)}
 />
 )}

 {activeTab ==="trash" && userRole ==="Admin" && (
    <TrashTab
      onRefresh={reloadApplicationState}
      onShowNotification={showNotification}
    />
  )}

 {activeTab ==="help" && (
 <HelpSetupTab />
 )}

 {activeTab ==="settings" && connection && company && (
 <SettingsTab
 connSettings={connection}
 companySettings={company}
 onRefresh={reloadApplicationState}
 onShowNotification={showNotification}
 currentUserTheme={currentUserTheme}
 onUpdateTheme={handleUpdateTheme}
 />
 )}
 </div>
 </main>
 </div>

 {/* CONTROLLED RESPONSIVE AI ASSISTANT PANEL */}
 <AiAssistant isOpen={isAiOpen} setIsOpen={setIsAiOpen} />
 </div>
 );
}
