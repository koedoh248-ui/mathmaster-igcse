// Only learning progress changes; account identity and course preferences stay intact.
const defaults = () => ({
  completedLessons: [], questionsCompleted: 0, xp: 0, level: 1,
  streak: 0, lastActive: null, xpLedger: [], attempts: [], mistakes: [],
  exams: [], officialPapers: [], topicScores: {}, dailyChallenges: [],
  diagnosticDone: false, dailyAnswer: null, paperDraft: null,
  recentQuestionTexts: [], studyPlan: null, achievements: []
});
const owner = account => String(account.id || account.email);
const backupKey = account => `mathmaster-progress-reset-v1:${encodeURIComponent(owner(account))}`;
const clone = value => JSON.parse(JSON.stringify(value));
function progress(profile) {
  return Object.fromEntries(Object.entries(defaults()).map(([key, fallback]) => [key, clone(profile[key] ?? fallback)]));
}
export function progressBackup(account, storage = localStorage) {
  try {
    const backup = JSON.parse(storage.getItem(backupKey(account)) || 'null');
    if (backup?.owner !== owner(account) || !backup.progress) return null;
    for (const [key, fallback] of Object.entries(defaults())) {
      const value = backup.progress[key];
      if (Array.isArray(fallback) ? !Array.isArray(value) : fallback !== null && typeof value !== typeof fallback) return null;
    }
    return backup;
  } catch { return null; }
}
export function resetLearningProgress(account, storage = localStorage) {
  if (!account?.profile || account.role === 'admin') throw new Error('Only a learner can reset their progress.');
  // Save the undo copy first. If browser storage is full, the reset must not run.
  const backup = { owner: owner(account), progress: progress(account.profile) };
  storage.setItem(backupKey(account), JSON.stringify(backup));
  Object.assign(account.profile, defaults());
}
export function restoreLearningProgress(account, storage = localStorage) {
  if (!account?.profile || account.role === 'admin') throw new Error('Only a learner can restore their progress.');
  const backup = progressBackup(account, storage);
  if (!backup) throw new Error('No previous progress is available in this browser.');
  Object.assign(account.profile, progress(backup.progress));
}
export function clearProgressBackup(account, storage = localStorage) {
  storage.setItem(backupKey(account), 'null');
}
