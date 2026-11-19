import { ATTACHMENT_TEXT_PREFIX } from "./rtnote-legacy-values";
import type { MobileEditorCopy } from "./mobile-editor";

export const MOBILE_EDITOR_COPY_ZH_CN: MobileEditorCopy = {
  placeholder: "开始记录...",
  toolbar: "编辑器工具栏",
  actions: {
    undo: "撤销",
    redo: "重做",
    image: "上传图片",
    voiceMemo: "语音备忘",
    bold: "加粗",
    bulletList: "无序列表",
    taskList: "任务清单",
    increaseListIndent: "增加列表层级（Tab）",
    decreaseListIndent: "减少列表层级（Shift + Tab）",
    blockquote: "引用",
    horizontalRule: "分割线",
    format: "格式",
  },
  imageScale: "图片显示尺寸",
  imageSizes: {
    small: "较小",
    medium: "适中",
    large: "较大",
    full: "铺满",
  },
  attachmentPrefix: ATTACHMENT_TEXT_PREFIX,
  close: "关闭",
  codeBlock: {
    mermaidPreview: "Mermaid 图表预览",
    copy: "复制代码",
    copied: "已复制",
    copyFailed: "复制失败",
    mermaidSource: "Mermaid 源码",
    codeSource: "代码源码",
    mermaidEmpty: "请在下方输入 Mermaid 源码。",
    rendering: "正在渲染图表…",
    renderFailed: "无法渲染此图表，请检查语法。",
  },
  diagram: {
    mindMap: "思维导图",
    architecture: "架构图",
    flowchart: "流程图",
  },
  image: {
    loadFailed: "图片加载失败",
    uploading: "图片上传中…",
    actions: "图片操作",
  },
};
