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

  // Backgrounds without dark prefix
  content = content.replace(/(?<!dark:)bg-black\b/g, 'bg-card');
  content = content.replace(/(?<!dark:)bg-\[\#000000\]\b/g, 'bg-card');
  content = content.replace(/(?<!dark:)bg-\[\#121212\]\b/g, 'bg-card');
  content = content.replace(/(?<!dark:)bg-\[\#161616\]\b/g, 'bg-card');
  content = content.replace(/(?<!dark:)bg-\[\#18181b\]\b/g, 'bg-card');
  content = content.replace(/(?<!dark:)bg-\[\#111111\]\b/g, 'bg-card');
  content = content.replace(/(?<!dark:)bg-\[\#0a0a0a\]\b/g, 'bg-surface');
  content = content.replace(/(?<!dark:)bg-\[\#0f0f0f\]\b/g, 'bg-surface');
  content = content.replace(/(?<!dark:)bg-\[\#1a1a1a\]\b/g, 'bg-card');
  content = content.replace(/(?<!dark:)bg-zinc-900\b/g, 'bg-card');
  content = content.replace(/(?<!dark:)bg-zinc-950\b/g, 'bg-surface');
  content = content.replace(/(?<!dark:)bg-slate-900\b/g, 'bg-card');
  content = content.replace(/(?<!dark:)bg-slate-950\b/g, 'bg-surface');
  content = content.replace(/(?<!dark:)bg-gray-900\b/g, 'bg-card');
  content = content.replace(/(?<!dark:)bg-gray-950\b/g, 'bg-surface');
  content = content.replace(/(?<!dark:)bg-neutral-900\b/g, 'bg-card-secondary');
  content = content.replace(/(?<!dark:)bg-neutral-950\b/g, 'bg-surface');
  
  // Light grays
  content = content.replace(/(?<!dark:)(?:bg-slate-50|bg-gray-50|bg-zinc-50|bg-\[#f8fafc\]|bg-\[#EEF2F6\])\b/g, 'bg-surface');
  content = content.replace(/(?<!dark:)(?:bg-slate-100|bg-gray-100|bg-zinc-100)\b/g, 'bg-card-secondary');
  content = content.replace(/(?<!dark:)bg-white\b/g, 'bg-card');

  // Text
  content = content.replace(/(?<!dark:)(?:text-slate-900|text-gray-900|text-zinc-900|text-neutral-900|text-black)\b/g, 'text-primary');
  content = content.replace(/(?<!dark:)(?:text-slate-800|text-gray-800|text-zinc-800|text-neutral-800|text-gray-850|text-zinc-850)\b/g, 'text-secondary');
  content = content.replace(/(?<!dark:)(?:text-slate-700|text-gray-700|text-zinc-700|text-neutral-700)\b/g, 'text-secondary');
  content = content.replace(/(?<!dark:)(?:text-slate-600|text-gray-600|text-zinc-600|text-neutral-600)\b/g, 'text-muted');
  content = content.replace(/(?<!dark:)(?:text-slate-500|text-gray-500|text-zinc-500|text-neutral-500)\b/g, 'text-muted');
  content = content.replace(/(?<!dark:)(?:text-slate-400|text-gray-400|text-zinc-400|text-neutral-400)\b/g, 'text-muted');
  
  // Note: let's not blindly replace text-white everywhere as buttons use it.
  content = content.replace(/text-secondary bg-card/g, 'text-primary bg-card'); // "table-auto text-left text-xs text-secondary bg-card"

  // Borders
  content = content.replace(/(?<!dark:)(?:border-slate-200|border-gray-200|border-zinc-200|border-neutral-200)\b/g, 'border-default');
  content = content.replace(/(?<!dark:)(?:border-slate-100|border-gray-100|border-zinc-100|border-neutral-100)\b/g, 'border-default');
  content = content.replace(/(?<!dark:)(?:border-slate-800|border-gray-800|border-zinc-800|border-neutral-800)\b/g, 'border-default');
  content = content.replace(/(?<!dark:)(?:border-slate-900|border-gray-900|border-zinc-900|border-neutral-900)\b/g, 'border-default');
  content = content.replace(/(?<!dark:)border-gray-150\b/g, 'border-default');

  // Input fixes specifically 
  // e.g., 'bg-gray-50 dark:bg-zinc-900' -> 'bg-input'
  content = content.replace(/bg-surface dark:bg-zinc-900/g, 'bg-input');
  content = content.replace(/bg-card dark:bg-zinc-900/g, 'bg-input');
  content = content.replace(/bg-surface dark:bg-zinc-800/g, 'bg-input');
  content = content.replace(/bg-card dark:bg-zinc-800/g, 'bg-input');

  // Table styles
  content = content.replace(/bg-\[\#EEF2F6\] dark:bg-\[\#0f0f0f\]/g, 'bg-table-header');
  content = content.replace(/bg-\[\#EEF2F6\]/g, 'bg-table-header');

  // Fix buttons that might have lost text-white
  content = content.replace(/bg-blue-600 text-primary/g, 'bg-blue-600 text-white');
  content = content.replace(/text-primary bg-blue-600/g, 'text-white bg-blue-600');
  content = content.replace(/bg-emerald-600 text-primary/g, 'bg-emerald-600 text-white');
  content = content.replace(/bg-red-600 text-primary/g, 'bg-red-600 text-white');

  // Replace gradient background forcing dark mode
  content = content.replace(/bg-gradient-to-\w+ from-(?:slate|zinc|gray|neutral)-9[05]0 to-(?:slate|zinc|gray|neutral)-9[05]0 text-primary/g, 'bg-card border border-default text-primary');

  // Shadows
  content = content.replace(/shadow-sm dark:shadow-none/g, 'shadow-sm');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
  }
});

console.log('Fixed themes globally across components!');


