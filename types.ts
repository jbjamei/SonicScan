
export interface AudioAnalysis {
  genre: string;
  subgenre: string;
  confidence: number;
  breakdown: string;
  instruments: string[];
  mood: string;
  bpm: string;
  key: string;
  camelot: string;
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
  title: string;
  artist: string;
  genre: string;
  subgenre: string;
  bpm: string;
  key: string;
  camelot: string;
}

export interface User {
  username: string;
  email: string;
  password?: string; // Only used for matching, stored insecurely in localStorage for prototype
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
