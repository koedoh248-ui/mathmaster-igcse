import { cloudEnabled, cloudStore, cloudSendMessage } from "./cloud.js";
import { supportGuide, supportGuideState, supportChoices } from "./support-guide.js";
import { readStore } from "./storage.js";
const KEY = "mathmaster-support-v1";
export function readSupport() {
  if (cloudEnabled) return cloudStore().messages || [];
  try { const value = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}
export function supportMessages(actorEmail, learnerEmail) {
  const accounts = readStore().users, actor = accounts.find(account => account.email === actorEmail);
  if (!actor || (actor.role !== "admin" && actorEmail !== learnerEmail)) throw new Error("This conversation is unavailable.");
  return readSupport().filter(message => message.learnerEmail === learnerEmail);
}
export function sendSupportMessage(actorEmail, learnerEmail, text) {
  const accounts = readStore().users, actor = accounts.find(account => account.email === actorEmail);
  const learner = accounts.find(account => account.email === learnerEmail && account.role !== "admin");
  if (!actor || !learner || (actor.role !== "admin" && actorEmail !== learnerEmail)) throw new Error("This conversation is unavailable.");
  const body = String(text || "").trim();
  if (!body || body.length > 2000) throw new Error("Write a message of 1–2,000 characters.");
  if (cloudEnabled) return cloudSendMessage(learnerEmail,body);
  const message = { id: crypto.randomUUID(), learnerEmail, senderEmail: actorEmail, senderRole: actor.role === "admin" ? "admin" : "student", body, date: new Date().toISOString() };
  const messages = readSupport();
  messages.push(message);
  if (actor.role !== "admin") messages.push(automaticReply(learnerEmail, "waiting"));
  localStorage.setItem(KEY, JSON.stringify(messages));
  return message;
}

function automaticReply(email, node) {
  return { id: crypto.randomUUID(), learnerEmail: email, senderEmail: null, senderRole: "admin", automated: true, guideNode: node, body: supportGuide[node].text, date: new Date().toISOString() };
}
export function startSupportGuide(email) {
  if (cloudEnabled) return;
  const account = readStore().users.find(user => user.email === email && user.role !== "admin");
  if (!account) throw new Error("This conversation is unavailable.");
  const messages = readSupport();
  if (!messages.some(message => message.learnerEmail === email && message.automated)) {
    messages.push(automaticReply(email, "start"));
    localStorage.setItem(KEY, JSON.stringify(messages));
  }
}
export function chooseSupportOption(email, optionId) {
  if (cloudEnabled) throw new Error("Write your question to the admin below.");
  const account = readStore().users.find(user => user.email === email && user.role !== "admin");
  if (!account) throw new Error("This conversation is unavailable.");
  const messages = readSupport(), thread = messages.filter(message => message.learnerEmail === email);
  const current = supportGuideState(thread), option = supportChoices(current).find(choice => choice.id === optionId);
  if (!option) throw new Error("Choose one of the available help options.");
  messages.push({ id: crypto.randomUUID(), learnerEmail: email, senderEmail: email, senderRole: "student", body: option.label, guidedChoice: true, date: new Date().toISOString() });
  messages.push(automaticReply(email, optionId));
  localStorage.setItem(KEY, JSON.stringify(messages));
  return optionId;
}
