// server/models/Evaluation.js
const { v4: uuidv4 } = require('uuid');

const EvaluationStatus = {
  SUBMITTED: 'SUBMITTED',
  EVALUATING: 'EVALUATING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

class RubricResult {
  constructor({
    criterionId,
    criterionName,
    score, // 0 - 100
    evidence = '',
    concern = '',
    suggestion = '',
    confidence = 0.95
  }) {
    this.criterionId = criterionId;
    this.criterionName = criterionName;
    this.score = score;
    this.evidence = evidence;
    this.concern = concern;
    this.suggestion = suggestion;
    this.confidence = confidence;
  }
}

class Evaluation {
  constructor({
    id = uuidv4(),
    submissionId,
    attemptId,
    problemId,
    status = EvaluationStatus.SUBMITTED,
    overallScore = 0,
    summary = '',
    rubricResults = [],
    evaluatorEngine = 'CompositeEvaluator',
    error = null,
    createdAt = new Date().toISOString(),
    completedAt = null
  }) {
    this.id = id;
    this.submissionId = submissionId;
    this.attemptId = attemptId;
    this.problemId = problemId;
    this.status = status;
    this.overallScore = overallScore;
    this.summary = summary;
    this.rubricResults = rubricResults.map(r => r instanceof RubricResult ? r : new RubricResult(r));
    this.evaluatorEngine = evaluatorEngine;
    this.error = error;
    this.createdAt = createdAt;
    this.completedAt = completedAt;
  }

  markEvaluating() {
    this.status = EvaluationStatus.EVALUATING;
  }

  markCompleted({ overallScore, summary, rubricResults, evaluatorEngine }) {
    this.status = EvaluationStatus.COMPLETED;
    this.overallScore = overallScore;
    this.summary = summary;
    this.rubricResults = rubricResults.map(r => r instanceof RubricResult ? r : new RubricResult(r));
    if (evaluatorEngine) this.evaluatorEngine = evaluatorEngine;
    this.completedAt = new Date().toISOString();
  }

  markFailed(errorMessage) {
    this.status = EvaluationStatus.FAILED;
    this.error = errorMessage;
    this.completedAt = new Date().toISOString();
  }
}

module.exports = {
  EvaluationStatus,
  RubricResult,
  Evaluation
};
