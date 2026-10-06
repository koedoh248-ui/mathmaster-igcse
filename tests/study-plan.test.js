import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarDays, studyPlanFor, studyDateKey, parseStudyDate, studySessionOn, saveStudySettings, saveStudySession, sessionTimeLabel } from '../src/study-plan.js';

const profile = { target: 'A', examDate: '', studyPlan: null };
const settings = { days: 5, minutes: 30, startTime: '16:00', examDate: '', target: 'A' };

test('suggested and legacy plans have a repeating timed weekly schedule and true rest days', () => {
  const suggested = studyPlanFor(profile);
  assert.equal(studySessionOn(suggested, '2026-10-05').activity, 'Algebra');
  assert.equal(studySessionOn(suggested, '2026-10-10'), null);
  const legacy = studyPlanFor({ ...profile, studyPlan: { days: 3, minutes: 45, activities: ['A', 'B', 'C', 'D'] } });
  assert.equal(studySessionOn(legacy, '2026-10-05').activity, 'A');
  assert.equal(studySessionOn(legacy, '2026-10-08'), null);
  assert.equal(sessionTimeLabel(studySessionOn(legacy, '2026-10-05')), '16:00–16:45');
});

test('monthly calendar includes every date once across leap years and year boundaries', () => {
  for (const month of [new Date(2024, 1, 1), new Date(2026, 11, 1), new Date(2027, 0, 1)]) {
    const dates = calendarDays(month), keys = dates.map(studyDateKey);
    assert.equal(dates.length, 42); assert.equal(new Set(keys).size, 42);
    assert.equal(dates[0].getDay(), 1); assert.equal(dates[41].getDay(), 0);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    assert.equal(dates.filter(date => date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear()).length, last);
  }
  assert.throws(() => parseStudyDate('2026-02-30'));
});

test('date exceptions, weekly edits and completed sessions survive settings changes and reloads', () => {
  let plan = saveStudySettings(profile, settings);
  plan = saveStudySession(plan, '2026-10-05', { activity: 'Past Paper 2', startTime: '18:15', minutes: 90 }, 'date');
  assert.equal(studySessionOn(plan, '2026-10-05').activity, 'Past Paper 2');
  assert.equal(studySessionOn(plan, '2026-10-12').activity, 'Algebra');
  plan.completions['2026-10-05'] = true;
  const edited = saveStudySettings({ ...profile, studyPlan: plan }, { ...settings, days: 4, minutes: 60, startTime: '17:00' });
  assert.equal(studySessionOn(edited, '2026-10-05').minutes, 90);
  assert.equal(edited.completions['2026-10-05'], true);
  plan = saveStudySession(edited, '2026-10-05', { activity: 'Geometry', startTime: '19:00', minutes: 40 }, 'weekday');
  assert.equal(studySessionOn(plan, '2026-10-05').activity, 'Geometry');
  assert.equal(studySessionOn(plan, '2026-10-12').activity, 'Geometry');
  assert.equal(plan.completions['2026-10-05'], undefined);
  plan = saveStudySession(plan, '2026-10-06', { rest: true });
  assert.equal(studySessionOn(plan, '2026-10-06'), null);
  assert.ok(studySessionOn(plan, '2026-10-13'));
  assert.deepEqual(studyPlanFor({ ...profile, studyPlan: JSON.parse(JSON.stringify(plan)) }), plan);
});

test('exam dates stop recurring sessions and invalid schedule edits cannot produce invalid timetables', () => {
  const plan = saveStudySettings(profile, { ...settings, examDate: '2026-10-06' });
  assert.ok(studySessionOn(plan, '2026-10-05'));
  assert.equal(studySessionOn(plan, '2026-10-06'), null);
  assert.equal(studySessionOn(plan, '2026-10-12'), null);
  assert.equal(sessionTimeLabel({ startTime: '23:30', minutes: 90 }), '23:30–01:00 (+1 day)');
  for (const bad of [{ days: 8 }, { minutes: 32 }, { startTime: '25:00' }, { examDate: 'invalid' }]) assert.throws(() => saveStudySettings(profile, { ...settings, ...bad }));
  assert.throws(() => saveStudySession(plan, '2026-10-05', { activity: '', minutes: 30, startTime: '16:00' }));
  assert.throws(() => saveStudySession(plan, '2026-10-05', { activity: 'Maths', minutes: -1, startTime: '16:00' }));
});
