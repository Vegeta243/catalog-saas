const https = require('https')
const fs = require('fs')
const envLines = fs.readFileSync('.env.local', 'utf8').split('\n')
const getEnv = k => {
  const line = envLines.find(l => l.startsWith(k + '='))
  if (!line) return null
  let val = line.split('=').slice(1).join('=').trim()
  // Strip all surrounding quotes (single or double)
  while ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1)
  }
  return val.trim()
}

const stripeKey = getEnv('STRIPE_SECRET_KEY')
console.log('Key length:', stripeKey?.length, 'starts with:', stripeKey?.substring(0, 10))

const params = new URLSearchParams()
params.append('url', 'https://www.ecompilotelite.com/api/stripe/webhook')
;['checkout.session.completed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.payment_failed','invoice.payment_succeeded']
  .forEach(e => params.append('enabled_events[]', e))

const body = params.toString()
const req = https.request({
  hostname: 'api.stripe.com',
  path: '/v1/webhook_endpoints',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + stripeKey,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(body),
  }
}, res => {
  let d = ''
  res.on('data', c => d += c)
  res.on('end', () => {
    try {
      const wh = JSON.parse(d)
      if (wh.id) {
        console.log('WEBHOOK CREATED:', wh.id)
        console.log('SECRET:', wh.secret)
        fs.writeFileSync('webhook-secret.txt', wh.secret)
      } else {
        console.log('ERROR:', d.slice(0, 500))
      }
    } catch (e) {
      console.log('PARSE ERR:', d.slice(0, 300))
    }
  })
})
req.write(body)
req.end()
