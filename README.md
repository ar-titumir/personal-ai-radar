# Signal / Personal AI Radar

A Vite + React personal intelligence dashboard for a calm daily view of AI, edge devices, automation, security and business opportunities.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Daily refresh

`scripts/refresh-news.mjs` reads public RSS feeds and writes `data/news.json`. GitHub Actions runs it daily at 03:15 UTC via `.github/workflows/daily-news.yml`. The current UI intentionally keeps summaries editorial and local so the app works without an API key; the next production step is adding an LLM summarization job with a secret stored in GitHub Actions.

## Deployment options

Recommended: Vercel connected to GitHub. It provides preview deployments for pull requests, production deploys from `main`, and a clean path to add a serverless summarization function later. GitHub Pages is also suitable for this static first version, but Vercel is the more professional long-term home for the scheduled data pipeline.
