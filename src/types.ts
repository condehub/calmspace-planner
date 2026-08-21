export interface SubTask {
  text: string;
  completed: boolean;
  rewarded?: boolean; // completion XP already awarded for this micro-step
}

export interface Task {
  id: string;
  title: string;
  spoons: number; // 1, 2, or 3
  subtasks: SubTask[];
  completed: boolean;
  dayOfWeek?: string; // "Monday", "Tuesday", etc. or undefined for unscheduled/today
  priority?: "Low" | "Medium" | "High";
  createdAt?: string; // ISO timestamp, used for stable ordering (newest first)
  rewarded?: boolean; // completion XP already awarded (idempotent reward)
  overdue?: boolean;  // rolled over from a previous day
}

export interface CompletedTask extends Task {
  completedAt: string; // ISO timestamp when it was archived into history
}

export interface Badges {
  firstStep: boolean;   // completed a task
  microMaster: boolean; // break down a task into at least 2 subtasks
  deepFocus: boolean;   // complete a focus timer session
  energized: boolean;   // complete a 3-spoon task
  levelUp: boolean;     // reached level 2 or higher
}

export interface AppState {
  xp: number;
  level: number;
  tasks: Task[];
  spoonsUsed: number;
  maxSpoons: number;
  badges: Badges;
  history: CompletedTask[]; // archived completed tasks
  lastActiveDate?: string;  // ISO date (YYYY-MM-DD) of last app open, for day rollover
}
