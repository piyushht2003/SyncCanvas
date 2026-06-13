import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { CursorState, Shape } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Random color generator for cursors
const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
const myColor = colors[Math.floor(Math.random() * colors.length)];
const myId = uuidv4();

export class SyncLayer {
  public doc: Y.Doc;
  public provider: WebsocketProvider;
  public shapesMap: Y.Map<any>;
  public awareness: any;
  public undoManager: Y.UndoManager;
  public clientId: string = myId;
  public color: string = myColor;

  constructor(roomName: string, user: any, onUpdate: () => void) {
    this.doc = new Y.Doc();
    
    // Connect to public demo WebSocket server for P2P sync
    this.provider = new WebsocketProvider(
      'wss://demos.yjs.dev',
      roomName,
      this.doc
    );

    this.shapesMap = this.doc.getMap('shapes');
    this.undoManager = new Y.UndoManager(this.shapesMap);
    
    this.awareness = this.provider.awareness;
    this.awareness.setLocalStateField('user', {
      name: user.displayName || 'Anonymous',
      photoUrl: user.photoURL || '',
      color: this.color
    });
    
    // Listen for changes on shapes
    this.shapesMap.observe(() => {
      onUpdate();
    });

    this.awareness.on('change', () => {
      onUpdate();
    });
  }

  public getShapes(): Shape[] {
    return Array.from(this.shapesMap.values());
  }

  public updateLocalCursor(position: { x: number, y: number }, selection: string[] = []) {
    this.awareness.setLocalStateField('cursor', {
        id: this.clientId,
        position,
        selection,
        lastUpdated: Date.now()
    });
  }

  public getRemoteCursors(): CursorState[] {
    const cursors: CursorState[] = [];
    this.awareness.getStates().forEach((state: any, clientId: number) => {
      if (clientId !== this.awareness.clientID && state.cursor) {
        cursors.push({
          ...state.cursor,
          color: state.user?.color || '#000000',
          name: state.user?.name || 'Anonymous',
          photoUrl: state.user?.photoUrl || ''
        });
      }
    });
    return cursors;
  }

  public addShape(shape: Shape) {
    this.shapesMap.set(shape.id, shape);
  }

  public modifyShape(shape: Shape) {
    this.shapesMap.set(shape.id, shape);
  }

  public deleteShape(id: string) {
    const shape = this.shapesMap.get(id);
    if (shape) {
      shape.isDeleted = true;
      this.shapesMap.set(id, shape);
    }
  }

  public undo() {
    this.undoManager.undo();
  }

  public redo() {
    this.undoManager.redo();
  }

  public destroy() {
    this.provider.disconnect();
    this.doc.destroy();
  }
}
