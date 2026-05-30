/**
 * ArmorIQ SDK Integration Client
 * 
 * Integrates the REAL ArmorIQ SDK for intent contract governance, 
 * policy enforcement, and immutable audit logging.
 * 
 * This layer sits ABOVE the IntentLock semantic verification engine 
 * and does NOT replace any verification logic.
 * 
 * ArmorIQ handles: Governance, Enforcement, Immutable Logging
 * IntentLock handles: Semantic Analysis, Drift Detection, Verification
 */

require('dotenv').config();
const { ArmorIQClient: ArmorIQSDK } = require('@armoriq/sdk');

class ArmorIQClient {
  constructor(apiKey = null) {
    // Use provided key or fall back to environment variable
    this.apiKey = apiKey || process.env.ARMORIQ_API_KEY;
    
    if (!this.apiKey) {
      console.warn('⚠️  ArmorIQ API key not configured. Governance layer disabled.');
      this.enabled = false;
      this.client = null;
      return;
    }

    try {
      // Initialize REAL ArmorIQ SDK with required parameters
      this.client = new ArmorIQSDK({
        apiKey: this.apiKey,
        userId: process.env.USER_ID || 'intentlock-user',
        agentId: process.env.AGENT_ID || 'intentlock-agent',
        apiUrl: process.env.ARMORIQ_API_URL || 'https://api.armoriq.io/v1'
      });

      this.enabled = true;
      this.clientId = process.env.ARMORIQ_CLIENT_ID || 'intentlock-client';
      
      console.log('✓ ArmorIQ SDK initialized');
    } catch (error) {
      console.warn(`⚠️  ArmorIQ SDK initialization failed: ${error.message}`);
      this.enabled = false;
      this.client = null;
    }
  }

  /**
   * INTEGRATION POINT 1: Capture Intent Plan
   * 
   * Uses REAL ArmorIQ SDK: client.capturePlan()
   * 
   * @param {Object} contract - The intent contract object
   * @param {String} contractSource - Source description
   * @returns {Promise<Object>} Plan capture result
   */
  async registerIntent(contract, contractSource = 'intentlock') {
    if (!this.enabled || !this.client) {
      return { 
        contractId: `local-${Date.now()}`, 
        registered: false,
        note: 'ArmorIQ SDK not available'
      };
    }

    try {
      console.log('📝 ArmorIQ: Registering intent contract...');

      // Extract contract metadata
      const contractPayload = {
        name: `intentlock-${Date.now()}`,
        source: contractSource,
        metadata: contract,
        clientId: this.clientId
      };

      // Use REAL ArmorIQ SDK method: capturePlan
      // This captures the intent plan for monitoring
      const planCapture = await this.client.capturePlan({
        description: `Intent contract for ${contractSource}`,
        tools: contract.allowed_routes || [],
        constraints: contract.intent_constraints || {}
      });

      return {
        contractId: contractPayload.name,
        registered: true,
        metadata: contractPayload.metadata,
        timestamp: new Date().toISOString(),
        armoriqResponse: planCapture
      };
    } catch (error) {
      console.error('❌ ArmorIQ registration failed:', error.message);
      return { 
        contractId: null, 
        registered: false, 
        error: error.message,
        fallbackMode: true
      };
    }
  }

