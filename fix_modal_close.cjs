const fs = require('fs');
let code = fs.readFileSync('src/components/PosBilling.tsx', 'utf8');

const target = `updateRowProduct(configuratorRowIndex!, prod.id);
              }`;

const replace = `updateRowProduct(configuratorRowIndex!, prod.id);
              }
              setConfiguratorRowIndex(null);`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/PosBilling.tsx', code);
console.log('Fixed modal close');
