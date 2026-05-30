# IntentLock - Phase 2 + ArmorIQ Governance

## Overview

IntentLock is an AI-powered code intent verification system that prevents AI-generated code from behaving outside developer intent. It uses natural language prompts to generate strict intent contracts, then analyzes code to detect security violations and behavioral drift. 

**Phase 2 adds:**
- Automated git pre-commit hooks
- Visual diff UI
- Comprehensive audit logging

**ArmorIQ Integration adds:**
- Intent contract governance layer
- Policy enforcement and immutable audit trails
- Enterprise-grade compliance tracking

## Setup

### Prerequisites
- Python 3.8+
- Node.js (for git hooks)
- Conda environment manager

### Installation

1. **Activate conda environment:**
   ```bash
   conda activate intentlock
   ```

2. **Install Python dependencies:**
   ```bash
   pip install fastapi uvicorn google-genai python-dotenv
   ```

3. **Install Node.js dependencies:**
   ```bash
   npm install dotenv
   ```

4. **Add API keys:**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env and add:
   # - GEMINI_API_KEY (for intent contract generation)
   # - ARMORIQ_API_KEY (for governance layer) [OPTIONAL]
   ```

5. **Copy .env to project root for verify-intent.js:**
   ```bash
   cp backend/.env .env
   ```

## Running IntentLock

### Start the backend:
```bash
bash start.sh
```

This script:
- Activates the conda environment
- Starts the FastAPI backend on port 8000
- Verifies backend health
- Displays next steps

### Stop the backend:
```bash
bash stop.sh
```

### Open the dashboard:
Open `dashboard/index.html` in your web browser to access the visual diff UI.

## Git Hook Integration

### Install the pre-commit hook:
```bash
bash hooks/install-hook.sh
```

This hook will:
- Run on every `git commit`
- Scan staged JavaScript/TypeScript files
- Check code against security constraints
- Block commits with violations
- Log all analyses
- **(NEW)** Integrate ArmorIQ governance layer for policy enforcement and immutable audit trails

### ArmorIQ Governance Integration

The pre-commit hook now integrates the **ArmorIQ SDK** as an enterprise governance layer:

1. **Intent Registration** — Registers intent contracts with ArmorIQ for immutable tracking
2. **Policy Enforcement** — Blocks commits that violate intent constraints
3. **Audit Logging** — Stores verification evidence in ArmorIQ's immutable audit trail

**Setup:**
```bash
# Add ArmorIQ API key to .env
echo "ARMORIQ_API_KEY=your_key_here" >> backend/.env

# Install/update hook
bash hooks/install-hook.sh
```

**Example Output:**
```
🔍 IntentLock + ArmorIQ: Scanning staged files...

🔬 Semantic Analysis Phase: ✓ 5 operations extracted
🔍 Drift Detection Phase: ✓ 0 violations
🛡  Policy Enforcement Phase: ✅ Commit allowed
📊 Audit Logging Phase: ✅ Evidence stored

