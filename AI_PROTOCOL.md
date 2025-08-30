# AI Development Protocol

## Version 1.0 - Service Marketplace Platform

This document establishes the mandatory protocol for AI assistants working on the Service Marketplace Platform. All AI agents MUST adhere to these guidelines to ensure consistent, high-quality, and secure development practices.

---

## I. Core Mandate

### Primary Objective
Your primary objective is to assist in building a **scalable, secure, and maintainable AWS-powered marketplace platform** that connects service providers with customers across multiple categories (Services, Spaces, Events, Experiences) with an 8-10% commission structure.

### Fundamental Principles
1. **Tech Stack Adherence**: Strictly maintain the established technology stack
   - Frontend: Next.js 14 (App Router), TypeScript, React 18, Tailwind CSS, Shadcn/UI
   - Backend: AWS Amplify Gen2, AppSync, Cognito, DynamoDB, Lambda, Step Functions
   - Payments: Stripe Connect

2. **Architectural Consistency**: Follow existing patterns and conventions
   - Type-safe data flow using mappers
   - Phased feature rollouts
   - Hybrid client/server-side approach
   - Component-based architecture

3. **Security First**: Every implementation must consider security implications
   - Input validation with Zod
   - Least privilege IAM policies
   - Encrypted data transmission
   - Secure secret management

4. **Performance Optimization**: Consider performance at every level
   - Code splitting and lazy loading
   - Efficient database queries
   - CDN utilization
   - Lambda cold start mitigation

---

## II. Tool Usage Protocol (MCP Integration)

### Mandatory Tool Usage
You MUST utilize the MCP (Model Context Protocol) servers for all applicable tasks. These tools are not optional—they are integral to maintaining project quality and consistency.

### Available MCP Servers

| Server | Purpose | Required For |
|--------|---------|--------------|
| **Sequential-Thinking** | Problem decomposition and planning | ALL complex tasks |
| **Memory** | Project knowledge persistence | ALL architectural decisions |
| **Deepwiki** | AWS/framework documentation | ALL AWS service implementations |
| **Context7** | Real-time library references | ALL library integrations |
| **Playwright** | E2E test generation | ALL user-facing features |
| **MarkItDown** | Documentation conversion | External resource integration |
| **Stripe** | Payment API interaction | ALL payment features |

### Standard Operating Procedures (SOPs)

#### SOP-001: New Feature Implementation

**MANDATORY SEQUENCE:**

1. **CLARIFY** - Gather Requirements
   ```
   - Ask specific questions about:
     * User roles affected (Provider/Customer/Admin)
     * Data models required
     * API endpoints needed
     * UI/UX specifications
     * Performance requirements
     * Security considerations
   ```

2. **PLAN** - Use Sequential-Thinking
   ```
   Command: sequential-thinking
   Input: "Plan implementation of [feature name] with considerations for:
           - Existing architecture patterns
           - Database schema changes
           - API modifications
           - Frontend components
           - Testing requirements"
   ```

3. **RECALL** - Query Memory
   ```
   Command: memory search "[relevant keywords]"
   Examples:
   - memory search "booking implementation"
   - memory search "payment processing"
   - memory search "authentication flow"
   ```

4. **RESEARCH** - Fetch Documentation
   ```
   Commands:
   - deepwiki fetch "AWS Amplify Gen2 [specific topic]"
   - context7 "Next.js 14 [specific pattern]"
   - markitdown "[external documentation URL]"
   ```

5. **ARCHITECT** - Design Solution
   - Define data models with TypeScript interfaces
   - Plan GraphQL schema modifications
   - Design component hierarchy
   - Identify reusable patterns

6. **CODE** - Implement Feature
   ```typescript
   // Follow existing patterns from memory
   // Use type-safe implementations
   // Include proper error handling
   // Add comprehensive comments for complex logic
   ```

7. **TEST** - Generate Tests
   ```
   Command: playwright generate "[user flow description]"
   Example: playwright generate "provider creates service listing with pricing tiers"
   ```

8. **MEMORIZE** - Update Knowledge Base
   ```
   Command: memory create_entities
   Input: {
     "entities": [{
       "name": "[feature_name]_implementation",
       "entityType": "feature",
       "observations": [
         "Implementation approach: [description]",
         "Key components: [list]",
         "API endpoints: [list]",
         "Database changes: [list]"
       ]
     }]
   }
   ```

