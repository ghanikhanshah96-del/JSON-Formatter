import Image from "next/image";
import { MediaDeleteButton } from "@/components/admin/media-delete-button";
import { MediaUploader } from "@/components/admin/media-uploader";
import { getAdminAssets } from "@/lib/admin-blog";
import { requireCmsUser } from "@/lib/cms-auth";
import { canDeleteMedia } from "@/lib/cms-access";

export default async function MediaPage() {
  const user = await requireCmsUser();
  const assets = await getAdminAssets();

  return <main className="admin-main">
    <div className="admin-heading"><div>
      <h1>Media</h1>
      <p className="admin-muted">Images are verified, resized, stripped of metadata, and stored as WebP. Owners can remove any unused image; editors can remove only their own unused images.</p>
    </div></div>
    <MediaUploader />
    {assets.length ? <div className="admin-grid admin-media-grid">{assets.map(asset => {
      const canDelete = canDeleteMedia(user.role, user.id, asset.created_by);
      return <article className="admin-card" key={asset.id}>
        <div className="admin-media-preview"><Image alt={asset.default_alt || ""} fill sizes="(max-width: 850px) 100vw, 33vw" src={asset.public_url} style={{ objectFit: "cover" }} /></div>
        <p><strong>{asset.original_name}</strong></p>
        <p className="admin-muted">{asset.width} × {asset.height} · {Math.ceil(asset.size_bytes / 1024)} KB</p>
        <input className="admin-input" readOnly value={asset.public_url} aria-label={`URL for ${asset.original_name}`} />
        {canDelete ? <MediaDeleteButton assetId={asset.id} name={asset.original_name} /> : <p className="admin-help">Only the uploader or an owner can remove this image.</p>}
      </article>;
    })}</div> : <section className="admin-card admin-empty-state"><h2>No media yet</h2><p className="admin-muted">Upload the first blog image above.</p></section>}
  </main>;
}
