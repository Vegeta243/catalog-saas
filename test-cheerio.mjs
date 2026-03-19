import * as cheerio from 'cheerio';

const url = 'https://fr.aliexpress.com/item/1005007914556601.html';
const r = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://fr.aliexpress.com/',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Upgrade-Insecure-Requests': '1',
  },
  redirect: 'follow'
});
const html = await r.text();

// Test CAPTCHA detection
const snippet = html.slice(0, 8000);
const captchaDetected = /captcha|robot|verify.*human|access.*denied|unusual.*traffic|please.*enable.*javascript/i.test(snippet);
console.log('CAPTCHA detected:', captchaDetected);
if (captchaDetected) {
  // Find which word triggered it
  for (const word of ['captcha', 'robot', 'access.*denied', 'please.*enable.*javascript', 'unusual.*traffic']) {
    if (new RegExp(word, 'i').test(snippet)) {
      console.log('  Triggered by:', word);
      const idx = snippet.search(new RegExp(word, 'i'));
      if (idx >= 0) console.log('  Context:', snippet.slice(Math.max(0,idx-30), idx+80));
    }
  }
}

// Test Cheerio extraction (Strategy 5)
const $ = cheerio.load(html);
const title = $("meta[property='og:title']").attr("content") ||
  $("meta[property=\"og:title\"]").attr("content") ||
  $('meta[property="og:title"]').attr("content");
console.log('\nCheerio og:title:', title?.slice(0, 100));

const imageUrl = $("meta[property='og:image']").attr("content") ||
  $('meta[property="og:image"]').attr("content");
console.log('Cheerio og:image:', imageUrl);

// Test regex extraction as fallback
const titleRegex = html.match(/property="og:title"\s+content="([^"]+)"/);
const imgRegex = html.match(/property="og:image"\s+content="([^"]+)"/);
console.log('\nRegex og:title:', titleRegex?.[1]?.slice(0, 100));
console.log('Regex og:image:', imgRegex?.[1]);

// Test alicdn.com image extraction
const alicdnImgs = [...new Set([...html.matchAll(/https?:\/\/ae0?[12]\.alicdn\.com\/kf\/[A-Za-z0-9]+[^"'\s\\>]{0,100}\.jpg/g)].map(m => m[0]))];
console.log('\nAliCDN images found:', alicdnImgs.length, '->', alicdnImgs.slice(0,3));
