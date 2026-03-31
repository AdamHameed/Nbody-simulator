import type {
  BodyState,
  IntegratorName,
  SimulationConfig,
  SimulationDimension,
  SimulationMetrics,
  Vector3,
} from './types';

const ZERO: Vector3 = { x: 0, y: 0, z: 0 };

export const DEFAULT_CONFIG: SimulationConfig = {
  dimension: '2d',
  integrator: 'leapfrog',
  gravitationalConstant: 1,
  softening: 0.18,
  timeStep: 0.01,
  trailLength: 180,
  cameraDistance: 18,
  zoom: 105,
  collisionMode: 'pass-through',
};

export function createBody(overrides: Partial<BodyState> = {}): BodyState {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    label: overrides.label ?? 'Body',
    color: overrides.color ?? '#ffffff',
    mass: overrides.mass ?? 10,
    radius: overrides.radius ?? Math.max(3, Math.sqrt(overrides.mass ?? 10) * 1.5),
    position: overrides.position ?? { x: 0, y: 0, z: 0 },
    velocity: overrides.velocity ?? { x: 0, y: 0, z: 0 },
    pinned: overrides.pinned ?? false,
  };
}

function add(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtract(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(v: Vector3, factor: number): Vector3 {
  return { x: v.x * factor, y: v.y * factor, z: v.z * factor };
}

function magnitude(v: Vector3, dimension: SimulationDimension): number {
  const z = dimension === '3d' ? v.z : 0;
  return Math.sqrt(v.x * v.x + v.y * v.y + z * z);
}

function normalizeForDimension(v: Vector3, dimension: SimulationDimension): Vector3 {
  return dimension === '3d' ? v : { ...v, z: 0 };
}

function computeAccelerations(bodies: BodyState[], config: SimulationConfig): Vector3[] {
  const accelerations = bodies.map(() => ({ ...ZERO }));

  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const delta = normalizeForDimension(
        subtract(bodies[j].position, bodies[i].position),
        config.dimension,
      );
      const distanceSq =
        delta.x * delta.x +
        delta.y * delta.y +
        delta.z * delta.z +
        config.softening * config.softening;
      const distance = Math.sqrt(distanceSq);
      const distanceCubed = distanceSq * distance;
      const forceScale = config.gravitationalConstant / distanceCubed;

      const accelOnI = scale(delta, forceScale * bodies[j].mass);
      const accelOnJ = scale(delta, -forceScale * bodies[i].mass);

      accelerations[i] = add(accelerations[i], accelOnI);
      accelerations[j] = add(accelerations[j], accelOnJ);
    }
  }

  return accelerations;
}

function derivative(bodies: BodyState[], config: SimulationConfig) {
  const accelerations = computeAccelerations(bodies, config);

  return bodies.map((body, index) => ({
    position: body.pinned ? { ...ZERO } : normalizeForDimension(body.velocity, config.dimension),
    velocity: body.pinned ? { ...ZERO } : accelerations[index],
  }));
}

function integrateEuler(bodies: BodyState[], config: SimulationConfig): BodyState[] {
  const d = derivative(bodies, config);
  return bodies.map((body, index) =>
    body.pinned
      ? body
      : {
          ...body,
          position: add(body.position, scale(d[index].position, config.timeStep)),
          velocity: add(body.velocity, scale(d[index].velocity, config.timeStep)),
        },
  );
}

function integrateMidpoint(bodies: BodyState[], config: SimulationConfig): BodyState[] {
  const first = derivative(bodies, config);
  const midBodies = bodies.map((body, index) =>
    body.pinned
      ? body
      : {
          ...body,
          position: add(body.position, scale(first[index].position, config.timeStep / 2)),
          velocity: add(body.velocity, scale(first[index].velocity, config.timeStep / 2)),
        },
  );
  const second = derivative(midBodies, config);

  return bodies.map((body, index) =>
    body.pinned
      ? body
      : {
          ...body,
          position: add(body.position, scale(second[index].position, config.timeStep)),
          velocity: add(body.velocity, scale(second[index].velocity, config.timeStep)),
        },
  );
}

function integrateRk4(bodies: BodyState[], config: SimulationConfig): BodyState[] {
  const k1 = derivative(bodies, config);

  const stage = (source: BodyState[], delta: typeof k1, factor: number) =>
    source.map((body, index) =>
      body.pinned
        ? body
        : {
            ...body,
            position: add(body.position, scale(delta[index].position, config.timeStep * factor)),
            velocity: add(body.velocity, scale(delta[index].velocity, config.timeStep * factor)),
          },
    );

  const k2Bodies = stage(bodies, k1, 0.5);
  const k2 = derivative(k2Bodies, config);
  const k3Bodies = stage(bodies, k2, 0.5);
  const k3 = derivative(k3Bodies, config);
  const k4Bodies = stage(bodies, k3, 1);
  const k4 = derivative(k4Bodies, config);

  return bodies.map((body, index) =>
    body.pinned
      ? body
      : {
          ...body,
          position: add(
            body.position,
            scale(
              add(
                add(k1[index].position, scale(add(k2[index].position, k3[index].position), 2)),
                k4[index].position,
              ),
              config.timeStep / 6,
            ),
          ),
          velocity: add(
            body.velocity,
            scale(
              add(
                add(k1[index].velocity, scale(add(k2[index].velocity, k3[index].velocity), 2)),
                k4[index].velocity,
              ),
              config.timeStep / 6,
            ),
          ),
        },
  );
}

