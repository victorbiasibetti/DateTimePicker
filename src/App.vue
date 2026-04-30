<script setup lang="ts">
import { computed, ref } from 'vue'

import DatePicker from './components/DatePicker/DatePicker.vue'

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

const selectedLocale = ref<string>('en-US')
const basicValue = ref<string | null>(null)
const constrainedValue = ref<string | null>(null)
const themedValue = ref<string | null>(null)

const minDate = '2026-04-01'
const maxDate = '2026-12-31'

const basicLabel = computed(() => basicValue.value ?? '— no date selected —')
const constrainedLabel = computed(() => constrainedValue.value ?? '— no date selected —')
const themedLabel = computed(() => themedValue.value ?? '— no date selected —')
</script>

<template>
  <main class="demo">
    <header class="demo__header">
      <h1>Headless DatePicker</h1>
      <p>Vanilla TypeScript engine, Vue UI shell, CSS-variable theme.</p>
    </header>

    <section class="demo__locales" aria-label="Locale switcher">
      <h2>Locale</h2>
      <div class="demo__locale-buttons">
        <button
          v-for="locale in locales"
          :key="locale.tag"
          type="button"
          class="demo__locale-button"
          :aria-pressed="selectedLocale === locale.tag"
          @click="selectedLocale = locale.tag"
        >
          {{ locale.label }}
        </button>
      </div>
    </section>

    <section class="demo__example">
      <h2>Basic</h2>
      <p class="demo__hint">Click the field to open the calendar. Esc to dismiss.</p>
      <DatePicker v-model="basicValue" :locale="selectedLocale" />
      <pre class="demo__output">v-model = {{ basicLabel }}</pre>
    </section>

    <section class="demo__example">
      <h2>With min/max range</h2>
      <p class="demo__hint">
        Limited to <code>{{ minDate }}</code> – <code>{{ maxDate }}</code>.
      </p>
      <DatePicker
        v-model="constrainedValue"
        :locale="selectedLocale"
        :min="minDate"
        :max="maxDate"
        placeholder="Pick a date in range"
      />
      <pre class="demo__output">v-model = {{ constrainedLabel }}</pre>
    </section>

    <section class="demo__example demo__example--themed">
      <h2>Custom theme via CSS variables</h2>
      <p class="demo__hint">No prop changes — only design tokens.</p>
      <DatePicker
        v-model="themedValue"
        :locale="selectedLocale"
        placeholder="Themed picker"
      />
      <pre class="demo__output">v-model = {{ themedLabel }}</pre>
    </section>
  </main>
</template>

<style scoped>
.demo {
  /* Local design tokens — adapt to the user's colour scheme so neither
     foreground nor button surfaces collapse onto the page background. */
  --demo-fg: #1f2937;
  --demo-muted: #6b7280;
  --demo-surface: #ffffff;
  --demo-surface-alt: #f9fafb;
  --demo-border: #e5e7eb;
  --demo-accent: #2563eb;
  --demo-accent-fg: #ffffff;

  max-width: 720px;
  margin: 0 auto;
  padding: 32px 20px 80px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: var(--demo-fg);
}

@media (prefers-color-scheme: dark) {
  .demo {
    --demo-fg: #e2e8f0;
    --demo-muted: #94a3b8;
    --demo-surface: #1e293b;
    --demo-surface-alt: #0f172a;
    --demo-border: #334155;
    --demo-accent: #60a5fa;
    --demo-accent-fg: #0f172a;
  }
}

.demo__header h1 {
  margin: 0 0 8px;
  font-size: 1.875rem;
  letter-spacing: -0.02em;
}

.demo__header p {
  margin: 0;
  color: var(--demo-muted);
}

.demo__locales h2,
.demo__example h2 {
  margin: 0 0 12px;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--demo-muted);
}

.demo__locale-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.demo__locale-button {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--demo-border);
  background: var(--demo-surface);
  color: var(--demo-fg);
  cursor: pointer;
  font: inherit;
  transition: all 120ms ease-out;
}

.demo__locale-button[aria-pressed='true'] {
  background: var(--demo-accent);
  border-color: var(--demo-accent);
  color: var(--demo-accent-fg);
}

.demo__example {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo__hint {
  margin: 0 0 4px;
  color: var(--demo-muted);
  font-size: 0.875rem;
}

.demo__hint code {
  background: var(--demo-surface-alt);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.8em;
  color: var(--demo-fg);
}

.demo__output {
  margin: 0;
  padding: 8px 12px;
  background: var(--demo-surface-alt);
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8125rem;
  color: var(--demo-fg);
}

/* Demonstrates how a consumer rethemes via the documented CSS variables. */
.demo__example--themed {
  --dp-bg: #0f172a;
  --dp-fg: #e2e8f0;
  --dp-muted-fg: #94a3b8;
  --dp-border: #1e293b;
  --dp-hover-bg: #1e293b;
  --dp-accent: #f59e0b;
  --dp-accent-fg: #0f172a;
  --dp-accent-soft-bg: rgba(245, 158, 11, 0.18);
  --dp-today-ring: #f59e0b;
  --dp-disabled-fg: #475569;
  --dp-outside-fg: #64748b;
  --dp-radius: 16px;
  --dp-cell-size: 40px;
}
</style>
