# ArmorIQ Integration Architecture

This document explains how ArmorIQ integrates with IntentLock as a non-invasive governance layer.

## Design Philosophy

**Separation of Concerns:**
- **IntentLock = Intelligence Layer** — Semantic analysis and drift detection
- **ArmorIQ = Governance Layer** — Policy enforcement and immutable audit trails

**Key Principle:** ArmorIQ wraps around IntentLock, it does NOT replace any verification logic.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                  Developer (git commit)                       │
└──────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│            Pre-Commit Hook (hooks/pre-commit)                │
│  • Loads .env configuration                                  │
│  • Passes staged files to verify-intent.js                   │
│  • Returns exit code (0=allow, 1=block)                      │
└──────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│        Verification Orchestrator (verify-intent.js)          │
│  • Coordinates entire verification pipeline                  │
│  • Sequence:                                                 │
│    1. Load code and intent contract                          │
│    2. Register contract with ArmorIQ                         │
│    3. Call semantic analyzer                                 │
│    4. Call drift detector                                    │
│    5. Enforce policy with ArmorIQ                            │
│    6. Store audit log with ArmorIQ                           │
│    7. Return decision (block/allow)                          │
└──────────────────────────────────────────────────────────────┘
         ↙                      ↓                      ↘
    ┌────────┐         ┌────────────┐         ┌────────────┐
    │analyzer│         │  detector  │         │ armoriq    │
    └────────┘         └────────────┘         └────────────┘
         ↓                      ↓                      ↓
    semantic ops          violations          enforcement
    detected              generated           & audit log
```

## Component Interaction Flow

### Phase 1: Initialization
```
verify-intent.js
    ↓
Load code file
    ↓
Load intent contract (or use defaults)
    ↓
Create ArmorIQClient instance
    ↓ [INTEGRATION POINT 1: registerIntent]
ArmorIQ registers contract
    ↓ (returns contractId)
Continue to analysis phase
```

### Phase 2: Semantic Analysis (IntentLock)
```
ArmorIQClient (ready with contractId)
    ↓
Call analyzeBehavior(code) from analyzer.js
    ↓ [UNCHANGED - IntentLock pure logic]
Extract semantic operations:
  • Database: DELETE, UPDATE, INSERT, SELECT
  • Filesystem: fs.rm, fs.readFile, fs.writeFile
  • Network: fetch, axios, http requests
  • Auth: role assignments, privilege escalation
  • Process: exec, spawn, shell commands
  • API: route definitions
    ↓ (returns behavior object with semantic_operations)
Continue to drift detection phase
```

### Phase 3: Drift Detection (IntentLock)
```
Call detectDrift(contract, behavior) from driftDetector.js
    ↓ [UNCHANGED - IntentLock pure logic]
Compare against intent constraints:
  • Legacy forbidden_actions checks
  • Database drift detection
  • Filesystem drift detection
  • Network drift detection
  • Auth drift detection
  • Process drift detection
  • API drift detection
  • Risk level checking
    ↓ (returns violations array, safe flag, summary)
Continue to governance phase
```

### Phase 4: Governance (ArmorIQ)
```
[INTEGRATION POINT 2: enforcePolicy]
ArmorIQ evaluates violations
    ↓
Decision: shouldBlock = violations.length > 0
    ↓
If violations: Display enforcement message
    ↓
[INTEGRATION POINT 3: auditLog]
Store complete verification evidence:
  • Contract ID
  • File path
  • Extracted behavior
  • Violations detected
  • Severity breakdown
  • Timestamp
  • Evidence metadata
    ↓ (returns auditId)
Continue to final decision
```

### Phase 5: Decision
```
Exit code = shouldBlock ? 1 : 0
    ↓
Git hook receives exit code
    ↓
Exit 0 → ✅ COMMIT ALLOWED
Exit 1 → ⛔ COMMIT BLOCKED
```

## File Organization

### Core Logic (UNCHANGED)
```
analyzer/
├── analyzer.js          # Semantic operation extraction
│   ├── analyzeBehavior(code)
│   ├── 6 semantic domains
│   ├── 40+ regex patterns
│   └── Returns: {routes, network_calls, ..., semantic_operations}
│
└── driftDetector.js     # Violation detection
    ├── detectDrift(contract, behavior)
    ├── 7 domain drift detection
    ├── Intent constraint evaluation
    └── Returns: {violations, safe, summary, severity_breakdown}
