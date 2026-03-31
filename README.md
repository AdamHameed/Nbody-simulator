# Nbody-simulator

Interactive N-body simulator for exploring gravitational motion, numerical integration, and emergent orbital patterns.

The main application lives in [`n-body-simulation`](./n-body-simulation) and is built with Next.js and TypeScript. There is also a lightweight standalone HTML prototype in [`true_nbodies.html`](./true_nbodies.html).

## Features

- multiple numerical integrators: `leapfrog`, `rk4`, `midpoint`, and `euler`
- 2D and projected 3D simulation modes
- curated presets including figure-eight, Lagrange triangle, Pythagorean swing, hex ring, and 3D cluster systems
- live diagnostics for energy, momentum, center of mass, and speed
- editable bodies, random systems, collision merging, and server-side simulation summaries

## Run the app

```bash
cd n-body-simulation
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Project structure

- `n-body-simulation/app/simulation/components/Simulation.tsx`: main simulator UI
- `n-body-simulation/app/simulation/lib/physics.ts`: integrators, stepping logic, and diagnostics
- `n-body-simulation/app/simulation/lib/presets.ts`: built-in preset systems
- `n-body-simulation/app/api/simulation/route.ts`: server endpoint for simulation summaries
- `true_nbodies.html`: lightweight standalone prototype

## Notes

- `leapfrog` is the default integrator because it behaves well for orbital systems.
- Some presets are classical configurations and some are hand-tuned cinematic systems designed to produce interesting shapes.