✅ COMMIT ALLOWED
```

For detailed integration guide, see [ARMORIQ_INTEGRATION.md](ARMORIQ_INTEGRATION.md)

## Phase 2 Features

### 🔒 Semantic Code Analysis
- Extracts high-level semantic operations from code without AST parsing
- Detects operations across 6 domains: database, filesystem, network, auth, process, API
- Risk scoring (LOW to CRITICAL) based on operation impact
- Comprehensive metadata extraction for context-aware verification

### 🛡️ Intent-Based Verification
- Developer defines intent through natural language prompts
- System generates strict intent contracts
- Detects behavioral drift with 7-domain constraint verification
- Policy-based approach: whitelist allowed operations instead of blacklisting forbidden ones

### 🔒 Git Pre-Commit Hook
- Automatically analyzes staged files on commit
- Blocks commits with security violations
- Real-time feedback with colored output
- Gracefully skips scanning if backend is offline

### 🎨 Visual Diff UI
- Dark-themed web interface
- Two-column intent prompt + code input
- Real-time contract generation and analysis
- Detailed violation reports with color-coded status
- Contract JSON inspection

### 📋 Audit Logging
- SQLite database stores all analyses with timestamps
- Persistent audit trail for compliance and debugging
- API endpoints for log retrieval and management
- Frontend audit log viewer with localStorage caching

## Semantic Operation Domains

IntentLock analyzes code across 6 semantic domains, detecting high-risk operations:

### 1. Database Operations
| Operation | Risk | Detection |
|-----------|------|-----------|
| DELETE without WHERE | CRITICAL | `DELETE FROM users;` |
| UPDATE without WHERE | HIGH | `UPDATE users SET active=0;` |
| INSERT | LOW | `INSERT INTO users VALUES(...)` |
| SELECT | LOW | `SELECT * FROM users WHERE id=1` |

### 2. Filesystem Operations
| Operation | Risk | Detection |
|-----------|------|-----------|
| Recursive delete | CRITICAL | `fs.rm("/", {recursive: true})` |
| System path delete | CRITICAL | `fs.rm("/etc", ...)` |
| Sensitive file write | CRITICAL | `fs.writeFile("/etc/passwd", ...)` |
| Sensitive file read | HIGH | `fs.readFile("/etc/shadow", ...)` |
| Regular file write | MEDIUM | `fs.writeFile("/tmp/data", ...)` |

### 3. Network Operations
| Operation | Risk | Detection |
|-----------|------|-----------|
| Suspicious domain | HIGH | `fetch('https://evil.com')` |
| Unknown domain | MEDIUM | `fetch('https://unknown.com')` |
| External request | MEDIUM | `axios.post('https://api.external.com')` |
| Trusted domain | LOW | `fetch('https://api.trusted.com')` |

### 4. Auth/Privilege Operations
| Operation | Risk | Detection |
|-----------|------|-----------|
| Privilege escalation | CRITICAL | `user.role = "admin"` |
| Admin grant | CRITICAL | `grantRole("root")` |
| System elevation | CRITICAL | `elevatePrivileges()` |
| Role assignment | HIGH | `user.role = "moderator"` |

### 5. Process/Command Operations
| Operation | Risk | Detection |
|-----------|------|-----------|
| Destructive command | CRITICAL | `exec("rm -rf /")` |
| Shell execution | HIGH | `exec("curl \\| bash")` |
| Process spawn | MEDIUM | `spawn("node", ["app.js"])` |

### 6. API Route Operations
| Operation | Risk | Detection |
|-----------|------|-----------|
| Admin route | HIGH | `app.post("/admin/users")` |
| Normal route | LOW | `app.get("/api/users")` |

## Architecture

### Complete Verification Pipeline

```
┌────────────────────────────────────────────────────────┐
│           Developer Workflow (git commit)               │
└────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────┐
│         Pre-Commit Hook (verify-intent.js)              │
│  • Loads .env configuration                            │
│  • Triggers semantic verification pipeline             │
└────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────┐
│    IntentLock Semantic Intelligence Layer              │
│  • Semantic Analyzer (6 domains)                       │
│  • Drift Detector (7-domain constraints)               │
│  • Behavior Extraction & Violation Detection           │
└────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────┐
│       ArmorIQ Governance & Enforcement Layer            │
│  • registerIntent() - Register contract ID             │
│  • enforcePolicy() - Enforce violations                │
│  • auditLog() - Store immutable evidence               │
└────────────────────────────────────────────────────────┘
                         ↓
              ✅ COMMIT / ⛔ BLOCK
