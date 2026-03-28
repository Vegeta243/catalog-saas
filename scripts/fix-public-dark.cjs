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
      else if (p.endsWith('.tsx') || p.endsWith('.ts')) r.push(p)
    }
  } catch {}
  return r
}

// Target ONLY non-dashboard app pages (pricing, landing, etc.)
const targets = [
  'app/pricing/page.tsx',
  'app/page.tsx',
  'app/login/page.tsx',
  'app/signup/page.tsx',
  'app/download/page.tsx',
]

let totalFixed = 0

targets.forEach(rel => {
  const f = path.join(process.cwd(), rel)
  if (!fs.existsSync(f)) return

  let c = fs.readFileSync(f, 'utf8')
  const orig = c

  c = c
    // Text colors → CSS vars
    .replace(/color:\s*["']#0f172a["']/g, 'color: "var(--text-primary)"')
    .replace(/color:\s*["']#111827["']/g, 'color: "var(--text-primary)"')
    .replace(/color:\s*["']#374151["']/g, 'color: "var(--text-secondary)"')
    .replace(/color:\s*["']#475569["']/g, 'color: "var(--text-secondary)"')
    .replace(/color:\s*["']#64748b["']/g, 'color: "var(--text-tertiary)"')
    .replace(/color:\s*["']#6b7280["']/g, 'color: "var(--text-tertiary)"')
    .replace(/color:\s*["']#94a3b8["']/g, 'color: "var(--text-tertiary)"')
    .replace(/color:\s*["']#1d4ed8["']/g, 'color: "#93c5fd"')
    .replace(/color:\s*["']#1e40af["']/g, 'color: "#93c5fd"')
    .replace(/color:\s*["']#065f46["']/g, 'color: "#6ee7b7"')

  // Page-level light backgrounds
  c = c
    .replace(/backgroundColor:\s*["']#f8fafc["']/g, 'backgroundColor: "var(--background)"')
    .replace(/backgroundColor:\s*["']#f1f5f9["']/g, 'backgroundColor: "var(--background)"')
    .replace(/backgroundColor:\s*["']#ffffff["']/g, 'backgroundColor: "var(--surface-primary)"')
    .replace(/background:\s*["']#f8fafc["']/g, 'background: "var(--background)"')
    .replace(/background:\s*["']#f1f5f9["']/g, 'background: "var(--background)"')

  // PLANS array card backgrounds (pricing page)
  c = c
    .replace(/cardBg:\s*["']#ffffff["']/g, 'cardBg: "var(--surface-primary)"')
    .replace(/cardBg:\s*["']white["']/g, 'cardBg: "var(--surface-primary)"')
    .replace(/cardBg:\s*["']#f8faff["']/g, 'cardBg: "rgba(37,99,235,0.06)"')
    .replace(/cardBg:\s*["']linear-gradient\(150deg,#fdf8ff 0%,#f5f3ff 100%\)["']/g,
             'cardBg: "rgba(124,58,237,0.08)"')
    .replace(/cardBg:\s*["']#f0fdf9["']/g, 'cardBg: "rgba(5,150,105,0.06)"')

  // PLANS array icon backgrounds
  c = c
    .replace(/iconBg:\s*["']#f3f4f6["']/g, 'iconBg: "rgba(255,255,255,0.07)"')
    .replace(/iconBg:\s*["']#eff6ff["']/g, 'iconBg: "rgba(37,99,235,0.12)"')
    .replace(/iconBg:\s*["']#ede9fe["']/g, 'iconBg: "rgba(124,58,237,0.12)"')
    .replace(/iconBg:\s*["']#d1fae5["']/g, 'iconBg: "rgba(5,150,105,0.12)"')
    .replace(/iconColor:\s*["']#6b7280["']/g, 'iconColor: "#9ca3af"')
    .replace(/iconColor:\s*["']#374151["']/g, 'iconColor: "#d1d5db"')

  // PLANS array badge colors
  c = c
    .replace(/badgeBg:\s*["']#f9fafb["']/g, 'badgeBg: "rgba(255,255,255,0.06)"')
    .replace(/badgeBg:\s*["']#eff6ff["']/g, 'badgeBg: "rgba(37,99,235,0.12)"')
    .replace(/badgeBg:\s*["']#d1fae5["']/g, 'badgeBg: "rgba(5,150,105,0.12)"')
    .replace(/badgeColor:\s*["']#1d4ed8["']/g, 'badgeColor: "#93c5fd"')
    .replace(/badgeColor:\s*["']#065f46["']/g, 'badgeColor: "#6ee7b7"')

  // Free plan button
  c = c
    .replace(/btnCls:\s*["']bg-gray-100 hover:bg-gray-200["']/g, 'btnCls: ""')
    .replace(/btnStyle:\s*\{\s*color:\s*["']#374151["']\s*\}/g, 'btnStyle: { background: "rgba(255,255,255,0.08)", color: "#d1d5db" }')
    .replace(/btnStyle:\s*\{\s*color:\s*"var\(--text-secondary\)"\s*\}/g, 'btnStyle: { background: "rgba(255,255,255,0.08)", color: "#d1d5db" }')

  // Nav bar in pricing: remove light backgrounds
  c = c
    .replace(/className="border-b border-gray-200 bg-white"/g,
             'className="border-b" style={{ background: "var(--surface-primary)", borderColor: "var(--border)" }}"')
    .replace(/className=\{['"]border-b border-gray-200 bg-white['"]\}/g,
             'style={{ background: "var(--surface-primary)", borderBottom: "1px solid var(--border)" }}')

  if (c !== orig) {
    fs.writeFileSync(f, c, 'utf8')
    totalFixed++
    console.log('Fixed:', rel)
  }
})

console.log('Total public pages fixed:', totalFixed)
