// Minimal asynchronous IndexedDB test double to verify account boundaries and blob persistence.
export function memoryIndexedDB() {
  const records = new Map();
  const db = { createObjectStore() {}, transaction() {
    const transaction = { objectStore() { return {
      put(record) { records.set(record.id, record); },
      delete(id) { records.delete(id); },
      get(id) { const request = {}; queueMicrotask(() => { request.result = records.get(id); request.onsuccess?.(); }); return request; },
    }; } };
    setImmediate(() => transaction.oncomplete?.());
    return transaction;
  } };
  return { open() { const request = { result: db }; queueMicrotask(() => { request.onupgradeneeded?.(); request.onsuccess?.(); }); return request; } };
}
