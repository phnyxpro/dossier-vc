import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, ClipboardList, Eye, Package, Sparkles, Trash2, Upload } from "@/lib/icons";
import { Badge, Button, Card, Progress, SectionTitle, Select, Spinner } from "@/components/ui/primitives";
import { LenderRequestsCard } from "@/components/share-panel";
import { DocumentReviewQueue, ManualFigureForm, reviewReason } from "@/components/document-review";
import { DocumentViewer } from "@/components/document-viewer";
import { StepFooter } from "@/components/step-footer";
import { supabase } from "@/integrations/supabase/client";
import { extractDocument } from "@/lib/dossier/extract.functions";
import { useAuth } from "@/lib/auth";
import { DOC_TYPES } from "@/lib/dossier/constants";
import { InfoLink } from "@/components/info-link";
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
  const [showManual, setShowManual] = useState(false);
  const [viewDoc, setViewDoc] = useState<DocumentRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const extraInput = useRef<HTMLInputElement | null>(null);
  const runExtraction = useServerFn(extractDocument);

  const rows = DOC_TYPES.map((type) => {
    const all = (documents ?? []).filter((d) => d.doc_type === type.key);
    const files = all.filter((d) => d.storage_path);
    return {
      type,
      files,
      placeholder: all.find((d) => !d.storage_path) ?? null,
      doc: files[0] ?? all[0] ?? null,
    };
  });
  const readiness = documentReadiness(documents ?? []);
  const uploaded = (documents ?? []).filter((d) => d.storage_path);

  function fieldCount(docId: string) {
    return (fields ?? []).filter((f) => f.document_id === docId).length;
  }

  const reviewItems = (documents ?? [])
    .map((doc) => ({ doc, reason: reviewReason(doc, fieldCount(doc.id)) }))
    .filter((r): r is { doc: DocumentRow; reason: NonNullable<typeof r.reason> } => r.reason !== null);


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

  async function uploadOne(docTypeKey: string, existing: DocumentRow | null, file: File) {
    if (!user) return;
    {
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
    }
  }

  /** Uploads one or many files against the same checklist item. */
  async function handleUpload(
    docTypeKey: string,
    placeholder: DocumentRow | null,
    files: File[],
  ) {
    if (!user || !files.length) return;
    setError(null);
    setBusyDoc(docTypeKey);
    let slot = placeholder;
    for (const file of files) {
      try {
        await uploadOne(docTypeKey, slot, file);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      }
      slot = null;
    }
    invalidateRequest(qc, id);
    setBusyDoc(null);
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

  async function handleRemove(doc: DocumentRow, isOnlyFile = true) {
    setBusyDoc(doc.doc_type);
    try {
      if (doc.storage_path) await supabase.storage.from("documents").remove([doc.storage_path]);
      await supabase.from("extracted_fields").delete().eq("document_id", doc.id);
      if (!isOnlyFile) {
        await supabase.from("documents").delete().eq("id", doc.id);
        return;
      }
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

      <div className="mb-4">
        <InfoLink slug="documents-providers-expect" label="What capital providers expect in each document" />
      </div>

      <LenderRequestsCard requestId={id} />

      <DocumentReviewQueue
        requestId={id}
        items={reviewItems}
        fields={fields ?? []}
        onReread={handleExtract}
        onView={setViewDoc}
        busyDocType={busyDoc}
      />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Upload each evidence type below. PDFs, scans and photos, Excel spreadsheets, CSV and text
          files are read by AI as soon as they land — revenue, EBITDA, cash, debt, receivables and
          payables are pulled out with the line they came from. Nothing reaches the dossier until you
          confirm it in the extraction review. If a file cannot be read, it moves to the review list
          at the top where you can classify it or type the figures in yourself.
        </p>
        <div className="flex flex-wrap gap-2">
          {uploaded.length ? (
            <Button variant="outline" size="sm" onClick={handleReadAll} disabled={readingAll}>
              {readingAll ? <Spinner /> : <Sparkles className="size-3.5" />}
              {readingAll ? "Reading…" : `Read all ${uploaded.length} files`}
            </Button>
          ) : null}
          <input
            ref={extraInput}
            type="file"
            className="hidden"
            accept=".pdf,.csv,.tsv,.txt,.md,.json,.xlsx,.xlsm,.xls,image/*"
            multiple
            onChange={(e) => {
              const chosen = Array.from(e.target.files ?? []);
              if (chosen.length) handleUpload("unclassified", null, chosen);
              e.target.value = "";
            }}
          />
          <Button variant="outline" size="sm" onClick={() => extraInput.current?.click()}>
            <Upload className="size-3.5" /> Upload files
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/requests/$id/pack", params: { id } })}>
            <Package className="size-3.5" /> Lender pack
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowManual((v) => !v)}>
            <ClipboardList className="size-3.5" /> {showManual ? "Hide manual entry" : "Enter figures by hand"}
          </Button>
        </div>
      </div>

      {showManual ? (
        <Card className="mb-6 p-4">
          <h3 className="font-display text-sm font-semibold">Enter figures by hand</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Use this when a document cannot be uploaded or read. Figures added here count as confirmed
            and appear in the financial snapshot and the dossier.
          </p>
          <ManualFigureForm requestId={id} documentId={null} />
        </Card>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}


      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map(({ type, doc, files, placeholder }) => {
            const status = files.length
              ? files.some((f) => f.status === "needs_review")
                ? "needs_review"
                : "received"
              : (doc?.status ?? "missing");
            const meta = statusMeta(status);
            const busy = busyDoc === type.key;
            return (
              <Card key={type.key} className="p-4">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:flex sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
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
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{type.label}</p>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {files.length > 1 ? <Badge tone="muted">{files.length} files</Badge> : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{type.hint}</p>

                      {files.length ? (
                        <ul className="mt-3 grid gap-2">
                          {files.map((file) => (
                            <li
                              key={file.id}
                              className="rounded-md border border-border bg-muted/20 px-3 py-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm">{file.name || "Untitled file"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatBytes(file.size_bytes)} · {formatDate(file.updated_at)}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {file.extraction_status === "running" ? (
                                    <Badge tone="muted">Reading…</Badge>
                                  ) : file.extraction_status === "error" ? (
                                    <Badge tone="danger">Read failed</Badge>
                                  ) : file.extraction_status === "done" ? (
                                    <Badge tone="primary">
                                      {fieldCount(file.id)
                                        ? `${fieldCount(file.id)} figures found`
                                        : "AI read — nothing found"}
                                    </Badge>
                                  ) : null}
                                  <Select
                                    className="h-8 w-32 text-xs"
                                    value={file.status}
                                    onChange={(e) => handleStatus(file, e.target.value)}
                                  >
                                    <option value="received">Received</option>
                                    <option value="needs_review">Needs review</option>
                                    <option value="missing">Missing</option>
                                  </Select>
                                  <Button size="sm" variant="outline" onClick={() => setViewDoc(file)}>
                                    <Eye className="size-3.5" /> View
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleExtract(file)}
                                    disabled={busy}
                                  >
                                    <Sparkles className="size-3.5" /> Re-read
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemove(file, files.length === 1)}
                                    disabled={busy}
                                    aria-label={`Remove ${file.name}`}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </div>
                              {file.notes ? (
                                <p className="mt-1 text-xs text-warning">{file.notes}</p>
                              ) : null}
                              {file.extraction_error ? (
                                <p className="mt-1 text-xs text-destructive">{file.extraction_error}</p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={(el) => {
                        inputs.current[type.key] = el;
                      }}
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.csv,.tsv,.txt,.md,.json,.xlsx,.xlsm,.xls,image/*"
                      onChange={(e) => {
                        const chosen = Array.from(e.target.files ?? []);
                        if (chosen.length) handleUpload(type.key, placeholder, chosen);
                        e.target.value = "";
                      }}
                    />
                    <Button size="sm" onClick={() => inputs.current[type.key]?.click()} disabled={busy}>
                      {busy ? <Spinner /> : <Upload className="size-3.5" />}
                      {busy ? "Reading…" : files.length ? "Add more files" : "Upload"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <DocumentViewer doc={viewDoc} onClose={() => setViewDoc(null)} />

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
