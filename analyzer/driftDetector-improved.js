/**
 * IntentLock - Semantic Drift Detector
 * 
 * Enhanced with:
 * - 7-domain drift detection
 * - Semantic operation matching against intent constraints
 * - Detailed logging throughout
 * - Comprehensive violation detection
 */

/**
 * Main drift detection function
 */
function detectDrift(contract, behavior) {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 DRIFT DETECTOR - COMPREHENSIVE ANALYSIS');
  console.log('='.repeat(70));

  const violations = [];
  const summary = {
    database: 0,
    filesystem: 0,
    network: 0,
    auth: 0,
    process: 0,
    api: 0,
    risk_level: 0
  };

  // Ensure defaults
  const constraints = contract.intent_constraints || {};
  const allowedRoutes = contract.allowed_routes || [];
  const allowedMethods = contract.allowed_methods || [];
  const forbiddenActions = contract.forbidden_actions || [];
  const allowedDomains = contract.allowed_domains || [];
  const allowedTables = contract.allowed_tables || [];
  const allowedPaths = contract.allowed_paths || [];
  const allowedRoles = contract.allowed_roles || [];

  console.log('\n📋 Contract Constraints:');
  console.log(`   Allow Bulk Operations: ${constraints.allow_bulk_operations === true ? 'YES' : 'NO'}`);
  console.log(`   Allow Recursive Delete: ${constraints.allow_recursive_delete === true ? 'YES' : 'NO'}`);
  console.log(`   Allow Shell Execution: ${constraints.allow_shell_execution === true ? 'YES' : 'NO'}`);
  console.log(`   Allow External Network: ${constraints.allow_external_network_calls === true ? 'YES' : 'NO'}`);
  console.log(`   Allow Privilege Escalation: ${constraints.allow_privilege_escalation === true ? 'YES' : 'NO'}`);
  console.log(`   Max Risk Level: ${constraints.max_risk_level || 'UNSPECIFIED'}`);
  console.log(`   Forbidden Actions: ${forbiddenActions.join(', ') || 'NONE'}`);

  // ====================================================================
  // DOMAIN 1: RISK LEVEL DRIFT
  // ====================================================================
  console.log('\n[DOMAIN 1] Risk Level Drift Detection...');
  
  const riskOrder = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  const maxRiskAllowed = riskOrder[constraints.max_risk_level] || 4; // Default to CRITICAL

  const criticalOps = behavior.semantic_operations.filter(op => riskOrder[op.risk] >= 3);
  if (criticalOps.length > 0 && maxRiskAllowed < 3) {
    criticalOps.forEach(op => {
      console.log(`  ⚠️  Risk level ${op.risk} > contract max ${constraints.max_risk_level}`);
      violations.push({
        type: 'risk_level_drift',
        severity: op.risk,
        detail: `Operation risk (${op.risk}) exceeds contract maximum (${constraints.max_risk_level})`,
        operation: op,
        domain: op.domain
      });
      summary.risk_level++;
    });
  }

  // ====================================================================
  // DOMAIN 2: DATABASE DRIFT
  // ====================================================================
  console.log('\n[DOMAIN 2] Database Drift Detection...');
  
  const dbOps = behavior.semantic_operations.filter(op => op.domain === 'database');
  
  dbOps.forEach(op => {
    console.log(`  Checking: ${op.action} on ${op.target}`);

    // Check: Bulk operations not allowed
    if (!constraints.allow_bulk_operations && ['BULK_DELETE', 'BULK_UPDATE'].includes(op.action)) {
      console.log(`    ⚠️  VIOLATION: Bulk ${op.action} not allowed`);
      violations.push({
        type: 'semantic_drift',
        severity: 'CRITICAL',
        detail: `${op.action} operations not allowed by contract`,
        operation: op,
        domain: 'database'
      });
      summary.database++;
    }

    // Check: Specific tables allowed
    if (allowedTables.length > 0 && !allowedTables.includes(op.target)) {
      console.log(`    ⚠️  VIOLATION: Table ${op.target} not in allowed list`);
      violations.push({
        type: 'semantic_drift',
        severity: 'HIGH',
        detail: `Access to table "${op.target}" not permitted. Allowed: ${allowedTables.join(', ')}`,
        operation: op,
        domain: 'database'
      });
      summary.database++;
    }

    // Check: DELETE on all rows
    if (op.action === 'BULK_DELETE' && !op.metadata.hasWhere) {
      console.log(`    ⚠️  VIOLATION: Unrestricted DELETE (no WHERE clause)`);
      violations.push({
        type: 'semantic_drift',
        severity: 'CRITICAL',
        detail: `Unrestricted DELETE operation detected (missing WHERE clause)`,
        operation: op,
        domain: 'database'
      });
      summary.database++;
    }

    // Check: Risk level
    if (riskOrder[op.risk] > maxRiskAllowed) {
      console.log(`    ⚠️  VIOLATION: Risk ${op.risk} exceeds max ${constraints.max_risk_level}`);
      violations.push({
        type: 'semantic_drift',
        severity: op.risk,
        detail: `Database operation risk (${op.risk}) exceeds contract maximum`,
        operation: op,
        domain: 'database'
      });
      summary.database++;
    }
  });

  // ====================================================================
  // DOMAIN 3: FILESYSTEM DRIFT
  // ====================================================================
  console.log('\n[DOMAIN 3] Filesystem Drift Detection...');
  
  const fsOps = behavior.semantic_operations.filter(op => op.domain === 'filesystem');

  fsOps.forEach(op => {
    console.log(`  Checking: ${op.action} on ${op.target}`);

    // Check: Recursive delete not allowed
    if (!constraints.allow_recursive_delete && op.metadata.recursive) {
      console.log(`    ⚠️  VIOLATION: Recursive delete not allowed`);
      violations.push({
        type: 'semantic_drift',
        severity: 'CRITICAL',
        detail: `Recursive filesystem delete not permitted: ${op.target}`,
        operation: op,
        domain: 'filesystem'
      });
      summary.filesystem++;
    }

    // Check: System paths protected
    if (op.metadata.systemPath) {
      console.log(`    ⚠️  VIOLATION: System path access: ${op.target}`);
      violations.push({
        type: 'semantic_drift',
        severity: 'CRITICAL',
        detail: `Dangerous system path access: ${op.target}`,
        operation: op,
        domain: 'filesystem'
      });
      summary.filesystem++;
    }

    // Check: Allowed paths
    if (allowedPaths.length > 0 && !allowedPaths.some(p => op.target.startsWith(p))) {
      console.log(`    ⚠️  VIOLATION: Path ${op.target} not in allowed list`);
      violations.push({
        type: 'semantic_drift',
        severity: 'HIGH',
        detail: `File access outside allowed paths: ${op.target}`,
        operation: op,
        domain: 'filesystem'
      });
      summary.filesystem++;
    }

    // Check: Risk level
    if (riskOrder[op.risk] > maxRiskAllowed) {
      console.log(`    ⚠️  VIOLATION: Risk ${op.risk} exceeds max ${constraints.max_risk_level}`);
      violations.push({
        type: 'semantic_drift',
        severity: op.risk,
        detail: `Filesystem operation risk (${op.risk}) exceeds contract maximum`,
        operation: op,
        domain: 'filesystem'
      });
      summary.filesystem++;
    }
  });

  // ====================================================================
  // DOMAIN 4: NETWORK DRIFT
  // ====================================================================
  console.log('\n[DOMAIN 4] Network Drift Detection...');
  
  const networkOps = behavior.semantic_operations.filter(op => op.domain === 'network');

  networkOps.forEach(op => {
    console.log(`  Checking: ${op.action} to ${op.target}`);

    // Check: External network calls not allowed
    if (!constraints.allow_external_network_calls && op.scope === 'EXTERNAL') {
      console.log(`    ⚠️  VIOLATION: External network call not allowed`);
      violations.push({
        type: 'semantic_drift',
        severity: 'HIGH',
        detail: `External network call not permitted: ${op.target}`,
        operation: op,
        domain: 'network'
      });
      summary.network++;
    }

    // Check: Suspicious domains
    if (op.metadata.suspicious) {
      console.log(`    ⚠️  VIOLATION: Suspicious domain detected`);
      violations.push({
        type: 'semantic_drift',
        severity: 'CRITICAL',
        detail: `Suspicious domain detected: ${op.target}`,
        operation: op,
        domain: 'network'
      });
      summary.network++;
    }

    // Check: Domain whitelist
    if (allowedDomains.length > 0 && !allowedDomains.includes(op.metadata.domain)) {
      console.log(`    ⚠️  VIOLATION: Domain ${op.metadata.domain} not in whitelist`);
      violations.push({
        type: 'semantic_drift',
        severity: 'HIGH',
        detail: `Domain not whitelisted: ${op.metadata.domain}. Allowed: ${allowedDomains.join(', ')}`,
        operation: op,
        domain: 'network'
      });
      summary.network++;
    }

    // Check: Risk level
    if (riskOrder[op.risk] > maxRiskAllowed) {
      console.log(`    ⚠️  VIOLATION: Risk ${op.risk} exceeds max ${constraints.max_risk_level}`);
      violations.push({
        type: 'semantic_drift',
        severity: op.risk,
        detail: `Network operation risk (${op.risk}) exceeds contract maximum`,
        operation: op,
        domain: 'network'
      });
      summary.network++;
    }
  });

  // ====================================================================
  // DOMAIN 5: AUTHENTICATION DRIFT
  // ====================================================================
  console.log('\n[DOMAIN 5] Authentication & Authorization Drift...');
  
  const authOps = behavior.semantic_operations.filter(op => op.domain === 'auth');

  authOps.forEach(op => {
    console.log(`  Checking: ${op.action}`);

    // Check: Privilege escalation not allowed
    if (!constraints.allow_privilege_escalation && ['PRIVILEGE_ESCALATION', 'PRIVILEGE_GRANT'].includes(op.action)) {
      console.log(`    ⚠️  VIOLATION: Privilege escalation not allowed`);
      violations.push({
        type: 'semantic_drift',
        severity: 'CRITICAL',
        detail: `Privilege escalation not permitted: ${op.action}`,
        operation: op,
        domain: 'auth'
      });
      summary.auth++;
    }

    // Check: Admin assignment not allowed
    if (!constraints.allow_admin_assignment && op.action === 'PRIVILEGE_GRANT') {
      console.log(`    ⚠️  VIOLATION: Admin assignment not allowed`);
      violations.push({
        type: 'semantic_drift',
        severity: 'CRITICAL',
        detail: `Admin role assignment not permitted`,
        operation: op,
        domain: 'auth'
      });
      summary.auth++;
    }

    // Check: Role whitelist
    if (allowedRoles.length > 0 && !allowedRoles.includes(op.metadata.target)) {
      console.log(`    ⚠️  VIOLATION: Role ${op.metadata.target} not in allowed list`);
      violations.push({
        type: 'semantic_drift',
        severity: 'HIGH',
        detail: `Role not allowed: ${op.metadata.target}. Allowed: ${allowedRoles.join(', ')}`,
        operation: op,
        domain: 'auth'
      });
      summary.auth++;
    }
  });

  // ====================================================================
  // DOMAIN 6: PROCESS DRIFT
  // ====================================================================
  console.log('\n[DOMAIN 6] Process Execution Drift...');
  
  const processOps = behavior.semantic_operations.filter(op => op.domain === 'process');

  processOps.forEach(op => {
    console.log(`  Checking: ${op.action} - "${op.target}"`);

    // Check: Shell execution not allowed (including variable-based)
    if (!constraints.allow_shell_execution) {
      console.log(`    ⚠️  VIOLATION: Shell execution not allowed`);
      violations.push({
        type: 'semantic_drift',
        severity: 'CRITICAL',
        detail: `Shell command execution not permitted: ${op.target}`,
        operation: op,
        domain: 'process'
      });
      summary.process++;
    }

    // Check: Dangerous commands
    if (op.metadata.destructive) {
      console.log(`    ⚠️  VIOLATION: Destructive command detected`);
      violations.push({
        type: 'semantic_drift',
        severity: 'CRITICAL',
        detail: `Destructive command execution attempted: ${op.target}`,
        operation: op,
        domain: 'process'
      });
      summary.process++;
    }

    // Check: Variable-based execution (suspicious)
    if (op.metadata.variable && !constraints.allow_shell_execution) {
      console.log(`    ⚠️  VIOLATION: Variable-based command execution (suspicious pattern)`);
      violations.push({
        type: 'semantic_drift',
        severity: 'HIGH',
        detail: `Variable-based process execution detected (potential injection risk): ${op.target}`,
        operation: op,
        domain: 'process'
      });
      summary.process++;
    }

    // Check: Risk level
    if (riskOrder[op.risk] > maxRiskAllowed) {
      console.log(`    ⚠️  VIOLATION: Risk ${op.risk} exceeds max ${constraints.max_risk_level}`);
      violations.push({
        type: 'semantic_drift',
        severity: op.risk,
        detail: `Process operation risk (${op.risk}) exceeds contract maximum`,
        operation: op,
        domain: 'process'
      });
      summary.process++;
    }
  });

  // ====================================================================
  // DOMAIN 7: API DRIFT
  // ====================================================================
  console.log('\n[DOMAIN 7] API Route & Method Drift...');
  
  const apiOps = behavior.semantic_operations.filter(op => op.domain === 'api' && op.action === 'ROUTE_DEFINITION');

  apiOps.forEach(op => {
    console.log(`  Checking: ${op.metadata.method} ${op.target}`);

    // Check: Route allowed
    if (allowedRoutes.length > 0 && !allowedRoutes.includes(op.target)) {
      console.log(`    ⚠️  VIOLATION: Route ${op.target} not in allowed list`);
      violations.push({
        type: 'semantic_drift',
        severity: 'MEDIUM',
        detail: `Route not whitelisted: ${op.target}. Allowed: ${allowedRoutes.join(', ')}`,
        operation: op,
        domain: 'api'
      });
      summary.api++;
    }

    // Check: Method allowed
    if (allowedMethods.length > 0 && !allowedMethods.includes(op.metadata.method)) {
      console.log(`    ⚠️  VIOLATION: Method ${op.metadata.method} not in allowed list`);
      violations.push({
        type: 'semantic_drift',
        severity: 'MEDIUM',
        detail: `HTTP method not allowed: ${op.metadata.method}. Allowed: ${allowedMethods.join(', ')}`,
        operation: op,
        domain: 'api'
      });
      summary.api++;
    }
  });

  // ====================================================================
  // FINAL DETERMINATION
  // ====================================================================
  const safe = violations.length === 0;

  console.log('\n' + '='.repeat(70));
  console.log('📊 DRIFT DETECTION SUMMARY');
  console.log('='.repeat(70));
  console.log(`\n⚠️  Violations by Domain:`);
  console.log(`   Database:      ${summary.database}`);
  console.log(`   Filesystem:    ${summary.filesystem}`);
  console.log(`   Network:       ${summary.network}`);
  console.log(`   Auth/Security: ${summary.auth}`);
  console.log(`   Process:       ${summary.process}`);
  console.log(`   API:           ${summary.api}`);
  console.log(`   Risk Level:    ${summary.risk_level}`);
  console.log(`\n📋 Total Violations: ${violations.length}`);
  console.log(`\n${safe ? '✅ RESULT: SAFE - No violations detected' : '❌ RESULT: UNSAFE - Violations detected'}`);
  console.log('='.repeat(70) + '\n');

  // Build severity breakdown
  const severity_breakdown = {
    CRITICAL: violations.filter(v => v.severity === 'CRITICAL').length,
    HIGH: violations.filter(v => v.severity === 'HIGH').length,
    MEDIUM: violations.filter(v => v.severity === 'MEDIUM').length,
    LOW: violations.filter(v => v.severity === 'LOW').length
  };

  const summary_text = safe ? 
    'Code complies with intent contract - no semantic drift detected.' :
    `${violations.length} violations detected across ${Object.values(summary).filter(x => x > 0).length} domains.`;

  return {
    violations,
    safe,
    summary: summary_text,
    severity_breakdown,
    domain_summary: summary
  };
}

