export type SimulationDimension = '2d' | '3d';

export type IntegratorName = 'leapfrog' | 'rk4' | 'midpoint' | 'euler';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface BodyState {
  id: string;
  label: string;
  color: string;
  mass: number;
  radius: number;
  position: Vector3;
  velocity: Vector3;
  pinned?: boolean;
}

export interface SimulationConfig {
  dimension: SimulationDimension;
  integrator: IntegratorName;
  gravitationalConstant: number;
  softening: number;
  timeStep: number;
  trailLength: number;
  cameraDistance: number;
  zoom: number;
  collisionMode: 'pass-through' | 'merge';
}

export interface SimulationMetrics {
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  totalMomentum: Vector3;
  centerOfMass: Vector3;
  maxSpeed: number;
  bodyCount: number;
}

export interface PresetDefinition {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  sourceNote?: string;
  dimension: SimulationDimension;
  config?: Partial<SimulationConfig>;
  bodies: BodyState[];
}
