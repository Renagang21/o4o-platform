# Changelog

All notable changes to the o4o-platform project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Hotfix] - 2025-11-05

### Fixed
- **Critical: Prometheus Metrics Duplication** - Resolved server crashes on restart
  - `PrometheusMetricsService`: Added `defaultMetricsCollected` flag to prevent duplicate `collectDefaultMetrics()` calls
  - `HttpMetricsService`: Implemented `getOrCreateMetric()` helper to reuse existing metrics
  - Removed duplicate cache metrics from `PrometheusMetricsService` (now only in `HttpMetricsService`)
  - Error fixed: "A metric with the name cache_hits_total has already been registered"
  - Verified: Server restarts multiple times without metric duplication errors

- **TypeScript Compilation Errors** - Fixed all build-blocking type errors
  - Restored missing `OperationsController` with commission management methods
  - Fixed import path in `operations.routes.ts`
  - Removed duplicate/conflicting controller files
  - All TypeScript compilation errors resolved (`pnpm -w build` succeeds)

### Changed
- **Deprecated**: `prometheusMetrics.recordCacheHit/Miss()` - Use `httpMetrics.recordCacheHit/Miss()` instead
- Registry sharing: Single `Registry` instance properly shared between metrics services

### Technical Details
- Metrics singleton pattern: Single static Registry, one-time default metrics collection
- Metric reuse: Check for existing metrics via `getSingleMetric()` before creating new ones
- Build verification: All packages and API server build successfully without errors

### Deployment
- **Commit**: `1387e34f`
- **Date**: 2025-11-05 12:55 UTC
- **Verification**:
  - ✅ `/health` endpoint: HTTP 200, `{"status":"ok"}`
  - ✅ `/metrics` endpoint: HTTP 200, 53 metrics exposed
  - ✅ Server restarts: 2 consecutive restarts without errors
  - ✅ PM2 logs: 0 error entries
  - ✅ Metrics duplication: Confirmed fixed (no "already registered" errors)

---

## [1.6.0] - 2025-10-29

### Added
- **SlideApp Package** (`@o4o/slide-app`): New unified slide/carousel component based on Embla Carousel
  - WCAG 2.2 compliant accessibility features
  - Keyboard navigation (Arrow keys, Home, End, Space)
  - Screen reader support with ARIA live announcements
  - Modular hooks: `useEmbla`, `useSlideKeyboard`, `useA11y`
  - Flexible pagination: dots, numbers, progress bar
  - Runtime props validation with helpful warnings
  - 3 demo test cases for development
- **BlockRenderer Integration**: SlideBlock renderer for main-site frontend
  - Support for `o4o/slide`, `core/slide` block types
  - Legacy attribute transformation (autoPlay → autoplay, etc.)
  - Aspect ratio format conversion ('16:9' → '16/9')
- **ProductCarousel (ecommerce)**: New implementation using SlideApp
  - Product-to-slide data transformation utilities
  - Gradient overlay for product information
  - Click-to-navigate functionality
- **Documentation**:
  - M5 QA Checklist (`docs/testing/M5-SLIDEAPP-QA-CHECKLIST.md`)
  - Migration Guide (`docs/dev/slide-app-migration.md`)
  - Comprehensive API documentation in package README

### Changed
- **SlideApp API**:
  - `AspectRatio`: Changed from `'16:9'` format to `'16/9'` format
  - `autoplay`: Changed from boolean to object (`AutoplayConfig`)
  - Slide fields: `imageUrl`/`videoUrl` merged into unified `src` field
- **admin-dashboard**: Updated Gutenberg slide block to use new SlideApp
  - Automatic legacy attribute conversion in `useSlideAttributes` hook
  - Editor preview with autoplay always disabled
  - InspectorControls for all SlideApp settings

### Removed
- **Legacy slide blocks** (26 files): Removed old Gutenberg slide implementation
  - `apps/admin-dashboard/src/components/editor/blocks/slide/`
- **Legacy slider blocks** (5 files): Removed duplicate slider implementation
  - `apps/admin-dashboard/src/components/editor/blocks/slider/`
- **Mock data**: Removed temporary scaffold data used in M3
  - `apps/admin-dashboard/src/blocks/definitions/slide/preview/SlideMockData.ts`
- **Old ProductCarousel**: Removed pre-SlideApp implementation
  - `apps/ecommerce/src/components/product/ProductCarousel.old.tsx`
- **Total code reduction**: -11,321 lines (80% reduction in slide-related code)

### Fixed
- Improved accessibility: Proper keyboard focus management and ARIA attributes
- Memory optimization: Proper cleanup of event listeners and timers
- Performance: 60fps maintained, CPU usage < 15%

### Migration Notes
- **Breaking Changes**: See `docs/dev/slide-app-migration.md` for detailed migration guide
- **Backward Compatibility**: Legacy attributes are automatically converted
- **Testing**: Use `docs/testing/M5-SLIDEAPP-QA-CHECKLIST.md` for validation

---

## [1.5.9] - 2025-10-17

### Changed
- Various bug fixes and improvements
- Updated deployment configurations

---

## [1.5.0] - 2025-10-01

### Added
- Initial admin dashboard implementation
- Gutenberg block editor integration
- Basic ecommerce functionality

---

## Legend

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

---

**For detailed commit history, see the git log:**
```bash
git log --oneline --graph --all
```

**For migration guides and technical documentation:**
- See `/docs/dev/` for development guides
- See `/docs/testing/` for QA procedures
