// server/evaluators/CompositeEvaluator.js
const { IEvaluator } = require('./IEvaluator');
const { DeterministicRuleEvaluator } = require('./DeterministicRuleEvaluator');
const { GeminiAiEvaluator } = require('./GeminiAiEvaluator');
const { RubricResult } = require('../models/Evaluation');

class CompositeEvaluator extends IEvaluator {
  constructor(options = {}) {
    super('CompositeEvaluator');
    this.deterministicEvaluator = options.deterministicEvaluator || new DeterministicRuleEvaluator();
    this.aiEvaluator = options.aiEvaluator || new GeminiAiEvaluator(options.apiKey);
    this.mode = options.mode || 'HYBRID'; // 'HYBRID', 'DETERMINISTIC_ONLY', 'AI_ONLY'
  }

  setApiKey(key) {
    if (this.aiEvaluator.setApiKey) {
      this.aiEvaluator.setApiKey(key);
    }
  }

  setMode(mode) {
    this.mode = mode;
  }

  async evaluate(submission, problem, rubric) {
    // 1. Validation check
    const validation = submission.payload.validate();
    if (!validation.isValid) {
      throw new Error(`Submission validation failed: ${validation.errors.join(', ')}`);
    }

    if (this.mode === 'DETERMINISTIC_ONLY') {
      return await this.deterministicEvaluator.evaluate(submission, problem, rubric);
    }

    if (this.mode === 'AI_ONLY') {
      return await this.aiEvaluator.evaluate(submission, problem, rubric);
    }

    // HYBRID PIPELINE:
    // Step 1: Execute fast deterministic analysis
    const deterministicReport = await this.deterministicEvaluator.evaluate(submission, problem, rubric);

    // Step 2: Execute deep semantic AI analysis
    const aiReport = await this.aiEvaluator.evaluate(submission, problem, rubric);

    // Step 3: Blend scores & enrich evidence
    // Deterministic checks anchor structural scoring (40% weight), AI anchors semantic nuances (60% weight)
    const combinedResults = rubric.dimensions.map((dim, idx) => {
      const dResult = deterministicReport.rubricResults[idx] || {};
      const aiResult = aiReport.rubricResults[idx] || {};

      const dScore = dResult.score || 70;
      const aiScore = aiResult.score || 75;
      const blendedScore = Math.round((dScore * 0.4) + (aiScore * 0.6));

      return new RubricResult({
        criterionId: dim.id,
        criterionName: dim.name,
        score: blendedScore,
        evidence: aiResult.evidence || dResult.evidence,
        concern: aiResult.concern || dResult.concern,
        suggestion: aiResult.suggestion || dResult.suggestion,
        confidence: Math.max(dResult.confidence || 0.8, aiResult.confidence || 0.85)
      });
    });

    const totalScore = Math.round(combinedResults.reduce((acc, r) => acc + r.score, 0) / combinedResults.length);

    return {
      evaluatorEngine: `CompositePipeline (${this.deterministicEvaluator.name} + ${aiReport.evaluatorEngine})`,
      overallScore: totalScore,
      summary: aiReport.summary || deterministicReport.summary,
      rubricResults: combinedResults
    };
  }
}

module.exports = { CompositeEvaluator };
