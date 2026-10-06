import test from 'node:test';
import assert from 'node:assert/strict';
import { readStore, updateUser, emptyProfile } from '../src/storage.js';

test('a stale student tab saves progress without overwriting newly added admin content', () => {
  const learner = { email: 'student@test.local', role: 'student', profile: emptyProfile('Student', 'student@test.local') };
  let saved = JSON.stringify({ currentEmail: learner.email, users: [learner], content: { questions: [], lessons: [] } });
  globalThis.localStorage = { getItem: () => saved, setItem: (_, value) => saved = value };
  const studentStore = readStore(), student = studentStore.users[0];
  const adminStore = readStore();
  adminStore.content.questions.push({ id: 'admin-added', text: 'A new question' });
  adminStore.users.push({ email: 'admin@test.local', role: 'admin' });
  saved = JSON.stringify(adminStore);
  student.profile.xp = 25;
  updateUser(studentStore, student);
  const latest = JSON.parse(saved);
  assert.equal(latest.content.questions[0].id, 'admin-added');
  assert.equal(latest.users.length, 2);
  assert.equal(latest.users[0].profile.xp, 25);
});
