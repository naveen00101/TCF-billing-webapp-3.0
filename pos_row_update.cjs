const fs = require('fs');
let code = fs.readFileSync('src/components/PosBilling.tsx', 'utf8');

const targetLabel = '{item.productId ? (selectedProd ? getHierarchyPath(selectedProd, products) : item.productId) : "Click to select Product/SKU..."}';
const replaceLabel = '{item.productId ? (selectedProd ? selectedProd.name + (item.skuCode ? " - " + item.skuCode : "") : item.productId) : "Click to select Product/SKU..."}';

code = code.replace(targetLabel, replaceLabel);

const targetSku = '{item.selectedColor || selectedProd?.sku || "AUTO"}';
const replaceSku = '{item.skuCode || selectedProd?.sku || "AUTO"}';
code = code.replace(targetSku, replaceSku);

const targetTitle = 'title={item.selectedColor || "AUTO"}';
const replaceTitle = 'title={item.skuCode || "AUTO"}';
code = code.replace(targetTitle, replaceTitle);

fs.writeFileSync('src/components/PosBilling.tsx', code);
console.log('Fixed POS row text');
