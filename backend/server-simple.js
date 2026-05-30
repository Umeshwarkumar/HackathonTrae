/**
 * IntentLock Simplified Backend Server
 * Minimal version focused on working endpoints
 */

const express = require('express');
const { analyzeBehavior } = require('../analyzer/analyzer-improved');
const { detectDrift } = require('../analyzer/driftDetector-improved');

const app = express();
app.use(express.json());

// ====================================================================
// GENERATE CONTRACT ENDPOINT
// ====================================================================
app.post('/generate-contract', async (req, res) => {
  try {
    const { prompt, intent_name } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const defaultContract = {
      intent_name: intent_name || 'unnamed',
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
        allow_admin_assignment: false,
        max_risk_level: 'MEDIUM'
      },
      allowed_routes: [],
      allowed_methods: ['GET', 'POST'],
      allowed_dependencies: [],
      allowed_domains: [],
      allowed_tables: [],
      allowed_paths: [],
      allowed_roles: ['user']
    };

    res.json(defaultContract);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// ANALYZE ENDPOINT
// ====================================================================
app.post('/analyze', async (req, res) => {
  try {
    const { code, contract } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Missing code' });
    }

    if (!contract) {
      return res.status(400).json({ error: 'Missing contract' });
    }

    // Analyze behavior
    const behavior = analyzeBehavior(code);
    
    // Detect drift
    const driftResult = detectDrift(contract, behavior);

    // Build response
    const analysisResult = {
      safe: driftResult.safe,
      violations_count: driftResult.violations.length,
      violations: driftResult.violations.slice(0, 10),
      semantic_operations: behavior.semantic_operations.slice(0, 20),
      risk_summary: behavior.risk_summary,
      severity_breakdown: driftResult.severity_breakdown,
      domain_summary: driftResult.domain_summary,
      analysis_timestamp: new Date().toISOString()
    };

    res.json(analysisResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// VERIFY ENDPOINT (Combines generation + analysis)
// ====================================================================
app.post('/verify', async (req, res) => {
  try {
    const { code, prompt } = req.body;

    if (!code || !prompt) {
      return res.status(400).json({ error: 'Missing code or prompt' });
    }

    // Generate contract
    const contract = {
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
        allow_admin_assignment: false,
        max_risk_level: 'MEDIUM'
      },
      allowed_routes: [],
      allowed_methods: ['GET', 'POST'],
      allowed_dependencies: [],
      allowed_domains: [],
      allowed_tables: [],
      allowed_paths: [],
      allowed_roles: ['user']
    };

    // Analyze
    const behavior = analyzeBehavior(code);
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

    res.json(verifyResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// HEALTH CHECK
// ====================================================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ====================================================================
// ERROR HANDLING
// ====================================================================
app.use((err, req, res, next) => {
  console.error('Caught error:', err);
  console.error('Error stack:', err.stack);
  res.status(500).json({ 
    error: err.message,
    stack: err.stack,
    type: err.constructor.name
  });
});

// ====================================================================
// START SERVER
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
