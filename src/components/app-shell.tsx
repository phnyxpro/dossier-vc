import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  BookOpen,
  ShieldCheck,
  Sun,
  X,
} from "@/lib/icons";
import { BrandMark } from "@/components/brand";
import { Button, Spinner } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PushToggle } from "@/components/push-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { to: "/requests/new", labelKey: "nav.newRequest", icon: Plus, exact: false },
  { to: "/documents", labelKey: "nav.documents", icon: FolderOpen, exact: false },
  { to: "/learn", labelKey: "nav.learn", icon: BookOpen, exact: false },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user)
      navigate({ to: "/auth", search: { redirect: window.location.pathname + window.location.search } });
  }, [loading, user, navigate]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur no-print">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              className="text-muted-foreground lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={t("nav.toggle")}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <Link to="/">
              <BrandMark />
            </Link>
          </div>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[180px] truncate text-xs text-muted-foreground sm:block">
              {user.email}
            </span>
            <LanguageSwitcher className="hidden sm:flex" />
            <PushToggle />
            <Button variant="ghost" size="sm" onClick={toggle} aria-label={t("nav.toggleTheme")}>
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth" });
              }}
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">{t("nav.signOut")}</span>
            </Button>
          </div>
        </div>
        {open ? (
          <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <item.icon className="size-4" />
                {t(item.labelKey)}
              </Link>
            ))}
            <LanguageSwitcher className="mt-2 self-start sm:hidden" />
          </nav>
        ) : null}
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-[1400px] px-4 pb-10 sm:px-6 no-print">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          <span>
{t("footer.disclaimer")}
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <FileText className="size-3.5" /> {t("footer.prototype")}
          </span>
        </div>
      </footer>
    </div>
  );
}
