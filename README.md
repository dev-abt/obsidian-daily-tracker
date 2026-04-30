# Obsidian Daily Tracker

An Obsidian plugin that parses your daily notes and surfaces patterns in a dashboard — score trends, people interactions, and activity stats.

## How it works

The plugin reads your daily notes and extracts:

- **Score** — any `[[score-N]]` tag (1–10) anywhere in the note
- **People interactions** — entries under a `## People Log` heading, e.g.:
  ```
  0830-0900 Spoke with [[aur]] about his upcoming project
  ```

## Dashboard

Open via the ribbon icon or the command **Daily tracker: Open dashboard**.

Shows:
- Stat cards — days tracked, average score, total interactions, unique people
- Score trend chart (7d / 30d / 90d / all time)
- Top people bar chart
- Recent interactions feed

## Settings

| Setting | Description |
|---|---|
| Daily notes folder | Folder containing your daily notes (`/` for vault root) |
| Date format | Format used in filenames: `YYYY-MM-DD`, `DD-MM-YYYY`, or `MM-DD-YYYY` |

## Development

```bash
npm install
npm run dev   # watch mode
npm run build # production build
```

Copy `main.js`, `manifest.json`, and `styles.css` into your vault's `.obsidian/plugins/daily-tracker/` to test.
