import React from "react";
import { motion } from "motion/react";
import { LogIn, LogOut, Cloud, CloudOff, Loader2 } from "lucide-react";
import { User } from "firebase/auth";

interface HeaderProps {
  level: number;
  xp: number;
  currentUser: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  loadingAuth: boolean;
  isFirebaseConfigured: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  level,
  xp,
  currentUser,
  onSignIn,
  onSignOut,
  loadingAuth,
  isFirebaseConfigured,
}) => {
  const xpNeeded = level * 100;
  const xpPercentage = Math.min(100, Math.max(0, (xp / xpNeeded) * 100));

  const getRank = (lvl: number) => {
    if (lvl === 1) return "Mindful Navigator";
    if (lvl === 2) return "Spoon Master";
    if (lvl === 3) return "Focus Explorer";
    if (lvl === 4) return "Zen Commander";
    return "Serene Navigator";
  };

  return (
    <header className="flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white border border-blue-100 rounded-2xl p-4 shadow-xs mb-6 gap-4">
      {/* Brand Logo and Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-inner select-none shrink-0">
          ⚓
        </div>
        <div>
          <h1 className="text-xl font-bold text-blue-900 tracking-tight flex items-center gap-2">
            CalmSpace <span className="font-normal text-blue-400">Planner</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Your low-stress task sanctuary</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
        {/* Sync Mode and Auth Widget */}
        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 p-2 px-3 rounded-xl">
          {!isFirebaseConfigured ? (
            <div className="flex items-center gap-2 text-slate-400">
              <CloudOff className="w-4 h-4 text-slate-400" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-extrabold uppercase tracking-tight text-slate-500">Offline Mode</span>
                <span className="text-[9px] font-medium leading-none">Local browser storage</span>
              </div>
            </div>
          ) : loadingAuth ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-[10px] font-bold uppercase tracking-tight">Syncing...</span>
            </div>
          ) : currentUser ? (
            <div className="flex items-center gap-3 text-left">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || "User"}
                  className="w-7 h-7 rounded-full border border-blue-100 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold uppercase">
                  {currentUser.displayName ? currentUser.displayName[0] : "U"}
                </div>
              )}
              <div className="flex flex-col text-left min-w-[80px]">
                <span className="text-[10px] font-extrabold uppercase tracking-tight text-blue-700 truncate max-w-[120px]">
                  {currentUser.displayName || "Explorer"}
                </span>
                <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                  <Cloud className="w-2.5 h-2.5" /> Synced
                </span>
              </div>
              <button
                onClick={onSignOut}
                className="p-1.5 text-slate-400 hover:text-red-500 bg-white border border-slate-100 rounded-lg hover:border-red-100 hover:bg-red-50/50 transition-colors cursor-pointer"
                title="Sign Out"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="flex items-center gap-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 p-2 px-3.5 rounded-lg shadow-sm cursor-pointer transition-all active:scale-[0.98]"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Connect Cloud</span>
            </button>
          )}
        </div>

        {/* Level Stats Widget */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2 px-3 rounded-xl flex-1 sm:flex-initial">
          <motion.div 
            key={level}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-8 h-8 rounded-full border-2 border-blue-700 flex items-center justify-center font-extrabold text-blue-700 text-xs shrink-0 bg-white shadow-xs"
          >
            {level}
          </motion.div>
          <div className="flex flex-col min-w-[120px] flex-1 text-left">
            <span className="text-[10px] font-extrabold uppercase tracking-tight text-slate-500 leading-tight">Rank</span>
            <span className="text-xs font-bold text-slate-800 leading-tight">{getRank(level)}</span>
            <div className="w-full h-1 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${xpPercentage}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="bg-blue-600 h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
