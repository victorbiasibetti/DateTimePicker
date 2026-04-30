# Headless DatePicker

A date picker whose calendar logic is fully decoupled from the UI
framework. The engine is plain TypeScript with **zero runtime
dependencies**. Two example apps consume the same engine to prove
the point.

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

## Design

`doc/CORE_DESIGN.md` covers how the engine works, why it is shaped
this way, and what is intentionally out of scope.
