import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'

const schema = z.object({
  products: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
  })).min(1).max(50),
  language: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

    const rl = await checkRateLimit(user.id, 'ai.generate')
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans un moment.' }, { status: 429, headers: getRateLimitHeaders(rl) })
    }

    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })

    const { products, language = 'fr' } = parsed.data
    const apiKey = process.env.OPENAI_API_KEY

    // Demo mode
    if (!apiKey || apiKey.startsWith('sk-DEMO') || apiKey.startsWith('sk-test')) {
      const tags = products.map(p => ({
        id: p.id,
        tags: ['livraison-rapide', 'qualite', p.title.toLowerCase().split(' ').slice(0, 2).join('-'), 'promo', 'nouveaute'].join(', '),
        demo: true,
      }))
      return NextResponse.json({ tags, demo: true })
    }

    const productsList = products
      .map((p, i) => `Produit ${i + 1} (ID: ${p.id}):\n- Titre: "${p.title}"\n- Description: "${(p.description || '').replace(/<[^>]*>/g, '').slice(0, 200)}"`)
      .join('\n\n')

    const prompt = `Tu es un expert e-commerce. Génère 5 à 8 tags SEO pertinents pour chaque produit en ${language === 'fr' ? 'français' : language}.

${productsList}

Règles :
- Tags en minuscules, séparés par des virgules
- Pertinents pour le référencement et la catégorisation
- Incluez : catégorie produit, usage, public cible, matière si applicable
- Pas de doublons
Réponds UNIQUEMENT en JSON valide sans texte avant ni après :
[{"id":"...","tags":"tag1, tag2, tag3, ..."},...]`

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600, temperature: 0.5,
      }),
    })
    const data = await resp.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || '[]'
    let tags: { id: string; tags: string }[] = []
    try {
      const start = raw.indexOf('[')
      const end = raw.lastIndexOf(']')
      tags = JSON.parse(start >= 0 ? raw.slice(start, end + 1) : '[]')
    } catch {
      tags = products.map(p => ({ id: p.id, tags: '' }))
    }

    return NextResponse.json({ tags })
  } catch (err) {
    console.error('generate-tags:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
