import React, { useEffect, useRef } from 'react';
import { AntigravityEngine } from '../engine/engine';
import { SyncLayer } from '../sync/sync';
import { v4 as uuidv4 } from 'uuid';
import type { Shape } from '../types';

interface CanvasAreaProps {
  syncLayer: SyncLayer | null;
  activeTool: 'SELECT' | 'RECT' | 'ELLIPSE' | 'PAN';
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({ syncLayer, activeTool }) => {
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AntigravityEngine | null>(null);
  
  const cameraState = useRef({ x: 0, y: 0, zoom: 1 });
  
  const dragState = useRef<{
    isDragging: boolean;
    mode: 'NONE' | 'MOVE_SHAPE' | 'PAN_CAMERA' | 'DRAW_SHAPE';
    shapeId: string | null;
    offsetX: number;
    offsetY: number;
    lastMouseX: number;
    lastMouseY: number;
    startX: number;
    startY: number;
  }>({
    isDragging: false,
    mode: 'NONE',
    shapeId: null,
    offsetX: 0,
    offsetY: 0,
    lastMouseX: 0,
    lastMouseY: 0,
    startX: 0,
    startY: 0
  });

  useEffect(() => {
    if (!staticCanvasRef.current || !activeCanvasRef.current) return;

    const engine = new AntigravityEngine(staticCanvasRef.current, activeCanvasRef.current);
    engineRef.current = engine;
    engine.start();

    const handleExport = () => {
      engine.exportToPNG();
    };
    window.addEventListener('export-canvas', handleExport);

    return () => {
      engine.destroy();
      window.removeEventListener('export-canvas', handleExport);
    };
  }, []);

  useEffect(() => {
    if (!syncLayer || !engineRef.current) return;
    
    // Wire up sync layer to engine updates
    const handleUpdate = () => {
      engineRef.current?.setShapes(syncLayer.getShapes());
      const cursors = syncLayer.getRemoteCursors();
      cursors.forEach(c => engineRef.current?.updateCursor(c));
    };

    // We pass a callback to SyncLayer normally, but for modularity we can just poll or 
    // re-assign the onUpdate. Assuming SyncLayer can accept an event listener or we just override it:
    syncLayer.awareness.on('change', handleUpdate);
    syncLayer.shapesMap.observe(handleUpdate);
    
    // Initial sync
    handleUpdate();

    return () => {
      syncLayer.awareness.off('change', handleUpdate);
      syncLayer.shapesMap.unobserve(handleUpdate);
    };
  }, [syncLayer]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || !syncLayer) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn('Pointer capture failed:', err);
    }
    
    const dpr = window.devicePixelRatio || 1;
    const rect = activeCanvasRef.current!.getBoundingClientRect();
    const screenX = (e.clientX - rect.left) * dpr;
    const screenY = (e.clientY - rect.top) * dpr;
    
    // Pan Mode (Middle click or Pan Tool)
    if (e.button === 1 || activeTool === 'PAN') {
      dragState.current = {
        ...dragState.current,
        isDragging: true,
        mode: 'PAN_CAMERA',
        lastMouseX: e.clientX,
        lastMouseY: e.clientY
      };
      return;
    }
    
    const worldCoords = engineRef.current.screenToWorld(screenX, screenY);

    if (activeTool === 'RECT' || activeTool === 'ELLIPSE') {
      const newId = uuidv4();
      const newShape: Shape = {
        id: newId,
        type: activeTool === 'RECT' ? 'rectangle' : 'ellipse',
        transform: { position: { x: worldCoords.x, y: worldCoords.y }, scale: { x: 1, y: 1 }, rotation: 0 },
        width: 1,
        height: 1,
        fillColor: '#6366f1',
        strokeColor: '#4338ca',
        strokeWidth: 2,
        opacity: 1,
        isDeleted: false,
        ...(activeTool === 'RECT' ? { cornerRadius: 8 } : {})
      } as Shape;
      
      syncLayer.addShape(newShape);
      engineRef.current.setKinematic(newId, true);
      engineRef.current.setSelectedShapes([newId]);
      
      dragState.current = {
        ...dragState.current,
        isDragging: true,
        mode: 'DRAW_SHAPE',
        shapeId: newId,
        startX: worldCoords.x,
        startY: worldCoords.y
      };
      return;
    }

