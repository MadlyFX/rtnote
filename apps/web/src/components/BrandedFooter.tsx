import { useTranslation } from "react-i18next";
import { withBrandName, type ResolvedBranding } from "@edgeever/shared/branding";

/** Footer for public pages: the owner's footer text and links, else "Published with <name>". */
export const BrandedFooter = ({ branding }: { branding: ResolvedBranding }) => {
  const { t } = useTranslation();
  const linkClassName = "rounded-sm underline-offset-2 transition-colors hover:text-slate-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400";
  return <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
    <span>{branding.footer.text || withBrandName(t("sharing.publishedWith"), branding.name)}</span>
    {branding.footer.links.map((link) => <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noopener noreferrer" className={linkClassName}>{link.label}</a>)}
  </span>;
};
