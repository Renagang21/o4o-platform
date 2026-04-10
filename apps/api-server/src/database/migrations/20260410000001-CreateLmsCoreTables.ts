import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create LMS Core Tables
 *
 * lms-core lifecycle install hook이 실제 호출되지 않아 프로덕션 DB에
 * LMS 테이블이 생성되지 않은 문제 수정.
 *
 * 모든 테이블은 IF NOT EXISTS로 생성 — 기존 테이블에 영향 없음.
 * 컬럼명은 TypeORM Entity 기준 camelCase 사용 (namingStrategy 미적용 환경).
 *
 * 대상 테이블:
 *   lms_courses, lms_lessons, lms_enrollments, lms_progress,
 *   lms_certificates, lms_events, lms_attendance, lms_content_bundles
 */
export class CreateLmsCoreTables20260410000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ─── lms_courses ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lms_courses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        thumbnail VARCHAR(500),
        level VARCHAR(20) DEFAULT 'beginner',
        status VARCHAR(20) DEFAULT 'draft',
        duration INTEGER DEFAULT 0,
        "instructorId" UUID,
        "organizationId" UUID,
        "isOrganizationExclusive" BOOLEAN DEFAULT false,
        "isRequired" BOOLEAN DEFAULT false,
        "isPublished" BOOLEAN DEFAULT true,
        "requiresApproval" BOOLEAN DEFAULT false,
        "maxEnrollments" INTEGER,
        "currentEnrollments" INTEGER DEFAULT 0,
        "startAt" TIMESTAMP,
        "endAt" TIMESTAMP,
        credits DECIMAL(5,2) DEFAULT 0,
        metadata JSONB,
        tags TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "publishedAt" TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lms_courses_organization"
        ON lms_courses ("organizationId", status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lms_courses_instructor"
        ON lms_courses ("instructorId")
    `);

    // ─── lms_lessons ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lms_lessons (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "courseId" UUID REFERENCES lms_courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(20) DEFAULT 'article',
        content JSONB,
        "videoUrl" VARCHAR(500),
        "videoThumbnail" VARCHAR(500),
        "videoDuration" INTEGER,
        attachments JSONB,
        "order" INTEGER DEFAULT 0,
        duration INTEGER DEFAULT 0,
        "quizData" JSONB,
        "isPublished" BOOLEAN DEFAULT true,
        "isFree" BOOLEAN DEFAULT false,
        "requiresCompletion" BOOLEAN DEFAULT false,
        metadata JSONB,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lms_lessons_course_order"
        ON lms_lessons ("courseId", "order")
    `);

    // ─── lms_enrollments ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lms_enrollments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" UUID NOT NULL,
        "courseId" UUID REFERENCES lms_courses(id) ON DELETE CASCADE,
        "organizationId" UUID,
        status VARCHAR(20) DEFAULT 'pending',
        "progressPercentage" DECIMAL(5,2) DEFAULT 0,
        "completedLessons" INTEGER DEFAULT 0,
        "totalLessons" INTEGER DEFAULT 0,
        "timeSpent" INTEGER DEFAULT 0,
        "finalScore" DECIMAL(5,2),
        "averageQuizScore" DECIMAL(5,2),
        "enrolledAt" TIMESTAMP,
        "startedAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "expiresAt" TIMESTAMP,
        "certificateId" UUID,
        metadata JSONB,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "courseId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lms_enrollments_user_course"
        ON lms_enrollments ("userId", "courseId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lms_enrollments_organization"
        ON lms_enrollments ("organizationId")
    `);

    // ─── lms_progress ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lms_progress (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "enrollmentId" UUID REFERENCES lms_enrollments(id) ON DELETE CASCADE,
        "lessonId" UUID REFERENCES lms_lessons(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'not_started',
        "timeSpent" INTEGER DEFAULT 0,
        "completionPercentage" DECIMAL(5,2) DEFAULT 0,
        score DECIMAL(5,2),
        attempts INTEGER,
        "quizAnswers" JSONB,
        "startedAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "lastAccessedAt" TIMESTAMP,
        metadata JSONB,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("enrollmentId", "lessonId")
      )
    `);

    // ─── lms_certificates ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lms_certificates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" UUID NOT NULL,
        "courseId" UUID REFERENCES lms_courses(id) ON DELETE CASCADE,
        "certificateNumber" VARCHAR(100) UNIQUE NOT NULL,
        "certificateUrl" VARCHAR(500),
        "badgeUrl" VARCHAR(500),
        "finalScore" DECIMAL(5,2),
        credits DECIMAL(5,2) DEFAULT 0,
        "completedAt" TIMESTAMP NOT NULL,
        "expiresAt" TIMESTAMP,
        "isValid" BOOLEAN DEFAULT true,
        "issuedBy" UUID,
        "issuerName" VARCHAR(255),
        "issuerTitle" VARCHAR(255),
        metadata JSONB,
        "verificationCode" VARCHAR(255),
        "verificationUrl" VARCHAR(500),
        "issuedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "courseId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lms_certificates_user"
        ON lms_certificates ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lms_certificates_course"
        ON lms_certificates ("courseId")
    `);

    // ─── lms_events ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lms_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "courseId" UUID REFERENCES lms_courses(id) ON DELETE CASCADE,
        "organizationId" UUID,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(20) DEFAULT 'lecture',
        status VARCHAR(20) DEFAULT 'scheduled',
        "startAt" TIMESTAMP NOT NULL,
        "endAt" TIMESTAMP NOT NULL,
        timezone VARCHAR(100),
        location VARCHAR(500),
        "onlineUrl" VARCHAR(500),
        "isOnline" BOOLEAN DEFAULT false,
        "instructorId" UUID,
        "requiresAttendance" BOOLEAN DEFAULT false,
        "attendanceCode" VARCHAR(20),
        "attendanceCount" INTEGER DEFAULT 0,
        "maxAttendees" INTEGER,
        "currentAttendees" INTEGER DEFAULT 0,
        metadata JSONB,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lms_events_course_start"
        ON lms_events ("courseId", "startAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lms_events_organization"
        ON lms_events ("organizationId")
    `);

    // ─── lms_attendance ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lms_attendance (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "eventId" UUID REFERENCES lms_events(id) ON DELETE CASCADE,
        "userId" UUID NOT NULL,
        status VARCHAR(20) DEFAULT 'absent',
        "checkedInAt" TIMESTAMP,
        "usedCode" VARCHAR(20),
        "checkInMethod" VARCHAR(100),
        "checkInLocation" VARCHAR(500),
        "geoLocation" JSONB,
        notes TEXT,
        "markedBy" UUID,
        metadata JSONB,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP,
        UNIQUE("eventId", "userId")
      )
    `);

    // ─── lms_content_bundles ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lms_content_bundles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(20) DEFAULT 'education',
        metadata JSONB DEFAULT '{}',
        "contentItems" JSONB DEFAULT '[]',
        "isPublished" BOOLEAN DEFAULT false,
        "publishedAt" TIMESTAMP,
        "organizationId" UUID,
        "createdBy" UUID,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lms_content_bundles_type_published"
        ON lms_content_bundles (type, "isPublished")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lms_content_bundles_organization"
        ON lms_content_bundles ("organizationId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS lms_content_bundles`);
    await queryRunner.query(`DROP TABLE IF EXISTS lms_attendance`);
    await queryRunner.query(`DROP TABLE IF EXISTS lms_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS lms_certificates`);
    await queryRunner.query(`DROP TABLE IF EXISTS lms_progress`);
    await queryRunner.query(`DROP TABLE IF EXISTS lms_enrollments`);
    await queryRunner.query(`DROP TABLE IF EXISTS lms_lessons`);
    await queryRunner.query(`DROP TABLE IF EXISTS lms_courses`);
  }
}
