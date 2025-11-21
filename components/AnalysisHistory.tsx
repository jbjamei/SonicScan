
import React, { useEffect, useState } from 'react';
import { getHistory, getSession } from '../services/storageService';
import { HistoryItem } from '../types';

export const AnalysisHistory: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  useEffect(() => {
    const user = getSession();
    if (user) {
        const data = getHistory(user.username);
        setHistory(data);
    }
  }, []);

  return (
    <div className="bg-cyber-mid/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-white/10 bg-white/5">
         <h2 className="text-xl font-bold text-white">Analysis History</h2>
         <p className="text-sm text-gray-500">
             {history.length === 0 
               ? "No tracks processed yet." 
               : `Showing recent ${history.length} tracks processed by the Neural Engine.`}
         </p>
      </div>
      
      <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
        {history.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
                Start a Single or Bulk scan to see your history here.
            </div>
        ) : (
            <table className="w-full text-left border-collapse">
            <thead className="bg-black/20 text-xs uppercase text-gray-500 sticky top-0 backdrop-blur-md z-10">
                <tr>
                <th className="p-4 font-semibold tracking-wider">Date</th>
                <th className="p-4 font-semibold tracking-wider">Track</th>
                <th className="p-4 font-semibold tracking-wider">Genre</th>
                <th className="p-4 font-semibold tracking-wider text-right">Key/BPM</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                {history.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4 font-mono text-gray-500 align-top">
                        {item.date}
                        <div className="text-[10px] opacity-50 uppercase">{item.type} SCAN</div>
                    </td>
                    <td className="p-4 align-top">
                        <div className="font-bold text-white">{item.title}</div>
                        <div className="text-xs text-gray-500">{item.artist}</div>
                    </td>
                    <td className="p-4 align-top">
                        <div className="flex flex-col items-start gap-1">
                            <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
                                {item.genre}
                            </span>
                            <span className="text-xs text-gray-500">{item.subgenre}</span>
                        </div>
                    </td>
                    <td className="p-4 text-right font-mono align-top">
                        <div className="text-emerald-400">{item.camelot}</div>
                        <div className="text-gray-500">{item.bpm} BPM</div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        )}
      </div>
    </div>
  );
};
