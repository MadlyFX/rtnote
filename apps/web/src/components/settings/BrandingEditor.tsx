import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ImageUp, NotebookText, Plus, X } from "lucide-react";
import {
  BRAND_COLOR_PRESET_IDS,
  BRAND_COLOR_TOKENS,
  BRAND_FONT_IDS,
  BRAND_FOOTER_LINK_LIMIT,
  BRAND_FONTS,
  BRAND_NAME_MAX_LENGTH,
  BRAND_FOOTER_TEXT_MAX_LENGTH,
  brandAssetPath,
  brandForeground,
  BrandingSettingsSchema,
  compactBrandingSettings,
  resolveBrandingSettings,
  type BrandAsset,
  type BrandColorMode,
  type BrandColorPresetId,
  type BrandColorToken,
  type BrandFontId,
  type BrandingSettings,
  type ResolvedBranding,
} from "@edgeever/shared";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const INHERIT = "inherit";
type AssetKey = "logoAssetId" | "logoDarkAssetId" | "faviconAssetId";

export type BrandingEditorProps = {
  /** Saved settings for this level. */
  settings: BrandingSettings;
  /** Levels below this one, lowest first; the preview and placeholders show what they give. */
  baseLayers: BrandingSettings[];
  onSave: (settings: BrandingSettings) => Promise<void>;
  onUpload: (file: File) => Promise<BrandAsset>;
  /** Turns an asset id into a URL this page can load (desktop needs the server origin). */
  assetUrl?: (id: string) => string;
  readOnly?: boolean;
  /** Fonts and footer only affect shared pages; hide them where they would do nothing. */
  showSharedPageOptions?: boolean;
  description?: string;
};

const ColorField = ({ id, label, value, inherited, onChange, onClear, disabled }: {
  id: string;
  label: string;
  value: string | undefined;
  inherited: string;
  onChange: (value: string) => void;
  onClear: () => void;
  disabled?: boolean;
}) => {
  const { t } = useTranslation();
  return <div className="flex items-center gap-2 text-sm">
    <Input id={id} type="color" className="h-8 w-12 shrink-0 cursor-pointer p-1" value={value ?? inherited} disabled={disabled} onChange={event => onChange(event.target.value)} />
    <label htmlFor={id} className="min-w-0 flex-1 truncate">{label}</label>
    {value && !disabled
      ? <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClear}>{t("settings.branding.clearColor", { defaultValue: "Use inherited" })}</Button>
      : <span className="font-mono text-xs text-muted-foreground">{(value ?? inherited).toUpperCase()}</span>}
  </div>;
};

const AssetField = ({ label, url, onUpload, onRemove, busy, disabled }: {
  label: string;
  url: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
  busy: boolean;
  disabled?: boolean;
}) => {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [failed, setFailed] = useState("");
  return <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
      {url && failed !== url
        ? <img src={url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-contain" onError={() => setFailed(url)} />
        : <NotebookText className="h-5 w-5 text-muted-foreground" />}
    </div>
    <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
    <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-hidden accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico" onChange={event => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) onUpload(file);
    }} />
    {!disabled && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
      <ImageUp className="h-4 w-4" />{t("settings.branding.uploadImage", { defaultValue: "Upload" })}
    </Button>}
    {!disabled && url && <Button type="button" variant="ghost" size="sm" onClick={onRemove}>{t("settings.branding.removeLogo", { defaultValue: "Remove" })}</Button>}
  </div>;
};

const BrandingPreview = ({ branding, mode }: { branding: ResolvedBranding; mode: BrandColorMode }) => {
  const scheme = branding.colors[mode];
  const logo = mode === "dark" ? branding.logoDarkUrl : branding.logoUrl;
  return <div className="overflow-hidden rounded-lg border" style={{ backgroundColor: scheme.background, borderColor: scheme.border, color: scheme.text }} aria-hidden>
    <div className="flex h-28">
      <div className="flex w-1/3 flex-col gap-2 p-2" style={{ backgroundColor: scheme.sidebar, borderRight: `1px solid ${scheme.border}` }}>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ fontFamily: BRAND_FONTS[branding.fonts.heading] }}>
          {logo ? <img src={logo} alt="" className="h-4 w-4 object-contain" /> : <NotebookText className="h-4 w-4" style={{ color: scheme.accent }} />}
          <span className="truncate">{branding.name}</span>
        </div>
        <div className="h-1.5 w-3/4 rounded-full opacity-30" style={{ backgroundColor: scheme.text }} />
        <div className="h-1.5 w-1/2 rounded-full opacity-30" style={{ backgroundColor: scheme.text }} />
      </div>
      <div className="m-2 flex flex-1 flex-col gap-1.5 rounded-md p-2" style={{ backgroundColor: scheme.surface, border: `1px solid ${scheme.border}` }}>
        <div className="h-2 w-2/3 rounded-full opacity-60" style={{ backgroundColor: scheme.text }} />
        <div className="h-1.5 w-full rounded-full opacity-25" style={{ backgroundColor: scheme.text }} />
        <div className="h-1.5 w-5/6 rounded-full opacity-25" style={{ backgroundColor: scheme.text }} />
        <span className="mt-auto self-start rounded px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: scheme.accent, color: brandForeground(scheme.accent) }}>{branding.name}</span>
      </div>
    </div>
  </div>;
};

