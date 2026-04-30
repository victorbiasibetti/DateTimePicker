<script setup lang="ts">
/**
 * Pure presentational grid. Receives the 6×7 cell array and weekday
 * headers from the parent and emits a single `select` event when the
 * user clicks a cell. No engine knowledge here — keeps the component
 * trivially testable.
 */
import type { DayCell, PlainDateLike } from '@datepicker/core'

interface Props {
  cells: readonly DayCell[]
  weekdayLabels: readonly string[]
  /** Builds the accessible label for a cell (locale-aware). */
  formatDayLabel: (date: PlainDateLike) => string
}

defineProps<Props>()

const emit = defineEmits<{
  (event: 'select', date: PlainDateLike): void
}>()

function handleClick(cell: DayCell) {
  if (cell.isDisabled) return
  emit('select', cell.date)
}

function dayClasses(cell: DayCell): Record<string, boolean> {
  return {
    'dp-day': true,
    'dp-day--outside': !cell.inCurrentMonth,
    'dp-day--today': cell.isToday,
    'dp-day--selected': cell.isSelected,
    'dp-day--disabled': cell.isDisabled,
  }
}
</script>

<template>
  <div class="dp-grid" role="grid" aria-readonly="true">
    <div
      v-for="label in weekdayLabels"
      :key="label"
      class="dp-grid__weekday"
      role="columnheader"
      aria-hidden="true"
    >
      {{ label }}
    </div>

    <button
      v-for="cell in cells"
      :key="cell.key"
      type="button"
      :class="dayClasses(cell)"
      role="gridcell"
      :aria-label="formatDayLabel(cell.date)"
      :aria-selected="cell.isSelected"
      :aria-disabled="cell.isDisabled"
      :aria-current="cell.isToday ? 'date' : undefined"
      :tabindex="cell.isFocused ? 0 : -1"
      :data-date="cell.key"
      :data-focused="cell.isFocused ? 'true' : undefined"
      @click="handleClick(cell)"
    >
      {{ cell.date.day }}
    </button>
  </div>
</template>