# MathMaster shared accounts

The student and admin sites stay on GitHub Pages. Supabase provides authentication, the shared database, private working uploads, and support messages.

## Installation

1. Create the free Supabase project. Keep its database password private.
2. Run `schema.sql` once in the project's SQL editor. It runs in a transaction and creates the profiles, singleton admin assignment, course content, support messages, and private upload bucket.
3. Set the Authentication Site URL to `https://koedoh248-ui.github.io/mathmaster-igcse/`. Allow the same URL with `index.html` as a redirect.
4. Configure custom SMTP before accepting public signups. Supabase's default email sender is for testing, has restrictive recipient limits, and does not support a general public launch. Keep email confirmation enabled.
5. Put the project URL and **publishable** API key in `src/cloud-config.js`. Never publish a secret/service-role key or database password.
6. Create and confirm the website account for `koedoh248@gmail.com`. This is separate from the Supabase dashboard login.
7. After approval, run `main-admin.sql`. It requires a confirmed email and refuses a second administrator. No browser code can promote an account.
8. Build, test, and publish the updated root HTML, CSS, service worker, and `src` files. The database SQL is not part of the public site build.

## Access and saving

The website uses authenticated database functions. Anonymous callers cannot access profiles, messages, uploads, or shared content. Students can read and change only their own profile, messages, and uploaded work; course content is readable after login. The single administrator can read all learner profiles and messages, manage profiles and course content, and read learner uploads. Password recovery runs through Supabase email links, and administrators never see passwords.

Profile saves compare every changed field with its original server value. Concurrent edits to the same field pause sync instead of silently replacing another device's changes. Unsent changes are journaled locally under the signed-in user's ID. A visible status and Retry sync button report failures. Signing out is blocked until pending changes sync. Keep the browser data when resolving a conflict; the pending journal contains the unsent work.

A student and administrator can have separate sessions in the same browser. Live dashboards refresh every 30 seconds while idle; typing and active exam screens are preserved. The service worker caches only the site's static files; authenticated Supabase responses are never cached by it.

## Existing local data

The old browser-only store remains untouched. Local accounts and password hashes do not automatically become Supabase accounts, and existing local progress is not uploaded silently. The self-contained private HTML copy remains an isolated offline demo with its own store.

## Verification before launch

Check registration and email confirmation, login from a second browser/device, progress and study-plan persistence, private PDF/image uploads, admin visibility of multiple learners, shared question/lesson updates, and support replies. Verify that a student cannot access another student's profile/upload or assign the admin role. Test a failed connection and a concurrent edit so unsent work is retained.
