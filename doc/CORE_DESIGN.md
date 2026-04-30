# DatePicker Core — Design

The engine at `src/engine/` owns all calendar logic. Both apps under
`apps/*` are thin shells. Change behaviour here, never duplicate it.

## Public surface

```ts
PlainDateLike        // immutable (year, month, day) + addX methods
DayCell              // one grid cell + flags (selected, today, …)
CalendarState        // snapshot — replaced wholesale on every change
DatePickerOptions    // constructor input
DatePickerEngineAPI  // state reads, navigation, selection, focus,
                     // configuration, formatting
```

Full types live in `src/engine/types.ts`. `createDatePicker(options?)`
is the entry point.

## How it works

```
engine ── commit(partial) ──► new immutable CalendarState
   │                              │
   │                              ├─► invalidate gridCache
   │                              └─► fan out to listeners
   │
   └── subscribe(fn) → Unsubscribe
```

- **Immutable snapshots.** Every mutation produces a new top-level
  `CalendarState`. React's `useSyncExternalStore` and Vue's `triggerRef`
  diff by reference, so this drives re-renders for free.
- **Subscribe pattern.** One outward channel — `subscribe(listener)`.
  No two-way binding, no observable lib.
- **Grid is always 42 cells (6×7).** Pages never reflow when changing
  month. Trailing/leading days are real `DayCell`s with
  `inCurrentMonth: false`.
- **Single-slot grid cache.** Keyed by a fingerprint of display-relevant
  fields. Realistic UIs only show one grid at a time.
- **View vs focus are independent.** `viewYear/viewMonth` is the visible
  page; `focused` is the keyboard cursor. Usually they move together,
  but the state machine never couples them.

## Date backing — `Temporal` or `Date`

`PlainDateLike` is a small interface (`year`, `month`, `day`,
`dayOfWeek`, `addDays/Months/Years`, `compare`, `equals`, `toISO`,
`toNativeDate`). Two backings sit behind it:

1. `Temporal.PlainDate` when `globalThis.Temporal` exists.
2. `Date`-backed `LegacyPlainDate` everywhere else.

Months are 1-12 (matches Temporal). `dayOfWeek` is normalised to
0=Sunday … 6=Saturday at the adapter boundary so engine code never has
to know which backing is active.

No polyfill is bundled — the legacy adapter covers every modern runtime
correctly. Drop the legacy branch the day Temporal ships universally.

## Locale

Three Intl entry points, all driven by the active BCP-47 tag:

- `monthYearLabel` — `{ month: 'long', year }` (popover header)
- `weekdayLabels[]` — `{ weekday: 'short' }` (column headers)
- `formatDayLabel()` — `{ dateStyle: 'full' }` (day cell `aria-label`)
- `formatDisplay()` — `{ dateStyle: 'medium' }` (input value)

Header labels are pre-computed on each commit so render code reads
plain strings.

`weekStartsOn` defaults derive from `Intl.Locale.getWeekInfo()` with a
small CLDR fallback table. An explicit `weekStartsOn` prop pins across
`setLocale()` calls.

## Selection vs navigation: clamping is asymmetric on purpose

- `select(date)` — silently no-ops on disabled dates. Selection is a
  user intent: rejecting a disabled date is unambiguous.
- `goToDate(date)` / `setFocus(date)` — clamp into `[min, max]`.
  Navigation should never feel broken at boundaries.

## Limitations

| Limitation                | Why                                | Workaround                                   |
| ------------------------- | ---------------------------------- | -------------------------------------------- |
| Single-date only          | Out of scope                       | Two engines + UI orchestration for ranges    |
| Gregorian only            | `Intl.Locale` calendars not exercised | Use `Temporal.Calendar` outside engine    |
| No timezone               | Plain dates by design              | Convert at the boundary                      |
| No time-of-day            | Date picker, not datetime          | Pair with a separate time component          |
| RTL grid order            | Engine produces labels, not layout | `dir="rtl"` on the popover (CSS Grid honours it) |
| `weekStartsOn` fallback table is small | Bundle weight             | Pass explicit `weekStartsOn` when needed     |
| Today is read once at construction | No injection point        | Reconstruct engine when time changes drastically |

## Why these choices

- **Pure TS, no deps.** The challenge required it; it also keeps the
  engine portable, ~10 kB, and avoids a third-party security surface.
- **Class with private mutable state, immutable snapshots out.**
  Faster than a reducer-on-each-change for hot paths, while keeping
  consumers fully reactive and immutable-friendly.
- **`Intl.DateTimeFormat` for *every* locale, including `en-US`.** No
  hardcoded month/weekday strings — eliminates a class of i18n bugs.
- **`isDisabled` pre-computed on every cell.** Consumers don't need to
  know `min`/`max` semantics. The engine is the single source of truth.
- **No NgModules / no global state.** One engine instance per
  `DatePicker` component. Multiple pickers on a page never interfere.
