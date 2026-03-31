'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './simulation.module.css';
import { computeMetrics, DEFAULT_CONFIG, stepSimulation } from '../lib/physics';
import { createRandomBodies, PRESETS } from '../lib/presets';
import type {
  BodyState,
  IntegratorName,
  PresetDefinition,
  SimulationConfig,
  SimulationMetrics,
  Vector3,
} from '../lib/types';

type ApiSummary = {
  presetName: string;
  metrics: SimulationMetrics;
  receivedAt: string;
  recommendations: string[];
} | null;

type PanelId = 'setup' | 'bodies' | 'insights';
type CameraMode = 'origin' | 'center' | 'selected';

const ZERO: Vector3 = { x: 0, y: 0, z: 0 };

const INTEGRATOR_LABELS: Record<IntegratorName, string> = {
  leapfrog: 'Leapfrog',
  rk4: 'RK4',
  midpoint: 'Midpoint',
  euler: 'Euler',
};

function cloneBodies(bodies: BodyState[]) {
  return bodies.map((body) => ({
    ...body,
    position: { ...body.position },
    velocity: { ...body.velocity },
  }));
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(Math.abs(value) >= 100 ? 1 : 3) : '0.000';
}

function subtract(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function getSelectedBody(bodies: BodyState[], selectedBodyId: string) {
  return bodies.find((body) => body.id === selectedBodyId) ?? bodies[0] ?? null;
}

function getCameraCenter(
  bodies: BodyState[],
  metrics: SimulationMetrics,
  selectedBodyId: string,
  cameraMode: CameraMode,
): Vector3 {
  if (cameraMode === 'center') {
    return metrics.centerOfMass;
  }

  if (cameraMode === 'selected') {
    return getSelectedBody(bodies, selectedBodyId)?.position ?? ZERO;
  }

  return ZERO;
}

function projectPoint(
  point: Vector3,
  radius: number,
  width: number,
  height: number,
  config: SimulationConfig,
  rotation: number,
) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const rotatedX = point.x * cos - point.z * sin;
  const rotatedZ = point.x * sin + point.z * cos;
  const perspective = config.dimension === '3d' ? config.cameraDistance / (config.cameraDistance + rotatedZ) : 1;
  return {
    x: width / 2 + rotatedX * config.zoom * perspective,
    y: height / 2 + point.y * config.zoom * perspective,
    radius: Math.max(1.75, radius * perspective),
    depth: perspective,
  };
}

function computeAutoZoom(
  bodies: BodyState[],
  metrics: SimulationMetrics,
  config: SimulationConfig,
  selectedBodyId: string,
  cameraMode: CameraMode,
  viewport: { width: number; height: number },
) {
  if (!bodies.length) {
    return config.zoom;
  }

  const center = getCameraCenter(bodies, metrics, selectedBodyId, cameraMode);
  const availableWidth = Math.max(320, viewport.width - 470);
  const availableHeight = Math.max(240, viewport.height - 180);
  let maxX = 1;
  let maxY = 1;

  for (const body of bodies) {
    const relative = subtract(body.position, center);
    const xSpread = Math.abs(relative.x) + body.radius * 0.08 + (config.dimension === '3d' ? Math.abs(relative.z) * 0.25 : 0);
    const ySpread = Math.abs(relative.y) + body.radius * 0.08 + (config.dimension === '3d' ? Math.abs(relative.z) * 0.12 : 0);
    maxX = Math.max(maxX, xSpread);
    maxY = Math.max(maxY, ySpread);
  }

  const nextZoom = Math.min((availableWidth * 0.42) / maxX, (availableHeight * 0.42) / maxY);
  return Math.max(28, Math.min(220, nextZoom));
}

