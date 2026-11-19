import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { absolutizeBrandingUrls, brandAssetPath, type BrandingOverview, type BrandingSettings } from "@rtnote/shared";
import { Button } from "@/components/ui/button";
import { api, getConfiguredDesktopApiBaseUrl } from "@/lib/api";
import { setAppBranding } from "@/lib/branding";
import { BRANDING_QUERY_KEY, fetchBrandingOverview } from "@/hooks/useServerBranding";
import { BrandingEditor } from "./BrandingEditor";

type Level = "workspace" | "instance";

/** Asset URL that also works in the desktop app, which is not served from the server's origin. */
export const useBrandAssetUrl = () => useCallback((id: string) => {
  const base = getConfiguredDesktopApiBaseUrl();
  return base ? `${base.replace(/\/+$/, "")}${brandAssetPath(id)}` : brandAssetPath(id);
}, []);

export const BrandingPreferences = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const assetUrl = useBrandAssetUrl();
  const [level, setLevel] = useState<Level>("workspace");
  const overviewQuery = useQuery({ queryKey: BRANDING_QUERY_KEY, queryFn: fetchBrandingOverview, retry: false });
  const overview = overviewQuery.data;

  const applyOverview = (next: BrandingOverview) => {
    queryClient.setQueryData(BRANDING_QUERY_KEY, next);
    setAppBranding(absolutizeBrandingUrls(next.effective, getConfiguredDesktopApiBaseUrl()));
  };

  const saveWorkspace = async (settings: BrandingSettings) => applyOverview(await api.updateWorkspaceBranding(settings));
  const saveInstance = async (settings: BrandingSettings) => applyOverview(await api.updateInstanceBranding(settings));

  return <section className="grid gap-4 px-4 py-4">
    <div>
      <h3 className="text-sm font-medium">{t("settings.branding.title", { defaultValue: "Branding" })}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t("settings.branding.description", { defaultValue: "Your name, logo and colors appear in the app on every device and on the notes and notebooks you share." })}</p>
    </div>
    {overviewQuery.isLoading && <p role="status" className="text-sm text-muted-foreground">{t("settings.branding.loading", { defaultValue: "Loading…" })}</p>}
    {overviewQuery.isError && <p role="alert" className="text-sm text-destructive">{t("settings.branding.loadError", { defaultValue: "Branding could not be loaded from the server." })}</p>}
    {overview && <>
      {overview.permissions.instance && <div className="flex gap-1" role="tablist" aria-label={t("settings.branding.title", { defaultValue: "Branding" })}>
        {(["workspace", "instance"] as const).map(option => <Button key={option} type="button" role="tab" aria-selected={level === option}
          size="sm" variant={level === option ? "soft" : "ghost"} onClick={() => setLevel(option)}>
          {option === "workspace"
            ? t("settings.branding.workspaceTab", { defaultValue: "This workspace" })
            : t("settings.branding.instanceTab", { defaultValue: "Instance default" })}
        </Button>)}
      </div>}
      {level === "workspace" || !overview.permissions.instance
        ? <BrandingEditor key="workspace" settings={overview.workspace} baseLayers={[overview.instance]} assetUrl={assetUrl}
          readOnly={!overview.permissions.workspace} onSave={saveWorkspace} onUpload={file => api.uploadBrandingAsset(file, "workspace").then(result => result.asset)} />
        : <BrandingEditor key="instance" settings={overview.instance} baseLayers={[]} assetUrl={assetUrl}
          description={t("settings.branding.instanceDescription", { defaultValue: "Shown on the sign-in page and in workspaces that have no branding of their own." })}
          onSave={saveInstance} onUpload={file => api.uploadBrandingAsset(file, "instance").then(result => result.asset)} />}
    </>}
  </section>;
};
