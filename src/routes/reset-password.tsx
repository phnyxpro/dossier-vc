import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/brand";
import { Button, Card, Field, Input, Spinner } from "@/components/ui/primitives";
import { PasswordMeter } from "@/components/password-meter";
import { TrustFooter } from "@/components/trust-footer";
import { checkPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — Dossier by Ventureble" },
      {
        name: "description",
        content: "Choose a new password for your Dossier by Ventureble account.",
      },
      { property: "og:title", content: "Set a new password — Dossier by Ventureble" },
      { property: "og:description", content: "Complete your password reset." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // The recovery link hands us a session; without one there is nothing to reset.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setValid(Boolean(data.session));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const strength = checkPassword(password);
    if (!strength.ok) {
      setError(strength.problems[0] ?? `Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      // End every other session that was open before the reset.
      await supabase.auth.signOut({ scope: "others" });
      setDone(true);
      setTimeout(() => navigate({ to: "/" }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not update your password. Try the link again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <BrandMark />
          <h1 className="mt-6 font-display text-xl font-semibold">Set a new password</h1>

          {!ready ? (
            <div className="mt-6 flex justify-center">
              <Spinner />
            </div>
          ) : !valid ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                This reset link has expired or has already been used. Request a new one and it will arrive in a
                moment.
              </p>
              <Link to="/auth" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </>
          ) : done ? (
            <p role="status" className="mt-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
              Password updated. Other devices have been signed out — taking you to your dashboard.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Field label="New password" htmlFor="new-password">
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                />
              </Field>
              <PasswordMeter password={password} />
              <Field label="Confirm new password" htmlFor="confirm-password">
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                />
              </Field>

              {error ? (
                <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Spinner /> : "Update password"}
              </Button>
            </form>
          )}
        </Card>
      </div>
      <TrustFooter />
    </div>
  );
}
