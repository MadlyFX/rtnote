import {
  serializeDiagramDocument,
  serializeInfographicDocument,
  serializePosterDocument,
  serializeTableDocument,
  type DiagramDocument,
  type InfographicDocument,
  type PosterDocument,
  type TableDocument,
} from "@rtnote/shared";
import { DEFAULT_NOTEBOOK_SEEDS } from "@rtnote/shared/default-workspace-seeds";
import {
  decodeDemoAttachment,
  DEMO_ATTACHMENT_MARKDOWN_EN,
  DEMO_ATTACHMENT_MARKDOWN_ZH,
  DEMO_ATTACHMENT_RESOURCES,
} from "./demo-attachments";
import {
  DEMO_FEATURES_NOTEBOOK_NAME_ZH,
  DEMO_SEED_MEMOS_ZH,
  DEMO_SEED_REVISIONS_ZH,
} from "./demo-seed-data.zh-CN";

export { decodeDemoAttachment };

// The demo stores the general notebooks under the names the installation
// migrations seed (zh-CN), so seed localization still recognises them.
const seededNotebookName = (key: (typeof DEFAULT_NOTEBOOK_SEEDS)[number]["key"]) => {
  const seed = DEFAULT_NOTEBOOK_SEEDS.find((candidate) => candidate.key === key);
  if (!seed) throw new Error(`Missing default notebook seed: ${key}`);
  return seed.names["zh-CN"];
};

export const DEMO_SEED_NOTEBOOKS = [
  { id: "nb_inbox", parentId: null, name: seededNotebookName("inbox"), slug: "inbox", icon: "notebook", color: null, sortOrder: 10 },
  { id: "nb_projects", parentId: null, name: seededNotebookName("projects"), slug: "work-projects", icon: "notebook", color: null, sortOrder: 20 },
  { id: "nb_learning", parentId: null, name: seededNotebookName("learning"), slug: "learning-resources", icon: "notebook", color: null, sortOrder: 30 },
  { id: "nb_creative", parentId: null, name: seededNotebookName("creative"), slug: "creative-ideas", icon: "notebook", color: null, sortOrder: 40 },
  { id: "nb_personal", parentId: null, name: seededNotebookName("personal"), slug: "personal-life", icon: "notebook", color: null, sortOrder: 50 },
  { id: "nb_demo_features", parentId: "nb_projects", name: DEMO_FEATURES_NOTEBOOK_NAME_ZH, slug: "demo-features", icon: "notebook", color: null, sortOrder: 21 },
  { id: "nb_demo_features_en", parentId: "nb_projects", name: "Feature Demos", slug: "feature-demos", icon: "notebook", color: null, sortOrder: 22 },
];

