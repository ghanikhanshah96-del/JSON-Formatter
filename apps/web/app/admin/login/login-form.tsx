"use client";

import { useActionState } from "react";
import { loginAction, magicLinkAction } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { error: "" });
  const [magicState, magicAction, magicPending] = useActionState(magicLinkAction, { error: "", message: "" });
  return <>
  <form action={action} className="admin-form">
    {state.error ? <div className="admin-error" role="alert">{state.error}</div> : null}
    <div className="admin-field"><label htmlFor="email">Email</label><input autoComplete="email" id="email" name="email" type="email" required /></div>
    <div className="admin-field"><label htmlFor="password">Password</label><input autoComplete="current-password" id="password" name="password" type="password" required /></div>
    <button className="admin-button" disabled={pending} type="submit">{pending ? "Signing in…" : "Sign in"}</button>
  </form>
  <hr />
  <form action={magicAction} className="admin-form">
    <p className="admin-muted">Or request a secure email link for an existing invited account.</p>
    {magicState.error ? <div className="admin-error" role="alert">{magicState.error}</div> : null}
    {magicState.message ? <div className="admin-success" role="status">{magicState.message}</div> : null}
    <div className="admin-field"><label htmlFor="magic-email">Email</label><input autoComplete="email" id="magic-email" name="email" type="email" required /></div>
    <button className="admin-button secondary" disabled={magicPending} type="submit">{magicPending ? "Sending…" : "Email sign-in link"}</button>
  </form>
  </>;
}
