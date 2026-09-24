// server/repositories/InMemoryStore.js
const fs = require('fs');
const path = require('path');
const { Problem } = require('../models/Problem');
const { Submission } = require('../models/Submission');
const { Attempt } = require('../models/Attempt');
const { Evaluation, EvaluationStatus } = require('../models/Evaluation');

class InMemoryStore {
  constructor(storageFilePath) {
    this.storageFilePath = storageFilePath || path.join(__dirname, '..', 'data', 'store.json');
    this.problems = new Map();
    this.attempts = new Map();
    this.submissions = new Map();
    this.evaluations = new Map();
    this.idempotencyKeys = new Map(); // key -> submissionId

    this.init();
  }

  init() {
    // 1. Seed problems
    const seedProblems = Problem.getSeedProblems();
    for (const p of seedProblems) {
      this.problems.set(p.id, p);
    }

    // 2. Ensure data directory
    const dir = path.dirname(this.storageFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 3. Load existing state if available
    if (fs.existsSync(this.storageFilePath)) {
      try {
        const raw = fs.readFileSync(this.storageFilePath, 'utf8');
        const data = JSON.parse(raw);
        if (data.attempts) {
          data.attempts.forEach(a => this.attempts.set(a.id, new Attempt(a)));
        }
        if (data.submissions) {
          data.submissions.forEach(s => this.submissions.set(s.id, Submission.fromJSON(s)));
        }
        if (data.evaluations) {
          data.evaluations.forEach(e => this.evaluations.set(e.id, new Evaluation(e)));
        }
        if (data.idempotencyKeys) {
          Object.entries(data.idempotencyKeys).forEach(([k, v]) => this.idempotencyKeys.set(k, v));
        }
      } catch (err) {
        console.warn('Could not load saved store state, starting fresh:', err.message);
      }
    }
  }

  save() {
    try {
      const data = {
        attempts: Array.from(this.attempts.values()),
        submissions: Array.from(this.submissions.values()),
        evaluations: Array.from(this.evaluations.values()),
        idempotencyKeys: Object.fromEntries(this.idempotencyKeys.entries())
      };
      fs.writeFileSync(this.storageFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save store state to file:', err.message);
    }
  }

  // Problems
  getProblems() {
    return Array.from(this.problems.values());
  }

  getProblem(id) {
    return this.problems.get(id) || null;
  }

  // Attempts
  getAttempt(id) {
    return this.attempts.get(id) || null;
  }

  getAttemptsForProblem(problemId, learnerId = 'learner-default') {
    return Array.from(this.attempts.values())
      .filter(a => a.problemId === problemId && a.learnerId === learnerId)
      .sort((a, b) => a.attemptNumber - b.attemptNumber);
  }

  createAttempt(problemId, learnerId = 'learner-default') {
    const existing = this.getAttemptsForProblem(problemId, learnerId);
    const nextNumber = existing.length + 1;
    const attempt = new Attempt({
      problemId,
      learnerId,
      attemptNumber: nextNumber
    });
    this.attempts.set(attempt.id, attempt);
    this.save();
    return attempt;
  }

  // Submissions
  getSubmission(id) {
    return this.submissions.get(id) || null;
  }

  saveSubmission(submission) {
    this.submissions.set(submission.id, submission);
    if (submission.idempotencyKey) {
      this.idempotencyKeys.set(submission.idempotencyKey, submission.id);
    }
    const attempt = this.attempts.get(submission.attemptId);
    if (attempt) {
      attempt.addSubmission(submission.id);
    }
    this.save();
    return submission;
  }

  getSubmissionByIdempotencyKey(key) {
    if (!key) return null;
    const subId = this.idempotencyKeys.get(key);
    return subId ? this.submissions.get(subId) : null;
  }

  // Evaluations
  getEvaluation(id) {
    return this.evaluations.get(id) || null;
  }

  getEvaluationForSubmission(submissionId) {
    return Array.from(this.evaluations.values()).find(e => e.submissionId === submissionId) || null;
  }

  saveEvaluation(evaluation) {
    this.evaluations.set(evaluation.id, evaluation);
    const attempt = this.attempts.get(evaluation.attemptId);
    if (attempt) {
      attempt.setEvaluation(evaluation.id);
    }
    this.save();
    return evaluation;
  }

  // Analytics: Longitudinal Recurring Weaknesses across all attempts
  getLearnerWeaknesses(learnerId = 'learner-default') {
    const learnerAttempts = Array.from(this.attempts.values()).filter(a => a.learnerId === learnerId);
    const completedEvals = learnerAttempts
      .map(a => this.evaluations.get(a.latestEvaluationId))
      .filter(e => e && e.status === EvaluationStatus.COMPLETED);

    if (completedEvals.length === 0) {
      return { totalAttempts: 0, weaknesses: [], scoreTrends: [] };
    }

    const dimensionStats = {};

    completedEvals.forEach(e => {
      e.rubricResults.forEach(r => {
        if (!dimensionStats[r.criterionId]) {
          dimensionStats[r.criterionId] = {
            id: r.criterionId,
            name: r.criterionName,
            scores: [],
            concerns: []
          };
        }
        dimensionStats[r.criterionId].scores.push(r.score);
        if (r.score < 80 && r.concern) {
          dimensionStats[r.criterionId].concerns.push(r.concern);
        }
      });
    });

    const weaknesses = Object.values(dimensionStats).map(dim => {
      const avg = Math.round(dim.scores.reduce((a, b) => a + b, 0) / dim.scores.length);
      return {
        criterionId: dim.id,
        criterionName: dim.name,
        averageScore: avg,
        frequency: dim.scores.filter(s => s < 75).length,
        recurringConcerns: [...new Set(dim.concerns)].slice(0, 3)
      };
    }).sort((a, b) => a.averageScore - b.averageScore);

    const scoreTrends = completedEvals.map(e => ({
      evaluationId: e.id,
      attemptId: e.attemptId,
      problemId: e.problemId,
      overallScore: e.overallScore,
      completedAt: e.completedAt
    }));

    return {
      totalAttempts: learnerAttempts.length,
      evaluatedAttempts: completedEvals.length,
      weaknesses,
      scoreTrends
    };
  }
}

module.exports = { InMemoryStore };
