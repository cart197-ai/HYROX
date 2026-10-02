# Hyrox Trainer — installable web app

A self-contained progressive web app: the 12-week Hyrox plan, dated onto a calendar,
with set-by-set logging. No build step, no framework, no server code. Drop the folder
on any static host and it installs to a phone home screen and runs offline.

```
index.html              the whole app — markup, styles, plan data, logic
manifest.webmanifest    name, icons, colours, standalone display
sw.js                   service worker: offline app shell + font cache
icon-192.png            icons, deliberately at the root rather than in a
icon-512.png            subfolder, so every file can be uploaded in one
icon-maskable-512.png   flat batch from a phone
favicon-64.png
```

FLAT LAYOUT: this build keeps every file at the top level. It is identical to
the foldered build otherwise. The flat shape exists so the whole site can be
uploaded through GitHub's mobile web uploader, which cannot create folders.

## Deploy

It is a static folder. Any of these work, all on a free tier:

**Netlify (easiest)** — go to app.netlify.com, sign in, and drag this folder onto the
"deploy" drop zone. You get a URL in about ten seconds. To update later, drag the
folder again.

**Cloudflare Pages** — create a project, choose "Direct Upload", upload the folder.

**Vercel** — `npx vercel` in this directory, or drag-and-drop in the dashboard.

**GitHub Pages** — push the folder to a repo, then Settings → Pages → deploy from
branch root.

Two requirements, both of which the hosts above meet by default: the site must be
served over **HTTPS**, and `sw.js` must sit at the **same level as `index.html`**
(the service worker can only control files at or below its own path).

If you serve it from a subfolder rather than a domain root, everything already uses
relative paths, so it will work as-is.

## Install on your phone

- **iPhone** — open the URL in **Safari** (not Chrome), tap Share, then
  **Add to Home Screen**. Safari is the only iOS browser that can install a PWA.
- **Android** — open in Chrome; either use the install prompt that appears on the
  Setup tab, or the menu → **Add to Home screen**.

Once installed it launches full-screen with no browser chrome, and works with no
signal — useful in a gym basement.

## Your data

Everything you log is stored in the browser's `localStorage`, on that device only.
Nothing is sent anywhere; there is no account and no backend.

That has one consequence worth knowing: **clearing the browser's site data deletes
your log**. The Setup tab has **Export backup** and **Import backup** — a small JSON
file holding your plan config and every set you have logged. Export before changing
phones or clearing data.

## Changing the plan

The plan lives in the first `<script>` block of `index.html` and is deliberately
built in three layers:

- `TEMPLATES` — what each session type contains, with no dates
- the `weeks` array on every exercise — that exercise's prescription for each of the
  12 weeks, written as `"setsxreps|target"` (e.g. `"4x6|RPE 7.5"`)
- `CFG` — the single start date and the four training weekdays

Everything dated is derived by `rebuild()` from `CFG`, which is why the Setup tab can
re-date the whole block without touching a single session. To change a progression,
edit that exercise's 12-entry array. To add an exercise, add an `E(...)` line to the
relevant template. To change the plan's shape entirely, `D4` holds the Day 4 sessions
written out per week.

## Updating a deployed copy

The service worker caches aggressively, so after editing `index.html`, bump the
version at the top of `sw.js`:

```js
const CACHE = 'hyrox-v2';   // was v1
```

Otherwise phones keep serving the cached copy.

## The Plan calendar

The Plan tab opens on a 12-week grid: weekdays across, weeks down, one cell per day.

| Colour | Meaning |
| --- | --- |
| Violet | Planned, nothing logged |
| Amber  | Started but under 80% of sets ticked |
| Green  | 80% or more of sets ticked |
| Grey   | Rest day |

Each session row under a week carries the same three colours as a solid square:
violet not started, amber part done, green done. A past date still showing violet is dimmed, so a missed session reads differently
from one still ahead. Today's cell carries a ring. Tapping a cell opens that session.

Under the grid every week is a collapsible row showing its phase and completion
percentage; tapping one expands its four sessions, and tapping a week number in the
grid's left margin jumps to it. The 80% threshold is one line in `calState()`.

## Rest timer and sound

Ticking a set starts a countdown. Each exercise has its own rest time, editable from
its card mid-workout (the value sticks as that exercise's default everywhere). The
Setup tab has master toggles for the timer, sound, vibration and keeping the screen
awake, plus a "Test the sound" button.

The beep is generated with the Web Audio API — no audio file, works offline, and it
is scheduled on the audio clock rather than a `setTimeout`, so it stays accurate even
when the browser throttles JavaScript timers.

Two platform facts worth knowing:

- **Audio needs a tap first.** iOS will not let a page make noise until the user has
  interacted with it. Tapping **Start workout** unlocks it, which is why the app
  creates the AudioContext there.
- **A locked screen kills it.** If the phone sleeps or you switch apps, iOS suspends
  the page and no beep fires. The Screen Wake Lock API is used to hold the screen on
  while a workout is running, which covers the common case. For a beep that survives
  a locked screen you would need push notifications from the service worker — that
  works on Android, and on iOS only for an installed PWA on 16.4+, and it needs
  notification permission.

## Known limits

- No exercise images, charts, or Garmin/Strava sync.
- The plan cannot be edited from inside the app — only re-dated.
- One device at a time; syncing between devices means export/import.
