import { compareMathAnswers } from "./math-equivalence.js";
import { makeIGCSEQuestion } from "./exam-content.js";

export function normalizeAnswer(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[−–]/g, "-").replace(/π/g, "pi").replace(/[×*]/g, "*").replace(/²/g, "^2").replace(/[°$]/g, "").replace(/\s+/g, "").replace(/,/g, "");
}

function numericValue(value) {
  const normalized = normalizeAnswer(value).replace(/^x=/, "");
  const fraction = normalized.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? NaN : Number(fraction[1]) / denominator;
  }
  return /^-?\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
}

function equivalentFormAllowed(question, input) {
  const prompt = question.text || "", expression = normalizeAnswer(input);
  if (/factoris|factoriz/i.test(prompt)) {
    if (!expression.includes("(")) return false;
    let depth = 0;
    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];
      if (char === "(") depth++;
      if (char === ")") depth--;
      if (depth === 0 && i > 0 && ["+", "-"].includes(char) && expression[i-1] !== "^") return false;
    }
    return depth === 0;
  }
  if (/\bexpand\b/i.test(prompt)) return !expression.replace(/\(-?\d+(?:\.\d+)?\)/g, "").includes("(");
  return !/\b(?:simplify|simplest|lowest terms|standard form|show that|prove)\b/i.test(prompt);
}

export function checkAnswer(question, input) {
  if (question.type === "multipart") return question.parts.every((part, index) => checkAnswer(part, input?.[index] ?? ""));
  if (question.answerFormat === "orderedNumbers" || question.answerFormat === "unorderedNumbers") {
    const values = value => String(value ?? "").replace(/[()]/g, "").split(/[,;]/).map(item => numericValue(item.replace(/[xy]\s*=/gi, "")));
    const actual = values(input), expected = values(question.answer);
    if (actual.length !== expected.length || actual.some(value => !Number.isFinite(value))) return false;
    if (question.answerFormat === "unorderedNumbers") { actual.sort((a, b) => a - b); expected.sort((a, b) => a - b); }
    return actual.every((value, index) => Math.abs(value - expected[index]) < 1e-9);
  }
  const submitted = normalizeAnswer(input);
  const accepted = Array.isArray(question.answer) ? question.answer : [question.answer];
  if (question.type === "matching" && question.matchingPairs?.length) {
    const pairs = typeof input === "string"
      ? Object.fromEntries(input.split(";").map(pair => pair.split("=").map(value => normalizeAnswer(value))).filter(pair => pair.length === 2))
      : input;
    return question.matchingPairs.every(pair => normalizeAnswer(pairs?.[pair.left]) === normalizeAnswer(pair.right));
  }
  if (question.type === "multipleChoice" || question.type === "trueFalse") {
    return accepted.some(answer => normalizeAnswer(answer) === submitted);
  }
  for (const answer of accepted) {
    const expected = numericValue(answer);
    const actual = numericValue(input);
    if (Number.isFinite(expected) && Number.isFinite(actual) && Math.abs(expected - actual) <= Math.max(1e-9, Math.abs(expected) * 1e-6)) return true;
    if (normalizeAnswer(answer) === submitted) return true;
    if (equivalentFormAllowed(question, input) && compareMathAnswers(answer, input).status === "equivalent") return true;
    const terms = value => normalizeAnswer(value).split(/[;,]/).filter(Boolean).sort().join(",");
    if (terms(answer) === terms(input)) return true;
  }
  return false;
}

export function makeLinearEquation(random = Math.random) {
  const coefficient = 2 + Math.floor(random() * 7);
  const solution = -5 + Math.floor(random() * 16);
  const constant = -9 + Math.floor(random() * 19);
  const result = coefficient * solution + constant;
  const sign = constant < 0 ? "−" : "+";
  return {
    id: `gen-${Date.now()}-${Math.floor(random() * 1e6)}`, topic: "Algebra", subtopic: "Linear equations",
    difficulty: "Medium", type: "numerical", text: `Solve ${coefficient}x ${sign} ${Math.abs(constant)} = ${result}. Find x.`,
    answer: String(solution), hint: "Undo the addition or subtraction first, then divide by the coefficient.",
    explanation: `Undo ${constant < 0 ? "subtracting" : "adding"} ${Math.abs(constant)} to get ${coefficient}x = ${coefficient * solution}. Divide both sides by ${coefficient}, so x = ${solution}.`,
    marks: 2, time: 3, original: true,
  };
}

