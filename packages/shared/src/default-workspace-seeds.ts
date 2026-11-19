import { WELCOME_MEMO_TRANSLATION_JA } from "./default-workspace-seeds.ja";
import { WELCOME_MEMO_TRANSLATION_ZH_CN } from "./default-workspace-seeds.zh-CN";
import { WELCOME_MEMO_TRANSLATION_ZH_TW } from "./default-workspace-seeds.zh-TW";
import { LEGACY_WELCOME_MEMO_SEED_TITLE } from "./rtnote-legacy-values";
import { resolveSupportedLocale, type SupportedLocale } from "./i18n/locales";

export type DefaultNotebookSeed = {
  key: "inbox" | "projects" | "learning" | "creative" | "personal";
  slug: string;
  color: string | null;
  sortOrder: number;
  names: Record<SupportedLocale, string>;
};

// The installation migrations (inherited from RTNote and immutable) seed the
// zh-CN names. Keep zh-CN first so the localization guard can recognise names
// that nobody has changed yet and replace them with the reader's language.
// color stays null so the sidebar uses the shared slate icon. A hue is stored
// only after someone saves an appearance.
export const DEFAULT_NOTEBOOK_SEEDS: readonly DefaultNotebookSeed[] = [
  {
    key: "inbox",
    slug: "inbox",
    color: null,
    sortOrder: 10,
    names: {
      "zh-CN": "等待分类",
      "zh-TW": "等待分類",
      "en-US": "Inbox",
      es: "Bandeja de entrada",
      de: "Eingang",
      fr: "Boîte de réception",
      ja: "受信トレイ",
      pl: "Skrzynka",
      ru: "Входящие",
    },
  },
  {
    key: "projects",
    slug: "work-projects",
    color: null,
    sortOrder: 20,
    names: {
      "zh-CN": "工作项目",
      "zh-TW": "工作專案",
      "en-US": "Work Projects",
      es: "Proyectos de trabajo",
      de: "Arbeitsprojekte",
      fr: "Projets professionnels",
      ja: "仕事のプロジェクト",
      pl: "Projekty zawodowe",
      ru: "Рабочие проекты",
    },
  },
  {
    key: "learning",
    slug: "learning-resources",
    color: null,
    sortOrder: 30,
    names: {
      "zh-CN": "学习资料",
      "zh-TW": "學習資料",
      "en-US": "Learning Resources",
      es: "Material de aprendizaje",
      de: "Lernmaterialien",
      fr: "Ressources d'apprentissage",
      ja: "学習資料",
      pl: "Materiały do nauki",
      ru: "Учебные материалы",
    },
  },
  {
    key: "creative",
    slug: "creative-ideas",
    color: null,
    sortOrder: 40,
    names: {
      "zh-CN": "灵感创作",
      "zh-TW": "靈感創作",
      "en-US": "Creative Ideas",
      es: "Ideas creativas",
      de: "Kreative Ideen",
      fr: "Idées créatives",
      ja: "アイデアと創作",
      pl: "Pomysły i twórczość",
      ru: "Творческие идеи",
    },
  },
  {
    key: "personal",
    slug: "personal-life",
    color: null,
    sortOrder: 50,
    names: {
      "zh-CN": "生活个人",
      "zh-TW": "生活個人",
      "en-US": "Personal Life",
      es: "Vida personal",
      de: "Persönliches",
      fr: "Vie personnelle",
      ja: "暮らしと個人",
      pl: "Życie prywatne",
      ru: "Личная жизнь",
    },
  },
];

export const localizeDefaultNotebookName = (
  seed: DefaultNotebookSeed,
  locale: string | null | undefined,
) => seed.names[resolveSupportedLocale(locale)];

export const WELCOME_MEMO_ID = "memo_welcome";

/**
 * The welcome note as the installation migrations leave it (0001_initial.sql,
 * repaired by 0014_repair_seed_memo_content_hash.sql): its title, the content
 * hash, and revision 0 written by the `system` actor. Any edit, including a
 * title-only one, changes the title, the revision, or the actor, so together
 * they identify a welcome note nobody has touched.
 *
 * The migrations predate the RTNote name and are immutable, so the seeded
 * title still says RTNote. First sign-in replaces it with the localized
 * RTNote welcome note.
 */
