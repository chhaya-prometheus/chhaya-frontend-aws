# Chhaya Frontend AWS

Chhaya is a web application for prioritizing urban tree planting decisions using a geospatial, data-driven map interface. The project helps city planners, analysts, and decision-makers identify where tree cover can deliver the greatest local cooling and public health benefit by combining environmental and demographic indicators into a single priority score.

This repository contains the frontend application for the Chhaya platform. The frontend consumes a backend API and renders a map-based dashboard with city switching, hex-cell prioritization, planting planning, and score explanations.

## Why this project exists

Cities often have limited budgets for greening interventions. Chhaya translates that challenge into a practical planning tool:

- It ranks locations by urgency for planting based on a blended score
- It highlights areas where heat stress, low greenery, and dense population overlap
- It allows users to test canopy scenarios and estimate cooling impact
- It surfaces neighborhood-level context for evidence-informed decision making

The result is a decision-support frontend for urban tree canopy planning and climate adaptation.

## Key features

- City selector with URL-based state persistence
- Interactive hex-grid map with prioritized planting scores
- Search and filtering for wards or administrative regions
- Layer switching for priority, heat, greenery, population, and dust indicators
- Clickable map cells that reveal local metrics and factors
- Planting planner to estimate cooling and people reached per hectares
- Top-priority rankings for cells and wards
- Link sharing for selected places
- Responsive design for desktop and mobile devices
- Mock-data mode for offline or local UI development

## Architecture overview

The frontend is intentionally simple and modular. It presents a single-page React application that talks to a backend via relative API routes, making it suitable for deployment behind a reverse proxy like Caddy.

```text
Browser
  │
  ▼
Caddy / Reverse Proxy
  ├── /api/*  ─────────────► Backend service (FastAPI or equivalent)
  └── /*  ────────────────► Static build output from Vite
```

This design avoids CORS issues and removes the need to hardcode a base API URL during deployment.

## Tech stack

- React 19
- Vite
- MapLibre GL
- Tailwind CSS
- Oxlint
- JavaScript (ES modules)
- Docker support for deployment

## Repository structure

```text
chhaya-frontend-aws/
├── .github/
├── .vscode/
├── .gitignore
├── Readme.md
├── LICENSE
├── web/
│   ├── .dockerignore
│   ├── .env.example
│   ├── .env.production
│   ├── .oxlintrc.json
│   ├── Dockerfile
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── public/
│   │   └── mock/
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── ControlPanel.jsx
│       │   ├── DetailPanel.jsx
│       │   ├── Footer.jsx
│       │   ├── Legend.jsx
│       │   ├── MapView.jsx
│       │   ├── PlannerPanel.jsx
│       │   ├── ScoreInfo.jsx
│       │   ├── SidePanel.jsx
│       │   ├── TopList.jsx
│       │   ├── WardPanel.jsx
│       │   └── CopyLink.jsx
│       └── lib/
│           ├── api.js
│           ├── format.js
│           ├── palette.js
│           └── wards.js
└── LICENSE
```

## Prerequisites

Before you start, ensure you have the following installed:

- Node.js 20.19 or later
- npm
- A browser for local development
- Access to a compatible backend API if not using mock mode

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/AdityaSinghEz/chhaya-frontend-aws.git
cd chhaya-frontend-aws
```

### 2. Install dependencies

```bash
cd web
npm install
```

### 3. Start the development server

```bash
npm run dev
```

This starts the Vite development server and enables the frontend for local development.

### 4. Configure environment variables

The project includes an example environment file:

```bash
cp .env.example .env
```

Then edit `.env` if needed. The app can also run in mock mode for local UI exploration without a backend.

## Environment variables

The frontend uses Vite environment variables prefixed with `VITE_`.

| Variable | Example | Description |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | Base URL for the backend API |
| `VITE_USE_MOCK` | `true` | Enables mock data mode for browser-only local development |

The default production config sets the API to `/api`, which works well behind a proxy layer.

## Mock mode

Mock mode is useful for UI testing or development when the backend is not available.

```bash
cp .env.example .env
```

Then enable the mock option in the local environment configuration. The app reads mock city and cell data from the `public/mock` folder so that the interface can be developed offline.

## Available scripts

From the `web` directory:

```bash
npm run dev      # Start the Vite dev server
npm run build    # Build the production bundle
npm run preview  # Preview the production build locally
npm run lint     # Run lint checks with Oxlint
```

## Production build

```bash
cd web
npm run build
```

The generated static bundle is suitable for serving through a CDN or a server-side reverse proxy.

## Docker deployment

The repository includes a Dockerfile for the frontend app.

```bash
docker build -t chhaya-web web
```

This build compiles the static frontend and serves it from a lightweight Caddy-based web server.

## API interaction model

The frontend communicates with the backend through a small API layer in `web/src/lib/api.js`.

Typical endpoints include:

- `GET /cities` — return city metadata and map configuration
- `GET /cities/<slug>/cells` — fetch the hex-grid geometry and scoring data
- `GET /cities/<slug>/status` — return refresh or data health status
- `POST /cities/<slug>/whatif` — estimate cooling impact for a canopy scenario
- `GET /cities/<slug>/top` — get the highest-priority cells or wards
- `POST /cities/<slug>/plan` — compute a planting plan for a given area
- `GET /cities/<slug>/wards/<ward_id>/brief` — get a neighborhood summary

The frontend is designed to call relative URLs like `/api/...`, which makes the deployment configuration cleaner and avoids cross-origin issues.

## Data and model caveats

The app presents a scoring model for prioritizing interventions and should be interpreted as a decision-support tool rather than a precise direct measurement of urban performance.

Important considerations:

- Scores are derived from environmental and demographic proxy data
- Model outputs are best used for comparison and prioritization, not absolute truth
- Real and synthetic datasets are handled separately, with demo data clearly labeled
- The UI is designed to explain the factors behind each score so users can evaluate assumptions

## Contributing

Contributions are welcome. If you want to improve the app:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run lint and build checks
5. Submit a pull request with a clear explanation of the improvement

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Author

Project maintainer: Aditya Singh

- GitHub: https://github.com/AdityaSinghEz
- Repository: https://github.com/AdityaSinghEz/chhaya-frontend-aws

## Notes

This repository focuses on the frontend layer for Chhaya. To run the full application end-to-end, you will typically pair it with the corresponding backend service that exposes the `/api` endpoints used by the UI.

If you are deploying this in production, make sure the reverse proxy or hosting environment routes backend requests correctly and exposes the static frontend build without breaking the relative API paths.
