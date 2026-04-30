/**
 * Date abstraction layer.
 *
 * Prefers `Temporal.PlainDate` when the runtime exposes it (still Stage 3 as
 * of 2026 — Firefox Nightly and a few experimental builds). Falls back to a
 * `Date`-backed adapter that mimics the same immutable surface so the engine
 * can stay agnostic.
 *
 * No third-party libraries; only native Web APIs.
 */

import type { PlainDateLike } from './types'

/* ------------------------------------------------------------------ */
/* Runtime detection                                                  */
/* ------------------------------------------------------------------ */

interface TemporalLike {
  PlainDate: {
    new (year: number, month: number, day: number): TemporalPlainDate
    from(value: string | { year: number; month: number; day: number }): TemporalPlainDate
    compare(a: TemporalPlainDate, b: TemporalPlainDate): -1 | 0 | 1
  }
  Now: {
    plainDateISO(): TemporalPlainDate
  }
}

interface TemporalPlainDate {
  readonly year: number
  readonly month: number
  readonly day: number
  readonly dayOfWeek: number // Temporal: 1=Mon … 7=Sun
  add(duration: { days?: number; months?: number; years?: number }): TemporalPlainDate
  equals(other: TemporalPlainDate): boolean
  toString(): string
}

const temporal: TemporalLike | null =
  typeof globalThis !== 'undefined' &&
  typeof (globalThis as { Temporal?: unknown }).Temporal !== 'undefined'
    ? ((globalThis as unknown as { Temporal: TemporalLike }).Temporal)
    : null

export const isTemporalAvailable = temporal !== null

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/**
 * Calendar months keyed by their natural 1-12 numbers (Temporal-compatible).
 * Declared as a `const` object instead of a TS `enum` to stay erasable —
 * the `tsconfig` enables `erasableSyntaxOnly`, which forbids runtime enums.
 */
export const Month = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
} as const

export type Month = (typeof Month)[keyof typeof Month]

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function daysInMonth(year: number, month: number): number {
  switch (month) {
    case Month.February:
      return isLeap(year) ? 29 : 28
    case Month.April:
    case Month.June:
    case Month.September:
    case Month.November:
      return 30
    default:
      return 31
  }
}

/* ------------------------------------------------------------------ */
/* Date-backed adapter (fallback)                                     */
/* ------------------------------------------------------------------ */

class LegacyPlainDate implements PlainDateLike {
  readonly year: number
  readonly month: number
  readonly day: number

  constructor(year: number, month: number, day: number) {
    this.year = year
    this.month = month
    this.day = day
  }

  /**
   * 0=Sunday … 6=Saturday.
   * Built directly from a local-midnight `Date` to avoid timezone drift —
   * the calendar grid is wall-clock, not UTC.
   */
  get dayOfWeek(): number {
    return this.toNativeDate().getDay()
  }

  addDays(n: number): LegacyPlainDate {
    if (n === 0) return this
    const d = this.toNativeDate()
    d.setDate(d.getDate() + n)
    return LegacyPlainDate.fromNative(d)
  }

  addMonths(n: number): LegacyPlainDate {
    if (n === 0) return this
    let y = this.year
    let m = this.month + n
    while (m > 12) {
      m -= 12
      y += 1
    }
    while (m < 1) {
      m += 12
      y -= 1
    }
    const d = Math.min(this.day, daysInMonth(y, m))
    return new LegacyPlainDate(y, m, d)
  }

  addYears(n: number): LegacyPlainDate {
    if (n === 0) return this
    const y = this.year + n
    const d = Math.min(this.day, daysInMonth(y, this.month))
    return new LegacyPlainDate(y, this.month, d)
  }

  compare(other: PlainDateLike): number {
    if (this.year !== other.year) return this.year < other.year ? -1 : 1
    if (this.month !== other.month) return this.month < other.month ? -1 : 1
    if (this.day !== other.day) return this.day < other.day ? -1 : 1
    return 0
  }

  equals(other: PlainDateLike): boolean {
    return this.year === other.year && this.month === other.month && this.day === other.day
  }

