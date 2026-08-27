# Ideal Day Lab

Turn the ingredients of an ideal day into exactly 1,440 editable minutes, then reveal the delightful yearly scale of those choices.

Status: **D2-exit candidate / D3 blocked on human and physical-device evidence.** See [the production audit](apps/ideal-day-lab/PRODUCTION-AUDIT.md).

## Product

- Natural-language and voice-assisted input with a deterministic private fallback.
- Integer-minute 24-hour conservation, shared-boundary editing, four snap modes, and 50-step undo/redo.
- Twenty sourced editorial comparisons with formula, units and rounding disclosure.
- A private IndexedDB library of up to 20 days with remix and reversible deletion.
- Privacy-safe Eazo sharing through the official `@eazo/sdk`, with a local JSON fallback.
- Mobile-first, keyboard-operable, reduced-motion aware, and offline-ready after first load.

## Run

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm test:e2e
pnpm dev
```

Node 24.20+ and pnpm 11.24 are required. The production bundle is emitted to `apps/ideal-day-lab/dist`.

## Stage truth

The application code and emulated mobile evidence are complete for the eight `DAY-REQ` contracts. D3 and D4 are intentionally not claimed until two physical-device runs, North American English and aesthetic reviewer signatures, Eazo Mobile AI/speech acceptance, share-intent research and release authorization are attached.

MIT licensed. Comparison content and the generated social card are recorded in the product rights ledger.
