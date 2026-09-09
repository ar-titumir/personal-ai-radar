# Signal / Personal AI Radar

A Vite + React personal intelligence dashboard for a calm daily view of AI, edge devices, automation, security and business opportunities.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Daily refresh

The website is static and does not update itself. The GitHub Actions refresh workflow was intentionally removed. Hermes owns the daily pipeline: it searches for current stories, verifies them against primary sources, reads feedback issues, appends new stories to the date archive, updates `data/news.json`, runs the production build, and pushes the verified commit to GitHub at 6:00am Bangladesh time. See `docs/hermes-daily-refresh.md` for the exact runbook and scheduler setup.

The `scripts/refresh-news.mjs` feed reader remains available as a research helper, but it is not authoritative and is not scheduled by GitHub.

## Feedback without a backend

The **Give feedback** control opens a pre-filled GitHub Issue. Issues are the durable feedback store; label them `feedback`. Hermes reads open feedback issues during its daily verification run, checks each claim, and closes or comments on the issue after handling it. Set `VITE_GITHUB_REPO=owner/repository` when the deployment repo is known.

## Deployment options

Recommended: Vercel connected to GitHub. It provides preview deployments for pull requests, production deploys from `main`, and a clean path to add a serverless summarization function later. GitHub Pages is also suitable for this static first version, but Vercel is the more professional long-term home for the scheduled data pipeline.