#### SOP-002: Bug Triage and Resolution

**MANDATORY SEQUENCE:**

1. **UNDERSTAND** - Analyze Bug Report
   ```
   Extract:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Affected components
   - User impact severity
   ```

2. **RECALL** - Retrieve Context
   ```
   Commands:
   - memory search "[affected component]"
   - memory open_nodes ["component_name", "related_feature"]
   ```

3. **PLAN** - Debug Strategy
   ```
   Command: sequential-thinking
   Input: "Debug [issue description] considering:
           - Component dependencies
           - Recent changes
           - Similar past issues
           - Potential root causes"
   ```

4. **INVESTIGATE** - Locate Issue
   - Review relevant code files
   - Check error logs structure
   - Analyze data flow
   - Identify failure point

5. **FIX** - Implement Solution
   ```typescript
   // Document the bug cause in comments
   // Implement fix following existing patterns
   // Add defensive programming where appropriate
   // Include rollback strategy if needed
   ```

6. **VERIFY** - Test Fix
   ```
   Steps:
   1. Manual testing of fix
   2. Update/create unit tests
   3. Generate E2E test: playwright generate "[fixed scenario]"
   4. Verify no regression in related features
   ```

7. **DOCUMENT** - Update Memory
   ```
   Command: memory add_observations
   Input: {
     "observations": [{
       "entityName": "[component_name]",
       "contents": [
         "Bug: [description] - Fixed: [date]",
         "Root cause: [explanation]",
         "Solution: [approach]",
         "Prevention: [future safeguards]"
       ]
     }]
   }
   ```

#### SOP-003: Database Schema Modification

**MANDATORY SEQUENCE:**

1. **ASSESS** - Impact Analysis
   ```
   Command: sequential-thinking
   Input: "Analyze impact of [schema change] on:
           - Existing queries
           - Data migration needs
           - API compatibility
           - Frontend components"
   ```

2. **RESEARCH** - Best Practices
   ```
   Commands:
   - deepwiki fetch "AWS Amplify Gen2 schema evolution"
   - deepwiki fetch "DynamoDB data modeling patterns"
   ```

3. **DESIGN** - Schema Update
   ```graphql
   # Document changes clearly
   # Include migration strategy
   # Maintain backward compatibility
   # Add proper indexes
   ```

4. **MIGRATE** - Data Transformation
   - Write migration scripts
   - Plan rollback procedure
   - Test with sample data
   - Document migration steps

5. **UPDATE** - Related Components
   - Update TypeScript types
   - Modify GraphQL resolvers
   - Adjust frontend queries
   - Update API documentation

6. **MEMORIZE** - Document Changes
   ```
   Command: memory create_relations
   Input: {
     "relations": [{
       "from": "schema_v[X]",
       "to": "schema_v[X+1]",
       "relationType": "evolves_to"
     }]
   }
   ```

#### SOP-004: Performance Optimization

**MANDATORY SEQUENCE:**

1. **MEASURE** - Baseline Metrics
   ```
   Metrics to collect:
   - Page load times
   - API response times
   - Lambda cold starts
   - Database query performance
   ```

2. **ANALYZE** - Identify Bottlenecks
   ```
   Command: sequential-thinking
   Input: "Analyze performance bottlenecks in [component/feature]:
           - Current metrics: [data]
           - Expected performance: [targets]
           - Potential optimizations: [list]"
   ```

3. **RESEARCH** - Optimization Techniques
   ```
   Commands:
   - context7 "Next.js 14 performance optimization"
   - deepwiki fetch "AWS Lambda performance tuning"
   - deepwiki fetch "DynamoDB query optimization"
   ```

4. **IMPLEMENT** - Apply Optimizations
   - Code splitting strategies
   - Caching implementations
   - Query optimizations
   - Asset optimization

5. **VERIFY** - Measure Improvements
   - Compare before/after metrics
   - Run load tests
   - Monitor real user metrics
   - Document improvements

6. **MEMORIZE** - Record Optimizations
   ```
   Command: memory add_observations
   Input: {
     "observations": [{
       "entityName": "performance_optimizations",
       "contents": [
         "[Component]: [optimization] - [improvement%]",
         "Technique: [description]",
         "Trade-offs: [considerations]"
       ]
     }]
   }
   ```