```

### Component Architecture
- **FastAPI** REST API with CORS support
- **Gemini 2.5 Flash** for contract generation (modern google.genai package)
- **SQLite** for audit logging with persistent audit trail
- Endpoints:
  - `GET /health` — Health check
  - `POST /generate-contract` — Generate intent contract from natural language prompt
  - `POST /analyze` — Check code behavior against contract with semantic drift detection
  - `POST /log` — Log analysis results to audit trail
  - `GET /audit-log` — Retrieve last 50 audit logs with full analysis metadata
  - `DELETE /audit-log` — Clear all audit logs

**Intent Contract Structure:**
```json
{
  "allowed_routes": ["/api/users", "/api/login"],
  "allowed_methods": ["GET", "POST"],
  "allowed_dependencies": ["express", "bcrypt"],
  "forbidden_actions": ["outbound_network_calls", "file_system_access"],
  "intent_constraints": {
    "allow_bulk_operations": false,
    "allow_recursive_delete": false,
    "allow_privilege_escalation": false,
    "allow_external_network_calls": false,
    "allow_shell_execution": false,
    "allow_sensitive_reads": false,
    "allow_admin_assignment": false,
    "allowed_domains": ["api.trusted.com"],
    "allowed_tables": ["users", "products"],
    "allowed_paths": ["/tmp", "/home/user/data"],
    "allowed_roles": ["user", "moderator"],
    "max_risk_level": "MEDIUM"
  }
}
```

### Analyzer (`analyzer/analyzer.js`)
- **Semantic Operation Analysis Engine** for JavaScript/TypeScript
- Regex-based static analysis (no external parsers for speed and simplicity)
- Extracts **6 semantic operation domains**:
  1. **Database Operations:** DELETE, UPDATE, INSERT, SELECT with bulk operation detection
  2. **Filesystem Operations:** fs.rm, fs.readFile, fs.writeFile with recursive deletion and sensitive file detection
  3. **Network Operations:** fetch(), axios(), http/https requests with domain extraction and suspicious pattern matching
  4. **Auth/Privilege Operations:** Role assignment, privilege escalation, admin grants with risk scoring
  5. **Process/Command Operations:** exec(), spawn(), execSync() with destructive command detection
  6. **API Route Operations:** Express/Fastify route definitions with admin route detection

**Semantic Operation Structure:**
```json
{
  "domain": "database|filesystem|network|auth|process|api",
  "action": "DELETE|UPDATE|INSERT|SELECT|WRITE|READ|COMMAND_EXECUTION|etc",
  "target": "table_name|file_path|domain|url|role|command",
  "scope": "ALL_ROWS|SINGLE_ROW|RECURSIVE|EXTERNAL|SYSTEM|etc",
  "risk": "LOW|MEDIUM|HIGH|CRITICAL",
  "metadata": {
    "bulk_operation": boolean,
    "recursive": boolean,
    "sensitive_file": boolean,
    "destructive": boolean,
    "admin_route": boolean,
    "suspicious": boolean
  },
  "raw": "original_code_snippet"
}
```

**Behavior Extraction Output:**
```json
{
  "routes": [{"method": "GET", "path": "/api/users"}],
  "network_calls": ["https://api.example.com"],
  "fs_access": true,
  "child_process": false,
  "hardcoded_secrets": false,
  "db_queries": ["DELETE FROM users;"],
  "dependencies": ["express", "fs"],
  "semantic_operations": [
    {domain, action, target, scope, risk, metadata, raw},
    ...
  ]
}
```

### Drift Detector (`analyzer/driftDetector.js`)
- **Semantic Intent Verification Engine** with constraint-based policy verification
- Compares extracted behavior against contract intent constraints
- **7-domain violation detection system:**
  1. **Database Drift:** Detects bulk operations, unauthorized tables, dangerous scopes (ALL_ROWS)
  2. **Filesystem Drift:** Detects recursive deletes, system directory access, sensitive file operations
  3. **Network Drift:** Detects suspicious domains, external calls, unknown destinations
  4. **Auth Drift:** Detects privilege escalation, admin role assignment, unauthorized roles
  5. **Process Drift:** Detects destructive commands, shell execution, dangerous patterns
  6. **API Drift:** Detects admin routes, unauthorized methods/routes
  7. **Risk Level Drift:** Detects operations exceeding max_risk_level threshold

**Violation Structure:**
```json
{
  "violations": [
    {
      "type": "semantic_drift",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "detail": "descriptive message about the violation",
      "operation": {semantic_operation_object}
    }
  ],
  "safe": boolean,
  "summary": "human_readable_summary",
  "severity_breakdown": {
    "CRITICAL": 2,
    "HIGH": 3,
    "MEDIUM": 1,
    "LOW": 0
  }
}
```

**Example: Detecting Bulk Delete Violation**
```javascript
// Code
DELETE FROM users;

// Contract intent_constraints
{allow_bulk_operations: false}

