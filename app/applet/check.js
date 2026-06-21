const fs = require('fs');
const content = fs.readFileSync('src/components/PosBilling.tsx', 'utf-8');

let braces = 0;
let parens = 0;
const stack = [];
const lines = content.split('\n');
let inString = false;
let stringChar = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Basic hack: ignoring strings & comments to avoid false positives is hard. 
  // Let's just find where it starts getting very bad.
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    
    // very naive string ignore
    if ((char === '"' || char === "'" || char === "`") && line[j-1] !== '\\') {
       if (!inString) { inString = true; stringChar = char; }
       else if (stringChar === char) { inString = false; }
    }
    if (inString) continue;

    if (char === '{') { braces++; stack.push({char, line: i+1}); }
    if (char === '}') { 
      braces--; 
      let top = stack.pop();
      if(top && top.char !== '{') console.log('Mismatched } at line ' + (i+1));
    }
    if (char === '(') { parens++; stack.push({char, line: i+1}); }
    if (char === ')') { 
      parens--;
      let top = stack.pop();
      if(top && top.char !== '(') console.log('Mismatched ) at line ' + (i+1));
    }
  }
}

console.log('Final counts:', {braces, parens});
if (stack.length > 0) {
  console.log('Unclosed brackets:');
  console.log(stack);
}
