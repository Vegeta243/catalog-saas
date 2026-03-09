import sharp from 'sharp'

const src = './generated-image__1_.png'
const meta = await sharp(src).metadata()
const w = meta.width
const h = meta.height
const half = Math.floor(w / 2)

console.log(`Source: ${w}x${h}, half=${half}`)

// Left half = icon only
await sharp(src)
  .extract({ left: 0, top: 0, width: half, height: h })
  .resize(128, 128, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .png()
  .toFile('./public/logo-icon.png')
console.log('OK public/logo-icon.png')

// Right half = horizontal lockup
await sharp(src)
  .extract({ left: half, top: 0, width: w - half, height: h })
  .resize(null, 48, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .png()
  .toFile('./public/logo.png')
console.log('OK public/logo.png')

// Favicon 32x32
await sharp(src)
  .extract({ left: 0, top: 0, width: half, height: h })
  .resize(32, 32, { fit: 'contain', background: { r: 37, g: 99, b: 235, alpha: 1 } })
  .png()
  .toFile('./public/favicon-32x32.png')
console.log('OK public/favicon-32x32.png')

// Favicon 16x16
await sharp(src)
  .extract({ left: 0, top: 0, width: half, height: h })
  .resize(16, 16, { fit: 'contain', background: { r: 37, g: 99, b: 235, alpha: 1 } })
  .png()
  .toFile('./public/favicon-16x16.png')
console.log('OK public/favicon-16x16.png')

console.log('All logo files generated.')
