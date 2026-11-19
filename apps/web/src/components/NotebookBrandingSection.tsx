import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { BrandingSettings } from "@rtnote/shared";
import { api, getConfiguredDesktopApiBaseUrl } from "@/lib/api";
import { BRANDING_QUERY_KEY, fetchBrandingOverview } from "@/hooks/useServerBranding";
import { BrandingEditor } from "./settings/BrandingEditor";
import { useBrandAssetUrl } from "./settings/BrandingPreferences";

const notebookBrandingQueryKey = (notebookId: string) => ["notebook-branding", getConfiguredDesktopApiBaseUrl(), notebookId] as const;

/** Branding for one published notebook, layered over the workspace's. */
export const NotebookBrandingSection = ({ notebookId }: { notebookId: string }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const assetUrl = useBrandAssetUrl();
  const overview = useQuery({ queryKey: BRANDING_QUERY_KEY, queryFn: fetchBrandingOverview, retry: false });
  const notebook = useQuery({ queryKey: notebookBrandingQueryKey(notebookId), queryFn: () => api.getNotebookBranding(notebookId), retry: false });

  const save = async (settings: BrandingSettings) => {
    const next = await api.updateNotebookBranding(notebookId, settings);
    queryClient.setQueryData(notebookBrandingQueryKey(notebookId), next);
    // The list of notebooks with their own branding feeds the note share dialog.
    void queryClient.invalidateQueries({ queryKey: BRANDING_QUERY_KEY });
  };

  return <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
    <div>
      <h2 className="font-semibold">{t("settings.branding.notebookTitle", { defaultValue: "Site branding" })}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("settings.branding.notebookDescription", { defaultValue: "Overrides the workspace branding on this notebook's published site, and on shared notes that choose it." })}</p>
    </div>
    {(overview.isError || notebook.isError) && <p role="alert" className="text-sm text-destructive">{t("settings.branding.loadError", { defaultValue: "Branding could not be loaded from the server." })}</p>}
    {overview.data && notebook.data && <BrandingEditor
      settings={notebook.data.settings}
      baseLayers={[overview.data.instance, overview.data.workspace]}
      assetUrl={assetUrl}
      onSave={save}
      onUpload={file => api.uploadBrandingAsset(file, "workspace").then(result => result.asset)} />}
  </section>;
};
