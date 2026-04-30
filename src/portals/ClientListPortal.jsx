import { useState } from "react";
import { SANS, MONO, DISP, C, PAGE_HEADER, PAGE_TITLE, btn } from "../theme";
import { MONTHS } from "../constants";
import { useApp } from "../AppContext";

export default function ClientListPortal({ clients, allCalendars, setWorkspaceClientId, deleteClient }) {
  const { can } = useApp();
  const [hoveredCard, setHoveredCard] = useState(null);

  function calendarCount(client) {
    return allCalendars.filter(c =>
      c.client_id === client.id || c.client_name?.toLowerCase() === client.name?.toLowerCase()
    ).length;
  }

  function latestMonth(client) {
    const cals = allCalendars
      .filter(c => c.client_id === client.id || c.client_name?.toLowerCase() === client.name?.toLowerCase())
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));
    if (!cals.length) return null;
    return `${MONTHS[cals[0].month].slice(0, 3)} ${cals[0].year}`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.canvas, fontFamily: SANS }}>
      <div style={PAGE_HEADER}>
        <div style={PAGE_TITLE}>Clients</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "40px 48px" }}>
        {clients.length === 0 ? (
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px", paddingTop: 60, textAlign: "center" }}>
            No clients yet — add one via Billing
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {clients.map(client => {
              const count = calendarCount(client);
              const latest = latestMonth(client);
              return (
                <div
                  key={client.id}
                  style={{ position: "relative" }}
                  onMouseEnter={() => setHoveredCard(client.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div
                    onClick={() => setWorkspaceClientId(client.id)}
                    style={{
                      background: C.surface, border: `1px solid ${hoveredCard === client.id ? C.accent : C.border}`, borderRadius: 14,
                      padding: "22px 22px 18px", cursor: "pointer", transition: "border-color 0.15s",
                    }}
                  >
                    {/* Avatar initial */}
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                      <span style={{ fontFamily: DISP, fontSize: 18, color: "#000", lineHeight: 1 }}>
                        {(client.name || "?")[0].toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {client.name}
                    </div>
                    {client.company && (
                      <div style={{ fontFamily: SANS, fontSize: 12, color: C.meta, marginBottom: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {client.company}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: C.text }}>{count}</div>
                        <div style={{ fontFamily: MONO, fontSize: 9, color: C.meta, textTransform: "uppercase", letterSpacing: "1px" }}>calendars</div>
                      </div>
                      {latest && (
                        <>
                          <div style={{ width: 1, background: C.border }} />
                          <div>
                            <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.accent }}>{latest}</div>
                            <div style={{ fontFamily: MONO, fontSize: 9, color: C.meta, textTransform: "uppercase", letterSpacing: "1px" }}>latest</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {can("admin_portal") && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteClient(client); }}
                      style={{
                        position: "absolute", top: 10, right: 10,
                        ...btn({ padding: "4px 7px", fontSize: 14, lineHeight: 1 }),
                        opacity: hoveredCard === client.id ? 1 : 0,
                        pointerEvents: hoveredCard === client.id ? "auto" : "none",
                        color: C.meta, border: "none", background: "transparent",
                        transition: "opacity 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = C.error; }}
                      onMouseLeave={e => { e.currentTarget.style.color = C.meta; }}
                      title="Delete client and all their data"
                    >×</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
