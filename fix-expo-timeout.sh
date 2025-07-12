#!/bin/bash

echo "🔧 Fixing Expo timeout issues..."

# Kill any existing Expo processes
echo "📱 Killing existing Expo processes..."
pkill -f "expo"
pkill -f "metro"

# Clear all caches
echo "🧹 Clearing caches..."
rm -rf node_modules/.expo
rm -rf .expo
rm -rf ios/build
rm -rf android/build
rm -rf .metro-cache

# Clear npm cache
echo "📦 Clearing npm cache..."
npm cache clean --force

# Reinstall dependencies
echo "📥 Reinstalling dependencies..."
npm install

# Update Expo CLI
echo "🔄 Updating Expo CLI..."
npm install -g @expo/cli@latest

# Clear iOS simulator cache
echo "📱 Clearing iOS simulator cache..."
xcrun simctl shutdown all
xcrun simctl erase all

# Start with clean configuration
echo "🚀 Starting Expo with clean configuration..."
npx expo start --clear --tunnel --port 8081

echo "✅ Troubleshooting complete! Try scanning the QR code now." 