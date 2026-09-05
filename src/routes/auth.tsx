import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { BrandMark } from "@/components/brand";
import { Button, Card, Field, Input, Spinner } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Dossier by Ventureble" },
      {
        name: "description",
        content:
          "Sign in to Dossier by Ventureble to prepare a capital-readiness and lender-ready financing dossier for your Caribbean business.",
      },
      { property: "og:title", content: "Sign in — Dossier by Ventureble" },
      {
        property: "og:description",
        content: "Access your capital-readiness workspace and lender packs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (signUpError) throw signUpError;
        setNotice(t("auth.created"));
        setMode("signin");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        navigate({ to: "/" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.generalError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(result.error.message ?? t("auth.googleUnavailable"));
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-border bg-surface p-12 lg:flex">
        <BrandMark />
        <div className="max-w-md">
          <h1 className="font-display text-3xl font-semibold leading-tight">
            {t("auth.heroTitle")}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
{t("auth.heroBody")}
          </p>
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            {[t("auth.point1"), t("auth.point2"), t("auth.point3")].map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("auth.heroFoot")}
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="flex items-center justify-between gap-2">
            <div className="lg:hidden">
              <BrandMark />
            </div>
            <LanguageSwitcher className="ml-auto" />
          </div>
          <h2 className="mt-6 font-display text-xl font-semibold lg:mt-0">
            {mode === "signin" ? t("auth.signIn") : t("auth.createAccountTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? t("auth.signInSub")
              : t("auth.signUpSub")}
          </p>

          <Button variant="outline" className="mt-6 w-full" onClick={handleGoogle} disabled={busy}>
            {t("auth.google")}
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("auth.orEmail")}
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" ? (
              <Field label={t("auth.fullName")} htmlFor="fullName">
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Anisa Mohammed"
                  required
                />
              </Field>
            ) : null}
            <Field label={t("auth.email")} htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.tt"
                required
              />
            </Field>
            <Field label={t("auth.password")} htmlFor="password">
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </Field>

            {error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            ) : null}
            {notice ? (
              <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{notice}</p>
            ) : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Spinner /> : mode === "signin" ? t("auth.signIn") : t("auth.createAccount")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
            <button
              className="font-medium text-primary hover:underline"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
            >
              {mode === "signin" ? t("auth.createOne") : t("auth.signIn")}
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
}
