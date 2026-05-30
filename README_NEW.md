# IntentLock - Phase 2 + REAL ArmorIQ SDK Integration

**IntentLock** is an AI-powered semantic analysis and intent verification system for secure code generation. Phase 2 adds **real ArmorIQ governance layer** for enterprise policy enforcement and immutable audit logging.

## 🎯 What's New: Real ArmorIQ SDK Integration

The `armoriq-client.js` now uses the **REAL @armoriq/sdk** package for genuine governance:

- ✅ **Real Contract Registration** — `client.contracts.register()` creates immutable contract records
- ✅ **Real Policy Enforcement** — `client.policies.enforce()` evaluates violations against registered policies
- ✅ **Real Immutable Audit Logging** — `client.audit.log()` stores tamper-proof audit evidence
- ✅ **Real API Connectivity** — Authenticates with actual ArmorIQ service via API key

**Status:** Framework complete with real SDK methods. Ready for production use with valid ArmorIQ credentials.

---

## 📋 Quick Start (5 Minutes)

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `@armoriq/sdk` (^0.3.3) — REAL ArmorIQ governance SDK
- `dotenv` (^17.4.2) — Environment configuration

### 2. Configure API Key

```bash
# Copy example to .env
cp backend/.env.example .env

# Edit .env and add your REAL ArmorIQ API key
ARMORIQ_API_KEY=your_real_api_key_here
```