export const BrandingEditor = ({
  settings,
  baseLayers,
  onSave,
  onUpload,
  assetUrl = brandAssetPath,
  readOnly = false,
  showSharedPageOptions = true,
  description,
}: BrandingEditorProps) => {
  const { t } = useTranslation();
  const id = useId();
  const [draft, setDraft] = useState<BrandingSettings>(settings);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<AssetKey | null>(null);
  const [colorsOpen, setColorsOpen] = useState(() => Boolean(settings.colors?.light || settings.colors?.dark));
  const savedJson = JSON.stringify(compactBrandingSettings(settings));
  useEffect(() => { setDraft(JSON.parse(savedJson) as BrandingSettings); }, [savedJson]);

  const inherited = useMemo(() => resolveBrandingSettings(baseLayers, { assetUrl }), [baseLayers, assetUrl]);
  const preview = useMemo(() => resolveBrandingSettings([...baseLayers, draft], { assetUrl }), [baseLayers, draft, assetUrl]);
  const dirty = JSON.stringify(compactBrandingSettings(draft)) !== savedJson;

  const edit = (patch: (current: BrandingSettings) => BrandingSettings) => {
    setDraft(current => patch(current));
    setStatus("idle");
    setError("");
  };
  const setColor = (mode: BrandColorMode, token: BrandColorToken, value: string | undefined) => edit(current => {
    const modeColors = { ...current.colors?.[mode] };
    if (value) modeColors[token] = value; else delete modeColors[token];
    return { ...current, colors: { ...current.colors, [mode]: modeColors } };
  });
  const upload = async (key: AssetKey, file: File) => {
    setUploading(key);
    setError("");
    try {
      const asset = await onUpload(file);
      edit(current => ({ ...current, [key]: asset.id }));
    } catch (uploadError) {
      setError(uploadError instanceof Error && uploadError.message
        ? uploadError.message
        : t("settings.branding.fileError", { defaultValue: "Choose a PNG, JPEG, WebP, SVG or ICO image up to 1 MB." }));
    } finally {
      setUploading(null);
    }
  };
  const save = async (next: BrandingSettings) => {
    // Rows left completely empty are not an error; they are just dropped.
    const footerLinks = next.footer?.links?.filter(link => link.label.trim() || link.url.trim());
    const candidate = next.footer ? { ...next, footer: { ...next.footer, links: footerLinks } } : next;
    const parsed = BrandingSettingsSchema.safeParse(compactBrandingSettings(candidate));
    if (!parsed.success) {
      setError(t("settings.branding.invalid", { defaultValue: "Check the highlighted values: footer links need a label and an https:// address." }));
      return;
    }
    setStatus("saving");
    setError("");
    try {
      await onSave(parsed.data);
      setDraft(parsed.data);
      setStatus("saved");
    } catch (saveError) {
      setStatus("idle");
      setError(saveError instanceof Error && saveError.message
        ? saveError.message
        : t("settings.branding.saveError", { defaultValue: "Could not save branding. Check your connection and try again." }));
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save(draft);
  };

  const assetUrlFor = (key: AssetKey) => draft[key] ? assetUrl(draft[key]!) : "";
  const links = draft.footer?.links ?? [];
  const setLinks = (next: Array<{ label: string; url: string }>) => edit(current => ({ ...current, footer: { ...current.footer, links: next } }));
  const fontLabel = (font: BrandFontId) => t(`settings.branding.fonts.${font}`, { defaultValue: font });

  return <form onSubmit={submit} className="grid gap-5">
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
    {readOnly && <p className="text-xs text-muted-foreground">{t("settings.branding.readOnly", { defaultValue: "Only the workspace owner can change its branding." })}</p>}

    <fieldset className="grid gap-3" disabled={readOnly}>
      <label className="grid gap-1.5 text-sm" htmlFor={`${id}-name`}>
        {t("settings.branding.name", { defaultValue: "App name" })}
        <Input id={`${id}-name`} value={draft.name ?? ""} placeholder={inherited.name} maxLength={BRAND_NAME_MAX_LENGTH}
          onChange={event => edit(current => ({ ...current, name: event.target.value }))} />
      </label>
      <div className="grid gap-2">
        <AssetField label={t("settings.branding.logo", { defaultValue: "Logo" })} url={assetUrlFor("logoAssetId") || inherited.logoUrl} busy={uploading === "logoAssetId"} disabled={readOnly}
          onUpload={file => void upload("logoAssetId", file)} onRemove={() => edit(current => ({ ...current, logoAssetId: null }))} />
        <AssetField label={t("settings.branding.logoDark", { defaultValue: "Logo for dark mode" })} url={assetUrlFor("logoDarkAssetId")} busy={uploading === "logoDarkAssetId"} disabled={readOnly}
          onUpload={file => void upload("logoDarkAssetId", file)} onRemove={() => edit(current => ({ ...current, logoDarkAssetId: null }))} />
        <AssetField label={t("settings.branding.favicon", { defaultValue: "Browser icon" })} url={assetUrlFor("faviconAssetId")} busy={uploading === "faviconAssetId"} disabled={readOnly}
          onUpload={file => void upload("faviconAssetId", file)} onRemove={() => edit(current => ({ ...current, faviconAssetId: null }))} />
        <p className="text-xs text-muted-foreground">{t("settings.branding.imageHint", { defaultValue: "PNG, JPEG, WebP, SVG or ICO, up to 1 MB. The dark-mode logo and browser icon fall back to the logo." })}</p>
      </div>
    </fieldset>

    <fieldset className="grid gap-3" disabled={readOnly}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5 text-sm">
          <span>{t("settings.branding.colorScheme", { defaultValue: "Color scheme" })}</span>
          <Select value={draft.colors?.preset ?? INHERIT} disabled={readOnly} onValueChange={value => edit(current => ({
            ...current,
            colors: { ...current.colors, preset: value === INHERIT ? undefined : value as BrandColorPresetId },
          }))}>
            <SelectTrigger className="h-9" aria-label={t("settings.branding.colorScheme", { defaultValue: "Color scheme" })}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={INHERIT}>{t("settings.branding.presets.inherit", { defaultValue: "Inherited" })}</SelectItem>
              {BRAND_COLOR_PRESET_IDS.map(preset => <SelectItem key={preset} value={preset}>{t(`settings.branding.presets.${preset}`, { defaultValue: preset })}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5 text-sm">
          <span>{t("settings.branding.color", { defaultValue: "Accent color" })}</span>
          <ColorField id={`${id}-accent`} label={t("settings.branding.tokens.accent", { defaultValue: "Accent" })} value={draft.accent}
            inherited={preview.colors.light.accent} disabled={readOnly}
            onChange={value => edit(current => ({ ...current, accent: value }))}
            onClear={() => edit(current => ({ ...current, accent: undefined }))} />
        </div>
      </div>
      <Collapsible open={colorsOpen} onOpenChange={setColorsOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="-ml-2 gap-1">
            <ChevronDown className={`h-4 w-4 transition-transform ${colorsOpen ? "" : "-rotate-90"}`} />
            {t("settings.branding.customizeColors", { defaultValue: "Customize colors" })}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="grid gap-4 pt-2 sm:grid-cols-2">
          {(["light", "dark"] as const).map(mode => <div key={mode} className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">{t(`settings.branding.${mode}`, { defaultValue: mode === "light" ? "Light mode" : "Dark mode" })}</div>
            {BRAND_COLOR_TOKENS.map(token => <ColorField key={token} id={`${id}-${mode}-${token}`}
              label={t(`settings.branding.tokens.${token}`, { defaultValue: token })}
              value={draft.colors?.[mode]?.[token]}
              inherited={resolveBrandingSettings([...baseLayers, { ...draft, colors: { ...draft.colors, [mode]: { ...draft.colors?.[mode], [token]: undefined } } }], { assetUrl }).colors[mode][token]}
              disabled={readOnly}
              onChange={value => setColor(mode, token, value)}
              onClear={() => setColor(mode, token, undefined)} />)}
          </div>)}
        </CollapsibleContent>
      </Collapsible>
      <div className="grid gap-2 sm:grid-cols-2">
        <BrandingPreview branding={preview} mode="light" />
        <BrandingPreview branding={preview} mode="dark" />
      </div>
    </fieldset>

    {showSharedPageOptions && <fieldset className="grid gap-3" disabled={readOnly}>
      <div className="text-sm font-medium">{t("settings.branding.sharePages", { defaultValue: "Shared pages" })}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["heading", "body"] as const).map(role => <div key={role} className="grid gap-1.5 text-sm">
          <span>{role === "heading" ? t("settings.branding.headingFont", { defaultValue: "Heading font" }) : t("settings.branding.bodyFont", { defaultValue: "Body font" })}</span>
          <Select value={draft.fonts?.[role] ?? INHERIT} disabled={readOnly} onValueChange={value => edit(current => ({
            ...current,
            fonts: { ...current.fonts, [role]: value === INHERIT ? undefined : value as BrandFontId },
          }))}>
            <SelectTrigger className="h-9" aria-label={role === "heading" ? t("settings.branding.headingFont", { defaultValue: "Heading font" }) : t("settings.branding.bodyFont", { defaultValue: "Body font" })}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={INHERIT}>{t("settings.branding.fonts.inherit", { defaultValue: "Inherited" })}</SelectItem>
              {BRAND_FONT_IDS.map(font => <SelectItem key={font} value={font}><span style={{ fontFamily: BRAND_FONTS[font] }}>{fontLabel(font)}</span></SelectItem>)}
            </SelectContent>
          </Select>
        </div>)}
      </div>
      <label className="grid gap-1.5 text-sm" htmlFor={`${id}-footer`}>
        {t("settings.branding.footerText", { defaultValue: "Footer text" })}
        <Textarea id={`${id}-footer`} rows={2} maxLength={BRAND_FOOTER_TEXT_MAX_LENGTH} value={draft.footer?.text ?? ""} placeholder={inherited.footer.text}
          onChange={event => edit(current => ({ ...current, footer: { ...current.footer, text: event.target.value } }))} />
      </label>
      <div className="grid gap-2 text-sm">
        <span>{t("settings.branding.footerLinks", { defaultValue: "Footer links" })}</span>
        {links.map((link, index) => <div key={index} className="flex gap-2">
          <Input aria-label={t("settings.branding.linkLabel", { defaultValue: "Link text" })} placeholder={t("settings.branding.linkLabel", { defaultValue: "Link text" })} className="w-1/3" maxLength={60}
            value={link.label} onChange={event => setLinks(links.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} />
          <Input aria-label={t("settings.branding.linkUrl", { defaultValue: "Address" })} placeholder="https://example.com" type="url" className="flex-1"
            value={link.url} onChange={event => setLinks(links.map((item, i) => i === index ? { ...item, url: event.target.value } : item))} />
          {!readOnly && <Button type="button" variant="ghost" size="icon" aria-label={t("settings.branding.removeLink", { defaultValue: "Remove link" })}
            onClick={() => setLinks(links.filter((_, i) => i !== index))}><X className="h-4 w-4" /></Button>}
        </div>)}
        {!readOnly && links.length < BRAND_FOOTER_LINK_LIMIT && <Button type="button" variant="outline" size="sm" className="justify-self-start"
          onClick={() => setLinks([...links, { label: "", url: "" }])}><Plus className="h-4 w-4" />{t("settings.branding.addLink", { defaultValue: "Add link" })}</Button>}
      </div>
    </fieldset>}

    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {status === "saved" && !dirty && <p role="status" className="text-sm text-muted-foreground">{t("settings.branding.saved", { defaultValue: "Branding saved." })}</p>}
    {!readOnly && <div className="flex gap-2">
      <Button type="submit" size="sm" disabled={!dirty || status === "saving" || uploading !== null}>{t("common.save")}</Button>
      <Button type="button" variant="outline" size="sm" disabled={status === "saving" || (!Object.keys(compactBrandingSettings(settings)).length && !dirty)}
        onClick={() => void save({})}>{t("settings.branding.reset", { defaultValue: "Reset branding" })}</Button>
    </div>}
  </form>;
};
