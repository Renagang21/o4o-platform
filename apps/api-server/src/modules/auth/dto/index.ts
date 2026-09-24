/**
 * AUTH Module DTOs
 *
 * Barrel export for all authentication-related DTOs
 */

// Login DTOs

// Register DTOs

// Refresh Token DTOs
export * from './refresh.dto.js';

// Password DTOs

// Verification DTOs
export * from './verification.dto.js';

// Service Login DTOs (Phase 1: WO-AUTH-SERVICE-IDENTITY-PHASE1)

// Guest Auth DTOs (Phase 3: WO-AUTH-SERVICE-IDENTITY-PHASE3-QR-GUEST-DEVICE)
export * from './guest-auth.dto.js';

// Google-only Signup/Login DTOs (WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1)
export * from './google-auth.dto.js';
