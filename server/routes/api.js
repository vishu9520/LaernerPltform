// server/routes/api.js
const express = require('express');
const { Submission, StructuredTextPayload, DiagramAstPayload } = require('../models/Submission');
const { Evaluation, EvaluationStatus } = require('../models/Evaluation');

function createApiRouter(store, compositeEvaluator) {
  const router = express.Router();

  // 1. List all problems
  router.get('/problems', (req, res) => {
    try {
      const problems = store.getProblems().map(p => ({
        id: p.id,
        title: p.title,
        difficulty: p.difficulty,
        category: p.category,
        summary: p.summary,
        functionalRequirementsCount: p.functionalRequirements.length,
        rubricDimensionsCount: p.rubric.dimensions.length
      }));
      res.json({ success: true, problems });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Get specific problem details
  router.get('/problems/:id', (req, res) => {
    try {
      const problem = store.getProblem(req.params.id);
      if (!problem) {
        return res.status(404).json({ success: false, error: 'Problem not found' });
      }
      res.json({ success: true, problem });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Start or retrieve attempt
  router.post('/attempts', (req, res) => {
    try {
      const { problemId, learnerId = 'learner-default' } = req.body;
      if (!problemId) {
        return res.status(400).json({ success: false, error: 'problemId is required' });
      }
      const problem = store.getProblem(problemId);
      if (!problem) {
        return res.status(404).json({ success: false, error: 'Problem not found' });
      }

      const attempt = store.createAttempt(problemId, learnerId);
      res.json({ success: true, attempt });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Get attempt details
  router.get('/attempts/:id', (req, res) => {
    try {
      const attempt = store.getAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ success: false, error: 'Attempt not found' });
      }

      const submissions = attempt.submissions.map(sId => store.getSubmission(sId)).filter(Boolean);
      const latestEvaluation = attempt.latestEvaluationId ? store.getEvaluation(attempt.latestEvaluationId) : null;

      res.json({
        success: true,
        attempt,
        submissions,
        latestEvaluation
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Get all attempts for a problem
  router.get('/problems/:problemId/attempts', (req, res) => {
    try {
      const { problemId } = req.params;
      const { learnerId = 'learner-default' } = req.query;
      const attempts = store.getAttemptsForProblem(problemId, learnerId);
      res.json({ success: true, attempts });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Submit a solution (with Idempotency & Safe State Machine)
  router.post('/submissions', async (req, res) => {
    try {
      const {
        attemptId,
        problemId,
        payload,
        idempotencyKey
      } = req.body;

      if (!attemptId || !problemId || !payload) {
        return res.status(400).json({
          success: false,
          error: 'attemptId, problemId, and payload are required.'
        });
      }

      const problem = store.getProblem(problemId);
      if (!problem) {
        return res.status(404).json({ success: false, error: 'Problem not found' });
      }

      // Check Idempotency
      if (idempotencyKey) {
        const existingSub = store.getSubmissionByIdempotencyKey(idempotencyKey);
        if (existingSub) {
          const existingEval = store.getEvaluationForSubmission(existingSub.id);
          return res.status(200).json({
            success: true,
            isDuplicate: true,
            submission: existingSub,
            evaluation: existingEval
          });
        }
      }

      // Instantiate polymorphic payload (Change Test A)
      let submissionPayload;
      if (payload.format === 'DIAGRAM_AST_V1') {
        submissionPayload = new DiagramAstPayload(payload);
      } else {
        submissionPayload = new StructuredTextPayload(payload);
      }

      // Validate payload deterministically
      const validation = submissionPayload.validate();
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Payload validation failed',
          details: validation.errors
        });
      }

      // Step 1: STORE SUBMISSION BEFORE EVALUATION STARTS (Zero data loss guarantee)
      const submission = new Submission({
        attemptId,
        problemId,
        payload: submissionPayload,
        idempotencyKey
      });
      store.saveSubmission(submission);

      // Step 2: Initialize Evaluation Record in SUBMITTED state
      const evaluation = new Evaluation({
        submissionId: submission.id,
        attemptId,
        problemId,
        status: EvaluationStatus.SUBMITTED
      });
      store.saveEvaluation(evaluation);

      // Step 3: Trigger Asynchronous Evaluation Pipeline
      setImmediate(async () => {
        try {
          // Transition state: EVALUATING
          evaluation.markEvaluating();
          store.saveEvaluation(evaluation);

          // Execute evaluation engine
          const result = await compositeEvaluator.evaluate(submission, problem, problem.rubric);

          // Transition state: COMPLETED
          evaluation.markCompleted({
            overallScore: result.overallScore,
            summary: result.summary,
            rubricResults: result.rubricResults,
            evaluatorEngine: result.evaluatorEngine
          });
          store.saveEvaluation(evaluation);
        } catch (evalErr) {
          console.error('Evaluator Pipeline Error:', evalErr);
          evaluation.markFailed(evalErr.message);
          store.saveEvaluation(evaluation);
        }
      });

      // Return 202 Accepted immediately so client is non-blocked
      res.status(202).json({
        success: true,
        submissionId: submission.id,
        evaluationId: evaluation.id,
        status: evaluation.status,
        message: 'Submission accepted for evaluation.'
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Get Evaluation Status & Rubric Feedback
  router.get('/evaluations/:id', (req, res) => {
    try {
      const evaluation = store.getEvaluation(req.params.id);
      if (!evaluation) {
        return res.status(404).json({ success: false, error: 'Evaluation not found' });
      }
      res.json({ success: true, evaluation });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Longitudinal Weakness Analytics across attempts
  router.get('/analytics/weaknesses', (req, res) => {
    try {
      const { learnerId = 'learner-default' } = req.query;
      const analytics = store.getLearnerWeaknesses(learnerId);
      res.json({ success: true, analytics });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. Evaluator Configuration & Status
  router.get('/evaluator/config', (req, res) => {
    res.json({
      success: true,
      mode: compositeEvaluator.mode,
      hasGeminiApiKey: Boolean(compositeEvaluator.aiEvaluator?.apiKey),
      evaluatorName: compositeEvaluator.name
    });
  });

  router.post('/evaluator/config', (req, res) => {
    const { mode, apiKey } = req.body;
    if (mode) {
      compositeEvaluator.setMode(mode);
    }
    if (apiKey !== undefined) {
      compositeEvaluator.setApiKey(apiKey);
    }
    res.json({
      success: true,
      mode: compositeEvaluator.mode,
      hasGeminiApiKey: Boolean(compositeEvaluator.aiEvaluator?.apiKey)
    });
  });

  return router;
}

module.exports = { createApiRouter };
