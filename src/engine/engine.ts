/**
 * Headless calendar engine.
 *
 * Owns the canonical state, exposes navigation/selection commands, and
 * notifies listeners with immutable snapshots. Has no awareness of Vue,
 * the DOM, or any rendering layer.
 */

import { deriveWeekStartsOn } from './locale'
import { parsePlainDate, plainDate, todayPlainDate } from './temporal'
import type {
  CalendarState,
  DatePickerEngineAPI,
  DatePickerOptions,
  DayCell,
  Listener,
  PlainDateLike,
  Unsubscribe,
  Weekday,
} from './types'

const GRID_CELLS = 42 // 6 weeks × 7 days
const DEFAULT_LOCALE = 'en-US'

function coerceDate(value: string | PlainDateLike | null | undefined): PlainDateLike | null {
  if (value == null) return null
  if (typeof value === 'string') return parsePlainDate(value)
  return value
}

function clampToRange(
  date: PlainDateLike,
  min: PlainDateLike | null,
  max: PlainDateLike | null,
): PlainDateLike {
  if (min && date.compare(min) < 0) return min
  if (max && date.compare(max) > 0) return max
  return date
}

export class DatePickerEngine implements DatePickerEngineAPI {
  private state: CalendarState
  private readonly listeners = new Set<Listener>()
  private gridCache: { key: string; cells: readonly DayCell[] } | null = null
  /** True when `weekStartsOn` was not explicitly provided, so it should track locale changes. */
  private weekStartsOnFollowsLocale: boolean

  constructor(options: DatePickerOptions = {}) {
    const locale = options.locale ?? DEFAULT_LOCALE
    this.weekStartsOnFollowsLocale = options.weekStartsOn === undefined
    const weekStartsOn = options.weekStartsOn ?? deriveWeekStartsOn(locale)
    const today = todayPlainDate()
    const selected = coerceDate(options.initialDate ?? null)
    const min = coerceDate(options.min ?? null)
    const max = coerceDate(options.max ?? null)
    const focused = clampToRange(selected ?? today, min, max)

    this.state = {
      viewYear: focused.year,
      viewMonth: focused.month,
      selected,
      focused,
      today,
      min,
      max,
      locale,
      weekStartsOn,
      monthYearLabel: this.buildMonthYearLabel(locale, focused.year, focused.month),
      weekdayLabels: this.buildWeekdayLabels(locale, weekStartsOn),
    }
  }

  /* ---------------------------------------------------------------- */
  /* Reads                                                            */
  /* ---------------------------------------------------------------- */

  getState(): CalendarState {
    return this.state
  }

  getGrid(): readonly DayCell[] {
    const key = this.gridCacheKey()
    if (this.gridCache && this.gridCache.key === key) return this.gridCache.cells
    const cells = this.buildGrid()
    this.gridCache = { key, cells }
    return cells
  }

  subscribe(listener: Listener): Unsubscribe {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /* ---------------------------------------------------------------- */
  /* Navigation                                                       */
  /* ---------------------------------------------------------------- */

  goToNextMonth(): void {
    this.shiftView(1)
  }

  goToPrevMonth(): void {
    this.shiftView(-1)
  }

  goToNextYear(): void {
    this.shiftViewYear(1)
  }

  goToPrevYear(): void {
    this.shiftViewYear(-1)
  }

  goToToday(): void {
    const today = todayPlainDate()
    this.commit({
      viewYear: today.year,
      viewMonth: today.month,
      focused: clampToRange(today, this.state.min, this.state.max),
      today,
    })
  }

  goToDate(date: string | PlainDateLike): void {
    const target = coerceDate(date)
    if (!target) return
    const focused = clampToRange(target, this.state.min, this.state.max)
    this.commit({
      viewYear: focused.year,
      viewMonth: focused.month,
      focused,
    })
  }

  /* ---------------------------------------------------------------- */
  /* Selection                                                        */
  /* ---------------------------------------------------------------- */

  select(date: string | PlainDateLike): void {
    const target = coerceDate(date)
    if (!target || this.isDisabled(target)) return
    this.commit({
      selected: target,
      focused: target,
      viewYear: target.year,
      viewMonth: target.month,
    })
  }

  clear(): void {
    if (this.state.selected === null) return
    this.commit({ selected: null })
  }

  /* ---------------------------------------------------------------- */
  /* Focus movement                                                   */
  /* ---------------------------------------------------------------- */

  moveFocusByDays(delta: number): void {
    if (delta === 0) return
    this.moveFocusTo(this.state.focused.addDays(delta))
  }

  moveFocusByMonths(delta: number): void {
    if (delta === 0) return
    this.moveFocusTo(this.state.focused.addMonths(delta))
  }

  moveFocusByYears(delta: number): void {
    if (delta === 0) return
    this.moveFocusTo(this.state.focused.addYears(delta))
  }

  moveFocusToStartOfWeek(): void {
    const offset = this.weekOffsetOf(this.state.focused)
    if (offset === 0) return
    this.moveFocusTo(this.state.focused.addDays(-offset))
  }

  moveFocusToEndOfWeek(): void {
    const offset = this.weekOffsetOf(this.state.focused)
    if (offset === 6) return
    this.moveFocusTo(this.state.focused.addDays(6 - offset))
  }

  setFocus(date: string | PlainDateLike): void {
    const target = coerceDate(date)
    if (!target) return
    this.moveFocusTo(target)
  }

  /* ---------------------------------------------------------------- */
  /* Configuration                                                    */
  /* ---------------------------------------------------------------- */

  setLocale(locale: string): void {
    if (locale === this.state.locale) return
    this.commit(
      this.weekStartsOnFollowsLocale
        ? { locale, weekStartsOn: deriveWeekStartsOn(locale) }
        : { locale },
    )
  }

  setMin(date: string | PlainDateLike | null): void {
    const min = coerceDate(date)
    const focused = clampToRange(this.state.focused, min, this.state.max)
    this.commit({ min, focused })
  }

  setMax(date: string | PlainDateLike | null): void {
    const max = coerceDate(date)
    const focused = clampToRange(this.state.focused, this.state.min, max)
    this.commit({ max, focused })
  }

  /* ---------------------------------------------------------------- */
  /* Formatting                                                       */
  /* ---------------------------------------------------------------- */

  formatDisplay(date: PlainDateLike | null): string {
    if (!date) return ''
    return new Intl.DateTimeFormat(this.state.locale, { dateStyle: 'medium' }).format(
      date.toNativeDate(),
    )
  }

  formatDayLabel(date: PlainDateLike): string {
    return new Intl.DateTimeFormat(this.state.locale, { dateStyle: 'full' }).format(
      date.toNativeDate(),
    )
  }

  parseISO(value: string): PlainDateLike | null {
    return parsePlainDate(value)
  }

  /* ---------------------------------------------------------------- */
  /* Internals                                                        */
  /* ---------------------------------------------------------------- */

  private commit(partial: Partial<CalendarState>): void {
    const merged: CalendarState = { ...this.state, ...partial }
    const monthOrLocaleChanged =
      partial.viewYear !== undefined ||
      partial.viewMonth !== undefined ||
      partial.locale !== undefined
    const weekOrLocaleChanged =
      partial.weekStartsOn !== undefined || partial.locale !== undefined

    this.state = {
      ...merged,
      monthYearLabel: monthOrLocaleChanged
        ? this.buildMonthYearLabel(merged.locale, merged.viewYear, merged.viewMonth)
        : merged.monthYearLabel,
      weekdayLabels: weekOrLocaleChanged
        ? this.buildWeekdayLabels(merged.locale, merged.weekStartsOn)
        : merged.weekdayLabels,
    }
    this.gridCache = null
    this.emit()
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.state)
  }