function integrateLeapfrog(bodies: BodyState[], config: SimulationConfig): BodyState[] {
  const accelerations = computeAccelerations(bodies, config);
  const halfStepVelocities = bodies.map((body, index) =>
    body.pinned ? body.velocity : add(body.velocity, scale(accelerations[index], config.timeStep / 2)),
  );

  const movedBodies = bodies.map((body, index) =>
    body.pinned
      ? body
      : {
          ...body,
          position: add(
            body.position,
            scale(normalizeForDimension(halfStepVelocities[index], config.dimension), config.timeStep),
          ),
          velocity: halfStepVelocities[index],
        },
  );

  const nextAccelerations = computeAccelerations(movedBodies, config);

  return movedBodies.map((body, index) =>
    body.pinned
      ? body
      : {
          ...body,
          velocity: add(body.velocity, scale(nextAccelerations[index], config.timeStep / 2)),
        },
  );
}

function mergeCollisions(bodies: BodyState[], config: SimulationConfig): BodyState[] {
  if (config.collisionMode !== 'merge' || bodies.length < 2) {
    return bodies;
  }

  const consumed = new Set<string>();
  const next: BodyState[] = [];

  for (let i = 0; i < bodies.length; i += 1) {
    if (consumed.has(bodies[i].id)) {
      continue;
    }

    let merged = { ...bodies[i] };

    for (let j = i + 1; j < bodies.length; j += 1) {
      if (consumed.has(bodies[j].id)) {
        continue;
      }

      const delta = subtract(bodies[j].position, merged.position);
      const distance = magnitude(delta, config.dimension);
      const contact = merged.radius / config.zoom + bodies[j].radius / config.zoom;

      if (distance > contact) {
        continue;
      }

      const totalMass = merged.mass + bodies[j].mass;
      const weightedPosition = scale(
        add(scale(merged.position, merged.mass), scale(bodies[j].position, bodies[j].mass)),
        1 / totalMass,
      );
      const weightedVelocity = scale(
        add(scale(merged.velocity, merged.mass), scale(bodies[j].velocity, bodies[j].mass)),
        1 / totalMass,
      );

      merged = {
        ...merged,
        label: `${merged.label} + ${bodies[j].label}`,
        mass: totalMass,
        radius: Math.sqrt(merged.radius * merged.radius + bodies[j].radius * bodies[j].radius),
        position: weightedPosition,
        velocity: weightedVelocity,
        pinned: merged.pinned && bodies[j].pinned,
      };
      consumed.add(bodies[j].id);
    }

    next.push(merged);
  }

  return next;
}

export function stepSimulation(bodies: BodyState[], config: SimulationConfig): BodyState[] {
  const integrators: Record<IntegratorName, (items: BodyState[], cfg: SimulationConfig) => BodyState[]> = {
    euler: integrateEuler,
    midpoint: integrateMidpoint,
    rk4: integrateRk4,
    leapfrog: integrateLeapfrog,
  };

  const integrated = integrators[config.integrator](bodies, config).map((body) => ({
    ...body,
    position: normalizeForDimension(body.position, config.dimension),
    velocity: normalizeForDimension(body.velocity, config.dimension),
  }));

  return mergeCollisions(integrated, config);
}

export function computeMetrics(bodies: BodyState[], config: SimulationConfig): SimulationMetrics {
  let kineticEnergy = 0;
  let potentialEnergy = 0;
  let maxSpeed = 0;
  let totalMass = 0;
  let totalMomentum = { ...ZERO };
  let centerOfMassAccumulator = { ...ZERO };

  for (let i = 0; i < bodies.length; i += 1) {
    const speed = magnitude(bodies[i].velocity, config.dimension);
    kineticEnergy += 0.5 * bodies[i].mass * speed * speed;
    maxSpeed = Math.max(maxSpeed, speed);
    totalMomentum = add(totalMomentum, scale(bodies[i].velocity, bodies[i].mass));
    centerOfMassAccumulator = add(centerOfMassAccumulator, scale(bodies[i].position, bodies[i].mass));
    totalMass += bodies[i].mass;

    for (let j = i + 1; j < bodies.length; j += 1) {
      const delta = subtract(bodies[j].position, bodies[i].position);
      const distance = Math.max(magnitude(delta, config.dimension), config.softening);
      potentialEnergy -= (config.gravitationalConstant * bodies[i].mass * bodies[j].mass) / distance;
    }
  }

  return {
    kineticEnergy,
    potentialEnergy,
    totalEnergy: kineticEnergy + potentialEnergy,
    totalMomentum,
    centerOfMass: totalMass > 0 ? scale(centerOfMassAccumulator, 1 / totalMass) : { ...ZERO },
    maxSpeed,
    bodyCount: bodies.length,
  };
}
