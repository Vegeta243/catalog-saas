import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.union([z.literal("user"), z.literal("assistant")]),
      content: z.string().max(4000),
    })
  ).min(1).max(20),
  currentPage: z.string().max(200).optional(),
  plan: z.string().max(50).optional(),
});

const SYSTEM_PROMPT = `Tu es l'assistant IA d'EcomPilot, un SaaS e-commerce qui aide les marchands Shopify à optimiser leur catalogue produits. Tu répondras en français, de façon concise, clear et utile.

Fonctionnalités disponibles dans EcomPilot :
- **Modifier en masse** : modifier prix, tags, statuts, titres de plusieurs produits en une fois
- **Optimisation IA** : générer titres SEO, descriptions, méta-titres et méta-descriptions avec GPT-4o-mini
- **Éditeur d'images** : améliorer, recadrer, convertir des visuels produits (JPEG, PNG, WebP)
- **Automatisations** : créer des règles automatiques (baisse de prix, alerte stock, archivage)
- **Calendrier** : planifier des actions marketing
- **Rentabilité** : calculer marges et profits
- **Concurrence** : suivre les concurrents

Sois toujours précis, encourage l'utilisateur à explorer les fonctionnalités et réponds aux questions techniques comme à un expert e-commerce.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const rl = checkRateLimit(user.id, "ai.generate");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans un moment." },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  const parsed = chatSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { messages, currentPage, plan } = parsed.data;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith("sk-DEMO") || apiKey.startsWith("sk-test")) {
    return NextResponse.json({
      message: "Bonjour ! Je suis l'assistant EcomPilot. En mode démo, je ne peux pas répondre à des questions complexes, mais sachez qu'EcomPilot vous permet d'optimiser vos produits Shopify en masse grâce à l'IA.",
      demo: true,
    });
  }

  const contextNote = currentPage
    ? `\n\nContexte : L'utilisateur se trouve sur la page "${currentPage}". Son plan actuel est "${plan || "free"}".`
    : "";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + contextNote },
        ...messages,
      ],
      max_tokens: 400,
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Erreur IA. Réessayez dans un moment." }, { status: 502 });
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message?.content?.trim() || "Je n'ai pas pu générer de réponse.";

  return NextResponse.json({ message });
}
