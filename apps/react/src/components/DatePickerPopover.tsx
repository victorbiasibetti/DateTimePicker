/**
 * Calendar popover: month/year header, weekday/day grid, footer actions.
 *
 * Stays presentational — receives the engine snapshot + grid via props
 * and surfaces user intents through callbacks. The parent owns the engine
 * and is responsible for keyboard handling at the popover level.
 */

import type { CalendarState, DayCell, PlainDateLike } from '@datepicker/core'

import { DatePickerGrid } from './DatePickerGrid'

interface DatePickerPopoverProps {
  state: CalendarState
  cells: readonly DayCell[]
  formatDayLabel: (date: PlainDateLike) => string
  onSelect: (date: PlainDateLike) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onPrevYear: () => void
  onNextYear: () => void
  onToday: () => void
  onClear: () => void
  showFooter?: boolean
  todayLabel?: string
  clearLabel?: string
  prevMonthLabel?: string
  nextMonthLabel?: string
  prevYearLabel?: string
  nextYearLabel?: string
  showNavYearsButtons?: boolean
}

export function DatePickerPopover({
  state,
  cells,
  formatDayLabel,
  onSelect,
  onPrevMonth,
  onNextMonth,
  onPrevYear,
  onNextYear,
  onToday,
  onClear,
  showFooter = true,
  todayLabel = 'Today',
  clearLabel = 'Clear',
  prevMonthLabel = 'Previous month',
  nextMonthLabel = 'Next month',
  prevYearLabel = 'Previous year',
  nextYearLabel = 'Next year',
  showNavYearsButtons = false,
}: DatePickerPopoverProps) {
  return (
    <div
      className="dp-popover"
      role="dialog"
      aria-modal="false"
      aria-label={state.monthYearLabel}
    >
      <header className="dp-header">
          {showNavYearsButtons && <button
            type="button"
            className="dp-nav-button"
            aria-label={prevYearLabel}
            disabled={!state.canGoToPrevYear}
            onClick={onPrevYear}
          >
            «
          </button>}
        <button
          type="button"
          className="dp-nav-button"
          aria-label={prevMonthLabel}
          onClick={onPrevMonth}
        >
          ‹
        </button>
        <div className="dp-header__title" aria-live="polite">
          {state.monthYearLabel}
        </div>
        <button
          type="button"
          className="dp-nav-button"
          aria-label={nextMonthLabel}
          onClick={onNextMonth}
        >
          ›
        </button>
        {showNavYearsButtons && (
          <button
            type="button"
            className="dp-nav-button"
            aria-label={nextYearLabel}
            disabled={!state.canGoToNextYear}
          onClick={onNextYear}
        >
          »
        </button>)}
      </header>

      <DatePickerGrid
        cells={cells}
        weekdayLabels={state.weekdayLabels}
        formatDayLabel={formatDayLabel}
        onSelect={onSelect}
      />

      {showFooter && (
        <footer className="dp-footer">
          <button type="button" className="dp-footer__button" onClick={onToday}>
            {todayLabel}
          </button>
          <button type="button" className="dp-footer__button" onClick={onClear}>
            {clearLabel}
          </button>
        </footer>
      )}
    </div>
  )
}
