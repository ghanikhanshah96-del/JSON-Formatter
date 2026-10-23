import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { getAdminProfiles } from "@/lib/admin-blog";
import { requireCmsUser } from "@/lib/cms-auth";
import { inviteUserAction, restoreUserAccessAction, revokeUserAccessAction, updateUserAction } from "./actions";

export default async function UsersPage() {
  const currentUser = await requireCmsUser({ owner: true });
  const profiles = await getAdminProfiles();

  return <main className="admin-main">
    <div className="admin-heading"><div>
      <h1>Users and access</h1>
      <p className="admin-muted">Owners manage invitations and roles. Editors can manage posts and their own unused media. Password setup and MFA are mandatory.</p>
    </div></div>

    <form action={inviteUserAction} className="admin-card admin-form">
      <h2>Invite user</h2>
      <div className="admin-grid">
        <div className="admin-field"><label htmlFor="invite-email">Email</label><input id="invite-email" name="email" type="email" required /></div>
        <div className="admin-field"><label htmlFor="invite-name">Display name</label><input id="invite-name" name="displayName" required /></div>
        <div className="admin-field"><label htmlFor="invite-role">Role</label><select id="invite-role" name="role"><option value="editor">Editor</option><option value="owner">Owner</option></select></div>
      </div>
      <button className="admin-button" type="submit">Send invite</button>
    </form>

    <section className="admin-card admin-users-card">
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>User</th><th>Security</th><th>Role</th><th>Access</th><th>Actions</th></tr></thead>
        <tbody>{profiles.map(profile => {
          const isSelf = profile.user_id === currentUser.id;
          return <tr key={profile.user_id}>
            <td><strong>{profile.display_name}</strong>{isSelf ? <span className="admin-badge admin-self-badge">You</span> : null}<br /><span className="admin-muted">{profile.email}</span></td>
            <td><span className={`admin-badge ${profile.password_set_at ? "ready" : "pending"}`}>{profile.password_set_at ? "Password set" : "Setup pending"}</span></td>
            <td><form action={updateUserAction} className="admin-actions">
              <input name="userId" type="hidden" value={profile.user_id} />
              <input name="active" type="hidden" value={String(profile.active)} />
              <select aria-label={`Role for ${profile.display_name}`} className="admin-input" name="role" defaultValue={profile.role} disabled={isSelf}>
                <option value="editor">Editor</option><option value="owner">Owner</option>
              </select>
              {isSelf ? <input name="role" type="hidden" value="owner" /> : null}
              <button className="admin-button secondary" type="submit">Save role</button>
            </form></td>
            <td><span className={`admin-badge ${profile.active ? "ready" : "revoked"}`}>{profile.active ? "Active" : "Revoked"}</span></td>
            <td>{profile.active ? <form action={revokeUserAccessAction}>
              <input name="userId" type="hidden" value={profile.user_id} /><input name="role" type="hidden" value={profile.role} />
              <ConfirmSubmitButton className="admin-button danger" disabled={isSelf} message={`Revoke dashboard access for ${profile.display_name}? Their existing session will stop working on the next request.`}>{isSelf ? "Protected" : "Revoke access"}</ConfirmSubmitButton>
            </form> : <form action={restoreUserAccessAction}>
              <input name="userId" type="hidden" value={profile.user_id} /><input name="role" type="hidden" value={profile.role} />
              <ConfirmSubmitButton className="admin-button secondary" message={`Restore dashboard access for ${profile.display_name}?`}>Restore access</ConfirmSubmitButton>
            </form>}</td>
          </tr>;
        })}</tbody>
      </table></div>
    </section>
  </main>;
}
