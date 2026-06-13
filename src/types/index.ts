export interface Vector2 {
  x: number;
  y: number;
}

export interface Transform {
  position: Vector2;
  scale: Vector2;
  rotation: number; // in radians
}

export type ShapeType = 'rectangle' | 'ellipse' | 'image' | 'path';

export interface BaseShape {
  id: string;
  type: ShapeType;
  transform: Transform;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  isDeleted: boolean; // For tombstoning in CRDT
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  width: number;
  height: number;
  cornerRadius?: number;
}

export interface EllipseShape extends BaseShape {
  type: 'ellipse';
  width: number;
  height: number;
}

export interface ImageShape extends BaseShape {
  type: 'image';
  width: number;
  height: number;
  base64: string; // the data URI
}

export type Shape = RectangleShape | EllipseShape | ImageShape;

// Ephemeral state not saved to CRDT (unless we want cursors there)
export interface CursorState {
  id: string; // client ID
  position: Vector2;
  color: string;
  name: string;
  photoUrl: string;
  selection: string[]; // array of selected shape IDs
  lastUpdated: number;
}
