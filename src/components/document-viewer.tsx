import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { Badge, Button, Spinner } from "@/components/ui/primitives";
import { supabase } from "@/integrations/supabase/client";
import { DOC_TYPE_LABEL } from "@/lib/dossier/constants";
import { formatBytes, formatDate } from "@/lib/dossier/format";
import type { DocumentRow } from "@/lib/dossier/types";

function isImage(doc: DocumentRow) {
  return (
    (doc.mime_type ?? "").startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i.test(doc.name ?? "")
  );
}

function isPdf(doc: DocumentRow) {
  return (doc.mime_type ?? "").includes("pdf") || /\.pdf$/i.test(doc.name ?? "");
}

export function DocumentViewer({ doc, onClose }: { doc: DocumentRow | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setText(null);
    setError(null);
    if (!doc?.storage_path) return;
    setLoading(true);
    (async () => {
      const { data, error: signError } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.storage_path!, 3600);
      if (cancelled) return;
      if (signError || !data?.signedUrl) {
        setError(signError?.message ?? "This file could not be opened.");
        setLoading(false);
        return;
      }
      setUrl(data.signedUrl);
      if (!isImage(doc) && !isPdf(doc)) {
        try {
          const res = await fetch(data.signedUrl);
          const body = await res.text();
          if (!cancelled) setText(body.slice(0, 200000));
        } catch {
          if (!cancelled) setError("This file type cannot be shown here — open it in a new tab.");
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [doc]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (doc) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, onClose]);

  if (!doc) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${doc.name || "document"}`}
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{doc.name || "Untitled document"}</p>
              <Badge tone="muted">{DOC_TYPE_LABEL[doc.doc_type] ?? "Unclassified"}</Badge>
              {doc.status === "needs_review" ? <Badge tone="warning">Needs review</Badge> : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatBytes(doc.size_bytes)} · {formatDate(doc.updated_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {url ? (
              <Button size="sm" variant="outline" onClick={() => window.open(url, "_blank", "noopener")}>
                <ExternalLink className="size-3.5" /> Open in new tab
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close preview">
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-muted/20 p-3">
          {loading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Spinner />
            </div>
          ) : error ? (
            <p className="p-4 text-sm text-destructive">{error}</p>
          ) : !doc.storage_path ? (
            <p className="p-4 text-sm text-muted-foreground">No file has been uploaded for this item yet.</p>
          ) : isImage(doc) && url ? (
            <img src={url} alt={doc.name || "Document page"} className="mx-auto max-h-full rounded-md" />
          ) : isPdf(doc) && url ? (
            <iframe src={url} title={doc.name || "Document"} className="h-full min-h-[70vh] w-full rounded-md bg-white" />
          ) : text !== null ? (
            <pre className="whitespace-pre-wrap break-words rounded-md bg-card p-3 text-xs">{text}</pre>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              This file cannot be shown here — use “Open in new tab”.
            </p>
          )}
        </div>

        {doc.notes ? (
          <div className="border-t border-border px-4 py-2 text-xs text-warning">{doc.notes}</div>
        ) : null}
      </div>
    </div>
  );
}
