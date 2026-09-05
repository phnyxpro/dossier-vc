import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ClipboardList, Flag, FlagOff } from "@/lib/icons";
import { Badge, Button, Card, Input, Label, SectionTitle, Select, Spinner } from "@/components/ui/primitives";
import { MicTextarea } from "@/components/mic-textarea";
import { providerAddFigure, providerFlagDocument } from "@/lib/portal/portal.functions";
import { DOC_TYPE_LABEL, EXTRACTION_FIELDS, EXTRACTION_FIELD_LABEL } from "@/lib/dossier/constants";

type Doc = {
  id: string;
  doc_type: string;
  name: string;
  status: string;
  notes: string | null;
};

/** Evidence list with lender-side flagging and hand-keyed figures. */
export function PortalEvidence({ shareId, documents }: { shareId: string; documents: Doc[] }) {
  const qc = useQueryClient();
  const flag = useServerFn(providerFlagDocument);
  const addFigure = useServerFn(providerAddFigure);

  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const [fieldKey, setFieldKey] = useState<string>(EXTRACTION_FIELDS[0].key);
  const [value, setValue] = useState("");
  const [period, setPeriod] = useState("");

  const field = EXTRACTION_FIELDS.find((f) => f.key === fieldKey)!;

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["portal-dossier", shareId] });
  }

  async function toggleFlag(doc: Doc, next: boolean) {
    setBusy(doc.id);
    setError(null);
    setDone(null);
    try {
      await flag({ data: { shareId, documentId: doc.id, flag: next, note: next ? note : "" } });
      setNote("");
      setOpenDoc(null);
      setDone(next ? "Flagged for the business to look at again." : "Flag cleared.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  async function saveFigure(documentId: string | null) {
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
    setBusy(`fig-${documentId ?? "none"}`);
    setError(null);
    setDone(null);
    try {
      await addFigure({
        data: {
          shareId,
          documentId,
          fieldKey,
          fieldLabel: EXTRACTION_FIELD_LABEL[fieldKey] ?? fieldKey,
          valueNumber: field.numeric ? numeric : null,
          valueText: field.numeric ? null : trimmed,
          period: period.trim() || null,
          note: "",
        },
      });
      setValue("");
      setPeriod("");
      setDone("Figure recorded on this file.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That figure could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-6">
      <SectionTitle>Evidence supplied</SectionTitle>
      <p className="-mt-2 mb-3 text-xs text-muted-foreground">
        Flag anything you want the business to replace or explain, or key in a figure you read yourself.
      </p>

      <ul className="divide-y divide-border text-sm">
        {documents.map((doc) => {
          const flagged = doc.status === "needs_review";
          return (
            <li key={doc.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  <span className="font-medium">{DOC_TYPE_LABEL[doc.doc_type] ?? doc.doc_type}</span>
                  <span className="block text-xs text-muted-foreground">{doc.name}</span>
                </span>
                <div className="flex items-center gap-2">
                  <Badge tone={flagged ? "warning" : doc.status === "received" ? "success" : "muted"}>
                    {flagged ? "needs review" : doc.status.replace("_", " ")}
                  </Badge>
                  {flagged ? (
                    <Button
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      disabled={busy === doc.id}
                      onClick={() => toggleFlag(doc, false)}
                    >
                      {busy === doc.id ? <Spinner /> : <FlagOff className="size-3.5" />} Clear flag
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-8 px-2 text-xs"
                      onClick={() => setOpenDoc(openDoc === doc.id ? null : doc.id)}
                    >
                      <Flag className="size-3.5" /> Flag
                    </Button>
                  )}
                </div>
              </div>

              {doc.notes ? (
                <p className="mt-2 flex gap-1.5 text-xs text-muted-foreground">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                  <span className="whitespace-pre-line">{doc.notes}</span>
                </p>
              ) : null}

              {openDoc === doc.id ? (
                <div className="mt-3 space-y-3 rounded-md border border-border bg-muted/30 p-3">
                  <div>
                    <Label htmlFor={`flag-note-${doc.id}`}>What needs attention?</Label>
                    <MicTextarea
                      id={`flag-note-${doc.id}`}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. The 2024 statement is unsigned — please upload the signed copy."
                      className="min-h-20"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button className="h-8 px-3 text-xs" disabled={busy === doc.id} onClick={() => toggleFlag(doc, true)}>
                      {busy === doc.id ? <Spinner /> : <Flag className="size-3.5" />} Send flag
                    </Button>
                    <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => setOpenDoc(null)}>
                      Cancel
                    </Button>
                  </div>

                  <div className="border-t border-border pt-3">
                    <p className="mb-2 flex items-center gap-2 text-xs font-medium">
                      <ClipboardList className="size-3.5 text-accent" /> Or key in a figure from this document
                    </p>
                    <FigureForm
                      idSuffix={doc.id}
                      fieldKey={fieldKey}
                      setFieldKey={setFieldKey}
                      value={value}
                      setValue={setValue}
                      period={period}
                      setPeriod={setPeriod}
                      busy={busy === `fig-${doc.id}`}
                      onSave={() => saveFigure(doc.id)}
                    />
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
        {documents.length === 0 ? <li className="py-3 text-muted-foreground">No documents supplied yet.</li> : null}
      </ul>

      <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
        <p className="mb-2 flex items-center gap-2 text-xs font-medium">
          <ClipboardList className="size-3.5 text-accent" /> Record a figure for this file
        </p>
        <FigureForm
          idSuffix="general"
          fieldKey={fieldKey}
          setFieldKey={setFieldKey}
          value={value}
          setValue={setValue}
          period={period}
          setPeriod={setPeriod}
          busy={busy === "fig-none"}
          onSave={() => saveFigure(null)}
        />
      </div>

      {error ? (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
      ) : null}
      {done ? <p className="mt-3 rounded-md bg-success/10 px-3 py-2 text-xs text-success">{done}</p> : null}
    </Card>
  );
}

function FigureForm(props: {
  idSuffix: string;
  fieldKey: string;
  setFieldKey: (v: string) => void;
  value: string;
  setValue: (v: string) => void;
  period: string;
  setPeriod: (v: string) => void;
  busy: boolean;
  onSave: () => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div>
        <Label htmlFor={`pf-key-${props.idSuffix}`}>Figure</Label>
        <Select
          id={`pf-key-${props.idSuffix}`}
          className="h-9 text-xs"
          value={props.fieldKey}
          onChange={(e) => props.setFieldKey(e.target.value)}
        >
          {EXTRACTION_FIELDS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor={`pf-val-${props.idSuffix}`}>Value</Label>
        <Input
          id={`pf-val-${props.idSuffix}`}
          className="h-9 text-xs"
          value={props.value}
          onChange={(e) => props.setValue(e.target.value)}
          placeholder="1,250,000"
        />
      </div>
      <div>
        <Label htmlFor={`pf-per-${props.idSuffix}`}>Period</Label>
        <Input
          id={`pf-per-${props.idSuffix}`}
          className="h-9 text-xs"
          value={props.period}
          onChange={(e) => props.setPeriod(e.target.value)}
          placeholder="FY2024"
        />
      </div>
      <div className="flex items-end">
        <Button className="h-9 w-full px-3 text-xs" disabled={props.busy} onClick={props.onSave}>
          {props.busy ? <Spinner /> : null} Save figure
        </Button>
      </div>
    </div>
  );
}
