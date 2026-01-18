
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
import { analyzeAudio, analyzeImageForBulkSongs, analyzeTracklistText, refineSingleTrack } from './services/geminiService';
import { searchTracks } from './services/itunesService';
import { getSession, saveSession, clearSession, addToHistory, getHistory } from './services/storageService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('scan');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [fileURL, setFileURL] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>(PlayerState.IDLE);
  const [analysisResult, setAnalysisResult] = useState<AudioAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCorsSafe, setIsCorsSafe] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [activeTab, setActiveTab] = useState<'search' | 'upload' | 'bulk' | 'library'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [showTrackList, setShowTrackList] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkSongEntry[]>([]);
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);
  const [dbSearch, setDbSearch] = useState('');

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    const session = getSession();
    if (session) setUser(session);
  }, []);

  // Global Paste Handler
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      // Check if we are on the scan page and specifically the bulk tab
      if (currentPage !== 'scan' || activeTab !== 'bulk') return;

      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      const items = clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleBulkImageUpload(blob);
            event.preventDefault();
            return;
          }
        } else if (items[i].type === "text/plain") {
          items[i].getAsString((text) => {
            // Only update state if not currently typing in a specific sensitive area
            const activeTag = document.activeElement?.tagName;
            if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
              setPastedText(text);
              // Small visual hint for user
              console.log("SonicScan: Text captured for neural enrichment.");
            }
          });
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [currentPage, activeTab]);

  useEffect(() => {
    return () => { if (fileURL && fileURL.startsWith('blob:')) URL.revokeObjectURL(fileURL); };
  }, [fileURL]);

  // Handle feedback for single track scan
  const handleSingleFeedback = (type: 'up' | 'down' | 'refine_more') => {
    if (!analysisResult) return;
    
    // Update local state for UI
    setAnalysisResult({ ...analysisResult, feedback: type });
    
    // If negative or narrow, trigger a contextual re-scan
    if (type === 'down' || type === 'refine_more') {
      handleAnalyze(type);
    }
  };

  // Handle feedback for individual tracks in batch scan
  const handleBulkFeedback = async (target: BulkSongEntry, type: 'up' | 'down' | 'refine_more') => {
    // If upvote, just mark it
    if (type === 'up') {
      setBulkResults(prev => prev.map(t => t.id === target.id ? { ...t, feedback: 'up' } : t));
      return;
    }

    // Otherwise, trigger refinement
    setBulkResults(prev => prev.map(t => t.id === target.id ? { ...t, feedback: type, isRefining: true } : t));
    
    try {
      const refined = await refineSingleTrack(target, type);
      setBulkResults(prev => prev.map(t => t.id === target.id ? { ...refined, feedback: undefined, isRefining: false } : t));
      
      if (user) {
        addToHistory(user.username, [{
          id: crypto.randomUUID(), 
          date: new Date().toISOString().split('T')[0], 
          timestamp: Date.now(), 
          type: 'bulk', 
          title: refined.title, 
          artist: refined.artist, 
          genre: refined.genre, 
          subgenre: refined.subgenre, 
          bpm: refined.bpm, 
          key: refined.key, 
          camelot: refined.camelot,
          feedback: type
        }]);
      }
    } catch (e) {
      alert("Neural refinement failed. Network signal weak.");
      setBulkResults(prev => prev.map(t => t.id === target.id ? { ...t, isRefining: false } : t));
    }
  };

  const processBulkResults = (results: BulkSongEntry[]) => {
    setBulkResults(results);
    if (user) {
      const historyItems: HistoryItem[] = results.map(r => ({
          id: r.id, date: new Date().toISOString().split('T')[0], timestamp: Date.now(), type: 'bulk', title: r.title, artist: r.artist, genre: r.genre, subgenre: r.subgenre, bpm: r.bpm, key: r.key, camelot: r.camelot
      }));
      addToHistory(user.username, historyItems);
    }
  };

  const handleBulkImageUpload = async (file: File) => {
    setIsBulkAnalyzing(true);
    setBulkResults([]);
    try {
      const results = await analyzeImageForBulkSongs(file);
      processBulkResults(results);
    } catch (e) { alert("Visual scan failure."); } finally { setIsBulkAnalyzing(false); }
  };

  const handleTextBulkAnalyze = async () => {
    if (!pastedText.trim()) return;
    setIsBulkAnalyzing(true);
    setBulkResults([]);
    try {
      const results = await analyzeTracklistText(pastedText);
      processBulkResults(results);
      setPastedText('');
    } catch (e) { alert("Terminal enrichment failure."); } finally { setIsBulkAnalyzing(false); }
  };

  const handleAnalyze = async (feedbackType?: 'down' | 'refine_more') => {
    if (!audioFile) return;

    setIsAnalyzing(true);
    try {
      // Pass the previous result if this is a refinement scan
      const result = await analyzeAudio(
        audioFile, 
        currentTrack || undefined, 
        feedbackType,
        analysisResult || undefined
      );
      setAnalysisResult(result);

      if (user) {
        addToHistory(user.username, [{
          id: crypto.randomUUID(),
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now(),
          type: 'single',
          title: currentTrack?.title || audioFile.name,
          artist: currentTrack?.artist || 'Unknown',
          genre: result.genre,
          subgenre: result.subgenre,
          bpm: result.bpm,
          key: result.key,
          camelot: result.camelot,
          feedback: feedbackType
        }]);
      }
    } catch (error) {
      console.error("Neural analysis crash:", error);
      alert("Neural engine failed. Re-syncing...");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderContent = () => {
    if (currentPage === 'dashboard') return user ? <Dashboard user={user} /> : null;
    if (currentPage === 'history') return user ? <AnalysisHistory /> : null;

    if (activeTab === 'library') {
      const history = user ? getHistory(user.username) : [];
      const filtered = history.filter(h => 
        h.title.toLowerCase().includes(dbSearch.toLowerCase()) || 
        h.artist.toLowerCase().includes(dbSearch.toLowerCase()) ||
        h.subgenre.toLowerCase().includes(dbSearch.toLowerCase()) ||
        h.genre.toLowerCase().includes(dbSearch.toLowerCase())
      );

      return (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="bg-cyber-mid/60 border border-white/10 rounded-2xl p-6 min-h-[500px]">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                 <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                    <span className="text-cyber-glow">Neural</span> Database
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-white/5 text-gray-500 rounded border border-white/5 tracking-widest">ENCRYPTED_ARCHIVE</span>
                 </h2>
                 <div className="relative w-full md:w-96">
                    <input 
                      type="text" 
                      value={dbSearch}
                      onChange={(e) => setDbSearch(e.target.value)}
                      placeholder="Filter by subgenre, artist, or key..." 
                      className="w-full bg-black/40 border border-white/10 rounded-full px-6 py-2.5 text-sm focus:border-emerald-500/50 outline-none pl-12 transition-all placeholder:text-gray-600"
                    />
                    <svg className="w-5 h-5 absolute left-4 top-2.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 </div>
              </div>

              {!user ? (
                 <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl bg-black/20">
                    <p className="text-gray-500 mb-4 font-mono text-xs uppercase tracking-widest">Authentication Required for Archive Access</p>
                    <button onClick={() => setShowAuthModal(true)} className="bg-emerald-500 text-black text-xs font-bold px-8 py-3 rounded-full hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95">AUTHORIZE TERMINAL</button>
                 </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-24 text-gray-600 font-mono text-sm tracking-widest animate-pulse">
                  {dbSearch ? 'NO MATCHING FREQUENCIES FOUND' : 'NEURAL ARCHIVE EMPTY'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((item) => (
                        <div key={item.id} className="bg-white/5 border border-white/10 p-5 rounded-xl hover:bg-white/10 transition-all hover:border-emerald-500/30 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-500/10 to-transparent -mr-8 -mt-8 rounded-full blur-xl group-hover:from-emerald-500/20 transition-all"></div>
                            <div className="text-[9px] text-gray-500 font-mono mb-3 flex justify-between uppercase tracking-widest">
                                <span>{item.date}</span>
                                <span className="text-emerald-500 font-bold">{item.camelot}</span>
                            </div>
                            <div className="font-bold text-white mb-1 truncate text-sm">{item.title}</div>
                            <div className="text-[11px] text-gray-400 font-medium mb-4 truncate italic">{item.artist}</div>
                            <div className="flex flex-col gap-2">
                                <span className="text-[9px] text-emerald-500 font-mono font-bold uppercase tracking-widest">{item.genre}</span>
                                <span className="text-xs text-white/80 font-semibold truncate bg-white/5 px-2 py-1 rounded border border-white/5">{item.subgenre}</span>
                            </div>
                            <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-gray-500">
                               <span>{item.bpm} BPM</span>
                               <span className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400 cursor-pointer">LOAD_DNA</span>
                            </div>
                        </div>
                    ))}
                </div>
              )}
           </div>
        </div>
      );
    }

    if (activeTab === 'bulk') {
      return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-300">
           {bulkResults.length === 0 && (
               <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-cyber-mid/40 border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center relative group">
                            <h3 className="text-lg font-bold mb-4 text-emerald-400 font-mono uppercase tracking-widest">Visual Scan</h3>
                            <label htmlFor="bulk-dropzone" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-emerald-500/20 rounded-2xl cursor-pointer bg-black/40 hover:bg-emerald-900/10 transition-all group">
                                {isBulkAnalyzing ? (
                                    <div className="flex flex-col items-center gap-2 text-emerald-400">
                                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="font-mono text-xs uppercase animate-pulse">Extracting Data...</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-emerald-400 transition-colors">
                                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        <p className="text-sm">Paste (Ctrl+V) or Upload Screenshot</p>
                                    </div>
                                )}
                                <input id="bulk-dropzone" type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) handleBulkImageUpload(e.target.files[0])}} disabled={isBulkAnalyzing} />
                            </label>
                        </div>
                        <div className="bg-cyber-mid/40 border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col h-full">
                            <h3 className="text-lg font-bold mb-4 text-purple-400 font-mono uppercase tracking-widest">Neural Paste Terminal</h3>
                            <div className="flex-1 flex flex-col gap-3">
                                <textarea 
                                    value={pastedText}
                                    onChange={(e) => setPastedText(e.target.value)}
                                    placeholder="Paste tracklist text here... (Artist - Track)"
                                    className="flex-1 min-h-[192px] bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-mono text-gray-300 focus:border-purple-500 outline-none resize-none scrollbar-hide transition-all"
                                />
                                <button onClick={handleTextBulkAnalyze} disabled={!pastedText.trim() || isBulkAnalyzing} className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${pastedText.trim() && !isBulkAnalyzing ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}>
                                    {isBulkAnalyzing ? 'ANALYZING...' : 'PROCESS TERMINAL INPUT'}
                                </button>
                            </div>
                        </div>
                    </div>
               </div>
           )}
           <BulkResultList 
              results={bulkResults} 
              isLoading={isBulkAnalyzing} 
              onReset={() => setBulkResults([])} 
              onFeedbackTrack={handleBulkFeedback} 
           />
        </div>
      );
    }

    // Default Scanner View (search/upload)
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:h-[600px] animate-in fade-in duration-300">
        <div className="flex flex-col gap-6 h-full order-2 lg:order-1">
           <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md">
              {activeTab === 'search' ? (
                 <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!searchQuery.trim()) return;
                    setIsSearching(true);
                    setShowTrackList(true);
                    try { const results = await searchTracks(searchQuery); setSearchResults(results); } 
                    finally { setIsSearching(false); }
                 }} className="flex gap-2">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search artist or song..." className="flex-1 bg-black/20 border border-white/10 rounded-lg py-2 px-4 text-sm focus:border-emerald-500/50 outline-none" />
                    <button type="submit" disabled={isSearching} className="bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-500/20">GO</button>
                 </form>
              ) : (
                <div className="flex items-center justify-center w-full">
                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-lg cursor-pointer bg-black/20 hover:border-emerald-500/30 transition-all">
                        <span className="text-sm text-gray-500">Click to <span className="text-emerald-500">upload audio</span></span>
                        <input id="dropzone-file" type="file" className="hidden" accept="audio/*" onChange={(e) => {
                             if (e.target.files?.[0]) {
                                const file = e.target.files[0];
                                setAudioFile(file);
                                setFileURL(URL.createObjectURL(file));
                                setAnalysisResult(null);
                                setPlayerState(PlayerState.IDLE);
                                setIsCorsSafe(true);
                                setCurrentTrack({ id: 0, title: file.name.replace(/\.[^/.]+$/, ""), artist: 'Local Upload', album: 'Local Library', coverUrl: '', previewUrl: '' });
                                setShowTrackList(false);
                             }
                        }} />
                    </label>
                </div>
              )}
           </div>
          <div className="relative flex-1 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl min-h-[300px]">
              <audio 
                ref={audioRef} 
                src={fileURL || undefined} 
                onEnded={() => setPlayerState(PlayerState.IDLE)} 
                onTimeUpdate={() => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); }} 
                onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }} 
                crossOrigin={isCorsSafe ? "anonymous" : undefined} 
              />
              {showTrackList && <TrackList tracks={searchResults} onSelect={async (track) => {
                  setPlayerState(PlayerState.IDLE);
                  setAnalysisResult(null);
                  setCurrentTrack(track);
                  setIsLoadingAudio(true);
                  try {
                    const response = await fetch(track.previewUrl);
                    const blob = await response.blob();
                    const file = new File([blob], `${track.title}.m4a`, { type: 'audio/mp4' });
                    setAudioFile(file);
                    setFileURL(URL.createObjectURL(file));
                    setIsCorsSafe(true);
                  } catch (error) { setAudioFile(null); setFileURL(track.previewUrl); setIsCorsSafe(false); } 
                  finally { setIsLoadingAudio(false); setShowTrackList(false); }
              }} onClose={() => setShowTrackList(false)} />}
              <Visualizer analyser={analyserRef.current} playerState={playerState} />
              {fileURL && playerState !== PlayerState.PLAYING && !isLoadingAudio && !showTrackList && (
                 <div className="absolute inset-0 flex items-center justify-center z-20">
                    <button onClick={async () => {
                        if (!audioRef.current || !fileURL) return;
                        if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();
                        if (audioRef.current.paused) {
                            if (!audioContextRef.current) {
                                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                                audioContextRef.current = new AudioContextClass();
                            }
                            const ctx = audioContextRef.current;
                            if (!analyserRef.current) {
                                analyserRef.current = ctx.createAnalyser();
                                analyserRef.current.fftSize = 256;
                            }
                            if (!sourceRef.current) {
                                try {
                                    sourceRef.current = ctx.createMediaElementSource(audioRef.current);
                                    sourceRef.current.connect(analyserRef.current);
                                    analyserRef.current.connect(ctx.destination);
                                } catch (e) { console.warn("Visualizer CORS issue:", e); }
                            }
                            await audioRef.current.play();
                            setPlayerState(PlayerState.PLAYING);
                        } else {
                            audioRef.current.pause();
                            setPlayerState(PlayerState.PAUSED);
                        }
                    }} className="w-20 h-20 rounded-full bg-emerald-500/10 backdrop-blur-md border border-emerald-500/50 flex items-center justify-center text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all">
                        <svg className="w-10 h-10 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4.5 3.5v13L16 10 4.5 3.5z"/></svg>
                    </button>
                 </div>
              )}
              {currentTrack && !showTrackList && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent flex items-center gap-4">
                    {currentTrack.coverUrl && <img src={currentTrack.coverUrl} className="w-12 h-12 rounded" alt="cover" />}
                    <div>
                        <div className="text-white font-bold text-base leading-tight truncate">{currentTrack.title}</div>
                        <div className="text-emerald-400 text-[10px] uppercase font-mono tracking-widest">{currentTrack.artist}</div>
                    </div>
                </div>
              )}
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
             <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500 mb-2">
                <span>{Math.floor(currentTime/60)}:{(Math.floor(currentTime%60)).toString().padStart(2, '0')}</span>
                <input type="range" min="0" max={duration || 100} value={currentTime} onChange={(e) => { 
                    const time = parseFloat(e.target.value);
                    if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time); }
                }} disabled={!fileURL} className="flex-1 h-1 bg-gray-700 rounded appearance-none cursor-pointer accent-emerald-500" />
                <span>{Math.floor(duration/60)}:{(Math.floor(duration%60)).toString().padStart(2, '0')}</span>
             </div>
          </div>
        </div>
        <div className="flex flex-col h-full order-1 lg:order-2">
             <AnalysisCard 
                analysis={analysisResult} 
                isLoading={isAnalyzing} 
                onAnalyze={() => handleAnalyze()} 
                onFeedback={handleSingleFeedback}
                hasAudio={!!audioFile} 
             />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-cyber-dark text-white font-sans">
      <Header user={user} onOpenAuth={() => setShowAuthModal(true)} onLogout={() => { clearSession(); setUser(null); setCurrentPage('scan'); }} onNavigate={setCurrentPage} />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onLogin={(u) => { saveSession(u); setUser(u); setShowAuthModal(false); }} />
      {currentPage === 'scan' && (
        <div className="sticky top-16 z-40 bg-cyber-dark/80 backdrop-blur-md border-b border-white/5 overflow-x-auto no-scrollbar">
            <div className="max-w-7xl mx-auto px-4 flex gap-6">
                {[
                  { id: 'search', label: 'Web Interface' },
                  { id: 'upload', label: 'Direct Input' },
                  { id: 'bulk', label: 'Batch Scan' },
                  { id: 'library', label: 'Neural Database' }
                ].map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`py-4 text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id ? 'text-emerald-400 border-emerald-400' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 py-8">{renderContent()}</main>
    </div>
  );
};

export default App;
