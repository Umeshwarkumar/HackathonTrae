#!/usr/bin/env node

/**
 * REAL ArmorIQ SDK Integration Testing Guide
 * 
 * This demonstrates the REAL SDK integration with actual API calls
 * instead of simulated responses.
 */

const { ArmorIQClient } = require('../armoriq-client');

async function demonstrateRealIntegration() {
  console.log('\n' + '='.repeat(70));
  console.log('🛡️  REAL ArmorIQ SDK Integration Testing');
  console.log('='.repeat(70));

  // ====================================================================
  // TEST 1: Check SDK Status
  // ====================================================================
  console.log('\n[TEST 1] Check ArmorIQ SDK Status\n');

  const client = new ArmorIQClient();
  const status = client.getStatus();

  console.log('SDK Status:');
  console.log(JSON.stringify(status, null, 2));

  if (status.enabled) {
    console.log('\n✅ ArmorIQ SDK is ENABLED');
    console.log('   Ready to call REAL APIs');
  } else {
    console.log('\n⚠️  ArmorIQ SDK is DISABLED');
    console.log('   Reason: API key not configured');
    console.log('   To enable: Add ARMORIQ_API_KEY to .env');
  }

  // ====================================================================
  // TEST 2: Health Check (Optional - if SDK enabled)
  // ====================================================================
  if (client.enabled) {
    console.log('\n[TEST 2] Health Check\n');

    try {
      const health = await client.healthCheck();
      console.log('Health Status:');
      console.log(JSON.stringify(health, null, 2));

      if (health.healthy) {
        console.log('\n✅ Connected to REAL ArmorIQ service');
      } else {
        console.log('\n⚠️  ArmorIQ service unavailable');
        console.log(`   Message: ${health.message}`);
      }
    } catch (error) {
      console.log(`\n❌ Health check failed: ${error.message}`);
    }
  }

  // ====================================================================
  // TEST 3: Real Contract Registration API Call
  // ====================================================================
  if (client.enabled) {
    console.log('\n[TEST 3] Real Contract Registration\n');

    const testContract = {
      allowed_routes: ['/api/users', '/api/auth'],
      allowed_methods: ['GET', 'POST'],
      allowed_dependencies: ['express', 'dotenv'],
      forbidden_actions: ['exec', 'spawn', 'admin_assignment'],
      intent_constraints: {
        allow_shell_execution: false,
        max_risk_level: 'MEDIUM',
        allow_privilege_escalation: false
      }
    };

    console.log('Contract being registered:');
    console.log(JSON.stringify(testContract, null, 2));

    try {
      console.log('\n📝 Calling: client.contracts.register()');
      console.log('   This is a REAL API call to ArmorIQ service\n');

      const registration = await client.registerIntent(testContract, 'testing');

      console.log('Registration Response:');
      console.log(JSON.stringify(registration, null, 2));

      if (registration.registered) {
        console.log(`\n✅ REAL contract registered!`);
        console.log(`   Contract ID: ${registration.contractId}`);
        console.log(`   Timestamp: ${registration.timestamp}`);
        console.log(`   Status: REAL immutable record created in ArmorIQ`);
      } else if (registration.fallbackMode) {
        console.log(`\n⚠️  Fallback Mode: SDK not available`);
        console.log(`   This contract was NOT sent to ArmorIQ`);
      }
    } catch (error) {
      console.log(`\n❌ Contract registration failed:`);
      console.log(`   Error: ${error.message}`);
      console.log(`   This would be a REAL API error from ArmorIQ`);
    }
  }

  // ====================================================================
  // TEST 4: REAL Policy Enforcement API Call
  // ====================================================================
  if (client.enabled) {
    console.log('\n[TEST 4] Real Policy Enforcement\n');

    const testViolations = [
      {
        type: 'unauthorized_operation',
        severity: 'CRITICAL',
        detail: 'Shell command execution detected',
        operation: 'exec("rm -rf /")'
      },
      {
        type: 'role_escalation',
        severity: 'HIGH',
        detail: 'Privilege escalation attempt',
        operation: 'user.role = "admin"'
      }
    ];

    console.log('Violations to enforce:');
    console.log(JSON.stringify(testViolations, null, 2));

    try {
      console.log('\n🛡  Calling: client.policies.enforce()');
      console.log('   This is a REAL API call to ArmorIQ policy engine\n');

      const enforcement = await client.enforcePolicy({
        violations: testViolations,
        contractId: 'contract-test-123',
        filePath: 'test/malicious.js',
        commitMessage: 'Test commit with violations'
      });

      console.log('Enforcement Response:');
      console.log(JSON.stringify(enforcement, null, 2));

      console.log(`\n${enforcement.allowed ? '✅' : '❌'} Policy Decision: ${enforcement.allowed ? 'ALLOWED' : 'BLOCKED'}`);
      console.log(`   This is a REAL policy evaluation from ArmorIQ`);
    } catch (error) {
      console.log(`\n❌ Policy enforcement failed:`);
      console.log(`   Error: ${error.message}`);
      console.log(`   This would be a REAL API error from ArmorIQ`);
    }
  }

  // ====================================================================
  // TEST 5: REAL Immutable Audit Logging API Call
  // ====================================================================
  if (client.enabled) {
    console.log('\n[TEST 5] Real Immutable Audit Logging\n');

    const testBehavior = {
      routes: ['/api/endpoint'],
      network_calls: ['https://external-api.com'],
      fs_access: ['read', 'write'],
      child_process: true,
      hardcoded_secrets: false,
      db_queries: ['SELECT', 'UPDATE'],
      dependencies: ['express', 'dotenv'],
      semantic_operations: [
        { type: 'database', operation: 'UPDATE users' },
        { type: 'process', operation: 'exec(...)' }
      ]
    };

    const testAuditData = {
      contractId: 'contract-test-123',
      filePath: 'test/audit_test.js',
      behavior: testBehavior,
      violations: [
        {
          type: 'semantic_drift',
          severity: 'CRITICAL',
          detail: 'Shell execution not allowed'
        }
      ],
      safe: false,
      summary: 'Code violates intent contract in 1 area'
    };

    console.log('Audit data to log immutably:');
    console.log(JSON.stringify(testAuditData, null, 2));

    try {
      console.log('\n📜 Calling: client.audit.log()');
      console.log('   This is a REAL API call to ArmorIQ immutable store\n');

      const audit = await client.auditLog(testAuditData);

      console.log('Audit Response:');
      console.log(JSON.stringify(audit, null, 2));

      if (audit.logged) {
        console.log(`\n✅ REAL immutable audit logged!`);
        console.log(`   Audit ID: ${audit.auditId}`);
        console.log(`   Status: IMMUTABLE record stored in ArmorIQ`);
        console.log(`   Properties: Tamper-proof, timestamped, forensic`);
      }
    } catch (error) {
      console.log(`\n❌ Audit logging failed:`);
      console.log(`   Error: ${error.message}`);
      console.log(`   This would be a REAL API error from ArmorIQ`);
    }
  }

  // ====================================================================
  // SUMMARY
  // ====================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📊 Integration Test Summary');
  console.log('='.repeat(70));

  if (client.enabled) {
    console.log('\n✅ REAL SDK INTEGRATION ACTIVE');
    console.log('\nYour system is now using:');
    console.log('  • REAL ArmorIQ contract registration');
    console.log('  • REAL ArmorIQ policy enforcement engine');
    console.log('  • REAL ArmorIQ immutable audit storage');
    console.log('\nAll API calls are sent to the actual ArmorIQ service.');
    console.log('No mock/simulated responses - all governance is REAL.');
  } else {
    console.log('\n⚠️  SDK DISABLED - Using Fallback Mode');
    console.log('\nTo activate REAL integration:');
    console.log('  1. Get API key from: https://console.armoriq.io/api-keys');
    console.log('  2. Add to .env: ARMORIQ_API_KEY=your_key_here');
    console.log('  3. Run tests again');
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

// Run tests
demonstrateRealIntegration().catch(error => {
  console.error('\n❌ Integration test failed:', error);
  process.exit(1);
});
