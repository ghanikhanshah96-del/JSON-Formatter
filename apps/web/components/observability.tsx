import { ObservabilityLoader } from "./observability-loader";

const analyticsEnabled =
  process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true" ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";

/** Server gate — keeps analytics client chunk off local/production-without-Vercel builds. */
export function Observability() {
  if (!analyticsEnabled) return null;
  return <ObservabilityLoader />;
}
