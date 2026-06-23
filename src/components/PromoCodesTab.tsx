import React, { useState } from"react";
import { Ticket, Plus, Trash2, Edit2, CheckCircle2, XCircle, AlertTriangle, Calendar, Percent, ShieldCheck } from"lucide-react";
import { PromoCode } from"../types";
import { SheetsSyncEngine } from"../utils/sheetsSync";

interface PromoCodesTabProps {
 onShowNotification: (text: string, type:"success" |"error" |"info") => void;
 onRefresh: () => void;
}

export default function PromoCodesTab({ onShowNotification, onRefresh }: PromoCodesTabProps) {
 const [promos, setPromos] = useState<PromoCode[]>(SheetsSyncEngine.getPromoCodes());
 
 // Dialog / form states
 const [isAdding, setIsAdding] = useState(false);
 const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);

 // Form states
 const [promoCode, setPromoCode] = useState("");
 const [description, setDescription] = useState("");
 const [discountType, setDiscountType] = useState<"Percentage" |"Fixed">("Percentage");
 const [percentageDiscount, setPercentageDiscount] = useState<number |"">("");
 const [fixedDiscount, setFixedDiscount] = useState<number |"">("");
 const [startDate, setStartDate] = useState("");
 const [endDate, setEndDate] = useState("");
 const [maximumUsage, setMaximumUsage] = useState<number>(100);

 const currentUser = SheetsSyncEngine.getCurrentUser();

 const reloadPromos = () => {
 const list = SheetsSyncEngine.getPromoCodes();
 setPromos(list);
 onRefresh();
 };

 const resetForm = () => {
 setPromoCode("");
 setDescription("");
 setDiscountType("Percentage");
 setPercentageDiscount("");
 setFixedDiscount("");
 setStartDate("");
 setEndDate("");
 setMaximumUsage(100);
 };

 const handleOpenAdd = () => {
 resetForm();
 setIsAdding(true);
 setEditingPromo(null);
 };

 const handleOpenEdit = (p: PromoCode) => {
 setEditingPromo(p);
 setPromoCode(p.promoCode);
 setDescription(p.description);
 setDiscountType(p.discountType);
 setPercentageDiscount(p.percentageDiscount ??"");
 setFixedDiscount(p.fixedDiscount ??"");
 setStartDate(p.startDate);
 setEndDate(p.endDate);
 setMaximumUsage(p.maximumUsage);
 setIsAdding(false);
 };

 const submitPromo = (e: React.FormEvent) => {
 e.preventDefault();
 if (!promoCode.trim() || !description.trim() || !startDate || !endDate) {
 onShowNotification("Please complete all required fields.","error");
 return;
 }

 const cleanCode = promoCode.trim().toUpperCase();

 // Validations
 if (discountType ==="Percentage" && (percentageDiscount ==="" || percentageDiscount < 1 || percentageDiscount > 100)) {
 onShowNotification("Please specify a valid Percentage Discount between 1% and 100%.","error");
 return;
 }

 if (discountType ==="Fixed" && (fixedDiscount ==="" || fixedDiscount < 1)) {
 onShowNotification("Please specify a valid Flat Cash Discount greater than ₹0.","error");
 return;
 }

 if (new Date(startDate) > new Date(endDate)) {
 onShowNotification("Start Date cannot be after the expiration End Date.","error");
 return;
 }

 const currentPromoList = SheetsSyncEngine.getPromoCodes();

 if (editingPromo) {
 // Editing Mode
 const updated = currentPromoList.map(item => {
 if (item.promoCode === editingPromo.promoCode) {
 return {
 ...item,
 promoCode: cleanCode,
 description: description.trim(),
 discountType,
 percentageDiscount: discountType ==="Percentage" ? Number(percentageDiscount) : undefined,
 fixedDiscount: discountType ==="Fixed" ? Number(fixedDiscount) : undefined,
 startDate,
 endDate,
 maximumUsage: Number(maximumUsage) || 100
 };
 }
 return item;
 });

 SheetsSyncEngine.savePromoCodes(updated);
 SheetsSyncEngine.addAuditLog(
"Promo Modified",
 currentUser?.fullName ||"System Admin",
 `Promo: ${editingPromo.promoCode}`,
 `Saved changes: ${cleanCode} (${discountType})`
 );

 onShowNotification(`✓ Promo Code ${cleanCode} updated successfully.`,"success");
 setEditingPromo(null);
 } else {
 // Adding Mode
 const isDuplicated = currentPromoList.some(p => p.promoCode === cleanCode);
 if (isDuplicated) {
 onShowNotification(`Validation Error: Promo Code '${cleanCode}' already exists.`,"error");
 return;
 }

 const newPromo: PromoCode = {
 promoCode: cleanCode,
 description: description.trim(),
 discountType,
 percentageDiscount: discountType ==="Percentage" ? Number(percentageDiscount) : undefined,
 fixedDiscount: discountType ==="Fixed" ? Number(fixedDiscount) : undefined,
 startDate,
 endDate,
 maximumUsage: Number(maximumUsage) || 100,
 usageCount: 0,
 activeStatus:"Active"
 };

 SheetsSyncEngine.savePromoCodes([newPromo, ...currentPromoList]);
 SheetsSyncEngine.addAuditLog(
"Promo Created",
 currentUser?.fullName ||"System Admin",
"None",
 `Created Promo voucher: ${cleanCode} (${discountType})`
 );

 onShowNotification(`✓ Promo Code ${cleanCode} created successfully.`,"success");
 setIsAdding(false);
 }

 resetForm();
 reloadPromos();
 };

 const handleDeletePromo = (code: string) => {
 const doubleConfirm = window.confirm(`Are you sure you want to permanently delete Promo Code '${code}'?`);
 if (!doubleConfirm) return;

 const list = SheetsSyncEngine.getPromoCodes();
 const filtered = list.filter(p => p.promoCode !== code);
 SheetsSyncEngine.savePromoCodes(filtered);

 SheetsSyncEngine.addAuditLog(
"Promo Deleted",
 currentUser?.fullName ||"System Admin",
 `Coupon: ${code}`,
 `Deleted coupon permanently from the ledger.`
 );

 onShowNotification(`✓ Promo Code ${code} deleted.`,"success");
 reloadPromos();
 };

 const handleTogglePromoStatus = (promo: PromoCode) => {
 const nextStatus:"Active" |"Disabled" = promo.activeStatus ==="Active" ?"Disabled" :"Active";
 const list = SheetsSyncEngine.getPromoCodes();
 const updated = list.map(p => {
 if (p.promoCode === promo.promoCode) {
 return { ...p, activeStatus: nextStatus };
 }
 return p;
 });

 SheetsSyncEngine.savePromoCodes(updated);

 SheetsSyncEngine.addAuditLog(
"Promo Status Toggled",
 currentUser?.fullName ||"System Admin",
 `${promo.promoCode} state: ${promo.activeStatus}`,
 `State updated to: ${nextStatus}`
 );

 onShowNotification(`✓ Coupon status set to ${nextStatus}`,"success");
 reloadPromos();
 };

 return (
 <div className="space-y-6 animate-in fade-in duration-300">
 
 {/* HEADER ROW */}
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-default pb-4">
 <div>
 <h1 className="text-xl font-bold tracking-tight text-primary font-sans flex items-center gap-2">
 <Ticket className="h-5 w-5 text-indigo-500" />
 <span>Promotion Code Manager</span>
 </h1>
 <p className="text-xs text-muted">
 Create coupons, manage discounts, set maximum usage caps, and view live active rates.
 </p>
 </div>
 <button
 onClick={handleOpenAdd}
 className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-primary hover:bg-blue-700 active:scale-95 transition-all outline-none border-none cursor-pointer"
 >
 <Plus className="h-4 w-4" />
 <span>New Promo Code</span>
 </button>
 </div>

 <div className="grid gap-6 lg:grid-cols-3">
 {/* LEFT: LIVE PROMOTIONAL LIST */}
 <div className="rounded-xl border border-default dark:border-default bg-card p-5 shadow-sm lg:col-span-2 space-y-4 h-fit">
 <h3 className="font-bold text-primary text-sm flex items-center gap-1.5">
 <ShieldCheck className="h-4 w-4 text-emerald-500" />
 <span>Voucher Ledger</span>
 </h3>

 <div className="overflow-x-auto">
 <table className="min-w-full table-auto text-left text-xs text-muted">
 <thead className="bg-table-header text-[10px] uppercase font-bold text-muted dark:text-muted border-b border-default">
 <tr>
 <th className="px-4 py-3">Promo Code</th>
 <th className="px-4 py-3">Details</th>
 <th className="px-4 py-3 text-center">Benefit</th>
 <th className="px-4 py-3 text-center">Period</th>
 <th className="px-4 py-3 text-center">Usage</th>
 <th className="px-4 py-3 text-center">Status</th>
 <th className="px-4 py-3 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {promos.map((p) => (
 <tr key={p.promoCode} className="hover:bg-table-hover">
 <td className="px-4 py-3 font-mono font-bold text-blue-600">{p.promoCode}</td>
 <td className="px-4 py-3 max-w-[180px]">
 <div className="font-medium text-primary truncate" title={p.description}>
 {p.description}
 </div>
 </td>
 <td className="px-4 py-3 text-center font-bold">
 {p.discountType ==="Percentage" ? (
 <span className="inline-flex items-center gap-0.5 text-indigo-600">
 <Percent className="h-3 w-3" /> {p.percentageDiscount}% Off
 </span>
 ) : (
 <span className="text-emerald-600">₹{p.fixedDiscount} Off</span>
 )}
 </td>
 <td className="px-4 py-3 text-center text-[10px] font-mono leading-tight">
 <div>{p.startDate}</div>
 <div className="text-muted">to {p.endDate}</div>
 </td>
 <td className="px-4 py-3 text-center font-mono">
 <span className="font-bold text-primary">{p.usageCount}</span>
 <span className="text-muted"> / {p.maximumUsage}</span>
 </td>
 <td className="px-4 py-3 text-center">
 <button
 onClick={() => handleTogglePromoStatus(p)}
 className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-extrabold border transition-colors outline-none cursor-pointer ${
 p.activeStatus ==="Active"
 ?"bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
 :"bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
 }`}
 >
 {p.activeStatus ==="Active" ? (
 <>
 <CheckCircle2 className="h-3 w-3" /> ACTIVE
 </>
 ) : (
 <>
 <XCircle className="h-3 w-3" /> DISABLED
 </>
 )}
 </button>
 </td>
 <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
 <button
 onClick={() => handleOpenEdit(p)}
 className="p-1 rounded text-muted hover:text-blue-600 inline-block bg-transparent"
 title="Edit Promo Parameters"
 >
 <Edit2 className="h-3.5 w-3.5" />
 </button>
 <button
 onClick={() => handleDeletePromo(p.promoCode)}
 className="p-1 rounded text-muted hover:text-red-500 inline-block bg-transparent"
 title="Delete Permanently"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </td>
 </tr>
 ))}
 {promos.length === 0 && (
 <tr>
 <td colSpan={7} className="py-8 text-center text-muted font-sans">
 No promo codes configured yet. Click 'New Promo Code' to get started.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* RIGHT: FORM ENTRY SPACE */}
 <div className="rounded-xl border border-default dark:border-default bg-card p-5 shadow-sm h-fit space-y-4">
 <h3 className="font-bold text-primary text-sm border-b border-default pb-2">
 {editingPromo ?"Edit Promo Code" : isAdding ?"Create Promo Code" :"Select Action"}
 </h3>

 {isAdding || editingPromo ? (
 <form onSubmit={submitPromo} className="space-y-4">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted block">Voucher Code</label>
 <input
 type="text"
 required
 placeholder="E.g., FESTIVE25"
 value={promoCode}
 onChange={(e) => setPromoCode(e.target.value.replace(/[^a-zA-Z0-9]/g,""))}
 disabled={!!editingPromo}
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs text-primary dark:text-primary uppercase font-mono focus:border-blue-500 outline-none"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted block">Description</label>
 <textarea
 required
 rows={2}
 placeholder="Describe details of discount usage..."
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs text-primary dark:text-primary focus:border-blue-500 outline-none"
 />
 </div>

 <div className="grid grid-cols-2 gap-2.5">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted block">Type</label>
 <select
 value={discountType}
 onChange={(e) => setDiscountType(e.target.value as"Percentage" |"Fixed")}
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs text-primary dark:text-primary outline-none"
 >
 <option value="Percentage">Percentage Ratio (%)</option>
 <option value="Fixed">Flat Amount Cash (₹)</option>
 </select>
 </div>

 {discountType ==="Percentage" ? (
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted block">Ratio %</label>
 <input
 type="number"
 required
 min="1"
 max="100"
 placeholder="10"
 value={percentageDiscount}
 onChange={(e) => setPercentageDiscount(e.target.value ==="" ?"" : Number(e.target.value))}
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs font-mono text-primary dark:text-primary outline-none"
 />
 </div>
 ) : (
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted block">Flat Off ₹</label>
 <input
 type="number"
 required
 min="1"
 placeholder="25"
 value={fixedDiscount}
 onChange={(e) => setFixedDiscount(e.target.value ==="" ?"" : Number(e.target.value))}
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs font-mono text-primary dark:text-primary outline-none"
 />
 </div>
 )}
 </div>

 <div className="grid grid-cols-2 gap-2.5">
 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted block flex items-center gap-1">
 <Calendar className="h-3 w-3 text-muted dark:text-muted" /> Start Date
 </label>
 <input
 type="date"
 required
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs font-mono text-primary dark:text-primary outline-none"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted block flex items-center gap-1">
 <Calendar className="h-3 w-3 text-muted dark:text-muted" /> End Date
 </label>
 <input
 type="date"
 required
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs font-mono text-primary dark:text-primary outline-none"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] uppercase font-bold text-muted dark:text-muted block">Maximum Usage Limit</label>
 <input
 type="number"
 required
 min="1"
 placeholder="E.g., 200"
 value={maximumUsage}
 onChange={(e) => setMaximumUsage(Number(e.target.value) || 100)}
 className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-xs font-mono text-primary dark:text-primary outline-none"
 />
 </div>

 <div className="flex gap-2 pt-2">
 <button
 type="submit"
 className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-bold text-primary hover:bg-blue-700 transition cursor-pointer"
 >
 Save Voucher
 </button>
 <button
 type="button"
 onClick={() => { setIsAdding(false); setEditingPromo(null); }}
 className="rounded-lg border border-default px-4 py-2 text-xs font-bold text-muted dark:text-muted hover:bg-card-secondary dark:hover:bg-neutral-800 bg-transparent cursor-pointer"
 >
 Cancel
 </button>
 </div>
 </form>
 ) : (
 <div className="py-12 text-center text-muted space-y-2">
 <Ticket className="h-10 w-10 mx-auto text-gray-200 shrink-0" />
 <h4 className="text-xs font-bold text-muted">Select an Operation</h4>
 <p className="text-[10px] leading-relaxed max-w-[200px] mx-auto">
 Configure promotional vouchers or coupons, or edit an existing discount campaign code in the table.
 </p>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
