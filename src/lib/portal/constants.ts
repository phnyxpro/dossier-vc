export const REVIEW_STATUSES = [
  { key: "reviewing", label: "Under review", tone: "primary" as const, hint: "Still working through the pack" },
  { key: "info_needed", label: "More information needed", tone: "warning" as const, hint: "Waiting on documents or answers" },
  { key: "interested", label: "Interested — progressing", tone: "success" as const, hint: "Moving to full credit assessment" },
  { key: "declined", label: "Not proceeding", tone: "danger" as const, hint: "Closing the file for now" },
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number]["key"];

export const REVIEW_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  REVIEW_STATUSES.map((s) => [s.key, s.label]),
);

export const REVIEW_STATUS_TONE: Record<string, "primary" | "warning" | "success" | "danger"> =
  Object.fromEntries(REVIEW_STATUSES.map((s) => [s.key, s.tone]));

export const SCORE_CRITERIA = [
  { key: "financials", label: "Financial strength" },
  { key: "security", label: "Security cover" },
  { key: "management", label: "Management and governance" },
  { key: "documentation", label: "Documentation quality" },
] as const;

export type ScoreKey = (typeof SCORE_CRITERIA)[number]["key"];

export const SCORE_LABEL: Record<number, string> = {
  1: "Weak",
  2: "Below average",
  3: "Acceptable",
  4: "Strong",
  5: "Very strong",
};

/** Short, readable share code such as VNT-4KQ9. */
export function makeShareCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `VNT-${out}`;
}
