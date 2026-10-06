import { currentStreak, clockLabel } from "./local-time.js";
import { streakFlame } from "./streak-flame.js";
import { assessTypedWorking, assessOfficialWorking, schemeReference } from "./marking-assistant.js";
import { renderTypedAssistant } from "./marking-assistant-ui.js";
import { supportGuide, supportGuideState, supportChoices } from "./support-guide.js";
import { readPreferences, savePreferences, textSizes } from "./preferences.js";
import { readSupport, supportMessages, sendSupportMessage, startSupportGuide, chooseSupportOption } from "./support-chat.js";
import { studyPlanFor, calendarDays, studyDateKey, parseStudyDate, studySessionOn, saveStudySettings, saveStudySession, sessionTimeLabel, studyDayNames } from "./study-plan.js";
import { editLearner, resetLearnerPassword } from "./admin-accounts.js";
import { guideMarkup, guideState, updateGuide } from "./student-guide.js";
import { portalUser, savePortalSession } from "./portal-session.js";
import { pastPapers } from "./past-paper-catalog.js";
import { makePastPaperAttempt, reviewPastPaper, paperTitle, paperStructure, officialQuestionIndex } from "./past-papers.js";
import { renderPastPaperCatalog, renderPastPaperHistory, renderPastPaperWorkspace, renderPastPaperSummary, renderOfficialAnswers } from "./past-paper-ui.js";
import { filterBank, bankPage } from "./question-bank.js";
import { checkCalculationLines } from "./calculation-checker.js";
import { buildWorkingRubric, summariseWorkingReviews, papaCambridgeUrl } from "./working-review.js";
import { saveWorkFiles, readWorkFile, deleteWorkFile } from "./work-uploads.js";
import { renderUploadPanel, renderMarkingGuide, renderMethodCriteria, workingReviewSummary } from "./working-ui.js";
import { buildIGCSEPaper, paperSpecs, officialPapersUrl, syllabusSource } from "./exam-content.js";
import { topics, questions as starterQuestions, lessons as starterLessons, achievements as badgeRules } from "./data.js";
import { checkAnswer, makeQuestionSet, makeDailyQuestion, scoreQuestion, estimatedGrade } from "./math-engine.js";
import { readStore, writeStore, emptyProfile, updateUser, refreshManagedAccount, recordActivity, todayKey } from "./storage.js";
import { expandCurriculumLessons } from "./curriculum.js";

const app = document.querySelector("#app");
let store = readStore();
const isAdminPortal = String(location.pathname || "").endsWith("/admin.html");
let user = portalUser(store, isAdminPortal);
let route = user ? (isAdminPortal ? "Admin" : "Home") : "Welcome";
let studentMenuOpen = false;
let desktopMenuOpen = false;
let sidebarHovered = false;
let sidebarFocused = false;
let sidebarCloseTimer = null;
let editingStudyPlan = false;
let selectedStudyDate = "";
let displayedDailyDate = "";
let observedLocalDate = todayKey();
let studyMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedLesson = null;
let questionList = [];
let questionIndex = 0;
let questionResult = null;
let practiceAnswer = null;
let showHint = false;
let exam = null;
let examResult = null;
let bankFilters = { topic: "All topics", difficulty: "All levels", type: "All types", level: "All tiers", subtopic: "All skills", calculator: "Either", query: "" };
let bankPageNumber = 1;
let adminPageNumber = 1;
let adminBankQuery = "";
let lessonTopicFilter = "All topics";
let lessonSearch = "";
let formulaSearch = "";
let examTimer = null;
let leaderboardPeriod = "all";
let startDiagnosticAfterAuth = false;
let supportLearner = "";
let passwordSaving = false;
let adminEditing = null;
let adminSelectedLearner = "";
let adminAccountSaving = false;
let paperLevel = user?.profile.paperLevel || "Extended";
let uploadInProgress = false;
let activeReviewQuestion = 0;
let pastFilters = { year: "All years", session: "All sessions", level: "All tiers", paper: "All papers", variant: "All variants" };
let pastPageNumber = 1;
let officialSelectedId = "";
let officialActiveId = "";
let officialTimer = null;
const activeOfficialAttempt = () => user?.profile.officialPapers?.find(a => a.id === officialActiveId);

const uploadUrls = new Map();

const icons = { Home: "⌂", Learn: "▤", Practice: "✎", "Question Bank": "⌕", "Past Papers": "▧", Exams: "▣", Progress: "◷", "Study Plan": "▦", Achievements: "✧", Profile: "○", Settings: "⚙", "Help Center": "☏", Admin: "⚙" };
icons["Daily Challenge"] = "✧";
icons.Mistakes = "↺";
icons["Formula Reference"] = "∑";
const allQuestions = () => [...starterQuestions, ...(store.content.questions || [])];
function freshQuestionSet(topic = "All topics", count = 8, pool = allQuestions(), level = paperLevel) {
  const exclude = user?.profile.recentQuestionTexts || [];
  const list = makeQuestionSet({ pool: pool.filter(q => !q.level || q.level === level), topic, count, exclude, generatorOptions: { level } });
  if (user) {
    user.profile.recentQuestionTexts = [...exclude, ...list.map(q => q.text)].slice(-200);
    updateUser(store, user);
  }
  return list;
}
const curriculumLessons = expandCurriculumLessons(starterLessons);
const allLessons = () => [...curriculumLessons, ...(store.content.lessons || [])];
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pc = value => `${Math.round(Number(value) || 0)}%`;
const initials = name => (name || "M").split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const answerDisplay = value => value && typeof value === "object" ? Object.entries(value).map(([key, answer]) => `${key}=${answer}`).join("; ") : String(value ?? "");
const topicInfo = name => topics.find(topic => topic.name === name) || { icon: "✦", color: "blue", subtopics: [] };
const getScore = topic => user?.profile.topicScores?.[topic] ?? Math.round((user?.profile.attempts || []).filter(a => a.topic === topic).reduce((sum, attempt) => sum + (attempt.correct ? 100 : 0), 0) / Math.max(1, (user?.profile.attempts || []).filter(a => a.topic === topic).length));

function toast(message, style = "success") {
  const old = document.querySelector(".toast");
  old?.remove();
  const item = document.createElement("div");
  item.className = `toast toast-${style}`;
  item.textContent = message;
  document.body.append(item);
  setTimeout(() => item.remove(), 3200);
}

function recommendations() {
  const weak = topics.filter(topic => getScore(topic.name) < 60 && (user.profile.attempts || []).some(a => a.topic === topic.name));
  const repeated = (user.profile.mistakes || []).filter(m => m.topic === "Algebra").length >= 2;
  const picks = weak.map(topic => {
    const lesson = allLessons().find(item => item.topic === topic.name);
    return { topic: topic.name, title: lesson?.title || `${topic.name} fundamentals`, reason: `Your ${topic.name.toLowerCase()} practice score is ${getScore(topic.name)}%.` };
  });
  if (repeated) picks.unshift({ topic: "Algebra", title: "Solving quadratic equations", reason: "A few more algebra examples can help these methods stick." });
  return picks.length ? picks.slice(0, 3) : [{ topic: "Algebra", title: "Solving quadratic equations", reason: "Build confidence with a worked example and some practice." }, { topic: "Probability", title: "Getting started with probability", reason: "Practise the foundations at your own pace." }];
}

const learningGoals = ["Improve my grade", "Prepare for exams", "Understand difficult topics", "Practice mathematics", "Aim for A/A*"];

function selectedGoalChips(goals) {
  return goals.length ? goals.map(goal => `<span class="goal-chip">${esc(goal)}</span>`).join("") : `<span class="muted">No goals selected. Choose a goal below.</span>`;
}

function goalPicker(selected = []) {
  const choices = [...new Set([...learningGoals, ...selected])];
  return `<fieldset class="learning-goals"><legend>Learning goals</legend><div class="selected-goals" aria-live="polite">${selectedGoalChips(selected)}</div><details class="goal-picker"><summary>Change goals</summary><p class="muted">Choose the goals you want to focus on.</p><div class="goal-choices">${choices.map(goal => `<label class="goal-choice"><input type="checkbox" name="goals" value="${esc(goal)}" data-goal-choice ${selected.includes(goal) ? "checked" : ""}><span>${esc(goal)}</span></label>`).join("")}</div></details></fieldset>`;
}

function mobileNavigation() {
  return window.matchMedia?.("(max-width: 850px)").matches || false;
}

function syncStudentNavigation() {
  if (isAdminPortal || !user) return;
  const mobile = mobileNavigation();
  const visible = mobile ? studentMenuOpen : desktopMenuOpen || sidebarHovered || sidebarFocused;
  document.querySelector(".student-shell")?.classList.toggle("sidebar-hidden", !mobile && !visible);
  const sidebar = document.querySelector("#sidebar");
  if (sidebar) {
    sidebar.classList.toggle("open", mobile && studentMenuOpen);
    sidebar.inert = !visible;
    sidebar.setAttribute("aria-hidden", String(!visible));
  }
  document.querySelector(".mobile-overlay")?.classList.toggle("visible", mobile && studentMenuOpen);
  const peek = document.querySelector("#sidebar-peek");
  if (peek) { peek.inert = visible || mobile; peek.setAttribute("aria-expanded", String(visible)); }
  const toggle = document.querySelector("#menu-toggle");
  if (toggle) {
    toggle.setAttribute("aria-expanded", String(visible));
    toggle.setAttribute("aria-label", visible ? "Hide navigation" : "Show navigation");
    toggle.title = visible ? "Hide navigation" : "Show navigation";
  }
}

function toggleStudentNavigation(close = false, keyboard = false) {
  clearTimeout(sidebarCloseTimer);
  if (mobileNavigation()) studentMenuOpen = close ? false : !studentMenuOpen;
  else {
    desktopMenuOpen = close ? false : !(desktopMenuOpen || sidebarHovered || sidebarFocused);
    sidebarHovered = false;
    sidebarFocused = false;
  }
  if (close) document.querySelector("#menu-toggle")?.focus();
  syncStudentNavigation();
  if (!close && keyboard && (studentMenuOpen || desktopMenuOpen)) document.querySelector("#sidebar .nav-link")?.focus();
}

function sidebarRegion(target) { return target?.closest?.("#sidebar, #sidebar-peek"); }
function canHoverNavigation(event) {
  return !isAdminPortal && user && !mobileNavigation() && event.pointerType !== "touch" && !document.querySelector("#student-help-dialog")?.open;
}

app.addEventListener("pointerover", event => {
  if (!canHoverNavigation(event) || !sidebarRegion(event.target)) return;
  clearTimeout(sidebarCloseTimer);
  sidebarHovered = true;
  syncStudentNavigation();
});
app.addEventListener("pointerout", event => {
  if (!canHoverNavigation(event) || !sidebarRegion(event.target) || sidebarRegion(event.relatedTarget)) return;
  clearTimeout(sidebarCloseTimer);
  sidebarCloseTimer = setTimeout(() => {
    sidebarHovered = false;
    desktopMenuOpen = false;
    syncStudentNavigation();
  }, 220);
});
app.addEventListener("focusin", event => {
  if (isAdminPortal || mobileNavigation() || !event.target.closest?.("#sidebar")) return;
  clearTimeout(sidebarCloseTimer);
  sidebarFocused = true;
  syncStudentNavigation();
});
app.addEventListener("focusout", event => {
  if (isAdminPortal || mobileNavigation() || !event.target.closest?.("#sidebar") || event.relatedTarget?.closest?.("#sidebar")) return;
  sidebarFocused = false;
  desktopMenuOpen = false;
  syncStudentNavigation();
});

function renderStudentGuide() {
  if (isAdminPortal || !user) return;
  const host = document.querySelector("#student-guide-host");
  if (!host) return;
  // Do not interrupt an active test with an automatic onboarding dialog.
  if (["Exam", "ExamReview", "OfficialPaper"].includes(route)) { host.innerHTML = ""; return; }
  host.innerHTML = guideMarkup(user.profile);
  document.querySelector("#student-help-dialog")?.showModal();
}

function handleGuideAction(action) {
  if (isAdminPortal || !user || !["next", "back", "skip", "restart"].includes(action)) return;
  updateGuide(user.profile, action);
  updateUser(store, user);
  renderStudentGuide();
  if (guideState(user.profile).completed) document.querySelector("#student-help-button")?.focus();
}

function shell(content) {
  if (isAdminPortal) { adminShell(content); return; }
  app.innerHTML = `
    <div class="app-shell student-shell sidebar-hidden">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-heading"><a class="brand" href="#Home"><span class="brand-mark">M</span><span>MathMaster <small>IGCSE MATHEMATICS</small></span></a><button class="icon-button sidebar-close" id="hide-navigation" aria-label="Hide navigation" title="Hide navigation">×</button></div>
        <nav class="main-nav" aria-label="Student navigation">${[
          ["LEARN", ["Home", "Learn", "Practice", "Exams"]],
          ["RESOURCES", ["Past Papers", "Question Bank", "Formula Reference", "Daily Challenge"]],
          ["YOUR PROGRESS", ["Progress", "Mistakes", "Study Plan", "Achievements", "Profile"]],
          ["YOUR ACCOUNT", ["Settings", "Help Center"]]
        ].map(([label, items]) => `<div class="nav-group"><div class="nav-label">${label}</div>${items.map(item => `<a href="#${encodeURIComponent(item)}" class="nav-link ${route === item ? "active" : ""}" ${route === item ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${icons[item]}</span>${item}</a>`).join("")}</div>`).join("")}</nav>
        <div class="sidebar-bottom">
          <div class="streak-mini"><span data-live-flame="navigation">${streakFlame(currentStreak(user.profile), "navigation")}</span><span><strong><span data-live-streak>${currentStreak(user.profile)}</span> day streak</strong><small>Keep the momentum going</small></span></div>
          <a class="profile-mini" href="#Profile"><span class="avatar">${esc(initials(user.profile.name))}</span><span><strong>${esc(user.profile.name)}</strong><small>Level ${user.profile.level} learner</small></span><span class="profile-dots">···</span></a>
          <div class="offline-note"><span class="online-dot"></span> Your learning is saved on this device</div>
        </div>
      </aside>
      <button class="sidebar-peek" id="sidebar-peek" aria-controls="sidebar" aria-expanded="false" aria-label="Show navigation" title="Move here or click to open the menu"><span aria-hidden="true">›</span><span aria-hidden="true">Menu</span></button>
      <button class="mobile-overlay" id="close-menu" aria-label="Close menu"></button>
      <main class="main-area">
        <header class="topbar"><button class="icon-button menu-toggle" id="menu-toggle" aria-controls="sidebar" aria-expanded="true" aria-label="Hide navigation">☰</button><div class="breadcrumb">MathMaster <span>/</span> <strong>${esc(route === "Lesson" ? "Lesson" : route)}</strong></div>${liveClockMarkup()}<div class="top-actions">${!["Exam", "ExamReview", "OfficialPaper"].includes(route) ? `<button class="button button-secondary student-help-button" id="student-help-button" data-guide="restart" aria-haspopup="dialog">? <span>Help</span></button>` : ""}<span class="top-xp">✦ <strong>${user.profile.xp} XP</strong></span><button class="avatar avatar-small" aria-label="Open profile" data-route="Profile">${esc(initials(user.profile.name))}</button></div></header>
        <div class="page-content">${content}</div>
        <footer class="footer"><span>© ${new Date().getFullYear()} MathMaster IGCSE</span><span>Original learning content · No external services required</span></footer>
      </main>
    </div><div id="student-guide-host"></div>`;
  syncStudentNavigation();
  renderStudentGuide();
}

function adminShell(content) {
  const tab = window.adminTab || "dashboard";
  const destinations = [["dashboard", "⌂", "Dashboard"], ["questions", "▤", "Question bank"], ["lessons", "▣", "Lessons"], ["users", "○", "Learners"], ["create", "+", "Create content"], ["support", "☏", "Help center"]];
  app.innerHTML = `<div class="app-shell admin-shell"><aside class="sidebar" id="sidebar"><a class="brand" href="#Admin"><span class="brand-mark">M</span><span>MathMaster<small>ADMIN STUDIO</small></span></a><div class="nav-label">MANAGE</div><nav class="main-nav">${destinations.map(([key, icon, name]) => `<button class="nav-link ${tab === key ? "active" : ""}" data-admin-tab="${key}"><span class="nav-icon">${icon}</span>${name}</button>`).join("")}</nav><div class="sidebar-bottom"><div class="profile-mini"><span class="avatar">${esc(initials(user.profile.name))}</span><span><strong>${esc(user.profile.name)}</strong><small>Administrator</small></span></div><a class="nav-link" href="./index.html" target="_blank" rel="noopener noreferrer"><span class="nav-icon">↗</span>Student site</a><button class="text-button" data-action="logout">Sign out of admin</button></div></aside><button class="mobile-overlay" id="close-menu" aria-label="Close menu"></button><main class="main-area"><header class="topbar"><button class="icon-button menu-toggle" id="menu-toggle" aria-label="Open admin navigation">☰</button><div class="breadcrumb">Admin studio <span>/</span><strong>${destinations.find(([key]) => key === tab)?.[2] || "Dashboard"}</strong></div>${liveClockMarkup()}<span class="progress-pill">Administrator</span></header><div class="page-content">${content}</div><footer class="footer"><span>MathMaster · Admin area</span><span>Content changes are saved on this device</span></footer></main></div>`;
}

function renderAdminWelcome() {
  app.innerHTML = `<main class="admin-welcome"><section class="section-card admin-login-card"><a class="brand" href="./admin.html"><span class="brand-mark">M</span><span>MathMaster<small>ADMIN STUDIO</small></span></a><div class="eyebrow">ADMINISTRATOR ACCESS</div><h1>Manage your maths platform.</h1><p class="muted">Sign in to manage questions, lessons and learner accounts.</p><form id="login-form" class="form-stack"><label>Admin email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" minlength="8" required></label><button class="button button-primary">Sign in to admin →</button></form><button class="button button-secondary button-wide" data-action="demo-admin">Open local admin preview →</button><p class="privacy-note">Admin sessions are separate from student sessions on this device.</p><a class="subtle-link" href="./index.html">Go to the student site ↗</a></section></main>`;
}

function pageHeader(eyebrow, title, subtitle, action = "") {
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;
}

function renderWelcome() {
  if (isAdminPortal) { renderAdminWelcome(); return; }
  app.innerHTML = `<main class="welcome">
    <section class="welcome-story"><a class="brand brand-light" href="#"><span class="brand-mark">M</span><span>MathMaster <small>IGCSE MATHEMATICS</small></span></a><div class="welcome-copy"><span class="welcome-pill"><span class="online-dot"></span> YOUR PERSONAL MATHS COMPANION</span><h1>Master IGCSE<br><em>Mathematics.</em></h1><p>Learn. Practice. Improve. Prepare for your exam.</p><div class="welcome-cta"><button class="button button-light" data-action="start-learning">Start Learning <span>→</span></button><button class="welcome-test-link" data-action="guest-diagnostic">Take Diagnostic Test</button></div><div class="welcome-points"><span>✦ Clear, step-by-step lessons</span><span>✦ Practice made for your goals</span><span>✦ Your progress, always saved here</span></div></div><div class="welcome-foot">Made for curious minds, everywhere.</div></section>
    <section class="welcome-form-wrap"><div class="welcome-form-card"><div class="form-tabs"><button class="form-tab active" data-auth-mode="register">Create account</button><button class="form-tab" data-auth-mode="login">Log in</button></div><div id="auth-panel"></div><p class="privacy-note">🔒 Your account and learning data stay in this browser. No third-party services.</p></div></section>
  </main>
  <section class="public-preview"><div class="preview-inner"><div class="eyebrow">YOUR MATHS, YOUR WAY</div><h2>Everything you need to make progress.</h2><p>One calm, clear place to learn, practise and feel ready for exam day.</p><div class="preview-features">${[["📚", "Learn", "Friendly lessons and worked examples"], ["✏", "Practice", "Instant checking and helpful methods"], ["▣", "Exams", "Original quizzes and timed mocks"], ["◷", "Progress", "See your scores grow by topic"], ["▦", "Study Plan", "A routine shaped around your goal"], ["✧", "Achievements", "Celebrate the little wins"]].map(([icon, title, text]) => `<article><span>${icon}</span><strong>${title}</strong><small>${text}</small></article>`).join("")}</div><div class="preview-topics"><strong>Explore the curriculum</strong>${topics.map(topic => `<span>${esc(topic.name)}</span>`).join("")}</div><div class="preview-how"><span class="eyebrow">HOW IT WORKS</span><h2>One step at a time.</h2><div>${["Take a diagnostic test", "Discover your strengths and weaknesses", "Learn each topic", "Practice questions", "Take exams", "Review mistakes", "Improve your score"].map((step, i) => `<span><i>${i + 1}</i>${step}</span>`).join("")}</div></div></div></section>`;
  renderAuthForm("register");
}

function renderAuthForm(mode) {
  const panel = document.querySelector("#auth-panel");
  if (!panel) return;
  panel.innerHTML = mode === "login" ? `
    <div class="eyebrow">WELCOME BACK</div><h2>Pick up where you left off.</h2><p class="muted">Log in to continue your maths journey.</p>
    <form id="login-form" class="form-stack"><label>Email address<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label><label>Password<input name="password" type="password" required autocomplete="current-password" minlength="8" placeholder="At least 8 characters"></label><button class="button button-primary button-wide">Log in <span>→</span></button></form>
    <a class="text-button portal-entry-link" href="./admin.html">Admin sign-in ↗</a>`
    : `<div class="eyebrow">YOUR NEXT CHAPTER</div><h2>Make maths your superpower.</h2><p class="muted">Create your account and set a goal worth working towards.</p>
    <form id="register-form" class="form-stack">
      <div class="input-row"><label>Your name<input name="name" required autocomplete="name" placeholder="Alex Morgan"></label><label>Email address<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label></div>
      <div class="input-row"><label>Exam board<select name="board"><option>Cambridge IGCSE</option><option>Edexcel International GCSE</option></select></label><label>Target grade<select name="target"><option>A*</option><option selected>A</option><option>B</option><option>C</option><option>D</option><option>Other</option></select></label></div>
      <label>Exam date <span class="optional">(optional)</span><input name="examDate" type="date"></label>
      ${goalPicker(["Improve my grade"])}
      <label>Create password<input name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></label>
      <label>How confident do you feel?<select name="confidence"><option>Very low</option><option>Low</option><option selected>Average</option><option>Good</option><option>Very good</option></select></label>
      <button class="button button-primary button-wide">Create my account <span>→</span></button>
    </form><a class="text-button portal-entry-link" href="./admin.html">Admin sign-in ↗</a>`;
  document.querySelectorAll("[data-auth-mode]").forEach(tab => tab.classList.toggle("active", tab.dataset.authMode === mode));
}

