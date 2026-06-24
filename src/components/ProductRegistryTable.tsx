import React from 'react';
import { Edit, Trash2, Package } from 'lucide-react';
import { Product } from '../types';

// Safely parse a field that may be a JSON-stringified array (e.g. from Google Sheets sync)
function safeArray<T>(val: T[] | string | undefined | null): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

interface GroupedProduct {
 product: Product;
 categoryPath: string;
 configCount: number;
 skuCount: number;
}

export function ProductRegistryTable({ products, onEdit, onDelete }: { products: Product[], onEdit: (p: Product) => void, onDelete: (p: Product) => void }) {
  const rows: GroupedProduct[] = products.map(p => {
    const categoryPath = p.category || 'Uncategorized';
    const skuCount = safeArray(p.simpleVariants).length;
    return { product: p, categoryPath, configCount: 0, skuCount };
  });

 return (
 <div className="bg-card rounded-xl border border-default shadow-sm overflow-hidden animate-in fade-in">
 <div className="p-4 border-b border-default bg-surface/50 /50">
 <h2 className="text-sm font-bold text-primary dark:text-zinc-100 flex items-center gap-2 uppercase tracking-tight">
 <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
 Product Registry
 </h2>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm text-muted dark:text-muted">
 <thead className="bg-table-header border-b border-default text-[10px] uppercase font-bold tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 text-blue-600 dark:text-blue-400">Product Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-center">Variants</th>
                <th className="px-4 py-3 text-center">Colors</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted font-medium">No products found. Click Add Product to create one.</td></tr>
              ) : (
                rows.map(row => (
                  <tr key={row.product.id} className="hover:bg-table-hover dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-primary dark:text-zinc-100 flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted" />
                      {row.product.name}
                    </td>
                    <td className="px-4 py-3 font-medium text-muted dark:text-muted text-xs">{row.categoryPath}</td>
                    <td className="px-4 py-3 text-center font-mono font-medium text-blue-600 dark:text-blue-400">{row.skuCount}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {safeArray<string>(row.product.colors).map(c => (
                          <span key={c} className="px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded text-[9px] font-bold text-secondary dark:text-zinc-400">{c}</span>
                        ))}
                      </div>
                    </td>
 <td className="px-4 py-3 text-center">
 <div className="flex justify-center items-center gap-1">
 <button onClick={() => onEdit(row.product)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 text-muted hover:text-blue-600 rounded transition-colors" title="Edit Product"><Edit className="w-3.5 h-3.5" /></button>
 <button onClick={() => onDelete(row.product)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-muted hover:text-red-600 rounded transition-colors" title="Delete Product"><Trash2 className="w-3.5 h-3.5" /></button>
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
