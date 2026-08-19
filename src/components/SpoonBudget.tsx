import React from "react";
import { motion, AnimatePresence } from "motion/react";

interface SpoonBudgetProps {
  maxSpoons: number;
  spoonsUsed: number;
}

export const SpoonBudget: React.FC<SpoonBudgetProps> = ({ maxSpoons, spoonsUsed }) => {
  const currentSpoonsAvailable = Math.max(0, maxSpoons - spoonsUsed);

  return (
    <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-xs transition-all">
      <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Energy Budget</h3>

      <div className="bg-blue-50/20 p-4 rounded-xl border border-blue-50/60 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 mb-3">
          <span className="font-bold text-xs text-[#0f2042]">Spoons remaining today:</span>
          <span className="text-[11px] font-mono text-blue-850 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100/40">
            {currentSpoonsAvailable} / {maxSpoons} Spoons
          </span>
        </div>

        {/* Visual Spoon Grid */}
        <div className="flex flex-wrap gap-2 py-1">
          <AnimatePresence>
            {Array.from({ length: maxSpoons }).map((_, index) => {
              const isAvailable = index < currentSpoonsAvailable;
              return (
                <motion.div
                  key={index}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.02, type: "spring", stiffness: 200 }}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                    isAvailable
                      ? "bg-white border border-blue-200 text-amber-500 scale-100 shadow-xs"
                      : "opacity-20 scale-95"
                  }`}
                  title={isAvailable ? "Energy Spoon Available" : "Energy Spoon Used"}
                >
                  🥄
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div className="bg-blue-50/10 p-3.5 rounded-xl border border-dashed border-blue-200/60">
        <p className="text-[11px] text-blue-700 leading-relaxed">
          <span className="font-bold uppercase tracking-tighter">Spoon Theory:</span> Each task requires a budget of spoons. Completing tasks rewards you and preserves your mental momentum.
        </p>
      </div>
    </div>
  );
};
