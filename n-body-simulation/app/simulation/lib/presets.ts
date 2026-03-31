import { createBody } from './physics';
import type { BodyState, PresetDefinition } from './types';

const palette = ['#f4d35e', '#ee964b', '#f95738', '#0d3b66', '#4f6d7a', '#6fffe9', '#c0fdfb', '#f6bd60'];

function withRadius(body: Partial<BodyState>, index: number): BodyState {
  return createBody({
    color: palette[index % palette.length],
    ...body,
  });
}

export const PRESETS: PresetDefinition[] = [
  {
    id: 'binary-orbit',
    name: 'Binary Orbit',
    description: 'Two equal masses orbit a common barycenter with a lighter probe tracing perturbations.',
    tags: ['Classical', 'Stable', '2D'],
    sourceNote: 'Built from a symmetric equal-mass binary with a lightweight test body.',
    dimension: '2d',
    config: { dimension: '2d', timeStep: 0.008, zoom: 130, integrator: 'leapfrog' },
    bodies: [
      withRadius({ label: 'Primary A', mass: 26, radius: 8, position: { x: -1.2, y: 0, z: 0 }, velocity: { x: 0, y: -1.2, z: 0 } }, 0),
      withRadius({ label: 'Primary B', mass: 26, radius: 8, position: { x: 1.2, y: 0, z: 0 }, velocity: { x: 0, y: 1.2, z: 0 } }, 1),
      withRadius({ label: 'Scout', mass: 1.2, radius: 4, position: { x: 0, y: 3.4, z: 0 }, velocity: { x: 1.65, y: 0, z: 0 } }, 2),
    ],
  },
  {
    id: 'figure-eight',
    name: 'Figure Eight',
    description: 'A classic three-body choreography that loops forever in a single braided eight.',
    tags: ['Choreography', 'Canonical', '2D'],
    sourceNote: 'Uses the standard equal-mass figure-eight initial conditions.',
    dimension: '2d',
    config: { dimension: '2d', timeStep: 0.0045, zoom: 150, integrator: 'rk4', softening: 0.02 },
    bodies: [
      withRadius({ label: 'Alpha', mass: 1, radius: 5, position: { x: -0.97000436, y: 0.24308753, z: 0 }, velocity: { x: 0.466203685, y: 0.43236573, z: 0 } }, 0),
      withRadius({ label: 'Beta', mass: 1, radius: 5, position: { x: 0.97000436, y: -0.24308753, z: 0 }, velocity: { x: 0.466203685, y: 0.43236573, z: 0 } }, 1),
      withRadius({ label: 'Gamma', mass: 1, radius: 5, position: { x: 0, y: 0, z: 0 }, velocity: { x: -0.93240737, y: -0.86473146, z: 0 } }, 2),
    ],
  },
  {
    id: 'lagrange-triangle',
    name: 'Lagrange Triangle',
    description: 'Three equal bodies sit on an equilateral triangle and co-rotate as a rigid formation.',
    tags: ['Classical', 'Equilateral', '2D'],
    sourceNote: 'Inspired by the Lagrange equilateral three-body solution.',
    dimension: '2d',
    config: { dimension: '2d', timeStep: 0.006, zoom: 120, integrator: 'leapfrog', softening: 0.05 },
    bodies: [
      withRadius({ label: 'Vertex A', mass: 12, radius: 6, position: { x: 0, y: 2.6, z: 0 }, velocity: { x: -1.55, y: 0, z: 0 } }, 0),
      withRadius({ label: 'Vertex B', mass: 12, radius: 6, position: { x: -2.251, y: -1.3, z: 0 }, velocity: { x: 0.78, y: -1.35, z: 0 } }, 1),
      withRadius({ label: 'Vertex C', mass: 12, radius: 6, position: { x: 2.251, y: -1.3, z: 0 }, velocity: { x: 0.78, y: 1.35, z: 0 } }, 2),
    ],
  },
  {
    id: 'pythagorean',
    name: 'Pythagorean Swing',
    description: 'A famous three-body configuration that quickly turns into dramatic close encounters and slingshots.',
    tags: ['Chaotic', 'Historical', '2D'],
    sourceNote: 'Inspired by the classical Pythagorean three-body problem.',
    dimension: '2d',
    config: { dimension: '2d', timeStep: 0.0035, zoom: 95, integrator: 'rk4', softening: 0.03, trailLength: 260 },
    bodies: [
      withRadius({ label: 'Mass 3', mass: 3, radius: 5.2, position: { x: 1, y: 3, z: 0 }, velocity: { x: 0, y: 0, z: 0 } }, 0),
      withRadius({ label: 'Mass 4', mass: 4, radius: 5.8, position: { x: -2, y: -1, z: 0 }, velocity: { x: 0, y: 0, z: 0 } }, 1),
      withRadius({ label: 'Mass 5', mass: 5, radius: 6.4, position: { x: 1, y: -1, z: 0 }, velocity: { x: 0, y: 0, z: 0 } }, 2),
    ],
  },
  {
    id: 'hex-ring',
    name: 'Hex Ring',
    description: 'Six light bodies circulate around a central mass and sketch flower-like petals as the ring precesses.',
    tags: ['Symmetry', 'Rosette', '2D'],
    sourceNote: 'A cinematic ring preset rather than an exact closed-form choreography.',
    dimension: '2d',
    config: { dimension: '2d', timeStep: 0.0045, zoom: 90, integrator: 'leapfrog', trailLength: 240, softening: 0.04 },
    bodies: [
      withRadius({ label: 'Core', mass: 320, radius: 12, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, pinned: true, color: '#fff2b2' }, 0),
      withRadius({ label: 'Ring 1', mass: 2.6, radius: 4.2, position: { x: 5.2, y: 0, z: 0 }, velocity: { x: 0, y: 7.55, z: 0 } }, 1),
      withRadius({ label: 'Ring 2', mass: 2.6, radius: 4.2, position: { x: 2.6, y: 4.5, z: 0 }, velocity: { x: -6.55, y: 3.78, z: 0 } }, 2),
      withRadius({ label: 'Ring 3', mass: 2.6, radius: 4.2, position: { x: -2.6, y: 4.5, z: 0 }, velocity: { x: -6.55, y: -3.78, z: 0 } }, 3),
      withRadius({ label: 'Ring 4', mass: 2.6, radius: 4.2, position: { x: -5.2, y: 0, z: 0 }, velocity: { x: 0, y: -7.55, z: 0 } }, 4),
      withRadius({ label: 'Ring 5', mass: 2.6, radius: 4.2, position: { x: -2.6, y: -4.5, z: 0 }, velocity: { x: 6.55, y: -3.78, z: 0 } }, 5),
      withRadius({ label: 'Ring 6', mass: 2.6, radius: 4.2, position: { x: 2.6, y: -4.5, z: 0 }, velocity: { x: 6.55, y: 3.78, z: 0 } }, 6),
    ],
  },
  {
    id: 'yin-yang',
    name: 'Yin Yang Twin',
    description: 'Two heavier bodies orbit each other while four lighter companions weave mirrored crescents around them.',
    tags: ['Cinematic', 'Twin system', '2D'],
    sourceNote: 'A hand-tuned mirrored choreography designed for visual symmetry.',
    dimension: '2d',
    config: { dimension: '2d', timeStep: 0.0045, zoom: 108, integrator: 'midpoint', trailLength: 240, softening: 0.05 },
    bodies: [
      withRadius({ label: 'Twin A', mass: 18, radius: 7, position: { x: -1.6, y: 0, z: 0 }, velocity: { x: 0, y: -2.3, z: 0 } }, 0),
      withRadius({ label: 'Twin B', mass: 18, radius: 7, position: { x: 1.6, y: 0, z: 0 }, velocity: { x: 0, y: 2.3, z: 0 } }, 1),
      withRadius({ label: 'Arc 1', mass: 1.4, radius: 3.6, position: { x: -3.5, y: 1.5, z: 0 }, velocity: { x: -0.8, y: -3.95, z: 0 } }, 2),
      withRadius({ label: 'Arc 2', mass: 1.4, radius: 3.6, position: { x: -2.2, y: 3.4, z: 0 }, velocity: { x: 1.55, y: -2.85, z: 0 } }, 3),
      withRadius({ label: 'Arc 3', mass: 1.4, radius: 3.6, position: { x: 3.5, y: -1.5, z: 0 }, velocity: { x: 0.8, y: 3.95, z: 0 } }, 4),
      withRadius({ label: 'Arc 4', mass: 1.4, radius: 3.6, position: { x: 2.2, y: -3.4, z: 0 }, velocity: { x: -1.55, y: 2.85, z: 0 } }, 5),
    ],
  },
  {
    id: 'solar-miniature',
    name: 'Solar Miniature',
    description: 'A simplified star system with one dominant star, two planets, and a moon.',
    tags: ['Orbital', 'Hierarchical', '2D'],
    sourceNote: 'A stylized miniature planetary system.',
    dimension: '2d',
    config: { dimension: '2d', timeStep: 0.006, zoom: 80, integrator: 'leapfrog', trailLength: 220 },
    bodies: [
      withRadius({ label: 'Star', mass: 1200, radius: 14, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, pinned: true, color: '#fff2b2' }, 0),
      withRadius({ label: 'Planet I', mass: 10, radius: 6, position: { x: 4, y: 0, z: 0 }, velocity: { x: 0, y: 5.4, z: 0 } }, 1),
      withRadius({ label: 'Moon', mass: 0.8, radius: 3.5, position: { x: 4.8, y: 0, z: 0 }, velocity: { x: 0, y: 7.2, z: 0 } }, 2),
      withRadius({ label: 'Planet II', mass: 18, radius: 7, position: { x: -7.5, y: 0, z: 0 }, velocity: { x: 0, y: -3.95, z: 0 } }, 3),
    ],
  },
  {
    id: 'spiral-cluster',
    name: '3D Cluster',
    description: 'A rotating particle cloud rendered in perspective to reveal depth and precession.',
    tags: ['3D', 'Cluster', 'Perspective'],
    sourceNote: 'A hand-tuned 3D depth preset for the projected renderer.',
    dimension: '3d',
    config: { dimension: '3d', timeStep: 0.005, zoom: 95, cameraDistance: 24, integrator: 'midpoint', trailLength: 120 },
    bodies: [
      withRadius({ label: 'Core', mass: 200, radius: 12, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, pinned: true, color: '#fff2b2' }, 0),
      withRadius({ label: 'Body 1', mass: 4, radius: 4.5, position: { x: 4, y: 0, z: -1 }, velocity: { x: 0.3, y: 4.5, z: 0.7 } }, 1),
      withRadius({ label: 'Body 2', mass: 4, radius: 4.5, position: { x: -5, y: 1, z: 2.5 }, velocity: { x: -0.2, y: -4.2, z: -0.5 } }, 2),
      withRadius({ label: 'Body 3', mass: 6, radius: 5, position: { x: 0.5, y: 6, z: -3 }, velocity: { x: -4.1, y: 0.2, z: 0.6 } }, 3),
      withRadius({ label: 'Body 4', mass: 5, radius: 4.8, position: { x: 2.5, y: -6, z: 3.5 }, velocity: { x: 3.8, y: 0.6, z: -0.4 } }, 4),
      withRadius({ label: 'Body 5', mass: 3, radius: 4.2, position: { x: -1.5, y: -4.2, z: -5 }, velocity: { x: 4.4, y: -0.8, z: 0.8 } }, 5),
    ],
  },
  {
    id: 'double-helix',
    name: 'Double Helix',
    description: 'Two stacked orbital lanes in 3D braid around a compact core and produce a helix-like ribbon.',
    tags: ['3D', 'Helix', 'Cinematic'],
    sourceNote: 'A cinematic 3D preset tuned for the projected canvas renderer.',
    dimension: '3d',
    config: { dimension: '3d', timeStep: 0.0045, zoom: 86, cameraDistance: 26, integrator: 'midpoint', trailLength: 150, softening: 0.05 },
    bodies: [
      withRadius({ label: 'Core', mass: 240, radius: 12, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, pinned: true, color: '#fff2b2' }, 0),
      withRadius({ label: 'Lane A1', mass: 3.2, radius: 4.1, position: { x: 5.4, y: 0, z: -2.4 }, velocity: { x: 0.2, y: 5.6, z: 0.95 } }, 1),
      withRadius({ label: 'Lane A2', mass: 3.2, radius: 4.1, position: { x: -5.4, y: 0, z: 2.4 }, velocity: { x: -0.2, y: -5.6, z: -0.95 } }, 2),
      withRadius({ label: 'Lane B1', mass: 2.8, radius: 3.9, position: { x: 0, y: 5.8, z: 2.8 }, velocity: { x: -5.2, y: 0.15, z: -0.8 } }, 3),
      withRadius({ label: 'Lane B2', mass: 2.8, radius: 3.9, position: { x: 0, y: -5.8, z: -2.8 }, velocity: { x: 5.2, y: -0.15, z: 0.8 } }, 4),
      withRadius({ label: 'Lane C1', mass: 2.5, radius: 3.7, position: { x: 3.8, y: 3.8, z: -4.2 }, velocity: { x: -3.8, y: 3.6, z: 0.65 } }, 5),
      withRadius({ label: 'Lane C2', mass: 2.5, radius: 3.7, position: { x: -3.8, y: -3.8, z: 4.2 }, velocity: { x: 3.8, y: -3.6, z: -0.65 } }, 6),
    ],
  },
];

export function createRandomBodies(count: number, dimension: '2d' | '3d'): BodyState[] {
  return Array.from({ length: count }, (_, index) =>
    withRadius(
      {
        label: `Body ${index + 1}`,
        mass: 2 + Math.random() * 18,
        radius: 4 + Math.random() * 4,
        position: {
          x: Math.random() * 10 - 5,
          y: Math.random() * 10 - 5,
          z: dimension === '3d' ? Math.random() * 10 - 5 : 0,
        },
        velocity: {
          x: Math.random() * 2.5 - 1.25,
          y: Math.random() * 2.5 - 1.25,
          z: dimension === '3d' ? Math.random() * 2.5 - 1.25 : 0,
        },
      },
      index,
    ),
  );
}
