import { resolveSupportedLocale } from "./i18n/locales";
import { MEMO_TEMPLATE_SEED_JA } from "./memo-template-seeds.ja";
import { MEMO_TEMPLATE_SEED_ZH_CN } from "./memo-template-seeds.zh-CN";
import { MEMO_TEMPLATE_SEED_ZH_TW } from "./memo-template-seeds.zh-TW";

export type MemoTemplateSeedLocale = "zh-CN" | "zh-TW" | "en-US" | "ja" | "pl" | "ru" | "es" | "de" | "fr";

export type MemoTemplateSeedTranslation = {
  title: string;
  description: string;
  contentMarkdown: string;
};

export type MemoTemplateSeed = {
  key: "quick-note" | "meeting" | "weekly-review" | "reading" | "okr";
  translationKey: "quickNote" | "meeting" | "weeklyReview" | "reading" | "okr";
  tag: string;
  translations: Record<MemoTemplateSeedLocale, MemoTemplateSeedTranslation>;
};

const translationFor = (
  translations: Record<string, MemoTemplateSeedTranslation>,
  key: string,
): MemoTemplateSeedTranslation => {
  const translation = translations[key];
  if (!translation) throw new Error(`Missing template seed translation: ${key}`);
  return translation;
};

// Chinese and Japanese translations live in the locale files next to this one.
// The exact seeded strings matter: untouched templates are recognised by them.
const seed = (
  metadata: Omit<MemoTemplateSeed, "translations">,
  enUS: MemoTemplateSeedTranslation,
  pl: MemoTemplateSeedTranslation,
  ru: MemoTemplateSeedTranslation,
  es: MemoTemplateSeedTranslation,
  de: MemoTemplateSeedTranslation,
  fr: MemoTemplateSeedTranslation,
): MemoTemplateSeed => ({
  ...metadata,
  translations: {
    "zh-CN": translationFor(MEMO_TEMPLATE_SEED_ZH_CN, metadata.key),
    "zh-TW": translationFor(MEMO_TEMPLATE_SEED_ZH_TW, metadata.key),
    "en-US": enUS,
    ja: translationFor(MEMO_TEMPLATE_SEED_JA, metadata.key),
    pl,
    ru,
    es,
    de,
    fr,
  },
});

