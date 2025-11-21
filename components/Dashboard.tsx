
import React, { useEffect, useState } from 'react';
import { User, DashboardStats } from '../types';
import { getDashboardStats } from '../services/storageService';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    // Load real stats
    const data = getDashboardStats(user.username);
    setStats(data);
  }, [user]);

  if (!stats) return <div className="p-8 text-center text-gray-500">Loading mainframe statistics...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900/40 to-blue-900/40 border border-white/10 p-8">
        <div className="absolute top-0 right-0 p-4 opacity-10">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-64 h-64">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
           </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back, <span className="text-emerald-400">{user.username}</span></h1>
        <p className="text-gray-400 max-w-xl">
            {stats.totalScans === 0 
                ? "Your analysis history is empty. Start scanning tracks to build your sonic profile."
                : `Your sonic signature indicates a strong preference for ${stats.topGenre}. Ready to analyze more frequencies?`
            }
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
           <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div className="text-sm text-gray-400 uppercase font-bold">Total Scans</div>
           </div>
           <div className="text-3xl font-bold text-white">{stats.totalScans}</div>
           <div className="text-xs text-gray-500 mt-1">
             {stats.scansThisWeek > 0 ? `+${stats.scansThisWeek} this week` : 'No scans this week'}
           </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
           <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div className="text-sm text-gray-400 uppercase font-bold">Activity</div>
           </div>
           <div className="text-3xl font-bold text-white">{stats.scansThisWeek}</div>
           <div className="text-xs text-gray-500 mt-1">Scans in last 7 days</div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
           <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                </svg>
              </div>
              <div className="text-sm text-gray-400 uppercase font-bold">Dominant Genre</div>
           </div>
           <div className="text-3xl font-bold text-white truncate" title={stats.topGenre}>{stats.topGenre}</div>
           <div className="text-xs text-gray-500 mt-1">{stats.topGenrePercent}% of analyzed tracks</div>
        </div>
      </div>

      {/* Genre Distribution Chart */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
         <h3 className="text-lg font-bold text-white mb-6">Sonic Distribution</h3>
         {stats.totalScans === 0 ? (
            <div className="text-gray-500 text-sm text-center py-8 italic">No data available yet.</div>
         ) : (
             <div className="space-y-4">
                {stats.genreDistribution.map((item, i) => {
                    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500'];
                    const color = colors[i % colors.length];
                    return (
                        <div key={item.genre}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-300">{item.genre}</span>
                                <span className="text-gray-400">{item.percentage}% ({item.count})</span>
                            </div>
                            <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                                <div className={`h-full ${color}`} style={{ width: `${item.percentage}%` }}></div>
                            </div>
                        </div>
                    );
                })}
             </div>
         )}
      </div>
    </div>
  );
};
