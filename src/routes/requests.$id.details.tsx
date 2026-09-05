import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, Field, Input, SectionTitle, Select, Textarea } from "@/components/ui/primitives";
import { StepFooter } from "@/components/step-footer";
import { CURRENCIES, DEBT_SUBTYPES, REQUEST_TYPES } from "@/lib/dossier/constants";
import { useRequest, useSaveRequest } from "@/lib/dossier/queries";

export const Route = createFileRoute("/requests/$id/details")({
  head: () => ({
    meta: [
      { title: "Capital Details — Dossier by Ventureble" },
      {
        name: "description",
        content: "Set out the capital requirement: amount sought, currency, purpose, use of funds and desired term.",
      },
      { property: "og:title", content: "Capital Details — Dossier by Ventureble" },
      { property: "og:description", content: "Amount, purpose, use of funds and term for the financing request." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DetailsStep,
});

function DetailsStep() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: request } = useRequest(id);
  const save = useSaveRequest(id);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    request_type: "debt",
    financing_subtype: "",
    amount_sought: "",
    currency: "TTD",
    term_value: "",
    term_unit: "months",
    purpose: "",
    use_of_funds: "",
  });

  useEffect(() => {
    if (!request) return;
    setForm({
      request_type: request.request_type ?? "debt",
      financing_subtype: request.financing_subtype ?? "",
      amount_sought: request.amount_sought?.toString() ?? "",
      currency: request.currency ?? "TTD",
      term_value: request.term_value?.toString() ?? "",
      term_unit: request.term_unit ?? "months",
      purpose: request.purpose ?? "",
      use_of_funds: request.use_of_funds ?? "",
    });
  }, [request]);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  async function handleSave() {
    await save.mutateAsync({
      request_type: form.request_type,
      financing_subtype: form.financing_subtype || null,
      amount_sought: form.amount_sought ? Number(form.amount_sought) : null,
      currency: form.currency,
      term_value: form.term_value ? Number(form.term_value) : null,
      term_unit: form.term_unit,
      purpose: form.purpose || null,
      use_of_funds: form.use_of_funds || null,
      current_step: 2,
    });
    setSaved(true);
    navigate({ to: "/requests/$id/repayment", params: { id } });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle>Capital details</SectionTitle>
      <Card className="p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Type of capital">
            <Select value={form.request_type} onChange={set("request_type")}>
              {REQUEST_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Facility type" hint="How the capital would be structured">
            <Select value={form.financing_subtype} onChange={set("financing_subtype")}>
              <option value="">Not specified</option>
              {DEBT_SUBTYPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Financing amount sought">
            <Input type="number" min="0" value={form.amount_sought} onChange={set("amount_sought")} />
          </Field>
          <Field label="Currency">
            <Select value={form.currency} onChange={set("currency")}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Desired financing term">
            <Input type="number" min="0" value={form.term_value} onChange={set("term_value")} placeholder="60" />
          </Field>
          <Field label="Term unit">
            <Select value={form.term_unit} onChange={set("term_unit")}>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </Select>
          </Field>
        </div>
        <div className="mt-5 space-y-5">
          <Field label="Financing purpose" hint="What the capital is for, in one paragraph.">
            <Textarea value={form.purpose} onChange={set("purpose")} />
          </Field>
          <Field
            label="Use of funds"
            hint="Break the amount down line by line — equipment, working capital, installation, contingency. Lenders look for this first."
          >
            <Textarea
              className="min-h-32"
              value={form.use_of_funds}
              onChange={set("use_of_funds")}
              placeholder={"Bottling and pasteurisation line — 3,100,000\nInstallation and commissioning — 350,000\nWorking capital for contracted volumes — 650,000\nContingency — 150,000"}
            />
          </Field>
        </div>
      </Card>
      <StepFooter
        backTo={`/requests/${id}`}
        onSave={handleSave}
        saving={save.isPending}
        saved={saved}
      />
    </div>
  );
}
