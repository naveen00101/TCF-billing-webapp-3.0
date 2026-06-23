const fs = require('fs');
const path = require('path');

const p = path.resolve('D:/Project B/src/components/PosBilling.tsx');
let code = fs.readFileSync(p, 'utf8');

// 1. Remove BREADCRUMB GUIDEDE NAVIGATION and SHOWROOM PRODUCT PICKER
const startComment = "{/* SHOWROOM PRODUCT PICKER */}";
const endToken = "})()}";

const lines = code.split('\n');
let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(startComment)) {
    startIndex = i;
  }
  // The block ends around line 2945
  if (startIndex !== -1 && i > startIndex && lines[i].includes(endToken)) {
    // we know it's a few lines below this
    endIndex = i + 2; // to include the closing divs
    break;
  }
}

// Remove the BREADCRUMB GUIDEDE NAVIGATION block that is slightly above SHOWROOM PRODUCT PICKER
let breadcrumbStartIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("{/* BREADCRUMB GUIDEDE NAVIGATION */}")) {
    breadcrumbStartIndex = i;
    break;
  }
}

if (breadcrumbStartIndex !== -1 && startIndex !== -1 && endIndex !== -1) {
  // Replace everything from breadcrumb to endIndex
  const replacement = `
        {/* INLINE PRODUCT SEARCH */}
        <div className="bg-surface dark:bg-zinc-850/50 border border-default rounded-xl p-5 space-y-4">
          <div className="flex flex-col gap-3 border-b border-default pb-3">
            <div>
              <h3 className="font-bold text-primary dark:text-primary text-sm flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-500" />
                <span>Search Products</span>
              </h3>
              <p className="text-[10px] text-muted dark:text-muted">Search catalog to add to bill</p>
            </div>
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Find products to add to bill..."
                value={pickerSearchQuery}
                onChange={(e) => setPickerSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-default bg-card px-3 pl-8 py-2.5 text-sm text-primary dark:text-primary outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-sans"
              />
              <span className="absolute left-2.5 top-3 text-muted">
                <Search className="h-4 w-4" />
              </span>
            </div>
          </div>

          {pickerSearchQuery && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in">
              {filteredPickerOptions.length === 0 ? (
                <div className="col-span-full py-10 text-center text-xs text-muted">
                  No products match your search.
                </div>
              ) : (
                filteredPickerOptions.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      const product = option.product;
                      const newItem = {
                        productId: product.id,
                        quantity: 1,
                        customPrice: option.price,
                        skuId: option.id,
                        skuCode: option.skuCode || product.sku || product.id,
                        hierarchyNodeId: product.id,
                        hierarchyPath: option.displayText,
                        displayName: option.displayText,
                        selectedOptions: {}
                      };
                      setLineItems([...lineItems, newItem]);
                      if (product.simpleVariants && product.simpleVariants.length > 0) {
                        setConfiguratorRowIndex(lineItems.length);
                      }
                      setPickerSearchQuery("");
                      onShowNotification(\`✓ Added \${option.displayText} to checkout basket.\`, "success");
                    }}
                    className="bg-card border border-default hover:border-blue-500 rounded-xl p-3 text-left transition hover:shadow-xs active:scale-95 flex flex-col justify-between group cursor-pointer"
                  >
                    <div className="font-bold text-sm text-primary dark:text-primary group-hover:text-blue-600">
                      {option.displayText}
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs font-mono">
                      <span className="font-bold text-blue-600">₹{option.price}</span>
                      <span className="text-muted">{option.stockText}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
`;
  lines.splice(startIndex, (endIndex - startIndex + 1), replacement);
  // Remove breadcrumb nav
  lines.splice(breadcrumbStartIndex, startIndex - breadcrumbStartIndex);
}

// 2. Simplify sellableOptions
let newCode = lines.join('\n');

const sellableOptionsOldStart = "const sellableOptions = useMemo(() => {";
const sellableOptionsOldEnd = "  }, [products]);";

let sellStart = -1;
let sellEnd = -1;
const lines2 = newCode.split('\n');

for (let i = 0; i < lines2.length; i++) {
  if (lines2[i].includes(sellableOptionsOldStart)) {
    sellStart = i;
  }
  if (sellStart !== -1 && i > sellStart && lines2[i].includes(sellableOptionsOldEnd)) {
    sellEnd = i;
    break;
  }
}

if (sellStart !== -1 && sellEnd !== -1) {
  const simplifiedSellableOptions = `
  const sellableOptions = useMemo(() => {
    const options = [];
    products.forEach(p => {
      options.push({
        type: "Product",
        product: p,
        id: p.id,
        displayText: p.name + (p.category ? \` (\${p.category})\` : ""),
        searchableText: (p.name + " " + (p.sku || "") + " " + (p.category || "")).toLowerCase(),
        price: p.price || 0,
        stockText: \`(Stock: \${p.stockAvailable || 0})\`,
        isOutOfStock: (p.stockAvailable || 0) <= 0,
      });
    });
    return options;
  }, [products]);
`;
  lines2.splice(sellStart, (sellEnd - sellStart + 1), simplifiedSellableOptions);
}

fs.writeFileSync(p, lines2.join('\n'));
console.log('PosBilling replaced successfully.');
