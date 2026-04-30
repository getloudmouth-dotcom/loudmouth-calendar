import { useState, useEffect } from "react";
import { ROLE_TOOLS, ALL_TOOLS } from "../constants";

import { SANS, MONO, DISP, C, PAGE_HEADER, PAGE_TITLE } from "../theme";

const ROLES = [
  { key: "admin",           label: "Admin" },
  { key: "smm",             label: "SMM" },
  { key: "account_manager", label: "Account Manager" },
  { key: "graphic_designer",label: "Graphic Designer" },
  { key: "content_creator", label: "Content Creator" },
  { key: "videographer",    label: "Videographer" },
  { key: "video_editor",    label: "Video Editor" },
  { key: "public_relations",label: "Public Relations" },
];

function SectionHeader({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <span style={{ fontFamily: MONO, fontSize: 10, color: C.meta, textTransform: "uppercase", letterSpacing: "1.8px", whiteSpace: "nowrap" }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 10, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 6 }}>{children}</div>
  );
}

function Input({ style, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: "100%", padding: "10px 12px",
        background: C.canvas, color: C.text,
        border: `1.5px solid ${C.border}`, borderRadius: 8,
        fontSize: 13, fontFamily: SANS, outline: "none",
        boxSizing: "border-box", marginBottom: 14,
        ...style,
      }}
    />
  );
}

function Select({ style, children, ...props }) {
  return (
    <select
      {...props}
      style={{
        width: "100%", padding: "10px 12px",
        background: C.canvas, color: C.text,
        border: `1.5px solid ${C.border}`, borderRadius: 8,
        fontSize: 13, fontFamily: SANS, outline: "none",
        boxSizing: "border-box", marginBottom: 14,
        ...style,
      }}
    >
      {children}
    </select>
  );
}

const TEAM_QUIPS = [
  "flying solo.",
  "a dynamic duo.",
  "a trio of chaos.",
  "a squad is forming.",
  "five and thriving.",
  "the six-pack is complete.",
  "lucky number seven.",
  "eight is great.",
  "almost in the double digits.",
  "double digits. let's go.",
  "one past ten and still winning.",
  "a full dozen.",
  "unlucky for some, not for you.",
  "two weeks' worth of people.",
  "a proper crew.",
];

