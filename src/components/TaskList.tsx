import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Task } from "../types";
import { Trash2 } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (taskId: number) => void;
  onToggleSubtask: (taskId: number, subIndex: number) => void;
  onDeleteTask: (taskId: number) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleTask,
  onToggleSubtask,
  onDeleteTask,
}) => {
  const remainingCount = tasks.filter((t) => !t.completed).length;

  return (
    <div className="bg-white rounded-2xl border border-blue-100 shadow-xs overflow-hidden flex flex-col">
      <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-white">
        <h2 className="text-lg font-bold text-blue-900">Today's Voyage</h2>
        <span className="text-xs font-medium text-slate-400">
          {remainingCount} {remainingCount === 1 ? "task" : "tasks"} remaining
        </span>
      </div>

      <div className="p-4 space-y-4">
        <AnimatePresence initial={false}>
          {tasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 px-4 rounded-xl border border-dashed border-blue-100 bg-blue-50/10"
            >
              <div className="text-3xl mb-2 select-none">🏝️</div>
              <p className="text-sm text-blue-900 font-bold">Your voyage is clear</p>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                No demands, no pressure. Add a low-energy goal to initiate a gentle progress loop!
              </p>
            </motion.div>
          ) : (
            tasks.map((task) => {
              const spoonsVisual = Array.from({ length: task.spoons })
                .map(() => "🥄")
                .join(" ");

              const xpReward = 50 + task.spoons * 15;
              const hasSubtasks = task.subtasks && task.subtasks.length > 0;

              // Border priority styling
              let priorityBorderClass = "border-slate-100";
              let priorityBgClass = "bg-white hover:border-blue-200 hover:shadow-xs";

              if (task.completed) {
                priorityBorderClass = "border-slate-100 opacity-60";
                priorityBgClass = "bg-slate-50/60";
              } else {
                const p = task.priority || "Medium";
                if (p === "Low") {
                  priorityBorderClass = "border-emerald-200 border-l-4 border-l-emerald-500";
                  priorityBgClass = hasSubtasks ? "bg-emerald-50/10" : "bg-white hover:shadow-xs";
                } else if (p === "High") {
                  priorityBorderClass = "border-rose-200 border-l-4 border-l-rose-500";
                  priorityBgClass = hasSubtasks ? "bg-rose-50/10" : "bg-white hover:shadow-xs";
                } else {
                  priorityBorderClass = "border-amber-200 border-l-4 border-l-amber-500";
                  priorityBgClass = hasSubtasks ? "bg-amber-50/10" : "bg-white hover:shadow-xs";
                }
              }

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -50, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  layout
                  className={`p-4 rounded-xl border transition-all ${priorityBorderClass} ${priorityBgClass}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => onToggleTask(task.id)}
                      className="mt-1 w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />

                    {/* Content area */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4
                          className={`font-bold text-slate-800 leading-tight ${
                            task.completed ? "line-through text-slate-400 font-medium" : ""
                          }`}
                        >
                          {task.title}
                        </h4>
                        
                        <div className="flex items-center gap-1.5 shrink-0 select-none">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight ${
                            task.completed
                              ? "bg-slate-100 text-slate-400"
                              : task.priority === "Low"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : task.priority === "High"
                              ? "bg-rose-50 text-rose-700 border border-rose-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                            {task.priority || "Medium"}
                          </span>
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">
                            {spoonsVisual}
                          </span>
                          <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">
                            +{xpReward} XP
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delete Action */}
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                      title="Remove Goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Nested Subtasks */}
                  {hasSubtasks && (
                    <div className="ml-8 pl-4 border-l-2 border-blue-100/60 space-y-2 mt-3">
                      {task.subtasks.map((sub, idx) => (
                        <div key={idx} className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={sub.completed}
                            onChange={() => onToggleSubtask(task.id, idx)}
                            disabled={task.completed}
                            className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 focus:ring-blue-400 cursor-pointer disabled:opacity-50"
                          />
                          <span
                            className={`text-xs ${
                              sub.completed
                                ? "text-slate-400 line-through italic font-normal"
                                : "text-slate-700 font-medium"
                            }`}
                          >
                            {sub.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