export default function Simulation() {
  const presetsById = useMemo(
    () => Object.fromEntries(PRESETS.map((preset) => [preset.id, preset])),
    [],
  );

  const initialConfig = {
    ...DEFAULT_CONFIG,
    ...PRESETS[0].config,
    dimension: PRESETS[0].dimension,
  };
  const initialBodies = cloneBodies(PRESETS[0].bodies);
  const initialMetrics = computeMetrics(initialBodies, initialConfig);

  const [selectedPreset, setSelectedPreset] = useState<string>(PRESETS[0].id);
  const [config, setConfig] = useState<SimulationConfig>(initialConfig);
  const [bodies, setBodies] = useState<BodyState[]>(initialBodies);
  const [seedBodies, setSeedBodies] = useState<BodyState[]>(cloneBodies(initialBodies));
  const [isRunning, setIsRunning] = useState(true);
  const [simTime, setSimTime] = useState(0);
  const [metrics, setMetrics] = useState<SimulationMetrics>(initialMetrics);
  const [selectedBodyId, setSelectedBodyId] = useState<string>(initialBodies[0]?.id ?? '');
  const [showVectors, setShowVectors] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [rotation, setRotation] = useState(0.55);
  const [apiSummary, setApiSummary] = useState<ApiSummary>(null);
  const [apiError, setApiError] = useState<string>('');
  const [viewport, setViewport] = useState({ width: 1440, height: 900 });
  const [activePanel, setActivePanel] = useState<PanelId>('setup');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('center');
  const [autoRotate, setAutoRotate] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const bodiesRef = useRef<BodyState[]>(initialBodies);
  const configRef = useRef(config);
  const metricsRef = useRef(metrics);
  const trailsRef = useRef<Map<string, Array<{ x: number; y: number }>>>(new Map());
  const projectedBodiesRef = useRef<Array<{ id: string; x: number; y: number; radius: number }>>([]);
  const timeAccumulatorRef = useRef(0);
  const rotationRef = useRef(rotation);
  const selectedBodyRef = useRef(selectedBodyId);
  const cameraModeRef = useRef(cameraMode);

  useEffect(() => {
    bodiesRef.current = bodies;
  }, [bodies]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    selectedBodyRef.current = selectedBodyId;
  }, [selectedBodyId]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    setMetrics(computeMetrics(bodies, config));
  }, [bodies, config]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      setViewport({ width: rect.width, height: rect.height });
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const resetTrails = () => {
    trailsRef.current = new Map();
  };

  const applyAutoFit = (bodySource = bodiesRef.current, configSource = configRef.current, metricsSource = metricsRef.current) => {
    const nextZoom = computeAutoZoom(
      bodySource,
      metricsSource,
      configSource,
      selectedBodyRef.current,
      cameraModeRef.current,
      viewport,
    );
    setConfig((current) => ({ ...current, zoom: nextZoom }));
  };

  const drawFrame = (nextBodies: BodyState[]) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const width = viewport.width;
    const height = viewport.height;
    const center = getCameraCenter(nextBodies, metricsRef.current, selectedBodyRef.current, cameraModeRef.current);

    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#03101d');
    gradient.addColorStop(0.5, '#071826');
    gradient.addColorStop(1, '#0b2534');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(202, 241, 255, 0.03)';
    for (let i = 0; i < 80; i += 1) {
      const x = ((i * 233) % width) + (i % 3);
      const y = ((i * 149) % height) + (i % 5);
      ctx.fillRect(x % width, y % height, 1.5, 1.5);
    }

    if (showGrid) {
      ctx.strokeStyle = 'rgba(180, 229, 255, 0.06)';
      ctx.lineWidth = 1;
      const step = Math.max(36, configRef.current.zoom * 0.6);
      for (let x = width / 2 % step; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = height / 2 % step; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    projectedBodiesRef.current = [];

    const projected = nextBodies
      .map((body) => {
        const relative = subtract(body.position, center);
        return {
          body,
          ...projectPoint(relative, body.radius, width, height, configRef.current, rotationRef.current),
        };
      })
      .sort((a, b) => a.depth - b.depth);

    for (const item of projected) {
      const previousTrail = trailsRef.current.get(item.body.id) ?? [];
      const nextTrail = [...previousTrail, { x: item.x, y: item.y }].slice(-configRef.current.trailLength);
      trailsRef.current.set(item.body.id, nextTrail);

      if (nextTrail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(nextTrail[0].x, nextTrail[0].y);
        nextTrail.forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.strokeStyle = `${item.body.color}4d`;
        ctx.lineWidth = Math.max(1.1, item.radius * 0.36);
        ctx.stroke();
      }
    }

    for (const item of projected) {
      const selected = item.body.id === selectedBodyRef.current;

      projectedBodiesRef.current.push({
        id: item.body.id,
        x: item.x,
        y: item.y,
        radius: item.radius,
      });

      const glow = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, item.radius * 4.2);
      glow.addColorStop(0, `${item.body.color}d6`);
      glow.addColorStop(1, `${item.body.color}00`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius * 4.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = item.body.color;
      ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      ctx.fill();

      if (selected) {
        ctx.beginPath();
        ctx.strokeStyle = '#f9fdff';
        ctx.lineWidth = 1.8;
        ctx.arc(item.x, item.y, item.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (showVectors) {
        ctx.beginPath();
        ctx.moveTo(item.x, item.y);
        ctx.lineTo(
          item.x + item.body.velocity.x * configRef.current.zoom * 0.16,
          item.y + item.body.velocity.y * configRef.current.zoom * 0.16,
        );
        ctx.strokeStyle = 'rgba(201, 244, 255, 0.52)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      if (showLabels || selected) {
        ctx.fillStyle = 'rgba(236, 249, 255, 0.92)';
        ctx.font = '12px var(--font-geist-mono), monospace';
        ctx.fillText(item.body.label, item.x + item.radius + 6, item.y - item.radius - 6);
      }
    }
  };

  useEffect(() => {
    drawFrame(bodies);
  }, [bodies, viewport, showGrid, showLabels, showVectors, rotation, selectedBodyId, cameraMode, dockCollapsed]);

  useEffect(() => {
    let lastFrame = performance.now();

    const tick = (now: number) => {
      const deltaSeconds = Math.min(0.033, (now - lastFrame) / 1000);
      lastFrame = now;

      if (isRunning) {
        const scaledDelta = deltaSeconds * simulationSpeed;
        const stepBudget = Math.max(1, Math.ceil(scaledDelta / configRef.current.timeStep));
        let nextBodies = bodiesRef.current;

        for (let step = 0; step < stepBudget; step += 1) {
          nextBodies = stepSimulation(nextBodies, configRef.current);
        }

        const nextMetrics = computeMetrics(nextBodies, configRef.current);
        bodiesRef.current = nextBodies;
        metricsRef.current = nextMetrics;
        setBodies(nextBodies);
        setMetrics(nextMetrics);
        timeAccumulatorRef.current += stepBudget * configRef.current.timeStep;
        setSimTime(timeAccumulatorRef.current);

        if (configRef.current.dimension === '3d' && autoRotate) {
          setRotation((current) => current + deltaSeconds * 0.18);
        }
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isRunning, autoRotate, simulationSpeed]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      applyAutoFit();
    }, 80);
    return () => window.clearTimeout(timeout);
  }, [viewport.width, viewport.height]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      applyAutoFit();
    }, 60);
    return () => window.clearTimeout(timeout);
  }, [cameraMode]);

  const commitBodies = (nextBodies: BodyState[], nextConfig = configRef.current, nextSelectedId?: string) => {
    const nextMetrics = computeMetrics(nextBodies, nextConfig);
    bodiesRef.current = nextBodies;
    metricsRef.current = nextMetrics;
    setBodies(nextBodies);
    setSeedBodies(cloneBodies(nextBodies));
    setMetrics(nextMetrics);
    if (nextSelectedId) {
      setSelectedBodyId(nextSelectedId);
    }
  };

  const loadPreset = (preset: PresetDefinition) => {
    const nextConfig = {
      ...DEFAULT_CONFIG,
      ...preset.config,
      dimension: preset.dimension,
    };
    const nextBodies = cloneBodies(preset.bodies);
    const nextMetrics = computeMetrics(nextBodies, nextConfig);
    const nextZoom = computeAutoZoom(nextBodies, nextMetrics, nextConfig, nextBodies[0]?.id ?? '', 'center', viewport);

    setSelectedPreset(preset.id);
    setCameraMode('center');
    setConfig({ ...nextConfig, zoom: nextZoom });
    commitBodies(nextBodies, { ...nextConfig, zoom: nextZoom }, nextBodies[0]?.id ?? '');
    setSimTime(0);
    timeAccumulatorRef.current = 0;
    setApiSummary(null);
    setApiError('');
    resetTrails();
  };

  const applyRandomSystem = () => {
    const nextBodies = createRandomBodies(Math.min(12, Math.max(3, bodies.length)), config.dimension);
    const nextMetrics = computeMetrics(nextBodies, config);
    const nextZoom = computeAutoZoom(nextBodies, nextMetrics, config, nextBodies[0]?.id ?? '', cameraMode, viewport);
    setSelectedPreset('custom');
    setConfig((current) => ({ ...current, zoom: nextZoom }));
    commitBodies(nextBodies, { ...configRef.current, zoom: nextZoom }, nextBodies[0]?.id ?? '');
    setSimTime(0);
    timeAccumulatorRef.current = 0;
    resetTrails();
  };

  const loadRandomPreset = () => {
    const preset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    loadPreset(preset);
  };

  const resetSimulation = () => {
    const nextBodies = cloneBodies(seedBodies);
    const nextMetrics = computeMetrics(nextBodies, configRef.current);
    const nextZoom = computeAutoZoom(nextBodies, nextMetrics, configRef.current, selectedBodyId, cameraMode, viewport);
    setConfig((current) => ({ ...current, zoom: nextZoom }));
    commitBodies(nextBodies, { ...configRef.current, zoom: nextZoom });
    setSimTime(0);
    timeAccumulatorRef.current = 0;
    resetTrails();
  };

  const stepOnce = () => {
    const nextBodies = stepSimulation(bodiesRef.current, configRef.current);
    const nextMetrics = computeMetrics(nextBodies, configRef.current);
    bodiesRef.current = nextBodies;
    metricsRef.current = nextMetrics;
    setBodies(nextBodies);
    setMetrics(nextMetrics);
    timeAccumulatorRef.current += configRef.current.timeStep;
    setSimTime(timeAccumulatorRef.current);
  };

  const updateBody = (
    bodyId: string,
    field: 'mass' | 'radius' | 'label' | 'color' | 'pinned',
    value: string | number | boolean,
  ) => {
    const nextBodies = bodies.map((body) => {
      if (body.id !== bodyId) {
        return body;
      }
      if (field === 'label' || field === 'color') {
        return { ...body, [field]: value };
      }
      if (field === 'pinned') {
        return { ...body, pinned: Boolean(value) };
      }
      return { ...body, [field]: Number(value) };
    });
    setSelectedPreset('custom');
    commitBodies(nextBodies);
  };

  const updateBodyVector = (
    bodyId: string,
    target: 'position' | 'velocity',
    axis: 'x' | 'y' | 'z',
    value: string,
  ) => {
    const numeric = Number(value);
    const nextBodies = bodies.map((body) =>
      body.id === bodyId
        ? {
            ...body,
            [target]: {
              ...body[target],
              [axis]: Number.isFinite(numeric) ? numeric : 0,
            },
          }
        : body,
    );
    setSelectedPreset('custom');
    commitBodies(nextBodies);
  };

  const addBody = () => {
    const nextBody = createRandomBodies(1, config.dimension)[0];
    const nextBodies = [...bodies, { ...nextBody, label: `Body ${bodies.length + 1}` }];
    setSelectedPreset('custom');
    commitBodies(nextBodies, configRef.current, nextBody.id);
  };

  const removeBody = (bodyId: string) => {
    if (bodies.length <= 2) {
      return;
    }
    const nextBodies = bodies.filter((body) => body.id !== bodyId);
    trailsRef.current.delete(bodyId);
    setSelectedPreset('custom');
    commitBodies(nextBodies, configRef.current, nextBodies[0]?.id ?? '');
  };

  const handleCanvasSelect = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let best: { id: string; distance: number } | null = null;

    for (const point of projectedBodiesRef.current) {
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance <= point.radius + 10 && (!best || distance < best.distance)) {
        best = { id: point.id, distance };
      }
    }

    if (best) {
      setSelectedBodyId(best.id);
      setActivePanel('bodies');
    }
  };

  const requestServerSummary = async () => {
    setApiError('');
    try {
      const response = await fetch('/api/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presetId: selectedPreset,
          presetName: presetsById[selectedPreset]?.name ?? 'Custom',
          bodies,
          config,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? 'Unable to analyze simulation');
      }

      const payload = await response.json();
      setApiSummary(payload.data);
      setActivePanel('insights');
    } catch (error) {
      setApiSummary(null);
      setApiError(error instanceof Error ? error.message : 'Unable to analyze simulation');
    }
  };

  const copyConfiguration = async () => {
    try {
      const payload = JSON.stringify({ config, bodies }, null, 2);
      await navigator.clipboard.writeText(payload);
      setApiError('');
      setApiSummary({
        presetName: 'Workspace state copied',
        metrics,
        receivedAt: new Date().toISOString(),
        recommendations: ['The current simulation JSON has been copied to your clipboard for reuse or sharing.'],
      });
      setActivePanel('insights');
    } catch {
      setApiError('Clipboard access failed in this browser context.');
    }
  };

  const selectedBody = getSelectedBody(bodies, selectedBodyId);

  return (
    <div className={styles.shell}>
      <canvas ref={canvasRef} className={styles.canvas} onPointerDown={handleCanvasSelect} />

      <div className={styles.topBar}>
        <div className={styles.brandBlock}>
          <div>
            <p className={styles.eyebrow}>Simulation workspace</p>
            <h1 className={styles.brandTitle}>N-body control room</h1>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusPill}>{config.dimension.toUpperCase()}</span>
            <span className={styles.statusPill}>{INTEGRATOR_LABELS[config.integrator]}</span>
            <span className={styles.statusPill}>{bodies.length} bodies</span>
          </div>
        </div>

        <div className={styles.controlCluster}>
          <button className={styles.primaryButton} onClick={() => setIsRunning((current) => !current)}>
            {isRunning ? 'Pause' : 'Run'}
          </button>
          <button className={styles.secondaryButton} onClick={stepOnce} disabled={isRunning}>
            Step
          </button>
          <button className={styles.secondaryButton} onClick={resetSimulation}>
            Reset
          </button>
          <button className={styles.secondaryButton} onClick={() => applyAutoFit()}>
            Auto-fit
          </button>
        </div>
      </div>

      <div className={styles.bottomHud}>
        <div className={styles.hintCard}>
          <strong>Viewport</strong>
          <span>Click a body to inspect it. Camera can follow the center of mass or the selected body.</span>
        </div>
        {selectedBody ? (
          <div className={styles.selectionCard}>
            <span>{selectedBody.label}</span>
            <strong>
              m={formatNumber(selectedBody.mass)} · v=
              {formatNumber(Math.hypot(selectedBody.velocity.x, selectedBody.velocity.y, selectedBody.velocity.z))}
            </strong>
          </div>
        ) : null}
      </div>

      <aside className={`${styles.dock} ${dockCollapsed ? styles.dockCollapsed : ''}`}>
        <div className={styles.dockHeader}>
          <div className={styles.panelTabs}>
            <button className={activePanel === 'setup' ? styles.tabActive : styles.tab} onClick={() => setActivePanel('setup')}>Setup</button>
            <button className={activePanel === 'bodies' ? styles.tabActive : styles.tab} onClick={() => setActivePanel('bodies')}>Bodies</button>
            <button className={activePanel === 'insights' ? styles.tabActive : styles.tab} onClick={() => setActivePanel('insights')}>Insights</button>
          </div>
          <button className={styles.iconButton} onClick={() => setDockCollapsed((current) => !current)}>
            {dockCollapsed ? 'Open' : 'Hide'}
          </button>
        </div>

        {!dockCollapsed ? (
          <div className={styles.dockBody}>
            {activePanel === 'setup' ? (
              <section className={styles.panelSection}>
                <div className={styles.sectionHeader}>
                  <h2>System</h2>
                  <span>{presetsById[selectedPreset]?.name ?? 'Custom workspace'}</span>
                </div>

                <label className={styles.field}>
                  <span>Preset</span>
                  <select
                    value={selectedPreset}
                    onChange={(event) => {
                      const preset = presetsById[event.target.value];
                      if (preset) {
                        loadPreset(preset);
                      } else {
                        setSelectedPreset('custom');
                      }
                    }}
                  >
                    {PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                    <option value="custom">Custom</option>
                  </select>
                </label>

                <p className={styles.panelCopy}>
                  {(presetsById[selectedPreset] ?? { description: 'A tuned workspace based on your current state.' }).description}
                </p>
                {(presetsById[selectedPreset]?.tags?.length ?? 0) > 0 ? (
                  <div className={styles.tagRow}>
                    {presetsById[selectedPreset]?.tags?.map((tag) => (
                      <span key={tag} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                {presetsById[selectedPreset]?.sourceNote ? (
                  <p className={styles.noteText}>{presetsById[selectedPreset]?.sourceNote}</p>
                ) : null}

                <div className={styles.fieldGrid}>
                  <label className={styles.field}>
                    <span>Dimension</span>
                    <select
                      value={config.dimension}
                      onChange={(event) => {
                        const dimension = event.target.value as SimulationConfig['dimension'];
                        const nextBodies = bodies.map((body) => ({
                          ...body,
                          position: { ...body.position, z: dimension === '3d' ? body.position.z : 0 },
                          velocity: { ...body.velocity, z: dimension === '3d' ? body.velocity.z : 0 },
                        }));
                        const nextConfig = { ...configRef.current, dimension };
                        const nextMetrics = computeMetrics(nextBodies, nextConfig);
                        const nextZoom = computeAutoZoom(nextBodies, nextMetrics, nextConfig, selectedBodyId, cameraMode, viewport);
                        setSelectedPreset('custom');
                        setConfig({ ...nextConfig, zoom: nextZoom });
                        commitBodies(nextBodies, { ...nextConfig, zoom: nextZoom });
                        resetTrails();
                      }}
                    >
                      <option value="2d">2D</option>
                      <option value="3d">3D</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Integrator</span>
                    <select
                      value={config.integrator}
                      onChange={(event) => {
                        const integrator = event.target.value as IntegratorName;
                        setSelectedPreset('custom');
                        setConfig((current) => ({ ...current, integrator }));
                      }}
                    >
                      {Object.entries(INTEGRATOR_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className={styles.fieldGrid}>
                  <label className={styles.field}>
                    <span>Camera target</span>
                    <select value={cameraMode} onChange={(event) => setCameraMode(event.target.value as CameraMode)}>
                      <option value="center">Center of mass</option>
                      <option value="selected">Selected body</option>
                      <option value="origin">Origin</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Speed</span>
                    <input
                      type="range"
                      min="0.25"
                      max="3"
                      step="0.25"
                      value={simulationSpeed}
                      onChange={(event) => setSimulationSpeed(Number(event.target.value))}
                    />
                    <small>{formatNumber(simulationSpeed)}x real-time</small>
                  </label>
                </div>

                <div className={styles.fieldGrid}>
                  <label className={styles.field}>
                    <span>Time step</span>
                    <input
                      type="range"
                      min="0.002"
                      max="0.03"
                      step="0.001"
                      value={config.timeStep}
                      onChange={(event) => setConfig((current) => ({ ...current, timeStep: Number(event.target.value) }))}
                    />
                    <small>{formatNumber(config.timeStep)}</small>
                  </label>

                  <label className={styles.field}>
                    <span>Zoom</span>
                    <input
                      type="range"
                      min="28"
                      max="220"
                      step="1"
                      value={config.zoom}
                      onChange={(event) => setConfig((current) => ({ ...current, zoom: Number(event.target.value) }))}
                    />
                    <small>{formatNumber(config.zoom)}</small>
                  </label>
                </div>

                <div className={styles.fieldGrid}>
                  <label className={styles.field}>
                    <span>Softening</span>
                    <input
                      type="range"
                      min="0.01"
                      max="0.6"
                      step="0.01"
                      value={config.softening}
                      onChange={(event) => setConfig((current) => ({ ...current, softening: Number(event.target.value) }))}
                    />
                    <small>{formatNumber(config.softening)}</small>
                  </label>

                  <label className={styles.field}>
                    <span>Trail length</span>
                    <input
                      type="range"
                      min="20"
                      max="300"
                      step="10"
                      value={config.trailLength}
                      onChange={(event) => {
                        setConfig((current) => ({ ...current, trailLength: Number(event.target.value) }));
                        resetTrails();
                      }}
                    />
                    <small>{config.trailLength} samples</small>
                  </label>
                </div>

                {config.dimension === '3d' ? (
                  <div className={styles.fieldGrid}>
                    <label className={styles.field}>
                      <span>Camera distance</span>
                      <input
                        type="range"
                        min="10"
                        max="40"
                        step="1"
                        value={config.cameraDistance}
                        onChange={(event) => setConfig((current) => ({ ...current, cameraDistance: Number(event.target.value) }))}
                      />
                      <small>{formatNumber(config.cameraDistance)}</small>
                    </label>

                    <label className={styles.field}>
                      <span>Rotation</span>
                      <input
                        type="range"
                        min="0"
                        max={Math.PI * 2}
                        step="0.01"
                        value={rotation}
                        onChange={(event) => setRotation(Number(event.target.value))}
                      />
                      <small>{formatNumber(rotation)}</small>
                    </label>
                  </div>
                ) : null}

                <div className={styles.inlineRow}>
                  <label className={styles.field}>
                    <span>Collision mode</span>
                    <select
                      value={config.collisionMode}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          collisionMode: event.target.value as SimulationConfig['collisionMode'],
                        }))
                      }
                    >
                      <option value="pass-through">Pass through</option>
                      <option value="merge">Merge on contact</option>
                    </select>
                  </label>
                </div>

                <div className={styles.toggleRow}>
                  <label><input type="checkbox" checked={showGrid} onChange={() => setShowGrid((current) => !current)} /> Grid</label>
                  <label><input type="checkbox" checked={showVectors} onChange={() => setShowVectors((current) => !current)} /> Vectors</label>
                  <label><input type="checkbox" checked={showLabels} onChange={() => setShowLabels((current) => !current)} /> Labels</label>
                  {config.dimension === '3d' ? (
                    <label><input type="checkbox" checked={autoRotate} onChange={() => setAutoRotate((current) => !current)} /> Auto-rotate</label>
                  ) : null}
                </div>

                <div className={styles.actionGrid}>
                  <button className={styles.secondaryButton} onClick={applyRandomSystem}>Randomize system</button>
                  <button className={styles.secondaryButton} onClick={loadRandomPreset}>Random preset</button>
                  <button className={styles.secondaryButton} onClick={copyConfiguration}>Copy JSON</button>
                  <button className={styles.secondaryButton} onClick={requestServerSummary}>Analyze stability</button>
                </div>
              </section>
            ) : null}

            {activePanel === 'bodies' ? (
              <section className={styles.panelSection}>
                <div className={styles.sectionHeader}>
                  <h2>Bodies</h2>
                  <button className={styles.secondaryButton} onClick={addBody}>Add</button>
                </div>

                <div className={styles.bodyList}>
                  {bodies.map((body) => (
                    <button
                      key={body.id}
                      className={body.id === selectedBodyId ? styles.bodyRowActive : styles.bodyRow}
                      onClick={() => setSelectedBodyId(body.id)}
                    >
                      <span>{body.label}</span>
                      <strong>{formatNumber(body.mass)}</strong>
                    </button>
                  ))}
                </div>

                {selectedBody ? (
                  <div className={styles.editorGrid}>
                    <label className={styles.field}>
                      <span>Label</span>
                      <input value={selectedBody.label} onChange={(event) => updateBody(selectedBody.id, 'label', event.target.value)} />
                    </label>

                    <label className={styles.field}>
                      <span>Color</span>
                      <input value={selectedBody.color} onChange={(event) => updateBody(selectedBody.id, 'color', event.target.value)} />
                    </label>

                    <label className={styles.field}>
                      <span>Mass</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={selectedBody.mass}
                        onChange={(event) => updateBody(selectedBody.id, 'mass', Math.max(0.1, Number(event.target.value)))}
                      />
                    </label>

                    <label className={styles.field}>
                      <span>Radius</span>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={selectedBody.radius}
                        onChange={(event) => updateBody(selectedBody.id, 'radius', Math.max(1, Number(event.target.value)))}
                      />
                    </label>

                    {(['x', 'y', ...(config.dimension === '3d' ? (['z'] as const) : [])] as const).map((axis) => (
                      <label key={`position-${axis}`} className={styles.field}>
                        <span>Position {axis.toUpperCase()}</span>
                        <input
                          type="number"
                          step="0.1"
                          value={selectedBody.position[axis]}
                          onChange={(event) => updateBodyVector(selectedBody.id, 'position', axis, event.target.value)}
                        />
                      </label>
                    ))}

                    {(['x', 'y', ...(config.dimension === '3d' ? (['z'] as const) : [])] as const).map((axis) => (
                      <label key={`velocity-${axis}`} className={styles.field}>
                        <span>Velocity {axis.toUpperCase()}</span>
                        <input
                          type="number"
                          step="0.1"
                          value={selectedBody.velocity[axis]}
                          onChange={(event) => updateBodyVector(selectedBody.id, 'velocity', axis, event.target.value)}
                        />
                      </label>
                    ))}

                    <label className={styles.checkboxField}>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedBody.pinned)}
                        onChange={(event) => updateBody(selectedBody.id, 'pinned', event.target.checked)}
                      />
                      <span>Pin body in place</span>
                    </label>

                    <button className={styles.dangerButton} onClick={() => removeBody(selectedBody.id)}>
                      Remove body
                    </button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {activePanel === 'insights' ? (
              <section className={styles.panelSection}>
                <div className={styles.sectionHeader}>
                  <h2>Insights</h2>
                  <span>Live diagnostics</span>
                </div>

                <div className={styles.diagnosticsList}>
                  <div><span>Sim time</span><strong>{formatNumber(simTime)}</strong></div>
                  <div><span>Total energy</span><strong>{formatNumber(metrics.totalEnergy)}</strong></div>
                  <div><span>Max speed</span><strong>{formatNumber(metrics.maxSpeed)}</strong></div>
                  <div><span>Kinetic energy</span><strong>{formatNumber(metrics.kineticEnergy)}</strong></div>
                  <div><span>Potential energy</span><strong>{formatNumber(metrics.potentialEnergy)}</strong></div>
                  <div>
                    <span>Total momentum</span>
                    <strong>
                      {formatNumber(metrics.totalMomentum.x)}, {formatNumber(metrics.totalMomentum.y)}
                      {config.dimension === '3d' ? `, ${formatNumber(metrics.totalMomentum.z)}` : ''}
                    </strong>
                  </div>
                  <div><span>Body count</span><strong>{metrics.bodyCount}</strong></div>
                </div>

                {apiSummary ? (
                  <div className={styles.serverSummary}>
                    <h3>{apiSummary.presetName}</h3>
                    <p>Analyzed at {new Date(apiSummary.receivedAt).toLocaleTimeString()}</p>
                    {apiSummary.recommendations.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                ) : (
                  <p className={styles.panelCopy}>
                    Run a server analysis to get a quick stability summary and tuning suggestions for the current system.
                  </p>
                )}

                {apiError ? <p className={styles.errorText}>{apiError}</p> : null}
              </section>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