    // Select Mode
    if (activeTool === 'SELECT') {
      const hitShape = engineRef.current.getShapeAtPosition(screenX, screenY);
      
      if (hitShape) {
        engineRef.current.setSelectedShapes([hitShape.id]);
        engineRef.current.setKinematic(hitShape.id, true);
        
        dragState.current = {
          ...dragState.current,
          isDragging: true,
          mode: 'MOVE_SHAPE',
          shapeId: hitShape.id,
          offsetX: hitShape.transform.position.x - worldCoords.x,
          offsetY: hitShape.transform.position.y - worldCoords.y,
          lastMouseX: e.clientX,
          lastMouseY: e.clientY
        };
        syncLayer.updateLocalCursor(worldCoords, [hitShape.id]);
      } else {
        engineRef.current.setSelectedShapes([]);
        syncLayer.updateLocalCursor(worldCoords, []);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || !syncLayer) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = activeCanvasRef.current!.getBoundingClientRect();
    const screenX = (e.clientX - rect.left) * dpr;
    const screenY = (e.clientY - rect.top) * dpr;
    const worldCoords = engineRef.current.screenToWorld(screenX, screenY);
    
    if (dragState.current.isDragging) {
      if (dragState.current.mode === 'PAN_CAMERA') {
        const dx = (e.clientX - dragState.current.lastMouseX) * dpr;
        const dy = (e.clientY - dragState.current.lastMouseY) * dpr;
        
        cameraState.current.x += dx;
        cameraState.current.y += dy;
        engineRef.current.setCamera(cameraState.current.x, cameraState.current.y, cameraState.current.zoom);
        
        dragState.current.lastMouseX = e.clientX;
        dragState.current.lastMouseY = e.clientY;
      } 
      else if (dragState.current.mode === 'MOVE_SHAPE' && dragState.current.shapeId) {
        const id = dragState.current.shapeId;
        const shapes = syncLayer.getShapes();
        const targetShape = shapes.find(s => s.id === id);
        
        if (targetShape) {
          const updatedShape: Shape = {
            ...targetShape,
            transform: {
              ...targetShape.transform,
              position: {
                x: worldCoords.x + dragState.current.offsetX,
                y: worldCoords.y + dragState.current.offsetY
              }
            }
          };
          syncLayer.modifyShape(updatedShape);
          syncLayer.updateLocalCursor(worldCoords, [id]);
        }
      }
      else if (dragState.current.mode === 'DRAW_SHAPE' && dragState.current.shapeId) {
        const id = dragState.current.shapeId;
        const shapes = syncLayer.getShapes();
        const targetShape = shapes.find(s => s.id === id);
        
        if (targetShape) {
          const width = Math.max(1, Math.abs(worldCoords.x - dragState.current.startX));
          const height = Math.max(1, Math.abs(worldCoords.y - dragState.current.startY));
          const centerX = (worldCoords.x + dragState.current.startX) / 2;
          const centerY = (worldCoords.y + dragState.current.startY) / 2;
          
          const updatedShape = {
            ...targetShape,
            width,
            height,
            transform: {
              ...targetShape.transform,
              position: { x: centerX, y: centerY }
            }
          } as Shape;
          syncLayer.modifyShape(updatedShape);
          syncLayer.updateLocalCursor(worldCoords, [id]);
        }
      }
    } else {
      syncLayer.updateLocalCursor(worldCoords, []);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    
    if (dragState.current.isDragging) {
      if ((dragState.current.mode === 'MOVE_SHAPE' || dragState.current.mode === 'DRAW_SHAPE') && dragState.current.shapeId) {
        engineRef.current.setKinematic(dragState.current.shapeId, false);
      }
      dragState.current.isDragging = false;
      dragState.current.mode = 'NONE';
      dragState.current.shapeId = null;
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = activeCanvasRef.current!.getBoundingClientRect();
    const screenX = (e.clientX - rect.left) * dpr;
    const screenY = (e.clientY - rect.top) * dpr;
    
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const newZoom = Math.min(Math.max(0.1, cameraState.current.zoom * (1 + delta)), 5);
    
    // Zoom toward cursor
    const scaleChange = newZoom - cameraState.current.zoom;
    const worldX = (screenX - cameraState.current.x) / cameraState.current.zoom;
    const worldY = (screenY - cameraState.current.y) / cameraState.current.zoom;
    
    cameraState.current.x -= worldX * scaleChange;
    cameraState.current.y -= worldY * scaleChange;
    cameraState.current.zoom = newZoom;
    
    engineRef.current.setCamera(cameraState.current.x, cameraState.current.y, cameraState.current.zoom);
  };

  // Attach non-passive wheel event listener to prevent default browser scrolling
  useEffect(() => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => e.preventDefault();
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={staticCanvasRef}
        className="absolute top-0 left-0 w-full h-full block z-[1]"
      />
      <canvas
        ref={activeCanvasRef}
        className="absolute top-0 left-0 w-full h-full block z-[2] touch-none"
        style={{ cursor: activeTool === 'PAN' ? 'grab' : 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />
    </div>
  );
};
