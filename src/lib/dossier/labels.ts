import { useCallback, useMemo } from "react";
import { useLanguage } from "@/lib/i18n";
import {
  DOC_TYPE_LABEL,
  REQUEST_TYPE_LABEL,
} from "@/lib/dossier/constants";

const STATUS_FALLBACK: Record<string, string> = {
  draft: "Draft",
  in_review: "In review",
  ready: "Ready",
  submitted: "Submitted",
};

const READINESS_FALLBACK: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  ready: "Ready",
};

const DOC_STATUS_FALLBACK: Record<string, string> = {
  received: "Received",
  needs_review: "Needs review",
  missing: "Missing",
};

/** Translated labels for the domain enums shown across the app. */
export function useLabels() {
  const { t } = useLanguage();

  const requestType = useCallback(
    (key: string) => t(`reqtype.${key}`, REQUEST_TYPE_LABEL[key] ?? key),
    [t],
  );
  const status = useCallback(
    (key: string) => t(`status.${key}`, STATUS_FALLBACK[key] ?? key.replace(/_/g, " ")),
    [t],
  );
  const readiness = useCallback(
    (key: string) => t(`readiness.${key}`, READINESS_FALLBACK[key] ?? key.replace(/_/g, " ")),
    [t],
  );
  const docType = useCallback(
    (key: string | null | undefined) =>
      key
        ? t(`doctype.${key}`, DOC_TYPE_LABEL[key] ?? key)
        : t("doctype.unclassified", "Unclassified"),
    [t],
  );
  const docStatus = useCallback(
    (key: string) => t(`docstatus.${key}`, DOC_STATUS_FALLBACK[key] ?? key.replace(/_/g, " ")),
    [t],
  );

  return useMemo(
    () => ({ requestType, status, readiness, docType, docStatus }),
    [requestType, status, readiness, docType, docStatus],
  );
}
