import React from "react";
import { 
  Activity, 
  Clock, 
  Monitor, 
  Globe, 
  Shield, 
  MapPin, 
  Laptop, 
  Smartphone, 
  ExternalLink 
} from "lucide-react";
import { SheetsSyncEngine } from "../utils/sheetsSync";

export default function UserActivitiesTab() {
  const activities = SheetsSyncEngine.getUserActivities();

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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
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
        
        <div className="rounded-xl border border-default bg-card p-5 shadow-sm space-y-2 transition-colors">
          <div className="flex items-center justify-between text-xs font-bold text-muted uppercase tracking-widest">
            <span>Terminal Hours Worked</span>
            <Clock className="h-4.5 w-4.5 text-blue-500 dark:text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-primary font-mono">{totalHoursWorked} hrs</h3>
          <p className="text-[11px] text-muted dark:text-muted">Aggregated from login durations</p>
        </div>

        <div className="rounded-xl border border-default bg-card p-5 shadow-sm space-y-2 transition-colors">
          <div className="flex items-center justify-between text-xs font-bold text-muted uppercase tracking-widest">
            <span>Operators Online Now</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </div>
          <h3 className="text-2xl font-bold text-green-500 font-mono">{totalOnlineCount} Active</h3>
          <p className="text-[11px] text-muted dark:text-muted font-sans">Active browser pings (1m intervals)</p>
        </div>

        <div className="rounded-xl border border-default bg-card p-5 shadow-sm space-y-2 transition-colors">
          <div className="flex items-center justify-between text-xs font-bold text-muted uppercase tracking-widest">
            <span>Total Auth Sessions</span>
            <Shield className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-primary font-mono">{totalLoggedInSessions}</h3>
          <p className="text-[11px] text-muted dark:text-muted font-sans font-mono">Recorded console entries</p>
        </div>

        <div className="rounded-xl border border-default bg-card p-5 shadow-sm space-y-2 transition-colors">
          <div className="flex items-center justify-between text-xs font-bold text-muted uppercase tracking-widest">
            <span>Unique Officers Active</span>
            <Globe className="h-4.5 w-4.5 text-purple-500" />
          </div>
          <h3 className="text-2xl font-bold text-primary font-mono">{activeUsernames.length} Operators</h3>
          <p className="text-[11px] text-muted dark:text-muted font-sans">Registered staff credentials used</p>
        </div>

      </div>

      {/* OPERATIONS LOG TABLES */}
      <div className="rounded-xl border border-default bg-card p-5 shadow-sm transition-colors">
        <h3 className="font-bold text-primary text-sm mb-4">Live Session Logs List</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-left text-xs text-muted dark:text-muted">
            <thead className="bg-table-header text-[10px] uppercase font-bold text-muted dark:text-muted border-b border-default">
              <tr>
                <th className="px-4 py-3">Username Logged</th>
                <th className="px-4 py-3">Session Timing</th>
                <th className="px-4 py-3 text-center">Status / Duration</th>
                <th className="px-4 py-3 text-center">Device / OS</th>
                <th className="px-4 py-3 text-center">Client Browser</th>
                <th className="px-4 py-3">Resolved IP Address</th>
                <th className="px-4 py-3 text-right">Physical Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-gray-800/60">
              {activities.map((act) => {
                // Determine if this session is currently online
                const isSessionOnline = !act.logoutTime && act.lastActiveAt && (now - new Date(act.lastActiveAt).getTime()) < 300000;

                return (
                  <tr key={act.id} className="hover:bg-table-hover transition-colors">
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
                        <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20 font-mono font-bold text-[10px] animate-pulse">
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
                    <td className="px-4 py-3 text-center text-muted dark:text-muted font-sans text-xs">
                      {act.browser}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-primary">
                      {act.ipAddress}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span 
                          className="text-xs font-sans text-primary max-w-[180px] truncate" 
                          title={act.locationName || "Local client connection"}
                        >
                          {act.locationName || "Local Connection"}
                        </span>
                        {act.latitude && act.longitude && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${act.latitude},${act.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                            title="View exact device geolocation on map"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {activities.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted dark:text-zinc-650">
                    No active operator logins recorded yet.
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
