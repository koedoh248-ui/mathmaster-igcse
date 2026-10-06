import test from "node:test";
import assert from "node:assert/strict";
import { buildIGCSEPaper, makeIGCSEQuestion, paperSpecs, examTopics, buildExamBank } from "../src/exam-content.js";
import { checkAnswer, scoreQuestion } from "../src/math-engine.js";
const rng = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const numbers = text => [...text.matchAll(/[−-]?\d+(?:\.\d+)?/g)].map(match => Number(match[0].replace("−", "-")));
const rounded = value => Number(value.toPrecision(3));

test("all four papers have the correct tier, calculator mode, marks and topic coverage", () => {
  for (const spec of paperSpecs) {
    const paper = buildIGCSEPaper(spec.number, rng(spec.number));
    assert.equal(paper.duration, spec.level === "Core" ? 90 : 120);
    assert.equal(paper.calculator, spec.number >= 3);
    assert.equal(paper.questions.reduce((sum, q) => sum + q.marks, 0), spec.marks);
    assert.deepEqual(new Set(paper.questions.map(q => q.topic)), new Set(examTopics));
    const parts = paper.questions.flatMap(q => q.parts);
    assert.equal(new Set(parts.map(q => q.text)).size, parts.length);
    assert.equal(new Set(parts.map(q => q.id)).size, parts.length);
    for (const q of paper.questions) {
      assert.equal(q.level, spec.level);
      assert.equal(scoreQuestion(q, q.answer), q.marks);
      assert.equal(checkAnswer(q, {}), false);
      assert.equal(scoreQuestion(q, { 0: q.parts[0].answer }), 2);
    }
    if (!spec.calculator) {
      for (const part of parts) assert.ok(!["Cosine rule", "Finding an angle", "Right-angled trigonometry", "Compound interest"].includes(part.subtopic));
    }
    if (spec.level === "Core") {
      for (const part of parts) assert.ok(!["Functions", "Quadratic equations", "Vectors", "Histograms", "Circle theorems", "Without replacement", "Interquartile range"].includes(part.subtopic));
    }
  }
});

test("new papers avoid every part from the previous paper", () => {
  for (const spec of paperSpecs) {
    const random = rng(spec.number + 30), first = buildIGCSEPaper(spec.number, random);
    const exclude = first.questions.flatMap(q => q.parts.map(part => part.text));
    const second = buildIGCSEPaper(spec.number, random, exclude);
    assert.ok(second.questions.flatMap(q => q.parts).every(q => !exclude.includes(q.text)));
  }
});

test("coordinate pairs keep their order while quadratic roots can be reversed", () => {
  const ordered = { answer: "3,-2", answerFormat: "orderedNumbers" };
  assert.ok(checkAnswer(ordered, "(3, −2)"));
  assert.equal(checkAnswer(ordered, "-2,3"), false);
  const roots = { answer: "2,7", answerFormat: "unorderedNumbers" };
  assert.ok(checkAnswer(roots, "x=7, x=2"));
  assert.equal(checkAnswer(roots, "27"), false);
});

test("generated answers agree with independent calculations from exam prompts", () => {
  const covered = new Set();
  for (let seed = 0; seed < 60; seed++) {
    for (const topic of examTopics) {
      for (let variant = 0; variant < 6; variant++) {
        const q = makeIGCSEQuestion(topic, rng(seed + 580), { level: "Extended", calculator: true, variant });
        const [a, b, c, d] = numbers(q.text);
        let expected;
        switch (q.subtopic) {
          case "Percentages": expected = a * (1 - b / 100); break;
          case "Reverse percentages": expected = b / (1 - a / 100); break;
          case "Ratio": expected = a * c / (b + c); break;
          case "Compound interest": expected = Number((a * (1 + b / 100) ** c).toFixed(2)); break;
          case "Linear equations": expected = c / a - b; break;
          case "Quadratic equations": {
            const [, sum, product] = q.text.match(/x² − (\d+)x \+ (\d+)/).map(Number);
            const roots = q.answer.split(",").map(Number);
            assert.ok(roots.every(x => x * x - sum * x + product === 0));
            covered.add(q.subtopic); continue;
          }
          case "Simultaneous equations": {
            const [x, y] = q.answer.split(",").map(Number);
            const [total, weighted] = [...q.text.matchAll(/= (\d+)/g)].map(match => Number(match[1]));
            assert.equal(x + y, total); assert.equal(2 * x + 3 * y, weighted);
            covered.add(q.subtopic); continue;
          }
          case "Polygons": expected = 180 - 360 / a; break;
          case "Bearings": expected = (a + 180) % 360; break;
          case "Circle theorems": expected = a / 2; break;
          case "Area": expected = (a + b) * c / 2; break;
          case "Volume": expected = a * b * c / 2; break;
          case "Cylinder volume": expected = rounded(Math.PI * a * a * b); break;
          case "Similar solids": expected = c * (b / a) ** 3; break;
          case "Gradient": expected = (d - b) / (c - a); break;
          case "Midpoint": {
            assert.deepEqual(q.answer.split(",").map(Number), [(a + c) / 2, (b + d) / 2]); covered.add(q.subtopic); continue;
          }
          case "Right-angled trigonometry": expected = rounded(a * Math.sin(b * Math.PI / 180)); break;
          case "Cosine rule": expected = rounded(Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(c * Math.PI / 180))); break;
          case "Finding an angle": expected = Number((Math.atan(a / b) * 180 / Math.PI).toFixed(1)); break;
          case "Frequency tables": {
            const total = q.table.rows.reduce((sum, [value, frequency]) => sum + value * frequency, 0);
            const count = q.table.rows.reduce((sum, [, frequency]) => sum + frequency, 0);
            expected = rounded(total / count); break;
          }
          case "Mean": expected = a * b - d; break;
          case "Pie charts": expected = a * b / 360; break;
          case "Without replacement": expected = a / (a + b) * (a - 1) / (a + b - 1); break;
          case "Independent events": expected = a / b * (1 - c / d); break;
          default: assert.ok(checkAnswer(q, q.answer)); continue;
        }
        const actual = q.answer.includes("/") ? q.answer.split("/").map(Number).reduce((n, d) => n / d) : Number(q.answer);
        assert.ok(Math.abs(actual - expected) <= Math.max(1e-8, Math.abs(expected) * 1e-9), `${q.subtopic}: ${q.text}; ${actual} should be ${expected}`);
        covered.add(q.subtopic);
      }
    }
  }
  assert.ok(covered.size >= 20);
});

test("the expanded bank has 4096 original questions with balanced topics and tiers", () => {
  const bank = buildExamBank();
  assert.equal(bank.length, 4096);
  for (const topic of examTopics) for (const level of ["Core", "Extended"]) {
    assert.equal(bank.filter(q => q.topic === topic && q.level === level).length, 256);
  }
  assert.equal(bank.filter(q => q.level === "Core").length, 2048);
  for (const q of bank) {
    assert.ok(q.examStyle && q.original);
    assert.equal(q.markScheme.length, q.marks);
    assert.ok(checkAnswer(q, q.answer));
  }
});
