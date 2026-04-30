/**
 * Public surface of the headless DatePicker engine.
 *
 * Consumers should import from this barrel rather than reaching into
 * individual modules — the internals (`temporal`, `locale`, …) are an
 * implementation detail and may change without notice.
 */

export { DatePickerEngine, createDatePicker } from './engine'
export { deriveWeekStartsOn } from './locale'
export {
  Month,
  getDaysInMonth,
  isTemporalAvailable,
  parsePlainDate,
  plainDate,
  todayPlainDate,
} from './temporal'
export type {
  CalendarState,
  DatePickerEngineAPI,
  DatePickerOptions,
  DayCell,
  Listener,
  PlainDateLike,
  Unsubscribe,
  Weekday,
} from './types'