// These are original practice rubrics. Official questions need their own matching mark scheme.
export const markingGuideUrl = "https://www.cambridgeinternational.org/Images/663672-2025-specimen-paper-2-mark-scheme.pdf";
export const papaCambridgeUrl = "https://pastpapers.papacambridge.com/papers/caie/igcse-mathematics-0580";
export const markingPrinciples = [
  { code: "M", description: "Method: credit a valid method applied to this problem, including an equivalent method." },
  { code: "A", description: "Accuracy: credit a correct result when its associated method has been earned or is implied." },
  { code: "B", description: "Independent: credit the specified correct result or statement independently of method marks." },
];
const independentTopics = new Set(["Sequences", "Midpoint", "Vectors", "Transformations", "Enlargement", "Circle theorems", "Cyclic quadrilaterals", "Angles in parallel lines"]);

export function buildWorkingRubric(question) {
  if (question.workingRubric) return question.workingRubric;
  const steps = question.markScheme || [question.explanation || "Show a valid method applied to the question."];
  if (independentTopics.has(question.subtopic) && steps.length === question.marks) {
    return steps.map((step, i) => ({ id: `c${i}`, code: "B", marks: 1, description: step, dependsOn: [] }));
  }
  const count = Math.max(1, question.marks || 1);
  const methods = Array.from({ length: count - 1 }, (_, i) => ({ id: `c${i}`, code: "M", marks: 1,
    description: steps[Math.min(i, steps.length - 1)], dependsOn: [] }));
  return [...methods, { id: `c${count - 1}`, code: count === 1 ? "B" : "A", marks: 1,
    description: `Correct final result: ${Array.isArray(question.answer) ? question.answer.join(" or ") : question.answer}${question.unit ? ` ${question.unit}` : ""}${question.accuracy ? ` (${question.accuracy})` : ""}.`,
    dependsOn: methods.map(method => method.id) }];
}

export function reviewWorking(question, review = {}) {
  const rubric = buildWorkingRubric(question);
  const valid = value => ["earned", "not-earned"].includes(value);
  const decisions = review.decisions || {};
  const pending = rubric.filter(criterion => !valid(decisions[criterion.id]));
  const awarded = new Set();
  const feedback = [];
  for (const criterion of rubric) {
    if (decisions[criterion.id] === "earned") {
      if (criterion.dependsOn.every(id => awarded.has(id))) awarded.add(criterion.id);
      else feedback.push(`${criterion.code}${criterion.marks} requires its associated method marks. Confirm a valid method seen or implied before awarding it.`);
    } else if (decisions[criterion.id] === "not-earned") {
      feedback.push(`To earn ${criterion.code}${criterion.marks}: ${criterion.description}`);
    }
  }
  const earned = rubric.reduce((sum, criterion) => sum + (awarded.has(criterion.id) ? criterion.marks : 0), 0);
  const total = rubric.reduce((sum, criterion) => sum + criterion.marks, 0);
  if (earned === total && !pending.length) feedback.push("All criteria earned. Keep showing your method and use the accuracy requested in the question.");
  if (pending.length) feedback.push(`${pending.length} marking ${pending.length === 1 ? "criterion still needs" : "criteria still need"} review.`);
  if (!pending.length && earned < total && earned > 0) feedback.unshift("You earned partial credit for the steps shown. Use the feedback below to complete the solution.");
  return { earned, total, pending: pending.length, complete: pending.length === 0, awarded: [...awarded], feedback };
}

export function summariseWorkingReviews(items) {
  const parts = items.flatMap(item => (item.question.parts || [item.question]).map((part, index) => ({
    ...reviewWorking(part, item.methodReviews?.[index]), topic: item.question.topic,
  })));
  const earned = parts.reduce((sum, part) => sum + part.earned, 0);
  const total = parts.reduce((sum, part) => sum + part.total, 0);
  const complete = parts.length > 0 && parts.every(part => part.complete);
  const topicScores = {};
  for (const topic of new Set(parts.map(part => part.topic))) {
    const subset = parts.filter(part => part.topic === topic);
    if (subset.every(part => part.complete)) topicScores[topic] = Math.round(subset.reduce((sum, part) => sum + part.earned, 0) / subset.reduce((sum, part) => sum + part.total, 0) * 100);
  }
  return { earned, total, complete, reviewedParts: parts.filter(part => part.complete).length, totalParts: parts.length,
    percentage: complete ? Math.round(earned / total * 100) : null, topicScores };
}
