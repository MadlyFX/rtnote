import { useEffect, useState } from "react";
import { NotebookText } from "lucide-react";
import { useAppearanceTheme } from "@/components/ThemeProvider";
import { useBranding } from "@/lib/branding";

export const BrandIdentity = () => {
  const branding = useBranding();
  const dark = useAppearanceTheme().resolvedTheme === "dark";
  const logoUrl = dark ? branding.logoDarkUrl || branding.logoUrl : branding.logoUrl;
  const [failedUrl, setFailedUrl] = useState("");
  useEffect(() => setFailedUrl(""), [logoUrl]);
  if (!branding.isCustom) return null;
  return <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3 text-sm font-semibold">
    {logoUrl && failedUrl !== logoUrl
      ? <img src={logoUrl} referrerPolicy="no-referrer" alt="" className="h-7 w-7 object-contain" onError={() => setFailedUrl(logoUrl)} />
      : <NotebookText className="h-6 w-6" style={{ color: branding.colors[dark ? "dark" : "light"].accent }} />}
    <span className="truncate">{branding.name}</span>
  </div>;
};
