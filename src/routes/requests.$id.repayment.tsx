import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, Field, Input, SectionTitle } from "@/components/ui/primitives";
import { MicTextarea } from "@/components/mic-textarea";
import { StepFooter } from "@/components/step-footer";
import { useRequest, useSaveRequest } from "@/lib/dossier/queries";

export const Route = createFileRoute("/requests/$id/repayment")({
  head: () => ({
    meta: [
      { title: "Repayment & Security — Dossier by Ventureble" },
      {
        name: "description",
        content: "Explain repayment support, existing debt and the proposed security or collateral position.",
      },
      { property: "og:title", content: "Repayment & Security — Dossier by Ventureble" },
      { property: "og:description", content: "Repayment sources, existing debt and collateral for the request." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RepaymentStep,
});

function RepaymentStep() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: request } = useRequest(id);
  const save = useSaveRequest(id);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    existing_debt: "",
    repayment_primary: "",
    repayment_secondary: "",
    repayment_explanation: "",
    security_description: "",
  });

  useEffect(() => {
    if (!request) return;
    setForm({
      existing_debt: request.existing_debt?.toString() ?? "",
      repayment_primary: request.repayment_primary ?? "",
      repayment_secondary: request.repayment_secondary ?? "",
      repayment_explanation: request.repayment_explanation ?? "",
      security_description: request.security_description ?? "",
    });
  }, [request]);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  async function handleSave() {
    await save.mutateAsync({
      existing_debt: form.existing_debt ? Number(form.existing_debt) : null,
      repayment_primary: form.repayment_primary || null,
      repayment_secondary: form.repayment_secondary || null,
      repayment_explanation: form.repayment_explanation || null,
      security_description: form.security_description || null,
      current_step: 3,
    });
    setSaved(true);
    navigate({ to: "/requests/$id/documents", params: { id } });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle>Repayment and security</SectionTitle>
      <Card className="p-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={`Existing debt (${request?.currency ?? "TTD"})`} hint="Total outstanding across all facilities">
            <Input type="number" min="0" value={form.existing_debt} onChange={set("existing_debt")} />
          </Field>
          <Field label="Primary repayment source">
            <Input
              value={form.repayment_primary}
              onChange={set("repayment_primary")}
              placeholder="Operating cash flow from contracted volumes"
            />
          </Field>
        </div>
        <Field label="Secondary repayment source" hint="What repays the facility if the primary source weakens">
          <Input
            value={form.repayment_secondary}
            onChange={set("repayment_secondary")}
            placeholder="Receivables collections and directors' guarantee"
          />
        </Field>
        <Field
          label="How the financing will be repaid"
          hint="Describe it in cash terms — incremental revenue, margin, and the resulting cover against annual debt service."
        >
          <MicTextarea className="min-h-36" value={form.repayment_explanation} onChange={set("repayment_explanation")} />
        </Field>
        <Field
          label="Proposed security or collateral"
          hint="Assets offered, charges, guarantees, and when each asset was last valued."
        >
          <MicTextarea className="min-h-32" value={form.security_description} onChange={set("security_description")} />
        </Field>
      </Card>
      <StepFooter
        backTo={`/requests/${id}/details`}
        onSave={handleSave}
        saving={save.isPending}
        saved={saved}
      />
    </div>
  );
}
