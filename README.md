# Headless DatePicker

A date picker whose calendar logic is fully decoupled from the UI
framework. The engine is plain TypeScript with **zero runtime
dependencies**. Two example apps consume the same engine to prove
the point.

## Live demos

- Vue 3: https://date-time-picker-vue-three.vercel.app/
- React 19: https://date-time-picker-react.vercel.app/

## What's in the box

```
src/
├── engine/        # framework-agnostic core (the whole challenge)
└── styles/        # shared CSS Custom Properties theme

apps/
├── vue/           # Vue 3 example — useDatePicker composable + <DatePicker>
└── react/         # React 19 example — useDatePicker hook + <DatePicker>
```

Both apps import the engine via the `@datepicker/core` alias —
same source, same behaviour, framework-native bindings.

## Quick start

```bash
npm install
npm run dev:vue        # Vue demo (http://localhost:5173)
npm run dev:react      # React demo
npm test               # 48 engine unit tests
```

See `apps/vue/README.md` and `apps/react/README.md` for per-app
details.

## Highlights

- **Pure TS engine** — Temporal API where available, `Date` fallback.
- **Multi-locale** — `Intl.DateTimeFormat` everywhere, `weekStartsOn`
  derived from the locale.
- **Accessible** — full keyboard support (arrows, PgUp/PgDn, Home/End,
  Enter, Esc), `role="grid"`, `aria-selected`.
- **Themable** — every colour, radius, and dimension is a CSS variable
  under `--dp-*`.

## State management between Engine and Component

The engine owns the canonical state and exposes a `subscribe(listener)`
method that fires after every mutation with a fresh, immutable
`CalendarState` snapshot. Components never mutate state directly — they
dispatch intent through `actions` and read derived values from the
snapshot.

- **Vue** mirrors snapshots into a `shallowRef` (`useDatePicker`
  composable). A new top-level object per change triggers Vue's
  reactivity without deep tracking.
- **React** wires the same `subscribe` into `useSyncExternalStore`
  inside the `useDatePicker` hook — no extra state, no effects.

The engine could drop into Solid, Svelte, or vanilla DOM with the same
contract, no changes.

## Notes on the Temporal API

The engine prefers `Temporal.PlainDate` when the runtime exposes it
(Firefox Nightly, experimental V8 builds as of 2026), falling back to
a `Date`-backed adapter. Two observations from building against
Temporal:

1. **Native immutability removes a class of bugs.** `addMonths(1)` of
   January 31 yields February 28/29 automatically — no manual
   `Math.min(day, daysInMonth(...))` clamping. The legacy adapter
   replicates the behaviour explicitly.
2. **`dayOfWeek` convention differs.** Temporal returns 1=Mon … 7=Sun;
   `Date` returns 0=Sun … 6=Sat. The adapter normalises to 0-6 at the
   boundary so engine logic stays invariant to backend.

No polyfill is bundled — the legacy adapter covers every modern
runtime. See `doc/CORE_DESIGN.md` for the full rationale and limitations.

## How to run

```bash
npm install              # one install, npm workspaces
npm run dev:vue          # Vue demo
npm run dev:react        # React demo
npm test                 # engine unit tests
npm run lint             # lint both apps
npm run build:vue        # production build
npm run build:react
```

Per-app commands also work — see `apps/vue/README.md` and
`apps/react/README.md`.

## Design

`doc/CORE_DESIGN.md` covers how the engine works, why it is shaped
this way, and what is intentionally out of scope.