#### SOP-005: Security Vulnerability Response

**CRITICAL - IMMEDIATE ACTION REQUIRED**

1. **ASSESS** - Severity Analysis
   ```
   Classify:
   - CRITICAL: Data breach possible
   - HIGH: Authentication/Authorization bypass
   - MEDIUM: Information disclosure
   - LOW: Minor security improvements
   ```

2. **CONTAIN** - Immediate Mitigation
   ```
   Actions:
   - Disable affected features if CRITICAL
   - Apply temporary patches
   - Update WAF rules
   - Alert team members
   ```

3. **FIX** - Permanent Resolution
   ```
   Command: sequential-thinking
   Input: "Resolve [vulnerability] ensuring:
           - Complete vulnerability remediation
           - No functionality regression
           - Security best practices
           - Audit trail maintenance"
   ```

4. **VERIFY** - Security Testing
   - Penetration testing
   - Security scanning
   - Code review
   - Compliance check

5. **DOCUMENT** - Security Record
   ```
   Command: memory create_entities
   Input: {
     "entities": [{
       "name": "security_incident_[date]",
       "entityType": "security_event",
       "observations": [
         "Vulnerability: [CVE/description]",
         "Severity: [level]",
         "Resolution: [fix applied]",
         "Prevention: [future measures]"
       ]
     }]
   }
   ```

---

## III. Memory Protocol

### Knowledge Graph Management

The Memory server is the **single source of truth** for all project-specific knowledge. You MUST maintain and query it consistently.

#### Required Memory Updates

**CREATE** memory entities for:
- New features or components
- Architectural decisions
- API endpoints
- Database schemas
- Integration patterns
- Security measures

**UPDATE** memory observations for:
- Bug fixes and resolutions
- Performance optimizations
- Configuration changes
- Dependency updates
- Team decisions
- User feedback implementations

**QUERY** memory before:
- Starting any implementation
- Making architectural decisions
- Modifying existing features
- Debugging issues
- Writing documentation

#### Memory Structure Standards

```javascript
// Feature Entity
{
  "name": "feature_[name]",
  "entityType": "feature",
  "observations": [
    "Purpose: [description]",
    "Components: [list]",
    "APIs: [endpoints]",
    "Dependencies: [list]",
    "Owner: [team/person]",
    "Created: [date]"
  ]
}

// Architecture Decision
{
  "name": "decision_[topic]_[date]",
  "entityType": "architecture_decision",
  "observations": [
    "Context: [situation]",
    "Decision: [choice made]",
    "Rationale: [reasoning]",
    "Alternatives: [considered options]",
    "Consequences: [trade-offs]"
  ]
}

// Bug Report
{
  "name": "bug_[component]_[date]",
  "entityType": "bug",
  "observations": [
    "Symptom: [description]",
    "Root cause: [analysis]",
    "Fix: [solution]",
    "Prevention: [measures]",
    "Affected versions: [list]"
  ]
}
```

---

## IV. Code Quality Standards

### TypeScript Requirements

```typescript
// MANDATORY: All code must be strongly typed
interface ServiceListing {
  id: string;
  providerId: string;
  title: string;
  description: string;
  price: {
    amount: number;
    currency: 'USD' | 'EUR' | 'GBP';
    interval?: 'hourly' | 'daily' | 'fixed';
  };
  availability: AvailabilitySlot[];
  rating?: number;
  reviewCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// MANDATORY: Proper error handling
try {
  const result = await processPayment(paymentData);
  return { success: true, data: result };
} catch (error) {
  logger.error('Payment processing failed', { error, paymentData });
  return { success: false, error: error.message };
}

// MANDATORY: Input validation
const bookingSchema = z.object({
  serviceId: z.string().uuid(),
  customerId: z.string().uuid(),
  date: z.date().min(new Date()),
  duration: z.number().positive(),
  notes: z.string().optional()
});
```

### React Component Standards

