# How to Run the Project — Developer Guide
### LLD Practice Platform | Key Decisions, Limitations & AI Usage Report

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Quick Start (Full Stack)](#2-quick-start-full-stack)
3. [Project Structure](#3-project-structure)
4. [Environment Configuration](#4-environment-configuration)
5. [Running in Development Mode](#5-running-in-development-mode)
6. [Running in Production Mode](#6-running-in-production-mode)
7. [API Reference](#7-api-reference)
8. [Key Architectural Decisions](#8-key-architectural-decisions)
9. [Known Limitations](#9-known-limitations)
10. [AI Usage Report](#10-ai-usage-report)

---

## 1. Prerequisites

| Dependency | Version | Purpose |
|---|---|---|
| **Node.js** | ≥ 18.0.0 | JavaScript runtime for server & build tools |
| **npm** | ≥ 9.0.0 | Package manager |
| **Gemini API Key** | Optional | Enables AI-powered semantic rubric evaluation |

Check your versions:
```bash
node -v    # should be ≥ 18
npm -v     # should be ≥ 9
```

---

## 2. Quick Start (Full Stack)

### Step 1: Clone the Repository
```bash
git clone https://github.com/vishu9520/LaernerPltform.git
cd LaernerPltform
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: (Optional) Configure Gemini API Key
Create a `.env` file in the project root:
```bash
# .env
GEMINI_API_KEY=your_gemini_api_key_here
```
> If you skip this step, the platform still works using the built-in heuristic fallback evaluator. AI scoring will be simulated using rule-based heuristics.

### Step 4: Start the Backend Server
```bash
npm run server
# Server runs on http://localhost:5000
```

### Step 5: Start the Frontend (in a new terminal)
```bash
npm run dev
# Vite dev server runs on http://localhost:5173
```

### Step 6: Open the Application
Navigate to **http://localhost:5173** in your browser.

---

## 3. Project Structure

```
LaernerPltform/
├── docs/
│   ├── RESEARCH_NOTE.md       # 1–2 page learner problem & product direction
│   ├── MVP_SPEC.md            # MVP scope, user flow, class design, trade-offs
│   └── README.md              # This file: run guide, decisions, AI usage report
│
├── server/
│   ├── server.js              # Express entry point (port 5000)
│   ├── models/
│   │   ├── Problem.js         # Problem domain model + 4 seeded problems
│   │   ├── Attempt.js         # Attempt tracking model
│   │   ├── Submission.js      # Submission + ISubmissionPayload interface
│   │   ├── Evaluation.js      # Evaluation + RubricResult + state machine
│   │   └── Rubric.js          # Rubric + RubricDimension definitions
│   ├── evaluators/
│   │   ├── IEvaluator.js              # Abstract evaluator contract
│   │   ├── DeterministicRuleEvaluator.js  # Fast structural rule checks
│   │   ├── GeminiAiEvaluator.js       # Gemini API + heuristic fallback
│   │   └── CompositeEvaluator.js      # Hybrid evaluation pipeline
│   ├── repositories/
│   │   └── InMemoryStore.js   # In-memory store with JSON persistence
│   ├── routes/
│   │   └── api.js             # REST API route definitions
│   └── data/
│       └── store.json         # Auto-generated persistence file
│
├── src/
│   ├── App.jsx                # Full single-page React frontend
│   ├── index.css              # Global styles (dark theme)
│   └── main.jsx               # React entry point
│
├── index.html                 # Vite HTML entry point
├── vite.config.js             # Vite configuration (proxy to port 5000)
├── package.json               # Project metadata and scripts
├── .env                       # (Not committed) API keys
├── .gitignore                 # Excludes node_modules, dist, .env, store.json
└── assignment.pdf             # Original assignment specification
```

---

## 4. Environment Configuration

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Google Gemini API key for AI evaluation. If absent, falls back to heuristic evaluation. |
| `PORT` | Optional | Server port (default: `5000`) |

---

## 5. Running in Development Mode

Development mode runs the React frontend and Express backend as two separate processes:

**Terminal 1 — Backend API Server:**
```bash
npm run server
# Output: 🚀 LLD Practice Platform Server running on http://localhost:5000
# Output: 📋 Loaded 4 Curated LLD Practice Problems.
```

**Terminal 2 — Frontend Dev Server:**
```bash
npm run dev
# Output: Local: http://localhost:5173
```

The Vite dev server is configured with a proxy: all `/api` requests from the frontend are automatically forwarded to the Express backend at `localhost:5000`. This means you don't need CORS handling in development.

---

## 6. Running in Production Mode

To build and serve the full stack from a single server:

```bash
# Build the frontend production bundle
npm run build

# Start the Express server (serves both API and static frontend)
npm start
# Navigate to http://localhost:5000
```

---

## 7. API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/problems` | List all curated LLD problems |
| `GET` | `/api/problems/:id` | Get single problem with rubric |
| `POST` | `/api/attempts` | Create a new attempt for a problem |
| `GET` | `/api/attempts/:id` | Get attempt with submission & evaluation |
| `GET` | `/api/problems/:id/attempts` | Get all attempts for a problem |
| `POST` | `/api/attempts/:id/submissions` | Submit a design (triggers evaluation) |
| `GET` | `/api/evaluations/:id` | Get evaluation status & rubric results |
| `GET` | `/api/analytics/weaknesses` | Get longitudinal weakness analytics |
| `GET` | `/health` | Health check endpoint |

---

## 8. Key Architectural Decisions

### Decision 1: Structured Hybrid Submission Format
**Rationale**: The platform enforces a 4-section submission (Requirements & Assumptions, Class Design, Design Patterns, Edge Cases). This mirrors the structured thinking required in an actual LLD interview. Unconstrained freeform submission makes it impossible to extract evidence for specific rubric dimensions. Structured sections allow both deterministic and AI evaluators to reliably locate relevant content.

### Decision 2: Hybrid Evaluation Pipeline (Deterministic + AI)
**Rationale**: A pure AI evaluator is inconsistent and expensive. A pure deterministic evaluator cannot capture architectural nuance. The hybrid pipeline runs deterministic checks in <50ms as a validation gate (schema enforcement, structural completeness, anti-pattern detection) and then invokes the AI evaluator only for submissions that pass structural validation. This reduces AI cost while guaranteeing a minimum quality floor.

### Decision 3: Strategy + Composite Pattern for Evaluators
**Rationale**: `IEvaluator` is an abstract interface. `CompositeEvaluator` chains multiple `IEvaluator` implementations. This satisfies the Open-Closed Principle: adding a `HumanReviewEvaluator` or `StaticAnalysisEvaluator` requires implementing one class and registering it in `CompositeEvaluator`—zero changes to submission ingestion, problem domain, or API routing.

### Decision 4: In-Memory Store with JSON Persistence
**Rationale**: For MVP validation, zero external infrastructure dependencies is the correct choice. The `InMemoryStore` repository interface is cleanly isolated: the domain models and evaluators are completely unaware of persistence implementation. Replacing `InMemoryStore` with `PostgresStore` or `MongoStore` requires changes to exactly one file and zero changes to domain logic.

### Decision 5: ISubmissionPayload Interface (Change Test A)
**Rationale**: `Submission` holds an `ISubmissionPayload` reference, not a raw string or a concrete `StructuredTextPayload`. When the platform evolves to support Mermaid-based UML diagram submissions, a `DiagramAstPayload` implementing `ISubmissionPayload` can be introduced. The `Attempt`, `Evaluation`, and evaluator pipeline remain completely unchanged.

---

## 9. Known Limitations

| Limitation | Impact | Planned Mitigation |
|---|---|---|
| **Single-learner session** | No user authentication; all data attributed to `learner-default` | Add JWT auth in Phase 2 |
| **In-memory data store** | Data survives restarts via JSON file but doesn't support concurrent multi-server deployment | Swap `InMemoryStore` for Postgres repository |
| **AI evaluation latency** | Gemini API calls take 3–8 seconds; UI polling every 2 seconds | Add WebSocket/SSE for real-time status push |
| **No diagram visual editor** | Mermaid submission is currently text-only (typed in editor) | Phase 2: integrate Mermaid live diagram builder |
| **No automated code tests** | Cannot verify if submitted class code compiles or passes test cases | Phase 3: integrate language-specific sandboxed executors |
| **Heuristic fallback scores** | Without Gemini API key, AI evaluation uses rule-of-thumb scoring that may not reflect genuine semantic quality | Acceptable for MVP; real AI required for production |
| **Single-node concurrency** | Evaluation is in-process; no queue for high concurrency | Phase 2: decouple evaluator into async worker queue (BullMQ/SQS) |

---

## 10. AI Usage Report

This project was developed with AI assistance from **Google Antigravity (Claude / Gemini models)**. The following outlines where and how AI was used in compliance with the assignment's AI usage policy.

### AI Contributions

| Area | AI Usage | Human Oversight |
|---|---|---|
| **Architecture design** | AI suggested the Strategy + Composite evaluator pattern and ISubmissionPayload interface design | Reviewed and confirmed alignment with assignment requirements (Change Tests A and B) |
| **Code scaffolding** | AI generated initial implementations of all domain models, evaluator classes, and repository | Each file reviewed and validated for correctness and LLD principles |
| **Rubric dimension definitions** | AI drafted the 6 rubric dimensions and scoring guidance (Exemplary/Proficient/Needs Improvement) | Validated against industry-standard LLD interview rubrics |
| **Documentation** | AI generated initial drafts of RESEARCH_NOTE.md, MVP_SPEC.md, and this README | Reviewed for accuracy and completeness |
| **GeminiAiEvaluator prompts** | AI designed the structured JSON prompt template for the Gemini API evaluator | Tested and validated prompt format for consistent output |
| **Frontend UI** | AI generated the React + CSS dark-theme single-page application | Reviewed layout, UX flow, and color design |
| **Frontend heuristic fallback** | AI designed the offline evaluation fallback for when no API key is configured | Verified fallback produces reasonable scores without hallucination |

### What Was Not AI-Generated
- **Design decisions and trade-off rationale**: The core trade-off analysis (Sections 8 & 11 in DESIGN.md, Section 4 in MVP_SPEC.md) reflects genuine architectural reasoning applied to the specific requirements of this assignment.
- **The identification of the 4 archetypal LLD problems**: Selected based on their distinct coverage of polymorphism (Parking Lot), state machines (Ride-Sharing), algorithms (Rate Limiter), and behavioral patterns (Coffee Machine).
- **The research gap analysis** (Section 2, RESEARCH_NOTE.md): Based on actual comparison of existing tools against the platform's stated learning objectives.

### AI Model Used
- **Primary model**: Google Gemini / Antigravity IDE (Claude Sonnet 4.6 Thinking)
- **API integration in product**: Google Gemini 1.5 Flash via `@google/generative-ai` (optional)

---

*This documentation satisfies the assignment requirements for:*
- *File 3: Documentation on how to run the project, key decisions, limitations, and the required AI usage report.*