const randomInteger = (random, min, max) => min + Math.floor(random() * (max - min + 1));
const simplifyFraction = (numerator, denominator) => {
  let a = Math.abs(numerator), b = Math.abs(denominator);
  while (b) [a, b] = [b, a % b];
  const divisor = a || 1;
  return `${numerator / divisor}/${denominator / divisor}`;
};

export function makeFoundationQuestion(topic = "All topics", random = Math.random) {
  if (topic === "Algebra") return makeLinearEquation(random);
  const candidates = topic === "All topics" ? ["Number", "Algebra", "Geometry", "Mensuration", "Graphs", "Trigonometry", "Statistics", "Probability"] : [topic];
  const selected = candidates[Math.floor(random() * candidates.length)];
  const id = `gen-${Date.now()}-${Math.floor(random() * 1e6)}`;
  const base = { id, topic: selected, difficulty: "Easy", type: "numerical", marks: 1, time: 2, original: true };

  if (selected === "Number") {
    const type = Math.floor(random() * 4);
    if (type === 0) {
      const amount = randomInteger(random, 5, 20) * 20;
      const percent = [10, 20, 25, 50][randomInteger(random, 0, 3)];
      return { ...base, subtopic: "Percentages", text: `Find ${percent}% of ${amount}.`, answer: String(amount * percent / 100), hint: "Convert the percentage to a decimal and multiply.", explanation: `${percent}% of ${amount} = ${percent / 100} × ${amount} = ${amount * percent / 100}.` };
    }
    if (type === 1) {
      const denominator = randomInteger(random, 2, 10);
      const numerator = randomInteger(random, 1, denominator - 1);
      return { ...base, subtopic: "Fractions", text: `Simplify the fraction ${numerator * 2}/${denominator * 2}.`, answer: simplifyFraction(numerator, denominator), hint: "Divide the numerator and denominator by their highest common factor.", explanation: `Divide the numerator and denominator by their common factor to get ${simplifyFraction(numerator, denominator)}.` };
    }
    if (type === 2) {
      const first = randomInteger(random, 1, 4), second = randomInteger(random, 2, 5);
      const multiplier = randomInteger(random, 3, 8);
      const total = (first + second) * multiplier;
      return { ...base, subtopic: "Ratio", text: `Share ${total} in the ratio ${first} : ${second}. Find the first share.`, answer: String(first * multiplier), hint: "Add the ratio parts to find the value of one part.", explanation: `There are ${first + second} parts. Each part is ${total} ÷ ${first + second} = ${multiplier}, so the first share is ${first} × ${multiplier} = ${first * multiplier}.` };
    }
    const left = randomInteger(random, 10, 90), right = randomInteger(random, 10, 90);
    return { ...base, subtopic: "Integers", text: `Calculate ${left} + ${right}.`, answer: String(left + right), hint: "Add the two numbers together.", explanation: `${left} + ${right} = ${left + right}.` };
  }
  if (selected === "Algebra") {
    const coefficient = randomInteger(random, 2, 8);
    return { ...base, subtopic: "Simplifying expressions", type: "shortAnswer", text: `Simplify ${coefficient}x + 3x − x.`, answer: `${coefficient + 2}x`, hint: "Combine the coefficients of x.", explanation: `${coefficient}x + 3x − x = (${coefficient} + 3 − 1)x = ${coefficient + 2}x.` };
  }
  if (selected === "Mensuration") {
    const length = randomInteger(random, 4, 15), width = randomInteger(random, 3, 12);
    return { ...base, subtopic: "Perimeter", text: `Find the perimeter of a rectangle ${length} cm long and ${width} cm wide.`, answer: String(2 * (length + width)), hint: "Add the length and width, then multiply by 2.", explanation: `Perimeter = 2 × (${length} + ${width}) = ${2 * (length + width)} cm.` };
  }
  if (selected === "Geometry") {
    const angle = randomInteger(random, 20, 160);
    return { ...base, topic: "Geometry", subtopic: "Angles", text: `Two angles on a straight line are ${angle}° and x°. Find x.`, answer: String(180 - angle), hint: "Angles on a straight line add up to 180°.", explanation: `Angles on a straight line sum to 180°, so x = 180 − ${angle} = ${180 - angle}°.` };
  }
  if (selected === "Graphs") {
    const x1 = randomInteger(random, -6, 4), run = randomInteger(random, 1, 8);
    const gradient = randomInteger(random, -5, 5), y1 = randomInteger(random, -10, 10);
    const x2 = x1 + run, y2 = y1 + gradient * run;
    return { ...base, topic: "Graphs", subtopic: "Gradient", text: `Find the gradient between (${x1}, ${y1}) and (${x2}, ${y2}).`, answer: String(gradient), hint: "Gradient = change in y ÷ change in x.", explanation: `Gradient = (${y2} − ${y1}) ÷ (${x2} − ${x1}) = ${gradient * run} ÷ ${run} = ${gradient}.` };
  }
  if (selected === "Trigonometry") {
    const triples = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [9, 40, 41]];
    const [shortSideA, shortSideB, hypotenuse] = triples[randomInteger(random, 0, triples.length - 1)];
    const scale = randomInteger(random, 1, 8);
    const a = shortSideA * scale, b = shortSideB * scale, c = hypotenuse * scale;
    return { ...base, topic: "Trigonometry", subtopic: "Pythagoras' theorem", text: `A right triangle has shorter sides ${a} cm and ${b} cm. Find its hypotenuse.`, answer: String(c), hint: "Square both shorter sides, add the squares, then take the positive square root.", explanation: `c² = ${a}² + ${b}² = ${a * a + b * b}, so c = ${c} cm.` };
  }
  if (selected === "Statistics") {
    const values = Array.from({ length: 4 }, () => randomInteger(random, 1, 30));
    const sum = values.reduce((total, value) => total + value, 0);
    return { ...base, topic: "Statistics", subtopic: "Mean", text: `Find the mean of ${values.join(", ")}.`, answer: String(sum / values.length), hint: "Add the values, then divide by how many values there are.", explanation: `The total is ${sum}. Divide by 4: mean = ${sum} ÷ 4 = ${sum / values.length}.` };
  }
  const red = randomInteger(random, 1, 6), blue = randomInteger(random, 2, 8);
  const answer = simplifyFraction(red, red + blue);
  return { ...base, topic: "Probability", subtopic: "Basic probability", text: `A bag has ${red} red and ${blue} blue counters. Find P(red) as a fraction.`, answer, hint: "Divide the number of red counters by the total number of counters.", explanation: `There are ${red} red counters out of ${red + blue} total, so P(red) = ${answer}.` };
}

