const DB_NAME = "mathmaster-paper-working-v1";
export const maxUploadBytes = 10 * 1024 * 1024;
export const maxQuestionFiles = 5;
const types = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
let connection;

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.reject(new Error("This browser cannot save uploads. Try a current browser with local storage enabled."));
  if (!connection) connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { connection = null; reject(new Error("Could not open local upload storage.")); };
    request.onblocked = () => { connection = null; reject(new Error("Close other MathMaster tabs and try saving the upload again.")); };
  });
  return connection;
}

export async function validateWorkFile(file) {
  if (!types.has(file.type)) throw new Error("Choose a JPG, PNG, WebP image or PDF. Convert HEIC photos to JPG first.");
  if (file.size === 0 || file.size > maxUploadBytes) throw new Error("Each file must be non-empty and no larger than 10 MB.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  const valid = file.type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : file.type === "image/png" ? [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)
    : file.type === "image/webp" ? text.startsWith("RIFF") && text.slice(8, 12) === "WEBP"
    : text.startsWith("%PDF-");
  if (!valid) throw new Error("The file contents do not match its type. Choose an original image or PDF file.");
  return true;
}

export async function saveWorkFiles(owner, files, existingCount = 0) {
  if (!owner) throw new Error("Sign in before saving paper working.");
  const selected = Array.from(files);
  if (!selected.length) return [];
  if (selected.length + existingCount > maxQuestionFiles) throw new Error("Attach up to 5 files per question.");
  await Promise.all(selected.map(validateWorkFile));
  const db = await openDatabase();
  const records = selected.map(file => ({ id: crypto.randomUUID(), owner, name: file.name || "Paper working", type: file.type, size: file.size, blob: file, created: new Date().toISOString() }));
  await new Promise((resolve, reject) => {
    const transaction = db.transaction("files", "readwrite");
    for (const record of records) transaction.objectStore("files").put(record);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(new Error("Could not save these files. Your browser's local storage may be full."));
    transaction.onabort = () => reject(new Error("The upload was not saved. Try again."));
  });
  return records.map(({ blob, owner, ...metadata }) => metadata);
}

export async function readWorkFile(owner, id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction("files", "readonly").objectStore("files").get(id);
    request.onsuccess = () => {
      const record = request.result;
      resolve(record?.owner === owner ? record.blob : null);
    };
    request.onerror = () => reject(new Error("Could not read the saved upload."));
  });
}

export async function deleteWorkFile(owner, id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("files", "readwrite"), store = transaction.objectStore("files");
    const request = store.get(id);
    request.onsuccess = () => { if (request.result?.owner === owner) store.delete(id); };
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(new Error("Could not remove the upload."));
  });
}
