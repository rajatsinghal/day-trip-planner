# Day Trip Planner

Find nearby places where the weather is actually good.

A tiny static web app that shows a map of ~90 curated day-trip destinations around a home point and ranks them by forecast weather for today, tomorrow, and the coming weekend.

Default origin: **Redmond, WA**. Change it by editing `ORIGIN` in [`src/data/destinations.ts`](src/data/destinations.ts) and swapping in your own list of places.

## Features

- **Map + list view.** MapLibre map on the right, destinations ranked best-weather-first on the left. Click a row or a pin to select; the other side follows.
- **Time-window slider.** Pick your trip window (e.g. 10 AM – 4 PM) with a dual-thumb slider. The forecast aggregates only the hours inside the window, so an overnight shower doesn't drag down a bright afternoon. Range 4 AM – 10 PM.
- **Day chips.** Today, tomorrow, and the coming Saturday/Sunday if today is a weekday. After 8 PM, tomorrow is selected by default.
- **"Reasons to visit" filter.** 18 reasons (hike, paddle, wildlife, lake, historic, zoo, picnic, …). Toggle chips to narrow the list; none selected shows all.
- **Hover popover.** Hover a row for a card with the blurb, full weather detail, and every reason labeled.
- **Google Maps link** per destination — one click opens the place in a new tab with directions, reviews, photos.
- **°C / °F toggle.** Also swaps wind units.

## Stack

- Vite + React + TypeScript + Tailwind
- [MapLibre GL](https://maplibre.org/) + free vector tiles from [OpenFreeMap](https://openfreemap.org/)
- [US National Weather Service](https://www.weather.gov/documentation/services-web-api) for forecasts (no API key, CORS-enabled, free, authoritative for US weather)
- Static build — no backend, no auth, no database

## Run it locally

```bash
npm install
npm run dev
```

## Deploy to your own GitHub Pages

1. Fork or push this repo to GitHub.
2. Repo → **Settings → Pages → Source: GitHub Actions**.
3. Push to `main`. The included workflow builds and publishes.
4. The site lives at `https://<you>.github.io/<repo-name>/`.

The Vite `base` path is derived automatically from the repo name during CI.

## Coverage

All destinations are in Washington State because the weather source is the US National Weather Service (US-only). To adapt the app to another country you'd swap the fetcher in [`src/lib/nws.ts`](src/lib/nws.ts) for something like Open-Meteo (global, free, also CORS-enabled) and rebuild the destination list.

## Customize

- **Change origin:** edit `ORIGIN` in `src/data/destinations.ts`.
- **Add / remove destinations:** edit the `DESTINATIONS` array in the same file. Each entry needs `id`, `name`, `lat`, `lon`, `reasons_to_visit`, and a short `blurb`.
- **Edit the reasons taxonomy:** the 18 reasons are the `ReasonsToVisit` type in [`src/data/destinations.ts`](src/data/destinations.ts); the emoji / label map and filter order live in [`src/lib/reasons_to_visit.ts`](src/lib/reasons_to_visit.ts).
- **Tune "good weather":** `scoreWeather` in [`src/lib/weather.ts`](src/lib/weather.ts) takes the aggregated hourly window and weights temperature, rain, wind, and the WMO weather code. Adjust the thresholds or the `weatherCodeBaseScore` table.
- **Drive-time feel:** [`src/lib/geo.ts`](src/lib/geo.ts) uses haversine distance × a winding factor / average speed. Rough estimate, not routed travel time — which is a deliberate choice (no routing API, no API keys).

## Roadmap

- [x] Filter by reason-to-visit
- [x] Time-window slider
- [x] Hover popover with blurb + reasons
- [ ] Dynamic OSM Overpass query for points beyond the curated list
- [ ] "Best day this week for X destination" view
- [ ] Mobile layout polish
- [ ] Optional Open-Meteo fallback for non-US destinations

## License

MIT
