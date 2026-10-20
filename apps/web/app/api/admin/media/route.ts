import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { NextResponse, type NextRequest } from "next/server";
import { authorizeCmsMutation } from "@/lib/cms-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { blogMediaBucket } from "@/lib/supabase/config";
import { hasAllowedMutationOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
const allowedInput = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: NextRequest) {
  if (!hasAllowedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 5_600_000) return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 413 });
  try {
    const user = await authorizeCmsMutation();
    const formData = await request.formData();
    const file = formData.get("file");
    const alt = String(formData.get("alt") ?? "").trim();
    if (!(file instanceof File) || !allowedInput.has(file.type) || file.size <= 0 || file.size > 5_242_880) {
      return NextResponse.json({ error: "Choose a JPG, PNG, WebP, or AVIF image up to 5 MB." }, { status: 400 });
    }
    const input = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(input, { failOn: "error", limitInputPixels: 40_000_000 }).metadata();
    if (!metadata.width || !metadata.height || !["jpeg", "png", "webp", "avif"].includes(metadata.format ?? "")) {
      return NextResponse.json({ error: "The uploaded file is not a supported image." }, { status: 400 });
    }
    const output = await sharp(input, { failOn: "error", limitInputPixels: 40_000_000 }).rotate().resize({ width: 2000, height: 1400, fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
    if (output.length > 5_242_880) return NextResponse.json({ error: "The processed image is larger than 5 MB." }, { status: 400 });
    const outputMeta = await sharp(output).metadata();
    const path = `${new Date().getUTCFullYear()}/${randomUUID()}.webp`;
    const supabase = await createSupabaseServerClient();
    const upload = await supabase.storage.from(blogMediaBucket).upload(path, output, { contentType: "image/webp", upsert: false });
    if (upload.error) throw upload.error;
    const { data: publicData } = supabase.storage.from(blogMediaBucket).getPublicUrl(path);
    const asset = await supabase.from("blog_assets").insert({
      storage_path: path, public_url: publicData.publicUrl, original_name: file.name.slice(0, 240), mime_type: "image/webp",
      width: outputMeta.width, height: outputMeta.height, size_bytes: output.length,
      sha256: createHash("sha256").update(output).digest("hex"), default_alt: alt.slice(0, 240), created_by: user.id
    }).select("id,public_url,width,height,size_bytes,default_alt").single();
    if (asset.error) {
      await supabase.storage.from(blogMediaBucket).remove([path]);
      throw asset.error;
    }
    await supabase.from("audit_events").insert({ actor_id: user.id, action: "asset.uploaded", entity_type: "blog_asset", entity_id: asset.data.id, metadata: { path, bytes: output.length } });
    return NextResponse.json({ asset: asset.data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
