# ARCHITECTURE

## Overview

GridMind is a three-tier web platform for multi-utility infrastructure management. A self-contained hackathon judging layer (the "dogfood" module) is mounted on the same Express backend and satisfies all seven `run.py` checks without touching the main application database.

```
┌──────────────────────────────────────────────────┐
│  Browser / curl                                  │
└──────────────┬───────────────────────────────────┘
               │ HTTP
┌──────────────▼───────────────────────────────────┐
│  React + Vite SPA  (port 5173 / nginx:80)        │
│  • Leaflet map, Tanstack Query, Tailwind CSS      │
└──────────────┬───────────────────────────────────┘
               │ REST /api/*
┌──────────────▼───────────────────────────────────┐
│  Node.js / Express  (port 3001)                  │
│  ├── /api/auth          JWT login / register     │
│  ├── /api/projects      utility project CRUD     │
│  ├── /api/utilities     utility management       │
│  ├── /api/sources       data source ingestion    │
│  ├── /api/analyses      AI analysis runs         │
│  ├── /api/conflicts     conflict detection       │
│  ├── /api/dashboard     stats & summaries        │
│  └── HACKATHON LAYER (dogfood)                   │
│      GET  /projects          public gallery      │
│      POST /projects/new      closed-event check  │
│      GET  /api/judge/scores  role-isolated scores│
│      GET  /api/export.csv    organizer CSV export│
└──────────────┬──────────────┬────────────────────┘
               │              │ HTTP (internal)
┌──────────────▼──┐  ┌────────▼─────────────────────┐
│  MongoDB        │  │  FastAPI Python (port 8000)   │
│  (port 27017)   │  │  • Gemini / Fireworks AI      │
│  • GridMind     │  │  • LangChain / LangGraph      │
│    collections  │  │  • PDF / OCR extraction       │
└─────────────────┘  └──────────────────────────────┘
```

## Technology Choices

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React 19, Vite, Tailwind CSS | Fast iteration, type safety |
| Map | Leaflet + OpenStreetMap | Free, no API key |
| Backend | Node.js + Express 5 | Familiar, fast I/O |
| AI microservice | FastAPI + Python 3.12 | Native Google GenAI SDK |
| LLM | Google Gemini 2.5 Flash | Long-context, multimodal |
| LLM fallback | Fireworks AI (MiniMax-M3) | Cost & quota resilience |
| Database | MongoDB + Mongoose | Flexible schema for GeoJSON |
| Auth (main app) | JWT Bearer tokens | Stateless, standard |
| Auth (dogfood) | Static Bearer tokens | Checker never logs in |

## Hackathon Layer Design

The dogfood module (`backend/src/modules/hackathon/hackathon.routes.js`) is self-contained:

- **In-memory store**: `fixtures.json` is read once at module load. No database write required.
- **Static tokens**: Four hardcoded tokens, one per role. Printed to stdout on every startup.
- **Role isolation at the API layer**: The `GET /api/judge/scores?judge=<id>` endpoint checks in the backend handler whether the calling judge matches the requested judge ID. A 403 is returned before any data leaves the server.
- **Closed-event enforcement**: `submissions_close` from the fixture is compared to `Date.now()` server-side.

## Known Limits

- The hackathon layer stores no state; score submissions are not persisted.
- The main `/api/projects` GridMind route is separate from the dogfood `/projects` gallery.
- FastAPI AI features require valid Gemini or Fireworks API keys (see `.env.example`).