```tsx
// MANDATORY: Typed props and proper component structure
interface ServiceCardProps {
  service: ServiceListing;
  onBook: (serviceId: string) => void;
  isLoading?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ 
  service, 
  onBook, 
  isLoading = false 
}) => {
  // MANDATORY: Proper hooks usage
  const [isExpanded, setIsExpanded] = useState(false);
  
  // MANDATORY: Memoization for expensive computations
  const formattedPrice = useMemo(() => 
    formatCurrency(service.price), [service.price]
  );
  
  // MANDATORY: Proper event handlers
  const handleBookClick = useCallback(() => {
    if (!isLoading) {
      onBook(service.id);
    }
  }, [service.id, onBook, isLoading]);
  
  return (
    // MANDATORY: Semantic HTML and accessibility
    <article 
      className="service-card"
      aria-label={`Service: ${service.title}`}
    >
      {/* Component implementation */}
    </article>
  );
};
```

### GraphQL Schema Standards

```graphql
# MANDATORY: Clear type definitions with descriptions
type Service @model @auth(rules: [
  { allow: owner, ownerField: "providerId" },
  { allow: public, operations: [read] },
  { allow: groups, groups: ["Admins"] }
]) {
  id: ID!
  providerId: ID! @index(name: "byProvider")
  title: String!
  description: String!
  category: ServiceCategory! @index(name: "byCategory")
  price: Price!
  availability: [TimeSlot]
  rating: Float
  reviewCount: Int @default(value: "0")
  status: ServiceStatus! @index(name: "byStatus")
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

# MANDATORY: Enums for controlled values
enum ServiceStatus {
  DRAFT
  ACTIVE
  PAUSED
  ARCHIVED
}
```

---

## V. Testing Requirements

### Test Coverage Minimums

- **Unit Tests**: 80% coverage for utilities and helpers
- **Integration Tests**: All API endpoints must have tests
- **E2E Tests**: All critical user journeys must be covered

### E2E Test Generation Protocol

```bash
# MANDATORY: Generate E2E tests for all user-facing features
playwright generate "Provider creates new service listing with:
  - Multiple pricing tiers
  - Weekly availability schedule
  - Service images upload
  - Category selection
  - Location setting"

playwright generate "Customer books service with:
  - Date and time selection
  - Payment method choice
  - Coupon code application
  - Booking confirmation
  - Email notification"
```

### Test Documentation

```typescript
// MANDATORY: Descriptive test names and comments
describe('BookingService', () => {
  describe('createBooking', () => {
    it('should create a booking with valid data and send notifications', async () => {
      // Arrange: Set up test data
      const bookingData = createMockBookingData();
      
      // Act: Execute the function
      const result = await bookingService.createBooking(bookingData);
      
      // Assert: Verify outcomes
      expect(result.success).toBe(true);
      expect(result.booking).toMatchObject(bookingData);
      expect(notificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'BOOKING_CONFIRMATION',
          recipientId: bookingData.customerId
        })
      );
    });
    
    it('should handle payment failures gracefully', async () => {
      // Test implementation
    });
  });
});
```

---

## VI. Documentation Standards

### Code Documentation

```typescript
/**
 * Processes a payment using Stripe Connect with platform fee splitting
 * 
 * @param payment - Payment details including amount and destination
 * @param options - Optional configuration for payment processing
 * @returns Promise resolving to payment result or error
 * 
 * @example
 * const result = await processPayment({
 *   amount: 10000, // $100.00 in cents
 *   currency: 'USD',
 *   providerId: 'provider_123',
 *   customerId: 'customer_456'
 * });
 * 
 * @throws {PaymentError} When payment processing fails
 * @throws {ValidationError} When input validation fails
 */
export async function processPayment(
  payment: PaymentRequest,
  options?: PaymentOptions
): Promise<PaymentResult> {
  // Implementation
}
```

### README Updates

When implementing features, update relevant documentation:

1. **Feature Documentation**: Add to feature list
2. **API Documentation**: Document new endpoints
3. **Configuration**: Document new environment variables
4. **Development Guide**: Update workflows if changed

---

## VII. Git Commit Standards

### Commit Message Format

```
type(scope): subject

body

footer
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **perf**: Performance improvement
- **refactor**: Code refactoring
- **test**: Test additions/modifications
- **docs**: Documentation updates
- **style**: Code style changes
- **chore**: Maintenance tasks

### Examples

```bash
feat(booking): implement recurring booking functionality

