import {
  normalizeMemoTemplateSeedLocale,
  type MemoTemplateSeedLocale,
  type MemoTemplateSeedTranslation,
} from "./memo-template-seeds";
import { MEMO_TEMPLATE_GALLERY_JA } from "./memo-template-gallery.ja";
import { MEMO_TEMPLATE_GALLERY_ZH_CN } from "./memo-template-gallery.zh-CN";

/**
 * Optional templates a user can add to their own templates. Unlike the default
 * seeds they are never provisioned into a workspace, so the gallery can grow
 * without changing what new or existing workspaces contain.
 */
export type MemoTemplateGalleryItem = {
  key: string;
  tag: string;
  translations: Record<MemoTemplateSeedLocale, MemoTemplateSeedTranslation>;
};

export type MemoTemplateGalleryEntry = {
  key: string;
  name: string;
  description: string;
  title: string;
  contentMarkdown: string;
  tags: string[];
};

const translationFor = (
  translations: Record<string, MemoTemplateSeedTranslation>,
  key: string,
): MemoTemplateSeedTranslation => {
  const translation = translations[key];
  if (!translation) throw new Error(`Missing template gallery translation: ${key}`);
  return translation;
};

// Chinese and Japanese translations live in the locale files next to this one.
const item = (
  key: string,
  enUS: MemoTemplateSeedTranslation,
  pl: MemoTemplateSeedTranslation,
  ru: MemoTemplateSeedTranslation,
  es?: MemoTemplateSeedTranslation,
  de?: MemoTemplateSeedTranslation,
  fr?: MemoTemplateSeedTranslation,
): MemoTemplateGalleryItem => {
  const zhCN = translationFor(MEMO_TEMPLATE_GALLERY_ZH_CN, key);
  const ja = translationFor(MEMO_TEMPLATE_GALLERY_JA, key);
  return {
    key,
    tag: key,
    translations: {
      "zh-CN": zhCN,
      "zh-TW": zhCN,
      "en-US": enUS,
      es: es ?? enUS,
      de: de ?? enUS,
      fr: fr ?? enUS,
      ja,
      pl,
      ru,
    },
  };
};

