#!/bin/bash

# Script to add test photos to iOS Simulator
# Usage: ./add-test-photos.sh

set -e

echo "🖼️  Adding test photos to iOS Simulator..."
echo ""

# Check if simulator is running
if ! xcrun simctl list devices | grep -q "Booted"; then
  echo "❌ Error: No simulator is currently running."
  echo "Please start your iOS simulator first and try again."
  exit 1
fi

# Create a temp directory for sample images
TEMP_DIR="/tmp/test-photos"
mkdir -p "$TEMP_DIR"

echo "📸 Creating test images..."

# Use macOS built-in images from Desktop Pictures
DESKTOP_PICS="/System/Library/Desktop Pictures"
COUNT=0

# Copy some desktop wallpapers as test photos
if [ -d "$DESKTOP_PICS" ]; then
  # Try to find some images
  find "$DESKTOP_PICS" -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.heic" \) -print0 | head -n 10 | while IFS= read -r -d '' file; do
    cp "$file" "$TEMP_DIR/" 2>/dev/null && ((COUNT++)) || true
  done
fi

# If no images found, create simple test pattern images using sips
if [ $(ls -1 "$TEMP_DIR" 2>/dev/null | wc -l) -eq 0 ]; then
  echo "📝 Creating simple test images..."
  
  # Use any available image file as a base
  BASE_IMG="/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/MultipleItemsIcon.icns"
  
  if [ -f "$BASE_IMG" ]; then
    for i in {1..5}; do
      sips -s format jpeg "$BASE_IMG" --out "$TEMP_DIR/test-photo-$i.jpg" &>/dev/null || true
    done
  fi
fi

# Count images
IMAGE_COUNT=$(ls -1 "$TEMP_DIR" 2>/dev/null | wc -l | xargs)

if [ "$IMAGE_COUNT" -eq 0 ]; then
  echo "⚠️  Could not create test images."
  echo ""
  echo "💡 You can manually add images by:"
  echo "   1. Dragging and dropping images onto the simulator"
  echo "   2. Using: xcrun simctl addmedia booted /path/to/image.jpg"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Add images to booted simulator
echo "📤 Adding $IMAGE_COUNT images to simulator..."
xcrun simctl addmedia booted "$TEMP_DIR"/* 2>&1

echo ""
echo "✅ Success! Added $IMAGE_COUNT test photos to the simulator."
echo ""
echo "📱 Now you can:"
echo "   • Open the Photos app in the simulator to see them"
echo "   • Use the 'Choose Photo' button in your app"
echo ""

# Cleanup
rm -rf "$TEMP_DIR"

