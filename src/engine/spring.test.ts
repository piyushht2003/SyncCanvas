import { describe, it, expect } from 'vitest';
import { Spring } from './spring';

describe('Spring Physics Integrator', () => {
  it('should initialize with correct target and value', () => {
    const spring = new Spring(10);
    expect(spring.value).toBe(10);
    expect(spring.target).toBe(10);
    expect(spring.velocity).toBe(0);
  });

  it('should interpolate towards the target', () => {
    const spring = new Spring(0);
    spring.setTarget(100);
    
    // Step 1
    spring.update();
    expect(spring.value).toBeGreaterThan(0);
    expect(spring.value).toBeLessThan(100);
    expect(spring.velocity).toBeGreaterThan(0);
    
    // Simulate many frames
    for(let i = 0; i < 50; i++) {
      spring.update();
    }
    
    // Should eventually snap to target
    expect(spring.value).toBe(100);
    expect(spring.velocity).toBe(0);
  });
});
