#!/usr/bin/env node

/**
 * IntentLock + ArmorIQ Verification Orchestrator
 * 
 * Coordinates the complete verification pipeline with REAL ArmorIQ SDK:
 * 1. Semantic analysis of code (IntentLock)
 * 2. Drift detection against intent contract (IntentLock)
 * 3. Policy enforcement (ArmorIQ SDK)
 * 4. Immutable audit logging (ArmorIQ SDK)
 * 
 * IMPORTANT: This script wraps around existing IntentLock logic.
 * It does NOT replace semantic analysis or drift detection.
 * All IntentLock verification logic remains UNCHANGED.
 */

const fs = require('fs');
const path = require('path');
const { ArmorIQClient } = require(path.join(__dirname, '..', 'armoriq-client'));

// Load IntentLock modules (IMPROVED versions with better semantic analysis)
let analyzeBehavior, detectDrift;

try {
  const analyzer = require(path.join(__dirname, '..', 'analyzer', 'analyzer-improved'));
  const driftDetector = require(path.join(__dirname, '..', 'analyzer', 'driftDetector-improved'));
  
  analyzeBehavior = analyzer.analyzeBehavior;
  detectDrift = driftDetector.detectDrift;
} catch (error) {
  console.error('❌ Failed to load IntentLock modules:', error.message);
  process.exit(1);
}

/**
 * Main verification orchestrator with REAL ArmorIQ SDK integration
 */
async function verifyIntentWithArmorIQ() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 IntentLock Semantic Verification Running...');
  console.log('    (with ArmorIQ Governance Layer)');
  console.log('='.repeat(70) + '\n');

  // Parse command-line arguments
  const args = process.argv.slice(2);
  const filePath = args[0] || process.env.VERIFY_FILE_PATH;
  const contractPath = args[1] || process.env.VERIFY_CONTRACT_PATH;
  const commitMessage = process.env.GIT_COMMIT_MESSAGE || 'N/A';

  if (!filePath) {
    console.error('❌ Error: File path required');
    console.error('Usage: node scripts/verify-intent.js <file-path> [contract-path]');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found: ${filePath}`);
    process.exit(1);
  }

  // ====================================================================
  // STEP 1: Load code and contract
  // ====================================================================
  console.log(`📄 Analyzing: ${filePath}`);

  const code = fs.readFileSync(filePath, 'utf8');
  
  let contract = {
    allowed_routes: [],
    allowed_methods: [],
    allowed_dependencies: [],
    forbidden_actions: [],
    intent_constraints: {}
  };

  if (contractPath && fs.existsSync(contractPath)) {
    try {
      contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
      console.log(`📋 Contract loaded: ${contractPath}`);
    } catch (error) {
      console.warn(`⚠️  Contract parsing failed, using defaults`);
    }
  } else {
    console.log('⚠️  No contract specified, using default constraints');
  }

  // ====================================================================
  // INTEGRATION POINT 1: Register Intent Contract with REAL ArmorIQ SDK
  // ====================================================================
  const armorIQ = new ArmorIQClient();
  
  // Check ArmorIQ health before registration
  console.log('\n📋 Initializing ArmorIQ governance layer...');
  const healthCheck = await armorIQ.healthCheck();
  if (!healthCheck.healthy) {
    console.warn(`⚠️  ArmorIQ connection warning: ${healthCheck.message}`);
  }

  // Register contract with REAL ArmorIQ SDK
  const registration = await armorIQ.registerIntent(contract, 'intentlock-verify');
  const contractId = registration.contractId;

  if (registration.registered) {
    console.log(`✓ Contract registered: ${contractId}`);
  } else if (registration.fallbackMode) {
    console.log(`⚠️  Contract registration failed, continuing in fallback mode`);
  }

  console.log();

  // ====================================================================
  // STEP 2: SEMANTIC ANALYSIS (IntentLock - UNCHANGED)
  // ====================================================================
  console.log('🔬 Semantic Analysis Phase:');
  console.log('   Extracting: database, filesystem, network, auth, process, api operations\n');

  let behavior;
  try {
    // Call IntentLock analyzer - NO CHANGES
    behavior = analyzeBehavior(code);
    console.log(`✓ Operations extracted: ${behavior.semantic_operations?.length || 0} semantic operations`);
    console.log(`✓ Dependencies found: ${behavior.dependencies?.length || 0}`);
    console.log(`✓ Routes detected: ${behavior.routes?.length || 0}\n`);
  } catch (error) {
    console.error('❌ Semantic analysis failed:', error.message);
    process.exit(1);
  }

  // ====================================================================
  // STEP 3: DRIFT DETECTION (IntentLock - UNCHANGED)
  // ====================================================================
  console.log('🔍 Drift Detection Phase:');
  console.log('   Comparing behavior against intent constraints\n');

  let driftResult;
  try {
    // Call IntentLock drift detector - NO CHANGES
    driftResult = detectDrift(contract, behavior);
    console.log(`✓ Analysis complete`);
    console.log(`✓ Violations: ${driftResult.violations?.length || 0}`);
    console.log(`✓ Safe: ${driftResult.safe ? 'YES ✅' : 'NO ❌'}`);
    
    if (driftResult.severity_breakdown) {
      console.log(`✓ Severity breakdown:`, driftResult.severity_breakdown);
    }
    console.log();
  } catch (error) {
    console.error('❌ Drift detection failed:', error.message);
    process.exit(1);
  }

  // ====================================================================
  // INTEGRATION POINT 2: Enforce Policy with REAL ArmorIQ SDK
  // ====================================================================
  console.log('🛡  Policy Enforcement Phase:\n');

  const enforcement = await armorIQ.enforcePolicy({
    violations: driftResult.violations,
    contractId,
    filePath,
    commitMessage
  });

  const shouldBlock = !enforcement.allowed;

  // ====================================================================
  // INTEGRATION POINT 3: Immutable Audit Logging with REAL ArmorIQ SDK
  // ====================================================================
  console.log('\n📊 Audit Logging Phase:\n');

  const auditData = {
    contractId,
    filePath,
    behavior,
    violations: driftResult.violations,
    safe: driftResult.safe,
    summary: driftResult.summary || 'Verification complete'
  };

  const auditResult = await armorIQ.auditLog(auditData);

  console.log();

  // ====================================================================
  // FINAL DECISION
  // ====================================================================
  console.log('='.repeat(70));
  if (shouldBlock) {
    console.log('⛔ COMMIT BLOCKED');
    console.log('='.repeat(70));
    console.log('\n📋 Violations Summary:');
    driftResult.violations.forEach((v, idx) => {
      console.log(`   ${idx + 1}. [${v.severity}] ${v.type}`);
      console.log(`      → ${v.detail}`);
    });
    console.log(`\n💡 Fix the violations above before committing.\n`);
    process.exit(1);
  } else {
    console.log('✅ COMMIT ALLOWED');
    console.log('='.repeat(70));
    console.log('\n✨ Code verified compliant with intent contract.\n');
    process.exit(0);
  }
}

// Run orchestrator with error handling
verifyIntentWithArmorIQ().catch(error => {
  console.error('\n❌ Verification orchestrator failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
