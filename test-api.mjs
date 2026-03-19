const itemId = '1005007914556601';
const baseHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9',
  'Referer': `https://fr.aliexpress.com/item/${itemId}.html`,
  'Origin': 'https://fr.aliexpress.com',
  'Content-Type': 'application/json',
};

// Try POST to fn endpoints
const postCandidates = [
  { url: 'https://fr.aliexpress.com/fn/ae-detail/detail', body: { itemId, country: 'FR', currency: 'EUR', locale: 'fr_FR' } },
  { url: 'https://fr.aliexpress.com/fn/ae-detail/getItemDetail', body: { itemId, country: 'FR', currency: 'EUR', locale: 'fr_FR' } },
];

for (const { url, body } of postCandidates) {
  try {
    const r = await fetch(url, { method: 'POST', headers: baseHeaders, body: JSON.stringify(body) });
    const text = await r.text();
    console.log(`\nPOST ${url} -> ${r.status}`);
    console.log(text.slice(0, 400));
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
}

// Also try the GlobalSearch API which might have price data
const searchUrl = `https://fr.aliexpress.com/fn/search-pc/index?SearchText=${itemId}&CatId=0`;
try {
  const r = await fetch(searchUrl, { headers: { ...baseHeaders, 'Accept': '*/*' } });
  const text = await r.text();
  console.log(`\nGET search -> ${r.status}, size: ${text.length}`);
  if (text.includes(itemId)) {
    // Extract price from search results
    const price = text.match(/(?:price|salePrice)[^\d]*(\d+[.,]\d{2})/i);
    console.log('Price in search:', price?.[0]);
  }
  console.log(text.slice(0, 200));
} catch (e) {
  console.log('Search error:', e.message);
}

// Try AliExpress DS API (used by dropshippers)
const dsUrl = `https://api.aliexpress.com/v1?method=aliexpress.product.get&id=${itemId}`;
try {
  const r = await fetch(dsUrl, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124' } });
  const text = await r.text();
  console.log(`\nDS API -> ${r.status}: ${text.slice(0, 300)}`);
} catch (e) {
  console.log('DS API error:', e.message);
}
