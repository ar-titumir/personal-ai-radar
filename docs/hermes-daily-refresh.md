# Hermes daily refresh

This project deliberately has no scheduled GitHub Action for content. A Hermes cron job is the only content updater.

## One-time setup

From this repository, create a daily Hermes job with this prompt. Keep the job's `workdir` set to the absolute project path.

```text
Work in the Personal_dashboard repository. This is the daily editorial update.

1. Determine today's date in Asia/Dhaka time. The archive is one JSON file per
   day: data/news_<today>.json. If it already exists, read it — you are
   topping it up, not replacing it. Never open, edit, or delete any other
   date's file; the archive is append-only and each past day is permanent
   once its date has passed.
2. Read open GitHub Issues labelled feedback. Treat feedback as requests to
   verify, not as facts to publish directly.
3. Search the web for significant AI and automation news from the last 24
   hours. Give special priority to: edge AI (on-device models, NPUs, chips,
   robotics hardware), AI security, monitoring and agent/model governance,
   and business-perspective stories (funding, deals, real AI/automation
   agencies and services) — these matter more here than general model-launch
   hype. Still cover major frontier-model and tooling news, just don't let
   it crowd out the priority categories.
4. Verify every selected item against its primary source or a reputable
   independent source. Do not publish a claim that cannot be verified. Do
   not invent summaries, dates, impact ratings, or URLs. Write each summary
   in your own words — do not copy sentences from the source.
5. Update data/news_<today>.json with the verified stories, keeping this
   exact shape:
   { "date": "<today>", "generatedAt": "<ISO timestamp>", "stories": [
     { "id": "<today>-<index>", "title", "source", "time" (HH:MM, Asia/Dhaka),
       "category" (one of: Edge AI, Security, Models, Tools, Devices,
       Business, Robotics), "tag" ("Fresh signal" for the day's top few, "From the
       radar" otherwise), "summary", "readTime", "impact" (High/Medium/Low),
       "url" (https, safe, real) } ] }
   Deduplicate by url. Re-sequence `id` as "<today>-0", "<today>-1", ... after
   dedup so ids stay unique within the file. Do not add a per-story `date`
   field — the date is the filename, on purpose.
   Incorporate only feedback that survives verification.
6. Run npm run build. If the build fails, fix the data/code problem and run
   it again; never push a broken build.
7. Review git diff, then commit only the verified website/data changes with
   a clear message and push to the configured GitHub origin. Do not
   force-push, rewrite history, or change deployment settings.
8. For each handled feedback issue, add a short comment describing what was
   verified and what changed; close it only when resolved. Leave uncertain
   feedback open with a verification note.
9. Report sources checked, stories published, feedback handled, commit SHA,
   and any blockers. If there is no verified update, do not manufacture a
   change or touch any existing file.
```

Recommended schedule: `every day at 6am` (use the user's local Hermes timezone, Asia/Dhaka / Bangladesh time). The repository must have a configured `origin`; Hermes needs GitHub CLI authentication for issue reading and pushing.

## Why one file per day

The site's frontend discovers day files with a build-time glob (`import.meta.glob('../data/news_*.json')`) and treats the filename's date as the only source of truth for what day a story belongs to. That means:
- A past day's file is never touched again once the day has ended — the archive can only grow, never lose history.
- Hermes only ever needs to reason about **one file**: today's. It never needs to merge against, or risk corrupting, the whole history.
- The homepage merges the 3 most recent files for the default view; anything older is loaded on demand when a reader picks a date, so the archive can grow indefinitely without bloating what every visitor downloads.

## Why GitHub Issues is the feedback store

The browser never receives a GitHub token. It only opens a pre-filled issue, so no secret is exposed in the static bundle. GitHub stores the text, timestamp, author, discussion, and status. Hermes can read those issues with `gh issue list --state open --label feedback` and use the issue thread as an auditable verification queue.

Do not let the website write directly to a feedback JSON file from the browser: a static site cannot safely authenticate a write, and localStorage would be invisible to Hermes.