export default function AdminPortal({
  adminUsers, adminLoading,
  roleToolDefaults, rolePermsBusy, saveRoleToolDefaults,
  inviteModal, setInviteModal,
  inviteForm, setInviteForm,
  inviteBusy, inviteError, setInviteError,
  doInviteUser,
  editingUser, setEditingUser,
  editUserForm, setEditUserForm,
  editUserBusy,
  doUpdateUser,
  doDeleteUser, deleteUserBusy, currentUserId,
  setActivePortal,
  initialTab,
  clients,
  toggleClientSmmActive,
}) {
  const [tab, setTab] = useState(initialTab ?? "team");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localPerms, setLocalPerms] = useState(null);
  const [permsDirty, setPermsDirty] = useState(false);

  useEffect(() => {
    if (roleToolDefaults && !localPerms) setLocalPerms(roleToolDefaults);
  }, [roleToolDefaults]);

  function togglePerm(role, toolKey) {
    setLocalPerms(prev => {
      const current = prev?.[role] || [];
      const has = current.includes(toolKey);
      return { ...prev, [role]: has ? current.filter(k => k !== toolKey) : [...current, toolKey] };
    });
    setPermsDirty(true);
  }

  function handleSavePerms() {
    saveRoleToolDefaults(localPerms).then(() => setPermsDirty(false));
  }

  const effectivePerms = localPerms ?? roleToolDefaults ?? ROLE_TOOLS;

  return (
    <div style={{ minHeight: "100vh", background: C.canvas, fontFamily: SANS }}>

      {/* ── Header ── */}
      <div style={PAGE_HEADER}>
        <div style={PAGE_TITLE}>Admin Portal</div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 44px", borderBottom: `1px solid ${C.border}`, background: C.canvas }}>
        {[
          { key: "team",    label: "Team" },
          { key: "roles",   label: "Role Perms" },
          { key: "clients", label: "Clients" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: "none", border: "none", borderBottom: tab === t.key ? `2px solid ${C.accent}` : "2px solid transparent",
              padding: "12px 4px", marginBottom: -1, cursor: "pointer",
              fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px",
              color: tab === t.key ? C.accent : C.meta, transition: "color 0.12s",
            }}
            onMouseEnter={e => { if (tab !== t.key) e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { if (tab !== t.key) e.currentTarget.style.color = C.meta; }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Team tab ── */}
      {tab === "team" && (
        <div style={{ padding: "40px 48px" }}>
          {adminLoading ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: C.meta, fontFamily: MONO, fontSize: 12, letterSpacing: "1px" }}>Loading...</div>
          ) : (
            <div>
              <SectionHeader>{TEAM_QUIPS[adminUsers.length - 1] || "the team"}</SectionHeader>
              <div style={{ fontFamily: MONO, fontSize: 10, color: C.meta, letterSpacing: "1px", marginTop: -10, marginBottom: 2, textAlign: "right" }}>
                {adminUsers.length} team member{adminUsers.length !== 1 ? "s" : ""} · click any to edit
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {adminUsers.map(u => {
                  const roleDefaults = effectivePerms[u.role] || [];
                  const effectiveTools = (() => {
                    const base = new Set(roleDefaults);
                    for (const t of (u.tool_overrides || [])) { if (t.granted) base.add(t.tool_key); else base.delete(t.tool_key); }
                    return base;
                  })();
                  const isInvited = u.status === "invited";
                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        setEditingUser(u);
                        setConfirmDelete(false);
                        const form = { ...u };
                        for (const { key } of ALL_TOOLS) {
                          const defaultOn = roleDefaults.includes(key);
                          const override = (u.tool_overrides || []).find(t => t.tool_key === key);
                          form[`tool_${key}`] = override ? override.granted : defaultOn;
                        }
                        setEditUserForm(form);
                      }}
                      style={{
                        background: C.surface, borderRadius: 12, padding: "16px 20px",
                        border: `1px solid ${C.border}`, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 14,
                        opacity: isInvited ? 0.5 : 1, transition: "border-color 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                        background: isInvited ? "rgba(255,255,255,0.06)" : C.accent,
                        color: isInvited ? C.meta : "#111",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, fontSize: 15,
                      }}>
                        {(u.name || u.email || "?")[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{u.name || <span style={{ color: C.meta, fontWeight: 400 }}>No name</span>}</div>
                        <div style={{ fontSize: 11, color: C.meta, marginTop: 2 }}>{u.email}{u.job_title ? ` · ${u.job_title}` : ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: 5, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <span style={{
                          background: u.role === "admin" ? C.accent : "rgba(255,255,255,0.08)",
                          color: u.role === "admin" ? "#111" : C.meta,
                          borderRadius: 6, padding: "3px 9px",
                          fontFamily: MONO, fontSize: 9, fontWeight: 700,
                          textTransform: "uppercase", letterSpacing: "0.8px",
                        }}>{u.role}</span>
                        {isInvited && <span style={{ background: "rgba(255,255,255,0.06)", color: C.meta, borderRadius: 6, padding: "3px 9px", fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.8px" }}>Invite Sent</span>}
                        {u.status === "inactive" && <span style={{ background: "rgba(232,0,28,0.15)", color: C.error, borderRadius: 6, padding: "3px 9px", fontFamily: MONO, fontSize: 9, fontWeight: 700 }}>Inactive</span>}
                        {!isInvited && ALL_TOOLS.filter(t => effectiveTools.has(t.key)).map(t => (
                          <span key={t.key} style={{ background: "rgba(204,255,0,0.1)", color: C.accent, border: `1px solid rgba(204,255,0,0.25)`, borderRadius: 6, padding: "3px 9px", fontFamily: MONO, fontSize: 9, fontWeight: 600 }}>{t.label}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Dotted invite card */}
                <div
                  onClick={() => setInviteModal(true)}
                  style={{ borderRadius: 12, padding: "20px", border: "1px dashed rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", transition: "all 0.15s", color: C.meta }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = C.meta; }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px" }}>Invite New Member</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Role Permissions tab ── */}
      {tab === "roles" && (
        <div style={{ padding: "40px 48px" }}>
          <SectionHeader>Role Permissions</SectionHeader>
          <div style={{ fontSize: 12, color: C.meta, marginBottom: 24 }}>
            Set which portals each role can access by default. Individual overrides still take priority.
          </div>
          {!localPerms ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: C.meta, fontFamily: MONO, fontSize: 12, letterSpacing: "1px" }}>Loading…</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 600, background: C.surface, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
                <thead>
                  <tr style={{ background: C.canvas }}>
                    <th style={{ padding: "14px 20px", textAlign: "left", fontFamily: MONO, fontSize: 9, color: C.meta, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", width: 180, borderBottom: `1px solid ${C.border}` }}>Role</th>
                    {ALL_TOOLS.map(t => (
                      <th key={t.key} style={{ padding: "14px 16px", textAlign: "center", fontFamily: MONO, fontSize: 9, color: C.accent, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}` }}>{t.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map((r, ri) => (
                    <tr key={r.key} style={{ borderTop: ri === 0 ? "none" : `1px solid rgba(255,255,255,0.06)` }}>
                      <td style={{ padding: "14px 20px", fontWeight: 700, fontSize: 13, color: C.text, whiteSpace: "nowrap", fontFamily: SANS }}>{r.label}</td>
                      {ALL_TOOLS.map(t => {
                        const checked = (effectivePerms[r.key] || []).includes(t.key);
                        return (
                          <td key={t.key} style={{ padding: "14px 16px", textAlign: "center" }}>
                            <input type="checkbox" checked={checked} onChange={() => togglePerm(r.key, t.key)} style={{ width: 16, height: 16, cursor: "pointer", accentColor: C.accent }} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {permsDirty && (
            <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={handleSavePerms} disabled={rolePermsBusy} style={{ background: C.accent, color: "#111", border: "none", padding: "10px 24px", borderRadius: 8, fontFamily: MONO, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", cursor: rolePermsBusy ? "default" : "pointer", opacity: rolePermsBusy ? 0.6 : 1 }}>
                {rolePermsBusy ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => { setLocalPerms(roleToolDefaults); setPermsDirty(false); }} style={{ background: "rgba(255,255,255,0.06)", color: C.meta, border: `1px solid ${C.border}`, padding: "10px 18px", borderRadius: 24, fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", cursor: "pointer" }}>Discard</button>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.meta, letterSpacing: "0.5px" }}>Unsaved changes</span>
            </div>
          )}
        </div>
      )}

      {/* ── Clients tab ── */}
      {tab === "clients" && (
        <div style={{ padding: "40px 48px" }}>
          <SectionHeader>Client Visibility</SectionHeader>
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.meta, letterSpacing: "0.8px", marginTop: -10, marginBottom: 24, lineHeight: 1.7 }}>
            Toggle which clients appear in the sidebar SMM workflow.<br />
            Hide one-off or invoicing-only clients that don't need calendars, grids, or scheduled posts.
          </div>
          {(!clients || clients.length === 0) ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: C.meta, fontFamily: MONO, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase" }}>
              No clients yet — add one via Billing
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {clients.map(client => {
                const active = client.smm_active !== false;
                return (
                  <div
                    key={client.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "12px 16px", borderRadius: 10,
                      background: C.surface, border: `1px solid ${C.border}`,
                      opacity: active ? 1 : 0.55, transition: "opacity 0.15s",
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: active ? C.accent : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
                      <span style={{ fontFamily: DISP, fontSize: 14, color: active ? "#000" : C.meta, lineHeight: 1 }}>
                        {(client.name || "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{client.name}</div>
                      {client.company && (
                        <div style={{ fontFamily: MONO, fontSize: 10, color: C.meta, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{client.company}</div>
                      )}
                    </div>
                    <button
                      onClick={() => toggleClientSmmActive(client.id, active)}
                      style={{
                        border: "none", borderRadius: 20, padding: "6px 14px", cursor: "pointer",
                        fontFamily: MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px",
                        background: active ? "rgba(204,255,0,0.15)" : "rgba(255,255,255,0.08)",
                        color: active ? C.accent : C.meta,
                        transition: "background 0.15s, color 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = active ? "rgba(204,255,0,0.25)" : "rgba(255,255,255,0.14)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = active ? "rgba(204,255,0,0.15)" : "rgba(255,255,255,0.08)"; }}
                    >
                      {active ? "SMM Active" : "Hidden"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Invite User Modal ── */}
      {inviteModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setInviteModal(false)}>
          <div style={{ background: C.surface, borderRadius: 14, width: 420, padding: 32, border: `1px solid ${C.border}`, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.accent, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 6 }}>Invite Team Member</div>
            <div style={{ fontSize: 12, color: C.meta, marginBottom: 24 }}>They'll get an email with a link to access the app.</div>
            <Label>Email *</Label>
            <Input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="teammate@example.com" />
            <Label>Name</Label>
            <Input type="text" value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
            <Label>Job Title</Label>
            <Input type="text" value={inviteForm.job_title} onChange={e => setInviteForm(f => ({ ...f, job_title: e.target.value }))} placeholder="Social Media Manager" />
            <Label>Role</Label>
            <Select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
              <option value="smm">SMM (Social Media Manager)</option>
              <option value="account_manager">Account Manager</option>
              <option value="graphic_designer">Graphic Designer</option>
              <option value="content_creator">Content Creator</option>
              <option value="videographer">Videographer</option>
              <option value="video_editor">Video Editor</option>
              <option value="public_relations">Public Relations</option>
              <option value="admin">Admin</option>
            </Select>
            {inviteError && <div style={{ fontSize: 12, color: C.error, marginBottom: 12 }}>{inviteError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={doInviteUser} disabled={inviteBusy || !inviteForm.email.trim()} style={{ flex: 1, padding: "11px 0", background: C.accent, color: "#111", border: "none", borderRadius: 24, fontFamily: MONO, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", cursor: inviteBusy || !inviteForm.email.trim() ? "default" : "pointer", opacity: inviteForm.email.trim() ? 1 : 0.4 }}>
                {inviteBusy ? "Sending..." : "Send Invite"}
              </button>
              <button onClick={() => { setInviteModal(false); setInviteError(""); }} style={{ padding: "11px 16px", background: "rgba(255,255,255,0.06)", color: C.meta, border: `1px solid ${C.border}`, borderRadius: 24, fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editingUser && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) { setEditingUser(null); setConfirmDelete(false); } }}>
          <div style={{ background: C.surface, borderRadius: 14, width: 460, padding: 32, border: `1px solid ${C.border}`, boxShadow: "0 24px 60px rgba(0,0,0,0.5)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontFamily: MONO, fontSize: 13, color: C.accent, textTransform: "uppercase", letterSpacing: "2px", lineHeight: 1, marginBottom: 6 }}>{editingUser.name || editingUser.email}</div>
            <div style={{ fontSize: 12, color: C.meta, lineHeight: 1, marginBottom: 24 }}>{editingUser.email}</div>
            <Label>Name</Label>
            <Input value={editUserForm.name || ""} onChange={e => setEditUserForm(f => ({ ...f, name: e.target.value }))} />
            <Label>Job Title</Label>
            <Input value={editUserForm.job_title || ""} onChange={e => setEditUserForm(f => ({ ...f, job_title: e.target.value }))} />
            <Label>Role</Label>
            <Select value={editUserForm.role || "smm"} onChange={e => setEditUserForm(f => ({ ...f, role: e.target.value }))}>
              <option value="smm">SMM (Social Media Manager)</option>
              <option value="account_manager">Account Manager</option>
              <option value="graphic_designer">Graphic Designer</option>
              <option value="content_creator">Content Creator</option>
              <option value="videographer">Videographer</option>
              <option value="video_editor">Video Editor</option>
              <option value="public_relations">Public Relations</option>
              <option value="admin">Admin</option>
            </Select>
            <Label>Status</Label>
            <Select value={editUserForm.status || "active"} onChange={e => setEditUserForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Label>Tool Access</Label>
            <div style={{ background: C.surface2, borderRadius: 10, padding: "12px 16px", marginBottom: 20, border: `1px solid ${C.border}` }}>
              {ALL_TOOLS.map(({ key, label }) => {
                const roleDefaults = effectivePerms[editUserForm.role] || [];
                const defaultOn = roleDefaults.includes(key);
                const isChecked = editUserForm[`tool_${key}`] ?? defaultOn;
                const isOverride = isChecked !== defaultOn;
                return (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: "pointer" }}>
                    <input type="checkbox" checked={isChecked} onChange={e => setEditUserForm(f => ({ ...f, [`tool_${key}`]: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: C.accent }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: SANS }}>{label}</span>
                    {defaultOn && !isOverride && <span style={{ fontFamily: MONO, fontSize: 9, color: C.meta, marginLeft: "auto", letterSpacing: "0.5px" }}>role default</span>}
                    {isOverride && <span style={{ fontFamily: MONO, fontSize: 9, color: isChecked ? C.accent : C.error, marginLeft: "auto", fontWeight: 700 }}>{isChecked ? "granted" : "revoked"} (override)</span>}
                  </label>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={doUpdateUser} disabled={editUserBusy} style={{ flex: 1, padding: "11px 0", background: C.accent, color: "#111", border: "none", borderRadius: 24, fontFamily: MONO, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", cursor: editUserBusy ? "default" : "pointer" }}>
                {editUserBusy ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => { setEditingUser(null); setConfirmDelete(false); }} style={{ padding: "11px 16px", background: "rgba(255,255,255,0.06)", color: C.meta, border: `1px solid ${C.border}`, borderRadius: 24, fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", cursor: "pointer" }}>Cancel</button>
            </div>

            {editingUser.id !== currentUserId && (
              <div style={{ marginTop: 24, borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{ width: "100%", padding: "10px 0", background: "none", color: C.error, border: `1px solid rgba(232,0,28,0.35)`, borderRadius: 24, fontFamily: MONO, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", cursor: "pointer" }}
                  >Delete User</button>
                ) : (
                  <div style={{ background: "rgba(232,0,28,0.08)", border: `1px solid rgba(232,0,28,0.25)`, borderRadius: 10, padding: "16px" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.error, marginBottom: 4, fontFamily: SANS }}>Are you sure?</div>
                    <div style={{ fontSize: 12, color: C.meta, marginBottom: 14 }}>
                      This permanently deletes <strong style={{ color: C.text }}>{editingUser.name || editingUser.email}</strong> and all their data. No take-backs.
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => doDeleteUser(editingUser.id)}
                        disabled={deleteUserBusy}
                        style={{ flex: 1, padding: "10px 0", background: C.error, color: "white", border: "none", borderRadius: 24, fontFamily: MONO, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", cursor: deleteUserBusy ? "default" : "pointer", opacity: deleteUserBusy ? 0.6 : 1 }}
                      >{deleteUserBusy ? "Deleting..." : "Yes, Delete"}</button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        style={{ padding: "10px 16px", background: "rgba(255,255,255,0.06)", color: C.meta, border: `1px solid ${C.border}`, borderRadius: 24, fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", cursor: "pointer" }}
                      >Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
