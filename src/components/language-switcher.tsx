import { Globe } from "lucide-react";
import { LOCALES, useLanguage, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-md border border-border bg-background/60 px-1 py-0.5",
        className,
      )}
      role="group"
      aria-label={t("nav.language")}
    >
      <Globe className="mr-0.5 size-3.5 text-muted-foreground" aria-hidden />
      {LOCALES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLocale(l.code as Locale)}
          aria-current={l.code === locale}
          title={l.name}
          className={cn(
            "rounded px-1.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider transition-colors",
            l.code === locale
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
