import test from 'node:test';
import assert from 'node:assert/strict';
import { pastPapers } from '../src/past-paper-catalog.js';
import { filterPastPapers, makePastPaperAttempt, reviewPastPaper } from '../src/past-papers.js';
import { renderPastPaperCatalog, renderPastPaperWorkspace } from '../src/past-paper-ui.js';

test('catalogue preserves exact paper/mark-scheme pairings across every indexed session', () => {
  assert.equal(pastPapers.length, 487);
  assert.equal(new Set(pastPapers.map(p => p.id)).size, 487);
  assert.equal(new Set(pastPapers.map(p => `${p.year}-${p.session}`)).size, 58);
  assert.equal(Math.min(...pastPapers.map(p => p.year)), 2002);
  assert.equal(Math.max(...pastPapers.map(p => p.year)), 2026);
  assert.equal(pastPapers.filter(p => p.markSchemeUrl).length, 473);
  for (const p of pastPapers) {
    const ending = `0580_${p.session}${String(p.year).slice(2)}_qp_${p.code}.pdf`;
    assert.ok(p.questionUrl.toLowerCase().endsWith(ending), p.id);
    if (p.markSchemeUrl) assert.equal(p.markSchemeUrl, p.questionUrl.replace('_qp_', '_ms_'));
    assert.ok(p.questionUrl.startsWith('https://pastpapers.papacambridge.com/directories/'));
    assert.equal(p.level, [1, 3].includes(p.paper) ? 'Core' : 'Extended');
  }
});

test('year, session, tier, paper and variant select actual archived files', () => {
  const found = filterPastPapers({ year: '2025', session: 's', level: 'Extended', paper: '2', variant: '2' });
  assert.equal(found.length, 1);
  assert.equal(found[0].id, '0580-s25-22');
  assert.equal(filterPastPapers({ year: '2020', session: 's' }).length, 0);
  assert.ok(filterPastPapers({ year: '2003', variant: 'Single' }).length > 0);
});

test('real paper review remains pending until all available marks and decisions are valid', () => {
  const a = makePastPaperAttempt(pastPapers[0], { minutes: 90, totalMarks: 80 }, 123, 'sample');
  assert.equal(a.started, 123);
  assert.equal(reviewPastPaper(a).percentage, null);
  a.rows = [{ label: 'Q1(a)', maximum: '2', earned: '1', feedback: 'Method correct; arithmetic error.' }, { label: 'Other parts', maximum: '78', earned: '58' }];
  assert.deepEqual(reviewPastPaper(a), { earned: 59, allocated: 80, pending: 0, complete: true, errors: [], percentage: 74 });
  a.rows[1].earned = '';
  assert.equal(reviewPastPaper(a).percentage, null);
  a.rows[1].earned = '79';
  assert.equal(reviewPastPaper(a).complete, false);
  a.rows[1].earned = '58.5';
  assert.equal(reviewPastPaper(a).complete, false);
  a.rows[1].earned = '58'; a.rows[1].maximum = '77';
  assert.equal(reviewPastPaper(a).complete, false);
  a.rows[1].maximum = '78'; a.rows[1].label = 'Q1(a)';
  assert.equal(reviewPastPaper(a).complete, false);
  assert.throws(() => makePastPaperAttempt(pastPapers[0], { minutes: 0, totalMarks: 80 }));
});

test('catalogue pages are bounded, absent schemes are explicit, and reviewer text is escaped', () => {
  const html = renderPastPaperCatalog({}, 1);
  assert.equal((html.match(/class="past-paper-card"/g) || []).length, 12);
  assert.match(html, /487 papers/);
  assert.match(renderPastPaperCatalog({ year: '2020', session: 's' }, 1), /No available papers/);
  const p = pastPapers.find(p => !p.markSchemeUrl);
  const setup = renderPastPaperWorkspace(p);
  assert.match(setup, /Find matching mark scheme/);
  const a = makePastPaperAttempt(p, { minutes: 60, totalMarks: 60 });
  a.status = 'pending-review'; a.feedback = '<script>alert(1)</script>'; a.rows[0].feedback = '<img onerror=alert(1)>';
  const review = renderPastPaperWorkspace(p, a);
  assert.doesNotMatch(review, /<script>|<img onerror/);
  assert.match(review, /&lt;script&gt;/);
});

test('every indexed exam opens its complete PDF in the practice workspace', () => {
  for (const paper of pastPapers) {
    const setup = renderPastPaperWorkspace(paper);
    assert.ok(setup.includes(`src="${paper.questionUrl}#toolbar=1&amp;view=FitH"`), paper.id);
    assert.match(setup, /COMPLETE QUESTION PAPER/);
    assert.match(setup, /value="practice"/);
    assert.match(setup, /id="past-paper-setup"/);
    const attempt = makePastPaperAttempt(paper, { minutes: 90, totalMarks: 80, mode: 'practice' });
    const active = renderPastPaperWorkspace(paper, attempt);
    assert.match(active, /Untimed practice/);
    assert.match(active, /data-past-answer="0"/);
    assert.doesNotMatch(active, /class="exam-timer official-timer"/);
    assert.doesNotMatch(active, /<iframe[^>]+_ms_/);
    attempt.status = 'pending-review';
    const review = renderPastPaperWorkspace(paper, attempt);
    if (paper.markSchemeUrl) assert.ok(review.includes(`src="${paper.markSchemeUrl}#toolbar=1&amp;view=FitH"`));
    assert.doesNotMatch(review, /data-action="past-paper-add-answer"/);
  }
});

test('complete-paper notes are escaped and historical cover settings are not guessed', () => {
  const older = pastPapers.find(p => p.year === 2002);
  assert.match(renderPastPaperWorkspace(older), /name="minutes"[^>]*value="60"/);
  const a = makePastPaperAttempt(older, { minutes: 60, totalMarks: 56, mode: 'practice' });
  a.indexed = false;
  a.answers = [{ label: '<script>Q1</script>', working: '<img onerror=alert(1)>', completed: true }];
  let html = renderPastPaperWorkspace(older, a);
  assert.doesNotMatch(html, /<script>|<img onerror/);
  assert.match(html, /1\/1 marked done/);
  a.status = 'pending-review'; html = renderPastPaperWorkspace(older, a);
  assert.match(html, /&lt;img onerror=alert\(1\)&gt;/);
  assert.throws(() => makePastPaperAttempt(older, { minutes: 60, totalMarks: 56, mode: 'bad-mode' }));
});
