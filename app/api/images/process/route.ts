import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_IMAGE_HOSTS = ["cdn.shopify.com", "shopify.com"];

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const imageUrlParam = formData.get("imageUrl") as string | null;
    const action = formData.get("action") as string;
    const width = parseInt(formData.get("width") as string) || 0;
    const height = parseInt(formData.get("height") as string) || 0;
    const quality = parseInt(formData.get("quality") as string) || 80;
    const format = (formData.get("format") as string) || "webp";
    const brightness = parseFloat(formData.get("brightness") as string) || 1;
    const contrast = parseFloat(formData.get("contrast") as string) || 1;
    const saturation = parseFloat(formData.get("saturation") as string) || 1;

    // Auth + quota check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase
        .from("users")
        .select("actions_used, actions_limit")
        .eq("id", user.id)
        .single();
      if (userData && userData.actions_used >= userData.actions_limit) {
        return NextResponse.json(
          { error: "limit_exceeded", message: "Limite de tâches atteinte — passez à un plan supérieur" },
          { status: 429 }
        );
      }
    }

    // Build buffer from either a remote URL or an uploaded file
    let buffer: Buffer;
    if (imageUrlParam) {
      // SSRF protection: only allow trusted image hosts
      let urlObj: URL;
      try { urlObj = new URL(imageUrlParam); } catch {
        return NextResponse.json({ error: "URL invalide" }, { status: 400 });
      }
      if (!ALLOWED_IMAGE_HOSTS.some((h) => urlObj.hostname === h || urlObj.hostname.endsWith("." + h))) {
        return NextResponse.json({ error: "Hôte non autorisé" }, { status: 400 });
      }
      const imgRes = await fetch(imageUrlParam);
      if (!imgRes.ok) throw new Error("Impossible de télécharger l'image distante");
      buffer = Buffer.from(await imgRes.arrayBuffer());
    } else if (file) {
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "Fichier trop volumineux (max 10 MB)" }, { status: 400 });
      }
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }
    let pipeline = sharp(buffer);

    // Get original metadata
    const metadata = await sharp(buffer).metadata();

    // Apply transformations
    switch (action) {
      case "resize":
        if (width > 0 || height > 0) {
          pipeline = pipeline.resize(width || undefined, height || undefined, { fit: "cover" });
        }
        break;
      case "remove-bg":
        // Simplified: make white background transparent (threshold)
        pipeline = pipeline.ensureAlpha().flatten({ background: { r: 255, g: 255, b: 255 } });
        break;
      case "enhance":
        pipeline = pipeline.sharpen({ sigma: 1.5 }).modulate({ brightness: 1.05, saturation: 1.1 });
        break;
      case "adjust":
        pipeline = pipeline.modulate({ brightness, saturation });
        if (contrast !== 1) {
          pipeline = pipeline.linear(contrast, -(128 * contrast) + 128);
        }
        break;
      case "grayscale":
        pipeline = pipeline.grayscale();
        break;
      case "blur":
        pipeline = pipeline.blur(3);
        break;
      default:
        break;
    }

    // Format output
    let outputBuffer: Buffer;
    let mimeType: string;

    if (format === "png") {
      outputBuffer = await pipeline.png({ quality }).toBuffer();
      mimeType = "image/png";
    } else if (format === "jpeg" || format === "jpg") {
      outputBuffer = await pipeline.jpeg({ quality }).toBuffer();
      mimeType = "image/jpeg";
    } else {
      outputBuffer = await pipeline.webp({ quality }).toBuffer();
      mimeType = "image/webp";
    }

    const base64 = outputBuffer.toString("base64");

    // Consume 1 task for authenticated users
    if (user) {
      await supabase.rpc("increment_actions", { p_user_id: user.id, p_count: 1 });
    }

    return NextResponse.json({
      success: true,
      image: `data:${mimeType};base64,${base64}`,
      originalSize: buffer.length,
      processedSize: outputBuffer.length,
      originalDimensions: { width: metadata.width, height: metadata.height },
      format,
      compression: Math.round((1 - outputBuffer.length / buffer.length) * 100),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
