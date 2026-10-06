const key = admin => admin ? 'mathmaster-admin-session-v1' : 'mathmaster-student-session-v1';
export function portalUser(store, admin = false, storage = localStorage) {
  const saved = storage.getItem(key(admin));
  const email = saved === null ? (admin ? null : store.currentEmail) : saved;
  const candidate = store.users.find(u => u.email === email && (admin ? u.role === 'admin' : u.role !== 'admin')) || null;
  if (candidate && saved === null) storage.setItem(key(admin), candidate.email);
  return candidate;
}
export function savePortalSession(email, admin = false, storage = localStorage) {
  storage.setItem(key(admin), email || '');
}
