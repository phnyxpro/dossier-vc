import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Eye,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, Spinner } from "@/components/ui/primitives";
import { DocumentViewer } from "@/components/document-viewer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRequests } from "@/lib/dossier/queries";
import { DOC_TYPE_LABEL } from "@/lib/dossier/constants";
import { formatBytes, formatDate } from "@/lib/dossier/format";
import type { DocumentRow } from "@/lib/dossier/types";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/documents/")({
  head: () => ({
    meta: [
      { title: "Documents — Dossier by Ventureble" },
      {
        name: "description",
        content:
          "Every financing request as a folder, with the evidence files you have uploaded inside each one.",
      },
      { property: "og:title", content: "Documents — Dossier by Ventureble" },
      { property: "og:description", content: "Browse uploaded evidence, organised by financing request." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentsPage,
});

function useAllDocuments(userId: string | undefined) {
  return useQuery({
    queryKey: ["all-documents", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DocumentRow[];
    },
  });
}

function statusBadge(doc: DocumentRow) {
  if (doc.status === "received") return <Badge tone="success">Received</Badge>;
  if (doc.status === "needs_review") return <Badge tone="warning">Needs review</Badge>;
  return <Badge tone="muted">Missing</Badge>;
}

function DocumentsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: requests, isLoading: loadingRequests } = useRequests(user?.id);
  const { data: documents, isLoading: loadingDocs } = useAllDocuments(user?.id);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [viewDoc, setViewDoc] = useState<DocumentRow | null>(null);

  const loading = loadingRequests || loadingDocs;
  const byRequest = new Map<string, DocumentRow[]>();
  for (const doc of documents ?? []) {
    const list = byRequest.get(doc.request_id) ?? [];
    list.push(doc);
    byRequest.set(doc.request_id, list);
  }

  const folders = (requests ?? []).map((r) => {
    const docs = (byRequest.get(r.id) ?? []).filter((d) => d.storage_path);
    return { request: r, docs };
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="label-caps text-primary">{t("docs.eyebrow")}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">{t("docs.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("docs.subtitle")}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Spinner />
        </div>
      ) : folders.length === 0 ? (
        <EmptyState
          title={t("docs.emptyTitle")}
          description={t("docs.emptyBody")}
          action={
            <Link to="/requests/new">
              <Button>{t("dash.newRequest")}</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {folders.map(({ request, docs }) => {
            const isOpen = open[request.id] ?? true;
            const reviewCount = docs.filter((d) => d.status === "needs_review").length;
            return (
              <Card key={request.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen((s) => ({ ...s, [request.id]: !isOpen }))}
                  className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40"
                  aria-expanded={isOpen}
                >
                  {isOpen ? (
                    <FolderOpen className="size-5 shrink-0 text-primary" />
                  ) : (
                    <Folder className="size-5 shrink-0 text-primary" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {request.companies?.name ?? t("dash.unnamed")}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {request.purpose ?? ""}
                    </span>
                  </span>
                  <Badge tone="muted">
                    {docs.length} {docs.length === 1 ? t("docs.file") : t("docs.files")}
                  </Badge>
                  {reviewCount > 0 ? <Badge tone="warning">{reviewCount} {t("docs.toReview")}</Badge> : null}
                  {isOpen ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </button>

                {isOpen ? (
                  <div className="border-t border-border">
                    {docs.length === 0 ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                        <p className="text-sm text-muted-foreground">{t("docs.noFiles")}</p>
                        <Link to="/requests/$id/documents" params={{ id: request.id }}>
                          <Button size="sm" variant="outline">
                            {t("docs.upload")}
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <ul className="divide-y divide-border">
                        {docs.map((doc) => {
                          const Icon =
                            doc.status === "received"
                              ? CheckCircle2
                              : doc.status === "needs_review"
                                ? AlertTriangle
                                : Circle;
                          return (
                            <li
                              key={doc.id}
                              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
                            >
                              <FileText className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{doc.name || t("docs.untitled")}</p>
                                <p className="text-xs text-muted-foreground">
                                  {DOC_TYPE_LABEL[doc.doc_type] ?? "Unclassified"} · {formatBytes(doc.size_bytes)} ·{" "}
                                  {formatDate(doc.updated_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Icon
                                  className={`size-4 ${
                                    doc.status === "received"
                                      ? "text-success"
                                      : doc.status === "needs_review"
                                        ? "text-warning"
                                        : "text-muted-foreground"
                                  }`}
                                />
                                {statusBadge(doc)}
                                <Button size="sm" variant="outline" onClick={() => setViewDoc(doc)}>
                                  <Eye className="size-3.5" /> {t("docs.view")}
                                </Button>
                              </div>
                            </li>
                          );
                        })}
                        <li className="px-4 py-3">
                          <Link to="/requests/$id/documents" params={{ id: request.id }}>
                            <Button size="sm" variant="ghost">
                              {t("docs.manage")} →
                            </Button>
                          </Link>
                        </li>
                      </ul>
                    )}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <DocumentViewer doc={viewDoc} onClose={() => setViewDoc(null)} />
    </div>
  );
}
