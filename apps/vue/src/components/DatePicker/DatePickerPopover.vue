<script setup lang="ts">
/**
 * Calendar popover: month/year header, weekday/day grid, footer actions.
 *
 * Stays presentational — receives the engine snapshot + grid via props
 * and surfaces user intents through events. The parent owns the engine
 * and is responsible for keyboard handling at the popover level.
 */
import type { CalendarState, DayCell, PlainDateLike } from '@datepicker/core'

import DatePickerGrid from './DatePickerGrid.vue'

interface Props {
  state: CalendarState
  cells: readonly DayCell[]
  formatDayLabel: (date: PlainDateLike) => string
  showFooter?: boolean
  todayLabel?: string
  clearLabel?: string
  prevMonthLabel?: string
  nextMonthLabel?: string
}

withDefaults(defineProps<Props>(), {
  showFooter: true,
  todayLabel: 'Today',
  clearLabel: 'Clear',
  prevMonthLabel: 'Previous month',
  nextMonthLabel: 'Next month',
})

const emit = defineEmits<{
  (event: 'select', date: PlainDateLike): void
  (event: 'prev-month'): void
  (event: 'next-month'): void
  (event: 'today'): void
  (event: 'clear'): void
}>()
</script>

<template>
  <div
    class="dp-popover"
    role="dialog"
    aria-modal="false"
    :aria-label="state.monthYearLabel"
  >
    <header class="dp-header">
      <button
        type="button"
        class="dp-nav-button"
        :aria-label="prevMonthLabel"
        @click="emit('prev-month')"
      >
        ‹
      </button>
      <div class="dp-header__title" aria-live="polite">
        {{ state.monthYearLabel }}
      </div>
      <button
        type="button"
        class="dp-nav-button"
        :aria-label="nextMonthLabel"
        @click="emit('next-month')"
      >
        ›
      </button>
    </header>

    <DatePickerGrid
      :cells="cells"
      :weekday-labels="state.weekdayLabels"
      :format-day-label="formatDayLabel"
      @select="(date) => emit('select', date)"
    />

    <footer v-if="showFooter" class="dp-footer">
      <button type="button" class="dp-footer__button" @click="emit('today')">
        {{ todayLabel }}
      </button>
      <button type="button" class="dp-footer__button" @click="emit('clear')">
        {{ clearLabel }}
      </button>
    </footer>
  </div>
</template>
