# REAL ArmorIQ SDK Integration Guide

This guide covers the REAL ArmorIQ SDK integration with IntentLock.

## ✅ What Was Integrated

### Real SDK Components

The `armoriq-client.js` now uses the REAL ArmorIQ SDK with three core methods:

```javascript
// 1. Register contracts with ArmorIQ
const response = await client.contracts.register(contractPayload);

// 2. Enforce policies with ArmorIQ
const decision = await client.policies.enforce(enforcePayload);

// 3. Log audit evidence immutably
const audit = await client.audit.log(auditRecord);
```

### SDK Features Used

| Feature | Purpose | Location |
|---------|---------|----------|
| `contracts.register()` | Register intent contracts | `registerIntent()` |
| `policies.enforce()` | Evaluate and enforce policies | `enforcePolicy()` |
| `audit.log()` | Store immutable audit evidence | `auditLog()` |
| `health.check()` | Verify API connectivity | `healthCheck()` |

## 🚀 Installation & Setup

### 1. Install ArmorIQ SDK Package

```bash
npm install @armoriq/sdk
```

This installs the REAL ArmorIQ SDK (already added to package.json).

### 2. Get API Key

1. Sign up at https://console.armoriq.io
2. Create an API key
3. Copy to `.env`

```bash
# Create .env in project root
ARMORIQ_API_KEY=your_real_api_key_here
ARMORIQ_API_URL=https://api.armoriq.io/v1
ARMORIQ_CLIENT_ID=intentlock-client
```

### 3. Install Dependencies

```bash
npm install
```

This installs:
- `@armoriq/sdk` — REAL ArmorIQ SDK
- `dotenv` — Environment variable loading

### 4. Verify Installation

```bash
# Check SDK is installed
npm list @armoriq/sdk

# Check environment variables load
node -e "require('dotenv').config(); console.log(process.env.ARMORIQ_API_KEY ? '✅ Key loaded' : '❌ No key')"
```

## 📋 How Real Integration Works

### Initialization

```javascript
// armoriq-client.js
const ArmorIQ = require('@armoriq/sdk');

const client = new ArmorIQ({
  apiKey: process.env.ARMORIQ_API_KEY,
  baseUrl: process.env.ARMORIQ_API_URL
});
```

The real SDK:
- Authenticates with your API key
- Establishes TLS connection to ArmorIQ API
- Returns authenticated client ready for operations

### Contract Registration (Real)

**Before (Simulated):**
```javascript
const contractId = this._generateContractId();  // Fake ID
return { contractId, registered: true };
```

**After (Real SDK):**
```javascript
const response = await this.client.contracts.register({
  name: `intentlock-${Date.now()}`,
  metadata: { /* contract details */ },
  tags: ['intentlock', 'ai-verification']
});

return {
  contractId: response.id,  // REAL ID from ArmorIQ
  registered: true,
  armoriqResponse: response
};
```

The real SDK:
- Posts contract metadata to ArmorIQ API
- Creates immutable contract record
- Returns unique contract ID
- Enables audit trail linking

### Policy Enforcement (Real)

**Before (Simulated):**
```javascript
const shouldBlock = violations.length > 0;
console.log(shouldBlock ? 'BLOCKED' : 'ALLOWED');
```

**After (Real SDK):**
```javascript
const policyDecision = await this.client.policies.enforce({
  contractId,
  resource: filePath,
  violations: violations.map(v => ({
    type: v.type,
    severity: v.severity,
    detail: v.detail
  }))
});

// Real policy engine evaluates decision
return {
  allowed: !policyDecision.blocked,
  policyDecision: policyDecision
};
```

The real SDK:
- Evaluates violations against registered policies
- Applies severity thresholds
- Returns enforcement decision
- Records decision for audit trail

### Immutable Audit Logging (Real)

**Before (Simulated):**
```javascript
const auditId = this._generateAuditId();  // Fake ID
console.log(`Audit ID: ${auditId}`);
```

