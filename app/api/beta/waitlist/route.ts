import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { email, feature } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    }

    const supabase = await createClient();

    // Upsert so duplicate emails for the same feature don't cause errors
    const { error } = await supabase.from("beta_waitlist").upsert(
      { email: email.trim().toLowerCase(), feature: feature || null },
      { onConflict: "email,feature" }
    );

    if (error) {
      // If the table doesn't exist yet, log it but don't fail the user
      console.error("[beta/waitlist]", error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[beta/waitlist]", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
