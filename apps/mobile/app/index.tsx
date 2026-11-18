import * as SplashScreen from "expo-splash-screen";
import { useIncomingShare } from "expo-sharing";
import { useIsRestoring } from "@tanstack/react-query";
import { lazy, Suspense, useCallback, useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text } from "../src/components/LocalizedText";
import { LoginScreen } from "../src/screens/LoginScreen";
import { MfaRebindScreen } from "../src/screens/MfaRebindScreen";
import { clearAndRefreshIncomingShare } from "../src/lib/incoming-share-lifecycle";
import { useSession } from "../src/lib/session";
import { markStartup } from "../src/lib/startup-performance";
import { useMobileBranding } from "../src/lib/mobile-branding";
import { resolveMobileThemeColor, resolveMobileThemeStyles, useMobileTheme } from "../src/lib/mobile-theme";
import { BrandLogo } from "../src/components/BrandLogo";

const WorkspaceScreen = lazy(() =>
  import("../src/screens/WorkspaceScreen").then((module) => ({ default: module.WorkspaceScreen }))
);

export default function IndexScreen() {
  const { isLoading: isSessionLoading, session } = useSession();
  const { isReady: isBrandingReady } = useMobileBranding();
  // Wait for the cached branding too, so the first screen already shows it.
  const isLoading = isSessionLoading || !isBrandingReady;
  const isRestoringCache = useIsRestoring();
  const {
    clearSharedPayloads,
    error: incomingShareError,
    isResolving: isResolvingIncomingShare,
    resolvedSharedPayloads,
    refreshSharePayloads,
    sharedPayloads,
  } = useIncomingShare();
  const incomingSharePayloads = resolvedSharedPayloads.length > 0
    ? resolvedSharedPayloads
    : sharedPayloads;
  const isWaitingForBinaryShareResolution = !incomingShareError
    && resolvedSharedPayloads.length === 0
    && sharedPayloads.some((payload) => payload.shareType !== "text" && payload.shareType !== "url");
  const handleIncomingShareHandled = useCallback(() => {
    void clearAndRefreshIncomingShare(clearSharedPayloads, refreshSharePayloads);
  }, [clearSharedPayloads, refreshSharePayloads]);

  useEffect(() => {
    if (!isLoading && !isRestoringCache) {
      markStartup("index-ready");
      void SplashScreen.hideAsync();
    }
  }, [isLoading, isRestoringCache]);

  if (isLoading || isRestoringCache) {
    return <StartupPlaceholder />;
  }

  // A recovery-code session may only rebind TOTP; business APIs answer 403.
  if (session?.mfaRebindRequired) {
    return <MfaRebindScreen />;
  }

  return session ? (
    <Suspense fallback={<StartupPlaceholder showBrand />}>
      <WorkspaceScreen
        incomingShareError={incomingShareError}
        incomingShareIsResolving={isResolvingIncomingShare || isWaitingForBinaryShareResolution}
        incomingSharePayloads={incomingSharePayloads}
        onIncomingShareHandled={handleIncomingShareHandled}
      />
    </Suspense>
  ) : (
    <LoginScreen />
  );
}

const StartupPlaceholder = ({ showBrand = false }: { showBrand?: boolean }) => {
  const { resolvedTheme } = useMobileTheme();
  const { branding, logoUri } = useMobileBranding();
  const themedStyles = resolveMobileThemeStyles(styles, resolvedTheme);
  const brandLogoUri = showBrand ? logoUri(resolvedTheme) : "";
  return (
    <View style={themedStyles.loading}>
      {brandLogoUri ? <BrandLogo fallback={null} size={56} uri={brandLogoUri} /> : null}
      {showBrand ? <Text style={themedStyles.brand}>{branding.name}</Text> : null}
      {/* Resolved as light: the stock spinner keeps this green in dark mode too; only branding recolours it. */}
      <ActivityIndicator color={resolveMobileThemeColor("#15803d", "light")} />
    </View>
  );
};

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: "#f7faf7",
    flex: 1,
    gap: 16,
    justifyContent: "center",
  },
  brand: {
    color: "#17211a",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
});