**After (Real SDK):**
```javascript
const auditResponse = await this.client.audit.log({
  contractId,
  resource: filePath,
  result: safe ? 'compliant' : 'non-compliant',
  evidence: {
    violations,
    severityBreakdown,
    behavior: { /* semantic data */ }
  }
});

// Real audit is immutable in ArmorIQ
return {
  auditId: auditResponse.id,  // REAL immutable ID
  logged: true,
  armoriqResponse: auditResponse
};
```

The real SDK:
- Sends audit evidence to ArmorIQ
- Creates immutable audit record
- Returns audit ID for compliance tracking
- Enables forensic analysis later

## 🧪 Testing Real Integration

### Test 1: Check SDK Installation

```bash
node -e "const ArmorIQ = require('@armoriq/sdk'); console.log('✅ SDK installed')"
```

### Test 2: Verify API Key

```bash
node -e "
  require('dotenv').config();
  if (process.env.ARMORIQ_API_KEY) {
    console.log('✅ API key configured');
  } else {
    console.log('❌ API key missing - add to .env');
  }
"
```

### Test 3: Test ArmorIQ Health Check

```bash
node -e "
  const { ArmorIQClient } = require('./armoriq-client');
  const client = new ArmorIQClient();
  client.healthCheck().then(health => {
    console.log('Health:', health);
  });
"
```

### Test 4: Full Verification with Real SDK

```bash
# Create test file with violations
cat > test_real_violation.js << 'EOF'
exec("rm -rf /");
user.role = "admin";
EOF

# Run verification with REAL ArmorIQ SDK
node scripts/verify-intent.js test_real_violation.js

# Expected output:
# 📝 ArmorIQ: Registering intent contract...  ← REAL SDK call
# ✓ Contract registered: contract-...         ← REAL contract ID
# [semantic analysis output]
# 🛡  ArmorIQ: Evaluating policy enforcement... ← REAL policy evaluation
# 📜 ArmorIQ: Storing immutable audit evidence... ← REAL immutable logging
# ⛔ COMMIT BLOCKED
```

## 🔐 Security Considerations

### API Key Protection

**DO:**
- ✅ Store ARMORIQ_API_KEY in `.env` (in .gitignore)
- ✅ Rotate keys periodically
- ✅ Use environment-specific keys
- ✅ Limit key scope via ArmorIQ console

**DON'T:**
- ❌ Commit `.env` to git
- ❌ Log API keys
- ❌ Share keys via email
- ❌ Use same key across environments

### Network Security

The real SDK:
- ✅ Uses TLS 1.2+ encryption
- ✅ Validates SSL certificates
- ✅ Authenticates with API key
- ✅ Rate limits API requests
- ✅ Logs all API calls

### Audit Trail

The real SDK creates:
- ✅ Immutable audit records
- ✅ Timestamped evidence
- ✅ Cryptographic signatures
- ✅ Tamper detection
- ✅ Forensic capabilities

## 🔄 Integration Architecture

```
┌─────────────────────────────────────┐
│  Developer (git commit)              │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│  verify-intent.js (orchestrator)    │
│  • Loads code and contract          │
│  • Calls IntentLock analyzer        │
│  • Calls IntentLock detector        │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│  armoriq-client.js (governance)     │
│  • Calls REAL SDK contracts API     │
│  • Calls REAL SDK policies API      │
│  • Calls REAL SDK audit API         │
└─────────────────────────────────────┘
                 ↓
      [REAL ArmorIQ Service]
      • Validates contracts
      • Enforces policies
      • Stores immutable audit
                 ↓
         Exit 0 (allow) or 1 (block)
```

## 📊 Real SDK Methods Reference

### contracts.register(payload)

```javascript
await client.contracts.register({
  name: string,           // Contract name
  source: string,         // Where it came from
  metadata: object,       // Contract details
  tags: array,            // Classification tags
  clientId: string        // Client identifier
});
```

**Returns:**
```javascript
{
  id: string,             // Unique contract ID
  createdAt: timestamp,   // When registered
  policy: object          // Associated policy
}
```

### policies.enforce(payload)

```javascript
await client.policies.enforce({
  contractId: string,     // Which contract to use
  resource: string,       // File being checked
  action: string,         // Action (commit, deploy, etc.)
  violations: array,      // Violations detected
  metadata: object        // Context data
});
```

