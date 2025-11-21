
import React, { useState } from 'react';
import { User } from '../types';
import { authenticateUser, saveUser } from '../services/storageService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay for realism
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      if (isLogin) {
        const user = authenticateUser(email, password);
        if (user) {
          onLogin(user);
          onClose();
        } else {
          setError('Invalid credentials. Access denied.');
        }
      } else {
        const newUser: User = {
          username,
          email,
          password, // In a real app, this would be hashed server-side
          memberSince: new Date().toISOString().split('T')[0]
        };
        
        try {
          saveUser(newUser);
          // Auto login after signup
          onLogin(newUser);
          onClose();
        } catch (err: any) {
          setError(err.message || "Failed to create account");
        }
      }
    } catch (err) {
      setError('System error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-cyber-mid border border-emerald-500/30 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.1)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-cyber-dark to-cyber-mid">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-white tracking-wider">
              {isLogin ? 'IDENTIFY YOURSELF' : 'NEW OPERATOR'}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-emerald-500 font-mono uppercase tracking-widest">Secure Terminal Access v2.5.0</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          {!isLogin && (
             <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase">Codename</label>
                <input 
                  type="text" 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-mono"
                  placeholder="e.g. NEON_RIDER"
                />
             </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-mono"
              placeholder="user@sonicscan.ai"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-mono"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-bold py-3 rounded-lg shadow-lg hover:shadow-emerald-500/20 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
               <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                  AUTHENTICATING...
               </span>
            ) : (
               isLogin ? 'ACCESS MAINFRAME' : 'INITIALIZE ACCOUNT'
            )}
          </button>

          <div className="text-center">
             <button 
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-sm text-gray-500 hover:text-emerald-400 transition-colors"
             >
               {isLogin ? "Don't have an account? Create one." : "Already have an account? Sign In."}
             </button>
          </div>

        </form>
      </div>
    </div>
  );
};
