"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MediaDeleteButton({ assetId, name }: { assetId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm(`Remove ${name}? This cannot be undone. Images used by a post cannot be removed.`)) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/admin/media?id=${encodeURIComponent(assetId)}`, { method: "DELETE" });
    const result = await response.json() as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(result.error ?? "Unable to remove media.");
      return;
    }
    router.refresh();
  }

  return <div className="admin-media-delete">
    {error ? <p className="admin-error" role="alert">{error}</p> : null}
    <button className="admin-button danger" disabled={busy} onClick={remove} type="button">{busy ? "Removing…" : "Remove media"}</button>
  </div>;
}
