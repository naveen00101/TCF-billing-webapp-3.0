import React from"react";
import { FileEdit, Trash2, ArrowRight } from"lucide-react";
import { SheetsSyncEngine } from"../utils/sheetsSync";

interface DraftsTabProps {
 onNavigateToTab: (tab: string) => void;
 onShowNotification: (text: string, type:"success" |"info" |"error") => void;
}

export default function DraftsTab({ onNavigateToTab, onShowNotification }: DraftsTabProps) {
 const [drafts, setDrafts] = React.useState<any[]>(() => SheetsSyncEngine.getDrafts());

 const handleResume = (id: string) => {
 // Navigate to billing. Draft should auto load if it's the only one or we could pass ID.
 // Given our prompt resume logic, it takes first draft.
 const selectedDraft = drafts.find(d => d.id === id);
 if (!selectedDraft) return;

 // Filter others to ensure selected is first
 const filtered = drafts.filter(d => d.id !== id);
 SheetsSyncEngine.saveDrafts([selectedDraft, ...filtered]);

 onNavigateToTab("billing");
 };

 const handleDelete = (id: string) => {
 SheetsSyncEngine.deleteDraft(id);
 setDrafts(SheetsSyncEngine.getDrafts());
 onShowNotification("Draft deleted.","info");
 };

 return (
 <div className="space-y-6 animate-in fade-in duration-300">
 <div className="flex items-center justify-between">
 <h2 className="text-xl font-bold font-display text-primary dark:text-primary">Draft Invoices</h2>
 </div>

 <div className="rounded-xl border border-default bg-card shadow-sm overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm">
 <thead className="bg-surface/50 text-muted/50 dark:text-muted">
 <tr>
 <th className="px-6 py-3 font-semibold text-xs uppercase">Draft ID</th>
 <th className="px-6 py-3 font-semibold text-xs uppercase">Created Date</th>
 <th className="px-6 py-3 font-semibold text-xs uppercase">Customer Name</th>
 <th className="px-6 py-3 font-semibold text-xs uppercase text-right">Draft Amount</th>
 <th className="px-6 py-3 font-semibold text-xs uppercase text-center">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {drafts.length === 0 ? (
 <tr>
 <td colSpan={5} className="px-6 py-12 text-center text-muted dark:text-muted font-sans">
 No matching drafts found. Checkouts are safe and completed.
 </td>
 </tr>
 ) : (
 drafts.map((draft) => (
 <tr key={draft.id} className="hover:bg-table-hover transition-colors dark:hover:bg-card/50">
 <td className="px-6 py-3">
 <span className="font-mono text-xs font-bold text-primary dark:text-zinc-200">
 {draft.id}
 </span>
 </td>
 <td className="px-6 py-3 text-muted dark:text-muted font-mono text-xs">
 {new Date(draft.createdDate).toLocaleString()}
 </td>
 <td className="px-6 py-3 font-semibold text-primary dark:text-zinc-200 text-xs truncate max-w-[200px]">
 {draft.customerName ||"Walk-in Customer"}
 </td>
 <td className="px-6 py-3 text-right">
 <span className="font-mono text-sm font-bold text-primary dark:text-primary">
 ₹{(draft.draftAmount || 0).toFixed(2)}
 </span>
 </td>
 <td className="px-6 py-3">
 <div className="flex items-center justify-center gap-2">
 <button
 onClick={() => handleResume(draft.id)}
 className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors border-none cursor-pointer flex items-center justify-center dark:hover:bg-blue-900/30"
 title="Resume Draft"
 >
 <FileEdit className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleDelete(draft.id)}
 className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors border-none cursor-pointer flex items-center justify-center dark:hover:bg-rose-900/30"
 title="Delete Draft"
 >
 <Trash2 className="h-4 w-4" />
 </button>
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}
