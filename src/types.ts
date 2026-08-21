export interface SubTask {
  text: string;
  completed: boolean;
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
}
