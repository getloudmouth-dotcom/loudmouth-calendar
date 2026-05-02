import { useState, useMemo, useRef, useEffect, Component } from "react";
import { toast as sonnerToast } from "sonner";
import { Sentry } from "./sentry.js";

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, fontFamily: "monospace", background: "#1a1a2e", color: "#D7FA06", minHeight: "100vh" }}>
        <h2 style={{ color: "#E8001C" }}>App crashed — check this error:</h2>
        <pre style={{ whiteSpace: "pre-wrap", color: "white", fontSize: 13 }}>{this.state.error?.message}{"\n\n"}{this.state.error?.stack}</pre>
      </div>
    );
    return this.props.children;
  }
}
import { supabase } from "./supabase";
import { MONTHS, CONTENT_FIELDS, ROLE_TOOLS, ALL_TOOLS, PORTALS, newPost } from "./constants";
import { readExportToken, readContentPlanToken, readCPExportToken, readBillingExportToken, readCalendarIdFromUrl, setCalendarIdInUrl, compressToBlob, uploadToCloudinary, getDaysInMonth, getFirstDayOfMonth, chunkArray, loadGsiScript, deleteCloudinaryAssets } from "./utils";
import ContentPlanPublicView from "./views/ContentPlanPublicView";
import ContentPlanExportView from "./views/ContentPlanExportView";
import AuthView from "./views/AuthView";
import ProfileSetupView from "./views/ProfileSetupView";
import InviteSetupView from "./views/InviteSetupView";
import PrivacyPolicyView from "./views/PrivacyPolicyView";
import { AppContext } from "./AppContext";
import AppDialog from "./components/AppDialog";
import { C, SANS, MONO, dangerBtn, ghostBtn } from "./theme";
import CalendarBuilder from "./portals/CalendarBuilder";
import DashboardPortal, { Sidebar } from "./portals/DashboardPortal";

