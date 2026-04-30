# Headless DatePicker

A functional date picker whose calendar logic is fully decoupled from the
UI framework. The engine is plain TypeScript with zero third-party
dependencies; two thin app shells — Vue 3 and React 19 — bind that single
engine into framework-native components.

## At a glance

- **Pure TS engine** — navigation, selection, focus, grid layout, and
  locale-aware formatting, all framework-agnostic.
- **Vue 3 wrapper** (`apps/vue`) — `useDatePicker` composable plus a
  `<DatePicker>` component (input + teleported popover).
- **React 19 wrapper** (`apps/react`) — `useDatePicker` hook
  (`useSyncExternalStore`) plus a `<DatePicker>` component (input +
  portal popover).
- **Multi-locale** — defaults to `en-US`, switchable at runtime; weekday
  start derives from the locale via `Intl.Locale.getWeekInfo()` with a
  CLDR-backed fallback.
- **Temporal-first** — uses the native `Temporal` API when available,
  falls back to a `Date`-backed adapter that mirrors the same surface.
- **Accessible** — full keyboard support (arrows, PgUp/PgDn, Home/End,
  Esc, Enter), `role="grid"`, `aria-selected`, focus restoration on close.
- **Themable** — every colour, radius, and dimension is a CSS Custom
  Property under the `--dp-*` namespace.
- **Tested** — 48 unit tests covering the engine and the Temporal adapter.

## Repository layout

```
/
├── src/                       # framework-agnostic core (no Vue, no React)
│   ├── engine/                # types, temporal adapter, locale, engine, index
│   │   └── __tests__/         # vitest specs
│   └── styles/
│       └── datepicker.css     # shared CSS Custom Properties + BEM classes
├── apps/
│   ├── vue/                   # Vue 3 + Vite app
│   └── react/                 # React 19 + Vite app
├── doc/
│   └── plans/                 # historical planning docs
├── package.json               # npm workspaces root
├── tsconfig.json              # engine-side typecheck config
└── vitest.config.ts           # engine tests
```

Both apps consume the engine through path aliases (`@datepicker/core` →
`src/engine`) wired in their respective `vite.config.ts` and
`tsconfig.app.json`. The engine source is the single source of truth — no
build artifact, no symlink, no duplication.

## Run it

One install at the root sets up every workspace:

```bash
npm install
```

| Script              | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `npm test`          | Run engine unit tests (vitest)                    |
| `npm run dev:vue`   | Start the Vue demo at http://localhost:5173       |
| `npm run dev:react` | Start the React demo at http://localhost:5173     |
| `npm run build:vue` | Production build for the Vue app                  |
| `npm run build:react` | Production build for the React app              |
| `npm run lint`      | Run lint across every workspace that defines it   |

Per-app commands are also available, e.g.
`npm run build --workspace=apps/vue`.

## Architecture

### State management between Engine and frameworks

The engine owns the canonical state. It exposes:

- `getState()` → current immutable `CalendarState` snapshot
- `getGrid()` → memoised 6×7 `DayCell` array
- `subscribe(listener)` → returns `unsubscribe`; the listener fires after
  every mutation with a brand-new snapshot reference

**Vue side** (`apps/vue/src/composables/useDatePicker.ts`):

```ts
const engine = new DatePickerEngine(options)
const state = shallowRef(engine.getState())

const unsubscribe = engine.subscribe((next) => {
  state.value = next
})

onScopeDispose(unsubscribe)
```

A `shallowRef` is enough — the engine emits a fresh top-level object each
time, so Vue's `triggerRef` semantics handle re-renders correctly without
deep reactivity overhead.

**React side** (`apps/react/src/hooks/useDatePicker.ts`):

```ts
const [engine] = useState(() => new DatePickerEngine(options))

const state = useSyncExternalStore(
  (notify) => engine.subscribe(notify),
  () => engine.getState(),
)
```

`useSyncExternalStore` pairs naturally with the subscribe pattern — React
subscribes once, the engine emits an immutable snapshot per change, React
schedules a re-render. No `useState` mirroring, no effects, no manual
diffing.

In both apps, components dispatch user intent through a returned
`actions` object, never mutating state directly. The same engine could
drop into vanilla DOM (`subscribe` + manual rerender), Solid, Svelte, or
any other consumer with no changes.

### Notes on the Temporal API

`src/engine/temporal.ts` feature-detects `globalThis.Temporal`:

- **When available** (Firefox Nightly, experimental V8 builds as of 2026):
  the adapter wraps `Temporal.PlainDate`. Arithmetic is delegated to
  `add({ days, months, years })`, comparison uses
  `Temporal.PlainDate.compare`. All operations are immutable by
  construction, eliminating the entire class of timezone bugs that the
  legacy `Date` introduces.
