export const CLOUDINARY_CLOUD = "djaxz6tef";
export const CLOUDINARY_PRESET = "loudmouth_uploads";

export const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const CONTENT_TYPES = ["Photo", "Reel", "Carousel", "Story"];

export const CONTENT_FIELDS = ["contentType", "imageUrls", "url", "urls", "videoUrl", "caption", "cropX", "cropY", "scale", "crops", "cropXs", "cropYs", "scales", "placeholder", "postingNotes", "carouselCardScale"];

// RBAC: which tools each role gets by default
export const ROLE_TOOLS = {
  admin:            ["calendar_creator", "content_scheduling", "admin_portal", "content_plan_creator", "billing"],
  smm:              ["calendar_creator", "content_scheduling", "content_plan_creator"],
  account_manager:  ["calendar_creator", "content_scheduling", "content_plan_creator", "billing"],
  graphic_designer: [],
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
];

export function newPost() {
  return { id: Date.now() + Math.random(), contentType: "Photo", imageUrls: [], url: "", urls: [], videoUrl: "", caption: "", cropX: 50, cropY: 50, scale: 1, crops: {}, cropXs: [], cropYs: [], scales: [], placeholder: "", postingNotes: "" };
}
