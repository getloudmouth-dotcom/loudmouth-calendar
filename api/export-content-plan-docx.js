// /api/export-content-plan-docx.js
// POST body: { planId }
// Authorization: Bearer <user JWT>
// Generates and returns a DOCX file matching the East Ocean content plan format.

import { createClient } from "@supabase/supabase-js";
import {
import { withSentry } from './_sentry.js';
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  ShadingType,
  BorderStyle,
  HeadingLevel,
} from "docx";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

let _supabaseCache = { url: "", key: "", client: null };
function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or service key");
  if (_supabaseCache.client && _supabaseCache.url === url && _supabaseCache.key === key) return _supabaseCache.client;
  _supabaseCache = { url, key, client: createClient(url, key, { auth: { persistSession: false } }) };
  return _supabaseCache.client;
}

function darkCellBackground() {
  return { fill: "1a1a2e", type: ShadingType.CLEAR, color: "1a1a2e" };
}

function lightCellBorder() {
  const b = { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" };
  return { top: b, bottom: b, left: b, right: b };
}

function approvalText(status) {
  if (status === "approved") return "Yes";
  if (status === "denied") return "No";
  return "TBD";
}

function headerCell(text) {
  return new TableCell({
    shading: darkCellBackground(),
    borders: lightCellBorder(),
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, color: "D7FA06", size: 18 })],
    })],
  });
}

function sectionRow(label, colCount = 4) {
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: colCount,
        shading: darkCellBackground(),
        borders: lightCellBorder(),
        children: [new Paragraph({
          children: [new TextRun({ text: label, bold: true, color: "D7FA06", size: 18, allCaps: true })],
        })],
      }),
    ],
  });
}

function contentRow(item) {
  const typeLabel = item.item_type === "produced"
    ? `PRODUCED VIDEO #${item.item_number}`
    : `ORGANIC VIDEO #${item.item_number}`;

  const titleCell = new TableCell({
    borders: lightCellBorder(),
    children: [
      new Paragraph({ children: [new TextRun({ text: typeLabel, bold: true, size: 16, color: "999999" })] }),
      new Paragraph({ children: [new TextRun({ text: item.title || "", bold: true, size: 20 })] }),
      ...(item.reference_link
        ? [new Paragraph({ children: [new TextRun({ text: `INSPO: ${item.reference_link}`, size: 16, color: "888888" })] })]
        : []),
    ],
  });

  const neededCell = new TableCell({
    borders: lightCellBorder(),
    children: [new Paragraph({ children: [new TextRun({ text: item.whats_needed || "", size: 20 })] })],
  });

  const creatorCell = new TableCell({
    borders: lightCellBorder(),
    children: [new Paragraph({ children: [new TextRun({ text: item.creator_name || "", bold: true, size: 20 })] })],
  });

  const approvalCell = new TableCell({
    borders: lightCellBorder(),
    children: [new Paragraph({
      children: [new TextRun({ text: approvalText(item.approval_status), bold: true, size: 20 })],
    })],
  });

  return new TableRow({ children: [titleCell, neededCell, creatorCell, approvalCell] });
}

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing auth token" });

  const token = authHeader.slice(7);
  const sb = getSupabaseAdmin();

  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { planId } = req.body || {};
  if (!planId) return res.status(400).json({ error: "Missing planId" });

  const { data: plan, error: planErr } = await sb.from("content_plans").select("*").eq("id", planId).single();
  if (planErr || !plan) return res.status(404).json({ error: "Plan not found" });
  if (plan.user_id !== user.id) return res.status(403).json({ error: "Forbidden" });

  const { data: items } = await sb
    .from("content_plan_items")
    .select("*")
    .eq("plan_id", planId)
    .order("item_type")
    .order("item_number");

  const producedItems = (items || []).filter(it => it.item_type === "produced");
  const organicItems = (items || []).filter(it => it.item_type === "organic");

  const tableRows = [
    // Header row
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Link"),
        headerCell("What's needed"),
        headerCell("Content Creator"),
        headerCell("Approvals"),
      ],
    }),
    // Produced section
    ...(producedItems.length > 0 ? [sectionRow("PRODUCED VIDEOS"), ...producedItems.map(contentRow)] : []),
    // Organic section
    ...(organicItems.length > 0 ? [sectionRow("ORGANIC VIDEOS"), ...organicItems.map(contentRow)] : []),
  ];

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: `${plan.client_name.toUpperCase()} CONTENT PLAN`,
            bold: true, size: 32,
          })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: `SHOOT DATE: ${plan.shoot_date}`,
            bold: true, size: 26,
          })],
          spacing: { after: 200 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const base64 = buffer.toString("base64");
  const filename = `${plan.client_name.toLowerCase().replace(/\s+/g, "-")}-content-plan-${MONTHS[plan.month].toLowerCase()}-${plan.year}.docx`;

  return res.status(200).json({ docx: base64, filename });
}

export default withSentry(handler);
