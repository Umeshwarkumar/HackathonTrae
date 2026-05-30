#!/bin/bash

# IntentLock Startup Script
# Starts the Python backend with Gemini AI integration for contract generation

echo "🚀 Starting IntentLock with Gemini AI Contract Generation..."
echo ""

# Navigate to backend directory
cd backend

# Start the Python backend using conda environment
conda run -n intentlock python main.py
