# Nbody-simulator
<<<<<<< HEAD
a program which simulates planet trajectories using differential equations. The user can choose different numerical solvers to see how their performance compares.

n-body-simulation contains a Next.Js prject done in typescript for better performance. However for more lightweight usage one can just use true_bodies.html for a good enough understanding of the project and how the solvers work.
=======

An interactive N-body simulator built with Next.js. The project now includes:

- a cleaner shared physics engine instead of a single monolithic component
- multiple integrators: `leapfrog`, `rk4`, `midpoint`, and `euler`
- curated presets including binary orbits, a figure-eight solution, a mini solar system, and a projected 3D cluster
- live diagnostics for energy, momentum, center of mass, and peak speed
- direct body editing, random system generation, trail controls, collision merging, and a small server-side summary endpoint

## Run locally

```bash
cd n-body-simulation
npm install
npm run dev
```

Open `http://localhost:3000`.

## Main app structure

- `app/simulation/components/Simulation.tsx`: main simulator experience and controls
- `app/simulation/lib/physics.ts`: stepping logic, integrators, and diagnostics
- `app/simulation/lib/presets.ts`: hand-authored starting systems
- `app/api/simulation/route.ts`: validates a submitted configuration and returns a server summary


>>>>>>> 207a13b (upgrade)
