import { redirect } from "next/navigation";
import { getCmsUser } from "@/lib/cms-auth";
import { MfaForm } from "./mfa-form";

export default async function MfaPage() {
  const user = await getCmsUser();
  if (!user) redirect("/admin/login");
  if (!user.passwordSet) redirect("/admin/account");
  if (user.aal === "aal2") redirect("/admin");
  return <main className="admin-main"><section className="admin-card admin-login">
    <h1>Secure your account</h1>
    <p className="admin-muted">Multi-factor authentication is required before accessing editorial content.</p>
    <MfaForm />
  </section></main>;
}