  /**
   * INTEGRATION POINT 2: Get Intent Token
   * 
   * Uses REAL ArmorIQ SDK: client.getIntentToken()
   * Generates intent token for verification based on violations
   * 
   * @param {Object} enforcement - Enforcement context object
   * @returns {Promise<Object>} Token and enforcement decision
   */
  async enforcePolicy(enforcement) {
    if (!this.enabled || !this.client) {
      return { 
        enforced: false, 
        allowed: enforcement.violations.length === 0,
        note: 'ArmorIQ SDK not available'
      };
    }

    try {
      const { violations, contractId, filePath, commitMessage } = enforcement;
      const shouldBlock = violations && violations.length > 0;

      console.log('\n🛡  ArmorIQ: Evaluating policy enforcement...');

      // Generate intent token for this verification context
      const intentToken = await this.client.getIntentToken({
        userIntent: `Verify code changes to ${filePath}`,
        metadata: {
          violations: violations.length,
          commitMessage: commitMessage || 'N/A',
          clientId: this.clientId
        }
      });

      // Display enforcement decision
      if (shouldBlock) {
        console.log('\n🚫 Policy Enforcement: COMMIT BLOCKED');
        console.log(`   Reason: ${violations.length} violation(s) detected`);
        console.log(`   Contract ID: ${contractId}`);
        violations.forEach((v, idx) => {
          console.log(`   ${idx + 1}. [${v.severity}] ${v.type}: ${v.detail}`);
        });
      } else {
        console.log('✅ Policy Enforcement: COMMIT ALLOWED');
      }

      return {
        enforced: true,
        allowed: !shouldBlock,
        intentToken: intentToken,
        evidence: {
          violations,
          filePath,
          commitMessage,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ ArmorIQ enforcement failed:', error.message);
      // Fail closed: if enforcement fails, block the commit
      return { 
        enforced: false, 
        allowed: false, 
        error: error.message 
      };
    }
  }

  /**
   * INTEGRATION POINT 3: Verify Intent Token
   * 
   * Uses REAL ArmorIQ SDK: client.verifyToken()
   * Verifies and logs the intent token for immutable audit trail
   * 
   * @param {Object} auditData - Complete verification audit record
   * @returns {Promise<Object>} Audit confirmation with verification ID
   */
  async auditLog(auditData) {
    if (!this.enabled || !this.client) {
      return { 
        logged: false, 
        auditId: null,
        note: 'ArmorIQ SDK not available'
      };
    }

    try {
      console.log('📜 ArmorIQ: Storing immutable audit evidence...');

      const {
        contractId,
        filePath,
        behavior,
        violations = [],
        safe,
        summary
      } = auditData;

      // Calculate severity breakdown
      const severityBreakdown = {
        CRITICAL: violations.filter(v => v.severity === 'CRITICAL').length,
        HIGH: violations.filter(v => v.severity === 'HIGH').length,
        MEDIUM: violations.filter(v => v.severity === 'MEDIUM').length,
        LOW: violations.filter(v => v.severity === 'LOW').length
      };

      // Build audit record for ArmorIQ
      const auditRecord = {
        contractId,
        resource: filePath,
        action: 'verify',
        result: safe ? 'compliant' : 'non-compliant',
        evidence: {
          summary,
          violations: violations.map(v => ({
            type: v.type,
            severity: v.severity,
            detail: v.detail
          })),
          violationCount: violations.length,
          severityBreakdown: severityBreakdown,
          behavior: {
            routesCount: behavior.routes?.length || 0,
            networkCallsCount: behavior.network_calls?.length || 0,
            fsAccess: behavior.fs_access,
            childProcess: behavior.child_process,
            dependenciesCount: behavior.dependencies?.length || 0,
            semanticOperationsCount: behavior.semantic_operations?.length || 0
          }
        },
        metadata: {
          clientId: this.clientId,
          timestamp: new Date().toISOString(),
          source: 'intentlock-verification'
        }
      };

      // Use REAL ArmorIQ SDK method: verifyToken
      // This verifies the intent context and stores audit trail
      const verifyResult = await this.client.verifyToken({
        context: auditRecord.evidence,
        metadata: auditRecord.metadata
      });

      console.log(`   Audit ID: ${auditRecord.contractId}`);
      console.log(`   Status: ${safe ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
      console.log(`   Violations: ${violations.length}`);

      return {
        logged: true,
        auditId: `audit-${Date.now()}`,
        record: auditRecord,
        verifyResult: verifyResult
      };
    } catch (error) {
      console.error('❌ ArmorIQ audit logging failed:', error.message);
      return { 
        logged: false, 
        auditId: null, 
        error: error.message 
      };
    }
  }

  /**
   * Verify API connectivity and credentials
   * Useful for pre-flight checks
   */
  async healthCheck() {
    if (!this.enabled || !this.client) {
      return { healthy: false, message: 'ArmorIQ SDK not available' };
    }

    try {
      const health = await this.client.health.check();
      return { healthy: true, ...health };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Retrieve status of ArmorIQ integration
   */
  getStatus() {
    return {
      enabled: this.enabled,
      clientId: this.clientId || 'N/A',
      apiUrl: process.env.ARMORIQ_API_URL || 'https://api.armoriq.io/v1',
      hasClient: !!this.client
    };
  }
}

module.exports = { ArmorIQClient };

