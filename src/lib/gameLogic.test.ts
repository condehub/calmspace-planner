import { describe, it, expect } from "vitest";
import {
  applyXP,
  affectsToday,
  addSpoons,
  removeSpoons,
  badgesForTaskCompletion,
  badgesForTaskCreation,
} from "./gameLogic";
import { AppState, Badges, Task } from "../types";

const baseBadges: Badges = {
  firstStep: false,
  microMaster: false,
  deepFocus: false,
  energized: false,
  levelUp: false,
};

const makeState = (overrides: Partial<AppState> = {}): AppState => ({
  xp: 0,
  level: 1,
  tasks: [],
  spoonsUsed: 0,
  maxSpoons: 12,
  badges: { ...baseBadges },
  ...overrides,
});

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "Sample goal",
  spoons: 1,
  subtasks: [],
  completed: false,
  ...overrides,
});

describe("applyXP", () => {
  it("does not level up when XP stays under the threshold", () => {
    const state = makeState({ xp: 50, level: 1 });
    const result = applyXP(state, 20);

    expect(result.state.xp).toBe(70);
    expect(result.state.level).toBe(1);
    expect(result.levelUps).toEqual([]);
    expect(result.unlockedBadges).toEqual([]);
    expect(result.state.badges.levelUp).toBe(false);
  });

  it("crosses an exact threshold and unlocks the levelUp badge", () => {
    const state = makeState({ xp: 90, level: 1 });
    const result = applyXP(state, 20);

    // 90 + 20 = 110, minus the 100 needed for level 2 leaves 10 XP.
    expect(result.state.xp).toBe(10);
    expect(result.state.level).toBe(2);
    expect(result.levelUps).toEqual([2]);
    expect(result.unlockedBadges).toEqual(["levelUp"]);
    expect(result.state.badges.levelUp).toBe(true);
  });

  it("handles multiple level-ups in a single call", () => {
    const state = makeState({ xp: 90, level: 1 });
    const result = applyXP(state, 230);

    // 320 XP: 100 -> level 2 (220 left), 200 -> level 3 (20 left).
    expect(result.state.xp).toBe(20);
    expect(result.state.level).toBe(3);
    expect(result.levelUps).toEqual([2, 3]);
    expect(result.state.badges.levelUp).toBe(true);
    // levelUp is only reported once.
    expect(result.unlockedBadges).toEqual(["levelUp"]);
  });

  it("keeps the levelUp badge true when it is already unlocked", () => {
    const state = makeState({
      xp: 90,
      level: 1,
      badges: { ...baseBadges, levelUp: true },
    });
    const result = applyXP(state, 20);

    expect(result.state.level).toBe(2);
    expect(result.state.xp).toBe(10);
    expect(result.levelUps).toEqual([2]);
    expect(result.state.badges.levelUp).toBe(true);
    expect(result.unlockedBadges).toEqual([]);
  });
});

describe("addSpoons / removeSpoons", () => {
  it("adds spoons to the running total", () => {
    expect(addSpoons(5, 3)).toBe(8);
    expect(addSpoons(0, 2)).toBe(2);
  });

  it("subtracts spoons and floors the balance at zero", () => {
    expect(removeSpoons(5, 3)).toBe(2);
    expect(removeSpoons(3, 5)).toBe(0);
    expect(removeSpoons(0, 1)).toBe(0);
  });
});

describe("affectsToday", () => {
  it("returns true for Unscheduled tasks", () => {
    expect(affectsToday("Unscheduled", "Monday")).toBe(true);
  });

  it("returns true when the day is undefined", () => {
    expect(affectsToday(undefined, "Monday")).toBe(true);
  });

  it("returns true when the task day matches today", () => {
    expect(affectsToday("Monday", "Monday")).toBe(true);
  });

  it("returns false for a different weekday", () => {
    expect(affectsToday("Tuesday", "Monday")).toBe(false);
  });
});

describe("badgesForTaskCompletion", () => {
  it("unlocks firstStep once on the first completed task", () => {
    const result = badgesForTaskCompletion(makeTask({ spoons: 1 }), baseBadges);

    expect(result.badges.firstStep).toBe(true);
    expect(result.unlocked).toContain("firstStep");
  });

  it("does not re-unlock firstStep when it is already true", () => {
    const result = badgesForTaskCompletion(
      makeTask({ spoons: 1 }),
      { ...baseBadges, firstStep: true }
    );

    expect(result.badges.firstStep).toBe(true);
    expect(result.unlocked).toEqual([]);
  });

  it("only unlocks energized for a 3-spoon task", () => {
    const lightResult = badgesForTaskCompletion(makeTask({ spoons: 2 }), baseBadges);
    expect(lightResult.badges.energized).toBe(false);
    expect(lightResult.unlocked).not.toContain("energized");

    const heavyResult = badgesForTaskCompletion(makeTask({ spoons: 3 }), baseBadges);
    expect(heavyResult.badges.energized).toBe(true);
    expect(heavyResult.unlocked).toContain("energized");
  });

  it("preserves existing unlocked badges", () => {
    const existing = { ...baseBadges, firstStep: true, energized: true };
    const result = badgesForTaskCompletion(makeTask({ spoons: 3 }), existing);

    expect(result.badges.firstStep).toBe(true);
    expect(result.badges.energized).toBe(true);
    expect(result.unlocked).toEqual([]);
  });
});

describe("badgesForTaskCreation", () => {
  it("unlocks microMaster when the task has at least 2 subtasks", () => {
    const result = badgesForTaskCreation(2, baseBadges);

    expect(result.badges.microMaster).toBe(true);
    expect(result.unlocked).toContain("microMaster");
  });

  it("does not unlock microMaster with fewer subtasks", () => {
    const result = badgesForTaskCreation(1, baseBadges);

    expect(result.badges.microMaster).toBe(false);
    expect(result.unlocked).toEqual([]);
  });

  it("does not re-unlock microMaster when it is already true", () => {
    const result = badgesForTaskCreation(2, { ...baseBadges, microMaster: true });

    expect(result.badges.microMaster).toBe(true);
    expect(result.unlocked).toEqual([]);
  });
});
