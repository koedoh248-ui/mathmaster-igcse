import { cloudEnabled, cloudActor } from "./cloud.js";
const key = admin => admin ? 'mathmaster-admin-session-v1' : 'mathmaster-student-session-v1';
export function portalUser(store, admin = false, storage = localStorage) {
  if (cloudEnabled) { const actor = cloudActor(); return actor && (admin ? actor.role === "admin" : true) ? actor : null; }
  const saved = storage.getItem(key(admin));
  const email = saved === null ? (admin ? null : store.currentEmail) : saved;
  const candidate = store.users.find(u => u.email === email && (admin ? u.role === 'admin' : u.role !== 'admin')) || null;
  if (candidate && saved === null) storage.setItem(key(admin), candidate.email);
  return candidate;
}
export function savePortalSession(email, admin = false, storage = localStorage) {
  if (!cloudEnabled) storage.setItem(key(admin), email || '');
}