export const MEMO_TEMPLATE_GALLERY: readonly MemoTemplateGalleryItem[] = [
  item(
    "daily-journal",
    {
      title: "Daily Journal",
      description: "Plan the day's priorities, log what happened, and reflect in the evening.",
      contentMarkdown: "## 🎯 Top 3 for Today\n\n1. \n2. \n3. \n\n## 📅 Log\n\n- \n\n## 🙏 Grateful For\n\n- \n\n## 🌙 Reflection\n\n- What went well:\n- What to improve:\n- Tomorrow:\n",
    },
    {
      title: "Dziennik dnia",
      description: "Zaplanuj priorytety dnia, zapisz, co się wydarzyło, i podsumuj dzień wieczorem.",
      contentMarkdown: "## 🎯 Trzy priorytety na dziś\n\n1. \n2. \n3. \n\n## 📅 Przebieg dnia\n\n- \n\n## 🙏 Wdzięczność\n\n- \n\n## 🌙 Refleksja\n\n- Co poszło dobrze:\n- Co poprawić:\n- Na jutro:\n",
    },
    {
      title: "Ежедневный дневник",
      description: "Определите приоритеты дня, запишите, что произошло, и подведите итоги вечером.",
      contentMarkdown: "## 🎯 Три главных дела на сегодня\n\n1. \n2. \n3. \n\n## 📅 Записи за день\n\n- \n\n## 🙏 Благодарность\n\n- \n\n## 🌙 Итоги дня\n\n- Что получилось:\n- Что улучшить:\n- На завтра:\n",
    },
  ),
  item(
    "retrospective",
    {
      title: "Retrospective",
      description: "Look back on a period: what went well, what didn't, and concrete improvements.",
      contentMarkdown: "# 🔁 Retrospective\n\n- **Period**:\n- **Participants**:\n\n## ✅ What Went Well\n\n- \n\n## ⚠️ What Didn't Go Well\n\n- \n\n## 💡 Ideas to Try\n\n- \n\n## 📋 Action Items\n\n- [ ] **[Owner]** Action (Due: MM-DD)\n",
    },
    {
      title: "Retrospektywa",
      description: "Podsumuj okres pracy: co poszło dobrze, co nie i jakie konkretne usprawnienia wprowadzić.",
      contentMarkdown: "# 🔁 Retrospektywa\n\n- **Okres**:\n- **Uczestnicy**:\n\n## ✅ Co poszło dobrze\n\n- \n\n## ⚠️ Co nie zadziałało\n\n- \n\n## 💡 Co warto wypróbować\n\n- \n\n## 📋 Działania\n\n- [ ] **[Osoba odpowiedzialna]** Działanie (Termin: DD.MM)\n",
    },
    {
      title: "Ретроспектива",
      description: "Оглянитесь на период: что получилось, что нет и какие конкретные улучшения внести.",
      contentMarkdown: "# 🔁 Ретроспектива\n\n- **Период**:\n- **Участники**:\n\n## ✅ Что получилось\n\n- \n\n## ⚠️ Что не получилось\n\n- \n\n## 💡 Что попробовать\n\n- \n\n## 📋 Действия\n\n- [ ] **[Ответственный]** Действие (Срок: ММ-ДД)\n",
    },
  ),
  item(
    "one-on-one",
    {
      title: "1:1 Meeting",
      description: "Track 1:1 topics, feedback both ways, agreements, and follow-ups.",
      contentMarkdown: "# 🤝 1:1 Meeting\n\n- **Date**:\n- **With**:\n\n## 🗂️ Topics\n\n- \n\n## 💬 Feedback\n\n- Given:\n- Received:\n\n## ✅ Agreements\n\n- \n\n## 📋 Follow-ups\n\n- [ ] \n",
    },
    {
      title: "Rozmowa 1:1",
      description: "Zapisuj tematy rozmowy 1:1, wzajemny feedback, ustalenia i dalsze kroki.",
      contentMarkdown: "# 🤝 Rozmowa 1:1\n\n- **Data**:\n- **Z kim**:\n\n## 🗂️ Tematy\n\n- \n\n## 💬 Feedback\n\n- Przekazany:\n- Otrzymany:\n\n## ✅ Ustalenia\n\n- \n\n## 📋 Dalsze kroki\n\n- [ ] \n",
    },
    {
      title: "Встреча 1:1",
      description: "Темы встречи 1:1, взаимная обратная связь, договорённости и следующие шаги.",
      contentMarkdown: "# 🤝 Встреча 1:1\n\n- **Дата**:\n- **С кем**:\n\n## 🗂️ Темы\n\n- \n\n## 💬 Обратная связь\n\n- Дал(а):\n- Получил(а):\n\n## ✅ Договорённости\n\n- \n\n## 📋 Следующие шаги\n\n- [ ] \n",
    },
  ),
  item(
    "project-plan",
    {
      title: "Project Plan",
      description: "Define the project's goals, scope, milestones, risks, and stakeholders.",
      contentMarkdown: "# 🗺️ Project Plan\n\n- **Owner**:\n- **Start / Due**:\n\n## 🎯 Goals\n\n- \n\n## 📦 Scope\n\n- In scope:\n- Out of scope:\n\n## 🏁 Milestones\n\n- [ ] Milestone 1 (MM-DD)\n- [ ] Milestone 2 (MM-DD)\n\n## ⚠️ Risks & Mitigations\n\n- \n\n## 👥 Stakeholders\n\n- \n",
    },
    {
      title: "Plan projektu",
      description: "Określ cele projektu, zakres, kamienie milowe, ryzyka i interesariuszy.",
      contentMarkdown: "# 🗺️ Plan projektu\n\n- **Właściciel**:\n- **Start / termin**:\n\n## 🎯 Cele\n\n- \n\n## 📦 Zakres\n\n- W zakresie:\n- Poza zakresem:\n\n## 🏁 Kamienie milowe\n\n- [ ] Kamień milowy 1 (DD.MM)\n- [ ] Kamień milowy 2 (DD.MM)\n\n## ⚠️ Ryzyka i sposoby ograniczenia\n\n- \n\n## 👥 Interesariusze\n\n- \n",
    },
    {
      title: "План проекта",
      description: "Опишите цели проекта, его рамки, вехи, риски и заинтересованных лиц.",
      contentMarkdown: "# 🗺️ План проекта\n\n- **Ответственный**:\n- **Начало / Срок**:\n\n## 🎯 Цели\n\n- \n\n## 📦 Рамки\n\n- Входит:\n- Не входит:\n\n## 🏁 Вехи\n\n- [ ] Веха 1 (ММ-ДД)\n- [ ] Веха 2 (ММ-ДД)\n\n## ⚠️ Риски и меры\n\n- \n\n## 👥 Заинтересованные лица\n\n- \n",
    },
  ),
  item(
    "cornell-notes",
    {
      title: "Cornell Notes",
      description: "Organize what you learn into cue questions, notes, and a summary.",
      contentMarkdown: "# 🎓 Cornell Notes\n\n- **Topic**:\n- **Source**:\n\n## ❓ Cues & Questions\n\n- \n\n## 📝 Notes\n\n- \n\n## 🧾 Summary\n\n\n",
    },
    {
      title: "Notatka Cornella",
      description: "Porządkuj naukę w trzech częściach: pytania kluczowe, notatki i podsumowanie.",
      contentMarkdown: "# 🎓 Notatka Cornella\n\n- **Temat**:\n- **Źródło**:\n\n## ❓ Pytania kluczowe\n\n- \n\n## 📝 Notatki\n\n- \n\n## 🧾 Podsumowanie\n\n\n",
    },
    {
      title: "Корнелльские заметки",
      description: "Разложите изученное на ключевые вопросы, заметки и краткий итог.",
      contentMarkdown: "# 🎓 Корнелльские заметки\n\n- **Тема**:\n- **Источник**:\n\n## ❓ Ключевые вопросы\n\n- \n\n## 📝 Заметки\n\n- \n\n## 🧾 Итог\n\n\n",
    },
  ),
  item(
    "bug-report",
    {
      title: "Bug Report",
      description: "Capture reproduction steps, expected vs. actual results, environment, and extra context.",
      contentMarkdown: "# 🐞 Bug Report\n\n## 📄 Summary\n\n\n\n## 🔁 Steps to Reproduce\n\n1. \n2. \n3. \n\n## ✅ Expected Result\n\n\n\n## ❌ Actual Result\n\n\n\n## 🖥️ Environment\n\n- Version:\n- OS / Browser:\n\n## 📎 Additional Context\n\n- \n",
    },
    {
      title: "Raport błędu",
      description: "Zapisz kroki odtworzenia, oczekiwany i faktyczny wynik, środowisko oraz dodatkowy kontekst.",
      contentMarkdown: "# 🐞 Raport błędu\n\n## 📄 Opis\n\n\n\n## 🔁 Kroki odtworzenia\n\n1. \n2. \n3. \n\n## ✅ Oczekiwany wynik\n\n\n\n## ❌ Faktyczny wynik\n\n\n\n## 🖥️ Środowisko\n\n- Wersja:\n- System / przeglądarka:\n\n## 📎 Dodatkowy kontekst\n\n- \n",
    },
    {
      title: "Отчёт об ошибке",
      description: "Зафиксируйте шаги воспроизведения, ожидаемый и фактический результат, окружение и контекст.",
      contentMarkdown: "# 🐞 Отчёт об ошибке\n\n## 📄 Кратко\n\n\n\n## 🔁 Шаги воспроизведения\n\n1. \n2. \n3. \n\n## ✅ Ожидаемый результат\n\n\n\n## ❌ Фактический результат\n\n\n\n## 🖥️ Окружение\n\n- Версия:\n- ОС / браузер:\n\n## 📎 Дополнительно\n\n- \n",
    },
  ),
  item(
    "decision-record",
    {
      title: "Decision Record",
      description: "Document the context, options considered, the decision, and its consequences.",
      contentMarkdown: "# ⚖️ Decision Record\n\n- **Date**:\n- **Status**: Proposed / Accepted / Superseded\n- **Decided by**:\n\n## 🧭 Context\n\n\n\n## 🔀 Options Considered\n\n1. **Option A**:\n   - Pros:\n   - Cons:\n2. **Option B**:\n   - Pros:\n   - Cons:\n\n## ✅ Decision\n\n\n\n## 📈 Consequences\n\n- \n",
    },
    {
      title: "Rejestr decyzji",
      description: "Opisz kontekst, rozważane opcje, podjętą decyzję i jej konsekwencje.",
      contentMarkdown: "# ⚖️ Rejestr decyzji\n\n- **Data**:\n- **Status**: Proponowana / Przyjęta / Zastąpiona\n- **Decyzja podjęta przez**:\n\n## 🧭 Kontekst\n\n\n\n## 🔀 Rozważane opcje\n\n1. **Opcja A**:\n   - Zalety:\n   - Wady:\n2. **Opcja B**:\n   - Zalety:\n   - Wady:\n\n## ✅ Decyzja\n\n\n\n## 📈 Konsekwencje\n\n- \n",
    },
    {
      title: "Запись решения",
      description: "Задокументируйте контекст, рассмотренные варианты, принятое решение и его последствия.",
      contentMarkdown: "# ⚖️ Запись решения\n\n- **Дата**:\n- **Статус**: Предложено / Принято / Заменено\n- **Кто решил**:\n\n## 🧭 Контекст\n\n\n\n## 🔀 Рассмотренные варианты\n\n1. **Вариант A**:\n   - Плюсы:\n   - Минусы:\n2. **Вариант B**:\n   - Плюсы:\n   - Минусы:\n\n## ✅ Решение\n\n\n\n## 📈 Последствия\n\n- \n",
    },
  ),
  item(
    "travel-checklist",
    {
      title: "Travel Checklist",
      description: "Keep the itinerary, bookings, packing list, and pre-departure to-dos in one place.",
      contentMarkdown: "# ✈️ Travel Checklist\n\n- **Destination**:\n- **Dates**:\n\n## 🗓️ Itinerary\n\n- Day 1:\n- Day 2:\n\n## 🎫 Bookings\n\n- Transport:\n- Accommodation:\n\n## 🧳 Packing List\n\n- [ ] Documents\n- [ ] Chargers\n- [ ] Clothes\n- [ ] Toiletries\n- [ ] Medication\n\n## ✅ Before Leaving\n\n- [ ] \n",
    },
    {
      title: "Lista podróży",
      description: "Zbierz w jednym miejscu plan podróży, rezerwacje, listę pakowania i sprawy do załatwienia przed wyjazdem.",
      contentMarkdown: "# ✈️ Lista podróży\n\n- **Cel podróży**:\n- **Termin**:\n\n## 🗓️ Plan\n\n- Dzień 1:\n- Dzień 2:\n\n## 🎫 Rezerwacje\n\n- Transport:\n- Nocleg:\n\n## 🧳 Lista pakowania\n\n- [ ] Dokumenty\n- [ ] Ładowarki\n- [ ] Ubrania\n- [ ] Kosmetyki\n- [ ] Leki\n\n## ✅ Przed wyjazdem\n\n- [ ] \n",
    },
    {
      title: "Чек-лист поездки",
      description: "Маршрут, бронирования, список вещей и дела перед отъездом в одном месте.",
      contentMarkdown: "# ✈️ Чек-лист поездки\n\n- **Куда**:\n- **Даты**:\n\n## 🗓️ Маршрут\n\n- День 1:\n- День 2:\n\n## 🎫 Бронирования\n\n- Транспорт:\n- Жильё:\n\n## 🧳 Список вещей\n\n- [ ] Документы\n- [ ] Зарядки\n- [ ] Одежда\n- [ ] Средства гигиены\n- [ ] Лекарства\n\n## ✅ Перед отъездом\n\n- [ ] \n",
    },
  ),
];

export const localizeMemoTemplateGalleryItem = (
  galleryItem: MemoTemplateGalleryItem,
  locale: string | null | undefined,
): MemoTemplateGalleryEntry => {
  const translation = galleryItem.translations[normalizeMemoTemplateSeedLocale(locale)];
  return {
    key: galleryItem.key,
    name: translation.title,
    description: translation.description,
    title: translation.title,
    contentMarkdown: translation.contentMarkdown,
    tags: ["template", galleryItem.tag],
  };
};

export const listMemoTemplateGallery = (locale: string | null | undefined): MemoTemplateGalleryEntry[] =>
  MEMO_TEMPLATE_GALLERY.map((galleryItem) => localizeMemoTemplateGalleryItem(galleryItem, locale));
