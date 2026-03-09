import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/log-action";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const body = await request.json();
    const { imageBase64, operation, params = {} } = body as {
      imageBase64: string;
      operation: string;
      params: Record<string, unknown>;
    };

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const inputBuffer = Buffer.from(base64Data, "base64");

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