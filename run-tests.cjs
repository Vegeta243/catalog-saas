const https = require('https')
const fs = require('fs')
const results = []
let pending = 0

function done() {
  pending--
  if (pending === 0) {
    const out = results.map(r => JSON.stringify(r)).join('\n')
    fs.writeFileSync('test-out.txt', out)
    process.exit(0)
  }
}

function httpTest(name, opts, body, cb) {
  pending++
  const req = https.request(opts, res => {
    let d = ''
    res.on('data', c => d += c)
    res.on('end', () => {
      if (cb) cb(res.statusCode, d, res.headers)
      else results.push({ name, status: res.statusCode, body: d.slice(0, 300) })
      done()
    })
  }).on('error', e => {
    results.push({ name, error: e.message })
    done()
  })
  if (body) req.write(body)
  req.end()
}

// 1.1 Homepage
httpTest('1.1 Homepage', { hostname: 'www.ecompilotelite.com', path: '/', method: 'GET' })

// 1.2 Login
httpTest('1.2 Login', { hostname: 'www.ecompilotelite.com', path: '/login', method: 'GET' })

// 1.3 Admin login
const adminBody = JSON.stringify({ loginId: 'Dushane243', password: '2413A2413a' })
pending++
const adminReq = https.request({
  hostname: 'www.ecompilotelite.com', path: '/api/admin/auth', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(adminBody) }
}, res => {
  let d = ''; res.on('data', c => d += c); res.on('end', () => {
    results.push({ name: '1.3 Admin login', status: res.statusCode, body: d.slice(0, 300) })
    done()
  })
}).on('error', e => { results.push({ name: '1.3 Admin login', error: e.message }); done() })
adminReq.write(adminBody); adminReq.end()

// 1.4 Stripe checkout (no auth = 401)
const stripeBody = JSON.stringify({ plan: 'starter' })
pending++
const stripeReq = https.request({
  hostname: 'www.ecompilotelite.com', path: '/api/stripe/checkout', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(stripeBody) }
}, res => {
  let d = ''; res.on('data', c => d += c); res.on('end', () => {
    results.push({ name: '1.4 Stripe checkout', status: res.statusCode, body: d.slice(0, 300) })
    done()
  })
}).on('error', e => { results.push({ name: '1.4 Stripe checkout', error: e.message }); done() })
stripeReq.write(stripeBody); stripeReq.end()

// 1.5 AI generate (no auth = 401)
const aiBody = JSON.stringify({ type: 'title', productId: 'test', title: 'Test Product' })
pending++
const aiReq = https.request({
  hostname: 'www.ecompilotelite.com', path: '/api/ai/generate', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(aiBody) }
}, res => {
  let d = ''; res.on('data', c => d += c); res.on('end', () => {
    results.push({ name: '1.5 AI generate', status: res.statusCode, body: d.slice(0, 300) })
    done()
  })
}).on('error', e => { results.push({ name: '1.5 AI generate', error: e.message }); done() })
aiReq.write(aiBody); aiReq.end()

// 1.6 AliExpress scrape (takes ~30s, no auth = 401)
const aliBody = JSON.stringify({ url: 'https://www.aliexpress.com/item/1005007914556601.html' })
pending++
const aliReq = https.request({
  hostname: 'www.ecompilotelite.com', path: '/api/import/scrape', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(aliBody) },
  timeout: 45000
}, res => {
  let d = ''; res.on('data', c => d += c); res.on('end', () => {
    results.push({ name: '1.6 AliExpress', status: res.statusCode, body: d.slice(0, 300) })
    done()
  })
}).on('error', e => { results.push({ name: '1.6 AliExpress', error: e.message }); done() })
aliReq.write(aliBody); aliReq.end()

// 1.7 Security headers
pending++
https.get('https://www.ecompilotelite.com', res => {
  const h = res.headers
  results.push({
    name: '1.7 Security headers',
    hsts: h['strict-transport-security'] || 'MISSING',
    xframe: h['x-frame-options'] || 'MISSING',
    xcontent: h['x-content-type-options'] || 'MISSING',
    referrer: h['referrer-policy'] || 'MISSING',
    csp: h['content-security-policy'] ? 'present' : 'MISSING'
  })
  res.resume(); done()
}).on('error', e => { results.push({ name: '1.7 Security headers', error: e.message }); done() })

