#!/bin/bash

echo "🚀 Building cristOS iOS app locally..."

# Navigate to iOS directory
cd ios

# Clean and install pods
echo "📦 Installing CocoaPods..."
pod install

# Build the archive
echo "🔨 Building archive..."
xcodebuild -workspace cristOSJul2v3.xcworkspace \
           -scheme cristOSJul2v3 \
           -configuration Release \
           -destination 'generic/platform=iOS' \
           -archivePath ./build/cristOSJul2v3.xcarchive \
           archive

if [ $? -eq 0 ]; then
    echo "✅ Archive created successfully!"
    echo "📁 Archive location: ./build/cristOSJul2v3.xcarchive"
    echo ""
    echo "🎉 Build completed! You can now:"
    echo "1. Open Xcode"
    echo "2. Go to Window > Organizer"
    echo "3. Click 'Distribute App'"
    echo "4. Select 'App Store Connect'"
    echo "5. Choose 'Upload'"
    echo "6. Select the archive file above"
else
    echo "❌ Build failed"
    exit 1
fi 