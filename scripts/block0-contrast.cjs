const fs = require('fs'), path = require('path')
function walk(d, r=[]) {
  for (const e of fs.readdirSync(d,{withFileTypes:true})) {
    const p = path.join(d,e.name)
    if (e.isDirectory() && !p.includes('node_modules') && !p.includes('.next')) walk(p,r)
    else if (p.endsWith('.tsx')) r.push(p)
  }
  return r
}
let fixed = 0
walk(path.join(__dirname,'..','app')).forEach(f => {
  let c = fs.readFileSync(f,'utf8'), o = c
  c = c
    .replace(/color:\s*'#e8ecf4'/g, "color: '#0f172a'")
    .replace(/color:\s*'#c8d4e8'/g, "color: '#1e293b'")
    .replace(/color:\s*'#8b9fc4'/g, "color: '#475569'")
    .replace(/color:\s*'#6b7a99'/g, "color: '#64748b'")
    .replace(/color:\s*'#4a5878'/g, "color: '#94a3b8'")
    .replace(/color:\s*'#f0f4ff'/g, "color: '#0f172a'")
    .replace(/color:\s*'#93c5fd'/g, "color: '#1d4ed8'")
    .replace(/color:\s*'#4ade80'/g, "color: '#15803d'")
    .replace(/color:\s*'#f87171'/g, "color: '#dc2626'")
    .replace(/color:\s*'#8a95b0'/g, "color: '#475569'")
  if (c !== o) { fs.writeFileSync(f,c); fixed++; console.log('Fixed:', path.relative(path.join(__dirname,'..'),f)) }
})
console.log('Total fixed:', fixed)