export const DEMO_ARCHITECTURE_DIAGRAM_EN: DiagramDocument = {
  schemaVersion: 2,
  kind: "architecture",
  nodes: [
    { id: "boundary-clients", label: "Cross-Platform Experience", x: 32, y: 43, width: 260, height: 694, shape: "boundary" },
    { id: "boundary-platform", label: "Portable Application Platform · Shared Core on Cloudflare Workers or Docker", x: 380, y: 181, width: 732, height: 418, shape: "boundary" },
    { id: "boundary-data", label: "Data & Files · Replaceable Infrastructure Adapters", x: 1200, y: 396, width: 260, height: 436, shape: "boundary" },
    { id: "boundary-ecosystem", label: "Agents & External Services", x: 1200, y: 32, width: 260, height: 308, shape: "boundary" },

    { id: "client-web", label: "Web / PWA\nOffline First", x: 68, y: 99, width: 156, height: 64, shape: "frontend", resourceIcon: "webApp", parentId: "boundary-clients" },
    { id: "client-desktop", label: "Desktop Apps\nWin/Mac/Linux", x: 68, y: 203, width: 156, height: 70, shape: "client", resourceIcon: "client", parentId: "boundary-clients" },
    { id: "client-ios", label: "iOS\nNative SwiftUI", x: 68, y: 313, width: 156, height: 70, shape: "client", resourceIcon: "mobileApp", parentId: "boundary-clients" },
    { id: "client-android", label: "Android\nNative Expo", x: 68, y: 423, width: 156, height: 64, shape: "client", resourceIcon: "mobileApp", parentId: "boundary-clients" },
    { id: "client-clipper", label: "Web Clipper\nChrome / Edge / Firefox", x: 68, y: 527, width: 156, height: 70, shape: "client", resourceIcon: "website", parentId: "boundary-clients" },
    { id: "client-sync", label: "Shared Cross-Client Sync", x: 68, y: 637, width: 156, height: 64, shape: "service", resourceIcon: "apiClient", parentId: "boundary-clients" },

    { id: "platform-api", label: "API Gateway\nAuth · Routing", x: 416, y: 365, width: 156, height: 88, shape: "service", resourceIcon: "apiGateway", parentId: "boundary-platform" },
    { id: "platform-core", label: "Business Core\nHono Services", x: 668, y: 301, width: 156, height: 88, shape: "service", resourceIcon: "service", parentId: "boundary-platform" },
    { id: "platform-sync", label: "Sync Engine\nRevisions\nOffline Queue", x: 920, y: 301, width: 156, height: 88, shape: "service", resourceIcon: "streamProcessing", parentId: "boundary-platform" },
    { id: "platform-mcp", label: "MCP Endpoint\nAgent Tools", x: 416, y: 237, width: 156, height: 88, shape: "service", resourceIcon: "mcpServer", parentId: "boundary-platform" },
    { id: "platform-sharing", label: "Sharing\nLinks · Sites", x: 416, y: 493, width: 156, height: 70, shape: "service", resourceIcon: "website", parentId: "boundary-platform" },

    { id: "data-search", label: "Search\nSQLite FTS5", x: 1239, y: 452, width: 150, height: 106, shape: "database", resourceIcon: "searchEngine", parentId: "boundary-data" },
    { id: "data-sql", label: "D1 / SQLite\nNotes · Tags · Revisions", x: 1239, y: 598, width: 150, height: 88, shape: "database", resourceIcon: "relationalDatabase", parentId: "boundary-data" },
    { id: "data-objects", label: "R2 / S3\nImages & Files", x: 1236, y: 726, width: 156, height: 70, shape: "storage", resourceIcon: "objectStorage", parentId: "boundary-data" },

    { id: "ecosystem-agents", label: "Your Agents\nAny MCP Client", x: 1236, y: 88, width: 156, height: 88, shape: "external", resourceIcon: "aiAgent", parentId: "boundary-ecosystem" },
    { id: "ecosystem-speech", label: "Speech-to-Text\nYour Provider", x: 1236, y: 216, width: 156, height: 88, shape: "external", resourceIcon: "externalApi", parentId: "boundary-ecosystem" },
  ],
  edges: [
    { id: "edge-clients-api", source: "client-sync", target: "platform-api", label: "HTTPS / Sync Cursor", kind: "request" },
    { id: "edge-api-core", source: "platform-api", target: "platform-core", label: "Domain API", kind: "request" },
    { id: "edge-core-sync", source: "platform-core", target: "platform-sync", label: "Change Log", kind: "async", bidirectional: true },
    { id: "edge-mcp-core", source: "platform-mcp", target: "platform-core", label: "Governed Access", kind: "request", bidirectional: true },
    { id: "edge-core-sql", source: "platform-core", target: "data-sql", label: "Transactions", kind: "data" },
    { id: "edge-core-objects", source: "platform-core", target: "data-objects", label: "Objects", kind: "data" },
    { id: "edge-sync-search", source: "platform-sync", target: "data-search", label: "Incremental Index", kind: "data" },
    { id: "edge-agents-mcp", source: "ecosystem-agents", target: "platform-mcp", label: "MCP Tools", kind: "request", bidirectional: true },
    { id: "edge-api-sharing", source: "platform-api", target: "platform-sharing", label: "Public Pages", kind: "request" },
    { id: "edge-core-speech", source: "platform-core", target: "ecosystem-speech", label: "Transcription", kind: "request" },
  ],
};

