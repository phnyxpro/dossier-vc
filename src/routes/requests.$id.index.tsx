import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, Field, Input, SectionTitle, Select, Textarea } from "@/components/ui/primitives";
import { StepFooter } from "@/components/step-footer";
import { COUNTRIES, CURRENCIES, INDUSTRIES, INDUSTRY_GROUPS } from "@/lib/dossier/constants";
import { useRequest, useSaveCompany, useSaveRequest } from "@/lib/dossier/queries";

export const Route = createFileRoute("/requests/$id/")({
  head: () => ({
    meta: [
      { title: "Company Profile — Dossier by Ventureble" },
      {
        name: "description",
        content: "Record the business profile behind the financing request: country, industry, trading history and revenue.",
      },
      { property: "og:title", content: "Company Profile — Dossier by Ventureble" },
      { property: "og:description", content: "The business behind the capital request." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfileStep,
});

function ProfileStep() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: request } = useRequest(id);
  const saveCompany = useSaveCompany(request?.company_id, id);
  const saveRequest = useSaveRequest(id);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: "",
    country: "Trinidad and Tobago",
    industry: "",
    years: "",
    revenue: "",
    currency: "TTD",
    overview: "",
  });

  useEffect(() => {
    if (!request) return;
    setForm({
      name: request.companies?.name ?? "",
      country: request.companies?.country ?? "Trinidad and Tobago",
      industry: request.companies?.industry ?? "",
      years: request.companies?.years_in_operation?.toString() ?? "",
      revenue: request.companies?.annual_revenue?.toString() ?? "",
      currency: request.companies?.currency ?? "TTD",
      overview: request.business_overview ?? "",
    });
  }, [request]);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  async function handleSave() {
    await saveCompany.mutateAsync({
      name: form.name,
      country: form.country,
      industry: form.industry || null,
      years_in_operation: form.years ? Number(form.years) : null,
      annual_revenue: form.revenue ? Number(form.revenue) : null,
      currency: form.currency,
    });
    await saveRequest.mutateAsync({ business_overview: form.overview || null, current_step: 1 });
    setSaved(true);
    navigate({ to: "/requests/$id/details", params: { id } });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle>Company profile</SectionTitle>
      <Card className="p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Company name">
            <Input value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Country">
            <Select value={form.country} onChange={set("country")}>
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Industry">
            <Select value={form.industry} onChange={set("industry")}>
              <option value="">Select an industry</option>
              {form.industry && !INDUSTRIES.includes(form.industry) ? (
                <option value={form.industry}>{form.industry}</option>
              ) : null}
              {INDUSTRY_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label="Years in operation">
            <Input type="number" min="0" value={form.years} onChange={set("years")} />
          </Field>
          <Field label="Reporting currency">
            <Select value={form.currency} onChange={set("currency")}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Annual revenue" hint="Most recent full financial year">
            <Input type="number" min="0" value={form.revenue} onChange={set("revenue")} />
          </Field>
        </div>
        <div className="mt-5">
          <Field
            label="Business overview"
            hint="Two or three sentences a lender can read first: what the business does, who it sells to, and what makes the revenue durable."
          >
            <Textarea
              value={form.overview}
              onChange={set("overview")}
              placeholder="Caribbean Tropical Producers Ltd processes locally grown fruit into juices and preserves for regional supermarket chains…"
            />
          </Field>
        </div>
      </Card>
      <StepFooter
        onSave={handleSave}
        saving={saveCompany.isPending || saveRequest.isPending}
        saved={saved}
      />
    </div>
  );
}
