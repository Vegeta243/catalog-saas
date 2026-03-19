const url = 'https://fr.aliexpress.com/item/1005007914556601.html';
const r = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Cookie': 'xman_us_f=x_l=0; acs_usuc_t=; aep_usuc_f=site=fra&c_tp=EUR&region=FR&b_locale=fr_FR; intl_locale=fr_FR'
  },
  redirect: 'follow'
});
const html = await r.text();
console.log('Status:', r.status, 'Size:', html.length);

// All meta tags
const allMeta = [...html.matchAll(/<meta[^>]+>/g)].map(m => m[0]);
console.log(`\n=== All ${allMeta.length} meta tags ===`);
allMeta.forEach(m => {
  if (m.includes('og:') || m.includes('product:') || m.includes('price') || m.includes('title') || m.includes('description') || m.includes('image')) {
    console.log(' ', m.slice(0, 200));
  }
});

// All images (og:image)
const ogImg = html.match(/property="og:image"\s+content="([^"]+)"/);
const ogImg2 = html.match(/content="([^"]+)"\s+property="og:image"/);
console.log('\nog:image:', ogImg?.[1] || ogImg2?.[1]);

// Title
const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/);
const ogTitle2 = html.match(/content="([^"]+)"\s+property="og:title"/);
console.log('og:title:', (ogTitle?.[1] || ogTitle2?.[1])?.slice(0, 100));
