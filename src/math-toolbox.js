// Plain-text maths templates keep answers editable and compatible with the checker.
export const mathTemplates = [
  { group: 'Numbers & fractions', name: 'Fraction', display: '□ / □', text: '□/□' },
  { group: 'Numbers & fractions', name: 'Mixed number', display: '□  □ / □', text: '□ + □/□' },
  { group: 'Numbers & fractions', name: 'Square root', display: '√□', text: 'sqrt(□)' },
  { group: 'Numbers & fractions', name: 'Cube root', display: '∛□', text: '(□)^(1/3)' },
  { group: 'Numbers & fractions', name: 'Nth root', display: 'ⁿ√□', text: '(□)^(1/(□))' },
  { group: 'Numbers & fractions', name: 'Power', display: '□ⁿ', text: '(□)^(□)' },
  { group: 'Numbers & fractions', name: 'Squared', display: '□²', text: '(□)^2' },
  { group: 'Numbers & fractions', name: 'Cubed', display: '□³', text: '(□)^3' },
  { group: 'Numbers & fractions', name: 'Standard form', display: '□ × 10ⁿ', text: '□ * 10^(□)' },
  { group: 'Numbers & fractions', name: 'Pi', display: 'π', text: 'pi' },
  { group: 'Numbers & fractions', name: 'Percentage', display: '□%', text: '□%' },
  { group: 'Numbers & fractions', name: 'Recurring decimal', display: '0.(□) recurring', text: '0.(□) recurring' },
  { group: 'Operations & comparisons', name: 'Multiply', display: '×', text: ' * ' },
  { group: 'Operations & comparisons', name: 'Divide', display: '÷', text: ' / ' },
  { group: 'Operations & comparisons', name: 'Plus or minus', display: '±', text: ' ± ' },
  { group: 'Operations & comparisons', name: 'Equals', display: '=', text: ' = ' },
  { group: 'Operations & comparisons', name: 'Not equal', display: '≠', text: ' ≠ ' },
  { group: 'Operations & comparisons', name: 'Approximately equal', display: '≈', text: ' ≈ ' },
  { group: 'Operations & comparisons', name: 'Less than', display: '<', text: ' < ' },
  { group: 'Operations & comparisons', name: 'Greater than', display: '>', text: ' > ' },
  { group: 'Operations & comparisons', name: 'Less than or equal', display: '≤', text: ' ≤ ' },
  { group: 'Operations & comparisons', name: 'Greater than or equal', display: '≥', text: ' ≥ ' },
  { group: 'Operations & comparisons', name: 'Brackets', display: '(□)', text: '(□)' },
  { group: 'Operations & comparisons', name: 'Absolute value', display: '|□|', text: '|□|' },
  { group: 'Geometry & functions', name: 'Degrees', display: '□°', text: '□°' },
  { group: 'Geometry & functions', name: 'Angle', display: '∠ABC', text: '∠□' },
  { group: 'Geometry & functions', name: 'Parallel', display: '∥', text: ' ∥ ' },
  { group: 'Geometry & functions', name: 'Perpendicular', display: '⊥', text: ' ⊥ ' },
  { group: 'Geometry & functions', name: 'Sine', display: 'sin(□)', text: 'sin(□)' },
  { group: 'Geometry & functions', name: 'Cosine', display: 'cos(□)', text: 'cos(□)' },
  { group: 'Geometry & functions', name: 'Tangent', display: 'tan(□)', text: 'tan(□)' },
  { group: 'Geometry & functions', name: 'Inverse sine', display: 'sin⁻¹(□)', text: 'asin(□)' },
  { group: 'Geometry & functions', name: 'Inverse cosine', display: 'cos⁻¹(□)', text: 'acos(□)' },
  { group: 'Geometry & functions', name: 'Inverse tangent', display: 'tan⁻¹(□)', text: 'atan(□)' },
  { group: 'Geometry & functions', name: 'Function', display: 'f(□)', text: 'f(□)' },
  { group: 'Geometry & functions', name: 'Inverse function', display: 'f⁻¹(□)', text: 'f^(-1)(□)' },
  { group: 'Geometry & functions', name: 'Logarithm', display: 'log(□)', text: 'log(□)' },
  { group: 'Geometry & functions', name: 'Natural logarithm', display: 'ln(□)', text: 'ln(□)' },
  { group: 'Sets, vectors & units', name: 'Coordinate pair', display: '(x, y)', text: '(□, □)' },
  { group: 'Sets, vectors & units', name: 'Column vector', display: '[x; y]', text: '[□; □]' },
  { group: 'Sets, vectors & units', name: 'Two by two matrix', display: '[a b; c d]', text: '[□, □; □, □]' },
  { group: 'Sets, vectors & units', name: 'Set', display: '{□, □}', text: '{□, □}' },
  { group: 'Sets, vectors & units', name: 'Union', display: '∪', text: ' ∪ ' },
  { group: 'Sets, vectors & units', name: 'Intersection', display: '∩', text: ' ∩ ' },
  { group: 'Sets, vectors & units', name: 'Element of', display: '∈', text: ' ∈ ' },
  { group: 'Sets, vectors & units', name: 'Not an element of', display: '∉', text: ' ∉ ' },
  { group: 'Sets, vectors & units', name: 'Subset', display: '⊆', text: ' ⊆ ' },
  { group: 'Sets, vectors & units', name: 'Empty set', display: '∅', text: '∅' },
  { group: 'Sets, vectors & units', name: 'Infinity', display: '∞', text: '∞' },
  { group: 'Sets, vectors & units', name: 'Probability', display: 'P(□)', text: 'P(□)' },
  { group: 'Sets, vectors & units', name: 'Subscript', display: 'xₙ', text: '□_(□)' },
  { group: 'Sets, vectors & units', name: 'Square centimetres', display: 'cm²', text: ' cm²' },
  { group: 'Sets, vectors & units', name: 'Cubic centimetres', display: 'cm³', text: ' cm³' },
  { group: 'Sets, vectors & units', name: 'Square metres', display: 'm²', text: ' m²' },
  { group: 'Sets, vectors & units', name: 'Cubic metres', display: 'm³', text: ' m³' },
];

