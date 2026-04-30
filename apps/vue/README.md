# DatePicker — Vue 3 example

Thin Vue shell on top of the headless engine at `../../src/engine/`.
The engine state is mirrored into a `shallowRef` via the
`useDatePicker` composable; everything else is plain Vue templating.

## Run

From the repo root (workspaces installed once):

```bash
npm install
npm run dev:vue              # http://localhost:5173
npm run build:vue            # production build (vue-tsc + vite)
npm run lint --workspace=apps/vue
```

Or from this directory:

```bash
npm run dev
npm run build
npm run lint
```

## Component

```vue
<DatePicker v-model="value" locale="pt-BR" />
```

Props: `modelValue`, `min`, `max`, `locale`, `weekStartsOn`,
`placeholder`, `disabled`, `name`, `id`, `formatInput`.
Emits: `update:modelValue`, `open`, `close`.
