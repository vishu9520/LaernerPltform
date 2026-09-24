# 📄 MVP Specification: User Flow, Classes & Trade-offs
**LLD Practice Platform — Assignment Submission File 2 of 3**
**Author:** Vishu Vatsay | **Date:** September 2026

---

## 1. MVP Scope

The Minimum Viable Product proves one complete, end-to-end learning loop:

> **Problem Selection → Structured Submission → Rubric Evaluation → Evidence-Backed Feedback → Attempt History**

### ✅ In Scope
| Feature | Details |
|:---|:---|
| Problem set | 4 curated LLD problems (Parking Lot, Ride-Sharing, Rate Limiter, Coffee Machine) |
| Submission format | Structured 4-section hybrid (text + pseudocode) |
| Evaluation | Deterministic rule-checks + Gemini AI semantic scoring (heuristic fallback if no key) |
| Rubric | 6 dimensions with evidence-anchored feedback per criterion |
| Attempt history | Longitudinal dimension score tracking across attempts |
| Persistence | In-memory store + JSON file backup (single-user session) |

### ❌ Out of Scope (MVP)
- Multi-user authentication
- Visual UML/class diagram builder (canvas)
- Real-time collaborative design sessions
- Automated test-case execution against compiled code
- Peer review / human-in-the-loop evaluation
- Mobile native app

---

## 2. Complete User Flow

```
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Problem Selection                                    │
│  Learner sees left panel with 4 curated LLD problems         │
│  Selects "Parking Lot" → problem specs, constraints, rubric  │
│  displayed in left panel tabs                                 │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Attempt Initialization                               │
│  System auto-creates Attempt (attempt #1 or #N+1 for retry)  │
│  Loads previous submission as pre-fill if retrying           │
│  Attempt status: IN_PROGRESS                                  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Structured Editor (4 Tabs on right panel)           │
│  Tab A → "Requirements & Assumptions" (free text)            │
│  Tab B → "Class Design & Contracts" (pseudocode/code)        │
│  Tab C → "Design Patterns & Trade-offs" (justification text) │
│  Tab D → "Edge Cases & Concurrency" (checklist + text)       │
│  Tab E → "Class Diagram" (Mermaid diagram editor, optional)  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Submission                                           │
│  Candidate clicks "Submit Design"                            │
│  → Client generates idempotencyKey (UUID)                    │
│  → POST /api/attempts/:id/submissions                        │
│  → Server responds HTTP 202 + evaluationId                   │
│  → UI shows: SUBMITTED → EVALUATING status bar               │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Async Evaluation Pipeline                            │
│  DeterministicRuleEvaluator   → runs in <50ms               │
│    • Schema / section completeness checks                    │
│    • Minimum content length validation                       │
│    • God Class detection (>25 methods / >400 chars in block) │
│    • Interface keyword presence check                        │
│  GeminiAiEvaluator            → runs in 3–8s                │
│    • Sends structured JSON prompt to Gemini 1.5 Flash        │
│    • temperature: 0.1 for consistency                        │
│    • Falls back to heuristic if no API key                   │
│  CompositeEvaluator merges both → status: COMPLETED          │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: Rubric Feedback View                                 │
│  Overall score (0-100) with visual score bar                 │
│  Per dimension: Score | Evidence quote | Concern | Suggestion │
│  Anti-pattern flags highlighted (God Class, tight coupling)  │
│  Confidence level shown per AI-scored criterion              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 7: Attempt History                                      │
│  Shows all past attempts with overall score and per-dim deltas│
│  Surfaces recurring weak dimensions as persistent warnings   │
│  Learner starts Attempt N+1 with informed focus areas        │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Class Design

### 3.1 Domain Model Overview

```
Problem ──── Rubric ──── RubricDimension[]
   │
   └─── Attempt[]
             │
             └─── Submission[]
                       │
                       ├─── ISubmissionPayload (interface)
                       │         ├── StructuredTextPayload
                       │         └── DiagramAstPayload  ← Change Test A
                       │
                       └─── Evaluation
                                 │
                                 └─── RubricResult[]
