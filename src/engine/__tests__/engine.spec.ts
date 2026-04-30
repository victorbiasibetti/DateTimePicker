import { describe, expect, it, vi } from 'vitest'

import { DatePickerEngine } from '../engine'
import { Month } from '../temporal'

function makeEngine(initialISO = '2026-04-30') {
  return new DatePickerEngine({ initialDate: initialISO, locale: 'en-US' })
}

describe('DatePickerEngine — initial state', () => {
  it('seeds the view from the initial date', () => {
    const engine = makeEngine('2026-04-30')
    const state = engine.getState()
    expect(state.viewYear).toBe(2026)
    expect(state.viewMonth).toBe(Month.April)
    expect(state.selected?.toISO()).toBe('2026-04-30')
    expect(state.focused.toISO()).toBe('2026-04-30')
  })

  it('falls back to today when no initial date is provided', () => {
    const engine = new DatePickerEngine()
    const state = engine.getState()
    const today = new Date()
    expect(state.selected).toBeNull()
    expect(state.focused.year).toBe(today.getFullYear())
    expect(state.focused.month).toBe(today.getMonth() + 1)
  })

  it('defaults to en-US with Sunday-start weekdays', () => {
    const engine = new DatePickerEngine()
    const state = engine.getState()
    expect(state.locale).toBe('en-US')
    expect(state.weekStartsOn).toBe(0)
    expect(state.weekdayLabels).toHaveLength(7)
    expect(state.weekdayLabels[0]).toMatch(/sun/i)
  })
})

describe('DatePickerEngine — grid', () => {
  it('always emits 42 cells (6 weeks × 7 days)', () => {
    const engine = makeEngine('2026-04-30')
    expect(engine.getGrid()).toHaveLength(42)
  })

  it('places leading days from the previous month at the start', () => {
    const engine = makeEngine('2026-04-15') // April 1, 2026 = Wednesday
    const grid = engine.getGrid()
    // weekStartsOn = Sunday → 3 leading days (Sun, Mon, Tue from March)
    expect(grid[0]?.date.toISO()).toBe('2026-03-29')
    expect(grid[0]?.inCurrentMonth).toBe(false)
    expect(grid[3]?.date.toISO()).toBe('2026-04-01')
    expect(grid[3]?.inCurrentMonth).toBe(true)
  })

  it('flags the selected and focused cells', () => {
    const engine = makeEngine('2026-04-30')
    const selectedCell = engine.getGrid().find((cell) => cell.date.toISO() === '2026-04-30')
    expect(selectedCell?.isSelected).toBe(true)
    expect(selectedCell?.isFocused).toBe(true)
  })

  it('caches the grid across identical reads', () => {
    const engine = makeEngine('2026-04-30')
    expect(engine.getGrid()).toBe(engine.getGrid())
  })

  it('rebuilds the grid when the view changes', () => {
    const engine = makeEngine('2026-04-30')
    const before = engine.getGrid()
    engine.goToNextMonth()
    expect(engine.getGrid()).not.toBe(before)
  })
})

describe('DatePickerEngine — navigation', () => {
  it('rolls over to January when stepping past December', () => {
    const engine = makeEngine('2026-12-15')
    engine.goToNextMonth()
    const state = engine.getState()
    expect(state.viewYear).toBe(2027)
    expect(state.viewMonth).toBe(Month.January)
  })

  it('rolls back to December when stepping before January', () => {
    const engine = makeEngine('2026-01-15')
    engine.goToPrevMonth()
    const state = engine.getState()
    expect(state.viewYear).toBe(2025)
    expect(state.viewMonth).toBe(Month.December)
  })

  it('moves the view by full years', () => {
    const engine = makeEngine('2026-04-30')
    engine.goToNextYear()
    expect(engine.getState().viewYear).toBe(2027)
    engine.goToPrevYear()
    engine.goToPrevYear()
    expect(engine.getState().viewYear).toBe(2025)
  })

  it('jumps to a target date', () => {
    const engine = makeEngine('2026-04-30')
    engine.goToDate('2030-08-12')
    const state = engine.getState()
    expect(state.viewYear).toBe(2030)
    expect(state.viewMonth).toBe(Month.August)
    expect(state.focused.toISO()).toBe('2030-08-12')
  })
})

