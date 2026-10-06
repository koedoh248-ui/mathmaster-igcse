import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExamBank } from '../src/exam-content.js';
import { filterBank, bankPage } from '../src/question-bank.js';
const bank = buildExamBank();
const numbers = text => [...text.replace(/−/g, '-').matchAll(/-?\d+(?:\.\d+)?/g)].map(m => Number(m[0]));
const value = answer => answer.includes('/') ? answer.split('/').map(Number).reduce((a, b) => a / b) : Number(answer);
const rounded = x => Number(x.toPrecision(3));

test('expanded bank is reproducible, uniquely identified and has distinct question data', () => {
  assert.equal(new Set(bank.map(q => q.id)).size, bank.length);
  assert.deepEqual(buildExamBank(), bank);
  const added = bank.filter(q => q.id.startsWith('expanded-'));
  assert.equal(added.length, 4000);
  const signatures = bank.map(q => JSON.stringify([q.text, q.table || null, q.diagram || null]));
  assert.equal(new Set(signatures).size, bank.length);
  assert.ok(new Set(added.map(q => q.key)).size >= 100);
  for (const q of added) {
    assert.ok(!/NaN|Infinity|undefined/.test(q.answer), q.id);
    if (q.topic === 'Probability') {
      if (!['expected-frequency'].includes(q.key)) assert.ok(value(q.answer) >= 0 && value(q.answer) <= 1, q.id);
    }
  }
});

test('new answers agree with independently calculated fractions, coordinates, tables and geometry', () => {
  const covered = new Set();
  for (const q of bank.filter(q => q.key)) {
    const ns = numbers(q.text);
    let expected;
    switch (q.key) {
      case 'fraction-add': expected = ns[0] / ns[1] + ns[2] / ns[3]; break;
      case 'fraction-divide': expected = ns[0] / ns[1] / (ns[2] / ns[3]); break;
      case 'triangle-angle': expected = 180 - ns[0] - ns[1]; break;
      case 'isosceles': expected = (180 - ns[0]) / 2; break;
      case 'rotate': {
        // The final 90 in the instruction is an angle, not a coordinate.
        assert.deepEqual(q.answer.split(',').map(Number), [-ns[1] || 0, ns[0]]); covered.add(q.key); continue;
      }
      case 'cuboid-volume': expected = ns[0] * ns[1] * ns[2]; break;
      case 'pyramid-volume': expected = ns[0] * ns[1] * ns[2] / 3; break;
      case 'sector-area': expected = rounded(Math.PI * ns[0] ** 2 * ns[1] / 360); break;
      case 'arc-length': expected = rounded(ns[0] / 360 * Math.PI * 2 * ns[1]); break;
      case 'sin-height': expected = rounded(ns[0] * Math.sin(ns[1] * Math.PI / 180)); break;
      case 'space-diagonal': expected = rounded(Math.sqrt(ns[0] ** 2 + ns[1] ** 2 + ns[2] ** 2)); break;
      case 'frequency-total': expected = q.table.rows.reduce((sum, row) => sum + row[1], 0); break;
      case 'frequency-mode': expected = [...q.table.rows].sort((a, b) => b[1] - a[1])[0][0]; break;
      case 'grouped-mean': {
        const rows = q.table.rows.map(([label, count]) => { const [lo, hi] = numbers(label); return [(lo + hi) / 2, count]; });
        expected = rounded(rows.reduce((sum, [m, f]) => sum + m * f, 0) / rows.reduce((sum, [, f]) => sum + f, 0)); break;
      }
      case 'set-union': expected = (ns[1] + ns[2] - ns[3]) / ns[0]; break;
      case 'without-replacement': expected = ns[0] / (ns[0] + ns[1]) * (ns[0] - 1) / (ns[0] + ns[1] - 1); break;
      case 'different-colours': expected = 2 * ns[0] * ns[1] / ((ns[0] + ns[1]) * (ns[0] + ns[1] - 1)); break;
      default: continue;
    }
    assert.ok(Math.abs(value(q.answer) - expected) < 1e-8, `${q.key}: ${q.text}`);
    covered.add(q.key);
  }
  assert.equal(covered.size, 17);
});

test('keyword search combines with skill, tier and calculator filters', () => {
  const found = filterBank(bank, { query: 'RIGHT-ANGLED hypotenuse', level: 'Core', calculator: 'Calculator' });
  assert.ok(found.length > 20);
  assert.ok(found.every(q => q.level === 'Core' && q.calculator));
  const skill = filterBank(bank, { topic: 'Algebra', subtopic: 'Inverse functions', level: 'Extended', calculator: 'Non-calculator' });
  assert.ok(skill.length > 0);
  assert.ok(skill.every(q => q.subtopic === 'Inverse functions' && q.calculator === false));
  assert.equal(filterBank(bank, { query: '<script>' }).length, 0);
});

test('pages cover the entire bank without omissions and clamp after filtering', () => {
  const ids = [];
  const first = bankPage(bank);
  assert.equal(first.items.length, 30);
  for (let i = 1; i <= first.pages; i++) ids.push(...bankPage(bank, i).items.map(q => q.id));
  assert.deepEqual(ids, bank.map(q => q.id));
  assert.equal(bankPage(bank.slice(0, 4), 100).page, 1);
  assert.deepEqual(bankPage([], 99).items, []);
  assert.equal(bankPage(bank, -1).page, 1);
});

test('Core questions respect similarity and sector restrictions in the 0580 syllabus', () => {
  const core = bank.filter(q => q.level === 'Core');
  assert.ok(!core.some(q => q.key === 'similar-area' || q.key === 'without-replacement' || q.key === 'histogram-height'));
  for (const q of core.filter(q => q.key === 'sector-area' || q.key === 'arc-length')) {
    const theta = numbers(q.text)[q.key === 'arc-length' ? 0 : 1];
    assert.equal(360 % theta, 0);
  }
});
