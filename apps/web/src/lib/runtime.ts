export const isNativeDesktopRuntime = () =>
  Boolean(typeof window !== "undefined" && window.rtnoteDesktop?.isAvailable);
