import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { buildPrivateTest } from '../scripts/build-private-copy.mjs';

function openCopy(script, storage, search = '') {
  const events = {};
  let html = '', authHtml = '', panelHtml = '';
  const app = { addEventListener(name, handler) { events[name] = handler; }, set innerHTML(value) { html = value; } };
  const auth = { set innerHTML(value) { authHtml = value; } }, panel = { set innerHTML(value) { panelHtml = value; } };
  const context = {
    console, crypto: webcrypto, TextEncoder, URLSearchParams,
    location: { protocol: 'file:', pathname: '/private-copy/test.html', search, hash: '', replace() { throw new Error('A private copy must not redirect to source files'); } },
    navigator: { serviceWorker: { register() { throw new Error('A private copy must not register a service worker'); } } },
    window: { addEventListener() {}, scrollTo() {} },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    document: { querySelector: selector => ({ '#app': app, '#auth-panel': auth, '#admin-panel': panel })[selector] || null,
      querySelectorAll: () => [], createElement: () => ({ remove() {} }), body: { append() {} } },
    setTimeout: () => 0, setInterval: () => 0, clearInterval() {}, clearTimeout() {},
    fetch() { throw new Error('Local practice must not fetch source files or APIs'); },
    FormData: class { constructor(form) { this.values = form.values; } get(key) { return this.values[key]; } getAll(key) { return this.values[key] || []; } }
  };
  runInNewContext(script, context, { filename: 'test.html', timeout: 10000 });
  return {
    get html() { return html; }, get authHtml() { return authHtml; }, get panelHtml() { return panelHtml; },
    submit: (id, values) => events.submit({ preventDefault() {}, target: { id, values } }),
    click: dataset => events.click({ preventDefault() {}, target: { dataset, matches: () => false, hasAttribute: () => false, closest() { return this; } } })
  };
}

test('shareable HTML is self-contained and supports signup, learning, admin and returning login from a file', async () => {
  const html = await buildPrivateTest();
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+(?:stylesheet|manifest)/);
  assert.doesNotMatch(html, /serviceWorker\.register|\.\/admin\.html|\.\/index\.html/);
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const storage = new Map();
  const student = openCopy(script, storage);
  assert.match(student.html, /Master IGCSE/);
  assert.match(student.authHtml, /register-form/);
  await student.submit('register-form', { name: 'Private Tester', email: 'tester@example.local', password: 'test-password-123', board: 'Cambridge IGCSE', target: 'A', examDate: '', confidence: 'Average', goals: ['Prepare for exams'] });
  assert.match(student.html, /Private/);
  assert.match(student.html, /href="\?portal=admin"/);
  assert.ok(storage.has('mathmaster-private-test-v1'));
  assert.equal(storage.has('mathmaster-igcse-v1'), false);
  await student.click({ route: 'Question Bank' });
  assert.match(student.html, /Showing 1–30 of 4,096/);
  await student.click({ route: 'Past Papers' });
  assert.match(student.html, /487 papers/);
  const admin = openCopy(script, storage, '?portal=admin');
  assert.match(admin.html, /ADMINISTRATOR ACCESS/);
  await admin.click({ action: 'demo-admin' });
  await admin.click({ adminTab: 'users' });
  assert.match(admin.panelHtml, /Private Tester/);
  assert.match(admin.html, /href="\?portal=student"/);
  assert.equal(JSON.parse(storage.get('mathmaster-private-test-v1')).currentEmail, 'tester@example.local');
  await student.click({ action: 'logout' });
  const returning = openCopy(script, storage);
  await returning.submit('login-form', { email: 'tester@example.local', password: 'test-password-123' });
  assert.match(returning.html, /Private/);
  assert.match(returning.html, /student-shell/);
});
