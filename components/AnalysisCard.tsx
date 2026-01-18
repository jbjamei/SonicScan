
import React from 'react';
import { AudioAnalysis } from '../types';

interface AnalysisCardProps {
  analysis: AudioAnalysis | null;
  isLoading: boolean;
  onAnalyze: () => void;
  onFeedback: (type: 'up' | 'down' | 'refine_more') => void;
  hasAudio: boolean;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({ analysis, isLoading, onAnalyze, onFeedback, hasAudio }) => {
  return (
    <div className="relative p-[1px] rounded-2xl bg-gradient-to-b from-white/20 to-white/5 overflow-hidden group h-full">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <div className="bg-cyber-mid/90 backdrop-blur-xl h-full rounded-2xl p-4 sm:p-6 flex flex-col items-start min-h-[400px]">
            
            <div className="w-full flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-white">
                    <span className="text-cyber-glow">Sonic</span> Logic
                    <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-ping' : analysis ? 'bg-emerald-400' : 'bg-gray-600'}`}></div>
                </h2>
                {hasAudio && !isLoading && (
                    <button 
                        onClick={onAnalyze}
                        className="bg-white/5 hover:bg-white/10 text-white border border-white/20 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                    >
                        New Scan
                    </button>
                )}
            </div>

            {!analysis && !isLoading && (
                <div className="flex-1 w-full flex flex-col items-center justify-center text-center text-gray-500 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 opacity-20">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                        </svg>
                    </div>
                    <p className="max-w-xs text-[11px] font-mono uppercase tracking-widest">Awaiting Audio Input Signal</p>
                </div>
            )}

            {isLoading && (
                <div className="flex-1 w-full flex flex-col items-center justify-center space-y-6">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-2 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-emerald-400 animate-pulse">
                            SCANNING
                        </div>
                    </div>
                    <div className="font-mono text-[10px] text-emerald-500/80 text-center uppercase tracking-[0.2em]">Processing neural waveforms...</div>
                </div>
            )}

            {analysis && !isLoading && (
                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-5">
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Class</div>
                            <div className="text-lg font-bold text-white truncate">{analysis.genre}</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Micro-Genre</div>
                            <div className="text-lg font-bold text-emerald-400 truncate">{analysis.subgenre}</div>
                        </div>
                    </div>

                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[9px] text-emerald-500 uppercase tracking-widest font-bold font-mono">Feedback Training</div>
                            <div className="flex gap-2">
                                <button 
                                  onClick={() => onFeedback('up')}
                                  title="Accurate Identification"
                                  className={`p-1.5 rounded-lg border transition-all ${analysis.feedback === 'up' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-emerald-400'}`}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75A2.25 2.25 0 0 1 16.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.551.5.96a12.184 12.184 0 0 0-1.037 3.328 12.184 12.184 0 0 0 0 4.712Z" />
                                  </svg>
                                </button>
                                <button 
                                  onClick={() => onFeedback('refine_more')}
                                  title="Accurate, but narrow it down"
                                  className={`p-1.5 rounded-lg border transition-all ${analysis.feedback === 'refine_more' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-blue-400'}`}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                  </svg>
                                </button>
                                <button 
                                  onClick={() => onFeedback('down')}
                                  title="Incorrect Classification"
                                  className={`p-1.5 rounded-lg border transition-all ${analysis.feedback === 'down' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-orange-400'}`}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                  </svg>
                                </button>
                            </div>
                        </div>
                        <div className="text-[10px] text-gray-500 italic leading-relaxed">
                          {analysis.feedback === 'down' 
                            ? "Initiating neural recalibration..." 
                            : analysis.feedback === 'refine_more' 
                            ? "Expanding sub-neural detail..." 
                            : "Train the algorithm with feedback."}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-black/20 rounded-lg p-2 border border-white/5 text-center">
                             <div className="text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">BPM</div>
                             <div className="text-xs font-mono text-gray-200">{analysis.bpm}</div>
                        </div>
                        <div className="bg-black/20 rounded-lg p-2 border border-white/5 text-center">
                             <div className="text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">Key</div>
                             <div className="text-xs font-mono text-gray-200">{analysis.key}</div>
                        </div>
                        <div className="bg-black/20 rounded-lg p-2 border border-white/5 text-center">
                             <div className="text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">Scale</div>
                             <div className="text-xs font-mono text-emerald-400 font-bold">{analysis.camelot}</div>
                        </div>
                    </div>

                    <div className="bg-black/20 rounded-xl p-4 border border-white/5 flex-1 overflow-y-auto max-h-[120px] custom-scrollbar">
                        <div className="text-[10px] text-emerald-500 uppercase tracking-widest mb-2 font-mono font-bold">
                            Sonic Fingerprint
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed italic">
                            "{analysis.breakdown}"
                        </p>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
