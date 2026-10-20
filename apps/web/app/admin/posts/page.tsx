import Link from "next/link";
import { getAdminPosts } from "@/lib/admin-blog";
import { requireCmsUser } from "@/lib/cms-auth";
import { archivePostAction } from "./actions";

export default async function AdminPostsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; archived?: string }> }) {
  await requireCmsUser();
  const query = await searchParams;
  const q = query.q?.trim().toLowerCase() ?? "";
  const status = query.status ?? "all";
  const posts = (await getAdminPosts()).filter(post => (!q || `${post.title} ${post.slug}`.toLowerCase().includes(q)) && (status === "all" || post.status === status));
  return <main className="admin-main">
    <div className="admin-heading"><div><h1>Posts</h1><p className="admin-muted">Create, preview, publish, and archive structured articles.</p></div><Link className="admin-button" href="/admin/posts/new">New article</Link></div>
    {query.archived === "1" ? <div className="admin-success" style={{ marginBottom: 16 }}>Article archived and removed from the public blog.</div> : null}
    <form className="admin-card admin-toolbar" method="get"><input className="admin-input" name="q" placeholder="Search title or slug" defaultValue={query.q} /><select className="admin-input" name="status" defaultValue={status}><option value="all">All statuses</option><option value="draft">Drafts</option><option value="published">Published</option><option value="archived">Archived</option></select><button className="admin-button secondary" type="submit">Filter</button></form>
    <section className="admin-card" style={{ marginTop: 16 }}><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Article</th><th>Status</th><th>Category</th><th>Modified</th><th>Actions</th></tr></thead><tbody>
      {posts.map(post => <tr key={post.id}><td><strong>{post.title}</strong><br /><span className="admin-muted">/{post.slug}</span></td><td><span className={`admin-badge ${post.status}`}>{post.status}</span></td><td>{post.category_slug.toUpperCase()}</td><td>{new Date(post.date_modified).toLocaleDateString("en", { dateStyle: "medium" })}</td><td><div className="admin-actions"><Link href={`/admin/posts/${post.id}/edit`}>Edit</Link><Link href={`/admin/posts/${post.id}/preview`} target="_blank">Preview</Link>{post.status !== "archived" ? <form action={archivePostAction}><input name="id" type="hidden" value={post.id} /><input name="revision" type="hidden" value={post.revision} /><button className="admin-link-button" type="submit">Archive</button></form> : null}</div></td></tr>)}
      {posts.length === 0 ? <tr><td colSpan={5}>No posts match this filter.</td></tr> : null}
    </tbody></table></div></section>
  </main>;
}
