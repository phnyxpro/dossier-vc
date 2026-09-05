# Closing the audit gaps

The audit's headline items that can actually be fixed in the product are account recovery, password strength, legal consent, trust/support information, and a few sign-in and 404 details. Alongside those, I'll run the backend security checks and write up what the audit couldn't see from outside.

## 1. Password recovery (currently missing)

- Add a "Forgot password?" link on the business sign-in card and on the capital-provider sign-in card.
- Reset request screen: enter email, always get the same neutral confirmation ("If an account exists for that address, a reset link is on its way") so it never reveals whether an account exists.
- New `/reset-password` page that opens from the emailed link and sets a new password, then signs the person in and sends them to their dashboard.
- Recovery links are single-use and expire; other sessions are ended once the password changes.

## 2. Stronger password rules

- Minimum raised from 6 to 12 characters, with a live strength meter and clear rules text.
- Reject obvious/common passwords and require a mix beyond a single dictionary word.
- Show a plain-language error rather than a raw technical message when sign-in fails.

## 3. Legal and AI-processing consent at sign-up

- New public pages: Terms of Use, Privacy Notice, and an AI & Data Processing notice (what the AI reads, where documents are stored, that a person confirms every figure before it reaches a dossier).
- The create-account form gets a required tickbox linking to all three, plus confirmation that the person is authorised to upload the company's information.
- Each acceptance is recorded with the person, the timestamp and the version of the document they agreed to.

## 4. Trust and support information

- A footer on both sign-in screens and the 404 page linking to Security, Privacy, Terms, Help/Contact and an Accessibility statement.
- New Security page describing encryption, private document storage, per-account isolation and how to report an issue.
- Contact details and a support email on the Help page.

## 5. Sign-in form robustness

- Google and mode-switch buttons get explicit non-submit types so a JavaScript hiccup can't fire a stray page submission.
- The form posts through the app's auth call only; add an inline message if the browser blocks scripts.

## 6. Route and 404 polish

- The 404's "Go to dashboard" becomes "Go to business sign-in" when nobody is signed in, and keeps the dashboard wording when they are.
- Remember the page someone was heading to before sign-in and return them there afterwards.

## 7. Security verification of the protected side

- Run the backend security scan and the database linter; fix anything they flag.
- Re-check that every request-scoped table (documents, extracted figures, readiness notes, dossier sections, shares, reviews, scores) restricts rows to the owning account and its request, and that document downloads use short-lived signed links only.
- Add automated negative tests proving one account cannot read another's request, documents, figures or dossier, and that a withdrawn share stops working immediately.
- Confirm only human-confirmed figures feed readiness and dossier output.
- Produce a short written summary of what these checks prove, so the audit's "unverified" section can be answered.

## Not included here

Malware scanning of uploads, immutable dossier versioning with approval, full WCAG 2.2 AA and accessible-PDF certification, and the external privacy/vendor/incident-response reviews are larger workstreams. I can plan any of them next; contrast and text-size fixes on the small grey disclaimer text will be handled as part of item 4.

## Technical notes

- New routes: `reset-password`, `terms`, `privacy`, `ai-notice`, `security`, `help`, `accessibility`, plus a `forgot-password` view on `auth.tsx`.
- Recovery uses `resetPasswordForEmail` with `redirectTo: ${origin}/reset-password`, and `updateUser({ password })` on the recovery page; the reset route stays public.
- Consent records go in a new `legal_acceptances` table (user id, document key, version, accepted_at) with row-level security scoped to the signer and explicit grants.
- Password policy enforced client-side with a shared validator plus server-side check in the sign-up path.
- Isolation tests run with Playwright/vitest against two seeded accounts.
