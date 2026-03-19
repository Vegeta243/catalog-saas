const url = 'https://fr.aliexpress.com/item/1005007914556601.html';
const r = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124.0.0.0', 'Accept-Language': 'fr-FR' },
  redirect: 'follow'
});
const html = await r.text();

// Script tags
const scripts = [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)].map(m => m[1]);
console.log('=== Script tags ===');
scripts.forEach(s => console.log(' ', s));

// Embedded data
const patterns = ['runParams', '_dParams', 'PAGE_DATA', 'window.__', 'itemDetail', 'titleModule'];
for (const p of patterns) {
  const idx = html.indexOf(p);
  if (idx >= 0) console.log(`FOUND: ${p} at ${idx} — "${html.slice(Math.max(0,idx-20), idx+80)}"`);
}

// Check og tags
const og = html.match(/<meta[^>]+og:title[^>]+content="([^"]+)"/);
console.log('OG title:', og?.[1]);
const ogImg = html.match(/<meta[^>]+og:image[^>]+content="([^"]+)"/);
console.log('OG image:', ogImg?.[1]);
const ogPrice = html.match(/<meta[^>]+product:price:amount[^>]+content="([^"]+)"/);
console.log('OG price:', ogPrice?.[1]);
