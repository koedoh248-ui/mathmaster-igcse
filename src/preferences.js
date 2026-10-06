const KEY = "mathmaster-preferences-v1";
export const textSizes = { standard: 1, large: 1.15, largest: 1.3 };
function preferencesStore() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; }
}
export function readPreferences(email) {
  const saved = preferencesStore()[email] || {};
  return { theme: saved.theme === "light" ? "light" : "dark", textSize: Object.hasOwn(textSizes, saved.textSize) ? saved.textSize : "standard" };
}
export function savePreferences(email, preferences) {
  if (!email || !["light", "dark"].includes(preferences.theme) || !Object.hasOwn(textSizes, preferences.textSize)) throw new Error("Choose a valid theme and text size.");
  const saved = preferencesStore();
  saved[email] = { theme: preferences.theme, textSize: preferences.textSize };
  localStorage.setItem(KEY, JSON.stringify(saved));
  return saved[email];
}
