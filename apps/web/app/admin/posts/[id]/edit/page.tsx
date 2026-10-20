import { notFound } from "next/navigation";
import { categories, tools } from "@codeformattools/tool-registry";
import { BlogPostEditor } from "@/components/admin/blog-post-editor";
import { getAdminPost } from "@/lib/admin-blog";
import { requireCmsUser } from "@/lib/cms-auth";

export default async function EditPostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireCmsUser();
  const post = await getAdminPost((await params).id);
  if (!post) notFound();
  return <main className="admin-main">
    <div className="admin-heading"><div><h1>Edit article</h1><p className="admin-muted">Revision {post.expectedRevision}. Drafts autosave after a short pause.</p></div></div>
    {(await searchParams).saved === "1" ? <div className="admin-success" style={{ marginBottom: 16 }}>Draft saved.</div> : null}
    <BlogPostEditor initialValue={post} categoryOptions={categories.map(item => ({ id: item.id, name: item.name.replace(/ tools$/i, "") }))} toolOptions={tools.map(item => ({ id: item.id, name: item.name }))} />
  </main>;
}
