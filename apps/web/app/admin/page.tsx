import Link from "next/link";
import { getAdminAssets, getAdminPosts } from "@/lib/admin-blog";
import { requireCmsUser } from "@/lib/cms-auth";

export default async function AdminDashboardPage() {
  const user = await requireCmsUser();
  const [posts, assets] = await Promise.all([getAdminPosts(), getAdminAssets()]);
  const published = posts.filter(post => post.status === "published").length;
  const drafts = posts.filter(post => post.status === "draft").length;
  return <main className="admin-main">
    <div className="admin-heading"><div><h1>Dashboard</h1><p className="admin-muted">Welcome back, {user.displayName}.</p></div><Link className="admin-button" href="/admin/posts/new">New article</Link></div>
    <div className="admin-grid">
      <div className="admin-card admin-stat"><strong>{published}</strong><span className="admin-muted">Published articles</span></div>
      <div className="admin-card admin-stat"><strong>{drafts}</strong><span className="admin-muted">Drafts</span></div>
      <div className="admin-card admin-stat"><strong>{assets.length}</strong><span className="admin-muted">Media assets</span></div>
    </div>
    <section className="admin-card" style={{ marginTop: 20 }}><div className="admin-heading"><div><h2>Recently modified</h2></div><Link href="/admin/posts">View all posts</Link></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Article</th><th>Status</th><th>Modified</th><th /></tr></thead><tbody>
        {posts.slice(0, 8).map(post => <tr key={post.id}><td><strong>{post.title}</strong><br /><span className="admin-muted">/{post.slug}</span></td><td><span className={`admin-badge ${post.status}`}>{post.status}</span></td><td>{new Date(post.date_modified).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</td><td><Link href={`/admin/posts/${post.id}/edit`}>Edit</Link></td></tr>)}
      </tbody></table></div>
    </section>
  </main>;
}
