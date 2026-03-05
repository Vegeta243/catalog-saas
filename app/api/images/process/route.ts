import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const action = formData.get("action") as string;
    const width = parseInt(formData.get("width") as string) || 0;
    const height = parseInt(formData.get("height") as string) || 0;
    const quality = parseInt(formData.get("quality") as string) || 80;
    const format = (formData.get("format") as string) || "webp";
    const brightness = parseFloat(formData.get("brightness") as string) || 1;
    const contrast = parseFloat(formData.get("contrast") as string) || 1;
    const saturation = parseFloat(formData.get("saturation") as string) || 1;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 MB)" }, { status: 400 });
    }

    let sharp;
    try {
      sharp = (await import("sharp")).default;
    } catch {
      return NextResponse.json({ error: "Module de traitement d'images non disponible sur ce serveur" }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
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
