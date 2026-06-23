const fs = require('fs');

let code = fs.readFileSync('src/components/ProductsTab.tsx', 'utf8');

const regex = /\{\/\* SAVING\/ADDING PRODUCT FORM GRID \*\/\}[\s\S]*?(?=\{\/\* PRODUCT SEARCH FILTER PANEL & CATALOG LIST \*\/)/;

const newFormBlock = ` {/* WIZARD PRODUCT FORM */}
        <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#111111] shadow-sm max-w-4xl mx-auto overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
            <h2 className="font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2 tracking-tight">
               <Package className="w-5 h-5 text-blue-600" />
               {editingProduct ? "Modify Product" : "Create Product Workflow"}
            </h2>
            <button onClick={() => setShowAddForm(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSaveProduct} className="p-0">
            {/* WIZARD NAV */}
            <div className="flex bg-gray-50 dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 px-6 py-3 gap-8">
              <div onClick={() => setWizardStep(1)} className={"cursor-pointer text-xs font-bold uppercase tracking-wider flex items-center gap-2 " + (wizardStep === 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400')}>
                <span className={"w-5 h-5 rounded-full flex items-center justify-center text-[10px] " + (wizardStep === 1 ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-gray-200 dark:bg-zinc-800')}>1</span>
                Basic Info
              </div>
              <div onClick={() => setWizardStep(2)} className={"cursor-pointer text-xs font-bold uppercase tracking-wider flex items-center gap-2 " + (wizardStep === 2 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400')}>
                <span className={"w-5 h-5 rounded-full flex items-center justify-center text-[10px] " + (wizardStep === 2 ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-gray-200 dark:bg-zinc-800')}>2</span>
                Attributes
              </div>
              <div onClick={() => setWizardStep(3)} className={"cursor-pointer text-xs font-bold uppercase tracking-wider flex items-center gap-2 " + (wizardStep === 3 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400')}>
                <span className={"w-5 h-5 rounded-full flex items-center justify-center text-[10px] " + (wizardStep === 3 ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-gray-200 dark:bg-zinc-800')}>3</span>
                SKU Creation
              </div>
            </div>

            <div className="p-6">
              {wizardStep === 1 && (
                 <div className="space-y-6 animate-in slide-in-from-left-4">
                    <div className="grid gap-6 sm:grid-cols-2">
                       <div className="space-y-1">
                         <label className="text-xs font-semibold text-gray-500">Node Type *</label>
                         <select 
                           value={nodeIsLeaf ? "Product" : "Category"}
                           onChange={(e) => setNodeIsLeaf(e.target.value === "Product")}
                           className="w-full rounded-lg border border-gray-200 bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-medium outline-none text-gray-900 dark:text-gray-100 focus:border-blue-500"
                         >
                           <option value="Product">Product / Sellable Item</option>
                           <option value="Category">Category Folder</option>
                         </select>
                       </div>
                       <div className="space-y-1">
                         <label className="text-xs font-semibold text-gray-500">Parent Category</label>
                         <select 
                           value={nodeParentId || ""}
                           onChange={(e) => setNodeParentId(e.target.value || null)}
                           className="w-full rounded-lg border border-gray-200 bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-medium outline-none text-gray-900 dark:text-gray-100 focus:border-blue-500"
                         >
                           <option value="">[ None - Root Level ]</option>
                           {products.filter(p => !p.isLeaf).map(p => (
                             <option key={p.id} value={p.id}>{getHierarchyPath(p, products)}</option>
                           ))}
                         </select>
                       </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500">{nodeIsLeaf ? "Product Name *" : "Category Name *"}</label>
                      <input 
                         type="text" 
                         required 
                         placeholder="e.g. Rocking Chair, Sofa, Bed..." 
                         value={prodName} 
                         onChange={(e) => setProdName(e.target.value)} 
                         className="w-full rounded-lg border border-gray-200 bg-white dark:bg-zinc-800 px-3.5 py-3 text-base font-bold outline-none focus:border-blue-500 text-gray-900 dark:text-white" 
                      />
                    </div>
                 </div>
              )}

              {wizardStep === 2 && (
                 <div className="space-y-6 animate-in slide-in-from-right-4">
                    {!nodeIsLeaf ? (
                       <div className="text-center py-12 text-gray-400 text-sm">
                         Categories do not need attributes. <br /> Continue to save.
                       </div>
                    ) : (
                       <div className="space-y-4">
                          <p className="text-xs text-gray-500">Define dynamic attributes for this product (e.g. Type, Model, Size).</p>
                          {attributes.map((attr, idx) => (
                             <div key={idx} className="flex gap-3 items-start border border-gray-100 dark:border-zinc-800 p-3 rounded-lg bg-gray-50 dark:bg-zinc-900/50">
                                <div className="flex-1 space-y-2">
                                  <input 
                                     placeholder="Attribute Name (e.g. Type)"
                                     value={attr.name}
                                     onChange={e => { const a = [...attributes]; a[idx].name = e.target.value; setAttributes(a); }}
                                     className="w-full text-sm font-bold bg-transparent border-b border-gray-200 dark:border-zinc-700 px-1 py-1 outline-none focus:border-blue-500"
                                  />
                                  <input 
                                     placeholder="Comma separated values (e.g. Standard, Heavy)"
                                     value={attr.values.join(', ')}
                                     onChange={e => { const a = [...attributes]; a[idx].values = e.target.value.split(',').map(s => s.trim()); setAttributes(a); }}
                                     className="w-full text-xs bg-transparent border border-gray-200 dark:border-zinc-700 rounded px-2 py-1 outline-none focus:border-blue-500"
                                  />
                                </div>
                                <button type="button" onClick={() => setAttributes(attributes.filter((_, i) => i !== idx))} className="mt-1 text-gray-400 hover:text-red-500 p-1 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                             </div>
                          ))}
                          <button type="button" onClick={() => setAttributes([...attributes, { name: '', values: [] }])} className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-100 transition-colors">
                             <Plus className="w-3.5 h-3.5" /> Add Attribute
                          </button>
                       </div>
                    )}
                 </div>
              )}

              {wizardStep === 3 && (
                 <div className="space-y-6 animate-in slide-in-from-right-4">
                    {!nodeIsLeaf ? (
                       <div className="text-center py-12 text-gray-400 text-sm">
                         Categories do not need SKUs. <br /> Continue to save.
                       </div>
                    ) : (
                       <div className="space-y-6">
                          <div className="flex gap-2">
                             <button type="button" onClick={generateSkusFromAttributes} className="text-xs font-bold text-white bg-emerald-600 px-4 py-2 rounded-lg flex items-center gap-1 hover:bg-emerald-700 transition-colors shadow-sm">
                                <Sparkles className="w-3.5 h-3.5" /> Auto-Generate from Attributes
                             </button>
                             <button type="button" onClick={() => setInventorySkus([...inventorySkus, { skuId: 'SKU-'+Date.now(), hierarchyNodeId: prodId, skuCode: '', color: '', price: 0, stock: 0 }])} className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-1 hover:bg-blue-100 transition-colors">
                                <Plus className="w-3.5 h-3.5" /> Manually Add
                             </button>
                          </div>
                          
                          <div className="space-y-3">
                             {inventorySkus.map((sku, idx) => (
                                <div key={idx} className="border border-gray-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-900 flex flex-wrap gap-3 items-center">
                                   <div className="w-full sm:w-auto flex-1 font-mono text-xs font-bold text-gray-700 dark:text-gray-300">
                                      {sku.skuCode || "Variant " + (idx+1)}
                                   </div>
                                   <div className="flex gap-3 items-center">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-gray-500">Price ₹</span>
                                        <input type="number" min="0" value={sku.price} onChange={e => { const s = [...inventorySkus]; s[idx].price = Number(e.target.value); setInventorySkus(s); }} className="w-20 text-xs border border-gray-200 dark:border-zinc-700 rounded px-2 py-1 outline-none" />
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-gray-500">Stock</span>
                                        <input type="number" min="0" value={sku.stock} onChange={e => { const s = [...inventorySkus]; s[idx].stock = Number(e.target.value); setInventorySkus(s); }} className="w-16 text-xs border border-gray-200 dark:border-zinc-700 rounded px-2 py-1 outline-none" />
                                      </div>
                                      <button type="button" onClick={() => setInventorySkus(inventorySkus.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                   </div>
                                </div>
                             ))}
                          </div>
                          
                          {/* Advanced Details Collapsible */}
                          <div className="mt-8 border-t border-dashed border-gray-200 dark:border-zinc-800 pt-6">
                            <button type="button" onClick={() => setShowAdvancedDetails(!showAdvancedDetails)} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">
                               {showAdvancedDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                               Advanced Details (Optional)
                            </button>
                            {showAdvancedDetails && (
                               <div className="mt-4 grid gap-4 sm:grid-cols-3 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 p-4">
                                 <div className="space-y-1">
                                   <label className="text-[10px] font-bold text-gray-500 uppercase">Material</label>
                                   <input type="text" value={material} onChange={e=>setMaterial(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs outline-none focus:border-blue-500" />
                                 </div>
                                 <div className="space-y-1">
                                   <label className="text-[10px] font-bold text-gray-500 uppercase">Color</label>
                                   <input type="text" value={color} onChange={e=>setColor(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs outline-none focus:border-blue-500" />
                                 </div>
                                 <div className="space-y-1">
                                   <label className="text-[10px] font-bold text-gray-500 uppercase">Brand</label>
                                   <input type="text" value={brand} onChange={e=>setBrand(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs outline-none focus:border-blue-500" />
                                 </div>
                                 <div className="space-y-1">
                                   <label className="text-[10px] font-bold text-gray-500 uppercase">Vendor</label>
                                   <input type="text" value={vendor} onChange={e=>setVendor(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs outline-none focus:border-blue-500" />
                                 </div>
                                 <div className="space-y-1">
                                   <label className="text-[10px] font-bold text-gray-500 uppercase">Warranty</label>
                                   <input type="text" value={warranty} onChange={e=>setWarranty(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs outline-none focus:border-blue-500" />
                                 </div>
                                 <div className="space-y-1">
                                   <label className="text-[10px] font-bold text-gray-500 uppercase">Weight</label>
                                   <input type="text" value={weight} onChange={e=>setWeight(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs outline-none focus:border-blue-500" />
                                 </div>
                               </div>
                            )}
                          </div>
                       </div>
                    )}
                 </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 px-6 py-4">
              <span className="text-[10px] text-gray-400 font-mono">ID: {prodId}</span>
              <div className="flex gap-3">
                 {wizardStep > 1 && (
                    <button type="button" onClick={() => setWizardStep(wizardStep - 1)} className="px-5 py-2.5 rounded-xl font-bold bg-white text-gray-600 border border-gray-200 transition-colors">Back</button>
                 )}
                 {wizardStep < 3 ? (
                    <button type="button" onClick={() => setWizardStep(wizardStep + 1)} className="px-5 py-2.5 rounded-xl font-bold bg-black text-white hover:bg-gray-800 transition-colors">Continue</button>
                 ) : (
                    <button type="submit" className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm border border-blue-700">
                       Save Product
                    </button>
                 )}
              </div>
            </div>

          </form>
        </div>
      ) : ( `;

code = code.replace(regex, newFormBlock);

code = code.replace("const [newColorStock, setNewColorStock] = useState(0);", "const [newColorStock, setNewColorStock] = useState(0);\n  const [wizardStep, setWizardStep] = useState<number>(1);\n  const [attributes, setAttributes] = useState<{name: string, values: string[]}[]>([]);\n  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);\n\n  const generateSkusFromAttributes = () => {\n     let combinations: string[][] = [[]];\n\n     attributes.forEach(attr => {\n        const validValues = attr.values.filter(v => v.trim() !== '');\n        if (validValues.length === 0) return;\n        const newCombos: string[][] = [];\n        combinations.forEach(combo => {\n           validValues.forEach(val => {\n              newCombos.push([...combo, val]);\n           });\n        });\n        combinations = newCombos;\n     });\n\n     if (combinations.length === 1 && combinations[0].length === 0) return;\n\n     const newSkus = combinations.map(combo => {\n        const title = combo.join(' - ');\n        return {\n           skuId: 'SKU-' + Date.now() + '-' + Math.random().toString(36).substring(2,6),\n           hierarchyNodeId: prodId,\n           skuCode: title,\n           color: '',\n           price: price || 0,\n           stock: 0\n        } as InventorySKU;\n     });\n\n     setInventorySkus(newSkus);\n  };\n");

code = code.replace("notes: notes.trim(),\n      sku: sku.trim(),", "notes: notes.trim(),\n      sku: sku.trim(),\n      attributes: attributes,");

code = code.replace("setVendor(p.vendor || \"\");", "setVendor(p.vendor || \"\");\n    setAttributes(p.attributes || []);\n    setWizardStep(1);\n    setShowAdvancedDetails(false);");

fs.writeFileSync('src/components/ProductsTab.tsx', code);
console.log('Wizard rewritten');
