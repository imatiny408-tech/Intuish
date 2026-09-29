/* Intuish settings. Email sign-in (magic link, no password) turns on when these are filled in
   with a free Supabase project's URL and public anon key, after the app is hosted. */
window.INTUISH_AUTH = { url: "", anonKey: "" };

/* AI checking for written answers. Set url to the Intuish server (a free Cloudflare Worker running grader/worker.js,
   which keeps the Google Gemini key private). Empty = written answers are saved but not scored yet. */
window.INTUISH_AI = { url: "" };
