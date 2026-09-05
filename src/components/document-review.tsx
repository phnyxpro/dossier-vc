import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ClipboardList, Plus, Sparkles } from "lucide-react";
import { Badge, Button, Card, Input, Label, Select, Spinner, Textarea } from "@/components/ui/primitives";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { DOC_TYPES, DOC_TYPE_LABEL, EXTRACTION_FIELDS, EXTRACTION_FIELD_LABEL } from "@/lib/dossier/constants";
import { invalidateRequest } from "@/lib/dossier/queries";
import type { DocumentRow, FieldRow } from "@/lib/dossier/types";

export type ReviewReason = "read_failed" | "nothing_found" | "unclassified" | "flagged";

const REASON_TEXT: Record<ReviewReason, string> = {
  read_failed: "The file could not be read automatically.",
  nothing_found: "The file was read but no figures were recognised.",
  unclassified: "This file has not been classified yet.",
  flagged: "You marked this document for review.",
};

export function reviewReason(doc: DocumentRow, fieldCount: number): ReviewReason | null {
  const known = DOC_TYPES.some((t) => t.key === doc.doc_type);
  if (doc.storage_path && !known) return "unclassified";
  if (doc.extraction_status === "error") return "read_failed";
  if (doc.storage_path && doc.extraction_status === "done" && fieldCount === 0) return "nothing_found";
  if (doc.status === "needs_review") return "flagged";
  return null;
}

