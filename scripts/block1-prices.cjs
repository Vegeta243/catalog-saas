const fs = require('fs'), path = require('path')
function walk(d, r=[]) {
  for (const e of fs.readdirSync(d,{withFileTypes:true})) {
    const p = path.join(d,e.name)
    if (e.isDirectory() && !p.includes('node_modules') && !p.includes('.next')) walk(p,r)
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) r.push(p)
  }
  return r
}
let fixed = 0
walk(path.join(__dirname,'..','app')).forEach(f => {
  let c = fs.readFileSync(f,'utf8'), o = c
  c = c
    // Action limits
    .replace(/\b30\s+actions?\s*[\/\-]\s*mois/gi, '100 actions/mois')
    .replace(/\b50\s+actions?\s*[\/\-]\s*mois/gi, '100 actions/mois')
    .replace(/\b500\s+actions?\s*[\/\-]\s*mois/gi, '1\u00a0500 actions/mois')
    .replace(/\b5\s*000\s+actions?\s*[\/\-]\s*mois/gi, '10\u00a0000 actions/mois')
    .replace(/\b5000\s+actions?\s*[\/\-]\s*mois/gi, '10\u00a0000 actions/mois')
    // Prices text
    .replace(/19€\s*\/\s*mois/g, '29€/mois')
    .replace(/19€\/mois/g, '29€/mois')
    .replace(/49€\s*\/\s*mois/g, '79€/mois')
    .replace(/49€\/mois/g, '79€/mois')
    .replace(/149€\s*\/\s*mois/g, '199€/mois')
    .replace(/149€\/mois/g, '199€/mois')
    // Free actions mentions
    .replace(/30 actions gratuites/gi, '100 actions gratuites')
    .replace(/20 actions gratuites/gi, '100 actions gratuites')
    .replace(/actions_limit:\s*30/g, 'actions_limit: 100')
    .replace(/actions_limit:\s*50/g, 'actions_limit: 100')
    // String price numbers
    .replace(/monthlyPrice:\s*19\b/g, 'monthlyPrice: 29')
    .replace(/monthlyPrice:\s*49\b/g, 'monthlyPrice: 79')
    .replace(/monthlyPrice:\s*149\b/g, 'monthlyPrice: 199')
    .replace(/yearlyPrice:\s*13\b/g, 'yearlyPrice: 20')
    .replace(/yearlyPrice:\s*34\b/g, 'yearlyPrice: 55')
    .replace(/yearlyPrice:\s*104\b/g, 'yearlyPrice: 139')
    // Plan features
    .replace(/"30 actions IA"/g, '"100 actions IA"')
    .replace(/"500 actions IA"/g, '"1\u00a0500 actions IA"')
    .replace(/"5000 actions IA"/g, '"10\u00a0000 actions IA"')
    .replace(/"Tout illimité"/g, '"Actions illimitées, Boutiques illimitées"')
    // Upsell mentions of 20000
    .replace(/20 000 actions/g, '10\u00a0000 actions')
    // trust strip
    .replace(/✓ 30 actions gratuites/g, '✓ 100 actions gratuites')
    .replace(/sans carte bancaire\.\s/g, 'sans carte bancaire. ')
  if (c !== o) { fs.writeFileSync(f,c); fixed++; console.log('Fixed prices:', path.relative(path.join(__dirname,'..'),f)) }
})
console.log('Total files updated:', fixed)
