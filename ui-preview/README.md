# OneSight button preview

The live OneSight site serves static HTML and CSS from `dist/`. This standalone preview adds React, TypeScript, Tailwind CSS 4 and a shadcn-compatible layout without changing production pages or the root build.

## Run the included preview

Use Node.js 22.12 or newer:

```sh
cd ui-preview
npm install
npm run dev
```

Run `npm run build` to type-check and build. The demo has no external side effects.

## Where files go

- Reusable UI: `components/ui/interactive-hover-button.tsx`
- Global styles and color tokens: `styles/globals.css`
- Class name helper: `lib/utils.ts`
- Preview: `demo.tsx`

The `@` alias points at the preview root in both Vite and TypeScript. shadcn reads `aliases.ui` in `components.json` to decide where to put UI components. Keep it aligned with imports such as `@/components/ui/interactive-hover-button`. In an app where `@` points to `src`, that same import maps to `src/components/ui`; an absolute filesystem path is not needed.

## Set up another React app

For a fresh Vite React app with TypeScript, Tailwind and shadcn:

```sh
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm install tailwindcss @tailwindcss/vite
```

Register `tailwindcss()` from `@tailwindcss/vite` in `vite.config.ts`, start the app's global CSS with `@import "tailwindcss";`, and set the matching `@` aliases in Vite and the app's TypeScript config. Then run:

```sh
npx shadcn@latest init
npm install lucide-react
```

Check `tailwind.css` and `aliases.ui` in `components.json`, then copy the component and render it with `<InteractiveHoverButton text="Start a project" />`. The Vite TypeScript template already includes TypeScript; for a JavaScript React app being converted manually, install `npm install -D typescript @types/react @types/react-dom` and add a TypeScript config with JSX enabled. The included preview already has these settings and is ready for `npm install`.
