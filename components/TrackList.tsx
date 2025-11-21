
import React from 'react';
import { Track } from '../types';

interface TrackListProps {
  tracks: Track[];
  onSelect: (track: Track) => void;
  onClose: () => void;
}

export const TrackList: React.FC<TrackListProps> = ({ tracks, onSelect, onClose }) => {
  return (
    <div className="absolute inset-0 z-30 bg-cyber-dark/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300 rounded-2xl overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
        <h3 className="text-emerald-400 font-bold tracking-wider uppercase text-sm">Select a Track</h3>
        <button 
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p>No tracks found.</p>
            </div>
        ) : (
            tracks.map((track) => (
            <button
                key={track.id}
                onClick={() => onSelect(track)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/10 transition-all group text-left border border-transparent hover:border-emerald-500/30"
            >
                <img 
                    src={track.coverUrl} 
                    alt={track.album} 
                    className="w-12 h-12 rounded-md object-cover shadow-lg group-hover:scale-105 transition-transform"
                />
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">
                        {track.title}
                    </div>
                    <div className="text-sm text-gray-400 truncate flex items-center gap-2">
                        <span>{track.artist}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                        <span className="text-gray-500 italic">{track.album}</span>
                    </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                    </svg>
                </div>
            </button>
            ))
        )}
      </div>
    </div>
  );
};
