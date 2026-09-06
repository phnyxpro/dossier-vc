import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Moon,
  Plus,
  Settings,
  ShieldCheck,
  Sun,
  UserCircle,
  X,
} from "@/lib/icons";
import { BrandMark } from "@/components/brand";
import { Button, Spinner } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth";
import { isKycComplete, useKyc } from "@/lib/kyc";
import { useTheme } from "@/lib/theme";
import { useLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PushToggle } from "@/components/push-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { to: "/requests/new", labelKey: "nav.newRequest", icon: Plus, exact: false },
  { to: "/documents", labelKey: "nav.documents", icon: FolderOpen, exact: false },
];

const ICON_LINKS = [
  { to: "/learn", labelKey: "nav.learn", icon: BookOpen },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

function ProfileMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const name = (user?.user_metadata?.["full_name"] as string) || "";
  const initial = (name || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={t("nav.profile")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex size-8 items-center justify-center rounded-full border border-border text-sm font-semibold transition-colors",
          open ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {initial}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 w-64 rounded-md border border-border bg-surface p-1 shadow-lg">
          <div className="flex items-center gap-3 border-b border-border px-3 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-base font-semibold text-primary">
              {initial}
            </span>
            <div className="min-w-0">
              {name ? <p className="truncate text-sm font-medium text-foreground">{name}</p> : null}
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <Mail className="size-3 shrink-0" />
                {user?.email}
              </p>
            </div>
          </div>
          <div className="py-1">
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              <UserCircle className="size-4" />
              {t("nav.profileSettings")}
            </Link>
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                await signOut();
                navigate({ to: "/auth" });
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              <LogOut className="size-4" />
              {t("nav.signOut")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: kyc, isLoading: kycLoading } = useKyc(user?.id);

  useEffect(() => {
    if (!loading && !user)
      navigate({ to: "/auth", search: { redirect: window.location.pathname + window.location.search } });
  }, [loading, user, navigate]);

  // New accounts finish identity verification before reaching the workspace.
  useEffect(() => {
    if (loading || !user || kycLoading) return;
    if (!isKycComplete(kyc)) navigate({ to: "/onboarding/kyc" });
  }, [loading, user, kyc, kycLoading, navigate]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (loading || !user || kycLoading || !isKycComplete(kyc)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Spinner />
      </div>
    );
  }

  const iconBtn = (active: boolean) =>
    cn(
      "flex size-9 items-center justify-center rounded-md transition-colors",
      active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
    );

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
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            {ICON_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                title={t(item.labelKey)}
                aria-label={t(item.labelKey)}
                className={cn(iconBtn(pathname.startsWith(item.to)), "hidden sm:flex")}
              >
                <item.icon className="size-[18px]" />
              </Link>
            ))}
            <NotificationBell />
            <PushToggle />
            <Button variant="ghost" size="sm" onClick={toggle} aria-label={t("nav.toggleTheme")} title={t("nav.toggleTheme")}>
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <ProfileMenu />
          </div>
        </div>
        {open ? (
          <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 lg:hidden">
            {[...NAV, ...ICON_LINKS].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <item.icon className="size-4" />
                {t(item.labelKey)}
              </Link>
            ))}
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
        </div>
      </footer>
    </div>
  );
}
