#!/bin/bash

# IntentLock Hook Installer
# Installs the pre-commit hook into the git repository

# Check if we're in a git repository
if [ ! -d ".git" ]; then
  echo "❌ Error: .git directory not found. Run this script from your project root."
  exit 1
fi

# Copy pre-commit hook to .git/hooks/
cp hooks/pre-commit .git/hooks/pre-commit 2>/dev/null

if [ $? -ne 0 ]; then
  echo "❌ Error: Could not copy pre-commit hook. Check that hooks/pre-commit exists."
  exit 1
fi

# Make the hook executable
chmod +x .git/hooks/pre-commit

if [ $? -ne 0 ]; then
  echo "❌ Error: Could not make hook executable."
  exit 1
fi

echo "✅ IntentLock git hook installed!"
echo "Run 'bash hooks/install-hook.sh' from your project root to reinstall"
