// server/models/Attempt.js
const { v4: uuidv4 } = require('uuid');

class Attempt {
  constructor({
    id = uuidv4(),
    problemId,
    learnerId = 'learner-default',
    attemptNumber = 1,
    status = 'IN_PROGRESS', // IN_PROGRESS, EVALUATING, REVIEWED
    submissions = [],
    latestEvaluationId = null,
    startedAt = new Date().toISOString(),
    lastUpdatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.problemId = problemId;
    this.learnerId = learnerId;
    this.attemptNumber = attemptNumber;
    this.status = status;
    this.submissions = submissions; // Array of submission IDs
    this.latestEvaluationId = latestEvaluationId;
    this.startedAt = startedAt;
    this.lastUpdatedAt = lastUpdatedAt;
  }

  addSubmission(submissionId) {
    this.submissions.push(submissionId);
    this.lastUpdatedAt = new Date().toISOString();
  }

  setEvaluation(evaluationId) {
    this.latestEvaluationId = evaluationId;
    this.status = 'REVIEWED';
    this.lastUpdatedAt = new Date().toISOString();
  }
}

module.exports = { Attempt };
