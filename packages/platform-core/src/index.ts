/**
 * Platform-Core
 *
 * Platform Core Services
 *
 * @package @o4o/platform-core
 * @version 1.0.0
 */

export { platformCoreManifest, default as manifest } from './manifest.js';

// Lifecycle hooks (activate · deactivate 만) 는 ./lifecycle/index.js 에서 export 된다.
// install / uninstall 은 은퇴 (WO-O4O-PLATFORM-CORE-DEAD-LIFECYCLE-MANIFEST-AND-APPSTORE-SCHEMA-CONTRACT-FINAL-CLOSURE-V1)

// Store Identity (WO-CORE-STORE-SLUG-SYSTEM-V1)
// Full exports available via '@o4o/platform-core/store-identity'

// Store Policy (WO-CORE-STORE-POLICY-SYSTEM-V1)
// Full exports available via '@o4o/platform-core/store-policy'
