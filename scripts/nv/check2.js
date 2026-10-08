// Syntax check: extract inline <script> blocks and parse them
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
let ok = true;
blocks.forEach((m, i) => {
  try {
    new Function(m[1]); // parse only — never executed
    console.log(`inline script #${i}: PARSE OK (${m[1].split('\n').length} lines)`);
  } catch (e) {
    ok = false;
    console.error(`inline script #${i}: ${e.message}`);
    // rough line guess from stack
    const lm = /<anonymous>:(\d+)/.exec(e.stack || '');
    if (lm) {
      const ln = parseInt(lm[1], 10) - 2; // Function wrapper offset
      const lines = m[1].split('\n');
      for (let j = Math.max(0, ln - 3); j < Math.min(lines.length, ln + 2); j++) {
        console.error(`${j + 1}: ${lines[j]}`);
      }
    }
  }
});
console.log(ok ? 'SYNTAX OK' : 'SYNTAX FAIL');
process.exit(ok ? 0 : 1);
