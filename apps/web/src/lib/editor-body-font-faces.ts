import { noteImageAssetUrls } from "@rtnote/shared/note-image-assets";
import { configureBundledFontAssets } from "@rtnote/shared/font-assets-registry";

/** Register default asset locations without downloading fonts for system typography. */
export const installEditorBodyFontFaces = () => {
  if (typeof document === "undefined") return;
  configureBundledFontAssets(noteImageAssetUrls);
};
