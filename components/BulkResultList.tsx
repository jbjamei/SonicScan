
import React, { useState, useEffect } from 'react';
import { BulkSongEntry } from '../types';

interface BulkResultListProps {
  results: BulkSongEntry[];
  isLoading: boolean;
  onReset: () => void;
  onFeedbackTrack: (track: BulkSongEntry, type: 'up' | 'down' | 'refine_more') => void;
}

const LOADING_PHRASES = [
  "DECRYPTING FREQUENCIES",
  "RETRIEVING ARTIST DATA",
  "IDENTIFYING MICRO-GENRES",
  "CROSS-REFERENCING ARCHIVES",
  "FORBIDDING GENERIC TAGS",
  "MAPPING SONIC SIGNATURES"
];

export const BulkResultList: React.FC<BulkResultListProps> = ({ results, isLoading, onReset, onFeedbackTrack }) => {
  const [loadingMessage, setLoadingMessage] = useState(LOADING_PHRASES[0]);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingMessage(prev => {
        const idx = (LOADING_PHRASES.indexOf(prev) + 1) % LOADING_PHRASES.length;
        return LOADING_PHRASES[idx];
      });
    }, 1800);
    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <div className="relative rounded-2xl bg-cyber-mid/90 backdrop-blur-xl border border-white/10 overflow-hidden h-full flex flex-col min-h-[400px] shadow-2xl">
      
      <div className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-md sticky top-0 z-20">
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-white">
           <span className="text-cyber-glow">Batch</span> Scan Results
           {results.length > 0 && (
             <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-mono tracking-widest border border-emerald-500/20">
               {results.length} LOGS
             </span>
           )}
        </h2>
        <button onClick={onReset} className="text-[10px] font-mono uppercase tracking-widest text-gray-500 hover:text-white transition-colors border border-white/10 px-3 py-1 rounded-full hover:bg-white/5">Clear Archive</button>
      </div>

      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
            <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-emerald-400 font-mono text-xs uppercase tracking-widest animate-pulse">{loadingMessage}</div>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div className="flex-1 overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[750px] text-left border-collapse">
                <thead className="bg-black/40 text-[9px] uppercase text-gray-500 tracking-[0.2em] font-bold">
                    <tr>
                        <th className="px-6 py-4 border-b border-white/5">Identification</th>
                        <th className="px-6 py-4 border-b border-white/5">Neural Classification</th>
                        <th className="px-6 py-4 border-b border-white/5 text-right">Key</th>
                        <th className="px-6 py-4 border-b border-white/5 text-right">BPM</th>
                        <th className="px-6 py-4 border-b border-white/5 text-center">Neural Training</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {results.map((track) => (
                        <tr key={track.id} className={`hover:bg-white/5 transition-colors group ${track.isRefining ? 'opacity-40 pointer-events-none' : ''}`}>
                            <td className="px-6 py-4">
                                <div className="font-bold text-white text-sm leading-tight group-hover:text-emerald-400 transition-colors mb-0.5">{track.title}</div>
                                <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{track.artist}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-emerald-400 text-xs font-bold leading-none mb-1.5 uppercase tracking-widest">{track.genre}</div>
                                <div className="text-white/80 text-[11px] font-medium border-l-2 border-emerald-500/50 pl-3 ml-0.5">{track.subgenre}</div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="text-white font-mono text-xs font-bold">{track.camelot}</div>
                                <div className="text-[9px] text-gray-600 truncate uppercase tracking-tighter">{track.key}</div>
                            </td>
                            <td className="px-6 py-4 text-right text-xs font-mono text-gray-300">
                                {track.bpm}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {track.isRefining ? (
                                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                ) : (
                                    <div className="flex items-center justify-center gap-1">
                                      <button 
                                        onClick={() => onFeedbackTrack(track, 'up')}
                                        title="Neural Sync (Accurate)"
                                        className={`p-1.5 rounded transition-all ${track.feedback === 'up' ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/30' : 'text-gray-600 hover:text-emerald-400'}`}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                                        </svg>
                                      </button>
                                      <button 
                                        onClick={() => onFeedbackTrack(track, 'refine_more')}
                                        title="Neural Depth (Narrow Down)"
                                        className={`p-1.5 rounded transition-all ${track.feedback === 'refine_more' ? 'text-blue-400 bg-blue-400/10 border border-blue-400/30' : 'text-gray-600 hover:text-blue-400'}`}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                      </button>
                                      <button 
                                        onClick={() => onFeedbackTrack(track, 'down')}
                                        title="Neural Reset (Incorrect)"
                                        className={`p-1.5 rounded transition-all ${track.feedback === 'down' ? 'text-orange-500 bg-orange-500/10 border border-orange-500/30' : 'text-gray-600 hover:text-orange-500'}`}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                        </svg>
                                      </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}
      
      {!isLoading && results.length === 0 && (
         <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center gap-6">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 opacity-20">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
            </div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] max-w-[280px] leading-relaxed">System Idle. Awaiting Batch Signal.</p>
         </div>
      )}
    </div>
  );
};
