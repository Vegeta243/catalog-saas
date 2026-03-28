const fs = require('fs'), path = require('path')

function walk(d, r = []) {
  try {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory() && !p.includes('node_modules') && !p.includes('.next') && !p.includes('.git')) walk(p, r)
      else if (p.endsWith('.tsx') || p.endsWith('.ts')) r.push(p)
    }
  } catch {}
  return r
}

const REPLACE = [
  [/color:\s*['"]#e8ecf4['"]([,\s}])/g, "color: '#0f172a'$1"],
  [/color:\s*['"]#c8d4e8['"]([,\s}])/g, "color: '#1e293b'$1"],
  [/color:\s*['"]#f0f4ff['"]([,\s}])/g, "color: '#0f172a'$1"],
  [/color:\s*['"]#6b7a99['"]([,\s}])/g, "color: '#64748b'$1"],
  [/color:\s*['"]#8b9fc4['"]([,\s}])/g, "color: '#475569'$1"],
  [/color:\s*['"]#4a5878['"]([,\s}])/g, "color: '#94a3b8'$1"],
  [/color:\s*['"]#3d4d6b['"]([,\s}])/g, "color: '#64748b'$1"],
  [/background:\s*['"]rgba\(255,255,255,0\.0[2-6]\)['"]([,\s}])/g, "background: '#ffffff'$1"],
  [/background:\s*['"]rgba\(255,255,255,0\.0[7-9]\)['"]([,\s}])/g, "background: '#f8fafc'$1"],
  [/background:\s*['"]#0a0f1e['"]([,\s}])/g, "background: '#ffffff'$1"],
  [/background:\s*['"]#080d1a['"]([,\s}])/g, "background: '#f8fafc'$1"],
  [/background:\s*['"]#0f1629['"]([,\s}])/g, "background: '#f8fafc'$1"],
  [/background:\s*['"]#111827['"]([,\s}])/g, "background: '#f8fafc'$1"],
  [/border:\s*['"]1px solid rgba\(255,255,255,0\.[0-1]\d\)['"]([,\s}])/g, "border: '1px solid #e2e8f0'$1"],
  [/borderColor:\s*['"]rgba\(255,255,255,0\.[0-1]\d\)['"]([,\s}])/g, "borderColor: '#e2e8f0'$1"],
]

let totalFixed = 0
walk('app').forEach(f => {
  let c = fs.readFileSync(f, 'utf8'), o = c
  REPLACE.forEach(([pat, rep]) => { c = c.replace(pat, rep) })
  if (c !== o) {
    fs.writeFileSync(f, c)
    totalFixed++
    console.log('Fixed:', path.relative('.', f))
  }
})
console.log('Total files fixed:', totalFixed)