  toISO(): string {
    return `${String(this.year).padStart(4, '0')}-${pad2(this.month)}-${pad2(this.day)}`
  }

  toNativeDate(): Date {
    return new Date(this.year, this.month - 1, this.day)
  }

  static fromNative(d: Date): LegacyPlainDate {
    return new LegacyPlainDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
  }

  static today(): LegacyPlainDate {
    return LegacyPlainDate.fromNative(new Date())
  }

  static fromISO(value: string): LegacyPlainDate | null {
    const match = ISO_RE.exec(value)
    if (!match) return null
    const [, yearStr, monthStr, dayStr] = match
    if (!yearStr || !monthStr || !dayStr) return null
    const y = Number(yearStr)
    const mo = Number(monthStr)
    const da = Number(dayStr)
    if (mo < 1 || mo > 12) return null
    if (da < 1 || da > daysInMonth(y, mo)) return null
    return new LegacyPlainDate(y, mo, da)
  }
}

/* ------------------------------------------------------------------ */
/* Temporal-backed adapter                                            */
/* ------------------------------------------------------------------ */

class TemporalPlainDateAdapter implements PlainDateLike {
  private readonly inner: TemporalPlainDate

  constructor(inner: TemporalPlainDate) {
    this.inner = inner
  }

  get year(): number {
    return this.inner.year
  }
  get month(): number {
    return this.inner.month
  }
  get day(): number {
    return this.inner.day
  }

  /** Normalise Temporal's 1-7 (Mon-Sun) to 0-6 (Sun-Sat). */
  get dayOfWeek(): number {
    const d = this.inner.dayOfWeek
    return d === 7 ? 0 : d
  }

  addDays(n: number): TemporalPlainDateAdapter {
    if (n === 0) return this
    return new TemporalPlainDateAdapter(this.inner.add({ days: n }))
  }

  addMonths(n: number): TemporalPlainDateAdapter {
    if (n === 0) return this
    return new TemporalPlainDateAdapter(this.inner.add({ months: n }))
  }

  addYears(n: number): TemporalPlainDateAdapter {
    if (n === 0) return this
    return new TemporalPlainDateAdapter(this.inner.add({ years: n }))
  }

  compare(other: PlainDateLike): number {
    if (other instanceof TemporalPlainDateAdapter) {
      return temporal!.PlainDate.compare(this.inner, other.inner)
    }
    if (this.year !== other.year) return this.year < other.year ? -1 : 1
    if (this.month !== other.month) return this.month < other.month ? -1 : 1
    if (this.day !== other.day) return this.day < other.day ? -1 : 1
    return 0
  }

  equals(other: PlainDateLike): boolean {
    return this.year === other.year && this.month === other.month && this.day === other.day
  }

  toISO(): string {
    return this.inner.toString()
  }

  toNativeDate(): Date {
    return new Date(this.year, this.month - 1, this.day)
  }
}

/* ------------------------------------------------------------------ */
/* Public factory                                                     */
/* ------------------------------------------------------------------ */

/** Construct a date from its calendar parts (month is 1-12). */
export function plainDate(year: number, month: number, day: number): PlainDateLike {
  if (temporal) {
    return new TemporalPlainDateAdapter(new temporal.PlainDate(year, month, day))
  }
  return new LegacyPlainDate(year, month, day)
}

/** Today in the system's local time zone. */
export function todayPlainDate(): PlainDateLike {
  if (temporal) {
    return new TemporalPlainDateAdapter(temporal.Now.plainDateISO())
  }
  return LegacyPlainDate.today()
}

/** Parse an ISO 8601 `YYYY-MM-DD` string. Returns `null` when invalid. */
export function parsePlainDate(value: string): PlainDateLike | null {
  if (temporal) {
    try {
      return new TemporalPlainDateAdapter(temporal.PlainDate.from(value))
    } catch {
      return null
    }
  }
  return LegacyPlainDate.fromISO(value)
}

/** Number of days in a (year, month=1-12) pair. Exposed for grid math. */
export function getDaysInMonth(year: number, month: number): number {
  return daysInMonth(year, month)
}
