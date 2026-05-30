/**
 * IntentLock Simplified Backend Server
 * With Gemini Pro API integration for contract generation (direct HTTP)
 */

const path = require('path');
const express = require('express');
const https = require('https');
const { analyzeBehavior } = require('../analyzer/analyzer-improved');
const { detectDrift } = require('../analyzer/driftDetector-improved');

// Load environment variables from the backend/.env file
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(express.json());

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('⚠️  GEMINI_API_KEY not set. Contract generation will use defaults.');
  console.warn('Set GEMINI_API_KEY environment variable to enable AI-powered contract generation.');
} else {
  console.log('✅ GEMINI_API_KEY loaded:', apiKey.substring(0, 20) + '...');
}
console.log('✅ Using direct HTTP API calls to Gemini Pro');

// Helper function to call Gemini Pro API via direct HTTP
async function callGeminiPro(prompt) {
  return new Promise((resolve, reject) => {
    const systemInstruction = `You are an intent contract generator. Given a developer's prompt, generate ONLY a valid JSON contract with these fields:
- allowed_routes (array of API paths like /auth/login, /api/users)
- allowed_methods (array from: GET, POST, PUT, DELETE)
- allowed_dependencies (array of npm packages)
- allowed_domains (array of external domains)
- forbidden_actions (array from: file_system_access, outbound_network_calls, child_process_execution, hardcoded_secrets, unauthorized_db_access)
- intent_constraints (object with max_risk_level: HIGH/MEDIUM/LOW)

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`;

    const fullPrompt = `${systemInstruction}\n\nUser prompt: ${prompt}`;

    const postData = JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          console.log('Response status:', res.statusCode);
          console.log('Response data:', data.substring(0, 200));
          const parsed = JSON.parse(data);
          if (parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content) {
            const responseText = parsed.candidates[0].content.parts[0].text.trim();
            resolve(responseText);
          } else {
            console.error('Response structure:', JSON.stringify(parsed, null, 2).substring(0, 300));
            reject(new Error('Invalid Gemini response structure'));
          }
        } catch (e) {
          console.error('Parse error:', e.message);
          console.error('Raw data:', data);
          reject(e);
        }
      });
    });

    req.on('error', (err) => {
      console.error('Request error type:', err.constructor.name);
      console.error('Request error message:', err.message);
      console.error('Request error code:', err.code);
      reject(err);
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ====================================================================
// GENERATE CONTRACT ENDPOINT - Using Gemini Pro (Direct HTTP)
// ====================================================================
app.post('/generate-contract', async (req, res) => {
  console.log('🔥 /generate-contract endpoint called');
  try {
    const { prompt, intent_name } = req.body;
    console.log('Received prompt:', prompt.substring(0, 50));
    
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API key not configured' });
    }

    try {
      console.log('📞 Calling Gemini Pro API (direct HTTP)...');
      console.log('API Key length:', apiKey.length);
      console.log('Prompt length:', prompt.length);
      const responseText = await callGeminiPro(prompt);
      
      console.log('📝 Gemini response received, length:', responseText.length);
      
      // Parse JSON response
      let contract = JSON.parse(responseText);
      
      // Ensure required fields exist
      contract.intent_name = intent_name || 'unnamed';
      contract.prompt = prompt;
      contract.version = contract.version || '1.0';
      contract.timestamp = new Date().toISOString();
      
      console.log('✅ Contract generated using Gemini Pro');
      return res.json(contract);
    } catch (geminiErr) {
      console.error('❌ Gemini API error type:', geminiErr.constructor.name);
      console.error('❌ Gemini API error message:', geminiErr.message);
      console.error('❌ Gemini API error full:', geminiErr);
      return res.status(500).json({ error: 'Gemini API failed: ' + geminiErr.message });
    }
  } catch (err) {
    console.error('Endpoint error:', err.message);
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

// All endpoints are POST-based (analyze, generate-contract, verify)
// Status can be checked by making any request to /analyze

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
