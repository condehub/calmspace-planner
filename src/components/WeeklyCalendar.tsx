import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Task } from "../types";
import { 
  Calendar, 
  ArrowRight, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Sparkles,
  Inbox
} from "lucide-react";

const formatCreatedAt = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
};

interface WeeklyCalendarProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subIndex: number) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskDay: (taskId: string, day: string) => void;
  onAddTask: (title: string, spoons: number, subtasks: string[], day?: string, priority?: "Low" | "Medium" | "High") => void;
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  tasks,
  onToggleTask,
  onToggleSubtask,
  onDeleteTask,
  onUpdateTaskDay,
  onAddTask
}) => {
  const [selectedDayForQuickAdd, setSelectedDayForQuickAdd] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddSpoons, setQuickAddSpoons] = useState<number>(1);
  const [quickAddPriority, setQuickAddPriority] = useState<"Low" | "Medium" | "High">("Medium");

  // Group tasks by day
  const getTasksForDay = (day: string) => {
    return tasks.filter((t) => t.dayOfWeek === day);
  };

  const getUnscheduledTasks = () => {
    return tasks.filter((t) => !t.dayOfWeek || t.dayOfWeek === "Unscheduled");
  };

  // Calculate total spoons spent on a given day
  const getSpoonsForDay = (day: string) => {
    return getTasksForDay(day)
      .filter((t) => !t.completed) // Active tasks drain spoons
      .reduce((sum, t) => sum + t.spoons, 0);
  };

  const handleQuickAdd = (day: string) => {
    if (!quickAddTitle.trim()) return;
    onAddTask(quickAddTitle.trim(), quickAddSpoons, [], day, quickAddPriority);
    setQuickAddTitle("");
    setQuickAddPriority("Medium");
    setSelectedDayForQuickAdd(null);
  };

  // Safe spoon threshold warning
  const SPOON_THRESHOLD = 6;

  return (
    <div className="space-y-6">
      {/* Calendar Header with stats summary */}
      <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-700" /> Weekly Horizon Planner
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Distribute your cognitive load. Aim to keep daily spoon budgets below <span className="font-bold text-blue-700">{SPOON_THRESHOLD} spoons</span> to avoid executive burnout.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl text-center min-w-[100px]">
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Scheduled Tasks</span>
            <span className="text-lg font-bold text-blue-900">{tasks.filter(t => t.dayOfWeek && t.dayOfWeek !== "Unscheduled").length}</span>
          </div>
          <div className="bg-amber-50/60 border border-amber-100 p-3 rounded-xl text-center min-w-[100px]">
            <span className="block text-[10px] text-amber-600 font-bold uppercase tracking-wider">Unscheduled Inbox</span>
            <span className="text-lg font-bold text-amber-800">{getUnscheduledTasks().length}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Days of the week */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4">
        {DAYS_OF_WEEK.map((day) => {
          const dayTasks = getTasksForDay(day);
          const activeSpoons = getSpoonsForDay(day);
          const isOverloaded = activeSpoons > SPOON_THRESHOLD;

          return (
            <div 
              key={day}
              className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col min-h-[340px] transition-all duration-300 ${
                isOverloaded 
                  ? "border-red-200 bg-red-50/5" 
                  : "border-slate-100 hover:border-blue-200"
              }`}
            >
              {/* Day Header */}
              <div className="flex justify-between items-start mb-3 pb-2 border-b border-slate-50">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight">{day}</h3>
                  <span className="text-[10px] text-slate-400 font-semibold">{dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    isOverloaded 
                      ? "bg-red-100 text-red-700 border border-red-200" 
                      : activeSpoons > 0 
                      ? "bg-blue-50 text-blue-800 border border-blue-100/60" 
                      : "bg-slate-50 text-slate-400"
                  }`}>
                    {activeSpoons} 🥄
                  </span>
                </div>
              </div>

              {/* Overload Alert warning */}
              {isOverloaded && (
                <div className="mb-3 p-2 bg-red-50/80 rounded-lg border border-red-100 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="text-[9px] text-red-700 font-bold leading-normal">
                    Cognitive alert: High energy load! Consider rescheduling.
                  </span>
                </div>
              )}

              {/* Day Task List */}
              <div className="flex-1 space-y-3 mb-4 overflow-y-auto max-h-[220px] pr-1 scrollbar-thin">
                <AnimatePresence initial={false}>
                  {dayTasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-8 opacity-40 select-none">
                      <span className="text-xl mb-1">🌤️</span>
                      <span className="text-[10px] text-slate-400 font-semibold">Calm day</span>
                    </div>
                  ) : (
                    dayTasks.map((task) => {
                      let priorityClass = "bg-white border-slate-100 hover:border-blue-200";
                      if (task.completed) {
                        priorityClass = "bg-slate-50/60 border-slate-100 opacity-60";
                      } else {
                        const p = task.priority || "Medium";
                        if (p === "Low") {
                          priorityClass = "bg-emerald-50/10 border-emerald-200 border-l-4 border-l-emerald-500 hover:border-emerald-300";
                        } else if (p === "High") {
                          priorityClass = "bg-rose-50/10 border-rose-200 border-l-4 border-l-rose-500 hover:border-rose-300";
                        } else {
                          priorityClass = "bg-amber-50/10 border-amber-200 border-l-4 border-l-amber-500 hover:border-amber-300";
                        }
                      }

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`p-2.5 rounded-xl border text-xs transition-all ${priorityClass}`}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => onToggleTask(task.id)}
                              aria-label={
                                task.completed
                                  ? `Mark "${task.title}" incomplete`
                                  : `Mark "${task.title}" complete`
                              }
                              className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-400 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-bold text-slate-800 leading-tight truncate ${
                                task.completed ? "line-through text-slate-400 font-medium" : ""
                              }`} title={task.title}>
                                {task.title}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {task.overdue && (
                                  <span className="text-[8px] px-1 py-0.2 rounded font-extrabold uppercase tracking-tight bg-red-50 text-red-700 border border-red-100">
                                    Atrasada
                                  </span>
                                )}
                                {task.createdAt && (
                                  <span className="text-[8px] text-slate-400 font-medium">
                                    criada em {formatCreatedAt(task.createdAt)}
                                  </span>
                                )}
                              </div>
                              
                              {/* Task Info/Actions */}
                              <div className="flex justify-between items-center mt-2">
                                <div className="flex items-center gap-1 min-w-0 shrink-0">
                                  <span className="text-[9px] text-slate-400 font-bold shrink-0">
                                    {Array.from({ length: task.spoons }).map(() => "🥄").join("")}
                                  </span>
                                  <span className={`text-[8px] px-1 py-0.2 rounded font-extrabold uppercase tracking-tight shrink-0 ${
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
                                </div>
                              
                              <div className="flex items-center gap-1.5">
                                {/* Move dropdown selector */}
                                <select
                                  value={day}
                                  onChange={(e) => onUpdateTaskDay(task.id, e.target.value)}
                                  aria-label={`Move "${task.title}" to another day`}
                                  className="text-[9px] bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 text-slate-500 hover:border-blue-200 cursor-pointer focus:outline-hidden"
                                >
                                  {DAYS_OF_WEEK.map(d => (
                                    <option key={d} value={d}>{d.substring(0, 3)}</option>
                                  ))}
                                  <option value="Unscheduled">Inbox</option>
                                </select>

                                <button
                                  onClick={() => onDeleteTask(task.id)}
                                  className="text-slate-300 hover:text-red-500 p-0.5"
                                  title="Remove"
                                  aria-label="Remove goal"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Nested Sub-steps if any */}
                        {task.subtasks && task.subtasks.length > 0 && !task.completed && (
                          <div className="mt-2 pl-4 border-l border-dashed border-blue-100 space-y-1">
                            {task.subtasks.map((sub, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={sub.completed}
                                  onChange={() => onToggleSubtask(task.id, idx)}
                                  aria-label={
                                    sub.completed
                                      ? `Mark micro-step "${sub.text}" incomplete`
                                      : `Mark micro-step "${sub.text}" complete`
                                  }
                                  className="w-3 h-3 rounded text-blue-600 border-slate-300 cursor-pointer"
                                />
                                <span className={`text-[9px] truncate max-w-[85px] ${
                                  sub.completed ? "line-through text-slate-400 italic" : "text-slate-600"
                                }`}>
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

              {/* Quick Add Form in Day */}
              <div className="mt-auto">
                {selectedDayForQuickAdd === day ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2.5 bg-slate-50/50 rounded-xl border border-slate-100/80 space-y-2"
                  >
                    <input
                      type="text"
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-blue-400 bg-white"
                      placeholder="Goal description..."
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleQuickAdd(day)}
                      autoFocus
                    />
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setQuickAddSpoons(val)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                              quickAddSpoons === val
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-slate-500 border-slate-200"
                            }`}
                          >
                            {Array.from({ length: val }).map(() => "🥄").join("")}
                          </button>
                        ))}
                      </div>
                      <select
                        value={quickAddPriority}
                        onChange={(e) => setQuickAddPriority(e.target.value as "Low" | "Medium" | "High")}
                        className="text-[9px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 font-bold hover:border-blue-300 cursor-pointer focus:outline-hidden"
                      >
                        <option value="Low">Low Priority</option>
                        <option value="Medium">Medium Priority</option>
                        <option value="High">High Priority</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-100/60">
                      <button
                        onClick={() => handleQuickAdd(day)}
                        className="px-2 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Add Goal
                      </button>
                      <button
                        onClick={() => setSelectedDayForQuickAdd(null)}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <button
                    onClick={() => {
                      setQuickAddSpoons(1);
                      setQuickAddTitle("");
                      setSelectedDayForQuickAdd(day);
                    }}
                    className="w-full py-1.5 border border-dashed border-slate-200 hover:border-blue-300 text-slate-400 hover:text-blue-700 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Quick Add Goal
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unscheduled Tasks Area / Inbox Section */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-dashed border-blue-200/80">
        <div className="flex items-center gap-2 mb-4">
          <Inbox className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <h3 className="font-bold text-[#0f2042] text-sm">Unscheduled Inbox</h3>
            <p className="text-[11px] text-slate-500">
              Tasks waiting for their day in the sun. Drag or assign them to specific days of the week when you are ready.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <AnimatePresence initial={false}>
            {getUnscheduledTasks().length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400 w-full italic">
                Your inbox is fully scheduled. No unscheduled tasks.
              </div>
            ) : (
              getUnscheduledTasks().map((task) => {
                let priorityBorderClass = "border-slate-100";
                if (task.completed) {
                  priorityBorderClass = "border-slate-100 opacity-60";
                } else {
                  const p = task.priority || "Medium";
                  if (p === "Low") {
                    priorityBorderClass = "border-emerald-200 border-l-4 border-l-emerald-500";
                  } else if (p === "High") {
                    priorityBorderClass = "border-rose-200 border-l-4 border-l-rose-500";
                  } else {
                    priorityBorderClass = "border-amber-200 border-l-4 border-l-amber-500";
                  }
                }

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-white p-3.5 rounded-xl border shadow-xs flex items-center gap-3 max-w-sm flex-1 min-w-[260px] relative hover:border-blue-200 transition-all ${priorityBorderClass}`}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => onToggleTask(task.id)}
                      aria-label={
                        task.completed
                          ? `Mark "${task.title}" incomplete`
                          : `Mark "${task.title}" complete`
                      }
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400 cursor-pointer shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-bold text-slate-800 leading-tight block truncate ${
                        task.completed ? "line-through text-slate-400 font-medium" : ""
                      }`}>
                        {task.title}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] bg-slate-50 text-slate-500 font-bold uppercase tracking-tight px-1.5 py-0.5 rounded">
                          {Array.from({ length: task.spoons }).map(() => "🥄").join(" ")}
                        </span>
                        <span className={`text-[8px] px-1 py-0.2 rounded font-extrabold uppercase tracking-tight shrink-0 ${
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
                        <span className="text-[9px] text-slate-400 font-bold">Inbox</span>
                        {task.overdue && (
                          <span className="text-[8px] px-1 py-0.2 rounded font-extrabold uppercase tracking-tight bg-red-50 text-red-700 border border-red-100">
                            Atrasada
                          </span>
                        )}
                        {task.createdAt && (
                          <span className="text-[9px] text-slate-400 font-medium">
                            criada em {formatCreatedAt(task.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value="Unscheduled"
                        onChange={(e) => onUpdateTaskDay(task.id, e.target.value)}
                        aria-label={`Schedule "${task.title}" to another day`}
                        className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-100 rounded px-2 py-1 font-bold cursor-pointer focus:outline-hidden"
                      >
                        <option value="Unscheduled">Schedule...</option>
                        {DAYS_OF_WEEK.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="text-slate-300 hover:text-red-500 p-1 cursor-pointer transition-colors"
                        title="Remove Goal"
                        aria-label="Remove goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
