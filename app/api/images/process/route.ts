import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/log-action";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MAGIC: Array<{ bytes: number[]; offset: number }> = [
  { bytes: [0xff, 0xd8, 0xff], offset: 0 },              // JPEG
  { bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0 },        // PNG
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },        // WebP (RIFF)
];

function isAllowedImageType(buf: Buffer): boolean {
  return ALLOWED_MAGIC.some(({ bytes, offset }) =>
    bytes.every((b, i) => buf[offset + i] === b)
  );
}

const processSchema = z.object({
  imageBase64: z.string().min(1),
  operation: z.enum(["improve", "grayscale", "adjustments", "filter", "resize"]),
  params: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const parsed = processSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { imageBase64, operation, params = {} } = parsed.data;

    const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const inputBuffer = Buffer.from(base64Data, "base64");

    if (inputBuffer.length > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Image trop grande (max 10 Mo)." }, { status: 413 });
    }

    if (!isAllowedImageType(inputBuffer)) {
      return NextResponse.json({ error: "Format d'image non supporté. Utilisez JPEG, PNG ou WebP." }, { status: 415 });
    }

    let pipeline = sharp(inputBuffer);

    switch (operation) {
      case "improve":
        pipeline = pipeline.sharpen({ sigma: 1.5 }).modulate({ brightness: 1.05, saturation: 1.1 });
        break;

      case "grayscale":
        pipeline = pipeline.grayscale();
        break;

      case "adjustments": {
        const b = ((params.brightness as number) ?? 100) / 100;
        const s = ((params.saturation as number) ?? 100) / 100;
        const c = ((params.contrast as number) ?? 100) / 100;
        pipeline = pipeline.modulate({ brightness: b, saturation: s });
        if (c !== 1) pipeline = pipeline.linear(c, -(128 * c - 128));
        if ((params.sharpness as number) > 0) pipeline = pipeline.sharpen({ sigma: (params.sharpness as number) / 20 });
        break;
      }

      case "filter":
        switch (params.filter as string) {
          case "lumineux":
            pipeline = pipeline.modulate({ brightness: 1.2 });
            break;
          case "contraste":
            pipeline = pipeline.linear(1.4, -20);
            break;
          case "chaud":
            pipeline = pipeline.tint({ r: 255, g: 240, b: 200 });
            break;
          case "froid":
            pipeline = pipeline.tint({ r: 200, g: 220, b: 255 });
            break;
          case "nb":
            pipeline = pipeline.grayscale();
            break;
          case "vintage":
            pipeline = pipeline.modulate({ brightness: 0.9, saturation: 0.7 });
            break;
          case "vif":
            pipeline = pipeline.modulate({ saturation: 1.5 });
            break;
        }
        break;

      case "resize":
        if (params.width && params.height) {
          pipeline = pipeline.resize(params.width as number, params.height as number, { fit: "cover" });
        }
        break;
    }

    const format = (params.format as string) || "jpeg";
    const quality = (params.quality as number) ?? 80;

    let outputBuffer: Buffer;
    if (format === "webp") {
      outputBuffer = await pipeline.webp({ quality }).toBuffer();
    } else if (format === "png") {
      outputBuffer = await pipeline.png().toBuffer();
    } else {
      outputBuffer = await pipeline.jpeg({ quality }).toBuffer();
    }

    const mime = format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
    const result = `data:${mime};base64,${outputBuffer.toString("base64")}`;

    await logAction(supabase, {
      userId: user.id,
      actionType: "image.optimize",
      description: `Image traitée : ${operation}`,
      creditsUsed: 1,
      details: { operation, format },
    });

    return NextResponse.json({ result, size: outputBuffer.length, format });
  } catch (error) {
    console.error("Image processing error:", error);
    return NextResponse.json(
      { error: "Processing failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}