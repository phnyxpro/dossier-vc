import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Download,
  Eye,
  FileText,
  Package,
} from "lucide-react";
import { Badge, Button, Card, Progress, SectionTitle, Spinner } from "@/components/ui/primitives";
import { DocumentViewer } from "@/components/document-viewer";
import { StepFooter } from "@/components/step-footer";
import { supabase } from "@/integrations/supabase/client";
import { DOC_TYPES, DOC_TYPE_LABEL, REQUEST_TYPE_LABEL } from "@/lib/dossier/constants";
import { useDocuments, useRequest } from "@/lib/dossier/queries";
import { documentReadiness } from "@/lib/dossier/readiness";
import { formatBytes, formatDate } from "@/lib/dossier/format";
import { toast } from "sonner";
import type { DocumentRow } from "@/lib/dossier/types";

export const Route = createFileRoute("/requests/$id/pack")({
  head: () => ({
    meta: [
      { title: "Lender Pack — Dossier by Ventureble" },
      {
        name: "description",
        content:
          "The full lender pack: every document a capital provider expects, checked off, with a one-click download of the whole bundle.",
      },
      { property: "og:title", content: "Lender Pack — Dossier by Ventureble" },
      { property: "og:description", content: "Every document in the pack, checked off and downloadable as one bundle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LenderPackPage,
});

function safeFileName(name: string) {
  return name.replace(/[^\w.\-]/g, "_");
}

export default function LenderPackPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: request } = useRequest(id);
  const { data: documents, isLoading } = useDocuments(id);
  const [viewDoc, setViewDoc] = useState<DocumentRow | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const docs = documents ?? [];
  const rows = DOC_TYPES.map((type) => ({
    type,
    doc: docs.find((d) => d.doc_type === type.key) ?? null,
  }));
  const extras = docs.filter((d) => !DOC_TYPES.some((t) => t.key === d.doc_type) && d.storage_path);
  const uploaded = docs.filter((d) => d.storage_path);
  const readiness = documentReadiness(docs);
  const company = request?.companies;

  async function handleDownload() {
    if (!uploaded.length || downloading) return;
    setDownloading(true);
    setProgress(null);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const companyName = safeFileName(company?.name || "company");
      const folder = zip.folder(`${companyName}-lender-pack`)!;

      let n = 0;
      for (const doc of uploaded) {
        n += 1;
        setProgress(`Adding file ${n} of ${uploaded.length}…`);
        const { data, error } = await supabase.storage
          .from("documents")
          .createSignedUrl(doc.storage_path!, 3600);
        if (error || !data?.signedUrl) continue;
        const res = await fetch(data.signedUrl);
        if (!res.ok) continue;
        const blob = await res.blob();
        const typeLabel = DOC_TYPE_LABEL[doc.doc_type] ?? "Other";
        folder.file(`${safeFileName(typeLabel)} - ${safeFileName(doc.name || "document")}`, blob);
      }

      const checklist = DOC_TYPES.map((t) => {
        const doc = docs.find((d) => d.doc_type === t.key);
        const state = !doc?.storage_path
          ? "MISSING"
          : doc.status === "needs_review"
            ? "NEEDS REVIEW"
            : "RECEIVED";
        return `[${state === "RECEIVED" ? "x" : " "}] ${t.label} — ${state}${doc?.name ? ` (${doc.name})` : ""}`;
      }).join("\n");

      folder.file(
        "PACK CONTENTS.txt",
        [
          `LENDER PACK — ${company?.name ?? "Company"}`,
          `Prepared with Dossier by Ventureble`,
          `Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
          ``,
          `Financing sought: ${REQUEST_TYPE_LABEL[request?.request_type ?? ""] ?? "—"}`,
          `Amount: ${request?.currency ?? "TTD"} ${Number(request?.amount_sought ?? 0).toLocaleString()}`,
          ``,
          `DOCUMENT CHECKLIST`,
          checklist,
          ``,
          `This pack contains ${uploaded.length} file(s). Figures in the accompanying dossier were`,
          `extracted from these documents and confirmed by the business.`,
        ].join("\n"),
      );

      setProgress("Compressing…");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${companyName}-lender-pack.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Lender pack downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The pack could not be downloaded.");
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  }

  return (
    <div>
      <SectionTitle
        action={
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-44">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Pack completeness</span>
                <span className="tabular-nums">
                  {readiness.satisfied}/{readiness.total}
                </span>
              </div>
              <Progress value={readiness.percent} tone={readiness.percent === 100 ? "success" : "primary"} />
            </div>
            <Button size="sm" onClick={handleDownload} disabled={!uploaded.length || downloading}>
              {downloading ? <Spinner /> : <Download className="size-3.5" />}
              {downloading ? (progress ?? "Preparing…") : `Download pack (${uploaded.length} files)`}
            </Button>
          </div>
        }
      >
        Lender pack
      </SectionTitle>

      <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
        Everything a capital provider expects from {company?.name ?? "this business"}, in one place.
        Tick off the checklist, then download the whole pack as a single zip — every uploaded file
        plus a contents cover sheet. To change a document, go back to{" "}
        <Link to="/requests/$id/documents" params={{ id }} className="text-primary underline underline-offset-2">
          Documents
        </Link>
        .
      </p>

      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-2">
          {rows.map(({ type, doc }) => {
            const received = Boolean(doc?.storage_path) && doc?.status !== "missing";
            const needsReview = doc?.status === "needs_review";
            return (
              <Card key={type.key} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  {received && !needsReview ? (
                    <CheckCircle2 className="size-5 shrink-0 text-success" />
                  ) : needsReview ? (
                    <AlertTriangle className="size-5 shrink-0 text-warning" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{type.label}</p>
                      {received && !needsReview ? (
                        <Badge tone="success">In pack</Badge>
                      ) : needsReview ? (
                        <Badge tone="warning">Needs review</Badge>
                      ) : (
                        <Badge tone="muted">Missing</Badge>
                      )}
                    </div>
                    {doc?.name ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {doc.name} · {formatBytes(doc.size_bytes)} · {formatDate(doc.updated_at)}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted-foreground">{type.hint}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc?.storage_path ? (
                    <Button size="sm" variant="ghost" onClick={() => setViewDoc(doc)}>
                      <Eye className="size-3.5" /> View
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate({ to: "/requests/$id/documents", params: { id } })}
                    >
                      Upload
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}

          {extras.length ? (
            <Card className="mt-2 p-4">
              <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
                <FileText className="size-4 text-primary" /> Additional files in the pack
              </h3>
              <div className="mt-2 grid gap-1.5">
                {extras.map((doc) => (
                  <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      {doc.name}
                      <span className="ml-2 text-xs text-muted-foreground">{formatBytes(doc.size_bytes)}</span>
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => setViewDoc(doc)}>
                      <Eye className="size-3.5" /> View
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      )}

      {!uploaded.length && !isLoading ? (
        <Card className="mt-4 flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <Package className="size-5 text-warning" />
          Nothing to download yet — upload documents first and they will appear in the pack.
        </Card>
      ) : null}

      <DocumentViewer doc={viewDoc} onClose={() => setViewDoc(null)} />

      <StepFooter
        backTo={`/requests/${id}/documents`}
        onSave={() => navigate({ to: "/requests/$id/dossier", params: { id } })}
        nextLabel="Continue to dossier output"
      />
    </div>
  );
}
