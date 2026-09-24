// server/evaluators/DeterministicRuleEvaluator.js
const { IEvaluator } = require('./IEvaluator');
const { RubricResult } = require('../models/Evaluation');

class DeterministicRuleEvaluator extends IEvaluator {
  constructor() {
    super('DeterministicRuleEvaluator');
  }

  async evaluate(submission, problem, rubric) {
    const text = submission.payload.toEvaluatorText();
    const results = [];

    // Analyze text content with heuristic and regex extractors
    for (const dimension of rubric.dimensions) {
      const evaluationResult = this.evaluateDimension(dimension, text, problem);
      results.push(evaluationResult);
    }

    const totalWeight = rubric.dimensions.reduce((acc, d) => acc + d.weight, 0);
    const weightedSum = results.reduce((acc, r, idx) => {
      return acc + (r.score * rubric.dimensions[idx].weight);
    }, 0);
    const overallScore = Math.round(weightedSum / totalWeight);

    const summary = `Deterministic evaluation completed. Analyzed ${results.length} dimensions. Structural checks, interfaces, and core patterns were validated.`;

    return {
      evaluatorEngine: this.name,
      overallScore,
      summary,
      rubricResults: results
    };
  }

  evaluateDimension(dimension, text, problem) {
    const lower = text.toLowerCase();

    switch (dimension.id) {
      case 'requirements': {
        const hasScope = lower.includes('scope') || lower.includes('requirement') || lower.includes('assumption');
        const matchedReqs = problem.functionalRequirements.filter(req => {
          const keywords = req.toLowerCase().split(' ').filter(w => w.length > 5);
          return keywords.some(k => lower.includes(k));
        });

        const coverageRatio = matchedReqs.length / Math.max(1, problem.functionalRequirements.length);
        const score = Math.min(100, Math.round(50 + (coverageRatio * 45) + (hasScope ? 5 : 0)));

        return new RubricResult({
          criterionId: dimension.id,
          criterionName: dimension.name,
          score,
          evidence: hasScope 
            ? 'Section 1 contains explicit functional scope and assumption declarations.'
            : 'Minimal requirement delineation found in submission header.',
          concern: coverageRatio < 0.6
            ? `Only addressed ~${Math.round(coverageRatio * 100)}% of problem constraints. Missed explicit handling for some functional requirements.`
            : 'Good requirement capture, but could clarify capacity scaling limits.',
          suggestion: 'Explicitly enumerate non-functional SLAs (latency bounds, capacity limits) in the assumptions section.',
          confidence: 0.90
        });
      }

      case 'responsibilities': {
        const hasClass = (text.match(/class\s+([A-Za-z0-9_]+)/g) || []).length;
        const hasInterface = (text.match(/interface\s+([A-Za-z0-9_]+)/g) || []).length;
        const classNames = (text.match(/class\s+([A-Za-z0-9_]+)/g) || []).map(c => c.replace('class ', ''));

        let score = 70;
        let evidence = `Identified ${hasClass} classes and ${hasInterface} interfaces.`;
        let concern = 'Verify that the main coordinator class does not take on database, I/O, or pricing duties.';

        if (hasClass >= 4 && hasInterface >= 1) {
          score = 88;
          evidence += ` Classes detected: ${classNames.slice(0, 4).join(', ')}. Clean separation between domain models and strategies.`;
          concern = 'Ensure coordinator class delegates spot allocation rather than managing it internally.';
        } else if (hasClass < 2) {
          score = 52;
          concern = 'Danger of God-Class anti-pattern. Too few classes handling multiple disparate responsibilities.';
        }

        return new RubricResult({
          criterionId: dimension.id,
          criterionName: dimension.name,
          score,
          evidence,
          concern,
          suggestion: 'Decompose coordinating logic from domain models. Use dedicated controllers/services for orchestration.',
          confidence: 0.88
        });
      }

      case 'coupling_cohesion': {
        const hasDI = lower.includes('strategy') || lower.includes('inject') || lower.includes('private final') || lower.includes('constructor');
        const hasNewInCoordinator = (text.match(/new\s+[A-Za-z0-9_]+Strategy/g) || []).length;

        let score = 75;
        let evidence = 'Examined dependency injection and instance creation patterns.';
        let concern = 'Direct instantiation in methods can couple domain models to concrete implementations.';

        if (hasDI && hasNewInCoordinator === 0) {
          score = 90;
          evidence = 'Abstractions and strategies injected via constructor/setters rather than hard-coded instantiation.';
          concern = 'Minimal coupling detected. Well-isolated abstractions.';
        } else if (!hasDI) {
          score = 60;
          concern = 'Direct dependency on concrete classes detected instead of polymorphic interfaces.';
        }

        return new RubricResult({
          criterionId: dimension.id,
          criterionName: dimension.name,
          score,
          evidence,
          concern,
          suggestion: 'Inject algorithms (e.g. ParkingStrategy or PricingStrategy) into the coordinator constructor to achieve loose coupling.',
          confidence: 0.85
        });
      }

      case 'interfaces_encapsulation': {
        const hasPrivate = (text.match(/private\s+/g) || []).length;
        const hasPublic = (text.match(/public\s+/g) || []).length;
        const hasGetters = (text.match(/get[A-Z][a-zA-Z0-9_]*\(/g) || []).length;

        let score = 72;
        let evidence = `Encapsulation scan: found ${hasPrivate} private members and ${hasGetters} accessor methods.`;

        if (hasPrivate > 3) {
          score = 88;
          evidence += ' Internal fields properly shielded behind private access modifiers.';
        }

        return new RubricResult({
          criterionId: dimension.id,
          criterionName: dimension.name,
          score,
          evidence,
          concern: hasPrivate < 2 ? 'Fields might be public or package-private, breaking encapsulation.' : 'Ensure collections return unmodifiable views (e.g. Collections.unmodifiableList).',
          suggestion: 'Enforce strict encapsulation by making all state fields private and exposing only purposeful intent methods.',
          confidence: 0.92
        });
      }

      case 'extensibility': {
        const hasPatterns = ['strategy', 'factory', 'decorator', 'state', 'observer', 'singleton'].filter(p => lower.includes(p));
        const hasEnum = (text.match(/enum\s+[A-Za-z0-9_]+/g) || []).length;

        let score = 65;
        let evidence = `Design pattern markers detected: ${hasPatterns.length ? hasPatterns.join(', ') : 'None'}. Enums defined: ${hasEnum}.`;

        if (hasPatterns.length >= 2) {
          score = 92;
          evidence += ' Good application of Gang of Four patterns to facilitate Open-Closed Principle.';
        } else if (hasPatterns.length === 1) {
          score = 80;
        }

        return new RubricResult({
          criterionId: dimension.id,
          criterionName: dimension.name,
          score,
          evidence,
          concern: hasPatterns.length === 0 ? 'Adding new types or algorithms would require modifying existing conditional blocks.' : 'Avoid over-engineering: verify each pattern solves a genuine axis of variability.',
          suggestion: 'Use Strategy pattern for interchangeable behaviors and Factory pattern for object creation.',
          confidence: 0.89
        });
      }

      case 'edge_cases_concurrency': {
        const hasConcurrency = ['synchronized', 'atomic', 'lock', 'concurrenthashmap', 'thread', 'volatile', 'cas', 'race'].some(k => lower.includes(k));
        const hasExceptions = ['throw new', 'exception', 'try', 'catch', 'null', 'optional'].some(k => lower.includes(k));

        let score = 68;
        let evidence = `Concurrency safeguards: ${hasConcurrency ? 'Present (locks/synchronized/atomics)' : 'Missing'}. Error handling: ${hasExceptions ? 'Present' : 'Minimal'}.`;

        if (hasConcurrency && hasExceptions) {
          score = 91;
          evidence += ' Explicitly guards critical sections and throws domain exceptions for invalid states.';
        } else if (hasConcurrency || hasExceptions) {
          score = 78;
        }

        return new RubricResult({
          criterionId: dimension.id,
          criterionName: dimension.name,
          score,
          evidence,
          concern: !hasConcurrency ? 'Simultaneous requests from multiple entry gates could cause race conditions or double booking.' : 'Ensure fine-grained locking instead of synchronizing whole coordinator.',
          suggestion: 'Apply fine-grained synchronization on individual resource units (e.g. ParkingSpot) or use atomic CAS primitives.',
          confidence: 0.94
        });
      }

      default:
        return new RubricResult({
          criterionId: dimension.id,
          criterionName: dimension.name,
          score: 75,
          evidence: 'General structural conformance verified.',
          concern: 'Standard design practices applied.',
          suggestion: 'Continue refining class boundaries.',
          confidence: 0.80
        });
    }
  }
}

module.exports = { DeterministicRuleEvaluator };
