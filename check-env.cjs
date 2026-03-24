const fs = require('fs')
const lines = fs.readFileSync('.env.local', 'utf8').split('\n')

console.log('=== Stripe/Price env vars in .env.local ===')
lines.filter(l => l.match(/PRICE|STRIPE/i) && l.includes('=')).forEach(l => {
  const k = l.split('=')[0]
  let v = l.split('=').slice(1).join('=').trim()
  v = v.replace(/^["']|["']$/g, '')
  const display = v.length > 30 ? v.substring(0, 30) + '...' : v
  console.log(`${k}=${display} [len:${v.length}]`)
})

// Also check .env.vercel.tmp if it exists
if (fs.existsSync('.env.vercel.tmp')) {
  console.log('\n=== .env.vercel.tmp ===')
  const v2 = fs.readFileSync('.env.vercel.tmp', 'utf8').split('\n')
  v2.filter(l => l.match(/PRICE|STRIPE/i) && l.includes('=')).forEach(l => {
    console.log(l.split('=')[0] + '=[exists]')
  })
} else {
  console.log('\n.env.vercel.tmp: not found')
}
