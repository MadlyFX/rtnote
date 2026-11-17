import type { MemoTemplateSeedTranslation } from "./memo-template-seeds";

export const MEMO_TEMPLATE_GALLERY_JA: Record<string, MemoTemplateSeedTranslation> = {
  "daily-journal": {
    title: "デイリージャーナル",
    description: "その日の優先事項を決め、出来事を記録し、一日を振り返ります。",
    contentMarkdown: "## 🎯 今日の3つの重点\n\n1. \n2. \n3. \n\n## 📅 今日の記録\n\n- \n\n## 🙏 感謝していること\n\n- \n\n## 🌙 振り返り\n\n- うまくいったこと：\n- 改善したいこと：\n- 明日やること：\n",
  },
  "retrospective": {
    title: "振り返り",
    description: "一定期間を振り返り、良かった点・課題・具体的な改善策をまとめます。",
    contentMarkdown: "# 🔁 振り返り\n\n- **期間**：\n- **参加者**：\n\n## ✅ 良かったこと\n\n- \n\n## ⚠️ 課題\n\n- \n\n## 💡 試してみたいこと\n\n- \n\n## 📋 改善アクション\n\n- [ ] **[担当者]** アクション (期限：MM-DD)\n",
  },
  "one-on-one": {
    title: "1on1ミーティング",
    description: "1on1 の話題、相互フィードバック、合意事項、フォローアップを記録します。",
    contentMarkdown: "# 🤝 1on1ミーティング\n\n- **日時**：\n- **相手**：\n\n## 🗂️ 話題\n\n- \n\n## 💬 フィードバック\n\n- 伝えたこと：\n- 受け取ったこと：\n\n## ✅ 合意事項\n\n- \n\n## 📋 フォローアップ\n\n- [ ] \n",
  },
  "project-plan": {
    title: "プロジェクト計画",
    description: "プロジェクトの目標、範囲、マイルストーン、リスク、関係者を整理します。",
    contentMarkdown: "# 🗺️ プロジェクト計画\n\n- **責任者**：\n- **開始 / 期限**：\n\n## 🎯 目標\n\n- \n\n## 📦 範囲\n\n- 対象：\n- 対象外：\n\n## 🏁 マイルストーン\n\n- [ ] マイルストーン 1 (MM-DD)\n- [ ] マイルストーン 2 (MM-DD)\n\n## ⚠️ リスクと対策\n\n- \n\n## 👥 関係者\n\n- \n",
  },
  "cornell-notes": {
    title: "コーネル式ノート",
    description: "学んだ内容をキーワード・ノート・まとめの3つに整理します。",
    contentMarkdown: "# 🎓 コーネル式ノート\n\n- **テーマ**：\n- **出典**：\n\n## ❓ キーワードと問い\n\n- \n\n## 📝 ノート\n\n- \n\n## 🧾 まとめ\n\n\n",
  },
  "bug-report": {
    title: "不具合報告",
    description: "再現手順、期待結果と実際の結果、環境、補足情報を記録します。",
    contentMarkdown: "# 🐞 不具合報告\n\n## 📄 概要\n\n\n\n## 🔁 再現手順\n\n1. \n2. \n3. \n\n## ✅ 期待される結果\n\n\n\n## ❌ 実際の結果\n\n\n\n## 🖥️ 環境\n\n- バージョン：\n- OS / ブラウザ：\n\n## 📎 補足情報\n\n- \n",
  },
  "decision-record": {
    title: "意思決定記録",
    description: "背景、検討した選択肢、決定内容とその影響を記録します。",
    contentMarkdown: "# ⚖️ 意思決定記録\n\n- **日付**：\n- **ステータス**：提案 / 採用 / 廃止\n- **決定者**：\n\n## 🧭 背景\n\n\n\n## 🔀 検討した選択肢\n\n1. **案 A**：\n   - 長所：\n   - 短所：\n2. **案 B**：\n   - 長所：\n   - 短所：\n\n## ✅ 決定\n\n\n\n## 📈 影響\n\n- \n",
  },
  "travel-checklist": {
    title: "旅行チェックリスト",
    description: "旅程、予約情報、持ち物リスト、出発前のやることをまとめます。",
    contentMarkdown: "# ✈️ 旅行チェックリスト\n\n- **行き先**：\n- **日程**：\n\n## 🗓️ 旅程\n\n- 1 日目：\n- 2 日目：\n\n## 🎫 予約情報\n\n- 交通：\n- 宿泊：\n\n## 🧳 持ち物リスト\n\n- [ ] 身分証明書\n- [ ] 充電器\n- [ ] 衣類\n- [ ] 洗面用具\n- [ ] 常備薬\n\n## ✅ 出発前のやること\n\n- [ ] \n",
  },
};
