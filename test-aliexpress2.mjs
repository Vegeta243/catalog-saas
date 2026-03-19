const url = 'https://fr.aliexpress.com/item/1005007914556601.html';
const r = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124.0.0.0', 'Accept-Language': 'fr-FR' },
  redirect: 'follow'
});
const html = await r.text();

// All meta tags
const metas = [...html.matchAll(/<meta[^>]+>/g)].map(m => m[0]);
const priceMetas = metas.filter(m => m.toLowerCase().includes('price') || m.toLowerCase().includes('amount'));
console.log('=== Price-related meta tags ===');
priceMetas.forEach(m => console.log(m));

// JSON-LD structured data
const jsonLds = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
console.log('\n=== JSON-LD ===');
jsonLds.forEach(m => console.log(m[1].slice(0, 500)));

// Price patterns in HTML directly  
const pricePatterns = html.match(/(?:€|EUR)[^<>"]{0,20}?(\d+[.,]\d{2})|(\d+[.,]\d{2})[^<>"]{0,5}?(?:€|EUR)/g);
console.log('\n=== Price patterns ===', pricePatterns?.slice(0, 10));

// Check for data in script tags with price info
const scriptPrices = [...html.matchAll(/"(?:price|amount|salePrice|promotionPrice)"\s*:\s*"?(\d[\d.]*)"?/g)].map(m => m[0]);
console.log('\n=== Price in scripts ===', scriptPrices.slice(0, 10));

// window.__INIT_DATA_CALLBACK__ - look for the calling pattern around it
const cbIdx = html.indexOf('__INIT_DATA_CALLBACK__');
if (cbIdx > 0) {
  console.log('\n=== __INIT_DATA_CALLBACK__ context ===');
  console.log(html.slice(Math.max(0, cbIdx - 200), cbIdx + 400));
}
