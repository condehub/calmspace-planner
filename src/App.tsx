import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Header } from "./components/Header";
import { TaskCreator } from "./components/TaskCreator";
import { TaskList } from "./components/TaskList";
import { SpoonBudget } from "./components/SpoonBudget";
import { FocusTimer } from "./components/FocusTimer";
import { BadgeGallery } from "./components/BadgeGallery";
import { WeeklyCalendar } from "./components/WeeklyCalendar";
import { Task, AppState } from "./types";
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
} from "firebase/firestore";

const getTodayName = () => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date().getDay()];
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

export default function App() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");

  // Auth States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(isFirebaseConfigured);

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
          // If profile doesn't exist, create one with the current active state
          const initialProfile = {
            xp: state.xp,
            level: state.level,
            spoonsUsed: state.spoonsUsed,
            maxSpoons: state.maxSpoons,
            badges: state.badges,
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
          });
        });
        // Sort newest first
        fetchedTasks.sort((a, b) => b.id - a.id);
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
      const taskRef = doc(db, "users", userId, "tasks", String(task.id));
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
  const deleteTaskFromDb = async (taskId: number) => {
    if (currentUser && isFirebaseConfigured && db) {
      const userId = currentUser.uid;
      const taskRef = doc(db, "users", userId, "tasks", String(taskId));
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

  // XP progression system
  const addXP = (amount: number, currentState: AppState) => {
    let newXP = currentState.xp + amount;
    let newLevel = currentState.level;
    let xpNeeded = newLevel * 100;
    let upgradedBadges = { ...currentState.badges };

    while (newXP >= xpNeeded) {
      newXP -= xpNeeded;
      newLevel++;
      xpNeeded = newLevel * 100;
      showToast(`🎉 Level Up! You reached Level ${newLevel}!`);

      if (newLevel >= 2 && !upgradedBadges.levelUp) {
        upgradedBadges.levelUp = true;
        showToast("🌟 Unlocked Badge: Ascendant!");
      }
    }

    return {
      ...currentState,
      xp: newXP,
      level: newLevel,
      badges: upgradedBadges,
    };
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
      id: Date.now(),
      title,
      spoons,
      subtasks: mappedSubtasks,
      completed: false,
      dayOfWeek: taskDay,
      priority: priority || "Medium",
    };

    let updatedSpoonsUsed = state.spoonsUsed;
    const todayName = getTodayName();
    if (taskDay === "Unscheduled" || taskDay === todayName) {
      updatedSpoonsUsed += spoons;
    }

    let updatedState = {
      ...state,
      tasks: [newTask, ...state.tasks],
      spoonsUsed: updatedSpoonsUsed,
    };

    updatedState = addXP(20, updatedState);
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
  const handleToggleTask = async (taskId: number) => {
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
    let upgradedBadges = { ...state.badges };
    let tempState = { ...state, tasks: updatedTasks };

    const todayName = getTodayName();
    const taskDay = task.dayOfWeek || "Unscheduled";
    const affectsToday = taskDay === "Unscheduled" || taskDay === todayName;

    if (isNowCompleted) {
      if (affectsToday) {
        updatedSpoonsUsed = Math.max(0, state.spoonsUsed - task.spoons);
        tempState.spoonsUsed = updatedSpoonsUsed;
      }

      const xpEarned = 50 + task.spoons * 15;
      tempState = addXP(xpEarned, tempState);
      showToast(`Goal Completed! +${xpEarned} XP`);

      if (!upgradedBadges.firstStep) {
        upgradedBadges.firstStep = true;
        showToast("🌱 Unlocked Badge: First Step!");
      }
      if (task.subtasks.length >= 2 && !upgradedBadges.microMaster) {
        upgradedBadges.microMaster = true;
        showToast("🧩 Unlocked Badge: Step Weaver!");
      }
      if (task.spoons === 3 && !upgradedBadges.energized) {
        upgradedBadges.energized = true;
        showToast("🔋 Unlocked Badge: Heavy Lifter!");
      }

      tempState.badges = upgradedBadges;
    } else {
      if (affectsToday) {
        updatedSpoonsUsed = state.spoonsUsed + task.spoons;
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
  const handleToggleSubtask = async (taskId: number, subIndex: number) => {
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
      tempState = addXP(5, tempState);
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
  const handleDeleteTask = async (taskId: number) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    let updatedSpoonsUsed = state.spoonsUsed;
    const todayName = getTodayName();
    const taskDay = task.dayOfWeek || "Unscheduled";
    const affectsToday = taskDay === "Unscheduled" || taskDay === todayName;

    if (!task.completed && affectsToday) {
      updatedSpoonsUsed = Math.max(0, state.spoonsUsed - task.spoons);
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
  const handleUpdateTaskDay = async (taskId: number, newDay: string) => {
    const todayName = getTodayName();
    let updatedSpoonsUsed = state.spoonsUsed;

    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const oldDay = task.dayOfWeek || "Unscheduled";
    if (!task.completed) {
      const oldContributed = oldDay === "Unscheduled" || oldDay === todayName;
      const newContributes = newDay === "Unscheduled" || newDay === todayName;
      if (oldContributed && !newContributes) {
        updatedSpoonsUsed = Math.max(0, updatedSpoonsUsed - task.spoons);
      } else if (!oldContributed && newContributes) {
        updatedSpoonsUsed = updatedSpoonsUsed + task.spoons;
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
    updatedState = addXP(100, updatedState);

    if (!updatedState.badges.deepFocus) {
      updatedState.badges.deepFocus = true;
      showToast("🧘 Unlocked Badge: Deep Diver!");
    }

    showToast("🧘 Focus session completed! +100 XP!");

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
    if (
      window.confirm(
        "Would you like to reset your CalmSpace profile? This resets all tasks, XP, level, and achievements back to baseline, allowing you to start a fresh day!"
      )
    ) {
      if (currentUser && isFirebaseConfigured && db) {
        const userId = currentUser.uid;
        try {
          const profileRef = doc(db, "users", userId);
          await setDoc(profileRef, {
            xp: DEFAULT_STATE.xp,
            level: DEFAULT_STATE.level,
            spoonsUsed: DEFAULT_STATE.spoonsUsed,
            maxSpoons: DEFAULT_STATE.maxSpoons,
            badges: DEFAULT_STATE.badges,
            updatedAt: new Date().toISOString(),
          });

          for (const task of state.tasks) {
            await deleteDoc(doc(db, "users", userId, "tasks", String(task.id)));
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
        }
      } else {
        saveState(DEFAULT_STATE);
      }
      showToast("⚓ Safe journey! Board reset successfully.");
    }
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
                    onClick={handleResetApp}
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
                  onClick={handleResetApp}
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
      </div>
    </div>
  );
}