export const DEMO_FLOWCHART_DIAGRAM_EN: DiagramDocument = {
  schemaVersion: 1,
  kind: "flowchart",
  theme: "plain",
  nodes: [
    { id: "capture", label: "Capture an idea", x: 72, y: 176, width: 136, height: 48, shape: "terminator" },
    { id: "enrich", label: "Add content, tags & files", x: 264, y: 168, width: 184, height: 64, shape: "process" },
    { id: "organized", label: "Ready to organize?", x: 516, y: 164, width: 164, height: 72, shape: "decision" },
    { id: "inbox", label: "Keep in Inbox", x: 516, y: 304, width: 164, height: 56, shape: "process" },
    { id: "notebook", label: "Move to a project or topic", x: 748, y: 168, width: 184, height: 64, shape: "process" },
    { id: "review", label: "Review, tag & merge notes", x: 748, y: 304, width: 184, height: 64, shape: "process" },
    { id: "publish", label: "Publish, share, or iterate", x: 1000, y: 176, width: 184, height: 48, shape: "terminator" },
  ],
  edges: [
    { id: "capture-enrich", source: "capture", target: "enrich" },
    { id: "enrich-organized", source: "enrich", target: "organized" },
    { id: "organized-notebook", source: "organized", target: "notebook", label: "Yes" },
    { id: "organized-inbox", source: "organized", target: "inbox", label: "Not yet" },
    { id: "inbox-review", source: "inbox", target: "review", label: "Review later" },
    { id: "notebook-publish", source: "notebook", target: "publish" },
    { id: "review-publish", source: "review", target: "publish" },
  ],
};

export const DEMO_MIND_MAP_DIAGRAM_EN: DiagramDocument = {
  schemaVersion: 1,
  kind: "mind-map",
  theme: "plain",
  structure: "map",
  nodes: [
    { id: "root", label: "My Second Brain", x: 72, y: 216, width: 152, height: 52, shape: "topic" },
    { id: "capture", label: "Capture", x: 304, y: 72, width: 112, height: 42, shape: "topic", parentId: "root" },
    { id: "organize", label: "Organize", x: 304, y: 176, width: 112, height: 42, shape: "topic", parentId: "root" },
    { id: "connect", label: "Connect", x: 304, y: 280, width: 112, height: 42, shape: "topic", parentId: "root" },
    { id: "create", label: "Create", x: 304, y: 384, width: 112, height: 42, shape: "topic", parentId: "root" },
    { id: "capture-clip", label: "Web clipping", x: 520, y: 32, width: 112, height: 36, shape: "topic", parentId: "capture" },
    { id: "capture-quick", label: "Quick notes", x: 520, y: 88, width: 112, height: 36, shape: "topic", parentId: "capture" },
    { id: "capture-files", label: "Images & files", x: 520, y: 144, width: 112, height: 36, shape: "topic", parentId: "capture" },
    { id: "organize-notebooks", label: "Notebook tree", x: 520, y: 200, width: 112, height: 36, shape: "topic", parentId: "organize" },
    { id: "organize-tags", label: "Tags & search", x: 520, y: 256, width: 112, height: 36, shape: "topic", parentId: "organize" },
    { id: "connect-links", label: "Note links", x: 520, y: 312, width: 112, height: 36, shape: "topic", parentId: "connect" },
    { id: "connect-mcp", label: "MCP agents", x: 520, y: 368, width: 112, height: 36, shape: "topic", parentId: "connect" },
    { id: "create-writing", label: "Focused writing", x: 520, y: 424, width: 112, height: 36, shape: "topic", parentId: "create" },
    { id: "create-share", label: "Publish & share", x: 520, y: 480, width: 112, height: 36, shape: "topic", parentId: "create" },
  ],
  edges: [
    { id: "edge-root-capture", source: "root", target: "capture" },
    { id: "edge-root-organize", source: "root", target: "organize" },
    { id: "edge-root-connect", source: "root", target: "connect" },
    { id: "edge-root-create", source: "root", target: "create" },
    { id: "edge-capture-clip", source: "capture", target: "capture-clip" },
    { id: "edge-capture-quick", source: "capture", target: "capture-quick" },
    { id: "edge-capture-files", source: "capture", target: "capture-files" },
    { id: "edge-organize-notebooks", source: "organize", target: "organize-notebooks" },
    { id: "edge-organize-tags", source: "organize", target: "organize-tags" },
    { id: "edge-connect-links", source: "connect", target: "connect-links" },
    { id: "edge-connect-mcp", source: "connect", target: "connect-mcp" },
    { id: "edge-create-writing", source: "create", target: "create-writing" },
    { id: "edge-create-share", source: "create", target: "create-share" },
  ],
};

export const DEMO_INFOGRAPHIC_SYNTAX_EN = `infographic sequence-timeline-rounded-rect-node
data
  sequences
    - label Desktop and clipper builds
      desc Windows, macOS and Linux installers plus web clipper packages
    - label Rich text as the source of truth
      desc Rich-text documents become the source of truth on every client
    - label Fonts, alignment and captions
      desc Fonts, alignment, line spacing, colour, captions and better tables
    - label AI writing out, MCP stays
      desc Built-in AI writing removed; the MCP server stays for your own agents
    - label Voice memos on every device
      desc Record, play back and transcribe on web, desktop and mobile
    - label Your name, logo and colours
      desc Custom name, logo and colours, with English as the default language`;