// Read env file for API key tests
const envLines = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split('\n') : []
const getEnv = k => envLines.find(l => l.startsWith(k + '='))?.replace(k + '=', '').trim()

// 1.9 Stripe wehooks
const stripeKey = getEnv('STRIPE_SECRET_KEY')
if (stripeKey && !stripeKey.includes('your') && !stripeKey.includes('test_placeholder')) {
  pending++
  https.get({
    hostname: 'api.stripe.com', path: '/v1/webhook_endpoints',
    headers: { 'Authorization': 'Bearer ' + stripeKey }
  }, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => {
      try {
        const data = JSON.parse(d)
        const whs = data.data || []
        const correctWh = whs.find(w => w.url.includes('ecompilotelite.com'))
        results.push({ name: '1.9 Stripe webhook', count: whs.length, correct: !!correctWh, url: correctWh?.url || 'none', whs: whs.map(w => w.url) })
      } catch { results.push({ name: '1.9 Stripe webhook', error: 'parse error', raw: d.slice(0,200) }) }
      done()
    })
  }).on('error', e => { results.push({ name: '1.9 Stripe webhook', error: e.message }); done() })
} else {
  results.push({ name: '1.9 Stripe webhook', error: 'no stripe key in .env.local' })
}

// 1.10 Email (Resend)
const resendKey = getEnv('RESEND_API_KEY')
if (resendKey && !resendKey.includes('your')) {
  pending++
  const emailBody = JSON.stringify({ from: 'EcomPilot Elite <onboarding@resend.dev>', to: ['delivered@resend.dev'], subject: 'Test Launch Check', html: '<p>Test</p>' })
  const emailReq = https.request({
    hostname: 'api.resend.com', path: '/emails', method: 'POST',
    headers: { 'Authorization': 'Bearer ' + resendKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(emailBody) }
  }, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => {
      results.push({ name: '1.10 Email (Resend)', status: res.statusCode, body: d.slice(0, 200) })
      done()
    })
  }).on('error', e => { results.push({ name: '1.10 Email', error: e.message }); done() })
  emailReq.write(emailBody); emailReq.end()
} else {
  results.push({ name: '1.10 Email (Resend)', error: 'no resend key in .env.local' })
}

// 1.11 OpenAI
const openaiKey = getEnv('OPENAI_API_KEY')
if (openaiKey && !openaiKey.includes('your')) {
  pending++
  const oaBody = JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Say OK' }], max_tokens: 5 })
  const oaReq = https.request({
    hostname: 'api.openai.com', path: '/v1/chat/completions', method: 'POST',
    headers: { 'Authorization': 'Bearer ' + openaiKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(oaBody) }
  }, res => {
    results.push({ name: '1.11 OpenAI', status: res.statusCode })
    res.resume(); done()
  }).on('error', e => { results.push({ name: '1.11 OpenAI', error: e.message }); done() })
  oaReq.write(oaBody); oaReq.end()
} else {
  results.push({ name: '1.11 OpenAI', note: 'no key in .env.local (probably in Vercel)' })
}

// 1.8 DB tables check
const body = JSON.stringify({ query: "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename" })
pending++
const dbReq = https.request({
  hostname: 'api.supabase.com',
  path: '/v1/projects/mhroujagzclmdlfpiqju/database/query',
  method: 'POST',
  headers: { 'Authorization': 'Bearer sbp_7aedc79d4e53e0aa12912c79993ee2c4e2fc025d', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
}, res => {
  let d = ''; res.on('data', c => d += c); res.on('end', () => {
    try {
      const tables = JSON.parse(d).map(r => r.tablename)
      const required = ['admin_audit_log','admin_token_blacklist','automation_rules','chatbot_logs','competitor_alerts','competitor_price_history','feature_flags','processed_webhooks','rate_limit_log','referrals','security_events','shops','support_tickets','users','workspaces']
      const missing = required.filter(t => !tables.includes(t))
      results.push({ name: '1.8 DB tables', total: tables.length, missing, allPresent: missing.length === 0 })
    } catch { results.push({ name: '1.8 DB tables', error: 'parse error', raw: d.slice(0,200) }) }
    done()
  })
}).on('error', e => { results.push({ name: '1.8 DB tables', error: e.message }); done() })
dbReq.write(body); dbReq.end()