export const DEFAULT_MEMO_TEMPLATE_SEEDS: readonly MemoTemplateSeed[] = [
  seed(
    { key: "quick-note", translationKey: "quickNote", tag: "quick-note" },
    {
      title: "Quick Spark",
      description: "Capture fleeting thoughts, ideas, links, and immediate action items.",
      contentMarkdown: "## 💡 Fleeting Thoughts\n\n- \n\n## 📌 Context & Notes\n\n\n\n## 🚀 Next Actions\n\n- [ ] ",
    },
    {
      title: "Szybka notatka",
      description: "Zapisuj ulotne myśli, pomysły, linki i działania do natychmiastowego podjęcia.",
      contentMarkdown: "## 💡 Ulotne myśli\n\n- \n\n## 📌 Kontekst i uwagi\n\n\n\n## 🚀 Kolejne kroki\n\n- [ ] ",
    },
    {
      title: "Быстрая заметка",
      description: "Записывайте мимолётные мысли, идеи, ссылки и ближайшие действия.",
      contentMarkdown: "## 💡 Мимолётные мысли\n\n- \n\n## 📌 Контекст и заметки\n\n\n\n## 🚀 Дальше\n\n- [ ] ",
    },
    {
      title: "Nota rápida",
      description: "Capture pensamientos fugaces, ideas, enlaces y acciones inmediatas.",
      contentMarkdown: "## 💡 Pensamientos fugaces\n\n- \n\n## 📌 Contexto y notas\n\n\n\n## 🚀 Próximas acciones\n\n- [ ] ",
    },
    {
      title: "Kurznotiz",
      description: "Halten Sie flüchtige Gedanken, Ideen, Links und sofortige Aufgaben fest.",
      contentMarkdown: "## 💡 Flüchtige Gedanken\n\n- \n\n## 📌 Kontext & Notizen\n\n\n\n## 🚀 Nächste Aktionen\n\n- [ ] ",
    },
    {
      title: "Note rapide",
      description: "Capturez des pensées éphémères, des idées, des liens et des actions immédiates.",
      contentMarkdown: "## 💡 Pensées éphémères\n\n- \n\n## 📌 Contexte et remarques\n\n\n\n## 🚀 Prochaines actions\n\n- [ ] ",
    },
  ),
  seed(
    { key: "meeting", translationKey: "meeting", tag: "meeting" },
    {
      title: "Meeting Minutes",
      description: "Structured log for agenda, key decisions, and action items with owners.",
      contentMarkdown: "# 📝 Meeting Minutes\n\n- **Time**:\n- **Host/Recorder**:\n- **Attendees**:\n\n---\n\n## 🎯 Goal\n\n- \n\n## 💬 Discussion & Decisions\n\n1. **[Topic 1]**\n   - Points:\n   - ✅ **Decision**:\n\n2. **[Topic 2]**\n   - Points:\n   - ✅ **Decision**:\n\n## 📋 Action Items\n\n- [ ] **[Owner]** Task description (Due: MM-DD)\n- [ ] **[Owner]** Task description (Due: MM-DD)\n",
    },
    {
      title: "Notatka ze spotkania",
      description: "Uporządkowany zapis agendy, kluczowych decyzji i zadań z osobami odpowiedzialnymi.",
      contentMarkdown: "# 📝 Notatka ze spotkania\n\n- **Termin**:\n- **Prowadzący/protokolant**:\n- **Uczestnicy**:\n\n---\n\n## 🎯 Cel\n\n- \n\n## 💬 Dyskusja i decyzje\n\n1. **[Temat 1]**\n   - Najważniejsze punkty:\n   - ✅ **Decyzja**:\n\n2. **[Temat 2]**\n   - Najważniejsze punkty:\n   - ✅ **Decyzja**:\n\n## 📋 Zadania do wykonania\n\n- [ ] **[Osoba odpowiedzialna]** Opis zadania (termin: MM-DD)\n- [ ] **[Osoba odpowiedzialna]** Opis zadania (termin: MM-DD)\n",
    },
    {
      title: "Протокол встречи",
      description: "Структурированная запись повестки, решений и задач с ответственными.",
      contentMarkdown: "# 📝 Протокол встречи\n\n- **Время**:\n- **Ведущий/запись**:\n- **Участники**:\n\n---\n\n## 🎯 Цель\n\n- \n\n## 💬 Обсуждение и решения\n\n1. **[Тема 1]**\n   - Главное:\n   - ✅ **Решение**:\n\n2. **[Тема 2]**\n   - Главное:\n   - ✅ **Решение**:\n\n## 📋 Задачи\n\n- [ ] **[Ответственный]** Описание задачи (срок: ММ-ДД)\n- [ ] **[Ответственный]** Описание задачи (срок: ММ-ДД)\n",
    },
    {
      title: "Acta de reunión",
      description: "Registro estructurado del orden del día, decisiones clave y tareas pendientes con responsables.",
      contentMarkdown: "# 📝 Acta de reunión\n\n- **Hora**:\n- **Organizador/Secretario**:\n- **Asistentes**:\n\n---\n\n## 🎯 Objetivo\n\n- \n\n## 💬 Discusión y decisiones\n\n1. **[Tema 1]**\n   - Puntos clave:\n   - ✅ **Decisión**:\n\n2. **[Tema 2]**\n   - Puntos clave:\n   - ✅ **Decisión**:\n\n## 📋 Tareas pendientes\n\n- [ ] **[Responsable]** Descripción de la tarea (Fecha límite: MM-DD)\n- [ ] **[Responsable]** Descripción de la tarea (Fecha límite: MM-DD)\n",
    },
    {
      title: "Besprechungsprotokoll",
      description: "Strukturierte Erfassung von Tagesordnung, wichtigen Beschlüssen und Aufgaben mit Verantwortlichen.",
      contentMarkdown: "# 📝 Besprechungsprotokoll\n\n- **Uhrzeit**:\n- **Leitung/Protokoll**:\n- **Teilnehmer**:\n\n---\n\n## 🎯 Ziel\n\n- \n\n## 💬 Diskussion & Entscheidungen\n\n1. **[Thema 1]**\n   - Wichtige Punkte:\n   - ✅ **Entscheidung**:\n\n2. **[Thema 2]**\n   - Wichtige Punkte:\n   - ✅ **Entscheidung**:\n\n## 📋 Aufgaben\n\n- [ ] **[Verantwortlich]** Aufgabenbeschreibung (Fällig: MM-DD)\n- [ ] **[Verantwortlich]** Aufgabenbeschreibung (Fällig: MM-DD)\n",
    },
    {
      title: "Compte-rendu de réunion",
      description: "Compte-rendu structuré de l'ordre du jour, des décisions clés et des tâches à accomplir.",
      contentMarkdown: "# 📝 Compte-rendu de réunion\n\n- **Horaire** :\n- **Animateur/Secrétaire** :\n- **Participants** :\n\n---\n\n## 🎯 Objectif\n\n- \n\n## 💬 Échanges et décisions\n\n1. **[Sujet 1]**\n   - Points clés :\n   - ✅ **Décision** :\n\n2. **[Sujet 2]**\n   - Points clés :\n   - ✅ **Décision** :\n\n## 📋 Actions à mener\n\n- [ ] **[Responsable]** Description de la tâche (Échéance : MM-JJ)\n- [ ] **[Responsable]** Description de la tâche (Échéance : MM-JJ)\n",
    },
  ),
  seed(
    { key: "weekly-review", translationKey: "weeklyReview", tag: "weekly-review" },
    {
      title: "Weekly Review & Status",
      description: "Summarize weekly highlights, blockers, and next week\x27s key priorities.",
      contentMarkdown: "# 🗓️ Weekly Status Report\n\n## 🌟 Highlights\n\n- [x] **[Project/Feature]** Accomplishment details\n- [x] **[Project/Feature]** Accomplishment details\n\n## 🚧 Blockers & Risks\n\n- ⚠️ **Blocker**: Reason and required support\n\n## 🎯 Next Week Priorities\n\n- [ ] \n- [ ] \n- [ ] \n\n## 💡 Reflection & Insights\n\n- \n",
    },
    {
      title: "Przegląd tygodnia i postępy",
      description: "Podsumuj najważniejsze osiągnięcia tygodnia, blokery i kluczowe priorytety na kolejny tydzień.",
      contentMarkdown: "# 🗓️ Tygodniowy raport postępów\n\n## 🌟 Najważniejsze osiągnięcia\n\n- [x] **[Projekt/funkcja]** Szczegóły osiągnięcia\n- [x] **[Projekt/funkcja]** Szczegóły osiągnięcia\n\n## 🚧 Blokery i ryzyka\n\n- ⚠️ **Bloker**: Przyczyna i potrzebne wsparcie\n\n## 🎯 Priorytety na kolejny tydzień\n\n- [ ] \n- [ ] \n- [ ] \n\n## 💡 Refleksje i wnioski\n\n- \n",
    },
    {
      title: "Итоги недели",
      description: "Главное за неделю, препятствия и приоритеты на следующую.",
      contentMarkdown: "# 🗓️ Отчёт за неделю\n\n## 🌟 Главное\n\n- [x] **[Проект/функция]** Что сделано\n- [x] **[Проект/функция]** Что сделано\n\n## 🚧 Препятствия и риски\n\n- ⚠️ **Препятствие**: причина и какая помощь нужна\n\n## 🎯 Приоритеты на следующую неделю\n\n- [ ] \n- [ ] \n- [ ] \n\n## 💡 Выводы\n\n- \n",
    },
    {
      title: "Revisión semanal y progreso",
      description: "Resuma los logros semanales, obstáculos y prioridades clave para la próxima semana.",
      contentMarkdown: "# 🗓️ Informe de estado semanal\n\n## 🌟 Logros destacados\n\n- [x] **[Proyecto/Función]** Detalles del logro\n- [x] **[Proyecto/Función]** Detalles del logro\n\n## 🚧 Obstáculos y riesgos\n\n- ⚠️ **Bloqueo**: Causa y apoyo necesario\n\n## 🎯 Prioridades para la próxima semana\n\n- [ ] \n- [ ] \n- [ ] \n\n## 💡 Reflexiones e ideas\n\n- \n",
    },
    {
      title: "Wochenrückblick & Status",
      description: "Fassen Sie wöchentliche Meilensteine, Hindernisse und Prioritäten für die nächste Woche zusammen.",
      contentMarkdown: "# 🗓️ Wöchentlicher Statusbericht\n\n## 🌟 Highlights\n\n- [x] **[Projekt/Feature]** Einzelheiten zum Fortschritt\n- [x] **[Projekt/Feature]** Einzelheiten zum Fortschritt\n\n## 🚧 Hindernisse & Risiken\n\n- ⚠️ **Blocker**: Ursache und benötigte Unterstützung\n\n## 🎯 Prioritäten für nächste Woche\n\n- [ ] \n- [ ] \n- [ ] \n\n## 💡 Reflexion & Erkenntnisse\n\n- \n",
    },
    {
      title: "Revue hebdomadaire et bilan",
      description: "Faites le point sur les réussites de la semaine, les blocages et les priorités clés pour la semaine suivante.",
      contentMarkdown: "# 🗓️ Rapport d'activité hebdomadaire\n\n## 🌟 Points marquants\n\n- [x] **[Projet/Fonctionnalité]** Détails des réalisations\n- [x] **[Projet/Fonctionnalité]** Détails des réalisations\n\n## 🚧 Blocages et risques\n\n- ⚠️ **Blocage** : Cause et assistance requise\n\n## 🎯 Priorités de la semaine prochaine\n\n- [ ] \n- [ ] \n- [ ] \n\n## 💡 Bilan et réflexions\n\n- \n",
    },
  ),
  seed(
    { key: "reading", translationKey: "reading", tag: "reading" },
    {
      title: "Reading Note Card",
      description: "Extract key takeaways, quotes, reflections, and connected concepts.",
      contentMarkdown: "# 📖 Reading Note Card\n\n- **Book/Article**:\n- **Author/Source**:\n- **Rating**: ⭐⭐⭐⭐⭐\n\n---\n\n## 💡 Key Takeaway\n\n> \n\n## ✍️ Highlights & Quotes\n\n> [Quote content]\n> —— *Original Source*\n\n## 🧠 Personal Reflections\n\n- \n\n## 🔗 Action & Practice\n\n- [ ] **Action Plan**:\n",
    },
    {
      title: "Karta lektury",
      description: "Wyodrębnij kluczowe wnioski, cytaty, własne refleksje i powiązane zagadnienia.",
      contentMarkdown: "# 📖 Karta lektury\n\n- **Książka/artykuł**:\n- **Autor/źródło**:\n- **Ocena**: ⭐⭐⭐⭐⭐\n\n---\n\n## 💡 Najważniejszy wniosek\n\n> \n\n## ✍️ Najciekawsze fragmenty i cytaty\n\n> [Treść cytatu]\n> —— *Źródło*\n\n## 🧠 Własne refleksje\n\n- \n\n## 🔗 Działanie i praktyka\n\n- [ ] **Plan działania**:\n",
    },
    {
      title: "Карточка чтения",
      description: "Главные выводы, цитаты, собственные мысли и связанные идеи.",
      contentMarkdown: "# 📖 Карточка чтения\n\n- **Книга/статья**:\n- **Автор/источник**:\n- **Оценка**: ⭐⭐⭐⭐⭐\n\n---\n\n## 💡 Главный вывод\n\n> \n\n## ✍️ Цитаты\n\n> [Текст цитаты]\n> —— *Источник*\n\n## 🧠 Свои мысли\n\n- \n\n## 🔗 Что сделать\n\n- [ ] **План**:\n",
    },
    {
      title: "Ficha de lectura profunda",
      description: "Extraiga conclusiones clave, citas, reflexiones personales y conceptos relacionados.",
      contentMarkdown: "# 📖 Ficha de lectura\n\n- **Libro/Artículo**:\n- **Autor/Fuente**:\n- **Calificación**: ⭐⭐⭐⭐⭐\n\n---\n\n## 💡 Conclusión clave\n\n> \n\n## ✍️ Citas destacadas\n\n> [Cita]\n> —— *Fuente original*\n\n## 🧠 Reflexiones personales\n\n- \n\n## 🔗 Acción y práctica\n\n- [ ] **Plan de acción**:\n",
    },
    {
      title: "Lese-Notizkarte",
      description: "Halten Sie Kernaussagen, Zitate, eigene Gedanken und verknüpfte Ideen fest.",
      contentMarkdown: "# 📖 Lese-Notizkarte\n\n- **Buch/Artikel**:\n- **Autor/Quelle**:\n- **Bewertung**: ⭐⭐⭐⭐⭐\n\n---\n\n## 💡 Kernaussage\n\n> \n\n## ✍️ Zitate & Höhepunkte\n\n> [Zitat]\n> —— *Originalquelle*\n\n## 🧠 Eigene Gedanken\n\n- \n\n## 🔗 Praxis & Umsetzung\n\n- [ ] **Aktionsplan**:\n",
    },
    {
      title: "Fiche de lecture approfondie",
      description: "Extrayez les idées clés, citations, réflexions personnelles et concepts associés.",
      contentMarkdown: "# 📖 Fiche de lecture\n\n- **Livre/Article** :\n- **Auteur/Source** :\n- **Évaluation** : ⭐⭐⭐⭐⭐\n\n---\n\n## 💡 Enseignement clé\n\n> \n\n## ✍️ Extraits et citations clés\n\n> [Extrait de citation]\n> —— *Source originale*\n\n## 🧠 Réflexions personnelles\n\n- \n\n## 🔗 Actions et mise en pratique\n\n- [ ] **Plan d'action** :\n",
    },
  ),
  seed(
    { key: "okr", translationKey: "okr", tag: "okr" },
    {
      title: "Goal & Task Breakdown",
      description: "Define OKRs, Key Results, milestones, and task checklists.",
      contentMarkdown: "# 🎯 Goal Breakdown\n\n- **Period**:\n- **Owner**:\n\n---\n\n## 📌 Objective\n\n> \n\n## 📈 Key Results\n\n- **KR 1**: Target metric -> Current progress\n- **KR 2**: Target metric -> Current progress\n\n## 🗓️ Milestones\n\n- [ ] **Phase 1 (Date)**: Target\n- [ ] **Phase 2 (Date)**: Target\n\n## 📋 Execution Checklist\n\n- [ ] \n- [ ] \n",
    },
    {
      title: "Cele i podział zadań",
      description: "Określ cele OKR, kluczowe rezultaty, kamienie milowe i listy zadań.",
      contentMarkdown: "# 🎯 Podział celu\n\n- **Okres**:\n- **Osoba odpowiedzialna**:\n\n---\n\n## 📌 Cel (Objective)\n\n> \n\n## 📈 Kluczowe rezultaty (Key Results)\n\n- **KR 1**: Docelowy wskaźnik -> Obecny postęp\n- **KR 2**: Docelowy wskaźnik -> Obecny postęp\n\n## 🗓️ Kamienie milowe\n\n- [ ] **Etap 1 (data)**: Cel etapu\n- [ ] **Etap 2 (data)**: Cel etapu\n\n## 📋 Lista zadań do wykonania\n\n- [ ] \n- [ ] \n",
    },
    {
      title: "Цели и разбиение задач",
      description: "Цели OKR, ключевые результаты, вехи и список дел.",
      contentMarkdown: "# 🎯 Разбор цели\n\n- **Период**:\n- **Ответственный**:\n\n---\n\n## 📌 Цель (Objective)\n\n> \n\n## 📈 Ключевые результаты (Key Results)\n\n- **KR 1**: целевой показатель -> текущий прогресс\n- **KR 2**: целевой показатель -> текущий прогресс\n\n## 🗓️ Вехи\n\n- [ ] **Этап 1 (дата)**: результат этапа\n- [ ] **Этап 2 (дата)**: результат этапа\n\n## 📋 Список дел\n\n- [ ] \n- [ ] \n",
    },
    {
      title: "Desglose de objetivos y tareas",
      description: "Defina objetivos OKR, resultados clave, hitos y listas de tareas.",
      contentMarkdown: "# 🎯 Desglose de objetivos\n\n- **Período**:\n- **Responsable**:\n\n---\n\n## 📌 Objetivo (Objective)\n\n> \n\n## 📈 Resultados clave (Key Results)\n\n- **KR 1**: Métrica objetivo -> Progreso actual\n- **KR 2**: Métrica objetivo -> Progreso actual\n\n## 🗓️ Hitos (Milestones)\n\n- [ ] **Fase 1 (Fecha)**: Meta\n- [ ] **Fase 2 (Fecha)**: Meta\n\n## 📋 Lista de tareas\n\n- [ ] \n- [ ] \n",
    },
    {
      title: "Ziele- & Aufgabenaufschlüsselung",
      description: "Definieren Sie OKR-Ziele, Schlüsselergebnisse, Meilensteine und Aufgabenlisten.",
      contentMarkdown: "# 🎯 Zielaufteilung\n\n- **Zeitraum**:\n- **Verantwortlich**:\n\n---\n\n## 📌 Ziel (Objective)\n\n> \n\n## 📈 Schlüsselergebnisse (Key Results)\n\n- **KR 1**: Zielwert -> Aktueller Fortschritt\n- **KR 2**: Zielwert -> Aktueller Fortschritt\n\n## 🗓️ Meilensteine\n\n- [ ] **Phase 1 (Datum)**: Ziel\n- [ ] **Phase 2 (Datum)**: Ziel\n\n## 📋 Aufgabenliste\n\n- [ ] \n- [ ] \n",
    },
    {
      title: "Décomposition des objectifs et tâches",
      description: "Définissez les objectifs OKR, résultats clés, jalons et listes de contrôle.",
      contentMarkdown: "# 🎯 Décomposition des objectifs\n\n- **Période** :\n- **Responsable** :\n\n---\n\n## 📌 Objectif (Objective)\n\n> \n\n## 📈 Résultats clés (Key Results)\n\n- **KR 1** : Indicateur cible -> Progression actuelle\n- **KR 2** : Indicateur cible -> Progression actuelle\n\n## 🗓️ Jalons (Milestones)\n\n- [ ] **Étape 1 (Date)** : Objectif de l'étape\n- [ ] **Étape 2 (Date)** : Objectif de l'étape\n\n## 📋 Liste des tâches\n\n- [ ] \n- [ ] \n",
    },
  ),
];

