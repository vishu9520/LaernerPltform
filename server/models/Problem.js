// server/models/Problem.js
const { Rubric } = require('./Rubric');

class Problem {
  constructor({
    id,
    title,
    difficulty,
    category,
    summary,
    functionalRequirements = [],
    nonFunctionalRequirements = [],
    constraints = [],
    starterTemplate = {},
    sampleSolution = {},
    rubric = null
  }) {
    this.id = id;
    this.title = title;
    this.difficulty = difficulty; // 'Easy', 'Medium', 'Hard'
    this.category = category;
    this.summary = summary;
    this.functionalRequirements = functionalRequirements;
    this.nonFunctionalRequirements = nonFunctionalRequirements;
    this.constraints = constraints;
    this.starterTemplate = starterTemplate;
    this.sampleSolution = sampleSolution;
    this.rubric = rubric || Rubric.createDefaultRubric();
  }

  static getSeedProblems() {
    return [
      new Problem({
        id: 'parking-lot',
        title: 'Design a Multi-Floor Parking Lot System',
        difficulty: 'Medium',
        category: 'Resource Management',
        summary: 'Design an automated multi-level parking structure supporting varied vehicle classes, dynamic allocation algorithms, and multi-point ticket processing.',
        functionalRequirements: [
          'Support multiple floors, each with dedicated capacity and layout.',
          'Accommodate different vehicle types (Motorbike, Compact Car, Large SUV/Truck, Electric Vehicle).',
          'Support distinct parking spot types matching vehicle sizes (Small, Medium, Large, Electric Spot with charging).',
          'Automated entry terminal generates ticket with timestamp and allocated spot.',
          'Automated exit terminal calculates parking fee based on duration and payment strategy.',
          'Real-time display boards at each entrance and floor indicating live availability.'
        ],
        nonFunctionalRequirements: [
          'High concurrency: Multiple entry/exit gates operating simultaneously without double-assigning spots.',
          'Extensibility: Easy to add new pricing models (flat rate, hourly, surge) and vehicle categories.',
          'Fault tolerance: If an entry gate kiosk fails, other gates continue normal operation.'
        ],
        constraints: [
          'A vehicle can only fit in an equivalent or larger spot size.',
          'Spot allocation must be optimized for distance from entrance or floor vacancy.',
          'System must prevent checkout of already validated tickets.'
        ],
        starterTemplate: {
          requirementsAndAssumptions: `### 1. Requirements & Assumptions
- Scope: Multi-floor parking facility with 3 entry gates and 2 exit gates.
- Supported vehicles: Motorcycle, Car, Large Truck, EV.
- Spots: MotorcycleSpot, CompactSpot, LargeSpot, ElectricSpot.
- Pricing: Hourly rates with EV surcharge.
- Concurrency: Multiple gates issuing tickets simultaneously.`,
          classDesignAndContracts: `// 2. Class & Interface Contracts
public enum VehicleType { MOTORCYCLE, CAR, TRUCK, ELECTRIC }
public enum SpotType { SMALL, COMPACT, LARGE, ELECTRIC }

public abstract class Vehicle {
    private String licensePlate;
    private VehicleType type;
    // Constructor & Getters
}

public interface ParkingStrategy {
    ParkingSpot findSpot(List<ParkingFloor> floors, Vehicle vehicle);
}

public class NearestToEntranceStrategy implements ParkingStrategy {
    @Override
    public ParkingSpot findSpot(List<ParkingFloor> floors, Vehicle vehicle) {
        // Find nearest matching spot
        return null;
    }
}

public class ParkingSpot {
    private String spotId;
    private SpotType spotType;
    private boolean isOccupied;
    private Vehicle currentVehicle;
    
    public synchronized boolean assignVehicle(Vehicle v) {
        if (!isOccupied && canFit(v)) {
            this.currentVehicle = v;
            this.isOccupied = true;
            return true;
        }
        return false;
    }
    
    public synchronized void vacate() {
        this.currentVehicle = null;
        this.isOccupied = false;
    }
    
    private boolean canFit(Vehicle v) {
        // Logic for vehicle-spot compatibility
        return true;
    }
}

public class Ticket {
    private String ticketId;
    private String spotId;
    private long entryTimestamp;
    private boolean isPaid;
}

public class ParkingLot {
    private List<ParkingFloor> floors;
    private ParkingStrategy parkingStrategy;
    private FeeCalculator feeCalculator;
    
    public Ticket parkVehicle(Vehicle vehicle) {
        ParkingSpot spot = parkingStrategy.findSpot(floors, vehicle);
        if (spot != null && spot.assignVehicle(vehicle)) {
            return new Ticket(spot.getSpotId(), System.currentTimeMillis());
        }
        throw new ParkingLotFullException("No suitable spot available.");
    }
    
    public double exitVehicle(Ticket ticket) {
        // Fee calculation & vacating spot
        return feeCalculator.calculate(ticket);
    }
}`,
          designPatternsAndTradeoffs: `### 3. Design Patterns & Tradeoffs
- Strategy Pattern: Used for ParkingStrategy (NearestToEntrance vs HighestCapacityFirst) to decouple spot allocation algorithms from ParkingLot coordinator.
- Factory Pattern: SpotFactory used for instantiating polymorphic spots based on configuration.
- Trade-off: Synchronizing on individual ParkingSpot instead of the entire ParkingLot prevents global lock contention while preserving thread safety.`,
          edgeCasesAndConcurrency: `### 4. Edge Cases & Concurrency
- Race condition on last vacant spot: Handled via atomic CAS / synchronized assignVehicle method.
- Invalid or already-exited ticket presentation: Ticket marked as used atomically.
- EV charging timeout: Surcharge applied after battery hits 100%.`
        }
      }),

      new Problem({
        id: 'ride-sharing',
        title: 'Design a Ride-Sharing Dispatch Service (Uber/Lyft)',
        difficulty: 'Hard',
        category: 'State Machine & Distributed Allocation',
        summary: 'Design the low-level architecture for matching passengers with nearby drivers, handling lifecycle state transitions, dynamic pricing, and concurrent ride requests.',
        functionalRequirements: [
          'Riders can view upfront fare quotes and request rides of varied tiers (Economy, XL, Premium).',
          'Drivers can go Online/Offline and receive dispatch offers with 15-second acceptance windows.',
          'Dispatch matching algorithm locates optimal nearby active driver based on proximity and rating.',
          'Full ride lifecycle management: REQUESTED -> MATCHING -> ASSIGNED -> ARRIVED -> IN_PROGRESS -> COMPLETED -> CANCELLED.',
          'Dynamic fare calculation combining base rate, per-mile, per-minute, and surge multipliers.'
        ],
        nonFunctionalRequirements: [
          'High throughput: Driver location telemetry streaming continuously.',
          'Atomic matching: A driver cannot be offered or assigned to two rides concurrently.',
          'Low latency dispatch offers within < 500ms.'
        ],
        constraints: [
          'Driver must be within configured radius (e.g. 5km) to qualify for dispatch.',
          'Rider cancellation after driver arrival incurs penalty fee.'
        ],
        starterTemplate: {
          requirementsAndAssumptions: `### 1. Requirements & Assumptions
- Core focus: Dispatch matching engine, Ride state machine, Driver availability.
- Geo indexing assumed abstracted via SpatialIndex/QuadTree interface.
- Support tiers: UberX, UberXL, Black.`,
          classDesignAndContracts: `// 2. Class & Interface Contracts
public enum RideStatus { REQUESTED, MATCHING, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED }
public enum DriverStatus { OFFLINE, AVAILABLE, OFFERED, BUSY }

public interface MatchingStrategy {
    Driver findBestDriver(Location pickup, RideType type, List<Driver> candidateDrivers);
}

public interface PricingStrategy {
    double calculateFare(RideRequest request, double surgeMultiplier);
}

public class Ride {
    private String rideId;
    private Rider rider;
    private Driver driver;
    private Location pickupLocation;
    private Location dropoffLocation;
    private RideStatus status;
    private double finalFare;
    
    public synchronized boolean transitionTo(RideStatus newStatus) {
        // Enforce strict state machine transitions
        if (isValidTransition(this.status, newStatus)) {
            this.status = newStatus;
            return true;
        }
        return false;
    }
}`,
          designPatternsAndTradeoffs: `### 3. Design Patterns & Tradeoffs
- State Pattern: Encapsulates ride lifecycle states and prevents illegal transitions (e.g. COMPLETED -> IN_PROGRESS).
- Strategy Pattern: Pluggable PricingStrategy (PeakHourPricing, FlatPricing) and MatchingStrategy (NearestDriver, HighestRatedDriver).`,
          edgeCasesAndConcurrency: `### 4. Edge Cases & Concurrency
- Simultaneous ride acceptance: Handled via Optimistic Locking on Driver state (CAS: AVAILABLE -> OFFERED).
- Driver timeout on offer: If not accepted in 15 seconds, dispatch cascade triggers next candidate driver.`
        }
      }),

      new Problem({
        id: 'rate-limiter',
        title: 'Design an Extensible In-Memory Rate Limiter',
        difficulty: 'Medium',
        category: 'Algorithm & Concurrency',
        summary: 'Design a high-performance, thread-safe rate limiter supporting multiple algorithms (Token Bucket, Sliding Window Counter, Leaky Bucket) with client-configurable rules.',
        functionalRequirements: [
          'Inspect incoming client requests (keyed by IP, UserID, or API Key) and return allow/reject boolean.',
          'Support multiple algorithms interchangeably: Token Bucket, Sliding Window Log, Fixed Window.',
          'Allow tier-based rate rules (e.g. Free Tier: 60 req/min, Premium: 1000 req/min).',
          'Provide standardized HTTP rate-limit response headers (Remaining, Retry-After, Limit).'
        ],
        nonFunctionalRequirements: [
          'Sub-millisecond latency overhead (< 1ms per check).',
          'Strict thread-safety under hundreds of concurrent threads hitting the same client bucket.',
          'Bounded memory footprint; automated eviction of stale inactive client entries.'
        ],
        constraints: [
          'Must operate in-memory for MVP with interface for Redis cluster expansion.',
          'Cannot drop incoming requests due to internal lock contention.'
        ],
        starterTemplate: {
          requirementsAndAssumptions: `### 1. Requirements & Assumptions
- Support per-client rate limiting based on flexible identification keys.
- Pluggable algorithm engines: TokenBucket and SlidingWindow.
- Automated cleanup of expired tokens/entries.`,
          classDesignAndContracts: `// 2. Class & Interface Contracts
public interface RateLimitAlgorithm {
    RateLimitResult allowRequest(String clientId, int maxRequests, Duration window);
}

public class TokenBucketAlgorithm implements RateLimitAlgorithm {
    private final ConcurrentHashMap<String, TokenBucket> buckets = new ConcurrentHashMap<>();
    
    @Override
    public RateLimitResult allowRequest(String clientId, int maxRequests, Duration window) {
        TokenBucket bucket = buckets.computeIfAbsent(clientId, id -> new TokenBucket(maxRequests, window));
        return bucket.tryConsume();
    }
}

public class TokenBucket {
    private final long capacity;
    private final double refillRatePerSec;
    private double availableTokens;
    private long lastRefillTimestamp;
    
    public synchronized RateLimitResult tryConsume() {
        refill();
        if (availableTokens >= 1.0) {
            availableTokens -= 1.0;
            return new RateLimitResult(true, (long) availableTokens);
        }
        return new RateLimitResult(false, 0);
    }
    
    private void refill() {
        long now = System.currentTimeMillis();
        double elapsedSec = (now - lastRefillTimestamp) / 1000.0;
        availableTokens = Math.min(capacity, availableTokens + (elapsedSec * refillRatePerSec));
        lastRefillTimestamp = now;
    }
}`,
          designPatternsAndTradeoffs: `### 3. Design Patterns & Tradeoffs
- Strategy Pattern: Decouples RateLimitAlgorithm from the interceptor/middleware.
- Decorator / Filter Pattern: Integrates as an HTTP request interceptor.
- Memory Trade-off: Sliding window log offers perfect precision but higher RAM; Token bucket is O(1) space with negligible memory.`,
          edgeCasesAndConcurrency: `### 4. Edge Cases & Concurrency
- Stampede effect / burst traffic: Token bucket naturally absorbs bursts up to capacity.
- Memory leak on infinite one-off IPs: Scheduled background sweeper evicts inactive buckets older than 1 hour.`
        }
      }),

      new Problem({
        id: 'coffee-vending-machine',
        title: 'Design an Automated Coffee Vending Machine',
        difficulty: 'Easy',
        category: 'Object-Oriented Design Patterns',
        summary: 'Design an interactive vending machine dispensing customized espresso beverages, tracking ingredient inventories, accepting payments, and maintaining hardware state.',
        functionalRequirements: [
          'Support core beverages: Espresso, Cappuccino, Latte, Americano.',
          'Support customizable add-ons and condiments (Extra Milk, Sugar, Caramel Syrup, Oat Milk).',
          'Manage physical ingredient levels (Coffee beans, Milk, Water, Sugar) and warn on low supply.',
          'Accept cash and digital card payments with accurate change return.',
          'Full lifecycle states: IDLE -> SELECTING -> ACCEPTING_PAYMENT -> DISPENSING -> MAINTENANCE.'
        ],
        nonFunctionalRequirements: [
          'Accurate price calculation for deeply nested condiment additions.',
          'Safe state transitions: Never dispense without confirmed payment.'
        ],
        constraints: [
          'Cannot dispense if any required ingredient is below recipe threshold.'
        ],
        starterTemplate: {
          requirementsAndAssumptions: `### 1. Requirements & Assumptions
- Beverage customization with stacked condiments.
- Hardware state machine preventing illegal operations.
- Real-time inventory deduction.`,
          classDesignAndContracts: `// 2. Class & Interface Contracts
public interface Coffee {
    String getDescription();
    double getCost();
    Map<Ingredient, Integer> getRecipe();
}

public class BaseCoffee implements Coffee {
    private String name;
    private double cost;
    private Map<Ingredient, Integer> recipe;
    // Implementation
}

public abstract class CoffeeDecorator implements Coffee {
    protected Coffee decoratedCoffee;
    public CoffeeDecorator(Coffee coffee) { this.decoratedCoffee = coffee; }
}

public class MilkDecorator extends CoffeeDecorator {
    public MilkDecorator(Coffee coffee) { super(coffee); }
    @Override
    public String getDescription() { return decoratedCoffee.getDescription() + ", Extra Milk"; }
    @Override
    public double getCost() { return decoratedCoffee.getCost() + 0.50; }
    @Override
    public Map<Ingredient, Integer> getRecipe() {
        Map<Ingredient, Integer> r = new HashMap<>(decoratedCoffee.getRecipe());
        r.put(Ingredient.MILK, r.getOrDefault(Ingredient.MILK, 0) + 50);
        return r;
    }
}`,
          designPatternsAndTradeoffs: `### 3. Design Patterns & Tradeoffs
- Decorator Pattern: Prevents class explosion when combining multiple coffee types with variable condiments (Extra Milk + Caramel + Sugar).
- State Pattern: Encapsulates VendingMachine states (IdleState, DispensingState, MaintenanceState).`,
          edgeCasesAndConcurrency: `### 4. Edge Cases & Concurrency
- Mid-dispense inventory exhaustion: Check inventory BEFORE payment acceptance to avoid refund nightmares.
- User cancellation mid-selection: Returns inserted funds and transitions back to IDLE.`
        }
      })
    ];
  }
}

module.exports = { Problem };
