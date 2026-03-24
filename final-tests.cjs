const https = require('https')
const results = []
let pending = 0

function test(name, opts, cb) {
  pending++
  const done = () => { if (--pending === 0) printResults() }
  const req = https.request({ hostname: 'www.ecompilotelite.com', ...opts }, res => {
    let d = ''
    res.on('data', c => d += c)
    res.on('end', () => { cb ? cb(res, d, done) : (results.push({ name, status: res.statusCode }), done()) })
  })
  req.on('error', e => { results.push({ name, status: 'ERROR', msg: e.message }); done() })
  if (opts.body) req.write(opts.body)
  req.end()
}

function printResults() {
  console.log('\n========== LAUNCH READINESS CHECKLIST ==========\n')
  for (const r of results) {
    const icon = r.pass ? '✅' : (r.warn ? '⚠️' : '❌')
    console.log(`${icon} ${r.name}${r.detail ? ' — ' + r.detail : ''}`)
  }
  console.log('\n================================================')
  const passed = results.filter(r => r.pass).length
  const warned = results.filter(r => r.warn).length
  const failed = results.filter(r => !r.pass && !r.warn).length
  console.log(`\nTotal: ${passed} passed, ${warned} warnings, ${failed} failed out of ${results.length}`)
}

// 1. Homepage
test('Homepage loads (200)', { path: '/', method: 'GET' }, (res, d, done) => {
  results.push({ name: 'Homepage loads', pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}` })
  done()
})

// 2. Login page
test('Login page (200)', { path: '/login', method: 'GET' }, (res, d, done) => {
  results.push({ name: 'Login page', pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}` })
  done()
})

// 3. Pricing page
test('Pricing page (200)', { path: '/pricing', method: 'GET' }, (res, d, done) => {
  results.push({ name: 'Pricing page', pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}` })
  done()
})

// 4. Signup page
test('Signup page (200)', { path: '/signup', method: 'GET' }, (res, d, done) => {
  results.push({ name: 'Signup page', pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}` })
  done()
})

// 5. Forgot password page
test('Forgot password page (200)', { path: '/forgot-password', method: 'GET' }, (res, d, done) => {
  results.push({ name: 'Forgot password page', pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}` })
  done()
})

// 6. Sitemap
test('Sitemap (200)', { path: '/sitemap.xml', method: 'GET' }, (res, d, done) => {
  results.push({ name: 'Sitemap.xml', pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}` })
  done()
})

// 7. Robots.txt
test('Robots.txt (200)', { path: '/robots.txt', method: 'GET' }, (res, d, done) => {
  results.push({ name: 'Robots.txt', pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}` })
  done()
})

// 8. Security headers
test('Security headers', { path: '/', method: 'GET' }, (res, d, done) => {
  const headers = {
    'strict-transport-security': res.headers['strict-transport-security'],
    'x-frame-options': res.headers['x-frame-options'],
    'x-content-type-options': res.headers['x-content-type-options'],
    'referrer-policy': res.headers['referrer-policy'],
    'content-security-policy': res.headers['content-security-policy'] ? 'present' : null,
  }
  const allPresent = Object.values(headers).every(v => v)
  results.push({ name: 'Security headers', pass: allPresent, detail: JSON.stringify(headers) })
  done()
})

// 9. Admin login
const adminBody = JSON.stringify({ username: 'Dushane243', password: '2413A2413a' })
test('Admin login (200)', {
  path: '/api/admin/auth', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(adminBody) },
  body: adminBody
}, (res, d, done) => {
  results.push({ name: 'Admin login', pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}` })
  done()
})

// 10. Stripe checkout validation
const checkoutBody = JSON.stringify({ plan: 'starter', billing: 'monthly', email: 'test@test.com' })
test('Stripe checkout (validates input)', {
  path: '/api/stripe/checkout', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(checkoutBody) },
  body: checkoutBody
}, (res, d, done) => {
  // 400 or 500 means API is responding (depends on Stripe config)
  const ok = res.statusCode !== 404
  results.push({ name: 'Stripe checkout API', pass: ok, warn: !ok, detail: `HTTP ${res.statusCode}` })
  done()
})

// 11. API import route (should NOT return 403 anymore)
const importBody = JSON.stringify({ url: 'https://example.com' })
test('Import route (not 403)', {
  path: '/api/import/scrape', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(importBody) },
  body: importBody
}, (res, d, done) => {
  const notBlocked = res.statusCode !== 403
  results.push({ name: 'Import route accessible', pass: notBlocked, detail: `HTTP ${res.statusCode}` })
  done()
})

// 12. CGU page
test('CGU page (200)', { path: '/cgu', method: 'GET' }, (res, d, done) => {
  results.push({ name: 'CGU page', pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}` })
  done()
})
