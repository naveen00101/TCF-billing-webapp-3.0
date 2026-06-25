import React, { useState } from "react";
import { Users, UserPlus, Trash2, Edit2, Key, ToggleLeft, ToggleRight, CheckCircle2, ShieldAlert, BadgeCheck, Eye, EyeOff } from "lucide-react";
import { User, UserRole } from "../types";
import { SheetsSyncEngine } from "../utils/sheetsSync";
import MD5 from "crypto-js/md5";

interface UserControlsTabProps {
 onShowNotification: (text: string, type:"success" |"error" |"info") => void;
 onRefresh: () => void;
}

export default function UserControlsTab({ onShowNotification, onRefresh }: UserControlsTabProps) {
 const currentUser = SheetsSyncEngine.getCurrentUser();
 const isSuperadmin = currentUser?.role === "Superadmin";

 const [users, setUsers] = useState<User[]>(() => {
   const list = SheetsSyncEngine.getUsers().filter(u => u.status !== "Deleted");
   if (isSuperadmin) return list;
   return list.filter(u => u.role !== "Superadmin");
 });
 
 // Dialog / Edit states
 const [isAdding, setIsAdding] = useState(false);
 const [editingUser, setEditingUser] = useState<User | null>(null);
 const [resettingUser, setResettingUser] = useState<User | null>(null);

 // Form states
 const [fullName, setFullName] = useState("");
 const [username, setUsername] = useState("");
 const [email, setEmail] = useState("");
 const [mobile, setMobile] = useState("");
 const [role, setRole] = useState<UserRole>("Employee");
 const [password, setPassword] = useState("");
 const [newPasswordValue, setNewPasswordValue] = useState("");
 const [showPassword, setShowPassword] = useState(false);
 const [showResetPassword, setShowResetPassword] = useState(false);

 const reloadUsers = () => {
   const list = SheetsSyncEngine.getUsers().filter(u => u.status !== "Deleted");
   const filtered = isSuperadmin ? list : list.filter(u => u.role !== "Superadmin");
   setUsers(filtered);
   if (onRefresh) onRefresh();
 };

 // 1. Submit Add User
 const handleAddUser = (e: React.FormEvent) => {
 e.preventDefault();
 if (!fullName.trim() || !username.trim() || !password.trim()) {
 onShowNotification("Please fill all mandatory user fields.","error");
 return;
 }

 const checkDuplicate = SheetsSyncEngine.getUsers().filter(u => u.status !== "Deleted").some(u => u.username.toLowerCase() === username.trim().toLowerCase());
 if (checkDuplicate) {
 onShowNotification(`A user with username '${username}' already exists.`,"error");
 return;
 }

 const newUser: User = {
 id: `USER-${Date.now()}`,
 fullName: fullName.trim(),
 username: username.trim().toLowerCase(),
 email: email.trim(),
 mobile: mobile.trim(),
 role,
 status:"Active",
 dateCreated: new Date().toISOString().split("T")[0],
 passwordHash: MD5(password).toString()
 };

 const allUsersAdd = SheetsSyncEngine.getUsers();
 const updatedAdd = [...allUsersAdd, newUser];
 SheetsSyncEngine.saveUsers(updatedAdd);
 
 // Audit log
 const currentUser = SheetsSyncEngine.getCurrentUser();
 SheetsSyncEngine.addAuditLog(
"User Added",
 currentUser?.fullName ||"System Admin",
"None",
 `Created new user account: ${fullName} (${role}) with username '${username}'`
 );

 onShowNotification(`✓ Account created for ${fullName} successful.`,"success");
 setIsAdding(false);
 resetForm();
 reloadUsers();
 };

 // 2. Submit Edit User
 const handleEditUser = (e: React.FormEvent) => {
 e.preventDefault();
 if (!editingUser) return;

 const allUsersEdit = SheetsSyncEngine.getUsers();
 const updatedEdit: User[] = allUsersEdit.map(u => {
 if (u.id === editingUser.id) {
 return {
 ...u,
 fullName: fullName.trim(),
 email: email.trim(),
 mobile: mobile.trim(),
 role
 };
 }
 return u;
 });

 SheetsSyncEngine.saveUsers(updatedEdit);
 
 const currentUser = SheetsSyncEngine.getCurrentUser();
 SheetsSyncEngine.addAuditLog(
"User Edited",
 currentUser?.fullName ||"System Admin",
 `Prev: ${editingUser.fullName} (${editingUser.role})`,
 `New: ${fullName} (${role}) - ID: ${editingUser.id}`
 );

 onShowNotification("✓ Account details updated successfully.","success");
 setEditingUser(null);
 resetForm();
 reloadUsers();
 };

 // 3. Initiate password reset
 const handleResetPassword = (e: React.FormEvent) => {
 e.preventDefault();
 if (!resettingUser || !newPasswordValue.trim()) return;

 const allUsersReset = SheetsSyncEngine.getUsers();
 const updatedReset: User[] = allUsersReset.map(u => {
 if (u.id === resettingUser.id) {
 return { ...u, passwordHash: MD5(newPasswordValue.trim()).toString() };
 }
 return u;
 });

 SheetsSyncEngine.saveUsers(updatedReset);

 const currentUser = SheetsSyncEngine.getCurrentUser();
 SheetsSyncEngine.addAuditLog(
"Password Reset",
 currentUser?.fullName ||"System Admin",
"Confidential PIN code",
 `Password override completed for username: ${resettingUser.username}`
 );

 onShowNotification(`✓ Password for ${resettingUser.fullName} has been reset.`,"success");
 setResettingUser(null);
 setNewPasswordValue("");
 reloadUsers();
 };

 const startReset = (u: User) => {
    if (u.role === "Superadmin" && !isSuperadmin) {
      onShowNotification("Access Denied: Standard administrators cannot modify Superadmin accounts.", "error");
      return;
    }
    setResettingUser(u);
    setEditingUser(null);
  };

 // 4. Toggle Status (Active / Disabled)
 const handleToggleStatus = (u: User) => {
    if (u.role === "Superadmin" && !isSuperadmin) {
      onShowNotification("Access Denied: Standard administrators cannot modify Superadmin accounts.", "error");
      return;
    }
 // Cannot disable yourself!
 const currentUser = SheetsSyncEngine.getCurrentUser();
 if (currentUser && currentUser.username === u.username) {
 onShowNotification("You cannot disable your own administrator account.","error");
 return;
 }

 const nextStatus:"Active" |"Disabled" = u.status ==="Active" ?"Disabled" :"Active";
 const allUsersToggle = SheetsSyncEngine.getUsers();
 const updatedToggle: User[] = allUsersToggle.map(item => {
 if (item.id === u.id) {
 return { ...item, status: nextStatus };
 }
 return item;
 });

 SheetsSyncEngine.saveUsers(updatedToggle);

 SheetsSyncEngine.addAuditLog(
"User Status Changed",
 currentUser?.fullName ||"System Admin",
 `${u.fullName} status: ${u.status}`,
 `Modified status keyword to: ${nextStatus}`
 );

 onShowNotification(`✓ Account for ${u.fullName} is now ${nextStatus}.`,"success");
 reloadUsers();
 };

 // 5. Delete User account
  const handleDeleteUser = (u: User) => {
    if (u.role === "Superadmin" && !isSuperadmin) {
      onShowNotification("Access Denied: Standard administrators cannot modify Superadmin accounts.", "error");
      return;
    }
    const currentUser = SheetsSyncEngine.getCurrentUser();
    if (currentUser && currentUser.username === u.username) {
      onShowNotification("You cannot delete your own active session account.", "error");
      return;
    }

    const confirmDel = window.confirm(`Are you sure you want to delete user '${u.fullName}'?`);
    if (!confirmDel) return;

    // Load full list to map the deletion
    const fullList = SheetsSyncEngine.getUsers();
    const updated = fullList.map(item => item.id === u.id ? { ...item, status: "Deleted" as const } : item);
    SheetsSyncEngine.saveUsers(updated);

    SheetsSyncEngine.addAuditLog(
      "User Deleted",
      currentUser?.fullName || "System Admin",
      `${u.fullName} (${u.role})`,
      `Moved user account to Trash`
    );

    onShowNotification(`✓ Account for ${u.fullName} moved to Trash successfully.`, "success");
    reloadUsers();
  };

 const resetForm = () => {
 setFullName("");
 setUsername("");
 setEmail("");
 setMobile("");
 setRole("Employee");
 setPassword("");
 };

 const startEdit = (u: User) => {
    if (u.role === "Superadmin" && !isSuperadmin) {
      onShowNotification("Access Denied: Standard administrators cannot modify Superadmin accounts.", "error");
      return;
    }
 setEditingUser(u);
 setFullName(u.fullName);
 setUsername(u.username);
 setEmail(u.email);
 setMobile(u.mobile);
 setRole(u.role);
 setIsAdding(false);
 };

 return (
 <div className="space-y-6 animate-in fade-in duration-300">
 
 {/* HEADER CONTROLS */}
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-default pb-4">
 <div>
 <h1 className="text-xl font-extrabold tracking-tight text-primary font-sans flex items-center gap-2">
 <Users className="h-5 w-5 text-blue-600" />
 <span>Staff & Client Access Management</span>
 </h1>
 <p className="text-xs text-muted font-sans mt-0.5">
 Admin console to assign roles, revoke terminal clearances, edit logins record and override passwords.
 </p>
 </div>
 {!isAdding && !editingUser && (
 <button
 onClick={() => { setIsAdding(true); resetForm(); }}
 className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-primary shadow-md hover:bg-blue-700 active:scale-95 transition-all w-fit"
 >
 <UserPlus className="h-4 w-4" />
 <span>Enroll New User</span>
 </button>
 )}
 </div>

 {/* FORM: ADDING NEW USER */}
 {isAdding && (
 <div className="rounded-xl border border-blue-500/25 bg-blue-600/5 p-5 animate-in slide-in-from-top-4 duration-300 space-y-4">
 <div className="flex items-center justify-between border-b border-default pb-2">
 <h3 className="font-bold text-sm text-primary dark:text-primary flex items-center gap-1.5">
 <UserPlus className="h-4 w-4 text-blue-500 dark:text-blue-400" />
 <span>Enroll New User Account</span>
 </h3>
 <button onClick={() => setIsAdding(false)} className="text-xs text-muted hover:text-primary dark:hover:text-primary">&times; Cancel</button>
 </div>
 
 <form onSubmit={handleAddUser} className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Full Name</label>
 <input
 type="text"
 required
 value={fullName}
 onChange={(e) => setFullName(e.target.value)}
 placeholder="E.g., Jane Cooper"
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs focus:border-blue-500 outline-none text-primary dark:text-primary"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Username (Login Key)</label>
 <input
 type="text"
 required
 value={username}
 onChange={(e) => setUsername(e.target.value)}
 placeholder="lowercase-only"
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs focus:border-blue-500 outline-none text-primary dark:text-primary font-mono"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Security Password</label>
 <div className="relative">
 <input
 type={showPassword ? "text" : "password"}
 required
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="•••••"
 className="w-full rounded-lg border border-default bg-surface pl-3 pr-9 py-2 text-xs focus:border-blue-500 outline-none text-primary dark:text-primary font-mono"
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3 top-2.5 text-muted dark:text-muted hover:text-primary dark:hover:text-primary focus:outline-none"
 >
 {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
 </button>
 </div>
 </div>

  <div className="space-y-1">
  <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Officer Role Clearances</label>
  <select
  value={role}
  onChange={(e) => setRole(e.target.value as UserRole)}
  className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs focus:border-blue-500 outline-none text-primary dark:text-primary font-sans"
  >
  <option value="Superadmin">Superadmin (All Clearance + Audit Trail)</option>
  <option value="Admin">Admin (Control Panel without Operator Trail)</option>
  <option value="Manager">Manager (Edit, Print, View logs)</option>
  <option value="Employee">Employee (Checkout & Receipts only)</option>
  </select>
  </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Primary Email Address</label>
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="name@tcfshowroom.com"
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs focus:border-red-500 outline-none text-primary dark:text-primary"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Mobile Number</label>
 <input
 type="text"
 value={mobile}
 onChange={(e) => setMobile(e.target.value)}
 placeholder="+91-8644-22XXXX"
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs focus:border-red-500 outline-none text-primary dark:text-primary font-mono"
 />
 </div>

 <div className="sm:col-span-2 md:col-span-3 pt-2">
 <button
 type="submit"
 className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-primary hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
 >
 Create Staff Account
 </button>
 </div>
 </form>
 </div>
 )}

 {/* FORM: EDITING EXISTING USER */}
 {editingUser && (
 <div className="rounded-xl border border-amber-500/25 bg-amber-600/5 p-5 animate-in slide-in-from-top-4 duration-300 space-y-4">
 <div className="flex items-center justify-between border-b border-default pb-2">
 <h3 className="font-bold text-sm text-primary dark:text-primary flex items-center gap-1.5">
 <Edit2 className="h-4 w-4 text-amber-500" />
 <span>Modify Employee File ({editingUser.fullName})</span>
 </h3>
 <button onClick={() => setEditingUser(null)} className="text-xs text-muted hover:text-primary dark:hover:text-primary">&times; Close</button>
 </div>
 
 <form onSubmit={handleEditUser} className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Full Name</label>
 <input
 type="text"
 required
 value={fullName}
 onChange={(e) => setFullName(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs focus:border-blue-500 outline-none text-primary dark:text-primary"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Username (Fixed)</label>
 <input
 type="text"
 disabled
 value={username}
 className="w-full rounded-lg border border-default bg-card-secondary  px-3 py-2 text-xs text-muted dark:text-muted font-mono"
 />
 </div>

  <div className="space-y-1">
  <label className="text-[10px] uppercase font-bold text-muted">Officer Role Clearances</label>
  <select
  value={role}
  onChange={(e) => setRole(e.target.value as UserRole)}
  className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs focus:border-blue-500 outline-none text-primary dark:text-primary"
  >
  <option value="Superadmin">Superadmin (All Clearance)</option>
  <option value="Admin">Admin (Control Panel)</option>
  <option value="Manager">Manager (Edit Invoices)</option>
  <option value="Employee">Employee (Checkout, Print)</option>
  </select>
  </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Email Address</label>
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs focus:border-blue-500 outline-none text-primary dark:text-primary"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted">Mobile Number</label>
 <input
 type="text"
 value={mobile}
 onChange={(e) => setMobile(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs focus:border-blue-500 outline-none text-primary dark:text-primary font-mono"
 />
 </div>

 <div className="sm:col-span-2 md:col-span-3 pt-2">
 <button
 type="submit"
 className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-primary hover:bg-amber-700 active:scale-95 transition-all cursor-pointer"
 >
 Save Details Change
 </button>
 </div>
 </form>
 </div>
 )}

 {/* MODAL: RESET PASSWORD */}
 {resettingUser && (
 <div className="rounded-xl border border-red-500/25 bg-red-600/5 p-5 animate-in slide-in-from-top-4 duration-300 space-y-4">
 <div className="flex items-center justify-between border-b border-default pb-2">
 <h3 className="font-bold text-sm text-primary dark:text-primary flex items-center gap-1.5">
 <Key className="h-4 w-4 text-red-500" />
 <span>Reset Access PIN for: {resettingUser.fullName} (@{resettingUser.username})</span>
 </h3>
 <button onClick={() => { setResettingUser(null); setNewPasswordValue(""); }} className="text-xs text-muted hover:text-primary dark:hover:text-primary">&times; Cancel</button>
 </div>
 
 <form onSubmit={handleResetPassword} className="flex gap-4 items-end max-w-md">
 <div className="space-y-1 flex-1">
 <label className="text-[10px] uppercase font-bold text-muted">Enter New Password PIN</label>
 <div className="relative">
 <input
 type={showResetPassword ? "text" : "password"}
 required
 value={newPasswordValue}
 onChange={(e) => setNewPasswordValue(e.target.value)}
 placeholder="Enter raw secret"
 className="w-full rounded-lg border border-default bg-surface pl-3 pr-9 py-2 text-xs focus:border-blue-500 outline-none text-primary dark:text-primary font-mono"
 />
 <button
 type="button"
 onClick={() => setShowResetPassword(!showResetPassword)}
 className="absolute right-3 top-2.5 text-muted dark:text-muted hover:text-primary dark:hover:text-primary focus:outline-none"
 >
 {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
 </button>
 </div>
 </div>
 <button
 type="submit"
 className="rounded-lg bg-red-600 px-4 py-2.5 text-xs font-bold text-primary hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
 >
 Set Password Override
 </button>
 </form>
 </div>
 )}

 {/* DATA ACCESS REGISTRY */}
 <div className="rounded-xl border border-default dark:border-default bg-card p-5 shadow-sm transition-colors">
 <h3 className="font-bold text-primary dark:text-primary text-sm mb-4">Credentials Ledger</h3>
 <div className="overflow-x-auto">
 <table className="min-w-full table-auto text-left text-xs text-muted">
 <thead className="bg-table-header text-[10px] uppercase font-bold text-muted dark:text-muted border-b border-default">
 <tr>
 <th className="px-4 py-3">Legal Name</th>
 <th className="px-4 py-3">Role Status</th>
 <th className="px-4 py-3">Logged Username</th>
 <th className="px-4 py-3">Contact</th>
 <th className="px-4 py-3">Enroll Date</th>
 <th className="px-4 py-3">Last Active Login</th>
 <th className="px-4 py-3 text-right">Actions Clearance</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {users.map((u) => (
 <tr key={u.id} className="hover:bg-table-hover">
 <td className="px-4 py-3">
 <div className="flex flex-col">
 <span className="font-bold text-primary">{u.fullName}</span>
 <span className="text-[10px] text-muted font-mono">ID: {u.id}</span>
 </div>
 </td>
 <td className="px-4 py-3">
 <div className="flex gap-1.5 flex-wrap">
  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
  u.role === "Superadmin" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
  u.role ==="Admin" ?"bg-blue-500/10 text-blue-400 border border-blue-500/20" :
  u.role ==="Manager" ?"bg-amber-500/10 text-amber-500 border border-amber-500/20" :
  "bg-zinc-500/10 text-muted border border-zinc-500/20"
  }`}>
  {u.role.toUpperCase()}
  </span>

 <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
 u.status ==="Active" ?"bg-green-500/10 text-green-400 border border-green-500/20" :
"bg-red-500/10 text-red-500 border border-red-500/20"
 }`}>
 {u.status.toUpperCase()}
 </span>
 </div>
 </td>
 <td className="px-4 py-3 font-mono text-muted">@{u.username}</td>
 <td className="px-4 py-3 font-sans">
 <div className="flex flex-col">
 <span>{u.email ||"No Email"}</span>
 <span className="text-[10px] text-muted font-mono">{u.mobile ||"No Mobile"}</span>
 </div>
 </td>
 <td className="px-4 py-3 font-mono">{u.dateCreated}</td>
 <td className="px-4 py-3 text-muted">{u.lastLogin ||"Never"}</td>
 <td className="px-4 py-3 text-right h-full">
 <div className="inline-flex gap-2.5 items-center justify-end">
 {/* Toggle status */}
 <button
 onClick={() => handleToggleStatus(u)}
 title={u.status ==="Active" ?"Disable Employee" :"Enable Employee"}
 className="text-muted hover:text-blue-600 transition-colors"
 >
 {u.status ==="Active" ? <ToggleRight className="h-4.5 w-4.5 text-blue-500" /> : <ToggleLeft className="h-4.5 w-4.5 text-muted" />}
 </button>

 {/* Reset Pass */}
 <button
 onClick={() => startReset(u)}
 title="Override Password Codes"
 className="text-muted hover:text-red-500 transition-colors"
 >
 <Key className="h-4 w-4" />
 </button>

 {/* Edit details */}
 <button
 onClick={() => startEdit(u)}
 title="Edit Profile"
 className="text-muted hover:text-amber-500 transition-colors"
 >
 <Edit2 className="h-4 w-4" />
 </button>

 {/* Cancel/Delete */}
 <button
 onClick={() => handleDeleteUser(u)}
 title="Delete User permanently"
 className="text-muted hover:text-red-600 transition-colors"
 >
 <Trash2 className="h-4 w-4" />
 </button>
 </div>
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
