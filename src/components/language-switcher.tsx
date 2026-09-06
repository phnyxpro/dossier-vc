import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "@/lib/icons";
import { LOCALES, useLanguage, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const active = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <div
      ref={ref}
      className={cn("group relative", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={t("nav.language")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        <Globe className="size-3.5" aria-hidden />
        {active.label}
        <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 min-w-[9rem] rounded-md border border-border bg-surface p-1 shadow-lg">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLocale(l.code as Locale);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-sm transition-colors",
                l.code === locale
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <span>{l.name}</span>
              {l.code === locale ? <Check className="size-3.5 text-primary" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
