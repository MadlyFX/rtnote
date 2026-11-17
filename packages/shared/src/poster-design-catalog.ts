import { POSTER_DESIGN_TEMPLATE_USES_ZH_CN } from "./poster-design-catalog.zh-CN";

// Metadata shared by the browser editor and AI discovery. Layout builds remain
// in the existing Qiaomu Design implementation (MIT).
export const POSTER_DESIGN_TEMPLATES = [
  {
    "id": "paper-list",
    "zh": "书页清单",
    "en": "Bookish list",
    "fit": ["xhs", "portrait", "vertical", "xhs-square", "square"],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["paper-list"],
    "enUse": "Textured ivory paper, faint background lettering, serif headlines, large numbers and fine rules; reading notes and knowledge lists. Separate entries with blank lines: book title first, optional second line starting with “Subtitle:”, then body text",
    "available": true
  },
  {
    "id": "minimal",
    "zh": "简约白",
    "en": "Minimal",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat",
      "x"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["minimal"],
    "enUse": "Clean and restrained; opinions, reading, knowledge",
    "available": true
  },
  {
    "id": "editorial",
    "zh": "杂志",
    "en": "Editorial",
    "fit": [
      "wechat",
      "x",
      "xhs",
      "xhs-square",
      "portrait",
      "square"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["editorial"],
    "enUse": "Serif headline with rules; essays and articles",
    "available": false
  },
  {
    "id": "bold",
    "zh": "醒目黄",
    "en": "Loud yellow",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "vertical"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["bold"],
    "enUse": "Saturated flat colour with black type; stops the scroll",
    "available": true
  },
  {
    "id": "dark",
    "zh": "深色科技",
    "en": "Dark tech",
    "fit": [
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "wechat",
      "x",
      "xhs",
      "xhs-square",
      "portrait",
      "square"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["dark"],
    "enUse": "Dark with a neon glow; AI, code, tools",
    "available": false
  },
  {
    "id": "poster",
    "zh": "大字报",
    "en": "Poster",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "vertical"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["poster"],
    "enUse": "Full-bleed centred type; punchy statements",
    "available": true
  },
  {
    "id": "split",
    "zh": "左文右图",
    "en": "Arch split",
    "fit": [
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "wechat",
      "x",
      "xhs",
      "xhs-square",
      "portrait",
      "square"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["split"],
    "enUse": "Copy on the left, an orange arch window on the right for a portrait or product; cream paper, a sun disc and fine rules",
    "available": true
  },
  {
    "id": "sticker",
    "zh": "便签",
    "en": "Sticky note",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["sticker"],
    "enUse": "Pink backdrop, paper note; lifestyle posts",
    "available": false
  },
  {
    "id": "gradient",
    "zh": "渐变光感",
    "en": "Soft gradient",
    "fit": [
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "wechat",
      "x",
      "xhs",
      "xhs-square",
      "portrait",
      "square"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["gradient"],
    "enUse": "Blue-cyan gradient with white type; safe and versatile",
    "available": false
  },
  {
    "id": "center",
    "zh": "居中标签",
    "en": "Centered",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["center"],
    "enUse": "Thin frame, centred, highlighted subtitle; all-purpose",
    "available": false
  },
  {
    "id": "checklist",
    "zh": "清单笔记",
    "en": "Checklist",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["checklist"],
    "enUse": "Headline plus 3–4 points; dense and useful",
    "available": false
  },
  {
    "id": "number",
    "zh": "数字干货",
    "en": "Big number",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "vertical",
      "youtube",
      "bilibili",
      "bilibili-43"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["number"],
    "enUse": "A huge numeral as the hook; listicles",
    "available": true
  },
  {
    "id": "impact",
    "zh": "油管冲击",
    "en": "Thumbnail punch",
    "fit": [
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "vertical"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["impact"],
    "enUse": "Blue sunburst, yellow type with a black outline and hard shadow, a red arrow and burst badge; room for a subject on the right",
    "photo": true,
    "available": false
  },
  {
    "id": "compare",
    "zh": "对比",
    "en": "Versus",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["compare"],
    "enUse": "A slanted split: dull “before” against vivid “after” with a VS burst; write the subtitle as “A | B”",
    "available": false
  },
  {
    "id": "neo",
    "zh": "新粗野",
    "en": "Neo-brutal",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "vertical"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["neo"],
    "enUse": "Thick black borders, hard shadows, bright backdrop",
    "available": true
  },
  {
    "id": "soft",
    "zh": "柔雾莫兰迪",
    "en": "Soft haze",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat",
      "x"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["soft"],
    "enUse": "Muted haze; lifestyle, mood, fashion",
    "available": false
  },
  {
    "id": "swiss",
    "zh": "瑞士网格",
    "en": "Swiss grid",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat",
      "x",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["swiss"],
    "enUse": "Off-white, a red disc, ultra-bold sans and grid hairlines",
    "available": true
  },
  {
    "id": "acid",
    "zh": "酸性渐变",
    "en": "Acid mesh",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "vertical"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["acid"],
    "enUse": "Pastel mesh glows and grain, a centred deep-violet headline and one sparkle; trendy, music, AI",
    "available": true
  },
  {
    "id": "collage",
    "zh": "拼贴手账",
    "en": "Paper collage",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "bilibili",
      "wechat"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["collage"],
    "enUse": "Kraft paper, torn colour blocks, tape and stickers; lifestyle and journaling",
    "available": true
  },
  {
    "id": "mega",
    "zh": "大字满版",
    "en": "Mega type",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "vertical",
      "youtube"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["mega"],
    "enUse": "The headline fills the artboard on a saturated colour; maximum scroll-stopping force",
    "available": true
  },
  {
    "id": "ticker",
    "zh": "跑马灯",
    "en": "Ticker",
    "fit": [
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "xhs",
      "xhs-square",
      "portrait",
      "square"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["ticker"],
    "enUse": "Cream with diagonal ticker bands and hard-shadow type; built for video feeds",
    "available": false
  },
  {
    "id": "memo",
    "zh": "便签笔记",
    "en": "Memo paper",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["memo"],
    "enUse": "Ruled notebook paper with a margin line and a highlighter; study notes and tips",
    "available": true
  },
  {
    "id": "pop",
    "zh": "贴纸波普",
    "en": "Pop sticker",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "vertical"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["pop"],
    "enUse": "Yellow, heavy black type, a few tilted pink, blue and green stickers and a white pill subtitle; playful without outlines, hard shadows or bursts",
    "available": true
  },
  {
    "id": "mag",
    "zh": "杂志封面",
    "en": "Magazine",
    "fit": [
      "wechat",
      "x",
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "bilibili"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["mag"],
    "enUse": "Paper, a huge serif headline, a ghost issue numeral and masthead rules; a real magazine cover",
    "available": true
  },
  {
    "id": "print",
    "zh": "印刷海报",
    "en": "Print poster",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat",
      "x",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["print"],
    "enUse": "Black, paper and one vermilion; crop marks, registration target, edge text and barcode: the European typographic poster vocabulary",
    "available": true
  },
  {
    "id": "glass",
    "zh": "玻璃卡片",
    "en": "Glass card",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "wechat",
      "x"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["glass"],
    "enUse": "Pastel mesh background, a large frosted glass card and floating pills; modern, product, app",
    "available": true
  },
  {
    "id": "bento",
    "zh": "便当清单",
    "en": "Bento list",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["bento"],
    "enUse": "A dark headline card and three colour cards in a bento grid; dense and good looking",
    "available": true
  },
  {
    "id": "neon",
    "zh": "霓虹网格",
    "en": "Neon grid",
    "fit": [
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "wechat",
      "x",
      "xhs",
      "xhs-square",
      "portrait",
      "square"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["neon"],
    "enUse": "Dark perspective grid, neon glow type and viewfinder corners; AI, code, cyber",
    "available": false
  },
  {
    "id": "calm",
    "zh": "松弛留白",
    "en": "Calm paper",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat",
      "x"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["calm"],
    "enUse": "Cloud-white paper, a large serif headline, a vertical rule, an arc and edge text; quiet and restrained",
    "available": true
  },
  {
    "id": "folio",
    "zh": "编辑大标题",
    "en": "Editorial headline",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat",
      "x",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["folio"],
    "enUse": "An editorial page: a heavy top rule with section and issue, a flush-left heavy headline, a serif standfirst and a hairline foot; one focal point, half the page left empty",
    "available": true
  },
  {
    "id": "numeral",
    "zh": "单色大数字",
    "en": "Big numeral",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "wechat",
      "x"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["numeral"],
    "enUse": "One oversized numeral as the hook, a quiet headline beneath; a single accent colour for lists, tutorials and number posts",
    "available": true
  },
  {
    "id": "sage",
    "zh": "纸质卡片",
    "en": "Paper card",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat",
      "x",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["sage"],
    "enUse": "A muted sage ground with one warm paper card carrying the headline; gentle, clean and tactile",
    "available": true
  },
  {
    "id": "seal",
    "zh": "书法印章",
    "en": "Ink & seal",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat",
      "x",
      "vertical"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["seal"],
    "enUse": "Rice paper, a huge ink wash disc, a big serif headline and a red seal; short Chinese titles run vertically",
    "available": true
  },
  {
    "id": "quote",
    "zh": "金句海报",
    "en": "Quote poster",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat",
      "x"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["quote"],
    "enUse": "Ink black, a giant gold quotation mark and a serif statement; one line carries the poster",
    "available": false
  },
  {
    "id": "cinema",
    "zh": "电影感",
    "en": "Cinematic",
    "fit": [
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "wechat",
      "x"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["cinema"],
    "enUse": "Teal-and-orange light, lens flare, gold viewfinder corners and a wide-tracked serif title; documentary and vlog",
    "photo": true,
    "available": false
  },
  {
    "id": "bili",
    "zh": "B 站知识区",
    "en": "Bilibili explainer",
    "fit": [
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "youtube",
      "wide",
      "vertical",
      "xhs",
      "xhs-square",
      "portrait",
      "square"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["bili"],
    "enUse": "Light grey with Bilibili pink and blue, a section tag, a bold headline and a little-TV frame whose screen takes a picture; explainers and reviews",
    "available": true
  },
  {
    "id": "highlight",
    "zh": "荧光标题",
    "en": "Highlighter",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "vertical",
      "wechat"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["highlight"],
    "enUse": "Black type on white with a round-ended highlighter stroke under every line, each at its own slight tilt; tips, opinions and tutorials",
    "available": true
  },
  {
    "id": "notes",
    "zh": "备忘录",
    "en": "Notes app",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["notes"],
    "enUse": "A phone notes screenshot: yellow back button, date, bold headline and a checklist from the points; personal and trustworthy",
    "available": true
  },
  {
    "id": "chat",
    "zh": "聊天截图",
    "en": "Chat bubbles",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "vertical"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["chat"],
    "enUse": "A chat exchange: the subtitle asks, the headline answers; Q&A, AI, relationships and work",
    "available": true
  },
  {
    "id": "keyword",
    "zh": "一词冲击",
    "en": "Keyword punch",
    "fit": [
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "vertical",
      "xhs",
      "xhs-square",
      "portrait",
      "square"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["keyword"],
    "enUse": "A three-word thumbnail: saturated blue, heavy white type, one yellow keyword tag (the subtitle) and a pale disc where the subject stands; loud without outlines or bursts",
    "photo": true,
    "available": true
  },
  {
    "id": "riso",
    "zh": "孔版印刷",
    "en": "Risograph",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat",
      "x",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["riso"],
    "enUse": "Recycled paper, fluorescent pink and blue overprinting with slight misregistration and grain; zines, shows and culture",
    "available": true
  },
  {
    "id": "ticket",
    "zh": "票根",
    "en": "Ticket stub",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat",
      "x",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["ticket"],
    "enUse": "An admission ticket with notches and perforation: headline on the main part, label and barcode on the stub; events, courses, travel",
    "available": true
  },
  {
    "id": "window",
    "zh": "窗口教程",
    "en": "App window",
    "fit": [
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat",
      "x"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["window"],
    "enUse": "A macOS-style window on a soft gradient: traffic lights, a file tab and the headline inside; tutorials, tools and code",
    "available": true
  },
  {
    "id": "newspaper",
    "zh": "报纸头版",
    "en": "Front page",
    "fit": [
      "wechat",
      "x",
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["newspaper"],
    "enUse": "Newsprint, a serif masthead (the label), double rules, a dateline and greeked columns; opinion, analysis, annual reviews",
    "available": true
  },
  {
    "id": "polaroid",
    "zh": "拍立得",
    "en": "Polaroid",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "wechat"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["polaroid"],
    "enUse": "A taped instant photo (the print is a picture slot), the label on its lip and a big headline beside it; travel, vlogs, everyday life",
    "available": true
  },
  {
    "id": "stack",
    "zh": "叠字海报",
    "en": "Echo stack",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "vertical",
      "wechat",
      "x"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["stack"],
    "enUse": "The headline repeated in fading layers around one solid red line; a rhythmic type poster for short titles and slogans",
    "available": true
  },
  {
    "id": "serial",
    "zh": "栏目头图",
    "en": "Column header",
    "fit": [
      "wechat",
      "x",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "xhs",
      "xhs-square",
      "portrait",
      "square"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["serial"],
    "enUse": "A dark column band with the series name and a big issue number (label like “Weekly 12”) beside the headline; recurring newsletters and podcasts",
    "available": true
  },
  {
    "id": "regeng",
    "zh": "热梗卡",
    "en": "Daily drop",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["regeng"],
    "enUse": "A black hashtag bar, a heavy headline in a stack of three offset outlined cards and an issue number; daily drops, news and series notes",
    "available": true
  },
  {
    "id": "interview",
    "zh": "黑黄箭头",
    "en": "Black & yellow",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "vertical"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["interview"],
    "enUse": "Black, a heavy yellow headline, one big hand-drawn arrow pointing at it, a boxed label and a corner smiley; interviews, exams and checklists",
    "available": true
  },
  {
    "id": "brush",
    "zh": "笔刷收藏",
    "en": "Brush highlight",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["brush"],
    "enUse": "Heavy black type on white, a green brush stroke under the last line, a tilted “save this” tag and a check row from the points; tips and side hustles",
    "available": true
  },
  {
    "id": "calendar",
    "zh": "日历页",
    "en": "Calendar page",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["calendar"],
    "enUse": "Flat blue with a white calendar page and binding rings, a heavy headline on the page; daily lines, check-ins and to-dos",
    "available": true
  },
  {
    "id": "frame",
    "zh": "框线大字",
    "en": "Framed type",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat",
      "x",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["frame"],
    "enUse": "Flat colour, a thin inset frame, a headline that fills it and a sun disc bleeding off a corner; hiring, launches and notices",
    "available": true
  },
  {
    "id": "kicker",
    "zh": "粗细引题",
    "en": "Kicker headline",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "wechat",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["kicker"],
    "enUse": "Light grey: the subtitle as a thin kicker above a heavy headline, a double-ring pill tag and a “swipe” cue; experience posts, Q&A, work",
    "available": true
  },
  {
    "id": "corner",
    "zh": "斜角色块",
    "en": "Corner wedge",
    "fit": [
      "xhs",
      "xhs-square",
      "portrait",
      "square",
      "youtube",
      "bilibili",
      "bilibili-43",
      "bilibili-hd",
      "wide",
      "wechat"
    ],
    "zhUse": POSTER_DESIGN_TEMPLATE_USES_ZH_CN["corner"],
    "enUse": "White with a big mint wedge from the lower right, a heavy headline top left, a black pill subtitle and a curved arrow; plans, lists and study",
    "available": true
  }
];
export function posterDesignTemplate(id: string) {
  const template = POSTER_DESIGN_TEMPLATES.find(template => template.id === id);
  if (!template) throw new Error('Unknown poster design template');
  const { available: _available, ...descriptor } = template;
  return descriptor;
}

export const POSTER_TEMPLATE_SELECTION_INSTRUCTION = "Before create_poster_memo, call get_poster_capabilities and read templates and browserDesignTemplates. Match zhUse/enUse to the user's content, intended style and target format; fit lists recommended platform IDs for browser designs. Respect an explicitly requested template. Choose a basic style ID from templates for create_poster_memo.template; browserDesignTemplates IDs are only for request_poster_render.templateId, even when IDs overlap. For a new poster, you may apply a matching browser design during initial rendering: create the poster, read get_poster for expectedRevision, then request_poster_render with templateId. This requires an online desktop/Web workspace; report pending or failed rendering honestly. For an existing poster, apply a different template only when the user explicitly requests a template change. With sections, basic styles share the same grid/list content layout and differ mainly in palette; their headline-only typography descriptions do not determine the section layout.";
