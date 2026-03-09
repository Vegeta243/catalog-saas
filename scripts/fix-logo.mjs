import sharp from 'sharp'

const src = './generated-image__1_.png'
const meta = await sharp(src).metadata()
const w = meta.width
const h = meta.height
const half = Math.floor(w / 2)

console.log(`Source: ${w}x${h}, half=${half}`)

// Helper: make near-white pixels fully transparent
async function removeWhiteBackground(inputBuf, threshold = 15) {
  const { data, info } = await sharp(inputBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Make a mutable copy
  const pixels = Buffer.from(data)

  for (let i = 0; i < info.width * info.height; i++) {
    const r = pixels[i * 4]
    const g = pixels[i * 4 + 1]
    const b = pixels[i * 4 + 2]
    if (r >= 255 - threshold && g >= 255 - threshold && b >= 255 - threshold) {
      pixels[i * 4 + 3] = 0 // fully transparent
    }
  }

  return sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } })
}

// Extract left half (icon) and right half (lockup) as buffers
const iconBuf = await sharp(src)
  .extract({ left: 0, top: 0, width: half, height: h })
  .toBuffer()

const lockupBuf = await sharp(src)
  .extract({ left: half, top: 0, width: w - half, height: h })
  .toBuffer()

// ── logo.png — horizontal lockup, 48px tall, transparent bg
const lockupSharp = await removeWhiteBackground(lockupBuf)
await lockupSharp
  .resize(null, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile('./public/logo.png')
console.log('OK public/logo.png')

// ── logo-icon.png — icon only, 64x64, transparent bg
const iconSharp = await removeWhiteBackground(iconBuf)
await iconSharp
  .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile('./public/logo-icon.png')
console.log('OK public/logo-icon.png')

// ── favicon-32x32.png — icon on blue bg
const iconPng32 = await (await removeWhiteBackground(iconBuf))
  .resize(26, 26, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer()

await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 37, g: 99, b: 235, alpha: 255 } } })
  .composite([{ input: iconPng32, gravity: 'center' }])
  .png()
  .toFile('./public/favicon-32x32.png')
console.log('OK public/favicon-32x32.png')

// ── favicon-16x16.png — icon on blue bg
const iconPng16 = await (await removeWhiteBackground(iconBuf))
  .resize(12, 12, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer()

await sharp({ create: { width: 16, height: 16, channels: 4, background: { r: 37, g: 99, b: 235, alpha: 255 } } })
  .composite([{ input: iconPng16, gravity: 'center' }])
  .png()
  .toFile('./public/favicon-16x16.png')
console.log('OK public/favicon-16x16.png')

console.log('\nAll logo files regenerated with transparent backgrounds.')