Get your key from [https://console.armoriq.io/api-keys](https://console.armoriq.io/api-keys)

### 3. Test Real Integration

```bash
# Verify with safe code (expect exit 0)
node scripts/verify-intent.js test/safe_code.js

# Verify with violations (expect exit 1)
node scripts/verify-intent.js test/malicious_code.js
```

Expected output includes:
```
✓ Contract registered: contract-... (REAL ArmorIQ contract ID)
🛡  ArmorIQ: Evaluating policy enforcement...
📜 ArmorIQ: Storing immutable audit evidence...
   Audit ID: audit-... (REAL immutable audit ID from ArmorIQ)
```

---

## 🏗️ Three-Layer Architecture

```
┌────────────────────────────────────────┐
│  Layer 3: ArmorIQ Governance Layer     │
│  ├─ registerIntent()                  │
│  ├─ enforcePolicy() ← Uses REAL SDK   │
│  └─ auditLog()     ← Uses REAL SDK    │
│                                        │
│  [REAL API calls to ArmorIQ service]  │
└────────────────────────────────────────┘
               ↑
┌────────────────────────────────────────┐
│  Layer 2: Orchestration                │
│  ├─ scripts/verify-intent.js          │
│  └─ Coordinates semantic + governance │
└────────────────────────────────────────┘
               ↑
┌────────────────────────────────────────┐
│  Layer 1: IntentLock Intelligence      │
│  ├─ analyzer.js (6 semantic domains)  │
│  ├─ driftDetector.js (policy check)   │
│  └─ (UNCHANGED - NOT modified)         │
└────────────────────────────────────────┘
```

**Key Principle:** ArmorIQ wraps around IntentLock's existing semantic analysis without modifying it.

---

## 📊 Real SDK Integration Points

### INTEGRATION POINT 1: Contract Registration

**What it does:**
- Registers intent contract with REAL ArmorIQ service
- Creates immutable record linked to git commits
- Returns real contract ID for policy enforcement

**Real SDK Method:**
```javascript
const response = await client.contracts.register({
  name: 'intentlock-...',
  metadata: { /* contract details */ },
  tags: ['intentlock', 'ai-verification']
});
// response.id = REAL contract ID from ArmorIQ
```

**When used:**
- Before semantic analysis
- Once per code file verification

---

### INTEGRATION POINT 2: Policy Enforcement

**What it does:**
- Sends violations to REAL ArmorIQ policy engine
- Evaluates against registered contract constraints
- Returns enforcement decision (ALLOW/BLOCK)

**Real SDK Method:**
```javascript
const decision = await client.policies.enforce({
  contractId: 'contract-...',
  violations: [...detected violations...],
  resource: 'file.js'
});
// decision.blocked = true if violations exceed thresholds
```

**When used:**
- After drift detection
- Determines if commit is allowed

---

### INTEGRATION POINT 3: Immutable Audit Logging

**What it does:**
- Sends audit evidence to REAL ArmorIQ immutable store
- Creates tamper-proof record for compliance
- Returns immutable audit ID

**Real SDK Method:**
```javascript
const audit = await client.audit.log({
  contractId: 'contract-...',
  evidence: {
    violations: [...],
    severityBreakdown: {...},
    behavior: {...},
    timestamp: new Date().toISOString()
  }
});
// audit.id = REAL immutable audit ID from ArmorIQ
```

**When used:**
- After enforcement decision
- Regardless of allow/block outcome
- Creates forensic trail

---

## 🔧 Git Hook Integration

The pre-commit hook now calls verify-intent.js with REAL ArmorIQ integration:

```bash
# Install hook
sh hooks/install-hook.sh

# When you commit:
git commit -m "Add feature"

# Hook runs:
node scripts/verify-intent.js staged_file.js

# With REAL ArmorIQ SDK:
# 1. Registers contract ← REAL API
# 2. Analyzes behavior ← IntentLock (unchanged)
# 3. Detects drift ← IntentLock (unchanged)
# 4. Enforces policy ← REAL ArmorIQ API
# 5. Logs audit ← REAL ArmorIQ immutable store

# Result: ✅ ALLOW or ⛔ BLOCK
```

---

## 🧪 Testing the REAL Integration

### Test with Safe Code

```bash
# Create safe code
cat > test_safe.js << 'EOF'
function add(a, b) {
  return a + b;
}
EOF

# Run verification
node scripts/verify-intent.js test_safe.js

# Expected:
# ✅ COMMIT ALLOWED
# ✨ Code verified compliant with intent contract.
```

### Test with Violations

```bash
# Create code with violations
cat > test_violation.js << 'EOF'
exec("rm -rf /");
EOF

# Run verification
node scripts/verify-intent.js test_violation.js

# Expected:
# ⛔ COMMIT BLOCKED
# 📋 Violations Summary:
#    1. [CRITICAL] unauthorized_operation
#       → Shell command execution detected
```

### Check REAL SDK Status

```bash
# Verify SDK is installed and API key is loaded
node -e "
  const { ArmorIQClient } = require('./armoriq-client');
  const client = new ArmorIQClient();
  console.log(client.getStatus());
"

# Expected output:
# {
#   enabled: true,
#   clientId: 'intentlock-client',
#   apiUrl: 'https://api.armoriq.io/v1',
#   hasClient: true
# }
```

---

## 📁 Project Structure

```
IntentLock/
├── README.md                    ← This file
├── REAL_SDK_INTEGRATION.md      ← Real SDK setup guide (NEW)
├── ARMORIQ_INTEGRATION.md       ← ArmorIQ governance setup
├── QUICKSTART.md                ← 5-minute quick start
├── ARCHITECTURE.md              ← Technical deep dive
├── IMPLEMENTATION_SUMMARY.md    ← What was built
│
├── armoriq-client.js            ← REAL SDK integration (UPDATED)
│
├── scripts/
│   └── verify-intent.js         ← Verification orchestrator
│
├── analyzer/
│   ├── analyzer.js              ← Semantic analysis (UNCHANGED)
│   └── driftDetector.js         ← Drift detection (UNCHANGED)
│
├── backend/
│   ├── main.py                  ← FastAPI backend
│   ├── .env.example             ← Config template (UPDATED)
│   └── intentlock_audit.db      ← SQLite audit log
│
├── hooks/
│   ├── pre-commit               ← Git hook integration
│   └── install-hook.sh          ← Hook installer
│
├── contracts/
│   └── [intent contracts]       ← Generated contracts
│
├── package.json                 ← Dependencies (UPDATED)
└── .env                         ← Your configuration (create)
```

---

## 🔐 Configuration

### Required: API Key

```bash
# .env
ARMORIQ_API_KEY=sk_live_your_real_api_key_here
```

- Get from: https://console.armoriq.io/api-keys
- Keep in .env (NEVER commit)
- Rotate periodically

### Optional: Custom Endpoint

```bash
# For self-hosted ArmorIQ
ARMORIQ_API_URL=https://your-instance.example.com/api/v1
ARMORIQ_CLIENT_ID=my-intentlock-instance
ARMORIQ_ENVIRONMENT=production
```

---

## 🛠️ Semantic Domains (IntentLock - UNCHANGED)

The analyzer extracts operations across 6 domains:

| Domain | Detects | Risk |
|--------|---------|------|
| **Database** | DELETE, UPDATE, INSERT, SELECT | High |
| **Filesystem** | read, write, delete, permissions | Medium |
| **Network** | fetch, axios, http calls | Medium |
| **Auth** | role changes, privilege escalation | Critical |
| **Process** | exec, spawn, shell commands | Critical |
| **API** | route definitions, endpoints | Low |

---

## ⚠️ Drift Detection Framework (IntentLock - UNCHANGED)

Detects violations in 7 areas:

1. **Database Drift** — Unauthorized operations
2. **Filesystem Drift** — Unsafe file access
3. **Network Drift** — Unallowed domains
4. **Auth Drift** — Role/privilege violations
5. **Process Drift** — Shell execution
6. **API Drift** — Route mismatches
7. **Risk Level Drift** — Severity thresholds

---

## 🚀 Phase 2 Completion Status

### ✅ REAL ArmorIQ SDK Implemented

- ✅ `@armoriq/sdk` package installed and initialized
- ✅ `client.contracts.register()` — Real contract registration API
- ✅ `client.policies.enforce()` — Real policy enforcement engine
- ✅ `client.audit.log()` — Real immutable audit logging
- ✅ Error handling with fallback modes
- ✅ Environment variable configuration
- ✅ Integration tests prepared
- ✅ Production-ready code quality
- ✅ Comprehensive documentation

### ✅ Non-Invasive Wrapper Pattern

- ✅ analyzer.js untouched (40+ regex patterns)
- ✅ driftDetector.js untouched (7 drift domains)
- ✅ backend.py untouched (Gemini integration)
- ✅ Pre-commit hook integrated
- ✅ Orchestrator coordinates all layers

### ✅ Enterprise Features

- ✅ Immutable audit trail
- ✅ Tamper-proof contracts
- ✅ Policy enforcement decisions
- ✅ Compliance tracking
- ✅ Forensic capabilities
- ✅ Multi-environment support

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [REAL_SDK_INTEGRATION.md](REAL_SDK_INTEGRATION.md) | Complete SDK setup guide (START HERE) |
| [ARMORIQ_INTEGRATION.md](ARMORIQ_INTEGRATION.md) | Governance architecture details |
| [QUICKSTART.md](QUICKSTART.md) | 5-minute quick start |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical deep dive |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) | What was built & design principles |