export const WELCOME_MEMO_SEED_TITLE = LEGACY_WELCOME_MEMO_SEED_TITLE;
export const WELCOME_MEMO_SEED_CONTENT_HASH = "4edcf7092f86c561210d4eb788e96f28ec5c045f93952c82f5f57e1902f548bd";
// Migration 0071 repairs the original seed's literal backslash-n and advances it to revision 1.
export const WELCOME_MEMO_REPAIRED_CONTENT_HASH = "189b5908aab07c9d43a58954ab8cf5d87a7f213c8895d381cbed1af5e1f45839";

export type WelcomeMemoTranslation = {
  title: string;
  paragraphs: [string, string];
};

export const WELCOME_MEMO_TRANSLATIONS: Record<SupportedLocale, WelcomeMemoTranslation> = {
  "zh-CN": WELCOME_MEMO_TRANSLATION_ZH_CN,
  "zh-TW": WELCOME_MEMO_TRANSLATION_ZH_TW,
  "en-US": {
    title: "Welcome to RTNote",
    paragraphs: [
      "This is your first RTNote note: three panes, running on the edge, ready for AI agents.",
      "Next, create notebooks, write notes, search your content, and merge several notes into a new long-term note.",
    ],
  },
  ja: WELCOME_MEMO_TRANSLATION_JA,
  pl: {
    title: "Witaj w RTNote",
    paragraphs: [
      "To Twoja pierwsza notatka w RTNote: trzy panele, działanie na brzegu sieci i gotowość do pracy z agentami AI.",
      "Teraz możesz tworzyć notatniki, pisać notatki, przeszukiwać treści i scalać kilka notatek w jedną nową, trwałą notatkę.",
    ],
  },
  ru: {
    title: "Добро пожаловать в RTNote",
    paragraphs: [
      "Это первая заметка в RTNote: три панели, работа на краю сети и готовность к агентам ИИ.",
      "Дальше можно создавать блокноты, писать заметки, искать по содержимому и объединять несколько заметок в одну новую долгосрочную.",
    ],
  },
  es: {
    title: "Bienvenido a RTNote",
    paragraphs: [
      "Esta es su primera nota en RTNote: tres paneles, en el edge y lista para agentes de IA.",
      "A continuación, cree libretas, escriba notas, busque contenido y fusione varias notas en una nueva nota a largo plazo.",
    ],
  },
  de: {
    title: "Willkommen bei RTNote",
    paragraphs: [
      "Dies ist Ihre erste RTNote-Notiz: drei Bereiche, auf dem Edge ausgeführt und bereit für KI-Agenten.",
      "Erstellen Sie als Nächstes Notizbücher, schreiben Sie Notizen, durchsuchen Sie Inhalte und führen Sie mehrere Notizen zu einer neuen Notiz zusammen.",
    ],
  },
  fr: {
    title: "Bienvenue sur RTNote",
    paragraphs: [
      "Voici votre première note RTNote : trois panneaux, déployée sur l'Edge et prête pour les agents IA.",
      "Vous pouvez maintenant créer des carnets, rédiger des notes, effectuer des recherches et fusionner plusieurs notes en une nouvelle note durable.",
    ],
  },
};

/**
 * Welcome titles from older seeds, so untouched welcome notes
 * are still recognized.
 */
export const LEGACY_WELCOME_MEMO_TITLES: readonly string[] = Object.values(WELCOME_MEMO_TRANSLATIONS)
  .map(({ title }) => title);

export type WelcomeMemoContent = {
  title: string;
  excerpt: string;
  contentJson: string;
  contentMarkdown: string;
  contentText: string;
};

// Mirrors the document shape of the welcome note in migrations/0001_initial.sql:
// a level-2 heading followed by two paragraphs.
export const buildWelcomeMemoContent = (locale: string | null | undefined): WelcomeMemoContent => {
  const { title, paragraphs } = WELCOME_MEMO_TRANSLATIONS[resolveSupportedLocale(locale)];
  const text = (value: string) => [{ type: "text", text: value }];
  return {
    title,
    excerpt: paragraphs[0],
    contentJson: JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: text(title) },
        ...paragraphs.map((paragraph) => ({ type: "paragraph", content: text(paragraph) })),
      ],
    }),
    contentMarkdown: [`## ${title}`, ...paragraphs].join("\n\n"),
    contentText: [title, ...paragraphs].join(" "),
  };
};
