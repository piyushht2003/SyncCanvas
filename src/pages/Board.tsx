import React, { useEffect, useRef, useState } from 'react';
import { SyncLayer } from '../sync/sync';
import { Toolbar } from '../components/Toolbar';
import { Presence } from '../components/Presence';
import { CanvasArea } from '../components/CanvasArea';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, setDoc, Bytes } from 'firebase/firestore';
import { db } from '../sync/firebase';
import * as Y from 'yjs';
import { v4 as uuidv4 } from 'uuid';
import type { Shape } from '../types';

export const Board: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const syncRef = useRef<SyncLayer | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTool, setActiveTool] = useState<'SELECT' | 'RECT' | 'ELLIPSE' | 'PAN'>('SELECT');
  const saveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!user || !id) {
      if (!user) navigate('/login');
      return;
    }

    // Connect to the specific room ID
    const roomName = `sync-canvas-room-${id}`;
    const sync = new SyncLayer(roomName, user, () => {});
    syncRef.current = sync;

    // 1. Load existing state from Firestore
    const loadState = async () => {
      const docRef = doc(db, 'rooms', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().yjsState) {
        const stateBytes = docSnap.data().yjsState as Bytes;
        Y.applyUpdate(sync.doc, stateBytes.toUint8Array());
      }
    };
    loadState();

    // 2. Debounced save to Firestore on document updates
    sync.doc.on('update', () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const state = Y.encodeStateAsUpdate(sync.doc);
        setDoc(doc(db, 'rooms', id), { 
          yjsState: Bytes.fromUint8Array(state),
          lastUpdated: new Date()
        }, { merge: true });
      }, 3000); // Save every 3 seconds of inactivity
    });

    sync.provider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!syncRef.current) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          syncRef.current.undo();
        } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          syncRef.current.redo();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      sync.destroy();
      window.removeEventListener('keydown', handleKeyDown);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [id, user, navigate]);

  const handleImageUpload = (file: File) => {
    if (!syncRef.current) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Downscale image to max 800px to avoid bloating the CRDT
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.8); // Compress to JPEG
        
        // Use camera position to center the image. For now, we drop it at (0,0)
        // Since we don't have camera state in Board, dropping at 0,0 is safe.
        const newShape: Shape = {
          id: uuidv4(),
          type: 'image',
          transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 },
          width,
          height,
          fillColor: 'transparent',
          strokeColor: '#000000',
          strokeWidth: 0,
          opacity: 1,
          isDeleted: false,
          base64
        } as any;
        
        syncRef.current?.addShape(newShape);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!user) return null;

  return (
    <div className="w-full h-full relative bg-zinc-950 bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:32px_32px]">
      <Toolbar 
        isConnected={isConnected} 
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        syncLayer={syncRef.current}
        onImageUpload={handleImageUpload}
      />
      <Presence syncLayer={syncRef.current} />
      <CanvasArea 
        syncLayer={syncRef.current} 
        activeTool={activeTool}
      />
    </div>
  );
};
