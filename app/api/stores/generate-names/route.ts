import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { concept, style } = await req.json();

    if (!concept) {
      return NextResponse.json({ names: ["MyStore", "ShopEase", "TrendHub", "VogueBox", "ModaPlus"] });
    }

    if (!openai) {
      const base = concept.split(" ")[0] || "Shop";
      return NextResponse.json({
        names: [
          `${base}Store`, `${base}Hub`, `${base}Plus`, `${base}Zone`, `${base}Market`,
        ],
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Tu es un expert en branding e-commerce. Génère des noms de boutiques e-commerce créatifs, mémorables et SEO-friendly.",
        },
        {
          role: "user",
          content: `Génère 5 noms de boutique pour ce concept: "${concept}". Style: ${style || "moderne"}. 
          Les noms doivent être: courts (1-3 mots), mémorables, sans accents, faciles à prononcer.
          Réponds avec un JSON: { "names": ["nom1", "nom2", "nom3", "nom4", "nom5"] }`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
    });

    const raw = completion.choices[0].message.content || "{}";
    const parsed = JSON.parse(raw);
    return NextResponse.json({ names: parsed.names || [] });
  } catch (err) {
    console.error("[generate-names]", err);
    return NextResponse.json({ names: [] }, { status: 500 });
  }
}
