import { markSchemeIndex } from "../src/mark-scheme-index.js";
import { memoryIndexedDB } from "./support/memory-indexeddb.js";
import { readWorkFile } from "../src/work-uploads.js";
import { buildWorkingRubric } from "../src/working-review.js";
import test from "node:test";
import assert from "node:assert/strict";
import { emptyProfile } from "../src/storage.js";
import { buildIGCSEPaper } from "../src/exam-content.js";
const rng = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// Exercise the real app event handlers with a minimal DOM and device-local store.
test("paper navigation preserves multipart answers and working, and results can be reviewed and retried", async () => {
  const listeners = {}, originalRandom = Math.random;
  const originalInterval = globalThis.setInterval, originalTimeout = globalThis.setTimeout;
  const originalFormData = globalThis.FormData;
  let saved = JSON.stringify({ currentEmail: "test@example.local", users: [{ email: "test@example.local", role: "learner", profile: emptyProfile("Test Learner", "test@example.local") }], content: { questions: [], lessons: [] } });
  const portalSessions = new Map();
  let html = "", adminHtml = "", inputs = [], working = null;
  const adminPanel = { set innerHTML(value) { adminHtml = value; } };
  const decode = text => text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const app = { addEventListener(name, handler) { listeners[name] = handler; },
    get innerHTML() { return html; },
    set innerHTML(value) {
      html = value;
      inputs = [...html.matchAll(/<input data-exam-part="(\d+)"[^>]*value="([^"]*)"/g)].map(match => ({ dataset: { examPart: match[1] }, value: decode(match[2]) }));
      const match = html.match(/<textarea id="exam-working"[^>]*>([\s\S]*?)<\/textarea>/);
      working = match ? { value: decode(match[1]) } : null;
    },
  };
  Object.assign(globalThis, {
    window: { addEventListener() {}, scrollTo() {} },
    location: { hash: "", protocol: "file:" },
    localStorage: { getItem: key => key === "mathmaster-igcse-v1" ? saved : portalSessions.get(key) ?? null, setItem: (key, value) => { if (key === "mathmaster-igcse-v1") saved = value; else portalSessions.set(key, value); } },
    document: {
      querySelector: selector => selector === "#app" ? app : selector === "#exam-working" ? working : selector === "#admin-panel" ? adminPanel : null,
      querySelectorAll: selector => selector === "[data-exam-part]" ? inputs : [],
      createElement: () => ({ remove() {} }), body: { append() {} },
    },
  });
  if (!globalThis.navigator) globalThis.navigator = {};
  globalThis.setInterval = () => 0;
  globalThis.setTimeout = () => 0;
  const click = async dataset => {
    const target = { dataset, matches: () => false, hasAttribute: () => false, closest() { return this; } };
    await listeners.click({ target, preventDefault() {} });
  };
  try {
    await import("../src/app.js");
    await click({ route: "Past Papers" });
    assert.match(html, /Open official papers/);
    assert.match(html, /data-start-exam="paper:2"/);
    listeners.change({ target: { id: "paper-level", value: "Core", dataset: {}, hasAttribute: () => false } });
    assert.match(html, /data-start-exam="paper:1"/);
    assert.doesNotMatch(html, /data-start-exam="paper:2"/);
    assert.equal(JSON.parse(saved).users[0].profile.paperLevel, "Core");

    const expected = buildIGCSEPaper(1, rng(8));
    Math.random = rng(8);
    await click({ startExam: "paper:1" });
    Math.random = originalRandom;
    assert.match(html, /80 marks/);
    assert.match(html, /Do not use a calculator/);
    assert.equal(inputs.length, 2);
    inputs[0].value = expected.questions[0].parts[0].answer;
    inputs[1].value = "incorrect";
    working.value = "My saved calculation <step>";
    await click({ examNav: "1" });
    await click({ examNav: "-1" });
    assert.equal(inputs[0].value, expected.questions[0].parts[0].answer);
    assert.equal(inputs[1].value, "incorrect");
    assert.equal(working.value, "My saved calculation <step>");
    await click({ action: "exam-submit" });
    assert.match(html, /1 of 16 answered/);
    await click({ action: "exam-final-submit" });
    assert.match(html, /2 \/ 80<\/strong>/);
    assert.match(html, /Final-answer practice score/);
    assert.match(html, /Review your paper/);
    assert.match(html, /My saved calculation &lt;step&gt;/);
    const profile = JSON.parse(saved).users[0].profile;
    assert.equal(profile.exams[0].title, expected.title);
    assert.equal(profile.mistakes[0].type, "multipart");
    await click({ action: "review-mistakes" });
    await click({ practiseId: profile.mistakes[0].id, mistakeIndex: "0" });
    assert.match(html, /name="part-0"/);
    assert.match(html, /name="part-1"/);
    const retry = profile.mistakes[0];
    globalThis.FormData = class { constructor(form) { this.values = form.values; } get(name) { return this.values[name]; } };
    await listeners.submit({ preventDefault() {}, target: { id: "practice-answer-form", values: { "part-0": retry.parts[0].answer, "part-1": retry.parts[1].answer } } });
    assert.match(html, /Correct! \+10 XP/);
    assert.ok(JSON.parse(saved).users[0].profile.mistakes.some(item => item.id === retry.id && item.improved));

    // Paper mode removes the answer blanks and persists uploaded evidence and review decisions.
    globalThis.indexedDB = memoryIndexedDB();
    await click({ route: "Exams" });
    await listeners.change({ target: { id: "test-answer-mode", value: "upload", dataset: {}, hasAttribute: () => false } });
    await click({ startExam: "paper:1" });
    assert.equal(inputs.length, 0);
    assert.match(html, /Attach your working/);
    const png = Object.assign(new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])], { type: "image/png" }), { name: "my-working.png" });
    await listeners.change({ target: { dataset: { workingUpload: "exam", workingQuestion: "0" }, files: [png], hasAttribute: () => false } });
    const draft = JSON.parse(saved).users[0].profile.paperDraft;
    const attachments = draft.uploads[draft.questions[0].id];
    assert.equal(attachments.length, 1);
    assert.equal((await readWorkFile("test@example.local", attachments[0].id)).size, png.size);
    assert.match(html, /my-working.png/);
    await click({ examNav: "1" });
    await click({ examNav: "-1" });
    assert.match(html, /my-working.png/);
    await click({ action: "exam-submit" });
    assert.match(html, /1 of 16 questions with working attached/);
    await click({ action: "exam-final-submit" });
    let paperRecord = JSON.parse(saved).users[0].profile.exams[0];
    const paperId = paperRecord.id;
    assert.equal(paperRecord.percentage, null);
    assert.equal(paperRecord.status, "pending-review");
    assert.equal(JSON.parse(saved).users[0].profile.paperDraft, null);
    assert.match(html, /does not read handwriting automatically/);
    assert.match(html, /my-working.png/);
    const firstPart = paperRecord.review.review[0].question.parts[0];
    assert.match(html, /Check this answer & alternative working/);
    await listeners.submit({ preventDefault() {}, target: { id:"typed-marking-form-0-0", values: { answer:firstPart.answer, working:"1+1=2" } } });
    const assisted = JSON.parse(saved).users[0].profile.exams[0].review.review[0].assisted[0];
    assert.equal(assisted.assessment.answer.status,"equivalent");
    assert.equal(JSON.parse(saved).users[0].profile.exams[0].percentage,null,"assistance does not invent a full paper score");
    for (const [i, criterion] of buildWorkingRubric(firstPart).entries()) {
      await listeners.change({ target: { dataset: { methodCriterion: criterion.id, methodQuestion: "0", methodPart: "0" }, value: i === 0 ? "earned" : "not-earned", hasAttribute: () => false } });
    }
    paperRecord = JSON.parse(saved).users[0].profile.exams[0];
    assert.equal(paperRecord.reviewedParts, 1);
    assert.equal(paperRecord.earned, 1);
    assert.equal(paperRecord.percentage, null);
    assert.match(html, /partial credit/);
    await listeners.change({ target: { dataset: { reviewNote: "0", reviewPart: "0" }, value: "Good method; check the arithmetic.", hasAttribute: () => false } });
    await click({ action: "finish-exam" });
    await click({ route: "Exams" });
    assert.match(html, /Pending review/);
    await click({ openWorkingReview: paperId });
    assert.match(html, /Good method; check the arithmetic./);
    assert.match(html, /my-working.png/);
    for (const [qi, item] of paperRecord.review.review.entries()) {
      for (const [pi, part] of item.question.parts.entries()) {
        for (const criterion of buildWorkingRubric(part)) {
          if (qi === 0 && pi === 0) continue;
          await listeners.change({ target: { dataset: { methodCriterion: criterion.id, methodQuestion: String(qi), methodPart: String(pi) }, value: "not-earned", hasAttribute: () => false } });
        }
      }
    }
    paperRecord = JSON.parse(saved).users[0].profile.exams[0];
    assert.equal(paperRecord.status, "reviewed");
    assert.equal(paperRecord.earned, 1);
    assert.equal(paperRecord.percentage, 1);
    const questionCount = JSON.parse(saved).users[0].profile.questionsCompleted;
    await listeners.change({ target: { id: "working-reviewer", value: "teacher", dataset: {}, hasAttribute: () => false } });
    assert.equal(JSON.parse(saved).users[0].profile.questionsCompleted, questionCount);
    assert.equal(JSON.parse(saved).users[0].profile.exams[0].reviewer, "teacher");

    // Expanded collections render bounded pages, reset on filters, and remain searchable.
    await click({ route: "Question Bank" });
    assert.equal((html.match(/class="bank-item"/g) || []).length, 30);
    assert.match(html, /Showing 1–30 of 4,096/);
    await click({ bankPage: "2" });
    assert.match(html, /Showing 31–60 of 4,096/);
    listeners.change({ target: { dataset: { filter: "level" }, value: "Core", hasAttribute: () => false } });
    assert.match(html, /Showing 1–30 of 2,048/);
    await listeners.submit({ preventDefault() {}, target: { id: "bank-search", values: { query: "fractions" } } });
    assert.match(html, /Adding fractions|Dividing fractions/);
    assert.doesNotMatch(html, /Showing 31–60/);
    await click({ action: "bank-reset" });
    assert.match(html, /Showing 1–30 of 4,096/);
    await click({ practiseId: "expanded-extended-algebra-0" });
    assert.match(html, /id="practice-answer-form"/);
    assert.doesNotMatch(html, /data-action="check-choice"/);


    // Choose a real archived paper, upload working, review its marks and reopen it.
    await click({ route: "Exams" });
    assert.match(html, /Choose your past paper/);
    assert.match(html, /487 papers/);
    await listeners.change({ target: { dataset: { pastFilter: "year" }, value: "2025", hasAttribute: () => false } });
    await listeners.change({ target: { dataset: { pastFilter: "session" }, value: "s", hasAttribute: () => false } });
    await listeners.change({ target: { dataset: { pastFilter: "paper" }, value: "2", hasAttribute: () => false } });
    await listeners.change({ target: { dataset: { pastFilter: "variant" }, value: "2", hasAttribute: () => false } });
    assert.match(html, /1 papers/);
    assert.match(html, /0580_s25_qp_22.pdf/);
    assert.match(html, /0580_s25_ms_22.pdf/);
    await click({ pastStart: "0580-s25-22" });
    assert.match(html, /Get your paper ready/);
    await listeners.submit({ preventDefault() {}, target: { id: "past-paper-setup", values: { minutes: "120", totalMarks: "100" } } });
    let official = JSON.parse(saved).users[0].profile.officialPapers[0];
    const officialId = official.id;
    assert.equal(official.paperId, "0580-s25-22");
    assert.equal(official.status, "in-progress");
    assert.match(html, /data-working-upload="official"/);
    assert.doesNotMatch(html, /data-exam-part/);
    await listeners.change({ target: { dataset: { workingUpload: "official", workingQuestion: "0" }, files: [png], hasAttribute: () => false } });
    official = JSON.parse(saved).users[0].profile.officialPapers[0];
    assert.equal(official.files.length, 1);
    assert.equal((await readWorkFile("test@example.local", official.files[0].id)).size, png.size);
    await click({ action: "past-paper-submit" });
    assert.match(html, /Submitted · ready for review/);
    assert.match(html, /Check typed answers against this scheme/);
    const scheme = markSchemeIndex[official.paperId];
    const reference = scheme.rows.find(row=>row.numericAnswer!==undefined) || scheme.rows[0];
    const finalAnswer = scheme.status === "verified-index" && reference.numericAnswer!==undefined ? reference.numericAnswer : "0.5";
    await listeners.submit({ preventDefault() {}, target: { id:"official-assistant-form", values: { label:reference.label, expected:finalAnswer, answer:finalAnswer, working:"1+1=2", confirmed:"on" } } });
    let checkedOfficial = JSON.parse(saved).users[0].profile.officialPapers[0];
    assert.equal(checkedOfficial.assisted.assessment.answer.status,"equivalent");
    assert.equal(checkedOfficial.status,"pending-review");
    assert.ok(checkedOfficial.rows.every(row=>row.earned===""));
    listeners.input({ target: { dataset:{officialCheckField:"answer"}, value:"wrong", hasAttribute:()=>false } });
    checkedOfficial = JSON.parse(saved).users[0].profile.officialPapers[0];
    assert.equal(checkedOfficial.assisted.assessment,undefined,"editing invalidates the old suggestion");
    await click({ action: "past-paper-finalise" });
    assert.equal(JSON.parse(saved).users[0].profile.officialPapers[0].status, "pending-review");
    const officialInput = (row, field, value) => listeners.input({ target: { dataset: { pastRow: String(row), pastField: field }, value, hasAttribute: () => false } });
    officialInput(0, "label", "Q1(a)"); officialInput(0, "maximum", "2"); officialInput(0, "earned", "1");
    officialInput(0, "feedback", "Valid method; check subtraction.");
    let remainingEarned = 70;
    for (let row = 1; row < official.rows.length; row++) {
      const award = Math.min(remainingEarned, Number(official.rows[row].maximum));
      officialInput(row, "earned", String(award));
      remainingEarned -= award;
    }
    assert.equal(remainingEarned, 0);
    await listeners.change({ target: { dataset: {}, value: "teacher", hasAttribute: name => name === "data-past-reviewer" } });
    await click({ action: "past-paper-finalise" });
    official = JSON.parse(saved).users[0].profile.officialPapers[0];
    assert.equal(official.status, "reviewed"); assert.equal(official.percentage, 71); assert.equal(official.earned, 71);
    assert.equal(official.reviewer, "teacher");
    await click({ route: "Past Papers" });
    assert.match(html, /71\/100 marks · 71%/);
    await click({ pastResume: officialId });
    assert.match(html, /Valid method; check subtraction/);
    assert.match(html, /my-working.png/);
    officialInput(0, "earned", "");
    assert.equal(JSON.parse(saved).users[0].profile.officialPapers[0].status, "pending-review");
    assert.equal(JSON.parse(saved).users[0].profile.officialPapers[0].percentage, undefined);
    await click({ removeWorking: official.files[0].id, workingContext: "official", workingQuestion: "0" });
    assert.equal(JSON.parse(saved).users[0].profile.officialPapers[0].files.length, 0);

    // Expiry also applies after navigating away and returning; it never awards a zero score.
    await click({ pastStart: "0580-w02-1" });
    await listeners.submit({ preventDefault() {}, target: { id: "past-paper-setup", values: { minutes: "60", totalMarks: "56" } } });
    const oldPaperId = JSON.parse(saved).users[0].profile.officialPapers[0].id;
    await click({ route: "Exams" });
    const realNow = Date.now;
    try {
      const future = realNow() + 61 * 60000; Date.now = () => future;
      await click({ pastResume: oldPaperId });
      const expired = JSON.parse(saved).users[0].profile.officialPapers[0];
      assert.equal(expired.status, "pending-review"); assert.equal(expired.percentage, undefined);
    } finally { Date.now = realNow; }

    // Real Paper 2 / Paper 4 selectors open the selected official archive, not a generated mock.
    await click({ route: "Exams" });
    await listeners.change({ target: { id: "paper-level", value: "Extended", dataset: {}, hasAttribute: () => false } });
    assert.match(html, /data-real-paper-number="2"/);
    assert.match(html, /data-real-paper-number="4"/);
    await click({ realPaperNumber: "2" });
    assert.match(html, /REAL PAST PAPER/);
    assert.match(html, /Get your paper ready/);
    await click({ realPaperNumber: "4" });
    assert.match(html, /0580\/4[123]/);

    // A complete real paper supports saved typed working and untimed practice.
    await click({ pastStart: "0580-s25-22" });
    assert.match(html, /src="https:\/\/pastpapers.papacambridge.com[^" ]+0580_s25_qp_22.pdf#toolbar/);
    await listeners.submit({ preventDefault() {}, target: { id: "past-paper-setup", values: { minutes: "120", totalMarks: "100", mode: "practice" } } });
    let practicePaper = JSON.parse(saved).users[0].profile.officialPapers[0];
    assert.equal(practicePaper.mode, "practice");
    assert.match(html, /Untimed practice/);
    const practiceId = practicePaper.id;
    listeners.input({ target: { dataset: { pastAnswer: "0", answerField: "working" }, value: "My calculation <step>", hasAttribute: () => false } });

    await listeners.change({ target: { dataset: { pastAnswer: "0", answerField: "completed" }, checked: true, hasAttribute: () => false } });
    await click({ officialQuestion: "1" });
    listeners.input({ target: { dataset: { pastAnswer: "1", answerField: "working" }, value: "Second answer", hasAttribute: () => false } });
    const nowBeforePracticeResume = Date.now;
    try {
      Date.now = () => nowBeforePracticeResume() + 5 * 60 * 60000;
      await click({ route: "Past Papers" });
      await click({ pastResume: practiceId });
      assert.equal(JSON.parse(saved).users[0].profile.officialPapers[0].status, "in-progress");
      assert.match(html, /Second answer/);
      await click({ officialQuestion: "0" });
      assert.match(html, /My calculation &lt;step&gt;/);
      assert.match(html, /1\/24 marked done/);
      await click({ officialFlag: "0" });
      assert.match(html, /Unflag question/);
    } finally { Date.now = nowBeforePracticeResume; }
    await click({ action: "past-paper-submit" });
    practicePaper = JSON.parse(saved).users[0].profile.officialPapers[0];
    assert.equal(practicePaper.rows.length, 24);
    assert.deepEqual(practicePaper.rows.slice(0, 2).map(row => row.label), ["Q1", "Q2"]);
    assert.equal(practicePaper.rows.reduce((total, row) => total + Number(row.maximum), 0), 100);
    assert.match(html, /View the matching Cambridge mark scheme/);
    assert.match(html, /0580_s25_ms_22.pdf#toolbar/);

    // Saving the study rhythm reveals a complete calendar; settings and sessions remain editable.
    await click({ route: "Study Plan" });
    assert.match(html, /Suggested schedule/);
    assert.match(html, /id="study-plan-form"/);
    assert.equal((html.match(/data-study-date="/g) || []).length, 42);
    await listeners.submit({ preventDefault() {}, target: { id: "study-plan-form", values: { days: "4", minutes: "45", target: "A*", examDate: "2027-06-01", startTime: "17:15" } } });
    assert.doesNotMatch(html, /id="study-plan-form"|MAKE IT YOURS/);
    assert.match(html, /Your schedule/);
    assert.match(html, /Weekly timetable/);
    assert.match(html, /17:15–18:00/);
    assert.equal(JSON.parse(saved).users[0].profile.studyPlan.days, 4);
    await click({ studyAction: "edit-settings" });
    assert.match(html, /id="study-plan-form"/);
    await click({ studyAction: "cancel-settings" });
    assert.doesNotMatch(html, /id="study-plan-form"/);
    await click({ studyDate: "2026-10-05" });
    assert.match(html, /id="study-session-form"/);
    await listeners.submit({ preventDefault() {}, target: { id: "study-session-form", values: { activity: "Past Paper 4", startTime: "19:00", minutes: "90", scope: "date" } } });
    assert.equal(JSON.parse(saved).users[0].profile.studyPlan.overrides["2026-10-05"].activity, "Past Paper 4");
    await click({ studyDate: "2026-10-05" });
    await click({ studyAction: "complete-session" });
    assert.equal(JSON.parse(saved).users[0].profile.studyPlan.completions["2026-10-05"], true);
    await click({ studyAction: "restore-session" });
    assert.equal(JSON.parse(saved).users[0].profile.studyPlan.overrides["2026-10-05"], undefined);
    await listeners.submit({ preventDefault() {}, target: { id: "study-session-form", values: { activity: "Geometry revision", startTime: "18:00", minutes: "60", scope: "weekday" } } });
    assert.equal(JSON.parse(saved).users[0].profile.studyPlan.weeklySessions[0].activity, "Geometry revision");
    await click({ studyMonth: "1" });
    assert.equal((html.match(/data-study-date="/g) || []).length, 42);
    await click({ route: "Home" }); await click({ route: "Study Plan" });
    assert.doesNotMatch(html, /id="study-plan-form"/);
    assert.match(html, /Geometry revision/);

    // Student routes and forged management actions cannot enter the admin area.
    await click({ route: "Admin" });
    assert.doesNotMatch(html, /id="admin-panel"|data-admin-tab/);
    assert.match(html, /href="#Learn"/);
    await click({ adminTab: "create" });
    const questionTotal = JSON.parse(saved).content.questions.length;
    await listeners.submit({ preventDefault() {}, target: { id: "admin-question-form", values: {} } });
    assert.equal(JSON.parse(saved).content.questions.length, questionTotal);
    const beforeAccountAttempt = saved;
    await click({ adminEditUser: 'test@example.local' });
    await listeners.submit({ preventDefault() {}, target: { id: 'admin-reset-password-form', values: { password: 'forged-reset', confirmation: 'forged-reset' } } });
    await listeners.submit({ preventDefault() {}, target: { id: 'admin-user-form', values: { name: 'Forged name' } } });
    assert.equal(saved, beforeAccountAttempt);
    await click({ action: "demo-admin" });
    assert.equal(JSON.parse(saved).currentEmail, "test@example.local");

  } finally {
    Math.random = originalRandom;
    globalThis.setInterval = originalInterval; globalThis.setTimeout = originalTimeout;
    globalThis.FormData = originalFormData;
  }
});
