import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/primitives";

/**
 * Renders every page of a PDF to canvas elements so the preview works in
 * browsers that cannot display PDFs inside an <iframe> (mobile webviews).
 */
export function PdfView({ url, name }: { url: string; name?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const pdf = await pdfjs.getDocument({ url }).promise;
        if (cancelled) return;
        const width = container.clientWidth || 800;
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const scale = Math.max(0.5, (width - 8) / base.width);
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const viewport = page.getViewport({ scale: scale * dpr });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.maxWidth = `${Math.floor(base.width * scale)}px`;
          canvas.className = "mx-auto block rounded-md bg-white shadow";
          const wrap = document.createElement("div");
          wrap.className = "mb-3 flex justify-center";
          wrap.appendChild(canvas);
          container.appendChild(wrap);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;
        }
        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not display this PDF.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Spinner />
        </div>
      ) : null}
      {error ? (
        <p className="p-4 text-sm text-destructive">{error} — use “Open in new tab”.</p>
      ) : null}
      <div ref={containerRef} aria-label={name || "PDF document"} />
    </div>
  );
}
