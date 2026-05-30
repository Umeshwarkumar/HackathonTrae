# ArmorIQ + IntentLock Integration Guide

This document explains how the ArmorIQ SDK integrates with IntentLock as a governance and enforcement layer.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Workflow                        │
│                                                               │
│  git commit → pre-commit hook → verify-intent.js             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              IntentLock Semantic Layer                       │
│         (Semantic Analysis & Drift Detection)                │
│                                                               │
│  • Semantic Analyzer (6 domains)                             │
│  • Drift Detector (7-domain constraint verification)         │
│  • Behavior Extraction                                       │
│  • Violation Detection                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            ArmorIQ Governance Layer                          │
│      (Policy Enforcement & Immutable Audit)                  │
│                                                               │
│  1. registerIntent() - Register contract ID                  │
│  2. enforcePolicy() - Enforce violations / block commit      │
│  3. auditLog() - Store immutable evidence                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   ✅ COMMIT / ⛔ BLOCK
```

## Integration Points

### 1. Intent Contract Registration (registerIntent)

**Purpose:** Register intent contracts with ArmorIQ for governance tracking

**When:** Before semantic analysis runs

**What happens:**
- Contract metadata is extracted
- Unique contract ID is generated
- Association is stored in ArmorIQ

**Example:**
```javascript
const registration = await armorIQ.registerIntent(contract, 'intentlock-verify');
// Returns: { contractId: 'contract-...', registered: true, metadata: {...} }
```

### 2. Policy Enforcement (enforcePolicy)

**Purpose:** Enforce policy decisions based on IntentLock violations

**When:** After drift detection completes

**What happens:**
- Violations are evaluated against policy
- Enforcement decision is made (BLOCK or ALLOW)
- Terminal output shows enforcement action
- Evidence is logged

**Example:**
```javascript
const enforcement = await armorIQ.enforcePolicy({
  violations: driftResult.violations,
  contractId,
  filePath,
  commitMessage
});

// If enforcement.allowed === false → COMMIT BLOCKED
// If enforcement.allowed === true → COMMIT ALLOWED
```

### 3. Immutable Audit Logging (auditLog)

**Purpose:** Store verification evidence in ArmorIQ for compliance

**When:** After enforcement decision

**What happens:**
- Complete verification evidence is captured
- Audit record includes:
  - Contract ID and file path
  - Violations detected
  - Behavior extracted
  - Severity breakdown
  - Timestamp and evidence metadata
- Record is immutable in ArmorIQ

**Example:**
```javascript
const auditResult = await armorIQ.auditLog({
  contractId,
  filePath,
  behavior,
  violations: driftResult.violations,
  safe: driftResult.safe,
  summary: driftResult.summary
});

// Returns: { logged: true, auditId: 'audit-...', record: {...} }
```

## Setup Instructions

### 1. Install Dependencies

```bash
# Install dotenv for environment variable management
npm install dotenv

# The pre-commit hook now automatically loads .env
```

### 2. Configure Environment Variables

Create or update `.env` file in project root:

```bash
# Existing IntentLock config
GEMINI_API_KEY=your_gemini_api_key_here

# New ArmorIQ config
ARMORIQ_API_KEY=your_armoriq_api_key_here
ARMORIQ_API_URL=https://api.armoriq.io/v1
ARMORIQ_CLIENT_ID=intentlock-client
```

### 3. Update .env.example

```bash
GEMINI_API_KEY=your_gemini_api_key_here
ARMORIQ_API_KEY=your_armoriq_api_key_here
ARMORIQ_API_URL=https://api.armoriq.io/v1
ARMORIQ_CLIENT_ID=intentlock-client
```

### 4. Install/Update Pre-Commit Hook

```bash
bash hooks/install-hook.sh
```

The hook now:
- Loads `.env` automatically
- Calls `scripts/verify-intent.js` for each staged file
- Triggers ArmorIQ integration automatically
- Falls back to legacy backend if needed

### 5. Verify Integration

Test the integration with a sample file:

```bash
# Create a test file with violations
cat > test_violation.js << 'EOF'
// This will violate the intent contract
exec("rm -rf /");
user.role = "admin";
EOF

# Test the verification
node scripts/verify-intent.js test_violation.js

# You should see:
# - Semantic analysis output
# - Drift detection results
# - ArmorIQ policy enforcement message
# - Audit logging confirmation
```

## File Structure

```
IntentLock/
├── armoriq-client.js                  # NEW: ArmorIQ SDK wrapper
├── scripts/
│   └── verify-intent.js               # NEW: Orchestration script
├── analyzer/
│   ├── analyzer.js                    # UNCHANGED: Semantic analyzer
│   └── driftDetector.js               # UNCHANGED: Drift detector
├── hooks/
│   └── pre-commit                     # UPDATED: Now calls verify-intent.js
├── backend/
│   ├── main.py                        # UNCHANGED: FastAPI backend
│   └── .env.example                   # UPDATED: Added ARMORIQ_* keys
└── .env                               # NEW: Create from .env.example
```

## Verification Flow Example

```bash
$ git commit -m "Add user authentication"

