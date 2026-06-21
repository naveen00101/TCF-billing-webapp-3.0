const fs = require('fs');
const newCode = `import React, { useState, useMemo } from 'react';
import { Search, X, Package, ChevronRight, CheckCircle2, ShoppingCart, Folder, ChevronLeft } from 'lucide-react';
import { Product, InventorySKU } from '../types';

interface ConfiguratorProps {
  products: Product[];
  onSelectSku: (product: Product, sku?: InventorySKU) => void;
  onClose: () => void;
}

export function ProductConfiguratorModal({ products, onSelectSku, onClose }: ConfiguratorProps) {
  const [hierarchyPath, setHierarchyPath] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  // Key = attribute name, Value = selected attribute value
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  // 1. All Sellable Products
  const sellableProducts = useMemo(() => {
    return products.filter(p => p.isLeaf);
  }, [products]);

  // 2. Filter Products by Search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    
    // Search both SKUs and Products
    const results: { product: Product, sku?: InventorySKU, matchText: string }[] = [];
    
    products.filter(p => p.isLeaf).forEach(p => {
       if (p.name.toLowerCase().includes(q)) {
          results.push({ product: p, matchText: p.name });
       }
       if (p.inventorySkus) {
          p.inventorySkus.forEach(sku => {
             if (sku.skuCode && sku.skuCode.toLowerCase().includes(q)) {
                results.push({ product: p, sku, matchText: p.name + ' - ' + sku.skuCode });
             }
          });
       }
    });
    
    return results.slice(0, 15);
  }, [searchQuery, products]);

  // Current level nodes (if not searching and not in a product)
  const currentLevelNodes = useMemo(() => {
    const parentId = hierarchyPath.length > 0 ? hierarchyPath[hierarchyPath.length - 1].id : null;
    return products.filter(p => (p.parentId || null) === parentId);
  }, [products, hierarchyPath]);

  // View logic
  if (!selectedProduct) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
            <h3 className="font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Product Selection
            </h3>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-3 border-b border-gray-100 dark:border-zinc-800 flex gap-2">
            <div className="relative flex-1">
              <input
                autoFocus
                type="text"
                placeholder="Quick SKU / Product Search..."
                value={searchQuery}
                onFocus={() => setIsSearchMode(true)}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-blue-500 bg-white dark:bg-zinc-800 dark:border-zinc-700 outline-none transition-colors dark:text-white"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
            {isSearchMode && (
               <button onClick={() => { setIsSearchMode(false); setSearchQuery(''); }} className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Cancel
               </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {isSearchMode ? (
               <div className="p-2 space-y-1">
                 {searchQuery.trim().length === 0 ? (
                    <div className="p-12 text-center text-gray-400 text-sm">Type to search for products or SKUs.</div>
                 ) : searchResults.length > 0 ? (
                    searchResults.map((res, i) => (
                      <button
                        key={i}
                        onClick={() => {
                           if (res.sku) {
                              onSelectSku(res.product, res.sku);
                           } else {
                              setSelectedProduct(res.product);
                              setSelectedAttributes({});
                              setIsSearchMode(false);
                           }
                        }}
                        className="w-full text-left p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 flex flex-col gap-1 transition-colors group"
                      >
                        <div className="font-bold text-gray-900 dark:text-zinc-100 group-hover:text-blue-700">{res.matchText}</div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                           {res.product.category && <span className="bg-gray-200 dark:bg-zinc-800 px-1.5 rounded">{res.product.category}</span>}
                           {res.sku ? (
                              <span className="text-emerald-600 font-bold">₹{res.sku.price} • {res.sku.stock} in stock</span>
                           ) : (
                              res.product.attributes && res.product.attributes.length > 0 && <span>{res.product.attributes.length} Configurable Attributes</span>
                           )}
                        </div>
                      </button>
                    ))
                 ) : (
                    <div className="p-12 text-center text-gray-400 text-sm">No results found.</div>
                 )}
               </div>
            ) : (
               <div className="p-4 space-y-4">
                 {/* Breadcrumbs */}
                 <div className="flex flex-wrap items-center gap-1 text-sm font-bold text-gray-500">
                    <button 
                       onClick={() => setHierarchyPath([])}
                       className={\`hover:text-blue-600 transition-colors \${hierarchyPath.length === 0 ? 'text-gray-900 dark:text-white' : ''}\`}
                    >
                       Catalog
                    </button>
                    {hierarchyPath.map((node, idx) => (
                       <React.Fragment key={node.id}>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                          <button 
                             onClick={() => setHierarchyPath(hierarchyPath.slice(0, idx + 1))}
                             className={\`hover:text-blue-600 transition-colors \${idx === hierarchyPath.length - 1 ? 'text-gray-900 dark:text-white' : ''}\`}
                          >
                             {node.name}
                          </button>
                       </React.Fragment>
                    ))}
                 </div>
                 
                 {hierarchyPath.length > 0 && (
                    <button 
                       onClick={() => setHierarchyPath(hierarchyPath.slice(0, -1))}
                       className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 transition-colors mb-4"
                    >
                       <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                 )}

                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                   {currentLevelNodes.map(node => (
                      <button
                        key={node.id}
                        onClick={() => {
                           if (node.isLeaf) {
                              setSelectedProduct(node);
                              setSelectedAttributes({});
                           } else {
                              setHierarchyPath([...hierarchyPath, node]);
                           }
                        }}
                        className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-zinc-800 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-center gap-2 group bg-white dark:bg-zinc-900"
                      >
                        {node.isLeaf ? (
                           <Package className="w-8 h-8 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        ) : (
                           <Folder className="w-8 h-8 text-amber-400 group-hover:text-amber-500 transition-colors" />
                        )}
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                           {node.name}
                        </span>
                      </button>
                   ))}
                   {currentLevelNodes.length === 0 && (
                      <div className="col-span-full py-8 text-center text-sm text-gray-400">
                         No categories or products found here.
                      </div>
                   )}
                 </div>
               </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Next Steps View: Select Attributes for the Product
  const hasAttributes = selectedProduct.attributes && selectedProduct.attributes.length > 0;
  const missingAttributes = hasAttributes 
     ? selectedProduct.attributes!.filter(a => !selectedAttributes[a.name])
     : [];

  const handleAttributeSelect = (name: string, value: string) => {
    setSelectedAttributes(prev => ({ ...prev, [name]: value }));
  };

  // Find SKU once all attributes are selected
  let resolvedSku: InventorySKU | undefined = undefined;
  if (!hasAttributes || missingAttributes.length === 0) {
     if (hasAttributes) {
        // Construct the expected SKU code from attributes in order
        const expectedCombo = selectedProduct.attributes!.map(a => selectedAttributes[a.name]).join(' - ');
        resolvedSku = selectedProduct.inventorySkus?.find(s => s.skuCode === expectedCombo);
     } else if (selectedProduct.inventorySkus && selectedProduct.inventorySkus.length === 1) {
        resolvedSku = selectedProduct.inventorySkus[0];
     }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-start p-5 bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800 shrink-0">
           <div className="flex-1">
             <div className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                 <button className="hover:text-blue-600 hover:underline transition-colors focus:outline-none" onClick={() => setSelectedProduct(null)}>
                   Catalog Mode
                 </button>
                 <ChevronRight className="w-3 h-3" /> 
                 <span>{hierarchyPath.length > 0 ? hierarchyPath[hierarchyPath.length-1].name : selectedProduct.category}</span>
             </div>
             <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                 <Package className="w-5 h-5 text-blue-600" />
                 {selectedProduct.name}
             </h2>
           </div>
           <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg">
             <X className="w-5 h-5" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
           {hasAttributes ? selectedProduct.attributes!.map((attr, index) => {
              // Only show attributes up to the first missing one to guide selection step by step
              const isMissingBefore = selectedProduct.attributes!.slice(0, index).some(a => !selectedAttributes[a.name]);
              if (isMissingBefore) return null;
              
              return (
                 <div key={attr.name} className="space-y-3 animate-in slide-in-from-right-4 fade-in duration-300">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                         {index + 1}
                       </div>
                       <div className="text-sm font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider">{attr.name}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-8">
                       {attr.values.map(val => {
                          const isSelected = selectedAttributes[attr.name] === val;
                          return (
                            <button
                              key={val}
                              onClick={() => handleAttributeSelect(attr.name, val)}
                              className={\`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2 \${isSelected ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm scale-[1.02]' : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 hover:border-gray-300 dark:text-gray-300'}\`}
                            >
                              {val}
                            </button>
                          );
                       })}
                    </div>
                 </div>
              );
           }) : (
              <div className="text-sm text-gray-500 py-4 flex items-center gap-2">
                 <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                 No further configuration required.
              </div>
           )}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 flex justify-between items-center shrink-0">
           {missingAttributes.length === 0 ? (
              <div className="flex-1 flex justify-between items-center">
                 <div className="flex gap-6">
                    <div className="space-y-1">
                       <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Price</span>
                       <div className="text-lg font-black text-gray-900 dark:text-white">₹{resolvedSku ? resolvedSku.price : selectedProduct.price}</div>
                    </div>
                    {resolvedSku && (
                       <div className="space-y-1">
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Availability</span>
                          <div className={\`text-sm font-bold mt-1 \${resolvedSku.stock > 0 ? 'text-emerald-600' : 'text-red-500'}\`}>
                             {resolvedSku.stock} in stock
                          </div>
                       </div>
                    )}
                 </div>
                 <button 
                   onClick={() => {
                      onSelectSku(selectedProduct, resolvedSku);
                   }}
                   className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl shadow-sm transition-transform active:scale-95"
                 >
                   <ShoppingCart className="w-5 h-5" />
                   Add to Bill
                 </button>
              </div>
           ) : (
              <div className="text-sm text-gray-400 flex items-center gap-2 font-bold bg-white dark:bg-zinc-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700">
                 <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                 Select {missingAttributes[0].name}
              </div>
           )}
        </div>

      </div>
    </div>
  );
}
`;
fs.writeFileSync('src/components/ProductConfiguratorModal.tsx', newCode);
console.log('Done rewrititng configurator modal');
