import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, Card, Field, Input, Select, Spinner } from "@/components/ui/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { COUNTRIES, CURRENCIES, DOC_TYPES, REQUEST_TYPES } from "@/lib/dossier/constants";
import { InfoLink } from "@/components/info-link";

export const Route = createFileRoute("/requests/new")({
  head: () => ({
    meta: [
      { title: "New Financing Request — Dossier by Ventureble" },
      {
        name: "description",
        content:
          "Start a new financing request: company details, capital sought, purpose and term, ready for lender review.",
      },
      { property: "og:title", content: "New Financing Request — Dossier by Ventureble" },
      {
        property: "og:description",
        content: "Capture the business and the capital requirement in a few structured steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewRequest,
});

function NewRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    country: "Trinidad and Tobago",
    industry: "",
    years: "",
    revenue: "",
    currency: "TTD",
    requestType: "debt",
    amount: "",
  });

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          user_id: user.id,
          name: form.name,
          country: form.country,
          industry: form.industry || null,
          years_in_operation: form.years ? Number(form.years) : null,
          annual_revenue: form.revenue ? Number(form.revenue) : null,
          currency: form.currency,
        })
        .select()
        .single();
      if (companyError) throw companyError;

      const reference = `REQ-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`;
      const { data: request, error: requestError } = await supabase
        .from("capital_requests")
        .insert({
          user_id: user.id,
          company_id: company.id,
          reference,
          request_type: form.requestType,
          amount_sought: form.amount ? Number(form.amount) : null,
          currency: form.currency,
          status: "draft",
          readiness_status: "in_progress",
          current_step: 1,
        })
        .select()
        .single();
      if (requestError) throw requestError;

      await supabase.from("documents").insert(
        DOC_TYPES.map((d) => ({
          user_id: user.id,
          request_id: request.id,
          doc_type: d.key,
          name: "",
          status: "missing",
        })),
      );

      navigate({ to: "/requests/$id", params: { id: request.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the request.");
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <p className="label-caps">Step 1 of 7</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">New financing request</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Start with the business and the headline capital requirement. Everything else — documents,
          extraction, readiness and the dossier — follows in the guided workflow.
        </p>

        <Card className="mt-8 p-6">
          <form onSubmit={handleCreate} className="space-y-5">
            <Field label="Company name" htmlFor="name">
              <Input id="name" value={form.name} onChange={set("name")} required placeholder="Caribbean Tropical Producers Ltd" />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Country" htmlFor="country">
                <Select id="country" value={form.country} onChange={set("country")}>
                  {COUNTRIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Industry" htmlFor="industry">
                <Input id="industry" value={form.industry} onChange={set("industry")} placeholder="Agro-processing" />
              </Field>
              <Field label="Years in operation" htmlFor="years">
                <Input id="years" type="number" min="0" value={form.years} onChange={set("years")} placeholder="11" />
              </Field>
              <Field label="Currency" htmlFor="currency">
                <Select id="currency" value={form.currency} onChange={set("currency")}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Annual revenue" htmlFor="revenue" hint="Most recent full financial year">
                <Input id="revenue" type="number" min="0" value={form.revenue} onChange={set("revenue")} placeholder="18400000" />
              </Field>
              <Field label="Financing amount sought" htmlFor="amount">
                <Input id="amount" type="number" min="0" value={form.amount} onChange={set("amount")} placeholder="4250000" />
              </Field>
            </div>
            <Field label="Type of capital" htmlFor="requestType">
              <Select id="requestType" value={form.requestType} onChange={set("requestType")}>
                {REQUEST_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label} — {t.hint}
                  </option>
                ))}
              </Select>
              <InfoLink slug="types-of-capital" label="Read: types of capital explained" className="mt-1.5" />
            </Field>

            {error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/" })}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Spinner /> : "Create request"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
