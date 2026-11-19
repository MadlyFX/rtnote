import AsyncStorage from "@react-native-async-storage/async-storage";
import { createRTNoteClient } from "@rtnote/client";
import { coerceResolvedBranding, type ResolvedBranding } from "@rtnote/shared/branding";
import { fetch as expoFetch } from "expo/fetch";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { applyMobileBrandingColors } from "./mobile-branding-colors";
import {
  MOBILE_BRANDING_CACHE_KEY,
  parseMobileBrandingCache,
  resolveMobileBrandingLogoUri,
  selectMobileBranding,
  serializeMobileBrandingCache,
  shouldRefreshMobileBranding,
  type MobileBrandingCache,
} from "./mobile-branding-cache";
import { useSession } from "./session";

type MobileBrandingContextValue = {
  branding: ResolvedBranding;
  /** False until the cached branding was read, so startup never flashes the stock brand. */
  isReady: boolean;
  /** Absolute logo URL for the theme, or "" for the built-in icon. */
  logoUri: (theme: "light" | "dark") => string;
};

const MobileBrandingContext = createContext<MobileBrandingContextValue | null>(null);

const writeCache = (cache: MobileBrandingCache) => {
  void AsyncStorage.setItem(MOBILE_BRANDING_CACHE_KEY, serializeMobileBrandingCache(cache)).catch(() => undefined);
};

/**
 * Server branding for the app shell. Shows the cached branding at once, then
 * refreshes on sign-in, sign-out and when the app returns to the foreground.
 * Any failure (offline, older server without the endpoint) keeps what is shown.
 */
export const MobileBrandingProvider = ({ children }: { children: ReactNode }) => {
  const { client, isLoading: sessionLoading, session } = useSession();
  const [cache, setCache] = useState<MobileBrandingCache | null>(null);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const cacheRef = useRef<MobileBrandingCache | null>(null);
  cacheRef.current = cache;
  const lastAttemptRef = useRef(0);
  // Bumped whenever the session identity changes so late responses are dropped.
  const generationRef = useRef(0);

  const sessionBaseUrl = session?.baseUrl ?? null;
  const signedInWithBranding = Boolean(session && client && !session.mfaRebindRequired);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(MOBILE_BRANDING_CACHE_KEY)
      .then((raw) => {
        if (active) setCache(parseMobileBrandingCache(raw));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setCacheLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateCache = useCallback((next: MobileBrandingCache) => {
    cacheRef.current = next;
    setCache(next);
    writeCache(next);
  }, []);

  const refresh = useCallback(async () => {
    const generation = generationRef.current;
    lastAttemptRef.current = Date.now();
    try {
      if (session && client && signedInWithBranding) {
        const overview = await client.getBranding();
        if (generation !== generationRef.current) return;
        updateCache({
          baseUrl: session.baseUrl,
          instance: coerceResolvedBranding(overview.instanceEffective),
          workspace: coerceResolvedBranding(overview.effective),
          fetchedAt: Date.now(),
        });
        return;
      }
      const baseUrl = session?.baseUrl ?? cacheRef.current?.baseUrl;
      if (!baseUrl) return;
      const publicClient = createRTNoteClient({ baseUrl, fetch: expoFetch as typeof fetch });
      const { branding } = await publicClient.getPublicBranding();
      if (generation !== generationRef.current) return;
      updateCache({ baseUrl, instance: coerceResolvedBranding(branding), workspace: null, fetchedAt: Date.now() });
    } catch {
      // Keep the cached or default branding.
    }
  }, [client, session, signedInWithBranding, updateCache]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  // Sign-in, sign-out and server changes: drop the workspace branding of a
  // finished session at once, then ask the server again.
  const sessionKey = `${sessionBaseUrl ?? ""}|${signedInWithBranding ? session?.token ?? "" : ""}`;
  useEffect(() => {
    if (sessionLoading || !cacheLoaded) return;
    generationRef.current += 1;
    const current = cacheRef.current;
    if (!sessionBaseUrl && current?.workspace) {
      updateCache({ ...current, workspace: null });
    }
    void refreshRef.current();
  }, [cacheLoaded, sessionBaseUrl, sessionKey, sessionLoading, updateCache]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && shouldRefreshMobileBranding(lastAttemptRef.current, Date.now())) {
        void refreshRef.current();
      }
    });
    return () => subscription.remove();
  }, []);

  // A refresh that returns the same branding keeps the same object, so nothing re-renders.
  const brandingRef = useRef<{ json: string; branding: ResolvedBranding } | null>(null);
  const branding = useMemo(() => {
    const next = selectMobileBranding(cache, sessionBaseUrl);
    const json = JSON.stringify(next);
    if (brandingRef.current?.json !== json) brandingRef.current = { json, branding: next };
    return brandingRef.current.branding;
  }, [cache, sessionBaseUrl]);

  // Before paint, so restyled screens never show a frame of the old colours.
  useLayoutEffect(() => {
    applyMobileBrandingColors(branding);
  }, [branding]);

  const assetBaseUrl = sessionBaseUrl ?? cache?.baseUrl ?? null;
  const value = useMemo<MobileBrandingContextValue>(() => ({
    branding,
    isReady: cacheLoaded,
    logoUri: (theme) => resolveMobileBrandingLogoUri(branding, assetBaseUrl, theme),
  }), [assetBaseUrl, branding, cacheLoaded]);

  return <MobileBrandingContext.Provider value={value}>{children}</MobileBrandingContext.Provider>;
};

export const useMobileBranding = () => {
  const context = useContext(MobileBrandingContext);
  if (!context) {
    throw new Error("useMobileBranding must be used within MobileBrandingProvider");
  }
  return context;
};
