# 📄 Research Note: The Learner Problem & Product Direction
**LLD Practice Platform — Assignment Submission File 1 of 3**
**Author:** Vishu Vatsay | **Date:** September 2026

---

## The Core Learner Problem

Practicing **Low-Level Design (LLD)** and **Object-Oriented Design (OOD)** is fundamentally broken for self-taught engineers and candidates preparing for technical interviews. The root causes fall into four interconnected failure modes:

### Failure Mode 1 — No Binary Feedback Signal

Unlike Data Structures & Algorithms (DSA), where LeetCode returns a definitive pass/fail verdict based on test cases, LLD has **no automated oracle**. Five senior engineers can design a Parking Lot system in five radically different — and all equally valid — ways. Learners have no way to know if their design reflects genuine understanding or a cargo-culted pattern copy from a YouTube tutorial.

**Impact:** Learners cannot self-assess. They don't know if they passed or failed a design problem, so they cannot course-correct.

---

### Failure Mode 2 — The "Reference Solution Fallacy"

The dominant practice method today is:
1. Read a blog post presenting *one* authoritative design
2. Compare own design against it
3. Treat any divergence as a personal failure

This discourages architectural curiosity and penalizes valid trade-off exploration. Worse, learners observe *that* a pattern was used but never understand *why* it was chosen over alternatives.

**Impact:** Pattern memorization replaces genuine architectural reasoning — the exact anti-pattern that interviewers test for.

---

### Failure Mode 3 — Subjective and Unactionable Feedback

When learners post designs to forums, Discord servers, or LLM chat, they receive feedback that is either:
- **Generic:** "You should use more design patterns" or "This is tightly coupled"
- **Unanchored:** No specific pointer to which class or method violates a principle
- **Non-iterative:** Feedback doesn't track improvement between attempt 1 and attempt 3

A learner cannot act on "your code is tightly coupled" without knowing *exactly where* the coupling occurs and *what structure* would eliminate it.

**Impact:** Hours of practice produce minimal skill transfer because feedback cannot be acted upon concretely.

---

### Failure Mode 4 — No Iterative Learning Loop

Today's tools offer a **one-shot experience**: a learner designs, someone reviews it once, and the thread goes cold. There is no mechanism to track whether a recurring weakness (e.g., creating God Classes, violating SRP, ignoring concurrency edge cases) improves or persists across multiple attempts.

**Impact:** Learners practice in circles, repeating the same anti-patterns attempt after attempt with no awareness of their blind spots.

---

## Research Gaps in Existing Tools

| Tool | What It Offers | What It Lacks |
|:---|:---|:---|
| **LeetCode** | Algorithmic problems, test-case validation | Zero LLD-specific support; no class design evaluation |
| **Educative.io / Grokking** | Curated LLD courses with reading material | Passive consumption; no submission or feedback engine |
| **GitHub + Forum Reviews** | Community code reviews | 0–5% response rate; no standardized rubric; no iteration tracking |
| **LLM Chat (GPT/Gemini)** | Conversational design discussion | No structured rubric; inconsistent; cannot track longitudinal progress |
| **Pramp / Interviewing.io** | Peer mock interviews | Human scheduling bottleneck; expensive; no async practice |

**The gap:** No tool offers a structured, rubric-driven, iterative feedback loop for LLD specifically — one where submissions are evaluated against consistent, evidence-backed criteria and where learner progression is tracked over time.

---

## Product Direction

### Core Hypothesis
> *If learners receive specific, evidence-backed rubric scores tied to concrete sections of their own design, and if they can see how these scores change across attempts, they will develop genuine LLD mastery rather than pattern memorization.*

### Product Pillars

| Pillar | Description |
|:---|:---|
| **Structured Submission** | 4-section hybrid editor (Requirements, Class Design, Patterns, Edge Cases) that proves the learner understands *why*, not just *what* |
| **Rubric-Driven Evaluation** | 6-dimension scoring with mandatory evidence anchored to the candidate's own submission text |
| **Hybrid Evaluation Engine** | Deterministic rule-checks (instant, cheap) + AI semantic reasoning (nuanced, contextual) |
| **Longitudinal Progress Tracking** | Every attempt persisted; recurring weak dimensions surface as anti-pattern warnings |
| **Curated Problem Set** | 4 archetypal LLD problems covering distinct design challenges: polymorphism, state machines, algorithm selection, and behavioral patterns |

### Success Metric
A learner who completes 3+ attempts on any problem should demonstrate measurable improvement in at least 2 of the 6 rubric dimensions — tracked automatically by the platform.

---

*This is File 1 of 3 — Assignment submission for the LLD Practice Platform.*
*See also: `02_MVP_USER_FLOW_CLASSES_TRADEOFFS.md` and `03_RUN_GUIDE_DECISIONS_AI_REPORT.md`*
