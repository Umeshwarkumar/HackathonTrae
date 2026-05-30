# IntentLock + ArmorIQ Quick Start Guide

Get IntentLock with ArmorIQ governance up and running in 5 minutes.

## Prerequisites

- Python 3.8+
- Node.js 14+
- Conda environment
- (Optional) ArmorIQ API key

## Step 1: Setup Python Environment

```bash
# Activate conda environment
conda activate intentlock

# Install Python dependencies
pip install fastapi uvicorn google-genai python-dotenv

# Verify installation
python --version
```

## Step 2: Setup Node.js Environment

```bash
# Install Node dependencies
npm install

# Verify installation
node --version
npm --version
```

## Step 3: Configure API Keys

```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit and add your keys
nano backend/.env

# Add:
# GEMINI_API_KEY=your_gemini_key_here
# ARMORIQ_API_KEY=your_armoriq_key_here (optional)

# Copy to project root for verify-intent.js
cp backend/.env .env
```

## Step 4: Install Git Hooks

```bash
bash hooks/install-hook.sh
```

The pre-commit hook now integrates with ArmorIQ automatically.

## Step 5: Start the Backend

```bash
bash start.sh
```

The FastAPI backend starts on port 8000 with health checks.

## Verify Everything Works

### Test 1: Analyzer
```bash
node analyzer/analyzer.js
```
Should show 8 test scenarios with semantic operations extracted.

### Test 2: Drift Detector
```bash
node analyzer/driftDetector.js
```
Should show 7 test scenarios with violations detected.

### Test 3: Full Verification Pipeline
```bash
# Create a malicious test file
cat > test_malicious.js << 'EOF'
exec("rm -rf /");
user.role = "admin";
EOF

# Run verification with ArmorIQ integration
node scripts/verify-intent.js test_malicious.js

# Expected output:
# ✓ Semantic analysis complete
# ✓ Drift detection complete
# 🛡 ArmorIQ policy enforcement triggered
# 📜 Audit evidence stored
# ⛔ Commit blocked
```

### Test 4: Dashboard
```bash
# Open in browser:
file:///home/umeshwar/IntentLock/dashboard/index.html

# Try generating a contract and analyzing code
```

### Test 5: Git Hook
```bash
# Create a test file with violations
cat > src/unsafe.js << 'EOF'
DELETE FROM users;
fetch('https://evil.com');
EOF

# Try committing
git add src/unsafe.js
git commit -m "test"

# Expected: Commit blocked by git hook with ArmorIQ enforcement
```

## What Just Happened?

You now have a complete verification pipeline:

```
git commit
    ↓
verify-intent.js (orchestrator)
    ↓
analyzer.js (semantic analysis)
    ↓
driftDetector.js (constraint verification)
    ↓
armoriq-client.js (governance layer)
    ├─ registerIntent()
    ├─ enforcePolicy()
    └─ auditLog()
    ↓
✅ COMMIT ALLOWED or ⛔ COMMIT BLOCKED
```

## Architecture

| Component | Purpose | Language |
|-----------|---------|----------|
| `analyzer.js` | Extract semantic operations | JavaScript |
| `driftDetector.js` | Detect violations | JavaScript |
| `armoriq-client.js` | Governance wrapper | JavaScript |
| `verify-intent.js` | Orchestration | JavaScript |
| `main.py` | Intent generation | Python |
| `hooks/pre-commit` | Git automation | Bash |

## ArmorIQ Integration Points

**1. registerIntent()** — Register contracts
```javascript
const registration = await armorIQ.registerIntent(contract);
// Returns: { contractId: 'contract-...', registered: true }
```

**2. enforcePolicy()** — Enforce violations
```javascript
const enforcement = await armorIQ.enforcePolicy({
  violations, contractId, filePath, commitMessage
});
// Returns: { allowed: false/true, enforced: true }
```

**3. auditLog()** — Store evidence
```javascript
const audit = await armorIQ.auditLog({
  contractId, filePath, behavior, violations, safe, summary
});
// Returns: { logged: true, auditId: 'audit-...' }
```

## Common Tasks

### Generate Intent Contract

```bash
curl -X POST http://localhost:8000/generate-contract \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a login API with bcrypt"}'
```

### Analyze Code with Contract

```bash
cat > .intentlock.json << 'EOF'
{
  "allowed_routes": ["/login"],
  "allowed_methods": ["POST"],
  "allowed_dependencies": ["express", "bcrypt"],
  "forbidden_actions": [],
  "intent_constraints": {
    "allow_external_network_calls": false,
    "max_risk_level": "MEDIUM"
  }
}
EOF

node scripts/verify-intent.js myfile.js .intentlock.json
```

### View Audit Logs

```bash
curl http://localhost:8000/audit-log
```

### Clear Audit Logs

```bash
curl -X DELETE http://localhost:8000/audit-log
```

## Stop the Backend

```bash
bash stop.sh
```

## Troubleshooting

### ArmorIQ integration not running?
```bash
# Check ARMORIQ_API_KEY is set
grep ARMORIQ .env

# Check .env exists in project root
ls -la .env

# Re-install pre-commit hook
bash hooks/install-hook.sh
```

### verify-intent.js not found?
```bash
# Make it executable
chmod +x scripts/verify-intent.js

# Run it directly
node scripts/verify-intent.js test.js
```

### Backend won't start?
```bash
# Check if port 8000 is in use
lsof -ti:8000

# Kill any process on port 8000
lsof -ti:8000 | xargs kill -9

# Try starting again
bash start.sh
```

## Next Steps

1. **Customize Intent Constraints** — Edit `.intentlock.json` to define your project's policies
2. **Review Violations** — Check the detailed violation reports in terminal output
3. **Integrate with CI/CD** — Add `verify-intent.js` to your pipeline
4. **Monitor Audit Trail** — Query ArmorIQ for compliance reports

## Documentation

- [README.md](README.md) — Full project documentation
- [ARMORIQ_INTEGRATION.md](ARMORIQ_INTEGRATION.md) — Detailed ArmorIQ setup
- [analyzer.js](analyzer/analyzer.js) — Semantic operation analysis
- [driftDetector.js](analyzer/driftDetector.js) — Drift detection engine
- [armoriq-client.js](armoriq-client.js) — ArmorIQ SDK wrapper

## Support

For issues or questions:
1. Check [ARMORIQ_INTEGRATION.md](ARMORIQ_INTEGRATION.md) troubleshooting section
2. Check terminal output for detailed error messages
3. Verify all dependencies are installed: `npm list` and `pip list`
4. Ensure API keys are properly configured in `.env`

---

**You're all set!** IntentLock with ArmorIQ governance is now protecting your codebase. 🛡️
