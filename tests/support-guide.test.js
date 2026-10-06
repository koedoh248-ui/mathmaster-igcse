import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProfile } from '../src/storage.js';
import { supportGuide, supportChoices, supportGuideState } from '../src/support-guide.js';
import { startSupportGuide, chooseSupportOption, supportMessages, sendSupportMessage } from '../src/support-chat.js';

test('every help branch leads to a solution with Other, back navigation and restart', () => {
  const visited = new Set();
  function walk(id) {
    assert.ok(supportGuide[id], `missing node ${id}`);
    if (visited.has(id)) return;
    visited.add(id);
    const choices = supportChoices(id);
    assert.ok(choices.some(choice => choice.id === 'other'));
    assert.equal(new Set(choices.map(choice => choice.id)).size, choices.length);
    if (supportGuide[id].parent) assert.ok(choices.some(choice => choice.id === supportGuide[id].parent));
    if (id !== 'start') assert.ok(choices.some(choice => choice.id === 'start'));
    if (!supportGuide[id].options && !['other', 'waiting', 'resolved'].includes(id)) assert.ok(choices.some(choice => choice.id === 'resolved'));
    for (const choice of choices) walk(choice.id);
  }
  walk('start');
  assert.equal(visited.size, Object.keys(supportGuide).length - 1); // Waiting is reached only by sending a message.
  assert.ok(supportChoices('waiting').some(choice => choice.id === 'start'));
  assert.equal(supportGuideState([{ automated: true, guideNode: 'not-a-node' }]), 'start');
});

test('automatic help persists choices, separates learners and escalates messages without impersonating admin replies', () => {
  const saved = new Map();
  globalThis.localStorage = { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value) };
  const learners = ['one@local', 'two@local'].map(email => ({ email, role: 'student', profile: emptyProfile(email, email) }));
  saved.set('mathmaster-igcse-v1', JSON.stringify({ users: [...learners, { email: 'admin@local', role: 'admin' }], content: {} }));
  startSupportGuide('one@local'); startSupportGuide('one@local');
  assert.equal(supportMessages('one@local', 'one@local').length, 1, 'welcome appears once');
  chooseSupportOption('one@local', 'papers');
  chooseSupportOption('one@local', 'uploads');
  chooseSupportOption('one@local', 'upload-failed');
  assert.equal(supportGuideState(supportMessages('one@local', 'one@local')), 'upload-failed');
  assert.throws(() => chooseSupportOption('one@local', 'account'));
  chooseSupportOption('one@local', 'uploads');
  chooseSupportOption('one@local', 'other');
  sendSupportMessage('one@local', 'one@local', 'My 1 MB image still fails.');
  const thread = supportMessages('admin@local', 'one@local');
  assert.equal(thread.at(-1).guideNode, 'waiting');
  assert.equal(thread.at(-1).automated, true);
  assert.equal(thread.at(-1).senderEmail, null);
  assert.match(thread.at(-1).body, /An admin will respond soon/);
  const length = thread.length;
  sendSupportMessage('admin@local', 'one@local', 'Let me help you check the upload.');
  assert.equal(supportMessages('admin@local', 'one@local').length, length + 1, 'no automated reply to a human admin');
  startSupportGuide('two@local');
  assert.equal(supportGuideState(supportMessages('two@local', 'two@local')), 'start');
  assert.equal(supportMessages('two@local', 'two@local').length, 1);
  chooseSupportOption('one@local', 'start');
  assert.equal(supportGuideState(supportMessages('one@local', 'one@local')), 'start');
  assert.throws(() => chooseSupportOption('admin@local', 'other'));
});
