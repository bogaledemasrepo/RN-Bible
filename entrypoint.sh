#!/usr/bin/env bash
set -e

echo "🚀 Step 1: Running Expo Prebuild..."
npx expo prebuild --clean

echo "🔧 Step 2: Overriding Gradle wrapper to use baked-in local zip..."
GRADLE_PROP="android/gradle/wrapper/gradle-wrapper.properties"

if [ -f "$GRADLE_PROP" ]; then
  # Point distributionUrl to the local file inside the container
  sed -i 's|distributionUrl=.*|distributionUrl=file\:///opt/gradle-dist/gradle-9.3.1-bin.zip|' "$GRADLE_PROP"
  echo "✅ Gradle wrapper successfully pointed to file:///opt/gradle-dist/gradle-9.3.1-bin.zip"
else
  echo "❌ Error: $GRADLE_PROP not found!"
  exit 1
fi

echo "⚙️ Step 3: Compiling Android Release APK..."
cd android
./gradlew assembleRelease

echo "📦 Step 4: Exporting APK to local output directory..."
mkdir -p /output
cp app/build/outputs/apk/release/app-release.apk /output/app-release.apk

echo "🎉 DONE! Your production APK is available in your desktop builds folder."