import React from"react";
import { Activity, Clock, Monitor, Globe, Shield, RefreshCw } from"lucide-react";
import { SheetsSyncEngine } from"../utils/sheetsSync";

export default function UserActivitiesTab() {
 const activities = SheetsSyncEngine.getUserActivities();

 // Compute stats
 const totalLoggedInSessions = activities.length;
 
 // Calculate total seconds worked
 const totalSeconds = activities.reduce((sum, act) => sum + (act.activeSeconds || 0), 0);
 const totalHoursWorked = (totalSeconds / 3600).toFixed(1);

 // Get last active session
 const lastActiveText = activities.length > 0 
 ? `${activities[0].username} (Active: ${activities[0].loginTime} - ${activities[0].logoutTime ||"Current"})`
 :"None";

 // Unique users active count
 const activeUsernames = Array.from(new Set(activities.map(a => a.username)));

 return (
 <div className="space-y-6 animate-in fade-in duration-300">
 
 {/* HEADER SECTION */}
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-default pb-4 transition-colors">
 <div>
 <h1 className="text-xl font-extrabold tracking-tight text-primary font-sans flex items-center gap-2">
 <Activity className="h-5 w-5 text-emerald-500" />
 <span>User Activity Operations Report</span>
 </h1>
 <p className="text-xs text-secondary font-sans mt-0.5">
 Audit trail of active operating hours, session counts, terminal software details and IP addresses.
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
 <span>Total Auth Sessions</span>
 <Shield className="h-4.5 w-4.5 text-emerald-500" />
 </div>
 <h3 className="text-2xl font-bold text-primary font-mono">{totalLoggedInSessions}</h3>
 <p className="text-[11px] text-muted dark:text-muted font-sans">Recorded console entries</p>
 </div>

 <div className="rounded-xl border border-default bg-card p-5 shadow-sm space-y-2 transition-colors">
 <div className="flex items-center justify-between text-xs font-bold text-muted uppercase tracking-widest">
 <span>Unique Officers active</span>
 <Globe className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
 </div>
 <h3 className="text-2xl font-bold text-primary font-mono">{activeUsernames.length} Operators</h3>
 <p className="text-[11px] text-muted dark:text-muted font-sans">Active staff credentials</p>
 </div>

 <div className="rounded-xl border border-default bg-card p-5 shadow-sm space-y-2 transition-colors">
 <div className="flex items-center justify-between text-xs font-bold text-muted uppercase tracking-widest">
 <span>Terminal Last Active</span>
 <Monitor className="h-4.5 w-4.5 text-amber-500" />
 </div>
 <h3 className="text-[13px] font-bold text-amber-600 dark:text-amber-500 truncate mt-1.5">{lastActiveText}</h3>
 <p className="text-[11px] text-muted dark:text-muted">Current or past sessions log</p>
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
 <th className="px-4 py-3">Login Date</th>
 <th className="px-4 py-3 text-center">Login Time</th>
 <th className="px-4 py-3 text-center">Logout Time</th>
 <th className="px-4 py-3 text-center">Working Duration</th>
 <th className="px-4 py-3 text-center">Source Device</th>
 <th className="px-4 py-3 text-center">Client Browser</th>
 <th className="px-4 py-3 text-right">Resolved IP Address</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-150 dark:divide-gray-800/60">
 {activities.map((act) => (
 <tr key={act.id} className="hover:bg-table-hover transition-colors">
 <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400 font-mono">@{act.username}</td>
 <td className="px-4 py-3 font-semibold text-primary dark:text-primary">{act.loginDate}</td>
 <td className="px-4 py-3 text-center font-mono">{act.loginTime}</td>
 <td className="px-4 py-3 text-center font-mono text-muted dark:text-muted">{act.logoutTime ||"Active Now..."}</td>
 <td className="px-4 py-3 text-center">
 {act.logoutTime ? (
 <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-mono font-bold text-[10px] border border-emerald-100 dark:border-emerald-900">
 {act.sessionDuration ||"00h 01m"}
 </span>
 ) : (
 <span className="px-2 py-0.5 rounded bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 animate-pulse font-mono font-bold text-[10px] border border-red-100 dark:border-red-900">
 ACTIVE
 </span>
 )}
 </td>
 <td className="px-4 py-3 text-center text-muted dark:text-muted">{act.deviceType}</td>
 <td className="px-4 py-3 text-center text-muted dark:text-muted font-sans">{act.browser}</td>
 <td className="px-4 py-3 text-right text-muted dark:text-muted font-mono">{act.ipAddress}</td>
 </tr>
 ))}
 {activities.length === 0 && (
 <tr>
 <td colSpan={8} className="py-8 text-center text-muted dark:text-zinc-650">
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
