"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MediaUploader() {
  const router = useRouter();
  const [file, setFile] = useState<File>();
  const [alt, setAlt] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [busy, setBusy] = useState(false);
  async function upload(event: React.FormEvent) {
    event.preventDefault(); if (!file) return;
    setBusy(true); setMessage(""); setMessageType("success");
    const body = new FormData(); body.set("file", file); body.set("alt", alt);
    const response = await fetch("/api/admin/media", { method: "POST", body });
    const result = await response.json() as { error?: string };
    setBusy(false);
    setMessageType(response.ok ? "success" : "error");
    setMessage(response.ok ? "Image uploaded." : result.error ?? "Upload failed.");
    if (response.ok) { setFile(undefined); setAlt(""); router.refresh(); }
  }
  return <form className="admin-card admin-form" onSubmit={upload}>
    <h2>Upload image</h2>{message ? <div className={messageType === "error" ? "admin-error" : "admin-success"} role={messageType === "error" ? "alert" : "status"}>{message}</div> : null}
    <div className="admin-field"><label htmlFor="media-file">Image</label><input accept="image/jpeg,image/png,image/webp,image/avif" id="media-file" type="file" onChange={event => setFile(event.target.files?.[0])} required /></div>
    <div className="admin-field"><label htmlFor="media-alt">Default alt text</label><input id="media-alt" value={alt} onChange={event => setAlt(event.target.value)} /></div>
    <button className="admin-button" disabled={busy || !file} type="submit">{busy ? "Uploading…" : "Upload"}</button>
  </form>;
}