export const DEMO_INFOGRAPHIC_DOCUMENT_EN: InfographicDocument = {
  schemaVersion: 1,
  syntax: DEMO_INFOGRAPHIC_SYNTAX_EN,
};

export const DEMO_POSTER_DOCUMENT_EN: PosterDocument = {
  schemaVersion: 1,
  width: 1080,
  height: 1440,
  background: "#f4efe4",
  templateId: "editorial",
  copy: {
    badge: "RTNOTE · YOUR NOTES",
    title: "Your Second Brain,\nOn Your Own Server",
    subtitle: "A three-pane, rich-text notes workspace that syncs everywhere\nand keeps your data yours.",
  },
  elements: [
    {
      id: "accent",
      name: "accent",
      type: "rect",
      x: 96,
      y: 110,
      width: 120,
      height: 12,
      fill: "#16a06e",
      rotation: 0,
      opacity: 1,
      locked: false,
    },
    {
      id: "badge",
      name: "badge",
      type: "text",
      role: "badge",
      text: "RTNOTE · YOUR NOTES",
      x: 96,
      y: 150,
      width: 888,
      height: 40,
      rotation: 0,
      opacity: 1,
      locked: false,
      fill: "#0f766e",
      fontSize: 24,
      fontFamily: "sans-serif",
      fontWeight: "bold",
      textAlign: "left",
    },
    {
      id: "heading",
      name: "heading",
      type: "text",
      role: "title",
      text: "Your Second Brain,\nOn Your Own Server",
      x: 96,
      y: 220,
      width: 888,
      height: 220,
      rotation: 0,
      opacity: 1,
      locked: false,
      fill: "#07130b",
      fontSize: 80,
      fontFamily: "serif",
      fontWeight: "bold",
      textAlign: "left",
      lineHeight: 1.25,
    },
    {
      id: "subtitle",
      name: "subtitle",
      type: "text",
      role: "subtitle",
      text: "A three-pane, rich-text notes workspace that syncs everywhere\nand keeps your data yours.",
      x: 96,
      y: 470,
      width: 888,
      height: 80,
      rotation: 0,
      opacity: 1,
      locked: false,
      fill: "#3f3f46",
      fontSize: 30,
      fontFamily: "sans-serif",
      fontWeight: "normal",
      textAlign: "left",
    },
    {
      id: "section-1-card",
      name: "section-1-card",
      type: "rect",
      x: 96,
      y: 590,
      width: 888,
      height: 220,
      fill: "#ffffff",
      radius: 20,
      rotation: 0,
      opacity: 1,
      locked: false,
    },
    {
      id: "section-1-heading",
      name: "section-1-heading",
      type: "text",
      text: "01 · Built-in MCP Server",
      x: 136,
      y: 630,
      width: 808,
      height: 48,
      rotation: 0,
      opacity: 1,
      locked: false,
      fill: "#07130b",
      fontSize: 32,
      fontFamily: "sans-serif",
      fontWeight: "bold",
      textAlign: "left",
    },
    {
      id: "section-1-body",
      name: "section-1-body",
      type: "text",
      text: "Connect Claude, Cursor or any MCP client so your own agents\ncan read, write and organise notes.",
      x: 136,
      y: 695,
      width: 808,
      height: 70,
      rotation: 0,
      opacity: 1,
      locked: false,
      fill: "#71717a",
      fontSize: 24,
      fontFamily: "sans-serif",
      fontWeight: "normal",
      textAlign: "left",
      lineHeight: 1.4,
    },
    {
      id: "section-2-card",
      name: "section-2-card",
      type: "rect",
      x: 96,
      y: 840,
      width: 888,
      height: 220,
      fill: "#ffffff",
      radius: 20,
      rotation: 0,
      opacity: 1,
      locked: false,
    },
    {
      id: "section-2-heading",
      name: "section-2-heading",
      type: "text",
      text: "02 · Cloudflare or Docker Hosting",
      x: 136,
      y: 880,
      width: 808,
      height: 48,
      rotation: 0,
      opacity: 1,
      locked: false,
      fill: "#07130b",
      fontSize: 32,
      fontFamily: "sans-serif",
      fontWeight: "bold",
      textAlign: "left",
    },
    {
      id: "section-2-body",
      name: "section-2-body",
      type: "text",
      text: "Run on Cloudflare's free tier, or with one Docker command\non your VPS or NAS with SQLite storage.",
      x: 136,
      y: 945,
      width: 808,
      height: 70,
      rotation: 0,
      opacity: 1,
      locked: false,
      fill: "#71717a",
      fontSize: 24,
      fontFamily: "sans-serif",
      fontWeight: "normal",
      textAlign: "left",
      lineHeight: 1.4,
    },
    {
      id: "section-3-card",
      name: "section-3-card",
      type: "rect",
      x: 96,
      y: 1090,
      width: 888,
      height: 220,
      fill: "#ffffff",
      radius: 20,
      rotation: 0,
      opacity: 1,
      locked: false,
    },
    {
      id: "section-3-heading",
      name: "section-3-heading",
      type: "text",
      text: "03 · Every Platform & Notebook Sites",
      x: 136,
      y: 1130,
      width: 808,
      height: 48,
      rotation: 0,
      opacity: 1,
      locked: false,
      fill: "#07130b",
      fontSize: 32,
      fontFamily: "sans-serif",
      fontWeight: "bold",
      textAlign: "left",
    },
    {
      id: "section-3-body",
      name: "section-3-body",
      type: "text",
      text: "Apps for web, Windows, macOS, Linux, Android and iOS;\npublish whole notebooks as websites.",
      x: 136,
      y: 1195,
      width: 808,
      height: 70,
      rotation: 0,
      opacity: 1,
      locked: false,
      fill: "#71717a",
      fontSize: 24,
      fontFamily: "sans-serif",
      fontWeight: "normal",
      textAlign: "left",
      lineHeight: 1.4,
    },
  ],
};