```

### Governance Layer (NEW)
```
armoriq-client.js       # ArmorIQ SDK wrapper
├── ArmorIQClient class
├── registerIntent()    # INTEGRATION POINT 1
├── enforcePolicy()     # INTEGRATION POINT 2
├── auditLog()          # INTEGRATION POINT 3
└── Helper methods

scripts/
└── verify-intent.js    # Orchestration
    ├── Load code and contract
    ├── Register with ArmorIQ
    ├── Call analyzer
    ├── Call detector
    ├── Enforce policy
    ├── Store audit log
    └── Return exit code
```

### Configuration (NEW)
```
.env                    # Environment variables
├── GEMINI_API_KEY      # For contract generation
├── ARMORIQ_API_KEY     # For ArmorIQ integration
├── ARMORIQ_API_URL     # ArmorIQ endpoint
└── ARMORIQ_CLIENT_ID   # Client identifier

package.json            # Node dependencies
├── dotenv              # .env loading
└── Scripts
    ├── verify
    ├── test:analyzer
    ├── test:detector
    └── test:all
```

### Git Integration (UPDATED)
```
hooks/pre-commit        # Updated to call verify-intent.js
├── Load .env
├── For each staged file:
│   ├── Call verify-intent.js
│   ├── Check exit code
│   └── Collect violations
├── Display summary
└── Exit with 0 or 1
```

## Three Integration Points

### 1. registerIntent() — Contract Registration

**When:** Before semantic analysis

**What happens:**
```javascript
const registration = await armorIQ.registerIntent(contract);
```

**Input:**
- `contract`: The intent contract object with allowed_routes, allowed_methods, etc.

**Output:**
```javascript
{
  contractId: 'contract-1234567890-abc123def',
  registered: true,
  metadata: {...},
  timestamp: '2026-05-29T...'
}
```

**Purpose:**
- Creates immutable record of intent contract
- Generates unique contract ID
- Associates verification runs with this intent
- Enables audit trail linking

### 2. enforcePolicy() — Violation Enforcement

**When:** After drift detection completes

**What happens:**
```javascript
const enforcement = await armorIQ.enforcePolicy({
  violations: driftResult.violations,
  contractId,
  filePath,
  commitMessage
});
```

**Input:**
- `violations`: Array of violation objects from drift detector
- `contractId`: From registerIntent() call
- `filePath`: File being analyzed
- `commitMessage`: Git commit message

**Output:**
```javascript
{
  enforced: true,
  allowed: false,  // true = allow commit, false = block commit
  evidence: {...},
  timestamp: '2026-05-29T...'
}
```

**Purpose:**
- Evaluate violations against policy
- Make enforcement decision
- Display enforcement evidence in terminal
- Block or allow commits based on severity and policy

### 3. auditLog() — Immutable Audit Trail

**When:** After enforcement decision

**What happens:**
```javascript
const auditResult = await armorIQ.auditLog({
  contractId,
  filePath,
  behavior,
  violations,
  safe,
  summary
});
```

**Input:**
- `contractId`: From registerIntent()
- `filePath`: File analyzed
- `behavior`: Extracted behavior from analyzer.js
- `violations`: Array from drift detector
- `safe`: Boolean result (violations.length === 0)
- `summary`: Human-readable summary

**Output:**
```javascript
{
  logged: true,
  auditId: 'audit-1234567890-abc123def',
  record: {...}
}
```

**Purpose:**
- Store complete verification evidence
- Create immutable record for compliance
- Track severity breakdown
- Link violations to specific operations
- Enable audit trail queries

## Control Flow Example

### Scenario: Malicious Code Committed

```javascript
// test_malicious.js
exec("rm -rf /");
user.role = "admin";
```

### Execution:

1. **registerIntent()**
   ```
   Contract: {
     allowed_routes: [...],
     intent_constraints: {
       allow_shell_execution: false,
       allow_privilege_escalation: false
     }
   }
   ↓
   Returns: { contractId: 'contract-...', registered: true }
   ```

2. **analyzeBehavior()**
   ```
   Extracts:
   [
     {
       domain: 'process',
       action: 'COMMAND_EXECUTION',
       target: 'rm -rf /',
       risk: 'CRITICAL',
       metadata: { destructive: true }
     },
     {
       domain: 'auth',
       action: 'PRIVILEGE_ESCALATION',
       target: 'admin',
       risk: 'CRITICAL',
       metadata: { privilege_level: 'admin' }
     }
   ]
   ```

3. **detectDrift()**
   ```
   Violations detected:
   [
     {
       type: 'semantic_drift',
       severity: 'CRITICAL',
       detail: 'Destructive shell command detected: rm -rf /',
       operation: {...}
     },
     {
       type: 'semantic_drift',
       severity: 'CRITICAL',
       detail: 'Privilege escalation not allowed',
       operation: {...}
     }
   ]
   ```

4. **enforcePolicy()**
   ```
   Input:
   {
     violations: [2 CRITICAL violations],
     contractId: 'contract-...',
     filePath: 'test_malicious.js'
   }
   ↓
   Output:
   {
     enforced: true,
     allowed: false,  ← BLOCK COMMIT
     evidence: {...}
   }
   ↓
   Terminal output:
   🚫 Policy Enforcement: COMMIT BLOCKED
   ```

5. **auditLog()**
   ```
   Stores:
   {
     contractId: 'contract-...',
     filePath: 'test_malicious.js',
     violations: [2 CRITICAL],
     safe: false,
     summary: '2 violation(s) found: 2 critical',
     severity_breakdown: {
       CRITICAL: 2,
       HIGH: 0,
       MEDIUM: 0,
       LOW: 0
     }
   }
   ↓
   Returns:
   {
     logged: true,
     auditId: 'audit-...'
   }
   ```

6. **Exit Code**
   ```
   return 1  ← Commit blocked
   ```

## Design Principles

### 1. Non-Invasive
- ArmorIQ doesn't modify analyzer.js or driftDetector.js
- Wraps existing logic at the orchestration level
- Could be removed without affecting core verification

### 2. Modular
- Clear separation between intelligence and governance
- Each component has single responsibility
- Integration points explicitly marked

### 3. Graceful Degradation
- Works without ARMORIQ_API_KEY set
- Falls back to semantic verification only
- No breaking changes if ArmorIQ is unavailable

### 4. Enterprise-Ready
- Async/await for scalability
- Proper error handling and logging
- Immutable audit trails for compliance
- Configuration via environment variables

### 5. Maintainable
- Clear comments at all integration points
- Documented architecture and flow
- Test cases for each component
- Comprehensive guides (ARMORIQ_INTEGRATION.md)

## Extension Points

### Future ArmorIQ Features

**Policy Templates:**
```javascript
// Future: Pre-defined policies
const strictPolicy = armorIQ.getTemplate('strict-security');
const regularPolicy = armorIQ.getTemplate('standard-development');
```

**Severity Overrides:**
```javascript
// Future: Custom severity mapping
const enforcement = await armorIQ.enforcePolicy({
  violations,
  contractId,
  severityThreshold: 'HIGH'  // Only block CRITICAL/HIGH
});
```

**Webhook Notifications:**
```javascript
// Future: Send violations to webhook
await armorIQ.notifyWebhook({
  auditId,
  violations,
  severity: 'CRITICAL'
});
```

**Policy History:**
```javascript
// Future: Retrieve previous policies
const history = await armorIQ.getPolicyHistory(contractId);
```

## Testing the Integration

### Unit Test: ArmorIQ Client
```bash
# Test ArmorIQ functionality in isolation
node -e "
  const { ArmorIQClient } = require('./armoriq-client');
  const client = new ArmorIQClient('test-key');
  console.log(client.getStatus());
"
```

### Integration Test: Full Pipeline
```bash
# Test complete flow with violations
node scripts/verify-intent.js test_malicious.js

# Expected:
# - Contract registration logged
# - Semantic analysis logged
# - Drift detection logged
# - Policy enforcement logged
# - Audit logging logged
# - Exit code 1 (blocked)
```

### E2E Test: Git Hook
```bash
# Test through git workflow
git add test_malicious.js
git commit -m "test"

# Expected: Commit blocked by hook with ArmorIQ output
```

## Conclusion

ArmorIQ integrates seamlessly with IntentLock by:

1. **Registering** intent contracts for immutable tracking
2. **Wrapping** the existing semantic verification
3. **Enforcing** policies based on violations
4. **Auditing** all verification evidence

The architecture maintains the separation of concerns:
- **IntentLock** focuses on "what is the code doing?" (intelligence)
- **ArmorIQ** focuses on "is it allowed?" (governance)

This design enables enterprise deployments while preserving the integrity of the semantic analysis engine.

---

For implementation details, see [ARMORIQ_INTEGRATION.md](ARMORIQ_INTEGRATION.md)
