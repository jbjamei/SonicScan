
import { User, HistoryItem, DashboardStats } from "../types";

const USERS_KEY = 'sonic_users';
const SESSION_KEY = 'sonic_session';
const HISTORY_PREFIX = 'sonic_history_';

// --- User Management ---

export const getUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  // Check if email or username exists
  if (users.some(u => u.email === user.email || u.username === user.username)) {
    throw new Error("User already exists");
  }
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const authenticateUser = (emailOrUser: string, password: string): User | null => {
  const users = getUsers();
  const user = users.find(u => 
    (u.email === emailOrUser || u.username === emailOrUser) && u.password === password
  );
  return user || null;
};

// --- Session Management ---

export const saveSession = (user: User): void => {
  // Don't store password in session
  const { password, ...safeUser } = user;
  localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
};

export const getSession = (): User | null => {
  const stored = localStorage.getItem(SESSION_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const clearSession = (): void => {
  localStorage.removeItem(SESSION_KEY);
};

// --- History Management ---

export const getHistory = (username: string): HistoryItem[] => {
  const stored = localStorage.getItem(HISTORY_PREFIX + username);
  return stored ? JSON.parse(stored) : [];
};

export const addToHistory = (username: string, items: HistoryItem[]): void => {
  const currentHistory = getHistory(username);
  // Add new items to the beginning
  const updatedHistory = [...items, ...currentHistory];
  localStorage.setItem(HISTORY_PREFIX + username, JSON.stringify(updatedHistory));
};

// --- Dashboard Stats Calculation ---

export const getDashboardStats = (username: string): DashboardStats => {
  const history = getHistory(username);
  const totalScans = history.length;

  if (totalScans === 0) {
    return {
      totalScans: 0,
      topGenre: 'N/A',
      topGenreCount: 0,
      topGenrePercent: 0,
      scansThisWeek: 0,
      genreDistribution: []
    };
  }

  // Scans this week
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const scansThisWeek = history.filter(h => h.timestamp > oneWeekAgo).length;

  // Genre grouping
  const genreCounts: Record<string, number> = {};
  history.forEach(h => {
    const g = h.genre || 'Unknown';
    genreCounts[g] = (genreCounts[g] || 0) + 1;
  });

  // Sort genres
  const sortedGenres = Object.entries(genreCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([genre, count]) => ({
      genre,
      count,
      percentage: Math.round((count / totalScans) * 100)
    }));

  const topGenre = sortedGenres[0];

  return {
    totalScans,
    topGenre: topGenre.genre,
    topGenreCount: topGenre.count,
    topGenrePercent: topGenre.percentage,
    scansThisWeek,
    genreDistribution: sortedGenres.slice(0, 4) // Top 4
  };
};
