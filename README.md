# Day Trip Planner

Find nearby places where the weather is actually good.

A tiny, static web app that shows a map of curated day-trip destinations around a home point and ranks them by weather for today, tomorrow, and the coming weekend.

Default origin: **Redmond, WA**. Change it by editing `ORIGIN` in [`src/data/destinations.ts`](src/data/destinations.ts) and swapping in your own list of places.

## Stack

- Vite + React + TypeScript + Tailwind
- [MapLibre GL](https://maplibre.org/) + free vector tiles from [OpenFreeMap](https://openfreemap.org/)
- [Open-Meteo](https://open-meteo.com/) for forecasts (no API key, CORS-enabled, free)
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

## Customize

- **Change origin:** edit `ORIGIN` in `src/data/destinations.ts`.
- **Add/remove destinations:** edit the `DESTINATIONS` array in the same file. Each entry needs `name`, `lat`, `lon`, `categories`, and a short `blurb`.
- **Tune "good weather":** `scoreWeather` in `src/lib/weather.ts` weights temperature, rain, wind, and sunshine — adjust the weights or the ideal temperature band.
- **Drive-time feel:** `src/lib/geo.ts` uses a haversine distance with a winding factor. This is a rough estimate, not routed travel time.

## Roadmap

- [ ] Filter by category (lake / beach / park / trail)
- [ ] Dynamic OSM Overpass query for points beyond the curated list
- [ ] "Best day this week for X destination" view
- [ ] Mobile layout polish

## License

MIT
