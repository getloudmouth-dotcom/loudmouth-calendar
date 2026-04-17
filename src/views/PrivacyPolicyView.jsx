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
        <p style={S.updated}>Last updated: April 16, 2026</p>

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

        <h2 style={S.h2}>5. Data Sharing</h2>
        <p style={S.p}>We do not sell, rent, or share your personal information with third parties for marketing purposes. We use Twilio to deliver SMS messages and Supabase to store platform data — both operate under their own privacy and security policies.</p>

        <h2 style={S.h2}>6. Data Retention</h2>
        <p style={S.p}>We retain your information for as long as your account is active or as needed to provide services. You may request deletion of your data by contacting us at the address below.</p>

        <h2 style={S.h2}>7. Contact</h2>
        <p style={S.p}>For questions about this policy or to request data deletion: <span style={S.strong}>hello@getloudmouth.work</span></p>

        <hr style={S.divider} />

        {/* ── TERMS & CONDITIONS ── */}
        <h1 style={{ ...S.h1, fontSize: 22, marginBottom: 8 }}>SMS Terms & Conditions</h1>
        <p style={{ ...S.updated, marginBottom: 24 }}>Last updated: April 16, 2026</p>

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
