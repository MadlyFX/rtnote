/**
 * Chinese (zh-CN) demo content. The demo workspace carries a Chinese and an
 * English copy of the feature demos; demo-seed-data.ts composes both.
 */
import {
  serializeDiagramDocument,
  serializeInfographicDocument,
  serializePosterDocument,
  serializeTableDocument,
  type DiagramDocument,
  type InfographicDocument,
  type PosterDocument,
  type TableDocument,
} from "@edgeever/shared";

/** Name of the notebook that holds the Chinese feature demos. */
export const DEMO_FEATURES_NOTEBOOK_NAME_ZH = "功能演示";

/** Text of the Chinese demo tip that points at the demo-only reset action. */
export const DEMO_RESET_TIP_MARKER_ZH = "恢复 Demo 数据";

export const DEMO_ARCHITECTURE_DIAGRAM_ZH: DiagramDocument = {
  schemaVersion: 2,
  kind: "architecture",
  nodes: [
    { id: "boundary-clients", label: "全端体验层", x: 32, y: 32, width: 260, height: 694, shape: "boundary" },
    { id: "boundary-platform", label: "可移植应用平台 · Cloudflare Workers / Docker 共用业务核心", x: 380, y: 179, width: 732, height: 400, shape: "boundary" },
    { id: "boundary-data", label: "数据与文件层 · 可替换基础设施适配器", x: 1200, y: 390, width: 260, height: 380, shape: "boundary" },
    { id: "boundary-ecosystem", label: "AI 与自动化生态", x: 1200, y: 62, width: 260, height: 272, shape: "boundary" },

    { id: "client-web", label: "Web / PWA\n离线优先", x: 68, y: 88, width: 156, height: 64, shape: "frontend", resourceIcon: "webApp", parentId: "boundary-clients" },
    { id: "client-desktop", label: "macOS / Windows\n桌面端", x: 68, y: 192, width: 156, height: 70, shape: "client", resourceIcon: "client", parentId: "boundary-clients" },
    { id: "client-ios", label: "iOS\nSwiftUI 原生端", x: 68, y: 302, width: 156, height: 70, shape: "client", resourceIcon: "mobileApp", parentId: "boundary-clients" },
    { id: "client-android", label: "Android\nExpo 原生端", x: 68, y: 412, width: 156, height: 64, shape: "client", resourceIcon: "mobileApp", parentId: "boundary-clients" },
    { id: "client-clipper", label: "浏览器剪藏\nChrome / Edge", x: 68, y: 516, width: 156, height: 70, shape: "client", resourceIcon: "website", parentId: "boundary-clients" },
    { id: "client-sync", label: "全端共享同步通道", x: 68, y: 626, width: 156, height: 64, shape: "service", resourceIcon: "apiClient", parentId: "boundary-clients" },

    { id: "platform-api", label: "统一 API 入口\n认证 · 限流 · 路由", x: 416, y: 363, width: 156, height: 70, shape: "service", resourceIcon: "apiGateway", parentId: "boundary-platform" },
    { id: "platform-core", label: "共享业务核心\nHono · 领域服务", x: 668, y: 304, width: 156, height: 70, shape: "service", resourceIcon: "service", parentId: "boundary-platform" },
    { id: "platform-sync", label: "同步与修订引擎\n离线队列 · 冲突控制", x: 920, y: 295, width: 156, height: 88, shape: "service", resourceIcon: "streamProcessing", parentId: "boundary-platform" },
    { id: "platform-mcp", label: "原生 MCP 端点\n智能体读写工具", x: 416, y: 235, width: 156, height: 88, shape: "service", resourceIcon: "mcpServer", parentId: "boundary-platform" },
    { id: "platform-model", label: "端侧模型网关\nBYOK 隐私直连", x: 416, y: 473, width: 156, height: 70, shape: "service", resourceIcon: "modelGateway", parentId: "boundary-platform" },

    { id: "data-search", label: "搜索与语义索引\n全文 · 向量", x: 1239, y: 446, width: 150, height: 72, shape: "database", resourceIcon: "vectorDatabase", parentId: "boundary-data" },
    { id: "data-sql", label: "D1 / SQLite\n笔记 · 标签 · 修订", x: 1239, y: 558, width: 150, height: 72, shape: "database", resourceIcon: "relationalDatabase", parentId: "boundary-data" },
    { id: "data-objects", label: "R2 / S3\n图片与附件", x: 1236, y: 670, width: 156, height: 64, shape: "storage", resourceIcon: "objectStorage", parentId: "boundary-data" },

    { id: "ecosystem-agents", label: "Claude / Cursor\n自动化智能体", x: 1236, y: 118, width: 156, height: 70, shape: "external", resourceIcon: "aiAgent", parentId: "boundary-ecosystem" },
    { id: "ecosystem-models", label: "OpenAI / Gemini\n兼容模型服务", x: 1236, y: 228, width: 156, height: 70, shape: "external", resourceIcon: "largeLanguageModel", parentId: "boundary-ecosystem" },
  ],
  edges: [
    { id: "edge-clients-api", source: "client-sync", target: "platform-api", label: "HTTPS / 同步游标", kind: "request" },
    { id: "edge-api-core", source: "platform-api", target: "platform-core", label: "统一领域接口", kind: "request" },
    { id: "edge-core-sync", source: "platform-core", target: "platform-sync", label: "变更日志", kind: "async", bidirectional: true },
    { id: "edge-mcp-core", source: "platform-mcp", target: "platform-core", label: "受控读写", kind: "request", bidirectional: true },
    { id: "edge-core-sql", source: "platform-core", target: "data-sql", label: "事务", kind: "data" },
    { id: "edge-core-objects", source: "platform-core", target: "data-objects", label: "对象存取", kind: "data" },
    { id: "edge-sync-search", source: "platform-sync", target: "data-search", label: "增量索引", kind: "data" },
    { id: "edge-agents-mcp", source: "ecosystem-agents", target: "platform-mcp", label: "MCP Tools", kind: "request", bidirectional: true },
    { id: "edge-model-gateway", source: "platform-model", target: "ecosystem-models", label: "用户密钥直连", kind: "request", bidirectional: true },
  ],
};

