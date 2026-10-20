import Image from "next/image";
import { MediaUploader } from "@/components/admin/media-uploader";
import { getAdminAssets } from "@/lib/admin-blog";
import { requireCmsUser } from "@/lib/cms-auth";

export default async function MediaPage() {
  await requireCmsUser(); const assets = await getAdminAssets();
  return <main className="admin-main"><div className="admin-heading"><div><h1>Media</h1><p className="admin-muted">Images are verified, resized when needed, stripped of metadata, and stored as WebP.</p></div></div><MediaUploader />
    <div className="admin-grid" style={{ marginTop: 18 }}>{assets.map(asset => <article className="admin-card" key={asset.id}><div className="admin-media-preview"><Image alt={asset.default_alt || ""} fill sizes="(max-width: 850px) 100vw, 33vw" src={asset.public_url} style={{ objectFit: "cover" }} /></div><p><strong>{asset.original_name}</strong></p><p className="admin-muted">{asset.width} × {asset.height} · {Math.ceil(asset.size_bytes / 1024)} KB</p><input className="admin-input" readOnly value={asset.public_url} aria-label={`URL for ${asset.original_name}`} /></article>)}</div>
  </main>;
}
