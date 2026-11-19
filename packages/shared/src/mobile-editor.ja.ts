import { ATTACHMENT_TEXT_PREFIX } from "./rtnote-legacy-values";
import type { MobileEditorCopy } from "./mobile-editor";

export const MOBILE_EDITOR_COPY_JA: MobileEditorCopy = {
  placeholder: "書き始める...",
  toolbar: "エディタのツールバー",
  actions: {
    undo: "元に戻す",
    redo: "やり直す",
    image: "画像をアップロード",
    voiceMemo: "ボイスメモ",
    bold: "太字",
    bulletList: "箇条書き",
    taskList: "タスクリスト",
    increaseListIndent: "リストの階層を上げる（Tab）",
    decreaseListIndent: "リストの階層を下げる（Shift + Tab）",
    blockquote: "引用",
    horizontalRule: "区切り線",
    format: "書式",
  },
  imageScale: "画像の表示サイズ",
  imageSizes: {
    small: "小",
    medium: "中",
    large: "大",
    full: "幅いっぱい",
  },
  attachmentPrefix: ATTACHMENT_TEXT_PREFIX,
  close: "閉じる",
  codeBlock: {
    mermaidPreview: "Mermaid 図のプレビュー",
    copy: "コードをコピー",
    copied: "コピーしました",
    copyFailed: "コピーできませんでした",
    mermaidSource: "Mermaid ソース",
    codeSource: "コードのソース",
    mermaidEmpty: "下に Mermaid のソースを入力してください。",
    rendering: "図をレンダリング中…",
    renderFailed: "この図をレンダリングできません。構文を確認してください。",
  },
  diagram: {
    mindMap: "マインドマップ",
    architecture: "アーキテクチャ図",
    flowchart: "フローチャート",
  },
  image: {
    loadFailed: "画像を読み込めませんでした",
    uploading: "画像をアップロード中…",
    actions: "画像の操作",
  },
};
