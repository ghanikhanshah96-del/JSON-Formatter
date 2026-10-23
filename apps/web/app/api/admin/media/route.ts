import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { NextResponse, type NextRequest } from "next/server";
import { authorizeCmsMutation } from "@/lib/cms-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { blogMediaBucket } from "@/lib/supabase/config";
import { hasAllowedMutationOrigin } from "@/lib/request-security";
import { canDeleteMedia } from "@/lib/cms-access";

export const runtime = "nodejs";
const allowedInput = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: NextRequest) {
  if (!hasAllowedMutationOrigin(request, { requireOrigin: true })) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
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
    const supabase = createSupabaseAdminClient();
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

export async function DELETE(request: NextRequest) {
  if (!hasAllowedMutationOrigin(request, { requireOrigin: true })) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const user = await authorizeCmsMutation();
    const assetId = request.nextUrl.searchParams.get("id") ?? "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId)) {
      return NextResponse.json({ error: "Invalid media item." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const assetResult = await admin.from("blog_assets")
      .select("id,storage_path,public_url,original_name,created_by,deleted_at")
      .eq("id", assetId)
      .is("deleted_at", null)
      .maybeSingle();
    if (assetResult.error) throw assetResult.error;
    const asset = assetResult.data;
    if (!asset) return NextResponse.json({ error: "Media item not found." }, { status: 404 });
    if (!canDeleteMedia(user.role, user.id, asset.created_by)) {
      return NextResponse.json({ error: "Editors can remove only media they uploaded." }, { status: 403 });
    }

    const [coverUse, urlUse] = await Promise.all([
      admin.from("blog_posts").select("id", { count: "exact", head: true }).eq("cover_asset_id", asset.id),
      admin.from("blog_posts").select("id", { count: "exact", head: true }).eq("image_url", asset.public_url)
    ]);
    if (coverUse.error) throw coverUse.error;
    if (urlUse.error) throw urlUse.error;
    if ((coverUse.count ?? 0) > 0 || (urlUse.count ?? 0) > 0) {
      return NextResponse.json({ error: "This image is used by a blog post. Replace the post image before removing it." }, { status: 409 });
    }

    const deletedAt = new Date().toISOString();
    const claim = await admin.from("blog_assets")
      .update({ deleted_at: deletedAt })
      .eq("id", asset.id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();
    if (claim.error) throw claim.error;
    if (!claim.data) return NextResponse.json({ error: "This media item was already removed." }, { status: 409 });

    const removal = await admin.storage.from(blogMediaBucket).remove([asset.storage_path]);
    if (removal.error) {
      await admin.from("blog_assets").update({ deleted_at: null }).eq("id", asset.id).eq("deleted_at", deletedAt);
      throw removal.error;
    }

    await admin.from("audit_events").insert({
      actor_id: user.id,
      action: "asset.deleted",
      entity_type: "blog_asset",
      entity_id: asset.id,
      metadata: { path: asset.storage_path, original_name: asset.original_name }
    });
    return NextResponse.json({ removed: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to remove media." }, { status: 400 });
  }
}
