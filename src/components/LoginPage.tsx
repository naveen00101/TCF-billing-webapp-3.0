import React, { useState } from"react";
import { Lock, User, Check, ShieldAlert, Key, Eye, EyeOff } from"lucide-react";
import { SheetsSyncEngine } from"../utils/sheetsSync";
import { User as UserType } from"../types";
import { SYSTEM_LOGO } from"../constants/branding";
import MD5 from "crypto-js/md5";

interface LoginPageProps {
 onLoginSuccess: (user: UserType) => void;
 onShowNotification: (text: string, type:"success" |"error" |"info") => void;
}

export default function LoginPage({ onLoginSuccess, onShowNotification }: LoginPageProps) {
 const [username, setUsername] = useState("");
 const [password, setPassword] = useState("");
 const [rememberMe, setRememberMe] = useState(true);
 const [isLoading, setIsLoading] = useState(false);
 const [showPassword, setShowPassword] = useState(false);

 // Read Company Settings for dynamic Logo & Titles
 const company = SheetsSyncEngine.getCompanySettings();
 const companyName = company.companyName ||"Tenali Central Furniture";
 const shortName = company.shortName ||"TCF Smart Billing";
 const logoSrc = SYSTEM_LOGO;

 const handleLogin = (e: React.FormEvent) => {
 e.preventDefault();
 if (!username.trim() || !password.trim()) {
 onShowNotification("Please enter both Username and Password.","error");
 return;
 }

 setIsLoading(true);

 // Dynamic login delay for modern security feel
 setTimeout(() => {
 const users = SheetsSyncEngine.getUsers();
 const matchedUser = users.find(
 (u) => u.username.toLowerCase() === username.trim().toLowerCase()
 );

 if (!matchedUser) {
 onShowNotification("Invalid username or password credentials.","error");
 setIsLoading(false);
 return;
 }

 if (matchedUser.status ==="Disabled") {
 onShowNotification("This employee account has been disabled by the administrator.","error");
 setIsLoading(false);
 return;
 }

 if (matchedUser.passwordHash !== MD5(password).toString()) {
 onShowNotification("Access Denied: Incorrect password code.","error");
 setIsLoading(false);
 return;
 }

 // Success setup session
 const actId = SheetsSyncEngine.recordLoginActivity(matchedUser.username);
 
 const updatedUserRef = { ...matchedUser, lastLogin: new Date().toLocaleString() };
 // Save last login time
 const index = users.findIndex(u => u.id === matchedUser.id);
 if (index !== -1) {
 users[index] = updatedUserRef;
 SheetsSyncEngine.saveUsers(users);
 }

 // Store current session user and active activity logging key
 SheetsSyncEngine.setCurrentUser(updatedUserRef);
 localStorage.setItem("billing_active_activity_id", actId);
 if (rememberMe) {
 localStorage.setItem("billing_remembered_username", username);
 } else {
 localStorage.removeItem("billing_remembered_username");
 }

 SheetsSyncEngine.addAuditLog(
"User Logged In",
 matchedUser.fullName,
"Logged Out",
 `Successful auth login into ERP console. Device validated.`
 );

 onLoginSuccess(updatedUserRef);
 onShowNotification(`✓ Welcome back, ${matchedUser.fullName}! (${matchedUser.role} Session Initiated)`,"success");
 setIsLoading(false);
 }, 600);
 };

 // Pre-fill helper
 const quickFill = (role:"admin" |"manager" |"employee") => {
 setUsername(role);
 setPassword(role +"123");
 onShowNotification(`Credential fields pre-filled for: ${role.toUpperCase()}`,"info");
 };

 // Check if there is a remembered username on load
 React.useEffect(() => {
 const saved = localStorage.getItem("billing_remembered_username");
 if (saved) {
 setUsername(saved);
 }
 }, []);

 return (
 <div className="min-h-screen w-full bg-surface text-primary dark:text-gray-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
 
 {/* Decorative backdrop mesh using original Blue color theme */}
 <div className="absolute top-1/4 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[350px] h-[350px] rounded-full bg-blue-600/10 blur-[90px]" />
 <div className="absolute bottom-1/4 right-1/4 translate-y-1/2 translate-x-1/2 w-[250px] h-[250px] rounded-full bg-emerald-600/10 blur-[80px]" />

 <div className="w-full max-w-sm rounded-2xl border border-default bg-card p-8 shadow-2xl space-y-6 relative z-10 transition-colors duration-200">
 
 {/* Banner header to represent high-quality TCF Furniture brand */}
 <div className="text-center space-y-3">
 <div className="flex items-center justify-center space-x-3 mb-1">
 {logoSrc ? (
 <img 
 src={logoSrc} 
 alt={`${companyName} Logo`} 
 className="w-14 h-14 object-contain rounded-xl shadow-md border border-default dark:border-default" 
 referrerPolicy="no-referrer"
 />
 ) : (
 <div className="relative w-12 h-12 bg-red-655 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/30">
 {/* Armchair icon drawing */}
 <svg viewBox="0 0 24 24" className="w-7 h-7 text-primary fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
 {/* Rounded armchair outline back and seat */}
 <path d="M4 18v-4c0-3.3 2.7-6 6-6h4c3.3 0 6 2.7 6 6v4" />
 <path d="M6 13h12" />
 <path d="M8 13v5" />
 <path d="M16 13v5" />
 {/* Spiral-like armrest detail */}
 <circle cx="5" cy="13" r="1.5" />
 <circle cx="19" cy="13" r="1.5" />
 {/* Little"x" button-tuft on the back cushion */}
 <path d="M11.5 10l1 1M12.5 10l-1 1" />
 </svg>
 </div>
 )}
 <div className="flex flex-col text-left leading-none font-sans font-black text-red-600">
 <span className="text-[14px] tracking-tight">T</span>
 <span className="text-[14px] tracking-tight">C</span>
 <span className="text-[14px] tracking-tight">F</span>
 </div>
 </div>
 <div>
 <h1 className="text-2xl font-black tracking-tight text-primary dark:text-primary font-sans">{shortName}</h1>
 <p className="text-[10px] text-muted dark:text-muted font-sans tracking-wide uppercase font-bold">
 {companyName}
 </p>
 </div>
 </div>

 {/* Input Form */}
 <form onSubmit={handleLogin} className="space-y-4 pt-1">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Security Username</label>
 <div className="relative">
 <User className="absolute left-3 top-2.5 h-4 w-4 text-muted dark:text-muted" />
 <input
 type="text"
 required
 value={username}
 onChange={(e) => setUsername(e.target.value)}
 placeholder="Enter username"
 className="w-full rounded-lg border border-default bg-surface  pl-9 pr-3 py-2 text-xs focus:border-blue-500 outline-none text-primary dark:text-primary font-sans"
 />
 </div>
 </div>

 <div className="space-y-1">
 <div className="flex justify-between items-center">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted">Access Password</label>
 <span className="text-[9px] text-muted dark:text-muted italic">Plain PIN matching role</span>
 </div>
 <div className="relative">
 <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted dark:text-muted" />
 <input
 type={showPassword ? "text" : "password"}
 required
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="••••••••"
 className="w-full rounded-lg border border-default bg-surface  pl-9 pr-9 py-2 text-xs focus:border-blue-500 outline-none text-primary dark:text-primary font-mono"
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

 {/* Remember Me Toggle */}
 <div className="flex items-center justify-between pt-1">
 <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted dark:text-muted select-none">
 <input
 type="checkbox"
 checked={rememberMe}
 onChange={(e) => setRememberMe(e.target.checked)}
 className="rounded border-default bg-gray-150  checked:bg-blue-600 focus:ring-0 w-3.5 h-3.5 text-blue-600"
 />
 <span>Remember Me</span>
 </label>
 <span className="text-[10px] text-muted hover:underline cursor-pointer">Forgot access?</span>
 </div>

 {/* Login Action */}
 <button
 type="submit"
 disabled={isLoading}
 className="flex w-full items-center justify-center rounded-lg bg-blue-600 py-3 text-xs font-semibold text-primary shadow-xl shadow-blue-600/15 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
 >
 {isLoading ?"Validating Session Security..." :"Initiate Secure Login"}
 </button>
 </form>
 </div>
 </div>
 );
}
