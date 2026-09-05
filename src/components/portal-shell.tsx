import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, LogOut, Moon, ShieldCheck, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { BrandMark } from "@/components/brand";
import { Button, Card, Field, Input, Spinner } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { registerProvider } from "@/lib/portal/portal.functions";

function PortalSignIn() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
            emailRedirectTo: `${window.location.origin}/portal`,
            data: { full_name: org, account_type: "provider" },
          },
        });
        if (signUpError) throw signUpError;
        setNotice("Account created. If confirmation is required, check your inbox, then sign in.");
        setMode("signin");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/portal`,
    });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in is unavailable.");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-border bg-surface p-12 lg:flex">
        <BrandMark />
        <div className="max-w-md">
          <p className="label-caps text-accent">Capital provider portal</p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">
            Read a complete financing file before you spend an hour on it.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Banks, credit unions, development finance institutions and private capital providers use
            this portal to open the dossiers Caribbean businesses have shared with them, and to send
            back a status, questions and document requests in one place.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            {[
              "Every figure is traceable to the document it came from",
              "Risks, gaps and likely credit questions are set out up front",
              "Your scoring stays private to your institution",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          Dossier presents information supplied by the business. It does not provide a credit
          approval, loan recommendation or investment decision.
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <p className="label-caps mt-6 text-accent lg:mt-0">Capital provider portal</p>
          <h2 className="mt-2 font-display text-xl font-semibold">
            {mode === "signin" ? "Provider sign in" : "Create a provider account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Open the dossiers shared with your institution."
              : "Use the email address the business invited, or a share code."}
          </p>

          <Button variant="outline" className="mt-6 w-full" onClick={handleGoogle} disabled={busy}>
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or use email
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" ? (
              <Field label="Institution" htmlFor="org">
                <Input
                  id="org"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="Republic Bank Limited"
                  required
                />
              </Field>
            ) : null}
            <Field label="Work email" htmlFor="portal-email">
              <Input
                id="portal-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="credit@bank.tt"
                required
              />
            </Field>
            <Field label="Password" htmlFor="portal-password">
              <Input
                id="portal-password"
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
              {busy ? <Spinner /> : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to the portal?" : "Already registered?"}{" "}
            <button
              className="font-medium text-primary hover:underline"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
            >
              {mode === "signin" ? "Create a provider account" : "Sign in"}
            </button>
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Preparing a request as a business?{" "}
            <Link to="/auth" className="text-primary hover:underline">
              Use the business workspace
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

export function PortalShell({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setReady(false);
      return;
    }
    registerProvider()
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Spinner />
      </div>
    );
  }

  if (!user) return <PortalSignIn />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur no-print">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/portal" className="flex items-center gap-3">
            <BrandMark />
            <span className="hidden items-center gap-1.5 rounded border border-accent/40 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-accent sm:inline-flex">
              <Building2 className="size-3" /> Provider portal
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[200px] truncate text-xs text-muted-foreground sm:block">
              {user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate({ to: "/portal" });
              }}
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
        {ready ? children : (
          <div className="flex justify-center py-24 text-muted-foreground">
            <Spinner />
          </div>
        )}
      </main>
      <footer className="mx-auto max-w-[1200px] px-4 pb-10 sm:px-6 no-print">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          <span>
            Information in each dossier is supplied by the business. Dossier does not verify,
            underwrite or recommend any transaction.
          </span>
        </div>
      </footer>
    </div>
  );
}
