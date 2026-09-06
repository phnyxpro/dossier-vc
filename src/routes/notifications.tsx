import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button, Card, SectionTitle, Spinner, EmptyState, Badge } from "@/components/ui/primitives";
import { Bell, Check, Trash2 } from "@/lib/icons";
import { useLanguage } from "@/lib/i18n";
import { timeAgo } from "@/components/notification-bell";
import {
  clearNotifications,
  getNotificationPrefs,
  listNotifications,
  markNotificationsRead,
  saveNotificationPrefs,
  sendTestNotification,
  type NotificationPrefs,
  type NotificationRow,
} from "@/lib/notify/notify.functions";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "Notifications | DOSSIER by Ventureble" },
      {
        name: "description",
        content:
          "Every update on your financing requests: documents read, dossier drafts, and responses from capital providers.",
      },
      { property: "og:title", content: "Notifications | DOSSIER by Ventureble" },
      {
        property: "og:description",
        content: "Track document reading, dossier drafts and capital provider responses in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-md border border-border px-3 py-3">
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <input
        type="checkbox"
        className="mt-1 size-4 accent-[var(--color-primary)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function NotificationsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, p] = await Promise.all([
        listNotifications({ data: { limit: 100 } }),
        getNotificationPrefs({}),
      ]);
      setItems(list.items);
      setPrefs(p);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("notif.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const savePrefs = async (next: NotificationPrefs) => {
    setPrefs(next);
    try {
      await saveNotificationPrefs({ data: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("notif.saveError"));
      void load();
    }
  };

  const unread = items.filter((n) => !n.read_at).length;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("notif.eyebrow")}</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">{t("notif.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("notif.subtitle")}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <SectionTitle>
                {t("notif.allTitle")}
                {unread > 0 ? (
                  <Badge tone="primary" className="ml-2">
                    {unread}
                  </Badge>
                ) : null}
              </SectionTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={unread === 0}
                  onClick={async () => {
                    await markNotificationsRead({ data: { ids: [], all: true } });
                    void load();
                  }}
                >
                  <Check className="size-3.5" />
                  {t("notif.markAll")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  disabled={items.length === unread}
                  onClick={async () => {
                    await clearNotifications({ data: { id: null } });
                    void load();
                  }}
                >
                  <Trash2 className="size-3.5" />
                  {t("notif.clearRead")}
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : items.length === 0 ? (
              <div className="p-6">
                <EmptyState title={t("notif.emptyTitle")} description={t("notif.emptyBody")} />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li key={n.id} className={!n.read_at ? "bg-secondary/40" : undefined}>
                    <div className="flex items-start gap-3 px-4 py-3">
                      <Bell className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={n.url ?? "/notifications"}
                          className="text-sm font-medium text-foreground hover:underline"
                          onClick={() =>
                            void markNotificationsRead({ data: { ids: [n.id], all: false } })
                          }
                        >
                          {n.title}
                        </Link>
                        {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                        <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                      </div>
                      <button
                        type="button"
                        aria-label={t("notif.remove")}
                        className="rounded p-1 text-muted-foreground hover:text-foreground"
                        onClick={async () => {
                          await clearNotifications({ data: { id: n.id } });
                          setItems((prev) => prev.filter((x) => x.id !== n.id));
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="space-y-3">
            <SectionTitle>{t("notif.prefsTitle")}</SectionTitle>
            <p className="text-xs text-muted-foreground">{t("notif.prefsBody")}</p>
            {prefs ? (
              <div className="space-y-2">
                <Toggle
                  label={t("notif.chInApp")}
                  hint={t("notif.chInAppHint")}
                  checked={prefs.in_app}
                  onChange={(v) => void savePrefs({ ...prefs, in_app: v })}
                />
                <Toggle
                  label={t("notif.chPush")}
                  hint={t("notif.chPushHint")}
                  checked={prefs.push}
                  onChange={(v) => void savePrefs({ ...prefs, push: v })}
                />
                <Toggle
                  label={t("notif.chEmail")}
                  hint={t("notif.chEmailHint")}
                  checked={prefs.email}
                  onChange={(v) => void savePrefs({ ...prefs, email: v })}
                />
              </div>
            ) : (
              <Spinner />
            )}
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await sendTestNotification({
                    data: { title: t("notif.testTitle"), body: t("notif.testBody") },
                  });
                  toast.success(
                    res.push > 0 ? t("notif.testSentPush") : t("notif.testSent"),
                  );
                  void load();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t("notif.testError"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Bell className="size-3.5" />
              {t("notif.sendTest")}
            </Button>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
