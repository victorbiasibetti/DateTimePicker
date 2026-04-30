/**
 * Public DatePicker component (React).
 *
 * Holds a `useDatePicker` engine instance and wires it to a text input +
 * portal popover. UI plumbing only — positioning, open/close, click-outside
 * dismissal, controlled `value` / `onChange`. All calendar math lives in
 * the engine.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { createPortal } from 'react-dom'

import type { PlainDateLike, Weekday } from '@datepicker/core'

import { useDatePicker } from '../hooks/useDatePicker'
import { DatePickerPopover } from './DatePickerPopover'
import '@datepicker/styles/datepicker.css'

export interface DatePickerProps {
  /** ISO `YYYY-MM-DD` string, or `null` when no date is selected. */
  value?: string | null
  onChange?: (value: string | null) => void
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
  onOpen?: () => void
  onClose?: () => void
}

interface PopoverPosition {
  top: number
  left: number
  minWidth: number
}

const INITIAL_POSITION: PopoverPosition = { top: 0, left: 0, minWidth: 0 }

export function DatePicker({
  value = null,
  onChange,
  min = null,
  max = null,
  locale = 'en-US',
  weekStartsOn,
  placeholder = 'Select a date',
  disabled = false,
  name,
  id,
  formatInput,
  onOpen,
  onClose,
}: DatePickerProps) {
  const fallbackId = useId()
  const inputId = id ?? fallbackId
  const popoverId = `${inputId}-popover`

  const initialOptions = useMemo(
    () => ({
      initialDate: value,
      min,
      max,
      locale,
      ...(weekStartsOn !== undefined ? { weekStartsOn } : {}),
    }),
    // The engine is constructed once; props are synced through dedicated
    // setters below. Disable the lint rule here because the dependency
    // closure intentionally captures only the initial values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const { state, grid, actions, formatDayLabel, parseISO } = useDatePicker(initialOptions)

  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<PopoverPosition>(INITIAL_POSITION)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  /* -------------------------------------------------------------- */
  /* External prop sync (engine setters)                            */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    const current = state.selected?.toISO() ?? null
    if (value === current) return
    if (value === null) actions.clear()
    else actions.select(value)
    // `state.selected` is intentionally excluded; we only react to outer
    // value changes to push them down into the engine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    actions.setLocale(locale)
  }, [actions, locale])

  useEffect(() => {
    actions.setMin(min)
  }, [actions, min])

  useEffect(() => {
    actions.setMax(max)
  }, [actions, max])

  /* -------------------------------------------------------------- */
  /* Display value                                                  */
  /* -------------------------------------------------------------- */

  const inputValue = useMemo(() => {
    const date = state.selected
    if (formatInput) return formatInput(date)
    if (!date) return ''
    return new Intl.DateTimeFormat(state.locale, { dateStyle: 'medium' }).format(
      date.toNativeDate(),
    )
  }, [formatInput, state.selected, state.locale])

  /* -------------------------------------------------------------- */
  /* Positioning                                                    */
  /* -------------------------------------------------------------- */

  const updatePosition = useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect()
    if (!rect) return
    setPosition({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      minWidth: rect.width,
    })
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, updatePosition])

  /* -------------------------------------------------------------- */
  /* Open / close                                                   */
  /* -------------------------------------------------------------- */

  const open = useCallback(() => {
    if (disabled) return
    setIsOpen((wasOpen) => {
      if (wasOpen) return wasOpen
      onOpen?.()
      return true
    })
  }, [disabled, onOpen])

  const close = useCallback(
    ({ restoreFocus = true }: { restoreFocus?: boolean } = {}) => {
      setIsOpen((wasOpen) => {
        if (!wasOpen) return wasOpen
        onClose?.()
        if (restoreFocus) {
          // Defer to allow the popover to unmount before focusing back.
          queueMicrotask(() => inputRef.current?.focus())
        }
        return false
      })
    },
    [onClose],
  )

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (inputRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      close({ restoreFocus: false })
    }
    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [isOpen, close])

  /* -------------------------------------------------------------- */
  /* Engine actions                                                 */
  /* -------------------------------------------------------------- */

  const handleSelect = useCallback(
    (date: PlainDateLike) => {
      actions.select(date)
      onChange?.(date.toISO())
      close()
    },
    [actions, close, onChange],
  )

  const handleToday = useCallback(() => {
    actions.goToToday()
  }, [actions])

  const handleClear = useCallback(() => {
    actions.clear()
    onChange?.(null)
  }, [actions, onChange])

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value
      if (next === '') {
        actions.clear()
        onChange?.(null)
        return
      }
      const parsed = parseISO(next)
      if (parsed) {
        actions.select(parsed)
        onChange?.(parsed.toISO())
      }
    },
    [actions, onChange, parseISO],
  )

  return (
    <div className="dp-root">
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        className="dp-input"
        name={name}
        placeholder={placeholder}
        disabled={disabled}
        value={inputValue}
        autoComplete="off"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        onFocus={open}
        onClick={open}
        onChange={handleInputChange}
      />

      {isOpen &&
        createPortal(
          <div
            id={popoverId}
            ref={popoverRef}
            className="dp-root"
            style={{
              position: 'absolute',
              top: position.top,
              left: position.left,
              minWidth: position.minWidth,
            }}
          >
            <DatePickerPopover
              state={state}
              cells={grid}
              formatDayLabel={formatDayLabel}
              onSelect={handleSelect}
              onPrevMonth={actions.goToPrevMonth}
              onNextMonth={actions.goToNextMonth}
              onToday={handleToday}
              onClear={handleClear}
            />
          </div>,
          document.body,
        )}
    </div>
  )
}
