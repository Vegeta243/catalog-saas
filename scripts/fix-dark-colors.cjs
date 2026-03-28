const fs = require('fs')
const path = require('path')

function walk(d) {
  const r = []
  try {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      const isDir = e.isDirectory()
      const notIgnored = !p.includes('node_modules') && !p.includes('.next')
      if (isDir && notIgnored) r.push(...walk(p))
      else if (p.endsWith('.tsx')) r.push(p)
    }
  } catch {}
  return r
}

const dashFiles = walk(path.join(process.cwd(), 'app/(dashboard)'))
let totalFixed = 0

dashFiles.forEach(f => {
  let c = fs.readFileSync(f, 'utf8')
  const orig = c

  // ── Text colors → CSS vars ──────────────────────────────────────────────
  c = c
    .replace(/color:\s*["']#0f172a["']/g, 'color: "var(--text-primary)"')
    .replace(/color:\s*["']#111827["']/g, 'color: "var(--text-primary)"')
    .replace(/color:\s*["']#1d1d1f["']/g, 'color: "var(--text-primary)"')
    .replace(/color:\s*["']#374151["']/g, 'color: "var(--text-secondary)"')
    .replace(/color:\s*["']#475569["']/g, 'color: "var(--text-secondary)"')
    .replace(/color:\s*["']#424245["']/g, 'color: "var(--text-secondary)"')
    .replace(/color:\s*["']#64748b["']/g, 'color: "var(--text-tertiary)"')
    .replace(/color:\s*["']#6b7280["']/g, 'color: "var(--text-tertiary)"')
    .replace(/color:\s*["']#94a3b8["']/g, 'color: "var(--text-tertiary)"')

  // ── Hardcoded white/light card backgrounds → dark ───────────────────────
  // These are in inline style objects
  c = c
    .replace(/background:\s*["']#ffffff["']/g,       'background: "var(--surface-primary)"')
    .replace(/background:\s*["']white["']/g,          'background: "var(--surface-primary)"')
    .replace(/backgroundColor:\s*["']#ffffff["']/g,  'backgroundColor: "var(--surface-primary)"')
    .replace(/background:\s*["']#f8faff["']/g,       'background: "rgba(37,99,235,0.06)"')
    .replace(/background:\s*["']#f9fafb["']/g,       'background: "var(--surface-secondary)"')
    .replace(/background:\s*["']#f3f4f6["']/g,       'background: "var(--surface-secondary)"')
    .replace(/background:\s*["']#eff6ff["']/g,       'background: "rgba(37,99,235,0.10)"')
    .replace(/background:\s*["']#f0fdf4["']/g,       'background: "rgba(16,185,129,0.08)"')
    .replace(/background:\s*["']#dbeafe["']/g,       'background: "rgba(37,99,235,0.15)"')
    .replace(/background:\s*["']#d1fae5["']/g,       'background: "rgba(16,185,129,0.15)"')
    .replace(/background:\s*["']#dcfce7["']/g,       'background: "rgba(16,185,129,0.15)"')
    .replace(/background:\s*["']#fef2f2["']/g,       'background: "rgba(239,68,68,0.10)"')
    .replace(/background:\s*["']#fee2e2["']/g,       'background: "rgba(239,68,68,0.15)"')
    .replace(/background:\s*["']#ecfdf5["']/g,       'background: "rgba(16,185,129,0.08)"')
    .replace(/background:\s*["']#f0fdf9["']/g,       'background: "rgba(5,150,105,0.06)"')
    .replace(/background:\s*["']#fdf8ff["']/g,       'background: "rgba(124,58,237,0.06)"')
    .replace(/background:\s*["']#f5f3ff["']/g,       'background: "rgba(124,58,237,0.06)"')
    .replace(/background:\s*["']#f1f5f9["']/g,       'background: "var(--surface-secondary)"')
    .replace(/backgroundColor:\s*["']#ecfdf5["']/g,  'backgroundColor: "rgba(16,185,129,0.08)"')

  // ── Light borders → dark ──────────────────────────────────────────────
  c = c
    .replace(/border:\s*["']1px solid #e5e7eb["']/g,  'border: "1px solid var(--apple-gray-200)"')
    .replace(/border:\s*["']1px solid #d1d5db["']/g,  'border: "1px solid var(--apple-gray-200)"')
    .replace(/border:\s*["']1px solid #e2e8f0["']/g,  'border: "1px solid var(--apple-gray-200)"')
    .replace(/border:\s*["']1px solid #bbf7d0["']/g,  'border: "1px solid rgba(16,185,129,0.30)"')
    .replace(/border:\s*["']1px solid #bfdbfe["']/g,  'border: "1px solid rgba(37,99,235,0.30)"')
    .replace(/border:\s*["']1px solid #fecaca["']/g,  'border: "1px solid rgba(239,68,68,0.30)"')
    .replace(/border:\s*["']1px solid #blue-100["']/g,'border: "1px solid rgba(37,99,235,0.20)"')

  // ── Badge text colors that are light-mode only ──────────────────────────
  c = c
    .replace(/color:\s*["']#1d4ed8["']/g, 'color: "#93c5fd"')
    .replace(/color:\s*["']#1e40af["']/g, 'color: "#93c5fd"')
    .replace(/color:\s*["']#065f46["']/g, 'color: "#6ee7b7"')
    .replace(/color:\s*["']#166534["']/g, 'color: "#6ee7b7"')
    .replace(/color:\s*["']#991b1b["']/g, 'color: "#f87171"')

  if (c !== orig) {
    fs.writeFileSync(f, c, 'utf8')
    totalFixed++
    console.log('Fixed:', path.relative(process.cwd(), f))
  }
})

console.log('Total files dark-fixed:', totalFixed)