// Violation detected
[{
  type: "semantic_drift",
  severity: "CRITICAL",
  detail: "Bulk database operation detected: DELETE on users without WHERE clause",
  operation: {
    domain: "database",
    action: "DELETE",
    target: "users",
    scope: "ALL_ROWS",
    risk: "CRITICAL",
    metadata: {bulk_operation: true}
  }
}]
```

**Backward Compatibility:**
- Legacy `forbidden_actions` still supported (file_system_access, outbound_network_calls, etc.)
- Legacy route/method/dependency checks preserved
- New `intent_constraints` enables powerful policy-based verification

### Dashboard (`dashboard/index.html`)
- Vanilla HTML/CSS/JavaScript (no frameworks, single-file application)
- **Dark theme:** #0d0d1a background, #1a1a2e cards, #2a2a4a borders, #00ff88 green accent, #ff4444 red
- **Input Panel (2-column layout):**
  - Left: Natural language prompt input (e.g., "Create a login API with Express")
  - Right: AI-generated code to analyze
- **Output Panel:**
  - Real-time contract generation from prompt
  - Real-time drift analysis with violation list
  - Color-coded status (green "✅ SAFE" or red "❌ DRIFT DETECTED")
  - Violation details with icons
  - Contract JSON inspection with copy button
- **Audit Log Panel:**
  - Table view of recent analyses
  - Timestamp, Prompt, Result, Violations columns
  - localStorage persistence for offline access
  - Clear log button
- Real-time API calls to backend with response handling

### Git Hook (`hooks/pre-commit`)
- Bash pre-commit hook for git integration
- Scans staged JS/TS files
- Calls `verify-intent.js` for each staged file (NEW)
- Integrates ArmorIQ governance layer (NEW)
- Blocks commits on violations
- Fallback to legacy backend if needed

### Verification Orchestrator (`scripts/verify-intent.js`)
- **NEW:** Coordinates complete verification pipeline
- Loads code and intent contracts
- Calls semantic analyzer (IntentLock)
- Calls drift detector (IntentLock)
- Registers contract with ArmorIQ (NEW)
- Enforces policy with ArmorIQ (NEW)
- Stores audit log with ArmorIQ (NEW)
- Returns proper exit codes for git hooks
- Supports async/await pattern

### ArmorIQ SDK Client (`armoriq-client.js`)
- **NEW:** Enterprise governance wrapper
- **Integration Point 1 — registerIntent():** Register intent contracts
- **Integration Point 2 — enforcePolicy():** Enforce violations and block commits
- **Integration Point 3 — auditLog():** Store immutable verification evidence
- Configuration via environment variables (ARMORIQ_API_KEY, ARMORIQ_API_URL, etc.)
- Graceful degradation if API key not configured
- Generates unique contract IDs and audit IDs
- Calculates severity breakdown for violations

## Tech Stack

- **Backend:** FastAPI, Python 3.8+, Uvicorn
- **AI/ML:** Google Gemini 2.5 Flash API (modern google.genai package)
- **Database:** SQLite with persistent audit logging
- **Analysis:** Semantic operation extraction via regex-based static analysis
- **Drift Detection:** Multi-domain constraint-based policy verification
- **Governance:** ArmorIQ SDK for enterprise policy enforcement and immutable audit trails (NEW)
- **Orchestration:** Node.js scripts with async/await coordination (NEW)
- **Frontend:** Vanilla HTML5, CSS3, JavaScript (no frameworks)
- **Git Integration:** Bash pre-commit hooks + Husky-compatible
- **Infrastructure:** Conda environment management, dotenv configuration

## Development

### Project Structure
```
IntentLock/
├── armoriq-client.js                # NEW: ArmorIQ SDK wrapper
├── scripts/
│   └── verify-intent.js             # NEW: Verification orchestrator
├── backend/
│   ├── main.py                      # FastAPI application
│   ├── .env.example                 # Config template (now with ARMORIQ_* keys)
│   └── intentlock_audit.db          # SQLite database (generated)
├── analyzer/
│   ├── analyzer.js                  # Semantic operation analyzer
│   └── driftDetector.js             # Drift detector
├── dashboard/
│   └── index.html                   # Visual diff UI
├── hooks/
│   ├── pre-commit                   # UPDATED: Now calls verify-intent.js
│   └── install-hook.sh              # Hook installer
├── start.sh                         # Start backend
├── stop.sh                          # Stop backend
├── ARMORIQ_INTEGRATION.md           # NEW: ArmorIQ setup guide
├── .gitignore                       # Git ignore rules
└── README.md                        # This file
```

## Testing

### Test the Semantic Operation Analyzer:
```bash
node analyzer/analyzer.js
```

Runs 8 comprehensive test scenarios showing semantic operation extraction across all 6 domains.

### Test the Semantic Intent Verification Engine:
```bash
node analyzer/driftDetector.js
```

Runs 7 comprehensive test scenarios demonstrating intent constraints and violation detection.

### Test the Complete Verification Pipeline (with ArmorIQ):
```bash
# Create a test file with violations
cat > test_violation.js << 'EOF'
exec("rm -rf /");
user.role = "admin";
EOF

