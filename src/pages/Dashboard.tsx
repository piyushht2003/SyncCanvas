import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../hooks/useAuth';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logOut } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const createNewProject = () => {
    const newRoomId = uuidv4().substring(0, 8);
    navigate(`/board/${newRoomId}`);
  };

  if (!user) return null;

  return (
    <div className="p-10 md:p-14 max-w-[1400px] mx-auto h-screen overflow-y-auto bg-black text-white">
      <div className="flex justify-between items-center mb-12 pb-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <img src={user.photoURL || ''} alt="avatar" className="w-12 h-12 rounded-full border border-white/10" />
          <h1 className="text-3xl font-semibold tracking-tight m-0">My Projects</h1>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => logOut()}
            className="px-6 py-3 bg-transparent text-zinc-400 border border-white/10 rounded-xl font-medium transition-all duration-200 hover:text-white hover:border-white/30 cursor-pointer"
          >
            Logout
          </button>
          <button onClick={createNewProject} className="flex items-center gap-2 px-6 py-3 bg-white text-black border border-white rounded-xl font-medium transition-all duration-200 hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Canvas
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
        <div 
          onClick={() => navigate('/board/demo')}
          className="group h-[200px] bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 relative overflow-hidden"
        >
          <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center text-zinc-400 border border-white/5 transition-all duration-300 group-hover:text-white group-hover:border-white/20 group-hover:bg-white/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          </div>
          <h3 className="text-lg font-medium text-white mt-4">Demo Canvas</h3>
          <p className="text-zinc-500 text-sm mt-2">Edited just now</p>
        </div>
      </div>
    </div>
  );
};
