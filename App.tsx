
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

  useEffect(() => {
    return () => { if (fileURL && fileURL.startsWith('blob:')) URL.revokeObjectURL(fileURL); };
  }, [fileURL]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (activeTab !== 'bulk' || isBulkAnalyzing) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleBulkImageUpload(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste as any);
    return () => window.removeEventListener('paste', handlePaste as any);
  }, [activeTab, isBulkAnalyzing]);

  const handleSingleFeedback = (type: 'up' | 'down' | 'refine_more') => {
    if (!analysisResult) return;
    setAnalysisResult({ ...analysisResult, feedback: type });
    if (type === 'down' || type === 'refine_more') {
      handleAnalyze(type);
    }
  };

  const handleBulkFeedback = async (target: BulkSongEntry, type: 'up' | 'down' | 'refine_more') => {
    if (type === 'up') {
      setBulkResults(prev => prev.map(t => t.id === target.id ? { ...t, feedback: 'up' } : t));
      return;
    }
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
          isExplicit: refined.isExplicit,
          missingArtistInSource: target.missingArtistInSource,
          feedback: type
        }]);
      }
    } catch (e) {
      alert("Neural refinement failed.");
      setBulkResults(prev => prev.map(t => t.id === target.id ? { ...t, isRefining: false } : t));
    }
  };

  const handleBulkImageUpload = async (file: File) => {
    setIsBulkAnalyzing(true);
    setBulkResults([]);
    try {
      const results = await analyzeImageForBulkSongs(file);
      setBulkResults(results);
    } catch (e) { alert("Failed to scan visual data."); } finally { setIsBulkAnalyzing(false); }
  };

  const handleTextBulkAnalyze = async () => {
    if (!pastedText.trim()) return;
    setIsBulkAnalyzing(true);
    setBulkResults([]);
    try {
      const results = await analyzeTracklistText(pastedText);
      setBulkResults(results);
      setPastedText('');
    } catch (e) { alert("Neural terminal error."); } finally { setIsBulkAnalyzing(false); }
  };

  const handleAnalyze = async (feedbackType?: 'down' | 'refine_more', fileToUse?: File) => {
    const targetFile = fileToUse || audioFile;
    if (!targetFile) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeAudio(
        targetFile, 
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
          title: currentTrack?.title || targetFile.name,
          artist: result.artists || currentTrack?.artist || 'Unknown',
          genre: result.genre,
          subgenre: result.subgenre,
          bpm: result.bpm,
          key: result.key,
          camelot: result.camelot,
          isExplicit: result.isExplicit,
          feedback: feedbackType
        }]);
      }
    } catch (error) {
      console.error("Analysis failed:", error);
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
                 </h2>
                 <div className="relative w-full md:w-96">
                    <input 
                      type="text" 
                      value={dbSearch}
                      onChange={(e) => setDbSearch(e.target.value)}
                      placeholder="Filter library..." 
                      className="w-full bg-black/40 border border-white/10 rounded-full px-6 py-2.5 text-sm focus:border-emerald-500/50 outline-none"
                    />
                 </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtered.map((item) => (
                      <div key={item.id} className="bg-white/5 border border-white/10 p-5 rounded-xl hover:bg-white/10 transition-all">
                          <div className="text-[9px] text-gray-500 font-mono mb-3 flex justify-between">
                              <span>{item.date}</span>
                              <span className="text-emerald-500 font-bold">{item.camelot}</span>
                          </div>
                          <div className="font-bold text-white mb-1 truncate text-sm">{item.title}</div>
                          <div className="text-[11px] text-gray-400 font-medium mb-4 truncate italic">{item.artist}</div>
                          <div className="text-[9px] text-emerald-500 font-mono font-bold uppercase mb-1">{item.genre}</div>
                          <div className="text-xs text-white/80 font-semibold truncate bg-white/5 px-2 py-1 rounded">{item.subgenre}</div>
                      </div>
                  ))}
              </div>
           </div>
        </div>
      );
    }

    if (activeTab === 'bulk') {
      return (
        <div className="flex flex-col gap-8">
           {bulkResults.length === 0 && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-cyber-mid/40 border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                        <h3 className="text-lg font-bold mb-4 text-emerald-400 font-mono uppercase">Visual Scan</h3>
                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-emerald-500/20 rounded-2xl cursor-pointer bg-black/40 hover:bg-emerald-900/10 transition-all">
                            <span className="text-sm text-gray-500">Upload Screenshot or Ctrl+V</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) handleBulkImageUpload(e.target.files[0])}} />
                        </label>
                    </div>
                    <div className="bg-cyber-mid/40 border border-white/10 rounded-2xl p-8 flex flex-col">
                        <h3 className="text-lg font-bold mb-4 text-purple-400 font-mono uppercase">Neural Paste Terminal</h3>
                        <textarea 
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            placeholder="Artist - Track..."
                            className="flex-1 min-h-[192px] bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-mono text-gray-300 focus:border-purple-500 outline-none resize-none"
                        />
                        <button onClick={handleTextBulkAnalyze} className="mt-4 w-full py-3 bg-purple-600 rounded-xl font-bold text-xs uppercase hover:bg-purple-500 transition-all">PROCESS INPUT</button>
                    </div>
               </div>
           )}
           <BulkResultList results={bulkResults} isLoading={isBulkAnalyzing} onReset={() => setBulkResults([])} onFeedbackTrack={handleBulkFeedback} />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 flex flex-col gap-6 h-full order-1">
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
                    <button type="submit" disabled={isSearching} className="bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold px-6 py-2 rounded-lg transition-colors">GO</button>
                 </form>
              ) : (
                <div className="flex items-center justify-center w-full">
                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-lg cursor-pointer bg-black/20 hover:border-emerald-500/30 transition-all">
                        <span className="text-sm text-gray-500">Upload audio file</span>
                        <input id="dropzone-file" type="file" className="hidden" accept="audio/*" onChange={(e) => {
                             if (e.target.files?.[0]) {
                                const file = e.target.files[0];
                                setAudioFile(file);
                                setFileURL(URL.createObjectURL(file));
                                setAnalysisResult(null);
                                setPlayerState(PlayerState.IDLE);
                                setCurrentTrack({ id: 0, title: file.name.replace(/\.[^/.]+$/, ""), artist: 'Local Upload', album: 'Local Library', coverUrl: '', previewUrl: '' });
                                setShowTrackList(false);
                             }
                        }} />
                    </label>
                </div>
              )}
           </div>
          <div className="relative h-[400px] bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
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
                    handleAnalyze(undefined, file);
                  } catch (error) { setFileURL(track.previewUrl); setIsCorsSafe(false); } 
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
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent flex items-center gap-6">
                    {currentTrack.coverUrl && <img src={currentTrack.coverUrl} className="w-16 h-16 rounded shadow-2xl" alt="cover" />}
                    <div>
                        <div className="text-white font-bold text-xl leading-tight truncate">{currentTrack.title}</div>
                        <div className="text-emerald-400 text-xs font-mono uppercase tracking-widest">{currentTrack.artist}</div>
                    </div>
                </div>
              )}
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center gap-3">
             <span className="text-[10px] font-mono text-gray-500">{Math.floor(currentTime/60)}:{(Math.floor(currentTime%60)).toString().padStart(2, '0')}</span>
             <input type="range" min="0" max={duration || 100} value={currentTime} onChange={(e) => { 
                 const time = parseFloat(e.target.value);
                 if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time); }
             }} disabled={!fileURL} className="flex-1 h-1 bg-gray-700 rounded appearance-none cursor-pointer accent-emerald-500" />
             <span className="text-[10px] font-mono text-gray-500">{Math.floor(duration/60)}:{(Math.floor(duration%60)).toString().padStart(2, '0')}</span>
          </div>
        </div>
        <div className="lg:col-span-2 flex flex-col h-full order-2">
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
    <div className="min-h-screen bg-cyber-dark text-white font-sans pb-12">
      <Header user={user} onOpenAuth={() => setShowAuthModal(true)} onLogout={() => { clearSession(); setUser(null); setCurrentPage('scan'); }} onNavigate={setCurrentPage} />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onLogin={(u) => { saveSession(u); setUser(u); setShowAuthModal(false); }} />
      
      {currentPage === 'scan' && (
        <div className="sticky top-16 z-40 bg-cyber-dark/80 backdrop-blur-md border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 flex gap-8">
                {[
                  { id: 'search', label: 'Web Interface' },
                  { id: 'upload', label: 'Direct Input' },
                  { id: 'bulk', label: 'Batch Scan' },
                  { id: 'library', label: 'Neural Database' }
                ].map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`py-4 text-[11px] font-bold uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab === tab.id ? 'text-emerald-400 border-emerald-400' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
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
