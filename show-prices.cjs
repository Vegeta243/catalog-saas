const fs = require('fs')
const lines = fs.readFileSync('.env.vercel.tmp', 'utf8').split('\n')

const priceKeys = [
  'STRIPE_STARTER_MONTHLY_PRICE_ID',
  'STRIPE_STARTER_YEARLY_PRICE_ID',
  'STRIPE_PRO_MONTHLY_PRICE_ID',
  'STRIPE_PRO_YEARLY_PRICE_ID',
  'STRIPE_SCALE_MONTHLY_PRICE_ID',
  'STRIPE_SCALE_YEARLY_PRICE_ID',
]

console.log('=== Price IDs from .env.vercel.tmp ===')
priceKeys.forEach(key => {
  const line = lines.find(l => l.startsWith(key + '='))
  if (line) {
    let v = line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '')
    console.log(`${key}=${v}`)
  } else {
    console.log(`${key}: NOT FOUND`)
  }
})
