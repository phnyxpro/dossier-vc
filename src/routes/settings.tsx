import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  SectionTitle,
  Select,
  Spinner,
} from "@/components/ui/primitives";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PasswordMeter } from "@/components/password-meter";
import { Check, DeviceMobile, Moon, ShieldCheck, Sun, Trash2, UserCircle } from "@/lib/icons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useLanguage } from "@/lib/i18n";
import { checkPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { COUNTRIES, CURRENCIES, INDUSTRY_GROUPS } from "@/lib/dossier/constants";
import {
  deleteAccount,
  getAccount,
  removeDevice,
  saveBusinessProfile,
  saveProfile,
  type BusinessProfile,
} from "@/lib/account/account.functions";
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notify/notify.functions";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Profile & settings | DOSSIER by Ventureble" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Manage your Dossier profile, business details, language, alerts, password and connected devices.",
      },
      { property: "og:title", content: "Profile & settings | DOSSIER by Ventureble" },
      {
        property: "og:description",
        content: "Your profile, business details, alerts, security and devices in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const EMPTY_COMPANY: BusinessProfile = {
  id: null,
  name: "",
  country: "Trinidad and Tobago",
  industry: "",
  years_in_operation: null,
  annual_revenue: null,
  currency: "TTD",
};

function numOrNull(v: string): number | null {
  const n = Number(v.replace(/[, ]/g, ""));
  return v.trim() === "" || !Number.isFinite(n) ? null : n;
}

