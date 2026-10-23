import { redirect } from "next/navigation";
import { getCmsUser } from "@/lib/cms-auth";
import { PasswordForm } from "./password-form";

export default async function AccountSetupPage() {
  const user = await getCmsUser();
  if (!user) redirect("/admin/login");
  if (user.passwordSet) redirect(user.aal === "aal2" ? "/admin" : "/admin/mfa");
  return <main className="admin-main"><section className="admin-card admin-login"><h1>Set your dashboard password</h1><p className="admin-muted">Use a unique password. You will enroll or verify your authenticator next.</p><PasswordForm /></section></main>;
}
