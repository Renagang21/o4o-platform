/**
 * Ownership Guard Verification Tests
 *
 * WO-PLATFORM-SECURITY-TEST-HARNESS-V1 — Phase 6
 *
 * Validates ownership guard patterns across the platform:
 * 1. Server-enforced field override (sellerId, pharmacistId)
 * 2. LMS ownership checks exist at all write endpoints
 * 3. Care pharmacy context isolation
 *
 * These are static regression tests — they verify guard code exists
 * in the right files by inspecting source, preventing accidental removal.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────
// 1. Neture: sellerId Server Enforcement
//
// WO-NETURE-OWNERSHIP-GUARD-PHASE3-V1
// POST supplier requests must force sellerId = userId
// ─────────────────────────────────────────────────────

describe('Neture Ownership: sellerId override protection', () => {
  it('neture.routes.ts forces sellerId from authenticated user', () => {
    const filePath = path.resolve(
      __dirname,
      '../../modules/neture/neture.routes.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    // The guard pattern: sellerId from authenticated user (server-enforced)
    // Accepts: `const sellerId = userId` OR `const sellerId = req.user?.id`
    const hasServerEnforced =
      content.includes('const sellerId = userId') ||
      content.includes('const sellerId = req.user?.id');
    expect(hasServerEnforced).toBe(true);
    // Must NOT use client-provided sellerId
    expect(content).not.toMatch(/sellerId\s*=\s*(?:req\.body|data)\.sellerId/);
  });
});

// ─────────────────────────────────────────────────────
// 2. Care: pharmacistId Server Enforcement
//
// WO-GLYCOPHARM-CARE-DATA-ISOLATION-PHASE1-V1
// POST coaching must force pharmacistId = req.user.id
// ─────────────────────────────────────────────────────

describe('Care Ownership: pharmacistId override protection', () => {
  it('care-coaching.controller.ts forces pharmacistId from req.user', () => {
    const filePath = path.resolve(
      __dirname,
      '../../modules/care/controllers/care-coaching.controller.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    // The guard pattern: pharmacistId = pcReq.user?.id
    expect(content).toMatch(/pharmacistId\s*=\s*pcReq\.user\?\.id/);
    // Must NOT use client-provided pharmacistId
    expect(content).not.toMatch(/pharmacistId\s*=\s*(?:req\.body|data)\.pharmacistId/);
  });

  it('care-coaching.controller.ts uses authenticate middleware', () => {
    const filePath = path.resolve(
      __dirname,
      '../../modules/care/controllers/care-coaching.controller.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('authenticate');
    expect(content).toContain('requirePharmacyContext');
  });
});

// ─────────────────────────────────────────────────────
// 3. Care: All controllers use pharmacy context
// ─────────────────────────────────────────────────────

describe('Care Controllers: pharmacy context middleware applied', () => {
  const careControllers = [
    {
      name: 'care-analysis.controller.ts',
      path: '../../modules/care/controllers/care-analysis.controller.ts',
    },
    {
      name: 'care-coaching.controller.ts',
      path: '../../modules/care/controllers/care-coaching.controller.ts',
    },
    {
      name: 'care-dashboard.controller.ts',
      path: '../../modules/care/controllers/care-dashboard.controller.ts',
    },
  ];

  it.each(careControllers)('$name uses authenticate + requirePharmacyContext', ({ path: relPath }) => {
    const filePath = path.resolve(__dirname, relPath);
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('authenticate');
    expect(content).toContain('requirePharmacyContext');
  });
});

// ─────────────────────────────────────────────────────
// 4. LMS: Ownership guards on write endpoints
//
// All LMS controllers must have ownership check methods
// ─────────────────────────────────────────────────────

describe('LMS Ownership Guards', () => {
  it('CourseController has isOwnerOrAdmin', () => {
    const filePath = path.resolve(
      __dirname,
      '../../modules/lms/controllers/CourseController.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('isOwnerOrAdmin');
    expect(content).toContain('instructorId');
    // Admin bypass
    expect(content).toContain("kpa:admin");
  });

  it('EventController has checkEventOwnership', () => {
    const filePath = path.resolve(
      __dirname,
      '../../modules/lms/controllers/EventController.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('checkEventOwnership');
    expect(content).toContain('instructorId');
    expect(content).toContain("kpa:admin");
  });

  it('LessonController has checkCourseOwnership', () => {
    const filePath = path.resolve(
      __dirname,
      '../../modules/lms/controllers/LessonController.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('checkCourseOwnership');
    expect(content).toContain('instructorId');
    expect(content).toContain("kpa:admin");
  });

  it('QuizController has checkQuizOwnership', () => {
    const filePath = path.resolve(
      __dirname,
      '../../modules/lms/controllers/QuizController.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('checkQuizOwnership');
    expect(content).toContain("kpa:admin");
  });

  it('SurveyController has checkSurveyOwnership', () => {
    const filePath = path.resolve(
      __dirname,
      '../../modules/lms/controllers/SurveyController.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('checkSurveyOwnership');
    expect(content).toContain("kpa:admin");
  });

  it('AttendanceController has checkEventOwnership', () => {
    const filePath = path.resolve(
      __dirname,
      '../../modules/lms/controllers/AttendanceController.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('checkEventOwnership');
    expect(content).toContain("kpa:admin");
  });
});

// ─────────────────────────────────────────────────────
// 5. Service Scope Guard files: verify security-core usage
// ─────────────────────────────────────────────────────

describe('Service Scope Guards use @o4o/security-core', () => {
  it('KPA routes use createMembershipScopeGuard with KPA_SCOPE_CONFIG', () => {
    const filePath = path.resolve(
      __dirname,
      '../../routes/kpa/kpa.routes.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('@o4o/security-core');
    expect(content).toContain('KPA_SCOPE_CONFIG');
    expect(content).toContain('createMembershipScopeGuard');
  });

  it('Neture middleware uses createMembershipScopeGuard with NETURE_SCOPE_CONFIG', () => {
    const filePath = path.resolve(
      __dirname,
      '../../middleware/neture-scope.middleware.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('@o4o/security-core');
    expect(content).toContain('NETURE_SCOPE_CONFIG');
    expect(content).toContain('createMembershipScopeGuard');
  });

  it('GlycoPharm routes use createMembershipScopeGuard with GLYCOPHARM_SCOPE_CONFIG', () => {
    const filePath = path.resolve(
      __dirname,
      '../../routes/glycopharm/glycopharm.routes.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('@o4o/security-core');
    expect(content).toContain('GLYCOPHARM_SCOPE_CONFIG');
    expect(content).toContain('createMembershipScopeGuard');
  });
});

// ─────────────────────────────────────────────────────
// 6. Config freeze: verify service configs match expected values
// ─────────────────────────────────────────────────────

describe('Service Config Freeze Verification', () => {
  it('service-configs.ts KPA platformBypass = false', () => {
    const filePath = path.resolve(
      __dirname,
      '../../../../../packages/security-core/src/service-configs.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract KPA config block
    const kpaStart = content.indexOf('KPA_SCOPE_CONFIG');
    const kpaEnd = content.indexOf('};', kpaStart);
    const kpaBlock = content.slice(kpaStart, kpaEnd);

    expect(kpaBlock).toContain('platformBypass: false');
  });

  it('service-configs.ts Neture platformBypass = true', () => {
    const filePath = path.resolve(
      __dirname,
      '../../../../../packages/security-core/src/service-configs.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract Neture config block
    const netureStart = content.indexOf('NETURE_SCOPE_CONFIG');
    const netureEnd = content.indexOf('};', netureStart);
    const netureBlock = content.slice(netureStart, netureEnd);

    expect(netureBlock).toContain('platformBypass: true');
  });

  it('service-configs.ts GlycoPharm platformBypass = true', () => {
    const filePath = path.resolve(
      __dirname,
      '../../../../../packages/security-core/src/service-configs.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract GlycoPharm config block
    const glycoStart = content.indexOf('GLYCOPHARM_SCOPE_CONFIG');
    const glycoEnd = content.indexOf('};', glycoStart);
    const glycoBlock = content.slice(glycoStart, glycoEnd);

    expect(glycoBlock).toContain('platformBypass: true');
  });
});

// ─────────────────────────────────────────────────────
// 7. Health Readings: created_by server enforcement
//
// WO-O4O-HEALTH-DATA-PIPELINE-V1
// POST health-readings must force created_by = req.user.id
// ─────────────────────────────────────────────────────

describe('Health Readings Ownership: created_by override protection', () => {
  it('health-readings.controller.ts forces created_by from req.user', () => {
    const filePath = path.resolve(
      __dirname,
      '../../modules/care/controllers/health-readings.controller.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    // The guard pattern: createdBy from authenticated user (server-enforced)
    expect(content).toMatch(/createdBy\s*=\s*pcReq\.user\?\.(id|userId)/);
    // Must NOT use client-provided createdBy
    expect(content).not.toMatch(/createdBy\s*=\s*(?:req\.body|data)\.createdBy/);
  });

  it('health-readings.controller.ts forces pharmacyId from pharmacy context', () => {
    const filePath = path.resolve(
      __dirname,
      '../../modules/care/controllers/health-readings.controller.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    // pharmacyId from PharmacyContextMiddleware, not client
    expect(content).toMatch(/pharmacyId\s*=\s*pcReq\.pharmacyId/);
    expect(content).not.toMatch(/pharmacyId\s*=\s*(?:req\.body|data)\.pharmacyId/);
  });

  it('health-readings.controller.ts uses authenticate + requirePharmacyContext', () => {
    const filePath = path.resolve(
      __dirname,
      '../../modules/care/controllers/health-readings.controller.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('authenticate');
    expect(content).toContain('requirePharmacyContext');
  });

  it('health-readings.controller.ts forces sourceType to manual', () => {
    const filePath = path.resolve(
      __dirname,
      '../../modules/care/controllers/health-readings.controller.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    // Phase 1: sourceType always 'manual'
    expect(content).toMatch(/sourceType:\s*'manual'/);
  });
});
