import { getAdminProfiles } from "@/lib/admin-blog";
import { requireCmsUser } from "@/lib/cms-auth";
import { inviteUserAction, updateUserAction } from "./actions";

export default async function UsersPage() {
  await requireCmsUser({ owner: true }); const profiles = await getAdminProfiles();
  return <main className="admin-main"><div className="admin-heading"><div><h1>Users</h1><p className="admin-muted">Only invited users can access the dashboard. MFA is required after sign-in.</p></div></div>
    <form action={inviteUserAction} className="admin-card admin-form"><h2>Invite user</h2><div className="admin-grid"><div className="admin-field"><label>Email</label><input name="email" type="email" required /></div><div className="admin-field"><label>Display name</label><input name="displayName" required /></div><div className="admin-field"><label>Role</label><select name="role"><option value="editor">Editor</option><option value="owner">Owner</option></select></div></div><button className="admin-button" type="submit">Send invite</button></form>
    <section className="admin-card" style={{ marginTop: 18 }}><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Role and access</th><th>Save</th></tr></thead><tbody>{profiles.map(profile => <tr key={profile.user_id}><td><strong>{profile.display_name}</strong><br /><span className="admin-muted">{profile.email}</span></td><td><form action={updateUserAction} className="admin-actions"><input name="userId" type="hidden" value={profile.user_id} /><select className="admin-input" name="role" defaultValue={profile.role}><option value="editor">Editor</option><option value="owner">Owner</option></select><select className="admin-input" name="active" defaultValue={String(profile.active)}><option value="true">Active</option><option value="false">Inactive</option></select><button className="admin-button secondary" type="submit">Update</button></form></td><td>{profile.active ? "Active" : "Inactive"}</td></tr>)}</tbody></table></div></section>
  </main>;
}
