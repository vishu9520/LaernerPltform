// server/models/Submission.js
const { v4: uuidv4 } = require('uuid');

/**
 * Base abstract Submission Payload interface (satisfying Change Test A).
 * Whether the candidate submits structured text or a class diagram AST,
 * it adapts to the standard evaluator input format.
 */
class ISubmissionPayload {
  constructor(format) {
    this.format = format;
  }

  toEvaluatorText() {
    throw new Error('toEvaluatorText must be implemented by subclass');
  }

  validate() {
    throw new Error('validate must be implemented by subclass');
  }
}

/**
 * Default MVP Structured Text Payload
 */
class StructuredTextPayload extends ISubmissionPayload {
  constructor({
    requirementsAndAssumptions = '',
    classDesignAndContracts = '',
    designPatternsAndTradeoffs = '',
    edgeCasesAndConcurrency = ''
  }) {
    super('STRUCTURED_TEXT_V1');
    this.requirementsAndAssumptions = requirementsAndAssumptions;
    this.classDesignAndContracts = classDesignAndContracts;
    this.designPatternsAndTradeoffs = designPatternsAndTradeoffs;
    this.edgeCasesAndConcurrency = edgeCasesAndConcurrency;
  }

  validate() {
    const errors = [];
    if (!this.requirementsAndAssumptions.trim()) {
      errors.push('Requirements & Assumptions section cannot be empty.');
    }
    if (!this.classDesignAndContracts.trim()) {
      errors.push('Class Design & Contracts section cannot be empty.');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toEvaluatorText() {
    return `=== SECTION 1: REQUIREMENTS & ASSUMPTIONS ===\n${this.requirementsAndAssumptions}\n\n` +
      `=== SECTION 2: CLASS DESIGN & CONTRACTS ===\n${this.classDesignAndContracts}\n\n` +
      `=== SECTION 3: DESIGN PATTERNS & TRADEOFFS ===\n${this.designPatternsAndTradeoffs}\n\n` +
      `=== SECTION 4: EDGE CASES & CONCURRENCY ===\n${this.edgeCasesAndConcurrency}`;
  }
}

/**
 * Diagram AST Payload (Implements Change Test A: evolving to class diagram)
 */
class DiagramAstPayload extends ISubmissionPayload {
  constructor({ mermaidDefinition = '', nodes = [], edges = [], notes = '' }) {
    super('DIAGRAM_AST_V1');
    this.mermaidDefinition = mermaidDefinition;
    this.nodes = nodes; // [{ id, className, attributes, methods }]
    this.edges = edges; // [{ source, target, relationType: 'inheritance'|'composition' }]
    this.notes = notes;
  }

  validate() {
    const errors = [];
    if (!this.mermaidDefinition.trim() && this.nodes.length === 0) {
      errors.push('Diagram definition or nodes must not be empty.');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toEvaluatorText() {
    const nodesSummary = this.nodes.map(n => 
      `Class ${n.className} {\n  Attributes: ${(n.attributes || []).join(', ')}\n  Methods: ${(n.methods || []).join(', ')}\n}`
    ).join('\n\n');

    const edgesSummary = this.edges.map(e =>
      `${e.source} --[${e.relationType}]--> ${e.target}`
    ).join('\n');

    return `=== DIAGRAM PAYLOAD (MERMAID SPEC) ===\n${this.mermaidDefinition}\n\n` +
      `=== EXTRACTED AST NODES ===\n${nodesSummary}\n\n` +
      `=== RELATIONSHIPS ===\n${edgesSummary}\n\n` +
      `=== DESIGN NOTES ===\n${this.notes}`;
  }
}

/**
 * Submission Entity
 */
class Submission {
  constructor({
    id = uuidv4(),
    attemptId,
    problemId,
    payload,
    submittedAt = new Date().toISOString(),
    idempotencyKey = null
  }) {
    this.id = id;
    this.attemptId = attemptId;
    this.problemId = problemId;
    this.payload = payload; // Instance of ISubmissionPayload
    this.submittedAt = submittedAt;
    this.idempotencyKey = idempotencyKey || id;
  }

  static fromJSON(json) {
    let payloadInstance;
    if (json.payload && json.payload.format === 'DIAGRAM_AST_V1') {
      payloadInstance = new DiagramAstPayload(json.payload);
    } else {
      payloadInstance = new StructuredTextPayload(json.payload || {});
    }

    return new Submission({
      id: json.id,
      attemptId: json.attemptId,
      problemId: json.problemId,
      payload: payloadInstance,
      submittedAt: json.submittedAt,
      idempotencyKey: json.idempotencyKey
    });
  }
}

module.exports = {
  ISubmissionPayload,
  StructuredTextPayload,
  DiagramAstPayload,
  Submission
};
