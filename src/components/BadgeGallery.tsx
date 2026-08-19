import React from "react";
import { motion } from "motion/react";
import { Badges } from "../types";

interface BadgeGalleryProps {
  badges: Badges;
}

interface BadgeItem {
  id: keyof Badges;
  name: string;
  desc: string;
  emoji: string;
}

export const BadgeGallery: React.FC<BadgeGalleryProps> = ({ badges }) => {
  const badgeList: BadgeItem[] = [
    {
      id: "firstStep",
      name: "First Step",
      desc: "Completed your first task.",
      emoji: "🌱",
    },
    {
      id: "microMaster",
      name: "Step Weaver",
      desc: "Broke a task into visual micro-steps.",
      emoji: "🧩",
    },
    {
      id: "deepFocus",
      name: "Deep Diver",
      desc: "Finished a gentle visual focus session.",
      emoji: "🧘",
    },
    {
      id: "energized",
      name: "Heavy Lifter",
      desc: "Accomplished a high-spoon (3) task.",
      emoji: "🔋",
    },
    {
      id: "levelUp",
      name: "Ascendant",
      desc: "Successfully unlocked Level 2+!",
      emoji: "🌟",
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-blue-50 shadow-xs transition-all">
      <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Achievements</h3>

      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 lg:grid-cols-2 gap-3">
        {badgeList.map((badge) => {
          const isUnlocked = badges[badge.id];

          return (
            <div
              key={badge.id}
              className="group relative"
            >
              <motion.div
                whileHover={isUnlocked ? { scale: 1.04 } : {}}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all duration-300 ${
                  isUnlocked
                    ? "bg-blue-50/70 border-blue-100 text-blue-900"
                    : "bg-slate-50/50 border-slate-100 text-slate-300 opacity-30 grayscale"
                }`}
              >
                <span className="text-2xl mb-1 select-none">{badge.emoji}</span>
                <span className="text-[10px] font-bold text-center leading-tight">
                  {badge.name}
                </span>
              </motion.div>

              {/* Soothing description tooltip on hover */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-150 bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-md w-32 z-30 pointer-events-none leading-normal">
                <p className="font-bold mb-0.5 text-blue-300">{badge.name}</p>
                <p className="opacity-95">{badge.desc}</p>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