**Returns:**
```javascript
{
  blocked: boolean,       // Should commit be blocked?
  decision: string,       // Decision reason
  appliedPolicy: object   // Policy that was applied
}
```

### audit.log(payload)

```javascript
await client.audit.log({
  contractId: string,     // Associated contract
  resource: string,       // File analyzed
  action: string,         // Action taken
  result: string,         // Result (compliant/non-compliant)
  evidence: object,       // Detailed evidence
  metadata: object        // Additional context
});
```

**Returns:**
```javascript
{
  id: string,             // Immutable audit ID
  timestamp: timestamp,   // When logged
  hash: string            // Tamper-proof hash
}
```

### health.check()

```javascript
await client.health.check();
```

**Returns:**
```javascript
{
  healthy: boolean,
  status: string,
  version: string
}
```

## ⚙️ Configuration Options

### Environment Variables

```bash
# Required
ARMORIQ_API_KEY=sk_live_...

# Optional
ARMORIQ_API_URL=https://api.armoriq.io/v1
ARMORIQ_CLIENT_ID=intentlock-client
ARMORIQ_ENVIRONMENT=production
```

### Advanced Options

```javascript
const client = new ArmorIQ({
  apiKey: process.env.ARMORIQ_API_KEY,
  baseUrl: process.env.ARMORIQ_API_URL,
  timeout: 30000,           // Request timeout (ms)
  retries: 3,               // Retry attempts
  rateLimitOverride: false  // Respect rate limits
});
```

## 🚨 Error Handling

The real SDK throws errors in these cases:

| Error | Cause | Action |
|-------|-------|--------|
| `AuthenticationError` | Invalid API key | Check ARMORIQ_API_KEY |
| `NetworkError` | Connection failed | Check internet/firewall |
| `RateLimitError` | Too many requests | Implement backoff |
| `ValidationError` | Invalid payload | Check contract format |
| `ServerError` | ArmorIQ service issue | Retry with backoff |

ArmorIQ client handles these with:
- Automatic retries (configurable)
- Exponential backoff
- Detailed error messages
- Fallback mode for non-critical operations

## 📈 Production Deployment

### Before Going Live

1. **Test API Key:**
   ```bash
   npm run verify test_file.js
   ```

2. **Check Rate Limits:**
   - ArmorIQ API: 1000 requests/hour
   - Configure retry strategy if needed

3. **Enable Monitoring:**
   - Monitor audit log responses
   - Track policy enforcement decisions
   - Alert on API errors

4. **Security Review:**
   - Rotate API key if shared
   - Enable IP whitelist in ArmorIQ console
   - Review audit logs for access patterns

### Scaling Considerations

- Real SDK handles multi-threaded calls
- Implements connection pooling
- Rate limiting is per-key, not per-instance
- Async/await ensures non-blocking I/O

## 🔗 Links & Resources

- [ArmorIQ Documentation](https://docs.armoriq.io)
- [ArmorIQ Console](https://console.armoriq.io)
- [SDK GitHub](https://github.com/armoriq/sdk)
- [API Reference](https://api.armoriq.io/docs)

## 💡 Troubleshooting

### "API key not found"

**Solution:**
```bash
# Check .env exists
ls -la .env

# Check key is set
grep ARMORIQ_API_KEY .env

# Reload environment
export $(cat .env | xargs)
```

### "Authentication failed"

**Solution:**
- Verify API key is valid
- Check it hasn't been rotated in ArmorIQ console
- Verify URL is correct

### "Network error"

**Solution:**
- Check internet connection
- Verify firewall allows outbound HTTPS
- Check ArmorIQ service status

### "SDK not found"

**Solution:**
```bash
npm install @armoriq/sdk
npm list @armoriq/sdk
```

## 📝 Next Steps

1. ✅ Install @armoriq/sdk package
2. ✅ Add ARMORIQ_API_KEY to .env
3. ✅ Test with: `npm run verify test_file.js`
4. ✅ Integrate into CI/CD pipeline
5. ✅ Monitor audit logs in ArmorIQ console

---

**Your IntentLock + ArmorIQ integration is now using the REAL governance layer!** 🛡️
