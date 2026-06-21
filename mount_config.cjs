const fs = require('fs');
let code = fs.readFileSync('src/components/PosBilling.tsx', 'utf8');

// Ensure import
if (!code.includes('ProductConfiguratorModal')) {
    code = code.replace(
        "import { getHierarchyPath } from \"./ProductTreeExplorer\";",
        "import { getHierarchyPath } from \"./ProductTreeExplorer\";\nimport { ProductConfiguratorModal } from \"./ProductConfiguratorModal\";"
    );
}

const mountingCode = `
      {/* SMART PRODUCT CONFIGURATOR MODAL */}
      {configuratorRowIndex !== null && (
        <ProductConfiguratorModal 
           products={products}
           onClose={() => setConfiguratorRowIndex(null)}
           onSelectSku={(prod, sku) => {
              if (sku) {
                 updateRowProductSku(configuratorRowIndex!, prod, sku);
              } else {
                 updateRowProduct(configuratorRowIndex!, prod.id);
              }
           }}
        />
      )}
`;

if (!code.includes('SMART PRODUCT CONFIGURATOR MODAL')) {
    code = code.replace('{/* PAYMENT COLLECTION MODAL */}', mountingCode + '\n      {/* PAYMENT COLLECTION MODAL */}');
}

fs.writeFileSync('src/components/PosBilling.tsx', code);
console.log('Done config modal');
