# MVP Specification: User Flow, Class Design & Trade-offs
### LLD Practice Platform — Technical MVP Document

---

## 1. MVP Scope Definition

The Minimum Viable Product proves one complete, end-to-end learning loop:

> **Problem → Structured Submission → Rubric Evaluation → Evidence-Backed Feedback → Attempt History**

### What's In Scope (MVP)
- 4 curated LLD problems (Parking Lot, Ride-Sharing Dispatch, Rate Limiter, Coffee Vending Machine)
- Structured 4-section hybrid submission format
- Composite evaluator: deterministic rule-checks + AI semantic scoring (Gemini API / heuristic fallback)
- 6-dimension rubric with evidence-anchored feedback per criterion
- Attempt history and longitudinal dimension score tracking
- Single-learner session (no multi-user auth for MVP)
- In-memory persistence with JSON file backup (no external database)

### What's Out of Scope (MVP)
- User authentication & multi-user accounts
- Real-time collaborative design sessions
- Live class diagram visual builder (UML canvas)
- Automated test case execution against learner code
- Peer review / human-in-the-loop evaluation workflows
- Mobile-responsive native app

---

## 2. User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Problem Selection                                       │
│  Learner browses 4 curated problems → selects "Parking Lot"     │
│  Views: Problem description, constraints, NFRs, rubric criteria  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Attempt Initialization                                  │
│  System auto-creates Attempt (attempt #1 or #N+1 if retrying)   │
│  Loads previous attempt pre-fill if retry attempt               │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Structured Editor (4 Tabs)                              │
│  Tab A: Requirements & Assumptions (free text)                   │
│  Tab B: Class Design & Contracts (code/pseudocode)               │
│  Tab C: Design Patterns & Trade-offs (free text + justification) │
│  Tab D: Edge Cases & Concurrency (structured checklist + text)   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Submission                                              │
│  Learner clicks "Submit Design"                                  │
│  POST /api/attempts/:id/submissions  →  HTTP 202 + evaluationId │
│  UI immediately shows: SUBMITTED → EVALUATING state indicator    │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Async Evaluation Pipeline                               │
│  DeterministicRuleEvaluator runs in <50ms (instant checks)      │
│  GeminiAiEvaluator runs concurrently (3–8s for semantic rubric) │
│  CompositeEvaluator merges scores → Evaluation.status=COMPLETED  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: Rubric Feedback View                                    │
│  Overall score with radar/bar chart visualization                │
│  Per-dimension: Score, Evidence quote, Concern, Suggestion       │
│  Anti-pattern flags highlighted (God Class, coupling violations) │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 7: Attempt History                                         │
│  Shows all past attempts with score deltas                       │
│  Surfaces recurring weak dimensions (persistent warnings)        │
│  Learner starts Attempt N+1 with informed focus areas            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Class Design (Domain Model)

### 3.1 Core Domain Classes

#### `Problem`
```javascript
class Problem {
  constructor({ id, title, difficulty, category, summary,
                functionalRequirements, nonFunctionalRequirements,
                constraints, defaultRubric, sampleDesignElements })
  // Encapsulates problem definition; immutable after seeding
  // Composed with: Rubric (1-to-1 ownership)
}
```

#### `Rubric` + `RubricDimension`
```javascript
class Rubric {
  constructor({ id, name, dimensions })  // Array of RubricDimension
}

class RubricDimension {
  constructor({ id, name, description, weight, guidance })
  // guidance: { exemplary, proficient, needsImprovement, unacceptable }
  // weight: 0.0–1.0 multiplier for dimension importance
}
```

#### `Attempt`
```javascript
class Attempt {
  constructor({ id, problemId, learnerId, attemptNumber, status, submissions })
  // status: IN_PROGRESS | SUBMITTED | EVALUATING | COMPLETED
  // Tracks the full attempt lifecycle; aggregates submissions
}
```

#### `Submission` + `ISubmissionPayload`
```javascript
// Strategy / Open-Closed: payload is swappable without touching Submission
class Submission {
  constructor({ id, attemptId, payload, idempotencyKey, submittedAt })
}

class StructuredTextPayload {
  constructor({ requirementsAndAssumptions, classDesignAndContracts,
                designPatternsAndTradeoffs, edgeCasesAndConcurrency })
  toEvaluatorMap()  // Converts to normalized evaluation input
  validate()        // Checks minimum content requirements
}

// Change Test A: This can be swapped for DiagramAstPayload transparently
class DiagramAstPayload {
  constructor({ mermaidDefinition, nodes, edges })
  toEvaluatorMap()
  validate()
}
```

#### `Evaluation` + `RubricResult`
```javascript
class Evaluation {
  constructor({ id, submissionId, status, results, overallScore,
                summary, weaknessTags, evaluatedAt })
  // status machine: SUBMITTED → EVALUATING → COMPLETED | FAILED
}

class RubricResult {
  constructor({ criterionId, criterionName, score, evidence,
                concern, suggestion, confidence, evaluatorSource })
  // Every RubricResult MUST contain: evidence, concern, suggestion
}
```

### 3.2 Evaluator Hierarchy (Strategy + Composite Patterns)

```javascript
// Change Test B: All evaluators implement this contract
class IEvaluator {
  async evaluate(submission, rubric) → Evaluation  // abstract
}

class DeterministicRuleEvaluator extends IEvaluator {
  // Checks: mandatory sections present, min length, interface keywords,
  //         God Class detection (>25 methods / >400 chars), SRP proxies
  async evaluate(submission, rubric)
}

class GeminiAiEvaluator extends IEvaluator {
  // Calls Gemini 1.5 Flash with strict low-temperature JSON prompt
  // Falls back to heuristic scoring if no API key configured
  async evaluate(submission, rubric)
}

class CompositeEvaluator extends IEvaluator {
  // Chains: DeterministicRuleEvaluator → GeminiAiEvaluator
  // Merges results; deterministic scores are authoritative for schema checks
  async evaluate(submission, rubric)
}
```

### 3.3 Repository Layer

```javascript
class InMemoryStore {
  // Stores: problems, attempts, submissions, evaluations
  // Idempotency: tracks submissionIdempotencyKeys to prevent duplicate evals
  // Persistence: auto-saves to data/store.json on every mutation
  // Analytics: getWeaknessAnalytics(learnerId) → recurring weak dimensions
}
```

---

## 4. Key Trade-offs

### 4.1 Structured Text Submission vs. Live Code Execution
| Aspect | Structured Text (Chosen) | Live Code Execution |
|---|---|---|
| **Friction** | Low — focuses cognitive energy on design reasoning | High — boilerplate, build setup, language syntax |
| **Signal quality** | High — captures *why* (patterns, trade-offs) | Partial — tests *that it compiles*, not *why it's designed this way* |
| **Evaluation cost** | Moderate — requires semantic AI scoring | High — requires language-specific runtime analysis |
| **Interview fidelity** | High — mirrors whiteboard/verbal interview format | Medium — interviews rarely require compiling code |

**Decision**: Structured Text is the correct format for an LLD interview practice tool. The goal is to evaluate *architectural reasoning*, not compilation correctness.

### 4.2 In-Memory + JSON vs. SQL Database
| Aspect | In-Memory + JSON (Chosen) | PostgreSQL / MongoDB |
|---|---|---|
| **Setup complexity** | Zero — works out of the box | Requires DB install, connection strings, migrations |
| **MVP speed** | Immediate — no external dependencies | Days of setup overhead |
| **Data durability** | Survives restarts via file persistence | Full ACID guarantees |
| **Scale ceiling** | Single-server only (~1,000 concurrent learners) | Horizontally scalable |

**Decision**: For MVP prototype validation, the zero-dependency approach is correct. Repository interfaces (`InMemoryStore`) are designed for clean swap to Postgres with no domain model changes.

### 4.3 Hybrid Evaluator vs. Pure AI
| Aspect | Hybrid (Chosen) | Pure AI |
|---|---|---|
| **Consistency** | Deterministic layer guarantees structural checks are 100% consistent | AI responses can drift even with low temperature |
| **Cost** | Deterministic checks are free; AI only called when structurally valid | Every submission incurs AI cost, even malformed ones |
| **Latency** | Deterministic checks return in <50ms; AI runs in parallel | Full evaluation waits on AI latency (3–8s) |
| **Reliability** | Works offline / without API key via heuristic fallback | Fails entirely without API key |

**Decision**: The hybrid approach is the correct architectural choice. Deterministic checks act as a fast validation gate that catches structural issues cheaply, while AI handles the nuanced semantic scoring that deterministic rules cannot.

---

*This document accompanies the MVP implementation at `/server` and `/src`.*
