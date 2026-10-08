// Extract the inline game <script> from index.html and syntax-check it.
const fs = require('fs');
const { execSync } = require('child_process');
const html = fs.readFileSync('/home/z/my-project/download/neon-void/index.html', 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('no inline script found'); process.exit(1); }
const out = '/home/z/my-project/scripts/nv/_juice_bundle.js';
fs.writeFileSync(out, m[1]);
try {
  execSync(`node --check ${out}`, { stdio: 'inherit' });
  console.log('SYNTAX OK —', (m[1].length / 1024).toFixed(1) + 'KB bundle');
} catch (e) {
  console.error('SYNTAX FAIL');
  process.exit(1);
}
// sanity greps: new rig symbols present exactly once where expected
const js = m[1];
for (const sym of ['CFG.juice.ship', 'updateShipTrail', 'shipWrap', 'trailBuf', 'flameSpr', 'lerpColor', 'trailRate']) {
  const n = (js.match(new RegExp(sym.replace(/\./g, '\\.'), 'g')) || []).length;
  console.log(sym.padEnd(18), 'x' + n);
}
