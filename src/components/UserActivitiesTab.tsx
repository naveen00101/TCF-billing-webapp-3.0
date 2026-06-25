import React, { useState } from "react";
import { 
  Activity, 
  Clock, 
  Monitor, 
  Globe, 
  Shield, 
  MapPin, 
  Laptop, 
  Smartphone, 
  ExternalLink,
  Search,
  X,
  Navigation,
  Info,
  User,
  Calendar,
  AlertCircle
} from "lucide-react";
import { SheetsSyncEngine } from "../utils/sheetsSync";
import { UserActivity } from "../types";

export default function UserActivitiesTab() {
  const activities = SheetsSyncEngine.getUserActivities();
  const [selectedSession, setSelectedSession] = useState<UserActivity | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<'all' | 'online' | 'unique'>('all');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Compute stats
  const totalLoggedInSessions = activities.length;
  
  // Calculate total seconds worked
  const totalSeconds = activities.reduce((sum, act) => sum + (act.activeSeconds || 0), 0);
  const totalHoursWorked = (totalSeconds / 3600).toFixed(1);

  // Online sessions calculation (Session has no logout time and was active within last 5 minutes)
  const now = Date.now();
  const onlineSessions = activities.filter(act => {
    if (act.logoutTime) return false;
    if (!act.lastActiveAt) return false;
    const lastActiveTime = new Date(act.lastActiveAt).getTime();
    return (now - lastActiveTime) < 300000; // 5 minutes threshold
  });
  const totalOnlineCount = onlineSessions.length;

  // Unique users active count
  const activeUsernames = Array.from(new Set(activities.map(a => a.username)));

  // Apply active filters (Online or Unique latest logs)
  let displayedActivities = [...activities];
  if (activeFilter === 'online') {
    displayedActivities = displayedActivities.filter(act => {
      if (act.logoutTime) return false;
      if (!act.lastActiveAt) return false;
      const lastActiveTime = new Date(act.lastActiveAt).getTime();
      return (now - lastActiveTime) < 300000;
    });
  } else if (activeFilter === 'unique') {
    // Sort activities descending by login timestamp to ensure the first seen is the latest
    const sorted = [...displayedActivities].sort((a, b) => {
      const datetimeA = new Date(`${a.loginDate}T${a.loginTime}`).getTime() || 0;
      const datetimeB = new Date(`${b.loginDate}T${b.loginTime}`).getTime() || 0;
      return datetimeB - datetimeA;
    });
    const seen = new Set<string>();
    displayedActivities = sorted.filter(act => {
      const usernameKey = act.username.toLowerCase();
      if (seen.has(usernameKey)) return false;
      seen.add(usernameKey);
      return true;
    });
  }

  // Filter activities based on search query
  const filteredActivities = displayedActivities.filter(act => 
    act.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    act.ipAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (act.locationName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Find freshest selected session data from the list
  const currentSelected = selectedSession 
    ? activities.find(a => a.id === selectedSession.id) || selectedSession 
    : null;

  // Map session coordinates tracking (could be historical coordinate selected by user)
  const mapSessionToDisplay = selectedHistoryId 
    ? activities.find(a => a.id === selectedHistoryId) || currentSelected 
    : currentSelected;

  // Get all session history with coordinates for the selected user
  const userGpsHistory = currentSelected
    ? activities.filter(act => 
        act.username.toLowerCase() === currentSelected.username.toLowerCase() &&
        act.latitude &&
        act.longitude
      )
    : [];

  const sortedGpsHistory = [...userGpsHistory].sort((a, b) => {
    const datetimeA = new Date(`${a.loginDate}T${a.loginTime}`).getTime() || 0;
    const datetimeB = new Date(`${b.loginDate}T${b.loginTime}`).getTime() || 0;
    return datetimeB - datetimeA;
  });

  const fallbackLat = 16.2422;
  const fallbackLon = 80.6473;
  const hasGps = !!(mapSessionToDisplay?.latitude && mapSessionToDisplay?.longitude);
  const displayLat = mapSessionToDisplay?.latitude ? Number(mapSessionToDisplay.latitude) : fallbackLat;
  const displayLon = mapSessionToDisplay?.longitude ? Number(mapSessionToDisplay.longitude) : fallbackLon;

  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const prevCoordsRef = React.useRef<{lat: number, lon: number} | null>(null);

  React.useEffect(() => {
    const lat = displayLat;
    const lon = displayLon;
    if (!prevCoordsRef.current) {
      prevCoordsRef.current = { lat, lon };
    } else if (prevCoordsRef.current.lat !== lat || prevCoordsRef.current.lon !== lon) {
      prevCoordsRef.current = { lat, lon };
      if (iframeRef.current) {
        iframeRef.current.src = `https://maps.google.com/maps?q=${lat},${lon}&hl=en&z=14&output=embed`;
      }
    }
  }, [displayLat, displayLon]);

  const initialSrc = `https://maps.google.com/maps?q=${displayLat},${displayLon}&hl=en&z=14&output=embed`;

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-default pb-4 transition-colors">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-primary font-sans flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-500 animate-pulse" />
            <span>User Activity Operations Report</span>
          </h1>
          <p className="text-xs text-secondary font-sans mt-0.5">
            Audit trail of active operating sessions, physical device OS, resolved IP geolocation, and live heartbeats.
          </p>
        </div>
      </div>

      {/* METRIC GRIDS */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1: Terminal Hours Worked (Clickable: resets filters) */}
        <div 
          onClick={() => setActiveFilter('all')}
          className={`rounded-xl border p-5 shadow-sm space-y-2 transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-md ${
            activeFilter === 'all' 
              ? 'border-blue-500/80 dark:border-blue-400/70 ring-2 ring-blue-500/10 bg-blue-500/5' 
              : 'border-default bg-card hover:border-blue-500/40'
          }`}
          title="Show all recorded sessions"
        >
          <div className="flex items-center justify-between text-xs font-bold text-muted uppercase tracking-widest">
            <span>Terminal Hours Worked</span>
            <Clock className="h-4.5 w-4.5 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-primary font-mono">{totalHoursWorked} hrs</h3>
            {activeFilter === 'all' && (
              <span className="text-[9px] font-bold text-blue-500 dark:text-blue-400 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 uppercase tracking-wider">
                Default
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted dark:text-muted">Aggregated from login durations</p>
        </div>

        {/* Card 2: Operators Online Now (Clickable: filters online operators) */}
        <div 
          onClick={() => setActiveFilter('online')}
          className={`rounded-xl border p-5 shadow-sm space-y-2 transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-md ${
            activeFilter === 'online' 
              ? 'border-green-500/80 dark:border-green-400/70 ring-2 ring-green-500/10 bg-green-500/5' 
              : 'border-default bg-card hover:border-green-500/40'
          }`}
          title="Filter to show online operators only"
        >
          <div className="flex items-center justify-between text-xs font-bold text-muted uppercase tracking-widest">
            <span>Operators Online Now</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-green-500 font-mono">{totalOnlineCount} Active</h3>
            {activeFilter === 'online' && (
              <span className="text-[9px] font-bold text-green-500 px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20 uppercase tracking-wider">
                Active Filter
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted dark:text-muted font-sans">Active browser pings (1m intervals)</p>
        </div>

        {/* Card 3: Total Auth Sessions (Clickable: resets filters) */}
        <div 
          onClick={() => setActiveFilter('all')}
          className={`rounded-xl border p-5 shadow-sm space-y-2 transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-md ${
            activeFilter === 'all' 
              ? 'border-blue-500/80 dark:border-blue-400/70 ring-2 ring-blue-500/10 bg-blue-500/5' 
              : 'border-default bg-card hover:border-blue-500/40'
          }`}
          title="Show all recorded sessions"
        >
          <div className="flex items-center justify-between text-xs font-bold text-muted uppercase tracking-widest">
            <span>Total Auth Sessions</span>
            <Shield className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-primary font-mono">{totalLoggedInSessions}</h3>
            {activeFilter === 'all' && (
              <span className="text-[9px] font-bold text-blue-500 dark:text-blue-400 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 uppercase tracking-wider">
                Default
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted dark:text-muted font-sans font-mono">Recorded console entries</p>
        </div>

        {/* Card 4: Unique Officers Active (Clickable: filters unique operators) */}
        <div 
          onClick={() => setActiveFilter('unique')}
          className={`rounded-xl border p-5 shadow-sm space-y-2 transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-md ${
            activeFilter === 'unique' 
              ? 'border-purple-500/80 dark:border-purple-400/70 ring-2 ring-purple-500/10 bg-purple-500/5' 
              : 'border-default bg-card hover:border-purple-500/40'
          }`}
          title="Filter to show unique active operators only"
        >
          <div className="flex items-center justify-between text-xs font-bold text-muted uppercase tracking-widest">
            <span>Unique Officers Active</span>
            <Globe className="h-4.5 w-4.5 text-purple-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-primary font-mono">{activeUsernames.length} Operators</h3>
            {activeFilter === 'unique' && (
              <span className="text-[9px] font-bold text-purple-500 dark:text-purple-400 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 uppercase tracking-wider">
                Active Filter
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted dark:text-muted font-sans">Registered staff credentials used</p>
        </div>

      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 max-w-md flex-1 bg-card rounded-lg border border-default px-3 py-1.5 text-xs text-primary shadow-sm transition-colors">
          <Search className="h-4 w-4 text-muted shrink-0" />
          <input
            type="text"
            placeholder="Filter by operator name, IP, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-xs text-primary placeholder-muted"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="text-muted hover:text-primary transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {activeFilter !== 'all' && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
              activeFilter === 'online'
                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                : 'bg-purple-500/10 text-purple-500 border-purple-500/20'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                activeFilter === 'online' ? 'bg-green-500 animate-pulse' : 'bg-purple-500'
              }`} />
              <span>Showing: {activeFilter === 'online' ? 'Online Operators Only' : 'Unique Active Officers'}</span>
              <button 
                onClick={() => setActiveFilter('all')}
                className="ml-1 hover:text-primary transition-colors cursor-pointer opacity-70 hover:opacity-100"
                title="Clear filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* SIDE BY SIDE DASHBOARD INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: LIVE LOGS LIST TABLE (2/3 width) */}
        <div className="lg:col-span-2 rounded-xl border border-default bg-card p-5 shadow-sm transition-colors overflow-hidden">
          <h3 className="font-bold text-primary text-sm mb-4">Live Session Logs List</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto text-left text-xs text-muted dark:text-muted">
              <thead className="bg-table-header text-[10px] uppercase font-bold text-muted dark:text-muted border-b border-default">
                <tr>
                  <th className="px-4 py-3">Username Logged</th>
                  <th className="px-4 py-3">Session Timing</th>
                  <th className="px-4 py-3 text-center">Status / Duration</th>
                  <th className="px-4 py-3 text-center">Device / OS</th>
                  <th className="px-4 py-3">Resolved IP Address</th>
                  <th className="px-4 py-3 text-right">Physical Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-800/60">
                {filteredActivities.map((act) => {
                  // Determine if this session is currently online
                  const isSessionOnline = !act.logoutTime && act.lastActiveAt && (now - new Date(act.lastActiveAt).getTime()) < 300000;
                  const isSelected = currentSelected?.id === act.id;

                  // Dynamic location fallback mapping
                  const displayLocation = act.locationName 
                    ? act.locationName 
                    : (isSessionOnline ? "Resolving Geolocation..." : "N/A (Old Record)");

                  return (
                    <tr 
                      key={act.id} 
                      onClick={() => { setSelectedSession(act); setSelectedHistoryId(null); }}
                      className={`cursor-pointer transition-all duration-150 border-l-[3px] ${
                        isSelected 
                          ? "bg-purple-500/5 dark:bg-purple-500/10 border-l-purple-500 dark:border-l-purple-400" 
                          : "hover:bg-table-hover border-l-transparent"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">@{act.username}</span>
                          <span className="text-[9px] text-muted font-mono">{act.id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-primary">{act.loginDate}</span>
                          <span className="text-[10px] text-muted font-mono">{act.loginTime}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isSessionOnline ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20 font-mono font-bold text-[10px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            ONLINE NOW
                          </span>
                        ) : act.logoutTime ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-mono font-bold text-[10px] border border-emerald-100 dark:border-emerald-900">
                            {act.sessionDuration || "00h 01m"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-zinc-500/10 text-muted font-mono font-semibold text-[10px] border border-zinc-500/20">
                            DISCONNECTED
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-xs text-primary">
                          {act.deviceType === "Mobile" ? (
                            <Smartphone className="h-3.5 w-3.5 text-zinc-500" />
                          ) : (
                            <Laptop className="h-3.5 w-3.5 text-zinc-500" />
                          )}
                          <span className="font-medium">{act.os || "Desktop OS"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-primary">
                        {act.ipAddress}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span 
                            className={`text-xs font-sans max-w-[150px] truncate ${
                              !act.locationName && isSessionOnline 
                                ? "text-purple-500 italic animate-pulse font-medium" 
                                : !act.locationName 
                                ? "text-muted font-mono" 
                                : "text-primary"
                            }`} 
                            title={act.locationName || displayLocation}
                          >
                            {displayLocation}
                          </span>
                          {act.latitude && act.longitude && (
                            <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredActivities.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted dark:text-zinc-600">
                      No operator activities match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE TERMINAL INSPECTOR & GOOGLE MAP PANEL (1/3 width) */}
        <div className="rounded-xl border border-default bg-card shadow-sm transition-all duration-200 overflow-hidden">
          
          {currentSelected ? (
            <div className="flex flex-col h-full">
              
              {/* Header */}
              <div className="px-5 py-4 border-b border-default bg-surface flex items-center justify-between transition-colors">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4.5 w-4.5 text-purple-500" />
                  <span className="font-bold text-primary text-sm">Terminal Inspector</span>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-1 rounded-lg hover:bg-default text-secondary hover:text-primary transition-colors cursor-pointer"
                  title="Clear selection"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Inspector Content */}
              <div className="p-5 space-y-4 flex-1">
                
                {/* Operator Profile */}
                <div className="p-3 bg-surface rounded-xl border border-default space-y-2 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                      {currentSelected.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-primary text-xs flex items-center gap-1.5">
                        <span>@{currentSelected.username}</span>
                        {currentSelected.username.toLowerCase().includes("admin") && (
                          <span className="px-1.5 py-0.2 text-[8px] font-bold rounded bg-purple-500/10 text-purple-500 border border-purple-500/20">
                            ADMINISTRATOR
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-muted font-mono">{currentSelected.id}</div>
                    </div>
                  </div>
                </div>

                {/* Session Timing & Heartbeat */}
                <div className="text-[11px] space-y-2 bg-surface p-3.5 rounded-xl border border-default transition-colors">
                  <div className="flex justify-between items-center pb-2 border-b border-default/60">
                    <span className="text-muted font-semibold">Active Status</span>
                    {(!currentSelected.logoutTime && currentSelected.lastActiveAt && (now - new Date(currentSelected.lastActiveAt).getTime()) < 300000) ? (
                      <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/25 font-bold font-mono text-[9px] flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        ONLINE
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-500/10 text-muted border border-zinc-500/25 font-semibold font-mono text-[9px]">
                        OFFLINE
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                    <div>
                      <span className="text-muted block text-[10px]">Logged In</span>
                      <strong className="text-primary block font-mono">{currentSelected.loginDate} {currentSelected.loginTime}</strong>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px]">Last Heartbeat</span>
                      <strong className="text-primary block font-mono">
                        {currentSelected.lastActiveAt 
                          ? new Date(currentSelected.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                          : "N/A"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* System Specs */}
                <div className="text-[11px] space-y-2 bg-surface p-3.5 rounded-xl border border-default transition-colors">
                  <span className="text-muted font-semibold block border-b border-default/60 pb-1.5">System Signature</span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-card p-1.5 rounded border border-default/55 flex flex-col items-center justify-center">
                      <Laptop className="h-3.5 w-3.5 text-blue-500 mb-1" />
                      <span className="text-muted text-[8px] font-bold">DEVICE</span>
                      <strong className="text-primary text-[9px] truncate max-w-full">{currentSelected.deviceType}</strong>
                    </div>
                    <div className="bg-card p-1.5 rounded border border-default/55 flex flex-col items-center justify-center">
                      <Monitor className="h-3.5 w-3.5 text-emerald-500 mb-1" />
                      <span className="text-muted text-[8px] font-bold">BROWSER</span>
                      <strong className="text-primary text-[9px] truncate max-w-full">{currentSelected.browser}</strong>
                    </div>
                    <div className="bg-card p-1.5 rounded border border-default/55 flex flex-col items-center justify-center">
                      <Activity className="h-3.5 w-3.5 text-purple-500 mb-1" />
                      <span className="text-muted text-[8px] font-bold">OS</span>
                      <strong className="text-primary text-[9px] truncate max-w-full">{currentSelected.os || "Desktop"}</strong>
                    </div>
                  </div>
                </div>

                {/* Network parameters */}
                <div className="text-[11px] space-y-2 bg-surface p-3.5 rounded-xl border border-default transition-colors">
                  <span className="text-muted font-semibold block border-b border-default/60 pb-1.5">Network & Geolocation</span>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-muted">IP Address</span>
                      <span className="font-mono text-primary font-bold">{currentSelected.ipAddress}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted">Physical Location</span>
                      <span className="text-primary font-semibold text-right max-w-[160px] truncate" title={currentSelected.locationName}>
                        {currentSelected.locationName || (
                          (!currentSelected.logoutTime && currentSelected.lastActiveAt && (now - new Date(currentSelected.lastActiveAt).getTime()) < 300000) 
                            ? "Resolving Geolocation..." 
                            : "N/A (Old Record)"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted">Coordinates</span>
                      <span className="font-mono text-primary">
                        {currentSelected.latitude && currentSelected.longitude 
                          ? `${currentSelected.latitude.toFixed(5)}, ${currentSelected.longitude.toFixed(5)}`
                          : "N/A"
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive Map Embed */}
                <div className="space-y-2">
                  <div className="relative rounded-xl overflow-hidden border border-default bg-surface shadow-inner h-48 transition-colors">
                    <iframe
                      ref={iframeRef}
                      title="GPS Geolocation Map"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      src={initialSrc}
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                  {hasGps ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${displayLat},${displayLon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 py-2 text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-100/50 dark:hover:bg-purple-950/40 active:scale-95 transition-all cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open in Google Maps</span>
                    </a>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-blue-200/50 dark:border-blue-900/30 bg-blue-50/40 dark:bg-blue-950/10 text-[11px] text-blue-700 dark:text-blue-400 space-y-1 transition-colors">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="h-4 w-4 text-blue-500" />
                        <span>Showroom HQ Location (Default Fallback)</span>
                      </div>
                      <p className="font-sans leading-relaxed">
                        This session doesn't have active GPS coordinates (e.g. local client/localhost or permission denied). Centering map on the main Showroom HQ.
                      </p>
                    </div>
                  )}
                </div>

                {/* Tracked Geolocation History Timeline */}
                {sortedGpsHistory.length > 0 && (
                  <div className="text-[11px] space-y-2 bg-surface p-3.5 rounded-xl border border-default transition-colors">
                    <div className="flex justify-between items-center border-b border-default/60 pb-1.5 mb-1.5">
                      <span className="text-muted font-semibold">Tracked Location History</span>
                      <span className="text-[9px] px-1.5 py-0.2 font-bold rounded bg-purple-500/10 text-purple-500 border border-purple-500/20 font-mono">
                        {sortedGpsHistory.length} Record{sortedGpsHistory.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {sortedGpsHistory.map((histAct, index) => {
                        const isCurrentActive = histAct.id === mapSessionToDisplay?.id;
                        return (
                          <div
                            key={histAct.id}
                            onClick={() => setSelectedHistoryId(histAct.id)}
                            className={`p-2 rounded-lg border text-left cursor-pointer transition-all duration-200 ${
                              isCurrentActive
                                ? "bg-purple-500/10 border-purple-500 ring-1 ring-purple-500/20"
                                : "bg-card border-default hover:border-gray-400"
                            }`}
                          >
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-bold text-primary">
                                {histAct.id === currentSelected.id ? "📍 Current Session" : `🕒 Session #${sortedGpsHistory.length - index}`}
                              </span>
                              <span className="font-mono text-muted text-[9px]">{histAct.loginDate} {histAct.loginTime}</span>
                            </div>
                            <div className="text-[10px] text-primary truncate mt-1" title={histAct.locationName || "Resolving GPS..."}>
                              {histAct.locationName || "Resolving GPS..."}
                            </div>
                            <div className="text-[9px] font-mono text-muted mt-0.5">
                              {histAct.latitude?.toFixed(5)}, {histAct.longitude?.toFixed(5)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {selectedHistoryId && selectedHistoryId !== currentSelected.id && (
                      <button
                        onClick={() => setSelectedHistoryId(null)}
                        className="w-full text-center text-[10px] font-bold text-purple-600 dark:text-purple-400 mt-1 hover:underline cursor-pointer border-none bg-transparent"
                      >
                        Reset Map to Current Session
                      </button>
                    )}
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center h-[500px] text-muted dark:text-zinc-650 bg-card">
              <div className="h-16 w-16 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4 border border-purple-500/20 animate-pulse">
                <MapPin className="h-7 w-7" />
              </div>
              <h4 className="font-extrabold text-sm text-primary mb-1">No Terminal Selected</h4>
              <p className="text-xs text-secondary max-w-[220px] leading-relaxed">
                Select an operator session from the logs to inspect live terminal connection details and track real-time physical GPS coordinates.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
