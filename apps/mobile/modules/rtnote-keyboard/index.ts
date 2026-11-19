import { requireNativeModule } from "expo";

type RTNoteKeyboardNativeModule = {
  show: () => boolean;
};

export const showRTNoteKeyboard = () => {
  requireNativeModule<RTNoteKeyboardNativeModule>("RTNoteKeyboard").show();
};
