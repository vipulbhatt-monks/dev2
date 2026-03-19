# beebot-ai

## Overview
This repository contains a Vite + React + TypeScript frontend and two backend components:

- A Node/TypeScript server (`server.ts`) used for the app's "audio mode" backend.
- A Python FastAPI backend in `api/` (runs on port `8000` by default).

## Prerequisites
- Node.js (npm)
- Python 3.10+

## Setup

### 1) Install frontend/server dependencies
From `monks/monks`:

```bash
npm install
```

### 2) Configure environment variables
- Frontend/Node server env file: `monks/monks/.env`
- Python API env template: `monks/monks/api/.env.example` (copy to `monks/monks/api/.env` and fill values)

## Run

### Frontend (Vite)
From `monks/monks`:

```bash
npm run dev
```

### Node/TypeScript server (audio mode backend)
From `monks/monks`:

```bash
npm run server
```

### Python API (FastAPI)
From `monks/monks/api`:

```bash
pip install -r requirements.txt
uvicorn main:app --port 8000
```

## Notes
- The frontend expects the API base URL to be `http://localhost:8000` (see `services/service.ts`).