```

### 3.2 Class Definitions

#### `Problem`
```javascript
class Problem {
  id: String                          // e.g. "parking-lot"
  title: String
  difficulty: "EASY" | "MEDIUM" | "HARD"
  category: String
  summary: String
  functionalRequirements: String[]
  nonFunctionalRequirements: String[]
  constraints: String[]
  defaultRubric: Rubric               // composed, not inherited
  starterTemplate: Object             // pre-fills the editor
  sampleDesignElements: String[]

  static getSeedProblems(): Problem[] // factory — returns 4 seeded problems
}
```

#### `Rubric` + `RubricDimension`
```javascript
class Rubric {
  id: String
  name: String
  dimensions: RubricDimension[]
}

class RubricDimension {
  id: String          // e.g. "requirement-understanding"
  name: String
  description: String
  weight: Float       // 0.0 – 1.0, importance multiplier
  guidance: {
    exemplary: String         // 90–100
    proficient: String        // 70–89
    needsImprovement: String  // 50–69
    unacceptable: String      // <50
  }
}
```

#### `Attempt`
```javascript
class Attempt {
  id: String (UUID)
  problemId: String
  learnerId: String       // "learner-default" for MVP (no auth)
  attemptNumber: Integer
  status: "IN_PROGRESS" | "SUBMITTED" | "EVALUATING" | "COMPLETED"
  submissions: String[]   // array of submissionIds
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### `Submission` + `ISubmissionPayload`
```javascript
// Open-Closed: payload is swappable without touching Submission
class Submission {
  id: String (UUID)
  attemptId: String
  payload: ISubmissionPayload   // interface — NOT concrete type
  idempotencyKey: String (UUID) // prevents duplicate evaluation jobs
  submittedAt: DateTime

  static fromJSON(data): Submission  // factory
}

// Interface (duck-typed in JS)
interface ISubmissionPayload {
  format: String          // "STRUCTURED_HYBRID_V1" | "DIAGRAM_AST_V1"
  toEvaluatorMap(): Map   // normalised input for evaluators
  validate(): Boolean     // minimum content requirements
}

class StructuredTextPayload implements ISubmissionPayload {
  requirementsAndAssumptions: String
  classDesignAndContracts: String
  designPatternsAndTradeoffs: String
  edgeCasesAndConcurrency: String
}

// Change Test A: swapped in transparently — zero changes to Submission
class DiagramAstPayload implements ISubmissionPayload {
  mermaidDefinition: String
  nodes: Node[]
  edges: Edge[]
}
```

#### `Evaluation` + `RubricResult`
```javascript
class Evaluation {
  id: String (UUID)
  submissionId: String
  status: EvaluationStatus    // state machine
  results: RubricResult[]
  overallScore: Integer       // 0–100
  summary: String
  weaknessTags: String[]
  evaluatedAt: DateTime
}

// State machine: SUBMITTED → EVALUATING → COMPLETED | FAILED → EVALUATING (retry)
enum EvaluationStatus { SUBMITTED, EVALUATING, COMPLETED, FAILED }

class RubricResult {
  criterionId: String
  criterionName: String
  score: Integer          // 0–100
  evidence: String        // MANDATORY quote from candidate's submission
  concern: String         // MANDATORY specific issue found
  suggestion: String      // MANDATORY actionable next step
  confidence: Float       // 0.0–1.0 (AI confidence)
  evaluatorSource: String // "DETERMINISTIC" | "AI" | "HEURISTIC"
}
```

### 3.3 Evaluator Hierarchy

```javascript
// Strategy Pattern: all evaluators implement this contract
abstract class IEvaluator {
  name: String
  abstract evaluate(submission: Submission, rubric: Rubric): Promise<Evaluation>
}

// Fast gate: structural checks in <50ms
class DeterministicRuleEvaluator extends IEvaluator {
  RULES: Map<criterionId, RuleFunction[]>
  evaluate(submission, rubric): Evaluation   // synchronous, instant
}

// Semantic scoring: Gemini API with heuristic fallback
class GeminiAiEvaluator extends IEvaluator {
  apiKey: String
  model: "gemini-1.5-flash"
  temperature: 0.1
  evaluate(submission, rubric): Promise<Evaluation>
  _heuristicFallback(submission, rubric): Evaluation  // offline fallback
}

// Composite Pattern: chains evaluators, merges results
// Change Test B: add any IEvaluator here without touching other classes
class CompositeEvaluator extends IEvaluator {
  evaluators: IEvaluator[]
  evaluate(submission, rubric): Promise<Evaluation>   // merges all results
}
```

### 3.4 Repository Layer
```javascript
class InMemoryStore {
  problems: Map<id, Problem>
  attempts: Map<id, Attempt>
  submissions: Map<id, Submission>
  evaluations: Map<id, Evaluation>
  idempotencyKeys: Map<key, submissionId>  // deduplication

  storageFilePath: String   // auto-saves to data/store.json on every mutation

  getProblems(): Problem[]
  getProblem(id): Problem
  saveAttempt(attempt): void
  saveSubmission(submission): void
  checkIdempotency(key): String | null
  saveEvaluation(evaluation): void
  getWeaknessAnalytics(learnerId): Object  // longitudinal dimension tracking
}
```

---

## 4. Key Trade-offs

### Trade-off 1: Structured Text vs. Live Code Execution

| Aspect | Structured Text ✅ Chosen | Live Code Execution |
|:---|:---|:---|
| Friction | Low — focuses cognitive energy on design reasoning | High — boilerplate, build setup, language syntax |
| Signal quality | High — captures *why* (patterns, trade-offs) | Partial — tests *that it compiles*, not *why it's designed this way* |
| Evaluation cost | Moderate — requires semantic AI scoring | High — requires language-specific runtime analysis |
| Interview fidelity | High — mirrors whiteboard/verbal interview format | Medium — interviews rarely require compiling code |

**Rationale:** LLD interviews evaluate *architectural reasoning*, not compilation correctness. Forcing the learner to explain their pattern selection (in the dedicated Trade-offs section) is the highest-signal test of genuine mastery.

---

### Trade-off 2: In-Memory + JSON vs. SQL Database

| Aspect | In-Memory + JSON ✅ Chosen | PostgreSQL / MongoDB |
|:---|:---|:---|
| Setup complexity | Zero — works out of the box | Requires DB install, migrations |
| MVP speed | Immediate | Days of setup overhead |
| Data durability | Survives restarts via file persistence | Full ACID guarantees |
| Scale ceiling | Single-server (~1,000 learners) | Horizontally scalable |

**Rationale:** For MVP validation, zero external infrastructure dependencies is the correct choice. Repository interfaces are designed for clean swap to Postgres with zero domain model changes.

---

### Trade-off 3: Hybrid Evaluator vs. Pure AI

| Aspect | Hybrid ✅ Chosen | Pure AI |
|:---|:---|:---|
| Consistency | Deterministic layer guarantees structural checks are 100% consistent | AI responses drift even with low temperature |
| Cost | Free for structural checks; AI only called after validation gate | Every submission incurs AI cost, including malformed ones |
| Reliability | Works offline via heuristic fallback | Fails entirely without API key |
| Latency | Deterministic <50ms; AI runs in parallel | Full evaluation waits on AI (3–8s) |

**Rationale:** Deterministic checks act as a cheap validation gate. AI handles nuanced semantic scoring that rules cannot. Combined, they deliver fast, deep, and reliable feedback.

---

### Trade-off 4: ISubmissionPayload Interface vs. Raw String

| Aspect | ISubmissionPayload Interface ✅ Chosen | Raw String Field |
|:---|:---|:---|
| Extensibility | Add `DiagramAstPayload` with zero changes to `Submission`, `Evaluation`, or evaluators | Every new format requires modifying Submission and all evaluators |
| Type safety | Each payload validates itself via `validate()` | Validation scattered across multiple layers |
| OCP compliance | Open for extension, closed for modification | Violates Open-Closed Principle on every format addition |

**Rationale:** This is the design that satisfies Change Test A from the assignment spec.

---

*This is File 2 of 3 — Assignment submission for the LLD Practice Platform.*
*See also: `01_RESEARCH_NOTE_LEARNER_PROBLEM.md` and `03_RUN_GUIDE_DECISIONS_AI_REPORT.md`*
