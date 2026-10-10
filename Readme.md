# Chhaya: where should Delhi plant trees first?

Chhaya (छाया, "shade") is a map of Delhi split into hexagonal cells, coloured by how urgently each one needs trees. Click a cell to see the numbers behind its score, search a ward, switch the colour layer, or plan where a given amount of planting land would do the most good.

> **Honest claims.** The priority score is a proxy built from satellite and census data, not a measurement. Trees cool the surface; they do not clean the air. Every what-if figure is a model estimate.

<!-- Add a screenshot: save it as docs/screenshot.png and uncomment the next line.
![Chhaya screenshot](docs/screenshot.png)
-->

## What you can do

- See all of Delhi coloured by planting priority, with a legend
- Click a hexagon for temperature, greenery, built-up share, dust, people and schools
- Search a ward or area; its hexagons are outlined and a ward summary opens
- Colour the map by priority, heat, greenery, people or dust
- Slide a canopy size to see an estimated cooling and the people it would help
- See the 10 most urgent hexagons or wards and jump to them
- Enter hectares in the planner to highlight where to plant
- Open a "How is this scored?" popover, and copy a link to any selected place
- Works on phones: details open as a bottom sheet

## Architecture

One domain, one server. Caddy splits by path:

```
browser ──► Caddy ──┬─ /api/*  ──► FastAPI (prefix stripped)
                    └─ everything else ──► static build (web/dist)
```

The frontend only uses relative URLs such as `fetch("/api/cells")`, so there is no CORS and no base URL to configure in production.

## Tech stack

React 19, Vite, MapLibre GL, Tailwind CSS, Oxlint.

## Project structure

```
web/
├── Dockerfile                 Node 22 build, then caddy:2 serves /srv
├── .env.production            VITE_API_URL=/api
├── .env.example               variables for local development
├── index.html
├── vite.config.js             dev proxy for /api, drops the mock from builds
├── public/mock/cells.geojson  offline sample data
└── src/
    ├── App.jsx
    ├── components/
    │   ├── MapView.jsx        map, colour layers, ward outline, planner highlight
    │   ├── ControlPanel.jsx   title, ward search, layers / top 10 / plan tabs
    │   ├── DetailPanel.jsx    selected hexagon + what-if
    │   ├── WardPanel.jsx      ward summary, ranking, AI brief
    │   ├── TopList.jsx        10 most urgent hexagons or wards
    │   ├── PlannerPanel.jsx   hectares planner
    │   ├── Legend.jsx, ScoreInfo.jsx, SidePanel.jsx, CopyLink.jsx
    └── lib/
        ├── api.js             all backend calls, timeouts, fallbacks, API contract
        ├── palette.js         colour layers and scales
        ├── wards.js           ward index, search, ranking
        └── format.js          null-safe formatting
```

## Getting started

Requires **Node 20.19+ or 22** and npm.

```bash
git clone https://github.com/AdityaSinghEz/chhaya-frontend-aws.git
cd chhaya-frontend/web
npm install
npm run dev
```

`npm run dev` proxies `/api` to the deployed backend. To work fully offline on the sample data:

```bash
cp .env.example .env     # then uncomment VITE_USE_MOCK=true
```

The sample data has no ward names, so ward search, the ward panel and the ward top list stay disabled in mock mode. They work as soon as `/api/cells` returns a `ward` value on each cell.

### Scripts

```bash
npm run dev       # dev server
npm run build     # production build into web/dist
npm run preview   # preview the build
npm run lint      # Oxlint
```

### Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | API base path. `.env.production` sets it to `/api`. |
| `VITE_USE_MOCK` | unset | `true` reads `public/mock/cells.geojson` and computes everything in the browser. Production builds never use the mock unless this is set. |

Only public values belong here: anything starting with `VITE_` is bundled into the browser build.

## Deploying

```bash
docker build -t chhaya-web web
```

The image builds the app and serves `dist` with Caddy from `/srv`. The site Caddyfile on the server must route `/api/*` to FastAPI and add `encode zstd gzip` (the `/api/cells` payload is over 1 MB).

## API contract

Defined at the top of [`web/src/lib/api.js`](web/src/lib/api.js). Only `/cells` is required; every other endpoint falls back to a browser-side estimate if it fails, so a missing endpoint never breaks the app.

| Endpoint | Used for |
| --- | --- |
| `GET /cells` | the map (GeoJSON) |
| `GET /status` | "Data updated" badge |
| `POST /whatif` | canopy what-if |
| `GET /top?level=cell\|ward&n=10` | top-10 list |
| `POST /plan` | planting planner |
| `GET /wards/{id}/brief` | AI-generated ward brief |

## Author

Made by [Aditya Singh](https://github.com/AdityaSinghEz).
