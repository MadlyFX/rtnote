// Text written into web clip notes, one entry per locale.
export type MobileWebClipLocale = "zh-CN" | "zh-TW" | "en-US" | "es" | "de" | "fr" | "ja" | "pl" | "ru";

export const webClipCopy: Record<MobileWebClipLocale, {
  capturedAtLabel: string;
  fallbackTitle: string;
  imageAlt: string;
  separator: string;
  sourceLabel: string;
  unavailableBody: string;
}> = {
  "zh-CN": {
    sourceLabel: "来源",
    capturedAtLabel: "剪藏时间",
    unavailableBody: "正文暂时无法抓取，来源链接已保留，可稍后重试。",
    fallbackTitle: "网页剪藏",
    imageAlt: "图片",
    separator: "：",
  },
  "zh-TW": {
    sourceLabel: "來源",
    capturedAtLabel: "擷取時間",
    unavailableBody: "正文暫時無法擷取，來源連結已保留，可稍後重試。",
    fallbackTitle: "網頁擷取",
    imageAlt: "圖片",
    separator: "：",
  },
  "en-US": {
    sourceLabel: "Source",
    capturedAtLabel: "Captured at",
    unavailableBody: "Could not extract the page text. The source link is kept so you can retry later.",
    fallbackTitle: "Web clip",
    imageAlt: "Image",
    separator: ": ",
  },
  es: {
    sourceLabel: "Fuente",
    capturedAtLabel: "Capturado el",
    unavailableBody: "No se pudo extraer el texto de la página. El enlace de origen se ha guardado para volver a intentarlo más tarde.",
    fallbackTitle: "Recorte web",
    imageAlt: "Imagen",
    separator: ": ",
  },
  de: {
    sourceLabel: "Quelle",
    capturedAtLabel: "Erfasst am",
    unavailableBody: "Der Text der Seite konnte nicht extrahiert werden. Der Quelllink wurde gespeichert, sodass Sie es später erneut versuchen können.",
    fallbackTitle: "Web-Clip",
    imageAlt: "Bild",
    separator: ": ",
  },
  fr: {
    sourceLabel: "Source",
    capturedAtLabel: "Date de capture",
    unavailableBody: "Impossible d'extraire le texte de la page. Le lien source est conservé pour vous permettre de réessayer ultérieurement.",
    fallbackTitle: "Capture web",
    imageAlt: "Image",
    separator: " : ",
  },
  ja: {
    sourceLabel: "出典",
    capturedAtLabel: "取り込み日時",
    unavailableBody: "本文を取り込めませんでした。出典リンクは残してあるので、あとからやり直せます。",
    fallbackTitle: "ウェブクリップ",
    imageAlt: "画像",
    separator: ": ",
  },
  pl: {
    sourceLabel: "Źródło",
    capturedAtLabel: "Zapisano",
    unavailableBody: "Nie udało się wyodrębnić treści strony. Link do źródła został zachowany, więc możesz spróbować ponownie później.",
    fallbackTitle: "Wycinek strony",
    imageAlt: "Obraz",
    separator: ": ",
  },
  ru: {
    sourceLabel: "Источник",
    capturedAtLabel: "Сохранено",
    unavailableBody: "Не удалось извлечь текст страницы. Ссылка на источник сохранена, позже можно повторить.",
    fallbackTitle: "Вырезка страницы",
    imageAlt: "Изображение",
    separator: ": ",
  },
};