export const DEMO_FLOWCHART_DIAGRAM_ZH: DiagramDocument = {
  schemaVersion: 1,
  kind: "flowchart",
  theme: "plain",
  nodes: [
    { id: "capture", label: "捕捉灵感", x: 72, y: 176, width: 136, height: 48, shape: "terminator" },
    { id: "enrich", label: "补充正文、标签与附件", x: 264, y: 168, width: 184, height: 64, shape: "process" },
    { id: "organized", label: "已经适合归档？", x: 516, y: 164, width: 164, height: 72, shape: "decision" },
    { id: "inbox", label: "放入“等待分类”", x: 516, y: 304, width: 164, height: 56, shape: "process" },
    { id: "notebook", label: "归入项目或主题笔记本", x: 748, y: 168, width: 184, height: 64, shape: "process" },
    { id: "ai", label: "AI 提炼摘要与行动项", x: 748, y: 304, width: 184, height: 64, shape: "process" },
    { id: "publish", label: "发布、分享或持续迭代", x: 1000, y: 176, width: 184, height: 48, shape: "terminator" },
  ],
  edges: [
    { id: "capture-enrich", source: "capture", target: "enrich" },
    { id: "enrich-organized", source: "enrich", target: "organized" },
    { id: "organized-notebook", source: "organized", target: "notebook", label: "是" },
    { id: "organized-inbox", source: "organized", target: "inbox", label: "否" },
    { id: "inbox-ai", source: "inbox", target: "ai", label: "稍后整理" },
    { id: "notebook-publish", source: "notebook", target: "publish" },
    { id: "ai-publish", source: "ai", target: "publish" },
  ],
};

