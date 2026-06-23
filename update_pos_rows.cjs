const fs = require('fs');

let code = fs.readFileSync('src/components/PosBilling.tsx', 'utf8');

const regex = /\{lineItems\.map\(\(item, index\) => \{[\s\S]*?(?=\}\)\}\s*<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* RIGHT: OVERALL BILL CALCULATOR BREAKDOWN SUMMARY)/;

const newRows = `{lineItems.map((item, index) => {
              const selectedProd = products.find((p) => p.id === item.productId);
              const isSearching = configuratorRowIndex === index;
              return (
                <div
                  key={index}
                  className={\`flex flex-col gap-2 rounded-lg border \${isSearching ? 'border-blue-500 bg-blue-50/20' : 'border-gray-100 bg-gray-50/50'} p-3 sm:flex-row sm:items-center transition-all\`}
                >
                  <div className="flex-1 space-y-0.5 relative">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setConfiguratorRowIndex(index)}
                        className={\`w-full rounded-md border bg-white px-3 py-2 text-xs font-semibold text-left focus:outline-none flex items-center justify-between shadow-sm transition-colors \${isSearching ? 'border-blue-500 text-blue-700' : 'border-gray-200 text-gray-700 hover:border-blue-400'}\`}
                      >
                         <span className={item.productId ? "text-gray-900" : "text-gray-400"}>
                           {item.productId ? (selectedProd ? getHierarchyPath(selectedProd, products) : item.productId) : "Click to select Product/SKU..."}
                         </span>
                         <Search className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:w-28">
                    <span className="text-[10px] text-gray-400 uppercase sm:hidden">SKU</span>
                    <span className="inline-flex w-full items-center justify-center bg-gray-100 px-2 py-1.5 rounded-md text-[10px] text-gray-600 font-bold font-mono whitespace-nowrap truncate" title={item.selectedColor || "AUTO"}>
                      {item.selectedColor || selectedProd?.sku || "AUTO"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:w-24">
                    <span className="text-[10px] text-gray-400 uppercase sm:hidden">Qty</span>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateRowQty(index, parseInt(e.target.value) || 1)}
                      className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-center text-xs font-mono text-gray-900 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 sm:w-28">
                    <span className="text-[10px] text-gray-400 uppercase sm:hidden">Rate</span>
                    <div className="relative w-full">
                      <span className="absolute left-2.5 top-1.5 text-[10px] text-gray-400">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.customPrice || ""}
                        onChange={(e) => updateRowPrice(index, parseFloat(e.target.value) || 0)}
                        className="w-full rounded-md border border-gray-200 bg-white pl-5 pr-2 py-1 text-xs font-mono text-gray-900 focus:border-blue-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:w-32 pl-1">
                    <span className="text-sm font-mono font-bold text-gray-800">
                      ₹{(item.quantity * item.customPrice).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeRow(index)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
`;

code = code.replace(regex, newRows);

fs.writeFileSync('src/components/PosBilling.tsx', code);
console.log('PosBilling rows updated.');
