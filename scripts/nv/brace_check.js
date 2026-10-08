#!/usr/bin/env node
// Brace-depth tracker that skips strings, template literals, comments, regex-ish
const fs = require('fs');
const parts = ['p1.html', 'p2.js', 'p3.js', 'p4.js'];
let depth = 0, line = 1;
const stack = [];
for (const f of parts) {
  const src = fs.readFileSync('/home/z/my-project/scripts/nv/' + f, 'utf8');
  let i = 0, n = src.length;
  let mode = 'code'; // code | line | block | str | tpl | chr
  while (i < n) {
    const c = src[i], c2 = src[i + 1];
    if (c === '\n') { line++; if (mode === 'line') mode = 'code'; i++; continue; }
    if (mode === 'line') { i++; continue; }
    if (mode === 'str') {
      if (c === '\\') { i += 2; continue; }
      if (c === "'" || c === '"') mode = 'code';
      i++; continue;
    }
    if (mode === 'chr') {
      if (c === '\\') { i += 2; continue; }
      if (c === "'") mode = 'code';
      i++; continue;
    }
    if (mode === 'tpl') {
      if (c === '\\') { i += 2; continue; }
      if (c === '`') mode = 'code';
      i++; continue;
    }
    if (mode === 'block') {
      if (c === '*' && c2 === '/') { mode = 'code'; i += 2; continue; }
      if (c === '\n') line++;
      i++; continue;
    }
    // code mode
    if (c === '/' && c2 === '/') { mode = 'line'; i += 2; continue; }
    if (c === '/' && c2 === '*') { mode = 'block'; i += 2; continue; }
    if (c === "'" || c === '"') { mode = 'str'; i++; continue; }
    if (c === '`') { mode = 'tpl'; i++; continue; }
    if (c === '{') { depth++; stack.push([f, line]); i++; continue; }
    if (c === '}') {
      depth--;
      stack.pop();
      if (depth === 0 && f !== 'p4.js') {
        console.log(`PREMATURE CLOSE at ${f}:${line}`);
        process.exit(0);
      }
      if (depth < 0) { console.log(`NEGATIVE at ${f}:${line}`); process.exit(0); }
      i++; continue;
    }
    i++;
  }
  console.log(`${f} done, depth=${depth}`);
}
console.log('final depth =', depth);
