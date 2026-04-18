# Day Trip Planner

<!-- Badge URLs assume the repo is at github.com/REPLACE_ME/day-trip-planner.
     Swap REPLACE_ME for your GitHub username (or org) after creating the repo. -->
[![Stars](https://img.shields.io/github/stars/REPLACE_ME/day-trip-planner?style=flat-square)](https://github.com/REPLACE_ME/day-trip-planner/stargazers)
[![Contributors](https://img.shields.io/github/contributors/REPLACE_ME/day-trip-planner?style=flat-square)](https://github.com/REPLACE_ME/day-trip-planner/graphs/contributors)
[![License: MIT](https://img.shields.io/github/license/REPLACE_ME/day-trip-planner?style=flat-square)](./LICENSE)

Find nearby places where the weather is actually good.

A static web app that ranks day-trip destinations around a metro area
("hub") by the forecast for today, tomorrow, and the coming weekend.
Pick a trip window (e.g. 10 AM – 4 PM) and the score weighs only the
hours you'd actually be out.

> **Live demo**: TBD — link goes here after the first Cloudflare deploy.

## Features

- **Map + ranked list.** MapLibre map on the right, destinations
  ranked best-weather-first on the left. Click a row or pin to
  select; the other side follows.
- **Area picker.** Switch between hubs (metros) from the header.
  Selection persists via `?hub=…` URL param + localStorage.
- **Time-window slider.** Aggregates the forecast over only the
  hours you'd be out, so an overnight shower doesn't drag down a
  bright afternoon.
- **Day chips.** Today, tomorrow, and the coming Saturday/Sunday if
  today is a weekday. After 8 PM, defaults to tomorrow.
- **18 reason filters.** Hike, paddle, wildlife, lake, historic,
  zoo, picnic, etc. Toggle to narrow the list.
- **Hover popover** with full forecast, blurb, and every reason
  spelled out.
- **Google Maps deep-link** per destination — directions, reviews,
  photos in one click.
- **°C / °F toggle.** Also swaps wind units.

## Add your area

The destination list is split into **hubs**, one per metro area.
Today there's just Seattle. Adding yours is a one-shot agent task:

> Open Claude (or Codex, Grok, Cursor, anything else), point it at
> this repo, and say *"Extend this project to set up for the
> {your area} area."*

The agent will read [`AGENTS.md`](./AGENTS.md), do real web
research for destinations, draft `src/hubs/<your-area>.ts`, run
`npm run validate-hub <your-area>` until it passes, and open a PR.
Review the PR before merging — agentic doesn't mean auto-merge.

The full contributor flow is in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

**One constraint:** hubs must be in the **continental US** for now —
the weather source ([api.weather.gov](https://www.weather.gov/documentation/services-web-api))
is US-only. AGENTS.md §2 spells this out for the agent.

## Stack

- Vite + React + TypeScript + Tailwind
- [MapLibre GL](https://maplibre.org/) + free vector tiles from
  [OpenFreeMap](https://openfreemap.org/)
- [US National Weather Service](https://www.weather.gov/documentation/services-web-api)
  for forecasts (no API key, CORS-enabled, free)
- Static build — no backend, no auth, no database

## Run locally

```bash
npm install
npm run dev
```

Optional: copy `.env.example` to `.env.local` and set `VITE_REPO_URL`
to your repo URL — that's what makes the credit pill render in the
map corner. Without it, the pill is hidden (no broken-link risk).

Other useful scripts:

```bash
npm run typecheck             # tsc -b --noEmit
npm run validate-hub seattle  # validate a hub file (used by the agent loop)
npm run build                 # production build into dist/
```

## Deploy (Cloudflare Pages)

1. Push the repo to GitHub.
2. In the Cloudflare dashboard → Pages → connect the repo.
3. Build command: `npm run build`. Build output directory: `dist`.
4. Add an env var: `VITE_REPO_URL` = your repo URL (so the credit
   pill renders in production).
5. Push to `main`. Cloudflare builds and ships to
   `https://<project>.pages.dev`. PR previews come for free.

If you want a custom domain, Cloudflare's setup is one DNS record.

## License

MIT
