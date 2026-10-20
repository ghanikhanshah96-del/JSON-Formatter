import Link from "next/link";
import type { ReactNode } from "react";
import { getCmsUser } from "@/lib/cms-auth";
import "./admin.css";

export const metadata = { title: "Editorial dashboard", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCmsUser();
  return <div className="admin-shell">
    <header className="admin-topbar">
      <Link className="admin-brand" href={user ? "/admin" : "/"}>CodeFormatterTools Editorial</Link>
      {user ? <nav className="admin-nav" aria-label="Dashboard">
        <Link href="/admin/posts">Posts</Link>
        <Link href="/admin/media">Media</Link>
        {user.role === "owner" ? <Link href="/admin/users">Users</Link> : null}
        {user.role === "owner" ? <Link href="/admin/audit">Audit</Link> : null}
        <Link href="/blog" target="_blank">View site</Link>
        <form action="/admin/logout" method="post"><button className="admin-link-button" type="submit">Sign out</button></form>
      </nav> : null}
    </header>
    {children}
  </div>;
}
