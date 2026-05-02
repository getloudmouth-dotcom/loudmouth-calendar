export const CLOUDINARY_CLOUD = "djaxz6tef";
export const CLOUDINARY_PRESET = "loudmouth_uploads";

export const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const CONTENT_TYPES = ["Photo", "Reel", "Carousel", "Story"];

export const CONTENT_FIELDS = ["contentType", "imageUrls", "url", "urls", "videoUrl", "caption", "cropX", "cropY", "scale", "crops", "cropXs", "cropYs", "scales", "placeholder", "postingNotes", "carouselCardScale"];

// RBAC: which tools each role gets by default
export const ROLE_TOOLS = {
  admin:            ["calendar_creator", "content_scheduling", "admin_portal", "content_plan_creator", "billing", "grid_creator"],
  smm:              ["calendar_creator", "content_scheduling", "content_plan_creator", "grid_creator"],
  account_manager:  ["calendar_creator", "content_scheduling", "content_plan_creator", "billing"],
  graphic_designer: ["grid_creator"],
  content_creator:  ["content_plan_creator"],
  videographer:     [],
  video_editor:     [],
  public_relations: [],
  client:           [],
};
export const ALL_TOOLS = [
  { key: "calendar_creator",      label: "Calendar Creator" },
  { key: "content_scheduling",    label: "Content Scheduling" },
  { key: "admin_portal",          label: "Admin Portal" },
  { key: "content_plan_creator",  label: "Content Plan Creator" },
  { key: "billing",               label: "Billing" },
  { key: "grid_creator",          label: "Grid Creator" },
];

// Canonical role definitions for UI rendering.
// Adding a role to ROLE_TOOLS but not here will cause it to silently disappear
// from the AdminPortal role-permissions table and the invite/edit dropdowns.
// Iteration order = render order. `description` (optional) is shown in parens in dropdowns.
export const ROLE_LABELS = {
  smm:              { label: "SMM",              description: "Social Media Manager" },
  account_manager:  { label: "Account Manager",  description: null },
  graphic_designer: { label: "Graphic Designer", description: null },
  content_creator:  { label: "Content Creator",  description: null },
  videographer:     { label: "Videographer",     description: null },
  video_editor:     { label: "Video Editor",     description: null },
  public_relations: { label: "Public Relations", description: null },
  admin:            { label: "Admin",            description: null },
  client:           { label: "Client",           description: "End-client account" },
};

// activePortal enum: every value DashboardPortal switches on. HOME is null (the landing/Hub view).
export const PORTALS = {
  HOME:         null,
  CALENDAR:     "calendar",
  SCHEDULING:   "scheduling",
  ADMIN:        "admin",
  CLIENTS:      "clients",
  CONTENT_PLAN: "content-plan",
  BILLING:      "billing",
  GRID:         "grid",
};

export function newPost() {
  return { id: Date.now() + Math.random(), contentType: "Photo", imageUrls: [], url: "", urls: [], videoUrl: "", caption: "", cropX: 50, cropY: 50, scale: 1, crops: {}, cropXs: [], cropYs: [], scales: [], placeholder: "", postingNotes: "" };
}
