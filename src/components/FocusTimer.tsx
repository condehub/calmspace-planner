import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Play, Pause, RotateCcw, Volume2, Sparkles } from "lucide-react";

interface FocusTimerProps {
  onComplete: () => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ onComplete }) => {
  const [duration, setDuration] = useState<number>(15 * 60); // Default 15 minutes in seconds
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            setIsActive(false);
            playCalmChime();
            onComplete();
            return duration; // reset to duration
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, duration, onComplete]);

  // Handle duration change
  const selectDuration = (minutes: number) => {
    setIsActive(false);
    setDuration(minutes * 60);
    setTimeLeft(minutes * 60);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(duration);
  };

  // Synthesize a calming, gorgeous Zen chime using Web Audio API
  const playCalmChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const audioCtx = new AudioContext();
      
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc1.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 2.0); // G5

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 1.8); // C6

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.5);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start();
      osc2.start();
      
      osc1.stop(audioCtx.currentTime + 2.5);
      osc2.stop(audioCtx.currentTime + 2.5);
    } catch (e) {
      console.warn("Web Audio API blocked or not supported", e);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Predefined time presets
  const presets = [
    { label: "5m sprint", value: 5 },
    { label: "15m focus", value: 15 },
    { label: "25m deep", value: 25 },
  ];

  const progressPercentage = ((duration - timeLeft) / duration) * 100;

  return (
    <div className="bg-blue-900 rounded-2xl p-5 text-white shadow-md border border-blue-800 transition-all">
      <h3 className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-3">Focus Session</h3>

      {/* Preset Chooser */}
      <div className="flex justify-between gap-2 mb-4">
        {presets.map((p) => {
          const isSelected = duration === p.value * 60;
          return (
            <button
              key={p.value}
              onClick={() => selectDuration(p.value)}
              className={`flex-1 text-[10px] py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                isSelected
                  ? "bg-white text-blue-900 border-white"
                  : "bg-blue-950/40 text-blue-200 border-blue-800 hover:bg-blue-800/40"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Main Clock Face */}
      <div className="relative flex flex-col items-center justify-center py-5 bg-blue-950/40 rounded-xl border border-blue-800 overflow-hidden mb-4">
        {/* Progress Line */}
        <div 
          className="absolute bottom-0 left-0 h-1 bg-blue-400/80 transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />

        <motion.div
          key={timeLeft}
          animate={isActive ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-4xl font-extrabold tracking-widest font-mono select-none"
        >
          {formatTime(timeLeft)}
        </motion.div>

        <span className="text-[9px] uppercase tracking-wider text-blue-300 font-bold mt-1">
          {isActive ? "Flow State Active" : "Standing By"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2.5">
        <button
          onClick={toggleTimer}
          className="flex-1 bg-white text-blue-900 hover:bg-slate-50 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
        >
          {isActive ? <Pause className="w-3.5 h-3.5 fill-blue-900" /> : <Play className="w-3.5 h-3.5 fill-blue-900" />}
          {isActive ? "Pause" : "Start"}
        </button>

        <button
          onClick={resetTimer}
          className="px-3 py-2.5 rounded-xl border border-blue-400 hover:bg-blue-850 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
          title="Reset"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={playCalmChime}
          className="px-3 py-2.5 rounded-xl border border-blue-400 hover:bg-blue-850 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
          title="Zen Chime"
        >
          <Volume2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-3.5 flex items-center justify-center gap-1 text-center text-[10px] text-blue-200 font-medium">
        <Sparkles className="w-3 h-3 text-amber-300" /> Session rewards <strong className="text-white">+25 XP</strong>
      </div>
    </div>
  );
};
