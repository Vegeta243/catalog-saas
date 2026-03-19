// Fetch the cosmos bundle and look for API function names
const cosmosUrl = 'https://assets.aliexpress-media.com/g/ae-fe/cosmos/0.0.423/pc/index.js';
const r = await fetch(cosmosUrl, {
  headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124.0.0.0', 'Referer': 'https://fr.aliexpress.com/' }
});
const js = await r.text();
console.log('Cosmos bundle size:', js.length, 'chars');

// Look for pageName or _dida_config_
const pageNames = [...js.matchAll(/pageName['":\s]+['"]([a-z0-9_-]{3,40})['"]/gi)].map(m => m[1]);
console.log('\nPageNames:', [...new Set(pageNames)].slice(0, 20));

// Look for /fn/ paths
const fnPaths = [...js.matchAll(/['"]\/fn\/([^'"]{2,60})['"]/g)].map(m => m[1]);
console.log('\n/fn/ paths:', [...new Set(fnPaths)].slice(0, 20));

// Look for funcGroup/funcName
const funcGroups = [...js.matchAll(/funcGroup['":\s]+['"]([^'"]{2,40})['"]/gi)].map(m => m[1]);
console.log('\nfuncGroups:', [...new Set(funcGroups)].slice(0, 20));

// Look for _dida_config_
if (js.includes('_dida_config_')) {
  const idx = js.indexOf('_dida_config_');
  console.log('\n_dida_config_ context:', js.slice(Math.max(0,idx-100), idx+300));
}

// Look for price-related API calls
const priceApi = [...js.matchAll(/price[A-Za-z]*Api|getPrice|priceModule|skuModule/gi)].map(m => m[0]);
console.log('\nPrice-related refs:', [...new Set(priceApi)].slice(0, 20));