export const DEMO_TABLE_DOCUMENT_EN: TableDocument = {
  schemaVersion: 1,
  fields: [
    { id: "fld_feature", name: "Feature", type: "text" },
    { id: "fld_category", name: "Category", type: "select", options: ["Writing", "Visual Notes", "Sharing & Data", "Agents", "Clients"] },
    { id: "fld_status", name: "Status", type: "select", options: ["Available", "Beta", "Planned"] },
    { id: "fld_verified", name: "Verified", type: "checkbox" },
    { id: "fld_date", name: "Last Reviewed", type: "date" },
    { id: "fld_docs", name: "Documents", type: "attachment" },
  ],
  records: [
    {
      id: "rec_formatting",
      cells: {
        fld_feature: "Rich-text formatting & image captions",
        fld_category: "Writing",
        fld_status: "Available",
        fld_verified: true,
        fld_date: "2026-11-19",
        fld_docs: [],
      },
    },
    {
      id: "rec_voice",
      cells: {
        fld_feature: "Voice memos & transcription",
        fld_category: "Writing",
        fld_status: "Available",
        fld_verified: true,
        fld_date: "2026-11-19",
        fld_docs: [],
      },
    },
    {
      id: "rec_sites",
      cells: {
        fld_feature: "Shared notes & notebook sites",
        fld_category: "Sharing & Data",
        fld_status: "Available",
        fld_verified: true,
        fld_date: "2026-11-19",
        fld_docs: [{ resourceId: "res_demo_attachment_bundle_zip", filename: "rtnote-attachment-demo.zip", mimeType: "application/zip", byteSize: 202 }],
      },
    },
    {
      id: "rec_infographic",
      cells: {
        fld_feature: "Infographic notes",
        fld_category: "Visual Notes",
        fld_status: "Available",
        fld_verified: true,
        fld_date: "2026-11-19",
        fld_docs: [{ resourceId: "res_demo_feature_matrix_csv", filename: "feature-matrix.csv", mimeType: "text/csv", byteSize: 195 }],
      },
    },
    {
      id: "rec_table",
      cells: {
        fld_feature: "Structured tables & form links",
        fld_category: "Visual Notes",
        fld_status: "Available",
        fld_verified: true,
        fld_date: "2026-11-19",
        fld_docs: [{ resourceId: "res_demo_product_brief_pdf", filename: "rtnote-product-brief.pdf", mimeType: "application/pdf", byteSize: 1026 }],
      },
    },
    {
      id: "rec_poster",
      cells: {
        fld_feature: "Poster notes",
        fld_category: "Visual Notes",
        fld_status: "Beta",
        fld_verified: true,
        fld_date: "2026-11-19",
        fld_docs: [],
      },
    },
    {
      id: "rec_mcp",
      cells: {
        fld_feature: "Built-in MCP server (/mcp)",
        fld_category: "Agents",
        fld_status: "Available",
        fld_verified: true,
        fld_date: "2026-11-19",
        fld_docs: [],
      },
    },
    {
      id: "rec_branding",
      cells: {
        fld_feature: "Custom branding",
        fld_category: "Sharing & Data",
        fld_status: "Available",
        fld_verified: true,
        fld_date: "2026-11-19",
        fld_docs: [],
      },
    },
    {
      id: "rec_releases",
      cells: {
        fld_feature: "Signed builds & app store releases",
        fld_category: "Clients",
        fld_status: "Planned",
        fld_verified: false,
        fld_date: "2026-11-19",
        fld_docs: [],
      },
    },
  ],
  view: {
    filters: [],
    sort: null,
  },
};

