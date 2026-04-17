import { ROLE_TOOLS, ALL_TOOLS } from "../constants";

export default function AdminPortal({
  adminUsers, adminLoading,
  inviteModal, setInviteModal,
  inviteForm, setInviteForm,
  inviteBusy, inviteError, setInviteError,
  doInviteUser,
  editingUser, setEditingUser,
  editUserForm, setEditUserForm,
  editUserBusy,
  doUpdateUser,
  setActivePortal,
}) {
  return (
    <div>
      {/* ── Admin portal ── */}
      <div style={{ padding: "20px 60px", borderBottom: "1.5px solid #e8e8e8", display: "flex", alignItems: "center", gap: 16, background: "white" }}>
        <button onClick={() => setActivePortal(null)} style={{ background: "none", border: "none", fontSize: 13, color: "#888", cursor: "pointer", padding: "6px 0", fontWeight: 600 }}>← Back</button>
        <div style={{ width: 1, height: 18, background: "#e0e0e0" }} />
        <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e" }}>Admin Portal</div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setInviteModal(true)} style={{ background: "#1a1a2e", color: "#D7FA06", border: "none", padding: "10px 22px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", letterSpacing: "0.04em" }}>+ Invite User</button>
      </div>
      <div style={{ padding: "36px 60px" }}>
        {adminLoading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#aaa", fontSize: 14 }}>Loading...</div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20 }}>
              {adminUsers.length} team member{adminUsers.length !== 1 ? "s" : ""}. Click any user to edit their role and tool access.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {adminUsers.map(u => {
                const effectiveTools = (() => {
                  const base = new Set(ROLE_TOOLS[u.role] || []);
                  for (const t of (u.tool_overrides || [])) { if (t.granted) base.add(t.tool_key); else base.delete(t.tool_key); }
                  return base;
                })();
                return (
                  <div key={u.id} onClick={() => {
                    setEditingUser(u);
                    const form = { ...u };
                    for (const { key } of ALL_TOOLS) {
                      const defaultOn = (ROLE_TOOLS[u.role] || []).includes(key);
                      const override = (u.tool_overrides || []).find(t => t.tool_key === key);
                      form[`tool_${key}`] = override ? override.granted : defaultOn;
                    }
                    setEditUserForm(form);
                  }} style={{ background: "white", borderRadius: 12, padding: "18px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1.5px solid #e8e8e8", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1a1a2e", color: "#D7FA06", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                      {(u.name || u.email || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{u.name || <span style={{ color: "#aaa", fontWeight: 400 }}>No name</span>}</div>
                      <div style={{ fontSize: 12, color: "#888" }}>{u.email}{u.job_title ? ` · ${u.job_title}` : ""}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span style={{ background: u.role === "admin" ? "#1a1a2e" : "#f0f0ee", color: u.role === "admin" ? "#D7FA06" : "#555", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{u.role}</span>
                      {u.status === "inactive" && <span style={{ background: "#ffe5e5", color: "#c00", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>Inactive</span>}
                      {ALL_TOOLS.filter(t => effectiveTools.has(t.key)).map(t => (
                        <span key={t.key} style={{ background: "#f5fbda", color: "#5a7a00", border: "1px solid #D7FA06", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{t.label}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Invite User Modal ── */}
      {inviteModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setInviteModal(false)}>
          <div style={{ background: "white", borderRadius: 14, width: 420, padding: 32, boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Invite Team Member</div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 24 }}>They'll get an email with a link to access the app.</div>
            <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, display: "block", marginBottom: 4 }}>Email *</label>
            <input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="teammate@example.com" style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
            <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, display: "block", marginBottom: 4 }}>Name</label>
            <input type="text" value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
            <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, display: "block", marginBottom: 4 }}>Job Title</label>
            <input type="text" value={inviteForm.job_title} onChange={e => setInviteForm(f => ({ ...f, job_title: e.target.value }))} placeholder="Social Media Manager" style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
            <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, display: "block", marginBottom: 4 }}>Role</label>
            <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 20, background: "white" }}>
              <option value="smm">SMM (Social Media Manager)</option>
              <option value="account_manager">Account Manager</option>
              <option value="graphic_designer">Graphic Designer</option>
              <option value="content_creator">Content Creator</option>
              <option value="videographer">Videographer</option>
              <option value="video_editor">Video Editor</option>
              <option value="public_relations">Public Relations</option>
              <option value="client">Client</option>
              <option value="admin">Admin</option>
            </select>
            {inviteError && <div style={{ fontSize: 12, color: "#E8001C", marginBottom: 12 }}>{inviteError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={doInviteUser} disabled={inviteBusy || !inviteForm.email.trim()} style={{ flex: 1, padding: "11px 0", background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: inviteBusy || !inviteForm.email.trim() ? "default" : "pointer", opacity: inviteForm.email.trim() ? 1 : 0.4 }}>
                {inviteBusy ? "Sending..." : "Send Invite"}
              </button>
              <button onClick={() => { setInviteModal(false); setInviteError(""); }} style={{ padding: "11px 16px", background: "#f0f0f0", color: "#555", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editingUser && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setEditingUser(null)}>
          <div style={{ background: "white", borderRadius: 14, width: 460, padding: 32, boxShadow: "0 24px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 2 }}>{editingUser.name || editingUser.email}</div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 24 }}>{editingUser.email}</div>
            <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, display: "block", marginBottom: 4 }}>Name</label>
            <input value={editUserForm.name || ""} onChange={e => setEditUserForm(f => ({ ...f, name: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
            <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, display: "block", marginBottom: 4 }}>Job Title</label>
            <input value={editUserForm.job_title || ""} onChange={e => setEditUserForm(f => ({ ...f, job_title: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
            <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, display: "block", marginBottom: 4 }}>Role</label>
            <select value={editUserForm.role || "smm"} onChange={e => setEditUserForm(f => ({ ...f, role: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 14, background: "white" }}>
              <option value="smm">SMM (Social Media Manager)</option>
              <option value="account_manager">Account Manager</option>
              <option value="graphic_designer">Graphic Designer</option>
              <option value="content_creator">Content Creator</option>
              <option value="videographer">Videographer</option>
              <option value="video_editor">Video Editor</option>
              <option value="public_relations">Public Relations</option>
              <option value="client">Client</option>
              <option value="admin">Admin</option>
            </select>
            <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, display: "block", marginBottom: 4 }}>Status</label>
            <select value={editUserForm.status || "active"} onChange={e => setEditUserForm(f => ({ ...f, status: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 20, background: "white" }}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 10 }}>Tool Access</div>
            <div style={{ background: "#f8f8f6", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
              {ALL_TOOLS.map(({ key, label }) => {
                const defaultOn = (ROLE_TOOLS[editUserForm.role] || []).includes(key);
                const isChecked = editUserForm[`tool_${key}`] ?? defaultOn;
                const isOverride = isChecked !== defaultOn;
                return (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: "pointer" }}>
                    <input type="checkbox" checked={isChecked} onChange={e => setEditUserForm(f => ({ ...f, [`tool_${key}`]: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{label}</span>
                    {defaultOn && !isOverride && <span style={{ fontSize: 10, color: "#aaa", marginLeft: "auto" }}>role default</span>}
                    {isOverride && <span style={{ fontSize: 10, color: isChecked ? "#5a7a00" : "#E8001C", marginLeft: "auto", fontWeight: 700 }}>{isChecked ? "granted" : "revoked"} (override)</span>}
                  </label>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={doUpdateUser} disabled={editUserBusy} style={{ flex: 1, padding: "11px 0", background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: editUserBusy ? "default" : "pointer" }}>
                {editUserBusy ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => setEditingUser(null)} style={{ padding: "11px 16px", background: "#f0f0f0", color: "#555", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
