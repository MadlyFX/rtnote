import type { PosterTemplateCopy } from "./template-sample-copy";

/** Simplified Chinese poster sample copy. The English source is template-sample-copy.ts. */

/** Row label the Chinese paper-list sample uses where English uses "Subtitle". */
export const PAPER_LIST_SUBTITLE_LABEL_ZH_CN = "副标题";
export const PAPER_LIST_SAMPLE_COPY_ZH_CN: PosterTemplateCopy = {
  title: "值得反复读的好书",
  subtitle: "《看见日常》\n副标题：观察与记录\n核心观点：把目光放回生活，在细微之处发现值得记录的瞬间。慢下来观察，平凡的一天也能成为灵感的起点。一束光、一段对话、一个新的念头，都值得被认真看见。\n阅读收获：好的记录从观察开始。试着为每天留下一小段文字，写下当时的感受，而不只是发生了什么。重新读起时，那些细节会带你回到生活本来的温度。\n\n《思考的力量》\n副标题：提问与理解\n核心观点：从一个好问题开始，建立自己的理解与判断。把复杂的事情拆开，找到真正值得追问的部分。遇到不同意见时，先理解对方的理由，再回头检查自己的假设。\n阅读收获：答案之外，更重要的是思考的过程。保留疑问，比较不同观点，在反复阅读中形成自己的认识。把读到的想法与生活里的具体问题联系起来，让理解慢慢变得清晰。",
  badge: "",
};

export const LEGACY_POSTER_SAMPLE_COPY_ZH_CN: PosterTemplateCopy = {
  title: "把想法\n变成作品",
  subtitle: "一个好想法，值得被看见。",
  badge: "创作笔记",
};

