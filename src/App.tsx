import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Header } from "./components/Header";
import { TaskCreator } from "./components/TaskCreator";
import { TaskList } from "./components/TaskList";
import { SpoonBudget } from "./components/SpoonBudget";
import { FocusTimer } from "./components/FocusTimer";
import { BadgeGallery } from "./components/BadgeGallery";
import { WeeklyCalendar } from "./components/WeeklyCalendar";
import { Task, AppState, Badges } from "./types";
import { FOCUS_SESSION_XP } from "./lib/constants";
import {
  applyXP,
  affectsToday,
  addSpoons,
  removeSpoons,
  badgesForTaskCompletion,
  badgesForTaskCreation,
} from "./lib/gameLogic";
import { RefreshCcw, Bell, Calendar } from "lucide-react";

// Firebase Integration
import {
  auth,
  db,
  googleProvider,
  isFirebaseConfigured,
  handleFirestoreError,
  OperationType,
} from "./lib/firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";

const getTodayName = () => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date().getDay()];
};

const generateId = (): string => {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

interface Toast {
  id: number;
  message: string;
}

const DEFAULT_STATE: AppState = {
  xp: 0,
  level: 1,
  tasks: [],
  spoonsUsed: 0,
  maxSpoons: 12,
  badges: {
    firstStep: false,
    microMaster: false,
    deepFocus: false,
    energized: false,
    levelUp: false,
  },
};

// Toast copy for badge unlocks, keyed by badge name so every unlock site shows
// the same message (matches the pre-refactor wording exactly).
const BADGE_TOAST_MESSAGES: Record<keyof Badges, string> = {
  firstStep: "🌱 Unlocked Badge: First Step!",
  microMaster: "🧩 Unlocked Badge: Step Weaver!",
  energized: "🔋 Unlocked Badge: Heavy Lifter!",
  deepFocus: "🧘 Unlocked Badge: Deep Diver!",
  levelUp: "🌟 Unlocked Badge: Ascendant!",
};

export default function App() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Auth States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(isFirebaseConfigured);

  // Latest-state ref, used by the Firestore sync effect to seed the profile
  // without relying on a stale closure value.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // 1. Auth Listener
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoadingAuth(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore sync
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !currentUser) {
      // Load offline state from localStorage if not signed in or no Firebase
      const saved = localStorage.getItem("calm_space_state");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setState({
            ...DEFAULT_STATE,
            ...parsed,
            badges: { ...DEFAULT_STATE.badges, ...parsed.badges },
          });
        } catch (e) {
          console.error("Failed to parse saved state", e);
        }
      } else {
        setState(DEFAULT_STATE);
      }
      return;
    }

    const userId = currentUser.uid;

    // Listen to User Profile (XP, Level, Badges)
    const profileRef = doc(db, "users", userId);
    const unsubscribeProfile = onSnapshot(
      profileRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setState((prev) => ({
            ...prev,
            xp: typeof data.xp === "number" ? data.xp : prev.xp,
            level: typeof data.level === "number" ? data.level : prev.level,
            spoonsUsed: typeof data.spoonsUsed === "number" ? data.spoonsUsed : prev.spoonsUsed,
            maxSpoons: typeof data.maxSpoons === "number" ? data.maxSpoons : prev.maxSpoons,
            badges: data.badges ? { ...prev.badges, ...data.badges } : prev.badges,
          }));
        } else {
          // If profile doesn't exist, create one with the latest known state
          // (read via stateRef to avoid the stale closure captured by this effect).
          const latest = stateRef.current;
          const initialProfile = {
            xp: latest.xp,
            level: latest.level,
            spoonsUsed: latest.spoonsUsed,
            maxSpoons: latest.maxSpoons,
            badges: latest.badges,
            updatedAt: new Date().toISOString(),
          };
          setDoc(profileRef, initialProfile).catch((err) => {
            handleFirestoreError(err, OperationType.CREATE, `users/${userId}`);
          });
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `users/${userId}`);
      }
    );

    // Listen to Tasks subcollection
    const tasksRef = collection(db, "users", userId, "tasks");
    const unsubscribeTasks = onSnapshot(
      tasksRef,
      (querySnap) => {
        const fetchedTasks: Task[] = [];
        querySnap.forEach((docSnap) => {
          const data = docSnap.data();
          fetchedTasks.push({
            id: data.id,
            title: data.title,
            spoons: data.spoons,
            subtasks: data.subtasks || [],
            completed: data.completed || false,
            dayOfWeek: data.dayOfWeek,
            priority: data.priority,
            createdAt: data.createdAt,
          });
        });
        // Sort newest first by createdAt
        fetchedTasks.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setState((prev) => ({
          ...prev,
          tasks: fetchedTasks,
        }));
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `users/${userId}/tasks`);
      }
    );

    return () => {
      unsubscribeProfile();
      unsubscribeTasks();
    };
  }, [currentUser]);

  // Save State (Fallback to localStorage)
  const saveState = (newState: AppState) => {
    setState(newState);
    localStorage.setItem("calm_space_state", JSON.stringify(newState));
  };

  // Helper to update profile state in DB or locally
  const updateProfileState = async (updates: Partial<AppState>) => {
    if (currentUser && isFirebaseConfigured && db) {
      const userId = currentUser.uid;
      const profileRef = doc(db, "users", userId);
      try {
        await updateDoc(profileRef, {
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      }
    } else {
      const newState = { ...state, ...updates };
      saveState(newState);
    }
  };

  // Helper to save task document in DB
  const saveTaskToDb = async (task: Task) => {
    if (currentUser && isFirebaseConfigured && db) {
      const userId = currentUser.uid;
      const taskRef = doc(db, "users", userId, "tasks", task.id);
      try {
        await setDoc(taskRef, {
          id: task.id,
          title: task.title,
          spoons: task.spoons,
          completed: task.completed,
          dayOfWeek: task.dayOfWeek || "Unscheduled",
          priority: task.priority || "Medium",
          subtasks: task.subtasks || [],
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${userId}/tasks/${task.id}`);
      }
    }
  };

  // Helper to delete task document in DB
  const deleteTaskFromDb = async (taskId: string) => {
    if (currentUser && isFirebaseConfigured && db) {
      const userId = currentUser.uid;
      const taskRef = doc(db, "users", userId, "tasks", taskId);
      try {
        await deleteDoc(taskRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${userId}/tasks/${taskId}`);
      }
    }
  };

  // Toast Notification Trigger
  const showToast = (message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Auth Operations
  const handleSignIn = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      showToast("Firebase Cloud Setup is pending.");
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
      showToast("Successfully signed in with Google!");
    } catch (error) {
      console.error("Sign-in error:", error);
      showToast("Failed to sign in. Please try again.");
    }
  };

  const handleSignOut = async () => {
    if (!isFirebaseConfigured || !auth) return;
    try {
      await signOut(auth);
      setState(DEFAULT_STATE);
      showToast("Successfully signed out. Switched to offline view.");
    } catch (error) {
      console.error("Sign-out error:", error);
    }
  };

  // Create task
  const handleAddTask = async (
    title: string,
    spoons: number,
    subtasks: string[],
    day?: string,
    priority?: "Low" | "Medium" | "High"
  ) => {
    const mappedSubtasks = subtasks.map((text) => ({ text, completed: false }));
    const taskDay = day || "Unscheduled";
    const newTask: Task = {
      id: generateId(),
      title,
      spoons,
      subtasks: mappedSubtasks,
      completed: false,
      dayOfWeek: taskDay,
      priority: priority || "Medium",
      createdAt: new Date().toISOString(),
    };

    let updatedSpoonsUsed = state.spoonsUsed;
    const todayName = getTodayName();
    if (affectsToday(taskDay, todayName)) {
      updatedSpoonsUsed = addSpoons(updatedSpoonsUsed, spoons);
    }

    let updatedState = {
      ...state,
      tasks: [newTask, ...state.tasks],
      spoonsUsed: updatedSpoonsUsed,
    };

    const xpResult = applyXP(updatedState, 20);
    updatedState = xpResult.state;
    xpResult.levelUps.forEach((lvl) =>
      showToast(`🎉 Level Up! You reached Level ${lvl}!`)
    );
    xpResult.unlockedBadges.forEach((badge) =>
      showToast(BADGE_TOAST_MESSAGES[badge])
    );

    // "Step Weaver" is earned by breaking a task into ≥2 micro-steps at creation.
    const creationBadges = badgesForTaskCreation(
      mappedSubtasks.length,
      updatedState.badges
    );
    updatedState.badges = creationBadges.badges;
    creationBadges.unlocked.forEach((badge) =>
      showToast(BADGE_TOAST_MESSAGES[badge])
    );

    showToast("Goal added to voyage! +20 XP");

    if (currentUser && isFirebaseConfigured && db) {
      await saveTaskToDb(newTask);
      await updateProfileState({
        xp: updatedState.xp,
        level: updatedState.level,
        spoonsUsed: updatedState.spoonsUsed,
        badges: updatedState.badges,
      });
    } else {
      saveState(updatedState);
    }
  };

  // Toggle main task
  const handleToggleTask = async (taskId: string) => {
    const taskIndex = state.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    const task = state.tasks[taskIndex];
    const isNowCompleted = !task.completed;

    const updatedTasks = state.tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          completed: isNowCompleted,
          subtasks: t.subtasks.map((sub) => ({ ...sub, completed: isNowCompleted })),
        };
      }
      return t;
    });

    let updatedSpoonsUsed = state.spoonsUsed;
    let tempState = { ...state, tasks: updatedTasks };

    const todayName = getTodayName();
    const taskAffectsToday = affectsToday(task.dayOfWeek, todayName);

    if (isNowCompleted) {
      if (taskAffectsToday) {
        updatedSpoonsUsed = removeSpoons(state.spoonsUsed, task.spoons);
        tempState.spoonsUsed = updatedSpoonsUsed;
      }

      const xpEarned = 50 + task.spoons * 15;
      const xpResult = applyXP(tempState, xpEarned);
      tempState = xpResult.state;
      xpResult.levelUps.forEach((lvl) =>
        showToast(`🎉 Level Up! You reached Level ${lvl}!`)
      );
      xpResult.unlockedBadges.forEach((badge) =>
        showToast(BADGE_TOAST_MESSAGES[badge])
      );
      showToast(`Goal Completed! +${xpEarned} XP`);

      // Start from the badges returned by applyXP (which may already include
      // `levelUp`), so no unlock is dropped when we persist.
      const completionBadges = badgesForTaskCompletion(task, tempState.badges);
      tempState.badges = completionBadges.badges;
      completionBadges.unlocked.forEach((badge) =>
        showToast(BADGE_TOAST_MESSAGES[badge])
      );
    } else {
      if (taskAffectsToday) {
        updatedSpoonsUsed = addSpoons(state.spoonsUsed, task.spoons);
        tempState.spoonsUsed = updatedSpoonsUsed;
      }
    }

    if (currentUser && isFirebaseConfigured && db) {
      const updatedTask = {
        ...task,
        completed: isNowCompleted,
        subtasks: task.subtasks.map((sub) => ({ ...sub, completed: isNowCompleted })),
      };
      await saveTaskToDb(updatedTask);
      await updateProfileState({
        xp: tempState.xp,
        level: tempState.level,
        spoonsUsed: tempState.spoonsUsed,
        badges: tempState.badges,
      });
    } else {
      saveState(tempState);
    }
  };

  // Toggle subtask
  const handleToggleSubtask = async (taskId: string, subIndex: number) => {
    const parentTask = state.tasks.find((t) => t.id === taskId);
    if (!parentTask) return;

    const updatedTasks = state.tasks.map((t) => {
      if (t.id === taskId) {
        const updatedSubs = t.subtasks.map((sub, idx) => {
          if (idx === subIndex) {
            return { ...sub, completed: !sub.completed };
          }
          return sub;
        });
        return { ...t, subtasks: updatedSubs };
      }
      return t;
    });

    const subtaskCompletedNow = !parentTask.subtasks[subIndex].completed;
    let tempState = { ...state, tasks: updatedTasks };

    if (subtaskCompletedNow) {
      const xpResult = applyXP(tempState, 5);
      tempState = xpResult.state;
      xpResult.levelUps.forEach((lvl) =>
        showToast(`🎉 Level Up! You reached Level ${lvl}!`)
      );
      xpResult.unlockedBadges.forEach((badge) =>
        showToast(BADGE_TOAST_MESSAGES[badge])
      );
      showToast("Micro-step checked! +5 XP");
    }

    if (currentUser && isFirebaseConfigured && db) {
      const updatedTask = updatedTasks.find((t) => t.id === taskId);
      if (updatedTask) {
        await saveTaskToDb(updatedTask);
      }
      await updateProfileState({
        xp: tempState.xp,
        level: tempState.level,
        badges: tempState.badges,
      });
    } else {
      saveState(tempState);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    let updatedSpoonsUsed = state.spoonsUsed;
    const todayName = getTodayName();
    const taskAffectsToday = affectsToday(task.dayOfWeek, todayName);

    if (!task.completed && taskAffectsToday) {
      updatedSpoonsUsed = removeSpoons(state.spoonsUsed, task.spoons);
    }

    const updatedTasks = state.tasks.filter((t) => t.id !== taskId);

    const tempState = {
      ...state,
      tasks: updatedTasks,
      spoonsUsed: updatedSpoonsUsed,
    };

    if (currentUser && isFirebaseConfigured && db) {
      await deleteTaskFromDb(taskId);
      await updateProfileState({
        spoonsUsed: updatedSpoonsUsed,
      });
    } else {
      saveState(tempState);
    }

    showToast("Goal removed from board.");
  };

  // Move task to a different day of the week
  const handleUpdateTaskDay = async (taskId: string, newDay: string) => {
    const todayName = getTodayName();
    let updatedSpoonsUsed = state.spoonsUsed;

    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (!task.completed) {
      const oldContributed = affectsToday(task.dayOfWeek, todayName);
      const newContributes = affectsToday(newDay, todayName);
      if (oldContributed && !newContributes) {
        updatedSpoonsUsed = removeSpoons(updatedSpoonsUsed, task.spoons);
      } else if (!oldContributed && newContributes) {
        updatedSpoonsUsed = addSpoons(updatedSpoonsUsed, task.spoons);
      }
    }

    const updatedTasks = state.tasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, dayOfWeek: newDay };
      }
      return t;
    });

    const tempState = {
      ...state,
      tasks: updatedTasks,
      spoonsUsed: updatedSpoonsUsed,
    };

    if (currentUser && isFirebaseConfigured && db) {
      const updatedTask = { ...task, dayOfWeek: newDay };
      await saveTaskToDb(updatedTask);
      await updateProfileState({
        spoonsUsed: updatedSpoonsUsed,
      });
    } else {
      saveState(tempState);
    }

    showToast(`Goal rescheduled to ${newDay}!`);
  };

  // Timer complete
  const handleTimerComplete = async () => {
    let updatedState = { ...state };
    const xpResult = applyXP(updatedState, FOCUS_SESSION_XP);
    updatedState = xpResult.state;
    xpResult.levelUps.forEach((lvl) =>
      showToast(`🎉 Level Up! You reached Level ${lvl}!`)
    );
    xpResult.unlockedBadges.forEach((badge) =>
      showToast(BADGE_TOAST_MESSAGES[badge])
    );

    if (!updatedState.badges.deepFocus) {
      updatedState.badges = { ...updatedState.badges, deepFocus: true };
      showToast("🧘 Unlocked Badge: Deep Diver!");
    }

    showToast(`🧘 Focus session completed! +${FOCUS_SESSION_XP} XP!`);

    if (currentUser && isFirebaseConfigured && db) {
      await updateProfileState({
        xp: updatedState.xp,
        level: updatedState.level,
        badges: updatedState.badges,
      });
    } else {
      saveState(updatedState);
    }
  };

  // Fresh voyage start
  const handleResetApp = async () => {
    if (currentUser && isFirebaseConfigured && db) {
      const userId = currentUser.uid;
      try {
        // Reset the profile and clear all tasks in a single atomic batch so a
        // mid-way failure can't leave the board half-reset.
        const batch = writeBatch(db);
        batch.set(doc(db, "users", userId), {
          xp: DEFAULT_STATE.xp,
          level: DEFAULT_STATE.level,
          spoonsUsed: DEFAULT_STATE.spoonsUsed,
          maxSpoons: DEFAULT_STATE.maxSpoons,
          badges: DEFAULT_STATE.badges,
          updatedAt: new Date().toISOString(),
        });

        const tasksRef = collection(db, "users", userId, "tasks");
        for (const task of state.tasks) {
          batch.delete(doc(tasksRef, task.id));
        }

        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
      }
    } else {
      saveState(DEFAULT_STATE);
    }
    showToast("⚓ Safe journey! Board reset successfully.");
    setShowResetConfirm(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased px-4 py-6 md:py-10 selection:bg-[#3a7bd5]/20 selection:text-[#0f2042]">
      <div className="max-w-6xl mx-auto">
        {/* Dynamic Interactive Toasts */}
        <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50 pointer-events-none max-w-sm">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="bg-[#0f2042] text-white py-3 px-5 rounded-2xl shadow-lg border border-blue-900/40 flex items-center gap-2.5 pointer-events-auto"
              >
                <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-bold leading-snug">{t.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Level Stats Header */}
        <Header
          level={state.level}
          xp={state.xp}
          currentUser={currentUser}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          loadingAuth={loadingAuth}
          isFirebaseConfigured={isFirebaseConfigured}
        />

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-6">
          <div className="bg-white p-1 rounded-2xl border border-blue-100 flex gap-1 shadow-xs">
            <button
              onClick={() => setActiveTab("daily")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "daily"
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-slate-500 hover:text-blue-900 hover:bg-blue-50/20"
              }`}
            >
              <span>⛵ Daily Voyage</span>
            </button>
            <button
              onClick={() => setActiveTab("weekly")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "weekly"
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-slate-500 hover:text-blue-900 hover:bg-blue-50/20"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>📅 Weekly Horizon</span>
            </button>
          </div>
        </div>

        {/* Main Switchable Workspace */}
        <AnimatePresence mode="wait">
          {activeTab === "daily" ? (
            <motion.div
              key="daily-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              {/* Left Column: Form, Timer, Achievements */}
              <div className="lg:col-span-5 space-y-6">
                <TaskCreator onAddTask={handleAddTask} />
                <FocusTimer onComplete={handleTimerComplete} />
                <BadgeGallery badges={state.badges} />
              </div>

              {/* Right Column: Spoon Budget, Tasks list */}
              <div className="lg:col-span-7 space-y-6">
                <SpoonBudget maxSpoons={state.maxSpoons} spoonsUsed={state.spoonsUsed} />
                <TaskList
                  tasks={state.tasks}
                  onToggleTask={handleToggleTask}
                  onToggleSubtask={handleToggleSubtask}
                  onDeleteTask={handleDeleteTask}
                />

                {/* Profile Utilities */}
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-red-500 hover:bg-red-50/50 py-2 px-4 rounded-xl border border-transparent hover:border-red-100 transition-all cursor-pointer"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" /> Fresh Voyage Start
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="weekly-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <WeeklyCalendar
                tasks={state.tasks}
                onToggleTask={handleToggleTask}
                onToggleSubtask={handleToggleSubtask}
                onDeleteTask={handleDeleteTask}
                onUpdateTaskDay={handleUpdateTaskDay}
                onAddTask={handleAddTask}
              />

              {/* Profile Utilities (Centred) */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-red-500 hover:bg-red-50/50 py-2 px-4 rounded-xl border border-transparent hover:border-red-100 transition-all cursor-pointer"
                >
                  <RefreshCcw className="w-3.5 h-3.5" /> Fresh Voyage Start
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-12 text-center py-6 border-t border-slate-200">
          <p className="text-[11px] text-slate-400 font-medium">
            Designed to support executive functions. Zero pressure, pure pace. Keep navigating.
          </p>
        </footer>

        {/* Reset Confirmation Modal */}
        <AnimatePresence>
          {showResetConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
              onClick={() => setShowResetConfirm(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl border border-blue-100 p-6 max-w-md w-full text-center"
              >
                <h3 className="text-lg font-bold text-[#0f2042] mb-2">
                  Fresh Voyage Start
                </h3>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  Would you like to reset your CalmSpace profile? This resets all
                  tasks, XP, level, and achievements back to baseline, allowing
                  you to start a fresh day!
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetApp}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-all cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
