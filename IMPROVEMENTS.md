# Improvements

Review of the current state and what each fix buys us. Ordered by impact.

## 1. Component tests (highest impact)

**Now:** 48 tests, all on the engine. The component layer has zero coverage and
neither app ships test deps.

**Gap:** `DatePicker.tsx` (and its Vue twin) owns keyboard handling, open/close,
prop sync, portal positioning, and click-outside dismissal — none of it tested.
A regression in arrow-key navigation or `value`/`onChange` sync ships silently.

**Fix:** add `@testing-library` + `jsdom`. Cover keyboard nav, selection,
controlled-value sync, and popover open/close for both apps.

**Gain:** the riskiest, hardest-to-reason-about code gets a safety net.
Refactors stop being scary.

## 2. Grid accessibility (correctness bug)

**Now:** `DatePickerGrid` renders `role="grid"` with weekday headers and 42
`gridcell`s as flat children — no `role="row"` wrappers.

**Gap:** the WAI-ARIA grid pattern requires rows. Screen readers can't announce
row/column position correctly, so keyboard users lose their place in the
calendar.

**Fix:** wrap the weekday headers in one `role="row"`, and each week (7 cells)
in its own `role="row"`.

**Gain:** the picker actually works for assistive tech — table-stakes for a
date picker, and the kind of thing a UI/UX challenge is graded on.

## 3. CI pipeline

**Now:** no `.github/workflows`. Tests, lint, and build run only when someone
remembers locally.

**Fix:** GitHub Actions running `test` + `lint` + `build` on every PR. The pure
engine makes the run fast and cheap.

**Gain:** broken changes get caught before merge instead of in review or prod.

## 4. Cache `Intl.DateTimeFormat` (performance)

**Now:** `engine.ts` builds a new `Intl.DateTimeFormat` on every `formatDayLabel`
and `formatDisplay` call. The grid calls `formatDayLabel` for all 42 cells on
every render — 42 formatter constructions per render.

**Fix:** memoize formatters by locale in a `Map`, rebuild only when the locale
changes.

**Gain:** `Intl.DateTimeFormat` construction is expensive; this drops the hot
render path to a map lookup. Smoother navigation, especially on low-end devices.

## 5. Shared keyboard logic (maintainability)

**Now:** ~60 lines of key→action mapping live in `DatePicker.tsx`, duplicated in
the Vue shell. `CORE_DESIGN.md` says "never duplicate" — keyboard handling
slipped through.

**Fix:** move the key→action mapping into a shared engine helper. Apps keep only
event wiring.

**Gain:** one source of truth for keyboard behavior; React and Vue can't drift
apart.

## 6. Stop committing build artifacts (cleanup)

**Now:** `apps/*/.tmp/*.tsbuildinfo` are tracked in git.

**Fix:** add them to `.gitignore` and untrack.

**Gain:** cleaner diffs, no spurious churn.

---

**Suggested order:** 1 → 2 → 3 first (safety net + correctness + automation),
then 4 → 5 → 6 as polish.
