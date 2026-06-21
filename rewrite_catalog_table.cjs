const fs = require('fs');

const code = `import React, { useMemo, useState } from 'react';
import { Edit, Trash2, Tag, Layers, Package, Activity, Archive, ChevronRight, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Product, InventorySKU } from '../types';

interface GroupedProduct {
  product: Product;
  categoryPath: string;
  configCount: number;
  skuCount: number;
  totalStock: number;
  status: string;
}

export function ProductCatalogTable({ products, onEdit, onDelete }: { products: Product[], onEdit: (p: Product, skuId?: string) => void, onDelete: (p: Product) => void }) {
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  const groupedRows = useMemo(() => {
    const list: GroupedProduct[] = [];
    
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

    const sellableProducts = products.filter(p => p.isLeaf);

    sellableProducts.forEach(p => {
       const ancestors = getAncestors(p);
       const categoryPath = ancestors.length > 1 
          ? ancestors.slice(0, -1).map(n => n.name).join(' / ')
          : (p.category || 'Uncategorized');

       const configCount = p.attributes ? p.attributes.length : 0;
       
       let skuCount = 0;
       let totalStock = 0;

       if (p.inventorySkus && p.inventorySkus.length > 0) {
          skuCount = p.inventorySkus.length;
          totalStock = p.inventorySkus.reduce((sum, sku) => sum + (sku.stock || 0), 0);
       } else {
          skuCount = 1; // single product itself
          totalStock = p.stockAvailable || 0;
       }

       list.push({
          product: p,
          categoryPath,
          configCount,
          skuCount,
          totalStock,
          status: p.status || "Active"
       });
    });

    return list.sort((a,b) => {
       if (a.categoryPath !== b.categoryPath) return a.categoryPath.localeCompare(b.categoryPath);
       return a.product.name.localeCompare(b.product.name);
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
                   <th className="px-4 py-3">Category</th>
                   <th className="px-4 py-3 text-blue-600 dark:text-blue-400">Product</th>
                   <th className="px-4 py-3 text-center">Configurations</th>
                   <th className="px-4 py-3 text-center">SKU Count</th>
                   <th className="px-4 py-3 text-center">Stock</th>
                   <th className="px-4 py-3 text-center">Status</th>
                   <th className="px-4 py-3 text-center">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                {groupedRows.length === 0 ? (
                   <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400 font-medium">No results found in catalog</td>
                   </tr>
                ) : (
                   groupedRows.map(row => (
                      <React.Fragment key={row.product.id}>
                         <tr 
                           onClick={() => setExpandedProductId(expandedProductId === row.product.id ? null : row.product.id)}
                           className={\`hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer \${expandedProductId === row.product.id ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}\`}
                         >
                            <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-xs">
                               {row.categoryPath}
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                               {expandedProductId === row.product.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                               {row.product.name}
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-medium text-gray-700 dark:text-gray-300">{row.configCount}</td>
                            <td className="px-4 py-3 text-center font-mono font-medium text-gray-700 dark:text-gray-300">{row.skuCount}</td>
                            <td className="px-4 py-3 text-center">
                               <span className={\`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold \${row.totalStock > 5 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : (row.totalStock > 0 ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400')}\`}>
                                  {row.totalStock}
                               </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={\`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full \${row.status === 'Active' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' : 'text-gray-500 bg-gray-100 dark:bg-zinc-800 dark:text-gray-400'}\`}>
                                {row.status === 'Active' ? <Activity className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                                {row.status}
                              </span>
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                               <div className="flex justify-center items-center gap-1">
                                  <button onClick={() => onEdit(row.product)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500 hover:text-blue-600 rounded transition-colors" title="Edit Product">
                                     <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => onDelete(row.product)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 rounded transition-colors" title="Delete Product">
                                     <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                               </div>
                            </td>
                         </tr>
                         
                         {/* EXPANDED DETAILS */}
                         {expandedProductId === row.product.id && (
                            <tr>
                               <td colSpan={7} className="p-0 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/30">
                                  <div className="p-6 pl-12">
                                     
                                     {row.configCount > 0 ? (
                                        <div className="space-y-6">
                                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              <div className="bg-white dark:bg-[#111111] p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                                                 <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <Layers className="w-4 h-4 text-blue-500" /> Hierarchy Visulalization
                                                 </h4>
                                                 <div className="pl-2 border-l-2 border-gray-100 dark:border-zinc-800 space-y-4">
                                                    <div className="font-bold text-sm text-gray-900 dark:text-white">
                                                       {row.product.name}
                                                    </div>
                                                    
                                                    <div className="pl-4 space-y-3">
                                                       {row.product.attributes!.map((attr, aIdx) => (
                                                          <div key={aIdx}>
                                                             <div className="text-xs font-bold text-gray-400 mb-1">{attr.name}</div>
                                                             <div className="flex flex-col gap-1 pl-4 border-l border-dashed border-gray-200 dark:border-zinc-700">
                                                                {attr.values.map((v, vIdx) => (
                                                                   <div key={vIdx} className="text-sm font-semibold text-gray-700 dark:text-gray-300 relative">
                                                                      <span className="absolute -left-[17px] top-[10px] w-[14px] border-t border-dashed border-gray-200 dark:border-zinc-700"></span>
                                                                      {v}
                                                                   </div>
                                                                ))}
                                                             </div>
                                                          </div>
                                                       ))}
                                                    </div>
                                                 </div>
                                              </div>

                                              <div className="bg-white dark:bg-[#111111] p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                                                 <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <Tag className="w-4 h-4 text-emerald-500" /> Resolved SKUs
                                                 </h4>
                                                 <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                                    {row.product.inventorySkus?.map((sku, sIdx) => (
                                                       <div key={sIdx} className="flex flex-col gap-1 p-2 border border-gray-100 dark:border-zinc-800 rounded-lg hover:border-blue-200 dark:hover:border-blue-900 transition-colors">
                                                          <div className="font-mono text-xs font-bold text-gray-900 dark:text-white flex justify-between">
                                                             <span>{sku.skuCode}</span>
                                                             <span className="text-blue-600 dark:text-blue-400">₹{sku.price}</span>
                                                          </div>
                                                          <div className="flex justify-between items-center text-[11px]">
                                                             <span className="text-gray-500">ID: {sku.skuId}</span>
                                                             <span className={\`font-bold \${sku.stock > 0 ? 'text-emerald-600' : 'text-red-500'}\`}>{sku.stock} in stock</span>
                                                          </div>
                                                       </div>
                                                    ))}
                                                 </div>
                                              </div>
                                           </div>
                                        </div>
                                     ) : (
                                        <div className="bg-white dark:bg-[#111111] p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm max-w-md">
                                           <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                              <Tag className="w-4 h-4 text-emerald-500" /> Product Details
                                           </h4>
                                           <div className="space-y-3">
                                              <div className="flex justify-between items-center">
                                                 <span className="text-xs text-gray-500">Price</span>
                                                 <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">₹{row.product.price}</span>
                                              </div>
                                              <div className="flex justify-between items-center">
                                                 <span className="text-xs text-gray-500">Stock</span>
                                                 <span className={\`font-mono text-sm font-bold \${row.product.stockAvailable! > 0 ? 'text-emerald-600' : 'text-red-500'}\`}>{row.product.stockAvailable} available</span>
                                              </div>
                                              <div className="flex justify-between items-center">
                                                 <span className="text-xs text-gray-500">Inventory Type</span>
                                                 <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{row.product.inventoryType}</span>
                                              </div>
                                           </div>
                                        </div>
                                     )}
                                  </div>
                               </td>
                            </tr>
                         )}
                      </React.Fragment>
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
console.log('Fixed Product Catalog Table redesign');