const DEMO_SEED_MEMOS_EN_BASE = [
  {
    id: "memo_demo_overview_en",
    notebookId: "nb_demo_features_en",
    title: "Welcome to RTNote: A Self-Hosted, Rich-Text Notes Workspace",
    tags: ["overview", "guide", "features", "mcp"],
    isPinned: true,
    markdown:
      `<div align="center">

<span style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 30px">**A Feature-Rich Notebook For The Modern Era**</span>

</div>

<div align="center">

Collect, organize, and express your thoughts in a self-hostable platform

</div>

<figure>
<img src="/api/v1/resources/res_demo_logo/blob" alt="RTNote logo" data-image-align="center" width="35%" style="display: block; margin-left: auto; margin-right: auto; width: 35%" />
<figcaption>Images can carry a caption, like this one.</figcaption>
</figure>

## Make the words look right

RTNote moves beyond markdown, instead storing every note is a rich-text document. This allows for advanced formatting, fonts, sizing, and color, while still retaining markdown export compatibility for those that need it.

<span style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 20px">A serif for long reads.</span> <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace">A monospace for code.</span> <span style="color: #337ea9">Blue</span>, <span style="color: #448361">green</span> and <span style="color: #c76b21">orange</span> for emphasis, and <span style="background-color: #fbf3db">a highlight</span> for the line that matters.

<div align="center" style="line-height: 2">

<span style="color: #9065b0; font-size: 20px">Centre a line, or give a paragraph room to breathe.</span>

</div>

<div align="right">

<span style="color: #787774">Right-aligned text works too.</span>

</div>

## Tables that do more

Select cells to merge them, or right-click a cell to colour it.

<table>
<tr>
<th colspan="3" style="background-color: #e7f3f8">

Where RTNote runs

</th>
</tr>
<tr>
<td style="background-color: #fbecdd">

**Cloudflare**

</td>
<td>

Workers, D1 and R2

</td>
<td>

Runs on the free tier

</td>
</tr>
<tr>
<td style="background-color: #edf3ec">

**Docker**

</td>
<td>

Your VPS, NAS or home server

</td>
<td>

SQLite with local or S3 storage

</td>
</tr>
</table>

## Pictures side by side

Drop several images in a row and they become a gallery:

![RTNote logo](/api/v1/resources/res_demo_logo/blob)

![A cat sketch](/api/v1/resources/res_demo_cat_image/blob)

## Files that open in place

Word documents and PDFs preview right inside the note:

[Word document: rtnote-meeting-notes.docx](/api/v1/resources/res_demo_meeting_notes_docx/blob)

[PDF: rtnote-product-brief.pdf](/api/v1/resources/res_demo_product_brief_pdf/blob)

## Try these next

- [ ] Type \`/\` in an empty line to open the command menu
- [ ] Record a voice memo with \`/voice\`
- [ ] Choose **Share as image** from the note menu
- [ ] Open the other examples in **Feature Demos**
- [ ] Set your name, logo and colours in **Settings → General → Branding**

<details>
<summary>Keyboard shortcuts</summary>

- \`Cmd/Ctrl + /\` switches between rich text and Markdown source
- \`Cmd/Ctrl + O\` opens the quick switcher
- \`Cmd/Ctrl + E\` turns on reading protection
- \`Cmd/Ctrl + Shift + 1\` shows the outline

</details>

<details>
<summary>Maths and diagrams</summary>

Write equations inline, like $E = mc^2$, or as a block:

$$
f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}
$$

Mind maps, flowcharts, architecture diagrams, infographics, tables and posters each have an example in **Feature Demos**.

</details>

<details>
<summary>Your agents, your data</summary>

RTNote has no built-in AI writing assistant. Its MCP server lets the agents you choose read and write your notes: create a token under **Settings → API / MCP**.

Download your whole library any time from **Settings → Backup &amp; Import**, as Markdown files with their attachments.

</details>

<div align="center">

<span style="color: #787774; font-size: 14px">RTNote is in early development. There are no official releases yet.</span>

</div>
`,
  },
  {
    id: "memo_demo_poster_en",
    notebookId: "nb_demo_features_en",
    title: "Visual Design: RTNote Poster Note",
    tags: ["poster", "design", "visual-layout", "branding"],
    isPinned: false,
    markdown: serializePosterDocument(DEMO_POSTER_DOCUMENT_EN),
  },
  {
    id: "memo_demo_infographic_en",
    notebookId: "nb_demo_features_en",
    title: "Milestones: How RTNote Took Shape",
    tags: ["infographic", "milestone", "timeline", "roadmap"],
    isPinned: false,
    markdown: serializeInfographicDocument(DEMO_INFOGRAPHIC_DOCUMENT_EN),
  },
  {
    id: "memo_demo_table_en",
    notebookId: "nb_demo_features_en",
    title: "Feature Tracker: What RTNote Can Do Today",
    tags: ["table", "roadmap", "project-management", "tracking"],
    isPinned: false,
    markdown: serializeTableDocument(DEMO_TABLE_DOCUMENT_EN),
  },
  {
    id: "memo_demo_architecture_en",
    notebookId: "nb_demo_features_en",
    title: "System Architecture: How RTNote Fits Together",
    tags: ["architecture", "diagram", "self-hosting", "sync", "mcp"],
    isPinned: false,
    markdown: serializeDiagramDocument(DEMO_ARCHITECTURE_DIAGRAM_EN),
  },
  {
    id: "memo_demo_flowchart_en",
    notebookId: "nb_demo_features_en",
    title: "Knowledge Workflow: From Capturing Ideas to Publishing",
    tags: ["flowchart", "diagram", "workflow", "knowledge-management"],
    isPinned: false,
    markdown: serializeDiagramDocument(DEMO_FLOWCHART_DIAGRAM_EN),
  },
  {
    id: "memo_demo_mind_map_en",
    notebookId: "nb_demo_features_en",
    title: "Second Brain: A Personal Knowledge System Mind Map",
    tags: ["mind-map", "diagram", "second-brain", "knowledge-management"],
    isPinned: false,
    markdown: serializeDiagramDocument(DEMO_MIND_MAP_DIAGRAM_EN),
  },
];

