import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, BellRing, Check, X } from "@/lib/icons";
import { Button, Spinner } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  listNotifications,
  markNotificationsRead,
  type NotificationRow,
} from "@/lib/notify/notify.functions";
import { cn } from "@/lib/utils";

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await listNotifications({ data: { limit: 30 } });
      setItems(res.items);
      setUnread(res.unread);
    } catch {
      /* keep the last known state */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void load();
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    const timer = window.setInterval(() => void load(), 120_000);
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [user, load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!user) return null;

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnread(0);
    await markNotificationsRead({ data: { ids: [], all: true } }).catch(() => undefined);
    void load();
  };

  const openItem = async (n: NotificationRow) => {
    setOpen(false);
    if (!n.read_at) {
      setUnread((u) => Math.max(0, u - 1));
      await markNotificationsRead({ data: { ids: [n.id], all: false } }).catch(() => undefined);
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
        aria-label={t("notif.title")}
        title={t("notif.title")}
      >
        {unread > 0 ? <BellRing className="size-4 text-primary" /> : <Bell className="size-4" />}
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-semibold">{t("notif.title")}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={markAll}
                disabled={unread === 0}
              >
                <Check className="size-3.5" />
                {t("notif.markAll")}
              </button>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
                aria-label={t("notif.close")}
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-[24rem] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("notif.empty")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li key={n.id}>
                    <Link
                      to={n.url ?? "/notifications"}
                      onClick={() => void openItem(n)}
                      className={cn(
                        "block px-3 py-3 hover:bg-secondary/60",
                        !n.read_at && "bg-secondary/40",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read_at ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" /> : null}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                          {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                          <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border px-3 py-2 text-center">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t("notif.viewAll")}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
