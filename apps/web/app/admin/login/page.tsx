import { redirect } from "next/navigation";
import { getCmsUser } from "@/lib/cms-auth";
import { LoginForm } from "./login-form";

export default async function AdminLoginPage() {
  if (await getCmsUser()) redirect("/admin");
  return <main className="admin-main"><section className="admin-card admin-login">
    <h1>Editorial sign in</h1>
    <p className="admin-muted">This dashboard is for invited CodeFormatterTools editors.</p>
    <LoginForm />
  </section></main>;
}
