/**
 * Vue bridge over the headless engine.
 *
 * Wraps a single `DatePickerEngine` instance and mirrors its snapshot into a
 * `shallowRef`. Vue's reactivity then drives renders, while the engine
 * remains the single source of truth — no two-way binding, no duplicated
 * state. Components dispatch actions and read derived values; mutations
 * always go through the engine.
 */

import { computed, onScopeDispose, shallowRef, type ComputedRef, type Ref } from 'vue'

import {
  DatePickerEngine,
  type CalendarState,
  type DatePickerOptions,
  type DayCell,
  type PlainDateLike,
} from '@datepicker/core'

export interface DatePickerActions {
  goToNextMonth(): void
  goToPrevMonth(): void
  goToNextYear(): void
  goToPrevYear(): void
  goToToday(): void
  goToDate(date: string | PlainDateLike): void
  select(date: string | PlainDateLike): void
  clear(): void
  moveFocusByDays(delta: number): void
  moveFocusByMonths(delta: number): void
  moveFocusByYears(delta: number): void
  moveFocusToStartOfWeek(): void
  moveFocusToEndOfWeek(): void
  setFocus(date: string | PlainDateLike): void
  setLocale(locale: string): void
  setMin(date: string | PlainDateLike | null): void
  setMax(date: string | PlainDateLike | null): void
}

export interface UseDatePickerReturn {
  /** Engine instance — exposed for advanced consumers (rarely needed). */
  readonly engine: DatePickerEngine
  /** Reactive snapshot. Replaced wholesale on every change. */
  readonly state: Ref<CalendarState>
  /** Reactive 6×7 grid derived from `state`. */
  readonly grid: ComputedRef<readonly DayCell[]>
  /** Pre-bound action methods. */
  readonly actions: DatePickerActions
  /** Locale-aware display formatter for the current selection. */
  readonly displayValue: ComputedRef<string>
  /** Locale-aware accessible label for a given day cell. */
  formatDayLabel(date: PlainDateLike): string
  parseISO(value: string): PlainDateLike | null
}

export function useDatePicker(options: DatePickerOptions = {}): UseDatePickerReturn {
  const engine = new DatePickerEngine(options)
  const state = shallowRef<CalendarState>(engine.getState())

  const unsubscribe = engine.subscribe((nextState) => {
    state.value = nextState
  })

  onScopeDispose(() => {
    unsubscribe()
  })

  const grid = computed<readonly DayCell[]>(() => {
    // Touching `state.value` ensures Vue re-runs this when the engine emits.
    void state.value
    return engine.getGrid()
  })

  const displayValue = computed(() => engine.formatDisplay(state.value.selected))

  const actions: DatePickerActions = {
    goToNextMonth: () => engine.goToNextMonth(),
    goToPrevMonth: () => engine.goToPrevMonth(),
    goToNextYear: () => engine.goToNextYear(),
    goToPrevYear: () => engine.goToPrevYear(),
    goToToday: () => engine.goToToday(),
    goToDate: (date) => engine.goToDate(date),
    select: (date) => engine.select(date),
    clear: () => engine.clear(),
    moveFocusByDays: (delta) => engine.moveFocusByDays(delta),
    moveFocusByMonths: (delta) => engine.moveFocusByMonths(delta),
    moveFocusByYears: (delta) => engine.moveFocusByYears(delta),
    moveFocusToStartOfWeek: () => engine.moveFocusToStartOfWeek(),
    moveFocusToEndOfWeek: () => engine.moveFocusToEndOfWeek(),
    setFocus: (date) => engine.setFocus(date),
    setLocale: (locale) => engine.setLocale(locale),
    setMin: (date) => engine.setMin(date),
    setMax: (date) => engine.setMax(date),
  }

  return {
    engine,
    state,
    grid,
    actions,
    displayValue,
    formatDayLabel: (date) => engine.formatDayLabel(date),
    parseISO: (value) => engine.parseISO(value),
  }
}