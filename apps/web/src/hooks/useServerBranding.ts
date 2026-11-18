import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { absolutizeBrandingUrls, type BrandingOverview, type ResolvedBranding } from "@edgeever/shared";
import { api, getConfiguredDesktopApiBaseUrl } from "@/lib/api";
import { importLegacyBranding, setAppBranding } from "@/lib/branding";

export const BRANDING_QUERY_KEY = ["branding"] as const;
const PUBLIC_BRANDING_QUERY_KEY = ["branding", "public"] as const;
// Branding rarely changes; refetching on focus after this long carries a change
// made on another device into this one without a rebuild or reload.
const BRANDING_STALE_MS = 5 * 60 * 1000;

/** The workspace overview, importing this browser's pre-Phase-6 branding the first time. */
export const fetchBrandingOverview = async (): Promise<BrandingOverview> => {
  const overview = await api.getBranding();
  const imported = await importLegacyBranding(overview, api).catch(() => null);
  return imported ?? overview;
};

/** Desktop loads the app from its own origin, so asset paths need the server's. */
const forThisOrigin = (branding: ResolvedBranding) => absolutizeBrandingUrls(branding, getConfiguredDesktopApiBaseUrl());

/**
 * Keeps the app shell's branding in step with the server. Signed out, it shows
 * the instance default; signed in, the workspace branding. Failures (an older
 * server, offline desktop) keep the cached branding.
 */
export const useServerBranding = (authenticated: boolean | undefined) => {
  const queryClient = useQueryClient();
  const publicQuery = useQuery({
    queryKey: PUBLIC_BRANDING_QUERY_KEY,
    queryFn: () => api.getPublicBranding(),
    enabled: authenticated === false,
    staleTime: BRANDING_STALE_MS,
    retry: false,
  });
  const workspaceQuery = useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: fetchBrandingOverview,
    enabled: authenticated === true,
    staleTime: BRANDING_STALE_MS,
    retry: false,
  });

  useEffect(() => {
    if (authenticated === false && publicQuery.data) setAppBranding(forThisOrigin(publicQuery.data.branding));
  }, [authenticated, publicQuery.data]);

  useEffect(() => {
    if (authenticated === true && workspaceQuery.data) setAppBranding(forThisOrigin(workspaceQuery.data.effective));
  }, [authenticated, workspaceQuery.data]);

  return {
    overview: workspaceQuery.data,
    refresh: () => queryClient.invalidateQueries({ queryKey: BRANDING_QUERY_KEY }),
  };
};
