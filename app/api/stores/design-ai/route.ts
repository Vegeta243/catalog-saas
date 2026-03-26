import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { data: userData } = await supabase.from("users").select("plan").eq("id", user.id).single();
    if (!userData || !["pro", "agency", "scale"].includes(userData.plan || "")) {
      return NextResponse.json({ error: "Forfait Pro ou Agency requis" }, { status: 403 });
    }

    const { shopId, ambiance, primaryColor, sections } = await req.json() as {
      shopId: string;
      ambiance: string;
      primaryColor: string;
      sections: string[];
    };

    if (!shopId || !ambiance || !sections?.length) {
      return NextResponse.json({ error: "shopId, ambiance et sections sont requis" }, { status: 400 });
    }

    // Fetch the shop
    const { data: shop } = await supabase
      .from("shops")
      .select("id, shop_name, shop_domain, access_token")
      .eq("id", shopId)
      .eq("user_id", user.id)
      .single();

    if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

    const sectionLabels: Record<string, string> = {
      hero: "Bannière héro",
      featured_products: "Produits phares",
      benefits: "Bénéfices",
      testimonials: "Avis clients",
      newsletter: "Newsletter",
      about: "À propos",
      instagram: "Galerie Instagram",
      faq: "FAQ",
    };

    const sectionsList = (sections as string[]).map(s => sectionLabels[s] || s).join(", ");

    // Generate copy with OpenAI
    let generatedContent: Record<string, string> = {};
    if (process.env.OPENAI_API_KEY) {
      const ambianceDescriptions: Record<string, string> = {
        minimaliste: "épuré, élégant, espaces blancs, typographie sobre, moderne",
        luxe: "luxueux, premium, élégant, noir et or, exclusif",
        dynamique: "énergique, coloré, jeune, audacieux, vivant",
        nature: "naturel, bio, vert, authentique, éco-responsable",
      };

      const prompt = `Tu es un copywriter expert en e-commerce pour boutique Shopify française.
Boutique : "${shop.shop_name}" — ambiance : ${ambiance} (${ambianceDescriptions[ambiance] || ambiance}).
Couleur principale : ${primaryColor}.
Sections à inclure : ${sectionsList}.

Génère le contenu suivant en JSON avec ces clés exactes (adapte selon les sections demandées) :
- hero_title : titre principal accrocheur (max 10 mots)
- hero_subtitle : sous-titre (max 20 mots)
- hero_cta : bouton CTA (max 4 mots)
- about_text : texte "À propos" (2 phrases)
- benefits_1 / benefits_2 / benefits_3 : 3 bénéfices courts (max 5 mots chacun)
- newsletter_title : titre newsletter (max 8 mots)
- newsletter_subtitle : sous-titre newsletter (max 15 mots)
- faq_1_q / faq_1_a / faq_2_q / faq_2_a : 2 FAQ Q&A
Réponds uniquement avec le JSON valide, rien d'autre.`;

      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 600 }),
      });
      const aiData = aiRes.ok ? await aiRes.json() : null;
      const completion = aiData?.choices?.[0]?.message?.content?.trim() ?? "";

      const raw = completion;
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { generatedContent = JSON.parse(jsonMatch[0]); } catch { /* ignore */ }
      }
    }

    // Apply to Shopify theme via Admin API (if credentials available)
    let themeApplied = false;
    const shopifyToken = shop.access_token || process.env.SHOPIFY_ADMIN_TOKEN;
    if (shopifyToken && shop.shop_domain) {
      try {
        const apiBase = `https://${shop.shop_domain}/admin/api/2024-01`;
        const shopifyHeaders = { "X-Shopify-Access-Token": shopifyToken, "Content-Type": "application/json" };

        const themesRes = await fetch(`${apiBase}/themes.json?role=main`, { headers: shopifyHeaders });
        if (themesRes.ok) {
          const themesData = await themesRes.json();
          const mainTheme = themesData.themes?.[0];
          if (mainTheme?.id) {
            const themeBase = `${apiBase}/themes/${mainTheme.id}/assets.json`;

            // 1. READ existing settings_data.json, MERGE new colors
            try {
              const existingRes = await fetch(
                `${themeBase}?asset[key]=config/settings_data.json`,
                { headers: shopifyHeaders }
              );
              if (existingRes.ok) {
                const existingData = await existingRes.json();
                const existingValue = existingData?.asset?.value;
                let settings: Record<string, unknown> = {};
                try { settings = JSON.parse(existingValue); } catch { /* start fresh if corrupt */ }
                // Merge colors into current section
                const current = (settings.current && typeof settings.current === "object")
                  ? settings.current as Record<string, unknown>
                  : {};
                current.colors_accent_1 = primaryColor;
                current.colors_accent_2 = primaryColor;
                settings.current = current;

                await fetch(themeBase, {
                  method: "PUT",
                  headers: shopifyHeaders,
                  body: JSON.stringify({
                    asset: {
                      key: "config/settings_data.json",
                      value: JSON.stringify(settings),
                    },
                  }),
                });
              }
            } catch { /* settings update is best-effort */ }

            // 2. Update homepage template with hero content if available
            if (generatedContent.hero_title && sections.includes("hero")) {
              try {
                // Read existing index template
                const indexRes = await fetch(
                  `${themeBase}?asset[key]=templates/index.json`,
                  { headers: shopifyHeaders }
                );
                let indexTemplate: Record<string, unknown> = {};
                if (indexRes.ok) {
                  const indexData = await indexRes.json();
                  try { indexTemplate = JSON.parse(indexData?.asset?.value || "{}"); } catch { /* start fresh */ }
                }
                // Ensure sections object exists
                const tmplSections = (indexTemplate.sections && typeof indexTemplate.sections === "object")
                  ? indexTemplate.sections as Record<string, unknown>
                  : {};
                // Add/update hero section
                tmplSections["hero"] = {
                  type: "image-banner",
                  settings: {
                    heading: generatedContent.hero_title || "",
                    subheading: generatedContent.hero_subtitle || "",
                    button_label: generatedContent.hero_cta || "Découvrir",
                    color_scheme: "accent-1",
                  },
                };
                indexTemplate.sections = tmplSections;
                // Ensure order includes hero
                const order = Array.isArray(indexTemplate.order)
                  ? indexTemplate.order as string[]
                  : Object.keys(tmplSections);
                if (!order.includes("hero")) order.unshift("hero");
                indexTemplate.order = order;

                await fetch(themeBase, {
                  method: "PUT",
                  headers: shopifyHeaders,
                  body: JSON.stringify({
                    asset: {
                      key: "templates/index.json",
                      value: JSON.stringify(indexTemplate),
                    },
                  }),
                });
              } catch { /* template update is best-effort */ }
            }

            themeApplied = true;
          }
        }
      } catch { /* Shopify apply is best-effort */ }
    }

    return NextResponse.json({
      success: true,
      shop: { name: shop.shop_name, domain: shop.shop_domain },
      ambiance,
      primaryColor,
      sections,
      content: generatedContent,
      themeApplied,
      note: themeApplied
        ? "Design et contenu appliqués à votre thème Shopify."
        : "Contenu généré. Pour l'appliquer automatiquement, assurez-vous que votre boutique Shopify est connectée avec un token d'accès valide.",
    });
  } catch (err) {
    console.error("[design-ai]", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
