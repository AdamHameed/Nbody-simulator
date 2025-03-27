'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './simulation.module.css';

const G = 1.0;
const h = 0.1;

type Body = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
};

export default function Simulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numBodies, setNumBodies] = useState(3);
  const [scale, setScale] = useState(100);
  const [method, setMethod] = useState<'RK4' | 'Midpoint' | 'Forward Euler' | 'Backward Euler'>('RK4');
  const [bodies, setBodies] = useState<Body[]>([]);
  const [selectedBody, setSelectedBody] = useState<number | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<keyof Body | null>(null);
  const trails = useRef<number[][][]>([]);
  const animationRef = useRef<number>();
  // Add these right after your existing state declarations
  const [panelWidth, setPanelWidth] = useState(350);
  const isResizing = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  // Initialize bodies with random values
  const initBodies = () => {
    const newBodies = Array(numBodies).fill(0).map(() => ({
      x: Math.random() * 6 - 3,
      y: Math.random() * 4 - 2,
      vx: Math.random() * 2 - 1,
      vy: Math.random() * 2 - 1,
      mass: 0.1 + Math.random() * 0.9
    }));
    setBodies(newBodies);
    trails.current = Array(numBodies).fill(0).map(() => []);
  };

  // Update specific body property
  const updateBody = (index: number, property: keyof Body, value: number) => {
    const newBodies = [...bodies];
    newBodies[index] = {
      ...newBodies[index],
      [property]: Number(value)
    };
    setBodies(newBodies);
  };

  // Handle keyboard input
  const handleKeyDown = (e: KeyboardEvent) => {
    if (selectedBody === null || selectedProperty === null) return;

    const step = e.shiftKey ? 1 : 0.1; // Larger step when shift is pressed
    let newValue = bodies[selectedBody][selectedProperty];

    switch (e.key) {
      case 'ArrowUp':
        newValue += step;
        break;
      case 'ArrowDown':
        newValue -= step;
        break;
      case 'ArrowRight':
        newValue += step;
        break;
      case 'ArrowLeft':
        newValue -= step;
        break;
      default:
        return;
    }

    // Apply constraints based on property
    if (selectedProperty === 'mass') {
      newValue = Math.max(0.1, newValue);
    }

    updateBody(selectedBody, selectedProperty, newValue);
  };
