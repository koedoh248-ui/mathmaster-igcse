export const BANK_PAGE_SIZE = 30;

export function filterBank(questions, filters = {}) {
  const words = String(filters.query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  return questions.filter(q =>
    (!filters.topic || filters.topic === 'All topics' || q.topic === filters.topic) &&
    (!filters.level || filters.level === 'All tiers' || q.level === filters.level) &&
    (!filters.difficulty || filters.difficulty === 'All levels' || q.difficulty === filters.difficulty) &&
    (!filters.type || filters.type === 'All types' || q.type === filters.type) &&
    (!filters.subtopic || filters.subtopic === 'All skills' || q.subtopic === filters.subtopic) &&
    (!filters.calculator || filters.calculator === 'Either' || q.calculator === (filters.calculator === 'Calculator')) &&
    words.every(word => `${q.text} ${q.topic} ${q.subtopic} ${q.level || ''} ${q.id}`.toLowerCase().includes(word)));
}

export function bankPage(questions, requestedPage = 1, size = BANK_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(questions.length / size));
  const page = Math.min(pages, Math.max(1, Math.floor(Number(requestedPage) || 1)));
  const start = (page - 1) * size;
  return { items: questions.slice(start, start + size), page, pages, total: questions.length, start, end: Math.min(start + size, questions.length) };
}
