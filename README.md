# Turf — Turf Cricket Scoring

Score turf cricket on your phone or laptop.

## Repo layout

- `Client/` — React (Vite) front end: match list, live scoring, leaderboard, team management.
- `Server/` — Express + MongoDB API with socket-based live scoring.

## Getting started

### Server

```sh
cd Server
cp .env.example .env   # configure MongoDB URI, JWT secrets, SMTP
npm install
npm run dev
```

### Client

```sh
cd Client
npm install
npm run dev
```

`Client/.env` defaults to the API at `http://localhost:5000/api/v1`.