export function nextMathBlank(field, from = field.selectionEnd || 0) {
  const index = field.value.indexOf('□', from);
  const next = index < 0 ? field.value.indexOf('□') : index;
  if (next < 0) return false;
  field.focus({ preventScroll: true });
  field.setSelectionRange(next, next + 1);
  return true;
}

export function insertMathTemplate(field, text) {
  if (field.disabled || field.readOnly) return false;
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? start;
  const result = field.value.slice(0, start) + text + field.value.slice(end);
  if (field.maxLength >= 0 && result.length > field.maxLength) return false;
  field.setRangeText(text, start, end, 'end');
  field.focus({ preventScroll: true });
  const blank = text.indexOf('□');
  if (blank >= 0) field.setSelectionRange(start + blank, start + blank + 1);
  field.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

const fieldSelector = '#practice-answer-form input[name="answer"], #practice-answer-form input[name^="part-"], #practice-answer, #daily-form input[name="answer"], #exam-answer-input, input[data-exam-part], #exam-working, textarea[data-answer-field="working"], textarea[data-past-response], textarea[data-review-working], input[data-assistant-field="answer"], textarea[data-assistant-field="working"], input[data-official-check-field="answer"], input[data-official-check-field="expected"], textarea[data-official-check-field="working"]';
const esc = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function installMathToolboxes(root) {
  if (!root?.querySelectorAll) return;
  const attached = new WeakSet();
  let serial = 0;
  const mount = () => {
    for (const field of root.querySelectorAll(fieldSelector)) {
      if (attached.has(field) || field.disabled || field.readOnly) continue;
      attached.add(field);
      const box = document.createElement('div');
      box.className = 'math-toolbox';
      const id = `math-toolbox-${++serial}`;
      box.innerHTML = `<button type="button" class="math-toolbox-toggle" aria-expanded="false" aria-controls="${id}">Maths symbols & templates</button><section id="${id}" class="math-toolbox-panel" hidden aria-label="Maths symbols and templates"><div class="math-toolbox-heading"><strong>Insert into your answer</strong><button type="button" class="text-button" data-math-close>Close</button></div><p>Choose a template, then fill the highlighted box. Press Tab or Next box to fill the next one.</p><label class="math-toolbox-search">Find a symbol<input type="search" placeholder="Search roots, powers, fractions…" aria-label="Find a maths symbol"></label><div class="math-toolbox-items">${[...new Set(mathTemplates.map(item => item.group))].map(group => `<div class="math-toolbox-group"><h4>${esc(group)}</h4><div class="math-toolbox-grid">${mathTemplates.map((item, index) => item.group === group ? `<button type="button" data-math-template="${index}" aria-label="Insert ${esc(item.name)}" title="${esc(item.name)}"><span>${esc(item.display)}</span><small>${esc(item.name)}</small></button>` : '').join('')}</div></div>`).join('')}</div><p class="math-toolbox-empty" hidden>No matching symbol. Try another name.</p><div class="math-toolbox-footer"><button type="button" class="button button-secondary" data-math-next>Next box</button><small>Roots use sqrt(), powers use ^, and fractions use /. Some symbols need manual review. Attach drawings as a photo or PDF.</small></div><span class="math-toolbox-status" role="status"></span></section>`;
      const toggle = box.querySelector('.math-toolbox-toggle');
      const panel = box.querySelector('.math-toolbox-panel');
      const status = box.querySelector('.math-toolbox-status');
      const setOpen = open => { panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); };
      box.addEventListener('click', event => {
        event.stopPropagation();
        const button = event.target.closest('button');
        if (!button) return;
        event.preventDefault();
        if (button === toggle) setOpen(panel.hidden);
        else if (button.hasAttribute('data-math-close')) { setOpen(false); field.focus({ preventScroll: true }); }
        else if (button.hasAttribute('data-math-next')) { status.textContent = nextMathBlank(field) ? '' : 'All boxes are filled.'; }
        else if (button.hasAttribute('data-math-template')) {
          const item = mathTemplates[Number(button.dataset.mathTemplate)];
          status.textContent = insertMathTemplate(field, item.text) ? `${item.name} inserted.` : 'This answer cannot accept more text.';
        }
      });
      box.addEventListener('input', event => {
        if (event.target.type !== 'search') return;
        event.stopPropagation();
        const query = event.target.value.trim().toLowerCase();
        let visible = 0;
        for (const button of box.querySelectorAll('[data-math-template]')) {
          const item = mathTemplates[Number(button.dataset.mathTemplate)];
          button.hidden = !`${item.name} ${item.display} ${item.group}`.toLowerCase().includes(query);
          if (!button.hidden) visible++;
        }
        for (const group of box.querySelectorAll('.math-toolbox-group')) group.hidden = ![...group.querySelectorAll('[data-math-template]')].some(button => !button.hidden);
        box.querySelector('.math-toolbox-empty').hidden = visible !== 0;
      });
      box.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); field.focus({ preventScroll: true }); }
      });
      field.addEventListener('keydown', event => {
        if (event.key === 'Tab' && !event.shiftKey && nextMathBlank(field)) event.preventDefault();
      });
      field.addEventListener('input', () => field.setCustomValidity(''));
      const label = field.closest('label');
      const anchor = label && label.querySelectorAll('input, textarea').length === 1 ? label : field;
      anchor.insertAdjacentElement('afterend', box);
    }
  };
  root.addEventListener('submit', event => {
    const incomplete = [...event.target.querySelectorAll(fieldSelector)].find(field => field.value.includes('□'));
    if (incomplete) { event.preventDefault(); event.stopImmediatePropagation(); incomplete.setCustomValidity('Fill every maths template box before checking your answer.'); incomplete.reportValidity(); }
  }, true);
  mount();
  if (typeof MutationObserver !== 'undefined') new MutationObserver(mount).observe(root, { childList: true, subtree: true });
}