describe('DatePickerEngine — selection', () => {
  it('updates selected and pages the view', () => {
    const engine = makeEngine('2026-04-30')
    engine.select('2026-09-10')
    const state = engine.getState()
    expect(state.selected?.toISO()).toBe('2026-09-10')
    expect(state.viewMonth).toBe(Month.September)
  })

  it('rejects selections outside the min/max range', () => {
    const engine = new DatePickerEngine({
      initialDate: '2026-04-30',
      min: '2026-04-01',
      max: '2026-04-30',
      locale: 'en-US',
    })
    engine.select('2026-05-15')
    expect(engine.getState().selected?.toISO()).toBe('2026-04-30')
  })

  it('clears the selection', () => {
    const engine = makeEngine('2026-04-30')
    engine.clear()
    expect(engine.getState().selected).toBeNull()
  })
})

describe('DatePickerEngine — focus movement', () => {
  it('shifts focus by days and pages the view when needed', () => {
    const engine = makeEngine('2026-04-30')
    engine.moveFocusByDays(5)
    const state = engine.getState()
    expect(state.focused.toISO()).toBe('2026-05-05')
    expect(state.viewMonth).toBe(Month.May)
  })

  it('shifts focus by months while preserving the day when possible', () => {
    const engine = makeEngine('2026-04-30')
    engine.moveFocusByMonths(1)
    expect(engine.getState().focused.toISO()).toBe('2026-05-30')
  })

  it('clamps focus inside the configured min/max range', () => {
    const engine = new DatePickerEngine({
      initialDate: '2026-04-30',
      max: '2026-04-30',
      locale: 'en-US',
    })
    engine.moveFocusByDays(10)
    expect(engine.getState().focused.toISO()).toBe('2026-04-30')
  })

  it('moves focus to the start and end of the current week', () => {
    const engine = makeEngine('2026-04-30') // Thursday → offset 4 from Sunday
    engine.moveFocusToStartOfWeek()
    expect(engine.getState().focused.toISO()).toBe('2026-04-26') // Sunday
    engine.moveFocusToEndOfWeek()
    expect(engine.getState().focused.toISO()).toBe('2026-05-02') // Saturday
  })
})

describe('DatePickerEngine — locale', () => {
  it('rebuilds month/year and weekday labels when the locale changes', () => {
    const engine = makeEngine('2026-04-30')
    const englishLabel = engine.getState().monthYearLabel
    engine.setLocale('pt-BR')
    const portugueseLabel = engine.getState().monthYearLabel
    expect(portugueseLabel).not.toBe(englishLabel)
    expect(engine.getState().weekdayLabels).toHaveLength(7)
  })

  it('tracks weekStartsOn when not explicitly provided', () => {
    const engine = new DatePickerEngine({ initialDate: '2026-04-30', locale: 'en-US' })
    expect(engine.getState().weekStartsOn).toBe(0)
    engine.setLocale('de-DE')
    expect(engine.getState().weekStartsOn).toBe(1)
  })

  it('keeps an explicit weekStartsOn pinned across locale changes', () => {
    const engine = new DatePickerEngine({
      initialDate: '2026-04-30',
      locale: 'en-US',
      weekStartsOn: 1,
    })
    engine.setLocale('pt-BR')
    expect(engine.getState().weekStartsOn).toBe(1)
  })
})

describe('DatePickerEngine — subscribe', () => {
  it('notifies listeners with the new snapshot on every commit', () => {
    const engine = makeEngine('2026-04-30')
    const listener = vi.fn()
    engine.subscribe(listener)
    engine.goToNextMonth()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0]?.[0].viewMonth).toBe(Month.May)
  })

  it('stops calling the listener after unsubscribe', () => {
    const engine = makeEngine('2026-04-30')
    const listener = vi.fn()
    const unsubscribe = engine.subscribe(listener)
    unsubscribe()
    engine.goToNextMonth()
    expect(listener).not.toHaveBeenCalled()
  })

  it('emits an immutable snapshot reference per change', () => {
    const engine = makeEngine('2026-04-30')
    const before = engine.getState()
    engine.goToNextMonth()
    const after = engine.getState()
    expect(after).not.toBe(before)
    expect(before.viewMonth).toBe(Month.April) // prior snapshot untouched
  })
})

describe('DatePickerEngine — formatting', () => {
  it('formats a date for display using the active locale', () => {
    const engine = makeEngine('2026-04-30')
    expect(engine.formatDisplay(engine.getState().focused)).toMatch(/2026/)
    engine.setLocale('pt-BR')
    expect(engine.formatDisplay(engine.getState().focused)).toMatch(/2026/)
  })

  it('returns an empty string when formatting null', () => {
    const engine = makeEngine('2026-04-30')
    expect(engine.formatDisplay(null)).toBe('')
  })
})