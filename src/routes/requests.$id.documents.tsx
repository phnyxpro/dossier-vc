import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, Sparkles, Trash2, Upload } from "lucide-react";
import { Badge, Button, Card, Progress, SectionTitle, Select, Spinner } from "@/components/ui/primitives";
import { StepFooter } from "@/components/step-footer";
import { supabase } from "@/integrations/supabase/client";
import { extractDocument } from "@/lib/dossier/extract.functions";
import { useAuth } from "@/lib/auth";
import { DOC_TYPES } from "@/lib/dossier/constants";
import { useDocuments, useFields, useRequest, invalidateRequest } from "@/lib/dossier/queries";
import { documentReadiness } from "@/lib/dossier/readiness";
import { formatBytes, formatDate } from "@/lib/dossier/format";
import type { DocumentRow } from "@/lib/dossier/types";

export const Route = createFileRoute("/requests/$id/documents")({
  head: () => ({
    meta: [
      { title: "Documents — Dossier by Ventureble" },
      {
        name: "description",
        content:
          "Upload financial statements, bank statements, ageings, contracts and registration documents, and track what is still missing.",
      },
      { property: "og:title", content: "Documents — Dossier by Ventureble" },
      { property: "og:description", content: "Every evidence type a capital provider expects, tracked in one checklist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentsStep,
});

type StatusMeta = { tone: "success" | "warning" | "muted"; label: string; Icon: typeof Circle };

function statusMeta(status: string): StatusMeta {
  if (status === "received") return { tone: "success", label: "Received", Icon: CheckCircle2 };
  if (status === "needs_review") return { tone: "warning", label: "Needs review", Icon: AlertTriangle };
  return { tone: "muted", label: "Missing", Icon: Circle };
}

function DocumentsStep() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: request } = useRequest(id);
  const { data: documents, isLoading } = useDocuments(id);
  const { data: fields } = useFields(id);
  const [busyDoc, setBusyDoc] = useState<string | null>(null);
  const [readingAll, setReadingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const runExtraction = useServerFn(extractDocument);

  const rows = DOC_TYPES.map((type) => ({
    type,
    doc: (documents ?? []).find((d) => d.doc_type === type.key) ?? null,
  }));
  const readiness = documentReadiness(documents ?? []);
  const uploaded = (documents ?? []).filter((d) => d.storage_path);

  function fieldCount(docId: string) {
    return (fields ?? []).filter((f) => f.document_id === docId).length;
  }

  async function handleReadAll() {
    setError(null);
    setReadingAll(true);
    const failures: string[] = [];
    for (const doc of uploaded) {
      setBusyDoc(doc.doc_type);
      try {
        await runExtraction({ data: { documentId: doc.id } });
      } catch (err) {
        failures.push(err instanceof Error ? err.message : "A document could not be read.");
      }
    }
    setBusyDoc(null);
    setReadingAll(false);
    invalidateRequest(qc, id);
    if (failures.length) setError(failures[0] ?? null);
  }

  async function ensureRow(docTypeKey: string, existing: DocumentRow | null) {
    if (existing) return existing;
    const { data, error: insertError } = await supabase
      .from("documents")
      .insert({ user_id: user!.id, request_id: id, doc_type: docTypeKey, name: "", status: "missing" })
      .select()
      .single();
    if (insertError) throw insertError;
    return data as DocumentRow;
  }

  async function handleUpload(docTypeKey: string, existing: DocumentRow | null, file: File) {
    if (!user) return;
    setError(null);
    setBusyDoc(docTypeKey);
    try {
      const row = await ensureRow(docTypeKey, existing);
      const path = `${user.id}/${id}/${row.id}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, file.type ? { upsert: true, contentType: file.type } : { upsert: true });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("documents")
        .update({
          name: file.name,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
          status: "received",
          extraction_status: "idle",
          extraction_error: null,
        })
        .eq("id", row.id);
      if (updateError) throw updateError;

      invalidateRequest(qc, id);

      // Read the document with AI straight away.
      await runExtraction({ data: { documentId: row.id } });
      invalidateRequest(qc, id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      invalidateRequest(qc, id);
    } finally {
      setBusyDoc(null);
    }
  }

  async function handleExtract(doc: DocumentRow) {
    setError(null);
    setBusyDoc(doc.doc_type);
    try {
      await runExtraction({ data: { documentId: doc.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "The document could not be read.");
    } finally {
      invalidateRequest(qc, id);
      setBusyDoc(null);
    }
  }

  async function handleRemove(doc: DocumentRow) {
    setBusyDoc(doc.doc_type);
    try {
      if (doc.storage_path) await supabase.storage.from("documents").remove([doc.storage_path]);
      await supabase.from("extracted_fields").delete().eq("document_id", doc.id);
      await supabase
        .from("documents")
        .update({
          name: "",
          storage_path: null,
          mime_type: null,
          size_bytes: null,
          status: "missing",
          extraction_status: "idle",
          extraction_error: null,
          notes: null,
        })
        .eq("id", doc.id);
    } finally {
      invalidateRequest(qc, id);
      setBusyDoc(null);
    }
  }

  async function handleStatus(doc: DocumentRow, status: string) {
    await supabase.from("documents").update({ status }).eq("id", doc.id);
    invalidateRequest(qc, id);
  }

  return (
    <div>
      <SectionTitle
        action={
          <div className="w-56">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Document pack</span>
              <span className="tabular-nums">
                {readiness.satisfied}/{readiness.total}
              </span>
            </div>
            <Progress value={readiness.percent} tone={readiness.percent === 100 ? "success" : "primary"} />
          </div>
        }
      >
        Documents
      </SectionTitle>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Upload each evidence type below. PDFs, scans and photos, Excel spreadsheets, CSV and text
          files are read by AI as soon as they land — revenue, EBITDA, cash, debt, receivables and
          payables are pulled out with the line they came from. Nothing reaches the dossier until you
          confirm it in the extraction review.
        </p>
        {uploaded.length ? (
          <Button variant="outline" size="sm" onClick={handleReadAll} disabled={readingAll}>
            {readingAll ? <Spinner /> : <Sparkles className="size-3.5" />}
            {readingAll ? "Reading…" : `Read all ${uploaded.length} files`}
          </Button>
        ) : null}
      </div>


      {error ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map(({ type, doc }) => {
            const status = doc?.status ?? "missing";
            const meta = statusMeta(status);
            const busy = busyDoc === type.key;
            return (
              <Card key={type.key} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <meta.Icon
                      className={
                        status === "received"
                          ? "mt-0.5 size-5 shrink-0 text-success"
                          : status === "needs_review"
                            ? "mt-0.5 size-5 shrink-0 text-warning"
                            : "mt-0.5 size-5 shrink-0 text-muted-foreground"
                      }
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{type.label}</p>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {doc?.extraction_status === "done" ? <Badge tone="primary">AI read</Badge> : null}
                        {doc?.extraction_status === "error" ? <Badge tone="danger">Read failed</Badge> : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{type.hint}</p>
                      {doc?.name ? (
                        <p className="mt-2 truncate text-sm">
                          {doc.name}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {formatBytes(doc.size_bytes)} · {formatDate(doc.updated_at)}
                          </span>
                        </p>
                      ) : null}
                      {doc?.notes ? (
                        <p className="mt-1 text-xs text-warning">{doc.notes}</p>
                      ) : null}
                      {doc?.extraction_error ? (
                        <p className="mt-1 text-xs text-destructive">{doc.extraction_error}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {doc?.storage_path ? (
                      <>
                        <Select
                          className="h-8 w-36 text-xs"
                          value={status}
                          onChange={(e) => handleStatus(doc, e.target.value)}
                        >
                          <option value="received">Received</option>
                          <option value="needs_review">Needs review</option>
                          <option value="missing">Missing</option>
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => handleExtract(doc)} disabled={busy}>
                          {busy ? <Spinner /> : <Sparkles className="size-3.5" />} Re-read
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleRemove(doc)} disabled={busy}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {doc && doc.status !== "missing" ? (
                          <Select
                            className="h-8 w-36 text-xs"
                            value={status}
                            onChange={(e) => handleStatus(doc, e.target.value)}
                          >
                            <option value="received">Received</option>
                            <option value="needs_review">Needs review</option>
                            <option value="missing">Missing</option>
                          </Select>
                        ) : null}
                        <input
                          ref={(el) => {
                            inputs.current[type.key] = el;
                          }}
                          type="file"
                          className="hidden"
                          accept=".pdf,.csv,.tsv,.txt,.md,.json,.xlsx,.xlsm,.xls,image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(type.key, doc, file);
                            e.target.value = "";
                          }}
                        />
                        <Button size="sm" onClick={() => inputs.current[type.key]?.click()} disabled={busy}>
                          {busy ? <Spinner /> : <Upload className="size-3.5" />}
                          {busy ? "Reading…" : "Upload"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <StepFooter
        backTo={`/requests/${id}/repayment`}
        onSave={() => navigate({ to: "/requests/$id/extraction", params: { id } })}
        nextLabel="Continue to extraction review"
      />
      {request?.is_demo ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Sample documents are placeholders — upload a real file to any row to see live AI reading.
        </p>
      ) : null}
    </div>
  );
}
