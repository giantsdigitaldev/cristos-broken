#!/bin/bash

echo "🚀 Deploying cristOS to TestFlight (Local Build)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Increment build number
print_status "Incrementing build number..."
node -e "
const fs = require('fs');
const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const currentBuild = parseInt(appJson.expo.ios.buildNumber);
const newBuild = currentBuild + 1;
appJson.expo.ios.buildNumber = newBuild.toString();
fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
console.log('Build number incremented from', currentBuild, 'to', newBuild);
"

if [ $? -ne 0 ]; then
    print_error "Failed to increment build number"
    exit 1
fi

print_success "Build number incremented"

# 2. Commit changes
print_status "Committing changes..."
git add app.json
git commit -m "Bump build number for TestFlight deployment"
git push

if [ $? -ne 0 ]; then
    print_warning "Git push failed - continuing with build anyway"
fi

# 3. Run optimized build script
print_status "Starting local build..."
chmod +x build-ios-optimized.sh
./build-ios-optimized.sh

if [ $? -eq 0 ]; then
    print_success "Build completed successfully!"
    echo ""
    echo "🎉 Ready for TestFlight upload!"
    echo ""
    echo "📁 IPA Location: ios/build/ChristOSJuly03.ipa"
    echo ""
    echo "⏱️  Next steps:"
    echo "1. Open Xcode"
    echo "2. Go to Window > Organizer"
    echo "3. Click 'Distribute App'"
    echo "4. Select 'App Store Connect'"
    echo "5. Choose 'Upload'"
    echo "6. Select: ios/build/ChristOSJuly03.ipa"
    echo ""
    echo "⏱️  Expected timeline:"
    echo "- Upload: 5-10 minutes"
    echo "- App Store Connect processing: 5-15 minutes"
    echo "- TestFlight availability: 1-5 minutes after processing"
    echo "- Total: ~15-30 minutes"
    echo ""
    print_warning "Note: This is the fastest method without EAS credits"
else
    print_error "Build failed"
    exit 1
fi 