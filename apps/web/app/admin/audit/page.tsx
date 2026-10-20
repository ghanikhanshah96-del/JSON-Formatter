import { getAdminAudit } from "@/lib/admin-blog";
import { requireCmsUser } from "@/lib/cms-auth";

export default async function AuditPage() {
  await requireCmsUser({ owner: true }); const events = await getAdminAudit();
  return <main className="admin-main"><div className="admin-heading"><div><h1>Audit history</h1><p className="admin-muted">The latest 200 editorial and account events.</p></div></div><section className="admin-card"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>{events.map(event => {
    const profile = event.profiles as unknown as { display_name?: string; email?: string } | null;
    return <tr key={event.id}><td>{new Date(event.created_at).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</td><td>{profile?.display_name ?? profile?.email ?? "Unknown"}</td><td>{event.action}</td><td>{event.entity_type}<br /><span className="admin-muted">{event.entity_id}</span></td><td><code>{JSON.stringify(event.metadata)}</code></td></tr>;
  })}</tbody></table></div></section></main>;
}
