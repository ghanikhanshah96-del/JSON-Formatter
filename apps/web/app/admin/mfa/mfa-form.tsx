"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Enrollment = { id: string; qrCode: string; secret: string };

export function MfaForm() {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;
    async function prepare() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp.find((item: { id: string; status: string }) => item.status === "verified");
      if (!active) return;
      if (verified) setFactorId(verified.id);
      else {
        const result = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "CodeFormatterTools Editorial" });
        if (result.error) setError(result.error.message);
        else if (result.data) {
          setFactorId(result.data.id);
          setEnrollment({ id: result.data.id, qrCode: result.data.totp.qr_code, secret: result.data.totp.secret });
        }
      }
      setBusy(false);
    }
    void prepare();
    return () => { active = false; };
  }, []);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    const supabase = createSupabaseBrowserClient();
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error || !challenge.data) {
      setError(challenge.error?.message ?? "Unable to start verification."); setBusy(false); return;
    }
    const result = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code });
    if (result.error) { setError("That code could not be verified."); setBusy(false); return; }
    router.replace("/admin"); router.refresh();
  }

  return <form className="admin-form" onSubmit={verify}>
    {error ? <div className="admin-error" role="alert">{error}</div> : null}
    {enrollment ? <div>
      <p>Scan this QR code with your authenticator app, then enter the six-digit code.</p>
      <Image alt="TOTP enrollment QR code" height={220} src={enrollment.qrCode} unoptimized width={220} />
      <p className="admin-help">Manual key: <span className="admin-code">{enrollment.secret}</span></p>
    </div> : <p>{busy ? "Preparing verification…" : "Enter the current code from your authenticator app."}</p>}
    <div className="admin-field"><label htmlFor="code">Authentication code</label><input autoComplete="one-time-code" id="code" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} required /></div>
    <button className="admin-button" disabled={busy || code.length !== 6 || !factorId} type="submit">Verify</button>
  </form>;
}
