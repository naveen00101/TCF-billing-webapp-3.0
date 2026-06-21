import React from 'react';
import { Edit, Trash2, Layers } from 'lucide-react';
import { Product } from '../types';

export function ComboRegistryTable({ combos, onEdit, onDelete }: { combos: Product[], onEdit: (p: Product) => void, onDelete: (p: Product) => void }) {
  
  return (
    <div className="bg-card rounded-xl border border-default shadow-sm overflow-hidden animate-in fade-in">
      <div className="p-4 border-b border-default bg-surface/50">
        <h2 className="text-sm font-bold text-primary dark:text-zinc-100 flex items-center gap-2 uppercase tracking-tight">
          <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Combo Registry
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-muted dark:text-muted">
          <thead className="bg-table-header border-b border-default text-[10px] uppercase font-bold tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 text-blue-600 dark:text-blue-400">Combo Name</th>
              <th className="px-4 py-3">Total Price</th>
              <th className="px-4 py-3 text-center">Items Included</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
            {combos.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted font-medium">No combos found. Click Add Combo to create one.</td></tr>
            ) : (
              combos.map(combo => (
                <tr key={combo.id} className="hover:bg-table-hover dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-primary dark:text-zinc-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-muted" />
                    {combo.name}
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-blue-600 dark:text-blue-400">
                    ₹{combo.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center font-bold">
                    {combo.comboItems?.length || 0}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {combo.comboItems?.map(item => `${item.productName} (${item.variantName})`).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center items-center gap-1">
                      <button onClick={() => onEdit(combo)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 text-muted hover:text-blue-600 rounded transition-colors" title="Edit Combo"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => onDelete(combo)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-muted hover:text-red-600 rounded transition-colors" title="Delete Combo"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
