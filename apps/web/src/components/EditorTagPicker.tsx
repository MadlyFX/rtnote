import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Tag, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { normalizeTags, type TagSummary } from "@edgeever/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { parseTagsText } from "@/lib/utils";

type EditorTagPickerProps = {
  disabled: boolean;
  loadTags: () => Promise<{ tags: TagSummary[] }>;
  value: string;
  onChange: (value: string) => void;
};

export const EditorTagPicker = ({ disabled, loadTags, value, onChange }: EditorTagPickerProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedTags = useMemo(() => normalizeTags(parseTagsText(value)), [value]);
  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: loadTags,
    enabled: open,
  });
  const normalizedQuery = query.trim().replace(/^#/, "");
  const visibleTags = (tagsQuery.data?.tags ?? []).filter((tag) =>
    tag.name.toLocaleLowerCase().includes(normalizedQuery.toLocaleLowerCase())
  );
  const exactMatch = (tagsQuery.data?.tags ?? []).some(
    (tag) => tag.name.toLocaleLowerCase() === normalizedQuery.toLocaleLowerCase()
  );

  const commit = (tags: string[]) => onChange(normalizeTags(tags).join(", "));
  const toggleTag = (name: string) => {
    commit(selectedTags.includes(name)
      ? selectedTags.filter((tag) => tag !== name)
      : [...selectedTags, name]);
  };
  const createTag = () => {
    const additions = parseTagsText(normalizedQuery);
    if (additions.length === 0) return;
    commit([...selectedTags, ...additions]);
    setQuery("");
  };
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) return;
    setQuery("");
  };
  return (
    <>
      <div className="edgeever-editor-tag-picker flex min-w-7 max-w-full flex-1 items-center gap-1 overflow-hidden">
        <TooltipProvider delayDuration={0} skipDelayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className="edgeever-editor-tag-trigger flex h-7 min-w-7 flex-1 overflow-hidden max-w-[32rem] items-center gap-1 rounded-md border border-transparent px-1.5 text-left text-xs text-slate-500 outline-none transition hover:border-slate-200 hover:bg-slate-50 focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-400/25 disabled:opacity-50 sm:gap-1.5 sm:px-2"
                aria-label={t("editor.tagPicker.open")}
                onClick={() => setOpen(true)}
              >
                <Tag className="edgeever-editor-metadata-icon h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="edgeever-editor-tag-content flex min-w-0 items-center gap-1 overflow-hidden">
                  {selectedTags.length > 0 ? (
                    <>
                      {selectedTags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="shrink-0 whitespace-nowrap rounded-sm bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600"
                        >
                          #{tag}
                        </span>
                      ))}
                      {selectedTags.length > 3 && (
                        <span className="text-xs font-medium text-slate-400">+{selectedTags.length - 3}</span>
                      )}
                    </>
                  ) : (
                    <span className="min-w-0 truncate text-slate-500">{t("editor.tagPlaceholder")}</span>
                  )}
                </span>
                <ChevronDown className="edgeever-editor-tag-chevron h-3.5 w-3.5 shrink-0 text-slate-400" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[min(24rem,calc(100vw-2rem))] break-words">
              {selectedTags.length > 0
                ? selectedTags.map((tag) => `#${tag}`).join(" · ")
                : t("editor.tagPlaceholder")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[min(42rem,calc(100dvh-2rem))] max-w-lg flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xs font-semibold leading-5">{t("editor.tagPicker.title")}</DialogTitle>
            <DialogDescription className="text-xs leading-5">{t("editor.tagPicker.description")}</DialogDescription>
          </DialogHeader>

          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label={t("editor.tagPicker.selected")}>
              {selectedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="inline-flex h-7 items-center gap-1 rounded-full bg-slate-100 px-2.5 text-xs font-medium text-slate-800 outline-none hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-slate-400/40"
                  onClick={() => toggleTag(tag)}
                  aria-label={t("editor.tagPicker.remove", { name: tag })}
                >
                  #{tag}<X className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}

          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); createTag(); }}>
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("editor.tagPicker.searchPlaceholder")}
              aria-label={t("editor.tagPicker.searchPlaceholder")}
              className="h-9 text-xs focus-visible:border-slate-400 focus-visible:ring-slate-400/25"
            />
            <Button type="submit" variant="outline" size="sm" className="h-9 px-3 text-xs" disabled={!normalizedQuery || exactMatch || selectedTags.length >= 24}>
              {t("editor.tagPicker.create")}
            </Button>
          </form>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-slate-200">
            {tagsQuery.isLoading ? (
              <p className="px-4 py-8 text-center text-xs text-slate-500">{t("editor.tagPicker.loading")}</p>
            ) : visibleTags.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-500">{t("editor.tagPicker.empty")}</p>
            ) : (
              visibleTags.map((tag) => {
                const selected = selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag.name}
                    type="button"
                    className="flex min-h-11 w-full items-center gap-3 border-b border-slate-100 px-3 text-left text-xs outline-none last:border-b-0 hover:bg-slate-50 focus-visible:bg-slate-100"
                    onClick={() => toggleTag(tag.name)}
                    aria-pressed={selected}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? "border-[var(--checkbox-on)] bg-[var(--checkbox-on)] text-[var(--checkbox-mark)]" : "border-slate-300 bg-card text-transparent"}`}>
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">#{tag.name}</span>
                    <span className="text-xs text-slate-400">{t("editor.tagPicker.memoCount", { count: tag.memoCount })}</span>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
