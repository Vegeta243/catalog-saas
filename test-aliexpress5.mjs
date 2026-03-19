const url = 'https://fr.aliexpress.com/item/1005007914556601.html';
const r = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124.0.0.0', 'Accept-Language': 'fr-FR' },
  redirect: 'follow'
});
const html = await r.text();

// Find ALL inline script blocks and look for the _dida_config_ assignment
const inlineScripts = [...html.matchAll(/<script(?![^>]+src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
console.log(`Found ${inlineScripts.length} inline scripts`);

for (let i = 0; i < inlineScripts.length; i++) {
  const s = inlineScripts[i];
  if (s.includes('_dida_config_') && !s.includes('window._dida_config_&&')) {
    console.log(`\n=== Script ${i} with _dida_config_ ===`);
    // Try to find the assignment
    const idx = s.indexOf('_dida_config_');
    console.log(s.slice(Math.max(0,idx-50), idx+500));
  }
}

// Also look for "itemId" or "productId" in inline scripts
for (let i = 0; i < inlineScripts.length; i++) {
  const s = inlineScripts[i];
  if (s.match(/itemId|productId|item_id/) && s.length > 50) {
    const m = s.match(/(itemId|productId)[^\d]*(\d{10,})/);
    if (m) console.log(`\nScript ${i} has product ID:`, m[0]);
  }
}
