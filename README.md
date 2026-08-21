# CalmSpace Planner

CalmSpace Planner is a calm, low-distraction task planner built for autistic and ADHD users. It uses Spoon Theory energy budgeting to help you estimate and track the cost of each task, breaks work down into approachable micro-steps, and includes a focus timer, XP/badges for gentle motivation, and optional Firebase sync so your plans follow you across devices.

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Firebase (optional)
- Vitest (unit tests)

## How to run

```bash
npm install     # install dependencies
npm run dev     # start the dev server (http://localhost:3000)
npm run build   # build for production
npm run lint    # type-check with tsc --noEmit
npm test        # run unit tests (vitest run)
```

## Firebase (optional)

Firebase sync is optional. To enable it, fill in your project config at `src/firebase-applet-config.json`. If it is left empty, CalmSpace Planner runs in offline mode and stores everything in localStorage.
