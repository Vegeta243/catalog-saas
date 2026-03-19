const url = 'https://fr.aliexpress.com/item/1005007914556601.html';
const r = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124.0.0.0', 'Accept-Language': 'fr-FR' },
  redirect: 'follow'
});
const html = await r.text();

// Look for _dida_config_
const dcIdx = html.indexOf('_dida_config_');
console.log('_dida_config_ occurrences:', (html.match(/_dida_config_/g)||[]).length);
// Find the assignment
const assignment = html.match(/window\._dida_config_\s*=\s*(\{[\s\S]{0,2000}?\};)/);
if (assignment) {
  console.log('=== _dida_config_ assignment ===');
  console.log(assignment[1]);
}

// Also search for pageName
const pageName = html.match(/"pageName"\s*:\s*"([^"]+)"/);
console.log('\npageName:', pageName?.[1]);
const pageVersion = html.match(/"pageVersion"\s*:\s*"?(\d+)"?/);
console.log('pageVersion:', pageVersion?.[1]);

// Look for all AliCDN image URLs embedded in HTML
const imgs = [...new Set([...html.matchAll(/https?:\/\/ae0?[12]\.alicdn\.com\/kf\/[A-Za-z0-9]+[^"'\s\\>]{3,100}\.jpg/g)].map(m => m[0]))];
console.log('\n=== Embedded image URLs ===');
imgs.slice(0, 10).forEach(i => console.log(' ', i));

// Look for price in any format
const priceRaw = html.match(/(\d{1,3}[.,]\d{2})[^%<>]{0,20}(?:€|EUR|eur)/i);
console.log('\nPrice found:', priceRaw?.[0]);

// Look for a specific price format in the HTML
const allPrices = [...html.matchAll(/(?<!\w)(\d{1,3}[.,]\d{2,3})(?!\d)/g)].map(m => m[1]).filter(p => parseFloat(p.replace(',','.')) > 0.1 && parseFloat(p.replace(',','.')) < 10000);
console.log('All decimal numbers:', [...new Set(allPrices)].slice(0, 20));
