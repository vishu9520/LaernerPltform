# Research Note: The Learner Problem & Product Direction
### LLD Practice Platform — 1–2 Page Research Note

---

## The Core Learner Problem

Practicing **Low-Level Design (LLD)** and **Object-Oriented Design (OOD)** is fundamentally broken for self-taught engineers and candidates preparing for technical interviews. The root causes fall into four interconnected failure modes:

### 1. No Binary Feedback Signal
Unlike Data Structures and Algorithms (DSA), where LeetCode returns a definitive pass/fail verdict based on test cases, LLD has **no equivalent automated oracle**. Five senior engineers can design a Parking Lot or Ride-Sharing Dispatcher in five radically different—and equally valid—ways. Learners have no way to know if their design reflects genuine understanding or a cargo-culted pattern copy from a YouTube tutorial.

### 2. The "Reference Solution Fallacy"
The dominant practice method today involves reading a blog post, copying a GitHub repository, or watching a video that presents *one* authoritative design. Learners instinctively treat any divergence from this reference as failure. This discourages architectural curiosity and penalizes valid trade-off exploration. Worse, learners don't understand *why* a particular pattern was chosen—they only observe *that* it was used.

### 3. Feedback is Subjective and Unactionable
When learners post their designs to forums, Discord servers, or LLM chats with prompts like *"Is this code good?"*, they receive feedback that is either:
- **Generic**: "You should use more design patterns" or "This is tightly coupled."
- **Unanchored**: No specific pointer to which class, which method, or which interface violates a principle.
- **Non-iterative**: Feedback doesn't track change between attempt 1 and attempt 3.

The learner cannot act on "your code is tightly coupled" without knowing *exactly where* the coupling occurs and *what alternative structure* would eliminate it.

### 4. No Iterative Learning Loop
Today's tools offer a **one-shot experience**: a learner designs, someone reviews it once, and the thread goes cold. There is no mechanism to track whether the learner's recurring weakness (e.g., creating God Classes, violating SRP, ignoring concurrency edge cases) improves or persists across multiple attempts.

---

## Research Gaps in Existing Tools

| Tool | What It Offers | What It Lacks |
|---|---|---|
| **LeetCode** | Algorithmic problems, test-case validation | Zero LLD-specific support; no class design evaluation |
| **Educative.io / Grokking** | Curated LLD courses with reading material | Passive consumption; no submission or feedback engine |
| **GitHub + Forum Reviews** | Community code reviews | 0–5% response rate; no standardized rubric; no iteration tracking |
| **LLM Chat (GPT/Gemini)** | Conversational design discussion | No structured rubric; inconsistent; cannot track longitudinal progress |
| **Pramp / Interviewing.io** | Peer mock interviews | Human scheduling bottleneck; expensive; no async practice |

**The gap**: No tool offers a structured, rubric-driven, iterative feedback loop for LLD specifically—one where submissions are evaluated against consistent, evidence-backed criteria and where learner progression is tracked over time.

---

## Product Direction

The **LLD Practice Platform** resolves this gap by introducing:

### Core Hypothesis
> *If learners receive specific, evidence-backed rubric scores tied to concrete sections of their own design, and if they can see how these scores change across attempts, they will develop genuine LLD mastery rather than pattern memorization.*

### Product Pillars

1. **Structured Submission**: Enforce a 4-section hybrid format (Requirements & Assumptions, Class Design & Contracts, Design Patterns & Trade-offs, Edge Cases & Concurrency) that proves the learner understands *why*, not just *what*.

2. **Rubric-Driven Evaluation**: Score submissions across 6 foundational LLD dimensions (Requirements Understanding, SRP/Class Responsibilities, Coupling & Cohesion, Encapsulation & ISP, Extensibility & OCP, Edge Cases & Concurrency). Every score is paired with mandatory evidence extracted from the candidate's own submission.

3. **Hybrid Evaluation Engine**: Combine deterministic rule-checks (instant, cheap, consistent) with AI-powered semantic reasoning (nuanced, contextual) to deliver fast and deep feedback at scale.

4. **Longitudinal Progress Tracking**: Every attempt is persisted and associated with a learner. Recurring weak dimensions surface as anti-pattern warnings, allowing deliberate practice on specific failure modes rather than general re-reading.

5. **Curated Problem Set**: A library of archetypal LLD problems (Parking Lot, Ride-Sharing Dispatch, Rate Limiter, Coffee Vending Machine) chosen to cover distinct design challenges: polymorphism, state machines, concurrency, and behavioral patterns respectively.

---

*This research note was prepared as part of the LLD Practice Platform assignment submission.*
