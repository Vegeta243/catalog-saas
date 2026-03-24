const https = require('https')
const fs = require('fs')
const lines = fs.readFileSync('.env.local', 'utf8').split('\n')
const l = lines.find(x => x.startsWith('STRIPE_SECRET_KEY='))
let v = l.split('=').slice(1).join('=').trim()
while ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
  v = v.slice(1, -1)
}
v = v.trim()

// Try a simple GET to list webhooks
const req = https.request({
  hostname: 'api.stripe.com',
  path: '/v1/webhook_endpoints?limit=3',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + v,
  }
}, res => {
  let d = ''
  res.on('data', c => d += c)
  res.on('end', () => {
    console.log('Status:', res.statusCode)
    console.log('Body:', d.slice(0, 500))
  })
})
req.end()
