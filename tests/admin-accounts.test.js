import test from "node:test";
import assert from "node:assert/strict";
import { editLearner, resetLearnerPassword } from "../src/admin-accounts.js";
import { emptyProfile, readStore, updateUser, refreshManagedAccount } from "../src/storage.js";

function setup() {
  const learner = { email: "student@test.local", role: "student", password: { salt: [1], hash: [2] }, profile: emptyProfile("Student", "student@test.local") };
  learner.profile.xp = 35;
  learner.profile.exams = [{ id: "saved-result", earned: 7 }];
  learner.profile.paperDraft = { uploads: { q1: [{ id: "saved-upload" }] } };
  let saved = JSON.stringify({ currentEmail: learner.email, users: [learner, { email: "admin@test.local", role: "admin", profile: emptyProfile("Admin", "admin@test.local") }], content: { questions: [{ id: "custom-question" }], lessons: [] } });
  globalThis.localStorage = { getItem: () => saved, setItem: (_, value) => saved = value };
  return { learner, snapshot: () => saved };
}
const details = { name: "Updated Student", board: "Cambridge IGCSE", target: "A*", examDate: "2027-05-12", confidence: "Good", paperLevel: "Core", goals: ["Prepare for exams"] };

test("admin edits only learner details and leaves results, uploads and content intact", () => {
  const { learner } = setup();
  editLearner(learner.email, { ...details, role: "admin", xp: 999, email: "other@test.local" });
  const saved = readStore(), student = saved.users[0];
  assert.equal(student.email, learner.email);
  assert.equal(student.profile.name, details.name);
  assert.equal(student.role, "student");
  assert.equal(student.profile.xp, 35);
  assert.deepEqual(student.profile.exams, learner.profile.exams);
  assert.deepEqual(student.profile.paperDraft, learner.profile.paperDraft);
  assert.deepEqual(student.password, learner.password);
  assert.equal(saved.content.questions[0].id, "custom-question");
  assert.equal(saved.currentEmail, learner.email);
});

test("invalid edits and password resets leave accounts unchanged", async () => {
  const { learner, snapshot } = setup(), before = snapshot();
  for (const bad of [{ name: " " }, { board: "invalid" }, { examDate: "2027-02-30" }, { paperLevel: "invalid" }, { goals: ["fake"] }]) assert.throws(() => editLearner(learner.email, { ...details, ...bad }));
  assert.throws(() => editLearner("admin@test.local", details));
  assert.throws(() => editLearner("missing@test.local", details));
  const hash = async () => { throw new Error("Must not hash invalid input"); };
  await assert.rejects(resetLearnerPassword(learner.email, "short", "short", hash), /8 characters/);
  await assert.rejects(resetLearnerPassword(learner.email, "longpassword", "different", hash), /do not match/);
  await assert.rejects(resetLearnerPassword("admin@test.local", "longpassword", "longpassword", hash), /no longer available/);
  assert.equal(snapshot(), before);
});

test("password reset preserves concurrent progress and stale tabs cannot restore old credentials or details", async () => {
  const { learner } = setup();
  const staleStore = readStore(), staleStudent = staleStore.users[0];
  const credentials = { salt: [3], hash: [4] };
  await resetLearnerPassword(learner.email, "newpassword", "newpassword", async () => {
    const concurrent = readStore();
    concurrent.users[0].profile.questionsCompleted = 12;
    localStorage.setItem("mathmaster-igcse-v1", JSON.stringify(concurrent));
    return credentials;
  });
  assert.equal(readStore().users[0].profile.questionsCompleted, 12);
  editLearner(learner.email, details);
  staleStudent.profile.xp = 50;
  // This models an open learner tab saving its own latest working state.
  staleStudent.profile.questionsCompleted = 13;
  updateUser(staleStore, staleStudent);
  const latest = readStore().users[0];
  assert.deepEqual(latest.password, credentials);
  assert.equal(latest.profile.name, details.name);
  assert.deepEqual(latest.profile.goals, details.goals);
  assert.equal(latest.profile.xp, 50);
  assert.equal(latest.profile.questionsCompleted, 13);
  assert.deepEqual(latest.profile.paperDraft, learner.profile.paperDraft);
  const freshPassword = { salt: [5], hash: [6] };
  staleStudent.password = freshPassword;
  updateUser(staleStore, staleStudent, { passwordChanged: true });
  assert.deepEqual(readStore().users[0].password, freshPassword);
  const openStudent = JSON.parse(JSON.stringify(learner));
  refreshManagedAccount(openStudent, latest);
  assert.deepEqual(openStudent.password, credentials);
  assert.equal(openStudent.profile.name, details.name);
});
