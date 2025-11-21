
import React from 'react';
import { AudioAnalysis } from '../types';

interface AnalysisCardProps {
  analysis: AudioAnalysis | null;
  isLoading: boolean;
  onAnalyze: () => void;
  hasAudio: boolean;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({ analysis, isLoading, onAnalyze, hasAudio }) => {
  return (
    <div className="relative p-[1px] rounded-2xl bg-gradient-to-b from-white/20 to-white/5 overflow-hidden group h-full">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <div className="bg-cyber-mid/90 backdrop-blur-xl h-full rounded-2xl p-4 sm:p-6 flex flex-col items-start min-h-[400px]">
            
            {/* Header Area */}
            <div className="w-full flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                    <span className="text-cyber-glow">Gemini</span> Ear
                    <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-ping' : analysis ? 'bg-emerald-400' : 'bg-gray-600'}`}></div>
                </h2>
                {hasAudio && (
                    <button 
                        onClick={onAnalyze}
                        disabled={isLoading}
                        className={`
                            px-4 py-2 sm:px-6 rounded-full font-semibold text-xs sm:text-sm tracking-wide transition-all shadow-lg
                            ${isLoading 
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                                : 'bg-emerald-500 hover:bg-emerald-400 text-black hover:shadow-emerald-500/30 active:scale-95'
                            }
                        `}
                    >
                        {isLoading ? 'ANALYZING...' : 'ANALYZE'}
                    </button>
                )}
            </div>

            {/* Content Area */}
            {!analysis && !isLoading && (
                <div className="flex-1 w-full flex flex-col items-center justify-center text-center text-gray-500 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                        </svg>
                    </div>
                    <p className="max-w-xs">Upload an audio file and activate the neural network to identify genre and sonic characteristics.</p>
                </div>
            )}

            {isLoading && (
                <div className="flex-1 w-full flex flex-col items-center justify-center space-y-6">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-emerald-400 animate-pulse">
                            PROCESSING
                        </div>
                    </div>
                    <div className="font-mono text-sm text-emerald-500/80">Extracting features...</div>
                </div>
            )}

            {analysis && !isLoading && (
                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                    
                    {/* Primary Stats - Stacked on mobile/tablet (md) to prevent text cut-off */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Primary Genre</div>
                            <div className="text-xl sm:text-2xl font-bold text-white leading-tight break-words whitespace-normal">
                                {analysis.genre}
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Subgenre</div>
                            <div className="text-lg sm:text-xl font-semibold text-emerald-400 leading-tight break-words whitespace-normal">
                                {analysis.subgenre}
                            </div>
                        </div>
                    </div>

                    {/* Technical Stats (BPM/Key/Camelot) */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <div className="bg-black/20 rounded-lg p-2 border border-white/5 flex flex-col justify-center text-center sm:text-left">
                             <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider mb-1">Est. BPM</div>
                             <div className="text-xs sm:text-sm font-mono text-gray-200 flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-emerald-500 hidden sm:block">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                                {analysis.bpm}
                             </div>
                        </div>
                        <div className="bg-black/20 rounded-lg p-2 border border-white/5 flex flex-col justify-center text-center sm:text-left">
                             <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider mb-1">Musical Key</div>
                             <div className="text-xs sm:text-sm font-mono text-gray-200 flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-emerald-500 hidden sm:block">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
                                </svg>
                                {analysis.key}
                             </div>
                        </div>
                        <div className="bg-black/20 rounded-lg p-2 border border-white/5 flex flex-col justify-center text-center sm:text-left">
                             <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider mb-1">Camelot</div>
                             <div className="text-xs sm:text-sm font-mono text-emerald-400 font-bold flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 hidden sm:block"></span>
                                {analysis.camelot}
                             </div>
                        </div>
                    </div>

                    {/* Confidence Bar */}
                    <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                            <span>AI CONFIDENCE</span>
                            <span>{analysis.confidence}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-1000 ease-out" 
                                style={{ width: `${analysis.confidence}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Breakdown */}
                    <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                        <div className="text-xs text-emerald-500 uppercase tracking-widest mb-2 font-bold flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            Sonic Breakdown
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            {analysis.breakdown}
                        </p>
                    </div>

                    {/* Instruments Tags */}
                    <div className="flex flex-wrap gap-2">
                        {analysis.instruments.map((inst, i) => (
                             <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-300">
                                {inst}
                             </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
