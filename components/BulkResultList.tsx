
import React, { useState, useEffect } from 'react';
import { BulkSongEntry } from '../types';

interface BulkResultListProps {
  results: BulkSongEntry[];
  isLoading: boolean;
  onReset: () => void;
}

const LOADING_PHRASES = [
  "ANALYZING PIXELS",
  "CALIBRATING HOLTZMAN FLUCTUATION",
  "RETICULATING SPLINES",
  "CUTTING THE FLEEB",
  "DISCHARGING IONIZED MUONS",
  "CHARGING WUB DRIVE",
  "WOPPING THE WANDY",
  "DEFRAGMENTING SUB-BASS FREQUENCIES",
  "SYNCHRONIZING NEURAL NETWORKS"
];

export const BulkResultList: React.FC<BulkResultListProps> = ({ results, isLoading, onReset }) => {
  const [loadingMessage, setLoadingMessage] = useState(LOADING_PHRASES[0]);

  useEffect(() => {
    if (!isLoading) {
        setLoadingMessage(LOADING_PHRASES[0]);
        return;
    }

    const interval = setInterval(() => {
      setLoadingMessage(prev => {
        const currentIndex = LOADING_PHRASES.indexOf(prev);
        const nextIndex = (currentIndex + 1) % LOADING_PHRASES.length;
        return LOADING_PHRASES[nextIndex];
      });
    }, 1800); // Change phrase every 1.8 seconds

    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <div className="relative rounded-2xl bg-cyber-mid/90 backdrop-blur-xl border border-white/10 overflow-hidden h-full flex flex-col min-h-[400px]">
      
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
           <span className="text-cyber-glow">Bulk</span> Analysis
           <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-mono whitespace-nowrap">
             {isLoading ? 'SCANNING...' : `${results.length} DETECTED`}
           </span>
        </h2>
        <button 
            onClick={onReset}
            className="text-xs sm:text-sm text-gray-400 hover:text-white hover:underline underline-offset-4"
        >
            Clear Results
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-8">
             <div className="relative w-20 h-20">
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse"></div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 text-emerald-400 animate-bounce">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                </svg>
            </div>
            <div className="text-center px-4">
                <div className="text-emerald-400 font-mono font-bold uppercase tracking-wider animate-pulse">{loadingMessage}</div>
                <div className="text-gray-500 text-sm mt-2">Extracting text and retrieving sonic data...</div>
            </div>
        </div>
      )}

      {/* Results Table */}
      {!isLoading && results.length > 0 && (
        <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-[600px] text-left border-collapse">
                    <thead className="bg-black/20 sticky top-0 backdrop-blur-sm z-10">
                        <tr>
                            <th className="p-2 sm:p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Track</th>
                            <th className="p-2 sm:p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Genre Classification</th>
                            <th className="p-2 sm:p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Key / Camelot</th>
                            <th className="p-2 sm:p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">BPM</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {results.map((track, i) => (
                            <tr key={i} className="hover:bg-white/5 transition-colors group">
                                <td className="p-2 sm:p-4 align-top">
                                    <div className="font-bold text-white text-sm sm:text-base mb-0.5">{track.title}</div>
                                    <div className="text-xs sm:text-sm text-gray-400">{track.artist}</div>
                                </td>
                                <td className="p-2 sm:p-4 align-top">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 pt-1">
                                        <span className="text-emerald-400 font-bold text-sm sm:text-base">{track.genre}</span>
                                        <span className="hidden sm:inline text-gray-600">-</span>
                                        <span className="text-emerald-200/80 font-medium text-sm sm:text-base">{track.subgenre}</span>
                                    </div>
                                </td>
                                <td className="p-2 sm:p-4 align-top text-right font-mono">
                                    <div className="text-emerald-400 font-bold text-base sm:text-lg leading-none">{track.camelot}</div>
                                    <div className="text-gray-500 mt-1 text-[10px] sm:text-xs whitespace-nowrap">{track.key}</div>
                                </td>
                                <td className="p-2 sm:p-4 align-top text-right font-mono text-sm sm:text-base font-bold text-white pt-3">
                                    {track.bpm}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
      
      {/* Empty State */}
      {!isLoading && results.length === 0 && (
         <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
            </div>
            <h3 className="text-white font-semibold mb-1">No Scan Results</h3>
            <p className="text-sm max-w-xs">
                Upload a screenshot of a playlist or tracklist to automatically digitize and analyze multiple songs at once.
            </p>
         </div>
      )}
    </div>
  );
};
