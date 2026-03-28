const fs = require('fs')
const path = require('path')

// Each case sets resultMsg + resultCount then breaks — stats updated once at end
const ROUTE = `import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getFiltered(sb: any, userId: string, filter: string, fp: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = sb.from('shopify_products').select('*').eq('user_id', userId)
  switch (filter) {
    case 'price_under': if (fp?.price_under_val) q = q.lte('price', fp.price_under_val); break
    case 'price_over': if (fp?.price_over_val) q = q.gte('price', fp.price_over_val); break
    case 'title_contains': if (fp?.title_word) q = q.ilike('title', \`%\${fp.title_word}%\`); break
    case 'vendor_is': if (fp?.vendor_name) q = q.ilike('vendor', \`%\${fp.vendor_name}%\`); break
    case 'status_draft': q = q.eq('status', 'draft'); break
    case 'status_active': q = q.eq('status', 'active'); break
    case 'status_archived': q = q.eq('status', 'archived'); break
    case 'added_recently': {
      const days = (fp?.days_recent as number) || 7
      q = q.gte('created_at', new Date(Date.now() - days * 86400000).toISOString()); break
    }
    default: break
  }
  const { data, error } = await q.limit(200)
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: any[] = data || []
  if (filter === 'no_image') rows = rows.filter((p: { images: unknown }) => {
    const imgs = Array.isArray(p.images) ? p.images : (typeof p.images === 'string' ? JSON.parse(p.images || '[]') : [])
    return imgs.length === 0
  })
  if (filter === 'no_description') rows = rows.filter((p: { body_html?: string }) => !p.body_html?.trim())
  if (filter === 'no_tag') rows = rows.filter((p: { tags?: string }) => !p.tags?.trim())
  if (filter === 'title_short') rows = rows.filter((p: { title?: string }) => (p.title || '').length < 20)
  if (filter === 'title_long') rows = rows.filter((p: { title?: string }) => (p.title || '').length > 100)
  if (filter === 'desc_short') {
    const min = (fp?.desc_min_chars as number) || 100
    rows = rows.filter((p: { body_html?: string }) => (p.body_html || '').length < min)
  }
  return rows
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const body = await request.json() as { id: string }
    if (!body.id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: auto, error: autoErr } = await (supabase.from('automations') as any)
      .select('*').eq('id', body.id).eq('user_id', user.id).single()
    if (autoErr || !auto) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    if (!auto.is_active) return NextResponse.json({ error: 'Automatisation en pause' }, { status: 400 })

    const cfg = (auto.config || {}) as Record<string, unknown>
    const filter = (cfg.filter as string) || 'all'
    const fp = (cfg.filter_params as Record<string, unknown>) || {}

    const all = await getFiltered(supabase, user.id, filter, fp)
    const max = (cfg.max_per_run as number) || (cfg.max_products as number) || 50
    const batch = all.slice(0, max)

    if (!batch.length) {
      return NextResponse.json({ success: true, message: 'Aucun produit ne correspond au filtre sélectionné.', details: { count: 0 } })
    }

    let n = 0    // updated count
    let msg = '' // result message

    // helper to update tags
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setTags = async (p: any, tags: string[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('shopify_products') as any).update({ tags: tags.join(', ') }).eq('id', p.id)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update = async (p: any, data: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('shopify_products') as any).update(data).eq('id', p.id)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parseTags = (p: any): string[] => ((p.tags as string) || '').split(',').map((t: string) => t.trim()).filter(Boolean)

    switch (auto.type) {

      case 'seo_title':
        for (const p of batch) {
          let title: string = (p.title as string) || ''
          if (cfg.remove_sku) title = title.replace(/\\b([A-Z0-9]{2,}-[A-Z0-9]{2,}|ref[-_\\s]?\\w+|sku[-_\\s]?\\w+|lot\\d+|#\\w+)\\b/gi, ' ').trim()
          if (cfg.remove_parentheses) title = title.replace(/\\([^)]*\\)/g, ' ').trim()
          if (cfg.capitalize) title = title.toLowerCase().replace(/\\b\\w/g, (c: string) => c.toUpperCase())
          title = title.replace(/\\s+/g, ' ').trim()
          const maxLen = cfg.max_length as number
          if (maxLen && maxLen > 0 && title.length > maxLen) title = title.slice(0, maxLen).trim()
          const sfx = cfg.add_suffix as string
          if (sfx && !title.includes(sfx)) title = title + ' ' + sfx
          if (title !== p.title) { await update(p, { title }); n++ }
        }
        msg = n + ' titre(s) SEO optimisé(s) sur ' + batch.length + ' produits ciblés'
        break

      case 'price_rules':
        for (const p of batch) {
          const raw = parseFloat(p.price)
          if (!raw || raw <= 0) continue
          let price = raw
          const floor = parseFloat((cfg.price_floor as string) || '0')
          const ceil = parseFloat((cfg.price_ceiling as string) || '0')
          const val = parseFloat((cfg.value as string) || '10')
          switch (cfg.action_type) {
            case 'percent_increase': price = price * (1 + val / 100); break
            case 'percent_decrease': price = price * (1 - val / 100); break
            case 'multiply': price = price * val; break
            case 'set_fixed': price = val; break
            case 'round_99': price = Math.floor(price) - 0.01; break
            case 'round_95': price = Math.floor(price) - 0.05; break
          }
          if (floor > 0 && price < floor) price = floor
          if (ceil > 0 && price > ceil) price = ceil
          price = Math.round(price * 100) / 100
          if (price > 0) { await update(p, { price }); n++ }
        }
        msg = n + ' prix ajusté(s) sur ' + batch.length + ' produits ciblés'
        break

      case 'bulk_tags':
        for (const p of batch) {
          let tags = parseTags(p)
          switch (cfg.tag_action) {
            case 'add': {
              const toAdd = ((cfg.tags_to_add as string) || '').split(',').map((t: string) => t.trim()).filter(Boolean)
              tags = [...new Set([...tags, ...toAdd])]; break
            }
            case 'remove': {
              const toRm = ((cfg.tags_to_remove as string) || '').split(',').map((t: string) => t.trim()).filter(Boolean)
              tags = tags.filter(t => !toRm.includes(t)); break
            }
            case 'replace': {
              const from = ((cfg.tag_replace_from as string) || '').trim()
              const to = ((cfg.tag_replace_to as string) || '').trim()
              if (from) tags = tags.map(t => t === from ? to : t).filter(Boolean); break
            }
            case 'normalize': tags = tags.map(t => t.toLowerCase()); break
            case 'clear_all': tags = []; break
          }
          const newTags = tags.join(', ')
          if (newTags !== p.tags) { await setTags(p, tags); n++ }
        }
        msg = n + ' produit(s) mis à jour sur ' + batch.length + ' ciblés'
        break

      case 'description_rules':
        for (const p of batch) {
          let desc = (p.body_html as string) || ''
          let changed = false
          switch (cfg.desc_action) {
            case 'add_prefix_suffix': {
              const pre = cfg.prefix ? \`<p>\${cfg.prefix}</p>\` : ''
              const suf = cfg.suffix ? \`<p>\${cfg.suffix}</p>\` : ''
              if (pre || suf) { desc = pre + desc + suf; changed = true }; break
            }
            case 'add_guarantee': {
              const g = (cfg.guarantee_text as string) || '✓ Satisfait ou remboursé 30 jours  ✓ Paiement sécurisé  ✓ Livraison suivie'
              desc = desc + \`<p><strong>\${g}</strong></p>\`; changed = true; break
            }
            case 'add_shipping': {
              desc = desc + '<p>🚚 <strong>Livraison sous 7 à 15 jours</strong> — Suivi inclus</p>'; changed = true; break
            }
            case 'clean_html': {
              desc = desc
                .replace(/<script[^>]*>.*?<\\/script>/gi, '')
                .replace(/<style[^>]*>.*?<\\/style>/gi, '')
                .replace(/style="[^"]*"/gi, '')
                .replace(/class="[^"]*"/gi, '')
              changed = true; break
            }
            case 'add_cta': {
              desc = desc + '<p><strong>→ Commandez maintenant et recevez votre colis sous 7 à 15 jours !</strong></p>'
              changed = true; break
            }
          }
          if (changed) { await update(p, { body_html: desc }); n++ }
        }
        msg = n + ' description(s) améliorée(s) sur ' + batch.length + ' produits ciblés'
        break

      case 'publish_rules':
        for (const p of batch) {
          let newStatus = p.status as string
          switch (cfg.pub_action) {
            case 'publish_ready': {
              const imgs = Array.isArray(p.images) ? p.images : []
              const ok = (!cfg.require_image || imgs.length > 0) &&
                         (!cfg.require_description || !!(p.body_html as string)?.trim()) &&
                         (!cfg.require_price || (parseFloat(p.price) || 0) > 0)
              if (ok && p.status === 'draft') newStatus = 'active'; break
            }
            case 'publish_all_filter': newStatus = 'active'; break
            case 'unpublish_filter': newStatus = 'draft'; break
            case 'archive_filter': newStatus = 'archived'; break
            case 'unarchive_filter': newStatus = 'active'; break
          }
          if (newStatus !== p.status) { await update(p, { status: newStatus }); n++ }
        }
        msg = n + ' statut(s) modifié(s) sur ' + batch.length + ' produits ciblés'
        break

      case 'vendor_normalize':
        for (const p of batch) {
          let vendor = (p.vendor as string) || ''
          switch (cfg.vendor_action) {
            case 'capitalize': vendor = vendor.toLowerCase().replace(/\\b\\w/g, (c: string) => c.toUpperCase()); break
            case 'set_value': vendor = (cfg.new_vendor as string) || ''; break
            case 'replace_value': if (p.vendor === cfg.replace_from) vendor = (cfg.replace_to as string) || ''; break
            case 'clear': vendor = ''; break
          }
          if (vendor !== p.vendor) { await update(p, { vendor }); n++ }
        }
        msg = n + ' vendeur(s) normalisé(s) sur ' + batch.length + ' produits'
        break

      case 'image_audit':
        for (const p of batch) {
          const imgs = Array.isArray(p.images) ? p.images : []
          const up: Record<string, unknown> = {}
          switch (cfg.img_action) {
            case 'tag_no_image': {
              if (imgs.length === 0) {
                const tags = parseTags(p)
                const tag = (cfg.low_image_tag as string) || 'sans-image'
                if (!tags.includes(tag)) { up.tags = [...tags, tag].join(', '); n++ }
              }; break
            }
            case 'draft_no_image': {
              if (imgs.length === 0 && p.status === 'active') { up.status = 'draft'; n++ }; break
            }
            case 'tag_low_images': {
              const min = (cfg.min_images as number) || 1
              if (imgs.length < min) {
                const tags = parseTags(p)
                const tag = (cfg.low_image_tag as string) || 'images-manquantes'
                if (!tags.includes(tag)) { up.tags = [...tags, tag].join(', '); n++ }
              }; break
            }
          }
          if (Object.keys(up).length > 0) await update(p, up)
        }
        msg = n + ' produit(s) traité(s) sur ' + batch.length + ' ciblés'
        break

      case 'profit_alert':
        for (const p of batch) {
          const price = parseFloat(p.price) || 0
          if (!price) continue
          const margin = ((price - price * 0.4) / price) * 100
          const low = (cfg.low_margin_threshold as number) || 20
          const high = (cfg.high_margin_threshold as number) || 40
          const tags = parseTags(p)
          const newTags = [...tags]
          switch (cfg.profit_action) {
            case 'tag_low_margin': {
              const tag = (cfg.low_tag as string) || 'marge-faible'
              if (margin < low && !newTags.includes(tag)) { newTags.push(tag); n++ }; break
            }
            case 'tag_high_margin': {
              const tag = (cfg.high_tag as string) || 'rentable'
              if (margin >= high && !newTags.includes(tag)) { newTags.push(tag); n++ }; break
            }
            case 'draft_low_margin': {
              if (margin < low && p.status === 'active') { await update(p, { status: 'draft' }); n++ }; break
            }
          }
          if (newTags.join(', ') !== tags.join(', ')) await setTags(p, newTags)
        }
        msg = n + ' produit(s) analysé(s) et marqué(s) sur ' + batch.length + ' ciblés'
        break

      case 'collection_sync':
        for (const p of batch) {
          const tags = parseTags(p)
          const newTags = [...tags]
          switch (cfg.col_action) {
            case 'add_collection_tag': {
              if (cfg.collection_tag && !newTags.includes(cfg.collection_tag as string)) {
                newTags.push(cfg.collection_tag as string); n++
              }; break
            }
            case 'remove_collection_tag': {
              const idx = newTags.indexOf(cfg.collection_tag as string)
              if (idx > -1) { newTags.splice(idx, 1); n++ }; break
            }
            case 'sync_type_to_tag': {
              if (p.product_type) {
                const typeTag = ((cfg.product_type_prefix as string) || 'type-') + (p.product_type as string).toLowerCase().replace(/\\s+/g, '-')
                if (!newTags.includes(typeTag)) { newTags.push(typeTag); n++ }
              }; break
            }
          }
          if (newTags.join(', ') !== tags.join(', ')) await setTags(p, newTags)
        }
        msg = n + ' produit(s) synchronisé(s) avec les collections'
        break

      case 'duplicate_detect': {
        const tMap = new Map<string, typeof batch>()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        batch.forEach((p: any) => {
          const k = cfg.similarity === 'similar_title'
            ? (p.title || '').toLowerCase().replace(/\\s+/g, ' ').trim()
            : (p.title || '')
          if (!tMap.has(k)) tMap.set(k, [])
          tMap.get(k)!.push(p)
        })
        const dupTag = (cfg.dup_tag as string) || 'doublon-potentiel'
        for (const [, grp] of tMap) {
          if (grp.length < 2) continue
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sorted = [...grp].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          const targets = cfg.dup_action === 'archive_oldest' ? sorted.slice(0, sorted.length - 1) : sorted.slice(1)
          for (const p of targets) {
            if (cfg.dup_action === 'tag_duplicates') {
              const tags = parseTags(p)
              if (!tags.includes(dupTag)) { await setTags(p, [...tags, dupTag]); n++ }
            } else {
              await update(p, { status: 'archived' }); n++
            }
          }
        }
        msg = n + ' doublon(s) détecté(s) et traité(s) sur ' + batch.length + ' analysés'
        break
      }

      default:
        msg = 'Automatisation exécutée sur ' + batch.length + ' produits'
        n = batch.length
    }

    // Update run statistics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('automations') as any).update({
      last_run_at: new Date().toISOString(),
      run_count: (auto.run_count || 0) + 1,
    }).eq('id', body.id)

    return NextResponse.json({ success: true, message: msg, details: { count: n } })

  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[automations/run]', e)
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 })
  }
}
`

const dest = path.join(__dirname, '..', 'app', 'api', 'automations', 'run', 'route.ts')
fs.mkdirSync(path.dirname(dest), { recursive: true })
fs.writeFileSync(dest, ROUTE.trim() + '\n')
console.log('Run route written:', fs.statSync(dest).size, 'bytes,', ROUTE.trim().split('\n').length, 'lines')
