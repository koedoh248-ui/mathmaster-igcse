import test from 'node:test';
import assert from 'node:assert/strict';
import { portalUser, savePortalSession } from '../src/portal-session.js';

test('student and administrator sessions coexist and log out independently', () => {
  const data = new Map(), storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  const learner = { email: 'student@test.local', role: 'student' }, admin = { email: 'admin@test.local', role: 'admin' };
  const store = { currentEmail: learner.email, users: [learner, admin] };
  assert.equal(portalUser(store, false, storage), learner);
  assert.equal(portalUser(store, true, storage), null);
  savePortalSession(admin.email, true, storage);
  assert.equal(portalUser(store, false, storage), learner);
  assert.equal(portalUser(store, true, storage), admin);
  savePortalSession(null, true, storage);
  assert.equal(portalUser(store, true, storage), null);
  assert.equal(portalUser(store, false, storage), learner);
  savePortalSession(admin.email, true, storage);
  savePortalSession(null, false, storage);
  assert.equal(portalUser(store, false, storage), null);
  assert.equal(portalUser(store, true, storage), admin);
});

test('each portal rejects the other role, including a legacy admin session', () => {
  const learner = { email: 'student@test.local', role: 'learner' }, admin = { email: 'admin@test.local', role: 'admin' };
  const store = { currentEmail: admin.email, users: [learner, admin] };
  const data = new Map(), storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  assert.equal(portalUser(store, false, storage), null);
  savePortalSession(admin.email, false, storage);
  savePortalSession(learner.email, true, storage);
  assert.equal(portalUser(store, false, storage), null);
  assert.equal(portalUser(store, true, storage), null);
});
