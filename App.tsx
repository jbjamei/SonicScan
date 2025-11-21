
import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { Visualizer } from './components/Visualizer';
import { AnalysisCard } from './components/AnalysisCard';
import { BulkResultList } from './components/BulkResultList';
import { TrackList } from './components/TrackList';
import { AuthModal } from './components/AuthModal';
import { Dashboard } from './components/Dashboard';
import { AnalysisHistory } from './components/AnalysisHistory';
import { PlayerState, AudioAnalysis, Track, BulkSongEntry, User, Page, HistoryItem } from './types';
import { analyzeAudio, analyzeImageForBulkSongs, analyzeTracklistText } from './services/geminiService';
import { searchTracks } from './services/itunesService';
import { getSession, saveSession, clearSession, addToHistory } from './services/storageService';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Navigation State
  const [currentPage, setCurrentPage] = useState<Page>('scan');

  // Audio Logic State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [fileURL, setFileURL] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>(PlayerState.IDLE);
  const [analysisResult, setAnalysisResult] = useState<AudioAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCorsSafe, setIsCorsSafe] = useState(true);
  
  // Playback Control State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  
  // UI State (Scan Page)
  const [activeTab, setActiveTab] = useState<'search' | 'upload' | 'bulk' | 'library'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [showTrackList, setShowTrackList] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Bulk Analysis State
  const [bulkResults, setBulkResults] = useState<BulkSongEntry[]>([]);
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);
  
  // Library State
  const [libraryProgress, setLibraryProgress] = useState<{processed: number, total: number} | null>(null);

  // Audio Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const session = getSession();
    if (session) {
      setUser(session);
    }
  }, []);

  // Clean up Object URLs
  useEffect(() => {
    return () => {
      if (fileURL && fileURL.startsWith('blob:')) {
        URL.revokeObjectURL(fileURL);
      }
    };
  }, [fileURL]);

  // Global Paste Handler for Bulk Upload
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (currentPage === 'scan' && activeTab === 'bulk') {
        // If we already have results, don't accept paste unless cleared
        if (bulkResults.length > 0) return;
        
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) handleBulkImageUpload(blob);
            // Only process one image
            break; 
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [currentPage, activeTab, bulkResults]);

  // Update Volume
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = volume;
    }
  }, [volume]);

  // Initialize Audio Context
  const initAudio = () => {
    if (!audioRef.current) return;
    
    // Create context if not exists
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }

    const ctx = audioContextRef.current;

    // Create analyser
    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 256;
    }

    // Connect source
    if (!sourceRef.current) {
      try {
        sourceRef.current = ctx.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      } catch (e) {
        console.warn("Audio context setup failed (possible CORS issue with visualizer):", e);
      }
    }
  };

  // Event Handlers for Audio Element
  const handleTimeUpdate = () => {
    if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
        setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle File Upload (Local Audio)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioFile(file);
      setFileURL(URL.createObjectURL(file));
      setAnalysisResult(null);
      setPlayerState(PlayerState.IDLE);
      setIsCorsSafe(true); // Local blobs are always safe
      setCurrentTrack({
        id: 0,
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Local Upload',
        album: 'Local Library',
        coverUrl: '',
        previewUrl: ''
      });
      setShowTrackList(false);
    }
  };

  // Handle Bulk Image Upload
  const handleBulkImageUpload = async (file: File) => {
    if (!file) return;
    setIsBulkAnalyzing(true);
    setBulkResults([]);
    try {
      const results = await analyzeImageForBulkSongs(file);
      setBulkResults(results);
      saveBulkToHistory(results);
    } catch (e) {
      console.error("Bulk upload failed", e);
      alert("Failed to analyze image. Please ensure it is a clear screenshot of a tracklist.");
    } finally {
      setIsBulkAnalyzing(false);
    }
  };
  
  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       handleBulkImageUpload(e.target.files[0]);
    }
  };

  const saveBulkToHistory = (results: BulkSongEntry[]) => {
    if (user) {
        const historyItems: HistoryItem[] = results.map(r => ({
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now(),
            type: 'bulk',
            title: r.title,
            artist: r.artist,
            genre: r.genre,
            subgenre: r.subgenre,
            bpm: r.bpm,
            key: r.key,
            camelot: r.camelot
        }));
        addToHistory(user.username, historyItems);
      }
  };

  // Handle CSV Library Upload (Batch Processing)
  const handleLibraryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBulkAnalyzing(true);
    setBulkResults([]);
    setLibraryProgress({ processed: 0, total: 0 });

    const reader = new FileReader();
    reader.onload = async (event) => {
        const text = event.target?.result as string;
        if (!text) return;

        // Simple CSV parsing assuming standard DJ export format (Title, Artist, etc)
        // We just split by lines for now and let Gemini infer the headers or content.
        // To be more robust for 4000 songs, we'll batch 50 lines at a time.
        const allLines = text.split('\n').filter(line => line.trim() !== '');
        // Assume header is first line
        const header = allLines[0];
        const tracks = allLines.slice(1);
        
        const BATCH_SIZE = 50;
        const totalBatches = Math.ceil(tracks.length / BATCH_SIZE);
        let accumulatedResults: BulkSongEntry[] = [];

        setLibraryProgress({ processed: 0, total: tracks.length });

        try {
            for (let i = 0; i < totalBatches; i++) {
                const batch = tracks.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
                const batchText = [header, ...batch].join('\n');
                
                // Analyze this batch
                const results = await analyzeTracklistText(batchText);
                accumulatedResults = [...accumulatedResults, ...results];
                
                // Update state incrementally
                setBulkResults([...accumulatedResults]);
                setLibraryProgress({ 
                    processed: Math.min((i + 1) * BATCH_SIZE, tracks.length), 
                    total: tracks.length 
                });
            }

            // Final Save
            saveBulkToHistory(accumulatedResults);

        } catch (err) {
            console.error("Library analysis failed:", err);
            alert("Error processing library. Check console for details.");
        } finally {
            setIsBulkAnalyzing(false);
            setLibraryProgress(null);
        }
    };
    reader.readAsText(file);
  };

  // Download CSV
  const handleDownloadCSV = () => {
      if (bulkResults.length === 0) return;
      
      const headers = ['Title', 'Artist', 'Genre', 'Subgenre', 'BPM', 'Key', 'Camelot'];
      const rows = bulkResults.map(r => 
          `"${r.title}","${r.artist}","${r.genre}","${r.subgenre}","${r.bpm}","${r.key}","${r.camelot}"`
      );
      const csvContent = [headers.join(','), ...rows].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'sonic_scan_library_export.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // Handle Search Input
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowTrackList(true);
    try {
      const results = await searchTracks(searchQuery);
      setSearchResults(results);
    } catch (e) {
      console.error("Search failed", e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Track Selection
  const handleTrackSelect = async (track: Track) => {
    setPlayerState(PlayerState.IDLE);
    setAnalysisResult(null);
    setCurrentTrack(track);
    setIsLoadingAudio(true);
    
    try {
      const response = await fetch(track.previewUrl);
      if (!response.ok) throw new Error("Fetch failed");
      
      const blob = await response.blob();
      const file = new File([blob], `${track.title}.m4a`, { type: 'audio/mp4' });
      
      setAudioFile(file);
      setFileURL(URL.createObjectURL(file));
      setIsCorsSafe(true);
    } catch (error) {
      console.warn("Fallback to stream", error);
      setAudioFile(null); 
      setFileURL(track.previewUrl);
      setIsCorsSafe(false);
    } finally {
      setIsLoadingAudio(false);
      setShowTrackList(false);
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current || !fileURL) return;

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (audioRef.current.paused) {
      initAudio();
      try {
        await audioRef.current.play();
        setPlayerState(PlayerState.PLAYING);
      } catch (e) {
        console.error("Playback failed:", e);
      }
    } else {
      audioRef.current.pause();
      setPlayerState(PlayerState.PAUSED);
    }
  };

  const handleAnalyze = async () => {
    if (!audioFile) return;
    
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await analyzeAudio(audioFile, currentTrack || undefined);
      setAnalysisResult(result);

      // SAVE TO HISTORY
      if (user && currentTrack) {
         const newItem: HistoryItem = {
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now(),
            type: 'single',
            title: currentTrack.title,
            artist: currentTrack.artist,
            genre: result.genre,
            subgenre: result.subgenre,
            bpm: result.bpm,
            key: result.key,
            camelot: result.camelot
         };
         addToHistory(user.username, [newItem]);
      }

    } catch (error) {
      console.error(error);
      alert("Failed to analyze audio. Please check your API key or file format.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogin = (userData: User) => {
    saveSession(userData);
    setUser(userData);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setCurrentPage('scan');
  };

  // Render Content based on Active Tab and Page
  const renderContent = () => {
    if (currentPage === 'dashboard') {
        if (!user) {
            setCurrentPage('scan'); // Redirect if not logged in
            return null;
        }
        return <Dashboard user={user} />;
    }
    
    if (currentPage === 'history') {
        if (!user) {
            setCurrentPage('scan');
            return null;
        }
        return <AnalysisHistory />;
    }

    // Default: Scan Page
    if (activeTab === 'bulk' || activeTab === 'library') {
      return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-300">
           {/* Bulk Upload Section - Only show if no results */}
           {bulkResults.length === 0 && (
               <div className="bg-cyber-mid/40 border border-white/10 rounded-2xl p-6 sm:p-12 flex flex-col items-center justify-center text-center shadow-2xl animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-emerald-900/10 pointer-events-none"></div>
                    
                    <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-emerald-400 relative z-10">
                        {activeTab === 'library' ? 'Library Processing' : 'Batch Analysis'}
                    </h2>
                    <p className="text-gray-400 mb-8 max-w-lg relative z-10 leading-relaxed text-sm sm:text-base">
                        {activeTab === 'library' 
                           ? "Upload your DJ export (CSV/TXT) to update metadata for your entire collection."
                           : "Drag and drop a screenshot of your music library, Spotify playlist, or tracklist."
                        }
                    </p>
                    
                    <label htmlFor="bulk-dropzone" className="relative z-10 flex flex-col items-center justify-center w-full max-w-xl h-48 border-2 border-dashed border-purple-500/30 rounded-2xl cursor-pointer bg-black/40 hover:bg-purple-900/10 hover:border-purple-500/50 transition-all group">
                        {isBulkAnalyzing ? (
                            <div className="flex flex-col items-center gap-3 text-purple-400">
                                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                <div className="flex flex-col items-center">
                                    <span className="font-mono text-sm animate-pulse tracking-wider">
                                        {libraryProgress 
                                          ? `PROCESSING ${libraryProgress.processed} / ${libraryProgress.total}` 
                                          : 'ANALYZING...'
                                        }
                                    </span>
                                    {libraryProgress && (
                                        <div className="w-48 h-1 bg-gray-700 rounded-full mt-2 overflow-hidden">
                                            <div className="h-full bg-purple-500 transition-all duration-300" style={{width: `${(libraryProgress.processed / libraryProgress.total) * 100}%`}}></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-gray-400 group-hover:text-purple-300 transition-colors p-4">
                                <div className="p-4 rounded-full bg-white/5 group-hover:bg-purple-500/10 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                    </svg>
                                </div>
                                <p className="text-sm sm:text-base text-center">
                                    <span className="font-semibold text-purple-400">
                                        {activeTab === 'library' ? "Upload CSV / Text" : "Upload Screenshot"}
                                    </span> 
                                    <br/>or Paste (Ctrl+V)
                                </p>
                            </div>
                        )}
                        <input 
                            id="bulk-dropzone" 
                            type="file" 
                            className="hidden" 
                            accept={activeTab === 'library' ? ".csv,.txt" : "image/*"}
                            onChange={activeTab === 'library' ? handleLibraryUpload : handleBulkFileChange} 
                            disabled={isBulkAnalyzing} 
                        />
                    </label>
               </div>
           )}

           {/* Bulk Results Table */}
           <div className={`min-h-[400px] transition-all duration-500 ${bulkResults.length > 0 ? 'h-full' : ''}`}>
              <BulkResultList 
                  results={bulkResults} 
                  isLoading={isBulkAnalyzing} 
                  onReset={() => setBulkResults([])} 
              />
              {bulkResults.length > 0 && activeTab === 'library' && (
                  <div className="mt-4 flex justify-center">
                      <button 
                        onClick={handleDownloadCSV}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 px-8 rounded-full shadow-lg transition-all hover:scale-105 flex items-center gap-2"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Download Updated CSV
                      </button>
                  </div>
              )}
           </div>
        </div>
      );
    }

    // Search & Upload Views share the 2-column layout
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:h-[650px] animate-in fade-in duration-300">
        {/* LEFT COLUMN: Inputs + Player */}
        <div className="flex flex-col gap-6 h-full order-2 lg:order-1">
          
           {/* Input Section */}
           <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md">
              {activeTab === 'search' ? (
                 <form onSubmit={handleSearchSubmit} className="flex gap-2">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                        </div>
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Artist, Song, or Album..." 
                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 placeholder:text-gray-600"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isSearching}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                    >
                        {isSearching ? '...' : 'GO'}
                    </button>
                 </form>
              ) : (
                <div className="flex items-center justify-center w-full">
                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-lg cursor-pointer bg-black/20 hover:bg-white/5 hover:border-emerald-500/30 transition-all">
                        <div className="flex items-center gap-3 text-gray-400">
                            <svg className="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                            </svg>
                            <p className="text-sm"><span className="font-semibold text-emerald-500">Click to upload audio</span> or drag & drop</p>
                        </div>
                        <input id="dropzone-file" type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
                    </label>
                </div>
              )}
           </div>

          {/* Player & Visualizer Container */}
          <div className="relative flex-1 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl min-h-[300px]">
              
              {/* Audio Element Logic (Hidden) */}
              <audio 
                  ref={audioRef} 
                  src={fileURL || undefined} 
                  onEnded={() => setPlayerState(PlayerState.IDLE)}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  crossOrigin={isCorsSafe ? "anonymous" : undefined}
                  onError={(e) => console.error("Audio element error:", e.currentTarget.error)}
               />

              {/* Track List Overlay (for search) */}
              {showTrackList && (
                <TrackList 
                    tracks={searchResults} 
                    onSelect={handleTrackSelect} 
                    onClose={() => setShowTrackList(false)} 
                />
              )}

              {/* Empty State Overlay */}
              {!fileURL && !isLoadingAudio && !showTrackList && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 z-10 pointer-events-none gap-2">
                   <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 opacity-50">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                     </svg>
                   </div>
                  <span className="text-xs tracking-widest uppercase font-mono">No Audio Source</span>
                </div>
              )}
              
              {/* Loading Spinner */}
              {isLoadingAudio && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-40 backdrop-blur-sm">
                   <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                   <span className="text-emerald-400 text-xs font-mono">LOADING STREAM...</span>
                </div>
              )}

              {/* Visualizer Component */}
              <Visualizer analyser={analyserRef.current} playerState={playerState} />
              
              {/* Big Play Button Overlay */}
              {fileURL && playerState !== PlayerState.PLAYING && !isLoadingAudio && !showTrackList && (
                 <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <button 
                        onClick={togglePlay}
                        className="pointer-events-auto w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-emerald-500 hover:border-emerald-400 hover:scale-110 transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 ml-1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                        </svg>
                    </button>
                 </div>
              )}

              {/* Track Info Overlay (Bottom) */}
              {currentTrack && !showTrackList && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent z-10 flex items-center gap-4">
                    {currentTrack.coverUrl ? (
                        <img src={currentTrack.coverUrl} alt="cover" className="w-12 h-12 rounded shadow-lg" />
                    ) : (
                        <div className="w-12 h-12 rounded bg-gray-800 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                        </div>
                    )}
                    <div>
                        <div className="text-white font-bold leading-none mb-1 text-lg shadow-black drop-shadow-md line-clamp-1">{currentTrack.title}</div>
                        <div className="text-gray-300 text-xs uppercase tracking-wide flex items-center gap-1">
                          <span className="line-clamp-1">{currentTrack.artist}</span>
                          {currentTrack.primaryGenre && (
                            <>
                              <span className="mx-1 text-gray-600">•</span>
                              <span className="text-emerald-400 line-clamp-1">{currentTrack.primaryGenre}</span>
                            </>
                          )}
                        </div>
                    </div>
                </div>
              )}
          </div>

          {/* Controls Bar */}
          <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10 flex flex-col gap-3">
             <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
                <span className="w-10 text-right">{formatTime(currentTime)}</span>
                <input 
                  type="range" 
                  min="0" 
                  max={duration || 100} 
                  value={currentTime}
                  onChange={handleSeek}
                  disabled={!fileURL}
                  className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
                />
                <span className="w-10">{formatTime(duration)}</span>
             </div>

             <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4 w-full">
                     <button 
                      onClick={togglePlay}
                      disabled={!fileURL}
                      className="w-10 h-10 flex-shrink-0 rounded-full bg-emerald-500 flex items-center justify-center text-black hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-emerald-500/30"
                     >
                       {playerState === PlayerState.PLAYING ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                          </svg>
                       ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 ml-0.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                          </svg>
                       )}
                     </button>
                     
                     <div className="flex items-center gap-2 group flex-1">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 group-hover:text-white flex-shrink-0">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                          </svg>
                          <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.01"
                              value={volume}
                              onChange={(e) => setVolume(parseFloat(e.target.value))}
                              className="w-full max-w-[150px] h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white hover:accent-emerald-400"
                          />
                     </div>
                 </div>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Analysis */}
        <div className="flex flex-col h-full order-1 lg:order-2">
             <AnalysisCard 
                analysis={analysisResult} 
                isLoading={isAnalyzing} 
                onAnalyze={handleAnalyze} 
                hasAudio={!!audioFile} 
            />
            {!audioFile && fileURL && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-xs text-center">
                    Audio preview loaded via fallback streaming. Deep analysis is unavailable for this track due to browser security restrictions. Try uploading a local file.
                </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-emerald-900 text-white font-sans selection:bg-emerald-500 selection:text-white pb-20">
      <Header 
        user={user} 
        onOpenAuth={() => setShowAuthModal(true)} 
        onLogout={handleLogout} 
        onNavigate={setCurrentPage}
      />
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
      />

      {/* Navigation Bar - Only shown in Scan Page for now, or if we want persistent sub-nav. 
          Let's keep it conditional to the 'scan' page to avoid clutter on dashboard. */}
      {currentPage === 'scan' && (
        <div className="sticky top-16 z-40 bg-slate-900/50 backdrop-blur-md border-b border-white/5 animate-in fade-in slide-in-from-top-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <nav className="flex gap-4 sm:gap-8 overflow-x-auto custom-scrollbar no-scrollbar-on-mobile">
                    <button 
                        onClick={() => setActiveTab('search')}
                        className={`py-4 text-sm font-semibold uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap ${activeTab === 'search' ? 'text-emerald-400 border-emerald-400' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                    >
                        Web Search
                    </button>
                    <button 
                        onClick={() => setActiveTab('upload')}
                        className={`py-4 text-sm font-semibold uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap ${activeTab === 'upload' ? 'text-emerald-400 border-emerald-400' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                    >
                        File Upload
                    </button>
                    <button 
                        onClick={() => setActiveTab('bulk')}
                        className={`py-4 text-sm font-semibold uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap ${activeTab === 'bulk' ? 'text-purple-400 border-purple-400' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                    >
                        Bulk Scan
                    </button>
                    <button 
                        onClick={() => setActiveTab('library')}
                        className={`py-4 text-sm font-semibold uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap ${activeTab === 'library' ? 'text-blue-400 border-blue-400' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                    >
                        Library
                    </button>
                </nav>
            </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
         {renderContent()}
      </main>
    </div>
  );
};

export default App;
