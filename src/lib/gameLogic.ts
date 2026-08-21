import { AppState, Badges, CompletedTask, Task } from "../types";

// Centralized, deterministic game rules extracted from App.tsx. These helpers
// never call setState/showToast/Date.now(), so the logic can be unit-tested in
// isolation. Reward toasts are driven by the returned levelUps/unlocked lists.

/**
 * Applies XP to a state snapshot, advancing level(s) as needed.
 *
 * Level N requires N*100 XP; crossing the threshold subtracts it and increments
 * the level. Returns the new state plus the list of levels reached (for toasts)
 * and any badges unlocked along the way (currently `levelUp` at level >= 2).
 */
export function applyXP(
  state: AppState,
  amount: number
): { state: AppState; levelUps: number[]; unlockedBadges: (keyof Badges)[] } {
  let newXP = state.xp + amount;
  let newLevel = state.level;
  let xpNeeded = newLevel * 100;
  const upgradedBadges = { ...state.badges };
  const levelUps: number[] = [];
  const unlockedBadges: (keyof Badges)[] = [];

  while (newXP >= xpNeeded) {
    newXP -= xpNeeded;
    newLevel++;
    xpNeeded = newLevel * 100;
    levelUps.push(newLevel);

    // "Ascendant" unlocks the first time the player reaches level 2 or higher.
    if (newLevel >= 2 && !upgradedBadges.levelUp) {
      upgradedBadges.levelUp = true;
      unlockedBadges.push("levelUp");
    }
  }

  return {
    state: {
      ...state,
      xp: newXP,
      level: newLevel,
      badges: upgradedBadges,
    },
    levelUps,
    unlockedBadges,
  };
}

// Whether a task's dayOfWeek contributes to today's spoon budget. Unscheduled
// (and unset) tasks always affect today; otherwise only an exact weekday match.
export function affectsToday(
  dayOfWeek: string | undefined,
  todayName: string
): boolean {
  return (
    dayOfWeek === undefined ||
    dayOfWeek === "Unscheduled" ||
    dayOfWeek === todayName
  );
}

export function addSpoons(spoonsUsed: number, spoons: number): number {
  return spoonsUsed + spoons;
}

// Spoon balance never drops below zero.
export function removeSpoons(spoonsUsed: number, spoons: number): number {
  return Math.max(0, spoonsUsed - spoons);
}

// Badges awarded when a task is completed: "First Step" (any task) and
// "Heavy Lifter" (a 3-spoon task). Existing unlocked badges are preserved.
export function badgesForTaskCompletion(
  task: Task,
  badges: Badges
): { badges: Badges; unlocked: (keyof Badges)[] } {
  const unlocked: (keyof Badges)[] = [];
  const nextBadges = { ...badges };

  if (!nextBadges.firstStep) {
    nextBadges.firstStep = true;
    unlocked.push("firstStep");
  }

  if (task.spoons === 3 && !nextBadges.energized) {
    nextBadges.energized = true;
    unlocked.push("energized");
  }

  return { badges: nextBadges, unlocked };
}

// Badge awarded when a task is created with >= 2 micro-steps: "Step Weaver".
export function badgesForTaskCreation(
  subtaskCount: number,
  badges: Badges
): { badges: Badges; unlocked: (keyof Badges)[] } {
  const unlocked: (keyof Badges)[] = [];
  const nextBadges = { ...badges };

  if (subtaskCount >= 2 && !nextBadges.microMaster) {
    nextBadges.microMaster = true;
    unlocked.push("microMaster");
  }

  return { badges: nextBadges, unlocked };
}

// --- Sprint 2 helpers ---

export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Whether a task is scheduled for a specific weekday (used by the "Daily Voyage").
export function isTaskForDay(task: Task, dayName: string): boolean {
  return task.dayOfWeek === dayName;
}

// Whether completion XP/badges are still pending for a task or sub-step.
export function isRewardPending(rewarded: boolean | undefined): boolean {
  return rewarded !== true;
}

// Whether a weekday is earlier in the week than today (i.e. already passed).
// "Unscheduled"/undefined are never considered past.
export function isPastDay(
  dayOfWeek: string | undefined,
  todayName: string
): boolean {
  if (!dayOfWeek || dayOfWeek === "Unscheduled") return false;
  const dayIndex = DAYS_OF_WEEK.indexOf(dayOfWeek);
  const todayIndex = DAYS_OF_WEEK.indexOf(todayName);
  if (dayIndex === -1 || todayIndex === -1) return false;
  return dayIndex < todayIndex;
}

// Day rollover: archive completed tasks of past days into history, and carry
// unfinished past-day tasks to today marked as overdue.
export function rolloverTasks(
  tasks: Task[],
  todayName: string,
  completedAt: string
): { tasks: Task[]; history: CompletedTask[] } {
  const nextTasks: Task[] = [];
  const history: CompletedTask[] = [];

  for (const task of tasks) {
    if (isPastDay(task.dayOfWeek, todayName)) {
      if (task.completed) {
        history.push({ ...task, completedAt });
      } else {
        nextTasks.push({ ...task, dayOfWeek: todayName, overdue: true });
      }
    } else {
      nextTasks.push(task);
    }
  }

  return { tasks: nextTasks, history };
}

// Offline→cloud migration: which local tasks still need to be uploaded.
export function tasksToSync(
  localTasks: Task[],
  existingIds: Set<string>
): Task[] {
  return localTasks.filter((t) => !existingIds.has(t.id));
}
