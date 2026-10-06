import test from "node:test";
import assert from "node:assert/strict";
import { checkAnswer, makeLinearEquation, makeGeneratedQuestion, makeFoundationQuestion, makeQuestionSet, makeDailyQuestion, estimatedGrade } from "../src/math-engine.js";
import { questions, lessons } from "../src/data.js";
import { buildUnitMiniTest, curriculumUnits, expandCurriculumLessons } from "../src/curriculum.js";

test("numerical answers tolerate equivalent decimal precision", () => {
  const question = { type: "numerical", answer: "3.14" };
  assert.equal(checkAnswer(question, "3.1400"), true);
  assert.equal(checkAnswer(question, "3.15"), false);
});

test("fraction answers compare by value", () => {
  const question = { type: "numerical", answer: "1/2" };
  assert.equal(checkAnswer(question, "2/4"), true);
  assert.equal(checkAnswer(question, "0.5"), true);
  assert.equal(checkAnswer(question, "1/3"), false);
  assert.equal(checkAnswer({ type: "numerical", answer: "5" }, "x = 5"), true);
});

test("choice and short answers are compared without case or spacing sensitivity", () => {
  assert.equal(checkAnswer({ type: "multipleChoice", answer: "4.5 × 10^6" }, "4.5×10^6"), true);
  assert.equal(checkAnswer({ type: "shortAnswer", answer: "sine" }, " Sine "), true);
  assert.equal(checkAnswer({ type: "trueFalse", answer: "true" }, "True"), true);
});

test("matching answers require every pair to be connected correctly", () => {
  const question = {
    type: "matching",
    answer: "1/2=0.5; 1/4=0.25",
    matchingPairs: [{ left: "1/2", right: "0.5" }, { left: "1/4", right: "0.25" }],
  };
  assert.equal(checkAnswer(question, { "1/2": "0.5", "1/4": "0.25" }), true);
  assert.equal(checkAnswer(question, { "1/2": "0.25", "1/4": "0.5" }), false);
});

test("each generated linear equation has a verified integer solution", () => {
  const question = makeLinearEquation(() => 0);
  const match = question.text.match(/Solve (\d+)x ([−+]) (\d+) = (-?\d+)/);
  assert.ok(match);
  const [, coefficient, sign, constant, result] = match;
  const computed = (Number(result) - (sign === "−" ? -1 : 1) * Number(constant)) / Number(coefficient);
  assert.equal(Number(question.answer), computed);
  assert.equal(checkAnswer(question, question.answer), true);
  assert.equal(question.original, true);
});

test("local generators create answer-verified questions for every topic", () => {
  for (const topic of ["Number", "Algebra", "Geometry", "Mensuration", "Graphs", "Trigonometry", "Statistics", "Probability"]) {
    for (let seed = 0; seed < 12; seed++) {
      let value = seed / 12;
      const question = makeFoundationQuestion(topic, () => {
        value = (value + 0.61803398875) % 1;
        return value;
      });
      assert.equal(question.topic, topic);
      assert.equal(checkAnswer(question, question.answer), true);
      assert.ok(question.explanation.length > 10);
      let computed;
      if (question.subtopic === "Percentages") {
        const [, percent, amount] = question.text.match(/(\d+)% of (\d+)/);
        computed = Number(percent) * Number(amount) / 100;
      } else if (question.subtopic === "Fractions") {
        const [, numerator, denominator] = question.text.match(/(\d+)\/(\d+)/);
        let a = Number(numerator), b = Number(denominator);
        while (b) [a, b] = [b, a % b];
        const n = Number(numerator) / a, d = Number(denominator) / a;
        computed = `${n}/${d}`;
      } else if (question.subtopic === "Ratio") {
        const [, total, first, second] = question.text.match(/Share (\d+) in the ratio (\d+) : (\d+)/);
        computed = Number(total) * Number(first) / (Number(first) + Number(second));
      } else if (question.subtopic === "Integers") {
        const [, left, right] = question.text.match(/Calculate (\d+) \+ (\d+)/);
        computed = Number(left) + Number(right);
      } else if (question.subtopic === "Simplifying expressions") {
        const [, coefficient] = question.text.match(/Simplify (\d+)x/);
        computed = `${Number(coefficient) + 2}x`;
      } else if (question.subtopic === "Linear equations") {
        const [, coefficient, sign, constant, result] = question.text.match(/Solve (\d+)x ([−+]) (\d+) = (-?\d+)/);
        computed = (Number(result) - (sign === "−" ? -1 : 1) * Number(constant)) / Number(coefficient);
      } else if (question.subtopic === "Perimeter") {
        const [, length, width] = question.text.match(/rectangle (\d+) cm long and (\d+) cm wide/);
        computed = 2 * (Number(length) + Number(width));
      } else if (question.subtopic === "Angles") {
        const [, angle] = question.text.match(/are (\d+)° and x/);
        computed = 180 - Number(angle);
      } else if (question.subtopic === "Gradient") {
        const [, x1, y1, x2, y2] = question.text.match(/between \((-?\d+), (-?\d+)\) and \((-?\d+), (-?\d+)\)/);
        computed = (Number(y2) - Number(y1)) / (Number(x2) - Number(x1));
      } else if (question.subtopic === "Pythagoras' theorem") {
        const [, a, b] = question.text.match(/shorter sides (\d+) cm and (\d+) cm/);
        computed = Math.sqrt(Number(a) ** 2 + Number(b) ** 2);
      } else if (question.subtopic === "Mean") {
        const values = question.text.match(/mean of ([\d, ]+)/)[1].split(",").map(Number);
        computed = values.reduce((sum, value) => sum + value, 0) / values.length;
      } else {
        const [, red, blue] = question.text.match(/has (\d+) red and (\d+) blue/);
        let a = Number(red), b = Number(red) + Number(blue);
        while (b) [a, b] = [b, a % b];
        computed = `${Number(red) / a}/${(Number(red) + Number(blue)) / a}`;
      }
      assert.equal(question.answer, String(computed), `generated answer must match ${question.text}`);
    }
  }
});

