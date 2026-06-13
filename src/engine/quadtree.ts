import type { Shape } from '../types';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * QuadTree implementation for spatial hashing and 2D collision culling.
 * 
 * In a traditional iteration over N shapes, finding shapes in a viewport takes O(N) time.
 * By using a QuadTree, we partition the 2D space recursively. Querying the visible
 * shapes in the viewport is reduced to O(log N + K), where K is the number of shapes returned.
 * This ensures that rendering 10,000 shapes at 60fps is possible, as we only issue
 * WebGL/Canvas draw calls for the K shapes actively visible on screen.
 */
export class QuadTree {
  private bounds: BoundingBox;
  private capacity: number;
  private shapes: Shape[];
  private divided: boolean = false;
  
  private northwest: QuadTree | null = null;
  private northeast: QuadTree | null = null;
  private southwest: QuadTree | null = null;
  private southeast: QuadTree | null = null;

  constructor(bounds: BoundingBox, capacity: number = 4) {
    this.bounds = bounds;
    this.capacity = capacity;
    this.shapes = [];
  }

  // Check if a shape intersects this quadtree's bounding box
  private intersects(range: BoundingBox, shape: Shape): boolean {
    let hw = 0, hh = 0;
    if (shape.type === 'rectangle' || shape.type === 'ellipse') {
      hw = shape.width / 2;
      hh = shape.height / 2;
    }
    
    const shapeLeft = shape.transform.position.x - hw;
    const shapeRight = shape.transform.position.x + hw;
    const shapeTop = shape.transform.position.y - hh;
    const shapeBottom = shape.transform.position.y + hh;

    const rangeLeft = range.x;
    const rangeRight = range.x + range.width;
    const rangeTop = range.y;
    const rangeBottom = range.y + range.height;

    return !(shapeRight < rangeLeft || 
             shapeLeft > rangeRight || 
             shapeBottom < rangeTop || 
             shapeTop > rangeBottom);
  }

  /**
   * Inserts a shape into the QuadTree.
   * Time Complexity: O(log N) in the average case.
   */
  public insert(shape: Shape): boolean {
    if (!this.intersects(this.bounds, shape)) {
      return false;
    }

    if (this.shapes.length < this.capacity) {
      this.shapes.push(shape);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    if (this.northwest!.insert(shape)) return true;
    if (this.northeast!.insert(shape)) return true;
    if (this.southwest!.insert(shape)) return true;
    if (this.southeast!.insert(shape)) return true;

    return false; // Should never reach here
  }

  private subdivide() {
    const { x, y, width, height } = this.bounds;
    const hw = width / 2;
    const hh = height / 2;

    this.northwest = new QuadTree({ x, y, width: hw, height: hh }, this.capacity);
    this.northeast = new QuadTree({ x: x + hw, y, width: hw, height: hh }, this.capacity);
    this.southwest = new QuadTree({ x, y: y + hh, width: hw, height: hh }, this.capacity);
    this.southeast = new QuadTree({ x: x + hw, y: y + hh, width: hw, height: hh }, this.capacity);
    this.divided = true;
  }

  public query(range: BoundingBox, found: Shape[] = []): Shape[] {
    if (!this.intersectsBounds(this.bounds, range)) {
      return found;
    }

    for (const shape of this.shapes) {
      if (this.intersects(range, shape)) {
        found.push(shape);
      }
    }

    if (this.divided) {
      this.northwest!.query(range, found);
      this.northeast!.query(range, found);
      this.southwest!.query(range, found);
      this.southeast!.query(range, found);
    }

    return found;
  }

  private intersectsBounds(a: BoundingBox, b: BoundingBox): boolean {
    return !(a.x + a.width < b.x ||
             b.x + b.width < a.x ||
             a.y + a.height < b.y ||
             b.y + b.height < a.y);
  }
}
