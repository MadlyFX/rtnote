import type { MemoTemplateSeedTranslation } from "./memo-template-seeds";

export const MEMO_TEMPLATE_SEED_JA: Record<string, MemoTemplateSeedTranslation> = {
  "quick-note": {
    title: "ひらめきメモ",
    description: "ふとした思いつき、アイデア、リンク、すぐやることをすばやく書き留めます。",
    contentMarkdown: "## 💡 ひらめき\n\n- \n\n## 📌 背景と補足\n\n\n\n## 🚀 次のアクション\n\n- [ ] ",
  },
  "meeting": {
    title: "会議メモ",
    description: "議題の背景、主な決定、担当者つきのToDoを構造化して記録します。",
    contentMarkdown: "# 📝 会議メモ\n\n- **日時**：\n- **司会/記録**：\n- **参加者**：\n\n---\n\n## 🎯 会議の目的\n\n- \n\n## 💬 議論と決定\n\n1. **[議題 1]**\n   - ポイント：\n   - ✅ **決定**：\n\n2. **[議題 2]**\n   - ポイント：\n   - ✅ **決定**：\n\n## 📋 アクションアイテム\n\n- [ ] **[担当者]** タスク内容（期限：MM-DD）\n- [ ] **[担当者]** タスク内容（期限：MM-DD）\n",
  },
  "weekly-review": {
    title: "週次レビュー",
    description: "今週の成果、ブロッカー、来週の優先事項を整理します。",
    contentMarkdown: "# 🗓️ 週次レポート\n\n## 🌟 今週のハイライト\n\n- [x] **[プロジェクト/機能]** 成果の説明\n- [x] **[プロジェクト/機能]** 成果の説明\n\n## 🚧 ブロッカーとリスク\n\n- ⚠️ **ブロッカー**：原因と必要なサポート\n\n## 🎯 来週の優先事項\n\n- [ ] \n- [ ] \n- [ ] \n\n## 💡 振り返り\n\n- \n",
  },
  "reading": {
    title: "読書カード",
    description: "要点、引用、自分の理解、関連する知識をまとめます。",
    contentMarkdown: "# 📖 読書カード\n\n- **書籍/記事**：\n- **著者/出典**：\n- **評価**：⭐⭐⭐⭐⭐\n\n---\n\n## 💡 一言まとめ\n\n> \n\n## ✍️ 要点と引用\n\n> [引用]\n> —— *出典*\n\n## 🧠 自分の理解と考察\n\n- \n\n## 🔗 関連知識とアクション\n\n- [ ] **実践**：\n",
  },
  "okr": {
    title: "目標とタスク分解",
    description: "OKR の目標、主要な結果、マイルストーン、実行チェックリストを定義します。",
    contentMarkdown: "# 🎯 目標の分解\n\n- **期間**：\n- **担当者**：\n\n---\n\n## 📌 目標 (Objective)\n\n> \n\n## 📈 主要な結果 (Key Results)\n\n- **KR 1**：目標指標 -> 現在の進捗\n- **KR 2**：目標指標 -> 現在の進捗\n\n## 🗓️ マイルストーン\n\n- [ ] **フェーズ 1（日付）**：達成目標\n- [ ] **フェーズ 2（日付）**：達成目標\n\n## 📋 実行チェックリスト\n\n- [ ] \n- [ ] \n",
  },
};