  private shiftView(months: number): void {
    const anchor = plainDate(this.state.viewYear, this.state.viewMonth, 1).addMonths(months)
    this.commit({
      viewYear: anchor.year,
      viewMonth: anchor.month,
    })
  }

  private shiftViewYear(years: number): void {
    this.commit({ viewYear: this.state.viewYear + years })
  }

  private moveFocusTo(target: PlainDateLike): void {
    const focused = clampToRange(target, this.state.min, this.state.max)
    if (focused.equals(this.state.focused)) return
    this.commit({
      focused,
      viewYear: focused.year,
      viewMonth: focused.month,
    })
  }

  private isDisabled(date: PlainDateLike): boolean {
    if (this.state.min && date.compare(this.state.min) < 0) return true
    if (this.state.max && date.compare(this.state.max) > 0) return true
    return false
  }

  /** Position of `date` within its calendar week, given `weekStartsOn`. */
  private weekOffsetOf(date: PlainDateLike): number {
    return (date.dayOfWeek - this.state.weekStartsOn + 7) % 7
  }

  private gridCacheKey(): string {
    const { viewYear, viewMonth, selected, focused, today, weekStartsOn, min, max } = this.state
    return [
      viewYear,
      viewMonth,
      selected?.toISO() ?? '',
      focused.toISO(),
      today.toISO(),
      weekStartsOn,
      min?.toISO() ?? '',
      max?.toISO() ?? '',
    ].join('|')
  }

  private buildGrid(): readonly DayCell[] {
    const { viewYear, viewMonth, selected, focused, today } = this.state
    const firstOfMonth = plainDate(viewYear, viewMonth, 1)
    const leading = this.weekOffsetOf(firstOfMonth)
    const start = firstOfMonth.addDays(-leading)

    const cells: DayCell[] = new Array(GRID_CELLS)
    for (let i = 0; i < GRID_CELLS; i++) {
      const date = start.addDays(i)
      cells[i] = {
        key: date.toISO(),
        date,
        inCurrentMonth: date.month === viewMonth && date.year === viewYear,
        isSelected: selected !== null && date.equals(selected),
        isToday: date.equals(today),
        isFocused: date.equals(focused),
        isDisabled: this.isDisabled(date),
      }
    }
    return cells
  }

  private buildMonthYearLabel(locale: string, year: number, month: number): string {
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
      new Date(year, month - 1, 1),
    )
  }

  private buildWeekdayLabels(locale: string, weekStartsOn: Weekday): readonly string[] {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    // 1970-01-04 is a Sunday — anchor for deterministic weekday rendering.
    const sundayEpoch = new Date(1970, 0, 4)
    const labels: string[] = new Array(7)
    for (let i = 0; i < 7; i++) {
      const d = new Date(sundayEpoch)
      d.setDate(sundayEpoch.getDate() + ((weekStartsOn + i) % 7))
      labels[i] = fmt.format(d)
    }
    return labels
  }
}

/** Convenience factory mirroring the constructor. */
export function createDatePicker(options?: DatePickerOptions): DatePickerEngine {
  return new DatePickerEngine(options)
}