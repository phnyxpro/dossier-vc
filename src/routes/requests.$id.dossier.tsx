import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Pencil, Printer, RefreshCw, Share2, Sparkles } from "lucide-react";
import { Badge, Button, Card, SectionTitle, Spinner } from "@/components/ui/primitives";
import { SharePanel } from "@/components/share-panel";
import { InfoLink } from "@/components/info-link";
import {
  useDossierSections,
  useDocuments,
  useFields,
  useRequest,
  useSaveDossierSection,
  useSaveRequest,
} from "@/lib/dossier/queries";
import { exportDossierDocx, generateDossier } from "@/lib/dossier/dossier.functions";
import {
  buildSnapshot,
  cashflowIndicators,
  documentReadiness,
  readinessScore,
} from "@/lib/dossier/readiness";
import { formatDate, formatMoney } from "@/lib/dossier/format";
import { DOC_TYPE_LABEL, REQUEST_TYPE_LABEL } from "@/lib/dossier/constants";
import { DOSSIER_SECTION_MAP, INDICATIVE_NOTE } from "@/lib/dossier/sections";
import type { DossierSectionRow } from "@/lib/dossier/types";

export const Route = createFileRoute("/requests/$id/dossier")({
  head: () => ({
    meta: [
      { title: "Dossier Output — Dossier by Ventureble" },
      {
        name: "description",
        content:
          "A lender-ready financing dossier: AI-drafted sections from confirmed figures, in a condensed lender pack or a full financing package.",
      },
      { property: "og:title", content: "Dossier Output — Dossier by Ventureble" },
      { property: "og:description", content: "Export a professional financing dossier for banks, credit unions and DFIs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DossierStep,
});

type Format = "pack" | "full";

function Body({ text }: { text: string }) {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => l.startsWith("- "));
  const paragraphs = lines.filter((l) => !l.startsWith("- "));
  return (
    <div className="space-y-3 text-sm leading-relaxed text-paper-foreground">
      {paragraphs.map((t, i) => (
        <p key={i}>{t}</p>
      ))}
      {bullets.length ? (
        <ul className="list-disc space-y-1 pl-5">
          {bullets.map((b, i) => (
            <li key={i}>{b.slice(2)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-paper-border/60 py-2 last:border-0">
      <span className="text-paper-foreground/60">{label}</span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}

function SectionCard({
  section,
  number,
  editing,
  draft,
  regenerating,
  onEdit,
  onDraft,
  onSave,
  onCancel,
  onRegenerate,
}: {
  section: DossierSectionRow;
  number: number;
  editing: boolean;
  draft: string;
  regenerating: boolean;
  onEdit: () => void;
  onDraft: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onRegenerate: () => void;
}) {
  const def = DOSSIER_SECTION_MAP.get(section.section_key);
  return (
    <section className="border-t border-paper-border px-8 py-6 first:border-t-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-paper-foreground/60">
          {number}. {section.title}
        </h3>
        <div className="flex items-center gap-2 no-print">
          {def?.indicative ? <Badge tone="accent">Indicative</Badge> : null}
          <Badge tone={section.status === "edited" ? "success" : "muted"}>
            {section.status === "edited" ? "Edited" : "AI draft"}
          </Badge>
          {editing ? null : (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1 text-xs text-paper-foreground/60 hover:text-paper-foreground"
              >
                <Pencil className="size-3" /> Edit
              </button>
              <button
                type="button"
                onClick={onRegenerate}
                disabled={regenerating}
                className="inline-flex items-center gap-1 text-xs text-paper-foreground/60 hover:text-paper-foreground disabled:opacity-50"
              >
                <RefreshCw className={`size-3 ${regenerating ? "animate-spin" : ""}`} /> Rewrite
              </button>
            </>
          )}
        </div>
      </div>
      {def?.indicative ? (
        <p className="mb-3 text-xs italic text-paper-foreground/60">{INDICATIVE_NOTE}</p>
      ) : null}
      {editing ? (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            rows={Math.min(18, Math.max(8, draft.split("\n").length + 2))}
            className="w-full rounded-md border border-paper-border bg-paper px-3 py-2 text-sm leading-relaxed text-paper-foreground focus:outline-none"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="accent" onClick={onSave}>Save changes</Button>
            <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Body text={section.body} />
      )}
    </section>
  );
}

function DossierStep() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: request } = useRequest(id);
  const { data: documents } = useDocuments(id);
  const { data: fields } = useFields(id);
  const { data: sections } = useDossierSections(id);
  const save = useSaveRequest(id);
  const saveSection = useSaveDossierSection(id);
  const runGenerate = useServerFn(generateDossier);
  const runExport = useServerFn(exportDossierDocx);

  const [format, setFormat] = useState<Format>("pack");
  const [generating, setGenerating] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  if (!request || !documents || !fields || !sections) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Spinner />
      </div>
    );
  }

  const currency = request.currency;
  const snap = buildSnapshot(fields, request);
  const indicators = cashflowIndicators(snap, currency);
  const docs = documentReadiness(documents);
  const score = readinessScore(documents, fields, request);
  const company = request.companies;

  const picked = sections.filter((s) =>
    format === "full" ? true : (DOSSIER_SECTION_MAP.get(s.section_key)?.pack ?? false),
  );
  const confirmed = fields.filter((f) => f.status === "confirmed");

  async function handleGenerate(sectionKey?: string) {
    setError(null);
    if (sectionKey) setRegeneratingKey(sectionKey);
    else setGenerating(true);
    try {
      const result = await runGenerate({ data: { requestId: id, sectionKey } });
      if (!result.generated && !sectionKey) {
        setError("All sections have been edited by you. Rewrite a section individually, or edit the text directly.");
      }
      qc.invalidateQueries({ queryKey: ["dossier-sections", id] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
      setRegeneratingKey(null);
    }
  }

  async function handleExport() {
    setError(null);
    setExporting(true);
    try {
      const { filename, base64 } = await runExport({ data: { requestId: id, format } });
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setExported(filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  const empty = sections.length === 0;

  return (
    <div>
      <SectionTitle
        action={
          <div className="flex flex-wrap items-center gap-2 no-print">
            <div className="flex overflow-hidden rounded-md border border-border text-sm">
              {(["pack", "full"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`px-3 py-1.5 ${format === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {f === "pack" ? "Lender pack" : "Full package"}
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            <Button
              variant="outline"
              onClick={() => save.mutate({ status: "ready", readiness_status: score >= 85 ? "ready" : "in_progress" })}
            >
              <Share2 className="size-4" /> Mark as ready to share
            </Button>
            <Button
              variant="accent"
              onClick={() => (empty ? handleGenerate() : handleExport())}
              disabled={generating || exporting}
            >
              {empty ? (
                <>
                  <Sparkles className={`size-4 ${generating ? "animate-pulse" : ""}`} />
                  {generating ? "Drafting…" : "Generate dossier with AI"}
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  {exporting ? "Preparing…" : `Export ${format === "pack" ? "lender pack" : "full package"} (.docx)`}
                </>
              )}
            </Button>
          </div>
        }
      >
        Dossier output
      </SectionTitle>

      {error ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive no-print">{error}</p>
      ) : null}
      {exported ? (
        <p className="mb-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success no-print">
          {exported} has been downloaded to your device.
        </p>
      ) : null}

      {empty ? (
        <Card className="mx-auto max-w-2xl p-10 text-center no-print">
          <Sparkles className="mx-auto size-8 text-primary" />
          <h3 className="mt-4 font-display text-xl font-semibold">Draft the dossier with AI</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Dossier writes each section — executive summary, funding thesis, financial performance,
            risks and mitigants and more — using only the figures you confirmed. You can edit every
            paragraph before anything is shared or exported.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            {confirmed.length} confirmed data points · {docs.satisfied}/{docs.total} document types on file
          </p>
          <Button className="mt-6" variant="accent" onClick={() => handleGenerate()} disabled={generating}>
            <Sparkles className={`size-4 ${generating ? "animate-pulse" : ""}`} />
            {generating ? "Drafting sections…" : "Generate dossier with AI"}
          </Button>
        </Card>
      ) : (
        <>
          <p className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground no-print">
            <span>
              {format === "pack"
                ? "Condensed lender pack — the sections a credit officer reads first."
                : "Full financing package with cover, contents and appendix."}
            </span>
            <Button variant="outline" size="sm" onClick={() => handleGenerate()} disabled={generating}>
              <RefreshCw className={`size-3.5 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Drafting…" : "Regenerate unedited sections"}
            </Button>
          </p>

          <div className="mx-auto max-w-4xl overflow-hidden rounded-lg border border-paper-border bg-paper text-paper-foreground shadow-lift">
            <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-paper-foreground/80 px-8 py-7">
              <div>
                <p className="font-display text-lg font-bold tracking-tight">DOSSIER</p>
                <p className="text-[0.6rem] uppercase tracking-[0.22em] text-paper-foreground/60">by Ventureble</p>
                <h2 className="mt-5 font-display text-2xl font-semibold">{company?.name}</h2>
                <p className="text-sm text-paper-foreground/70">
                  {company?.industry} · {company?.country}
                </p>
                <p className="mt-1 text-xs uppercase tracking-widest text-paper-foreground/50">
                  {format === "pack" ? "Financing lender pack" : "Financing dossier — full package"}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-mono text-xs text-paper-foreground/60">{request.reference}</p>
                <p className="mt-3 text-xs uppercase tracking-widest text-paper-foreground/60">Amount sought</p>
                <p className="font-display text-2xl font-semibold tabular-nums">
                  {formatMoney(Number(request.amount_sought ?? 0), currency)}
                </p>
                <p className="mt-1 text-xs text-paper-foreground/60">
                  {REQUEST_TYPE_LABEL[request.request_type]} · {request.term_value ?? "—"} {request.term_unit}
                </p>
                <p className="mt-3 text-xs text-paper-foreground/60">Prepared {formatDate(new Date().toISOString())}</p>
              </div>
            </header>

            {format === "full" ? (
              <section className="border-b border-paper-border px-8 py-6">
                <h3 className="mb-3 font-display text-xs font-bold uppercase tracking-[0.16em] text-paper-foreground/60">
                  Contents
                </h3>
                <ol className="columns-1 gap-10 text-sm text-paper-foreground/80 sm:columns-2">
                  {picked.map((s, i) => (
                    <li key={s.id} className="flex justify-between gap-4 py-0.5">
                      <span>{i + 1}. {s.title}</span>
                    </li>
                  ))}
                  <li className="py-0.5">{picked.length + 1}. Financial snapshot</li>
                  <li className="py-0.5">{picked.length + 2}. Appendix — evidence register</li>
                </ol>
              </section>
            ) : null}

            {picked.map((s, i) => (
              <SectionCard
                key={s.id}
                section={s}
                number={i + 1}
                editing={editingId === s.id}
                draft={draft}
                regenerating={regeneratingKey === s.section_key}
                onEdit={() => {
                  setEditingId(s.id);
                  setDraft(s.body);
                }}
                onDraft={setDraft}
                onSave={() => {
                  saveSection.mutate({ id: s.id, patch: { body: draft.trim(), status: "edited" } });
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
                onRegenerate={() => handleGenerate(s.section_key)}
              />
            ))}

            <section className="border-t border-paper-border px-8 py-6">
              <h3 className="mb-3 font-display text-xs font-bold uppercase tracking-[0.16em] text-paper-foreground/60">
                {picked.length + 1}. Financial snapshot
              </h3>
              <p className="mb-3 text-xs text-paper-foreground/60">
                Figures are drawn from the business's own documents and confirmed by the business.
              </p>
              <div className="grid gap-x-10 sm:grid-cols-2">
                <Row label="Annual revenue" value={formatMoney(snap.annual_revenue, currency)} />
                <Row label="Gross profit" value={formatMoney(snap.gross_profit, currency)} />
                <Row label="EBITDA / operating profit" value={formatMoney(snap.ebitda, currency)} />
                <Row label="Net profit" value={formatMoney(snap.net_profit, currency)} />
                <Row label="Cash balance" value={formatMoney(snap.cash_balance, currency)} />
                <Row label="Inventory" value={formatMoney(snap.inventory, currency)} />
                <Row label="Accounts receivable" value={formatMoney(snap.receivables, currency)} />
                <Row label="Accounts payable" value={formatMoney(snap.payables, currency)} />
                <Row label="Existing debt" value={formatMoney(snap.existing_debt, currency)} />
                <Row label="Monthly debt service" value={formatMoney(snap.debt_service, currency)} />
              </div>
              <h4 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-widest text-paper-foreground/60">
                Cash-flow indicators
              </h4>
              <div className="grid gap-x-10 sm:grid-cols-2">
                {indicators.map((i) => (
                  <Row key={i.label} label={i.label} value={i.value} />
                ))}
              </div>
              <p className="mt-3 text-xs text-paper-foreground/60">
                Indicative measures prepared from confirmed figures. A capital provider will recalculate
                on their own basis.
              </p>
            </section>

            {format === "full" ? (
              <section className="border-t border-paper-border px-8 py-6">
                <h3 className="mb-3 font-display text-xs font-bold uppercase tracking-[0.16em] text-paper-foreground/60">
                  {picked.length + 2}. Appendix — evidence register and confirmed figures
                </h3>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-paper-foreground/60">
                  Documents
                </h4>
                <ul className="mb-5 list-disc space-y-1 pl-5 text-sm">
                  {documents.map((d) => (
                    <li key={d.id}>
                      {DOC_TYPE_LABEL[d.doc_type] ?? d.doc_type} — {d.status.replace(/_/g, " ")}
                      {d.name ? ` (${d.name})` : ""}
                    </li>
                  ))}
                </ul>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-paper-foreground/60">
                  Confirmed figures and sources
                </h4>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {confirmed.map((f) => (
                    <li key={f.id}>
                      {f.field_label}:{" "}
                      {f.value_number !== null && f.value_number !== undefined
                        ? `${f.unit ?? currency} ${Number(f.value_number).toLocaleString("en-US")}`
                        : f.value_text}
                      {f.period ? ` (${f.period})` : ""}
                      {f.source_excerpt ? ` — source: "${f.source_excerpt}"` : ""}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <footer className="border-t border-paper-border bg-paper-foreground/[0.03] px-8 py-5 text-xs text-paper-foreground/60">
              Prepared with DOSSIER by Ventureble. This dossier organises information provided by the
              business and read from its own documents. Indicative sections are discussion material only.
              It is not a credit approval, loan recommendation or investment decision. Figures are
              unaudited unless the supporting document states otherwise.
            </footer>
          </div>
        </>
      )}

      <div className="mx-auto mt-6 max-w-4xl">
        <SharePanel requestId={id} />
      </div>

      <Card className="mx-auto mt-6 max-w-4xl p-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            Readiness {score}% · {confirmed.length} confirmed data points · {docs.satisfied}/{docs.total} documents
            {sections.length ? ` · ${sections.filter((s) => s.status === "edited").length} sections edited by you` : ""}
          </span>
          <Badge tone={request.status === "ready" ? "success" : "muted"}>
            {request.status === "ready" ? "Ready to share" : "Draft"}
          </Badge>
        </div>
      </Card>
    </div>
  );
}