export const DEMO_MIND_MAP_DIAGRAM_ZH: DiagramDocument = {
  schemaVersion: 1,
  kind: "mind-map",
  theme: "plain",
  structure: "map",
  nodes: [
    { id: "root", label: "我的第二大脑", x: 72, y: 216, width: 152, height: 52, shape: "topic" },
    { id: "capture", label: "采集", x: 304, y: 72, width: 112, height: 42, shape: "topic", parentId: "root" },
    { id: "organize", label: "组织", x: 304, y: 176, width: 112, height: 42, shape: "topic", parentId: "root" },
    { id: "connect", label: "连接", x: 304, y: 280, width: 112, height: 42, shape: "topic", parentId: "root" },
    { id: "create", label: "创造", x: 304, y: 384, width: 112, height: 42, shape: "topic", parentId: "root" },
    { id: "capture-clip", label: "网页剪藏", x: 520, y: 32, width: 112, height: 36, shape: "topic", parentId: "capture" },
    { id: "capture-quick", label: "随手记录", x: 520, y: 88, width: 112, height: 36, shape: "topic", parentId: "capture" },
    { id: "capture-files", label: "图片与附件", x: 520, y: 144, width: 112, height: 36, shape: "topic", parentId: "capture" },
    { id: "organize-notebooks", label: "树状笔记本", x: 520, y: 200, width: 112, height: 36, shape: "topic", parentId: "organize" },
    { id: "organize-tags", label: "标签与搜索", x: 520, y: 256, width: 112, height: 36, shape: "topic", parentId: "organize" },
    { id: "connect-links", label: "双向链接", x: 520, y: 312, width: 112, height: 36, shape: "topic", parentId: "connect" },
    { id: "connect-mcp", label: "MCP 智能体", x: 520, y: 368, width: 112, height: 36, shape: "topic", parentId: "connect" },
    { id: "create-writing", label: "沉浸写作", x: 520, y: 424, width: 112, height: 36, shape: "topic", parentId: "create" },
    { id: "create-share", label: "发布与分享", x: 520, y: 480, width: 112, height: 36, shape: "topic", parentId: "create" },
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

export const DEMO_INFOGRAPHIC_SYNTAX_ZH = `infographic sequence-timeline-rounded-rect-node
data
  title RTNote 演进里程碑
  sequences
    - label v1.0 架构奠基
      desc 经典三栏美学、Serverless D1 存储与双向同步游标
    - label v1.50 智能体与全端
      desc 原生 MCP 协议端点 (/mcp)、双端原生移动客户端与剪藏矩阵
    - label v1.88 结构化知识台
      desc AI 智能信息图、多维结构化表格与可视化图表体系
    - label v1.100 双协议与生态
      desc 桌面端 ACP 深度驱动本地 Agent、知识库独立发布与全平台客户端
    - label v1.120 视觉表现与排版
      desc 原生海报笔记与画布排版、微信聊天完整归档与全场景自建部署`;

export const DEMO_INFOGRAPHIC_DOCUMENT_ZH: InfographicDocument = {
  schemaVersion: 1,
  syntax: DEMO_INFOGRAPHIC_SYNTAX_ZH,
};

export const DEMO_POSTER_DOCUMENT_ZH: PosterDocument = {
  schemaVersion: 1,
  width: 1080,
  height: 1440,
  background: "#f4efe4",
  templateId: "editorial",
  copy: {
    badge: "EDGEEVER · 知识艺术",
    title: "极客的下一代\n数字第二大脑",
    subtitle: "重拾经典三栏工作流，融入 AI 智能体与无损开放数据资产。",
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
      text: "EDGEEVER · 知识艺术",
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
      text: "极客的下一代\n数字第二大脑",
      x: 96,
      y: 220,
      width: 888,
      height: 220,
      rotation: 0,
      opacity: 1,
      locked: false,
      fill: "#07130b",
      fontSize: 84,
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
      text: "重拾经典三栏工作流，融入 AI 智能体与无损开放数据资产。",
      x: 96,
      y: 470,
      width: 888,
      height: 80,
      rotation: 0,
      opacity: 1,
      locked: false,
      fill: "#3f3f46",
      fontSize: 32,
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
      text: "01 · 原生 MCP / ACP 双协议支持",
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
      text: "原生对接 Claude、Cursor、Codex 等外部 Agent，桌面端无缝协同本地智能体。",
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
      text: "02 · 零成本 Serverless 与自由部署",
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
      text: "跑在 Cloudflare 免费额度内或一键 Docker 自建，标准 SQLite 存储，导出无阻碍。",
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
      text: "03 · 全平台客户端与独立知识库",
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
      text: "macOS、Windows、Linux、iOS 与 Android 覆盖，支持一键将笔记本发布为知识库网站。",
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

export const DEMO_TABLE_DOCUMENT_ZH: TableDocument = {
  schemaVersion: 1,
  fields: [
    { id: "fld_feature", name: "功能特性", type: "text" },
    { id: "fld_category", name: "模块分类", type: "select", options: ["AI 智能体", "多端客户端", "图表与可视化", "数据与架构"] },
    { id: "fld_status", name: "交付状态", type: "select", options: ["已正式发布", "公测迭代中", "规划中"] },
    { id: "fld_verified", name: "验收通过", type: "checkbox" },
    { id: "fld_date", name: "发布日期", type: "date" },
    { id: "fld_docs", name: "规格文档", type: "attachment" },
  ],
  records: [
    {
      id: "rec_poster",
      cells: {
        fld_feature: "原生海报笔记与画布排版",
        fld_category: "图表与可视化",
        fld_status: "已正式发布",
        fld_verified: true,
        fld_date: "2026-10-05",
        fld_docs: [],
      },
    },
    {
      id: "rec_acp",
      cells: {
        fld_feature: "桌面端 ACP 本地智能体协同",
        fld_category: "AI 智能体",
        fld_status: "已正式发布",
        fld_verified: true,
        fld_date: "2026-10-08",
        fld_docs: [],
      },
    },
    {
      id: "rec_notebook_site",
      cells: {
        fld_feature: "笔记本公开发布独立知识库",
        fld_category: "数据与架构",
        fld_status: "已正式发布",
        fld_verified: true,
        fld_date: "2026-10-10",
        fld_docs: [],
      },
    },
    {
      id: "rec_platforms",
      cells: {
        fld_feature: "全平台客户端 (macOS / Win / Linux / iOS / Android)",
        fld_category: "多端客户端",
        fld_status: "已正式发布",
        fld_verified: true,
        fld_date: "2026-09-28",
        fld_docs: [{ resourceId: "res_demo_attachment_bundle_zip", filename: "edgeever-attachment-demo.zip", mimeType: "application/zip", byteSize: 153 }],
      },
    },
    {
      id: "rec_infographic",
      cells: {
        fld_feature: "AntV AI 信息图笔记",
        fld_category: "图表与可视化",
        fld_status: "已正式发布",
        fld_verified: true,
        fld_date: "2026-09-15",
        fld_docs: [{ resourceId: "res_demo_feature_matrix_csv", filename: "feature-matrix.csv", mimeType: "text/csv", byteSize: 99 }],
      },
    },
    {
      id: "rec_table",
      cells: {
        fld_feature: "多维结构化表格与公开表单",
        fld_category: "图表与可视化",
        fld_status: "已正式发布",
        fld_verified: true,
        fld_date: "2026-09-20",
        fld_docs: [{ resourceId: "res_demo_product_brief_pdf", filename: "edgeever-product-brief.pdf", mimeType: "application/pdf", byteSize: 349 }],
      },
    },
    {
      id: "rec_mcp",
      cells: {
        fld_feature: "原生 MCP 服务端点 (/mcp)",
        fld_category: "AI 智能体",
        fld_status: "已正式发布",
        fld_verified: true,
        fld_date: "2026-08-10",
        fld_docs: [],
      },
    },
    {
      id: "rec_clipper",
      cells: {
        fld_feature: "Web Clipper 剪藏与微信聊天归档",
        fld_category: "多端客户端",
        fld_status: "已正式发布",
        fld_verified: true,
        fld_date: "2026-09-25",
        fld_docs: [],
      },
    },
  ],
  view: {
    filters: [],
    sort: null,
  },
};

export const DEMO_SEED_MEMOS_ZH = [
  {
    id: "memo_demo_overview",
    notebookId: "nb_demo_features",
    title: "欢迎使用 RTNote：为极客与创作者打造的现代开源知识库",
    tags: ["overview", "guide", "features", "ai-agent"],
    isPinned: true,
    markdown:
      `> **RTNote** 是一款兼具**经典三栏美学**与 **AI 原生动力**的开源 Serverless / 容器化个人知识库。它既找回了极客们钟爱的经典印象笔记式双视图与树状目录，又以零服务器成本、完全数据自主、全端原生覆盖与深度 MCP 智能体协同，重新定义了下一代个人第二大脑。

---

## 1. 为什么选择 RTNote？

*提示：在编辑器模式下，你可以直接点击任意表格单元格进行行内编辑，或右键快捷插入/删除行列。*

| 核心维度 | 传统商业云笔记 (如 Evernote) | 本地离线知识库 (如 Obsidian) | RTNote 极客知识库 |
| :--- | :--- | :--- | :--- |
| **源代码** | 闭源 | 核心闭源，文件开放 | **整栈开源 (AGPL-3.0)** |
| **云端托管成本** | 商业订阅高昂（$10+/月） | 官方云同步收费（$5+/月） | **100% 永久免费 (Cloudflare 免费额度 / Docker 自建)** |
| **数据资产所有权** | 专有格式封闭，导出困难 | 本地 Markdown，移动端同步繁琐 | **完全自主掌控 (D1 SQLite 数据库 / R2 / 无损 ZIP 导出)** |
| **写作与表达矩阵** | 仅富文本，排版易错乱 | 纯 Markdown，缺乏沉浸所见即所得 | **双视图自由切换 (所见即所得 ⇄ 源码) + 原生架构图/流程图/思维导图/AI信息图/多维结构化表格/原生海报笔记** |
| **自媒体排版分发** | 无样式优化，格式丢失 | 需借助外部排版扩展或工具 | **一键复制到微信公众号 / Substack / Medium / WordPress** |
| **社交卡片分享** | 截图粗糙或无排版设计 | 需第三方插件实现 | **内置 8 款精美海报主题，支持自定义字体与 PNG/JPEG 导出** |
| **AI 原生集成生态** | 封闭收费，仅限特定功能 | 需配置复杂的第三方插件 | **原生内置 MCP 服务端点 (\`/mcp\`)、桌面端 ACP 本地智能体协同与行内 AI 助手** |
| **全平台多端覆盖** | 限制免费设备登录数量 | 多端同步与移动端体验门槛高 | **Web / PWA / Android / iOS / macOS / Windows / Linux AppImage** |

---

## 2. 全景架构与生态联动

通过下面的 Mermaid 架构图，你可以清晰了解 RTNote 如何将多端客户端、零成本云基础设施与 AI Agent 紧密串联：

\`\`\`mermaid
flowchart LR
    subgraph ClientsBox["全端客户端与智能体"]
        Clients["全端客户端矩阵<br/>Web · PWA · 桌面客户端<br/>iOS · Android · 浏览器剪藏"]
        Agents["外部 AI 智能体<br/>Claude Code · Cursor · Antigravity"]
    end

    subgraph Platform["RTNote 平台核心 (Cloudflare Workers / Docker)"]
        API["统一 REST API 入口<br/>认证鉴权 · 限流 · 增量同步游标"]
        MCP["原生 MCP 服务端点 (/mcp)<br/>上下文感知 · 工具读写协议"]
    end

    subgraph BackendBox["AI 模型与数据存储"]
        LLMs["主流大语言模型 (BYOK 直连)<br/>OpenAI · Gemini · DeepSeek"]
        Storage[("数据与对象存储<br/>Cloudflare D1 / SQLite · R2 / S3 兼容")]
    end

    Clients <-->|HTTPS 增量同步| API
    Clients -->|BYOK 客户端直连 · 隐私安全| LLMs
    Agents <-->|MCP Tools / SSE 协议| MCP
    API <--> Storage
    MCP <--> Storage
\`\`\`

---

## 3. 极致创作体验与排版美学

RTNote 将高效与优雅融入每一处交互细节，助你专注于思考与表达：

### 双视图编辑器与沉浸模式
- **自由切换视图**：点击右上角 \`</>\` 按钮或使用快捷键，可在**所见即所得富文本**与 **Markdown 源码**间无缝切换，实时双向保真。
- **左侧可折叠大纲**：自动解析文档 \`H1-H3\` 标题层级，支持点击平滑滚动跳转，助你轻松把控万字长文。
- **Zen 专注模式**：按下 \`Cmd/Ctrl + Shift + F\`，隐藏所有侧边栏与干扰元素，进入纯粹写作心流。
- **阅读保护模式 (Reading Protection)**：日常翻阅或查阅笔记时，按下 \`Cmd/Ctrl + E\` 即可一键开启只读保护，锁定当前编辑状态，避免沉浸阅读时误触键盘或意外改动笔记内容；再次按下即可随手切回编辑。

### 精选排版主题与一键自媒体发布
- **内置排版主题**：支持一键切换 \`微信新绿\`、\`薄荷清新\`、\`极简青翠\`、\`线描翠绿\`，以及日暖素笺、青页讲义、夜蓝制图等排版风格，并支持朱雀仿宋、霞鹜文楷等正文字体。
- **一键排版复制**：专为内容创作者设计。点击顶部工具栏的**微信公众号图标**，系统自动将当前笔记转为内联 CSS 样式的优雅富文本，直接粘贴至微信公众号后台、Substack 或 WordPress，排版与代码高亮完美保真。

### 8 套精美社交分享海报 (Poster Cards)
点击右上角“分享为卡片”，即可将任意笔记或片段渲染为高清分享海报，支持：
- **8 大主题风格**：\`Slate (岩灰)\`、\`Aurora (极光青)\`、\`Sunset (落日暖橙)\`、\`Midnight (暗夜极客)\`、\`Mint (清爽薄荷)\`、\`Notepad (复古便签)\`、\`Xuan (宣纸水墨)\`、\`Lavender (薰衣草紫)\`。
- **排版定制**：支持无衬线 (Sans)、宋体/明朝 (Serif)、等宽代码 (Mono) 字体切换，自由选择紧凑、标准或宽幅卡片，一键导出为高清晰度 PNG 或 JPEG 图片。

---

## 4. 丰富表达力：图表、AI 信息图与多维表格

RTNote 打破了传统笔记单一文本的局限，提供多种原生可视化与结构化数据载体：

### 原生图表体系
- **系统架构图 (Architecture)**：针对分布式系统与微服务设计，支持分层边界、图标元数据与自动拓扑排版；
- **业务流程图 (Flowchart)**：标准起止框、判断节点与过程流动，清晰梳理业务链路；
- **第二大脑思维导图 (Mind Map)**：树状辐射、主题归纳，一目了然梳理网状知识脉络。

### AntV AI 智能信息图 (Infographic)
集成 AntV 渲染引擎与 AI Agent：
- 支持时间线 (Timeline)、步骤图 (Steps)、四象限 (Quadrant)、对比矩阵 (VS) 等多种精美模板；
- **对话式智能修订**：直接在信息图面板用自然语言提需求（如“帮我把重点放在跨端上”或“转为时间线”），AI 自动匹配合适板式并完成调整，支持多轮对话与版本回退。

### 多维结构化表格 (Structured Table)
为项目规划、资产跟踪与表单收集而生：
- **丰富字段类型**：原生支持文本、数字、状态单选 (Select)、日期 (Date)、复选框 (Checkbox)、超链接与**多类型附件 (Attachment)**；
- **多条件筛选与排序**：支持动态组合过滤条件与字段升降序；
- **公开表单收集**：可一键生成公开收集入口，外部填写即可实时入表。

---

## 5. 效率工具箱：斜杠指令、双链与数学公式

### 斜杠指令 (Slash Commands)
在正文空白行输入 \`/\` 或直接按下 \`空格键\`，即可呼出快捷指令菜单：
- 快速插入 \`H1/H2/H3\` 标题、引用、分割线、代码块与富文本表格；
- 输入 \`/date\`、\`/time\` 或 \`/now\` 快速插入当前标准时间戳；
- 插入附件、图片或调起行内 AI 智能助手。

### 知识双链与笔记引用
在编辑器中输入 \`@\` 或插入 \`#memo=<笔记ID>\` 链接，即可建立笔记间的双向关联，点击即可在工作区内快速打开关联笔记，构建结构化网状知识库。

### KaTeX 专业数学公式渲染
RTNote 原生支持 LaTeX 数学表达式，无论是行内微积分还是多行物理方程，均可毫秒级高保真渲染：

- **行内公式**：例如质能方程 $E = mc^2$，以及正态分布概率密度函数 $f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}$。
- **多行独立公式块**：
$$
\\oint_{\\partial \\Omega} \\mathbf{E} \\cdot d\\mathbf{S} = \\frac{1}{\\varepsilon_0} \\iiint_{\\Omega} \\rho \\, dV, \\quad \\oint_{\\partial \\Omega} \\mathbf{B} \\cdot d\\mathbf{S} = 0
$$

### 交互式待办清单 (Task Lists)
- [x] 体验 RTNote 双视图与大纲导航
- [x] 探索 8 款编辑器主题与 8 套社交海报卡片
- [x] 浏览最新【AI 信息图】演进里程碑与【多维结构化表格】交付追踪
- [ ] 尝试使用斜杠指令 \`/\` 插入当前日期与结构化表格
- [ ] 配置个人 AI API Key，体验行内智能总结与续写
- [ ] 开启 MCP 协议，让 AI Agent 协助整理工作区

---

## 6. AI 原生协同与 MCP 智能体生态

RTNote 走在 AI 时代前沿，将大语言模型与智能体深度融入知识管理生命周期：

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant User as 创作者 / 知识工作者
    participant Client as RTNote 多端应用
    participant MCP as RTNote MCP 服务端点
    participant Agent as AI Agent (Claude / Cursor / Antigravity)
    participant Database as Notion / 飞书多维表格

    User->>Client: 快速记录碎片想法与会议灵感
    Agent->>MCP: tools/call memo_search (检索近期未整理笔记)
    MCP-->>Agent: 返回结构化 Markdown 笔记内容与标签
    Agent->>Agent: 理解内容、自动提炼核心摘要并归类标签
    Agent->>MCP: tools/call memo_update (写回智能总结与增强标签)
    Agent->>Database: 同步结构化字段至个人知识总库
    Client-->>User: 客户端毫秒级感知更新，笔记井井有条
\`\`\`

### 1. 行内 AI 助手 (Inline AI Assistant)
在正文空白行直接按下 **\`空格键 (Space)\`**、输入 **\`/ai\`**、通过 **\`/\`** 斜杠指令菜单，或选中文本点击浮动工具栏中的 **AI 按钮**，即可即时呼出 AI 写作助手面板：
- **精炼总结与要点提取**：一键压缩提炼全文核心结论、提取待办事项与关键行动项；
- **格式保真智能翻译**：在严格保留原有 Markdown、数学公式、链接与代码块的前提下，精准翻译多国语言；
- **内容重塑与续写**：支持润色与精炼表达，或按上下文顺滑续写；
- **BYOK 隐私直连 (Bring Your Own Key)**：支持直连 OpenAI、Anthropic Claude、Google Gemini、DeepSeek 及各类 OpenAI 兼容的中继 API，数据完全由端侧直发，不经过任何第三方中转。

### 2. 开放 MCP 协议 (Model Context Protocol)
在**设置 → MCP 设置**中生成专属令牌，即可将 RTNote 接入 Claude Code、Cursor、Antigravity、OpenClaw 等主流 AI 编码助手与智能体平台：
- **无缝读写**：支持标准 MCP 端点 \`/mcp\`（兼容最新的无状态 \`2026-07-28\` 协议与经典握手协议）；
- **自动化流转**：AI Agent 可自动读取笔记、智能归档、批量打标，甚至与 Notion、飞书多维表格建立跨平台自动化同步。

---

## 7. 全平台原生覆盖、离线同步与智能剪藏

- **多端原生支持**：
  - **Web / PWA**：支持现代浏览器全功能运行与离线安装；
  - **Android 原生客户端**：基于 Expo 与 SQLite 构建，已上架 Google Play，并提供签名 APK 下载；
  - **iOS 原生客户端**：基于 Swift / SwiftUI 与 GRDB 原生实现，流畅细腻，已上架 App Store（可使用非大陆区 Apple ID 下载）；
  - **macOS 桌面端**：Electron + Rust 高性能 Sidecar，支持 Apple Silicon 和 Intel Mac，内置静默后台更新；
  - **Windows 桌面端**：已正式推出 x64 Preview 版本，支持开机启动、全局快捷键与系统右键上下文菜单将文件一键发送至笔记。
- **浏览器网页剪藏 (Web Clipper)**：已在 Chrome、Edge 和 Firefox 官方扩展商店发布，支持页面纯净剪藏、右键菜单一键剪藏选中文字/高画质图片、以及一键提取 X (Twitter) 完整推文。
- **微信生态与外部导入**：
  - **微信文章一键剪藏**：在移动端系统分享菜单中，直接将微信文章分享到 RTNote，自动提取图文排版并转换为可编辑笔记；
  - **微信聊天转发导入**：桌面端支持将微信合并转发的聊天记录一键导入为格式工整的结构化笔记；
  - **一键排版复制**：点击顶部微信图标，即可将笔记转换为内联排版富文本，直接粘贴至微信公众号后台，排版完美保真。
- **离线草稿与弹性同步**：地铁、飞行模式等无网络环境下自由编辑，重新联网后自动入队完成增量同步与冲突协调。

---

## 8. 多媒体管理、无损备份与零成本自建

### 智能本地图片压缩
在笔记中粘贴或拖入高分辨率图片时，前端会在本地自动将其转码压缩为 WebP 格式，在保证视觉无损的前提下**减少 50% - 90% 的体积**，大幅降低云端存储占用并提升跨端加载速度。

![RTNote 官方 Logo](/api/v1/resources/res_demo_logo/blob)

### 多类型附件自由挂载
支持在笔记中嵌入 Word 文档、PDF 文档、CSV 表格、压缩包及多媒体资源，点击即可在线预览或下载：
- [📝 会议纪要 Word：edgeever-meeting-notes.docx](/api/v1/resources/res_demo_meeting_notes_docx/blob)
- [📄 产品白皮书 PDF：edgeever-product-brief.pdf](/api/v1/resources/res_demo_product_brief_pdf/blob)
- [📊 功能矩阵 CSV：feature-matrix.csv](/api/v1/resources/res_demo_feature_matrix_csv/blob)
- [📦 示例附件压缩包：edgeever-attachment-demo.zip](/api/v1/resources/res_demo_attachment_bundle_zip/blob)

### 自建部署方案：Serverless 与 Docker
1. **Cloudflare Serverless（推荐，永久 100% 免费）**：基于 Workers + D1 数据库 + R2 对象存储构建，完全处于 Cloudflare 免费额度内，无需采购服务器，免运维、免证书续期。
2. **Docker 一键自建（VPS / NAS / 家用服务器）**：
   \`\`\`sh
   # 官方 GHCR 镜像
   curl -fsSL https://edgeever.org/install.sh | bash
   \`\`\`
   单命令自动配置 Docker Compose 环境，并内置每日定时自动更新。部分中国大陆网络环境可能需要自行配置可用的网络代理或可信的镜像加速服务，才能正常访问 GHCR。

### 绝对的数据自由：无损 ZIP 导入与导出
在**个人中心 → 导入与导出**中，可随时将完整笔记库打包导出为结构清晰的 ZIP 压缩包。解压后即为包含标准 YAML Front Matter、相对路径附件图片与完整修订版本的纯 Markdown 文件树，随时可在 Obsidian、VS Code 等任意工具中无缝打开，永不担心平台绑定！

---

> 💡 **快速体验小贴士**：
> 1. 点击右上角 **\`</>\`** 体验丝滑的双视图切换；
> 2. 浏览侧边栏中的 **AI 信息图**、**多维结构化表格** 与 **视觉排版海报** 示例，感受下一代知识库形态；
> 3. 按下 **\`Cmd/Ctrl + E\`** 试一试阅读保护模式，锁定只读避免误改内容；
> 4. 按下 **\`Cmd/Ctrl + O\`** 呼出快速切换器 (Quick Switcher)；
> 5. 体验知识库发布功能：右键笔记本可一键公开发布为带目录树的独立静态知识库网站；
> 6. 点击顶部 **微信图标**，体验一键带格式排版复制；
> 7. 点击 **“分享为卡片”**，挑选一款你心仪的社交海报风格并导出；
> 8. 随时在侧边栏或设置中点击 **“恢复 Demo 数据”**，一键重置演示工作区。
`,
  },
  {
    id: "memo_demo_poster",
    notebookId: "nb_demo_features",
    title: "视觉排版：RTNote 极客第二大脑设计海报",
    tags: ["poster", "design", "visual-layout", "branding"],
    isPinned: false,
    markdown: serializePosterDocument(DEMO_POSTER_DOCUMENT_ZH),
  },
  {
    id: "memo_demo_infographic",
    notebookId: "nb_demo_features",
    title: "演进里程碑：RTNote 全平台架构与版本演进史",
    tags: ["infographic", "milestone", "timeline", "ai-agent"],
    isPinned: false,
    markdown: serializeInfographicDocument(DEMO_INFOGRAPHIC_DOCUMENT_ZH),
  },
  {
    id: "memo_demo_table",
    notebookId: "nb_demo_features",
    title: "交付追踪：RTNote 核心产品特性规划与进度表",
    tags: ["table", "roadmap", "project-management", "tracking"],
    isPinned: false,
    markdown: serializeTableDocument(DEMO_TABLE_DOCUMENT_ZH),
  },
  {
    id: "memo_demo_architecture",
    notebookId: "nb_demo_features",
    title: "系统架构：RTNote 可移植全栈与 AI 协同",
    tags: ["architecture", "diagram", "portable-runtime", "cloud-native", "mcp"],
    isPinned: false,
    markdown: serializeDiagramDocument(DEMO_ARCHITECTURE_DIAGRAM_ZH),
  },
  {
    id: "memo_demo_flowchart",
    notebookId: "nb_demo_features",
    title: "知识工作流：从捕捉灵感到发布分享的流程图",
    tags: ["flowchart", "diagram", "workflow", "knowledge-management"],
    isPinned: false,
    markdown: serializeDiagramDocument(DEMO_FLOWCHART_DIAGRAM_ZH),
  },
  {
    id: "memo_demo_mind_map",
    notebookId: "nb_demo_features",
    title: "第二大脑：个人知识管理体系思维导图",
    tags: ["mind-map", "diagram", "second-brain", "knowledge-management"],
    isPinned: false,
    markdown: serializeDiagramDocument(DEMO_MIND_MAP_DIAGRAM_ZH),
  },
];

export const DEMO_SEED_REVISIONS_ZH = [
  {
    id: "rev_demo_revision_1",
    memoId: "memo_demo_overview",
    revision: 1,
    title: "欢迎使用 RTNote：为极客与创作者打造的现代开源知识库",
    markdown:
      "## 欢迎使用 RTNote（初版草稿）\n\n- 印象笔记经典三栏与自建 Serverless\n- 可视化表格与 Markdown 源码双向切换\n- 原生 MCP 与 AI 智能体协同",
  },
  {
    id: "rev_demo_poster_1",
    memoId: "memo_demo_poster",
    revision: 1,
    title: "视觉排版：RTNote 极客第二大脑设计海报",
    markdown: serializePosterDocument(DEMO_POSTER_DOCUMENT_ZH),
  },
  {
    id: "rev_demo_infographic_1",
    memoId: "memo_demo_infographic",
    revision: 1,
    title: "演进里程碑：RTNote 全平台架构与版本演进史",
    markdown: serializeInfographicDocument(DEMO_INFOGRAPHIC_DOCUMENT_ZH),
  },
  {
    id: "rev_demo_table_1",
    memoId: "memo_demo_table",
    revision: 1,
    title: "交付追踪：RTNote 核心产品特性规划与进度表",
    markdown: serializeTableDocument(DEMO_TABLE_DOCUMENT_ZH),
  },
  {
    id: "rev_demo_architecture_1",
    memoId: "memo_demo_architecture",
    revision: 1,
    title: "系统架构：RTNote 可移植全栈与 AI 协同",
    markdown: serializeDiagramDocument(DEMO_ARCHITECTURE_DIAGRAM_ZH),
  },
];