export const normalizeMemoTemplateSeedLocale = (
  locale: string | null | undefined,
): MemoTemplateSeedLocale => resolveSupportedLocale(locale);

export const localizeMemoTemplateSeed = (
  templateSeed: MemoTemplateSeed,
  locale: string | null | undefined,
): MemoTemplateSeedTranslation => templateSeed.translations[normalizeMemoTemplateSeedLocale(locale)];

export const defaultMemoTemplateId = (workspaceId: string, seedKey: string) =>
  `${workspaceId}_template_${seedKey}`;

export const memoTemplateSeedTranslations = (locale: MemoTemplateSeedLocale) =>
  Object.fromEntries(DEFAULT_MEMO_TEMPLATE_SEEDS.map((item) => [
    item.translationKey,
    item.translations[locale],
  ])) as Record<MemoTemplateSeed["translationKey"], MemoTemplateSeedTranslation>;

type LocalizableMemoTemplate = {
  id: string;
  name: string;
  description: string | null;
  title: string | null;
  contentMarkdown: string;
  tags: readonly string[];
};

const findUntouchedSeedTranslation = (
  template: LocalizableMemoTemplate,
): MemoTemplateSeed | null => {
  const templateSeed = DEFAULT_MEMO_TEMPLATE_SEEDS.find((item) => template.id.endsWith(`_template_${item.key}`));
  if (!templateSeed) return null;
  const seededTags = ["template", templateSeed.tag];
  if (
    template.tags.length !== seededTags.length
    || template.tags.some((tag, index) => tag !== seededTags[index])
  ) return null;
  const untouched = Object.values(templateSeed.translations).some((translation) =>
    template.name === translation.title
    && template.title === translation.title
    && template.description === translation.description
    && template.contentMarkdown === translation.contentMarkdown);
  return untouched ? templateSeed : null;
};

/**
 * Shows a default template in the viewer\x27s UI language while it still equals
 * one of its seeded translations, including its seeded tags. Templates the
 * user created or edited in any field are returned unchanged.
 */
export const localizeDefaultMemoTemplate = <Template extends LocalizableMemoTemplate>(
  template: Template,
  locale: string | null | undefined,
): Template => {
  const templateSeed = findUntouchedSeedTranslation(template);
  if (!templateSeed) return template;
  const localized = localizeMemoTemplateSeed(templateSeed, locale);
  return {
    ...template,
    name: localized.title,
    title: localized.title,
    description: localized.description,
    contentMarkdown: localized.contentMarkdown,
  };
};