🔍 IntentLock + ArmorIQ: Scanning staged files...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 IntentLock + ArmorIQ Semantic Verification Running...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Analyzing: src/auth.js
📋 Contract loaded: .intentlock.json
✓ Contract ID: contract-1234567890-abc123def

🔬 Semantic Analysis Phase:
   Extracting: database, filesystem, network, auth, process, api operations

✓ Operations extracted: 5 semantic operations
✓ Dependencies found: 3
✓ Routes detected: 2

🔍 Drift Detection Phase:
   Comparing behavior against intent constraints

✓ Analysis complete
✓ Violations: 0
✓ Safe: YES ✅

🛡  Policy Enforcement Phase:

✅ Policy Enforcement: COMMIT ALLOWED

📊 Audit Logging Phase:

📜 ArmorIQ: Storing immutable audit evidence...
   Audit ID: audit-1234567890-abc123def
   Status: ✅ COMPLIANT
   Violations: 0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ COMMIT ALLOWED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Code verified compliant with intent contract.
```

## Disabling ArmorIQ Integration (Optional)

If you want to disable ArmorIQ temporarily:

**Option 1: Remove ARMORIQ_API_KEY from .env**
```bash
# Comment out or remove from .env
# ARMORIQ_API_KEY=your_key_here
```

The system will:
- Continue running semantic verification
- Show warning: "ArmorIQ API key not configured"
- Skip governance and audit logging
- IntentLock semantic verification still works

**Option 2: Use legacy backend verification**

The updated pre-commit hook has fallback logic. If `scripts/verify-intent.js` is not found, it will use the backend directly.

## Integration Points in Code

### armoriq-client.js
- `registerIntent()` - INTEGRATION POINT 1
- `enforcePolicy()` - INTEGRATION POINT 2
- `auditLog()` - INTEGRATION POINT 3

### scripts/verify-intent.js
- Step 1: Load code and contract
- Step 2: Semantic analysis (calls `analyzer.js`)
- Step 3: Drift detection (calls `driftDetector.js`)
- Step 4: Register with ArmorIQ
- Step 5: Enforce policy with ArmorIQ
- Step 6: Log audit with ArmorIQ

### hooks/pre-commit
- Loads .env for environment variables
- Calls `verify-intent.js` for each staged file
- Fallback to legacy backend if needed

## Important Notes

### What Remains Unchanged

- ✅ Semantic operation analysis (analyzer.js)
- ✅ Drift detection logic (driftDetector.js)
- ✅ FastAPI backend (main.py)
- ✅ Dashboard UI (dashboard/index.html)
- ✅ Existing audit database (intentlock_audit.db)

### What Is New

- 🆕 ArmorIQ governance layer (armoriq-client.js)
- 🆕 Verification orchestrator (scripts/verify-intent.js)
- 🆕 Environment configuration (ARMORIQ_* variables)

### Design Principles

1. **Non-invasive:** ArmorIQ wraps around existing logic, doesn't replace it
2. **Modular:** Integration points are clearly marked in code
3. **Graceful Degradation:** Works with or without ArmorIQ API key
4. **Enterprise-Ready:** Async/await, error handling, logging
5. **Compliance-Focused:** Immutable audit trails for governance

## Troubleshooting

### ArmorIQ integration not running

**Check 1:** Verify ARMORIQ_API_KEY is set
```bash
grep ARMORIQ_API_KEY .env
```

**Check 2:** Verify scripts/verify-intent.js exists
```bash
ls -la scripts/verify-intent.js
```

**Check 3:** Verify pre-commit hook is executable
```bash
ls -la .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Audit logging failing

Check that `.env` is being loaded:
```bash
cat .env | grep ARMORIQ
```

### Verification taking too long

The orchestrator runs all phases sequentially:
1. Semantic analysis
2. Drift detection
3. ArmorIQ registration
4. ArmorIQ enforcement
5. ArmorIQ audit logging

This is by design for comprehensive governance tracking.

## Next Steps

1. Add your ARMORIQ_API_KEY to `.env`
2. Run `bash hooks/install-hook.sh` to update the pre-commit hook
3. Make a git commit to trigger the integration
4. Check the terminal output for ArmorIQ integration points

---

For more information on the underlying IntentLock system, see [README.md](README.md)
