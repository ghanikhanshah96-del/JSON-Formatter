import { categories, tools } from "@codeformattools/tool-registry";
import { BlogPostEditor } from "@/components/admin/blog-post-editor";
import { requireCmsUser } from "@/lib/cms-auth";

export default async function NewPostPage() {
  await requireCmsUser();
  const today = new Date().toISOString().slice(0, 10);
  return <main className="admin-main">
    <div className="admin-heading"><div><h1>New article</h1><p className="admin-muted">Paste a complete document, add its cover image, review the generated preview, and publish in the standard blog format.</p></div></div>
    <BlogPostEditor
      categoryOptions={categories.map(item => ({ id: item.id, name: item.name.replace(/ tools$/i, "") }))}
      toolOptions={tools.map(item => ({ id: item.id, name: item.name }))}
      initialValue={{ expectedRevision: 0, slug: "", title: "", metaTitle: "", description: "", eyebrow: "JSON · GUIDE", category: "json", authorId: "codeformattertools-editorial", datePublished: today, relatedTools: [], readMinutes: 1, image: "", imageAlt: "", imagePosition: "center center", intro: [""], sections: [{ heading: "", blocks: [{ type: "paragraph", text: "" }] }], faqs: [], noindex: false, changeSummary: "", status: "draft" }}
    />
  </main>;
}