test("estimated grade thresholds are clearly differentiated", () => {
  assert.equal(estimatedGrade(90), "A*");
  assert.equal(estimatedGrade(89), "A");
  assert.equal(estimatedGrade(50), "D");
  assert.equal(estimatedGrade(49), "Below D");
});

test("all built-in question records have the required practice fields", () => {
  for (const question of questions) {
    for (const field of ["id", "topic", "subtopic", "difficulty", "type", "text", "answer", "explanation", "hint", "marks", "time"]) {
      assert.ok(question[field] !== undefined && question[field] !== "", `${question.id} is missing ${field}`);
    }
  }
});

test("every curriculum area has at least one complete lesson", () => {
  for (const topic of ["Number", "Algebra", "Geometry", "Mensuration", "Graphs", "Trigonometry", "Statistics", "Probability"]) {
    const lesson = lessons.find(item => item.topic === topic);
    assert.ok(lesson, `No lesson exists for ${topic}`);
    for (const field of ["title", "subtopic", "objective", "explanation", "formula", "example", "steps", "practice", "challenge", "exam", "summary"]) {
      assert.ok(lesson[field]?.length, `${topic} lesson is missing ${field}`);
    }
  }
});

test("expanded curriculum lessons include full lesson sections and next-lesson links", () => {
  const expanded = expandCurriculumLessons(lessons);
  for (const [topic, subtopics] of Object.entries(curriculumUnits)) {
    const unitLessons = expanded.filter(lesson => lesson.topic === topic);
    assert.ok(unitLessons.length >= subtopics.length, `${topic} should cover every syllabus point`);
    for (const subtopic of subtopics) {
      assert.ok(unitLessons.some(lesson => lesson.subtopic.toLowerCase() === subtopic.toLowerCase()), `${topic} is missing ${subtopic}`);
    }
    for (const lesson of unitLessons) {
      assert.ok(lesson.prerequisite);
      assert.ok(lesson.keyTerms.length >= 3);
      assert.ok(lesson.keyRules.length >= 2);
      assert.ok(lesson.workedExamples.length >= 3);
      assert.ok(lesson.practiceQuestions.length >= 5);
      assert.ok(lesson.challenges.length >= 2);
      assert.ok(lesson.examQuestions.length >= 1);
      if (lesson.nextLessonId) assert.ok(unitLessons.some(next => next.id === lesson.nextLessonId));
    }
  }
});

test("every unit can build a 20-question mini-test from distinct local questions", () => {
  const expanded = expandCurriculumLessons(lessons);
  for (const topic of Object.keys(curriculumUnits)) {
    const pool = buildUnitMiniTest(topic, expanded);
    assert.equal(pool.length, 20, `${topic} mini-test should have 20 distinct questions`);
    assert.equal(new Set(pool.map(question => question.text)).size, 20);
    for (const question of pool) {
      assert.ok(question.text);
      assert.ok(question.answer !== undefined && question.answer !== "");
      assert.ok(checkAnswer(question, question.answer), `${topic}: ${question.text}`);
    }
  }
});

function seededRandom(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test("fresh sets exclude recently shown questions and preserve topic and count", () => {
  for (const topic of ["All topics", ...Object.keys(curriculumUnits)]) {
    const random = seededRandom(123);
    const first = makeQuestionSet({ pool: questions, topic, count: 20, random });
    const exclude = first.map(q => q.text);
    const second = makeQuestionSet({ pool: questions, topic, count: 20, exclude, random });
    assert.equal(first.length, 20);
    assert.equal(second.length, 20);
    assert.equal(new Set(second.map(q => q.text)).size, 20);
    assert.equal(new Set(second.map(q => q.id)).size, 20);
    for (const question of second) {
      assert.ok(!exclude.includes(question.text));
      if (topic !== "All topics") assert.equal(question.topic, topic);
      assert.ok(checkAnswer(question, question.answer));
    }
  }
});

test("unit mini-tests vary their questions between attempts", () => {
  const expanded = expandCurriculumLessons(lessons);
  for (const topic of Object.keys(curriculumUnits)) {
    const first = buildUnitMiniTest(topic, expanded, seededRandom(1));
    const second = buildUnitMiniTest(topic, expanded, seededRandom(2));
    assert.ok(second.some(q => !first.some(previous => previous.text === q.text)));
  }
});

test("daily challenge stays consistent within a day and changes on the next day", () => {
  const first = makeDailyQuestion("2026-10-05");
  assert.deepEqual(first, makeDailyQuestion("2026-10-05"));
  assert.notEqual(first.text, makeDailyQuestion("2026-10-06").text);
  const [, percent, amount] = first.text.match(/(\d+)% of (\d+)/);
  assert.equal(Number(first.answer), Number(percent) * Number(amount) / 100);
});
