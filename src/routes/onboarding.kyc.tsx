import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/brand";
import { Button, Card, Field, Input, Select, Spinner } from "@/components/ui/primitives";
import { TrustFooter } from "@/components/trust-footer";
import { useAuth } from "@/lib/auth";
import { kycQueryKey, useKyc } from "@/lib/kyc";
import { Check, ShieldCheck } from "@/lib/icons";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding/kyc")({
  head: () => ({
    meta: [
      { title: "Verify your identity — Dossier by Ventureble" },
      {
        name: "description",
        content:
          "Complete a short identity and business verification step before building your first capital-readiness dossier.",
      },
      { property: "og:title", content: "Verify your identity — Dossier by Ventureble" },
      {
        property: "og:description",
        content: "A short verification step lenders expect before reviewing a financing dossier.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: KycOnboarding,
});

const COUNTRIES = [
  "Trinidad and Tobago",
  "Barbados",
  "Jamaica",
  "Guyana",
  "Saint Lucia",
  "Grenada",
  "Suriname",
  "Bahamas",
  "Belize",
  "Other",
];

const ID_TYPES = [
  { value: "national_id", label: "National ID card" },
  { value: "passport", label: "Passport" },
  { value: "drivers_permit", label: "Driver's permit" },
];

const ROLES = [
  { value: "owner", label: "Owner / Director" },
  { value: "finance", label: "Finance lead" },
  { value: "manager", label: "Manager" },
  { value: "advisor", label: "Advisor / Accountant" },
];

const FUNDS = [
  { value: "trading", label: "Business trading income" },
  { value: "savings", label: "Personal or business savings" },
  { value: "investors", label: "Investor contributions" },
  { value: "grants", label: "Grants or development funding" },
  { value: "other", label: "Other" },
];

const STEPS = ["Your identity", "Contact & address", "Business & declaration"];

type FormState = {
  legal_name: string;
  date_of_birth: string;
  nationality: string;
  id_type: string;
  id_number: string;
  phone: string;
  address_line: string;
  city: string;
  country: string;
  business_role: string;
  company_name: string;
  source_of_funds: string;
  is_pep: boolean;
  declaration_accepted: boolean;
};

const EMPTY: FormState = {
  legal_name: "",
  date_of_birth: "",
  nationality: "Trinidad and Tobago",
  id_type: "national_id",
  id_number: "",
  phone: "",
  address_line: "",
  city: "",
  country: "Trinidad and Tobago",
  business_role: "owner",
  company_name: "",
  source_of_funds: "trading",
  is_pep: false,
  declaration_accepted: false,
};

function KycOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const { data: existing, isLoading } = useKyc(user?.id);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (hydrated) return;
    if (existing) {
      setForm({
        legal_name: existing.legal_name || "",
        date_of_birth: existing.date_of_birth || "",
        nationality: existing.nationality || EMPTY.nationality,
        id_type: existing.id_type || EMPTY.id_type,
        id_number: existing.id_number || "",
        phone: existing.phone || "",
        address_line: existing.address_line || "",
        city: existing.city || "",
        country: existing.country || EMPTY.country,
        business_role: existing.business_role || EMPTY.business_role,
        company_name: existing.company_name || "",
        source_of_funds: existing.source_of_funds || EMPTY.source_of_funds,
        is_pep: existing.is_pep,
        declaration_accepted: existing.declaration_accepted,
      });
      setHydrated(true);
    } else if (!isLoading && user) {
      setForm((prev) => ({
        ...prev,
        legal_name: (user.user_metadata?.["full_name"] as string) || prev.legal_name,
      }));
      setHydrated(true);
    }
  }, [existing, isLoading, user, hydrated]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const stepValid = useMemo(() => {
    if (step === 0)
      return Boolean(form.legal_name.trim() && form.date_of_birth && form.nationality && form.id_number.trim());
    if (step === 1) return Boolean(form.phone.trim() && form.address_line.trim() && form.city.trim() && form.country);
    return Boolean(form.company_name.trim() && form.business_role && form.declaration_accepted);
  }, [step, form]);

  async function save(complete: boolean) {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const { error: saveError } = await supabase.from("kyc_profiles").upsert(
        {
          user_id: user.id,
          legal_name: form.legal_name.trim(),
          date_of_birth: form.date_of_birth || null,
          nationality: form.nationality,
          id_type: form.id_type,
          id_number: form.id_number.trim(),
          phone: form.phone.trim(),
          address_line: form.address_line.trim(),
          city: form.city.trim(),
          country: form.country,
          business_role: form.business_role,
          company_name: form.company_name.trim(),
          source_of_funds: form.source_of_funds,
          is_pep: form.is_pep,
          declaration_accepted: form.declaration_accepted,
          status: complete ? "complete" : "in_progress",
          completed_at: complete ? new Date().toISOString() : null,
        },
        { onConflict: "user_id" },
      );
      if (saveError) throw saveError;
      await queryClient.invalidateQueries({ queryKey: kycQueryKey(user.id) });
      if (complete) navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not save your details. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleNext(e: React.FormEvent) {
    e.preventDefault();
    if (!stepValid) return;
    if (step < STEPS.length - 1) {
      await save(false);
      setStep((s) => s + 1);
      return;
    }
    await save(true);
  }

  if (loading || (user && isLoading && !hydrated)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 items-start justify-center p-6">
        <Card className="mt-6 w-full max-w-xl p-8">
          <BrandMark />
          <div className="mt-6 flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-semibold">Verify your identity</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Banks, credit unions and development finance institutions require these details before they review a
                financing dossier. It takes about two minutes and you only do it once.
              </p>
            </div>
          </div>

          <ol className="mt-6 flex items-center gap-2">
            {STEPS.map((label, index) => (
              <li key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    index < step
                      ? "bg-success/20 text-success"
                      : index === step
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground",
                  )}
                >
                  {index < step ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-xs sm:block",
                    index === step ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </li>
            ))}
          </ol>

          <form onSubmit={handleNext} className="mt-6 space-y-4">
            {step === 0 ? (
              <>
                <Field label="Full legal name" htmlFor="legal_name">
                  <Input
                    id="legal_name"
                    value={form.legal_name}
                    onChange={(e) => set("legal_name", e.target.value)}
                    placeholder="Anisa Mohammed"
                    autoComplete="name"
                    required
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Date of birth" htmlFor="date_of_birth">
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={form.date_of_birth}
                      onChange={(e) => set("date_of_birth", e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                      required
                    />
                  </Field>
                  <Field label="Nationality" htmlFor="nationality">
                    <Select
                      id="nationality"
                      value={form.nationality}
                      onChange={(e) => set("nationality", e.target.value)}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="ID type" htmlFor="id_type">
                    <Select id="id_type" value={form.id_type} onChange={(e) => set("id_type", e.target.value)}>
                      {ID_TYPES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="ID number" htmlFor="id_number" hint="Stored privately and visible only to you.">
                    <Input
                      id="id_number"
                      value={form.id_number}
                      onChange={(e) => set("id_number", e.target.value)}
                      placeholder="19850412-0123"
                      required
                    />
                  </Field>
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <Field label="Mobile number" htmlFor="phone">
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+1 868 555 0142"
                    autoComplete="tel"
                    required
                  />
                </Field>
                <Field label="Residential address" htmlFor="address_line">
                  <Input
                    id="address_line"
                    value={form.address_line}
                    onChange={(e) => set("address_line", e.target.value)}
                    placeholder="12 Ariapita Avenue"
                    autoComplete="street-address"
                    required
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="City / town" htmlFor="city">
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                      placeholder="Port of Spain"
                      autoComplete="address-level2"
                      required
                    />
                  </Field>
                  <Field label="Country" htmlFor="country">
                    <Select id="country" value={form.country} onChange={(e) => set("country", e.target.value)}>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Field label="Business name" htmlFor="company_name">
                  <Input
                    id="company_name"
                    value={form.company_name}
                    onChange={(e) => set("company_name", e.target.value)}
                    placeholder="Quantum Marine Services Ltd"
                    required
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Your role" htmlFor="business_role">
                    <Select
                      id="business_role"
                      value={form.business_role}
                      onChange={(e) => set("business_role", e.target.value)}
                    >
                      {ROLES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Main source of funds" htmlFor="source_of_funds">
                    <Select
                      id="source_of_funds"
                      value={form.source_of_funds}
                      onChange={(e) => set("source_of_funds", e.target.value)}
                    >
                      {FUNDS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <label className="flex gap-3 text-sm leading-relaxed text-foreground/85">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 accent-[var(--color-primary)]"
                    checked={form.is_pep}
                    onChange={(e) => set("is_pep", e.target.checked)}
                  />
                  <span>
                    I, or a close family member, currently hold a senior public or political position (politically
                    exposed person).
                  </span>
                </label>
                <label className="flex gap-3 text-sm leading-relaxed text-foreground/85">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 accent-[var(--color-primary)]"
                    checked={form.declaration_accepted}
                    onChange={(e) => set("declaration_accepted", e.target.checked)}
                    required
                  />
                  <span>
                    I confirm these details are true and complete, and that I am authorised to act for this business.
                  </span>
                </label>
              </>
            ) : null}

            {error ? (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-3 pt-2">
              {step > 0 ? (
                <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} disabled={busy}>
                  Back
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={busy || !stepValid}>
                {busy ? <Spinner /> : step < STEPS.length - 1 ? "Continue" : "Finish and go to dashboard"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
      <TrustFooter />
    </div>
  );
}
