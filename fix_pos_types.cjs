const fs = require('fs');

let code = fs.readFileSync('src/components/PosBilling.tsx', 'utf8');

// 1. Update SelectedItem
const selItemTarget = `interface SelectedItem {
  productId: string;
  quantity: number;
  customPrice: number;
  selectedColor?: string;
  searchQuery?: string;
  isDropdownOpen?: boolean;
}`;

const selItemReplacement = `interface SelectedItem {
  productId: string;
  quantity: number;
  customPrice: number;
  selectedColor?: string;
  searchQuery?: string;
  isDropdownOpen?: boolean;
  skuId?: string;
  skuCode?: string;
  hierarchyNodeId?: string;
  hierarchyPath?: string;
}`;

code = code.replace(selItemTarget, selItemReplacement);

// 2. Add configuratorRowIndex
const stateTarget = `  const [selectedAgent, setSelectedAgent] = useState("");
  const [showNotification, setShowNotification] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);`;

const stateReplacement = `  const [selectedAgent, setSelectedAgent] = useState("");
  const [showNotification, setShowNotification] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [configuratorRowIndex, setConfiguratorRowIndex] = useState<number | null>(null);`;

code = code.replace(stateTarget, stateReplacement);

fs.writeFileSync('src/components/PosBilling.tsx', code);
console.log('PosBilling fixed types');
