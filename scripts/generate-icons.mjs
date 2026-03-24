import sharp from 'sharp'
import { existsSync, mkdirSync } from 'fs'

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

if (!existsSync('public/icons')) {
  mkdirSync('public/icons', { recursive: true })
}

// Simple icon: dark navy background with gradient "E" letter
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512"
  xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#1e293b"/>
  <rect width="512" height="512" rx="96" fill="url(#grad)"/>
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6"/>
      <stop offset="100%" style="stop-color:#06b6d4"/>
    </linearGradient>
  </defs>
  <text x="256" y="340" font-family="Arial Black,sans-serif"
    font-size="280" font-weight="900" fill="white"
    text-anchor="middle">E</text>
</svg>
`

const svgBuffer = Buffer.from(svgIcon)

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}x${size}.png`)
  console.log(`✅ Generated ${size}x${size}`)
}

// Favicons
await sharp(svgBuffer).resize(32, 32).png().toFile('public/favicon-32x32.png')
await sharp(svgBuffer).resize(16, 16).png().toFile('public/favicon-16x16.png')
await sharp(svgBuffer).resize(180, 180).png().toFile('public/apple-touch-icon.png')

// Placeholder screenshots
if (!existsSync('public/screenshots')) {
  mkdirSync('public/screenshots', { recursive: true })
}

const desktopSvg = `
<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
  <rect width="1280" height="720" fill="#0f172a"/>
  <text x="640" y="360" font-family="Arial,sans-serif"
    font-size="48" fill="#3b82f6" text-anchor="middle">
    EcomPilot Elite — Dashboard
  </text>
</svg>`
await sharp(Buffer.from(desktopSvg)).png().toFile('public/screenshots/desktop.png')

const mobileSvg = `
<svg width="390" height="844" xmlns="http://www.w3.org/2000/svg">
  <rect width="390" height="844" fill="#0f172a"/>
  <text x="195" y="422" font-family="Arial,sans-serif"
    font-size="28" fill="#3b82f6" text-anchor="middle">
    EcomPilot Elite
  </text>
</svg>`
await sharp(Buffer.from(mobileSvg)).png().toFile('public/screenshots/mobile.png')

console.log('All icons generated ✅')