/** Manual figure entry — the contingency when AI reading cannot produce numbers. */
export function ManualFigureForm({
  requestId,
  documentId,
  onDone,
}: {
  requestId: string;
  documentId: string | null;
  onDone?: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [key, setKey] = useState<string>(EXTRACTION_FIELDS[0].key);
  const [value, setValue] = useState("");
  const [period, setPeriod] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = EXTRACTION_FIELDS.find((f) => f.key === key)!;

  async function save() {
    if (!user) return;
    setError(null);
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter a value first.");
      return;
    }
    const numeric = Number(trimmed.replace(/[^0-9.\-]/g, ""));
    if (field.numeric && !Number.isFinite(numeric)) {
      setError("Enter a number for this figure.");
      return;
    }
    setSaving(true);
    const { error: insertError } = await supabase.from("extracted_fields").insert({
      user_id: user.id,
      request_id: requestId,
      document_id: documentId,
      field_key: key,
      field_label: EXTRACTION_FIELD_LABEL[key] ?? key,
      value_number: field.numeric ? numeric : null,
      value_text: field.numeric ? null : trimmed,
      period: period.trim() || null,
      source_excerpt: source.trim() || "Entered by hand",
      origin: "manual",
      status: "confirmed",
      confidence: null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setValue("");
    setPeriod("");
    setSource("");
    invalidateRequest(qc, requestId);
    onDone?.();
  }

  return (
    <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
      <p className="mb-2 flex items-center gap-2 text-xs font-medium">
        <ClipboardList className="size-3.5 text-accent" /> Enter a figure by hand
      </p>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <Label htmlFor={`mf-key-${documentId ?? "none"}`}>Figure</Label>
          <Select
            id={`mf-key-${documentId ?? "none"}`}
            className="h-9 text-xs"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          >
            {EXTRACTION_FIELDS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`mf-val-${documentId ?? "none"}`}>{field.numeric ? "Amount" : "Detail"}</Label>
          <Input
            id={`mf-val-${documentId ?? "none"}`}
            className="h-9 text-xs"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={field.numeric ? "18,400,312" : "Republic Supermarkets Ltd"}
          />
        </div>
        <div>
          <Label htmlFor={`mf-per-${documentId ?? "none"}`}>Period</Label>
          <Input
            id={`mf-per-${documentId ?? "none"}`}
            className="h-9 text-xs"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="FY2024"
          />
        </div>
        <div>
          <Label htmlFor={`mf-src-${documentId ?? "none"}`}>Where it came from</Label>
          <Input
            id={`mf-src-${documentId ?? "none"}`}
            className="h-9 text-xs"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Page 4, income statement"
          />
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      <div className="mt-3">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Spinner /> : <Plus className="size-3.5" />} Add figure
        </Button>
      </div>
    </div>
  );
}

function ReviewItem({
  requestId,
  doc,
  reason,
  fields,
  onReread,
  busy,
}: {
  requestId: string;
  doc: DocumentRow;
  reason: ReviewReason;
  fields: FieldRow[];
  onReread: (doc: DocumentRow) => void;
  busy: boolean;
}) {
  const qc = useQueryClient();
  const [note, setNote] = useState(doc.notes ?? "");
  const [showManual, setShowManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const manualCount = fields.filter((f) => f.document_id === doc.id && f.origin === "manual").length;

  async function patch(update: Database["public"]["Tables"]["documents"]["Update"]) {
    setSaving(true);
    await supabase.from("documents").update(update).eq("id", doc.id);
    setSaving(false);
    invalidateRequest(qc, requestId);
  }

  return (
    <div className="rounded-md border border-warning/40 bg-warning/5 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{doc.name || DOC_TYPE_LABEL[doc.doc_type] || "Untitled upload"}</p>
            <Badge tone="warning">{DOC_TYPE_LABEL[doc.doc_type] ?? "Unclassified"}</Badge>
            {manualCount ? <Badge tone="primary">{manualCount} entered by hand</Badge> : null}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{REASON_TEXT[reason]}</p>
          {doc.extraction_error ? (
            <p className="mt-1 text-xs text-destructive">{doc.extraction_error}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="h-8 w-48 text-xs"
            value={DOC_TYPES.some((t) => t.key === doc.doc_type) ? doc.doc_type : ""}
            onChange={(e) => patch({ doc_type: e.target.value })}
          >
            <option value="" disabled>
              Classify this document…
            </option>
            {DOC_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </Select>
          {doc.storage_path ? (
            <Button size="sm" variant="outline" onClick={() => onReread(doc)} disabled={busy}>
              {busy ? <Spinner /> : <Sparkles className="size-3.5" />} Read again
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => setShowManual((v) => !v)}>
            <ClipboardList className="size-3.5" /> {showManual ? "Hide entry" : "Enter by hand"}
          </Button>
          <Button
            size="sm"
            onClick={() => patch({ status: "received", notes: note.trim() || null })}
            disabled={saving}
          >
            {saving ? <Spinner /> : null} Mark reviewed
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <Label htmlFor={`note-${doc.id}`}>Review note</Label>
        <Textarea
          id={`note-${doc.id}`}
          className="min-h-16 text-xs"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => patch({ notes: note.trim() || null })}
          placeholder="What is wrong with this file, and what you did about it."
        />
      </div>

      {showManual ? (
        <ManualFigureForm requestId={requestId} documentId={doc.id} onDone={() => setShowManual(true)} />
      ) : null}
    </div>
  );
}

export function DocumentReviewQueue({
  requestId,
  items,
  fields,
  onReread,
  busyDocType,
}: {
  requestId: string;
  items: { doc: DocumentRow; reason: ReviewReason }[];
  fields: FieldRow[];
  onReread: (doc: DocumentRow) => void;
  busyDocType: string | null;
}) {
  if (!items.length) return null;
  return (
    <Card className="mb-6 border-warning/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="size-4 text-warning" />
        <h3 className="font-display text-sm font-semibold">
          Needs your review ({items.length})
        </h3>
      </div>
      <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
        These uploads could not be read cleanly or have not been classified. Set the right document
        type, try reading again, or type the figures in yourself — anything you enter by hand is
        treated as confirmed and flows straight into the dossier.
      </p>
      <div className="grid gap-3">
        {items.map(({ doc, reason }) => (
          <ReviewItem
            key={doc.id}
            requestId={requestId}
            doc={doc}
            reason={reason}
            fields={fields}
            onReread={onReread}
            busy={busyDocType === doc.doc_type}
          />
        ))}
      </div>
    </Card>
  );
}
