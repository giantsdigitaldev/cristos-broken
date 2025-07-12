#!/bin/bash

echo "🚀 Building cristOS iOS app locally for TestFlight..."

# Set variables
WORKSPACE="ChristOSJuly03.xcworkspace"
SCHEME="ChristOSJuly03"
ARCHIVE_PATH="./build/ChristOSJuly03.xcarchive"
EXPORT_PATH="./build/ChristOSJuly03.ipa"

# Navigate to iOS directory
cd ios

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf build/
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Clean and install pods
echo "📦 Installing CocoaPods..."
pod install --repo-update

# Build the archive
echo "🔨 Building archive..."
xcodebuild -workspace $WORKSPACE \
           -scheme $SCHEME \
           -configuration Release \
           -destination 'generic/platform=iOS' \
           -archivePath $ARCHIVE_PATH \
           archive

if [ $? -eq 0 ]; then
    echo "✅ Archive created successfully!"
    echo "📁 Archive location: $ARCHIVE_PATH"
    
    # Export IPA for App Store Connect
    echo "📦 Exporting IPA..."
    xcodebuild -exportArchive \
               -archivePath $ARCHIVE_PATH \
               -exportPath $EXPORT_PATH \
               -exportOptionsPlist exportOptions.plist
    
    if [ $? -eq 0 ]; then
        echo "✅ IPA exported successfully!"
        echo "📁 IPA location: $EXPORT_PATH/ChristOSJuly03.ipa"
        echo ""
        echo "🎉 Build completed! Next steps:"
        echo "1. Open Xcode"
        echo "2. Go to Window > Organizer"
        echo "3. Click 'Distribute App'"
        echo "4. Select 'App Store Connect'"
        echo "5. Choose 'Upload'"
        echo "6. Select the IPA file: $EXPORT_PATH/ChristOSJuly03.ipa"
        echo ""
        echo "⏱️  Expected timeline:"
        echo "- Upload: 5-10 minutes"
        echo "- App Store Connect processing: 5-15 minutes"
        echo "- TestFlight availability: 1-5 minutes after processing"
        echo "- Total: ~15-30 minutes"
    else
        echo "❌ IPA export failed"
        exit 1
    fi
else
    echo "❌ Archive build failed"
    exit 1
fi 