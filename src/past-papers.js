import { pastPaperStructure } from "./past-paper-structure.js";
import { pastPapers } from './past-paper-catalog.js';
export const sessionNames = { m: 'February/March', s: 'May/June', w: 'October/November' };
export function paperTitle(paper) { return `0580/${paper.code} · ${sessionNames[paper.session]} ${paper.year} · ${paper.level}`; }
export function filterPastPapers(filters = {}) {
  return pastPapers.filter(p => (!filters.year || filters.year === 'All years' || p.year === Number(filters.year)) &&
    (!filters.session || filters.session === 'All sessions' || p.session === filters.session) &&
    (!filters.level || filters.level === 'All tiers' || p.level === filters.level) &&
    (!filters.paper || filters.paper === 'All papers' || p.paper === Number(filters.paper)) &&
    (!filters.variant || filters.variant === 'All variants' || p.variant === filters.variant));
}
export function paperStructure(paper) { return pastPaperStructure[paper.id] || { status: "unavailable", questions: [] }; }
export function officialQuestionIndex(attempt) {
  const count = attempt.answers?.length || 0;
  return Math.min(Math.max(0, attempt.questionIndex || 0), Math.max(0, count - 1));
}

export function makePastPaperAttempt(paper, { minutes, totalMarks, mode = "timed" }, now = Date.now(), id = crypto.randomUUID()) {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 300) throw Error('Enter the duration on the paper cover, in minutes (1–300).');
  if (!Number.isInteger(totalMarks) || totalMarks < 1 || totalMarks > 300) throw Error('Enter the total marks printed on the paper cover (1–300).');
  if (!["timed", "practice"].includes(mode)) throw Error('Choose timed exam or untimed practice.');
  const structure = paperStructure(paper);
  const indexed = structure.status === "verified" && structure.totalMarks === totalMarks;
  const questions = indexed ? structure.questions : [];
  const answers = indexed ? questions.map(q => ({ label: `Q${q.number}`, page: q.page, marks: q.marks, working: "", completed: false, flagged: false })) : [{ label: 'Q1', working: '', completed: false }];
  return { indexed, questionIndex: 0, mode, answers, id, paperId: paper.id, title: paperTitle(paper), minutes, totalMarks, started: now, status: 'in-progress',
    files: [], rows: indexed ? questions.map(q => ({ label: `Q${q.number}`, maximum: String(q.marks), earned: '', feedback: '' })) : [{ label: 'Q1', maximum: '', earned: '', feedback: '' }], reviewer: 'self', feedback: '' };
}
export function reviewPastPaper(attempt) {
  let earned = 0, allocated = 0, pending = 0;
  const errors = [], labels = new Set();
  for (const row of attempt.rows) {
    const label = String(row.label || '').trim();
    const maximum = Number(row.maximum), score = Number(row.earned);
    if (!label || labels.has(label.toLowerCase())) errors.push('Give every question or part a unique label.');
    labels.add(label.toLowerCase());
    if (row.maximum === '' || !Number.isInteger(maximum) || maximum < 1) errors.push(`Enter valid available marks for ${label || 'each part'}.`);
    else allocated += maximum;
    if (row.earned === '') pending++;
    else if (!Number.isInteger(score) || score < 0 || score > maximum) errors.push(`Award whole marks between 0 and ${maximum} for ${label}.`);
    else earned += score;
  }
  if (allocated !== attempt.totalMarks) errors.push(`Listed question marks total ${allocated}; the paper total is ${attempt.totalMarks}. Add all questions and parts before finalising.`);
  const complete = attempt.rows.length > 0 && pending === 0 && errors.length === 0;
  return { earned, allocated, pending, complete, errors: [...new Set(errors)], percentage: complete ? Math.round(earned / attempt.totalMarks * 100) : null };
}
