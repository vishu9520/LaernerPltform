# LLD Practice Platform 🎯

> **Deliberate Low-Level Design & Rubric Evaluation Platform**  
> An AI-powered practice environment for mastering Object-Oriented Design through structured submissions, evidence-backed feedback, and longitudinal progress tracking.

![Platform](https://img.shields.io/badge/Status-MVP_Complete-brightgreen)
![Node](https://img.shields.io/badge/Node.js-18%2B-green)
![React](https://img.shields.io/badge/React-19-blue)
![License](https://img.shields.io/badge/License-ISC-yellow)

---

## ✨ Features

- **4 Curated LLD Problems**: Parking Lot, Ride-Sharing Dispatch, Rate Limiter, Coffee Vending Machine
- **Structured Submission Format**: 4-section hybrid editor (Requirements, Class Design, Patterns, Edge Cases)
- **Hybrid Evaluation Engine**: Deterministic rule-checks + Gemini AI semantic scoring
- **6-Dimension Rubric**: Evidence-anchored scoring across all foundational LLD pillars
- **Attempt History & Progress Tracking**: Longitudinal weakness analytics across attempts
- **Works Offline**: Built-in heuristic fallback — no API key required

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/vishu9520/LaernerPltform.git
cd LaernerPltform

# Install
npm install

# (Optional) Add Gemini API key for AI-powered evaluation
echo "GEMINI_API_KEY=your_key_here" > .env

# Terminal 1: Start backend
npm run server

# Terminal 2: Start frontend
npm run dev

# Open http://localhost:5173
```

---

## 📁 Documentation

| Document | Description |
|---|---|
| [docs/RESEARCH_NOTE.md](docs/RESEARCH_NOTE.md) | 1–2 page learner problem analysis & product direction |
| [docs/MVP_SPEC.md](docs/MVP_SPEC.md) | MVP scope, user flow, class design & trade-offs |
| [docs/README.md](docs/README.md) | Full run guide, key decisions, limitations & AI usage report |
| [DESIGN.md](DESIGN.md) | Complete LLD architectural design document (11 sections) |

---

## 🏗 Architecture Overview

```
Client (React + Vite)          Server (Node.js + Express)
      │                               │
      │  POST /api/attempts/*/        │
      │  submissions                  │
      │ ─────────────────────────────►│
      │                               │
      │                    ┌──────────▼──────────┐
      │                    │  CompositeEvaluator  │
      │                    │  ├─ Deterministic    │ <50ms
      │                    │  └─ GeminiAI         │ 3–8s
      │                    └──────────┬──────────┘
      │                               │
      │  GET /api/evaluations/:id     │
      │ ◄─────────────────────────────│
      │  RubricResult[]               │
      │  (score + evidence + concern  │
      │   + suggestion per dimension) │
```

---

## 🛠 Tech Stack

- **Frontend**: React 19, Vite 8, Mermaid.js, Lucide Icons
- **Backend**: Node.js 18+, Express 5
- **AI Evaluation**: Google Gemini 1.5 Flash (via `GEMINI_API_KEY`)
- **Persistence**: In-memory store + JSON file backup
- **Styling**: Custom CSS (dark theme, glassmorphism)

---

## 📋 npm Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `vite` | Start Vite frontend dev server (port 5173) |
| `npm run server` | `node server/server.js` | Start Express API server (port 5000) |
| `npm run build` | `vite build` | Build production frontend bundle |
| `npm start` | `node server/server.js` | Serve full stack from built frontend |

---

*Built as part of the LLD Practice Platform assignment.*
