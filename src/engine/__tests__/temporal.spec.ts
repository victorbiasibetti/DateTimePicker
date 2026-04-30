import { describe, expect, it } from 'vitest'

import {
  Month,
  getDaysInMonth,
  parsePlainDate,
  plainDate,
  todayPlainDate,
} from '../temporal'

describe('plainDate', () => {
  it('exposes the year, month, and day passed in', () => {
    const date = plainDate(2026, Month.April, 30)
    expect(date.year).toBe(2026)
    expect(date.month).toBe(4)
    expect(date.day).toBe(30)
  })

  it('reports dayOfWeek using the 0-6 (Sun-Sat) convention', () => {
    // 2026-04-30 is a Thursday → 4
    expect(plainDate(2026, Month.April, 30).dayOfWeek).toBe(4)
    // 2026-01-04 is a Sunday → 0
    expect(plainDate(2026, Month.January, 4).dayOfWeek).toBe(0)
    // 2026-01-03 is a Saturday → 6
    expect(plainDate(2026, Month.January, 3).dayOfWeek).toBe(6)
  })

  it('formats to ISO 8601', () => {
    expect(plainDate(2026, Month.April, 30).toISO()).toBe('2026-04-30')
    expect(plainDate(7, Month.March, 5).toISO()).toBe('0007-03-05')
  })
})

describe('addDays', () => {
  it('moves forward across month boundaries', () => {
    const result = plainDate(2026, Month.January, 30).addDays(5)
    expect(result.toISO()).toBe('2026-02-04')
  })

  it('moves backward across year boundaries', () => {
    const result = plainDate(2026, Month.January, 1).addDays(-1)
    expect(result.toISO()).toBe('2025-12-31')
  })

  it('returns the same instance for a zero delta', () => {
    const date = plainDate(2026, Month.April, 30)
    expect(date.addDays(0)).toBe(date)
  })
})

describe('addMonths', () => {
  it('clamps the day when the target month is shorter', () => {
    const result = plainDate(2026, Month.January, 31).addMonths(1)
    expect(result.toISO()).toBe('2026-02-28')
  })

  it('clamps to Feb 29 in leap years', () => {
    const result = plainDate(2024, Month.January, 31).addMonths(1)
    expect(result.toISO()).toBe('2024-02-29')
  })

  it('rolls over the year when crossing December', () => {
    const result = plainDate(2026, Month.November, 15).addMonths(3)
    expect(result.toISO()).toBe('2027-02-15')
  })

  it('rolls back across the year when going negative', () => {
    const result = plainDate(2026, Month.February, 15).addMonths(-3)
    expect(result.toISO()).toBe('2025-11-15')
  })
})

describe('addYears', () => {
  it('clamps Feb 29 to Feb 28 on a non-leap target', () => {
    const result = plainDate(2024, Month.February, 29).addYears(1)
    expect(result.toISO()).toBe('2025-02-28')
  })

  it('preserves the day for ordinary moves', () => {
    expect(plainDate(2026, Month.April, 30).addYears(2).toISO()).toBe('2028-04-30')
  })
})

describe('compare and equals', () => {
  it('returns -1, 0, 1 in calendar order', () => {
    const earlier = plainDate(2026, Month.April, 30)
    const later = plainDate(2026, Month.May, 1)
    expect(earlier.compare(later)).toBe(-1)
    expect(later.compare(earlier)).toBe(1)
    expect(earlier.compare(plainDate(2026, Month.April, 30))).toBe(0)
  })

  it('treats matching parts as equal', () => {
    expect(plainDate(2026, Month.April, 30).equals(plainDate(2026, Month.April, 30))).toBe(true)
    expect(plainDate(2026, Month.April, 30).equals(plainDate(2026, Month.April, 29))).toBe(false)
  })
})

describe('parsePlainDate', () => {
  it('round-trips ISO 8601 strings', () => {
    const parsed = parsePlainDate('2026-04-30')
    expect(parsed).not.toBeNull()
    expect(parsed!.toISO()).toBe('2026-04-30')
  })

  it('rejects invalid month or day values', () => {
    expect(parsePlainDate('2026-13-01')).toBeNull()
    expect(parsePlainDate('2026-02-30')).toBeNull()
    expect(parsePlainDate('not-a-date')).toBeNull()
  })

  it('rejects strings missing the day component', () => {
    expect(parsePlainDate('2026-04')).toBeNull()
  })
})

describe('todayPlainDate', () => {
  it('matches the system local date', () => {
    const now = new Date()
    const today = todayPlainDate()
    expect(today.year).toBe(now.getFullYear())
    expect(today.month).toBe(now.getMonth() + 1)
    expect(today.day).toBe(now.getDate())
  })
})

describe('getDaysInMonth', () => {
  it('handles 30/31-day months', () => {
    expect(getDaysInMonth(2026, Month.January)).toBe(31)
    expect(getDaysInMonth(2026, Month.April)).toBe(30)
  })

  it('handles February in leap and non-leap years', () => {
    expect(getDaysInMonth(2025, Month.February)).toBe(28)
    expect(getDaysInMonth(2024, Month.February)).toBe(29)
    expect(getDaysInMonth(2000, Month.February)).toBe(29) // divisible by 400
    expect(getDaysInMonth(1900, Month.February)).toBe(28) // divisible by 100, not 400
  })
})

describe('Month enum-like object', () => {
  it('uses 1-12 numbering', () => {
    expect(Month.January).toBe(1)
    expect(Month.December).toBe(12)
  })
})