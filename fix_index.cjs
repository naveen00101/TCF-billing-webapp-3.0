const fs = require('fs');

let code = fs.readFileSync('src/components/PosBilling.tsx', 'utf8');

const target = `  const [discount, setDiscount] = useState<number>(0);`;
const replacement = `  const [configuratorRowIndex, setConfiguratorRowIndex] = useState<number | null>(null);
  const [discount, setDiscount] = useState<number>(0);`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/PosBilling.tsx', code);
console.log('Fixed index state');
