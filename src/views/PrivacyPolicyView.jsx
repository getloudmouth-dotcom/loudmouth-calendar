export default function PrivacyPolicyView() {
  const S = {
    page: { minHeight: "100vh", background: "#1a1a2e", fontFamily: "'Helvetica Neue', Arial, sans-serif", padding: "60px 24px" },
    wrap: { maxWidth: 720, margin: "0 auto" },
    logo: { fontWeight: 900, fontSize: 16, letterSpacing: "0.08em", color: "#D7FA06", marginBottom: 8 },
    sub: { fontSize: 11, color: "#555", letterSpacing: "0.06em", marginBottom: 48 },
    h1: { fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 8 },
    updated: { fontSize: 12, color: "#555", marginBottom: 48 },
    h2: { fontSize: 16, fontWeight: 800, color: "#D7FA06", marginBottom: 10, marginTop: 36, textTransform: "uppercase", letterSpacing: "0.06em" },
    p: { fontSize: 14, color: "#aaa", lineHeight: 1.8, marginBottom: 12 },
    li: { fontSize: 14, color: "#aaa", lineHeight: 1.8, marginBottom: 6, marginLeft: 20 },
    strong: { color: "#ddd" },
    divider: { border: "none", borderTop: "1px solid #2a2a2a", margin: "48px 0" },
    kbd: { background: "#222", color: "#D7FA06", padding: "2px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 13, fontWeight: 700 },
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.logo}>LOUDMOUTH HQ</div>
        <div style={S.sub}>by Loudmouth Creative, LLC</div>

        <h1 style={S.h1}>Privacy Policy & Terms of Service</h1>
        <p style={S.updated}>Last updated: April 18, 2026</p>

        {/* ── PRIVACY POLICY ── */}
        <h2 style={S.h2}>1. Who We Are</h2>
        <p style={S.p}>Loudmouth Creative, LLC ("Loudmouth", "we", "us") operates the platform at <span style={S.strong}>getloudmouth.work</span>. We provide social media management tools, content calendar creation, and billing services for our clients and team members.</p>

        <h2 style={S.h2}>2. Information We Collect</h2>
        <ul style={{ listStyle: "disc", paddingLeft: 0 }}>
          <li style={S.li}><span style={S.strong}>Account information:</span> Name, email address, job title, and role.</li>
          <li style={S.li}><span style={S.strong}>Phone number:</span> Collected voluntarily during account setup or client onboarding for SMS notifications.</li>
          <li style={S.li}><span style={S.strong}>Usage data:</span> Content calendar activity, scheduled posts, and billing interactions within the platform.</li>
          <li style={S.li}><span style={S.strong}>Consent records:</span> Timestamps recording when SMS consent was given.</li>
        </ul>

        <h2 style={S.h2}>3. How We Use Your Information</h2>
        <p style={S.p}>We use your information solely to provide and improve the Loudmouth platform. Specifically:</p>
        <ul style={{ listStyle: "disc", paddingLeft: 0 }}>
          <li style={S.li}><span style={S.strong}>Team members</span> receive SMS notifications for scheduling, post approvals, reminders, and team updates.</li>
          <li style={S.li}><span style={S.strong}>Clients</span> receive SMS notifications for invoices, billing updates, and content review links.</li>
          <li style={S.li}>We do <span style={S.strong}>not</span> send unsolicited marketing messages or share your phone number with third parties.</li>
        </ul>

        <h2 style={S.h2}>4. SMS Opt-Out</h2>
        <p style={S.p}>You can opt out of SMS notifications at any time by replying <span style={S.kbd}>STOP</span> to any message you receive from us. You can also contact us directly to request removal. After opting out, you will not receive further SMS messages unless you re-consent.</p>

        <h2 style={S.h2}>5. Pinterest Integration</h2>
        <p style={S.p}>Loudmouth Calendar integrates with the Pinterest API to allow clients to browse their own Pinterest boards and saved pins as visual references within their content planning workflow. The following applies to this integration:</p>
        <ul style={{ listStyle: "disc", paddingLeft: 0 }}>
          <li style={S.li}><span style={S.strong}>Authentication:</span> Pinterest data is only accessed after a user explicitly authenticates via Pinterest's official OAuth flow. We never access Pinterest data without your direct consent.</li>
          <li style={S.li}><span style={S.strong}>Data accessed:</span> We request read-only access to your Pinterest boards and pins (<span style={S.kbd}>boards:read</span>, <span style={S.kbd}>pins:read</span>, <span style={S.kbd}>user_accounts:read</span>). We do not request write permissions and do not post to Pinterest on your behalf.</li>
          <li style={S.li}><span style={S.strong}>How it's used:</span> Pinterest board and pin data is displayed within your Loudmouth content calendar session solely as visual inspiration and reference material. It is not stored on our servers beyond your active session.</li>
          <li style={S.li}><span style={S.strong}>No data selling or sharing:</span> We do not sell, transfer, or share your Pinterest data with any third party.</li>
          <li style={S.li}><span style={S.strong}>Revoking access:</span> You can revoke Loudmouth's access to your Pinterest account at any time via <span style={S.strong}>Pinterest Settings → Security → Apps with access to your Pinterest account</span>.</li>
        </ul>

        <h2 style={S.h2}>6. Google Drive Integration</h2>
        <p style={S.p}>Loudmouth Calendar integrates with Google Drive to allow team members to attach files, export content plans, and share assets within the platform workflow.</p>
        <ul style={{ listStyle: "disc", paddingLeft: 0 }}>
          <li style={S.li}><span style={S.strong}>Authentication:</span> Google Drive is accessed only after you authenticate via Google's official OAuth flow. We request only the permissions necessary to read and upload files on your behalf.</li>
          <li style={S.li}><span style={S.strong}>Data accessed:</span> We access files you explicitly select or export through the platform. We do not scan, index, or read the contents of your broader Google Drive.</li>
          <li style={S.li}><span style={S.strong}>How it's used:</span> Files are attached to content calendar entries or used for PDF/document exports. We do not store your Google Drive credentials on our servers.</li>
          <li style={S.li}><span style={S.strong}>Revoking access:</span> You can revoke Loudmouth's Google access at any time via <span style={S.strong}>Google Account Settings → Security → Third-party apps with account access</span>.</li>
          <li style={S.li}><span style={S.strong}>Google's policy:</span> Google's privacy policy applies to all data processed through their services: <span style={S.strong}>policies.google.com/privacy</span></li>
        </ul>

        <h2 style={S.h2}>7. FreshBooks Integration</h2>
        <p style={S.p}>Loudmouth Calendar integrates with FreshBooks to sync client and billing information for invoicing and payment tracking within the platform.</p>
        <ul style={{ listStyle: "disc", paddingLeft: 0 }}>
          <li style={S.li}><span style={S.strong}>Authentication:</span> FreshBooks is connected via OAuth using your FreshBooks account credentials. We never store your FreshBooks password.</li>
          <li style={S.li}><span style={S.strong}>Data accessed:</span> We sync client names, contact details, invoice records, and payment statuses from your FreshBooks account to display billing information within Loudmouth.</li>
          <li style={S.li}><span style={S.strong}>How it's used:</span> Synced data is used solely to display billing status and client records inside the Loudmouth platform. We do not use your FreshBooks data for any other purpose.</li>
          <li style={S.li}><span style={S.strong}>No data selling:</span> FreshBooks billing data is never sold, rented, or shared with any third party.</li>
          <li style={S.li}><span style={S.strong}>Revoking access:</span> You can disconnect Loudmouth from FreshBooks via <span style={S.strong}>FreshBooks Settings → Connected Apps</span>.</li>
          <li style={S.li}><span style={S.strong}>FreshBooks' policy:</span> FreshBooks' privacy policy applies to all data in their system: <span style={S.strong}>freshbooks.com/policies/privacy-policy</span></li>
        </ul>

        <h2 style={S.h2}>8. Third-Party Services</h2>
        <p style={S.p}>We do not sell, rent, or share your personal information with third parties for marketing purposes. The following services process data on our behalf to operate the platform:</p>
        <ul style={{ listStyle: "disc", paddingLeft: 0 }}>
          <li style={S.li}><span style={S.strong}>Supabase:</span> Stores all platform data including user accounts, content calendars, and billing records. Data is encrypted at rest and in transit. Privacy policy: <span style={S.strong}>supabase.com/privacy</span></li>
          <li style={S.li}><span style={S.strong}>Twilio:</span> Delivers SMS notifications. Your phone number and message content are transmitted to Twilio solely to deliver messages you have consented to receive. Privacy policy: <span style={S.strong}>twilio.com/en-us/legal/privacy</span></li>
          <li style={S.li}><span style={S.strong}>Resend:</span> Delivers transactional emails such as invitations, password resets, and account notifications. Your email address and message content are transmitted to Resend for delivery only. Privacy policy: <span style={S.strong}>resend.com/legal/privacy-policy</span></li>
        </ul>

        <h2 style={S.h2}>9. Data Retention</h2>
        <p style={S.p}>We retain your information for as long as your account is active or as needed to provide services. You may request deletion of your data by contacting us at the address below.</p>

        <h2 style={S.h2}>10. Contact</h2>
        <p style={S.p}>For questions about this policy or to request data deletion: <span style={S.strong}>hello@getloudmouth.work</span></p>

        <hr style={S.divider} />

        {/* ── TERMS & CONDITIONS ── */}
        <h1 style={{ ...S.h1, fontSize: 22, marginBottom: 8 }}>SMS Terms & Conditions</h1>
        <p style={{ ...S.updated, marginBottom: 24 }}>Last updated: April 18, 2026</p>

        <h2 style={S.h2}>Program Name</h2>
        <p style={S.p}>Loudmouth SMS Notifications</p>

        <h2 style={S.h2}>Description</h2>
        <p style={S.p}>Loudmouth sends transactional SMS notifications to team members and clients. Messages include scheduling reminders, post approval requests, invoice notifications, billing updates, and content review links.</p>

        <h2 style={S.h2}>Message Frequency</h2>
        <p style={S.p}>Message frequency varies based on your account activity. You may receive multiple messages per week depending on your role and active projects.</p>

        <h2 style={S.h2}>Message & Data Rates</h2>
        <p style={S.p}>Message and data rates may apply depending on your mobile carrier plan.</p>

        <h2 style={S.h2}>How to Get Help</h2>
        <p style={S.p}>Reply <span style={S.kbd}>HELP</span> to any message for assistance, or contact us at <span style={S.strong}>hello@getloudmouth.work</span>.</p>

        <h2 style={S.h2}>How to Opt Out</h2>
        <p style={S.p}>Reply <span style={S.kbd}>STOP</span> to any message at any time to stop receiving SMS notifications from Loudmouth. You will receive a one-time confirmation message and then no further messages.</p>

        <p style={{ ...S.p, marginTop: 48, color: "#444", fontSize: 12 }}>© {new Date().getFullYear()} Loudmouth Creative, LLC · getloudmouth.work</p>
      </div>
    </div>
  );
}
