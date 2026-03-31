import { NextResponse } from 'next/server';
import { computeMetrics, DEFAULT_CONFIG } from '../../simulation/lib/physics';
import type { BodyState, SimulationConfig } from '../../simulation/lib/types';

export const runtime = 'nodejs';

function isVector3(value: unknown): value is BodyState['position'] {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).x === 'number' &&
    typeof (value as Record<string, unknown>).y === 'number' &&
    typeof (value as Record<string, unknown>).z === 'number'
  );
}

function isBody(value: unknown): value is BodyState {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).id === 'string' &&
    typeof (value as Record<string, unknown>).label === 'string' &&
    typeof (value as Record<string, unknown>).color === 'string' &&
    typeof (value as Record<string, unknown>).mass === 'number' &&
    typeof (value as Record<string, unknown>).radius === 'number' &&
    isVector3((value as Record<string, unknown>).position) &&
    isVector3((value as Record<string, unknown>).velocity)
  );
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const bodies = payload?.bodies;
    const config = payload?.config as Partial<SimulationConfig> | undefined;
    const presetName = typeof payload?.presetName === 'string' ? payload.presetName : 'Custom';

    if (!Array.isArray(bodies) || !bodies.every(isBody)) {
      return NextResponse.json({ error: 'Invalid bodies payload' }, { status: 400 });
    }

    const effectiveConfig: SimulationConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      dimension: config?.dimension === '3d' ? '3d' : '2d',
      integrator: config?.integrator ?? DEFAULT_CONFIG.integrator,
      collisionMode: config?.collisionMode ?? DEFAULT_CONFIG.collisionMode,
    };

    const metrics = computeMetrics(bodies, effectiveConfig);
    const recommendations: string[] = [];

    if (Math.abs(metrics.totalEnergy) > 5000) {
      recommendations.push('Energy magnitude is high; reducing the time step may improve long-run stability.');
    }
    if (metrics.maxSpeed > 12) {
      recommendations.push('One or more bodies are moving quickly; increasing softening can reduce close-pass blowups.');
    }
    if (effectiveConfig.dimension === '3d') {
      recommendations.push('3D mode is active; camera distance and rotation are worth tuning together for clearer depth separation.');
    } else {
      recommendations.push('2D mode is active; the figure-eight preset is a good stress test for integrator quality.');
    }
    if (recommendations.length === 0) {
      recommendations.push('The current system looks numerically tame; try merging collisions or randomizing more bodies for richer behavior.');
    }

    return NextResponse.json({
      status: 'ok',
      data: {
        presetName,
        metrics,
        receivedAt: new Date().toISOString(),
        recommendations,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Unable to process simulation request' }, { status: 500 });
  }
}
