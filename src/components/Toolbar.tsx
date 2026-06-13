import React, { useRef } from 'react';
import { SyncLayer } from '../sync/sync';

interface ToolbarProps {
  isConnected: boolean;
  activeTool: 'SELECT' | 'RECT' | 'ELLIPSE' | 'PAN';
  setActiveTool: (tool: 'SELECT' | 'RECT' | 'ELLIPSE' | 'PAN') => void;
  syncLayer: SyncLayer | null;
  onImageUpload: (file: File) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ isConnected, activeTool, setActiveTool, onImageUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageUpload(e.target.files[0]);
    }
  };
  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex gap-2 items-center bg-[#141419]/70 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      <div className={`w-2 h-2 rounded-full mr-1 transition-colors duration-300 ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500'}`} title={isConnected ? 'Connected to Sync Engine' : 'Disconnected'} />
      <div className="w-px h-5 bg-white/10 mx-2" />
      
      <button 
        onClick={() => setActiveTool('SELECT')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${activeTool === 'SELECT' ? 'bg-white text-black font-semibold' : 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/5'}`}
      >
        Select
      </button>
      <button 
        onClick={() => setActiveTool('PAN')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${activeTool === 'PAN' ? 'bg-white text-black font-semibold' : 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/5'}`}
      >
        Pan
      </button>
      
      <div className="w-px h-5 bg-white/10 mx-2" />
      
      <button 
        onClick={() => setActiveTool('RECT')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${activeTool === 'RECT' ? 'bg-white text-black font-semibold' : 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/5'}`}
      >
        Rectangle
      </button>
      <button 
        onClick={() => setActiveTool('ELLIPSE')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${activeTool === 'ELLIPSE' ? 'bg-white text-black font-semibold' : 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/5'}`}
      >
        Ellipse
      </button>

      <div className="w-px h-5 bg-white/10 mx-2" />
      
      <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="px-4 py-2 rounded-full text-sm font-medium bg-transparent text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer flex items-center gap-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
        Image
      </button>

      <button 
        onClick={() => window.dispatchEvent(new CustomEvent('export-canvas'))}
        className="px-4 py-2 rounded-full text-sm font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all duration-200 cursor-pointer flex items-center gap-2 border border-emerald-500/20"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Export
      </button>
    </div>
  );
};
