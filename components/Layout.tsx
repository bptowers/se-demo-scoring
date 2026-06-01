import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Mic2, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getManagerConfig } from '../config/managerConfig';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const isManager = !!getManagerConfig(user?.email);

  // If no user is logged in (e.g., on Login page if Layout is wrapped around it, 
  // though usually Login has its own layout), we might want to return just children 
  // or a simplified header. However, our App structure renders Login outside layout usually, 
  // or we conditionally render header.
  
  // For this app, if user is null, we assume we are in a public state or transitioning.
  // We will hide the nav if not logged in.
  if (!user) {
    return <div className="min-h-screen bg-slate-50 font-sans text-slate-800">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-slate-800">
      {/* Top Navigation */}
      <header className="bg-brand-navy text-white sticky top-0 z-50 shadow-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-2xl font-black tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-yellow rounded-lg flex items-center justify-center text-brand-navy shadow-lg shadow-brand-yellow/20">
                <Mic2 size={20} />
              </div>
              SIMPRO <span className="font-light opacity-80">SE Demo Scoring</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-6">
             <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-300">
               <Link to="/" className="hover:text-brand-yellow transition-colors">Scoring App</Link>
               <Link to="/trends" className="hover:text-brand-yellow transition-colors">My Trends</Link>
               {isManager && (
                 <Link to="/manager" className="hover:text-brand-yellow transition-colors">My Team</Link>
               )}
               <Link to="/se-dashboard" className="hover:text-brand-yellow transition-colors">SE Dashboard</Link>
             </nav>
            <div className="h-6 w-px bg-slate-700 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-400 uppercase font-semibold">Logged in as</p>
                <p className="text-sm font-bold text-white truncate max-w-[150px]">
                  {user.displayName || user.email || 'Sales Engineer'}
                </p>
              </div>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-9 h-9 rounded-full border-2 border-brand-yellow/50"
                  onError={(e) => {
                    console.error('❌ Failed to load user avatar:', user.photoURL);
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={() => console.log('✅ Avatar loaded successfully:', user.photoURL)}
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center text-white border-2 border-brand-yellow/50">
                  <UserIcon size={16} />
                </div>
              )}
              <button
                onClick={logout}
                className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-300 hover:text-white ml-2"
                title="Sign Out"
              >
                <LogOut size={18} />
                <span className="text-xs">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-brand-navy text-slate-400 py-12 mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h4 className="text-white font-bold mb-2 text-lg">QUESTIONS OR ISSUES?</h4>
              <div className="flex gap-4 text-sm font-medium">
                <a href="#" className="hover:text-brand-yellow transition-colors">View the SE Demo Scoring Guide</a>
                <span className="text-slate-600">•</span>
                <a href="#" className="hover:text-brand-yellow transition-colors">Ask SE Leadership</a>
              </div>
            </div>
            <div className="flex gap-6 text-xs text-slate-500">
              <span>Help</span>
              <span>Feedback</span>
              <span>Privacy</span>
              <span>© 2026 Simpro – SE Demo Scoring</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
