import sharp from 'sharp'

const src = './generated-image__1_.png'
const meta = await sharp(src).metadata()
const w = meta.width
const h = meta.height
const half = Math.floor(w / 2)

console.log(`Source: ${w}x${h}, half=${half}`)

async function removeWhiteBackground(inputBuf, threshold = 15) {
  const { data, info } = await sharp(inputBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const pixels = Buffer.from(data)
  for (let i = 0; i < info.width * info.height; i++) {
    const r = pixels[i*4], g = pixels[i*4+1], b = pixels[i*4+2]
    if (r >= 255-threshold && g >= 255-threshold && b >= 255-threshold) pixels[i*4+3] = 0
  }
  return sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } })
}

async function makeWhiteVersion(inputBuf, threshold = 200) {
  const { data, info } = await sharp(inputBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const pixels = Buffer.from(data)
  for (let i = 0; i < info.width * info.height; i++) {
    const r = pixels[i*4], g = pixels[i*4+1], b = pixels[i*4+2]
    const brightness = (r + g + b) / 3
    if (brightness >= threshold) {
      pixels[i*4+3] = 0
    } else {
      pixels[i*4] = 255; pixels[i*4+1] = 255; pixels[i*4+2] = 255
      pixels[i*4+3] = Math.min(255, Math.round((1 - brightness / threshold) * 255))
    }
  }
  return sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } })
}

const iconBuf = await sharp(src).extract({ left: 0, top: 0, width: half, height: h }).toBuffer()
const lockupBuf = await sharp(src).extract({ left: half, top: 0, width: w - half, height: h }).toBuffer()

await (await removeWhiteBackground(lockupBuf)).resize(null, 48, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).png().toFile('./public/logo.png')
console.log('OK logo.png')

await (await makeWhiteVersion(lockupBuf)).resize(null, 48, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).png().toFile('./public/logo-white.png')
console.log('OK logo-white.png')

await (await removeWhiteBackground(iconBuf)).resize(64, 64, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).png().toFile('./public/logo-icon.png')
console.log('OK logo-icon.png')

await (await makeWhiteVersion(iconBuf)).resize(64, 64, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).png().toFile('./public/logo-icon-white.png')
console.log('OK logo-icon-white.png')

const icon32 = await (await makeWhiteVersion(iconBuf)).resize(26,26,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()
await sharp({create:{width:32,height:32,channels:4,background:{r:37,g:99,b:235,alpha:255}}}).composite([{input:icon32,gravity:'center'}]).png().toFile('./public/favicon-32x32.png')
console.log('OK favicon-32x32.png')

const icon16 = await (await makeWhiteVersion(iconBuf)).resize(12,12,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()
await sharp({create:{width:16,height:16,channels:4,background:{r:37,g:99,b:235,alpha:255}}}).composite([{input:icon16,gravity:'center'}]).png().toFile('./public/favicon-16x16.png')
console.log('OK favicon-16x16.png')

console.log('Done.')
