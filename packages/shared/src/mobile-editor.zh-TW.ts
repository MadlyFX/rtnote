import { ATTACHMENT_TEXT_PREFIX } from "./rtnote-legacy-values";
import type { MobileEditorCopy } from "./mobile-editor";

export const MOBILE_EDITOR_COPY_ZH_TW: MobileEditorCopy = {
  placeholder: "開始記錄...",
  toolbar: "編輯器工具欄",
  actions: {
    undo: "撤銷",
    redo: "重做",
    image: "上傳圖片",
    voiceMemo: "語音備忘",
    bold: "加粗",
    bulletList: "無序列表",
    taskList: "任務清單",
    increaseListIndent: "增加列表層級（Tab）",
    decreaseListIndent: "減少列表層級（Shift + Tab）",
    blockquote: "引用",
    horizontalRule: "分割線",
    format: "格式",
  },
  imageScale: "圖片顯示尺寸",
  imageSizes: {
    small: "較小",
    medium: "適中",
    large: "較大",
    full: "鋪滿",
  },
  attachmentPrefix: ATTACHMENT_TEXT_PREFIX,
  close: "關閉",
  codeBlock: {
    mermaidPreview: "Mermaid 圖表預覽",
    copy: "複製程式碼",
    copied: "已複製",
    copyFailed: "複製失敗",
    mermaidSource: "Mermaid 原始碼",
    codeSource: "程式碼原始碼",
    mermaidEmpty: "請在下方輸入 Mermaid 原始碼。",
    rendering: "正在渲染圖表…",
    renderFailed: "無法渲染此圖表，請檢查語法。",
  },
  diagram: {
    mindMap: "思維導圖",
    architecture: "架構圖",
    flowchart: "流程圖",
  },
  image: {
    loadFailed: "圖片載入失敗",
    uploading: "圖片上傳中…",
    actions: "圖片操作",
  },
};
