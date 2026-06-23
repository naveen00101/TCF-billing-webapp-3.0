const fs = require('fs');
const content = fs.readFileSync('src/components/PosBilling.tsx', 'utf-8');

let braces = 0;
let parens = 0;
let angle = 0;

const stack = [];

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') { braces++; stack.push({char, line: i+1}); }
    if (char === '}') { 
      braces--; 
      let top = stack.pop();
      if(top.char !== '{') console.log('Mismatched } at line ' + (i+1));
    }
    if (char === '(') { parens++; stack.push({char, line: i+1}); }
    if (char === ')') { 
      parens--;
      let top = stack.pop();
      if(top.char !== '(') console.log('Mismatched ) at line ' + (i+1));
    }
  }
}

console.log('Final counts:', {braces, parens});
if (stack.length > 0) {
  console.log('Unclosed brackets:');
  console.log(stack);
}
