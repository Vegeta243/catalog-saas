const itemId = '1005007914556601';
const headers = {
  'User-Agent': 'Mozilla/5.0 Chrome/124.0.0.0',
  'Accept': 'application/json',
  'Accept-Language': 'fr-FR,fr;q=0.9',
  'Referer': `https://fr.aliexpress.com/item/${itemId}.html`,
};

const candidates = [
  `/fn/pdp-pc/index?itemId=${itemId}&country=FR&currency=EUR&locale=fr_FR`,
  `/fn/ae-pdp/index?itemId=${itemId}&country=FR&currency=EUR&locale=fr_FR`,
  `/fn/ae-item/index?itemId=${itemId}&country=FR&currency=EUR&locale=fr_FR`,
  `/fn/ae-item-detail/index?itemId=${itemId}&country=FR&currency=EUR&locale=fr_FR`,
  `/fn/product-detail/index?itemId=${itemId}&country=FR&currency=EUR&locale=fr_FR`,
];

for (const path of candidates) {
  const url = `https://fr.aliexpress.com${path}`;
  try {
    const r = await fetch(url, { headers, redirect: 'follow' });
    const body = await r.text();
    console.log(`\n${path} -> HTTP ${r.status}`);
    if (body.length < 500) {
      console.log(body.slice(0, 300));
    } else {
      // Try to find product data
      const dataCheck = body.includes('subject') || body.includes('price') || body.includes('title');
      console.log(`Size: ${body.length}, has product data: ${dataCheck}`);
      if (dataCheck) console.log(body.slice(0, 500));
      else console.log(body.slice(0, 200));
    }
  } catch (e) {
    console.log(`\n${path} -> ERROR: ${e.message}`);
  }
}
