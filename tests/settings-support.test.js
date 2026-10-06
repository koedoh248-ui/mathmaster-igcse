import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { emptyProfile } from '../src/storage.js';
import { readPreferences, savePreferences } from '../src/preferences.js';
import { sendSupportMessage, supportMessages } from '../src/support-chat.js';

async function credentials(password, salt = new Uint8Array(16).fill(12)) {
  const key = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await webcrypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256);
  return { salt: [...salt], hash: [...new Uint8Array(hash)] };
}

test('student settings, password changes and admin support work without overwriting learning data', async () => {
  const memory = new Map(), accounts = [
    { email: 'learner@local', role: 'student', password: await credentials('old-password'), profile: emptyProfile('Learner', 'learner@local') },
    { email: 'other@local', role: 'student', profile: emptyProfile('Other', 'other@local') },
    { email: 'admin@local', role: 'admin', profile: emptyProfile('Admin', 'admin@local') }
  ];
  accounts[0].profile.studentGuide = { completed: true };
  accounts[0].profile.xp = 123;
  memory.set('mathmaster-igcse-v1', JSON.stringify({ users: accounts, currentEmail: accounts[0].email, content: { questions: [], lessons: [] } }));
  memory.set('mathmaster-admin-session-v1', 'admin@local');
  const root = { attributes: {}, properties: {}, setAttribute(k, v) { this.attributes[k] = v; }, style: { setProperty(k, v) { root.properties[k] = v; } } };
  function portal(pathname) {
    const events = {}, windowEvents = {}, messages = { innerHTML: '', scrollHeight: 100 }, inbox = { innerHTML: '' }, options = { innerHTML: '' }, panel = { innerHTML: '' };
    let html = '', renders = 0;
    const app = { addEventListener(k, v) { events[k] = v; }, set innerHTML(v) { html = v; renders++; } };
    return { events, windowEvents, messages, inbox, options, get html() { return html; }, get renders() { return renders; }, activate() {
      globalThis.location = { pathname, hash: '', search: '', protocol: 'file:' };
      globalThis.window = { addEventListener(k, v) { windowEvents[k] = v; }, scrollTo() {} };
      globalThis.document = { documentElement: root, querySelector(s) { return ({ '#app': app, '#admin-panel': panel, '#support-messages': messages, '#support-inbox': inbox, '#support-options': options })[s] || null; }, querySelectorAll: () => [], createElement: () => ({ remove() {} }), body: { append() {} } };
    }, click(dataset) { return events.click({ preventDefault() {}, target: { dataset, closest() { return this; }, matches: () => false, hasAttribute: () => false } }); },
    submit(id, values) { return events.submit({ preventDefault() {}, target: { id, values, reset() { this.values = {}; } } }); }
    };
  }
  const originals = { timeout: globalThis.setTimeout, formData: globalThis.FormData };
  globalThis.setTimeout = () => 0;
  globalThis.FormData = class { constructor(form) { this.values = form.values; } get(k) { return this.values[k]; } };
  globalThis.localStorage = { getItem: k => memory.get(k) || null, setItem: (k, v) => memory.set(k, v) };
  if (!globalThis.navigator) globalThis.navigator = {};
  try {
    const student = portal('/index.html'); student.activate();
    await import('../src/app.js?settings-test-student');
    await student.click({ route: 'Settings' });
    assert.match(student.html, /Light · neon green/);
    assert.match(student.html, /Confirm new password/);
    const rendersBefore = student.renders;
    await student.events.change({ target: { dataset: { preference: 'theme' }, value: 'light' } });
    await student.events.change({ target: { dataset: { preference: 'textSize' }, value: 'largest' } });
    assert.equal(root.attributes['data-theme'], 'light');
    assert.equal(root.properties['--text-scale'], '1.3');
    assert.equal(student.renders, rendersBefore, 'appearance changes preserve unfinished forms');
    assert.deepEqual(readPreferences('learner@local'), { theme: 'light', textSize: 'largest' });
    assert.equal(readPreferences('other@local').theme, 'dark');
    assert.throws(() => savePreferences('learner@local', { theme: 'unknown', textSize: 'largest' }));
    const initialHash = JSON.parse(memory.get('mathmaster-igcse-v1')).users[0].password.hash;
    await student.submit('password-form', { current: 'wrong-password', next: 'new-password', confirmation: 'new-password' });
    assert.deepEqual(JSON.parse(memory.get('mathmaster-igcse-v1')).users[0].password.hash, initialHash);
    await student.submit('password-form', { current: 'old-password', next: 'new-password', confirmation: 'different-password' });
    assert.deepEqual(JSON.parse(memory.get('mathmaster-igcse-v1')).users[0].password.hash, initialHash);
    await student.submit('password-form', { current: 'old-password', next: 'new-password', confirmation: 'new-password' });
    const changed = JSON.parse(memory.get('mathmaster-igcse-v1')).users[0];
    assert.notDeepEqual(changed.password.hash, initialHash);
    assert.deepEqual(changed.password, await credentials('new-password', new Uint8Array(changed.password.salt)));
    assert.equal(changed.profile.xp, 123);
    assert.ok(!memory.get('mathmaster-igcse-v1').includes('new-password'));
    await student.click({ route: 'Help Center' });
    assert.match(student.html, /data-support-option="account"/);
    await student.click({ supportOption: 'study' });
    assert.match(student.options.innerHTML, /data-support-option="schedule"/);
    await student.click({ supportOption: 'schedule' });
    await student.click({ supportOption: 'plan-hidden' });
    assert.match(student.messages.innerHTML, /Edit my plan/);
    await student.click({ supportOption: 'resolved' });
    assert.match(student.messages.innerHTML, /Glad that helped/);
    await student.click({ supportOption: 'other' });
    assert.match(student.messages.innerHTML, /admin will respond soon/);
    await student.submit('support-message-form', { message: 'Please explain <script>alert(1)</script>\nThanks' });
    assert.match(student.messages.innerHTML, /&lt;script&gt;/);
    assert.doesNotMatch(student.messages.innerHTML, /<script>/);
    assert.equal(supportMessages('learner@local', 'learner@local').filter(message => !message.automated && !message.guidedChoice).length, 1);
    assert.match(student.messages.innerHTML, /Your message is in the admin/);
    assert.throws(() => supportMessages('other@local', 'learner@local'));
    assert.throws(() => sendSupportMessage('other@local', 'learner@local', 'forged'));
    assert.throws(() => sendSupportMessage('learner@local', 'learner@local', ' '.repeat(3)));
    assert.throws(() => sendSupportMessage('learner@local', 'learner@local', 'a'.repeat(2001)));
    const admin = portal('/admin.html'); admin.activate();
    await import('../src/app.js?settings-test-admin');
    await admin.click({ adminTab: 'support' });
    assert.match(admin.html, /data-admin-support="learner@local"/);
    assert.match(admin.html, /Needs admin reply/);
    await admin.click({ adminSupport: 'learner@local' });
    assert.match(admin.html, /Chat with Learner/);
    await admin.submit('support-message-form', { message: 'Happy to help. Which topic?' });
    assert.match(admin.messages.innerHTML, /Happy to help/);
    student.activate();
    const beforeReply = student.renders;
    student.windowEvents.storage({ key: 'mathmaster-support-v1' });
    assert.match(student.messages.innerHTML, /Happy to help/);
    assert.equal(student.renders, beforeReply, 'incoming reply updates only the log and keeps the draft');
    await student.click({ route: 'Home' });
    await student.click({ route: 'Settings' });
    assert.match(student.html, /value="light" selected/);
    assert.match(student.html, /value="largest" selected/);
    assert.equal(JSON.parse(memory.get('mathmaster-igcse-v1')).users[0].profile.xp, 123);
  } finally { globalThis.setTimeout = originals.timeout; globalThis.FormData = originals.formData; }
});
