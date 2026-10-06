import { pbkdf2Sync, webcrypto } from "node:crypto";
import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProfile } from '../src/storage.js';

test('dedicated admin entry has management navigation and preserves the student session', async () => {
  const listeners = {}, sessionData = new Map();
  let saved = JSON.stringify({ currentEmail: 'learner@test.local', users: [{ email: 'learner@test.local', role: 'student', profile: emptyProfile('Learner', 'learner@test.local') }], content: { questions: [], lessons: [] } });
  let html = '', panelHtml = '';
  const app = { addEventListener: (name, fn) => listeners[name] = fn, get innerHTML() { return html; }, set innerHTML(value) { html = value; } };
  const panel = { set innerHTML(value) { panelHtml = value; } };
  Object.assign(globalThis, {
    window: { addEventListener() {}, scrollTo() {} },
    location: { pathname: '/admin.html', hash: '', search: '', protocol: 'file:' },
    localStorage: { getItem: key => key === 'mathmaster-igcse-v1' ? saved : sessionData.get(key) ?? null, setItem: (key, value) => { if (key === 'mathmaster-igcse-v1') saved = value; else sessionData.set(key, value); } },
    document: { querySelector: selector => selector === '#app' ? app : selector === '#admin-panel' ? panel : null, querySelectorAll: () => [], createElement: () => ({ remove() {} }), body: { append() {} } },
  });
  if (!globalThis.crypto) globalThis.crypto = webcrypto;
  if (!globalThis.navigator) globalThis.navigator = {};
  const originalTimeout = globalThis.setTimeout, originalFormData = globalThis.FormData;
  globalThis.setTimeout = () => 0;
  globalThis.FormData = class { constructor(form) { this.values = form.values; } get(name) { return this.values[name]; } getAll(name) { return this.values[name] || []; } };
  const click = async dataset => {
    const target = { dataset, matches: () => false, hasAttribute: () => false, closest() { return this; } };
    await listeners.click({ target, preventDefault() {} });
  };
  try {
    await import('../src/app.js');
    assert.match(html, /ADMINISTRATOR ACCESS/);
    assert.doesNotMatch(html, /register-form|Take Diagnostic Test/);
    await click({ action: 'demo-admin' });
    assert.match(html, /class="app-shell admin-shell"/);
    assert.match(html, /ADMIN STUDIO/);
    assert.match(panelHtml, /Keep the course organised/);
    assert.doesNotMatch(html, /href="#Learn"|href="#Practice"|day streak|XP<\/strong>/);
    assert.equal(JSON.parse(saved).currentEmail, 'learner@test.local');
    assert.equal(sessionData.get('mathmaster-admin-session-v1'), 'admin@mathmaster.local');
    await click({ adminTab: 'questions' });
    assert.equal((panelHtml.match(/class="admin-content-row"/g) || []).length, 30);
    assert.match(panelHtml, /Showing 1–30 of 4,096/);
    await click({ adminBankPage: '2' });
    assert.match(panelHtml, /Showing 31–60 of 4,096/);
    await listeners.submit({ preventDefault() {}, target: { id: 'admin-bank-search', values: { query: 'expanded-extended-algebra-0' } } });
    assert.match(panelHtml, /Showing 1–1 of 1/);
    await click({ action: 'admin-bank-reset' });
    await click({ adminTab: 'users' });
    assert.match(panelHtml, /Learner/);
    await click({ adminEditUser: 'learner@test.local' });
    assert.match(panelHtml, /id="admin-user-form"/);
    assert.match(panelHtml, /id="admin-reset-password-form"/);
    await listeners.submit({ preventDefault() {}, target: { id: 'admin-user-form', values: { name: 'Renamed Learner', board: 'Cambridge IGCSE', target: 'A*', examDate: '', confidence: 'Good', paperLevel: 'Extended', goals: ['Prepare for exams'] } } });
    assert.equal(JSON.parse(saved).users[0].profile.name, 'Renamed Learner');
    const newPassword = 'reset-password-123';
    await listeners.submit({ preventDefault() {}, target: { id: 'admin-reset-password-form', values: { password: newPassword, confirmation: newPassword } } });
    const credentials = JSON.parse(saved).users[0].password;
    assert.equal(credentials.salt.length, 16);
    assert.equal(credentials.hash.length, 32);
    assert.deepEqual(Array.from(pbkdf2Sync(newPassword, Buffer.from(credentials.salt), 120000, 32, 'sha256')), credentials.hash);
    assert.notDeepEqual(Array.from(pbkdf2Sync('old-password-123', Buffer.from(credentials.salt), 120000, 32, 'sha256')), credentials.hash);
    assert.ok(!saved.includes(newPassword), 'new password must not be stored in plaintext');
    assert.doesNotMatch(panelHtml, /value="reset-password-123"/);
    assert.equal(JSON.parse(saved).currentEmail, 'learner@test.local');
    await click({ adminTab: 'create' });
    assert.match(panelHtml, /admin-question-form/);
    await click({ route: 'Exams' });
    assert.doesNotMatch(html, /data-start-exam|Choose your past paper/);
    await click({ action: 'logout' });
    assert.match(html, /ADMINISTRATOR ACCESS/);
    assert.equal(JSON.parse(saved).currentEmail, 'learner@test.local');
    assert.equal(sessionData.get('mathmaster-admin-session-v1'), '');
    const before = saved;
    await listeners.submit({ preventDefault() {}, target: { id: 'admin-question-form', values: {} } });
    assert.equal(saved, before);
    await listeners.submit({ preventDefault() {}, target: { id: 'admin-reset-password-form', values: { password: 'forged-reset', confirmation: 'forged-reset' } } });
    assert.equal(saved, before);
  } finally { globalThis.setTimeout = originalTimeout; globalThis.FormData = originalFormData; }
});
