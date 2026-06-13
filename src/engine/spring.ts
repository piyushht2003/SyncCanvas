/**
 * A custom implicit Euler physics integrator.
 * 
 * Masks network latency by ensuring that remote CRDT updates (which arrive discretely and jittery)
 * are interpolated continuously on the client. Time complexity for update is O(1) per frame.
 */
export class Spring {
  public value: number;
  public target: number;
  public velocity: number = 0;
  
  // Spring constants
  private stiffness: number = 0.15;
  private damping: number = 0.8;
  
  constructor(initialValue: number) {
    this.value = initialValue;
    this.target = initialValue;
  }
  
  setTarget(target: number) {
    this.target = target;
  }
  
  // Implicit Euler integration step
  update() {
    const force = (this.target - this.value) * this.stiffness;
    this.velocity = (this.velocity + force) * this.damping;
    this.value += this.velocity;
    
    // Snap to target if very close to stop micro-jitter
    if (Math.abs(this.velocity) < 0.01 && Math.abs(this.target - this.value) < 0.01) {
      this.value = this.target;
      this.velocity = 0;
    }
  }
}
