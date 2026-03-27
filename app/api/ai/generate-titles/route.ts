import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'

const schema = z.object({
  products: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    tags: z.string().optional(),
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
      const titles = products.map(p => ({
        id: p.id,
        title: p.title.length >= 40 ? p.title : p.title + ' — Livraison rapide 24h',
        demo: true,
      }))
      return NextResponse.json({ titles, demo: true })
    }

    const titles: { id: string; title: string }[] = []
    for (const product of products) {
      try {
        const prompt = `Tu es un expert e-commerce. Génère un titre produit Shopify percutant en ${language === 'fr' ? 'français' : language}.
Produit actuel : "${product.title}"
Description : "${(product.description || '').replace(/<[^>]*>/g, '').slice(0, 200)}"
Règles :
- Entre 50 et 70 caractères
- Inclure le mot-clé principal naturellement
- Accrocheur, orienté bénéfice client
- Pas de majuscules excessives
Réponds UNIQUEMENT avec le titre, sans guillemets ni commentaires.`
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 100, temperature: 0.7,
          }),
        })
        const data = await resp.json()
        const title = data.choices?.[0]?.message?.content?.trim() || product.title
        titles.push({ id: product.id, title })
      } catch {
        titles.push({ id: product.id, title: product.title })
      }
    }

    return NextResponse.json({ titles })
  } catch (err) {
    console.error('generate-titles:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