function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [providers, setProviders] = useState<string[]>([]);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [company, setCompany] = useState<BusinessProfile>(EMPTY_COMPANY);
  const [acceptances, setAcceptances] = useState<
    { document_key: string; version: string; accepted_at: string }[]
  >([]);
  const [devices, setDevices] = useState<
    { id: string; device_label: string | null; created_at: string }[]
  >([]);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [account, p] = await Promise.all([getAccount({}), getNotificationPrefs({})]);
      setFullName(account.profile.fullName);
      setEmail(account.profile.email || user?.email || "");
      setProviders(account.profile.providers);
      setMemberSince(account.profile.createdAt);
      setCompany(account.company ?? EMPTY_COMPANY);
      setAcceptances(account.acceptances as typeof acceptances);
      setDevices(account.devices as typeof devices);
      setPrefs(p);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load your settings.");
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    void load();
  }, [load]);

  const savePrefs = async (next: NotificationPrefs) => {
    setPrefs(next);
    try {
      await saveNotificationPrefs({ data: next });
    } catch {
      toast.error("Could not save your alert settings.");
      void load();
    }
  };

  const pwCheck = checkPassword(password);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {t("nav.settings") === "nav.settings" ? "Account" : t("nav.settings")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Profile &amp; settings</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Your details, business profile, alerts, appearance, security and devices.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              {/* Profile */}
              <Card className="p-5">
                <SectionTitle>Your profile</SectionTitle>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" htmlFor="fullName">
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                    />
                  </Field>
                  <Field label="Email" hint="Used to sign in and receive alerts." htmlFor="email">
                    <Input id="email" value={email} readOnly disabled />
                  </Field>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    disabled={savingProfile}
                    onClick={async () => {
                      setSavingProfile(true);
                      try {
                        await saveProfile({ data: { fullName } });
                        toast.success("Profile saved.");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Could not save.");
                      } finally {
                        setSavingProfile(false);
                      }
                    }}
                  >
                    <Check className="size-4" /> Save profile
                  </Button>
                  {memberSince ? (
                    <span className="text-xs text-muted-foreground">
                      Member since {new Date(memberSince).toLocaleDateString()}
                    </span>
                  ) : null}
                  {providers.map((p) => (
                    <Badge key={p} tone="default">
                      {p}
                    </Badge>
                  ))}
                </div>
              </Card>

              {/* Business profile */}
              <Card className="p-5">
                <SectionTitle>Business profile</SectionTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  These details pre-fill every new financing request.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Business name" htmlFor="bizName">
                    <Input
                      id="bizName"
                      value={company.name}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                    />
                  </Field>
                  <Field label="Country" htmlFor="country">
                    <Select
                      id="country"
                      value={company.country}
                      onChange={(e) => setCompany({ ...company, country: e.target.value })}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Industry" htmlFor="industry">
                    <Select
                      id="industry"
                      value={company.industry ?? ""}
                      onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                    >
                      <option value="">Select an industry</option>
                      {INDUSTRY_GROUPS.map((g) => (
                        <optgroup key={g.group} label={g.group}>
                          {g.items.map((i) => (
                            <option key={i} value={i}>
                              {i}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Years in operation" htmlFor="years">
                    <Input
                      id="years"
                      inputMode="decimal"
                      value={company.years_in_operation ?? ""}
                      onChange={(e) =>
                        setCompany({ ...company, years_in_operation: numOrNull(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Annual revenue" htmlFor="revenue">
                    <Input
                      id="revenue"
                      inputMode="decimal"
                      value={company.annual_revenue ?? ""}
                      onChange={(e) =>
                        setCompany({ ...company, annual_revenue: numOrNull(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Reporting currency" htmlFor="currency">
                    <Select
                      id="currency"
                      value={company.currency}
                      onChange={(e) => setCompany({ ...company, currency: e.target.value })}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="mt-4">
                  <Button
                    type="button"
                    disabled={savingCompany || !company.name.trim()}
                    onClick={async () => {
                      setSavingCompany(true);
                      try {
                        const res = await saveBusinessProfile({ data: company });
                        setCompany({ ...company, id: res.id });
                        toast.success("Business profile saved.");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Could not save.");
                      } finally {
                        setSavingCompany(false);
                      }
                    }}
                  >
                    <Check className="size-4" /> Save business profile
                  </Button>
                </div>
              </Card>

              {/* Security */}
              <Card className="p-5">
                <SectionTitle>Security</SectionTitle>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="New password"
                    hint={`At least ${MIN_PASSWORD_LENGTH} characters, mixing letters, numbers and symbols.`}
                    htmlFor="newPassword"
                  >
                    <Input
                      id="newPassword"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Field>
                  <Field label="Confirm new password" htmlFor="confirmPassword">
                    <Input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </Field>
                </div>
                {password ? (
                  <div className="mt-3">
                    <PasswordMeter password={password} />
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    disabled={savingPassword || !pwCheck.ok || password !== confirm}
                    onClick={async () => {
                      setSavingPassword(true);
                      try {
                        const { error } = await supabase.auth.updateUser({ password });
                        if (error) throw new Error(error.message);
                        await supabase.auth.signOut({ scope: "others" });
                        setPassword("");
                        setConfirm("");
                        toast.success("Password updated. Other devices were signed out.");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Could not update password.");
                      } finally {
                        setSavingPassword(false);
                      }
                    }}
                  >
                    <ShieldCheck className="size-4" /> Update password
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={async () => {
                      await supabase.auth.signOut({ scope: "others" });
                      toast.success("Signed out everywhere else.");
                    }}
                  >
                    Sign out other devices
                  </Button>
                </div>

                {acceptances.length ? (
                  <div className="mt-6 border-t border-border pt-4">
                    <p className="text-sm font-medium text-foreground">Agreements accepted</p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {acceptances.map((a) => (
                        <li key={`${a.document_key}-${a.accepted_at}`}>
                          {a.document_key} v{a.version} —{" "}
                          {new Date(a.accepted_at).toLocaleDateString()}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Card>

              {/* Danger zone */}
              <Card className="border-danger/40 p-5">
                <SectionTitle>Delete account</SectionTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  This permanently removes your requests, documents, figures and dossiers. It cannot be
                  undone. Type DELETE to confirm.
                </p>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <Field label="Confirm" htmlFor="deleteConfirm">
                    <Input
                      id="deleteConfirm"
                      value={deleteText}
                      onChange={(e) => setDeleteText(e.target.value.toUpperCase())}
                      placeholder="DELETE"
                    />
                  </Field>
                  <Button
                    variant="outline"
                    type="button"
                    className="border-danger text-danger"
                    disabled={deleting || deleteText !== "DELETE"}
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        await deleteAccount({ data: { confirm: "DELETE" } });
                        await signOut();
                        window.location.href = "/auth";
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Could not delete account.");
                        setDeleting(false);
                      }
                    }}
                  >
                    <Trash2 className="size-4" /> Delete my account
                  </Button>
                </div>
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <Card className="p-5">
                <SectionTitle>Appearance &amp; language</SectionTitle>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-3">
                    <span className="text-sm text-foreground">Theme</span>
                    <Button variant="outline" size="sm" type="button" onClick={toggle}>
                      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                      {theme === "dark" ? "Light" : "Dark"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-3">
                    <span className="text-sm text-foreground">Language</span>
                    <LanguageSwitcher />
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <SectionTitle
                  action={
                    <Link to="/notifications" className="text-xs text-primary hover:underline">
                      Open centre
                    </Link>
                  }
                >
                  Alerts
                </SectionTitle>
                <div className="mt-4 space-y-3">
                  {(
                    [
                      ["in_app", "In the app", "Bell updates while you work."],
                      ["push", "On this phone", "Push alerts when the app is closed."],
                      ["email", "By email", "Needs a verified sending address."],
                    ] as const
                  ).map(([key, label, hint]) => (
                    <label
                      key={key}
                      className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-3"
                    >
                      <span>
                        <span className="block text-sm font-medium text-foreground">{label}</span>
                        <span className="block text-xs text-muted-foreground">{hint}</span>
                      </span>
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-[var(--color-primary)]"
                        checked={prefs ? prefs[key] : false}
                        disabled={!prefs}
                        onChange={(e) =>
                          prefs && void savePrefs({ ...prefs, [key]: e.target.checked })
                        }
                      />
                    </label>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <SectionTitle>Devices receiving alerts</SectionTitle>
                {devices.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No devices yet. Turn on alerts with the bell button in the top bar.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {devices.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                      >
                        <DeviceMobile className="size-4 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                          {d.device_label || "Unnamed device"}
                        </span>
                        <button
                          type="button"
                          aria-label="Remove device"
                          className="rounded p-1 text-muted-foreground hover:text-foreground"
                          onClick={async () => {
                            await removeDevice({ data: { id: d.id } });
                            setDevices((prev) => prev.filter((x) => x.id !== d.id));
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-5">
                <SectionTitle>Account</SectionTitle>
                <div className="mt-3 flex items-center gap-3">
                  <UserCircle className="size-8 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {fullName || "Your account"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{email}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="mt-4"
                  onClick={() => void signOut()}
                >
                  Sign out
                </Button>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
