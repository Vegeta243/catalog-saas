const fs = require('fs')
const lines = fs.readFileSync('.env.local', 'utf8').split('\n')
const l = lines.find(x => x.startsWith('STRIPE_SECRET_KEY='))
const raw = l.split('=').slice(1).join('=').trim()
let v = raw
while ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
  v = v.slice(1, -1)
}
v = v.trim()
const buf = Buffer.from(v)
console.log('len', v.length)
console.log('hex first 20:', buf.slice(0, 20).toString('hex'))
console.log('hex last 10:', buf.slice(-10).toString('hex'))
console.log('first 15:', v.substring(0, 15))
console.log('last 10:', v.substring(v.length - 10))

// Check for any non-ASCII chars
for (let i = 0; i < v.length; i++) {
  const c = v.charCodeAt(i)
  if (c < 32 || c > 126) {
    console.log(`Non-ASCII at index ${i}: charCode=${c} hex=${c.toString(16)}`)
  }
}
