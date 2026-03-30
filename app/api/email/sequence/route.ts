import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Runs every hour via Vercel cron. Sends up to 3 onboarding emails per user.
// email_sequence_step: 0 = welcome not sent, 1 = welcome sent, 2 = no-shop sent, 3 = no-opt sent (done)

export async function GET(request: Request) {
  // Verify cron secret (Vercel sets Authorization: Bearer <CRON_SECRET>)
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const now = new Date();
  let sent = 0;

  // --- Email 1: Welcome (step 0 â†’ 1), send within 5 minutes of signup ---
  {
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const { data: newUsers } = await admin
      .from("users")
      .select("id, email, first_name")
      .eq("email_sequence_step" as never, 0)
      .is("deleted_at" as never, null)
      .lte("created_at", fiveMinutesAgo);

    for (const user of newUsers ?? []) {
      await sendEmail(resendKey, {
        to: user.email,
        subject: "Bienvenue sur EcomPilot ðŸš€",
        html: welcomeEmail(user.first_name || ""),
      });
      await admin
        .from("users")
        .update({ email_sequence_step: 1, last_email_sent_at: now.toISOString() } as never)
        .eq("id", user.id);
      sent++;
    }
  }

  // --- Email 2: No shop after 1 hour (step 1 â†’ 2) ---
  {
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const { data: noShopUsers } = await admin
      .from("users")
      .select("id, email, first_name")
      .eq("email_sequence_step" as never, 1)
      .is("deleted_at" as never, null)
      .lte("last_email_sent_at" as never, oneHourAgo);

    // Of those, only ones without a connected shop
    for (const user of noShopUsers ?? []) {
      const { count } = await admin
        .from("shops")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);

      if ((count ?? 0) === 0) {
        await sendEmail(resendKey, {
          to: user.email,
          subject: "Votre boutique Shopify n'est pas encore connectÃ©e",
          html: noShopEmail(user.first_name || ""),
        });
        await admin
          .from("users")
          .update({ email_sequence_step: 2, last_email_sent_at: now.toISOString() } as never)
          .eq("id", user.id);
        sent++;
      } else {
        // Has shop â€” skip to step 2 silently
        await admin
          .from("users")
          .update({ email_sequence_step: 2, last_email_sent_at: now.toISOString() } as never)
          .eq("id", user.id);
      }
    }
  }

  // --- Email 3: No optimization after 24 hours (step 2 â†’ 3) ---
  {
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { data: noOptUsers } = await admin
      .from("users")
      .select("id, email, first_name")
      .eq("email_sequence_step" as never, 2)
      .is("deleted_at" as never, null)
      .lte("last_email_sent_at" as never, oneDayAgo);

    for (const user of noOptUsers ?? []) {
      // Only send if they have a shop but actions_used is still 0
      const { data: userData } = await admin
        .from("users")
        .select("actions_used")
        .eq("id", user.id)
        .single();

      if ((userData?.actions_used ?? 0) === 0) {
        await sendEmail(resendKey, {
          to: user.email,
          subject: "Optimisez votre premier produit en 2 minutes âš¡",
          html: noOptimizationEmail(user.first_name || ""),
        });
        sent++;
      }
      await admin
        .from("users")
        .update({ email_sequence_step: 3, last_email_sent_at: now.toISOString() } as never)
        .eq("id", user.id);
    }
  }

  return NextResponse.json({ ok: true, sent });
}

// --- Resend API call ---
async function sendEmail(apiKey: string, { to, subject, html }: { to: string; subject: string; html: string }) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "EcomPilot Elite <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });
}

// --- Email templates ---
function welcomeEmail(firstName: string): string {
  const name = firstName || "lÃ ";
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1e293b">
  <h1 style="font-size:24px;font-weight:700;margin-bottom:8px">Bienvenue sur EcomPilot, ${name} ðŸŽ‰</h1>
  <p style="color:#475569;line-height:1.6">Votre compte est prÃªt. Connectez votre boutique Shopify et optimisez votre premier produit en moins de 2 minutes.</p>
  <a href="https://www.ecompilotelite.com/dashboard"
    style="display:inline-block;margin-top:24px;padding:12px 24px;background:#3b82f6;color:#fff;font-weight:600;border-radius:8px;text-decoration:none">
    Connecter ma boutique â†’
  </a>
  <p style="margin-top:32px;font-size:13px;color:#94a3b8">EcomPilot Â· <a href="https://www.ecompilotelite.com" style="color:#94a3b8">ecompilotelite.com</a></p>
</div>`;
}

function noShopEmail(firstName: string): string {
  const name = firstName || "lÃ ";
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1e293b">
  <h1 style="font-size:22px;font-weight:700;margin-bottom:8px">Votre boutique n'est pas encore connectÃ©e, ${name}</h1>
  <p style="color:#475569;line-height:1.6">Il suffit d'un seul clic dans votre tableau de bord pour connecter Shopify. Tout le reste se fait automatiquement.</p>
  <a href="https://www.ecompilotelite.com/dashboard/shops"
    style="display:inline-block;margin-top:24px;padding:12px 24px;background:#3b82f6;color:#fff;font-weight:600;border-radius:8px;text-decoration:none">
    Connecter Shopify maintenant â†’
  </a>
  <p style="margin-top:32px;font-size:13px;color:#94a3b8">EcomPilot Â· <a href="https://www.ecompilotelite.com" style="color:#94a3b8">ecompilotelite.com</a></p>
</div>`;
}

function noOptimizationEmail(firstName: string): string {
  const name = firstName || "lÃ ";
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1e293b">
  <h1 style="font-size:22px;font-weight:700;margin-bottom:8px">Optimisez votre premier produit âš¡</h1>
  <p style="color:#475569;line-height:1.6">HÃ© ${name} ! Votre boutique est connectÃ©e mais vos produits ne sont pas encore optimisÃ©s. En 2 minutes, l'IA peut rÃ©Ã©crire vos titres et descriptions pour amÃ©liorer votre SEO.</p>
  <a href="https://www.ecompilotelite.com/dashboard/ai"
    style="display:inline-block;margin-top:24px;padding:12px 24px;background:#3b82f6;color:#fff;font-weight:600;border-radius:8px;text-decoration:none">
    Optimiser mes produits â†’
  </a>
  <p style="margin-top:32px;font-size:13px;color:#94a3b8">EcomPilot Â· <a href="https://www.ecompilotelite.com" style="color:#94a3b8">ecompilotelite.com</a></p>
</div>`;
}

