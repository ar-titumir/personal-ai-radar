# Hermes daily refresh

This project deliberately has no scheduled GitHub Action for content. A Hermes cron job is the only content updater.

## One-time setup

From this repository, create a daily Hermes job with this prompt. Keep the job's `workdir` set to the absolute project path.

```text
Work in the Personal_dashboard repository. This is the daily editorial update.

1. Read the current data/news.json and inspect open GitHub Issues labelled feedback. Treat feedback as requests, not facts.
2. Search the web for significant AI, automation, security, edge-device, model, and business news from the last 24 hours.
3. Verify every selected item with its primary source or a reputable independent source. Do not publish a claim that cannot be verified. Do not invent summaries, dates, impact, or URLs.
4. Update data/news.json with a concise, accurate set of current stories. Preserve the existing JSON schema and safe http(s) URLs. Incorporate only feedback that survives verification.
5. Run npm run build. If the build fails, fix the data/code problem and run it again; never push a broken build.
6. Review git diff, then commit only the verified website/data changes with a clear message and push to the configured GitHub origin. Do not force-push, rewrite history, or change deployment settings.
7. For each handled feedback issue, add a short comment describing what was verified and what changed; close it only when resolved. Leave uncertain feedback open with a verification note.
8. Report sources checked, stories published, feedback handled, commit SHA, and any blockers. If there is no verified update, do not manufacture a change or empty the existing data.
```

Recommended schedule: `every day at 6am` (use the user's local Hermes timezone, Asia/Dhaka / Bangladesh time). The repository must have a configured `origin`; Hermes needs GitHub CLI authentication for issue reading and pushing.

## Why GitHub Issues is the feedback store

The browser never receives a GitHub token. It only opens a pre-filled issue, so no secret is exposed in the static bundle. GitHub stores the text, timestamp, author, discussion, and status. Hermes can read those issues with `gh issue list --state open --label feedback` and use the issue thread as an auditable verification queue.

Do not let the website write directly to `data/feedback.json` from the browser: a static site cannot safely authenticate a write, and localStorage would be invisible to Hermes.