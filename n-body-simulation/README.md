# N-body simulation app

This is the Next.js app for the repository root project. It provides an interactive simulation workspace for experimenting with gravitational N-body systems.

## What it includes

- a shared physics engine with `leapfrog`, `rk4`, `midpoint`, and `euler`
- 2D and projected 3D modes
- preset systems ranging from classical choreographies to hand-tuned cinematic formations
- a compact control dock for camera, solver, body editing, and diagnostics
- an API route that returns a summary of the current simulation state

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev`: start the development server
- `npm run build`: create a production build
- `npm run start`: run the production server
- `npm run lint`: run Next.js linting

## Important files

- `app/page.tsx`: landing page
- `app/simulation/components/Simulation.tsx`: main simulator interface
- `app/simulation/lib/physics.ts`: integrators and physics helpers
- `app/simulation/lib/presets.ts`: built-in preset definitions
- `app/simulation/lib/types.ts`: shared simulation types
- `app/api/simulation/route.ts`: simulation analysis endpoint

## Notes

- The 3D mode uses perspective projection on a canvas rather than a dedicated WebGL renderer.
- Presets marked as classical are inspired by well-known N-body configurations; others are visual exploration presets tuned for interesting motion.
