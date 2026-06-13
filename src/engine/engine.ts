import type { Shape, CursorState } from '../types';
import { Spring } from './spring';
import { QuadTree } from './quadtree';

class AnimatedShape {
  public data: Shape;
  public xSpring: Spring;
  public ySpring: Spring;
  public opacitySpring: Spring;
  public isKinematic: boolean = false;
  public wasActive: boolean = true; // Tracks layer transitions

  constructor(shape: Shape) {
    this.data = shape;
    this.xSpring = new Spring(shape.transform.position.x);
    this.ySpring = new Spring(shape.transform.position.y);
    this.opacitySpring = new Spring(0); // starts invisible
    this.opacitySpring.setTarget(1);
  }

  updateData(newData: Shape) {
    this.data = newData;
    this.xSpring.setTarget(newData.transform.position.x);
    this.ySpring.setTarget(newData.transform.position.y);
    if (newData.isDeleted) {
      this.opacitySpring.setTarget(0); // fade out
    }
  }

  updatePhysics() {
    this.opacitySpring.update();
    
    if (!this.isKinematic) {
      this.xSpring.update();
      this.ySpring.update();
    } else {
      this.xSpring.value = this.data.transform.position.x;
      this.ySpring.value = this.data.transform.position.y;
      this.xSpring.target = this.data.transform.position.x;
      this.ySpring.target = this.data.transform.position.y;
    }
  }

  getRenderPosition() {
    return { x: this.xSpring.value, y: this.ySpring.value };
  }

  isActive(isSelected: boolean): boolean {
    if (isSelected || this.isKinematic) return true;
    if (Math.abs(this.opacitySpring.velocity) > 0.01 || Math.abs(this.opacitySpring.target - this.opacitySpring.value) > 0.01) return true;
    if (Math.abs(this.xSpring.velocity) > 0.01 || Math.abs(this.xSpring.target - this.xSpring.value) > 0.1) return true;
    if (Math.abs(this.ySpring.velocity) > 0.01 || Math.abs(this.ySpring.target - this.ySpring.value) > 0.1) return true;
    return false;
  }
}

export class AntigravityEngine {
  private staticCanvas: HTMLCanvasElement;
  private staticCtx: CanvasRenderingContext2D;
  private activeCanvas: HTMLCanvasElement;
  private activeCtx: CanvasRenderingContext2D;
  
  private animatedShapes: Map<string, AnimatedShape> = new Map();
  private cursors: Map<string, CursorState> = new Map();
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private isRunning: boolean = false;
  private animationFrameId: number = 0;
  private selectedShapeIds: Set<string> = new Set();
  
  private staticNeedsUpdate: boolean = true;
  
  // Camera state for pan and zoom
  private camera = { x: 0, y: 0, zoom: 1 };

  constructor(staticCanvas: HTMLCanvasElement, activeCanvas: HTMLCanvasElement) {
    this.staticCanvas = staticCanvas;
    this.activeCanvas = activeCanvas;
    
    this.staticCtx = this.staticCanvas.getContext('2d', { alpha: false })!;
    this.activeCtx = this.activeCanvas.getContext('2d', { alpha: true })!;
    
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  private resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.staticCanvas.getBoundingClientRect();
    
    this.staticCanvas.width = rect.width * dpr;
    this.staticCanvas.height = rect.height * dpr;
    this.activeCanvas.width = rect.width * dpr;
    this.activeCanvas.height = rect.height * dpr;
    
    this.staticCtx.scale(dpr, dpr);
    this.activeCtx.scale(dpr, dpr);
    
    this.staticNeedsUpdate = true;
  };

  public setShapes(shapes: Shape[]) {
    const currentIds = new Set(shapes.map(s => s.id));
    
    for (const id of this.animatedShapes.keys()) {
      if (!currentIds.has(id)) {
        this.animatedShapes.delete(id);
        this.staticNeedsUpdate = true;
      }
    }
    
    shapes.forEach(shape => {
      if (this.animatedShapes.has(shape.id)) {
        this.animatedShapes.get(shape.id)!.updateData(shape);
      } else {
        this.animatedShapes.set(shape.id, new AnimatedShape(shape));
        this.staticNeedsUpdate = true; // new shape, needs static redraw potentially
      }
    });
  }

  public setKinematic(shapeId: string, isKinematic: boolean) {
    const anim = this.animatedShapes.get(shapeId);
    if (anim) anim.isKinematic = isKinematic;
  }

  public setCamera(x: number, y: number, zoom: number) {
    this.camera = { x, y, zoom };
    this.staticNeedsUpdate = true;
  }

  public screenToWorld(x: number, y: number) {
    return {
      x: (x - this.camera.x) / this.camera.zoom,
      y: (y - this.camera.y) / this.camera.zoom
    };
  }