// ── Billing Invoice Export View ───────────────────────────────────────────────
// Rendered headlessly by Puppeteer when generating invoice PDFs.
// Fetches invoice data from Redis via /api/billing/invoice-export-data, renders
// a styled invoice page, then signals window.__BILLING_EXPORT_READY__.
function BillingInvoiceExportView({ token }) {
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/billing/invoice-export-data?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setInvoice(data);
        setTimeout(() => {
          if (document.fonts?.ready) {
            document.fonts.ready.then(() => { window.__BILLING_EXPORT_READY__ = true; });
          } else {
            window.__BILLING_EXPORT_READY__ = true;
          }
        }, 300);
      })
      .catch(() => {
        setError(true);
        window.__BILLING_EXPORT_ERROR__ = true;
      });
  }, [token]);

  if (error) return <div style={{ padding: 40, color: "red" }}>Failed to load invoice data.</div>;
  if (!invoice) return null;

  const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: invoice.currency ?? "USD" }).format(n ?? 0);
  const fmtDate = (s) => s ? new Date(s).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";

  return (
    <div className="invoice-page" style={{ width: 794, minHeight: 1123, background: "#fff", fontFamily: "'Helvetica Neue', Arial, sans-serif", padding: "60px 64px", boxSizing: "border-box", color: "#111" }}>
      {/* Header */}
      <div style={{ background: "#1a1a2e", padding: "28px 32px", marginBottom: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "#D7FA06", fontWeight: 900, fontSize: 26, letterSpacing: "-0.5px", textTransform: "uppercase" }}>LOUDMOUTH</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "1px" }}>Invoice</div>
      </div>

      {/* Meta */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 40 }}>
        <div>
          <div style={{ color: "#767676", fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Invoice #</div>
          <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: "-0.5px" }}>{invoice.invoiceNumber}</div>
          <div style={{ marginTop: 20 }}>
            <div style={{ color: "#767676", fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Bill To</div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{invoice.client?.name ?? ""}</div>
            {invoice.client?.company && <div style={{ color: "#888", fontSize: 13 }}>{invoice.client.company}</div>}
            {invoice.client?.email && <div style={{ color: "#767676", fontSize: 12 }}>{invoice.client.email}</div>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: "#767676", fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Issue Date</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{fmtDate(invoice.issueDate)}</div>
          </div>
          <div>
            <div style={{ color: "#767676", fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Due Date</div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#E8001C" }}>{fmtDate(invoice.dueDate)}</div>
          </div>
        </div>
      </div>

      {/* Line items */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 32, fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #1a1a2e" }}>
            {["Description", "Qty", "Rate", "Total"].map((h, i) => (
              <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "10px 8px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", fontWeight: 700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(invoice.lineItems ?? []).sort((a, b) => a.sort_order - b.sort_order).map((item, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: "12px 8px", color: "#333" }}>{item.description}</td>
              <td style={{ padding: "12px 8px", textAlign: "right", color: "#666" }}>{Number(item.quantity)}</td>
              <td style={{ padding: "12px 8px", textAlign: "right", color: "#666" }}>${Number(item.unit_price).toFixed(2)}</td>
              <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600 }}>${Number(item.line_total ?? (item.quantity * item.unit_price)).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: 280 }}>
          {invoice.taxRate > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#888", fontSize: 13 }}>
                <span>Subtotal</span><span>{fmt(invoice.subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#888", fontSize: 13 }}>
                <span>Tax ({invoice.taxRate}%)</span><span>{fmt(invoice.taxAmount)}</span>
              </div>
            </>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "2px solid #1a1a2e", fontWeight: 900, fontSize: 20 }}>
            <span>Total Due</span>
            <span style={{ color: "#D7FA06", background: "#1a1a2e", padding: "2px 12px", borderRadius: 4 }}>{fmt(invoice.total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #f0f0f0" }}>
          <div style={{ color: "#767676", fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Notes</div>
          <div style={{ color: "#666", fontSize: 13, lineHeight: 1.6 }}>{invoice.notes}</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 60, paddingTop: 24, borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "#ccc", fontSize: 11 }}>billing@getloudmouth.us</div>
        {invoice.paymentUrl && (
          <div style={{ color: "#767676", fontSize: 11 }}>Pay at: {invoice.paymentUrl}</div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const today = new Date();
  const [step, setStep] = useState(() => (readExportToken() ? 3 : 1));
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState(null);
  const [clients, setClients] = useState([]);
  const [addingClient, setAddingClient] = useState(false);
  const [newClientInput, setNewClientInput] = useState("");
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [postsPerPage, setPostsPerPage] = useState(3);
  const [selectedDays, setSelectedDays] = useState([]);
  const [posts, setPosts] = useState({});
  const [calendarNotes, setCalendarNotes] = useState("");
  const [calendarNotesImage, setCalendarNotesImage] = useState("");
  const [driveToken, setDriveToken] = useState(null);
const [pinnedCount, setPinnedCount] = useState(0);
const [linkPickMode, setLinkPickMode] = useState({ active: false, onPick: null });
const [driveOpen, setDriveOpen] = useState(false);
const [drivePanelWidth, setDrivePanelWidth] = useState(300);
const [driveUploadProgress, setDriveUploadProgress] = useState({ active: false, done: 0, total: 0, day: null, postIdx: null });
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login"); // "login" | "signup"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [showDashboard, setShowDashboard] = useState(() => !readExportToken());
  // Full list of calendars; source of truth for the sidebar + builder. Populated by loadAllCalendars().
  const [allCalendars, setAllCalendars] = useState([]);
  // Calendar currently open in CalendarBuilder. null = no edit session.
  const [currentCalendarId, setCurrentCalendarId] = useState(null);
  const [draftHistory, setDraftHistory] = useState([]);
  const [showDraftHistory, setShowDraftHistory] = useState(false);
  const [savingLabel, setSavingLabel] = useState("");
  const historyRef = useRef([]);
  const historyIdxRef = useRef(-1);
  const isUndoingRef = useRef(false);
  const autoSaveTimerRef = useRef(null);
  const initialSelectedDaysRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [profileName, setProfileName] = useState("");
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSmsConsent, setProfileSmsConsent] = useState(false);
  const [profileInput, setProfileInput] = useState("");
  const [showInviteSetup, setShowInviteSetup] = useState(() => window.location.hash.includes("type=invite"));
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [invitePasswordConfirm, setInvitePasswordConfirm] = useState("");
  const [inviteSetupBusy, setInviteSetupBusy] = useState(false);
  const [inviteSetupError, setInviteSetupError] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [calendarsLoading, setCalendarsLoading] = useState(true);
  const [contentPlansLoading, setContentPlansLoading] = useState(true);
  const [scheduledPostsLoading, setScheduledPostsLoading] = useState(true);

  // Transient flag during toggleSchedule(); cleared after the call.
  const [schedulingCalId, setSchedulingCalId] = useState(null);
  const [activePortal, setActivePortal] = useState(PORTALS.HOME);
  const [workspaceClientId, setWorkspaceClientId] = useState(null);
  // Calendar currently open in MonthWorkspace (the client portal view). Distinct from currentCalendarId.
  const [workspaceCalendarId, setWorkspaceCalendarId] = useState(null);
  // ── RBAC ──
  const [userProfile, setUserProfile] = useState(null);
  const [userToolAccess, setUserToolAccess] = useState([]);
  const [, setShowAdminView] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [roleToolDefaults, setRoleToolDefaults] = useState(null); // null = not loaded yet
  const [rolePermsBusy, setRolePermsBusy] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role: "smm", job_title: "" });
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({});
  const [editUserBusy, setEditUserBusy] = useState(false);
  const [deleteUserBusy, setDeleteUserBusy] = useState(false);
  const [calCreators, setCalCreators] = useState({}); // userId → {name, email}
  // ── Content Plan Creator ──
  const [activeCPStep, setActiveCPStep] = useState(null);
  const [cpClientName, setCpClientName] = useState("");
  const [cpMonth, setCpMonth] = useState(today.getMonth());
  const [cpYear, setCpYear] = useState(today.getFullYear());
  const [cpShootDate, setCpShootDate] = useState("PENDING");
  const [cpProducedCount, setCpProducedCount] = useState(2);
  const [cpOrganicCount, setCpOrganicCount] = useState(3);
  const [cpItems, setCpItems] = useState([]);
  const [currentCPId, setCurrentCPId] = useState(null);
  const [allContentPlans, setAllContentPlans] = useState([]);
  const [cpClientId, setCpClientId] = useState(null);
  const [cpShareModal, setCpShareModal] = useState(null); // null | { planId, token, url, client }
  const [cpShareEmail, setCpShareEmail] = useState("");
  const [cpShareMethod, setCpShareMethod] = useState("email");
  const [cpShareBusy, setCpShareBusy] = useState(false);
  const [cpShareError, setCpShareError] = useState("");
  const [cpShareSuccess, setCpShareSuccess] = useState("");
  const [cpSaving, setCpSaving] = useState(false);
  const [cpReferenceImages, setCpReferenceImages] = useState([]);
  const [pinterestToken, setPinterestToken] = useState(null);
  const [pinterestOpen, setPinterestOpen] = useState(false);
  const [pinterestPanelWidth, setPinterestPanelWidth] = useState(300);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: "", onConfirm: null, onCancel: null });
  const cpAutoSaveTimerRef = useRef(null);
  // ── Realtime ──
  const realtimeChannelRef = useRef(null);
  const lastSelfCalendarUpdateRef = useRef(null);
  // ── Calendar restoration from URL ──
  const restoreFromUrlRef = useRef(
    readExportToken() || readContentPlanToken() || readCPExportToken() || readBillingExportToken()
      ? null
      : readCalendarIdFromUrl()
  );
  const restoreAttemptedRef = useRef(false);
  const loadingDraftRef = useRef(false);
  // Refs that always point at the latest function instance, so timer callbacks
  // never close over stale versions and effects don't need to depend on them.
  const saveDraftRef = useRef(null);
  const saveContentPlanRef = useRef(null);
  const openCalendarRef = useRef(null);
  const scheduleSyncFnRef = useRef(null);
  const showInviteSetupRef = useRef(false);
// Warm up the PDF export function on load to reduce cold start lag
useEffect(() => {
  if (!readExportToken()) fetch("/api/export-pdf", { method: "HEAD" }).catch(() => {});
}, []);

  useEffect(() => {
    document.body.style.background = "#f4f4f0";
    document.body.style.margin = "0";
  }, []);

  useEffect(() => {
    function handleOnline() { setIsOnline(true); setWasOffline(true); setTimeout(() => setWasOffline(false), 3000); }
    function handleOffline() { setIsOnline(false); setWasOffline(false); }
    function handleVisibility() { if (document.visibilityState === "visible" && user) loadAllCalendars(); }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user]);

  useEffect(() => {
    if (!driveOpen) return;
    function handler(e) {
      if (e.target.closest("[data-drive-panel]")) return;
      if (e.target.closest("[data-drive-toggle]")) return;
      if (e.target.closest("[data-step-nav]")) return;
      setDriveOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [driveOpen]);

  useEffect(() => {
    if (isUndoingRef.current) return;
    const timer = setTimeout(() => {
      const snap = JSON.stringify({ posts, selectedDays, clientName, clientId, month, year, postsPerPage });
      const history = historyRef.current;
      if (history[historyIdxRef.current] === snap) return;
      history.splice(historyIdxRef.current + 1);
      history.push(snap);
      if (history.length > 15) history.shift();
      historyIdxRef.current = history.length - 1;
      setCanUndo(historyIdxRef.current > 0);
      setCanRedo(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [posts, selectedDays, clientName, clientId, month, year, postsPerPage]);

  useEffect(() => {
    if (!clientName.trim() || !user || isUndoingRef.current || loadingDraftRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraftRef.current?.("Autosave", { silent: true });
    }, 12000);
    return () => clearTimeout(autoSaveTimerRef.current);
  }, [posts, selectedDays, month, year, clientName, clientId, currentCalendarId, postsPerPage, calendarNotes, calendarNotesImage, profileName, user]);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (clientName.trim() && user) saveDraftRef.current?.();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [clientName, user]);

  function restoreSnap(snap) {
    isUndoingRef.current = true;
    setPosts(snap.posts); setSelectedDays(snap.selectedDays);
    setClientName(snap.clientName); setClientId(snap.clientId ?? null); setMonth(snap.month);
    setYear(snap.year); setPostsPerPage(snap.postsPerPage);
    setTimeout(() => { isUndoingRef.current = false; }, 200);
  }

  function undo() {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    restoreSnap(JSON.parse(historyRef.current[historyIdxRef.current]));
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(true);
  }

  function redo() {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    restoreSnap(JSON.parse(historyRef.current[historyIdxRef.current]));
    setCanUndo(true);
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
  }

  function resetCalendar() {
    // push current state first so reset is undoable
    const snap = JSON.stringify({ posts, selectedDays, clientName, clientId, month, year, postsPerPage });
    historyRef.current.splice(historyIdxRef.current + 1);
    historyRef.current.push(snap);
    historyIdxRef.current = historyRef.current.length - 1;
    // now reset
    setSelectedDays([]); setPosts({}); setClientName(""); setClientId(null);
    setMonth(today.getMonth()); setYear(today.getFullYear());
    setPostsPerPage(3); setStep(1);
  }
  
  const [exporting, setExporting] = useState(false);
  const [exportElapsed, setExportElapsed] = useState(0);
  const [exportMode, setExportMode] = useState(() => !!readExportToken());
  const [cpPublicToken] = useState(() => readContentPlanToken());
  const [cpExportToken] = useState(() => readCPExportToken());
  const [billingExportToken] = useState(() => readBillingExportToken());

  async function connectDrive() {
    try {
      await loadGsiScript();
    } catch {
      showToast("Failed to load Google auth — check your connection.", "error");
      return;
    }
    const googleAuthClient = window.google.accounts.oauth2.initTokenClient({
      client_id: "988412963391-j36f4j6or67871i599o17ui2nai59pi9.apps.googleusercontent.com",
      scope: "https://www.googleapis.com/auth/drive.readonly",
      callback: (response) => {
        if (response.access_token) {
          setDriveToken(response.access_token);
          setDriveOpen(true);
        }
      },
    });
    googleAuthClient.requestAccessToken();
  }

  async function fetchDriveUrls(fileInfos, onProgress) {
    return Promise.all(fileInfos.map(async fi => {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fi.id}?alt=media`, { headers: { Authorization: `Bearer ${driveToken}` } });
      if (!res.ok) throw new Error(`Fetch failed for ${fi.id}`);
      const blob = await res.blob();
      const compressed = await compressToBlob(new File([blob], "drive-img.jpg", { type: blob.type }));
      const url = await uploadToCloudinary(compressed);
      if (onProgress) onProgress();
      return url;
    }));
  }

  async function handleDriveFileDrop(day, postIdx, fileId, driveLink = "") {
    await handleMultiDriveFileDrop(day, postIdx, [{ id: fileId, link: driveLink }]);
  }

  async function handleMultiDriveFileDrop(day, postIdx, fileInfos) {
    if (!driveToken || !fileInfos.length) return;
    try {
      setDriveUploadProgress({ active: true, done: 0, total: fileInfos.length, day, postIdx });
      const urls = await fetchDriveUrls(fileInfos, () => setDriveUploadProgress(p => ({ ...p, done: p.done + 1 })));
      setPosts(p => {
        const arr = [...(p[day] || [])];
        const post = { ...arr[postIdx] };
        const wasCarousel = post.contentType === "Carousel";
        post.imageUrls = [...(post.imageUrls || []), ...urls];
        if (post.imageUrls.length > 1) {
          post.contentType = "Carousel";
          const existingSlideLinks = wasCarousel ? (post.urls || []) : (post.url ? [post.url] : []);
          const newSlideLinks = fileInfos.map(fi => fi.link || "");
          post.urls = [...existingSlideLinks, ...newSlideLinks];
        } else {
          if (fileInfos[0].link && !post.url) post.url = fileInfos[0].link;
        }
        arr[postIdx] = post;
        return { ...p, [day]: arr };
      });
    } catch (e) { showToast("Drive drop failed: " + e.message, "error"); }
    finally { setDriveUploadProgress({ active: false, done: 0, total: 0 }); }
  }

  async function handleDriveBatchImport(fileInfos) {
    if (!driveToken || !fileInfos.length) return;
    try {
      setDriveUploadProgress({ active: true, done: 0, total: fileInfos.length, day: null, postIdx: null });
      const urls = await fetchDriveUrls(fileInfos, () => setDriveUploadProgress(p => ({ ...p, done: p.done + 1 })));
      const newDays = [];
      const queue = urls.map((imgUrl, i) => ({ imgUrl, link: fileInfos[i]?.link || "" }));
      setPosts(p => {
        const next = { ...p };
        let q = [...queue];
        const days = [...selectedDays].sort((a, b) => a - b);
        for (const day of days) {
          if (!q.length) break;
          const arr = [...(next[day] || [])];
          if (arr.length === 1 && !arr[0].imageUrls?.length) {
            const { imgUrl, link } = q.shift();
            arr[0] = { ...arr[0], imageUrls: [imgUrl], url: link || arr[0].url || "" };
            next[day] = arr;
          }
        }
        if (q.length > 0) {
          const usedDays = new Set([...selectedDays, ...newDays]);
          const totalDays = getDaysInMonth(year, month);
          const lastDay = Math.max(...selectedDays, 0);
          for (let d = lastDay + 1; d <= totalDays && q.length > 0; d++) {
            if (!usedDays.has(d)) {
              const { imgUrl, link } = q.shift();
              usedDays.add(d); newDays.push(d);
              next[d] = [{ ...newPost(), imageUrls: [imgUrl], url: link || "" }];
            }
          }
        }
        return next;
      });
      if (newDays.length > 0) setSelectedDays(prev => [...new Set([...prev, ...newDays])]);
    } catch (e) { showToast("Drive batch import failed: " + e.message, "error"); }
    finally { setDriveUploadProgress({ active: false, done: 0, total: 0 }); }
  }
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const sortedDays = useMemo(() => [...selectedDays].sort((a, b) => a - b), [selectedDays]);

  // Effective permissions: role defaults (DB or fallback) + per-user overrides
  const permissions = useMemo(() => {
    if (!userProfile) return new Set();
    const dbDefaults = roleToolDefaults?.[userProfile.role];
    const base = new Set([...(ROLE_TOOLS[userProfile.role] || []), ...(dbDefaults ?? [])]);
    for (const t of userToolAccess) {
      if (t.granted) base.add(t.tool_key);
      else base.delete(t.tool_key);
    }
    return base;
  }, [userProfile, userToolAccess, roleToolDefaults]);
  const can = (tool) => permissions.has(tool);

  const allPosts = useMemo(() =>
    sortedDays.flatMap(d => {
      const dayPosts = posts[d];
      if (!dayPosts || dayPosts.length === 0) return [{ ...newPost(), day: d, postIdx: 0 }];
      return dayPosts.map((p, idx) => ({ ...p, day: d, postIdx: idx }));
    }), [sortedDays, posts]);

  // Feed-grid view of allPosts: Story posts dropped (they don't appear on an
  // IG profile grid), and reordered by `_meta.feedOrder` if a solo Feed Grid
  // save has set one. Posts without a feedOrder entry trail in default order.
  // This must mirror postsToGridItems so the calendar editor's `Feed:` preview
  // matches the solo Feed Grid exactly.
  const feedPosts = useMemo(() => {
    const filtered = allPosts.filter(p => p.contentType !== "Story");
    const feedOrder = posts?._meta?.feedOrder;
    if (!Array.isArray(feedOrder) || feedOrder.length === 0) return filtered;
    const keyOf = (p) => `${p.day}-${p.postIdx ?? 0}`;
    const byKey = new Map(filtered.map(p => [keyOf(p), p]));
    const ordered = [];
    for (const k of feedOrder) {
      const it = byKey.get(k);
      if (it) { ordered.push(it); byKey.delete(k); }
    }
    for (const it of byKey.values()) ordered.push(it);
    return ordered;
  }, [allPosts, posts]);

  const pages = useMemo(() => chunkArray(allPosts, postsPerPage), [allPosts, postsPerPage]);

  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [firstDay, daysInMonth]);

  function toggleDay(day) {
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        const next = prev.filter(d => d !== day);
        setPosts(p => { const c = { ...p }; delete c[day]; return c; });
        return next;
      }
      setPosts(p => ({ ...p, [day]: [newPost()] }));
      return [...prev, day];
    });
  }

  function changeDay(oldDay, newDay) {
    if (oldDay === newDay) return;
    setSelectedDays(prev => prev.map(d => d === oldDay ? newDay : d));
    setPosts(p => { const c = { ...p }; c[newDay] = c[oldDay]; delete c[oldDay]; return c; });
  }

  function addPostToDay(day) {
    setPosts(p => ({ ...p, [day]: [...(p[day] || []), newPost()] }));
  }

  function removePostFromDay(day, postIdx) {
    setPosts(p => {
      const arr = [...(p[day] || [])];
      if (arr.length <= 1) return p;
      arr.splice(postIdx, 1);
      return { ...p, [day]: arr };
    });
  }

  function updatePost(day, postIdx, field, value) {
    setPosts(p => {
      const arr = [...(p[day] || [])];
      arr[postIdx] = { ...arr[postIdx], [field]: value };
      return { ...p, [day]: arr };
    });
  }

  // Swap content between two posts — keeps each post's day, only swaps content fields
  function swapPostContent(dayA, idxA, dayB, idxB) {
    if (dayA === dayB && idxA === idxB) return;
    setPosts(p => {
      const next = { ...p };
      const arrA = [...(next[dayA] || [])];
      const arrB = dayA === dayB ? arrA : [...(next[dayB] || [])];
      const postA = { ...arrA[idxA] };
      const postB = { ...arrB[idxB] };
      // Swap only content fields
      CONTENT_FIELDS.forEach(field => {
        const tmp = postA[field];
        postA[field] = postB[field];
        postB[field] = tmp;
      });
      arrA[idxA] = postA;
      if (dayA === dayB) {
        arrA[idxB] = postB;
        next[dayA] = arrA;
      } else {
        arrB[idxB] = postB;
        next[dayA] = arrA;
        next[dayB] = arrB;
      }
      return next;
    });
  }

  async function handleFiles(day, postIdx, files) {
    const imageFiles = [...files].filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    const forceCarousel = imageFiles.length > 1;
    try {
      setDriveUploadProgress({ active: true, done: 0, total: imageFiles.length, day, postIdx });
      const urls = await Promise.all(imageFiles.map(async file => {
        const blob = await compressToBlob(file);
        const url = await uploadToCloudinary(blob);
        setDriveUploadProgress(p => ({ ...p, done: p.done + 1 }));
        return url;
      }));
      setPosts(p => {
        const arr = [...(p[day] || [])];
        const post = { ...arr[postIdx] };
        if (forceCarousel || post.contentType === "Carousel") {
          post.contentType = "Carousel";
          post.imageUrls = [...(post.imageUrls || []), ...urls];
        } else {
          post.imageUrls = [urls[0]];
        }
        arr[postIdx] = post;
        return { ...p, [day]: arr };
      });
    } catch(e) { showToast("Upload failed: " + e.message, "error"); }
    finally { setDriveUploadProgress({ active: false, done: 0, total: 0 }); }
  }

  function removeImageFromPost(day, postIdx, imgIdx) {
    setPosts(p => {
      const arr = [...(p[day] || [])];
      const post = { ...arr[postIdx] };
      post.imageUrls = post.imageUrls.filter((_, i) => i !== imgIdx);
      if (post.imageUrls.length <= 1 && post.contentType === "Carousel") post.contentType = "Photo";
      arr[postIdx] = post;
      return { ...p, [day]: arr };
    });
  }

  async function handleBatchImport(files) {
    const imageFiles = [...files].filter(f => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    let dataUrls;
    try {
      setDriveUploadProgress({ active: true, done: 0, total: imageFiles.length, day: null, postIdx: null });
      dataUrls = await Promise.all(imageFiles.map(async file => {
        const blob = await compressToBlob(file);
        const url = await uploadToCloudinary(blob);
        setDriveUploadProgress(p => ({ ...p, done: p.done + 1 }));
        return url;
      }));
    } catch(e) {
      showToast("Upload failed: " + e.message, "error");
      setDriveUploadProgress({ active: false, done: 0, total: 0 });
      return;
    }
    {
      const newDays = [];
      setPosts(p => {
        const next = { ...p };
        let queue = [...dataUrls];
        // Use existing days that only have one post with no image (one slot per day)
        const days = [...selectedDays].sort((a, b) => a - b);
        for (const day of days) {
          if (!queue.length) break;
          const arr = [...(next[day] || [])];
          // Only use this day if it has exactly one post and no image yet
          if (arr.length === 1 && !arr[0].imageUrls?.length) {
            arr[0] = { ...arr[0], imageUrls: [queue.shift()] };
            next[day] = arr;
          }
        }
        // For remaining images, pick days chronologically after the last selected day
        if (queue.length > 0) {
          const usedDays = new Set([...selectedDays, ...newDays]);
          const totalDays = getDaysInMonth(year, month);
          const lastDay = Math.max(...selectedDays, 0);
          for (let d = lastDay + 1; d <= totalDays && queue.length > 0; d++) {
            if (!usedDays.has(d)) {
              usedDays.add(d);
              newDays.push(d);
              next[d] = [{ ...newPost(), imageUrls: [queue.shift()] }];
            }
          }
        }
        return next;
      });
      // Add any new days to selectedDays
      if (newDays.length > 0) {
        setSelectedDays(prev => [...new Set([...prev, ...newDays])]);
      }
    }
    setDriveUploadProgress({ active: false, done: 0, total: 0 });
  }

  async function addNewClient() {
    const name = newClientInput.trim();
    if (!name) return;
    const { data: created } = await supabase
      .from("clients")
      .insert({ name, created_by: (await supabase.auth.getUser()).data.user?.id })
      .select("id, name")
      .single();
    await loadClients();
    setClientName(created?.name || name);
    setClientId(created?.id || null);
    setNewClientInput("");
    setAddingClient(false);
  }

  async function addClientDirect(name) {
    if (!name) return;
    await supabase.from("clients").insert({ name, created_by: (await supabase.auth.getUser()).data.user?.id });
    await loadClients();
  }

  async function exportPDF() {
    // Auto-save silently before export so Puppeteer has data to pull from Supabase
    if (!currentCalendarId) {
      const saved = await saveDraft("Auto-save before export", { silent: true });
      if (!saved) {
        showToast("Could not save your calendar before exporting. Please save manually and try again.", "error");
        return;
      }
      await new Promise(r => setTimeout(r, 150)); // let state flush
    }
    if (!currentCalendarId) {
      showToast("Save failed. Please save your calendar manually first.", "error");
      return;
    }
    setExporting(true);
    setExportElapsed(0);
    const _exportTimer = setInterval(() => setExportElapsed(s => s + 1), 1000);
    try {
      const { data: { session: exportSession } } = await supabase.auth.getSession();
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${exportSession?.access_token}`,
        },
        body: JSON.stringify({ calendarId: currentCalendarId }),
      });
      if (!res.ok) {
        const text = await res.text();
        let err = {};
        try {
          err = JSON.parse(text);
        } catch {
          /* non-JSON body (e.g. HTML 404 page) */
        }
        const parts = [err.error, err.detail, err.hint].filter(Boolean);
        throw new Error(
          parts.length
            ? parts.join(" — ")
            : text.slice(0, 200)
              ? `HTTP ${res.status}: ${text.slice(0, 200)}`
              : `HTTP ${res.status}`
        );
      }
      const data = await res.json();
      const bytes = Uint8Array.from(atob(data.pdf.replace(/[\s\r\n]/g, "")), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename || `${clientName || "calendar"}-content-calendar.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast("Export error: " + err.message, "error");
    } finally {
      clearInterval(_exportTimer);
      setExporting(false);
      setExportProgress({ current: 0, total: 0 });
      setExportElapsed(0);
    }
  }

  // ── Export token detection (headless Puppeteer mode) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("exportToken");
    if (!token) return;

    setExportMode(true);
    setShowDashboard(false);
    // Do not setExporting(true) here — that overlay is not .no-print and would cover the calendar in headless PDF capture.

    document.documentElement.setAttribute("data-pdf-export", "1");

    fetch(`/api/export-data?token=${token}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || `Export data failed (${r.status})`);
        return data;
      })
      .then((payload) => {
        setClientName(payload.clientName);
        setMonth(payload.month);
        setYear(payload.year);
        setPostsPerPage(payload.postsPerPage ?? 3);
        setProfileName(payload.builderName ?? "");
        setSelectedDays(Array.isArray(payload.selectedDays) ? payload.selectedDays : []);
        setCalendarNotes(payload.notes ?? "");
        setCalendarNotesImage(payload.notesImage ?? "");
        const raw = payload.posts;
        setPosts(
          raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}
        );
        setStep(3);
        // Poll until all cal-page images are decoded, then signal Puppeteer
        const signalReady = () => {
          const after = () => setTimeout(() => { window.__EXPORT_READY__ = true; }, 400);
          if (document.fonts?.ready) document.fonts.ready.then(after); else after();
        };

        const waitForImages = () => {
          // Wait for .cal-page to be in the DOM first
          if (!document.querySelector(".cal-page")) { setTimeout(waitForImages, 200); return; }

          // <img> tags (if any)
          const imgs = Array.from(document.querySelectorAll(".cal-page img"));
          // Inline background-image URLs — what DraggableImage uses instead of <img>
          const bgUrls = [...new Set(
            Array.from(document.querySelectorAll(".cal-page *"))
              .map(el => el.style.backgroundImage?.match(/url\(["']?([^"')]+)["']?\)/)?.[1])
              .filter(url => url && url.startsWith("http"))
          )];

          const pending = [
            ...imgs.filter(i => !i.complete || !i.naturalHeight).map(img =>
              new Promise(r => { img.onload = img.onerror = r; })
            ),
            ...bgUrls.map(url =>
              new Promise(r => { const p = new Image(); p.onload = p.onerror = r; p.src = url; })
            ),
          ];

          if (pending.length === 0) signalReady();
          else Promise.all(pending).then(signalReady);
        };
        setTimeout(waitForImages, 150);
      })
      .catch((err) => {
        console.error("Export token fetch failed:", err);
        window.__EXPORT_ERROR__ = true;
      });
  }, []);

  // ── Auth ──
  useEffect(() => {
    // Warm up export function (skip inside headless export to avoid recursive call)
    if (!readExportToken()) fetch("/api/export-pdf", { method: "HEAD" }).catch(() => {});

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) {
        Sentry.setUser({ id: session.user.id, email: session.user.email });
        const name = session.user.user_metadata?.display_name || "";
        setProfileName(name);
        if (window.location.hash.includes("type=invite")) {
          setInviteName(name);
          setInviteEmail(session.user.email || "");
          setShowInviteSetup(true);
        } else if (!name) {
          setShowProfileSetup(true);
        }
      } else {
        Sentry.setUser(null);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        Sentry.setUser({ id: session.user.id, email: session.user.email });
        const name = session.user.user_metadata?.display_name || "";
        setProfileName(name);
        if (window.location.hash.includes("type=invite")) {
          setInviteName(name);
          setInviteEmail(session.user.email || "");
          setShowInviteSetup(true);
        } else if (!showInviteSetupRef.current && !name) {
          setShowProfileSetup(true);
        }
      } else {
        Sentry.setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Keep refs synced with their latest values for use inside timer callbacks
  // and one-shot effects that shouldn't re-run when these change identity.
  useEffect(() => { showInviteSetupRef.current = showInviteSetup; });
  useEffect(() => { saveDraftRef.current = saveDraft; });
  useEffect(() => { saveContentPlanRef.current = saveContentPlan; });
  useEffect(() => { openCalendarRef.current = openCalendar; });
  useEffect(() => { scheduleSyncFnRef.current = syncScheduleForCalendar; });

  // Keyed on `user` so load fns see fresh state — calling them inline after setUser races with the async commit.
  useEffect(() => {
    if (!user) return;
    if (showInviteSetup) return;
    loadAllCalendars();
    loadAllContentPlans();
    loadClients();
    loadScheduledPosts();
    loadUserProfile(user.id);
    loadRoleToolDefaults();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loaders are component-scoped fns with unstable identity; we want this to fire on user/showInviteSetup change only
  }, [user, showInviteSetup]);

  // ── Restore open calendar from URL after first data load ────────────────
  useEffect(() => {
    if (restoreAttemptedRef.current) return;
    if (!user || calendarsLoading) return;
    restoreAttemptedRef.current = true;
    const id = restoreFromUrlRef.current;
    if (!id) return;
    const cal = allCalendars.find(c => c.id === id);
    if (cal) openCalendarRef.current?.(cal);
    else setCalendarIdInUrl(null);
  }, [user, calendarsLoading, allCalendars]);

  // ── Keep ?calendarId= in sync with whatever calendar is open ────────────
  useEffect(() => {
    if (!restoreAttemptedRef.current) return;
    if (!showDashboard && currentCalendarId) setCalendarIdInUrl(currentCalendarId);
    else setCalendarIdInUrl(null);
  }, [showDashboard, currentCalendarId]);

  // ── Realtime: keep clients list in sync across all sessions ──────────────
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("clients-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => {
        loadClients();
      })
      .subscribe();
    return () => channel.unsubscribe();
  }, [user]);

  async function signIn() {
    setAuthBusy(true); setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    if (error) setAuthError(error.message);
    setAuthBusy(false);
  }

  async function signUp() {
    setAuthBusy(true); setAuthError("");
    const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
    if (error) setAuthError(error.message);
    else setAuthError("Check your email for a confirmation link!");
    setAuthBusy(false);
  }

  async function resetPassword() {
    if (!authEmail.trim()) return setAuthError("Enter your email first.");
    setAuthBusy(true); setAuthError("");
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
      redirectTo: window.location.origin,
    });
    if (error) setAuthError(error.message);
    else setAuthError("Password reset email sent! Check your inbox.");
    setAuthBusy(false);
  }

  async function saveInviteSetup() {
    setInviteSetupError("");
    if (!inviteName.trim()) return setInviteSetupError("Name is required.");
    if (invitePassword.length < 8) return setInviteSetupError("Password must be at least 8 characters.");
    if (invitePassword !== invitePasswordConfirm) return setInviteSetupError("Passwords don't match.");
    setInviteSetupBusy(true);
    const { error } = await supabase.auth.updateUser({
      email: inviteEmail.trim() || undefined,
      password: invitePassword,
      data: { display_name: inviteName.trim() },
    });
    if (error) {
      setInviteSetupError(error.message);
      setInviteSetupBusy(false);
      return;
    }
    // Sync name + email to profile row
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await supabase.from("profiles").update({
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        updated_at: new Date().toISOString(),
      }).eq("id", currentUser.id);
    }
    window.history.replaceState(null, "", window.location.pathname);
    setProfileName(inviteName.trim());
    setShowInviteSetup(false);
    setInviteSetupBusy(false);
    loadAllCalendars();
    loadAllContentPlans();
    loadClients();
    loadScheduledPosts();
    loadUserProfile(currentUser.id);
    loadRoleToolDefaults();
  }

  async function saveProfile() {
    const name = profileInput.trim();
    if (!name) return;
    const { error } = await supabase.auth.updateUser({ data: { display_name: name } });
    if (error) { showToast("Failed to save: " + error.message, "error"); return; }
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await supabase.from("profiles").update({
        phone: profilePhone.trim() || null,
        ...(profileSmsConsent ? { sms_consent_at: new Date().toISOString() } : {}),
      }).eq("id", currentUser.id);
    }
    setProfileName(name);
    setShowProfileSetup(false);
    setEditingProfile(false);
    setProfileInput("");
    setProfilePhone("");
    setProfileSmsConsent(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    Sentry.setUser(null);
    setUser(null); setShowDashboard(true); setAllCalendars([]);
    setCurrentCalendarId(null); setClientName(""); setClientId(null); setSelectedDays([]); setPosts({});
    setUserProfile(null); setUserToolAccess([]); setShowAdminView(false); setAdminUsers([]); setActivePortal(PORTALS.HOME);
    setCalendarsLoading(true); setContentPlansLoading(true); setScheduledPostsLoading(true);
  }

  function showConfirm(message, onConfirm, onCancel) {
    setConfirmDialog({ open: true, message, onConfirm, onCancel });
  }

  function showToast(msg, type = "info") {
    if (type === "success") sonnerToast.success(msg);
    else if (type === "error") sonnerToast.error(msg);
    else sonnerToast(msg);
  }


  async function loadUserProfile(userId) {
    const [{ data: profile }, { data: access }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("user_tool_access").select("*").eq("user_id", userId),
    ]);
    // Invited user is logging in for the first time — mark them active
    if (profile?.status === "invited") {
      await supabase.from("profiles").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", userId);
      profile.status = "active";
    }
    setUserProfile(profile || null);
    setUserToolAccess(access || []);
  }

  async function loadAdminUsers() {
    setAdminLoading(true);
    const [{ data: profiles }, { data: tools }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: true }),
      supabase.from("user_tool_access").select("*"),
    ]);
    const merged = (profiles || []).map(p => ({
      ...p,
      tool_overrides: (tools || []).filter(t => t.user_id === p.id),
    }));
    setAdminUsers(merged);
    setAdminLoading(false);
  }

  async function loadRoleToolDefaults() {
    const { data } = await supabase.from("role_tool_defaults").select("role, tool_key");
    if (!data) return;
    const map = {};
    for (const { role, tool_key } of data) {
      if (!map[role]) map[role] = [];
      map[role].push(tool_key);
    }
    setRoleToolDefaults(map);
  }

  async function saveRoleToolDefaults(newMap) {
    setRolePermsBusy(true);
    try {
      // Build desired rows
      const desired = [];
      for (const [role, tools] of Object.entries(newMap)) {
        for (const tool_key of tools) desired.push({ role, tool_key });
      }
      // Delete all existing rows then insert new ones
      await supabase.from("role_tool_defaults").delete().neq("role", "___never___");
      if (desired.length > 0) await supabase.from("role_tool_defaults").insert(desired);
      setRoleToolDefaults(newMap);
    } catch (e) {
      showToast("Failed to save role permissions: " + e.message, "error");
    }
    setRolePermsBusy(false);
  }

  async function doInviteUser() {
    setInviteBusy(true); setInviteError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/invite-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify(inviteForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to invite user");
      setInviteModal(false);
      setInviteForm({ email: "", name: "", role: "smm", job_title: "" });
      await loadAdminUsers();
    } catch (e) {
      setInviteError(e.message);
    }
    setInviteBusy(false);
  }

  async function doUpdateUser() {
    setEditUserBusy(true);
    try {
      const { id, role, job_title, status } = editUserForm;
      await supabase.from("profiles").update({ role, job_title, status, updated_at: new Date().toISOString() }).eq("id", id);
      const defaultTools = (roleToolDefaults?.[role] ?? ROLE_TOOLS[role]) || [];
      for (const { key: toolKey } of ALL_TOOLS) {
        const isDefaultOn = defaultTools.includes(toolKey);
        const isChecked = editUserForm[`tool_${toolKey}`] ?? isDefaultOn;
        if (isChecked === isDefaultOn) {
          // Matches role default — remove any override
          await supabase.from("user_tool_access").delete().eq("user_id", id).eq("tool_key", toolKey);
        } else {
          // Differs from role default — upsert override
          await supabase.from("user_tool_access").upsert(
            { user_id: id, tool_key: toolKey, granted: isChecked, granted_by: user.id },
            { onConflict: "user_id,tool_key" }
          );
        }
      }
      setEditingUser(null);
      await loadAdminUsers();
    } catch (e) {
      showToast("Failed to update user: " + e.message, "error");
    }
    setEditUserBusy(false);
  }

  async function doDeleteUser(userId) {
    setDeleteUserBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete user");
      setEditingUser(null);
      await loadAdminUsers();
    } catch (e) {
      showToast("Failed to delete user: " + e.message, "error");
    }
    setDeleteUserBusy(false);
  }

  // ── Calendars ──
  async function loadAllCalendars() {
    try {
      const { data } = await supabase.from("calendars").select("*").order("updated_at", { ascending: false });
      const calendars = data || [];
      setAllCalendars(calendars);

      const creatorIds = [...new Set(calendars.map(c => c.user_id).filter(Boolean))];
      if (creatorIds.length) {
        const { data: creators } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", creatorIds);
        const cmap = {};
        for (const p of creators || []) cmap[p.id] = { name: p.name || p.email || "Unknown", email: p.email || "" };
        setCalCreators(cmap);
      }
    } finally {
      setCalendarsLoading(false);
    }
  }

  async function loadClients() {
    const { data } = await supabase.from("clients").select("id, name, email, phone, smm_active").order("name", { ascending: true });
    if (data?.length) setClients(data.filter(c => c.name));
  }

  async function toggleClientSmmActive(id, current) {
    await supabase.from("clients").update({ smm_active: !current }).eq("id", id);
    setClients(prev => prev.map(c => c.id === id ? { ...c, smm_active: !current } : c));
  }


  async function openCalendar(cal) {
    setCurrentCalendarId(cal.id);
    const liveClient = cal.client_id ? clients.find(c => c.id === cal.client_id) : null;
    const resolvedName = liveClient?.name || cal.client_name || "";
    setClientId(cal.client_id || null);
    setClientName(resolvedName);
    if (liveClient && liveClient.name && liveClient.name !== cal.client_name) {
      // lazy heal: bring the denormalized snapshot back in line with the live client.
      // Skip if a sibling row already owns (user_id, target_name, month, year) — the
      // unique constraint would 409. Caller can clean up the duplicate manually.
      (async () => {
        const { data: collision } = await supabase
          .from("calendars")
          .select("id")
          .eq("user_id", cal.user_id)
          .eq("client_name", liveClient.name)
          .eq("month", cal.month)
          .eq("year", cal.year)
          .neq("id", cal.id)
          .maybeSingle();
        if (collision) {
          console.warn("[lazy-heal] skipped — duplicate calendar exists for", liveClient.name, cal.month, cal.year);
          return;
        }
        const { error } = await supabase.from("calendars").update({ client_name: liveClient.name }).eq("id", cal.id);
        if (error) console.warn("[lazy-heal] client_name update failed:", error.message);
      })();
    }
    setMonth(cal.month);
    setYear(cal.year);
    setPostsPerPage(cal.posts_per_page);
    setSelectedDays(cal.selected_days || []);
    initialSelectedDaysRef.current = cal.selected_days || [];
    setCalendarNotes(cal.notes || "");
    setCalendarNotesImage(cal.notes_image || "");
    // Load most recent draft. Guard autosave so it can't write empty posts
    // into the DB if this fetch is slow or fails.
    loadingDraftRef.current = true;
    setPosts({});
    try {
      const { data } = await supabase.from("calendar_drafts")
        .select("*").eq("calendar_id", cal.id).order("saved_at", { ascending: false }).limit(1);
      if (data?.[0]) {
        setPosts(data[0].posts);
        setPinnedCount(data[0].posts?._meta?.pinnedCount ?? 0);
      } else {
        setPinnedCount(0);
      }
    } finally {
      loadingDraftRef.current = false;
    }
    setShowDashboard(false);
    setStep(1);
    loadDraftHistory(cal.id);
    // ── Realtime: subscribe to draft changes from other users ──
    if (realtimeChannelRef.current) realtimeChannelRef.current.unsubscribe();
    const channel = supabase
      .channel(`calendar-drafts-${cal.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "calendar_drafts", filter: `calendar_id=eq.${cal.id}` }, async (payload) => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (payload.new?.user_id && payload.new.user_id === currentUser?.id) return; // own save
        // Pull the collaborator's posts into the canvas. Last-write-wins, same
        // model as the calendars UPDATE handler below.
        if (payload.new?.posts && typeof payload.new.posts === "object") {
          setPosts(payload.new.posts);
          setPinnedCount(payload.new.posts?._meta?.pinnedCount ?? 0);
        }
        // Look up who saved
        let saverName = "Someone";
        if (payload.new?.user_id) {
          const { data: p } = await supabase.from("profiles").select("name").eq("id", payload.new.user_id).single();
          if (p?.name) saverName = p.name;
        }
        showToast(`Updated by ${saverName}`, "info");
        loadDraftHistory(cal.id);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "calendars", filter: `id=eq.${cal.id}` }, (payload) => {
        if (payload.new?.updated_at && payload.new.updated_at === lastSelfCalendarUpdateRef.current) return; // own write
        const row = payload.new;
        if (typeof row.month === "number") setMonth(row.month);
        if (typeof row.year === "number") setYear(row.year);
        if (typeof row.posts_per_page === "number") setPostsPerPage(row.posts_per_page);
        if (Array.isArray(row.selected_days)) setSelectedDays(row.selected_days);
        if (typeof row.notes === "string") setCalendarNotes(row.notes);
        if (typeof row.notes_image === "string") setCalendarNotesImage(row.notes_image);
        loadAllCalendars();
      })
      .subscribe();
    realtimeChannelRef.current = channel;
  }

  async function loadDraftHistory(calId) {
    const id = calId || currentCalendarId;
    if (!id) return;
    const { data } = await supabase.from("calendar_drafts")
      .select("*").eq("calendar_id", id).order("saved_at", { ascending: false }).limit(20);
    setDraftHistory(data || []);
  }

  async function saveDraft(label = "", options = {}) {
    const silent = options.silent === true;
    if (!clientName.trim()) {
      if (!silent) showToast("Please select a client first.", "warning");
      return false;
    }
    if (!user) {
      if (!silent) showToast("Please log in first.", "warning");
      return false;
    }
    const lbl = label || savingLabel || "Manual save";
    // Always derive the canonical client_name from the live clients row when we have an id,
    // so the denormalized snapshot can never disagree with clients.name.
    const liveClient = clientId ? clients.find(c => c.id === clientId) : null;
    const canonicalName = liveClient?.name || clientName;
    let calData, calErr;
    if (currentCalendarId) {
      ({ data: calData, error: calErr } = await supabase.from("calendars")
        .update({
          client_id: clientId || null, client_name: canonicalName,
          month, year,
          posts_per_page: postsPerPage, builder_name: profileName,
          selected_days: selectedDays, notes: calendarNotes, notes_image: calendarNotesImage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentCalendarId)
        .select().single());
    } else {
      const existing = allCalendars.find(c =>
        c.month === month && c.year === year && (
          (clientId && c.client_id === clientId) ||
          (!clientId && c.client_name?.toLowerCase() === canonicalName.toLowerCase())
        )
      );
      if (existing) {
        setCurrentCalendarId(existing.id);
        ({ data: calData, error: calErr } = await supabase.from("calendars")
          .update({
            client_id: clientId || null, client_name: canonicalName,
            month, year,
            posts_per_page: postsPerPage, builder_name: profileName,
            selected_days: selectedDays, notes: calendarNotes, notes_image: calendarNotesImage,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select().single());
      } else {
        const proceed = await ensureCalendarLimit(clientId, `${MONTHS[month]} ${year}`);
        if (!proceed) {
          if (!silent) setSavingLabel("");
          return false;
        }
        ({ data: calData, error: calErr } = await supabase.from("calendars").insert({
          user_id: user.id, client_id: clientId || null, client_name: canonicalName, month, year,
          posts_per_page: postsPerPage, builder_name: profileName,
          selected_days: selectedDays, notes: calendarNotes, notes_image: calendarNotesImage,
          updated_at: new Date().toISOString(),
        }).select().single());
      }
    }
    if (calErr) {
      if (!silent) showToast("Save failed: " + calErr.message, "error");
      return false;
    }
    setCurrentCalendarId(calData.id);
    if (calData?.updated_at) lastSelfCalendarUpdateRef.current = calData.updated_at;
    const postsWithMeta = { ...posts, _meta: { ...(posts?._meta || {}), pinnedCount } };
    const { error: draftErr } = await supabase.from("calendar_drafts").insert({
      calendar_id: calData.id, posts: postsWithMeta, label: lbl, user_id: user.id,
    });
    if (draftErr) {
      if (!silent) showToast("Save failed: " + draftErr.message, "error");
      return false;
    }
    await loadAllCalendars();
    await loadDraftHistory(calData.id);
    setSavingLabel("");
    if (!silent) showToast(`Saved: ${clientName} — ${MONTHS[month]} ${year}`, "success");
    return true;
  }

  function restoreDraft(draft) {
    showConfirm(`Restore draft from ${new Date(draft.saved_at).toLocaleString()}?`, () => {
      setPosts(draft.posts);
      setShowDraftHistory(false);
    });
  }

  async function runCalendarPurge(cal) {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: drafts } = await supabase.from("calendar_drafts").select("posts").eq("calendar_id", cal.id);
    const urls = [cal.notes_image, ...(drafts ?? []).flatMap(d =>
      Object.values(d.posts ?? {}).flat().flatMap(p => p.imageUrls ?? [])
    )].filter(Boolean);
    await deleteCloudinaryAssets([...new Set(urls)], session?.access_token);
    await supabase.from("calendars").delete().eq("id", cal.id);
    await loadAllCalendars();
    if (currentCalendarId === cal.id) { setCurrentCalendarId(null); setShowDashboard(true); }
    if (workspaceCalendarId === cal.id) setWorkspaceCalendarId(null);
  }

  function deleteCalendar(cal) {
    showConfirm(
      `Delete all saved data for "${cal.client_name} — ${MONTHS[cal.month]} ${cal.year}"?`,
      () => runCalendarPurge(cal),
    );
  }

  // Enforce the 3-month-per-client cap. If the client is at the cap, prompt
  // the user to confirm deletion of the oldest calendar (with its Cloudinary
  // assets). Resolves true if creation may proceed, false if the user cancels.
  async function ensureCalendarLimit(clientId, intendedMonthLabel) {
    if (!clientId) return true;
    const clientCals = allCalendars
      .filter(c => c.client_id === clientId)
      .sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
    if (clientCals.length < 3) return true;
    const oldest = clientCals[0];
    const clientName = oldest.client_name || "this client";
    return new Promise(resolve => {
      showConfirm(
        `${clientName} is at the 3-month limit. Creating ${intendedMonthLabel} will delete "${MONTHS[oldest.month]} ${oldest.year}" and all of its images. Continue?`,
        async () => { await runCalendarPurge(oldest); resolve(true); },
        () => resolve(false),
      );
    });
  }

  async function deleteClient(client) {
    showConfirm(`Delete "${client.name}" and ALL their calendar data? This cannot be undone.`, () =>
      runClientDelete(client, false)
    );
  }

  async function runClientDelete(client, force) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      showToast("Session expired — sign in again.", "error");
      return;
    }

    // Capture client's calendars BEFORE the API call — once the client row is
    // deleted, calendars cascade to client_id=NULL and we lose the mapping.
    const clientCals = allCalendars.filter(c => c.client_id === client.id);
    const calIds = clientCals.map(c => c.id);

    const url = `/api/billing/clients?id=${encodeURIComponent(client.id)}${force ? "&force=true" : ""}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) {
      let body = {};
      try { body = await res.json(); } catch { /* response wasn't JSON; fall back to empty body */ }
      if (res.status === 409 && body?.error === "client_has_invoices" && !force) {
        const n = body.invoice_count ?? "open";
        showConfirm(
          `"${client.name}" still has ${n} invoice(s) in FreshBooks after sync. Force delete anyway? The client and its local invoice rows will be removed; FreshBooks invoices stay untouched.`,
          () => runClientDelete(client, true)
        );
        return;
      }
      showToast(`Delete failed: ${body?.error || res.statusText}`, "error");
      return;
    }

    // Client row gone + FreshBooks archived. Clean up orphaned calendars + assets.
    if (calIds.length) {
      await supabase.from("calendars").update({ prev_calendar_id: null }).in("prev_calendar_id", calIds);
      const { data: allDrafts } = await supabase
        .from("calendar_drafts")
        .select("posts")
        .in("calendar_id", calIds);
      const urls = [
        ...clientCals.map(c => c.notes_image).filter(Boolean),
        ...(allDrafts ?? []).flatMap(d => Object.values(d.posts ?? {}).flat().flatMap(p => p.imageUrls ?? [])),
      ];
      await deleteCloudinaryAssets([...new Set(urls)], session.access_token);
      await supabase.from("calendars").delete().in("id", calIds);
    }

    await Promise.all([loadClients(), loadAllCalendars()]);
    if (workspaceClientId === client.id) { setWorkspaceClientId(null); setWorkspaceCalendarId(null); }
    showToast(`Deleted "${client.name}" and all their data.`, "success");
  }

  // ── Schedule ──
  async function loadScheduledPosts() {
    try {
      const { data: posts } = await supabase
        .from("scheduled_posts")
        .select("*")
        .order("post_date", { ascending: true });

      const allPosts = posts || [];

      // Fetch profiles for all visible user_ids (to show names in "who's opted in")
      const userIds = [...new Set(allPosts.map(r => r.user_id))];
      let profileMap = {};
      if (userIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);
        for (const p of profileRows || []) profileMap[p.id] = p;
      }

      setScheduledPosts(allPosts.map(r => ({ ...r, profile: profileMap[r.user_id] || null })));
    } finally {
      setScheduledPostsLoading(false);
    }
  }

  async function loadDraftPostsFor(calId) {
    const { data: drafts } = await supabase
      .from("calendar_drafts")
      .select("posts")
      .eq("calendar_id", calId)
      .order("saved_at", { ascending: false })
      .limit(1);
    return drafts?.[0]?.posts ?? {};
  }

  function buildScheduleRow(cal, day, draftPosts, userId) {
    const dayPosts = draftPosts[day] || [];
    const contentTypes = [...new Set(dayPosts.map(p => p.contentType).filter(Boolean))];
    const driveLinks = dayPosts.flatMap(p => {
      const links = [];
      if (p.url) links.push(p.url);
      if (p.videoUrl) links.push(p.videoUrl);
      if (Array.isArray(p.urls)) links.push(...p.urls.filter(Boolean));
      return links;
    }).filter(Boolean);
    const postDate = new Date(cal.year, cal.month, day).toISOString().slice(0, 10);
    return { user_id: userId, calendar_id: cal.id, client_name: cal.client_name, post_date: postDate, content_types: contentTypes, drive_links: driveLinks };
  }

  async function toggleSchedule(cal) {
    if (!user) return;
    setSchedulingCalId(cal.id);
    try {
      const isScheduled = scheduledPosts.some(r => r.calendar_id === cal.id && r.user_id === user.id);
      if (isScheduled) {
        const { error } = await supabase
          .from("scheduled_posts")
          .delete()
          .eq("user_id", user.id)
          .eq("calendar_id", cal.id);
        if (error) throw error;
        await loadScheduledPosts();
      } else {
        const draftPosts = await loadDraftPostsFor(cal.id);
        const rows = (cal.selected_days || []).map(day => ({
          ...buildScheduleRow(cal, day, draftPosts, user.id),
          notify: true,
        }));
        if (rows.length === 0) {
          showToast("This calendar has no selected days to schedule.", "warning");
          return;
        }
        const { error } = await supabase
          .from("scheduled_posts")
          .upsert(rows, { onConflict: "user_id,calendar_id,post_date", ignoreDuplicates: false });
        if (error) throw error;
        await loadScheduledPosts();
        showToast(`Scheduled ${rows.length} posting day${rows.length > 1 ? "s" : ""} for ${cal.client_name}.`, "success");
      }
    } catch (e) {
      showToast("Failed: " + e.message, "error");
    } finally {
      setSchedulingCalId(null);
    }
  }

  async function syncScheduleForCalendar(cal) {
    if (!user) return;
    const days = cal.selected_days || [];
    const draftPosts = await loadDraftPostsFor(cal.id);
    const toIso = (day) => new Date(cal.year, cal.month, day).toISOString().slice(0, 10);
    const targetDates = days.map(toIso);
    const existingRows = scheduledPosts.filter(r => r.calendar_id === cal.id && r.user_id === user.id);
    const existingDates = existingRows.map(r => r.post_date);

    // Insert new rows with notify: true (don't touch existing rows' notify preference)
    const newDays = days.filter(day => !existingDates.includes(toIso(day)));
    if (newDays.length > 0) {
      const newRows = newDays.map(day => ({ ...buildScheduleRow(cal, day, draftPosts, user.id), notify: true }));
      await supabase.from("scheduled_posts").insert(newRows);
    }

    // Update content for existing rows (preserve notify)
    for (const row of existingRows) {
      if (targetDates.includes(row.post_date)) {
        const day = days.find(d => toIso(d) === row.post_date);
        if (day !== undefined) {
          const { content_types, drive_links } = buildScheduleRow(cal, day, draftPosts, user.id);
          await supabase.from("scheduled_posts")
            .update({ content_types, drive_links, client_name: cal.client_name })
            .eq("id", row.id);
        }
      }
    }

    // Delete rows for days no longer selected
    const toDelete = existingRows.filter(r => !targetDates.includes(r.post_date));
    if (toDelete.length > 0) {
      await supabase.from("scheduled_posts").delete().in("id", toDelete.map(r => r.id));
    }

    await loadScheduledPosts();
  }

  async function queueDays(cal, days) {
    if (!user || !cal || !days?.length) return;
    const draftPosts = await loadDraftPostsFor(cal.id);
    const rows = days.map(day => ({
      ...buildScheduleRow(cal, day, draftPosts, user.id),
      notify: true,
    }));
    const { error } = await supabase
      .from("scheduled_posts")
      .upsert(rows, { onConflict: "user_id,calendar_id,post_date", ignoreDuplicates: false });
    if (error) {
      showToast("Failed: " + error.message, "error");
      return;
    }
    await loadScheduledPosts();
    showToast(`Opted in to ${rows.length} day${rows.length > 1 ? "s" : ""}.`, "success");
  }

  async function toggleNotify(rowId, notify) {
    await supabase.from("scheduled_posts").update({ notify }).eq("id", rowId);
    setScheduledPosts(prev => prev.map(r => r.id === rowId ? { ...r, notify } : r));
  }

  async function removeScheduledPost(id) {
    await supabase.from("scheduled_posts").delete().eq("id", id);
    setScheduledPosts(prev => prev.filter(r => r.id !== id));
  }

  const stepLabels = ["Pick Days", "Content", "Preview"];

  // ── Create-only path. Returns the resolved calendar (new or existing match)
  // or null if cancelled / failed. Does not navigate.
  async function createCalendarForClient(client, fromCalendar, override) {
    let nextMonth, nextYear;
    if (override) {
      nextMonth = override.month;
      nextYear = override.year;
    } else if (fromCalendar) {
      nextMonth = (fromCalendar.month + 1) % 12;
      nextYear = fromCalendar.month === 11 ? fromCalendar.year + 1 : fromCalendar.year;
    } else {
      nextMonth = today.getMonth();
      nextYear = today.getFullYear();
    }

    // If the user picks an existing month, return it instead of creating a duplicate.
    const existing = allCalendars.find(c =>
      c.client_id === client.id && c.month === nextMonth && c.year === nextYear
    );
    if (existing) {
      showToast(`${MONTHS[nextMonth]} ${nextYear} already exists for ${client.name} — opening it`, "info");
      return existing;
    }

    const proceed = await ensureCalendarLimit(client.id, `${MONTHS[nextMonth]} ${nextYear}`);
    if (!proceed) return null;

    const { data: newCal, error } = await supabase
      .from("calendars")
      .insert({
        user_id: user.id,
        client_name: client.name,
        client_id: client.id,
        month: nextMonth,
        year: nextYear,
        prev_calendar_id: fromCalendar?.id || null,
        selected_days: [],
        posts_per_page: 3,
      })
      .select()
      .single();

    if (error) { showToast("Failed to create new month: " + error.message, "error"); return null; }

    // Carry the previous month's pinned-slot count forward so the new month
    // opens with the same pin reservation already applied.
    if (fromCalendar) {
      const { data: drafts } = await supabase
        .from("calendar_drafts")
        .select("posts")
        .eq("calendar_id", fromCalendar.id)
        .order("saved_at", { ascending: false })
        .limit(1);
      const carry = drafts?.[0]?.posts?._meta?.pinnedCount ?? 0;
      if (carry > 0) {
        await supabase.from("calendar_drafts").insert({
          calendar_id: newCal.id,
          user_id: user.id,
          label: `Pins from ${MONTHS[fromCalendar.month]} ${fromCalendar.year}`,
          posts: { _meta: { pinnedCount: carry } },
          saved_at: new Date().toISOString(),
        });
      }
    }

    await loadAllCalendars();
    showToast(`Created ${MONTHS[nextMonth]} ${nextYear} for ${client.name}`, "success");
    return newCal;
  }

  // ── New month for client (month continuity) ──
  // Opens the newly-created calendar in MonthWorkspace. Optional `override`
  // = { month, year } skips auto-advance and uses the user's pick.
  async function newMonthForClient(client, fromCalendar, override) {
    const cal = await createCalendarForClient(client, fromCalendar, override);
    if (cal) setWorkspaceCalendarId(cal.id);
  }

  // ── Content Plan helpers ──
  async function loadAllContentPlans() {
    if (!user) { setContentPlansLoading(false); return; }
    try {
      const { data } = await supabase
        .from("content_plans")
        .select("*, clients(id, name, email, phone)")
        .order("updated_at", { ascending: false });
      setAllContentPlans(data || []);
    } finally {
      setContentPlansLoading(false);
    }
  }

  function deleteContentPlan(plan) {
    showConfirm(`Delete "${plan.client_name}" content plan? This cannot be undone.`, async () => {
      try {
        await supabase.from("content_plan_items").delete().eq("plan_id", plan.id);
        await supabase.from("content_plans").delete().eq("id", plan.id);
        setAllContentPlans(prev => prev.filter(p => p.id !== plan.id));
      } catch (err) {
        console.error("Delete failed:", err);
      }
    });
  }

  function generateCPItems(producedN, organicN, existing = []) {
    const items = [];
    for (let i = 1; i <= producedN; i++) {
      const prev = existing.find(x => x.item_type === "produced" && x.item_number === i);
      items.push({
        _localId: `prod-${i}-${Date.now()}`,
        id: prev?.id ?? null,
        item_type: "produced",
        item_number: i,
        title: prev?.title ?? "",
        whats_needed: prev?.whats_needed ?? "",
        reference_link: prev?.reference_link ?? "",
        creator_name: prev?.creator_name ?? "",
        approval_status: prev?.approval_status ?? "pending",
        client_notes: prev?.client_notes ?? "",
      });
    }
    for (let i = 1; i <= organicN; i++) {
      const prev = existing.find(x => x.item_type === "organic" && x.item_number === i);
      items.push({
        _localId: `org-${i}-${Date.now()}`,
        id: prev?.id ?? null,
        item_type: "organic",
        item_number: i,
        title: prev?.title ?? "",
        whats_needed: prev?.whats_needed ?? "",
        reference_link: prev?.reference_link ?? "",
        creator_name: prev?.creator_name ?? "",
        approval_status: prev?.approval_status ?? "pending",
        client_notes: prev?.client_notes ?? "",
      });
    }
    return items;
  }

  function updateCPItem(localId, field, value) {
    setCpItems(prev => prev.map(it => it._localId === localId ? { ...it, [field]: value } : it));
  }

  function addCPReferenceImages(urls) {
    setCpReferenceImages(prev => [...new Set([...prev, ...urls])]);
  }

  function removeCPReferenceImage(idx) {
    setCpReferenceImages(prev => prev.filter((_, i) => i !== idx));
  }

  async function saveContentPlan(silent = false) {
    if (!user || !cpClientName.trim()) return;
    if (!silent) setCpSaving(true);
    try {
      const { data: planRow, error: planErr } = await supabase
        .from("content_plans")
        .upsert({
          ...(currentCPId ? { id: currentCPId } : {}),
          user_id: user.id,
          client_name: cpClientName.trim(),
          client_id: cpClientId || null,
          month: cpMonth,
          year: cpYear,
          shoot_date: cpShootDate,
          reference_images: cpReferenceImages,
          updated_at: new Date().toISOString(),
          last_updated_by: userProfile?.full_name || user?.email,
        }, { onConflict: "id" })
        .select()
        .single();
      if (planErr) throw planErr;
      if (!currentCPId) setCurrentCPId(planRow.id);

      const planId = planRow.id;
      for (const item of cpItems) {
        const { data: savedItem, error: itemErr } = await supabase
          .from("content_plan_items")
          .upsert({
            ...(item.id ? { id: item.id } : {}),
            plan_id: planId,
            item_type: item.item_type,
            item_number: item.item_number,
            title: item.title,
            whats_needed: item.whats_needed,
            reference_link: item.reference_link,
            creator_name: item.creator_name,
            approval_status: item.approval_status,
            client_notes: item.client_notes,
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" })
          .select()
          .single();
        if (itemErr) throw itemErr;
        if (!item.id && savedItem) {
          setCpItems(prev => prev.map(it => it._localId === item._localId ? { ...it, id: savedItem.id } : it));
        }
      }
      if (!silent) showToast("Content plan saved!", "success");
      loadAllContentPlans();
      return planId;
    } catch (e) {
      if (!silent) showToast("Save failed: " + e.message, "error");
    } finally {
      if (!silent) setCpSaving(false);
    }
  }

  async function openContentPlan(plan) {
    const { data: items } = await supabase
      .from("content_plan_items")
      .select("*")
      .eq("plan_id", plan.id)
      .order("item_type")
      .order("item_number");
    setCurrentCPId(plan.id);
    setCpClientId(plan.client_id || null);
    setCpClientName(plan.client_name);
    setCpMonth(plan.month);
    setCpYear(plan.year);
    setCpShootDate(plan.shoot_date || "PENDING");
    setCpReferenceImages(plan.reference_images || []);
    const produced = (items || []).filter(x => x.item_type === "produced");
    const organic = (items || []).filter(x => x.item_type === "organic");
    setCpProducedCount(produced.length || 2);
    setCpOrganicCount(organic.length || 3);
    const hydratedItems = (items || []).map(it => ({ ...it, _localId: `${it.item_type}-${it.item_number}-${Date.now()}` }));
    setCpItems(hydratedItems);
    setActiveCPStep(2);
  }

  function newContentPlan() {
    setCurrentCPId(null);
    setCpClientId(null);
    setCpClientName("");
    setCpMonth(today.getMonth());
    setCpYear(today.getFullYear());
    setCpShootDate("PENDING");
    setCpProducedCount(2);
    setCpOrganicCount(3);
    setCpItems([]);
    setCpReferenceImages([]);
    setPinterestOpen(false);
    setActiveCPStep(1);
  }

  async function getOrCreateShareToken(planId) {
    const { data: plan } = await supabase
      .from("content_plans")
      .select("*, clients(id, name, email, phone)")
      .eq("id", planId)
      .single();
    const { data: existing } = await supabase
      .from("content_plan_shares")
      .select("*")
      .eq("plan_id", planId)
      .maybeSingle();
    const share = existing || (await supabase
      .from("content_plan_shares")
      .insert({ plan_id: planId, allow_client_notes: true })
      .select()
      .single()).data;
    if (!share) throw new Error("Failed to create share token");
    const url = `${window.location.origin}/?cp=${share.token}`;
    setCpShareModal({ planId, token: share.token, url, client: plan?.clients || null });
    setCpShareMethod("email");
    setCpShareError("");
    setCpShareSuccess("");
    return share;
  }

  async function doSendContentPlan(overridePhone, overrideEmail) {
    setCpShareBusy(true); setCpShareError(""); setCpShareSuccess("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/share-content-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          planId: cpShareModal.planId,
          method: cpShareMethod,
          ...(overridePhone !== null ? { overridePhone } : {}),
          ...(overrideEmail !== null ? { overrideEmail } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send");
      const label = cpShareMethod === "both" ? "email & SMS" : cpShareMethod;
      setCpShareSuccess(`Sent via ${label}`);
    } catch (e) { setCpShareError(e.message); }
    setCpShareBusy(false);
  }

  // Auto-save content plan
  useEffect(() => {
    if (!cpClientName.trim() || !user) return;
    if (cpAutoSaveTimerRef.current) clearTimeout(cpAutoSaveTimerRef.current);
    cpAutoSaveTimerRef.current = setTimeout(() => {
      saveContentPlanRef.current?.(true);
    }, 12000);
    return () => clearTimeout(cpAutoSaveTimerRef.current);
  }, [cpItems, cpClientName, cpMonth, cpYear, cpShootDate, user]);

  // Auto-sync schedule when selected days change (only if user is already opted in)
  useEffect(() => {
    if (!currentCalendarId || !user?.id) return;
    const sorted = (arr) => [...arr].sort((a, b) => a - b).join(",");
    if (sorted(selectedDays) === sorted(initialSelectedDaysRef.current)) return;
    const isOptedIn = scheduledPosts.some(r => r.calendar_id === currentCalendarId && r.user_id === user.id);
    if (!isOptedIn) return;
    const cal = allCalendars.find(c => c.id === currentCalendarId);
    if (!cal) return;
    const daysSnapshot = [...selectedDays];
    const timer = setTimeout(() => {
      scheduleSyncFnRef.current?.({ ...cal, selected_days: daysSnapshot });
      initialSelectedDaysRef.current = daysSnapshot;
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally watches scheduledPosts.length only (not full array); syncScheduleForCalendar is invoked via ref
  }, [selectedDays, currentCalendarId, user?.id, scheduledPosts.length, allCalendars]);

  if (window.location.pathname === "/privacy-policy") return <PrivacyPolicyView />;

  if (cpPublicToken) return <ErrorBoundary><ContentPlanPublicView token={cpPublicToken} /></ErrorBoundary>;
  if (cpExportToken) return <ContentPlanExportView token={cpExportToken} />;
  if (billingExportToken) return <BillingInvoiceExportView token={billingExportToken} />;

  if (authLoading && !exportMode) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: MONO, background: C.canvas, color: C.accent, fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>Loading…</div>;

  if (!user && !exportMode) return (
    <ErrorBoundary>
      <AuthView
        authMode={authMode} setAuthMode={setAuthMode}
        authEmail={authEmail} setAuthEmail={setAuthEmail}
        authPassword={authPassword} setAuthPassword={setAuthPassword}
        authError={authError} authBusy={authBusy}
        signIn={signIn} signUp={signUp} resetPassword={resetPassword}
      />
    </ErrorBoundary>
  );

  if (showInviteSetup && user) return (
    <ErrorBoundary>
      <InviteSetupView
        inviteName={inviteName} setInviteName={setInviteName}
        inviteEmail={inviteEmail} setInviteEmail={setInviteEmail}
        invitePassword={invitePassword} setInvitePassword={setInvitePassword}
        invitePasswordConfirm={invitePasswordConfirm} setInvitePasswordConfirm={setInvitePasswordConfirm}
        inviteRole={user?.user_metadata?.role}
        saveInviteSetup={saveInviteSetup}
        inviteSetupBusy={inviteSetupBusy}
        inviteSetupError={inviteSetupError}
      />
    </ErrorBoundary>
  );

  if (showProfileSetup) return (
    <ErrorBoundary>
      <ProfileSetupView
        profileInput={profileInput}
        setProfileInput={setProfileInput}
        saveProfile={saveProfile}
        profilePhone={profilePhone}
        setProfilePhone={setProfilePhone}
        profileSmsConsent={profileSmsConsent}
        setProfileSmsConsent={setProfileSmsConsent}
      />
    </ErrorBoundary>
  );

  if (showDashboard && !exportMode) return (
    <ErrorBoundary>
    <AppContext.Provider value={{ can, showToast, user, isOnline, clients, allCalendars, createCalendarForClient }}>
      <DashboardPortal
        activePortal={activePortal} setActivePortal={setActivePortal}
        profileName={profileName} profileInput={profileInput} setProfileInput={setProfileInput}
        saveProfile={saveProfile} editingProfile={editingProfile} setEditingProfile={setEditingProfile}
        exporting={exporting} exportProgress={exportProgress} exportElapsed={exportElapsed}
        allCalendars={allCalendars} calCreators={calCreators} schedulingCalId={schedulingCalId}
        openCalendar={openCalendar} deleteCalendar={deleteCalendar} addToSchedule={toggleSchedule}
        loadAdminUsers={loadAdminUsers} loadRoleToolDefaults={loadRoleToolDefaults} loadAllContentPlans={loadAllContentPlans}
        scheduledPosts={scheduledPosts} removeScheduledPost={removeScheduledPost} toggleNotify={toggleNotify}
        queueDays={queueDays} loadDraftPostsFor={loadDraftPostsFor}
        calendarsLoading={calendarsLoading} contentPlansLoading={contentPlansLoading} scheduledPostsLoading={scheduledPostsLoading}
        adminUsers={adminUsers} adminLoading={adminLoading}
        roleToolDefaults={roleToolDefaults} rolePermsBusy={rolePermsBusy} saveRoleToolDefaults={saveRoleToolDefaults}
        inviteModal={inviteModal} setInviteModal={setInviteModal}
        inviteForm={inviteForm} setInviteForm={setInviteForm}
        inviteBusy={inviteBusy} inviteError={inviteError} setInviteError={setInviteError}
        doInviteUser={doInviteUser}
        editingUser={editingUser} setEditingUser={setEditingUser}
        editUserForm={editUserForm} setEditUserForm={setEditUserForm}
        editUserBusy={editUserBusy} doUpdateUser={doUpdateUser}
        doDeleteUser={doDeleteUser} deleteUserBusy={deleteUserBusy} currentUserId={user?.id}
        currentCPId={currentCPId} setCurrentCPId={setCurrentCPId}
        activeCPStep={activeCPStep} setActiveCPStep={setActiveCPStep}
        cpClientName={cpClientName} setCpClientName={setCpClientName}
        cpMonth={cpMonth} setCpMonth={setCpMonth}
        cpYear={cpYear} setCpYear={setCpYear}
        cpShootDate={cpShootDate} setCpShootDate={setCpShootDate}
        cpProducedCount={cpProducedCount} setCpProducedCount={setCpProducedCount}
        cpOrganicCount={cpOrganicCount} setCpOrganicCount={setCpOrganicCount}
        cpItems={cpItems} setCpItems={setCpItems} cpSaving={cpSaving}
        allContentPlans={allContentPlans} clients={clients} setClients={setClients}
        cpClientId={cpClientId} setCpClientId={setCpClientId}
        addingClient={addingClient} setAddingClient={setAddingClient}
        newClientInput={newClientInput} setNewClientInput={setNewClientInput}
        newContentPlan={newContentPlan} openContentPlan={openContentPlan}
        saveContentPlan={saveContentPlan} deleteContentPlan={deleteContentPlan} generateCPItems={generateCPItems} updateCPItem={updateCPItem}
        getOrCreateShareToken={getOrCreateShareToken}
        cpShareModal={cpShareModal} setCpShareModal={setCpShareModal}
        cpShareEmail={cpShareEmail} setCpShareEmail={setCpShareEmail}
        cpShareMethod={cpShareMethod} setCpShareMethod={setCpShareMethod}
        cpShareBusy={cpShareBusy} setCpShareBusy={setCpShareBusy}
        cpShareError={cpShareError} setCpShareError={setCpShareError}
        cpShareSuccess={cpShareSuccess} setCpShareSuccess={setCpShareSuccess}
        doSendContentPlan={doSendContentPlan}
        cpReferenceImages={cpReferenceImages}
        addCPReferenceImages={addCPReferenceImages}
        removeCPReferenceImage={removeCPReferenceImage}
        pinterestToken={pinterestToken} setPinterestToken={setPinterestToken}
        pinterestOpen={pinterestOpen} setPinterestOpen={setPinterestOpen}
        pinterestPanelWidth={pinterestPanelWidth} setPinterestPanelWidth={setPinterestPanelWidth}
        signOut={signOut}
        workspaceClientId={workspaceClientId} setWorkspaceClientId={setWorkspaceClientId}
        workspaceCalendarId={workspaceCalendarId} setWorkspaceCalendarId={setWorkspaceCalendarId}
        newMonthForClient={newMonthForClient}
        addClientDirect={addClientDirect}
        toggleClientSmmActive={toggleClientSmmActive}
        deleteClient={deleteClient}
      />
      <ConfirmDialog confirmDialog={confirmDialog} setConfirmDialog={setConfirmDialog} />
    </AppContext.Provider>
    </ErrorBoundary>
  );


  return (
    <ErrorBoundary>
    <AppContext.Provider value={{ can, showToast, user, isOnline, clients, allCalendars, createCalendarForClient }}>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        {step === 1 && (
          <Sidebar
            activePortal={activePortal}
            setActivePortal={(key) => { setActivePortal(key); setShowDashboard(true); }}
            profileName={profileName}
            scheduledPosts={scheduledPosts}
            can={can}
            signOut={signOut}
            setProfileInput={setProfileInput}
            setEditingProfile={setEditingProfile}
            loadAllContentPlans={loadAllContentPlans}
            loadAdminUsers={loadAdminUsers}
            loadRoleToolDefaults={loadRoleToolDefaults}
            adminUsers={adminUsers || []}
            roleToolDefaults={roleToolDefaults}
            onOpenRolePerms={() => { setActivePortal(PORTALS.ADMIN); setShowDashboard(true); }}
            clients={(clients || []).filter(c => c.smm_active !== false)}
            workspaceClientId={workspaceClientId}
            onSelectClient={(id) => { setWorkspaceClientId(id); setWorkspaceCalendarId(null); setActivePortal(PORTALS.CLIENTS); setShowDashboard(true); }}
            addClientDirect={addClientDirect}
          />
        )}
        <div style={{ flex: 1, overflowY: "auto" }}>
      <CalendarBuilder
        step={step} setStep={setStep} stepLabels={stepLabels}
        clientName={clientName} setClientName={setClientName}
        clientId={clientId} setClientId={setClientId}
        month={month} setMonth={setMonth} year={year} setYear={setYear}
        selectedDays={selectedDays} setSelectedDays={setSelectedDays} posts={posts} setPosts={setPosts}
        postsPerPage={postsPerPage} setPostsPerPage={setPostsPerPage}
        currentCalendarId={currentCalendarId}
        allPosts={allPosts} feedPosts={feedPosts} pages={pages} sortedDays={sortedDays} calendarCells={calendarCells} daysInMonth={daysInMonth}
        toggleDay={toggleDay} changeDay={changeDay} addPostToDay={addPostToDay} removePostFromDay={removePostFromDay}
        swapPostContent={swapPostContent} removeImageFromPost={removeImageFromPost}
        updatePost={updatePost}
        clients={(clients || []).filter(c => c.smm_active !== false)}
        addingClient={addingClient} setAddingClient={setAddingClient}
        newClientInput={newClientInput} setNewClientInput={setNewClientInput}
        addNewClient={addNewClient}
        canUndo={canUndo} undo={undo} canRedo={canRedo} redo={redo} resetCalendar={resetCalendar}
        exporting={exporting} exportProgress={exportProgress} exportElapsed={exportElapsed}
        exportMode={exportMode}
        saveDraft={saveDraft} exportPDF={exportPDF}
        profileName={profileName} profileInput={profileInput} setProfileInput={setProfileInput}
        saveProfile={saveProfile} editingProfile={editingProfile} setEditingProfile={setEditingProfile}
        showDraftHistory={showDraftHistory} setShowDraftHistory={setShowDraftHistory}
        draftHistory={draftHistory} restoreDraft={restoreDraft} loadDraftHistory={loadDraftHistory}
        wasOffline={wasOffline}
        signOut={signOut} realtimeChannelRef={realtimeChannelRef} setShowDashboard={setShowDashboard}
        driveToken={driveToken} setDriveToken={setDriveToken}
        driveOpen={driveOpen} setDriveOpen={setDriveOpen}
        drivePanelWidth={drivePanelWidth} setDrivePanelWidth={setDrivePanelWidth}
        driveUploadProgress={driveUploadProgress}
        linkPickMode={linkPickMode} setLinkPickMode={setLinkPickMode}
        pinnedCount={pinnedCount} setPinnedCount={setPinnedCount}
        calendarNotes={calendarNotes} setCalendarNotes={setCalendarNotes}
        calendarNotesImage={calendarNotesImage} setCalendarNotesImage={setCalendarNotesImage}
        handleFiles={handleFiles} handleBatchImport={handleBatchImport}
        handleDriveFileDrop={handleDriveFileDrop} handleMultiDriveFileDrop={handleMultiDriveFileDrop}
        handleDriveBatchImport={handleDriveBatchImport}
        connectDrive={connectDrive}
      />
        </div>
      </div>
      <ConfirmDialog confirmDialog={confirmDialog} setConfirmDialog={setConfirmDialog} />
    </AppContext.Provider>
    </ErrorBoundary>
  );

}

function ConfirmDialog({ confirmDialog, setConfirmDialog }) {
  const cancel = () => { confirmDialog.onCancel?.(); setConfirmDialog(d => ({ ...d, open: false })); };
  const confirm = () => { confirmDialog.onConfirm?.(); setConfirmDialog(d => ({ ...d, open: false })); };
  return (
    <AppDialog open={confirmDialog.open} onClose={cancel} title="Confirm">
      <p style={{ fontSize: 14, color: C.meta, fontFamily: SANS, marginTop: 8, marginBottom: 24, lineHeight: "160%" }}>{confirmDialog.message}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={cancel} style={ghostBtn}>Cancel</button>
        <button onClick={confirm} style={dangerBtn}>Confirm</button>
      </div>
    </AppDialog>
  );
}
