# Headless DatePicker

A functional date picker whose calendar logic is fully decoupled from the UI
framework. The engine is plain TypeScript with zero third-party dependencies;
the Vue 3 layer is a thin wrapper that bridges engine state into Vue's
reactivity system.

## At a glance

- **Pure TS engine** — navigation, selection, focus, grid layout, and
  locale-aware formatting, all framework-agnostic.
- **Vue 3 wrapper** — `useDatePicker` composable plus a `<DatePicker>`
  component (input + teleported popover).
- **Multi-locale** — defaults to `en-US`, switchable at runtime; weekday
  start derives from the locale via `Intl.Locale.getWeekInfo()` with a
  CLDR-backed fallback.
- **Temporal-first** — uses the native `Temporal` API when available, falls
  back to a `Date`-backed adapter that mirrors the same surface.
- **Accessible** — full keyboard support (arrows, PgUp/PgDn, Home/End, Esc,
  Enter), `role="grid"`, `aria-selected`, focus restoration on close.
- **Themable** — every colour, radius, and dimension is a CSS Custom
  Property under the `--dp-*` namespace.
- **Tested** — 48 unit tests covering the engine and the Temporal adapter.

## Run it

```bash
npm install
npm run dev      # start the demo at http://localhost:5173
npm run build    # production build (vue-tsc + vite)
npm test         # vitest run
npm run lint     # eslint --fix
```

## Architecture

```
src/
├── engine/                   # framework-agnostic core (no Vue, no DOM)
│   ├── types.ts              # public interfaces (DayCell, CalendarState, ...)
│   ├── temporal.ts           # Temporal/Date adapter + Month enum-like
│   ├── locale.ts             # weekStartsOn derivation
│   ├── engine.ts             # DatePickerEngine class
│   ├── index.ts              # barrel export
│   └── __tests__/            # vitest specs
├── composables/
│   └── useDatePicker.ts      # Vue bridge (subscribe → shallowRef)
├── components/DatePicker/
│   ├── DatePicker.vue        # public component (input + popover)
│   ├── DatePickerPopover.vue # header + grid + footer
│   └── DatePickerGrid.vue    # 6×7 grid (presentational only)
└── styles/datepicker.css     # CSS custom-property tokens + BEM classes
```

### State management between Engine and Component

The engine owns the canonical state. It exposes:

- `getState()` → current immutable `CalendarState` snapshot
- `getGrid()` → memoised 6×7 `DayCell` array
- `subscribe(listener)` → returns `unsubscribe`; the listener fires after
  every mutation with a brand-new snapshot reference

The Vue side is intentionally thin:

```ts
// useDatePicker.ts (excerpt)
const engine = new DatePickerEngine(options)
const state = shallowRef(engine.getState())

const unsubscribe = engine.subscribe((next) => {
  state.value = next
})

onScopeDispose(unsubscribe)
```

A `shallowRef` is enough — the engine emits a fresh top-level object each
time, so Vue's `triggerRef` semantics handle re-renders correctly without
deep reactivity overhead. Components dispatch user intent through the
returned `actions`, never mutating state directly.

The same engine could drop into React (`useSyncExternalStore`),
plain DOM (`subscribe` + manual rerender), or any other consumer with no
changes.

### Notes on the Temporal API

`src/engine/temporal.ts` feature-detects `globalThis.Temporal`:

- **When available** (Firefox Nightly, experimental V8 builds as of 2026):
  the adapter wraps `Temporal.PlainDate`. Arithmetic is delegated to
  `add({ days, months, years })`, comparison uses `Temporal.PlainDate.compare`.
  All operations are immutable by construction, eliminating the entire
  class of timezone bugs that the legacy `Date` introduces.
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
   reproduces this behaviour explicitly via `Math.min(this.day, daysInMonth(...))`.
3. `Temporal.PlainDate.from('YYYY-MM-DD')` throws on invalid input, so the
   `parsePlainDate` helper wraps it in `try/catch` to match the legacy
   adapter's `null` contract.
4. No polyfill is bundled — the goal is to demonstrate native Web Platform
   usage, not to ship a compatibility shim. The `Date` fallback covers
   every modern runtime.

### Locale support

```vue
<DatePicker v-model="value" locale="pt-BR" />
```

The engine produces locale-aware labels via `Intl.DateTimeFormat`:

| Token              | Format                     | Used for                            |
| ------------------ | -------------------------- | ----------------------------------- |
| `monthYearLabel`   | `{ month: 'long', year }`  | popover header                      |
| `weekdayLabels[]`  | `{ weekday: 'short' }`     | column headers                      |
| `formatDayLabel()` | `{ dateStyle: 'full' }`    | day-cell `aria-label`               |
| `formatDisplay()`  | `{ dateStyle: 'medium' }`  | text input                          |

`weekStartsOn` defaults are derived per-locale through
`Intl.Locale.prototype.getWeekInfo()` (with a small CLDR-backed fallback
table for runtimes that don't expose it). Pass an explicit
`weekStartsOn={0|1|...|6}` to override; the explicit value stays pinned
across `setLocale` calls.

### Keyboard support

The popover implements the WAI-ARIA grid pattern:

| Keys                         | Action                            |
| ---------------------------- | --------------------------------- |
| `←` / `→`                    | move focus ±1 day                 |
| `↑` / `↓`                    | move focus ±7 days                |
| `Home` / `End`               | start / end of current week       |
| `PageUp` / `PageDown`        | previous / next month             |
| `Shift + PageUp / PageDown`  | previous / next year              |
| `Enter` / `Space`            | select the focused day            |
| `Escape`                     | close popover, restore input focus|
| `Tab`                        | exit popover (closes it)          |

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

The full token list lives in `src/styles/datepicker.css`. The demo
(`src/App.vue`) ships an example showing a fully reskinned picker that
overrides only the tokens — no component CSS is touched.

## Component API

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
'update:modelValue'  // ISO string or null — supports v-model
'open'
'close'
```

## Engine API (advanced)

The engine is exported from `src/engine` for non-Vue consumers:

```ts
import { createDatePicker, type DatePickerEngineAPI } from './engine'

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
