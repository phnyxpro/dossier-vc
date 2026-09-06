import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listDossiers from "./tools/list-dossiers";
import getDossier from "./tools/get-dossier";
import listDocuments from "./tools/list-documents";
import createDossier from "./tools/create-dossier";
import updateDossier from "./tools/update-dossier";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "dossier-by-ventureble",
  title: "Dossier by Ventureble",
  version: "0.1.0",
  instructions:
    "Tools for Dossier by Ventureble, a capital-readiness and lender-pack preparation tool for Caribbean MSMEs. Use `list_dossiers` to find a financing dossier, `get_dossier` for its full contents (company, figures, readiness notes, dossier sections), `list_documents` for attached files and their AI reading status, `create_dossier` to start a new financing request, and `update_dossier` to revise the ask or narrative. All tools act as the signed-in user and only see that user's data.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listDossiers, getDossier, listDocuments, createDossier, updateDossier],
});
