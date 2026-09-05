import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, FileText, Pencil, Plus, X } from "@/lib/icons";
import { Badge, Button, Card, EmptyState, Field, Input, SectionTitle, Select, Spinner } from "@/components/ui/primitives";
import { StepFooter } from "@/components/step-footer";
import { DocumentViewer } from "@/components/document-viewer";
import { InfoLink } from "@/components/info-link";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EXTRACTION_FIELDS, EXTRACTION_FIELD_LABEL } from "@/lib/dossier/constants";
import { invalidateRequest, useDocuments, useFields, useRequest } from "@/lib/dossier/queries";
import { formatMoney } from "@/lib/dossier/format";
import type { Database } from "@/integrations/supabase/types";
import type { DocumentRow, FieldRow } from "@/lib/dossier/types";

export const Route = createFileRoute("/requests/$id/extraction")({
  head: () => ({
    meta: [
      { title: "AI Extraction Review — Dossier by Ventureble" },
      {
        name: "description",
        content:
          "Review every figure read from your documents, see its source document and excerpt, and confirm or correct it before it is used.",
      },
      { property: "og:title", content: "AI Extraction Review — Dossier by Ventureble" },
      { property: "og:description", content: "Confirm or correct each extracted value before it reaches your dossier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExtractionStep,
});

function confidenceTone(value: number | null) {
  if (value === null) return "muted" as const;
  if (value >= 0.85) return "success" as const;
  if (value >= 0.6) return "warning" as const;
  return "danger" as const;
}

function ExtractionStep() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: request } = useRequest(id);
  const { data: documents } = useDocuments(id);
  const { data: fields, isLoading } = useFields(id);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [viewDoc, setViewDoc] = useState<DocumentRow | null>(null);
  const [newField, setNewField] = useState({ field_key: "annual_revenue", value: "", period: "" });

  const currency = request?.currency ?? "TTD";
  const docName = (docId: string | null) =>
    documents?.find((d) => d.id === docId)?.name || "Manual entry";

  const pending = (fields ?? []).filter((f) => f.status === "pending");
  const confirmed = (fields ?? []).filter((f) => f.status === "confirmed");
  const discarded = (fields ?? []).filter((f) => f.status === "discarded");

  const [confirmingAll, setConfirmingAll] = useState(false);

  async function updateField(field: FieldRow, patch: Database["public"]["Tables"]["extracted_fields"]["Update"]) {
    await supabase.from("extracted_fields").update(patch).eq("id", field.id);
    invalidateRequest(qc, id);
  }

  async function confirmAll() {
    if (!pending.length) return;
    setConfirmingAll(true);
    try {
      await supabase
        .from("extracted_fields")
        .update({ status: "confirmed" })
        .in("id", pending.map((f) => f.id));
      invalidateRequest(qc, id);
    } finally {
      setConfirmingAll(false);
    }
  }


  async function saveEdit(field: FieldRow) {
    const numeric = EXTRACTION_FIELDS.find((f) => f.key === field.field_key)?.numeric ?? true;
    await updateField(field, {
      value_number: numeric ? (editValue ? Number(editValue) : null) : null,
      value_text: numeric ? field.value_text : editValue,
      status: "confirmed",
      origin: "user",
    });
    setEditing(null);
  }

  async function addManual() {
    if (!user) return;
    const def = EXTRACTION_FIELDS.find((f) => f.key === newField.field_key);
    await supabase.from("extracted_fields").insert({
      user_id: user.id,
      request_id: id,
      document_id: null,
      field_key: newField.field_key,
      field_label: def?.label ?? newField.field_key,
      value_number: def?.numeric ? Number(newField.value) : null,
      value_text: def?.numeric ? null : newField.value,
      unit: def?.numeric ? currency : null,
      period: newField.period || null,
      confidence: null,
      origin: "user",
      status: "confirmed",
      source_excerpt: "Entered manually by the business",
    });
    setNewField({ field_key: "annual_revenue", value: "", period: "" });
    setAdding(false);
    invalidateRequest(qc, id);
  }

  function renderValue(field: FieldRow) {
    if (field.value_number !== null && field.value_number !== undefined)
      return formatMoney(Number(field.value_number), field.unit ?? currency);
    return field.value_text ?? "—";
  }

  function FieldCard({ field }: { field: FieldRow }) {
    const isEditing = editing === field.id;
    const numeric = field.value_number !== null && field.value_number !== undefined;
    return (
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="label-caps mb-0">{EXTRACTION_FIELD_LABEL[field.field_key] ?? field.field_label}</p>
              {field.period ? <Badge tone="muted">{field.period}</Badge> : null}
              {field.origin === "user" ? <Badge tone="primary">Entered by you</Badge> : null}
              {field.confidence !== null ? (
                <Badge tone={confidenceTone(Number(field.confidence))}>
                  {Math.round(Number(field.confidence) * 100)}% confidence
                </Badge>
              ) : null}
            </div>
            {isEditing ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  className="max-w-xs"
                  type={numeric ? "number" : "text"}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                />
                <Button size="sm" onClick={() => saveEdit(field)}>
                  Save as confirmed
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <p className="mt-1 font-display text-xl font-semibold tabular-nums">{renderValue(field)}</p>
            )}
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="size-3.5" />
              {field.document_id ? (
                <button
                  type="button"
                  className="font-medium underline underline-offset-2 hover:text-foreground"
                  onClick={() => {
                    const d = documents?.find((x) => x.id === field.document_id);
                    if (d) setViewDoc(d);
                  }}
                >
                  {docName(field.document_id)}
                </button>
              ) : (
                <span className="font-medium">{docName(field.document_id)}</span>
              )}
              {field.source_excerpt ? <span className="italic">— “{field.source_excerpt}”</span> : null}
            </p>
          </div>

          {!isEditing ? (
            <div className="flex flex-wrap gap-2">
              {field.status !== "confirmed" ? (
                <Button size="sm" onClick={() => updateField(field, { status: "confirmed" })}>
                  <Check className="size-3.5" /> Confirm
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(field.id);
                  setEditValue(
                    field.value_number !== null && field.value_number !== undefined
                      ? String(field.value_number)
                      : (field.value_text ?? ""),
                  );
                }}
              >
                <Pencil className="size-3.5" /> Correct
              </Button>
              {field.status !== "discarded" ? (
                <Button size="sm" variant="ghost" onClick={() => updateField(field, { status: "discarded" })}>
                  <X className="size-3.5" /> Discard
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => updateField(field, { status: "pending" })}>
                  Restore
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </Card>
    );
  }

  return (
    <div>
      <SectionTitle
        action={
          <Button variant="outline" size="sm" onClick={() => setAdding((v) => !v)}>
            <Plus className="size-3.5" /> Add a value manually
          </Button>
        }
      >
        AI extraction review
      </SectionTitle>

      <div className="mb-4">
        <InfoLink slug="ai-extraction" label="How Dossier reads your documents" />
      </div>

      <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
        Each value below was read from one of your documents. The source document and the exact line
        it came from are shown. Only values you confirm are used in the readiness review and the
        dossier.
      </p>

      {adding ? (
        <Card className="mb-6 p-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Field">
              <Select
                value={newField.field_key}
                onChange={(e) => setNewField((f) => ({ ...f, field_key: e.target.value }))}
              >
                {EXTRACTION_FIELDS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Value">
              <Input
                value={newField.value}
                onChange={(e) => setNewField((f) => ({ ...f, value: e.target.value }))}
              />
            </Field>
            <Field label="Period">
              <Input
                value={newField.period}
                onChange={(e) => setNewField((f) => ({ ...f, period: e.target.value }))}
                placeholder="FY2024"
              />
            </Field>
            <div className="flex items-end">
              <Button onClick={addManual} disabled={!newField.value}>
                Add value
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Spinner />
        </div>
      ) : !fields?.length ? (
        <EmptyState
          title="Nothing extracted yet"
          description="Upload a document on the previous step — Dossier reads it and lists every figure it finds here for your confirmation."
          action={
            <Button variant="outline" onClick={() => navigate({ to: "/requests/$id/documents", params: { id } })}>
              Go to documents
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold">
                Awaiting your confirmation{" "}
                <span className="text-muted-foreground">({pending.length})</span>
              </h3>
              {pending.length > 1 ? (
                <Button size="sm" variant="outline" onClick={confirmAll} disabled={confirmingAll}>
                  {confirmingAll ? <Spinner /> : <Check className="size-3.5" />} Confirm all {pending.length}
                </Button>
              ) : null}
            </div>

            {pending.length ? (
              <div className="grid gap-3">
                {pending.map((f) => (
                  <FieldCard key={f.id} field={f} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Everything read so far has been reviewed.</p>
            )}
          </section>

          <section>
            <h3 className="mb-3 font-display text-base font-semibold">
              Confirmed <span className="text-muted-foreground">({confirmed.length})</span>
            </h3>
            <div className="grid gap-3">
              {confirmed.map((f) => (
                <FieldCard key={f.id} field={f} />
              ))}
            </div>
          </section>

          {discarded.length ? (
            <section>
              <h3 className="mb-3 font-display text-base font-semibold">
                Discarded <span className="text-muted-foreground">({discarded.length})</span>
              </h3>
              <div className="grid gap-3 opacity-60">
                {discarded.map((f) => (
                  <FieldCard key={f.id} field={f} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <DocumentViewer doc={viewDoc} onClose={() => setViewDoc(null)} />

      <StepFooter
        backTo={`/requests/${id}/documents`}
        onSave={() => navigate({ to: "/requests/$id/readiness", params: { id } })}
        nextLabel="Continue to readiness review"
      />
    </div>
  );
}