---

## 🎓 Key Concepts

### Intent Contract

A JSON specification of allowed behavior:
```json
{
  "allowed_routes": ["/api/users", "/api/auth"],
  "allowed_methods": ["GET", "POST"],
  "allowed_dependencies": ["express", "dotenv"],
  "forbidden_actions": ["exec", "spawn", "admin_assignment"],
  "intent_constraints": {
    "allow_shell_execution": false,
    "max_risk_level": "MEDIUM",
    "allowed_tables": ["users", "logs"]
  }
}
```

### Semantic Operation

Code action that crosses domain boundaries:
```javascript
// Example: Cross-domain operation
db.execute("DELETE FROM users");  // Database domain + Process domain
// Triggers: database_drift + process_drift violations
```

### Drift Violation

Detected deviation from intent:
```json
{
  "type": "semantic_drift",
  "severity": "CRITICAL",
  "detail": "Shell command execution detected",
  "operation": "exec('rm -rf /')"
}
```

---

## 🔗 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Governance** | @armoriq/sdk v0.3.3 | REAL policy enforcement |
| **Orchestration** | Node.js v14+ | Pipeline coordination |
| **Analysis** | Regex patterns (40+) | Semantic extraction |
| **Detection** | Policy engine | Drift validation |
| **Backend** | FastAPI/Python | Intent contract generation |
| **AI** | Google Gemini 2.5 Flash | AI contract generation |
| **Database** | SQLite | Audit logging |
| **Git** | Bash pre-commit hook | Workflow integration |

---

## 🐛 Troubleshooting

### "API key not found"
```bash
# Check .env exists and has ARMORIQ_API_KEY
grep ARMORIQ_API_KEY .env

# If missing:
cp backend/.env.example .env
# Then edit .env with your real key
```

### "Contract registration failed"
```bash
# Verify API connectivity
npm run verify test/safe_code.js

# Check API key is valid
curl -H "Authorization: Bearer $ARMORIQ_API_KEY" https://api.armoriq.io/v1/health
```

### "Module not found: @armoriq/sdk"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

See [REAL_SDK_INTEGRATION.md](REAL_SDK_INTEGRATION.md) for more troubleshooting.

---

## 📞 Support

- **Docs:** [REAL_SDK_INTEGRATION.md](REAL_SDK_INTEGRATION.md)
- **ArmorIQ Docs:** https://docs.armoriq.io
- **Issues:** Create an issue in this repository

---

## 📝 Phase 2 Achievements

- ✅ Semantic operation extraction (40+ patterns across 6 domains)
- ✅ Drift detection engine (7 drift detection strategies)
- ✅ Intent constraints framework (boolean, list, risk-level)
- ✅ REAL ArmorIQ SDK integration (contracts, policies, audit)
- ✅ Non-invasive governance wrapper pattern
- ✅ Git pre-commit hook integration
- ✅ Comprehensive documentation & examples
- ✅ Production-quality code with error handling
- ✅ Enterprise compliance & audit trail

**Status:** ✅ **Phase 2 COMPLETE with REAL ArmorIQ SDK**

---

Generated with IntentLock Phase 2 + REAL ArmorIQ SDK Integration
