import { useState } from 'react'

import { DatePicker } from './components/DatePicker'
import './styles/demo.css'

interface LocaleOption {
  tag: string
  label: string
}

const locales: readonly LocaleOption[] = [
  { tag: 'en-US', label: 'English (US)' },
  { tag: 'pt-BR', label: 'Português (BR)' },
  { tag: 'de-DE', label: 'Deutsch (DE)' },
  { tag: 'ja-JP', label: '日本語' },
  { tag: 'ar-SA', label: 'العربية' },
]

const MIN_DATE = '2026-04-01'
const MAX_DATE = '2026-12-31'

export default function App() {
  const [selectedLocale, setSelectedLocale] = useState<string>('en-US')
  const [basicValue, setBasicValue] = useState<string | null>(null)
  const [constrainedValue, setConstrainedValue] = useState<string | null>(null)
  const [themedValue, setThemedValue] = useState<string | null>(null)

  return (
    <main className="demo">
      <header className="demo__header">
        <h1>Headless DatePicker — React</h1>
        <p>Same engine. Different framework. Identical behaviour.</p>
      </header>

      <section className="demo__locales" aria-label="Locale switcher">
        <h2>Locale</h2>
        <div className="demo__locale-buttons">
          {locales.map((locale) => (
            <button
              key={locale.tag}
              type="button"
              className="demo__locale-button"
              aria-pressed={selectedLocale === locale.tag}
              onClick={() => setSelectedLocale(locale.tag)}
            >
              {locale.label}
            </button>
          ))}
        </div>
      </section>

      <section className="demo__example">
        <h2>Basic</h2>
        <p className="demo__hint">Click the field to open the calendar. Esc to dismiss.</p>
        <DatePicker
          value={basicValue}
          onChange={setBasicValue}
          locale={selectedLocale}
        />
        <pre className="demo__output">value = {basicValue ?? '— no date selected —'}</pre>
      </section>

      <section className="demo__example">
        <h2>With min/max range</h2>
        <p className="demo__hint">
          Limited to <code>{MIN_DATE}</code> – <code>{MAX_DATE}</code>.
        </p>
        <DatePicker
          value={constrainedValue}
          onChange={setConstrainedValue}
          locale={selectedLocale}
          min={MIN_DATE}
          max={MAX_DATE}
          placeholder="Pick a date in range"
        />
        <pre className="demo__output">
          value = {constrainedValue ?? '— no date selected —'}
        </pre>
      </section>

      <section className="demo__example demo__example--themed">
        <h2>Custom theme via CSS variables</h2>
        <p className="demo__hint">No prop changes — only design tokens.</p>
        <DatePicker
          value={themedValue}
          onChange={setThemedValue}
          locale={selectedLocale}
          placeholder="Themed picker"
        />
        <pre className="demo__output">value = {themedValue ?? '— no date selected —'}</pre>
      </section>
    </main>
  )
}
