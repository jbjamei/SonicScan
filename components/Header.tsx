
import React, { useState } from 'react';
import { User, Page } from '../types';

interface HeaderProps {
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNavigate: (page: Page) => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onOpenAuth, onLogout, onNavigate }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleSignOut = () => {
    setShowProfile(false);
    setShowNotifications(false);
    onLogout();
  };

  const handleNavClick = (page: Page) => {
    onNavigate(page);
    setShowProfile(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-cyber-dark/80 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('scan')}>
          {/* Logo Icon */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyber-blue to-cyber-neon flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-400">
            SonicScan AI
          </span>
        </div>

        {/* Center Spacer */}
        <div className="hidden md:block text-xs text-gray-500 font-mono uppercase tracking-widest">
            V2.5.0 // READY
        </div>

        <div className="flex items-center gap-4 relative">
          
          {!user ? (
            <button 
                onClick={onOpenAuth}
                className="bg-white/5 hover:bg-white/10 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 px-4 py-1.5 rounded-full text-sm font-mono uppercase tracking-wider transition-all hover:shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            >
                Sign In
            </button>
          ) : (
            <>
                {/* Notification Button */}
                <button 
                    onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
                    className={`relative p-1 rounded-full transition-colors ${showNotifications ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <span className="absolute top-1 right-1 w-2 h-2 bg-cyber-neon rounded-full animate-pulse"></span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                    <div className="absolute top-full right-12 mt-4 w-72 bg-cyber-mid/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                        <div className="p-3 border-b border-white/5 flex justify-between items-center">
                        <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">System Logs</div>
                        <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-white">&times;</button>
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            <div className="p-4 hover:bg-white/5 border-b border-white/5 transition-colors group cursor-pointer">
                                <div className="flex items-center justify-between mb-1">
                                <div className="text-xs text-cyber-neon font-mono">CONNECTION</div>
                                <div className="text-[10px] text-gray-500">Now</div>
                                </div>
                                <div className="text-sm text-gray-300 group-hover:text-white transition-colors">Gemini 2.5 Flash Model connected via WebSocket.</div>
                            </div>
                            <div className="p-4 hover:bg-white/5 border-b border-white/5 transition-colors group cursor-pointer">
                                <div className="flex items-center justify-between mb-1">
                                <div className="text-xs text-blue-400 font-mono">AUDIO ENGINE</div>
                                <div className="text-[10px] text-gray-500">2m ago</div>
                                </div>
                                <div className="text-sm text-gray-300 group-hover:text-white transition-colors">Visualizer rendering at 60fps. FFT size set to 2048.</div>
                            </div>
                        </div>
                        <div className="p-2 bg-black/20 text-center text-[10px] text-gray-600 uppercase tracking-widest cursor-pointer hover:text-emerald-500 transition-colors">
                        View All Logs
                        </div>
                    </div>
                )}

                {/* Profile Button */}
                <button 
                    onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
                    className={`w-9 h-9 rounded-full bg-gradient-to-br from-emerald-900 to-slate-900 border border-emerald-500/30 hover:border-emerald-400 transition-all ring-2 ring-transparent hover:ring-emerald-500/20 overflow-hidden flex items-center justify-center ${showProfile ? 'ring-emerald-500/40 border-emerald-400 scale-105' : ''}`}
                >
                    <span className="font-bold text-xs text-emerald-500 font-mono uppercase">
                        {user.username.substring(0, 2)}
                    </span>
                </button>

                {/* Profile Dropdown */}
                {showProfile && (
                    <div className="absolute top-full right-0 mt-4 w-56 bg-cyber-mid/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                        <div className="p-4 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                            <div className="text-sm font-bold text-white">{user.username}</div>
                            <div className="text-xs text-gray-500 font-mono truncate">{user.email}</div>
                        </div>
                        <div className="py-1">
                            <button onClick={() => handleNavClick('dashboard')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-emerald-400 transition-colors flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
                            </svg>
                            Dashboard
                            </button>
                            <button onClick={() => handleNavClick('history')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-emerald-400 transition-colors flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            Analysis History
                            </button>
                            <div className="h-px bg-white/5 my-1"></div>
                            <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 transition-colors flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                            </svg>
                            Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};