export const DEMO_SEED_MEMOS_EN = DEMO_SEED_MEMOS_EN_BASE.map((memo) => ({
  ...memo,
  markdown: memo.id === "memo_demo_overview_en" ? `${memo.markdown}${DEMO_ATTACHMENT_MARKDOWN_EN}` : memo.markdown,
}));

export const DEMO_SEED_MEMOS_ZH_WITH_ATTACHMENTS = DEMO_SEED_MEMOS_ZH.map((memo) => ({
  ...memo,
  markdown: memo.id === "memo_demo_overview" ? `${memo.markdown}${DEMO_ATTACHMENT_MARKDOWN_ZH}` : memo.markdown,
}));

export const DEMO_SEED_MEMOS = [...DEMO_SEED_MEMOS_ZH_WITH_ATTACHMENTS, ...DEMO_SEED_MEMOS_EN];

const DEMO_SEED_REVISIONS_EN = [
  {
    id: "rev_demo_revision_1_en",
    memoId: "memo_demo_overview_en",
    revision: 1,
    title: "Welcome to RTNote: A Self-Hosted, Rich-Text Notes Workspace",
    markdown:
      "## Welcome to RTNote (First Draft)\n\n- Classic three-pane layout, self-hosted on Cloudflare or Docker\n- Rich text first, with Markdown export\n- A built-in MCP server for the agents you choose",
  },
  {
    id: "rev_demo_poster_1_en",
    memoId: "memo_demo_poster_en",
    revision: 1,
    title: "Visual Design: RTNote Poster Note",
    markdown: serializePosterDocument(DEMO_POSTER_DOCUMENT_EN),
  },
  {
    id: "rev_demo_infographic_1_en",
    memoId: "memo_demo_infographic_en",
    revision: 1,
    title: "Milestones: How RTNote Took Shape",
    markdown: serializeInfographicDocument(DEMO_INFOGRAPHIC_DOCUMENT_EN),
  },
  {
    id: "rev_demo_table_1_en",
    memoId: "memo_demo_table_en",
    revision: 1,
    title: "Feature Tracker: What RTNote Can Do Today",
    markdown: serializeTableDocument(DEMO_TABLE_DOCUMENT_EN),
  },
  {
    id: "rev_demo_architecture_1_en",
    memoId: "memo_demo_architecture_en",
    revision: 1,
    title: "System Architecture: How RTNote Fits Together",
    markdown: serializeDiagramDocument(DEMO_ARCHITECTURE_DIAGRAM_EN),
  },
];

