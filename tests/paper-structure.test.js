import test from 'node:test';
import assert from 'node:assert/strict';
import { pastPapers } from '../src/past-paper-catalog.js';
import { pastPaperStructure } from '../src/past-paper-structure.js';
import { makePastPaperAttempt, paperStructure, officialQuestionIndex, reviewPastPaper } from '../src/past-papers.js';
import { renderPastPaperWorkspace, renderOfficialAnswers } from '../src/past-paper-ui.js';

test('every archived paper has a scan result; indexed question marks reconcile with its actual cover', () => {
  assert.equal(Object.keys(pastPaperStructure).length, pastPapers.length);
  let questions = 0, indexed = 0;
  for (const paper of pastPapers) {
    const record = paperStructure(paper);
    assert.ok(['verified', 'needs-review', 'unavailable'].includes(record.status));
    if (record.status !== 'verified') { assert.equal(record.questions.length, 0); continue; }
    indexed++; questions += record.questions.length;
    assert.equal(record.questions.reduce((sum, q) => sum + q.marks, 0), record.totalMarks, paper.id);
    assert.ok(record.minutes > 0 && record.minutes <= 300);
    assert.deepEqual(record.questions.map(q => q.number), Array.from({ length: record.questions.length }, (_, i) => i + 1));
    for (const q of record.questions) { assert.ok(q.page >= 2 && q.page <= record.pages); assert.ok(q.marks > 0); }
    const a = makePastPaperAttempt(paper, { minutes: record.minutes, totalMarks: record.totalMarks });
    assert.equal(a.indexed, true);
    assert.equal(a.answers.length, record.questions.length);
    assert.equal(a.rows.length, record.questions.length);
    assert.equal(reviewPastPaper(a).allocated, record.totalMarks);
    assert.equal(reviewPastPaper(a).percentage, null);
  }
  assert.equal(indexed, 483); assert.equal(questions, 8172);
});

test('official question navigation renders one saved answer at a time and links to the right original page', () => {
  const paper = pastPapers.find(p => p.id === '0580-s25-22'), scan = paperStructure(paper);
  const a = makePastPaperAttempt(paper, { minutes: scan.minutes, totalMarks: scan.totalMarks });
  assert.equal(a.answers.length, 24);
  a.answers[0].working = '<first calculation>'; a.answers[0].completed = true;
  a.questionIndex = 1; a.answers[1].flagged = true; a.answers[1].working = 'Second answer';
  const html = renderPastPaperWorkspace(paper, a);
  assert.match(html, /Question 2 of 24/);
  assert.match(html, /Second answer/);
  assert.doesNotMatch(html, /&lt;first calculation&gt;/);
  assert.match(html, /Unflag question/);
  assert.match(html, /page=3/);
  assert.equal((html.match(/data-official-question=/g) || []).length, 26);
  a.questionIndex = 0;
  assert.match(renderOfficialAnswers(a), /&lt;first calculation&gt;/);
  a.questionIndex = 999; assert.equal(officialQuestionIndex(a), 23);
  a.status = 'pending-review';
  assert.match(renderOfficialAnswers(a), /Second answer/);
  assert.match(renderOfficialAnswers(a), /&lt;first calculation&gt;/);
});

test('uncertain scans and mismatching manually entered totals use a flexible answer book without invented marks', () => {
  for (const paper of pastPapers.filter(p => paperStructure(p).status !== 'verified')) {
    const a = makePastPaperAttempt(paper, { minutes: 90, totalMarks: 80 });
    assert.equal(a.indexed, false); assert.equal(a.rows[0].maximum, '');
    assert.match(renderPastPaperWorkspace(paper, a), /past-paper-add-answer/);
    assert.doesNotMatch(renderOfficialAnswers(a), /data-official-question/);
  }
  const paper = pastPapers.find(p => p.id === '0580-s25-22');
  assert.equal(makePastPaperAttempt(paper, { minutes: 120, totalMarks: 99 }).indexed, false);
});
