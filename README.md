# Intuish

A static web app (no server, no account). Progress is saved in the browser's localStorage.

- `index.html`: the four screens (Home, ready screen, Remember, Study Screen)
- `css/styles.css`: the prototype's look; `css/app.css`: additions for the real app
- `js/content.js`: subjects, lessons (YouTube video ids) and practice questions. Add lessons here.
- `js/art.js`: the colored subject illustrations
- `js/app.js`: everything else (routing, YouTube player, practice, mastery, Remember)

Run it locally: `python3 -m http.server` in this folder, then open http://localhost:8000.
YouTube only plays when served from http(s), not from a file:// page.

Hosted with GitHub Pages by `.github/workflows/pages.yml`: the website (landing/index.html, built from landing/index.src.html by `python3 landing/build.py`) is the front page and the app is at /app/. In the repo's Settings → Pages, set Source to "GitHub Actions".
