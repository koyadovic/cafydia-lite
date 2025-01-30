# Makefile for CafydiaLite

# Paths
ANDROID_DIR := android
APK_DEBUG := $(ANDROID_DIR)/app/build/outputs/apk/debug/app-debug.apk

.PHONY: build install clean devel

# Build the APK in debug mode
build:
	# Generate the JavaScript bundle first
	npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/
	# Build the APK
	cd $(ANDROID_DIR) && ./gradlew assembleDebug

# Install the APK using adb
install:
	adb install -r $(APK_DEBUG)

# Clean the build files
clean:
	cd $(ANDROID_DIR) && ./gradlew clean
