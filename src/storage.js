import { localDateKey, dayGap } from "./local-time.js";
const KEY = "mathmaster-igcse-v1";
const today = localDateKey;

export function readStore() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { users: Array.isArray(stored.users) ? stored.users : [], currentEmail: stored.currentEmail || null, content: stored.content || { questions: [], lessons: [] } };
  } catch (error) {
    console.error("Could not read saved MathMaster data.", error);
    return { users: [], currentEmail: null, content: { questions: [], lessons: [] } };
  }
}

export function writeStore(store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch (error) {
    console.error("Could not save MathMaster data.", error);
    throw new Error("Your browser could not save this change. Check available storage space and try again.");
  }
}

export function emptyProfile(name, email, board = "Cambridge IGCSE", target = "A", examDate = "") {
  return {
    name, email, board, target, examDate, confidence: "Average", goals: ["Improve my grade"],
    completedLessons: [], questionsCompleted: 0, xp: 0, streak: 0, lastActive: null,
    attempts: [], mistakes: [], exams: [], topicScores: {}, dailyChallenges: [], studyPlan: null, xpLedger: [],
    achievements: [], hideLeaderboard: false, level: 1,
  };
}

export function activeUser(store) {
  return store.users.find(user => user.email === store.currentEmail) || null;
}

export const managedProfileFields = ["name", "board", "target", "examDate", "goals", "confidence", "paperLevel"];

export function refreshManagedAccount(account, latest, { passwordChanged = false } = {}) {
  if (!latest) return;
  if (!passwordChanged) account.password = latest.password;
  if ((latest.managedProfileRevision || 0) > (account.managedProfileRevision || 0)) {
    for (const field of managedProfileFields) account.profile[field] = latest.profile[field];
    account.managedProfileRevision = latest.managedProfileRevision;
  }
}

export function updateUser(store, user, options = {}) {
  // A student progress save must preserve content changed in the admin tab.
  const latest = readStore();
  store.users = latest.users;
  store.content = latest.content;
  store.currentEmail = latest.currentEmail;
  const index = store.users.findIndex(item => item.email === user.email);
  if (index >= 0) { refreshManagedAccount(user, store.users[index], options); store.users[index] = user; }
  else store.users.push(user);
  writeStore(store);
}

export function recordActivity(user, xp = 0) {
  const date = today();
  if (user.profile.lastActive !== date) {
    const gap = dayGap(user.profile.lastActive, date);
    user.profile.streak = gap === 1 ? Math.max(0, Number(user.profile.streak) || 0) + 1 : 1;
    user.profile.lastActive = date;
  }
  user.profile.xp += xp;
  if (xp > 0) {
    user.profile.xpLedger ||= [];
    user.profile.xpLedger.push({ date, xp });
  }
  user.profile.level = Math.floor(user.profile.xp / 250) + 1;
}

export function todayKey() {
  return today();
}
