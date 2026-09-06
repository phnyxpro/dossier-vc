# Security verification — answers to the external audit

Date: 6 September 2026. Environment: Lovable Cloud project serving both preview and https://dossier-vc.lovable.app.

## What was checked and what it proves

| Check | Method | Result |
| --- | --- | --- |
| Automated backend security scan | Platform security scanner | No issues found |
| Database linter (RLS, permissive policies, exposed columns) | Platform linter | No issues found |
| Cross-account isolation (negative test) | Executed as role `authenticated` with a JWT `sub` of an account that owns nothing, against every request-scoped table | 0 rows returned from `capital_requests`, `companies`, `documents`, `extracted_fields`, `readiness_notes`, `dossier_sections`, `dossier_shares`, `provider_reviews`, `provider_review_scores`, `profiles`, `legal_acceptances`, `push_subscriptions` |
| Signed-out access (negative test) | Executed as role `anon` | 0 rows from requests, documents and dossier sections |
| Owner access (positive control) | Executed as the owning account | 2 requests, 20 documents, 12 confirmed and 3 pending figures — proving the zero results above are policy enforcement, not empty tables |
| Only human-confirmed figures reach output | Code review of `readiness.ts`, `assess.functions.ts`, `dossier.functions.ts`, `portal.functions.ts` | Every consumer filters `status = 'confirmed'`; pending AI values are never scored, never narrated, never shared |
| Document access | Storage bucket `documents` is private; downloads issue short-lived signed URLs to the signed-in session | No public listing, no public object URL |
| Service credentials | Service-role key and AI gateway key are server-side secrets, read inside handlers only | Never present in client bundles |

Every request-scoped table carries a `user_id` column with `FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`, plus a foreign key to `capital_requests`, so a row is reachable only by its owner and only through its own request.

## Provider sharing

- `dossier_shares` is owner-managed; providers get read access only to shares where `provider_id = auth.uid()`.
- Withdrawing a share clears the provider link, so subsequent reads return nothing.
- Provider private scores are readable only by the provider that wrote them; the business owner sees the review, not the private scoring.

## Account security changes shipped with this review

- Minimum password length raised from 6 to 12, with class mixing, common-password rejection and a strength meter.
- Breached-password screening (HIBP) enabled at the auth service.
- Self-service password reset with a neutral response, single-use expiring link, and sign-out of all other sessions on completion.
- Versioned consent recorded in `legal_acceptances` (terms, privacy, AI processing, upload authority) with user, document key, version and timestamp; insert-and-read only, no edit or delete.
- Public Terms, Privacy, AI notice, Security, Help and Accessibility pages linked from both sign-in screens and the 404 page.
- Explicit `type="button"` on non-submit controls; the sign-in form has a single submit path.

## Still outstanding (not covered by this verification)

- Malware scanning and quarantine of uploads.
- Immutable dossier versioning with approval and expiry.
- Independent penetration testing and dependency-security gating in CI.
- Full WCAG 2.2 AA audit and tagged, accessible PDF exports.
- Privacy, vendor, backup and incident-response reviews with legal sign-off.
