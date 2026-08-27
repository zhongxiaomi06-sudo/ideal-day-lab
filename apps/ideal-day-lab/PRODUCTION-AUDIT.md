# Ideal Day Lab — production audit

Audit date: 2026-08-27  
Target: D2-exit candidate; D3/D4 not claimed  
Product requirements in scope: DAY-REQ-001 through DAY-REQ-008

## Outcome

The implementation is complete enough to enter `D2-exit-candidate`. It is not authorized for D3 or D4 because those gates require evidence that cannot be produced by code alone: two physical-device runs, North American English review, human `aestheticLevel=enjoy` signature, target-user share-intent testing, Eazo Mobile AI/speech acceptance, and release approval.

## Requirement audit

| Requirement | Implementation evidence | Automated evidence | Result |
|---|---|---|---|
| DAY-REQ-001 | Static English input shell; enhancements load after first interaction | Playwright on Pixel 7 and iPhone 12 profiles | PASS (emulated) |
| DAY-REQ-002 | Text up to 2,000 characters; one speech request per session; text remains after denial; IndexedDB repository | Mobile E2E build/edit/save path | PASS WITH CONDITION: Eazo-native transcription needs host acceptance |
| DAY-REQ-003 | Five-second host budget; strict key/category/time validation; inert rendering; deterministic local fallback | Vitest rejects unknown/HTML-like fields and accepts strict 1,440-minute draft | PASS |
| DAY-REQ-004 | Integer-minute contiguous blocks, shared-boundary equal exchange, 1/5/15/30 snap, 50 undo states, keyboard buttons | Vitest exact 09:00→09:15 branch and `TIME_OVERLAP`; mobile E2E | PASS |
| DAY-REQ-005 | Twenty-record approved editorial ledger; unit/formula/source/rounding disclosure; five live comparisons | Vitest exact `60×365÷120=182.5` | PASS |
| DAY-REQ-006 | IndexedDB plan limit 20; no automatic eviction; duplicate, rename, reversible delete | Library E2E and repository guard | PASS |
| DAY-REQ-007 | Share sanitizer only emits category/minutes/color/comparison IDs; official `@eazo/sdk@0.22.8` compose; JSON fallback | Privacy snapshot excludes source text/title/notes/plan/block IDs | PASS WITH CONDITION: Eazo Mobile acceptance pending |
| DAY-REQ-008 | Local classifier/editor/comparisons/IndexedDB have no network dependency; production service worker uses versioned cache | Production build and offline architecture inspection | PASS WITH CONDITION: physical-device offline reopen pending |

## Design and accessibility audit

- 390×844 browser audit: primary CTA bottom = 739.5 px inside 844 px viewport; horizontal overflow = 0 px.
- First viewport answers what it is, what to do, and what the user gets; primary action is visible without scrolling.
- Visual system: near-black editorial ground, acid-lime task accent, one serif emotional phrase, mono evidence labels, thin-grid time structure, no decorative stock imagery.
- Touch controls have a 44 px minimum; every duration adjustment has non-drag buttons; focus outlines are 3 px high-contrast lime.
- Timeline has a full text alternative. State changes are announced through a polite live region. Reduced-motion disables transitions.
- Default source content is English and no business rule depends on rendered language. Browser auto-translation seen during audit is user-agent behavior, not mixed product copy.

## Engineering and privacy audit

- Production Eazo share integration uses the official SDK and loads its large compose surface only on demand; initial application JavaScript is about 68 KB gzip.
- No account, identity, raw audio, source text, title, notes, or device ID enters the default share payload.
- IndexedDB schema version is 2. Invalid stored plans are excluded rather than silently mutated.
- The service worker is cache-first after a successful response and falls back to the application shell offline.
- The social preview is a project-authored 1200×630 asset and is recorded in the rights ledger.

## Test run summary

- Domain/contract tests: 8 passed.
- Mobile end-to-end: 8 passed across Pixel 7 and iPhone 12 profiles.
- TypeScript: passed.
- Lint: passed.
- Production build: passed.
- Manual browser QA: compose, editor and scale screens inspected at 390×844; no application console errors.

## Gate decision

- D2-entry: PASS.
- D2-exit: CANDIDATE / PASS WITH CONDITIONS. Remaining conditions are listed above and are not safely inferable.
- D3: BLOCKED by human/device/Eazo acceptance evidence.
- D4: BLOCKED by D3 plus release authorization, immutable production URL, monitoring and post-release review.
