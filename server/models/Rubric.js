// server/models/Rubric.js

/**
 * Core Rubric Dimension definition.
 * A dimension represents one of the foundational low-level design pillars.
 */
class RubricDimension {
  constructor({ id, name, description, weight = 1.0, guidance = {} }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.weight = weight;
    this.guidance = guidance; // expectations for excellent, fair, poor
  }
}

/**
 * Rubric aggregates multiple dimensions and provides default scoring criteria.
 */
class Rubric {
  constructor(id, name, dimensions = []) {
    this.id = id;
    this.name = name;
    this.dimensions = dimensions;
  }

  static createDefaultRubric() {
    return new Rubric('standard-lld-rubric-v1', 'Standard LLD Assessment Rubric', [
      new RubricDimension({
        id: 'requirements',
        name: 'Requirement Understanding & Scoping',
        description: 'Demonstrates deep comprehension of functional limits, assumptions, constraints, and capacity boundaries.',
        weight: 1.0,
        guidance: {
          excellent: 'Explicitly calls out vehicle types, multi-floor scaling, spot allocation rules, and concurrency bottlenecks.',
          poor: 'Omits core requirements or assumes unlimited resources without bounding the scope.'
        }
      }),
      new RubricDimension({
        id: 'responsibilities',
        name: 'Class Responsibilities & SRP',
        description: 'Single Responsibility Principle adherence. Classes should have one reason to change; avoiding monolithic God classes.',
        weight: 1.2,
        guidance: {
          excellent: 'Separates coordination, entity state, pricing strategies, and display/hardware controllers into distinct classes.',
          poor: 'God class handles spot reservation, fee calculation, receipt printing, and hardware sensors.'
        }
      }),
      new RubricDimension({
        id: 'coupling_cohesion',
        name: 'Coupling & High Cohesion',
        description: 'Modules are self-contained and loosely coupled through clean abstraction boundaries.',
        weight: 1.1,
        guidance: {
          excellent: 'Classes depend on abstractions, using dependency injection for strategies or repositories.',
          poor: 'Tight direct instantiation between domain entities and low-level helpers.'
        }
      }),
      new RubricDimension({
        id: 'interfaces_encapsulation',
        name: 'Encapsulation & Interface Segregation',
        description: 'Clean public API surfaces, data hiding, and client-specific interfaces (ISP).',
        weight: 1.0,
        guidance: {
          excellent: 'Public methods expose only high-level intents; internal state is strictly private or immutable.',
          poor: 'Public fields exposed or leaky getters/setters allowing external mutation of collections.'
        }
      }),
      new RubricDimension({
        id: 'extensibility',
        name: 'Extensibility & Appropriate Patterns',
        description: 'Open-Closed Principle (OCP). Ease of adding new features (e.g. EV charging spots, surge pricing) without code rewrite.',
        weight: 1.2,
        guidance: {
          excellent: 'Employs Strategy, Factory, or State patterns appropriately where variability exists.',
          poor: 'Uses massive switch/if-else statements when introducing new entity variants.'
        }
      }),
      new RubricDimension({
        id: 'edge_cases_concurrency',
        name: 'Edge Cases & Concurrency Awareness',
        description: 'Handling resource contention, double-booking, race conditions, and boundary validation.',
        weight: 1.0,
        guidance: {
          excellent: 'Considers race conditions on the last available spot, thread-safety, or idempotent entry/exit.',
          poor: 'Assumes single-threaded synchronous operation with no capacity exhaustion checks.'
        }
      })
    ]);
  }
}

module.exports = { Rubric, RubricDimension };
