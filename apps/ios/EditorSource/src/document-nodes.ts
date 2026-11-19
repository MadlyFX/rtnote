import { ImageGallery, MergeDivider } from "@rtnote/shared";
import { createNativeImageGalleryView } from "@rtnote/shared/native-image-gallery";

export { ImageGallery, MergeDivider };

/** Same schema as shared `ImageGallery`; only the native node view differs. */
export const createIosImageGallery = (getLocale: () => string) =>
  ImageGallery.extend({
    addNodeView() {
      return createNativeImageGalleryView(getLocale);
    },
  });
