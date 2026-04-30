<script setup lang="ts">
/**
 * Public DatePicker component.
 *
 * Owns a `useDatePicker` engine instance and wires it to a text input +
 * teleported popover. The component itself only handles UI plumbing —
 * positioning, open/close, click-outside dismissal, and the v-model
 * contract. All calendar math lives in the engine.
 */
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

import { useDatePicker } from '../../composables/useDatePicker'
import type { PlainDateLike, Weekday } from '../../engine/types'
import DatePickerPopover from './DatePickerPopover.vue'
import '../../styles/datepicker.css'

interface Props {
  /** ISO `YYYY-MM-DD` string, or `null` when no date is selected. */
  modelValue?: string | null
  min?: string | null
  max?: string | null
  locale?: string
  weekStartsOn?: Weekday
  placeholder?: string
  disabled?: boolean
  name?: string
  id?: string
  /** Optional override for the input's display formatter. */
  formatInput?: (date: PlainDateLike | null) => string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  min: null,
  max: null,
  locale: 'en-US',
  placeholder: 'Select a date',
  disabled: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string | null): void
  (event: 'open'): void
  (event: 'close'): void
}>()

const { state, grid, actions, formatDayLabel, parseISO } = useDatePicker({
  initialDate: props.modelValue,
  min: props.min,
  max: props.max,
  locale: props.locale,
  ...(props.weekStartsOn !== undefined ? { weekStartsOn: props.weekStartsOn } : {}),
})

const fallbackId = useId()
const inputId = computed(() => props.id ?? fallbackId)

const isOpen = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const popoverPosition = ref({ top: 0, left: 0, minWidth: 0 })

const inputDisplay = computed(() => {
  const date = state.value.selected
  if (props.formatInput) return props.formatInput(date)
  return date ? formatInput(date) : ''
})

function formatInput(date: PlainDateLike): string {
  return new Intl.DateTimeFormat(state.value.locale, { dateStyle: 'medium' }).format(
    date.toNativeDate(),
  )
}

/* ------------------------------------------------------------------ */
/* Sync external props into the engine                                */
/* ------------------------------------------------------------------ */

watch(
  () => props.modelValue,
  (next) => {
    const current = state.value.selected?.toISO() ?? null
    if (next === current) return
    if (next === null) {
      actions.clear()
    } else {
      actions.select(next)
    }
  },
)

watch(() => props.locale, (next) => actions.setLocale(next))
watch(() => props.min, (next) => actions.setMin(next))
watch(() => props.max, (next) => actions.setMax(next))

/* ------------------------------------------------------------------ */
/* Open / close                                                       */
/* ------------------------------------------------------------------ */

function open() {
  if (isOpen.value || props.disabled) return
  isOpen.value = true
  emit('open')
  nextTick(updatePosition)
  // Defer outside-click registration so the same click doesn't close it.
  setTimeout(() => {
    document.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
  }, 0)
}

function close({ restoreFocus = true } = {}) {
  if (!isOpen.value) return
  isOpen.value = false
  document.removeEventListener('pointerdown', handlePointerDown, true)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
  emit('close')
  if (restoreFocus) inputRef.value?.focus()
}

function handlePointerDown(event: PointerEvent) {
  const target = event.target as Node | null
  if (!target) return
  if (inputRef.value?.contains(target)) return
  if (popoverRef.value?.contains(target)) return
  close({ restoreFocus: false })
}

function updatePosition() {
  const rect = inputRef.value?.getBoundingClientRect()
  if (!rect) return
  popoverPosition.value = {
    top: rect.bottom + window.scrollY + 4,
    left: rect.left + window.scrollX,
    minWidth: rect.width,
  }
}

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDown, true)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
})

/* ------------------------------------------------------------------ */
/* Engine actions                                                     */
/* ------------------------------------------------------------------ */

function handleSelect(date: PlainDateLike) {
  actions.select(date)
  emit('update:modelValue', date.toISO())
  close()
}

function handleToday() {
  actions.goToToday()
}

function handleClear() {
  actions.clear()
  emit('update:modelValue', null)
}

function handleInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  const parsed = parseISO(target.value)
  if (parsed) {
    actions.select(parsed)
    emit('update:modelValue', parsed.toISO())
  } else if (target.value === '') {
    actions.clear()
    emit('update:modelValue', null)
  }
}
</script>

<template>
  <div class="dp-root">
    <input
      :id="inputId"
      ref="inputRef"
      type="text"
      class="dp-input"
      :name="name"
      :placeholder="placeholder"
      :disabled="disabled"
      :value="inputDisplay"
      autocomplete="off"
      :aria-haspopup="'dialog'"
      :aria-expanded="isOpen"
      :aria-controls="`${inputId}-popover`"
      @focus="open"
      @click="open"
      @change="handleInputChange"
    />

    <Teleport to="body">
      <div
        v-if="isOpen"
        :id="`${inputId}-popover`"
        ref="popoverRef"
        class="dp-root"
        :style="{
          position: 'absolute',
          top: `${popoverPosition.top}px`,
          left: `${popoverPosition.left}px`,
          minWidth: `${popoverPosition.minWidth}px`,
        }"
      >
        <DatePickerPopover
          :state="state"
          :cells="grid"
          :format-day-label="formatDayLabel"
          @select="handleSelect"
          @prev-month="actions.goToPrevMonth"
          @next-month="actions.goToNextMonth"
          @today="handleToday"
          @clear="handleClear"
        />
      </div>
    </Teleport>
  </div>
</template>
