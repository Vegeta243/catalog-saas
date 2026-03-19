const url = 'https://fr.aliexpress.com/item/1005007914556601.html';
const r = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124.0.0.0', 'Accept-Language': 'fr-FR' },
  redirect: 'follow'
});
const html = await r.text();

// Look for _page_config_
const pcIdx = html.indexOf('_page_config_');
if (pcIdx > 0) {
  console.log('=== _page_config_ context ===');
  console.log(html.slice(Math.max(0, pcIdx - 100), pcIdx + 600));
}

// Look for fetch/XHR calls in the HTML scripts
const fetchCalls = [...html.matchAll(/fetch\(['"](https?[^'"]+)['"]/g)].map(m => m[1]);
console.log('\n=== Fetch calls in HTML ===', fetchCalls);

// Look for URL patterns in inline scripts
const inlineScripts = [...html.matchAll(/<script(?![^>]+src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
for (const s of inlineScripts.slice(0,5)) {
  const apiUrls = [...s.matchAll(/https?:\/\/[^"'` ]+/g)].map(m => m[0]);
  if (apiUrls.length > 0) {
    console.log('\nInline script URLs:', apiUrls.slice(0,5));
  }
}

// Look for the var f = { pattern (locale/site config)
const fMatch = html.match(/var f=(\{[^;]{0,500})/);
if (fMatch) console.log('\n=== var f ===', fMatch[1]);

// Look for api/data endpoint in any of the scripts
const apiPaths = [...html.matchAll(/['"](\/(?:api|fn|data|pdp|item)[^'"]{2,80})['"]/g)].map(m => m[1]);
console.log('\n=== API paths ===', [...new Set(apiPaths)].slice(0, 20));
