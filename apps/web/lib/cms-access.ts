import type { CmsRole } from "./cms-auth";

export type CmsAccessUser = { role: CmsRole; aal: "aal1" | "aal2"; passwordSet: boolean } | null;
export type CmsAccessResult = "allowed" | "login" | "password" | "mfa" | "owner";

export function evaluateCmsAccess(
  user: CmsAccessUser,
  options: { owner?: boolean; mfa?: boolean } = {}
): CmsAccessResult {
  if (!user) return "login";
  if (!user.passwordSet) return "password";
  if (options.mfa !== false && user.aal !== "aal2") return "mfa";
  if (options.owner && user.role !== "owner") return "owner";
  return "allowed";
}

export function canDeleteMedia(role: CmsRole, userId: string, createdBy: string) {
  return role === "owner" || userId === createdBy;
}
