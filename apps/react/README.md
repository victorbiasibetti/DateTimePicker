# DatePicker — React 19 example

Thin React shell on top of the headless engine at `../../src/engine/`.
The engine state is read through `useSyncExternalStore` inside the
`useDatePicker` hook; everything else is standard React.

## Run

From the repo root (workspaces installed once):

```bash
npm install
npm run dev:react            # http://localhost:5173
npm run build:react          # production build (tsc + vite)
npm run lint --workspace=apps/react
```

Or from this directory:

```bash
npm run dev
npm run build
npm run lint
```

## Component

```tsx
<DatePicker value={value} onChange={setValue} locale="pt-BR" />
```

Props: `value`, `onChange`, `min`, `max`, `locale`, `weekStartsOn`,
`placeholder`, `disabled`, `name`, `id`, `formatInput`, `onOpen`,
`onClose`.
