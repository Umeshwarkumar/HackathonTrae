/**
 * FastAPI Backend (Updated with Enhanced Logging)
 * Note: This is Node.js version for testing - actual backend is in Python
 * 
 * Improvements:
 * - Automatic forbidden_actions inclusion
 * - Comprehensive logging at all endpoints
 * - Better error handling
 * - Request/response tracking
 */

const express = require('express');
const { analyzeBehavior } = require('../analyzer/analyzer-improved');
const { detectDrift } = require('../analyzer/driftDetector-improved');

const app = express();
app.use(express.json());

// Simple request logging middleware
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log(`  Body: ${JSON.stringify(req.body).substring(0, 100)}...`);
  next();
});

// ====================================================================
// GENERATE CONTRACT ENDPOINT (Enhanced)
// ====================================================================
app.post('/generate-contract', async (req, res) => {
  console.log('\n' + '='.repeat(70));
  console.log('📋 POST /generate-contract');
  console.log('='.repeat(70));

  try {
    const { prompt, intent_name } = req.body;
    
    if (!prompt) {
      console.log('  ❌ Error: Missing prompt');
      return res.status(400).json({ error: 'Missing prompt' });
    }

    console.log(`  Intent: "${intent_name || 'unnamed'}"`);
    console.log(`  Prompt: "${prompt.substring(0, 80)}..."`);

    // Default secure contract with automatic forbidden_actions
    const defaultContract = {
      intent_name: intent_name || 'unnamed',
      prompt: prompt,
      version: '1.0',
      timestamp: new Date().toISOString(),
      
      // AUTOMATIC FORBIDDEN ACTIONS (Default to secure)
      forbidden_actions: [
        'outbound_network_calls',
        'file_system_access',
        'child_process_execution',
        'hardcoded_secrets',
        'unauthorized_db_access'
      ],

      // DEFAULT CONSTRAINTS (Strict)
      intent_constraints: {
        allow_bulk_operations: false,
        allow_recursive_delete: false,
        allow_shell_execution: false,
        allow_external_network_calls: false,
        allow_privilege_escalation: false,
        allow_admin_assignment: false,
        max_risk_level: 'MEDIUM'
      },

      // ALLOWED LISTS (Empty by default - whitelist approach)
      allowed_routes: [],
      allowed_methods: ['GET', 'POST'],
      allowed_dependencies: [],
      allowed_domains: [],
      allowed_tables: [],
      allowed_paths: [],
      allowed_roles: ['user']
    };

    // Parse prompt for intent customizations
    const customizations = parsePrompt(prompt);
    
    console.log(`\n  🔧 Applying customizations:`);
    if (customizations.allowNetworkCalls) {
      defaultContract.intent_constraints.allow_external_network_calls = true;
      defaultContract.forbidden_actions = defaultContract.forbidden_actions.filter(a => a !== 'outbound_network_calls');
      console.log(`    - Allowing external network calls`);
    }
    if (customizations.allowFileAccess) {
      defaultContract.intent_constraints.allow_bulk_operations = true;
      console.log(`    - Allowing file system access`);
    }
    if (customizations.allowedDomains && customizations.allowedDomains.length > 0) {
      defaultContract.allowed_domains = customizations.allowedDomains;
      console.log(`    - Allowed domains: ${customizations.allowedDomains.join(', ')}`);
    }

    console.log(`\n  ✅ Contract generated with defaults`);
    console.log(`  Forbidden Actions: ${defaultContract.forbidden_actions.length}`);
    console.log(`  Max Risk Level: ${defaultContract.intent_constraints.max_risk_level}`);

    res.json(defaultContract);

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ====================================================================
// ANALYZE ENDPOINT (Enhanced)
// ====================================================================
app.post('/analyze', async (req, res) => {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 POST /analyze');
  console.log('='.repeat(70));

  try {
    const { code, contract } = req.body;

    if (!code) {
      console.log('  ❌ Error: Missing code');
      return res.status(400).json({ error: 'Missing code' });
    }

    if (!contract) {
      console.log('  ❌ Error: Missing contract');
      return res.status(400).json({ error: 'Missing contract' });
    }

    console.log(`  Code length: ${code.length} chars`);
    console.log(`  Contract: ${contract.intent_name}`);

    // Analyze behavior
    console.log(`\n  → Step 1: Analyzing code semantics...`);
    const behavior = analyzeBehavior(code);
    
    // Detect drift
    console.log(`\n  → Step 2: Detecting semantic drift...`);
    const driftResult = detectDrift(contract, behavior);

    // Build response
    const analysisResult = {
      safe: driftResult.safe,
      violations_count: driftResult.violations.length,
      violations: driftResult.violations.slice(0, 10), // Top 10 violations
      semantic_operations: behavior.semantic_operations.slice(0, 20), // Top 20 operations
      risk_summary: behavior.risk_summary,
      severity_breakdown: driftResult.severity_breakdown,
      domain_summary: driftResult.domain_summary,
      analysis_timestamp: new Date().toISOString()
    };

    console.log(`\n  ✅ Analysis complete`);
    console.log(`     Safe: ${analysisResult.safe}`);
    console.log(`     Violations: ${analysisResult.violations_count}`);
    console.log(`     Critical: ${analysisResult.severity_breakdown.CRITICAL}`);
    console.log(`     High: ${analysisResult.severity_breakdown.HIGH}`);

    res.json(analysisResult);

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ====================================================================
// VERIFY ENDPOINT (Combines generation + analysis)
// ====================================================================
app.post('/verify', async (req, res) => {
  console.log('\n' + '='.repeat(70));
  console.log('✅ POST /verify (Full Pipeline)');
  console.log('='.repeat(70));

  try {
    const { code, prompt } = req.body;

    if (!code || !prompt) {
      return res.status(400).json({ error: 'Missing code or prompt' });
    }

    console.log(`  Verifying code against intent...`);

    // Step 1: Generate contract
    console.log(`\n  → Step 1: Generating intent contract from prompt...`);
    const contractReq = { prompt, intent_name: 'generated' };
    let contract = {
      intent_name: 'generated',
      prompt: prompt,
      version: '1.0',
      timestamp: new Date().toISOString(),
      forbidden_actions: [
        'outbound_network_calls',
        'file_system_access',
        'child_process_execution',
        'hardcoded_secrets'
      ],
      intent_constraints: {
        allow_bulk_operations: false,
        allow_recursive_delete: false,
        allow_shell_execution: false,
        allow_external_network_calls: false,
        allow_privilege_escalation: false,
        max_risk_level: 'MEDIUM'
      }
    };

    // Step 2: Analyze code
    console.log(`\n  → Step 2: Analyzing code semantics...`);
    const behavior = analyzeBehavior(code);

    // Step 3: Detect drift
    console.log(`\n  → Step 3: Detecting semantic drift...`);
    const driftResult = detectDrift(contract, behavior);

    const verifyResult = {
      prompt: prompt,
      code_length: code.length,
      contract: contract,
      behavior: {
        semantic_operations_count: behavior.semantic_operations.length,
        network_calls: behavior.network_calls.length,
        fs_operations: behavior.fs_operations.length,
        process_commands: behavior.process_commands.length,
        db_queries: behavior.db_queries.length,
        risk_summary: behavior.risk_summary
      },
      violations: driftResult.violations.slice(0, 10),
      safe: driftResult.safe,
      summary: driftResult.summary,
      verification_timestamp: new Date().toISOString()
    };

    console.log(`\n  ✅ Verification complete`);
    console.log(`     Result: ${driftResult.safe ? 'SAFE' : 'UNSAFE'}`);
    console.log(`     Operations: ${behavior.semantic_operations.length}`);
    console.log(`     Violations: ${driftResult.violations.length}`);

    res.json(verifyResult);

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ====================================================================
// HEALTH CHECK
// ====================================================================
app.get('/health', (req, res) => {
  console.log('  ✅ Health check OK');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ====================================================================
// ERROR HANDLING
// ====================================================================
app.use((err, req, res, next) => {
  console.log(`\n  ❌ Unhandled error: ${err.message}`);
  res.status(500).json({ error: err.message });
});

// ====================================================================
// HELPER: Parse prompt for customizations
// ====================================================================
function parsePrompt(prompt) {
  const result = {
    allowNetworkCalls: false,
    allowFileAccess: false,
    allowedDomains: [],
    allowedTables: []
  };

  const lower = prompt.toLowerCase();

  if (lower.includes('network') || lower.includes('fetch') || lower.includes('http')) {
    result.allowNetworkCalls = true;
  }

  if (lower.includes('file') || lower.includes('read') || lower.includes('write')) {
    result.allowFileAccess = true;
  }

  // Extract domain whitelist
  const domainMatch = prompt.match(/allow.*?domain[s]?:?\s*([a-z0-9., -]+)/i);
  if (domainMatch) {
    result.allowedDomains = domainMatch[1].split(/[,\s]+/).filter(d => d.length > 0);
  }

  return result;
}

// ====================================================================
// SERVER START
// ====================================================================
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('\n' + '='.repeat(70));
    console.log(`🚀 IntentLock Backend Server`);
    console.log(`📍 Running on http://localhost:${PORT}`);
    console.log('='.repeat(70) + '\n');
  });
}

module.exports = app;
