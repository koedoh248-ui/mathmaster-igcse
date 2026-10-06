# MathMaster IGCSE — Part 1

A responsive, offline-friendly IGCSE Mathematics learning prototype. It has no runtime dependencies and does not call third-party or AI services.

## Run locally

Use Node.js 20 or newer:

```sh
npm start
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). The app uses the browser's local storage and secure Web Crypto for device-local accounts. A service worker caches the app shell when served over localhost or HTTPS.

Run the focused logic tests with `npm test`.

## Host on GitHub Pages

`npm run build` creates `dist/` with only the website HTML, CSS, JavaScript, manifest and service worker. The app uses relative URLs and supports a repository URL such as `https://USERNAME.github.io/mathmaster-igcse/`.

1. In VS Code Source Control, choose **Publish to GitHub** (or initialize the repository first if prompted). Use a repository named `mathmaster-igcse` with the `main` branch. GitHub Pages is available for public repositories on GitHub Free; private repository Pages hosting requires an eligible paid plan.
2. In the GitHub repository, open **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Open **Actions → Publish MathMaster to GitHub Pages → Run workflow** on `main`. Future pushes to `main` publish automatically. The workflow runs the tests, builds the website and deploys `dist/`. Its deployment result shows the live website URL.

This hosts the current browser-local prototype. It does not run `server.mjs`, synchronize accounts or progress between devices, or provide a shared admin inbox. The admin preview manages only the records in the browser where it is opened. Existing localhost records are separate from records on the hosted website.