# Run the full verification orchestrator
node scripts/verify-intent.js test_violation.js

# Expected output:
# - Semantic analysis phase
# - Drift detection phase
# - ArmorIQ registration
# - Policy enforcement (BLOCKED)
# - Audit logging
```

### Test with Intent Contract:
```bash
# Create a strict intent contract
cat > .intentlock.json << 'EOF'
{
  "allowed_routes": ["/api/users"],
  "allowed_methods": ["GET", "POST"],
  "allowed_dependencies": ["express"],
  "forbidden_actions": [],
  "intent_constraints": {
    "allow_shell_execution": false,
    "allow_privilege_escalation": false,
    "max_risk_level": "MEDIUM"
  }
}
EOF

# Test verification with contract
node scripts/verify-intent.js test_violation.js .intentlock.json
```

### Test the Backend API:
```bash
# Health check
curl http://localhost:8000/health

# Generate contract from prompt
curl -X POST http://localhost:8000/generate-contract \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a REST API for user authentication with bcrypt"}'

# Analyze code for drift
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{...}'

# View audit logs
curl http://localhost:8000/audit-log

# Clear audit logs
curl -X DELETE http://localhost:8000/audit-log
```

### Full Integration Test:
```bash
# 1. Start backend
bash start.sh

# 2. Run analyzer tests
node analyzer/analyzer.js

# 3. Run drift detector tests
node analyzer/driftDetector.js

# 4. Test full verification with ArmorIQ
cat > test_malicious.js << 'EOF'
const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');

app.post('/admin/users', (req, res) => {
  user.role = "admin";
  fs.readFile('/etc/shadow', () => {});
  exec("rm -rf /");
});
EOF

node scripts/verify-intent.js test_malicious.js

# 5. Open dashboard
# Navigate to: file:///home/umeshwar/IntentLock/dashboard/index.html

# 6. Test git hook (after installation)
bash hooks/install-hook.sh
# Then: git add .
#       git commit -m "test"