// Handle direct number input

  // ODE system
  const odeSystem = (y: number[]) => {
    const numBodies = y.length / 4;
    const accelerations = new Array(y.length).fill(0);
    
    for (let i = 0; i < numBodies; i++) {
      const x1 = y[i * 4];
      const y1 = y[i * 4 + 1];
      
      for (let j = 0; j < numBodies; j++) {
        if (i === j) continue;
        
        const x2 = y[j * 4];
        const y2 = y[j * 4 + 1];
        const mass = bodies[j].mass;
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const r = Math.sqrt(dx * dx + dy * dy);
        const factor = G * mass / (r ** 3 + 1e-10);
        
        accelerations[i * 4 + 2] += factor * dx;
        accelerations[i * 4 + 3] += factor * dy;
      }
    }
    
    return y.map((yi, i) => (i % 4 < 2 ? y[i + 2] : accelerations[i]));
  };

  // Solvers (same as before)
  const RK4 = (f: (y: number[]) => number[], y: number[], h: number) => {
    const k1 = f(y);
    const k2 = f(y.map((yi, i) => yi + h / 2 * k1[i]));
    const k3 = f(y.map((yi, i) => yi + h / 2 * k2[i]));
    const k4 = f(y.map((yi, i) => yi + h * k3[i]));
    return y.map((yi, i) => yi + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  };

  const midpoint = (f: (y: number[]) => number[], y: number[], h: number) => {
    const k1 = f(y);
    const k2 = f(y.map((yi, i) => yi + h / 2 * k1[i]));
    return y.map((yi, i) => yi + h * k2[i]);
  };

  const forwardEuler = (f: (y: number[]) => number[], y: number[], h: number) => {
    return y.map((yi, i) => yi + h * f(y)[i]);
  };

  const backwardEuler = (f: (y: number[]) => number[], y: number[], h: number) => {
    const yNext = forwardEuler(f, y, h);
    return y.map((yi, i) => yi + h * f(yNext)[i]);
  };
  // Resize handle functions
  const startResizing = (e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = panelWidth;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const dx = e.clientX - startX.current;
    const newWidth = startWidth.current - dx;
    setPanelWidth(Math.max(250, Math.min(600, newWidth)));
  };

  const stopResizing = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  };

  // Updated input handler
  const handleNumberInput = (index: number, property: keyof Body, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      updateBody(index, property, 0);
      return;
    }
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      if (property === 'mass') {
        updateBody(index, property, Math.max(0.1, numValue));
      } else {
        updateBody(index, property, numValue);
      }
    }
  };
  // Draw function
  const draw = (state: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < bodies.length; i++) {
      const x = canvas.width / 2 + state[i * 4] * scale;
      const y = canvas.height / 2 + state[i * 4 + 1] * scale;
      
      trails.current[i].push([x, y]);
      if (trails.current[i].length > 50) trails.current[i].shift();
      
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = `hsl(${(360 / bodies.length) * i}, 80%, 60%)`;
      
      // Highlight selected body
      if (i === selectedBody) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.fill();
    }
  };

  // Simulation loop
  const runSimulation = () => {
    if (!bodies.length) return;
    
    let initialState = bodies.flatMap(b => [b.x, b.y, b.vx, b.vy]);
    
    const step = () => {
      switch (method) {
        case 'RK4': initialState = RK4(odeSystem, initialState, h); break;
        case 'Midpoint': initialState = midpoint(odeSystem, initialState, h); break;
        case 'Forward Euler': initialState = forwardEuler(odeSystem, initialState, h); break;
        case 'Backward Euler': initialState = backwardEuler(odeSystem, initialState, h); break;
      }
      
      draw(initialState);
      animationRef.current = requestAnimationFrame(step);
    };
    
    step();
  };

  // Initialize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    initBodies();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Run simulation when bodies or method changes
  useEffect(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    runSimulation();
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [bodies, method, scale, numBodies]);

  // Update bodies when number changes
  useEffect(() => {
    initBodies();
    setSelectedBody(null);
    setSelectedProperty(null);
  }, [numBodies]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    // Add these new cleanup functions:
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    initBodies();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopResizing);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);
  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
      
      <div className={styles.controlsPanel}>
        
        <div className={styles.mainControls}>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Number of Bodies</label>
            <input
              type="number"
              value={numBodies}
              min="2"
              max="10"
              onChange={(e) => setNumBodies(Math.max(2, Math.min(10, parseInt(e.target.value) || 2)))}
              className={styles.controlInput}
            />
          </div>
          
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Scale</label>
            <input
              type="number"
              value={scale}
              min="10"
              max="500"
              onChange={(e) => setScale(Math.max(10, Math.min(500, parseInt(e.target.value) || 100)))}
              className={styles.controlInput}
            />
          </div>
          
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className={styles.controlSelect}
            >
              <option value="RK4">RK4</option>
              <option value="Midpoint">Midpoint</option>
              <option value="Forward Euler">Forward Euler</option>
              <option value="Backward Euler">Backward Euler</option>
            </select>
          </div>
          
          <button 
            className={styles.randomizeButton}
            onClick={initBodies}
          >
            Randomize All Bodies
          </button>
        </div>
        
        <div className={styles.bodiesControls}>
          <h3 className={styles.bodiesHeader}>Body Initial Conditions</h3>
          <div className={styles.keyboardHint}>
            <p>Select a field and use arrow keys to adjust values</p>
            <p>Hold Shift for larger increments</p>
          </div>
          <div className={styles.bodiesContainer}>
            {bodies.map((body, i) => (
              <div key={i} className={styles.bodyControlGroup}>
                <h4 
                  className={`${styles.bodyTitle} ${selectedBody === i ? styles.selected : ''}`}
                  onClick={() => setSelectedBody(i)}
                >
                  Body {i + 1}
                </h4>
                <div className={styles.bodyInputRow}>
                  <div 
                    className={`${styles.bodyInputGroup} ${selectedBody === i && selectedProperty === 'x' ? styles.selected : ''}`}
                    onClick={() => {
                      setSelectedBody(i);
                      setSelectedProperty('x');
                    }}
                  >
                    <label>Position X</label>
                    <input
                      type="number"
                      value={body.x.toFixed(2)}
                      step="0.1"
                      onChange={(e) => handleNumberInput(i, 'x', e)}
                      className={styles.bodyInput}
                      onFocus={() => {
                        setSelectedBody(i);
                        setSelectedProperty('x');
                      }}
                    />
                  </div>
                  <div 
                    className={`${styles.bodyInputGroup} ${selectedBody === i && selectedProperty === 'y' ? styles.selected : ''}`}
                    onClick={() => {
                      setSelectedBody(i);
                      setSelectedProperty('y');
                    }}
                  >
                    <label>Position Y</label>
                    <input
                      type="number"
                      value={body.y.toFixed(2)}
                      step="0.1"
                      onChange={(e) => updateBody(i, 'y', parseFloat(e.target.value))}
                      className={styles.bodyInput}
                      onFocus={() => {
                        setSelectedBody(i);
                        setSelectedProperty('y');
                      }}
                    />
                  </div>
                </div>
                <div className={styles.bodyInputRow}>
                  <div 
                    className={`${styles.bodyInputGroup} ${selectedBody === i && selectedProperty === 'vx' ? styles.selected : ''}`}
                    onClick={() => {
                      setSelectedBody(i);
                      setSelectedProperty('vx');
                    }}
                  >
                    <label>Velocity X</label>
                    <input
                      type="number"
                      value={body.vx.toFixed(2)}
                      step="0.1"
                      onChange={(e) => updateBody(i, 'vx', parseFloat(e.target.value))}
                      className={styles.bodyInput}
                      onFocus={() => {
                        setSelectedBody(i);
                        setSelectedProperty('vx');
                      }}
                    />
                  </div>
                  <div 
                    className={`${styles.bodyInputGroup} ${selectedBody === i && selectedProperty === 'vy' ? styles.selected : ''}`}
                    onClick={() => {
                      setSelectedBody(i);
                      setSelectedProperty('vy');
                    }}
                  >
                    <label>Velocity Y</label>
                    <input
                      type="number"
                      value={body.vy.toFixed(2)}
                      step="0.1"
                      onChange={(e) => updateBody(i, 'vy', parseFloat(e.target.value))}
                      className={styles.bodyInput}
                      onFocus={() => {
                        setSelectedBody(i);
                        setSelectedProperty('vy');
                      }}
                    />
                  </div>
                </div>
                <div className={styles.bodyInputRow}>
                  <div 
                    className={`${styles.bodyInputGroup} ${selectedBody === i && selectedProperty === 'mass' ? styles.selected : ''}`}
                    onClick={() => {
                      setSelectedBody(i);
                      setSelectedProperty('mass');
                    }}
                  >
                    <label>Mass</label>
                    <input
                      type="number"
                      value={body.mass.toFixed(2)}
                      min="0.1"
                      step="0.1"
                      onChange={(e) => updateBody(i, 'mass', parseFloat(e.target.value))}
                      className={styles.bodyInput}
                      onFocus={() => {
                        setSelectedBody(i);
                        setSelectedProperty('mass');
                      }}
                    />
                  </div>
                  <button 
                    className={styles.randomizeBodyButton}
                    onClick={() => {
                      updateBody(i, 'x', Math.random() * 6 - 3);
                      updateBody(i, 'y', Math.random() * 4 - 2);
                      updateBody(i, 'vx', Math.random() * 2 - 1);
                      updateBody(i, 'vy', Math.random() * 2 - 1);
                      updateBody(i, 'mass', 0.1 + Math.random() * 0.9);
                    }}
                  >
                    Randomize
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
}