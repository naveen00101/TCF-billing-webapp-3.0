import * as fs from 'fs';
import * as path from 'path';

const walk = (dir: string): string[] => {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
};

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace dark:bg-[#121212] and similar hex codes with empty
  content = content.replace(/dark:bg-\[#[a-fA-F0-9]+\]/g, '');
  content = content.replace(/dark:bg-blue-950\/[0-9]+/g, '');
  content = content.replace(/bg-\[#121212\]/g, 'bg-card');
  content = content.replace(/bg-\[#141414\]/g, 'bg-card');
  content = content.replace(/bg-\[#151515\]/g, 'bg-card');
  content = content.replace(/bg-\[#161616\]/g, 'bg-surface');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
  }
});
console.log('Fixed hex dark backgrounds!');
