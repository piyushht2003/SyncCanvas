import React, { useEffect, useState } from 'react';
import { SyncLayer } from '../sync/sync';
import type { CursorState } from '../types';

interface PresenceProps {
  syncLayer: SyncLayer | null;
}

export const Presence: React.FC<PresenceProps> = ({ syncLayer }) => {
  const [users, setUsers] = useState<CursorState[]>([]);

  useEffect(() => {
    if (!syncLayer) return;

    const updatePresence = () => {
      setUsers(syncLayer.getRemoteCursors());
    };

    syncLayer.awareness.on('change', updatePresence);
    updatePresence();

    return () => {
      syncLayer.awareness.off('change', updatePresence);
    };
  }, [syncLayer]);

  if (!syncLayer) return null;

  return (
    <div className="absolute top-6 right-6 z-10 flex items-center">
      {users.map((user) => (
        <div
          key={user.id}
          className="w-9 h-9 rounded-full border-2 border-black shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center text-white text-[13px] font-semibold -ml-2.5 transition-transform duration-200 hover:-translate-y-1.5 hover:scale-110 hover:z-20 hover:border-white/50 relative bg-cover bg-center"
          style={{ 
            backgroundColor: user.photoUrl ? 'white' : user.color,
            backgroundImage: user.photoUrl ? `url(${user.photoUrl})` : 'none',
            zIndex: 10
          }}
          title={user.name || `User ${user.id.substring(0, 4)}`}
        >
          {!user.photoUrl && (user.name || user.id).substring(0, 1).toUpperCase()}
        </div>
      ))}
      <div
        className="w-9 h-9 rounded-full border-2 border-black shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center text-white text-[13px] font-semibold -ml-2.5 relative z-20"
        style={{ backgroundColor: syncLayer.color }}
        title="You"
      >
        You
      </div>
    </div>
  );
};
