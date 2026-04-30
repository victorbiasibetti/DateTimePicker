/**
 * React bridge over the headless engine.
 *
 * `useSyncExternalStore` pairs naturally with the engine's subscribe/getState
 * contract — React subscribes once, the engine emits an immutable snapshot
 * per change, React schedules a re-render. No `useState` mirroring, no
 * effects, no manual diffing.
 */

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'

import {
  DatePickerEngine,
  type CalendarState,
  type DatePickerOptions,
  type DayCell,
  type PlainDateLike,
} from '@datepicker/core'

export interface DatePickerActions {
  goToNextMonth: () => void
  goToPrevMonth: () => void
  goToNextYear: () => void
  goToPrevYear: () => void
  goToToday: () => void
  goToDate: (date: string | PlainDateLike) => void
  select: (date: string | PlainDateLike) => void
  clear: () => void
  moveFocusByDays: (delta: number) => void
  moveFocusByMonths: (delta: number) => void
  moveFocusByYears: (delta: number) => void
  moveFocusToStartOfWeek: () => void
  moveFocusToEndOfWeek: () => void
  setFocus: (date: string | PlainDateLike) => void
  setLocale: (locale: string) => void
  setMin: (date: string | PlainDateLike | null) => void
  setMax: (date: string | PlainDateLike | null) => void
}

export interface UseDatePickerReturn {
  readonly engine: DatePickerEngine
  readonly state: CalendarState
  readonly grid: readonly DayCell[]
  readonly actions: DatePickerActions
  readonly displayValue: string
  formatDayLabel: (date: PlainDateLike) => string
  parseISO: (value: string) => PlainDateLike | null
}

/**
 * Construct a stable engine for the lifetime of the component and surface
 * its reactive state. The engine itself is never re-instantiated; option
 * changes flow through dedicated setters in `actions` (e.g. `setLocale`).
 */
export function useDatePicker(options: DatePickerOptions = {}): UseDatePickerReturn {
  // Lazy `useState` builds the engine once and pins the same instance for
  // the lifetime of the component. `options` are only honoured at construction;
  // subsequent prop changes flow through the dedicated setters in `actions`.
  const [engine] = useState(() => new DatePickerEngine(options))

  const subscribe = useCallback(
    (notify: () => void) => engine.subscribe(notify),
    [engine],
  )

  const getSnapshot = useCallback(() => engine.getState(), [engine])

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  // Engine memoises the grid internally — calling it on every render is
  // cheap (cache hit) and avoids tying React's dep array to engine internals.
  const grid = engine.getGrid()

  const displayValue = useMemo(
    () => engine.formatDisplay(state.selected),
    [engine, state.selected],
  )

  const actions = useMemo<DatePickerActions>(
    () => ({
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
    }),
    [engine],
  )

  const formatDayLabel = useCallback(
    (date: PlainDateLike) => engine.formatDayLabel(date),
    [engine],
  )

  const parseISO = useCallback((value: string) => engine.parseISO(value), [engine])

  return {
    engine,
    state,
    grid,
    actions,
    displayValue,
    formatDayLabel,
    parseISO,
  }
}
