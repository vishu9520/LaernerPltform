# 📄 Run Guide, Key Decisions, Limitations & AI Usage Report
**LLD Practice Platform — Assignment Submission File 3 of 3**
**Author:** Vishu Vatsay | **Date:** September 2026

---

## Part A: How to Run the Project

### Prerequisites

| Dependency | Version | Purpose |
|:---|:---|:---|
| **Node.js** | ≥ 18.0.0 | JavaScript runtime |
| **npm** | ≥ 9.0.0 | Package manager |
| **Gemini API Key** | Optional | AI-powered evaluation |

Check your versions:
```bash
node -v    # should show v18.x or higher
npm -v     # should show 9.x or higher
```

---

### Step 1 — Clone the Repository
```bash
git clone https://github.com/vishu9520/LaernerPltform.git
cd LaernerPltform
```

### Step 2 — Install Dependencies
```bash
npm install
```

### Step 3 — (Optional) Configure Gemini API Key
Create a `.env` file in the project root:
```bash
# .env  ← create this file manually (never commit it)
GEMINI_API_KEY=your_gemini_api_key_here
```
> **Without the API key**, the platform works using the built-in heuristic fallback evaluator.
> Scores are rule-based approximations. To get real AI-powered semantic feedback, add the key.

### Step 4 — Start the Backend Server (Terminal 1)
```bash
npm run server
```
Expected output:
```
🚀 LLD Practice Platform Server running on http://localhost:5000
📋 Loaded 4 Curated LLD Practice Problems.
```

### Step 5 — Start the Frontend Dev Server (Terminal 2)
```bash
npm run dev
```
Expected output:
```
  VITE v8.x  ready in ~700ms
  ➜  Local:   http://localhost:5173/
```

### Step 6 — Open the App
Navigate to: **http://localhost:5173**

---

### Production Build (Single Server)
```bash
npm run build    # builds React frontend → dist/
npm start        # Express serves API + frontend from port 5000
# Open: http://localhost:5000
```

---

### Project Structure
```
LaernerPltform/
├── vishu/                              ← ★ Assignment submission folder
│   ├── 01_RESEARCH_NOTE_LEARNER_PROBLEM.md
│   ├── 02_MVP_USER_FLOW_CLASSES_TRADEOFFS.md
│   └── 03_RUN_GUIDE_DECISIONS_AI_REPORT.md  ← this file
│
├── docs/                               ← Full documentation
│   ├── RESEARCH_NOTE.md
│   ├── MVP_SPEC.md
│   └── README.md
│
├── server/                             ← Express API backend
│   ├── server.js                       # Entry point (port 5000)
│   ├── models/                         # Domain models
│   │   ├── Problem.js                  # 4 seeded problems + Rubric
│   │   ├── Attempt.js                  # Attempt lifecycle model
│   │   ├── Submission.js               # Submission + ISubmissionPayload
│   │   ├── Evaluation.js               # Evaluation + state machine
│   │   └── Rubric.js                   # Rubric + RubricDimension
│   ├── evaluators/                     # Evaluation engine
│   │   ├── IEvaluator.js               # Abstract strategy interface
│   │   ├── DeterministicRuleEvaluator.js
│   │   ├── GeminiAiEvaluator.js
│   │   └── CompositeEvaluator.js
│   ├── repositories/
│   │   └── InMemoryStore.js            # In-memory + JSON persistence
│   ├── routes/
│   │   └── api.js                      # REST API routes
│   └── data/
│       └── store.json                  # Auto-generated (gitignored)
│
├── src/                                ← React frontend
│   ├── App.jsx                         # Single-page application
│   ├── index.css                       # Global dark theme styles
│   └── main.jsx                        # React entry point
│
├── index.html                          # Vite HTML entry
├── vite.config.js                      # Vite config (proxy → port 5000)
├── render.yaml                         # Render.com deployment config
├── package.json
├── .gitignore
├── DESIGN.md                           # Full 11-section LLD design doc
└── assignment.pdf                      # Original spec
```

---

### Available npm Scripts

