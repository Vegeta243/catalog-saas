const fs = require('fs'), path = require('path')
// Fix import page dark-theme colors
const f = path.join(__dirname,'..','app','(dashboard)','dashboard','import','page.tsx')
let c = fs.readFileSync(f,'utf8'), o = c

c = c
  // Fix card background
  .replace(/background:\s*'rgba\(255,255,255,0\.04\)'/g, "background: '#ffffff'")
  .replace(/background:\s*'rgba\(255,255,255,0\.06\)'/g, "background: '#f8fafc'")
  .replace(/background:\s*'rgba\(255,255,255,0\.03\)'/g, "background: '#ffffff'")
  .replace(/background:\s*'rgba\(255,255,255,0\.05\)'/g, "background: '#f8fafc'")
  .replace(/background:\s*'rgba\(255,255,255,0\.02\)'/g, "background: '#fafafa'")
  // Fix border colors
  .replace(/border:\s*'1px solid rgba\(255,255,255,0\.\d+\)'/g, "border: '1px solid #e2e8f0'")
  .replace(/borderBottom:\s*'1px solid rgba\(255,255,255,0\.\d+\)'/g, "borderBottom: '1px solid #e2e8f0'")
  .replace(/borderColor:\s*'rgba\(255,255,255,0\.\d+\)'/g, "borderColor: '#e2e8f0'")
  // Fix text colors (already done by block0 but just to be safe)
  .replace(/color:\s*'#e8ecf4'/g, "color: '#0f172a'")
  .replace(/color:\s*'#8a95b0'/g, "color: '#64748b'")
  .replace(/color:\s*'#555f7a'/g, "color: '#64748b'")
  // Fix textarea background
  .replace(/background:\s*'rgba\(255,255,255,0\.05\)'([,\s]*)([\s\S]*?)(?=resize:)/g, (m,p1,p2) => `background: '#f8fafc'${p1}${p2}`)
  // Fix detected URL row background
  .replace(/background:\s*'rgba\(255,255,255,0\.02\)'/g, "background: '#fafafa'")
  // Fix tab button dark bg
  .replace(/background:\s*'rgba\(79,142,247,0\.12\)'/g, "background: '#eff6ff'")
  // Platform badge light backgrounds
  .replace(/background:\s*'rgba\(255,255,255,0\.06\)'([\s\S]*?)fontSize:\s*11/gm, (m) => m.replace(/background:\s*'rgba\(255,255,255,0\.06\)'/, "background: '#f1f5f9'"))

fs.writeFileSync(f,c)
console.log('Import page fixed, changed:', c !== o)