- **When absent**: the adapter falls back to a `Date`-backed
  `LegacyPlainDate`. We pin every operation to local-midnight `Date`
  instances — the calendar grid is wall-clock, not UTC, so we never go
  through `toISOString()` or any UTC accessor for display logic.

Observations from building against Temporal:

1. The 1-7 weekday convention (`dayOfWeek: 1=Mon … 7=Sun`) is normalised
   to the engine's 0-6 (Sun=0) convention at the adapter boundary so the
   rest of the engine stays consistent regardless of backend.
2. Temporal's immutability means `addMonths(1)` of January 31 produces
   February 28/29 automatically — no manual clamping. The legacy adapter
   reproduces this behaviour explicitly via
   `Math.min(this.day, daysInMonth(...))`.
3. `Temporal.PlainDate.from('YYYY-MM-DD')` throws on invalid input, so
   the `parsePlainDate` helper wraps it in `try/catch` to match the
   legacy adapter's `null` contract.
4. No polyfill is bundled — the goal is to demonstrate native Web
   Platform usage, not to ship a compatibility shim. The `Date` fallback
   covers every modern runtime.

### Locale support

The engine produces locale-aware labels via `Intl.DateTimeFormat`:

| Token              | Format                     | Used for              |
| ------------------ | -------------------------- | --------------------- |
| `monthYearLabel`   | `{ month: 'long', year }`  | popover header        |
| `weekdayLabels[]`  | `{ weekday: 'short' }`     | column headers        |
| `formatDayLabel()` | `{ dateStyle: 'full' }`    | day-cell `aria-label` |
| `formatDisplay()`  | `{ dateStyle: 'medium' }`  | text input            |

`weekStartsOn` defaults are derived per-locale through
`Intl.Locale.prototype.getWeekInfo()` (with a small CLDR-backed fallback
table for runtimes that don't expose it). Pass an explicit
`weekStartsOn={0|1|...|6}` to override; the explicit value stays pinned
across `setLocale` calls.

### Keyboard support

The popover implements the WAI-ARIA grid pattern in both apps:

| Keys                         | Action                              |
| ---------------------------- | ----------------------------------- |
| `←` / `→`                    | move focus ±1 day                   |
| `↑` / `↓`                    | move focus ±7 days                  |
| `Home` / `End`               | start / end of current week         |
| `PageUp` / `PageDown`        | previous / next month               |
| `Shift + PageUp / PageDown`  | previous / next year                |
| `Enter` / `Space`            | select the focused day              |
| `Escape`                     | close popover, restore input focus  |
| `Tab`                        | exit popover (closes it)            |

On the input itself: `ArrowDown`, `Enter`, or `Space` open the popover;
`Escape` closes it.

### Theming

Every visual property is a CSS Custom Property scoped under `.dp-root`:

```css
.my-app .dp-root {
  --dp-accent: hotpink;
  --dp-radius: 4px;
  --dp-cell-size: 32px;
  /* …everything else inherited from the defaults */
}
```

The full token list lives in `src/styles/datepicker.css` (shared between
both apps). Each demo (`apps/vue/src/App.vue`,
`apps/react/src/App.tsx`) ships a fully reskinned example that overrides
only the tokens — no component CSS is touched.

## Component APIs

### Vue

```ts
interface DatePickerProps {
  modelValue?: string | null         // ISO 'YYYY-MM-DD' or null
  min?: string | null
  max?: string | null
  locale?: string                    // BCP-47, default 'en-US'
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  placeholder?: string
  disabled?: boolean
  name?: string
  id?: string
  formatInput?: (date: PlainDateLike | null) => string
}

// Emits
'update:modelValue'   // ISO string or null — supports v-model
'open'
'close'
```

### React

```ts
interface DatePickerProps {
  value?: string | null              // ISO 'YYYY-MM-DD' or null
  onChange?: (value: string | null) => void
  min?: string | null
  max?: string | null
  locale?: string
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  placeholder?: string
  disabled?: boolean
  name?: string
  id?: string
  formatInput?: (date: PlainDateLike | null) => string
  onOpen?: () => void
  onClose?: () => void
}
```

## Engine API (framework-agnostic)

```ts
import { createDatePicker, type DatePickerEngineAPI } from '@datepicker/core'

const engine: DatePickerEngineAPI = createDatePicker({
  initialDate: '2026-04-30',
  locale: 'en-US',
  min: '2026-01-01',
  max: '2026-12-31',
})

const unsubscribe = engine.subscribe((state) => {
  console.log(state.monthYearLabel, state.selected?.toISO())
})

engine.goToNextMonth()
engine.select('2026-05-15')
engine.setLocale('de-DE')

unsubscribe()
```

See `src/engine/types.ts` for the full surface (navigation, focus
movement, formatting helpers, etc.).
