#!/usr/bin/env node
/* Extract the inline game <script> from index.html (last <script> block) and
   syntax-check it with node --check semantics (new Function / vm compile). */
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('/home/z/my-project/download/neon-void/index.html', 'utf8');
const blocks = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!blocks.length) { console.error('NO INLINE SCRIPT FOUND'); process.exit(1); }
const code = blocks[blocks.length - 1];
try {
  new vm.Script(code, { filename: 'neon-void-inline.js' });
  console.log('SYNTAX OK — inline script ' + code.split('\n').length + ' lines');
} catch (e) {
  console.error('SYNTAX ERROR: ' + e.message);
  console.error(e.stack.split('\n').slice(0, 6).join('\n'));
  process.exit(1);
}
