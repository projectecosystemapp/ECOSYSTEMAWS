#!/bin/bash

# Deploy to Vercel Script for Marketplace MVP

echo "🚀 Deploying Marketplace MVP to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm i -g vercel
fi

echo "📦 Building application..."
npm run build

echo "🌐 Deploying to Vercel..."
vercel --prod \
  --name marketplace-mvp \
  --build-env NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51RxWCID905P0bnNcQc985pyBmuLFRbouYDLFadXXaPpK3ECsCuHrzew8T1D0Lpkh8VblNLzEVGUfuTWv2HImM7hr00E4ECXRir" \
  --build-env NEXT_PUBLIC_APP_URL="https://marketplace-mvp.vercel.app" \
  --yes

echo "✅ Deployment complete!"
echo "Visit your app at: https://marketplace-mvp.vercel.app"