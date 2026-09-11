# Signal / Personal AI Radar

A Vite + React personal intelligence dashboard for a calm daily view of AI, edge devices, automation, security and business opportunities. Built for one reader: a daily brief on the fast-moving AI/automation world, with edge AI, on-device hardware, and AI security & monitoring given deliberate priority over general AI news.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Data architecture: one file per day, forever

Every day's news lives in its own file, **`data/news_YYYY-MM-DD.json`**. A day's file is written once (and topped up through that same day) and is never rewritten once the day has passed — the archive only grows, so nothing gets silently lost the way it did under the old single `data/news.json` file.

```json
{
  "date": "2026-09-10",
  "generatedAt": "2026-09-10T00:30:00.000Z",
  "stories": [
    { "id": "2026-09-10-0", "title": "...", "source": "...", "time": "09:10", "category": "Security", "tag": "Fresh signal", "summary": "...", "readTime": "5 min", "impact": "High", "url": "https://..." }
  ]
}
```

Notes on the schema:
- The date lives **only** in the filename. Stories no longer carry their own `date` field — that duplication is what let the old dataset drift (some ids said one date, the `date` field said another). The frontend attaches the date from the filename when it loads a file.
- `id` only needs to be unique **within its own file** — it's `<date>-<index>`.

The frontend discovers every day file at build time with `import.meta.glob('../data/news_*.json')`. Each day is its own lazy-loaded chunk (see the `dist/assets/news_*.js` files after a build), so browsing into a six-month-old date doesn't bloat the bundle everyone downloads for today.

### What the site shows

- **Default view ("Today")**: the latest 3 day-files, merged, most recent day first. Within a day, **Edge AI and Security** stories float to the top — the standing "special priority" lens from the original brief.
- **Browsing older news**: the date dropdown (or the ‹ › arrows next to it) loads any archived day on demand and shows just that day.
- **Saved**: bookmarks a story for the session across whatever days have been loaded so far (client-side only, no backend).

## Daily refresh

The website is static and does not update itself. **Hermes owns the daily pipeline**: it searches for current stories, verifies them against primary sources, reads feedback issues, writes/updates **today's** `data/news_<date>.json` file only, runs the production build, and pushes the verified commit to GitHub at 6:00am Bangladesh time. See `docs/hermes-daily-refresh.md` for the exact runbook and scheduler setup.

The `scripts/refresh-news.mjs` feed reader remains available as a research helper. It also only ever touches today's file — it reads and re-saves `data/news_<today>.json`, never a previous day's file — but it is not authoritative and is not scheduled by GitHub.

## Feedback without a backend

The **Give feedback** control opens a pre-filled GitHub Issue. Issues are the durable feedback store; label them `feedback`. Hermes reads open feedback issues during its daily verification run, checks each claim, and closes or comments on the issue after handling it. Set `VITE_GITHUB_REPO=owner/repository` when the deployment repo is known.

## Roadmap: the rest of the personal dashboard

The original brief for this project sketched a full personal command center — tasks, current projects, productivity, skills to learn — with the explicit instruction to build the AI-news and business-signal desk **first**. That phasing is preserved deliberately: the **Roadmap** tab in the sidebar lists those sections as honest "coming soon" cards rather than shipping half-working placeholders. Build them next, once the daily brief is solid.

## Deployment options

**Recommended: Vercel connected to GitHub.** Every push to `main` (i.e., every Hermes run) triggers an automatic build and deploy — that's the GitHub-integration + CI/CD requirement satisfied without a custom Actions workflow. It needs no dedicated IP, no machine left running, and stays reachable from anywhere. GitHub Pages is also fine for this static site, but Vercel is the more professional long-term home if a serverless summarization function gets added later.

**Local + Tailscale is a reasonable *preview* path** (checking the site from the Hermes machine itself before/without pushing), but not a good primary deployment: it ties the dashboard's uptime to one machine staying powered on, and anyone else viewing it needs to be on the same tailnet. Keep it as a fallback, not the main deployment.