  public setSelectedShapes(ids: string[]) {
    this.selectedShapeIds = new Set(ids);
    this.staticNeedsUpdate = true; // selection changed, moves shapes between layers
  }

  public getShapeAtPosition(screenX: number, screenY: number): Shape | null {
    const worldCoords = this.screenToWorld(screenX, screenY);
    const x = worldCoords.x;
    const y = worldCoords.y;
    
    // We could use QuadTree here too, but simple reverse iteration is fine for hit detection if not >10k items
    const shapes = Array.from(this.animatedShapes.values()).filter(s => !s.data.isDeleted);
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i].data;
      const pos = shape.transform.position;
      
      if (shape.type === 'rectangle' || shape.type === 'image') {
        const hw = shape.width / 2;
        const hh = shape.height / 2;
        if (x >= pos.x - hw && x <= pos.x + hw &&
            y >= pos.y - hh && y <= pos.y + hh) {
          return shape;
        }
      } else if (shape.type === 'ellipse') {
        const hw = shape.width / 2;
        const hh = shape.height / 2;
        const dx = x - pos.x;
        const dy = y - pos.y;
        if ((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh) <= 1) {
          return shape;
        }
      }
    }
    return null;
  }

  public updateCursor(cursor: CursorState) {
    this.cursors.set(cursor.id, cursor);
  }

  public removeCursor(id: string) {
    this.cursors.delete(id);
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  public stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  private loop = () => {
    if (!this.isRunning) return;
    
    // Physics Step & Layer Determination
    for (const animShape of this.animatedShapes.values()) {
      animShape.updatePhysics();
      
      const isCurrentlyActive = animShape.isActive(this.selectedShapeIds.has(animShape.data.id));
      if (animShape.wasActive !== isCurrentlyActive) {
        animShape.wasActive = isCurrentlyActive;
        this.staticNeedsUpdate = true; // Shape transitioned between static and active
      }
    }
    
    this.render();
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private drawShape(ctx: CanvasRenderingContext2D, animShape: AnimatedShape, isSelected: boolean) {
    const shape = animShape.data;
    if (shape.isDeleted && animShape.opacitySpring.value <= 0.01) return;
    
    ctx.save();
    const pos = animShape.getRenderPosition();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(shape.transform.rotation);
    ctx.scale(shape.transform.scale.x, shape.transform.scale.y);

    ctx.globalAlpha = shape.opacity * animShape.opacitySpring.value;
    ctx.fillStyle = shape.fillColor;
    ctx.strokeStyle = shape.strokeColor;
    ctx.lineWidth = shape.strokeWidth;

    if (shape.type === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(0, 0, shape.width / 2, shape.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (shape.strokeWidth > 0) ctx.stroke();
    } else if (shape.type === 'image') {
      const imgShape = shape as any;
      let img = this.imageCache.get(imgShape.id);
      if (!img) {
        img = new Image();
        img.src = imgShape.base64;
        img.onload = () => { this.staticNeedsUpdate = true; };
        this.imageCache.set(imgShape.id, img);
      }
      if (img.complete) {
        ctx.drawImage(img, -shape.width / 2, -shape.height / 2, shape.width, shape.height);
      }
      if (shape.strokeWidth > 0) {
        ctx.strokeRect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
      }
    } else {
      // Default to rectangle
      ctx.beginPath();
      ctx.roundRect(
        -shape.width / 2,
        -shape.height / 2,
        shape.width,
        shape.height,
        (shape as any).cornerRadius || 0
      );
      ctx.fill();
      if (shape.strokeWidth > 0) ctx.stroke();
    }
    
    if (isSelected) {
       ctx.strokeStyle = '#0ea5e9';
       ctx.lineWidth = 2;
       const pad = 4;
       const hw = shape.width / 2;
       const hh = shape.height / 2;
       ctx.strokeRect(-hw - pad, -hh - pad, shape.width + pad*2, shape.height + pad*2);
       
       ctx.fillStyle = '#fff';
       [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([xDir, yDir]) => {
         const sx = (xDir * hw) + (xDir * pad) - 3;
         const sy = (yDir * hh) + (yDir * pad) - 3;
         ctx.fillRect(sx, sy, 6, 6);
         ctx.strokeRect(sx, sy, 6, 6);
       });
    }

    ctx.restore();
  }

  private render() {
    const rect = this.staticCanvas.getBoundingClientRect();
    
    // Render Static Layer (Only when dirty)
    if (this.staticNeedsUpdate) {
      // White background for static layer
      this.staticCtx.fillStyle = '#f8fafc';
      this.staticCtx.fillRect(0, 0, rect.width, rect.height);
      
      this.staticCtx.save();
      this.staticCtx.translate(this.camera.x, this.camera.y);
      this.staticCtx.scale(this.camera.zoom, this.camera.zoom);
      
      // Build QuadTree for static shapes
      // Use a larger bounds for QuadTree to allow off-screen caching if needed
      const qtBounds = { x: -5000, y: -5000, width: 10000, height: 10000 };
      const qt = new QuadTree(qtBounds, 4);
      
      const staticShapes: AnimatedShape[] = [];
      for (const animShape of this.animatedShapes.values()) {
        if (!animShape.wasActive) {
          qt.insert(animShape.data);
          staticShapes.push(animShape);
        }
      }
      
      // Query QuadTree for shapes in viewport
      // Add generous padding to viewport bounds for smooth edge scrolling
      const invZoom = 1 / this.camera.zoom;
      const queryBounds = { 
        x: (-this.camera.x - 100) * invZoom, 
        y: (-this.camera.y - 100) * invZoom, 
        width: (rect.width + 200) * invZoom, 
        height: (rect.height + 200) * invZoom 
      };
      
      const visibleStaticShapes = qt.query(queryBounds);
      const visibleSet = new Set(visibleStaticShapes.map(s => s.id));
      
      for (const animShape of staticShapes) {
        if (visibleSet.has(animShape.data.id)) {
           this.drawShape(this.staticCtx, animShape, false);
        }
      }
      this.staticCtx.restore();
      this.staticNeedsUpdate = false;
    }

    // Render Active Layer (Every frame)
    this.activeCtx.clearRect(0, 0, rect.width, rect.height);
    
    this.activeCtx.save();
    this.activeCtx.translate(this.camera.x, this.camera.y);
    this.activeCtx.scale(this.camera.zoom, this.camera.zoom);
    
    for (const animShape of this.animatedShapes.values()) {
      if (animShape.wasActive) {
        this.drawShape(this.activeCtx, animShape, this.selectedShapeIds.has(animShape.data.id));
      }
    }

    // Draw remote cursors
    for (const cursor of this.cursors.values()) {
      this.activeCtx.save();
      this.activeCtx.translate(cursor.position.x, cursor.position.y);
      this.activeCtx.beginPath();
      this.activeCtx.moveTo(0, 0);
      this.activeCtx.lineTo(16, 16);
      this.activeCtx.lineTo(5, 16);
      this.activeCtx.lineTo(0, 24);
      this.activeCtx.closePath();
      this.activeCtx.fillStyle = cursor.color;
      this.activeCtx.fill();
      this.activeCtx.strokeStyle = '#ffffff';
      this.activeCtx.lineWidth = 2;
      this.activeCtx.stroke();
      this.activeCtx.restore();
      
      cursor.selection.forEach(selectedId => {
         const animShape = this.animatedShapes.get(selectedId);
         if (animShape && !this.selectedShapeIds.has(selectedId)) {
            const shape = animShape.data;
            const pos = animShape.getRenderPosition();
            this.activeCtx.save();
            this.activeCtx.translate(pos.x, pos.y);
            this.activeCtx.strokeStyle = cursor.color;
            this.activeCtx.lineWidth = 2;
            const pad = 4;
            if (shape.type === 'rectangle') {
               this.activeCtx.strokeRect(-shape.width/2 - pad, -shape.height/2 - pad, shape.width + pad*2, shape.height + pad*2);
            }
            this.activeCtx.restore();
         }
      });
    }
    
    this.activeCtx.restore();
  }

  public exportToPNG() {
    const exportCanvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    const rect = this.staticCanvas.getBoundingClientRect();
    
    exportCanvas.width = rect.width * dpr;
    exportCanvas.height = rect.height * dpr;
    const exportCtx = exportCanvas.getContext('2d')!;
    exportCtx.scale(dpr, dpr);
    
    exportCtx.fillStyle = '#09090b';
    exportCtx.fillRect(0, 0, rect.width, rect.height);
    
    // Draw the dot grid
    exportCtx.save();
    exportCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let x = 0; x < rect.width; x += 32) {
      for (let y = 0; y < rect.height; y += 32) {
        exportCtx.beginPath();
        exportCtx.arc(x, y, 1, 0, Math.PI * 2);
        exportCtx.fill();
      }
    }
    exportCtx.restore();
    
    exportCtx.translate(this.camera.x, this.camera.y);
    exportCtx.scale(this.camera.zoom, this.camera.zoom);
    
    const sortedShapes = Array.from(this.animatedShapes.values()).filter(s => !s.data.isDeleted);
    for (const animShape of sortedShapes) {
      this.drawShape(exportCtx, animShape, false);
    }
    
    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `synccanvas-export-${new Date().getTime()}.png`;
    link.href = dataUrl;
    link.click();
  }

  public destroy() {
    this.stop();
    window.removeEventListener('resize', this.resize);
  }
}