The deployment follows [GitHub's Pages publishing documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Included

- Device-local registration, login, profile and password changes
- Searchable eight-unit curriculum with structured lesson pages, worked examples, quick checks, practice sets, challenges and exam-style questions
- Formula reference, 20-question unit mini-tests and locally generated, answer-verified questions across all eight topics
- Diagnostic tests, timed mock exams, daily challenge, progress, mistakes, recommendations, XP, streaks and achievements
- Editable weekly study plan, device-local leaderboard, original exam-style questions, past-paper licensing information and local admin content editor
- Responsive desktop and mobile layouts; offline app-shell caching

## IGCSE paper practice

The question bank contains 4,096 original Cambridge 0580-style questions (including numerical variants), with 256 questions per topic and tier across more than 140 skill labels. Student and admin lists use keyword search and 30-question pages. Student filters include topic, tier, skill, difficulty, answer type and calculator mode. The collection covers Core and Extended, with fresh generated variants for practice sessions and tests. The Past Papers page links to [Cambridge's official papers and mark schemes](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-mathematics-0580/past-papers/) and provides original paper practice based on the [2025–2027 syllabus](https://www.cambridgeinternational.org/Images/662466-2025-2027-syllabus.pdf).

Paper 1 and Paper 3 practice use Core content, 80 marks and 90 minutes. Paper 2 and Paper 4 practice use Extended content, 100 marks and 120 minutes. Papers 1 and 2 are non-calculator; Papers 3 and 4 allow a scientific calculator. These generated papers use their own question distribution and are not official exam papers or a complete representation of every syllabus skill.

Multipart answers and written working are preserved while navigating the paper. Typed-answer results include solutions and a final-answer practice score. Generated questions, including diagrams and tables, can be retried from the mistakes page.

## Paper working, uploads and feedback

Choose **Work on paper & upload** in Exams or Past Papers, or switch the answer format within a test. Use **Print questions / save as PDF** to print the whole question set without solutions. Answer on paper and label every question and part. Attach JPG, PNG, WebP or PDF files (up to five per question, 10 MB each). Images can be viewed locally and PDFs opened in the browser. Files are stored as blobs in IndexedDB, scoped to the local account; metadata, test drafts, review decisions and feedback are saved with the local learning record. No upload server, API, OCR service or third-party runtime dependency is used.

Submitted paper working is **pending review**, not automatically marked wrong. Learners or a teacher/tutor can review the pages against original question-specific practice rubrics, award M (method), A (accuracy) and B (independent) marks, and write feedback. The local reviewer calculates partial credit, enforces the rubric's accuracy dependencies and produces feedback on missing criteria. Completed reviews update the saved score and topic progress; incomplete reviews do not receive a final score. Reviews and attachments can be reopened from Exams or Profile, including after a refresh.

The mark types and general principles are informed by [Cambridge's official 0580 specimen mark scheme](https://www.cambridgeinternational.org/Images/663672-2025-specimen-paper-2-mark-scheme.pdf). The app also links to the user's [PapaCambridge paper collection](https://pastpapers.papacambridge.com/papers/caie/igcse-mathematics-0580). Rubrics for generated questions are original practice rubrics, not Cambridge's official question-specific schemes. For an official paper, consult the scheme for that exact year, session and paper variant; follow-through and special-case awards are specific to that scheme.

Handwritten images and PDFs are not automatically interpreted. Optional transcribed working can be checked for arithmetic equalities locally, including fractions, powers, brackets and square roots. The checker distinguishes exact, rounded, incorrect and unverified lines; it does not assess algebraic reasoning or award method marks. Arithmetic feedback supplements the learner/teacher review. Full-paper results are practice scores, not official grades.

## Prototype boundaries

Accounts, passwords, learning records, admin permissions and content are stored in this browser only. Passwords use PBKDF2 hashing via Web Crypto, but browser storage is not a production authentication or authorization boundary. The demo admin entry is intentionally local and is not a secure production admin account. Do not use this prototype to store sensitive information or expose it as a multi-user service. A production release needs a server-backed identity system, authorization checks and a persistent database.

Exams and Past Papers include a catalogue of 487 real Mathematics 0580 question papers from 58 PapaCambridge session listings (2002–2026), checked on 6 October 2026. There are 473 exact paper/mark-scheme pairs; missing scheme links are labelled and link back to the session listing. Only public link metadata is bundled. Original PDFs open online on PapaCambridge, so an internet connection is needed to read them.

Filter by year, session, Core/Extended, paper number and variant. Choose a paper, copy its duration and total marks from the cover, and start a real-paper attempt. The timer survives leaving/resuming the page. Upload working locally and submit for human review against the exact official scheme. The reviewer adds each question/part's available marks, awarded marks and feedback. A final score is saved only when all entries have valid whole marks, unique labels and available marks sum to the cover total. Editing a mark makes a previously reviewed score pending again. Real-paper attempts and feedback appear in saved past-paper history and remain separate from automatically checked original mock questions. No automatic PDF question extraction or handwriting marking is performed.

Refresh the catalogue with `python3 scripts/build-past-paper-catalog.py` (requires Python, curl and internet access). The refresh reads actual listing URLs; it does not invent missing papers or download paper contents. The app also bundles original questions and generates its own practice papers.

## Part 2 boundary

Content, storage, math checking, progress and recommendations are separated into local modules. No AI service is implemented or invoked; a future optional integration can be added behind a new service boundary without changing the current question-checking path.


Student and admin areas have separate entry pages: `index.html` for learning and `admin.html` for content management. The admin sidebar contains Dashboard, Question bank, Lessons, Learners and Create content, with a separate sign-in screen and violet accents. Student navigation contains only learning features. Each portal saves its own local session; signing out of one leaves the other signed in. Open `admin.html?preview=admin` for the local admin preview. The previous `?preview=admin` URL redirects to this page. Both portals share the local content catalogue, and student progress saves preserve admin content edits.

Student navigation is grouped into Learn, Resources and Your progress. The desktop sidebar starts collapsed into a slim left-edge strip. Moving the mouse onto the strip opens it; moving away closes it after a short delay. Keyboard focus keeps it open until focus leaves, and the strip or top-left menu button also opens it. On mobile it opens a drawer that closes after navigation, tapping outside or pressing Escape. Hiding navigation preserves unfinished form and answer inputs. Learning goals display only selected chips; expand Change goals to edit the checkbox list, then save the profile.

A first-use student guide explains the main learning tools in 13 steps. Next advances, Back revisits a step and Skip guide dismisses all remaining steps (Escape also skips). Progress and completion are saved per learner. Help in the top bar restarts the guide; guide controls preserve unfinished page inputs. Automatic guidance stays out of active test and marking workspaces.

In Admin → Learners, Manage account opens an editor for the student name, exam board, target grade, exam date, tier, confidence and selected goals. Account recovery sets a new password with a matching confirmation (minimum eight characters), using the same salted PBKDF2 format as student sign-in. Passwords are cleared from the form after a successful reset. Learning records and uploaded-work ownership remain intact. Changes use fresh saved account data, and open learner tabs retain administrative profile changes and password resets when saving progress. Account management applies to the learner accounts in this browser; account emails remain their stable identifiers.

Choose this exam opens the full original PDF for every indexed Cambridge paper in an embedded viewer. The workspace supports timed or untimed practice, autosaved question/part responses, handwritten uploads, submission and manual whole-paper marking beside the matching official PDF mark scheme. Recent-format settings are prefilled and must be confirmed against the cover; older-paper settings remain blank. Adding responses and attaching working update the answer controls without reloading the question PDF. External PDFs require internet and browser PDF-viewer support; Open PDF remains available for reading or printing externally.

To share a private test copy, run `npm run build:test` and send only `test.html`. Testers save the file and double-click it in a browser; no server, installation or source folders are needed. Create a test account for student flows. Admin sign-in on the welcome screen (or Test admin in the student footer) opens the admin view within the same file; Open local admin preview enables management testing. The copy uses separate local account/session/upload storage and contains no existing user records. Real past-paper PDFs remain external online documents. Rebuild the file after website changes. Sending the file privately does not publish the website.

Official complete-paper practice now includes numeric question structures scanned from all 487 archived PDF links. 483 passed sequential-question and cover-mark-total checks (8,172 question spaces); four unreadable or inconsistent originals retain flexible manual question entry. Real Start Paper 2 / Start Paper 4 selectors choose an archived year/session/variant, separate from original generated mock papers. Indexed attempts save each question’s working, completion flag, revisit flag and active question; Previous / Next opens the associated PDF page. Submitted reviews start with every scanned question and its available marks. Official wording, diagrams and answers stay in the linked PDF/mark scheme; final marks still require human review. `scripts/scan-paper-structure.py` regenerates metadata using build-time PyMuPDF, separate worker processes and a temporary PDF cache. PDFs and user records are not bundled. Rebuild `test.html` with `npm run build:test` after updates.

The latest hover navigation changes apply to the main website. The previously shared `test.html` is a separate snapshot; rebuilding it is optional when preparing a new copy for testers.

Study Plan now shows a Suggested schedule before personalisation. Saving Make it yours hides the setup form and shows Your schedule with a full month calendar, previous/next month controls, Today and a recurring weekly timetable. Edit my plan reopens settings. Selecting any date opens a session editor for activity, time, duration, rest days, completion and date-only or recurring weekday changes. Date exceptions and completion records survive weekly settings changes; old study plans are read without losing their activities. Recurring sessions stop on the exam date. All changes are saved locally.

Settings now saves per-account theme (dark neon mint or light neon green) and text size (100%, 115%, 130%) in this browser. Text scaling changes font sizes throughout the interface. Password changes verify the current password, require matching new passwords of at least eight characters, hash with PBKDF2, and reject a concurrent admin reset. Help Center provides persistent student threads and an admin reply inbox using a separate local message store. Cross-tab replies update the message log without replacing the message draft. This is a local prototype: accounts, preferences and chat are not synchronized across devices, and admin access is browser-local. The existing test.html snapshot was not rebuilt.

Help Center now offers automatic admin help with branching choices for accounts, appearance, study plans, learning, real papers, uploads, marking and saved work. Every list includes Other; users can go back, restart or confirm a solution. Choices and clearly labelled automatic replies persist in the chat transcript. Sending a custom problem adds an automatic acknowledgement (An admin will respond soon) and the admin inbox labels the conversation Needs admin reply. Human admin replies remain separate and do not trigger bot acknowledgements. The chat remains local to this browser, without an API or guaranteed response time.

Marking assistance now checks equivalent numeric expressions and bounded single-variable polynomial/rational expressions using exact rational coefficients. Linear equation rearrangements and proportional quadratic equations are checked without matching the model solution’s exact steps. Domain changes, required forms, complex methods and unsupported notation remain pending. The review workspace accepts per-part final answers and transcribed working, gives arithmetic/algebra feedback, and can apply a confirmed independent one-mark answer criterion; it does not award M marks from matching text or counting correct lines. Official review has a source-confirmed comparison form with links to the scanned part’s original scheme page.

`scripts/scan-mark-schemes.py` scanned all 487 catalogue entries: 120 question/part indexes reconcile with every question’s marks in the original paper; 351 extracted indexes need source verification; 2 PDFs were unreadable; 14 have no matching scheme URL. There are 10,807 part references and 679 conservative one-mark numeric answers in verified indexes. The generated `src/mark-scheme-index.js` contains numeric facts, mark codes, flags and page references, not copied scheme prose or PDFs. A verified index is a structural check, not complete interpretation of all scheme conditions. Alternative methods, follow-through, diagrams, proofs, required forms and handwritten uploads require human review. No OCR or marking API was added.

The authenticated student and admin headers display a live device-local date/time. Calendar Today markers and expired streak flames update across midnight or when returning to the tab. Consecutive learning days use calendar-day arithmetic, including timezone and daylight-saving boundaries; opening a page does not earn a streak day. Daily challenges refresh at local midnight unless a student is typing, in which case a notice preserves their draft and prevents checking it against the next day’s question. No external time service is used: schedules follow the device clock and timezone.