| Script | Command | Description |
|:---|:---|:---|
| `npm run dev` | `vite` | Vite frontend dev server (port 5173) |
| `npm run server` | `node server/server.js` | Express API server (port 5000) |
| `npm run build` | `vite build` | Build production frontend → `dist/` |
| `npm start` | `node server/server.js` | Full-stack production server |

---

### REST API Endpoints

| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/api/problems` | List all 4 curated problems |
| GET | `/api/problems/:id` | Single problem with rubric |
| POST | `/api/attempts` | Start new attempt |
| GET | `/api/attempts/:id` | Get attempt + evaluation |
| GET | `/api/problems/:id/attempts` | All attempts for a problem |
| POST | `/api/attempts/:id/submissions` | Submit design (triggers eval) |
| GET | `/api/evaluations/:id` | Get evaluation + rubric results |
| GET | `/api/analytics/weaknesses` | Longitudinal weakness report |
| GET | `/health` | Health check |

---

## Part B: Key Architectural Decisions

### Decision 1 — Structured Hybrid Submission Format
**Problem:** Unconstrained freeform text makes it impossible to extract evidence for specific rubric dimensions. Pure code blocks ignore the reasoning layer.

**Decision:** Enforce a 4-section structured format (Requirements & Assumptions, Class Design & Contracts, Design Patterns & Trade-offs, Edge Cases & Concurrency).

**Rationale:** This mirrors the structured thinking required in an actual LLD interview. Each section maps directly to one or more rubric dimensions, enabling both deterministic and AI evaluators to reliably locate and extract relevant evidence.

---

### Decision 2 — Hybrid Evaluation Pipeline
**Problem:** Pure AI is expensive, inconsistent (temperature drift), and fails without an API key. Pure deterministic evaluation cannot capture architectural nuance.

**Decision:** `CompositeEvaluator` chains `DeterministicRuleEvaluator` → `GeminiAiEvaluator`.

**Rationale:** Deterministic checks (<50ms) serve as a validation gate — catching structural problems before incurring AI cost. AI handles the nuanced semantic scoring. Heuristic fallback ensures the platform works offline with no API key.

---

### Decision 3 — Strategy + Composite Pattern for Evaluators
**Problem:** New evaluation modes (human review, static analysis, AST linter) must be addable without modifying existing submission or problem code.

**Decision:** `IEvaluator` abstract interface + `CompositeEvaluator` registry pattern.

**Rationale:** Open-Closed Principle satisfied. Adding `HumanReviewEvaluator` requires implementing one class and registering it — zero changes to `Submission`, `Attempt`, `Problem`, or API routes. This is Change Test B from the assignment spec.

---

### Decision 4 — ISubmissionPayload Interface
**Problem:** Tomorrow's platform will support Mermaid-based UML diagram submissions. Storing raw strings in `Submission` would require changes to every evaluator and the submission controller.

**Decision:** `Submission` holds `ISubmissionPayload` reference. `StructuredTextPayload` and `DiagramAstPayload` implement the same interface.

**Rationale:** Open-Closed Principle. Adding diagram support = add one class implementing `ISubmissionPayload`. Zero changes to `Submission`, `Evaluation`, `CompositeEvaluator`, or API routes. This is Change Test A from the assignment spec.

---

### Decision 5 — In-Memory Repository with Clean Interface
**Problem:** External databases add setup friction that kills MVP velocity. But hard-coding storage prevents future scalability.

**Decision:** `InMemoryStore` implements repository methods. Domain models are completely unaware of storage implementation.

**Rationale:** Replacing `InMemoryStore` with `PostgresStore` or `MongoStore` requires changes to exactly one file (`server.js` instantiation line). Domain models, evaluators, and API routes remain unchanged.

---

## Part C: Known Limitations

| # | Limitation | Severity | Mitigation Plan |
|:---|:---|:---|:---|
| 1 | **Single-learner session** — No auth; all data goes to `learner-default` | Medium | Add JWT auth in Phase 2 |
| 2 | **No multi-server support** — InMemoryStore is single-node only | Medium | Swap to PostgresStore with Repository pattern (zero domain changes) |
| 3 | **Ephemeral data on Render free tier** — Disk resets on redeploy | Low-Medium | Use Render Persistent Disk or swap to hosted Postgres |
| 4 | **AI evaluation latency (3–8s)** — UI polls every 2 seconds | Low | Replace polling with WebSocket/SSE push |
| 5 | **No diagram visual editor** — Mermaid is text-only | Low | Phase 2: integrate Mermaid live builder |
| 6 | **No compiled code testing** — Cannot verify if classes work at runtime | Low | Phase 3: sandboxed language executors |
| 7 | **Heuristic fallback scores imprecise** — Rule-of-thumb without Gemini API key | Low | Acceptable for MVP; real AI for production |
| 8 | **No retry exponential backoff** — Evaluation failures don't auto-retry | Low | Add BullMQ job queue in Phase 2 |

---

## Part D: AI Usage Report

This project was developed with AI assistance from **Google Antigravity IDE** (powered by Claude Sonnet 4.6 Thinking). Below is a transparent disclosure of where and how AI was used.

### AI Contributions by Area

| Area | AI Contribution | Human Oversight Applied |
|:---|:---|:---|
| **Architecture design** | Suggested Strategy + Composite evaluator pattern and `ISubmissionPayload` interface | Reviewed alignment with Change Tests A & B in assignment spec |
| **Domain model scaffolding** | Generated initial implementations of `Problem`, `Attempt`, `Submission`, `Evaluation`, `Rubric` | Validated each class against LLD principles; adjusted fields and relationships |
| **Evaluator logic** | Generated `DeterministicRuleEvaluator` rule set and `GeminiAiEvaluator` prompt template | Tested rules against sample submissions; tuned prompt format for consistent JSON output |
| **Repository layer** | Generated `InMemoryStore` with idempotency tracking and JSON persistence | Validated idempotency logic; added weakness analytics method |
| **REST API routes** | Generated Express route handlers for all 8 endpoints | Reviewed error handling and HTTP status code correctness |
| **React frontend** | Generated full single-page application with dark glassmorphism UI, structured editor tabs, and evaluation results panel | Reviewed UX flow, color scheme, and responsive layout |
| **Documentation** | Generated initial drafts of all 3 submission documents | Reviewed for accuracy, completeness, and alignment with assignment rubric |
| **Deployment config** | Generated `render.yaml` and `package.json` deployment settings | Verified build and start commands; tested production build locally |

### What Was NOT AI-Generated

- **Core design decisions and trade-off rationale**: The specific choices — structured text over live compilation, hybrid evaluator over pure AI, ISubmissionPayload interface over raw strings — reflect genuine architectural reasoning applied to the specific problem constraints of this assignment.

- **Selection of the 4 LLD problems**: Chosen to cover maximally distinct design challenges — polymorphism + strategy (Parking Lot), state machine + matching (Ride-Sharing), algorithm selection + memory design (Rate Limiter), behavioral patterns + state (Coffee Machine).

- **The 6 rubric dimensions**: Selected to map directly to the evaluation criteria used in actual LLD interviews at major technology companies (Requirements scope, SRP, Coupling/Cohesion, ISP, OCP, Concurrency).

- **Research gap analysis** (File 1): Based on direct comparison of existing tools (LeetCode, Educative, Pramp, forum-based review) against the specific learning failures identified.

### AI Model Details

| Context | Model |
|:---|:---|
| **Development environment** | Google Antigravity IDE (Claude Sonnet 4.6 Thinking) |
| **API integrated in product** | Google Gemini 1.5 Flash (via `GEMINI_API_KEY` env var) |
| **Gemini API temperature** | 0.1 (low, for consistent structured JSON output) |
| **Prompt strategy** | Strict JSON schema enforcement; mandatory evidence extraction per rubric dimension |

---

*This is File 3 of 3 — Assignment submission for the LLD Practice Platform.*
*Repository: https://github.com/vishu9520/LaernerPltform*
