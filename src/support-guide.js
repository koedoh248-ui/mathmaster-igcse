const choice = (id, label) => ({ id, label });
export const supportGuide = {
  start: { text: 'Hi! I’m the automatic help assistant for the admin. What do you need help with?', options: [choice('account', 'Account & password'), choice('appearance', 'Theme & text size'), choice('study', 'Study plan & learning'), choice('papers', 'Exams, papers & marking'), choice('saved', 'Saved work & technical problems')] },
  account: { parent: 'start', text: 'Choose the account problem that matches yours.', options: [choice('password-change', 'Change my password'), choice('password-forgotten', 'I forgot my password'), choice('profile', 'Change my profile or goals')] },
  appearance: { parent: 'start', text: 'What would you like to change?', options: [choice('theme', 'Switch light or dark theme'), choice('text', 'Make the words larger'), choice('navigation', 'Open or close the side menu')] },
  study: { parent: 'start', text: 'Which part of studying do you need help with?', options: [choice('schedule', 'My study timetable'), choice('learning', 'Lessons & practice questions'), choice('progress', 'Progress & mistakes')] },
  schedule: { parent: 'study', text: 'What is happening with your study plan?', options: [choice('plan-create', 'Create my own schedule'), choice('plan-hidden', 'Make it yours disappeared'), choice('plan-edit', 'Change a day or weekly session')] },
  learning: { parent: 'study', text: 'Choose what you want to do next.', options: [choice('lessons', 'Find a lesson'), choice('practice', 'Get different practice questions'), choice('goals', 'Choose my learning goals')] },
  papers: { parent: 'start', text: 'Which exam feature do you need help with?', options: [choice('real-papers', 'Take a complete Cambridge paper'), choice('uploads', 'Upload handwritten calculations'), choice('marking', 'Understand my marks & feedback')] },
  uploads: { parent: 'papers', text: 'What do you need to know about uploading your working?', options: [choice('upload-how', 'How to attach my working'), choice('upload-failed', 'My upload will not save'), choice('upload-reading', 'Will handwriting be checked automatically?')] },
  marking: { parent: 'papers', text: 'Which marking question matches yours?', options: [choice('mark-pending', 'My result says pending review'), choice('mark-method', 'How do method marks work?'), choice('mark-official', 'Where is the Cambridge mark scheme?')] },
  saved: { parent: 'start', text: 'Choose the problem you are experiencing.', options: [choice('saved-missing', 'My progress is missing'), choice('pdf', 'A past-paper PDF will not open'), choice('chat-devices', 'I cannot see chat on another device')] },
  'password-change': { parent: 'account', text: 'Open Settings → Reset your password. Enter your current password, then a new password of at least 8 characters and confirm it. Press Update password. Use the new password next time you sign in.' },
  'password-forgotten': { parent: 'account', text: 'An admin can set a new password from Admin → Learners → Manage account → Reset password. Choose Other below and describe the account problem so the admin can help. Never send your password in chat.' },
  profile: { parent: 'account', text: 'Open Profile to change your name, exam board, target grade or exam date. Press Save changes when you finish.' },
  theme: { parent: 'appearance', text: 'Open Settings → Theme. Choose Dark · neon mint or Light · neon green. The change appears immediately and saves automatically for your account in this browser.' },
  text: { parent: 'appearance', text: 'Open Settings → Text size. Choose Standard, Large (115%) or Extra large (130%). Words across the website become larger and your choice saves automatically.' },
  navigation: { parent: 'appearance', text: 'On a computer, move the pointer to the slim Menu strip on the left to open the navigation. It closes when the pointer leaves. You can also click Menu. On a phone, use the menu button at the top.' },
  'plan-create': { parent: 'schedule', text: 'Open Study Plan. Suggested schedule is the starting plan. In Make it yours, choose your exam date, target, study days, duration and start time. Press Done · Save my plan to see your calendar and timetable.' },
  'plan-hidden': { parent: 'schedule', text: 'After saving, Make it yours closes so your calendar has more space. Your schedule is saved. Press Edit my plan at the top of Study Plan to reopen the setup anytime.' },
  'plan-edit': { parent: 'schedule', text: 'Select a date on the study calendar. Change its activity, time, duration or rest day. Choose Only this date or Every weekday to repeat it, then save. Use Edit my plan to change the general routine.' },
  lessons: { parent: 'learning', text: 'Open Learn, choose a topic or search for a lesson, then open it. Read the worked examples and try the practice questions. You can return to the lesson anytime.' },
  practice: { parent: 'learning', text: 'Open Practice and choose your topic and tier. New practice sets vary the questions and avoid recently shown ones. Question Bank lets you filter by topic, skill, difficulty and calculator mode.' },
  goals: { parent: 'learning', text: 'Open Profile → Change goals. Pick the goals you want and press Save changes. Only the selected goals appear in your profile.' },
  progress: { parent: 'study', text: 'Open Progress for scores by topic. Open Mistakes to revisit questions you found difficult and practise them again. Your progress is saved in this browser.' },
  'real-papers': { parent: 'papers', text: 'Open Exams or Past Papers. Under Start Paper 2 or Start Paper 4, choose the year, session and variant. Select the paper, check its cover duration and total marks, and start. Use Previous / Next for every indexed question. The original PDF needs internet.' },
  'upload-how': { parent: 'uploads', text: 'Choose paper-working mode in a calculation test, or attach working in a real-paper answer space. Solve on paper, take a clear photo or scan, then attach it to the matching question. Include each calculation step and final answer.' },
  'upload-failed': { parent: 'uploads', text: 'Use JPG, PNG, WebP or PDF files, no more than 10 MB each and up to five per question. Wait for saving to finish. If the browser reports a storage problem, check available device storage and try a smaller file. Do not clear site data: that removes saved work.' },
  'upload-reading': { parent: 'uploads', text: 'The app saves your handwritten working but does not read it automatically. A student or teacher reviews the work using the marking criteria. Typed final answers receive automatic final-answer checking.' },
  'mark-pending': { parent: 'marking', text: 'Pending review means uploaded working has not been fully marked. It is not a zero score. Open the review, check the working against the criteria or matching mark scheme, and enter the marks and feedback for every part.' },
  'mark-method': { parent: 'marking', text: 'Method (M) marks reward a valid method. Accuracy (A) marks usually depend on the associated method mark. Independent (B) marks do not need a method mark. Always follow the specific criteria shown or the exact official mark scheme.' },
  'mark-official': { parent: 'marking', text: 'Submit the real-paper attempt, then open its matching Cambridge mark scheme in the review workspace. Check the paper code, year, session and variant. Some archived papers have no matching scheme; the app labels those explicitly.' },
  'saved-missing': { parent: 'saved', text: 'Use the same browser and device, and sign in to the same account. Progress does not sync to another device. Private browsing or clearing site data can remove saved work. The shared test.html copy also has separate storage from the main site.' },
  pdf: { parent: 'saved', text: 'Check your internet connection. Try Open PDF to view the original document in a separate tab. If the inline viewer is unsupported, use the browser’s PDF viewer or download the paper for reading.' },
  'chat-devices': { parent: 'saved', text: 'This version keeps chat in this browser. The admin can reply from the admin page in another tab of the same browser. Chat across different devices is not connected yet.' },
  other: { text: 'Tell us what happened in the message box below. Include the page and what you tried, but do not include your password. Send your message and an admin will respond soon.' },
  waiting: { text: 'Thank you. Your message is in the admin’s help inbox. An admin will respond soon. You can add more details below. This inbox works in this browser; there is no guaranteed response time.' },
  resolved: { text: 'Glad that helped! You can explore another help topic anytime.' }
};
export function supportGuideState(messages) {
  const id = [...messages].reverse().find(message => message.automated && message.guideNode)?.guideNode || 'start';
  return Object.hasOwn(supportGuide, id) ? id : 'start';
}
export function supportChoices(nodeId) {
  const node = supportGuide[nodeId];
  if (!node) return [];
  const options = [...(node.options || [])];
  if (!node.options && !['other', 'waiting', 'resolved'].includes(nodeId)) options.push(choice('resolved', 'Yes, this solved my problem'));
  options.push(choice('other', 'Other'));
  if (node.parent) options.push(choice(node.parent, 'Back'));
  if (nodeId !== 'start' && node.parent !== 'start') options.push(choice('start', 'Start again'));
  return options;
}
