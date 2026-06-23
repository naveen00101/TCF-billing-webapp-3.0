const fs = require('fs');

let code = fs.readFileSync('src/components/ProductsTab.tsx', 'utf8');

code = code.replace("const [newColorStock, setNewColorStock] = useState<number>(0);", "const [newColorStock, setNewColorStock] = useState<number>(0);\n  const [wizardStep, setWizardStep] = useState<number>(1);\n  const [attributes, setAttributes] = useState<{name: string, values: string[]}[]>([]);\n  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);\n\n  const generateSkusFromAttributes = () => {\n     let combinations: string[][] = [[]];\n\n     attributes.forEach(attr => {\n        const validValues = attr.values.filter(v => v.trim() !== '');\n        if (validValues.length === 0) return;\n        const newCombos: string[][] = [];\n        combinations.forEach(combo => {\n           validValues.forEach(val => {\n              newCombos.push([...combo, val]);\n           });\n        });\n        combinations = newCombos;\n     });\n\n     if (combinations.length === 1 && combinations[0].length === 0) return;\n\n     const newSkus = combinations.map(combo => {\n        const title = combo.join(' - ');\n        return {\n           skuId: 'SKU-' + Date.now() + '-' + Math.random().toString(36).substring(2,6),\n           hierarchyNodeId: prodId,\n           skuCode: title,\n           color: '',\n           price: price || 0,\n           stock: 0\n        } as InventorySKU;\n     });\n\n     setInventorySkus(newSkus);\n  };\n");

fs.writeFileSync('src/components/ProductsTab.tsx', code);
console.log('Fixed states');
