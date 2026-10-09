// Scans dist/pt/**/index.html visible body text (scripts/styles/head/code stripped)
// for leftover English markers. Prints one block per page with matches.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'index.html') out.push(p);
  }
  return out;
}

const MARKERS = [
  'the ', ' and ', ' you ', ' your ', ' How to', ' What is', ' Why ',
  'Learn more', 'Get started', 'Read more', 'Copy', 'Copied', 'Related Tools',
  'Last updated', 'Privacy Policy', 'Terms of', 'Add to Cart', 'Explore perceptual',
  'Browser', 'browser ', 'color picker', 'Free OKLCH', 'with ', 'for ',
];

const files = walk('dist/pt');
let flagged = 0;

for (const f of files) {
  const html = readFileSync(f, 'utf8');
  const body = html.split('<body')[1] || '';
  const text = body
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<pre[\s\S]*?<\/pre>/g, ' [CODE] ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
  const found = [];
  for (const marker of MARKERS) {
    let idx = text.toLowerCase().indexOf(marker.toLowerCase());
    while (idx !== -1) {
      found.push(text.slice(Math.max(0, idx - 45), idx + marker.length + 55).trim());
      idx = text.toLowerCase().indexOf(marker.toLowerCase(), idx + marker.length);
      if (found.length > 40) break;
    }
  }
  // Heuristic: markers like " the ", " and " in pt prose are rare; filter out
  // matches that are clearly inside pt sentences by requiring >=2 distinct markers
  // or a strong marker (How to/What is/Copy/Related Tools etc.).
  const strong = /^(How to|What is|Why |Learn more|Get started|Read more|Copy|Copied|Related Tools|Last updated|Privacy Policy|Terms of|Add to Cart|Explore perceptual|Free OKLCH)/;
  const distinct = new Set(found.map((s) => s.slice(0, 80)));
  const strongHits = [...distinct].filter((s) => strong.test(s));
  if (strongHits.length || distinct.size >= 6) {
    flagged++;
    console.log('== ' + f.replace(/\\/g, '/'));
    const show = strongHits.length ? strongHits : [...distinct].slice(0, 8);
    show.slice(0, 8).forEach((s) => console.log('   ' + s));
  }
}
console.log(`flagged pages: ${flagged} / ${files.length}`);
