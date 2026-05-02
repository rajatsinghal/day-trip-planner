# Phase 0 Fix Log

## Pass 1 (consolidated reviewer findings)

Addressed:
- Runtime BLOCKER: metro.config.js created for workspace resolution
- Runtime BLOCKER: babel.config.js created with reanimated plugin
- Runtime MAJOR: gesture-handler import added to index.ts
- Runtime MAJOR + Security MAJOR: Sentry DSN switched to EXPO_PUBLIC_, performance tracing disabled
- Runtime MAJOR: MMKV lazy-init via getStorage() helper
- A11y BLOCKERS x2: WaterfallIcon, MuseumIcon now accept accessibilityLabel
- A11y MAJOR: reason-icon API gained accessibilityLabel + decorative props; aria-hidden replaced with proper RN props
- Security MINOR: android.permissions allowlist set to ["INTERNET"]; manifest regenerated
- Perf MINOR: tsconfig exclude tightened

Deferred (with rationale):
- Performance reviewer flagged reanimated + gesture-handler as unused; they're load-bearing for Phase 3, kept installed and now properly configured
- Android debug keystore: TODO added at gradle line; real fix at Phase 5 launch
- iOS URL scheme bundle-ID alias: Expo default behavior, no clean override

Files changed:
- mobile/metro.config.js (new)
- mobile/babel.config.js (new)
- mobile/index.ts
- mobile/App.tsx
- mobile/src/lib/nws.ts
- mobile/src/icons/WaterfallIcon.tsx
- mobile/src/icons/MuseumIcon.tsx
- mobile/src/icons/reason-icon.tsx
- mobile/app.json
- mobile/tsconfig.json
- mobile/android/app/build.gradle
- mobile/android/app/src/main/AndroidManifest.xml (regenerated)
- mobile/_phase0/FIX_LOG.md (new)
