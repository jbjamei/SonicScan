
export interface AudioAnalysis {
  genre: string;
  subgenre: string;
  artists: string; // Analysis-verified artists (multi-artist support)
  confidence: number;
  breakdown: string;
  instruments: string[];
  mood: string;
  bpm: string;
  key: string;
  camelot: string;
  rhythmType: 'Straight 4/4' | 'Syncopated / Broken' | 'Half-time' | 'Complex';
  sonicMarkers: string[];
  isExplicit?: boolean;
  profanityTimestamps?: string[];
  feedback?: 'up' | 'down' | 'refine_more'; 
}

export enum PlayerState {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
}

export interface VisualizationData {
  bufferLength: number;
  dataArray: Uint8Array;
}

export interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  previewUrl: string;
  primaryGenre?: string;
}

export interface BulkSongEntry {
  id: string;
  title: string;
  artist: string;
  genre: string;
  subgenre: string;
  bpm: string;
  key: string;
  camelot: string;
  isExplicit?: boolean;
  missingArtistInSource?: boolean;
  isRefining?: boolean;
  feedback?: 'up' | 'down' | 'refine_more';
}

export interface User {
  username: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  memberSince: string;
}

export interface HistoryItem {
  id: string;
  date: string;
  timestamp: number;
  type: 'single' | 'bulk';
  title: string;
  artist: string;
  genre: string;
  subgenre: string;
  bpm: string;
  key: string;
  camelot: string;
  isExplicit?: boolean;
  missingArtistInSource?: boolean;
  feedback?: 'up' | 'down' | 'refine_more';
}

export interface DashboardStats {
  totalScans: number;
  topGenre: string;
  topGenreCount: number;
  topGenrePercent: number;
  scansThisWeek: number;
  genreDistribution: { genre: string; count: number; percentage: number }[];
}

export type Page = 'scan' | 'dashboard' | 'history';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