export const TEMPLATE_SAMPLE_COPIES_ZH_CN: Record<string, PosterTemplateCopy> = {
  folio: {
    title: "把模糊的想法\n写成清晰的作品",
    subtitle: "好文章不是一气呵成的，而是在反复追问与删改中慢慢浮现出来的。",
    badge: "编辑手记 · 04",
  },
  brush: {
    title: "高效记笔记的\n三个底层习惯",
    subtitle: "只记核心结论、用自己的话重写、每周定期复盘",
    badge: "建议收藏!",
  },
  keyword: {
    title: "一眼抓住\n注意力",
    subtitle: "高点击率封面拆解",
    badge: "视觉法则",
  },
  regeng: {
    title: "真正拉开差距的\n是下班后的两小时",
    subtitle: "每天留出一段不被打扰的专注时间，长期主义自然会发生。",
    badge: "认知升级 01",
  },
  highlight: {
    title: "读完一本书\n怎样才算真正吸收",
    subtitle: "合上书本，用三句话讲清楚作者想解决的核心问题。",
    badge: "阅读方法",
  },
  frame: {
    title: "保持好奇\n持续创造",
    subtitle: "给每一个新想法留出生长的空间。",
    badge: "年度主题",
  },
  sage: {
    title: "慢下来整理思绪\n反而走得更远",
    subtitle: "把零散的灵感收进卡片，需要时它们自会连成脉络。",
    badge: "日常随笔",
  },
  notes: {
    title: "睡前十分钟\n清空大脑待办",
    subtitle: "写下明天最重要的三件事\n把卡住的任务拆成第一步\n合上电脑不再刷消息",
    badge: "今天 22:30 · 备忘录",
  },
  interview: {
    title: "面试官真正想听的\n不是标准答案",
    subtitle: "用具体案例讲清你的思考过程与取舍逻辑。",
    badge: "求职干货",
  },
  riso: {
    title: "独立创作者的\n灵感漫游指南",
    subtitle: "在不完美的手工质感里，找回表达的乐趣。",
    badge: "独立志 03",
  },
  kicker: {
    title: "先搭建自己的\n最小知识系统",
    subtitle: "为什么收藏了上百篇干货，用的时候还是找不到？",
    badge: "效率专题",
  },
  numeral: {
    title: "三个提问法则\n打开深度思考",
    subtitle: "是什么、为什么、如果换一种假设会怎样。",
    badge: "03",
  },
  calendar: {
    title: "今日宜专注\n完成一件重要小事",
    subtitle: "不必等到状态完美，先写下第一行字。",
    badge: "每日打卡",
  },
  ticket: {
    title: "周末灵感漫步\n城市展映夜",
    subtitle: "带上好奇心，去见有趣的人与新鲜的作品。",
    badge: "凭券入场",
  },
  corner: {
    title: "21 天写作计划\n从每天三百字开始",
    subtitle: "降低启动阻力，让输出变成呼吸一样的习惯",
    badge: "行动清单",
  },
  polaroid: {
    title: "留在相纸里的\n海边日落",
    subtitle: "有些瞬间不用急着发朋友圈，先替自己好好珍藏。",
    badge: "2026 · 夏日胶片",
  },
  serial: {
    title: "好工具如何塑造\n我们的思考方式",
    subtitle: "每周五更新，聊一点产品设计、阅读与数字生活。",
    badge: "创造者周刊 12",
  },
  chat: {
    title: "先别追求完美，\n把第一版写出来就赢了一半。",
    subtitle: "总是拖延、迟迟不敢动笔怎么办？",
    badge: "创作问答",
  },
  window: {
    title: "用纯文本管理\n你的一生知识库",
    subtitle: "轻量、本地优先、随时检索，不被任何复杂格式绑架。",
    badge: "notes-guide.md",
  },
  newspaper: {
    title: "在信息过载时代\n重建深度阅读",
    subtitle: "少看十条碎片热搜，多读一篇经得起时间检验的长文。",
    badge: "思想周报 08",
  },
  stack: {
    title: "保持独立思考",
    subtitle: "在喧嚣的浪潮里，守住内心的判断与节奏。",
    badge: "思维宣言",
  },
  bili: {
    title: "十分钟搞懂\n色彩搭配底层逻辑",
    subtitle: "从零拆解配色比例与视觉焦点，新手也能直接抄作业",
    badge: "知识区 · 干货",
  },
  pop: {
    title: "周末灵感充电\n去逛一场小展",
    subtitle: "收集生活里那些让人眼前一亮的配色与巧思",
    badge: "灵感簿",
  },
  swiss: {
    title: "少即是多\n秩序产生美感",
    subtitle: "克制的网格与留白，让核心信息自己说话。",
    badge: "01",
  },
  collage: {
    title: "把喜欢的小事\n贴进日常手账",
    subtitle: "一杯手冲咖啡、一张旅途票根，都是生活的注脚。",
    badge: "手账",
  },
  mega: {
    title: "立刻行动\n胜过空想",
    subtitle: "完成比完美更重要，现在就迈出第一步",
    badge: "行动派",
  },
  ticker: {
    title: "年度效率工具\n红黑榜大盘点",
    subtitle: "实测三十款高频应用，只留真正省时间的五款。",
    badge: "年度盘点",
  },
  memo: {
    title: "费曼学习法\n以教代学最有效",
    subtitle: "如果不能用简单的话讲给外行听，说明还没有真正吃透。",
    badge: "课堂重点",
  },
  mag: {
    title: "慢生活与\n长期主义者",
    subtitle: "在这个追求即时反馈的时代，依然有人愿意花五年打磨一件事。",
    badge: "特辑 07",
  },
  print: {
    title: "字体的秩序\n与平面之美",
    subtitle: "经典网格排版与现代印刷视觉实验",
    badge: "海报展 02",
  },
  bento: {
    title: "高质量复盘的\n三个核心步骤",
    subtitle: "回顾最初目标、找出关键偏差、提炼下次行动",
    badge: "效率便当",
  },
  calm: {
    title: "留白，是为了\n听见内心的声音",
    subtitle: "不必把每一天都排满，松弛下来才看得清方向。",
    badge: "静心手记",
  },
  seal: {
    title: "万物静观皆自得",
    subtitle: "慢品人间烟火色闲观万事岁月长",
    badge: "清欢",
  },
  compare: {
    title: "文案修改前后对比",
    subtitle: "重点模糊 | 一句讲透",
    badge: "文案诊所",
  },
  split: {
    title: "用好自然光\n拍出故事感空间",
    subtitle: "午后三点的侧逆光，最能勾勒出器物与房间的温柔层次。",
    badge: "05",
  },
  impact: {
    title: "千万别再\n盲目努力了",
    subtitle: "避开这三个最容易消耗精力的隐形陷阱",
    badge: "深度拆解",
  },
  neon: {
    title: "AI 时代的工作流\n全面进化",
    subtitle: "把重复劳动交给自动化，把创造力留给真正的问题。",
    badge: "AI LAB",
  },
  quote: {
    title: "我们写作，是为了把走过的路再活一遍。",
    subtitle: "—— 写给每一位坚持记录的人",
    badge: "阅读摘录",
  },
  cinema: {
    title: "漫长的季节\n与远行的人",
    subtitle: "所有走过的弯路，最终都会变成故事里的风景",
    badge: "STORY FILM",
  },
  minimal: {
    title: "简单清晰\n胜过繁复修饰",
    subtitle: "删掉多余的百分之八十，真正重要的观点才会浮现。",
    badge: "极简思考",
  },
  bold: {
    title: "一句话讲清楚\n你的核心观点",
    subtitle: "在三秒内抓住读者视线，好标题永远直奔主题。",
    badge: "爆款逻辑",
  },
  poster: {
    title: "拒绝无效内耗\n把精力还给自己",
    subtitle: "停止过度反刍，用一次具体的行动代替十次焦虑。",
    badge: "清醒指南",
  },
  number: {
    title: "五个立刻见效的\n桌面整理习惯",
    subtitle: "每天花三分钟归位，换来一整天清爽的专注状态。",
    badge: "5",
  },
  neo: {
    title: "打破常规思维\n做出好玩的产品",
    subtitle: "不怕锋芒毕露，有个性的设计才会被人记住",
    badge: "灵感必看",
  },
  acid: {
    title: "未来感视觉\n与数字艺术浪潮",
    subtitle: "探索生成式设计与流体光影的无限可能",
    badge: "前沿趋势",
  },
  glass: {
    title: "新一代个人\n灵感工作台",
    subtitle: "随时捕捉闪念、长文写作与视觉排版，让创作一气呵成。",
    badge: "产品发布",
  },
  editorial: {
    title: "深度思考的\n长期价值",
    subtitle: "在快节奏的信息流里，为值得反复推敲的问题留出篇幅。",
    badge: "深度专栏",
  },
  dark: {
    title: "构建高可靠的\n本地优先应用",
    subtitle: "毫秒级响应与离线可用，让工具真正服务于创作。",
    badge: "技术洞察",
  },
  sticker: {
    title: "周末宅家充电\n治愈小事清单",
    subtitle: "晒太阳、读闲书、做一顿简单的早午餐。",
    badge: "生活碎片",
  },
  gradient: {
    title: "把经验沉淀为\n可复用的方法论",
    subtitle: "每一次踩坑与复盘，都是下一次出发的底气。",
    badge: "成长笔记",
  },
  center: {
    title: "好设计是看不见的\n秩序与克制",
    subtitle: "恰到好处的留白，让目光自然落在重点之上",
    badge: "设计美学",
  },
  checklist: {
    title: "发布前的四项\n必查清单",
    subtitle: "标题直击痛点、首图重点突出、段落留白透气、结尾给出行动建议",
    badge: "干货清单",
  },
  soft: {
    title: "给生活留一点\n温柔的松弛感",
    subtitle: "顺应自己的节奏，允许万物穿过而不急于定义。",
    badge: "情绪日签",
  },
};
