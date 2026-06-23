const fs = require('fs');
let code = fs.readFileSync('src/components/ProductConfiguratorModal.tsx', 'utf8');

code = code.replace(/\\\`/g, '\`');
code = code.replace(/\\\$/g, '$');

fs.writeFileSync('src/components/ProductConfiguratorModal.tsx', code);
console.log('Fixed syntax escaping in configurator modal');
