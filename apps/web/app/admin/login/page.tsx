import { redirect } from "next/navigation";
import { getCmsUser } from "@/lib/cms-auth";
import { LoginForm } from "./login-form";

const loginErrors: Record<string, string> = {
  invalid_or_expired_link: "That sign-in link is invalid or has expired. Request a new link below."
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCmsUser()) redirect("/admin");
  const { error } = await searchParams;
  return <main className="admin-main"><section className="admin-card admin-login">
    <h1>Editorial sign in</h1>
    <p className="admin-muted">This dashboard is for invited CodeFormatterTools editors.</p>
    {error && loginErrors[error] ? <div className="admin-error" role="alert">{loginErrors[error]}</div> : null}
    <LoginForm />
  </section></main>;
}