// ====================================================================
// TEST CASES
// ====================================================================
if (require.main === module) {
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         INTENTLOCK DRIFT DETECTOR - TEST SUITE                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const testContract = {
    allowed_routes: ['/api/users', '/api/auth'],
    allowed_methods: ['GET', 'POST'],
    allowed_dependencies: ['express', 'axios'],
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
    }
  };

  const testBehaviors = [
    {
      name: 'UNSAFE: Network to Evil Domain',
      semantic_operations: [
        { domain: 'network', action: 'OUTBOUND_REQUEST', target: 'https://evil.com', scope: 'EXTERNAL', risk: 'CRITICAL', metadata: { suspicious: true }, raw: 'fetch' }
      ]
    },
    {
      name: 'UNSAFE: Recursive Delete on Root',
      semantic_operations: [
        { domain: 'filesystem', action: 'DELETE', target: '/', scope: 'RECURSIVE', risk: 'CRITICAL', metadata: { recursive: true, systemPath: true }, raw: 'fs.rm' }
      ]
    },
    {
      name: 'UNSAFE: Shell Execution (rm -rf)',
      semantic_operations: [
        { domain: 'process', action: 'COMMAND_EXECUTION', target: 'rm -rf /', scope: 'EXTERNAL_PROCESS', risk: 'CRITICAL', metadata: { destructive: true }, raw: 'exec' }
      ]
    },
    {
      name: 'SAFE: Normal GET Request',
      semantic_operations: [
        { domain: 'api', action: 'ROUTE_DEFINITION', target: '/api/users', scope: 'PUBLIC_ENDPOINT', risk: 'LOW', metadata: { method: 'GET' }, raw: 'app.get' }
      ]
    }
  ];

  testBehaviors.forEach(test => {
    console.log(`\n\n► ${test.name}`);
    const result = detectDrift(testContract, test);
    console.log(`\nResult Summary:`);
    console.log(`  Safe: ${result.safe}`);
    console.log(`  Violations: ${result.violations.length}`);
  });
}

module.exports = { detectDrift };
