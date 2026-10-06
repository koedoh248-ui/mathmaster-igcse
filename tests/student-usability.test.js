import test from "node:test";
import assert from "node:assert/strict";
import { guideSteps } from "../src/student-guide.js";
import { emptyProfile } from "../src/storage.js";

test("selected goals save and navigation hides without replacing unfinished work", async () => {
  const events = {}, windowEvents = {}, sessions = new Map();
  const profile = emptyProfile("Learner", "learner@example.local");
  profile.goals = ["Prepare for exams", "Aim for A/A*"];
  let saved = JSON.stringify({ currentEmail: profile.email, users: [{ email: profile.email, role: "learner", profile }], content: { questions: [], lessons: [] } });
  let html = "", renders = 0, mobile = false;
  const element = () => ({
    attributes: {}, classes: new Set(), focused: false,
    setAttribute(key, value) { this.attributes[key] = value; },
    focus() { this.focused = true; },
    get classList() { return { toggle: (key, enabled) => enabled ? this.classes.add(key) : this.classes.delete(key) }; }
  });
  const guideHost = { innerHTML: "" };
  const dialog = { opens: 0, showModal() { this.opens++; } };
  const help = element();
  const shell = element(), sidebar = element(), overlay = element(), toggle = element();
  const app = { addEventListener(name, handler) { events[name] = handler; }, set innerHTML(value) { html = value; renders++; } };
  const closeTimers = new Map(); let timerId = 0;
  const OriginalDate = Date;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalTimeout = globalThis.setTimeout, originalFormData = globalThis.FormData;
  Object.assign(globalThis, {
    window: { matchMedia: () => ({ matches: mobile }), addEventListener(name, handler) { windowEvents[name] = handler; }, scrollTo() {} },
    location: { pathname: "/index.html", search: "", hash: "", protocol: "file:" },
    localStorage: { getItem: key => key === "mathmaster-igcse-v1" ? saved : sessions.get(key) ?? null, setItem: (key, value) => key === "mathmaster-igcse-v1" ? saved = value : sessions.set(key, value) },
    document: {
      querySelector: selector => ({ "#app": app, ".student-shell": shell, "#sidebar": sidebar, ".mobile-overlay": overlay, "#menu-toggle": toggle, "#student-guide-host": guideHost, "#student-help-button": help, "#student-help-dialog": guideHost.innerHTML.includes("<dialog") ? dialog : null })[selector] || null,
      querySelectorAll: () => [], createElement: () => ({ remove() {} }), body: { append() {} }
    }
  });
  if (!globalThis.navigator) globalThis.navigator = {};
  globalThis.setTimeout = (fn, delay) => { const id = ++timerId; if (delay === 220) closeTimers.set(id, fn); return id; };
  globalThis.clearTimeout = id => closeTimers.delete(id);
  globalThis.FormData = class { constructor(form) { this.values = form.values; } get(name) { return this.values[name]; } getAll(name) { return this.values[name] || []; } };
  const click = (id = "", dataset = {}) => events.click({ preventDefault() {}, target: { id, dataset, matches: () => false, hasAttribute: () => false, closest() { return this; } } });
  try {
    await import("../src/app.js");
    assert.match(guideHost.innerHTML, /Welcome to MathMaster/);
    assert.equal(dialog.opens, 1);
    const initialRenders = renders;
    await click("", { guide: "next" });
    assert.match(guideHost.innerHTML, /Find your way around/);
    assert.equal(JSON.parse(saved).users[0].profile.studentGuide.step, 1);
    assert.equal(renders, initialRenders, "guide controls must not replace page inputs");
    await click("", { guide: "skip" });
    assert.equal(guideHost.innerHTML, "");
    assert.equal(JSON.parse(saved).users[0].profile.studentGuide.completed, true);
    assert.ok(help.focused);
    await click("", { route: "Profile" });
    assert.equal(guideHost.innerHTML, "", "skipped guides stay dismissed when navigating");
    await click("", { guide: "restart" });
    assert.match(guideHost.innerHTML, /Welcome to MathMaster/);
    let cancelled = false;
    events.cancel({ target: { id: "student-help-dialog" }, preventDefault() { cancelled = true; } });
    assert.ok(cancelled);
    assert.equal(guideHost.innerHTML, "");
    await click("", { guide: "restart" });
    for (let step = 0; step < guideSteps.length; step++) await click("", { guide: "next" });
    assert.equal(guideHost.innerHTML, "");
    assert.equal(JSON.parse(saved).users[0].profile.studentGuide.skipped, false);
    await click("", { route: "Profile" });
    const summary = html.match(/class="selected-goals"[^>]*>([\s\S]*?)<\/div>/)[1];
    assert.match(summary, /Prepare for exams/);
    assert.match(summary, /Aim for A\/A\*/);
    assert.doesNotMatch(summary, /Improve my grade|Understand difficult topics/);
    assert.match(html, /<details class="goal-picker">/);
    assert.doesNotMatch(html, /multiple size|Hold Ctrl/);

    const beforeToggle = renders;
    assert.equal(sidebar.inert, true, "desktop menu starts collapsed");
    const inSidebar = { closest: () => sidebar };
    events.pointerover({ target: inSidebar, pointerType: "touch" });
    assert.equal(sidebar.inert, true, "touch must not trigger hover navigation");
    events.pointerover({ target: inSidebar, pointerType: "mouse" });
    assert.equal(sidebar.inert, false);
    assert.equal(toggle.attributes["aria-expanded"], "true");
    events.pointerout({ target: inSidebar, relatedTarget: inSidebar, pointerType: "mouse" });
    assert.equal(closeTimers.size, 0, "moving between menu links does not close it");
    events.pointerout({ target: inSidebar, relatedTarget: null, pointerType: "mouse" });
    assert.equal(closeTimers.size, 1);
    events.pointerover({ target: inSidebar, pointerType: "mouse" });
    assert.equal(closeTimers.size, 0, "returning before the close delay keeps it open");
    events.focusin({ target: inSidebar });
    events.pointerout({ target: inSidebar, relatedTarget: null, pointerType: "mouse" });
    for (const callback of closeTimers.values()) callback(); closeTimers.clear();
    assert.equal(sidebar.inert, false, "keyboard focus keeps the menu accessible");
    events.focusout({ target: inSidebar, relatedTarget: null });
    assert.equal(sidebar.inert, true);
    assert.equal(renders, beforeToggle, "hover navigation must preserve live form inputs");
    await click("menu-toggle");
    assert.equal(sidebar.inert, false);
    await click("hide-navigation");
    assert.equal(sidebar.inert, true);
    assert.equal(toggle.attributes["aria-expanded"], "false");
    await click("sidebar-peek");
    assert.equal(sidebar.inert, false);
    windowEvents.keydown({ key: "Escape" });
    assert.equal(sidebar.inert, true);
    await click("", { route: "Learn" });
    assert.ok(shell.classes.has("sidebar-hidden"));
    mobile = true; windowEvents.resize();
    assert.equal(sidebar.inert, true);
    await click("menu-toggle");
    assert.ok(sidebar.classes.has("open"));
    assert.ok(overlay.classes.has("visible"));
    windowEvents.keydown({ key: "Escape" });
    assert.equal(sidebar.inert, true);
    assert.ok(toggle.focused);
    await click("menu-toggle");
    await click("", { route: "Profile" });
    assert.equal(sidebar.inert, true, "choosing a page closes the mobile drawer");
    assert.equal(JSON.parse(saved).users[0].profile.sidebarHidden, undefined, "hover behaviour does not write a hidden-menu preference");

    const selected = { innerHTML: "" };
    const fieldset = { querySelectorAll: () => [{ value: "Practice mathematics" }], querySelector: () => selected };
    const beforeChange = renders;
    await events.change({ target: { dataset: {}, hasAttribute: name => name === "data-goal-choice", closest: () => fieldset } });
    assert.match(selected.innerHTML, /Practice mathematics/);
    assert.doesNotMatch(selected.innerHTML, /Prepare for exams/);
    assert.equal(renders, beforeChange);
    await events.submit({ preventDefault() {}, target: { id: "profile-form", values: { name: "Learner", board: profile.board, target: profile.target, examDate: "", goals: ["Practice mathematics"] } } });
    assert.deepEqual(JSON.parse(saved).users[0].profile.goals, ["Practice mathematics"]);
    const updated = html.match(/class="selected-goals"[^>]*>([\s\S]*?)<\/div>/)[1];
    assert.match(updated, /Practice mathematics/);
    assert.doesNotMatch(updated, /Prepare for exams/);
    fieldset.querySelectorAll = () => [];
    await events.change({ target: { dataset: {}, hasAttribute: name => name === "data-goal-choice", closest: () => fieldset } });
    assert.match(selected.innerHTML, /No goals selected/);
    // Crossing midnight must not grade an old draft against the next question.
    await click("", { route:"Daily Challenge" });
    const draftAnswer = { value:"42" }, dateNotice = { hidden:true, innerHTML:"" };
    const liveClock = { textContent:"", setAttribute(key,value){this[key]=value;} };
    const originalQuery = document.querySelector;
    document.querySelector = selector => selector === '#daily-form input[name="answer"]' ? draftAnswer : selector === "#daily-date-notice" ? dateNotice : originalQuery(selector);
    document.querySelectorAll = selector => selector === "[data-live-clock]" ? [liveClock] : [];
    const now = new OriginalDate(), tomorrow = new OriginalDate(now.getFullYear(),now.getMonth(),now.getDate()+1,0,1);
    globalThis.Date = class extends OriginalDate { constructor(...args){super(...(args.length?args:[tomorrow.getTime()]));}static now(){return tomorrow.getTime();} };
    const beforeMidnight = renders, questionsBefore = JSON.parse(saved).users[0].profile.questionsCompleted;
    windowEvents.focus();
    assert.equal(renders,beforeMidnight);
    assert.equal(dateNotice.hidden,false);
    assert.equal(draftAnswer.value,"42");
    assert.equal(liveClock.datetime,tomorrow.toISOString());
    await events.submit({ preventDefault(){}, target:{id:"daily-form",values:{answer:"42"}} });
    assert.equal(JSON.parse(saved).users[0].profile.questionsCompleted,questionsBefore);
    assert.equal(renders,beforeMidnight,"stale submit preserves the draft and cannot award or deduct marks");
    await click("",{action:"refresh-daily-date"});
    assert.equal(renders,beforeMidnight+1);
  } finally {
    globalThis.Date = OriginalDate;
    globalThis.setTimeout = originalTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    globalThis.FormData = originalFormData;
  }
});
