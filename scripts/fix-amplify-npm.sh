#!/bin/bash

# Fix Amplify npm ci hanging issue
echo "🔧 Fixing Amplify npm installation..."

# Navigate to amplify folder
cd amplify

# Remove node_modules and package-lock.json
echo "Cleaning amplify folder..."
rm -rf node_modules
rm -f package-lock.json

# Regenerate package-lock.json with npm install
echo "Regenerating package-lock.json..."
npm install

# Verify with npm ci
echo "Testing npm ci..."
npm ci

echo "✅ Fixed! Now commit and push the new package-lock.json"
