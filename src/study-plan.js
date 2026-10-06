export const studyDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const suggestedActivities = ['Algebra', 'Probability', 'Geometry', 'Practice', 'Statistics', 'Mock exam', 'Review mistakes'];
export const studyDateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function parseStudyDate(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw Error('Choose a valid calendar date.');
  const [year, month, day] = key.split('-').map(Number), date = new Date(year, month - 1, day);
  if (studyDateKey(date) !== key) throw Error('Choose a valid calendar date.');
  return date;
}
const validTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export function sessionTimeLabel(session) {
  const [hours, minutes] = session.startTime.split(':').map(Number);
  const end = hours * 60 + minutes + session.minutes;
  return `${session.startTime}–${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}${end >= 1440 ? ' (+1 day)' : ''}`;
}
export function studyPlanFor(profile) {
  const saved = profile.studyPlan || {}, days = Number.isInteger(saved.days) ? Math.min(7, Math.max(0, saved.days)) : 5;
  const minutes = Number.isInteger(saved.minutes) && saved.minutes > 0 ? saved.minutes : 30;
  const startTime = validTime(saved.startTime || '') ? saved.startTime : '16:00';
  const activities = saved.activities || suggestedActivities;
  const weeklySessions = Array.from({ length: 7 }, (_, i) => {
    if (saved.weeklySessions && Object.hasOwn(saved.weeklySessions, i)) return saved.weeklySessions[i];
    return i < days ? { activity: activities[i] || suggestedActivities[i], startTime, minutes } : null;
  });
  return { ...saved, days, minutes, startTime, examDate: saved.examDate || profile.examDate || '', target: saved.target || profile.target || 'A', activities: [...activities], weeklySessions, overrides: { ...(saved.overrides || {}) }, completions: { ...(saved.completions || {}) } };
}
export function calendarDays(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => { const date = new Date(start); date.setDate(start.getDate() + i); return date; });
}
export function studySessionOn(plan, key) {
  const date = parseStudyDate(key);
  if (Object.hasOwn(plan.overrides, key)) return plan.overrides[key];
  if (plan.examDate && key >= plan.examDate) return null;
  return plan.weeklySessions[(date.getDay() + 6) % 7] || null;
}
export function saveStudySettings(profile, values) {
  const days = Number(values.days), minutes = Number(values.minutes), startTime = String(values.startTime || '16:00');
  if (!Number.isInteger(days) || days < 1 || days > 7) throw Error('Choose between 1 and 7 study days.');
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 120 || minutes % 15) throw Error('Choose a study duration between 15 and 120 minutes, in steps of 15.');
  if (!validTime(startTime)) throw Error('Choose a valid start time.');
  const examDate = String(values.examDate || ''); if (examDate) parseStudyDate(examDate);
  if (!['A*', 'A', 'B', 'C', 'D', 'Other'].includes(values.target)) throw Error('Choose a valid target grade.');
  const plan = studyPlanFor(profile);
  const weeklySessions = Array.from({ length: 7 }, (_, i) => i < days ? { activity: plan.weeklySessions[i]?.activity || plan.activities[i] || suggestedActivities[i], startTime, minutes } : null);
  return { ...plan, days, minutes, startTime, examDate, target: values.target, weeklySessions };
}
export function saveStudySession(plan, key, details, scope = 'date') {
  const date = parseStudyDate(key);
  if (!['date', 'weekday'].includes(scope)) throw Error('Choose a valid repeat option.');
  let session = null;
  if (!details.rest) {
    const activity = String(details.activity || '').trim(), minutes = Number(details.minutes), startTime = String(details.startTime || '');
    if (!activity || activity.length > 100) throw Error('Enter a study activity of up to 100 characters.');
    if (!validTime(startTime)) throw Error('Choose a valid start time.');
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 240) throw Error('Choose a duration between 5 and 240 minutes.');
    session = { activity, startTime, minutes };
  }
  const next = { ...plan, weeklySessions: [...plan.weeklySessions], overrides: { ...plan.overrides }, completions: { ...plan.completions }, activities: [...plan.activities] };
  if (scope === 'weekday') {
    const weekday = (date.getDay() + 6) % 7;
    next.weeklySessions[weekday] = session;
    if (session) next.activities[weekday] = session.activity;
    // A dated exception should not mask the recurring edit on the selected day.
    delete next.overrides[key];
    next.days = next.weeklySessions.filter(Boolean).length;
  } else next.overrides[key] = session;
  delete next.completions[key];
  return next;
}
