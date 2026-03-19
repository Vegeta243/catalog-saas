// Fetch the PDP bundle and search for API data
const pdpUrl = 'https://assets.aliexpress-media.com/g/ae-fe/pdp-pc/0.2.127/js/index.js';
const r = await fetch(pdpUrl, {
  headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124.0.0.0', 'Referer': 'https://fr.aliexpress.com/' }
});
const js = await r.text();
console.log('PDP bundle size:', js.length, 'chars');

// Extract unique string literals that look like API identifiers
const strings = [...js.matchAll(/["'`]([a-z][a-z0-9_-]{2,40})["'`]/g)].map(m => m[1]);
const apiLike = [...new Set(strings)].filter(s => 
  s.includes('-') || s.includes('_') || 
  ['index','detail','price','item','product','sku','module'].some(k => s.toLowerCase().includes(k))
);
console.log('\nAPI-like strings:', apiLike.slice(0, 50));

// Look for _dida_config_ directly
if (js.includes('_dida_config_')) {
  const matches = [...js.matchAll(/_dida_config_[^;]{0,200}/g)];
  matches.forEach(m => console.log('\n_dida_config_:', m[0]));
}

// Look for pageName
const pageNameMatches = [...js.matchAll(/pageName[^;]{0,100}/g)];
pageNameMatches.slice(0,5).forEach(m => console.log('\npageName ref:', m[0]));

// Look for any URL pattern with variables
const urlPatterns = [...js.matchAll(/["'`](\/[a-z][^"'`]{3,60})["'`]/g)].map(m => m[1]);
const apiUrls = urlPatterns.filter(u => 
  (u.startsWith('/fn/') || u.startsWith('/api/') || u.startsWith('/pdp/')) && 
  !u.includes('.js') && !u.includes('.css') && !u.includes('.html')
);
console.log('\nAPI URL patterns:', [...new Set(apiUrls)].slice(0, 30));
