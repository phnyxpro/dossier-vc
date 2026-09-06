import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { BrandMark } from "@/components/brand";
import { Button, Card, Field, Input, Spinner } from "@/components/ui/primitives";
import { PasswordMeter } from "@/components/password-meter";
import { PasswordInput } from "@/components/password-input";
import { SocialButtons } from "@/components/social-buttons";
import { TrustFooter } from "@/components/trust-footer";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { checkPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { queueAcceptance } from "@/lib/legal/acceptance";

type Search = { redirect?: string };

type Mode = "signin" | "signup" | "forgot" | "magic";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const value = typeof search["redirect"] === "string" ? (search["redirect"] as string) : undefined;
    // Only ever return to a same-origin path.
    return value && value.startsWith("/") && !value.startsWith("//") ? { redirect: value } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — Dossier by Ventureble" },
      { name: "robots", content: "noindex" },
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
  const search = Route.useSearch();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>("signin");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const destination = search.redirect ?? "/";
  const strength = checkPassword(password);

  useEffect(() => {
    if (!loading && user && !mfaFactorId) navigate({ to: destination });
  }, [loading, user, navigate, destination, mfaFactorId]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setMfaFactorId(null);
    setMfaCode("");
  }

  /** Returns true when a second step is required (and shows the code form). */
  async function requireSecondStep(): Promise<boolean> {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.nextLevel !== "aal2" || data.currentLevel === "aal2") return false;
    const { data: factorData } = await supabase.auth.mfa.listFactors();
    const factor = (factorData?.totp ?? []).find((f) => f.status === "verified");
    if (!factor) return false;
    setMfaFactorId(factor.id);
    setMfaCode("");
    return true;
  }

  async function submitMfaCode(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaFactorId) return;
    setBusy(true);
    setError(null);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });
      if (challengeError) throw new Error(challengeError.message);
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaCode.replace(/\s/g, ""),
      });
      if (verifyError) throw new Error("That code was not accepted. Try the next one from your app.");
      setMfaFactorId(null);
      navigate({ to: destination });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.generalError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "forgot") {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        // Always the same answer, so this never reveals whether an account exists.
        setNotice(
          "If an account exists for that address, a single-use reset link is on its way. It expires shortly.",
        );
      } else if (mode === "signup") {
        if (!strength.ok) {
          setError(strength.problems[0] ?? `Use at least ${MIN_PASSWORD_LENGTH} characters.`);
          return;
        }
        if (!consent) {
          setError("Please confirm you accept the terms and are authorised to upload this information.");
          return;
        }
        queueAcceptance();
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
      } else if (mode === "magic") {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}${destination.startsWith("/") ? destination : "/"}`,
            shouldCreateUser: false,
          },
        });
        if (otpError) throw new Error(otpError.message);
        // Same answer either way, so this never reveals whether an account exists.
        setNotice(
          "If an account exists for that address, a single-use sign-in link is on its way. It expires shortly.",
        );
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(
            signInError.message.toLowerCase().includes("invalid")
              ? "That email and password combination did not match an account."
              : signInError.message,
          );
          return;
        }
        if (await requireSecondStep()) return;
        navigate({ to: destination });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.generalError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple" | "microsoft") {
    setBusy(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}${destination.startsWith("/") ? destination : "/"}`,
    });
    if (result.error) {
      setError(result.error.message ?? t("auth.googleUnavailable"));
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: destination });
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
        <span />

      </div>

      <div className="flex flex-col">
        <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="flex items-center justify-between gap-2">
            <div className="lg:hidden">
              <BrandMark />
            </div>
            <LanguageSwitcher className="ml-auto" />
          </div>
          <h2 className="mt-6 font-display text-xl font-semibold lg:mt-0">
            {mfaFactorId
              ? "Two-step verification"
              : mode === "signin"
                ? t("auth.signIn")
                : mode === "signup"
                  ? t("auth.createAccountTitle")
                  : mode === "magic"
                    ? "Email me a sign-in link"
                    : "Reset your password"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mfaFactorId
              ? "Enter the six-digit code from your authenticator app."
              : mode === "signin"
                ? t("auth.signInSub")
                : mode === "signup"
                  ? t("auth.signUpSub")
                  : mode === "magic"
                    ? "No password needed. We will send a single-use link that signs you in on this device."
                    : "Enter the email address on your account and we will send a single-use link to set a new password."}
          </p>

          {mfaFactorId ? (
            <form onSubmit={submitMfaCode} className="mt-6 space-y-4">
              <Field label="Six-digit code" htmlFor="mfaCode">
                <Input
                  id="mfaCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="tracking-[0.3em]"
                  required
                />
              </Field>
              {error ? (
                <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy || mfaCode.replace(/\s/g, "").length < 6}>
                {busy ? <Spinner /> : "Verify and continue"}
              </Button>
              <button
                type="button"
                className="w-full text-sm font-medium text-primary hover:underline"
                onClick={async () => {
                  await supabase.auth.signOut();
                  switchMode("signin");
                }}
              >
                Cancel and sign in again
              </button>
            </form>
          ) : (
          <>

          {mode === "signin" || mode === "signup" ? (
            <>
              <SocialButtons onSelect={handleOAuth} disabled={busy} />

              <div className="my-6 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                {t("auth.orEmail")}
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" ? (
              <Field label={t("auth.fullName")} htmlFor="fullName">
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Anisa Mohammed"
                  autoComplete="name"
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
            {mode === "signin" || mode === "signup" ? (
              <Field label={t("auth.password")} htmlFor="password">
                <PasswordInput
                  id="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={mode === "signup" ? MIN_PASSWORD_LENGTH : undefined}
                  required
                />
              </Field>
            ) : null}

            {mode === "signup" ? <PasswordMeter password={password} /> : null}

            {mode === "signin" ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => switchMode("forgot")}
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => switchMode("magic")}
                >
                  Email me a sign-in link
                </button>
              </div>
            ) : null}

            {mode === "signup" ? (
              <label className="flex gap-3 text-sm leading-relaxed text-foreground/85">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-[var(--color-primary)]"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                />
                <span>
                  I accept the <Link to="/terms" className="text-primary hover:underline">Terms of Use</Link>,{" "}
                  <Link to="/privacy" className="text-primary hover:underline">Privacy Notice</Link> and{" "}
                  <Link to="/ai-notice" className="text-primary hover:underline">AI &amp; Data Processing Notice</Link>,
                  and I am authorised to upload this company&apos;s information.
                </span>
              </label>
            ) : null}

            {error ? (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p role="status" className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
                {notice}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? (
                <Spinner />
              ) : mode === "signin" ? (
                t("auth.signIn")
              ) : mode === "signup" ? (
                t("auth.createAccount")
              ) : mode === "magic" ? (
                "Send sign-in link"
              ) : (
                "Send reset link"
              )}
            </Button>

            <noscript>
              <p className="text-sm text-destructive">
                Signing in needs JavaScript enabled in your browser.
              </p>
            </noscript>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "forgot" || mode === "magic" ? (
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => switchMode("signin")}
              >
                Back to sign in
              </button>
            ) : (
              <>
                {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                >
                  {mode === "signin" ? t("auth.createOne") : t("auth.signIn")}
                </button>
              </>
            )}
          </p>
        </Card>
        </div>
        <TrustFooter />
      </div>
    </div>
  );
}
