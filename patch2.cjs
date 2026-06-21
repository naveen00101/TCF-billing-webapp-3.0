const fs = require('fs');
const path = require('path');

const p = path.resolve('D:/Project B/src/components/PosBilling.tsx');
let code = fs.readFileSync(p, 'utf8');
const lines = code.split('\n');

let start = -1;
let end = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("{pickerStep === 2 && selectedCategory")) {
    start = i;
  }
  if (lines[i].includes("{/* Checkout Products Table reordered and updated above */}")) {
    end = i - 1;
    break;
  }
}

if (start !== -1 && end !== -1) {
  lines.splice(start, (end - start + 1));
  fs.writeFileSync(p, lines.join('\n'));
  console.log("Removed leftover picker steps successfully.");
} else {
  console.log("Could not find bounds", start, end);
}
