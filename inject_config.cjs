const fs = require('fs');
let code = fs.readFileSync('src/components/PosBilling.tsx', 'utf8');

// Ensure import
if (!code.includes('ProductConfiguratorModal')) {
    code = code.replace(
        "import { getHierarchyPath } from \"./ProductTreeExplorer\";",
        "import { getHierarchyPath } from \"./ProductTreeExplorer\";\nimport { ProductConfiguratorModal } from \"./ProductConfiguratorModal\";"
    );
}

// Inject mounting
const renderTarget = `{/* PAYMENT COLLECTION MODAL */}`;
const renderReplacement = `      {/* SMART PRODUCT CONFIGURATOR MODAL */}
      {configuratorRowIndex !== null && (
        <ProductConfiguratorModal 
           products={products}
           onClose={() => setConfiguratorRowIndex(null)}
           onSelectSku={(prod, sku) => {
              if (sku) {
                 updateRowProductSku(configuratorRowIndex, prod, sku.skuCode || sku.color || "Standard Variant", sku.price);
              } else {
                 updateRowProductSku(configuratorRowIndex, prod, "", prod.price || 0);
              }
           }}
        />
      )}

      {/* PAYMENT COLLECTION MODAL */}`;

if (!code.includes('SMART PRODUCT CONFIGURATOR MODAL')) {
    code = code.replace(renderTarget, renderReplacement);
}

fs.writeFileSync('src/components/PosBilling.tsx', code);
console.log('PosBilling updated with Configurator component.');
