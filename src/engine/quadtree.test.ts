import { describe, it, expect } from 'vitest';
import { QuadTree } from './quadtree';
import type { Shape } from '../types';

describe('QuadTree Spatial Index', () => {
  const createMockShape = (id: string, x: number, y: number, w: number, h: number): Shape => ({
    id,
    type: 'rectangle',
    transform: { position: { x, y }, scale: { x: 1, y: 1 }, rotation: 0 },
    width: w,
    height: h,
    fillColor: 'red',
    strokeColor: 'black',
    strokeWidth: 1,
    opacity: 1,
    isDeleted: false
  });

  it('should insert and query shapes correctly within bounds', () => {
    const qt = new QuadTree({ x: 0, y: 0, width: 1000, height: 1000 }, 2);
    
    // Shape at top-left
    const shapeA = createMockShape('A', 100, 100, 50, 50);
    // Shape at bottom-right
    const shapeB = createMockShape('B', 900, 900, 50, 50);
    
    qt.insert(shapeA);
    qt.insert(shapeB);
    
    // Query top-left region
    const resultsA = qt.query({ x: 0, y: 0, width: 500, height: 500 });
    expect(resultsA.length).toBe(1);
    expect(resultsA[0].id).toBe('A');
    
    // Query bottom-right region
    const resultsB = qt.query({ x: 500, y: 500, width: 500, height: 500 });
    expect(resultsB.length).toBe(1);
    expect(resultsB[0].id).toBe('B');
  });

  it('should subdivide when capacity is reached', () => {
    const qt = new QuadTree({ x: 0, y: 0, width: 100, height: 100 }, 1); // Capacity 1
    
    qt.insert(createMockShape('A', 10, 10, 5, 5));
    qt.insert(createMockShape('B', 90, 90, 5, 5)); // This should force a split
    
    const all = qt.query({ x: 0, y: 0, width: 100, height: 100 });
    expect(all.length).toBe(2);
  });
});