async function passwordHash(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  if (!crypto.subtle) throw new Error("Secure password storage is unavailable here. Open MathMaster through localhost or a secure website.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256);
  return { salt: Array.from(salt), hash: Array.from(new Uint8Array(bits)) };
}

function renderHome() {
  displayedDailyDate = todayKey();
  const daily = makeDailyQuestion(todayKey());
  const completed = user.profile.completedLessons.length;
  const attempts = user.profile.questionsCompleted;
  const nextLesson = allLessons().find(item => !user.profile.completedLessons.includes(item.id)) || allLessons()[0];
  const diagnosticDone = user.profile.diagnosticDone;
  const recs = recommendations();
  return `${pageHeader("YOUR LEARNING SPACE", `Good ${greeting()}, ${esc(user.profile.name.split(" ")[0])} <span class="wave">✦</span>`, "A little practice today goes a long way.", `<a class="button button-secondary" href="#Profile">View profile <span>→</span></a>`)}
    ${!diagnosticDone ? `<section class="diagnostic-banner"><div class="diagnostic-icon">◎</div><div><span class="eyebrow">A GREAT PLACE TO START</span><h2>Discover your maths strengths</h2><p>Take a quick diagnostic and get a study plan shaped around you.</p></div><button class="button button-light" data-action="start-diagnostic">Take diagnostic <span>→</span></button><div class="banner-decoration">x²</div></section>` : ""}
    <div class="stat-grid">
      <article class="stat-card"><span class="stat-icon mint">✦</span><span class="stat-label">Total XP</span><strong class="stat-number">${user.profile.xp.toLocaleString()}</strong><span class="stat-caption">Level ${user.profile.level} · ${Math.max(0, user.profile.level * 250 - user.profile.xp)} XP to next</span><div class="tiny-progress"><i style="width:${user.profile.xp % 250 / 2.5}%"></i></div></article>
      <article class="stat-card"><span class="stat-icon streak-stat-icon" data-live-flame="home">${streakFlame(currentStreak(user.profile), "home")}</span><span class="stat-label">Current streak</span><strong class="stat-number"><span data-live-streak>${currentStreak(user.profile)}</span><small> days</small></strong><span class="stat-caption">Every day is a fresh start</span></article>
      <article class="stat-card"><span class="stat-icon lilac">▤</span><span class="stat-label">Lessons done</span><strong class="stat-number">${completed}<small> / ${allLessons().length}</small></strong><span class="stat-caption">Keep building your knowledge</span><div class="tiny-progress"><i style="width:${Math.min(100, completed / allLessons().length * 100)}%"></i></div></article>
      <article class="stat-card"><span class="stat-icon sky">✎</span><span class="stat-label">Questions answered</span><strong class="stat-number">${attempts}</strong><span class="stat-caption">${user.profile.mistakes.filter(item => !item.improved).length} to review</span></article>
    </div>
    <div class="dashboard-grid"><div class="dashboard-main">
      <section class="section-card today-card"><div class="section-title-row"><div><span class="eyebrow">YOUR NEXT STEP</span><h2>Pick up where you left off</h2></div><a class="subtle-link" href="#Learn">All lessons <span>→</span></a></div>
        <div class="next-lesson"><div class="topic-art ${topicInfo(nextLesson.topic).color}">${topicInfo(nextLesson.topic).icon}</div><div class="next-lesson-info"><div class="chip chip-${topicInfo(nextLesson.topic).color}">${esc(nextLesson.topic)}</div><h3>${esc(nextLesson.title)}</h3><p>${esc(nextLesson.objective)}</p></div><button class="round-arrow" data-lesson="${esc(nextLesson.id)}" aria-label="Open lesson">→</button></div>
      </section>
      <section class="section-card topic-card"><div class="section-title-row"><div><span class="eyebrow">YOUR CURRICULUM</span><h2>Explore a topic</h2></div><a class="subtle-link" href="#Learn">View all <span>→</span></a></div><div class="topic-grid">${topics.map(topic => `<a class="topic-tile" href="#Learn" data-topic-filter="${esc(topic.name)}"><span class="topic-icon ${topic.color}">${topic.icon}</span><span><strong>${esc(topic.name)}</strong><small>${topic.subtopics.length} topics · ${user.profile.topicScores[topic.name] !== undefined ? `${pc(user.profile.topicScores[topic.name])} score` : "Start exploring"}</small></span><span class="tile-arrow">↗</span></a>`).join("")}</div></section>
      <section class="section-card recommendations"><div class="section-title-row"><div><span class="eyebrow">A LITTLE EXTRA HELP</span><h2>Recommended for you</h2></div><span class="recommend-mark">✦</span></div><div class="recommend-list">${recs.map(rec => `<button class="recommend-item" data-topic-filter="${esc(rec.topic)}" data-go-learn><span class="recommend-icon">${topicInfo(rec.topic).icon}</span><span><strong>${esc(rec.title)}</strong><small>${esc(rec.reason)}</small></span><span>→</span></button>`).join("")}</div></section>
    </div><aside class="dashboard-side"><section class="daily-card"><div class="daily-top"><span class="eyebrow">DAILY MATHS CHALLENGE</span><span class="daily-spark">✧</span></div><h2>Two minutes.<br>One little win.</h2><p>A fresh question is ready for you today.</p><div class="daily-question"><span class="chip chip-yellow">Number · Easy</span><p>${esc(daily.text)}</p><div class="daily-date-notice" id="daily-date-notice" hidden></div><form id="daily-form"><input name="answer" inputmode="decimal" placeholder="Your answer" aria-label="Daily challenge answer" required ${user.profile.dailyChallenges.includes(todayKey()) ? "disabled" : ""}><button class="button button-dark button-wide" ${user.profile.dailyChallenges.includes(todayKey()) ? "disabled" : ""}>${user.profile.dailyChallenges.includes(todayKey()) ? "Completed today ✓" : "Check answer →"}</button></form></div><div class="daily-footer"><span>+15 XP on completion</span><span>◷ 2 min</span></div></section>
    <section class="mini-plan"><div class="section-title-row"><div><span class="eyebrow">YOUR STUDY PLAN</span><h3>${user.profile.studyPlan ? "Keep your rhythm" : "Build a routine"}</h3></div><span class="plan-icon">▦</span></div><p>${user.profile.studyPlan ? `${user.profile.studyPlan.days} study days · ${user.profile.studyPlan.minutes} min a day` : "A simple plan makes big goals feel achievable."}</p><a href="#Study%20Plan" class="subtle-link">${user.profile.studyPlan ? "See this week's plan" : "Create your study plan"} <span>→</span></a></section>
    <section class="quote-card"><span>“</span><p>It always seems impossible until it’s done.</p><small>— A good reminder for maths</small><div class="quote-decoration">∑</div></section>
    </aside></div>`;
}

function greeting() { const hour = new Date().getHours(); return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"; }

function renderLearn() {
  const all = allLessons();
  const query = lessonSearch.trim().toLowerCase();
  const isUnitView = lessonTopicFilter === "All topics" && !query;
  const visible = all.filter(lesson => (lessonTopicFilter === "All topics" || lesson.topic === lessonTopicFilter) &&
    (!query || `${lesson.title} ${lesson.topic} ${lesson.subtopic} ${lesson.objective}`.toLowerCase().includes(query)));
  const completeCount = user.profile.completedLessons.length;
  const unit = topics.find(topic => topic.name === lessonTopicFilter);
  const action = `<a href="#Formula%20Reference" class="button button-secondary">Formula Reference <span>∑</span></a>`;
  return `${pageHeader("THE CURRICULUM", "Learn something new.", "A complete IGCSE course: choose a unit, open a lesson, work through examples, then practise.", action)}
    <form id="curriculum-search" class="curriculum-search"><label><span>⌕</span><input name="query" value="${esc(lessonSearch)}" placeholder="Search lessons, e.g. quadratic, percentage, circle…" aria-label="Search lessons"></label><button class="button button-primary">Search</button>${lessonSearch ? `<button class="text-button" type="button" data-action="clear-curriculum-search">Clear</button>` : ""}<span class="progress-pill">${completeCount} of ${all.length} lessons complete</span></form>
    ${isUnitView ? `<div class="unit-grid">${topics.map(topic => {
      const unitLessons = all.filter(lesson => lesson.topic === topic.name);
      const completed = unitLessons.filter(lesson => user.profile.completedLessons.includes(lesson.id)).length;
      const progress = Math.round(completed / Math.max(1, unitLessons.length) * 100);
      return `<button class="unit-card" data-topic-filter="${esc(topic.name)}"><div class="unit-card-top"><span class="topic-icon ${topic.color}">${topic.icon}</span><span class="unit-progress-label">${completed}/${unitLessons.length} complete</span></div><h2>${esc(topic.name)}</h2><p>${unitLessons.length} structured lessons · ${topic.subtopics.length} syllabus points</p><div class="unit-progress-track"><i style="width:${progress}%"></i></div><div class="unit-card-bottom"><span>${progress}% unit progress</span><span>Open unit →</span></div></button>`;
    }).join("")}</div><section class="section-card curriculum-map"><div class="section-title-row"><div><span class="eyebrow">YOUR COURSE</span><h2>Eight units. One step at a time.</h2></div></div><div class="curriculum-grid">${topics.map(topic => `<div><span class="curriculum-icon ${topic.color}">${topic.icon}</span><strong>${esc(topic.name)}</strong><small>${topic.subtopics.slice(0, 8).join(" · ")}${topic.subtopics.length > 8 ? ` · +${topic.subtopics.length - 8} more` : ""}</small></div>`).join("")}</div></section>` : `<div class="unit-breadcrumb"><button class="back-link" data-topic-filter="All topics">← All units</button><div><span class="eyebrow">${query ? "SEARCH RESULTS" : "UNIT"}</span><h2>${query ? `Lessons matching “${esc(lessonSearch)}”` : `${topicInfo(lessonTopicFilter).icon} ${esc(lessonTopicFilter)}`}</h2><p>${query ? `${visible.length} lessons found across the curriculum.` : `${unit?.subtopics.length || 0} syllabus points · ${visible.filter(lesson => user.profile.completedLessons.includes(lesson.id)).length} lessons completed`}</p></div>${!query && unit ? `<button class="button button-primary" data-start-topic-test="${esc(unit.name)}">Unit mini-test · 20 questions <span>→</span></button>` : ""}</div><div class="lesson-grid">${visible.map((lesson, index) => {
      const info = topicInfo(lesson.topic), done = user.profile.completedLessons.includes(lesson.id);
      return `<article class="lesson-card"><div class="lesson-card-top"><span class="topic-icon ${info.color}">${info.icon}</span><span class="lesson-status ${done ? "done" : ""}">${done ? "✓ Complete" : `LESSON ${index + 1}`}</span></div><div class="chip chip-${info.color}">${esc(lesson.topic)} · ${esc(lesson.subtopic)}</div><h2>${esc(lesson.title)}</h2><p>${esc(lesson.objective)}</p><div class="lesson-card-bottom"><span>${done ? "Completed · revisit anytime" : "Lesson · Examples · Practice"}</span><button class="round-arrow" data-lesson="${esc(lesson.id)}" aria-label="Open ${esc(lesson.title)}">→</button></div></article>`;
    }).join("") || `<div class="empty-state">No lessons match that search. Try another term or browse all eight units.</div>`}</div>`}`;
}

function renderFormulaReference() {
  const query = formulaSearch.trim().toLowerCase();
  const searchTerm = query.replace(/\bsine\b/g, "sin").replace(/\bcosine\b/g, "cos").replace(/\btangent\b/g, "tan");
  const matcher = /^[a-z0-9]+$/i.test(searchTerm)
    ? new RegExp(`\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
    : null;
  const filtered = topics.map(topic => ({
    ...topic,
    formulas: allLessons().filter(lesson => lesson.topic === topic.name)
      .map(lesson => ({ subtopic: lesson.subtopic, formula: lesson.formula }))
      .filter(item => {
        const content = `${item.subtopic} ${item.formula}`;
        return item.formula && (!searchTerm || (matcher ? matcher.test(content) : content.toLowerCase().includes(searchTerm)));
      }),
  })).filter(topic => topic.formulas.length);
  return `${pageHeader("QUICK REFERENCE", "Formula reference.", "A locally stored guide to key rules and relationships across the IGCSE course.", `<a href="#Learn" class="button button-secondary">← Back to curriculum</a>`)}
    <form id="formula-search" class="curriculum-search"><label><span>⌕</span><input name="query" value="${esc(formulaSearch)}" placeholder="Search formulas or topics…" aria-label="Search formulas"></label><button class="button button-primary">Search</button>${formulaSearch ? `<button class="text-button" type="button" data-action="clear-formula-search">Clear</button>` : ""}</form>
    <div class="formula-reference-units">${filtered.map(topic => `<details class="formula-unit" open><summary><span class="curriculum-icon ${topic.color}">${topic.icon}</span><strong>${esc(topic.name)}</strong><span>${topic.formulas.length} references</span></summary><div class="formula-reference-list">${topic.formulas.map(item => `<article><span>${esc(item.subtopic)}</span><strong>${esc(item.formula)}</strong></article>`).join("")}</div></details>`).join("") || `<div class="empty-state">No formulas match that search. Try a topic name or a mathematical term.</div>`}</div>`;
}

function renderLesson() {
  const lesson = allLessons().find(item => item.id === selectedLesson) || allLessons()[0];
  if (!lesson) return `${pageHeader("THE CURRICULUM", "Lesson not found", "Choose a unit from the curriculum to continue.")}`;
  const info = topicInfo(lesson.topic), done = user.profile.completedLessons.includes(lesson.id);
  const next = lesson.nextLessonId ? allLessons().find(item => item.id === lesson.nextLessonId) : allLessons().find(item => item.topic !== lesson.topic);
  const unitLessons = allLessons().filter(item => item.topic === lesson.topic);
  const unitComplete = unitLessons.filter(item => user.profile.completedLessons.includes(item.id)).length;
  return `<button class="back-link" data-topic-filter="${esc(lesson.topic)}">← Back to ${esc(lesson.topic)}</button>
    ${pageHeader(`${esc(lesson.topic)} · LESSON`, esc(lesson.title), esc(lesson.objective), `<span class="lesson-time">◷ 8–12 min · ${esc(lesson.subtopic)}</span>`)}
    <div class="lesson-layout"><article class="lesson-reading">
      <section class="reading-block"><div class="reading-icon ${info.color}">${info.icon}</div><div class="eyebrow">LEARNING OBJECTIVE</div><h2>What you’ll learn</h2><p>${esc(lesson.objective)}</p><div class="lesson-prerequisite"><strong>Before you begin</strong><span>${esc(lesson.prerequisite)}</span></div></section>
      <section class="key-terms"><div class="eyebrow">KEY TERMS</div><div>${lesson.keyTerms.map(term => `<span>${esc(term)}</span>`).join("")}</div></section>
      <section class="reading-block"><div class="eyebrow">THE IDEA</div><h2>Understand ${esc(lesson.subtopic.toLowerCase())}</h2><p>${esc(lesson.explanation)}</p></section>
      <section class="rules-box"><div class="eyebrow">KEY RULES</div><ul>${lesson.keyRules.map(rule => `<li>${esc(rule)}</li>`).join("")}</ul></section>
      <section class="formula-box"><span>FORMULA / KEY RELATIONSHIP</span><strong>${esc(lesson.formula)}</strong><a href="#Formula%20Reference" class="subtle-link">Open the full formula reference →</a></section>
      <section class="reading-block worked-examples"><div class="eyebrow">WORKED EXAMPLES · EASY TO CHALLENGE</div><h2>Watch the method, step by step</h2>${lesson.workedExamples.map((example, index) => `<article class="worked-example"><span class="chip chip-${info.color}">EXAMPLE ${index + 1} · ${["EASY", "MEDIUM", "CHALLENGE"][index]}</span><h3>${esc(example.question)}</h3><ol class="solution-steps">${example.steps.map(step => `<li>${esc(step)}</li>`).join("")}</ol><div class="example-answer"><span>Answer</span><strong>${esc(example.answer)}</strong></div></article>`).join("")}</section>
      <section class="why-box"><span class="eyebrow">WHY THIS WORKS</span><p>${esc(lesson.whyItWorks)}</p></section>
      <section class="mistakes-box"><div class="eyebrow">COMMON MISTAKES</div>${lesson.commonMistakes.map(item => `<article><strong>Watch out</strong><p>${esc(item.mistake)}</p><strong>Better approach</strong><p>${esc(item.correct)} ${esc(item.why)}</p></article>`).join("")}</section>
      <section class="reading-block quick-check"><div class="eyebrow">QUICK CHECK</div><h2>Can you recall the key ideas?</h2>${lesson.quickCheck.map((item, index) => `<details class="lesson-question"><summary><span>${index + 1}. ${esc(item.question)}</span><small>Reveal answer</small></summary><p><b>Answer:</b> ${esc(item.answer)}</p></details>`).join("")}</section>
      <section class="reading-block lesson-practice"><div class="eyebrow">PRACTICE · ${lesson.practiceQuestions.length} QUESTIONS</div><h2>Now you try</h2><p>Cover the answer first, show your working, and compare your method.</p>${lesson.practiceQuestions.map((item, index) => `<details class="lesson-question"><summary><span>${index + 1}. ${esc(item.question)} <small>${esc(item.difficulty)} · ${item.marks} ${item.marks === 1 ? "mark" : "marks"}</small></span><small>Show solution</small></summary><p><b>Answer:</b> ${esc(item.answer)}</p><p>${esc(item.explanation)}</p><p><b>Hint:</b> ${esc(item.hint)}</p></details>`).join("")}<a href="#Practice" class="button button-secondary">Practise interactively · earn XP <span>→</span></a></section>
      <section class="challenge-box"><span class="chip chip-orange">CHALLENGE QUESTIONS</span>${lesson.challenges.map(item => `<article><p>${esc(item.question)}</p><details><summary>Reveal answer and method</summary><p><b>${esc(item.answer)}</b></p><p>${esc(item.explanation)}</p></details></article>`).join("")}</section>
      <section class="reading-block"><div class="eyebrow">ORIGINAL EXAM-STYLE PRACTICE</div><h2>Put it into an exam context</h2>${lesson.examQuestions.map(item => `<article class="exam-style-question"><p>${esc(item.question)}</p><span>${item.marks} marks</span><details><summary>Show a model answer</summary><p><b>${esc(item.answer)}</b></p><p>${esc(item.explanation)}</p></details></article>`).join("")}<a href="#Question%20Bank" class="button button-secondary">Open the question bank <span>→</span></a></section>
      <section class="summary-box"><span class="eyebrow">SUMMARY</span><p>${esc(lesson.summary)}</p><ul>${lesson.keyThings.map(item => `<li>${esc(item)}</li>`).join("")}</ul></section>
      <div class="lesson-footer-actions"><button class="button button-secondary" data-action="restart-lesson">↺ Restart lesson</button><button class="button ${done ? "button-complete" : "button-primary"} complete-lesson" data-complete-lesson="${esc(lesson.id)}">${done ? "✓ Lesson complete" : "Mark as complete · +25 XP"}</button></div>
      <a class="next-lesson-link" href="#Lesson" data-lesson="${esc(next?.id || lesson.id)}"><span><small>NEXT LESSON</small><strong>${esc(next?.title || "Revisit this lesson")}</strong></span><span>Continue →</span></a>
    </article><aside class="lesson-aside"><div class="lesson-aside-card"><span class="eyebrow">UNIT PROGRESS</span><strong>${unitComplete}<small> / ${unitLessons.length}</small></strong><p>${esc(lesson.topic)} lessons complete</p><div class="tiny-progress"><i style="width:${unitComplete / Math.max(1, unitLessons.length) * 100}%"></i></div><span class="lesson-progress-caption">${done ? "Lovely work. Keep it up!" : "Every lesson adds up."}</span></div><div class="lesson-aside-card"><span class="eyebrow">UNIT MINI-TEST</span><strong>20<small> questions</small></strong><p>Mixed difficulty · original questions · estimated score</p><button class="button button-secondary button-wide" data-start-topic-test="${esc(lesson.topic)}">Take unit test →</button></div><div class="lesson-aside-card related-card"><span class="eyebrow">UP NEXT</span><strong>${esc(next?.title || "Keep practising")}</strong><button class="text-button" data-lesson="${esc(next?.id || lesson.id)}">Continue learning →</button></div></aside></div>`;
}

function renderPractice() {
  const current = questionList[questionIndex];
  const isMistake = questionList._mistakeMode;
  if (!current) {
    questionList = freshQuestionSet();
    questionIndex = 0;
    return renderPractice();
  }
  return `${pageHeader("PRACTISE", isMistake ? "A second look." : "Practice makes progress.", isMistake ? "Give these tricky questions another go." : "One question at a time. Take your time, and don't be afraid to try.")}
    <div class="practice-wrap"><div class="practice-meta"><span class="chip chip-${topicInfo(current.topic).color}">${esc(current.topic)} · ${esc(current.subtopic)}</span><span class="difficulty-label difficulty-${current.difficulty.toLowerCase()}">${esc(current.difficulty)}</span><span class="practice-counter">Question ${questionIndex + 1} of ${questionList.length}</span></div>
    <div class="practice-progress"><i style="width:${(questionIndex + 1) / questionList.length * 100}%"></i></div>
    <section class="question-card"><div class="question-mark">${current.marks} ${current.marks === 1 ? "MARK" : "MARKS"}</div><h2>${esc(current.text)}</h2>${questionVisual(current)}
      ${current.type === "multipart" ? `<form id="practice-answer-form">${renderPaperParts(current, practiceAnswer || {})}<button class="button button-primary" ${questionResult ? "disabled" : ""}>Check answers →</button></form>` : current.type === "multipleChoice" ? `<div class="answer-options">${current.options.map((option, i) => `<label class="answer-option ${questionResult && checkAnswer(current, option) ? "option-correct" : ""}"><input type="radio" name="practice-answer" value="${esc(option)}" ${questionResult && checkAnswer(current, option) ? "checked" : ""} ${questionResult ? "disabled" : ""}><span class="option-letter">${String.fromCharCode(65 + i)}</span>${esc(option)}</label>`).join("")}</div>` : current.type === "trueFalse" ? `<div class="answer-options">${["True", "False"].map(option => `<label class="answer-option ${questionResult && checkAnswer(current, option) ? "option-correct" : ""}"><input type="radio" name="practice-answer" value="${option.toLowerCase()}" ${questionResult && checkAnswer(current, option) ? "checked" : ""} ${questionResult ? "disabled" : ""}><span class="option-letter">${option[0]}</span>${option}</label>`).join("")}</div>` : current.type === "matching" ? `<div class="matching-list">${current.matchingPairs.map(pair => `<label><strong>${esc(pair.left)}</strong><span>=</span><select data-practice-match="${esc(pair.left)}" ${questionResult ? "disabled" : ""}><option value="">Choose a match</option>${current.matchingOptions.map(option => `<option value="${esc(option)}" ${normalizeOption(practiceAnswer?.[pair.left]) === normalizeOption(option) ? "selected" : ""}>${esc(option)}</option>`).join("")}</select></label>`).join("")}</div>` : `<form id="practice-answer-form" class="answer-form"><label class="answer-input-label">Your answer<input name="answer" autocomplete="off" inputmode="text" placeholder="Type your answer here…" ${questionResult ? "disabled" : ""} required></label><span class="answer-unit">${esc(current.unit || "")}</span><button class="button button-primary" ${questionResult ? "disabled" : ""}>Check answer <span>→</span></button></form>`}
      ${["multipleChoice", "trueFalse", "matching"].includes(current.type) && !questionResult ? `<button class="button button-primary check-choice" data-action="check-choice">Check answer <span>→</span></button>` : ""}
      ${showHint && !questionResult ? `<div class="hint-box"><span>💡 HINT</span>${esc(current.hint)}</div>` : ""}
      ${questionResult ? `<div class="answer-feedback ${questionResult.correct ? "correct" : "incorrect"}"><strong>${questionResult.correct ? "Correct! +10 XP ✦" : "Not quite."}</strong>${!questionResult.correct ? `<p><b>Correct answer:</b> ${esc(answerDisplay(current.answer))}</p>` : ""}<p>${esc(current.explanation)}</p><small>Method: ${esc(current.explanation)}</small></div>` : ""}
      <div class="question-actions">${!questionResult ? `<button class="text-button" data-action="hint">💡 Show hint</button><button class="text-button" data-action="solution">Show solution</button>` : `<button class="text-button" data-action="try-again">↻ Try again</button><button class="button button-primary" data-action="next-question">${questionIndex + 1 === questionList.length ? "Finish practice" : "Next question"} <span>→</span></button>`}</div>
    </section><div class="practice-bottom"><button class="text-button" data-action="shuffle-questions">↻ Try a different set</button><span>✦ Correct answers earn 10 XP</span><a href="#Mistakes">Review mistakes →</a></div></div>`;
}

function questionResultFor(question, answer) {
  const correct = checkAnswer(question, answer);
  const attempt = { ...question, id: question.id, topic: question.topic, subtopic: question.subtopic, text: question.text, answer: question.answer, explanation: question.explanation, studentAnswer: answer, matchingPairs: question.matchingPairs, correct, date: new Date().toISOString(), difficulty: question.difficulty };
  user.profile.questionsCompleted++;
  user.profile.attempts.push(attempt);
  recordActivity(user, correct ? 10 : 0);
  if (!correct) user.profile.mistakes.unshift({ ...attempt, improved: false });
  if (correct) {
    const previousMistake = user.profile.mistakes.find(item => item.id === question.id && !item.improved);
    if (previousMistake) previousMistake.improved = true;
  }
  const topicAttempts = user.profile.attempts.filter(item => item.topic === question.topic);
  user.profile.topicScores[question.topic] = Math.round(topicAttempts.filter(item => item.correct).length / topicAttempts.length * 100);
  unlockAchievements();
  updateUser(store, user);
  return { correct };
}

function unlockAchievements() {
  for (const badge of badgeRules) {
    if (!user.profile.achievements.includes(badge.id) && badge.rule(user)) {
      user.profile.achievements.push(badge.id);
      toast(`Achievement unlocked: ${badge.name} ${badge.icon}`);
    }
  }
}

function renderBankPager(page, action) {
  if (!page.total) return "";
  return `<nav class="bank-pagination" aria-label="Question pages"><span>Showing ${page.start + 1}–${page.end} of ${page.total.toLocaleString()}</span><div><button class="button button-secondary" data-${action}="${page.page - 1}" ${page.page === 1 ? "disabled" : ""}>← Previous</button><span aria-live="polite">Page ${page.page} of ${page.pages}</span><button class="button button-secondary" data-${action}="${page.page + 1}" ${page.page === page.pages ? "disabled" : ""}>Next →</button></div></nav>`;
}

function renderBank() {
  const collection = allQuestions();
  const filtered = filterBank(collection, bankFilters);
  const page = bankPage(filtered, bankPageNumber);
  bankPageNumber = page.page;
  const skills = [...new Set(collection.filter(q => bankFilters.topic === "All topics" || q.topic === bankFilters.topic).map(q => q.subtopic))].sort();
  return `${pageHeader("YOUR QUESTION COLLECTION", "Question bank", "Explore original IGCSE-style questions with worked solutions. Search by keyword or choose a skill and tier.", `<span class="progress-pill">${filtered.length.toLocaleString()} questions</span>`)}
    <form id="bank-search" class="bank-search"><label for="bank-query">Search questions or skills<input id="bank-query" name="query" type="search" value="${esc(bankFilters.query)}" placeholder="Try fractions, vectors or compound interest"></label><button class="button button-primary">Search →</button><button type="button" class="button button-secondary" data-action="bank-reset">Reset filters</button></form>
    <section class="section-card bank-filters"><div class="select-filter"><span>COURSE TIER</span><select aria-label="Course tier" data-filter="level">${["All tiers", "Core", "Extended"].map(level => `<option ${level === bankFilters.level ? "selected" : ""}>${level}</option>`).join("")}</select></div><div class="select-filter"><span>TOPIC</span><select aria-label="Topic" data-filter="topic"><option>All topics</option>${topics.map(t => `<option ${bankFilters.topic === t.name ? "selected" : ""}>${t.name}</option>`).join("")}</select></div><div class="select-filter"><span>DIFFICULTY</span><select aria-label="Difficulty" data-filter="difficulty"><option>All levels</option>${["Easy", "Medium", "Hard", "Exam"].map(x => `<option ${bankFilters.difficulty === x ? "selected" : ""}>${x}</option>`).join("")}</select></div><div class="select-filter"><span>QUESTION TYPE</span><select aria-label="Question type" data-filter="type"><option>All types</option>${[["numerical", "Numerical answer"], ["multipleChoice", "Multiple choice"], ["shortAnswer", "Short answer"], ["trueFalse", "True / false"], ["matching", "Matching"]].map(([key, label]) => `<option value="${key}" ${bankFilters.type === key ? "selected" : ""}>${label}</option>`).join("")}</select></div><div class="select-filter"><span>SKILL</span><select aria-label="Skill" data-filter="subtopic"><option>All skills</option>${skills.map(skill => `<option ${bankFilters.subtopic === skill ? "selected" : ""}>${esc(skill)}</option>`).join("")}</select></div><div class="select-filter"><span>CALCULATOR</span><select aria-label="Calculator mode" data-filter="calculator">${["Either", "Calculator", "Non-calculator"].map(mode => `<option ${bankFilters.calculator === mode ? "selected" : ""}>${mode}</option>`).join("")}</select></div></section>
    <section class="bank-list">${page.items.map((q, i) => `<article class="bank-item"><span class="bank-number">${String(page.start + i + 1).padStart(2, "0")}</span><div class="bank-question"><div class="bank-meta"><span class="chip chip-${topicInfo(q.topic).color}">${esc(q.topic)}</span><span>${esc(q.subtopic)}${q.level ? ` · ${esc(q.level)}` : ""}</span><span class="difficulty-label difficulty-${q.difficulty.toLowerCase()}">${esc(q.difficulty)}</span></div><h3>${esc(q.text)}</h3><div class="bank-detail">${q.marks} ${q.marks === 1 ? "mark" : "marks"} · ~${q.time} min · ${q.calculator === false ? "Non-calculator" : "Calculator"} · ${esc(q.type === "multipleChoice" ? "Multiple choice" : q.type === "numerical" ? "Numerical answer" : q.type === "trueFalse" ? "True / false" : q.type === "matching" ? "Matching" : "Short answer")}</div></div><button class="button button-secondary" data-practise-id="${esc(q.id)}">Practise <span>→</span></button></article>`).join("") || `<div class="empty-state">No questions match those filters. Try choosing a different level or topic.</div>`}</section>
    ${renderBankPager(page, "bank-page")}
    <p class="bank-source-note">Original IGCSE-style practice, including numerical variants. For real exam questions and official mark schemes, <a href="${papaCambridgeUrl}" target="_blank" rel="noopener noreferrer">open PapaCambridge ↗</a>.</p>
    <button class="button button-secondary" data-action="generate-equation">✦ Generate a fresh question</button>`;
}

function renderDaily() {
  displayedDailyDate = todayKey();
  const daily = makeDailyQuestion(todayKey());
  const done = user.profile.dailyChallenges.includes(todayKey());
  const solved = user.profile.dailyAnswer;
  return `${pageHeader("A LITTLE DAILY WIN", "Daily Maths Challenge", "A small, satisfying puzzle. New challenge each day; no rush.", `<span class="progress-pill">✦ +15 XP</span>`)}
    <div class="daily-page-card"><div class="daily-page-decoration">%</div><span class="chip chip-yellow">NUMBER · EASY · 1 MARK</span><div class="eyebrow">TODAY'S CHALLENGE · ${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div><h2>${esc(daily.text)}</h2><p>Take a moment to work it out. There’s no timer here.</p><div class="daily-date-notice" id="daily-date-notice" hidden></div><form id="daily-form" class="daily-answer-form"><input name="answer" inputmode="decimal" placeholder="Your answer" required ${done ? "disabled" : ""}><button class="button button-primary" ${done ? "disabled" : ""}>${done ? "Completed ✓" : "Check answer →"}</button></form>${done ? `<div class="answer-feedback ${solved ? "correct" : "incorrect"}"><strong>${solved ? "You got it! +15 XP ✦" : "Challenge completed."}</strong><p>${esc(daily.explanation)}</p><small>Answer: ${esc(daily.answer)}</small></div>` : ""}<div class="daily-footer"><span>☼ A daily streak starts with today</span><span>◷ Around 2 minutes</span></div></div>`;
}

function startExam(type) {
  if (uploadInProgress) { toast("Wait for the upload to finish saving before starting another test."); return; }
  const isDiagnostic = type === "diagnostic";
  let list;
  if (type.startsWith("paper:")) {
    const paper = buildIGCSEPaper(type.slice(6), Math.random, user.profile.recentQuestionTexts || []);
    list = paper.questions;
    user.profile.recentQuestionTexts = [...(user.profile.recentQuestionTexts || []), ...list.flatMap(q => q.parts.map(part => part.text))].slice(-200);
    updateUser(store, user);
    exam = { type, paper, questions: list, answers: {}, working: {}, uploads: {}, mode: user.profile.testMode || "typed", flags: [], index: 0, started: Date.now(), duration: paper.duration };
    examResult = null; route = "Exam"; render(); return;
  }
  if (isDiagnostic) list = topics.map(topic => freshQuestionSet(topic.name, 1)[0]).filter(Boolean);
  else if (type.startsWith("unit:")) {
    const topic = type.slice(5);
    list = freshQuestionSet(topic, 20);
    if (!list.length) { toast(`Could not assemble 20 distinct verified ${topic} questions.`, "error"); return; }
  }
  else if (type.startsWith("topic:")) list = freshQuestionSet(type.slice(6));
  else if (type === "short") list = freshQuestionSet();
  else if (type === "full") list = freshQuestionSet("All topics", 20);
  else list = freshQuestionSet("All topics", 12);
  if (!list.length) { toast("There are no questions for that test yet.", "error"); return; }
  exam = { type, questions: list, answers: {}, working: {}, uploads: {}, mode: user.profile.testMode || "typed", flags: [], index: 0, started: Date.now(), duration: isDiagnostic ? 0 : type === "short" ? 15 : type === "full" ? 45 : 25 };
  examResult = null;
  route = "Exam";
  render();
}

function examTime() { return Math.max(0, exam.duration * 60 - Math.floor((Date.now() - exam.started) / 1000)); }

function renderExam() {
  if (!exam) return renderExams();
  if (examResult) return renderExamResult();
  const q = exam.questions[exam.index], remaining = exam.duration ? examTime() : null;
  const value = exam.answers[q.id] ?? "";
  return `<div class="exam-shell"><div class="exam-top"><button class="text-button" data-action="exam-exit">← Exit test</button><div><strong>${exam.paper ? esc(exam.paper.title) : exam.type === "diagnostic" ? "Diagnostic test" : exam.type.startsWith("unit:") ? `${esc(exam.type.slice(5))} unit test` : "Practice exam"}</strong><small>${exam.questions.length} questions · ${exam.questions.reduce((sum, x) => sum + x.marks, 0)} marks</small></div><div class="exam-timer ${remaining !== null && remaining < 60 ? "timer-warning" : ""}">${remaining === null ? "NO TIMER" : `◷ ${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`}</div></div>
    <div class="exam-layout"><aside class="exam-sidebar"><span class="eyebrow">QUESTIONS</span><div class="exam-question-nav">${exam.questions.map((item, i) => `<button class="exam-nav-number ${i === exam.index ? "current" : ""} ${answeredQuestion(item) ? "answered" : ""} ${exam.flags.includes(item.id) ? "flagged" : ""}" data-exam-goto="${i}" aria-label="Question ${i + 1}">${i + 1}</button>`).join("")}</div><div class="exam-key"><span>● Answered</span><span>⚑ Flagged</span></div><button class="button button-primary button-wide exam-submit-sidebar" data-action="exam-submit">Review & submit</button></aside>
    <section class="exam-question"><button type="button" class="text-button print-working-button" data-action="print-working-paper">Print questions / save as PDF ↗</button><div class="exam-q-meta"><span>QUESTION ${exam.index + 1} <span class="muted">/ ${exam.questions.length}</span></span><span>${q.marks} ${q.marks === 1 ? "MARK" : "MARKS"}</span></div><div class="practice-progress"><i style="width:${(exam.index + 1) / exam.questions.length * 100}%"></i></div><div class="test-answer-mode"><label>How are you answering?<select id="exam-answer-mode"><option value="typed" ${exam.mode !== "upload" ? "selected" : ""}>Type answers and working</option><option value="upload" ${exam.mode === "upload" ? "selected" : ""}>Calculate on paper · upload working</option></select></label></div><h2>${esc(q.text)}</h2>${questionVisual(q)}${exam.paper ? `<p class="paper-mode">${exam.paper.calculator ? "Scientific calculator allowed" : "Do not use a calculator"} · Show your working clearly.</p>` : ""}
    ${exam.mode === "upload" ? (q.type === "multipart" ? renderPaperParts(q, {}, true) : "") : q.type === "multipart" ? renderPaperParts(q, value || {}) : q.type === "multipleChoice" || q.type === "trueFalse" ? `<div class="answer-options">${(q.type === "trueFalse" ? ["True", "False"] : q.options).map((option, i) => `<label class="answer-option"><input type="radio" name="exam-answer" value="${esc(option)}" ${normalizeOption(value) === normalizeOption(option) ? "checked" : ""}><span class="option-letter">${String.fromCharCode(65 + i)}</span>${esc(option)}</label>`).join("")}</div>` : q.type === "matching" ? `<div class="matching-list">${q.matchingPairs.map(pair => `<label><strong>${esc(pair.left)}</strong><span>=</span><select data-exam-match="${esc(pair.left)}"><option value="">Choose a match</option>${q.matchingOptions.map(option => `<option value="${esc(option)}" ${normalizeOption(value?.[pair.left]) === normalizeOption(option) ? "selected" : ""}>${esc(option)}</option>`).join("")}</select></label>`).join("")}</div>` : `<label class="answer-input-label">Your answer<input id="exam-answer-input" value="${esc(value)}" autocomplete="off" inputmode="text" placeholder="Type your answer here…"></label>`}${renderWorking(q)}${renderUploadPanel(exam.uploads[q.id] || [], exam.index, "exam", uploadInProgress)}
    <button class="exam-flag ${exam.flags.includes(q.id) ? "is-flagged" : ""}" data-action="exam-flag">${exam.flags.includes(q.id) ? "⚑ Flagged for review" : "⚐ Flag for review"}</button>
    <div class="exam-bottom"><button class="button button-secondary" data-exam-nav="-1" ${exam.index === 0 ? "disabled" : ""}>← Previous</button><span>${exam.questions.filter(answeredQuestion).length} answered</span>${exam.index + 1 === exam.questions.length ? `<button class="button button-primary" data-action="exam-submit">Review & submit →</button>` : `<button class="button button-primary" data-exam-nav="1">Next question →</button>`}</div>
    </section></div></div>`;
}
function normalizeOption(value) { return String(value ?? "").trim().toLowerCase(); }

function questionVisual(question) {
  const table = question.table;
  const diagram = question.diagram;
  return `${table ? `<div class="exam-table-wrap"><table class="exam-data-table"><thead><tr>${table.headers.map(header => `<th>${esc(header)}</th>`).join("")}</tr></thead><tbody>${table.rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}${diagram?.kind === "rightTriangle" ? `<figure class="exam-diagram"><svg viewBox="0 0 340 210" role="img" aria-label="Triangle ABC, right angled at B. AB ${esc(diagram.vertical)}, BC ${esc(diagram.horizontal)}."><path d="M70 35 L70 165 L275 165 Z M70 148 H87 V165" fill="none" stroke="currentColor" stroke-width="2"/><text x="57" y="25">A</text><text x="53" y="185">B</text><text x="282" y="175">C</text><text x="10" y="105">${esc(diagram.vertical)}</text><text x="148" y="195">${esc(diagram.horizontal)}</text><text x="183" y="83">${esc(diagram.diagonal)}</text></svg><figcaption>Not to scale</figcaption></figure>` : ""}`;
}

function renderPaperParts(question, answers, readOnly = false) {
  const practice = route === "Practice";
  return `<div class="paper-parts">${question.parts.map((part, index) => `<section class="paper-part"><div class="paper-part-prompt"><strong>(${String.fromCharCode(97 + index)})</strong><p>${esc(part.text)}</p><span>[${part.marks}]</span></div>${questionVisual(part)}${readOnly ? "" : `<label class="answer-input-label">Answer (${String.fromCharCode(97 + index)})${part.accuracy ? ` · ${esc(part.accuracy)}` : ""}<div class="paper-answer-line"><input ${practice ? `name="part-${index}"` : `data-exam-part="${index}"`} autocomplete="off" inputmode="text" value="${esc(answers[index] || "")}" placeholder="${part.answerFormat ? "Separate values with a comma" : "Your final answer"}" ${practice && questionResult ? "disabled" : ""}><span>${esc(part.unit || "")}</span></div></label>`}</section>`).join("")}</div>`;
}

function renderWorking(question) {
  return `<label class="exam-working-label">Show your working<textarea id="exam-working" rows="4" placeholder="Write equations, calculations and reasons here. Your working is saved when you move between questions.">${esc(exam?.working?.[question.id] || "")}</textarea></label>`;
}

function answeredQuestion(question) {
  if (exam.mode === "upload") return Boolean(exam.uploads[question.id]?.length);
  const answer = exam.answers[question.id];
  return question.type === "multipart" ? question.parts.every((_, i) => String(answer?.[i] ?? "").trim()) : answer && (typeof answer !== "object" || Object.values(answer).every(value => String(value).trim()));
}

function renderRealPaperChoices() {
  const numbers = paperLevel === "Core" ? [1, 3] : [2, 4];
  return `<section class="section-card paper-introduction real-paper-introduction"><span class="eyebrow">REAL CAMBRIDGE PAST PAPERS · ${paperLevel.toUpperCase()}</span><h2>Practise a complete paper.</h2><p>Pick an archived exam below. Papers with a checked question index have Previous / Next navigation, a saved answer for every question and the complete original diagrams in the PDF.</p><label class="paper-level-label">Course tier<select id="real-paper-level">${["Core", "Extended"].map(level => `<option ${level === paperLevel ? "selected" : ""}>${level}</option>`).join("")}</select></label><div class="paper-choice-grid">${numbers.map(number => {
    const papers = pastPapers.filter(p => p.paper === number);
    return `<article class="paper-choice"><span class="chip chip-violet">OFFICIAL PAST PAPER</span><h3>Paper ${number}</h3><label class="real-paper-select">Year, session and variant<select id="real-paper-${number}" aria-label="Choose official Paper ${number}">${papers.map(p => `<option value="${p.id}">${esc(paperTitle(p))}</option>`).join("")}</select></label><p>Read the original questions, type all parts of your working or upload your paper, then review with the matching Cambridge mark scheme.</p><button class="button button-primary button-wide" data-real-paper-number="${number}">Start Paper ${number} →</button></article>`;
  }).join("")}</div><p class="paper-scoring-note">For all years, sessions and variants, use the full catalogue below. Marking official papers requires a learner or teacher to check the official scheme.</p></section>`;
}

function renderPaperChoices() {
  return `<section class="section-card paper-introduction"><span class="eyebrow">CAMBRIDGE IGCSE MATHEMATICS · 0580</span><h2>Practise an original mock paper.</h2><p>Original questions for the 2025–2027 syllabus. Choose your tier and calculator mode. Each attempt gives you a fresh set.</p><label class="paper-level-label">Answer format<select id="test-answer-mode"><option value="typed" ${user.profile.testMode !== "upload" ? "selected" : ""}>Type answers</option><option value="upload" ${user.profile.testMode === "upload" ? "selected" : ""}>Work on paper & upload</option></select></label><label class="paper-level-label">Course tier<select id="paper-level">${["Core", "Extended"].map(level => `<option ${level === paperLevel ? "selected" : ""}>${level}</option>`).join("")}</select></label><div class="paper-choice-grid">${paperSpecs.filter(spec => spec.level === paperLevel).map(spec => `<article class="paper-choice"><span class="chip chip-blue">${spec.level.toUpperCase()}</span><h3>Paper ${spec.number}</h3><strong>${spec.calculator ? "Calculator" : "Non-calculator"}</strong><p>${spec.duration === 90 ? "1 hour 30 minutes" : "2 hours"} · ${spec.marks} marks · ${spec.marks / 5} multipart questions</p><ul><li>${spec.calculator ? "Use a scientific calculator" : "Solve without a calculator"}</li><li>Answer all parts and show your working</li><li>Review answers and worked solutions after submitting</li></ul><button class="button button-primary button-wide" data-start-exam="paper:${spec.number}">Start Paper ${spec.number} →</button></article>`).join("")}</div><p class="paper-scoring-note">Type answers for instant checking, or calculate on paper and upload photos or a PDF. Paper working uses a learner/teacher review with method and accuracy marks. Everything stays in this browser.</p></section>`;
}

function renderSolutionReview() {
  return `<section class="section-card paper-solutions"><span class="eyebrow">WORKING, MARKS & FEEDBACK</span><h2>Review your paper</h2>${workingReviewSummary(examResult)}${renderMarkingGuide()}<p>Inspect each solution and award the criteria below. Photos are evidence for your review; uploading a page does not award marks automatically.</p>${examResult.review.map((item, index) => `<details class="paper-solution" data-review-card="${index}" ${activeReviewQuestion === index ? "open" : ""}><summary><strong>Question ${index + 1} · ${esc(item.question.topic)}</strong><span>${summariseWorkingReviews([item]).earned}/${item.question.marks} reviewed</span></summary>${renderUploadPanel(item.files || [], index, "review", uploadInProgress)}<label class="review-note-label">Typed working or optional transcription<textarea rows="4" data-review-working="${index}" placeholder="Copy key calculations from your paper, one per line. For example: 8 × 5 = 40">${esc(item.working || "")}</textarea></label><p class="calculation-check-note">Arithmetic checks compare typed equalities only. They do not read the uploaded pages or award method marks.</p><button type="button" class="button button-secondary" data-check-calculations="${index}">Check typed calculations</button>${renderCalculationFeedback(item)}${(item.question.parts || [item.question]).map((part, i) => `<article><p><b>${item.question.parts ? `(${String.fromCharCode(97 + i)}) ` : ""}${esc(part.text)}</b></p>${questionVisual(part)}${item.submitted !== undefined ? `<p>Your typed answer: <strong>${esc(answerDisplay(item.question.parts ? item.submitted?.[i] ?? "No answer" : item.submitted ?? "No answer"))}</strong></p>` : ""}<p>Answer: <strong>${esc(answerDisplay(part.answer))}${part.unit ? ` ${esc(part.unit)}` : ""}</strong></p><ol>${(part.markScheme || [part.explanation]).map(step => `<li>${esc(step)}</li>`).join("")}</ol>${renderTypedAssistant(part, item, index, i)}${renderMethodCriteria(part, item.methodReviews?.[i], index, i)}</article>`).join("")}${index + 1 < examResult.review.length ? `<button class="button button-secondary" data-next-working-review="${index + 1}">Review next question →</button>` : ""}</details>`).join("")}</section>`;
}

function renderPrintableWorkingPaper() {
  return `<section class="printable-working-paper"><header><h1>${esc(exam.paper?.title || "MathMaster calculation test")}</h1><p>Original IGCSE-style practice · ${exam.questions.reduce((sum, question) => sum + question.marks, 0)} marks${exam.duration ? ` · ${exam.duration} minutes` : ""}</p><p>Name: ________________________ Date: __________________</p><p>${exam.paper ? exam.paper.calculator ? "Scientific calculator allowed." : "Do not use a calculator." : "Follow the instructions in each question."} Show all necessary working. Label your uploaded pages with question numbers and part letters.</p></header>${exam.questions.map((question, index) => `<article class="printable-question"><h2>Question ${index + 1} <span>[${question.marks}]</span></h2><p>${esc(question.text)}</p>${questionVisual(question)}${question.type === "multipart" ? renderPaperParts(question, {}, true) : ""}<div class="paper-working-space"></div></article>`).join("")}</section>`;
}

function renderCalculationFeedback(item) {
  if (!item.calculationChecks) return "";
  return `<div class="calculation-feedback" role="status"><strong>Arithmetic feedback</strong>${item.calculationChecks.length ? `<ul>${item.calculationChecks.map(check => `<li class="calculation-${check.status}"><b>Line ${check.line} · ${check.status === "correct" ? "consistent" : check.status === "incorrect" ? "check arithmetic" : "manual review"}</b><p>${esc(check.message)}</p></li>`).join("")}</ul>` : "<p>Enter a calculation with =, such as 8 × 5 = 40. Algebra needs human review.</p>"}</div>`;
}

function renderUploadedResult() {
  return `${pageHeader("PAPER WORKING", "Your submitted working", "Review the uploaded pages and award method, accuracy and independent marks.")}${renderSolutionReview()}<div class="result-actions"><button class="button button-primary" data-action="finish-exam">Save review & return to dashboard →</button></div>`;
}

function persistExamDraft() {
  if (!user || !exam) return;
  user.profile.paperDraft = exam;
  updateUser(store, user);
}

function releaseWorkingUrls() {
  for (const url of uploadUrls.values()) URL.revokeObjectURL(url);
  uploadUrls.clear();
}

async function hydrateWorkingPreviews() {
  const owner = user?.email;
  if (!owner) { releaseWorkingUrls(); return; }
  const elements = [...document.querySelectorAll("[data-work-preview], [data-work-open]")];
  const visible = new Set(elements.map(element => element.dataset.workPreview || element.dataset.workOpen));
  for (const [key, url] of uploadUrls) {
    if (!key.startsWith(`${owner}:`) || !visible.has(key.slice(owner.length + 1))) {
      URL.revokeObjectURL(url); uploadUrls.delete(key);
    }
  }
  await Promise.all([...visible].map(async id => {
    try {
      const key = `${owner}:${id}`;
      let url = uploadUrls.get(key);
      if (!url) {
        const blob = await readWorkFile(owner, id);
        if (!blob) {
          for (const element of elements.filter(element => element.dataset.workOpen === id && element.isConnected)) element.textContent = "File unavailable in this browser";
          return;
        }
        if (user?.email !== owner || !elements.some(element => element.isConnected)) return;
        url = URL.createObjectURL(blob); uploadUrls.set(key, url);
      }
      for (const element of elements.filter(element => (element.dataset.workPreview || element.dataset.workOpen) === id && element.isConnected)) {
        if (element.dataset.workPreview) element.src = url;
        else element.href = url;
      }
    } catch {
      for (const element of elements.filter(element => element.dataset.workOpen === id && element.isConnected)) element.textContent = "File unavailable in this browser";
    }
  }));
}

async function attachWorkingFiles(target) {
  if (uploadInProgress || !user) return;
  if (target.dataset.workingUpload === "official") { await attachOfficialWorking(target); return; }
  const owner = user.email, context = target.dataset.workingUpload, index = Number(target.dataset.workingQuestion);
  const session = context === "exam" ? exam : examResult;
  if (!session) return;
  const question = context === "exam" ? session.questions[index] : session.review[index]?.question;
  if (!question) return;
  const files = Array.from(target.files || []);
  if (!files.length) return;
  if (context === "exam") saveCurrentExamAnswer();
  const existing = context === "exam" ? (session.uploads[question.id] ||= []) : (session.review[index].files ||= []);
  uploadInProgress = true;
  if (context === "review") activeReviewQuestion = index;
  render();
  try {
    const metadata = await saveWorkFiles(owner, files, existing.length);
    existing.push(...metadata);
    if (user?.email === owner) {
      if (context === "exam" && exam === session) persistExamDraft();
      if (context === "review" && examResult === session) persistMethodReview();
    }
  } catch (error) {
    toast(error.message, "error");
  } finally {
    uploadInProgress = false;
    if (user?.email === owner) {
      render();
      if (context === "exam" && exam === session && exam.duration && examTime() === 0) submitExam();
    }
  }
}

async function removeWorkingAttachment(target) {
  if (uploadInProgress || !user) return;
  if (target.dataset.workingContext === "official") {
    const attempt = activeOfficialAttempt(), id = target.dataset.removeWorking;
    if (!attempt?.files.some(file => file.id === id)) return;
    try {
      await deleteWorkFile(user.email, id);
      attempt.files = attempt.files.filter(file => file.id !== id);
      updateUser(store, user); refreshOfficialControls();
    } catch (error) { toast(error.message, "error"); }
    return;
  }
  const context = target.dataset.workingContext, index = Number(target.dataset.workingQuestion), id = target.dataset.removeWorking;
  const session = context === "exam" ? exam : examResult;
  const files = context === "exam" ? session?.uploads[session.questions[index]?.id] : session?.review[index]?.files;
  if (!files?.some(file => file.id === id)) return;
  if (context === "exam") saveCurrentExamAnswer();
  try {
    await deleteWorkFile(user.email, id);
    files.splice(files.findIndex(file => file.id === id), 1);
    if (context === "exam") persistExamDraft();
    else { activeReviewQuestion = index; persistMethodReview(); }
    render();
  } catch (error) { toast(error.message, "error"); }
}

function submitWorkingExam() {
  const duration = Math.max(1, Math.round((Date.now() - exam.started) / 60000));
  const id = crypto.randomUUID();
  const result = { id, mode: "upload", reviewer: "self", paper: exam.paper, duration, diagnostic: exam.type === "diagnostic",
    review: exam.questions.map(question => ({ question, submitted: exam.answers[question.id], working: exam.working[question.id] || "", files: exam.uploads[question.id] || [], methodReviews: {} })) };
  user.profile.exams.unshift({ id, mode: "upload", date: new Date().toISOString(), title: exam.paper?.title || "Paper working test", duration,
    percentage: null, grade: null, correct: null, total: exam.questions.length, diagnostic: result.diagnostic, status: "pending-review", review: result });
  user.profile.paperDraft = null;
  recordActivity(user, 0);
  updateUser(store, user);
  examResult = result; activeReviewQuestion = 0; exam = null; clearInterval(examTimer);
  route = "ExamResult"; render();
}

function persistMethodReview() {
  if (!examResult || !user) return;
  const record = user.profile.exams.find(item => item.id === examResult.id);
  if (!record) return;
  const summary = summariseWorkingReviews(examResult.review);
  examResult.methodSummary = summary;
  record.review = examResult;
  record.reviewedParts = summary.reviewedParts;
  record.reviewer = examResult.reviewer || "self";
  record.status = summary.complete ? "reviewed" : "pending-review";
  if (examResult.mode === "upload" || summary.complete) {
    record.percentage = summary.percentage;
    record.earned = summary.earned;
    record.totalMarks = summary.total;
    record.grade = null;
  }
  if (summary.complete) {
    examResult.percentage = summary.percentage; examResult.earned = summary.earned;
    Object.assign(user.profile.topicScores, summary.topicScores);
    examResult.topicScores = summary.topicScores;
    if (examResult.mode === "upload") {
      record.correct = examResult.review.filter(item => summariseWorkingReviews([item]).earned === item.question.marks).length;
      user.profile.attempts = user.profile.attempts.filter(item => item.reviewExamId !== record.id);
      user.profile.mistakes = user.profile.mistakes.filter(item => item.reviewExamId !== record.id);
      for (const item of examResult.review) {
        const reviewed = summariseWorkingReviews([item]);
        const attempt = { ...item.question, reviewExamId: record.id, studentAnswer: item.submitted || "See uploaded working", earned: reviewed.earned,
          correct: reviewed.earned === reviewed.total, date: new Date().toISOString(), reviewedBy: record.reviewer };
        user.profile.attempts.push(attempt);
        if (!attempt.correct) user.profile.mistakes.unshift({ ...attempt, improved: false });
      }
      if (!record.workingRecorded) { user.profile.questionsCompleted += examResult.review.length; record.workingRecorded = true; }
      if (examResult.diagnostic) user.profile.diagnosticDone = true;
    }
  }
  updateUser(store, user);
}

function renderExamReview() {
  return `<div class="exam-shell"><div class="exam-top"><button class="text-button" data-action="exam-back">← Back to questions</button><div><strong>Review your answers</strong><small>Take one last look before submitting.</small></div><span class="exam-timer">REVIEW</span></div><section class="review-screen"><div class="eyebrow">BEFORE YOU SUBMIT</div><h1>You’re nearly there.</h1><p>${exam.questions.filter(answeredQuestion).length} of ${exam.questions.length} ${exam.mode === "upload" ? "questions with working attached" : "answered"} · ${exam.flags.length} flagged for review</p><div class="review-grid">${exam.questions.map((q, i) => `<button data-exam-goto="${i}" class="review-question ${answeredQuestion(q) ? "answered" : "unanswered"}"><span>Q${i + 1}</span><span>${answeredQuestion(q) ? "Answered" : "Not answered"}${exam.flags.includes(q.id) ? " · ⚑ Flagged" : ""}</span><span>→</span></button>`).join("")}</div><div class="review-actions"><button class="button button-secondary" data-action="exam-back">Keep checking</button><button class="button button-primary" data-action="exam-final-submit">Submit test <span>→</span></button></div></section></div>`;
}

function renderExamResult() {
  const result = examResult;
  if (result.mode === "upload") return renderUploadedResult();
  const isDiagnostic = result.diagnostic;
  const strengths = Object.entries(result.topicScores).sort((a, b) => b[1] - a[1]);
  return `<div class="result-page"><div class="result-hero"><span class="result-confetti">✦</span><span class="eyebrow">${isDiagnostic ? "YOUR DIAGNOSTIC RESULTS" : "TEST COMPLETE"}</span><h1>${isDiagnostic ? "Your starting point." : "Look how far you’ve come."}</h1><p>${isDiagnostic ? "Here’s a first look at your maths strengths and where to focus next." : "Your results are ready. Every question is a chance to grow."}</p><div class="result-score">${result.percentage}<small>%</small></div><span class="estimated-grade">${result.methodSummary?.complete ? "Reviewed working practice score" : result.paper ? "Final-answer practice score" : `Estimated grade · ${esc(estimatedGrade(result.percentage))}`}</span></div>
    <div class="result-stats"><div><strong>${result.earned} / ${result.totalMarks}</strong><small>Final-answer marks</small></div><div><strong>${result.totalMarks - result.earned}</strong><small>Marks to pick up</small></div><div><strong>${result.duration}</strong><small>Minutes used</small></div><div><strong>+${result.xp}</strong><small>XP earned</small></div></div>
    <section class="section-card result-topic-card"><div class="section-title-row"><div><span class="eyebrow">TOPIC PERFORMANCE</span><h2>A little insight goes a long way</h2></div></div>${strengths.map(([topic, score]) => `<div class="topic-score-row"><span>${esc(topic)}</span><div class="score-track"><i class="score-${topicInfo(topic).color}" style="width:${score}%"></i></div><strong>${score}%</strong></div>`).join("")}<p class="strength-copy">Your strongest topic: <strong>${esc(strengths[0]?.[0] || "—")}</strong> · Most room to grow: <strong>${esc(strengths.at(-1)?.[0] || "—")}</strong></p></section>
    <section class="result-recommendation"><span class="recommend-icon">✦</span><div><span class="eyebrow">A GOOD NEXT STEP</span><h3>${esc(recommendations()[0].title)}</h3><p>${esc(recommendations()[0].reason)}</p></div><a href="#Learn" class="button button-primary">Explore lessons →</a></section>
    ${renderSolutionReview()}<div class="result-actions"><button class="button button-secondary" data-action="review-mistakes">Review mistakes</button><button class="button button-primary" data-action="finish-exam">Back to my dashboard →</button></div></div>`;
}

function submitExam() {
  if (uploadInProgress) { toast("Wait for your upload to finish saving before submitting."); return; }
  if (exam.mode === "upload") { submitWorkingExam(); return; }
  const correctAnswers = exam.questions.filter(q => exam.answers[q.id] !== undefined && checkAnswer(q, exam.answers[q.id]));
  const earned = exam.questions.reduce((sum, q) => sum + scoreQuestion(q, exam.answers[q.id] ?? ""), 0);
  const totalMarks = exam.questions.reduce((sum, q) => sum + q.marks, 0);
  const duration = Math.max(1, Math.round((Date.now() - exam.started) / 60000));
  const topicScores = {};
  for (const topic of new Set(exam.questions.map(q => q.topic))) {
    const subset = exam.questions.filter(q => q.topic === topic);
    topicScores[topic] = Math.round(subset.reduce((sum, q) => sum + scoreQuestion(q, exam.answers[q.id] ?? ""), 0) / subset.reduce((sum, q) => sum + q.marks, 0) * 100);
    user.profile.topicScores[topic] = topicScores[topic];
  }
  for (const q of exam.questions) {
    user.profile.questionsCompleted++;
    const answer = exam.answers[q.id] ?? "";
    const correct = checkAnswer(q, answer);
    user.profile.attempts.push({ ...q, id: q.id, topic: q.topic, subtopic: q.subtopic, text: q.text, answer: q.answer, explanation: q.explanation, studentAnswer: answer, correct, date: new Date().toISOString(), difficulty: q.difficulty });
    if (!correct) user.profile.mistakes.unshift({ ...q, id: q.id, topic: q.topic, subtopic: q.subtopic, text: q.text, answer: q.answer, explanation: q.explanation, studentAnswer: answer, correct: false, date: new Date().toISOString(), improved: false });
  }
  const percentage = Math.round(earned / Math.max(1, totalMarks) * 100);
  const xp = Math.max(10, earned * 5);
  const resultId = crypto.randomUUID();
  user.profile.exams.unshift({ id: resultId, date: new Date().toISOString(), percentage, grade: estimatedGrade(percentage), title: exam.paper?.title, duration, correct: correctAnswers.length, total: exam.questions.length, diagnostic: exam.type === "diagnostic" });
  if (exam.type === "diagnostic") user.profile.diagnosticDone = true;
  recordActivity(user, xp);
  unlockAchievements();
  updateUser(store, user);
  examResult = { id: resultId, mode: "typed", paper: exam.paper, review: exam.questions.map(q => ({ question: q, submitted: exam.answers[q.id], working: exam.working[q.id], files: exam.uploads[q.id] || [], methodReviews: {}, earned: scoreQuestion(q, exam.answers[q.id] ?? "") })), percentage, earned, totalMarks, duration, correct: correctAnswers.length, xp, topicScores, diagnostic: exam.type === "diagnostic" };
  user.profile.exams[0].review = examResult;
  user.profile.paperDraft = null;
  updateUser(store, user);
  activeReviewQuestion = 0;
  exam = null;
  route = "ExamResult";
  render();
}

function renderExams() {
  return `${pageHeader("TEST YOUR KNOW-HOW", "A little exam practice?", "Try a short quiz, focus on a topic, or sit a complete IGCSE-style practice paper.", `<span class="progress-pill">No pressure · Just practice</span>`)}
    <section class="exam-intro"><div class="exam-intro-copy"><span class="eyebrow">YOUR EXAM PRACTICE SPACE</span><h2>Build exam confidence,<br>one question at a time.</h2><p>Choose a real past paper by year and session, or practise a fresh original mock. Your practice result is not an official exam grade.</p></div><div class="exam-graphic"><div class="graphic-paper"><span>IGCSE</span><strong>∑</strong><i>Practice paper</i><i>12 questions · 25 min</i><i>✦ Original questions</i></div><span class="graphic-star">✧</span></div></section>
    ${renderPastPaperCatalog(pastFilters, pastPageNumber)}${renderPastPaperHistory(user.profile.officialPapers)}
    ${user.profile.paperDraft ? `<section class="section-card resume-working-card"><h2>Your saved test</h2><p>Your answers and uploaded pages are saved. The original test timer continues from its start time.</p><button class="button button-primary" data-action="resume-working">Resume test →</button></section>` : ""}${renderRealPaperChoices()}${renderPaperChoices()}<h2 class="section-heading">Shorter practice sessions</h2><div class="exam-choice-grid">
      <article class="exam-choice-card featured"><span class="exam-choice-icon">▤</span><span class="chip chip-blue">SUGGESTED START</span><h3>Diagnostic test</h3><p>A short question from every topic to help you find your starting point.</p><div class="choice-meta">8 topics · ~10 min · No timer</div><button class="button button-primary button-wide" data-action="start-diagnostic">Start diagnostic →</button></article>
      <article class="exam-choice-card"><span class="exam-choice-icon">◷</span><span class="chip chip-violet">QUICK PRACTICE</span><h3>Short mock</h3><p>A quick mixed set to warm up and test what you know.</p><div class="choice-meta">8 questions · 15 min · Timed</div><button class="button button-secondary button-wide" data-start-exam="short">Start short mock →</button></article>
      <article class="exam-choice-card"><span class="exam-choice-icon">▣</span><span class="chip chip-orange">FULL PRACTICE</span><h3>Mixed topic test</h3><p>Settle in for a longer mixed practice paper.</p><div class="choice-meta">20 questions · 45 min · Timed</div><button class="button button-secondary button-wide" data-start-exam="full">Start full mock →</button></article>
      <article class="exam-choice-card"><span class="exam-choice-icon">⌖</span><span class="chip chip-green">FOCUS SESSION</span><h3>Topic test</h3><p>Spend a little time on the topic you choose.</p><div class="select-filter"><span>CHOOSE TOPIC</span><select id="topic-exam-select">${topics.map(t => `<option>${t.name}</option>`).join("")}</select></div><button class="button button-secondary button-wide" data-action="start-topic-exam">Start topic test →</button></article>
    </div>
    <section class="section-card past-paper-notice"><span class="topic-icon yellow">▧</span><div><span class="eyebrow">PRACTISE RESPONSIBLY</span><h3>Looking for past papers?</h3><p>Open official Cambridge past papers and mark schemes, or practise a fresh original paper here.</p><a href="#Past%20Papers" class="subtle-link">Visit past papers <span>→</span></a></div></section>
    ${user.profile.exams.length ? `<section class="section-card"><div class="section-title-row"><div><span class="eyebrow">YOUR RECENT TESTS</span><h2>Progress, not perfection</h2></div></div>${user.profile.exams.slice(0, 4).map(item => `<div class="bank-item"><span class="bank-number">✓</span><div class="bank-question"><h3>${esc(item.title || (item.diagnostic ? "Diagnostic test" : "Practice mock exam"))}</h3><div class="bank-detail">${new Date(item.date).toLocaleDateString()} · ${item.duration} min · ${item.mode === "upload" ? `${item.reviewedParts || 0} parts reviewed` : `${item.correct}/${item.total} correct`}</div></div><strong class="exam-score">${Number.isFinite(item.percentage) ? `${item.percentage}%` : "Pending review"} <small>${item.mode === "upload" ? "reviewed practice" : "practice"}</small>${item.review ? `<button class="text-button" data-open-working-review="${esc(item.id)}">Review working →</button>` : ""}</strong></div>`).join("")}</section>` : ""}`;
}

function renderProgress() {
  const scores = topics.map(topic => ({ ...topic, score: getScore(topic.name), count: user.profile.attempts.filter(a => a.topic === topic.name).length }));
  const attempts = user.profile.attempts;
  const average = attempts.length ? Math.round(attempts.filter(a => a.correct).length / attempts.length * 100) : 0;
  const recent = user.profile.exams.filter(item => Number.isFinite(item.percentage)).slice(0, 5);
  return `${pageHeader("LOOK HOW FAR YOU'VE COME", "Your progress.", "Every lesson, every question, every small step adds up.", `<span class="progress-pill">Level ${user.profile.level} · ${user.profile.xp} XP</span>`)}
    <div class="progress-summary"><article><span class="eyebrow">OVERALL ACCURACY</span><strong>${attempts.length ? `${average}%` : "—"}</strong><small>${attempts.length ? `${attempts.length} questions tried` : "Try a question to get started"}</small></article><article><span class="eyebrow">CURRENT STREAK</span><strong><span data-live-streak>${currentStreak(user.profile)}</span><small> days</small></strong><small>One day at a time</small></article><article><span class="eyebrow">LESSONS COMPLETED</span><strong>${user.profile.completedLessons.length}<small> / ${allLessons().length}</small></strong><small>Keep up the lovely work</small></article><article><span class="eyebrow">MOCK EXAMS</span><strong>${user.profile.exams.filter(x => !x.diagnostic).length}</strong><small>${user.profile.exams.length ? `Best: ${user.profile.exams.some(x => Number.isFinite(x.percentage)) ? `${Math.max(...user.profile.exams.filter(x => Number.isFinite(x.percentage)).map(x => x.percentage))}%` : "Awaiting review"}` : "Your first is waiting"}</small></article></div>
    <div class="progress-layout"><section class="section-card topic-performance"><div class="section-title-row"><div><span class="eyebrow">BY TOPIC</span><h2>Where you shine</h2></div></div>${scores.map(t => `<div class="topic-score-row"><span class="topic-score-name"><i class="score-dot ${t.color}"></i>${esc(t.name)}</span><div class="score-track"><i class="score-${t.color}" style="width:${t.count ? t.score : 0}%"></i></div><strong>${t.count ? `${t.score}%` : "—"}</strong><small>${t.count} tried</small></div>`).join("")}</section>
    <section class="section-card xp-card"><div class="section-title-row"><div><span class="eyebrow">YOUR LEARNING JOURNEY</span><h2>XP & levels</h2></div><span class="xp-spark">✦</span></div><div class="level-display"><span class="level-medal">✦</span><div><span>LEVEL ${user.profile.level}</span><strong>${user.profile.xp} XP</strong></div></div><div class="level-track"><i style="width:${user.profile.xp % 250 / 2.5}%"></i></div><div class="level-caption"><span>Level ${user.profile.level}</span><span>${user.profile.level * 250 - user.profile.xp} XP to level ${user.profile.level + 1}</span></div><div class="xp-breakdown"><span>✓ Questions answered <strong>${user.profile.questionsCompleted}</strong></span><span>✓ Lessons completed <strong>${user.profile.completedLessons.length}</strong></span><span>✓ Tests taken <strong>${user.profile.exams.length}</strong></span></div></section></div>
    <section class="section-card score-history"><div class="section-title-row"><div><span class="eyebrow">YOUR TEST HISTORY</span><h2>Every test is a step forward</h2></div><a class="subtle-link" href="#Exams">Take a test →</a></div>${recent.length ? `<div class="history-chart">${recent.slice().reverse().map((item, i) => `<div class="history-bar"><span>${item.percentage}%</span><i style="height:${Math.max(6, item.percentage)}%"></i><small>${new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></div>`).join("")}</div>` : `<div class="empty-state">Your first practice test will show here. You’ve got this. <a href="#Exams">Take a test →</a></div>`}</section>`;
}

function renderMistakes() {
  const mistakes = user.profile.mistakes || [];
  return `${pageHeader("A CHANCE TO GROW", "Mistakes make great teachers.", "Review a tricky question, notice the method, and try it again.", `<span class="progress-pill">${mistakes.filter(item => !item.improved).length} to revisit</span>`)}
    <div class="mistake-list">${mistakes.length ? mistakes.map((item, i) => `<article class="mistake-card ${item.improved ? "mistake-improved" : ""}"><div class="mistake-card-top"><span class="chip chip-${topicInfo(item.topic).color}">${esc(item.topic)} · ${esc(item.subtopic)}</span><span class="mistake-date">${new Date(item.date).toLocaleDateString()} ${item.improved ? "· ✓ Improved" : ""}</span></div><h3>${esc(item.text)}</h3><div class="mistake-answer"><span>Your answer <strong>${esc(answerDisplay(item.studentAnswer || "No answer"))}</strong></span><span>Answer <strong>${esc(answerDisplay(item.answer))}</strong></span></div><p>${esc(item.explanation)}</p><button class="button button-secondary" data-practise-id="${esc(item.id)}" data-mistake-index="${i}">Practise again <span>→</span></button></article>`).join("") : `<div class="empty-state"><span class="empty-icon">✦</span><h3>No mistakes to review. Yet.</h3><p>Every question you get wrong will be kept here so you can revisit it.</p><a href="#Practice" class="button button-primary">Try some practice →</a></div>`}</div>`;
}

function renderStudyPlan() {
  const plan = studyPlanFor(user.profile), saved = !!user.profile.studyPlan;
  const heading = saved ? "Your schedule" : "Suggested schedule";
  const monthLabel = studyMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const today = todayKey();
  const selected = selectedStudyDate ? studySessionOn(plan, selectedStudyDate) : null;
  const selectedLabel = selectedStudyDate ? parseStudyDate(selectedStudyDate).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  const settings = !saved || editingStudyPlan ? `<section class="section-card plan-settings calendar-settings"><div class="section-title-row"><div><span class="eyebrow">MAKE IT YOURS</span><h2>Set your study rhythm</h2></div>${saved ? '<button class="text-button" data-study-action="cancel-settings">Cancel</button>' : ""}</div><p>Set a weekly routine. You can change individual days or repeat an edited session every week.</p><form id="study-plan-form" class="form-stack"><div class="input-row"><label>Exam date<input type="date" name="examDate" value="${esc(plan.examDate)}"></label><label>Target grade<select name="target">${["A*", "A", "B", "C", "D", "Other"].map(x => `<option ${plan.target === x ? "selected" : ""}>${x}</option>`).join("")}</select></label></div><div class="input-row"><label>Study days per week <strong class="range-value">${Math.max(1, plan.days)}</strong><input type="range" name="days" min="1" max="7" value="${Math.max(1, plan.days)}"></label><label>Minutes per study day <strong class="range-value">${plan.minutes}</strong><input type="range" name="minutes" min="15" max="120" step="15" value="${plan.minutes}"></label></div><label>Usual start time<input type="time" name="startTime" value="${esc(plan.startTime)}" required></label><button class="button button-primary">Done · Save my plan →</button></form></section>` : "";
  const editor = selectedStudyDate ? `<section class="section-card calendar-session-editor" id="study-session-editor"><div class="section-title-row"><div><span class="eyebrow">EDIT YOUR TIMETABLE</span><h2>${esc(selectedLabel)}</h2></div><button class="text-button" data-study-action="close-session">Close</button></div><form id="study-session-form" class="form-stack"><label>What will you study?<input name="activity" value="${esc(selected?.activity || "Practice mathematics")}" maxlength="100"></label><div class="input-row"><label>Start time<input type="time" name="startTime" value="${esc(selected?.startTime || plan.startTime)}"></label><label>Duration (minutes)<input name="minutes" type="number" min="5" max="240" value="${selected?.minutes || plan.minutes}"></label></div><label class="study-rest-choice"><input type="checkbox" name="rest" ${selected ? "" : "checked"}> Make this a rest day</label><label>Apply changes to<select name="scope"><option value="date">Only this date</option><option value="weekday">Every ${studyDayNames[(parseStudyDate(selectedStudyDate).getDay() + 6) % 7]}</option></select></label><div class="calendar-editor-actions"><button class="button button-primary">Save session →</button>${Object.hasOwn(plan.overrides, selectedStudyDate) ? '<button class="button button-secondary" type="button" data-study-action="restore-session">Use weekly timetable</button>' : ""}</div></form>${selected ? `<button class="text-button" data-study-action="complete-session">${plan.completions[selectedStudyDate] ? "Undo completion" : "✓ Mark session complete"}</button>` : ""}</section>` : "";
  return `${pageHeader("YOUR STUDY TIMETABLE", "Your study plan.", "Plan your learning, see your month and adjust any session whenever you need.", saved && !editingStudyPlan ? '<button class="button button-secondary" data-study-action="edit-settings">Edit my plan</button>' : "")}
    ${settings}<section class="section-card study-calendar"><div class="section-title-row"><div><span class="eyebrow">${saved ? "YOUR PERSONALISED PLAN" : "A STARTING POINT FOR YOU"}</span><h2>${heading}</h2><p class="muted">${plan.days} study days each week · Target ${esc(plan.target)}${plan.examDate ? ` · Exam ${esc(parseStudyDate(plan.examDate).toLocaleDateString())}` : ""}</p></div><div class="calendar-month-controls"><button class="icon-button" data-study-month="-1" aria-label="Previous month">←</button><h3 aria-live="polite">${esc(monthLabel)}</h3><button class="icon-button" data-study-month="1" aria-label="Next month">→</button><button class="button button-secondary" data-study-action="today">Today</button></div></div><p class="calendar-help">Select any date to edit its activity, time or duration. Your weekly timetable repeats${plan.examDate ? " until your exam date" : " each week"}.</p>
    ${editor}<div class="calendar-scroll"><div class="calendar-weekdays" aria-hidden="true">${studyDayNames.map(day => `<span>${day.slice(0, 3)}</span>`).join("")}</div><div class="calendar-grid">${calendarDays(studyMonth).map(date => {
      const key = studyDateKey(date), session = studySessionOn(plan, key), exam = key === plan.examDate;
      return `<button class="calendar-day ${date.getMonth() !== studyMonth.getMonth() ? "outside-month" : ""} ${key === today ? "is-today" : ""} ${session ? "has-session" : ""} ${exam ? "is-exam" : ""} ${plan.completions[key] ? "is-complete" : ""}" data-study-date="${key}" ${key === today ? 'aria-current="date"' : ""} aria-label="${esc(date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }))}: ${esc(exam ? "Exam day" : session ? `${session.activity}, ${sessionTimeLabel(session)}, ${session.minutes} minutes${plan.completions[key] ? ", completed" : ""}` : "Rest day")}. Edit session"><span class="calendar-date-number">${date.getDate()}${plan.completions[key] ? '<span class="calendar-completed-mark">✓</span>' : ""}</span>${exam ? '<strong class="calendar-exam-label">Exam day</strong>' : ""}${session ? `<span class="calendar-session-time">${sessionTimeLabel(session)}</span><strong>${esc(session.activity)}</strong><small>${session.minutes} min</small>` : '<span class="calendar-rest">Rest day</span>'}</button>`;
    }).join("")}</div></div></section>
    <section class="section-card weekly-timetable"><div class="section-title-row"><div><span class="eyebrow">REPEATS EACH WEEK</span><h2>Weekly timetable</h2></div></div><div class="weekly-timetable-grid">${plan.weeklySessions.map((session, i) => `<article><h3>${studyDayNames[i]}</h3>${session ? `<span>${sessionTimeLabel(session)}</span><strong>${esc(session.activity)}</strong><small>${session.minutes} minutes</small>` : '<span class="muted">Rest day</span>'}</article>`).join("")}</div></section>`;
}

function renderAchievements() {
  const unlocked = user.profile.achievements;
  const today = new Date();
  const since = new Date(today);
  if (leaderboardPeriod === "week") {
    since.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    since.setHours(0, 0, 0, 0);
  } else if (leaderboardPeriod === "month") {
    since.setDate(1);
    since.setHours(0, 0, 0, 0);
  }
  const rankings = store.users.filter(item => !item.profile.hideLeaderboard).map(item => {
    const ledger = item.profile.xpLedger || [];
    const xp = leaderboardPeriod === "all" ? item.profile.xp : ledger.filter(entry => new Date(`${entry.date}T00:00:00`) >= since).reduce((sum, entry) => sum + entry.xp, 0);
    const questions = leaderboardPeriod === "all" ? item.profile.questionsCompleted : (item.profile.attempts || []).filter(attempt => new Date(attempt.date) >= since).length;
    return { ...item, leaderboardXp: xp, leaderboardQuestions: questions };
  }).sort((a, b) => b.leaderboardXp - a.leaderboardXp).slice(0, 10);
  return `${pageHeader("CELEBRATE YOUR WINS", "Look at you go.", "Every little win deserves a moment. Here are the milestones you’re working towards.", `<span class="progress-pill">✧ ${unlocked.length} of ${badgeRules.length} badges</span>`)}
    <section class="section-card badges-section"><div class="section-title-row"><div><span class="eyebrow">YOUR BADGES</span><h2>Little milestones, big pride</h2></div></div><div class="badge-grid">${badgeRules.map(b => `<article class="badge-card ${unlocked.includes(b.id) ? "unlocked" : "locked"}"><span class="badge-icon">${b.icon}</span>${unlocked.includes(b.id) ? `<span class="badge-earned">EARNED</span>` : `<span class="badge-lock">LOCKED</span>`}<h3>${esc(b.name)}</h3><p>${esc(b.description)}</p></article>`).join("")}</div></section>
    <section class="section-card leaderboard"><div class="section-title-row"><div><span class="eyebrow">A LITTLE FRIENDLY MOTIVATION</span><h2>Community leaderboard</h2></div><select aria-label="Leaderboard period" data-leaderboard-period><option ${leaderboardPeriod === "all" ? "selected" : ""} value="all">All-time</option><option ${leaderboardPeriod === "week" ? "selected" : ""} value="week">Weekly</option><option ${leaderboardPeriod === "month" ? "selected" : ""} value="month">Monthly</option></select></div><div class="leaderboard-note">This demo leaderboard includes accounts saved on this device only.</div>${rankings.length ? rankings.map((item, i) => `<div class="leader-row ${item.email === user.email ? "leader-self" : ""}"><span class="leader-rank">${["🥇", "🥈", "🥉"][i] || `0${i + 1}`}</span><span class="avatar avatar-small">${esc(initials(item.profile.name))}</span><span class="leader-name">${esc(item.profile.name)} ${item.email === user.email ? "<small>You</small>" : ""}</span><span class="leader-questions">${item.leaderboardQuestions} questions</span><strong>${item.leaderboardXp} XP</strong></div>`).join("") : `<div class="empty-state">Your leaderboard appears here.</div>`}<label class="hide-leaderboard"><input type="checkbox" data-action="hide-leaderboard" ${user.profile.hideLeaderboard ? "checked" : ""}> Hide me from the leaderboard</label></section>`;
}

function applyAppearance() {
  const preferences = !isAdminPortal && user ? readPreferences(user.email) : { theme: "dark", textSize: "standard" };
  document.documentElement?.setAttribute("data-theme", preferences.theme);
  document.documentElement?.style?.setProperty("--text-scale", String(textSizes[preferences.textSize]));
}

function passwordSettings() {
  return `<section class="section-card password-section"><span class="eyebrow">ACCOUNT SECURITY</span><h2>Reset your password</h2><form id="password-form" class="form-stack"><label>Current password<input type="password" name="current" required minlength="8" autocomplete="current-password"></label><div class="input-row"><label>New password<input type="password" name="next" required minlength="8" autocomplete="new-password"></label><label>Confirm new password<input type="password" name="confirmation" required minlength="8" autocomplete="new-password"></label></div><small>Use at least 8 characters. Your previous password will stop working.</small><button class="button button-primary" ${passwordSaving ? "disabled" : ""}>Update password</button></form><p class="muted">Forgot your current password? <a class="subtle-link" href="#Help%20Center">Ask the admin for a reset →</a></p></section>`;
}

function renderSettings() {
  const preferences = readPreferences(user.email);
  return `${pageHeader("MAKE YOURSELF COMFORTABLE", "Settings.", "Choose how your learning space looks and reads.")}
    <section class="section-card settings-appearance"><span class="eyebrow">APPEARANCE</span><h2>Theme & text size</h2><form class="form-stack" id="appearance-form"><div class="input-row"><label>Theme<select name="theme" data-preference="theme"><option value="dark" ${preferences.theme === "dark" ? "selected" : ""}>Dark · neon mint</option><option value="light" ${preferences.theme === "light" ? "selected" : ""}>Light · neon green</option></select></label><label>Text size<select name="textSize" data-preference="textSize">${[["standard", "Standard"], ["large", "Large (115%)"], ["largest", "Extra large (130%)"]].map(([value, label]) => `<option value="${value}" ${preferences.textSize === value ? "selected" : ""}>${label}</option>`).join("")}</select></label></div><p class="appearance-sample">Preview: clear explanations, comfortable reading, and a little neon green.</p><p class="muted">Changes save automatically for your account on this browser.</p></form></section>
    ${passwordSettings()}<section class="section-card"><h2>Need a hand?</h2><p class="muted">Send a question to the admin or replay the website guide.</p><div class="official-paper-actions"><a href="#Help%20Center" class="button button-primary">Open help center →</a><button class="button button-secondary" data-guide="restart">Replay website guide</button></div></section>`;
}

function supportLog(email) {
  if (!email) return '<p class="empty-state">Choose a student conversation to reply.</p>';
  const messages = supportMessages(user.email, email);
  return messages.length ? messages.map(message => `<article class="chat-message ${message.senderRole === "admin" ? "from-admin" : "from-student"}"><div><strong>${message.senderRole === "admin" ? message.automated ? "Admin · automatic help" : "Admin" : isAdminPortal ? esc(store.users.find(account => account.email === email)?.profile.name || "Student") : "You"}</strong><time datetime="${esc(message.date)}">${esc(new Date(message.date).toLocaleString())}</time></div><p>${esc(message.body)}</p></article>`).join("") : '<p class="empty-state">No messages yet. Send your first message below.</p>';
}

function supportInbox() {
  const messages = readSupport();
  const learners = store.users.filter(account => account.role !== "admin" && messages.some(message => message.learnerEmail === account.email));
  return learners.map(account => {
    const thread = messages.filter(message => message.learnerEmail === account.email), last = thread.at(-1);
    const lastConversation = [...thread].reverse().find(message => !message.automated && !message.guidedChoice);
    const status = lastConversation ? lastConversation.senderRole === "admin" ? "Admin replied" : "Needs admin reply" : supportGuideState(thread) === "resolved" ? "Solved with automatic help" : "Using automatic help";
    return `<button class="support-thread ${supportLearner === account.email ? "active" : ""}" data-admin-support="${esc(account.email)}"><strong>${esc(account.profile.name)}</strong><small>${esc(account.email)}</small><span>${esc(last.body.slice(0, 100))}</span><small>${status} · ${esc(new Date(last.date).toLocaleString())}</small></button>`;
  }).join("") || '<p class="muted">Student conversations will appear here.</p>';
}

function guidedSupportChoices() {
  const node = supportGuideState(supportMessages(user.email, user.email));
  return `<p class="muted">${supportGuide[node].options ? "Choose an option:" : ["other", "waiting", "resolved"].includes(node) ? "Choose your next step:" : "Did this help? Choose your next step:"}</p><div class="support-options">${supportChoices(node).map(option => `<button type="button" class="button button-secondary" data-support-option="${esc(option.id)}">${esc(option.label)}</button>`).join("")}</div>`;
}

function renderHelpCenter() {
  if (!isAdminPortal) startSupportGuide(user.email);
  const email = isAdminPortal ? supportLearner : user.email;
  const learner = store.users.find(account => account.email === email && account.role !== "admin");
  return `${isAdminPortal ? "" : pageHeader("WE ARE HERE TO HELP", "Help center.", "Ask about studying, using the website or your account.")}
    <p class="support-local-note">This chat is saved in this browser. The admin can reply from the admin page on the same browser. Messages do not travel to other devices yet.</p>
    <div class="support-layout ${isAdminPortal ? "with-inbox" : ""}">${isAdminPortal ? `<aside class="section-card"><h2>Conversations</h2><div id="support-inbox">${supportInbox()}</div></aside>` : ""}<section class="section-card support-chat"><h2>${isAdminPortal ? learner ? `Chat with ${esc(learner.profile.name)}` : "Student support" : "Chat with the admin"}</h2><div id="support-messages" class="support-messages" role="log" aria-live="polite" aria-label="Conversation">${supportLog(email)}</div>${!isAdminPortal ? `<div id="support-options">${guidedSupportChoices()}</div>` : ""}${email && learner ? `<form id="support-message-form" class="form-stack"><label for="support-message">${isAdminPortal ? "Your reply" : "Or describe your problem"}</label><textarea id="support-message" name="message" rows="3" maxlength="2000" required placeholder="Write your message…"></textarea><button class="button button-primary">Send ${isAdminPortal ? "reply" : "message"} →</button></form>` : ""}</section></div>`;
}

function refreshSupport() {
  const log = document.querySelector("#support-messages");
  if (log) { log.innerHTML = supportLog(isAdminPortal ? supportLearner : user.email); log.scrollTop = log.scrollHeight; }
  const options = document.querySelector("#support-options");
  if (options && !isAdminPortal && user) options.innerHTML = guidedSupportChoices();
  const inbox = document.querySelector("#support-inbox");
  if (inbox) inbox.innerHTML = supportInbox();
}

function liveClockMarkup() {
  return `<time class="real-time-clock" data-live-clock datetime="${new Date().toISOString()}" title="Local time on this device">${esc(clockLabel())}</time>`;
}

function updateLocalClock() {
  const now = new Date(), today = todayKey();
  for (const clock of document.querySelectorAll("[data-live-clock]")) { clock.textContent = clockLabel(now); clock.setAttribute("datetime", now.toISOString()); }
  if (!user) { observedLocalDate = today; return; }
  if (today !== observedLocalDate) {
    observedLocalDate = today;
    for (const value of document.querySelectorAll("[data-live-streak]")) value.textContent = String(currentStreak(user.profile, now));
    for (const host of document.querySelectorAll("[data-live-flame]")) host.innerHTML = streakFlame(currentStreak(user.profile, now),host.dataset.liveFlame);
    for (const day of document.querySelectorAll("[data-study-date]")) {
      const isToday = day.dataset.studyDate === today;
      day.classList.toggle("is-today",isToday);
      if (isToday) day.setAttribute("aria-current","date"); else day.removeAttribute("aria-current");
    }
  }
  if (!isAdminPortal && ["Home", "Daily Challenge"].includes(route) && displayedDailyDate !== today) {
    const answer = document.querySelector('#daily-form input[name="answer"]');
    if (!answer?.value && !uploadInProgress) { render(); return; }
    const notice = document.querySelector("#daily-date-notice");
    if (notice) { notice.hidden = false; notice.innerHTML = 'A new day has started. Your previous answer is kept here. <button type="button" class="text-button" data-action="refresh-daily-date">Open today’s challenge →</button>'; }
  }
}

function renderProfile() {
  const p = user.profile;
  return `${pageHeader("YOUR SPACE", "Your profile.", "Your goals and progress, all in one place.", `<button class="button button-secondary" data-action="logout">Log out</button>`)}
    <div class="profile-layout"><section class="section-card profile-card"><div class="profile-cover"><span class="profile-avatar-large">${esc(initials(p.name))}</span><span class="profile-level-pill">✦ Level ${p.level}</span></div><div class="profile-details"><h2>${esc(p.name)}</h2><p>${esc(p.email)}</p><div class="profile-tags"><span class="chip chip-blue">${esc(p.board)}</span><span class="chip chip-violet">Target ${esc(p.target)}</span></div><div class="profile-metrics"><div><strong>${p.xp}</strong><small>Total XP</small></div><div><strong data-live-streak>${currentStreak(p)}</strong><small>Day streak</small></div><div><strong>${p.questionsCompleted}</strong><small>Questions</small></div><div><strong>${p.completedLessons.length}</strong><small>Lessons</small></div></div></div></section>
    <section class="section-card edit-profile"><span class="eyebrow">YOUR DETAILS</span><h2>Update your goals</h2><form id="profile-form" class="form-stack"><label>Your name<input name="name" value="${esc(p.name)}" required></label><label>Exam board<select name="board">${["Cambridge IGCSE", "Edexcel International GCSE"].map(x => `<option ${p.board === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>Target grade<select name="target">${["A*", "A", "B", "C", "D", "Other"].map(x => `<option ${p.target === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>Exam date<input name="examDate" type="date" value="${esc(p.examDate)}"></label>${goalPicker(p.goals || [])}<button class="button button-primary">Save changes <span>→</span></button></form></section></div>
    <section class="section-card profile-exams"><div class="section-title-row"><div><span class="eyebrow">YOUR RESULTS</span><h2>Exam scores</h2></div></div>${p.exams.length ? p.exams.map(ex => `<div class="bank-item"><span class="bank-number">▣</span><div class="bank-question"><h3>${esc(ex.title || (ex.diagnostic ? "Diagnostic test" : "Original mock exam"))}</h3><div class="bank-detail">${new Date(ex.date).toLocaleDateString()} · ${ex.mode === "upload" ? "Reviewed working" : ex.title ? "Final-answer practice score" : `Estimated grade ${esc(ex.grade)}`}</div></div><strong class="exam-score">${Number.isFinite(ex.percentage) ? `${ex.percentage}%` : "Pending review"}</strong>${ex.review ? `<button class="text-button" data-open-working-review="${esc(ex.id)}">Review working →</button>` : ""}</div>`).join("") : `<p class="muted">Take a diagnostic or mock exam to see your scores here.</p>`}</section>
    <section class="section-card"><h2>Settings & help</h2><p class="muted">Change your theme, text size or password, or contact the admin.</p><div class="official-paper-actions"><a class="button button-secondary" href="#Settings">Open settings</a><a class="button button-secondary" href="#Help%20Center">Help center</a></div></section>`;
}

function renderPastPapers() {
  return `${pageHeader("IGCSE EXAM PRACTICE", "Past papers & practice papers", "Work through original IGCSE-style questions, or open Cambridge's official past papers and mark schemes.", `<span class="progress-pill">Cambridge 0580 · 2025–2027</span>`)}
    <section class="section-card official-paper-links"><span class="eyebrow">OFFICIAL CAMBRIDGE MATERIAL</span><h2>Real past papers and mark schemes</h2><p>Cambridge provides available past papers, specimen papers and mark schemes on its official website. Open a paper there and use the mark scheme to check your working.</p><div class="official-paper-actions"><a class="button button-primary" href="${officialPapersUrl}" target="_blank" rel="noopener noreferrer">Open official papers ↗</a><a class="button button-secondary" href="${papaCambridgeUrl}" target="_blank" rel="noopener noreferrer">PapaCambridge papers & mark schemes ↗</a><a class="button button-secondary" href="${syllabusSource}" target="_blank" rel="noopener noreferrer">View 0580 syllabus ↗</a></div></section>
    ${renderPastPaperCatalog(pastFilters, pastPageNumber)}${renderPastPaperHistory(user.profile.officialPapers)}
    ${renderRealPaperChoices()}${renderPaperChoices()}
    <section class="section-card original-questions"><span class="eyebrow">ORIGINAL IGCSE-STYLE QUESTION BANK</span><h2>Practise a question first</h2><p>These questions are written for MathMaster. They are labelled by tier and come with worked solutions.</p>${starterQuestions.filter(q => q.level === paperLevel && q.marks === 3).slice(0, 8).map(q => `<div class="original-question"><span class="chip chip-${topicInfo(q.topic).color}">${esc(q.topic)} · ${esc(q.level)}</span><p>${esc(q.text)}</p><span>[${q.marks}] · ~${q.time} min</span><button class="text-button" data-practise-id="${esc(q.id)}">Practise this question →</button></div>`).join("")}<a href="#Question%20Bank" class="button button-secondary">Explore all exam-style questions →</a></section>`;
}

function renderAdmin() {
  const tab = window.adminTab || "dashboard";
  const labels = { dashboard: "Admin dashboard", questions: "Manage questions", lessons: "Manage lessons", users: "Learner accounts", create: "Create content", support: "Help center" };
  return `${pageHeader("CONTENT MANAGEMENT", labels[tab] || labels.dashboard, "Manage the learning content and accounts saved on this device.", `<span class="progress-pill">Admin area</span>`)}
    <div class="admin-warning">This local prototype stores admin permissions and content in this browser.</div>
    <section id="admin-panel">${adminPanel(tab)}</section>`;
}

function adminLearnersPanel() {
  const learners = store.users.filter(account => account.role !== "admin");
  const selected = learners.find(account => account.email === adminSelectedLearner);
  const p = selected?.profile;
  return `<section class="section-card"><div class="section-title-row"><div><span class="eyebrow">ON THIS DEVICE</span><h2>Learner accounts</h2><p class="muted">Edit learner details or set a new password.</p></div></div>${learners.map(item => `<div class="admin-content-row admin-learner-row"><span class="avatar avatar-small">${esc(initials(item.profile.name))}</span><span><strong>${esc(item.profile.name)}</strong><small>${esc(item.email)} · ${item.profile.questionsCompleted} questions · ${item.profile.xp} XP</small></span><button class="button button-secondary" data-admin-edit-user="${esc(item.email)}" ${adminAccountSaving ? "disabled" : ""}>Manage account</button></div>`).join("") || `<p class="muted">No learner accounts on this device yet.</p>`}</section>
    ${selected ? `<section class="section-card admin-learner-editor" id="admin-learner-editor"><div class="section-title-row"><div><span class="eyebrow">EDIT LEARNER</span><h2>${esc(p.name)}</h2><p class="muted">${esc(selected.email)}</p></div><button class="text-button" data-admin-close-user ${adminAccountSaving ? "disabled" : ""}>Close</button></div>
    <form id="admin-user-form" class="form-stack"><label>Student name<input name="name" value="${esc(p.name)}" required maxlength="100"></label><div class="input-row"><label>Exam board<select name="board">${["Cambridge IGCSE", "Edexcel International GCSE"].map(x => `<option ${p.board === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>Target grade<select name="target">${["A*", "A", "B", "C", "D", "Other"].map(x => `<option ${p.target === x ? "selected" : ""}>${x}</option>`).join("")}</select></label></div><div class="input-row"><label>Exam date<input name="examDate" type="date" value="${esc(p.examDate || "")}"></label><label>Exam tier<select name="paperLevel">${["Core", "Extended"].map(x => `<option ${(p.paperLevel || "Extended") === x ? "selected" : ""}>${x}</option>`).join("")}</select></label></div><label>Confidence<select name="confidence">${["Very low", "Low", "Average", "Good", "Very good"].map(x => `<option ${p.confidence === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>${goalPicker(p.goals || [])}<button class="button button-primary" ${adminAccountSaving ? "disabled" : ""}>Save learner details</button></form>
    <div class="admin-password-reset"><span class="eyebrow">ACCOUNT RECOVERY</span><h2>Reset password</h2><p class="muted">Set a new password for this student and share it with them. Their previous password will stop working.</p><form id="admin-reset-password-form" class="form-stack"><label>New password<input name="password" type="password" minlength="8" autocomplete="new-password" required placeholder="At least 8 characters"></label><label>Confirm new password<input name="confirmation" type="password" minlength="8" autocomplete="new-password" required></label><button class="button button-primary" ${adminAccountSaving ? "disabled" : ""}>${adminAccountSaving ? "Saving…" : "Reset student password"}</button></form></div></section>` : ""}`;
}

function adminPanel(tab) {
  if (!isAdminPortal || user?.role !== "admin") return "";
  if (tab === "support") return renderHelpCenter();
  if (tab === "dashboard") return `<div class="stat-grid">${[[allQuestions().length.toLocaleString(), "Questions", "questions"], [allLessons().length, "Lessons", "lessons"], [store.users.filter(u => u.role !== "admin").length, "Learners", "users"], [pastPapers.length, "Past papers", null]].map(([count, label, destination]) => `<article class="stat-card"><span class="stat-label">${label}</span><strong class="stat-number">${count}</strong>${destination ? `<button class="text-button" data-admin-tab="${destination}">Manage ${label.toLowerCase()} →</button>` : '<span class="stat-caption">Indexed exam resources</span>'}</article>`).join("")}</div><section class="section-card"><span class="eyebrow">YOUR CONTENT STUDIO</span><h2>Keep the course organised</h2><p class="muted">Browse the question bank, edit custom lessons and questions, or check the learner accounts on this device.</p><div class="official-paper-actions"><button class="button button-primary" data-admin-tab="create">+ Create content</button><button class="button button-secondary" data-admin-tab="questions">Open question manager →</button></div></section>`;
  if (tab === "create") {
    const question = adminEditing?.kind === "question" ? store.content.questions.find(item => item.id === adminEditing.id) : null;
    const lesson = adminEditing?.kind === "lesson" ? store.content.lessons.find(item => item.id === adminEditing.id) : null;
    return `<section class="section-card admin-editor"><span class="eyebrow">${question ? "EDIT ORIGINAL QUESTION" : "NEW ORIGINAL QUESTION"}</span><h2>${question ? "Update question" : "Create a question"}</h2><form id="admin-question-form" class="form-stack"><label>Question text<textarea name="text" required rows="3">${esc(question?.text || "")}</textarea></label><div class="input-row"><label>Answer<input name="answer" value="${esc(Array.isArray(question?.answer) ? question.answer.join(", ") : question?.answer || "")}" required></label><label>Question type<select name="type">${[["numerical", "Numerical"], ["multipleChoice", "Multiple choice"], ["shortAnswer", "Short answer"], ["trueFalse", "True / false"], ["matching", "Matching"]].map(([key, label]) => `<option value="${key}" ${question?.type === key ? "selected" : ""}>${label}</option>`).join("")}</select></label></div><div class="input-row"><label>Topic<select name="topic">${topics.map(t => `<option ${question?.topic === t.name ? "selected" : ""}>${t.name}</option>`).join("")}</select></label><label>Subtopic<input name="subtopic" value="${esc(question?.subtopic || "")}" required placeholder="e.g. Linear equations"></label></div><label>Multiple-choice options <small>(one option per line)</small><textarea name="options" rows="3">${esc(question?.options?.join("\n") || "")}</textarea></label><label>Matching pairs <small>(one left=right pair per line)</small><textarea name="matchingPairs" rows="3">${esc(question?.matchingPairs?.map(pair => `${pair.left}=${pair.right}`).join("\n") || "")}</textarea></label><div class="input-row"><label>Difficulty<select name="difficulty">${["Easy", "Medium", "Hard", "Exam"].map(x => `<option ${question?.difficulty === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>Marks<input name="marks" type="number" min="1" value="${question?.marks || 1}" required></label></div><label>Explanation<textarea name="explanation" required rows="3">${esc(question?.explanation || "")}</textarea></label><label>Hint<input name="hint" value="${esc(question?.hint || "")}" required></label><label>Estimated time (minutes)<input name="time" type="number" value="${question?.time || 2}" min="1"></label><button class="button button-primary">${question ? "Update question" : "Save question"} <span>→</span></button></form>
      <hr><span class="eyebrow">${lesson ? "EDIT ORIGINAL LESSON" : "NEW LESSON"}</span><h2>${lesson ? "Update lesson" : "Create a lesson"}</h2><form id="admin-lesson-form" class="form-stack"><label>Lesson title<input name="title" value="${esc(lesson?.title || "")}" required></label><div class="input-row"><label>Topic<select name="topic">${topics.map(t => `<option ${lesson?.topic === t.name ? "selected" : ""}>${t.name}</option>`).join("")}</select></label><label>Subtopic<input name="subtopic" value="${esc(lesson?.subtopic || "")}" required></label></div><label>Learning objective<input name="objective" value="${esc(lesson?.objective || "")}" required></label><label>Explanation<textarea name="explanation" required rows="3">${esc(lesson?.explanation || "")}</textarea></label><label>Key formula<input name="formula" value="${esc(lesson?.formula || "")}" required></label><label>Worked example<input name="example" value="${esc(lesson?.example || "")}" required></label><label>Step-by-step solution <small>(one step per line)</small><textarea name="steps" required rows="4">${esc(lesson?.steps?.join("\n") || "")}</textarea></label><div class="input-row"><label>Practice question 1<input name="practice1" value="${esc(lesson?.practice?.[0] || "")}" required></label><label>Practice question 2<input name="practice2" value="${esc(lesson?.practice?.[1] || "")}" required></label></div><label>Challenge question<input name="challenge" value="${esc(lesson?.challenge || "")}" required></label><label>Exam-style question<input name="exam" value="${esc(lesson?.exam || "")}" required></label><label>Summary<input name="summary" value="${esc(lesson?.summary || "")}" required></label><button class="button button-primary">${lesson ? "Update lesson" : "Save lesson"} <span>→</span></button></form></section>`;
  }
  if (tab === "lessons") return `<section class="section-card"><div class="section-title-row"><div><span class="eyebrow">CURRICULUM</span><h2>Lessons</h2></div><button class="button button-primary" data-admin-tab="create">+ Create lesson</button></div>${allLessons().map(item => `<div class="admin-content-row"><span class="topic-icon ${topicInfo(item.topic).color}">${topicInfo(item.topic).icon}</span><span><strong>${esc(item.title)}</strong><small>${esc(item.topic)} · ${esc(item.subtopic)}</small></span>${item.custom ? `<button class="text-button" data-admin-edit-lesson="${esc(item.id)}">Edit</button><button class="text-button" data-admin-delete-lesson="${esc(item.id)}">Delete</button>` : `<span class="chip chip-green">Built in</span>`}</div>`).join("")}</section>`;
  if (tab === "users") return adminLearnersPanel();
  const page = bankPage(filterBank(allQuestions(), { query: adminBankQuery }), adminPageNumber);
  adminPageNumber = page.page;
  return `<section class="section-card"><div class="section-title-row"><div><span class="eyebrow">QUESTION BANK</span><h2>Manage original questions</h2></div><button class="button button-primary" data-admin-tab="create">+ Add question</button></div><form id="admin-bank-search" class="bank-search"><label for="admin-bank-query">Search the bank<input id="admin-bank-query" name="query" type="search" value="${esc(adminBankQuery)}" placeholder="Search question, skill, tier or ID"></label><button class="button button-primary">Search →</button><button type="button" class="button button-secondary" data-action="admin-bank-reset">Clear</button></form>${page.items.map(item => `<div class="admin-content-row"><span class="bank-number">${esc(item.topic[0])}</span><span><strong>${esc(item.text)}</strong><small>${esc(item.topic)} · ${esc(item.subtopic)} · ${esc(item.difficulty)}</small></span>${item.custom ? `<button class="text-button" data-admin-edit-question="${esc(item.id)}">Edit</button><button class="text-button" data-admin-delete-question="${esc(item.id)}">Delete</button>` : `<span class="chip chip-green">Built in</span>`}</div>`).join("")}${page.total ? "" : '<p class="muted">No questions match your search.</p>'}${renderBankPager(page, "admin-bank-page")}</section>`;
}

function invalidateOfficialReview(attempt) {
  if (attempt.status === "reviewed") { attempt.status = "pending-review"; delete attempt.earned; delete attempt.percentage; delete attempt.reviewed; }
  updateUser(store, user);
  const state = document.querySelector("#official-paper-state");
  if (state && attempt.status === "pending-review") state.textContent = "Submitted · ready for review";
}

function saveOfficialInput(target) {
  const attempt = activeOfficialAttempt();
  if (!attempt || attempt.status === "in-progress") return;
  if (target.hasAttribute("data-past-feedback")) { attempt.feedback = target.value; updateUser(store, user); return; }
  const row = attempt.rows[Number(target.dataset.pastRow)], field = target.dataset.pastField;
  if (row && ["label", "maximum", "earned", "feedback"].includes(field)) {
    row[field] = target.value;
    if (field === "feedback") updateUser(store, user);
    else invalidateOfficialReview(attempt);
    const summary = document.querySelector("#official-review-summary");
    if (summary) summary.outerHTML = renderPastPaperSummary(attempt);
  }
}

function refreshOfficialControls() {
  const controls = document.querySelector("#official-controls"), attempt = activeOfficialAttempt();
  if (!controls || !attempt || route !== "OfficialPaper") { render(); return; }
  const paper = pastPapers.find(p => p.id === attempt.paperId);
  const template = document.createElement("template");
  template.innerHTML = renderPastPaperWorkspace(paper, attempt, uploadInProgress);
  controls.innerHTML = template.content.querySelector("#official-controls").innerHTML;
  hydrateWorkingPreviews();
}

function saveOfficialAnswer(target) {
  const attempt = activeOfficialAttempt();
  if (!attempt || attempt.status !== "in-progress") return;
  const answer = attempt.answers?.[Number(target.dataset.pastAnswer)], field = target.dataset.answerField;
  if (!answer || !["label", "working", "completed"].includes(field) || (attempt.indexed && field === "label")) return;
  answer[field] = field === "completed" ? target.checked : target.value;
  if (attempt.indexed) document.querySelector(`.official-question-grid [data-official-question="${target.dataset.pastAnswer}"]`)?.classList.toggle("answered", answer.completed || !!answer.working.trim());
  updateUser(store, user);
  const status = document.querySelector("#official-answer-status");
  if (status) status.textContent = `${attempt.answers.filter(a => a.completed).length}/${attempt.answers.length} marked done`;
}

async function attachOfficialWorking(target) {
  const attempt = activeOfficialAttempt(), owner = user.email;
  const files = Array.from(target.files || []);
  if (!attempt || !files.length) return;
  uploadInProgress = true; refreshOfficialControls();
  try {
    const metadata = await saveWorkFiles(owner, files, attempt.files.length);
    attempt.files.push(...metadata);
    if (user?.email === owner) updateUser(store, user);
  } catch (error) { toast(error.message, "error"); }
  finally { uploadInProgress = false; if (user?.email === owner && route === "OfficialPaper") refreshOfficialControls(); }
}

function startOfficialTimer() {
  const attempt = activeOfficialAttempt();
  if (!attempt || attempt.status !== "in-progress" || attempt.mode === "practice") return;
  const tick = () => {
    if (route !== "OfficialPaper" || activeOfficialAttempt() !== attempt) { clearInterval(officialTimer); return; }
    const seconds = Math.max(0, Math.ceil((attempt.started + attempt.minutes * 60000 - Date.now()) / 1000));
    const element = document.querySelector(".official-timer");
    if (element) { element.textContent = `◷ ${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; element.classList.toggle("timer-warning", seconds < 60); }
    if (seconds === 0) {
      attempt.status = "pending-review"; attempt.submitted = Date.now(); updateUser(store, user); render();
      toast("Time is up. Attach any remaining working and review the paper.");
    }
  };
  tick();
  if (attempt.status === "in-progress") officialTimer = setInterval(tick, 1000);
}

function render() {
  applyAppearance();
  clearInterval(officialTimer);
  if (!user) { renderWelcome(); return; }
  if (isAdminPortal) route = "Admin";
  else if (["Welcome", "Admin"].includes(route)) route = "Home";
  let content;
  switch (route) {
    case "Home": content = renderHome(); break;
    case "Learn": content = renderLearn(); break;
    case "Formula Reference": content = renderFormulaReference(); break;
    case "Lesson": content = renderLesson(); break;
    case "Practice": content = renderPractice(); break;
    case "Question Bank": content = renderBank(); break;
    case "Daily Challenge": content = renderDaily(); break;
    case "Exams": content = renderExams(); break;
    case "Exam": content = renderExam(); break;
    case "ExamReview": content = renderExamReview(); break;
    case "ExamResult": content = renderExamResult(); break;
    case "Progress": content = renderProgress(); break;
    case "Mistakes": content = renderMistakes(); break;
    case "Study Plan": content = renderStudyPlan(); break;
    case "Achievements": content = renderAchievements(); break;
    case "Profile": content = renderProfile(); break;
    case "Settings": content = renderSettings(); break;
    case "Help Center": content = renderHelpCenter(); break;
    case "Past Papers": content = renderPastPapers(); break;
    case "OfficialPaper": {
      const attempt = activeOfficialAttempt();
      const paper = pastPapers.find(p => p.id === (attempt?.paperId || officialSelectedId));
      content = renderPastPaperWorkspace(paper, attempt, uploadInProgress); break;
    }
    case "Admin": content = renderAdmin(); break;
    default: route = "Home"; content = renderHome();
  }
  shell(content + (route === "Exam" && exam ? renderPrintableWorkingPaper() : ""));
  if (["Exam", "ExamReview"].includes(route) && exam) persistExamDraft();
  hydrateWorkingPreviews();
  if (route === "Help Center") refreshSupport();
  if (route === "OfficialPaper") startOfficialTimer();
  if (route === "Admin") document.querySelector("#admin-panel").innerHTML = adminPanel(window.adminTab || "dashboard");
  if (["Exam", "ExamReview"].includes(route) && exam?.duration) startTimer();
}

function startTimer() {
  clearInterval(examTimer);
  examTimer = setInterval(() => {
    if (!["Exam", "ExamReview"].includes(route) || !exam || !exam.duration) { clearInterval(examTimer); return; }
    if (examTime() <= 0) { clearInterval(examTimer); submitExam(); return; }
    const timer = document.querySelector(".exam-timer");
    if (timer) {
      const remaining = examTime();
      timer.textContent = `◷ ${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
      timer.classList.toggle("timer-warning", remaining < 60);
    }
  }, 1000);
}

function setRoute(next) {
  clearTimeout(sidebarCloseTimer);
  studentMenuOpen = false;
  desktopMenuOpen = false;
  sidebarHovered = false;
  sidebarFocused = false;
  route = isAdminPortal ? "Admin" : next === "Admin" ? "Home" : next;
  if (next !== "Exam" && next !== "ExamReview") clearInterval(examTimer);
  render();
  window.scrollTo(0, 0);
}

function selectQuestion(question, mistakeIndex = null) {
  questionList = [question];
  questionList._mistakeMode = mistakeIndex !== null;
  questionIndex = 0;
  questionResult = null;
  practiceAnswer = null;
  showHint = false;
  setRoute("Practice");
}

function saveContentStore() {
  const latest = readStore();
  store.users = latest.users;
  store.currentEmail = latest.currentEmail;
  writeStore(store);
}

function enterAdminPreview() {
  if (!isAdminPortal) return;
  store = readStore();
  user = store.users.find(item => item.role === "admin");
  if (!user) {
    user = { email: "admin@mathmaster.local", password: null, role: "admin", profile: emptyProfile("MathMaster Admin", "admin@mathmaster.local") };
    store.users.push(user);
  }
  savePortalSession(user.email, true);
  writeStore(store);
  route = "Admin";
}

app.addEventListener("cancel", event => {
  if (event.target.id !== "student-help-dialog") return;
  event.preventDefault();
  handleGuideAction("skip");
}, true);

app.addEventListener("click", async event => {
  const target = event.target.closest("button, a");
  if (!target) return;
  if (target.dataset.action === "refresh-daily-date") { if (!isAdminPortal && user && ["Home", "Daily Challenge"].includes(route)) render(); return; }
  if (target.dataset.applyAnswerMark !== undefined && examResult) {
    const index = Number(target.dataset.applyAnswerMark), part = Number(target.dataset.assistantPart);
    const item = examResult.review[index], question = (item?.question.parts || [item?.question])[part], record = item?.assisted?.[part];
    if (!question || !record?.assessment) return;
    const check = assessTypedWorking(question, record.answer, record.working);
    if (check.verifiedMark == null) return;
    item.methodReviews ||= {}; item.methodReviews[part] ||= { decisions: {}, note: "" };
    const rubric = buildWorkingRubric(question);
    item.methodReviews[part].decisions[rubric[0].id] = "earned";
    activeReviewQuestion = index; persistMethodReview(); render(); return;
  }
  if (target.dataset.action === "apply-official-answer-mark") {
    const attempt = activeOfficialAttempt();
    if (!attempt || attempt.status === "in-progress" || !attempt.assisted?.assessment) return;
    const check = assessOfficialWorking(attempt.paperId, attempt.assisted);
    const row = attempt.rows.find(row => row.label === check.label && Number(row.maximum) === 1);
    if (check.verifiedMark == null || !row) { toast("Add a matching one-mark part row before applying this suggestion. Other parts remain pending."); return; }
    row.earned = 1; row.feedback = "Equivalent final value checked; reviewer confirmed the original criterion.";
    invalidateOfficialReview(attempt); render(); return;
  }
  if (target.dataset.supportOption) {
    if (!user || isAdminPortal || route !== "Help Center") return;
    try {
      chooseSupportOption(user.email, target.dataset.supportOption); refreshSupport();
      if (target.dataset.supportOption === "other") document.querySelector("#support-message")?.focus();
    } catch (error) { toast(error.message, "error"); }
    return;
  }
  if (target.dataset.adminSupport) {
    if (!isAdminPortal || user?.role !== "admin") return;
    store = readStore(); supportLearner = target.dataset.adminSupport;
    if (!store.users.some(account => account.email === supportLearner && account.role !== "admin")) return;
    window.adminTab = "support"; render(); refreshSupport(); return;
  }
  if (target.dataset.guide) { handleGuideAction(target.dataset.guide); return; }
  if (Object.keys(target.dataset).some(key => key.startsWith("admin")) && (!isAdminPortal || user?.role !== "admin")) return;
  if (uploadInProgress && ["logout", "exam-exit"].includes(target.dataset.action)) { toast("Wait for the upload to finish saving first."); return; }
  if (target.matches('a[href^="#"]')) {
    const hash = decodeURIComponent(target.getAttribute("href").slice(1));
    if (hash) {
      event.preventDefault();
      if (hash === "Mistakes") setRoute("Mistakes");
      else if (["Home", "Learn", "Formula Reference", "Practice", "Question Bank", "Past Papers", "Exams", "Progress", "Study Plan", "Achievements", "Profile", "Settings", "Help Center", "Admin"].includes(hash)) setRoute(hash);
      else if (hash === "Daily Challenge") setRoute(hash);
    }
  }
  if (!isAdminPortal && ["menu-toggle", "sidebar-peek", "hide-navigation", "close-menu"].includes(target.id)) { toggleStudentNavigation(!["menu-toggle", "sidebar-peek"].includes(target.id), event.detail === 0); return; }
  if (target.id === "menu-toggle") { document.querySelector(".sidebar")?.classList.add("open"); document.querySelector(".mobile-overlay")?.classList.add("visible"); }
  if (target.id === "close-menu") { document.querySelector(".sidebar")?.classList.remove("open"); document.querySelector(".mobile-overlay")?.classList.remove("visible"); }
  if (target.dataset.realPaperNumber) {
    const number = Number(target.dataset.realPaperNumber);
    const selected = document.querySelector(`#real-paper-${number}`)?.value || pastPapers.find(p => p.paper === number)?.id;
    if (!pastPapers.some(p => p.id === selected && p.paper === number)) return;
    officialSelectedId = selected; officialActiveId = ""; setRoute("OfficialPaper"); return;
  }
  if (target.dataset.officialQuestion !== undefined || target.dataset.officialFlag !== undefined) {
    const attempt = activeOfficialAttempt();
    if (!attempt?.indexed || attempt.status !== "in-progress") return;
    const index = Number(target.dataset.officialQuestion ?? target.dataset.officialFlag);
    if (!Number.isInteger(index) || index < 0 || index >= attempt.answers.length) return;
    if (target.dataset.officialFlag !== undefined) attempt.answers[index].flagged = !attempt.answers[index].flagged;
    else attempt.questionIndex = index;
    updateUser(store, user);
    const book = document.querySelector(".official-answer-book");
    if (book) {
      book.outerHTML = renderOfficialAnswers(attempt);
      const frame = document.querySelector("#official-question-pdf"), paper = pastPapers.find(p => p.id === attempt.paperId);
      if (frame && target.dataset.officialQuestion !== undefined) frame.src = `${paper.questionUrl}#toolbar=1&view=FitH&page=${attempt.answers[index].page}`;
      document.querySelector('.indexed-answer-book textarea')?.focus({ preventScroll: true });
    } else render();
    return;
  }
  if (target.dataset.pastStart) {
    if (!pastPapers.some(p => p.id === target.dataset.pastStart)) return;
    officialSelectedId = target.dataset.pastStart; officialActiveId = ""; setRoute("OfficialPaper"); return;
  }
  if (target.dataset.pastResume) {
    if (!user.profile.officialPapers?.some(a => a.id === target.dataset.pastResume)) return;
    officialActiveId = target.dataset.pastResume; setRoute("OfficialPaper"); return;
  }
  if (target.dataset.pastPage) { pastPageNumber = Number(target.dataset.pastPage); render(); document.querySelector("#real-paper-catalog")?.scrollIntoView({ behavior: "smooth" }); return; }
  if (target.dataset.action === "past-paper-add-answer" || target.dataset.pastRemoveAnswer !== undefined) {
    const attempt = activeOfficialAttempt();
    if (!attempt || attempt.indexed || attempt.status !== "in-progress" || uploadInProgress) return;
    attempt.answers ||= [];
    if (target.dataset.action === "past-paper-add-answer") attempt.answers.push({ label: `Q${attempt.answers.length + 1}`, working: "", completed: false });
    else {
      const index = Number(target.dataset.pastRemoveAnswer);
      if (Number.isInteger(index) && index >= 0 && index < attempt.answers.length) attempt.answers.splice(index, 1);
    }
    updateUser(store, user);
    const book = document.querySelector(".official-answer-book");
    if (book) book.outerHTML = renderOfficialAnswers(attempt); else render();
    return;
  }
  if (target.dataset.action === "past-paper-submit") {
    if (uploadInProgress) { toast("Wait for your upload to finish saving."); return; }
    const attempt = activeOfficialAttempt();
    if (attempt) {
      const labels = [...new Set((attempt.answers || []).map(a => a.label.trim()).filter(Boolean))];
      if (!attempt.indexed && labels.length && attempt.rows.length === 1 && attempt.rows[0].maximum === "") attempt.rows = labels.map(label => ({ label, maximum: "", earned: "", feedback: "" }));
      attempt.status = "pending-review"; attempt.submitted = Date.now(); updateUser(store, user); render();
    }
    return;
  }
  if (target.dataset.action === "past-paper-add-row") {
    const attempt = activeOfficialAttempt();
    if (attempt) { attempt.rows.push({ label: `Q${attempt.rows.length + 1}`, maximum: "", earned: "", feedback: "" }); invalidateOfficialReview(attempt); render(); }
    return;
  }
  if (target.dataset.pastRemoveRow !== undefined) {
    const attempt = activeOfficialAttempt(), index = Number(target.dataset.pastRemoveRow);
    if (attempt && attempt.rows.length > 1 && Number.isInteger(index) && index >= 0 && index < attempt.rows.length) { attempt.rows.splice(index, 1); invalidateOfficialReview(attempt); render(); }
    return;
  }
  if (target.dataset.action === "past-paper-finalise") {
    const attempt = activeOfficialAttempt();
    if (!attempt || attempt.status === "in-progress" || uploadInProgress) return;
    const summary = reviewPastPaper(attempt);
    if (!summary.complete) { render(); toast("Review every part and ensure available marks add up to the paper total.", "error"); return; }
    attempt.status = "reviewed"; attempt.earned = summary.earned; attempt.percentage = summary.percentage; attempt.reviewed = Date.now();
    updateUser(store, user); render(); toast("Reviewed result saved."); return;
  }
  if (target.dataset.bankPage) { bankPageNumber = Number(target.dataset.bankPage); render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  if (target.dataset.adminBankPage) { adminPageNumber = Number(target.dataset.adminBankPage); render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  if (target.dataset.action === "bank-reset") { bankFilters = { topic: "All topics", difficulty: "All levels", type: "All types", level: "All tiers", subtopic: "All skills", calculator: "Either", query: "" }; bankPageNumber = 1; render(); }
  if (target.dataset.action === "admin-bank-reset") { adminBankQuery = ""; adminPageNumber = 1; render(); }
  if (target.dataset.route) setRoute(target.dataset.route);
  if (target.dataset.authMode) renderAuthForm(target.dataset.authMode);
  if (target.dataset.action === "demo-admin") {
    if (!isAdminPortal) return;
    enterAdminPreview();
    setRoute("Admin");
  }
  if (target.dataset.action === "start-learning") {
    renderAuthForm("register");
    document.querySelector("#auth-panel input[name='name']")?.focus();
    document.querySelector("#auth-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (target.dataset.action === "guest-diagnostic") {
    startDiagnosticAfterAuth = true;
    renderAuthForm("register");
    document.querySelector("#auth-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
    toast("Create an account to save your diagnostic results.");
  }
  if (target.dataset.lesson) { selectedLesson = target.dataset.lesson; setRoute("Lesson"); }
  if (target.dataset.topicFilter) { lessonTopicFilter = target.dataset.topicFilter; lessonSearch = ""; setRoute("Learn"); }
  if (target.hasAttribute("data-go-learn")) { lessonTopicFilter = target.dataset.topicFilter || "All topics"; setRoute("Learn"); }
  if (target.dataset.completeLesson) {
    if (!user.profile.completedLessons.includes(target.dataset.completeLesson)) {
      user.profile.completedLessons.push(target.dataset.completeLesson);
      recordActivity(user, 25);
      unlockAchievements();
      updateUser(store, user);
      toast("Lesson complete! +25 XP ✦");
      render();
    }
  }
  if (target.dataset.action === "clear-curriculum-search") { lessonSearch = ""; setRoute("Learn"); }
  if (target.dataset.action === "clear-formula-search") { formulaSearch = ""; setRoute("Formula Reference"); }
  if (target.dataset.action === "restart-lesson") {
    document.querySelector(".lesson-reading")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelectorAll(".lesson-reading details").forEach(detail => { detail.open = false; });
  }
  if (target.dataset.startTopicTest) startExam(`unit:${target.dataset.startTopicTest}`);
  if (target.dataset.practiseId) {
    const q = target.dataset.mistakeIndex !== undefined
      ? user.profile.mistakes[Number(target.dataset.mistakeIndex)]
      : allQuestions().find(item => item.id === target.dataset.practiseId);
    if (q) selectQuestion(q, target.dataset.mistakeIndex ?? null);
  }
  if (target.dataset.action === "hint") { showHint = true; render(); }
  if (target.dataset.action === "solution") {
    const q = questionList[questionIndex];
    questionResult = { correct: false };
    showHint = false;
    render();
    const feedback = document.querySelector(".answer-feedback");
    if (feedback) feedback.insertAdjacentHTML("afterbegin", `<p><b>Solution:</b> ${esc(q.explanation)}</p>`);
  }
  if (target.dataset.action === "check-choice") {
    const question = questionList[questionIndex];
    const choice = question.type === "matching"
      ? Object.fromEntries([...document.querySelectorAll("[data-practice-match]")].map(input => [input.dataset.practiceMatch, input.value]))
      : document.querySelector('input[name="practice-answer"]:checked')?.value;
    if (!choice) { toast("Choose an answer first.", "error"); return; }
    if (question.type === "matching" && Object.values(choice).some(value => !value)) { toast("Match each item before checking your answer.", "error"); return; }
    practiceAnswer = choice;
    questionResult = questionResultFor(question, choice);
    showHint = false;
    render();
  }
  if (target.dataset.action === "try-again") { questionResult = null; practiceAnswer = null; showHint = false; render(); }
  if (target.dataset.action === "next-question") {
    if (questionIndex + 1 < questionList.length) questionIndex++;
    else if (questionList._mistakeMode) { toast("Lovely work. Keep practising when you’re ready."); setRoute("Mistakes"); return; }
    else { questionList = freshQuestionSet(); questionIndex = 0; }
    questionResult = null; practiceAnswer = null; showHint = false; render();
  }
  if (target.dataset.action === "shuffle-questions") {
    questionList = freshQuestionSet();
    questionIndex = 0; questionResult = null; practiceAnswer = null; showHint = false; render();
  }
  if (target.dataset.action === "generate-equation") {
    if (bankFilters.topic !== "All topics" && !topics.some(topic => topic.name === bankFilters.topic)) {
      toast("Choose a curriculum topic before generating a question.", "error");
      return;
    }
    const generated = freshQuestionSet(bankFilters.topic, 1, [], bankFilters.level === "All tiers" ? paperLevel : bankFilters.level)[0];
    store.content.questions.push(generated);
    saveContentStore();
    selectQuestion(generated);
  }
  if (target.dataset.action === "start-diagnostic") startExam("diagnostic");
  if (target.dataset.startExam) startExam(target.dataset.startExam);
  if (target.dataset.action === "start-topic-exam") startExam(`topic:${document.querySelector("#topic-exam-select")?.value || "Number"}`);
  if (target.dataset.examGoto !== undefined) {
    saveCurrentExamAnswer();
    if (route === "ExamReview") route = "Exam";
    exam.index = Number(target.dataset.examGoto);
    render();
  }
  if (target.dataset.examNav) {
    saveCurrentExamAnswer();
    exam.index = Math.max(0, Math.min(exam.questions.length - 1, exam.index + Number(target.dataset.examNav)));
    render();
  }
  if (target.dataset.action === "exam-flag") {
    saveCurrentExamAnswer();
    const id = exam.questions[exam.index].id;
    exam.flags.includes(id) ? exam.flags.splice(exam.flags.indexOf(id), 1) : exam.flags.push(id);
    render();
  }
  if (target.dataset.action === "exam-submit") { saveCurrentExamAnswer(); route = "ExamReview"; render(); }
  if (target.dataset.action === "exam-back") { route = "Exam"; render(); }
  if (target.dataset.action === "print-working-paper" && exam) { saveCurrentExamAnswer(); persistExamDraft(); window.print(); }
  if (target.dataset.action === "exam-final-submit") submitExam();
  if (target.dataset.action === "exam-exit") {
    if (confirm("Exit this test? Your answers will not be submitted.")) { user.profile.paperDraft = null; updateUser(store, user); exam = null; examResult = null; setRoute("Exams"); }
  }
  if (target.dataset.openWorkingReview) {
    const record = user.profile.exams.find(item => item.id === target.dataset.openWorkingReview);
    if (record?.review) { examResult = record.review; activeReviewQuestion = 0; setRoute("ExamResult"); }
  }
  if (target.dataset.nextWorkingReview) { activeReviewQuestion = Number(target.dataset.nextWorkingReview); render(); document.querySelector(`[data-review-card="${activeReviewQuestion}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  if (target.dataset.reviewAll && examResult) {
    const index = Number(target.dataset.methodQuestion), partIndex = Number(target.dataset.methodPart), item = examResult.review[index];
    const part = item && (item.question.parts || [item.question])[partIndex];
    if (part && ["earned", "not-earned"].includes(target.dataset.reviewAll)) {
      item.methodReviews ||= {}; item.methodReviews[partIndex] ||= { decisions: {}, note: "" };
      item.methodReviews[partIndex].decisions = Object.fromEntries(buildWorkingRubric(part).map(criterion => [criterion.id, target.dataset.reviewAll]));
      activeReviewQuestion = index; persistMethodReview(); render();
    }
  }
  if (target.dataset.checkCalculations !== undefined && examResult) {
    const index = Number(target.dataset.checkCalculations), item = examResult.review[index];
    if (!item) return;
    const input = document.querySelector(`[data-review-working="${index}"]`);
    if (input) item.working = input.value;
    item.calculationChecks = checkCalculationLines(item.working);
    activeReviewQuestion = index; persistMethodReview(); render();
  }
  if (target.dataset.removeWorking) { await removeWorkingAttachment(target); return; }
  if (target.dataset.action === "finish-exam") { examResult = null; setRoute("Home"); }
  if (target.dataset.action === "review-mistakes") { examResult = null; setRoute("Mistakes"); }
  if (target.dataset.action === "resume-working") {
    if (user.profile.paperDraft) { exam = user.profile.paperDraft; exam.uploads ||= {}; exam.mode ||= "typed"; examResult = null; setRoute("Exam"); }
    return;
  }
  if (target.dataset.action === "logout") {
    releaseWorkingUrls(); savePortalSession(null, isAdminPortal);
    if (!isAdminPortal) { store.currentEmail = null; writeStore(store); }
    user = null; exam = null; route = "Welcome"; render();
  }
  if (target.dataset.studyMonth) {
    if (isAdminPortal || !user || route !== "Study Plan") return;
    studyMonth = new Date(studyMonth.getFullYear(), studyMonth.getMonth() + Number(target.dataset.studyMonth), 1);
    selectedStudyDate = ""; render(); return;
  }
  if (target.dataset.studyDate) {
    if (isAdminPortal || !user || route !== "Study Plan") return;
    try { parseStudyDate(target.dataset.studyDate); selectedStudyDate = target.dataset.studyDate; render(); document.querySelector("#study-session-editor")?.scrollIntoView({ behavior: "smooth", block: "center" }); }
    catch (error) { toast(error.message, "error"); }
    return;
  }
  if (target.dataset.studyAction) {
    if (isAdminPortal || !user || route !== "Study Plan") return;
    const action = target.dataset.studyAction;
    if (action === "edit-settings") editingStudyPlan = true;
    if (action === "cancel-settings") editingStudyPlan = false;
    if (action === "close-session") selectedStudyDate = "";
    if (action === "today") { const now = new Date(); studyMonth = new Date(now.getFullYear(), now.getMonth(), 1); selectedStudyDate = ""; }
    if (["restore-session", "complete-session"].includes(action) && selectedStudyDate) {
      const plan = studyPlanFor(user.profile);
      if (action === "restore-session") { delete plan.overrides[selectedStudyDate]; delete plan.completions[selectedStudyDate]; }
      else if (studySessionOn(plan, selectedStudyDate)) plan.completions[selectedStudyDate] = !plan.completions[selectedStudyDate];
      user.profile.studyPlan = plan; updateUser(store, user);
    }
    render(); return;
  }
  if (target.dataset.action === "paper-catalog") toast("Paper catalogue structure is ready for licensed content.");
  if (target.hasAttribute("data-admin-close-user")) {
    if (!adminAccountSaving) { adminSelectedLearner = ""; render(); }
    return;
  }
  if (target.dataset.adminEditUser) {
    if (adminAccountSaving) return;
    store = readStore();
    adminSelectedLearner = target.dataset.adminEditUser;
    window.adminTab = "users"; render();
    document.querySelector("#admin-learner-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelector('#admin-user-form input[name="name"]')?.focus();
    return;
  }
  if (target.dataset.adminTab) {
    window.adminTab = target.dataset.adminTab;
    adminEditing = null;
    if (route !== "Admin") setRoute("Admin");
    else render();
    if (window.adminTab === "support") refreshSupport();
  }
  if (target.dataset.adminEditQuestion) {
    adminEditing = { kind: "question", id: target.dataset.adminEditQuestion };
    window.adminTab = "create";
    render();
    document.querySelector("#admin-question-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (target.dataset.adminEditLesson) {
    adminEditing = { kind: "lesson", id: target.dataset.adminEditLesson };
    window.adminTab = "create";
    render();
    document.querySelector("#admin-lesson-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (target.dataset.adminDeleteQuestion) {
    if (confirm("Delete this original question?")) {
      store.content.questions = store.content.questions.filter(q => q.id !== target.dataset.adminDeleteQuestion);
      if (adminEditing?.id === target.dataset.adminDeleteQuestion) adminEditing = null;
      saveContentStore(); render();
    }
  }
  if (target.dataset.adminDeleteLesson) {
    if (confirm("Delete this lesson?")) {
      store.content.lessons = store.content.lessons.filter(x => x.id !== target.dataset.adminDeleteLesson);
      if (adminEditing?.id === target.dataset.adminDeleteLesson) adminEditing = null;
      saveContentStore(); render();
    }
  }
});

function saveCurrentExamAnswer() {
  if (!exam) return;
  const q = exam.questions[exam.index];
  const input = document.querySelector("#exam-answer-input");
  const choice = document.querySelector('input[name="exam-answer"]:checked');
  const matches = [...document.querySelectorAll("[data-exam-match]")];
  if (input) exam.answers[q.id] = input.value.trim();
  if (q.type === "multipart" && exam.mode !== "upload") exam.answers[q.id] = Object.fromEntries([...document.querySelectorAll("[data-exam-part]")].map(input => [input.dataset.examPart, input.value.trim()]));
  const working = document.querySelector("#exam-working");
  if (working) exam.working[q.id] = working.value;
  if (choice) exam.answers[q.id] = choice.value;
  if (matches.length) exam.answers[q.id] = Object.fromEntries(matches.map(select => [select.dataset.examMatch, select.value]));
}

app.addEventListener("change", async event => {
  const target = event.target;
  if (target.dataset.assistantLabel !== undefined) {
    const attempt = activeOfficialAttempt();
    if (!attempt || attempt.status === "in-progress") return;
    const row = schemeReference(attempt.paperId).rows.find(row => row.label === target.value);
    if (!row) return;
    attempt.assisted = { label:row.label, expected:row.numericAnswer || "", answer:"", working:"", confirmed:false };
    updateUser(store,user); render(); return;
  }
  if (target.dataset.preference) {
    if (!user || isAdminPortal || route !== "Settings") return;
    try {
      const preferences = readPreferences(user.email);
      if (!["theme", "textSize"].includes(target.dataset.preference)) return;
      preferences[target.dataset.preference] = target.value;
      savePreferences(user.email, preferences); applyAppearance(); toast("Appearance saved.");
    } catch (error) { toast(error.message, "error"); }
    return;
  }
  if (target.dataset.pastAnswer !== undefined) { saveOfficialAnswer(target); return; }
  if (target.hasAttribute("data-goal-choice")) {
    const fieldset = target.closest(".learning-goals");
    const selected = [...fieldset.querySelectorAll('input[name="goals"]:checked')].map(input => input.value);
    fieldset.querySelector(".selected-goals").innerHTML = selectedGoalChips(selected);
    return;
  }
  if (target.hasAttribute("data-leaderboard-period")) {
    leaderboardPeriod = target.value;
    render();
  }
  if (target.dataset.pastFilter) { pastFilters[target.dataset.pastFilter] = target.value; pastPageNumber = 1; render(); return; }
  if (target.hasAttribute("data-past-reviewer")) {
    const attempt = activeOfficialAttempt();
    if (attempt && ["self", "teacher"].includes(target.value)) { attempt.reviewer = target.value; updateUser(store, user); }
    return;
  }
  if (target.dataset.pastRow !== undefined || target.hasAttribute("data-past-feedback")) { saveOfficialInput(target); return; }
  if (target.id === "test-answer-mode") { user.profile.testMode = target.value; updateUser(store, user); render(); return; }
  if (target.id === "exam-answer-mode" && exam) {
    saveCurrentExamAnswer(); exam.mode = target.value; user.profile.testMode = target.value; updateUser(store, user); render(); return;
  }
  if (target.dataset.workingUpload) { await attachWorkingFiles(target); return; }
  if (target.dataset.methodCriterion && examResult) {
    const index = Number(target.dataset.methodQuestion), part = Number(target.dataset.methodPart);
    const item = examResult.review[index];
    if (!item || !(item.question.parts || [item.question])[part]) return;
    item.methodReviews ||= {};
    item.methodReviews[part] ||= { decisions: {}, note: "" };
    item.methodReviews[part].decisions[target.dataset.methodCriterion] = target.value;
    activeReviewQuestion = index; persistMethodReview(); render(); return;
  }
  if (target.dataset.reviewWorking !== undefined && examResult) {
    const item = examResult.review[Number(target.dataset.reviewWorking)];
    if (item) { item.working = target.value; item.calculationChecks = checkCalculationLines(item.working); persistMethodReview(); }
    return;
  }
  if (target.dataset.reviewNote !== undefined && examResult) {
    const item = examResult.review[Number(target.dataset.reviewNote)], part = Number(target.dataset.reviewPart);
    if (!item) return;
    item.methodReviews ||= {}; item.methodReviews[part] ||= { decisions: {}, note: "" };
    item.methodReviews[part].note = target.value; persistMethodReview(); return;
  }
  if (target.id === "working-reviewer" && examResult) { examResult.reviewer = target.value; persistMethodReview(); render(); return; }
  if (["paper-level", "real-paper-level"].includes(target.id)) { paperLevel = target.value; user.profile.paperLevel = paperLevel; updateUser(store, user); render(); }
  if (target.dataset.filter) {
    bankFilters[target.dataset.filter] = target.value;
    if (target.dataset.filter === "topic") bankFilters.subtopic = "All skills";
    bankPageNumber = 1;
    render();
  }
  if (target.dataset.action === "hide-leaderboard") {
    user.profile.hideLeaderboard = target.checked;
    updateUser(store, user);
    render();
  }
  if (target.name === "exam-answer") {
    const q = exam?.questions[exam.index];
    if (q) exam.answers[q.id] = target.value;
  }
  if (target.hasAttribute("data-exam-match") && exam) {
    const q = exam.questions[exam.index];
    exam.answers[q.id] = Object.fromEntries([...document.querySelectorAll("[data-exam-match]")].map(select => [select.dataset.examMatch, select.value]));
  }
  if (target.name === "days" || target.name === "minutes") {
    const label = target.parentElement.querySelector(".range-value");
    if (label) label.textContent = target.value;
  }
});

app.addEventListener("input", event => {
  if (event.target.dataset.officialCheckField !== undefined) {
    const attempt = activeOfficialAttempt(), field = event.target.dataset.officialCheckField;
    if (!attempt || attempt.status === "in-progress" || !["expected", "answer", "working", "confirmed"].includes(field)) return;
    attempt.assisted ||= { label:schemeReference(attempt.paperId).rows[0]?.label || "" };
    attempt.assisted[field] = field === "confirmed" ? event.target.checked : event.target.value;
    delete attempt.assisted.assessment;
    const feedback = document.querySelector("#official-assistant-feedback"); if (feedback) feedback.innerHTML = "Recheck the edited answer before applying a mark.";
    updateUser(store,user); return;
  }
  if (event.target.dataset.assistantIndex !== undefined && examResult) {
    const index = Number(event.target.dataset.assistantIndex), part = Number(event.target.dataset.assistantPart), field = event.target.dataset.assistantField;
    const item = examResult.review[index];
    if (!item || !["answer", "working"].includes(field)) return;
    item.assisted ||= {}; item.assisted[part] ||= {};
    item.assisted[part][field] = event.target.value; delete item.assisted[part].assessment;
    const feedback = document.querySelector(`#assisted-feedback-${index}-${part}`); if (feedback) feedback.innerHTML = "Recheck the edited answer before applying a mark.";
    persistMethodReview(); return;
  }
  if (event.target.dataset.pastAnswer !== undefined) { saveOfficialAnswer(event.target); return; }  if (event.target.dataset.pastRow !== undefined || event.target.hasAttribute("data-past-feedback")) { saveOfficialInput(event.target); return; }
  if (event.target.id === "exam-working" && exam) exam.working[exam.questions[exam.index].id] = event.target.value;
  if (event.target.hasAttribute("data-exam-part") && exam) {
    const id = exam.questions[exam.index].id;
    exam.answers[id] ||= {};
    exam.answers[id][event.target.dataset.examPart] = event.target.value;
  }
  if (event.target.id === "exam-answer-input" && exam) exam.answers[exam.questions[exam.index].id] = event.target.value;
  if (exam && ["Exam", "ExamReview"].includes(route)) persistExamDraft();
});

app.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.target;
  const values = new FormData(form);
  if (form.id.startsWith("typed-marking-form-")) {
    const match = form.id.match(/^typed-marking-form-(\d+)-(\d+)$/);
    if (!match || !examResult) return;
    const index = Number(match[1]), part = Number(match[2]), item = examResult.review[index];
    const question = (item?.question.parts || [item?.question])[part];
    if (!question) return;
    item.assisted ||= {};
    const answer = String(values.get("answer") || ""), working = String(values.get("working") || "");
    item.assisted[part] = { answer, working, assessment:assessTypedWorking(question,answer,working) };
    activeReviewQuestion = index; persistMethodReview(); render(); return;
  }
  if (form.id === "official-assistant-form") {
    const attempt = activeOfficialAttempt();
    if (!attempt || attempt.status === "in-progress") return;
    try {
      const details = { label:String(values.get("label") || ""), expected:String(values.get("expected") || ""), answer:String(values.get("answer") || ""), working:String(values.get("working") || ""), confirmed:values.get("confirmed") === "on" };
      details.assessment = assessOfficialWorking(attempt.paperId,details);
      attempt.assisted = details; updateUser(store,user); render();
    } catch (error) { toast(error.message,"error"); }
    return;
  }

  if (form.id === "support-message-form") {
    if (!user || (isAdminPortal ? user.role !== "admin" || window.adminTab !== "support" : route !== "Help Center")) return;
    try {
      sendSupportMessage(user.email, isAdminPortal ? supportLearner : user.email, values.get("message"));
      form.reset(); refreshSupport();
    } catch (error) { toast(error.message, "error"); }
    return;
  }

  if (form.id === "past-paper-setup") {
    const paper = pastPapers.find(p => p.id === officialSelectedId);
    if (!paper) return;
    try {
      const attempt = makePastPaperAttempt(paper, { minutes: Number(values.get("minutes")), totalMarks: Number(values.get("totalMarks")), mode: String(values.get("mode") || "timed") });
      (user.profile.officialPapers ||= []).unshift(attempt); officialActiveId = attempt.id;
      updateUser(store, user); render();
    } catch (error) { toast(error.message, "error"); }
    return;
  }
  if (form.id === "bank-search") {
    bankFilters.query = String(values.get("query") || "").trim(); bankPageNumber = 1; render(); return;
  }
  if (form.id === "admin-bank-search") {
    adminBankQuery = String(values.get("query") || "").trim(); adminPageNumber = 1; render(); return;
  }
  if (form.id === "curriculum-search") {
    lessonSearch = String(values.get("query") || "").trim();
    lessonTopicFilter = "All topics";
    setRoute("Learn");
    return;
  }
  if (form.id === "formula-search") {
    formulaSearch = String(values.get("query") || "").trim();
    setRoute("Formula Reference");
    return;
  }
  if (form.id.startsWith("admin-") && (!isAdminPortal || user?.role !== "admin")) return;
  if (["admin-user-form", "admin-reset-password-form"].includes(form.id)) {
    if (!adminSelectedLearner || adminAccountSaving) return;
    try {
      if (form.id === "admin-user-form") {
        editLearner(adminSelectedLearner, {
          name: String(values.get("name") || ""), board: String(values.get("board")), target: String(values.get("target")),
          examDate: String(values.get("examDate") || ""), confidence: String(values.get("confidence")),
          paperLevel: String(values.get("paperLevel")), goals: values.getAll("goals").map(String)
        });
      } else {
        const password = String(values.get("password") || ""), confirmation = String(values.get("confirmation") || "");
        adminAccountSaving = true;
        const button = form.querySelector?.('button[type="submit"], button');
        if (button) { button.disabled = true; button.textContent = "Saving…"; }
        try { await resetLearnerPassword(adminSelectedLearner, password, confirmation, passwordHash); }
        finally { adminAccountSaving = false; if (button) { button.disabled = false; button.textContent = "Reset student password"; } }
      }
      store = readStore(); render();
      toast(form.id === "admin-user-form" ? "Learner details saved." : "Student password reset. Share the new password with the student.");
    } catch (error) { toast(error.message, "error"); }
    return;
  }
  if (form.id === "register-form") {
    if (isAdminPortal) return;
    const email = String(values.get("email")).trim().toLowerCase();
    if (store.users.some(item => item.email === email)) { toast("An account with that email already exists. Try logging in.", "error"); return; }
    try {
      const credentials = await passwordHash(String(values.get("password")));
      user = { email, password: credentials, role: "student", profile: emptyProfile(String(values.get("name")).trim(), email, String(values.get("board")), String(values.get("target")), String(values.get("examDate"))) };
      user.profile.confidence = String(values.get("confidence"));
      user.profile.goals = values.getAll("goals").map(String);
      store.users.push(user);
      store.currentEmail = email;
      savePortalSession(email, false);
      writeStore(store);
      if (startDiagnosticAfterAuth) {
        startDiagnosticAfterAuth = false;
        startExam("diagnostic");
      } else {
        route = "Home";
        render();
        toast("Welcome to MathMaster. Let’s make progress together.");
      }
    } catch (error) { toast(error.message, "error"); }
  }
  if (form.id === "login-form") {
    const email = String(values.get("email")).trim().toLowerCase();
    const candidate = store.users.find(item => item.email === email && item.password);
    if (!candidate || (isAdminPortal ? candidate.role !== "admin" : candidate.role === "admin")) { toast("We couldn’t find an account for this portal with those details.", "error"); return; }
    try {
      const computed = await passwordHash(String(values.get("password")), new Uint8Array(candidate.password.salt));
      if (computed.hash.join(",") !== candidate.password.hash.join(",")) { toast("That password doesn’t match. Please try again.", "error"); return; }
      user = candidate; savePortalSession(candidate.email, isAdminPortal);
      if (!isAdminPortal) store.currentEmail = candidate.email;
      writeStore(store);
      if (startDiagnosticAfterAuth) {
        startDiagnosticAfterAuth = false;
        startExam("diagnostic");
      } else setRoute(isAdminPortal ? "Admin" : "Home");
    } catch (error) { toast(error.message, "error"); }
  }
  if (form.id === "practice-answer-form") {
    const question = questionList[questionIndex];
    const answer = question.type === "multipart"
      ? Object.fromEntries(question.parts.map((part, i) => [i, String(values.get(`part-${i}`) || "").trim()]))
      : String(values.get("answer") || "").trim();
    if (question.type === "multipart" ? Object.values(answer).some(value => !value) : !answer) return;
    const result = questionResultFor(questionList[questionIndex], answer);
    practiceAnswer = answer;
    questionResult = result;
    showHint = false;
    if (result.correct && questionList._mistakeMode) {
      const mistake = user.profile.mistakes.find(item => item.id === questionList[questionIndex].id && !item.improved);
      if (mistake) { mistake.improved = true; updateUser(store, user); }
    }
    render();
  }
  if (form.id === "daily-form") {
    if (displayedDailyDate !== todayKey()) { updateLocalClock(); toast("A new day has started. Open today’s challenge before submitting; your typed answer is still here."); return; }
    const daily = makeDailyQuestion(todayKey());
    const correct = checkAnswer(daily, String(values.get("answer")));
    if (user.profile.dailyChallenges.includes(todayKey())) return;
    user.profile.dailyChallenges.push(todayKey());
    user.profile.dailyAnswer = correct;
    user.profile.questionsCompleted++;
    const attempt = { ...daily, studentAnswer: String(values.get("answer")), correct, date: new Date().toISOString() };
    user.profile.attempts.push(attempt);
    if (!correct) user.profile.mistakes.unshift({ ...attempt, improved: false });
    recordActivity(user, correct ? 15 : 0);
    updateUser(store, user);
    render();
    toast(correct ? "That's right! +15 XP ✦" : "Challenge complete. Come back for another tomorrow!");
  }
  if (form.id === "study-plan-form") {
    if (isAdminPortal || !user || route !== "Study Plan") return;
    try {
      user.profile.studyPlan = saveStudySettings(user.profile, { examDate: String(values.get("examDate") || ""), target: String(values.get("target")), days: Number(values.get("days")), minutes: Number(values.get("minutes")), startTime: String(values.get("startTime") || "16:00") });
      user.profile.examDate = user.profile.studyPlan.examDate; user.profile.target = user.profile.studyPlan.target;
      editingStudyPlan = false; selectedStudyDate = "";
      updateUser(store, user); render(); toast("Your timetable is saved. Select any date to edit a session.");
    } catch (error) { toast(error.message, "error"); }
    return;
  }
  if (form.id === "study-session-form") {
    if (isAdminPortal || !user || route !== "Study Plan") return;
    if (!selectedStudyDate) return;
    try {
      user.profile.studyPlan = saveStudySession(studyPlanFor(user.profile), selectedStudyDate, { activity: String(values.get("activity") || ""), startTime: String(values.get("startTime") || ""), minutes: Number(values.get("minutes")), rest: values.get("rest") === "on" }, String(values.get("scope") || "date"));
      selectedStudyDate = ""; editingStudyPlan = false;
      updateUser(store, user); render(); toast("Study session saved.");
    } catch (error) { toast(error.message, "error"); }
    return;
  }
  if (form.id === "profile-form") {
    refreshManagedAccount(user, readStore().users.find(account => account.email === user.email));
    user.profile.name = String(values.get("name")).trim();
    user.profile.board = String(values.get("board"));
    user.profile.target = String(values.get("target"));
    user.profile.examDate = String(values.get("examDate"));
    user.profile.goals = values.getAll("goals").map(String);
    updateUser(store, user); render(); toast("Your profile has been updated.");
  }
  if (form.id === "password-form") {
    const changingUser = user;
    if (!user || isAdminPortal || route !== "Settings" || passwordSaving) return;
    const next = String(values.get("next") || ""), confirmation = String(values.get("confirmation") || "");
    if (next.length < 8 || next !== confirmation) { toast("Use at least 8 characters and make sure the new passwords match.", "error"); return; }
    const button = form.querySelector?.('button[type="submit"], button');
    try {
      passwordSaving = true; if (button) button.disabled = true;
      refreshManagedAccount(user, readStore().users.find(account => account.email === user.email));
      if (!user.password) throw new Error("Ask the admin to set a password for this account.");
      const existingHash = user.password.hash.join(",");
      const current = await passwordHash(String(values.get("current")), new Uint8Array(user.password.salt));
      if (current.hash.join(",") !== existingHash) throw new Error("Your current password doesn’t match.");
      const credentials = await passwordHash(next);
      if (user !== changingUser) throw new Error("Sign in again before changing your password.");
      const latest = readStore().users.find(account => account.email === user.email);
      if (!latest?.password || latest.password.hash.join(",") !== existingHash) throw new Error("Your password changed in another tab. Try again with the current password.");
      user.password = credentials;
      updateUser(store, user, { passwordChanged: true }); form.reset(); toast("Password updated.");
    } catch (error) { toast(error.message, "error"); }
    finally { passwordSaving = false; if (button) button.disabled = false; }
    return;
  }
  if (form.id === "admin-question-form") {
    const id = adminEditing?.kind === "question" ? adminEditing.id : `custom-${Date.now()}`;
    const matchingPairs = String(values.get("matchingPairs") || "").split("\n").map(line => line.split("=")).filter(pair => pair.length === 2 && pair[0].trim() && pair[1].trim()).map(([left, right]) => ({ left: left.trim(), right: right.trim() }));
    const q = { id, topic: String(values.get("topic")), subtopic: String(values.get("subtopic")), difficulty: String(values.get("difficulty")), type: String(values.get("type")), text: String(values.get("text")), answer: String(values.get("answer")), explanation: String(values.get("explanation")), hint: String(values.get("hint")), marks: Number(values.get("marks")), time: Number(values.get("time")), options: String(values.get("options") || "").split("\n").map(item => item.trim()).filter(Boolean), matchingPairs, matchingOptions: [...new Set(matchingPairs.map(pair => pair.right))], custom: true, original: true };
    if (q.type === "matching") {
      if (q.matchingPairs.length < 2) { toast("Add at least two matching pairs before saving.", "error"); return; }
      q.answer = matchingPairs.map(pair => `${pair.left}=${pair.right}`).join("; ");
    }
    if (q.type === "multipleChoice" && !q.options.some(option => checkAnswer(q, option))) q.options.unshift(q.answer);
    const existing = store.content.questions.findIndex(item => item.id === id);
    if (existing < 0) store.content.questions.push(q);
    else store.content.questions[existing] = q;
    adminEditing = null; saveContentStore(); window.adminTab = "questions"; render(); toast(existing < 0 ? "Question created." : "Question updated.");
  }
  if (form.id === "admin-lesson-form") {
    const id = adminEditing?.kind === "lesson" ? adminEditing.id : `custom-${Date.now()}`;
    const lesson = { id, title: String(values.get("title")), topic: String(values.get("topic")), subtopic: String(values.get("subtopic")), objective: String(values.get("objective")), explanation: String(values.get("explanation")), formula: String(values.get("formula")), example: String(values.get("example")), steps: String(values.get("steps")).split("\n").filter(Boolean), practice: [String(values.get("practice1")), String(values.get("practice2"))], challenge: String(values.get("challenge")), exam: String(values.get("exam")), summary: String(values.get("summary")) };
    const existing = store.content.lessons.findIndex(item => item.id === id);
    if (existing < 0) store.content.lessons.push(lesson);
    else store.content.lessons[existing] = lesson;
    adminEditing = null; saveContentStore(); window.adminTab = "lessons"; render(); toast(existing < 0 ? "Lesson created." : "Lesson updated.");
  }
});

window.addEventListener("storage", event => {
  if (event.key === "mathmaster-preferences-v1") { applyAppearance(); return; }
  if (event.key === "mathmaster-support-v1" && user) { store = readStore(); refreshSupport(); return; }
  if (event.key !== "mathmaster-igcse-v1" || uploadInProgress) return;
  const latest = readStore();
  store.content = latest.content;
  if (user) refreshManagedAccount(user, latest.users.find(account => account.email === user.email));
  store.users = latest.users.map(account => account.email === user?.email ? user : account);
  store.currentEmail = latest.currentEmail;
  if (["Home", "Question Bank", "Learn"].includes(route) || (route === "Admin" && !(["create", "users", "support"].includes(window.adminTab || "dashboard")))) render();
});

window.addEventListener("resize", syncStudentNavigation);
window.addEventListener("keydown", event => {
  if (event.key === "Escape" && !isAdminPortal && (studentMenuOpen || desktopMenuOpen || sidebarHovered || sidebarFocused)) toggleStudentNavigation(true);
});

window.addEventListener("hashchange", () => {
  const name = decodeURIComponent(location.hash.slice(1));
  if (!name || !user) return;
  if (["Home", "Learn", "Formula Reference", "Practice", "Question Bank", "Past Papers", "Exams", "Progress", "Study Plan", "Achievements", "Profile", "Settings", "Help Center", "Admin", "Mistakes", "Daily Challenge"].includes(name)) setRoute(name);
});

const localClockTimer = setInterval(updateLocalClock, 1000);
localClockTimer?.unref?.();
window.addEventListener("focus", updateLocalClock);
window.addEventListener("pageshow", updateLocalClock);
window.addEventListener("visibilitychange", updateLocalClock);

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./service-worker.js").catch(error => console.warn("Offline caching is unavailable.", error));

// A starter set makes the first visit useful before an account is created.
if (new URLSearchParams(location.search).get("preview") === "admin" && !isAdminPortal) {
  location.replace("./admin.html?preview=admin");
} else {
  if (isAdminPortal && new URLSearchParams(location.search).get("preview") === "admin") enterAdminPreview();
  render();
}
