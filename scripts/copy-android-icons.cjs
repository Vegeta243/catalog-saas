const fs = require('fs')
const path = require('path')
const mobileBase = 'C:\\Users\\Admin\\Documents\\ecompilot-mobile'
const catalogBase = 'C:\\Users\\Admin\\Documents\\catalog-saas'

const iconSizes = {
  'android/app/src/main/res/mipmap-mdpi': 48,
  'android/app/src/main/res/mipmap-hdpi': 72,
  'android/app/src/main/res/mipmap-xhdpi': 96,
  'android/app/src/main/res/mipmap-xxhdpi': 144,
  'android/app/src/main/res/mipmap-xxxhdpi': 192,
}

for (const [dir, size] of Object.entries(iconSizes)) {
  const fullDir = path.join(mobileBase, dir)
  fs.mkdirSync(fullDir, { recursive: true })
  const src = path.join(catalogBase, 'public', 'icons', 'icon-' + size + 'x' + size + '.png')
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(fullDir, 'ic_launcher.png'))
    fs.copyFileSync(src, path.join(fullDir, 'ic_launcher_round.png'))
    console.log('OK Copied', size + 'x' + size, 'to', dir)
  } else {
    console.log('MISS Source not found:', src)
  }
}

// Splash screen
const drawDir = path.join(mobileBase, 'android/app/src/main/res/drawable')
fs.mkdirSync(drawDir, { recursive: true })
const splash = [
  "<?xml version='1.0' encoding='utf-8'?>",
  "<layer-list xmlns:android='http://schemas.android.com/apk/res/android'>",
  "  <item android:drawable='@color/splash_background'/>",
  "  <item>",
  "    <bitmap",
  "      android:gravity='center'",
  "      android:src='@mipmap/ic_launcher'/>",
  "  </item>",
  "</layer-list>"
].join('\n')
fs.writeFileSync(path.join(drawDir, 'splash.xml'), splash)
console.log('OK Splash screen created')

// Add splash_background color
const colorsPath = path.join(mobileBase, 'android/app/src/main/res/values/colors.xml')
let colors = fs.readFileSync(colorsPath, 'utf8')
if (!colors.includes('splash_background')) {
  colors = colors.replace('</resources>', '    <color name="splash_background">#0f172a</color>\n</resources>')
  fs.writeFileSync(colorsPath, colors)
  console.log('OK Added splash_background to colors.xml')
} else {
  console.log('OK splash_background already in colors.xml')
}
