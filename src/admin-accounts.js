import { readStore, writeStore, managedProfileFields } from "./storage.js";

const choices = {
  board: ["Cambridge IGCSE", "Edexcel International GCSE"],
  target: ["A*", "A", "B", "C", "D", "Other"],
  confidence: ["Very low", "Low", "Average", "Good", "Very good"],
  paperLevel: ["Core", "Extended"]
};
const goals = ["Improve my grade", "Prepare for exams", "Understand difficult topics", "Practice mathematics", "Aim for A/A*"];

function learnerIn(store, email) {
  const learner = store.users.find(account => account.email === email && account.role !== "admin");
  if (!learner) throw new Error("This learner account is no longer available.");
  return learner;
}

export function editLearner(email, details) {
  const name = String(details.name || "").trim();
  if (!name || name.length > 100) throw new Error("Enter a learner name of up to 100 characters.");
  for (const [field, options] of Object.entries(choices)) {
    if (!options.includes(details[field])) throw new Error(`Choose a valid ${field === "paperLevel" ? "exam tier" : field}.`);
  }
  const examDate = String(details.examDate || "");
  if (examDate && (!/^\d{4}-\d{2}-\d{2}$/.test(examDate) || Number.isNaN(Date.parse(examDate)) || new Date(examDate).toISOString().slice(0, 10) !== examDate)) throw new Error("Enter a valid exam date.");
  if (!Array.isArray(details.goals) || details.goals.some(goal => !goals.includes(goal))) throw new Error("Choose valid learning goals.");
  const latest = readStore(), learner = learnerIn(latest, email);
  const patch = { ...details, name, examDate, goals: [...new Set(details.goals)] };
  for (const field of managedProfileFields) learner.profile[field] = patch[field];
  learner.managedProfileRevision = (learner.managedProfileRevision || 0) + 1;
  writeStore(latest);
  return learner;
}

export async function resetLearnerPassword(email, password, confirmation, hashPassword) {
  if (typeof password !== "string" || password.length < 8) throw new Error("Use a new password with at least 8 characters.");
  if (password !== confirmation) throw new Error("The new passwords do not match.");
  learnerIn(readStore(), email);
  const credentials = await hashPassword(password);
  // Read again after hashing so a reset cannot overwrite recent learner progress.
  const latest = readStore(), learner = learnerIn(latest, email);
  learner.password = credentials;
  writeStore(latest);
  return learner;
}
