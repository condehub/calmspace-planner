import React, { useState, KeyboardEvent } from "react";
import { X, CornerDownRight, Plus } from "lucide-react";

interface TaskCreatorProps {
  onAddTask: (title: string, spoons: number, subtasks: string[], day?: string, priority?: "Low" | "Medium" | "High") => void;
}

export const TaskCreator: React.FC<TaskCreatorProps> = ({ onAddTask }) => {
  const [taskTitle, setTaskTitle] = useState("");
  const [spoons, setSpoons] = useState<number>(2);
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [subtaskInput, setSubtaskInput] = useState("");
  const [tempSubtasks, setTempSubtasks] = useState<string[]>([]);

  const handleAddSubtask = () => {
    const text = subtaskInput.trim();
    if (text) {
      setTempSubtasks([...tempSubtasks, text]);
      setSubtaskInput("");
    }
  };

  const handleSubtaskKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSubtask();
    }
  };

  const handleRemoveTempSubtask = (index: number) => {
    setTempSubtasks(tempSubtasks.filter((_, i) => i !== index));
  };

  const handleCreateTask = () => {
    const title = taskTitle.trim();
    if (!title) return;

    onAddTask(title, spoons, tempSubtasks, undefined, priority);

    // Reset Form
    setTaskTitle("");
    setSpoons(2);
    setPriority("Medium");
    setTempSubtasks([]);
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-xs transition-all">
      <h3 className="text-sm font-bold text-blue-900 mb-4">New Goal</h3>

      {/* Main Task Input */}
      <div className="mb-4">
        <label htmlFor="task-title" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          What needs doing?
        </label>
        <input
          type="text"
          id="task-title"
          className="w-full border border-slate-100 rounded-lg text-sm bg-slate-50 focus:border-blue-400 focus:bg-white text-slate-800 placeholder-slate-400 focus:ring-0 transition-all py-2.5 px-3.5 outline-hidden"
          placeholder="e.g., Unpack school bag..."
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
        />
      </div>

      {/* Spoon Budget Selector */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Energy Cost (Spoons)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 1, label: "🥄 1 Spoon", desc: "Low energy" },
            { value: 2, label: "🥄 2 Spoons", desc: "Medium" },
            { value: 3, label: "🥄 3 Spoons", desc: "High energy" },
          ].map((opt) => {
            const isSelected = spoons === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSpoons(opt.value)}
                className={`py-2 px-1.5 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? "bg-blue-50/70 border-blue-200 text-blue-900"
                    : "bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="text-xs font-bold">{opt.label}</span>
                <span className="text-[9px] text-slate-400 mt-0.5">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Priority Selector */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Priority Level
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(["Low", "Medium", "High"] as const).map((p) => {
            const isSelected = priority === p;
            let activeStyles = "";
            if (p === "Low") activeStyles = "bg-emerald-50/70 border-emerald-200 text-emerald-900";
            else if (p === "Medium") activeStyles = "bg-amber-50/70 border-amber-200 text-amber-900";
            else activeStyles = "bg-rose-50/70 border-rose-200 text-rose-900";

            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`py-2 px-1.5 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? activeStyles
                    : "bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="text-xs font-bold">{p}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Micro-steps Creator */}
      <div className="mb-5">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Break it down (Micro-steps)
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="flex-1 border border-slate-100 rounded-lg text-xs bg-slate-50 focus:border-blue-400 focus:bg-white text-slate-800 placeholder-slate-400 focus:ring-0 transition-all py-2 px-3 outline-hidden"
            placeholder="Add a tiny micro-step..."
            value={subtaskInput}
            onChange={(e) => setSubtaskInput(e.target.value)}
            onKeyDown={handleSubtaskKeyDown}
          />
          <button
            type="button"
            onClick={handleAddSubtask}
            className="px-3 py-2 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 text-slate-600 rounded-lg text-xs font-bold cursor-pointer transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Temporary Subtasks tags list */}
        {tempSubtasks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-dashed border-slate-200 max-h-24 overflow-y-auto">
            {tempSubtasks.map((step, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-blue-50/70 text-blue-900 pl-2 pr-1.5 py-1 rounded-md border border-blue-100/50"
              >
                <CornerDownRight className="w-2.5 h-2.5 text-blue-500" />
                {step}
                <button
                  type="button"
                  onClick={() => handleRemoveTempSubtask(idx)}
                  className="p-0.5 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleCreateTask}
        disabled={!taskTitle.trim()}
        className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all ${
          taskTitle.trim()
            ? "bg-blue-700 hover:bg-blue-800 text-white shadow-sm"
            : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
        }`}
      >
        Add to Board
      </button>
    </div>
  );
};
