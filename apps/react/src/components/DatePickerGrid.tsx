/**
 * Pure presentational grid. Receives the 6×7 cell array and weekday
 * headers from the parent and emits a single `onSelect` callback when the
 * user clicks a cell. No engine knowledge here — keeps the component
 * trivially testable.
 */

import { useCallback } from 'react'

import type { DayCell, PlainDateLike } from '@datepicker/core'

interface DatePickerGridProps {
  cells: readonly DayCell[]
  weekdayLabels: readonly string[]
  /** Builds the accessible label for a cell (locale-aware). */
  formatDayLabel: (date: PlainDateLike) => string
  onSelect: (date: PlainDateLike) => void
}

function dayClassName(cell: DayCell): string {
  const classes = ['dp-day']
  if (!cell.inCurrentMonth) classes.push('dp-day--outside')
  if (cell.isToday) classes.push('dp-day--today')
  if (cell.isSelected) classes.push('dp-day--selected')
  if (cell.isDisabled) classes.push('dp-day--disabled')
  return classes.join(' ')
}

export function DatePickerGrid({
  cells,
  weekdayLabels,
  formatDayLabel,
  onSelect,
}: DatePickerGridProps) {
  const handleClick = useCallback(
    (cell: DayCell) => {
      if (cell.isDisabled) return
      onSelect(cell.date)
    },
    [onSelect],
  )

  return (
    <div className="dp-grid" role="grid" aria-readonly="true">
      {weekdayLabels.map((label) => (
        <div
          key={label}
          className="dp-grid__weekday"
          role="columnheader"
          aria-hidden="true"
        >
          {label}
        </div>
      ))}

      {cells.map((cell) => (
        <button
          key={cell.key}
          type="button"
          className={dayClassName(cell)}
          role="gridcell"
          aria-label={formatDayLabel(cell.date)}
          aria-selected={cell.isSelected}
          aria-disabled={cell.isDisabled}
          aria-current={cell.isToday ? 'date' : undefined}
          tabIndex={cell.isFocused ? 0 : -1}
          data-date={cell.key}
          data-focused={cell.isFocused ? 'true' : undefined}
          onClick={() => handleClick(cell)}
        >
          {cell.date.day}
        </button>
      ))}
    </div>
  )
}
