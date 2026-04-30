/**
 * Locale-driven defaults.
 *
 * The Web Platform exposes per-locale calendar conventions through
 * `Intl.Locale.prototype.getWeekInfo()` (and `.weekInfo` on older builds).
 * Coverage is uneven across runtimes, so we feature-detect and fall back
 * to a small static table that mirrors CLDR for the common cases.
 */

import type { Weekday } from './types'

interface IntlLocaleWithWeekInfo extends Intl.Locale {
  /** ECMA-402 standard accessor (newer engines). */
  getWeekInfo?(): { firstDay: number }
  /** Legacy property accessor (older engines, e.g. early V8). */
  weekInfo?: { firstDay: number }
}

/**
 * Static fallback for runtimes that don't expose `getWeekInfo`.
 * Sourced from CLDR. Keys are language tags or region codes.
 * Values follow the engine convention: 0=Sunday … 6=Saturday.
 */
const WEEK_START_FALLBACK: Record<string, Weekday> = {
  // Sunday-first regions
  'en-US': 0,
  'en-CA': 0,
  'ja-JP': 0,
  'ko-KR': 0,
  'zh-CN': 0,
  'zh-TW': 0,
  'pt-BR': 0,
  'es-MX': 0,
  // Monday-first regions (most of Europe + LatAm Spanish)
  'en-GB': 1,
  'fr-FR': 1,
  'de-DE': 1,
  'it-IT': 1,
  'es-ES': 1,
  'pt-PT': 1,
  'nl-NL': 1,
  'sv-SE': 1,
  'pl-PL': 1,
  'ru-RU': 1,
  // Saturday-first regions (much of MENA)
  'ar-SA': 6,
  'he-IL': 0,
  'fa-IR': 6,
}

/**
 * Convert ECMA-402's `firstDay` (1=Mon … 7=Sun) into the engine's
 * 0=Sunday … 6=Saturday convention.
 */
function normaliseEcmaFirstDay(firstDay: number): Weekday {
  const sundayIndexed = firstDay === 7 ? 0 : firstDay
  if (sundayIndexed >= 0 && sundayIndexed <= 6) return sundayIndexed as Weekday
  return 0
}

/**
 * Best-effort detection of the first day of the week for a given BCP-47 tag.
 * Falls back to Sunday (`0`) when the locale isn't known.
 */
export function deriveWeekStartsOn(locale: string): Weekday {
  try {
    const intlLocale = new Intl.Locale(locale) as IntlLocaleWithWeekInfo
    const weekInfo =
      typeof intlLocale.getWeekInfo === 'function'
        ? intlLocale.getWeekInfo()
        : intlLocale.weekInfo
    if (weekInfo && typeof weekInfo.firstDay === 'number') {
      return normaliseEcmaFirstDay(weekInfo.firstDay)
    }
  } catch {
    // Invalid tag — fall through to the static table.
  }

  if (locale in WEEK_START_FALLBACK) {
    return WEEK_START_FALLBACK[locale] ?? 0
  }
  // Try the language portion only (e.g. "en" from "en-AU").
  const language = locale.split('-')[0]
  if (language && language in WEEK_START_FALLBACK) {
    return WEEK_START_FALLBACK[language] ?? 0
  }
  return 0
}