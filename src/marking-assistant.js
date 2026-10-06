import { compareMathAnswers, checkAlgebraWorking } from './math-equivalence.js';
import { checkCalculationLines } from './calculation-checker.js';
import { checkAnswer } from './math-engine.js';
import { buildWorkingRubric } from './working-review.js';
import { markSchemeIndex } from './mark-scheme-index.js';
const requiredForm = question => /\b(?:show that|prove|show.*working|factorise|factorize|expand|simplify|simplest|lowest terms|significant figures|decimal places)\b/i.test(`${question.text||''} ${question.accuracy||''}`);
export function assessTypedWorking(question, answer, working) {
  const matched = checkAnswer(question, answer);
  const comparison = matched ? { status:'equivalent', message:'Your answer matches an accepted answer, including supported equivalent forms.' } : compareMathAnswers(Array.isArray(question.answer)?question.answer[0]:question.answer,answer);
  const formReview = requiredForm(question);
  // Correct identities are useful feedback, not evidence that a method answers
  // this particular problem. Never turn line counts into method marks.
  const referenceEquation = question.equation || String(question.text||'').match(/\bsolve\s+(.+?)(?:\.(?=\s|$)|$)/i)?.[1] || '';
  const arithmetic = checkCalculationLines(working), algebra = checkAlgebraWorking(working,referenceEquation);
  const rubric = buildWorkingRubric(question);
  const verifiedMark = matched && !formReview && rubric.length===1 && rubric[0].code==='B' ? rubric[0].marks : null;
  return { answer:comparison, arithmetic, algebra, formReview, verifiedMark, total:question.marks,
    feedback: comparison.status==='equivalent' ? formReview ? 'Equivalent value found. A reviewer must check the requested form, accuracy or required working before awarding marks.' : 'Equivalent answer accepted. Alternative steps are allowed; check each method criterion against the work shown.' : comparison.status==='different' ? 'The final answer differs. Valid earlier steps can still earn partial credit. Review M/A/B criteria; this is not an automatic zero.' : 'This answer needs review. Unsupported notation or unreadable handwriting is not an incorrect answer.',
    methodStatus:rubric.some(c=>c.code==='M')?'Method marks remain pending: a mathematically consistent line alone does not establish the required method.':'Check the question-specific independent criteria.' };
}
export function schemeReference(paperId) { return markSchemeIndex[paperId] || { status:'missing',rows:[] }; }
export function assessOfficialWorking(paperId, details) {
  const index=schemeReference(paperId), row=index.rows.find(row=>row.label===details.label);
  if (!row) throw Error('Choose a question or part from the scanned reference index.');
  if (!details.confirmed) throw Error('Check the exact answer, units, accuracy and conditions in the original scheme first.');
  const automaticReference = index.status==='verified-index' && row.numericAnswer!==undefined;
  const expected=automaticReference?row.numericAnswer:String(details.expected||'').trim();
  if(!expected)throw Error('Copy the expected final answer from the matching mark scheme.');
  const comparison=compareMathAnswers(expected,details.answer);
  return { label:row.label,page:row.page,maximum:row.maximum,answer:comparison,arithmetic:checkCalculationLines(details.working),algebra:checkAlgebraWorking(details.working),source:automaticReference?'Verified numeric reference':'Reviewer-transcribed reference',
    verifiedMark:automaticReference&&row.maximum===1&&comparison.status==='equivalent'?1:null,
    feedback:'This checks a final value and supported typed equalities. Confirm required form and units in the original PDF. Alternative methods, follow-through, diagrams, proofs and M/A/B criteria need question-specific review; no full-paper score is inferred.' };
}