# 7. Stop backend
bash stop.sh
```

## Intent Constraints Reference

Intent constraints enable flexible, policy-based code verification. Define what operations are allowed:

### Boolean Constraints (Allow/Block Operations)
```javascript
intent_constraints: {
  allow_bulk_operations: false,        // Block DELETE/UPDATE without WHERE
  allow_recursive_delete: false,       // Block fs.rm({recursive: true})
  allow_privilege_escalation: false,   // Block role="admin", grantRole()
  allow_external_network_calls: false, // Block fetch/axios to unknown domains
  allow_shell_execution: false,        // Block exec/spawn commands
  allow_sensitive_reads: false,        // Block reading /etc/shadow, .env, etc.
  allow_admin_assignment: false,       // Block isAdmin=true, role="admin"
  allow_admin_routes: false,           // Block app.post('/admin/...') routes
  allow_suspicious_domains: false      // Block domains with evil, malicious, etc.
}
```

### List Constraints (Whitelist Operations)
```javascript
intent_constraints: {
  allowed_domains: [                   // Only these domains can be called
    "api.trusted.com",
    "cdn.example.com"
  ],
  allowed_tables: [                    // Only these database tables can be accessed
    "users",
    "products",
    "orders"
  ],
  allowed_paths: [                     // Only these filesystem paths can be accessed
    "/tmp",
    "/home/user/data",
    "/var/log"
  ],
  allowed_roles: [                     // Only these roles can be assigned
    "user",
    "moderator"
  ],
  allowed_methods: [                   // Only these HTTP methods allowed
    "GET",
    "POST"
  ],
  allowed_routes: [                    // Only these API routes can be defined
    "/api/users",
    "/api/login",
    "/api/profile"
  ]
}
```

### Risk Level Constraint
```javascript
intent_constraints: {
  max_risk_level: "MEDIUM"  // LOW | MEDIUM | HIGH | CRITICAL
}
```

Operations exceeding this level will generate violations.

### Example: Login API Intent Contract
```javascript
{
  "allowed_routes": ["/login", "/logout", "/register"],
  "allowed_methods": ["GET", "POST"],
  "allowed_dependencies": ["express", "bcrypt", "jsonwebtoken"],
  "forbidden_actions": [],
  "intent_constraints": {
    "allow_external_network_calls": false,
    "allow_privilege_escalation": false,
    "allow_admin_assignment": false,
    "allow_shell_execution": false,
    "allow_bulk_operations": true,
    "allowed_tables": ["users", "sessions"],
    "max_risk_level": "MEDIUM"
  }
}
```

This contract allows:
- ✅ Login/logout/register routes with GET/POST
- ✅ Express, bcrypt, JWT dependencies
- ✅ Database access to users and sessions tables
- ✅ Medium-risk operations (e.g., single-row DELETE with WHERE clause)

But blocks:
- ❌ External network calls (no data exfiltration)
- ❌ Privilege escalation (no role="admin")
- ❌ Shell execution (no exec/spawn)
- ❌ Risky operations (CRITICAL risk level operations)

## ArmorIQ Governance Integration

IntentLock now integrates the **ArmorIQ SDK** as an enterprise governance and enforcement layer. This keeps the system modular and focused:

| Layer | Responsibility | Components |
|-------|-----------------|------------|
| **IntentLock (Intelligence)** | Semantic analysis and drift detection | `analyzer.js`, `driftDetector.js` |
| **ArmorIQ (Governance)** | Policy enforcement and immutable audit | `armoriq-client.js`, `scripts/verify-intent.js` |

### Three Integration Points

**1. registerIntent() — Contract Registration**
- Registers generated intent contracts with ArmorIQ
- Creates immutable contract metadata record
- Associates unique contract ID with verification runs

**2. enforcePolicy() — Violation Enforcement**
- Triggered when IntentLock detects drift violations
- Blocks git commits based on policy
- Displays enforcement evidence in terminal
- Severity-aware enforcement (CRITICAL vs MEDIUM violations)

**3. auditLog() — Immutable Audit Trail**
- Stores complete verification evidence
- Logs violations, severity, timestamp, file metadata
- Creates immutable record for compliance
- Includes semantic operation context

### Environment Configuration

Add to `.env` (optional, system gracefully degrades without):
```bash
ARMORIQ_API_KEY=your_armoriq_api_key_here
ARMORIQ_API_URL=https://api.armoriq.io/v1
ARMORIQ_CLIENT_ID=intentlock-client
```

See [ARMORIQ_INTEGRATION.md](ARMORIQ_INTEGRATION.md) for complete setup guide.

### Key Design Principles

- ✅ **Non-Invasive:** ArmorIQ wraps existing logic, doesn't replace
- ✅ **Modular:** Integration points clearly marked and isolated
- ✅ **Graceful Degradation:** Works without API key (semantic verification continues)
- ✅ **Enterprise-Ready:** Async/await patterns, proper error handling
- ✅ **Compliance-Focused:** Immutable audit trails for governance

## Troubleshooting

- **Backend won't start:** Check that port 8000 is not in use. Run `bash stop.sh` to free it, or use `lsof -ti:8000 | xargs kill -9`
- **Gemini API errors:** Verify your API key in `backend/.env` and ensure you're using the modern google.genai package
- **Git hook not running:** Run `bash hooks/install-hook.sh` to reinstall. Verify hook is executable: `ls -la .git/hooks/pre-commit`
- **Database errors:** Delete `backend/intentlock_audit.db` to reset the audit log. Database will auto-create on next API call
- **Analyzer not finding semantic operations:** Ensure code uses standard patterns (e.g., `DELETE FROM table;` for SQL, `fs.rm()` for filesystem)
- **Drift detector no violations:** Check that `intent_constraints` are defined in contract. Legacy `forbidden_actions` will still work
- **Dashboard not connecting:** Ensure backend is running on port 8000 and CORS is enabled. Check browser console for errors
- **verify-intent.js not running:** Ensure `scripts/verify-intent.js` exists and is executable: `ls -la scripts/verify-intent.js`
- **ArmorIQ integration not triggering:** Check that `.env` exists in project root with ARMORIQ_API_KEY (see [ARMORIQ_INTEGRATION.md](ARMORIQ_INTEGRATION.md))
- **Pre-commit hook falling back to backend:** This is expected behavior. The hook tries `verify-intent.js` first, then falls back to backend if not found

## Phase 2 Completion Status ✅

### ✅ Completed Features

**Backend & API**
- ✅ FastAPI application with 6 endpoints
- ✅ Google Gemini 2.5 Flash integration for contract generation
- ✅ SQLite audit logging with persistent storage
- ✅ CORS support for cross-origin requests
- ✅ Environment variable management (.env.example)

**Semantic Analysis**
- ✅ 6-domain semantic operation extraction (database, filesystem, network, auth, process, api)
- ✅ 40+ regex patterns for behavior detection
- ✅ Risk scoring (LOW, MEDIUM, HIGH, CRITICAL)
- ✅ Comprehensive metadata extraction (bulk_operation, recursive, sensitive_file, destructive, etc.)

**Semantic Drift Detection**
- ✅ 7-domain constraint-based policy verification
- ✅ Intent constraints framework with boolean, list, and risk level constraints
- ✅ Violation detection with severity levels
- ✅ Severity breakdown reporting (CRITICAL, HIGH, MEDIUM, LOW counts)
- ✅ Backward compatibility with legacy forbidden_actions

**Git Integration**
- ✅ Pre-commit hook for automated staged file scanning
- ✅ Violation blocking (prevents commits with violations)
- ✅ Graceful backend offline handling
- ✅ Color-coded console output
- ✅ Installation script

**Dashboard UI**
- ✅ Dark-themed web interface
- ✅ Real-time contract generation
- ✅ Real-time drift analysis
- ✅ Violation reports with color-coded status
- ✅ Audit log viewer with localStorage persistence
- ✅ Copy report functionality

**ArmorIQ Governance Integration (NEW)**
- ✅ ArmorIQ SDK client wrapper (`armoriq-client.js`)
- ✅ Verification orchestrator (`scripts/verify-intent.js`)
- ✅ Three integration points: registerIntent(), enforcePolicy(), auditLog()
- ✅ Environment variable configuration (ARMORIQ_API_KEY, ARMORIQ_API_URL, ARMORIQ_CLIENT_ID)
- ✅ Immutable audit trail storage
- ✅ Policy enforcement with violation blocking
- ✅ Updated pre-commit hook with ArmorIQ integration
- ✅ Comprehensive integration documentation (ARMORIQ_INTEGRATION.md)
- ✅ Graceful degradation without ArmorIQ API key

**Testing**
- ✅ 8 comprehensive analyzer test scenarios
- ✅ 7 comprehensive drift detector test scenarios
- ✅ Real-world malicious code examples
- ✅ Integration test workflow
- ✅ ArmorIQ integration test examples

### Phase 2 + ArmorIQ Technical Achievements

1. **Semantic Operation Analysis Engine** — Evolved from binary flags to detailed semantic operations with 7 domains and risk scoring
2. **Constraint-Based Policy Verification** — Flexible intent constraints enabling powerful policy definitions
3. **Multi-Domain Violation Detection** — Each domain has specialized violation detection rules
4. **Enterprise Governance Layer** — ArmorIQ integration for policy enforcement and immutable audit trails
5. **Non-Invasive Architecture** — ArmorIQ wraps existing logic without modifying semantic verification
6. **Modular Design** — Clear separation: IntentLock (intelligence) + ArmorIQ (governance)
7. **Backward Compatibility** — Works with or without ArmorIQ API key configured

## Future Phases

### Phase 3: Advanced AST Analysis
- Abstract Syntax Tree parsing for JavaScript/TypeScript using @babel/parser
- Deeper code flow analysis beyond regex patterns
- Variable tracking and data flow analysis
- Loop and condition analysis for more precise risk scoring
- Support for TypeScript type annotations

### Phase 4: ML-Powered Anomaly Detection
- Machine learning model for intent anomaly detection
- Training on known-good and known-bad code patterns
- Confidence scoring for violations
- Fine-tuning for project-specific policies
- Behavioral clustering for similar code patterns

### Phase 5: Multi-Language Support & IDE Integration
- Python, Go, Rust, Java analyzer plugins
- VS Code extension with real-time inline analysis
- JetBrains IDE integration (IntelliJ, PyCharm, etc.)
- Language-specific semantic operation domains
- IDE-native violation highlighting

### Phase 6: Collaborative Policies & Team Management
- Shared intent contract libraries
- Role-based policy management (developer, reviewer, security-officer)
- Team collaboration features with comments and approval workflows
- Organization-wide intent policy enforcement
- Audit log integration with git history

### Phase 7: Runtime Intent Verification
- Runtime monitoring of deployed code
- Intent verification during production execution
- Real-time telemetry collection
- Alert and mitigation strategies
- Intent drift detection in live systems

## License

MIT
