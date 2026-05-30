#!/bin/bash

# IntentLock Shutdown Script
# Stops the Node.js backend server

# Kill process on port 3000 (Node.js server)
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo "🛑 IntentLock stopped"
