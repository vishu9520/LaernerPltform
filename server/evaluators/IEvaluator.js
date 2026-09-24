// server/evaluators/IEvaluator.js

/**
 * Strategy pattern interface for all evaluation engines.
 * Enables zero-code-change additions of new evaluators (Change Test B).
 */
class IEvaluator {
  constructor(name) {
    this.name = name;
  }

  /**
   * @param {Submission} submission - The candidate submission
   * @param {Problem} problem - The problem definition & requirements
   * @param {Rubric} rubric - The rubric dimensions to score against
   * @returns {Promise<{ overallScore: number, summary: string, rubricResults: RubricResult[] }>}
   */
  async evaluate(submission, problem, rubric) {
    throw new Error('evaluate() must be implemented by subclass.');
  }
}

module.exports = { IEvaluator };
