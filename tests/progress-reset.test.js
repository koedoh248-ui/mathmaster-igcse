import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProfile } from '../src/storage.js';
import { resetLearningProgress, restoreLearningProgress, progressBackup, clearProgressBackup } from '../src/progress-reset.js';
const memoryStorage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
const learner = email => ({ id: email, email, role: 'learner', password: { hash: [1, 2] }, profile: {
  ...emptyProfile('Alex', email), board: 'Edexcel International GCSE', target: 'A*', goals: ['Prepare for exams'], confidence: 'Good',
  paperLevel: 'Core', studentGuide: { completed: true }, xp: 800, level: 4, questionsCompleted: 40,
  completedLessons: ['lesson-1'], mistakes: [{ id: 'question-1' }], topicScores: { Number: 80 },
  diagnosticDone: true, streak: 7, lastActive: '2026-10-11', xpLedger: [{ xp: 800 }],
  exams: [{ review: [{ files: [{ id: 'file-1' }] }] }], officialPapers: [{ id: 'paper-1' }],
  paperDraft: { answers: ['42'] }, studyPlan: { days: 4 }, achievements: ['first-ten'], dailyChallenges: ['2026-10-11'], recentQuestionTexts: ['test']
} });
test('reset clears all learning records, preserves identity/preferences, and restores uploaded-work references on undo', () => {
  const storage = memoryStorage(), account = learner('learner@example.local'), original = structuredClone(account);
  resetLearningProgress(account, storage);
  assert.equal(account.profile.level, 1); assert.equal(account.profile.xp, 0);
  assert.equal(account.profile.questionsCompleted, 0); assert.equal(account.profile.streak, 0);
  for (const key of ['completedLessons','attempts','exams','officialPapers','mistakes','achievements','dailyChallenges','recentQuestionTexts','xpLedger']) assert.deepEqual(account.profile[key], []);
  assert.deepEqual(account.profile.topicScores, {}); assert.equal(account.profile.diagnosticDone, false);
  assert.equal(account.profile.paperDraft, null); assert.equal(account.profile.studyPlan, null);
  for (const key of ['name','email','board','target','goals','confidence','paperLevel','studentGuide']) assert.deepEqual(account.profile[key], original.profile[key]);
  assert.equal(account.id, original.id); assert.deepEqual(account.password, original.password);
  assert.ok(progressBackup(account, storage));
  account.profile.name = 'Updated name';
  restoreLearningProgress(account, storage);
  assert.equal(account.profile.xp, 800); assert.equal(account.profile.level, 4);
  assert.deepEqual(account.profile.exams, original.profile.exams);
  assert.deepEqual(account.profile.officialPapers, original.profile.officialPapers);
  assert.equal(account.profile.name, 'Updated name', 'undo must not revert account edits');
  clearProgressBackup(account, storage); assert.equal(progressBackup(account, storage), null);
});
test('reset refuses to discard progress if the undo copy cannot be saved', () => {
  const account = learner('learner@example.local'), original = structuredClone(account);
  assert.throws(() => resetLearningProgress(account, { setItem() { throw new Error('Storage full'); } }), /Storage full/);
  assert.deepEqual(account, original);
});
test('undo is isolated by account and rejects damaged backups and administrator accounts', () => {
  const storage = memoryStorage(), account = learner('one@example.local'), other = learner('two@example.local');
  resetLearningProgress(account, storage);
  assert.equal(progressBackup(other, storage), null);
  assert.throws(() => restoreLearningProgress(other, storage), /No previous progress/);
  const admin = { ...account, role: 'admin' };
  assert.throws(() => resetLearningProgress(admin, storage), /Only a learner/);
  assert.throws(() => restoreLearningProgress(admin, storage), /Only a learner/);
  assert.equal(progressBackup(account, {getItem: () => '{invalid json'}), null);
});
