import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/legal-page";
import { LEGAL_BY_KEY } from "@/lib/legal/content";

const doc = LEGAL_BY_KEY["ai-notice"];

export const Route = createFileRoute("/ai-notice")({
  head: () => legalHead(doc),
  component: () => <LegalPage doc={doc} />,
});
