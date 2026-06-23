const fs = require('fs');

const code = `import React, { useMemo } from 'react';
import { Edit, Trash2, Tag, Layers, Package, Activity, Archive, ChevronRight } from 'lucide-react';
import { Product, InventorySKU } from '../types';

interface CatalogRow {
  isSku: boolean;
  product: Product;
  sku?: InventorySKU;
  path: Product[];
  skuTitle: string;
  price: string;
  stock: string;
  status: string;
  id: string; // unique key
}

export function ProductCatalogTable({ products, onEdit, onDelete }: { products: Product[], onEdit: (p: Product, skuId?: string) => void, onDelete: (p: Product) => void }) {
  const rows = useMemo(() => {
    const list: CatalogRow[] = [];
    
    // To resolve path, we need a small helper to get ancestors (highest level first)
    const getAncestors = (p: Product): Product[] => {
      const path: Product[] = [p];
      let curr = p;
      let safety = 0;
      while (curr && curr.parentId && safety < 20) {
        const parent = products.find(prod => prod.id === curr.parentId);
        if (parent) {
          path.unshift(parent);
          curr = parent;
        } else break;
        safety++;
      }
      return path;
    };

    products.forEach(p => {
       const ancestors = getAncestors(p);

       if (p.inventorySkus && p.inventorySkus.length > 0) {
         p.inventorySkus.forEach(sku => {
            list.push({
               isSku: true,
               product: p,
               sku: sku,
               path: ancestors,
               skuTitle: sku.skuCode || sku.color || p.name,
               price: \`₹\${sku.price}\`,
               stock: sku.stock.toString(),
               status: sku.status || p.status || "Active",
               id: sku.skuId || \`\${p.id}-\${sku.color}\`
            });
         });
       } else if (p.nodeType === 'Sellable SKU' || p.isLeaf) {
          // Legacy product
          list.push({
             isSku: false,
             product: p,
             path: ancestors,
             skuTitle: p.sku || p.name,
             price: \`₹\${p.price || 0}\`,
             stock: (p.stockAvailable || 0).toString(),
             status: p.status || "Active",
             id: p.id
          });
       }
    });

    return list.sort((a,b) => {
       const pathA = a.path.map(n => n.name).join(' ');
       const pathB = b.path.map(n => n.name).join(' ');
       if (pathA !== pathB) return pathA.localeCompare(pathB);
       return a.skuTitle.localeCompare(b.skuTitle);
    });
  }, [products]);

  return (
    <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden animate-in fade-in">
       <div className="p-4 border-b border-gray-150 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
         <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-tight">
           <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
           Sellable Product Registry
         </h2>
       </div>
       <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
             <thead className="bg-[#EEF2F6] dark:bg-zinc-900 border-b border-gray-150 dark:border-zinc-800 text-[10px] uppercase font-bold tracking-wider text-gray-500">
                <tr>
                   <th className="px-4 py-3">Product Path</th>
                   <th className="px-4 py-3 text-blue-600 dark:text-blue-400">SKU Code</th>
                   <th className="px-4 py-3 text-right">Price</th>
                   <th className="px-4 py-3 text-center">Stock</th>
                   <th className="px-4 py-3 text-center">Status</th>
                   <th className="px-4 py-3 text-center">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                {rows.length === 0 ? (
                   <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400 font-medium">No results found in catalog</td>
                   </tr>
                ) : (
                   rows.map(row => (
                      <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                         <td className="px-4 py-3">
                           <div className="flex flex-wrap items-center gap-1">
                             {row.path.map((node, i) => (
                               <React.Fragment key={node.id}>
                                 <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-300 whitespace-nowrap">
                                   {node.name}
                                 </span>
                                 {i < row.path.length - 1 && <ChevronRight className="w-3 h-3 text-gray-400" />}
                               </React.Fragment>
                             ))}
                           </div>
                         </td>
                         <td className="px-4 py-3 font-bold text-gray-900 dark:text-zinc-100 font-mono text-xs">{row.skuTitle}</td>
                         <td className="px-4 py-3 text-right font-mono font-medium text-gray-700 dark:text-gray-300">{row.price}</td>
                         <td className="px-4 py-3 text-center">
                            {row.stock !== "-" ? (
                               <span className={\`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold \${parseInt(row.stock) > 5 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : (parseInt(row.stock) > 0 ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400')}\`}>
                                  {row.stock}
                               </span>
                            ) : <span className="text-gray-300 dark:text-zinc-600">-</span>}
                         </td>
                         <td className="px-4 py-3 text-center">
                           <span className={\`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full \${row.status === 'Active' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' : 'text-gray-500 bg-gray-100 dark:bg-zinc-800 dark:text-gray-400'}\`}>
                             {row.status === 'Active' ? <Activity className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                             {row.status}
                           </span>
                         </td>
                         <td className="px-4 py-3">
                            <div className="flex justify-center items-center gap-1">
                               <button onClick={() => onEdit(row.product, row.sku?.skuId)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500 hover:text-blue-600 rounded transition-colors" title="Edit SKU Details">
                                  <Edit className="w-3.5 h-3.5" />
                               </button>
                               <button onClick={() => onDelete(row.product)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 rounded transition-colors" title="Delete hierarchy node completely">
                                  <Trash2 className="w-3.5 h-3.5" />
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
  );
}
`;

fs.writeFileSync('src/components/ProductCatalogTable.tsx', code);
