#!/bin/bash

# IntentLock Startup Script
# Starts the improved Node.js backend with full semantic analysis

echo "🚀 Starting IntentLock with Enhanced Drift Detection..."

# Navigate to backend directory
cd backend

# Start the improved Node.js server with full semantic analysis on port 3000
node server-improved.js

echo ""
echo "🖥️  Open dashboard/index-improved.html in your browser"
echo "📋 Backend running with improved analyzers (analyzer-improved.js + driftDetector-improved.js)"
echo ""