// Each Chinese revision is followed by its English counterpart.
export const DEMO_SEED_REVISIONS = DEMO_SEED_REVISIONS_ZH.flatMap((revision, index) => [
  revision,
  DEMO_SEED_REVISIONS_EN[index],
]);

export const DEMO_SEED_RESOURCES = [
  {
    id: "res_demo_logo",
    memoId: "memo_demo_overview",
    filename: "rtnote-icon.svg",
    mimeType: "image/svg+xml",
    width: 1024,
    height: 1024,
    svg:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-labelledby="title desc"><title id="title">RTNote</title><desc id="desc">A yellow sticky note with a peeled corner, a heading and two text lines on the RTNote orange rounded tile.</desc><rect x="100" y="100" width="824" height="824" rx="188" fill="#f26b1d" /><path fill="#ffc629" d="M300 260H724Q764 260 764 300V600L604 760H300Q260 760 260 720V300Q260 260 300 260Z" /><path fill="#e09a12" d="M764 600H644Q604 600 604 640V760Z" /><rect x="336" y="352" width="240" height="56" rx="28" fill="#24160a" /><rect x="336" y="472" width="352" height="32" rx="16" fill="#24160a" /><rect x="336" y="568" width="216" height="32" rx="16" fill="#24160a" />\n</svg>',
  },
  {
    id: "res_demo_cat_image",
    memoId: "memo_demo_overview",
    filename: "cute-cat-demo.svg",
    mimeType: "image/svg+xml",
    width: 960,
    height: 540,
    svg:
      '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" fill="none"><rect width="960" height="540" rx="32" fill="#f0fdfa"/><g transform="translate(480, 270) scale(2.2)"><path d="M-60,-20 C-60,-60 -30,-80 0,-80 C30,-80 60,-60 60,-20 C60,20 40,40 0,40 C-40,40 -60,20 -60,-20 Z" stroke="#0f766e" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M-45,-68 L-55,-100 L-20,-78" stroke="#0f766e" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M45,-68 L55,-100 L20,-78" stroke="#0f766e" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M-30,-25 Q-20,-15 -10,-25" stroke="#0f766e" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M10,-25 Q20,-15 30,-25" stroke="#0f766e" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M-5,-10 L5,-10 L0,-5 Z" fill="#0f766e"/><path d="M0,-5 Q-5,5 -10,2 M0,-5 Q5,5 10,2" stroke="#0f766e" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M-40,-5 L-65,-8" stroke="#0f766e" stroke-width="4" stroke-linecap="round"/><path d="M-42,5 L-68,7" stroke="#0f766e" stroke-width="4" stroke-linecap="round"/><path d="M40,-5 L65,-8" stroke="#0f766e" stroke-width="4" stroke-linecap="round"/><path d="M42,5 L68,7" stroke="#0f766e" stroke-width="4" stroke-linecap="round"/><path d="M-30,35 C-30,70 -10,90 0,90 C10,90 30,70 30,35" stroke="#0f766e" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M25,75 C45,75 55,60 55,45 C55,30 45,25 40,30 C35,35 40,45 45,45" stroke="#0f766e" stroke-width="6" stroke-linecap="round" fill="none"/></g></svg>',
  },
] as const;

export const DEMO_SEED_ATTACHMENT_RESOURCES = [...DEMO_SEED_RESOURCES, ...DEMO_ATTACHMENT_RESOURCES];
export const DEMO_SEED_NOTEBOOK_IDS = DEMO_SEED_NOTEBOOKS.map((notebook) => notebook.id);
export const DEMO_SEED_MEMO_IDS = DEMO_SEED_MEMOS.map((memo) => memo.id);
