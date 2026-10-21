import { redirect } from "next/navigation";

type AuthSessionSearchParams = {
  code?: string;
  error?: string;
  error_code?: string;
  next?: string;
};

function safeAdminDestination(value?: string) {
  return value && (value === "/admin" || value.startsWith("/admin/")) && !value.startsWith("//")
    ? value
    : undefined;
}

export default async function AuthSessionPage({
  searchParams,
}: {
  searchParams: Promise<AuthSessionSearchParams>;
}) {
  const params = await searchParams;

  if (params.error || params.error_code) {
    redirect("/admin/login?error=invalid_or_expired_link");
  }

  if (params.code) {
    const callbackParams = new URLSearchParams({ code: params.code });
    const destination = safeAdminDestination(params.next);
    if (destination) callbackParams.set("next", destination);
    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  return (
    <main className="admin-main">
      <section className="admin-card admin-login" aria-live="polite">
        <h1>Completing sign in</h1>
        <p className="admin-muted">Please wait while we securely open your editorial account.</p>
      </section>
    </main>
  );
}