- Add RecurringBooking model to schema
- Implement scheduling logic in Lambda
- Create UI components for recurrence selection
- Add E2E tests for recurring bookings

Closes #123

---

fix(payment): resolve commission calculation error

Commission was being calculated on gross amount instead of net.
Fixed calculation logic and added unit tests to prevent regression.

Fixes #456
```

---

## VIII. Emergency Protocols

### Production Issue Response

1. **IMMEDIATE**: Assess severity and impact
2. **CONTAIN**: Implement temporary mitigation
3. **COMMUNICATE**: Alert team via appropriate channels
4. **FIX**: Develop and test permanent solution
5. **DEPLOY**: Follow emergency deployment procedure
6. **DOCUMENT**: Create post-mortem in Memory

### Data Breach Response

1. **ISOLATE**: Immediately isolate affected systems
2. **ASSESS**: Determine scope of breach
3. **CONTAIN**: Stop further data exposure
4. **NOTIFY**: Alert security team and stakeholders
5. **REMEDIATE**: Fix vulnerability
6. **AUDIT**: Complete security audit
7. **DOCUMENT**: Comprehensive incident report

---

## IX. Continuous Improvement

### Weekly Review Checklist

- [ ] Query Memory for recent updates
- [ ] Review and update deprecated patterns
- [ ] Check for dependency updates
- [ ] Analyze performance metrics
- [ ] Review security alerts
- [ ] Update documentation

### Knowledge Sharing

After completing significant work:

1. Update Memory with lessons learned
2. Document new patterns discovered
3. Share optimization techniques
4. Record architectural decisions
5. Note tool improvements

---

## X. Tool-Specific Guidelines

### Stripe Integration

```bash
# MANDATORY: Test all payment flows in test mode
stripe create_test_customer
stripe create_test_payment_method
stripe create_test_subscription

# Document all webhook endpoints
memory add_observations {
  "entityName": "stripe_webhooks",
  "contents": [
    "payment_intent.succeeded: /api/webhooks/payment-success",
    "account.updated: /api/webhooks/account-update",
    "subscription.created: /api/webhooks/subscription-created"
  ]
}
```

### AWS Resource Management

```bash
# MANDATORY: Document all AWS resources in Memory
memory create_entities {
  "entities": [{
    "name": "lambda_processPayment",
    "entityType": "aws_resource",
    "observations": [
      "Type: Lambda Function",
      "Runtime: Node.js 20.x",
      "Memory: 512MB",
      "Timeout: 30s",
      "VPC: Yes",
      "Purpose: Process Stripe payments with commission splitting"
    ]
  }]
}
```

---

## Appendix A: Quick Reference

### MCP Server Commands

```bash
# Planning and thinking
sequential-thinking "Implement [feature]"

# Memory operations
memory search "keyword"
memory create_entities {...}
memory add_observations {...}
memory read_graph

# Documentation
deepwiki fetch "AWS service topic"
context7 "library specific query"
markitdown "https://external-doc-url"

# Testing
playwright generate "user flow description"

# Payments
stripe create_account
stripe list_customers
```

### Project Structure

```
/
├── amplify/          # AWS backend
├── app/              # Next.js pages
├── components/       # React components
├── lib/              # Utilities
├── hooks/            # Custom hooks
├── test/             # Test suites
└── .vscode/          # IDE configuration
    └── mcp.json      # MCP servers config
```

### Key Files

- `AI_PROTOCOL.md` - This file (AI guidelines)
- `CLAUDE.md` - Project-specific instructions
- `README.md` - Project documentation
- `.vscode/mcp.json` - MCP server configuration
- `amplify/backend.ts` - Backend resources
- `amplify/data/resource.ts` - GraphQL schema

---

## Appendix B: Compliance Checklist

Before submitting any code, ensure:

- [ ] Sequential-thinking used for planning
- [ ] Memory queried for existing patterns
- [ ] Documentation fetched for new services
- [ ] Code follows TypeScript standards
- [ ] Input validation implemented
- [ ] Error handling complete
- [ ] Tests generated/updated
- [ ] Memory updated with changes
- [ ] Security implications considered
- [ ] Performance impact assessed

---

**END OF PROTOCOL**

This protocol is version 1.0 and supersedes all previous instructions. Any updates to this protocol must be documented in Memory with proper versioning.