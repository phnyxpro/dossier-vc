import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Card, Field, Input, SectionTitle, Spinner } from "@/components/ui/primitives";
import { ShieldCheck, Trash2 } from "@/lib/icons";
import { supabase } from "@/integrations/supabase/client";

type Factor = { id: string; friendly_name?: string | undefined; status: string; created_at?: string };

type Enrolment = { factorId: string; qr: string; secret: string };

export function TwoFactorCard() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) toast.error(error.message);
    setFactors((data?.totp ?? []) as Factor[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const verified = factors.filter((f) => f.status === "verified");

  async function startEnrolment() {
    setBusy(true);
    try {
      // Clear any half-finished enrolment so re-trying never hits a name clash.
      const stale = factors.filter((f) => f.status !== "verified");
      for (const f of stale) await supabase.auth.mfa.unenroll({ factorId: f.id });

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator app ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error) throw new Error(error.message);
      setEnrolment({
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start two-step setup.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnrolment() {
    if (!enrolment) return;
    setBusy(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrolment.factorId,
      });
      if (challengeError) throw new Error(challengeError.message);
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrolment.factorId,
        challengeId: challenge.id,
        code: code.replace(/\s/g, ""),
      });
      if (verifyError) throw new Error(verifyError.message);
      setEnrolment(null);
      setCode("");
      toast.success("Two-step verification is on. You will be asked for a code when you sign in.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That code was not accepted. Try the next one.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelEnrolment() {
    if (enrolment) await supabase.auth.mfa.unenroll({ factorId: enrolment.factorId });
    setEnrolment(null);
    setCode("");
    await load();
  }

  async function turnOff(factorId: string) {
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw new Error(error.message);
      toast.success("Two-step verification turned off.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not turn off two-step verification.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <SectionTitle
        action={
          verified.length ? <Badge tone="success">On</Badge> : <Badge tone="muted">Off</Badge>
        }
      >
        Two-step verification
      </SectionTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        Optional. Add a six-digit code from an authenticator app (Google Authenticator, Microsoft
        Authenticator, 1Password, Authy) on top of your password.
      </p>

      {loading ? (
        <div className="mt-4 flex justify-center py-4 text-muted-foreground">
          <Spinner />
        </div>
      ) : enrolment ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <img
              src={enrolment.qr}
              alt="QR code for setting up two-step verification in your authenticator app"
              className="size-40 shrink-0 rounded-md border border-border bg-white p-2"
            />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Scan this code in your authenticator app, then enter the six-digit code it shows.</p>
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => setShowSecret((v) => !v)}
              >
                {showSecret ? "Hide setup key" : "Can't scan? Show setup key"}
              </button>
              {showSecret ? (
                <p className="break-all rounded-md bg-surface px-3 py-2 font-mono text-xs text-foreground">
                  {enrolment.secret}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Six-digit code" htmlFor="mfaCode">
              <Input
                id="mfaCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-36 tracking-[0.3em]"
              />
            </Field>
            <Button type="button" disabled={busy || code.replace(/\s/g, "").length < 6} onClick={confirmEnrolment}>
              <ShieldCheck className="size-4" /> Turn on
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={cancelEnrolment}>
              Cancel
            </Button>
          </div>
        </div>
      ) : verified.length ? (
        <div className="mt-4 space-y-3">
          {verified.map((f) => (
            <div
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
            >
              <div className="text-sm">
                <p className="font-medium text-foreground">{f.friendly_name || "Authenticator app"}</p>
                {f.created_at ? (
                  <p className="text-xs text-muted-foreground">
                    Added {new Date(f.created_at).toLocaleDateString()}
                  </p>
                ) : null}
              </div>
              <Button type="button" variant="outline" disabled={busy} onClick={() => turnOff(f.id)}>
                <Trash2 className="size-4" /> Turn off
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <Button type="button" disabled={busy} onClick={startEnrolment}>
            <ShieldCheck className="size-4" /> Set up two-step verification
          </Button>
        </div>
      )}
    </Card>
  );
}
