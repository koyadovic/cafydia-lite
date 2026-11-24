# Paths
ANDROID_DIR := android
APK_DEBUG := $(ANDROID_DIR)/app/build/outputs/apk/debug/app-debug.apk
APK_RELEASE := $(ANDROID_DIR)/app/build/outputs/apk/release/app-release.apk

.PHONY: build build-debug install install-debug clean devel

# Build a non-debuggable APK for daily use.
build: clean
	rm -f $(ANDROID_DIR)/app/src/main/assets/index.android.bundle
	cd $(ANDROID_DIR) && ./gradlew assembleRelease

# Keep a debug APK available when developing with Metro.
build-debug: clean
	npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/
	cd $(ANDROID_DIR) && ./gradlew assembleDebug

# Install the APK using adb
install:
	adb install -r $(APK_RELEASE)

install-debug:
	adb install -r $(APK_DEBUG)

# Clean the build files
clean:
	cd $(ANDROID_DIR) && ./gradlew clean
