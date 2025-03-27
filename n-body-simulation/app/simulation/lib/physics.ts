// RK4 Integration
export function RK4(f: (y: number[]) => number[], y: number[], h: number): number[] {
    const k1 = f(y);
    const k2 = f(y.map((yi, i) => yi + h / 2 * k1[i]));
    const k3 = f(y.map((yi, i) => yi + h / 2 * k2[i]));
    const k4 = f(y.map((yi, i) => yi + h * k3[i]));
    return y.map((yi, i) => yi + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }
  
  // Forward Euler
  export function forwardEuler(f: (y: number[]) => number[], y: number[], h: number): number[] {
    return y.map((yi, i) => yi + h * f(y)[i]);
  }
  
  // Implicit Euler (simplified)
  export function implicitEuler(f: (y: number[]) => number[], y: number[], h: number, iterations = 3): number[] {
    let yNext = forwardEuler(f, y, h);
    for (let i = 0; i < iterations; i++) {
      yNext = y.map((yi, idx) => yi + h * f(yNext)[idx]);
    }
    return yNext;
  }
  
  // Midpoint Method
  export function midpoint(f: (y: number[]) => number[], y: number[], h: number): number[] {
    const k1 = f(y);
    const k2 = f(y.map((yi, i) => yi + h / 2 * k1[i]));
    return y.map((yi, i) => yi + h * k2[i]);
  }