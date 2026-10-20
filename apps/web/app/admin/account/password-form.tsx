"use client";

import { useActionState } from "react";
import { updatePasswordAction } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, { error: "" });
  return <form action={action} className="admin-form">
    {state.error ? <div className="admin-error" role="alert">{state.error}</div> : null}
    <div className="admin-field"><label htmlFor="new-password">New password</label><input autoComplete="new-password" id="new-password" minLength={12} name="password" type="password" required /></div>
    <div className="admin-field"><label htmlFor="confirm-password">Confirm password</label><input autoComplete="new-password" id="confirm-password" minLength={12} name="confirmation" type="password" required /></div>
    <button className="admin-button" disabled={pending} type="submit">{pending ? "Saving…" : "Save password and continue"}</button>
  </form>;
}