export function makeGeneratedQuestion(topic = "All topics", random = Math.random, options = {}) {
  return makeIGCSEQuestion(topic, random, options);
}

export function scoreQuestion(question, input) {
  if (question.type === "multipart") return question.parts.reduce((sum, part, index) => sum + scoreQuestion(part, input?.[index] ?? ""), 0);
  return checkAnswer(question, input) ? question.marks : 0;
}

export function estimatedGrade(percentage) {
  if (percentage >= 90) return "A*";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "Below D";
}

export function shuffleQuestions(questions, random = Math.random) {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function makeQuestionSet({ pool = [], topic = "All topics", count = 8, exclude = [], random = Math.random, generatorOptions = {} } = {}) {
  const seen = new Set(exclude);
  const selected = [];
  const candidates = shuffleQuestions(pool.filter(q => topic === "All topics" || q.topic === topic), random);
  for (const question of candidates) {
    if (selected.length >= Math.floor(count * 0.75)) break;
    if (seen.has(question.text)) continue;
    seen.add(question.text);
    selected.push(question);
  }
  const topicOrder = shuffleQuestions(["Number", "Algebra", "Geometry", "Mensuration", "Graphs", "Trigonometry", "Statistics", "Probability"], random);
  for (let attempt = 0; selected.length < count && attempt < 2000; attempt++) {
    const question = makeGeneratedQuestion(topic === "All topics" ? topicOrder[selected.length % topicOrder.length] : topic, random, generatorOptions);
    if (seen.has(question.text)) continue;
    seen.add(question.text);
    selected.push({ ...question, id: `${question.id}-${attempt}` });
  }
  // A finite generator can run out of unseen variants; reuse older questions only then.
  if (selected.length < count) {
    for (const question of candidates) {
      if (selected.length >= count) break;
      if (!selected.some(item => item.text === question.text)) selected.push(question);
    }
  }
  return shuffleQuestions(selected, random);
}

export function makeDailyQuestion(date) {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  const amount = 40 + ((day * 37) % 128) * 4;
  const percent = [10, 20, 25, 50][Math.floor(day / 128) % 4];
  const answer = String(amount * percent / 100);
  return { id: `daily-${date}`, topic: "Number", subtopic: "Percentages", difficulty: "Easy", type: "numerical", marks: 1, time: 2,
    text: `Find ${percent}% of ${amount}.`, answer,
    explanation: `${percent}% of ${amount} = ${percent / 100} × ${amount} = ${answer}.` };
}
