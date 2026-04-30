/**
 * Public types for the headless DatePicker engine.
 * The engine is framework-agnostic; consumers (Vue, React, vanilla) bridge
 * to it through the subscribe pattern exposed by `DatePickerEngineAPI`.
 */

/**
 * Minimal calendar-date abstraction.
 * Backed by `Temporal.PlainDate` when available, otherwise a `Date` adapter.
 * All operations are immutable: arithmetic methods return a new instance.
 */
export interface PlainDateLike {
  readonly year: number
  /** 1-12 (calendar month, not zero-indexed). */
  readonly month: number
  /** 1-31 */
  readonly day: number
  /** 0=Sunday … 6=Saturday */
  readonly dayOfWeek: number
  addDays(n: number): PlainDateLike
  addMonths(n: number): PlainDateLike
  addYears(n: number): PlainDateLike
  /** Returns -1, 0, or 1 (sign of `this - other`). */
  compare(other: PlainDateLike): number
  equals(other: PlainDateLike): boolean
  /** ISO 8601 `YYYY-MM-DD`. */
  toISO(): string
  /** Native `Date` at local midnight (escape hatch for Intl formatting). */
  toNativeDate(): Date
}

/** Zero-indexed weekday: 0=Sunday … 6=Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Single cell rendered by the calendar grid. */
export interface DayCell {
  /** Stable key for list rendering (ISO date string). */
  readonly key: string
  readonly date: PlainDateLike
  /** True when the cell belongs to the currently visible month. */
  readonly inCurrentMonth: boolean
  readonly isSelected: boolean
  readonly isToday: boolean
  readonly isFocused: boolean
  readonly isDisabled: boolean
}

/** Immutable snapshot emitted by the engine on every state change. */
export interface CalendarState {
  /** Year of the visible page (e.g. 2026). */
  readonly viewYear: number
  /** Month of the visible page (1-12). */
  readonly viewMonth: number
  readonly selected: PlainDateLike | null
  readonly focused: PlainDateLike
  readonly today: PlainDateLike
  readonly min: PlainDateLike | null
  readonly max: PlainDateLike | null
  readonly locale: string
  readonly weekStartsOn: Weekday
  /** Header label for the current view (e.g. "April 2026"). */
  readonly monthYearLabel: string
  /** Length-7 weekday short labels, ordered by `weekStartsOn`. */
  readonly weekdayLabels: readonly string[]
}

/** Options accepted when constructing the engine. */
export interface DatePickerOptions {
  /** Initial selection. Accepts ISO `YYYY-MM-DD` or a `PlainDateLike`. */
  initialDate?: string | PlainDateLike | null
  min?: string | PlainDateLike | null
  max?: string | PlainDateLike | null
  /** BCP-47 tag. Defaults to `'en-US'`. */
  locale?: string
  /**
   * Day the week starts on (0=Sunday … 6=Saturday).
   * If omitted, derived from the locale via `Intl.Locale().getWeekInfo()`,
   * falling back to Sunday.
   */
  weekStartsOn?: Weekday
}

/** Listener invoked with an immutable snapshot whenever state changes. */
export type Listener = (state: CalendarState) => void
export type Unsubscribe = () => void

/** Public surface of the engine. UI layers should depend on this only. */
export interface DatePickerEngineAPI {
  /** Current snapshot. Cheap; safe to call from render. */
  getState(): CalendarState
  /** Returns the 6×7 day grid for the current view (always 42 cells). */
  getGrid(): readonly DayCell[]
  subscribe(listener: Listener): Unsubscribe

  /* Navigation */
  goToNextMonth(): void
  goToPrevMonth(): void
  goToNextYear(): void
  goToPrevYear(): void
  goToToday(): void
  goToDate(date: string | PlainDateLike): void

  /* Selection */
  select(date: string | PlainDateLike): void
  clear(): void

  /* Focus (keyboard-driven cursor inside the grid) */
  moveFocusByDays(delta: number): void
  moveFocusByMonths(delta: number): void
  moveFocusByYears(delta: number): void
  moveFocusToStartOfWeek(): void
  moveFocusToEndOfWeek(): void
  setFocus(date: string | PlainDateLike): void

  /* Configuration */
  setLocale(locale: string): void
  setMin(date: string | PlainDateLike | null): void
  setMax(date: string | PlainDateLike | null): void

  /* Formatting helpers driven by the active locale */
  formatDisplay(date: PlainDateLike | null): string
  formatDayLabel(date: PlainDateLike): string
  parseISO(value: string): PlainDateLike | null
}