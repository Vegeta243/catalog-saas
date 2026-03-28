const fs = require('fs'), path = require('path')

function walk(d, r = []) {
  try {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory() && !p.includes('node_modules') && !p.includes('.next')) walk(p, r)
      else if (p.endsWith('.tsx') || p.endsWith('.ts')) r.push(p)
    }
  } catch {}
  return r
}

let fixed = 0
walk('app').forEach(f => {
  let c = fs.readFileSync(f, 'utf8'), o = c
  c = c
    // Action limits text
    .replace(/\b30\s*actions?\s*\/?\s*mois\b/gi, '100 actions/mois')
    .replace(/\b50\s*actions?\s*\/?\s*mois\b/gi, '100 actions/mois')
    .replace(/\b500\s*actions?\s*\/?\s*mois\b/gi, '1 500 actions/mois')
    .replace(/\b5\s*000\s*actions?\s*\/?\s*mois\b/gi, '10 000 actions/mois')
    .replace(/\b5000\s*actions?\s*\/?\s*mois\b/gi, '10 000 actions/mois')
    .replace(/\b50\s*000\s*actions?\b/gi, 'Actions illimitées')
    .replace(/actions_limit:\s*500\b/g, 'actions_limit: 1500')
    .replace(/actions_limit:\s*5000\b/g, 'actions_limit: 10000')
    .replace(/actions_limit:\s*50000\b/g, 'actions_limit: 999999')
    .replace(/actions_limit:\s*30\b/g, 'actions_limit: 100')
    // Prices
    .replace(/\b19€\s*\/\s*mois/g, '29€/mois')
    .replace(/\b19€\/mois/g, '29€/mois')
    .replace(/\b49€\s*\/\s*mois/g, '79€/mois')
    .replace(/\b49€\/mois/g, '79€/mois')
    .replace(/\b149€\s*\/\s*mois/g, '199€/mois')
    .replace(/\b149€\/mois/g, '199€/mois')
    // Free action mentions (30 → 100)
    .replace(/\b20\s*actions?\s*gratuites?\b/gi, '100 actions gratuites')
    .replace(/\b30\s*actions?\s*gratuites?\b/gi, '100 actions gratuites')
    .replace(/avec\s+30\s+actions,/gi, 'avec 100 actions,')
  if (c !== o) { fs.writeFileSync(f, c); fixed++; console.log('Updated:', path.relative('.', f)) }
})
console.log('Total pricing files updated:', fixed)
