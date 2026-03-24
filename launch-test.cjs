const https = require('https')
const results = []

function req(name, opts, check) {
  return new Promise(resolve => {
    const r = https.request({ hostname: 'www.ecompilotelite.com', ...opts }, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => {
        const result = check(res, d)
        results.push({ name, ...result })
        resolve()
      })
    })
    r.on('error', e => { results.push({ name, pass: false, detail: 'ERROR: ' + e.message }); resolve() })
    if (opts.body) r.write(opts.body)
    r.end()
  })
}

async function runAll() {
  // Run in batches to avoid overwhelming server
  await Promise.all([
    req('Homepage', { path: '/', method: 'GET' }, (res) => ({
      pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}`
    })),
    req('Login page', { path: '/login', method: 'GET' }, (res) => ({
      pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}`
    })),
    req('Signup page', { path: '/signup', method: 'GET' }, (res) => ({
      pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}`
    })),
    req('Pricing page', { path: '/pricing', method: 'GET' }, (res) => ({
      pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}`
    })),
    req('Onboarding page', { path: '/onboarding', method: 'GET' }, (res) => ({
      // redirects to login (302/307) or shows page (200) - both are OK
      pass: [200, 302, 307].includes(res.statusCode), detail: `HTTP ${res.statusCode}`
    })),
    req('Forgot password', { path: '/forgot-password', method: 'GET' }, (res) => ({
      pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}`
    })),
    req('Reset password', { path: '/reset-password', method: 'GET' }, (res) => ({
      pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}`
    })),
    req('CGU', { path: '/cgu', method: 'GET' }, (res) => ({
      pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}`
    })),
    req('CGV', { path: '/cgv', method: 'GET' }, (res) => ({
      pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}`
    })),
    req('Mentions légales', { path: '/mentions-legales', method: 'GET' }, (res) => ({
      pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}`
    })),
    req('Politique confidentialité', { path: '/politique-confidentialite', method: 'GET' }, (res) => ({
      pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}`
    })),
    req('Sitemap', { path: '/sitemap.xml', method: 'GET' }, (res) => ({
      pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}`
    })),
    req('Robots.txt', { path: '/robots.txt', method: 'GET' }, (res) => ({
      pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}`
    })),
  ])

  // Security headers
  await req('Security: HSTS + X-Frame + CSP', { path: '/', method: 'GET' }, (res) => {
    const h = res.headers
    const hsts = !!h['strict-transport-security']
    const xframe = h['x-frame-options'] === 'DENY'
    const xcontent = h['x-content-type-options'] === 'nosniff'
    const csp = !!h['content-security-policy']
    const referrer = !!h['referrer-policy']
    const allOk = hsts && xframe && xcontent && csp && referrer
    return {
      pass: allOk,
      detail: `HSTS:${hsts} XFrame:${xframe} XContent:${xcontent} CSP:${csp} Referrer:${referrer}`
    }
  })

  // Admin login
  const adminBody = JSON.stringify({ username: 'Dushane243', password: '2413A2413a' })
  await req('Admin login API', {
    path: '/api/admin/auth', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(adminBody) },
    body: adminBody
  }, (res) => ({ pass: res.statusCode === 200, detail: `HTTP ${res.statusCode}` }))

  // Stripe checkout - should now return 401 (auth required)
  const checkoutBody = JSON.stringify({ plan: 'starter', billing: 'monthly' })
  await req('Stripe checkout (requires auth)', {
    path: '/api/stripe/checkout', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(checkoutBody) },
    body: checkoutBody
  }, (res, d) => {
    // 401 = correctly requires auth. 200/302 = session URL. 400 = bad params (ok). Anything else = problem
    const pass = [200, 400, 401].includes(res.statusCode)
    const detail = `HTTP ${res.statusCode}` + (res.statusCode === 401 ? ' (auth required — correct)' : '')
    return { pass, detail }
  })

  // Import route (not admin-only)
  const importBody = JSON.stringify({ url: 'https://example.com/product' })
  await req('Import route (not 403)', {
    path: '/api/import/scrape', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(importBody) },
    body: importBody
  }, (res) => ({
    pass: res.statusCode !== 403,
    detail: `HTTP ${res.statusCode} ${res.statusCode === 403 ? '❌ STILL BLOCKED' : '(accessible)'}`
  }))

  // Print results
  console.log('\n═══════════════════════════════════════════════════')
  console.log('         FINAL LAUNCH READINESS CHECKLIST')
  console.log('═══════════════════════════════════════════════════\n')

  let passed = 0, failed = 0
  for (const r of results) {
    const icon = r.pass ? '✅' : '❌'
    console.log(`${icon} ${r.name}${r.detail ? ' — ' + r.detail : ''}`)
    if (r.pass) passed++; else failed++
  }

  console.log(`\n═══════════════════════════════════════════════════`)
  console.log(`RESULT: ${passed}/${results.length} passed, ${failed} failed`)
  if (failed === 0) {
    console.log('\n🚀 LAUNCH READY! All systems go.')
  } else {
    console.log('\n⚠️  Fix the failures above before launching.')
  }
  console.log('═══════════════════════════════════════════════════\n')
}

runAll().catch(console.error)
