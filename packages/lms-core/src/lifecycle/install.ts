import { DataSource } from 'typeorm';

/**
 * LMS-Core Install Hook
 *
 * This hook is executed when the LMS core is installed.
 * Creates all required tables for the LMS system.
 */
export async function onInstall(dataSource: DataSource): Promise<void> {
  console.log('[lms-core] Installing LMS core...');

  // Run table creation
  console.log('[lms-core] Creating database tables...');

  try {
    await createTables(dataSource);
    await createIndexes(dataSource);

    console.log('[lms-core] LMS core installed successfully');
    console.log('[lms-core] Features:');
    console.log('  - Course management');
    console.log('  - Lesson content delivery');
    console.log('  - Enrollment tracking');
    console.log('  - Progress monitoring');
    console.log('  - Certificate issuance');
    console.log('  - Event scheduling');
    console.log('  - Attendance tracking');
    console.log('  - Organization-scoped courses');
    console.log('  - ContentBundle (multi-domain content structure)');
  } catch (error) {
    console.error('[lms-core] Installation failed:', error);
    throw error;
  }
}

/**
 * Create LMS tables
 */
async function createTables(dataSource: DataSource): Promise<void> {
  // Enable uuid-ossp extension if not exists
  await dataSource.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

  // ============================================
  // 1. lms_courses table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS lms_courses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      thumbnail VARCHAR(500),
      level VARCHAR(20) DEFAULT 'beginner',
      status VARCHAR(20) DEFAULT 'draft',
      duration INTEGER DEFAULT 0,
      instructor_id UUID,
      organization_id UUID,
      is_organization_exclusive BOOLEAN DEFAULT false,
      is_required BOOLEAN DEFAULT false,
      is_published BOOLEAN DEFAULT true,
      requires_approval BOOLEAN DEFAULT false,
      max_enrollments INTEGER,
      current_enrollments INTEGER DEFAULT 0,
      start_at TIMESTAMP,
      end_at TIMESTAMP,
      credits DECIMAL(5,2) DEFAULT 0,
      metadata JSONB,
      tags TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      published_at TIMESTAMP
    );
  `);
  console.log('[lms-core] Created lms_courses table');

  // ============================================
  // 2. lms_lessons table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS lms_lessons (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      course_id UUID REFERENCES lms_courses(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(20) DEFAULT 'article',
      content JSONB,
      video_url VARCHAR(500),
      video_thumbnail VARCHAR(500),
      video_duration INTEGER,
      attachments JSONB,
      "order" INTEGER DEFAULT 0,
      duration INTEGER DEFAULT 0,
      quiz_data JSONB,
      is_published BOOLEAN DEFAULT true,
      is_free BOOLEAN DEFAULT false,
      requires_completion BOOLEAN DEFAULT false,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[lms-core] Created lms_lessons table');

  // ============================================
  // 3. lms_enrollments table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS lms_enrollments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL,
      course_id UUID REFERENCES lms_courses(id) ON DELETE CASCADE,
      organization_id UUID,
      status VARCHAR(20) DEFAULT 'pending',
      progress_percentage DECIMAL(5,2) DEFAULT 0,
      completed_lessons INTEGER DEFAULT 0,
      total_lessons INTEGER DEFAULT 0,
      time_spent INTEGER DEFAULT 0,
      final_score DECIMAL(5,2),
      average_quiz_score DECIMAL(5,2),
      enrolled_at TIMESTAMP,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      expires_at TIMESTAMP,
      certificate_id UUID,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, course_id)
    );
  `);
  console.log('[lms-core] Created lms_enrollments table');

  // ============================================
  // 4. lms_progress table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS lms_progress (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      enrollment_id UUID REFERENCES lms_enrollments(id) ON DELETE CASCADE,
      lesson_id UUID REFERENCES lms_lessons(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'not_started',
      time_spent INTEGER DEFAULT 0,
      completion_percentage DECIMAL(5,2) DEFAULT 0,
      score DECIMAL(5,2),
      attempts INTEGER,
      quiz_answers JSONB,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      last_accessed_at TIMESTAMP,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(enrollment_id, lesson_id)
    );
  `);
  console.log('[lms-core] Created lms_progress table');

  // ============================================
  // 5. lms_certificates table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS lms_certificates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL,
      course_id UUID REFERENCES lms_courses(id) ON DELETE CASCADE,
      certificate_number VARCHAR(100) UNIQUE NOT NULL,
      certificate_url VARCHAR(500),
      badge_url VARCHAR(500),
      final_score DECIMAL(5,2),
      credits DECIMAL(5,2) DEFAULT 0,
      completed_at TIMESTAMP NOT NULL,
      expires_at TIMESTAMP,
      is_valid BOOLEAN DEFAULT true,
      issued_by UUID,
      issuer_name VARCHAR(255),
      issuer_title VARCHAR(255),
      metadata JSONB,
      verification_code VARCHAR(255),
      verification_url VARCHAR(500),
      issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, course_id)
    );
  `);
  console.log('[lms-core] Created lms_certificates table');

  // ============================================
  // 6. lms_events table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS lms_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      course_id UUID REFERENCES lms_courses(id) ON DELETE CASCADE,
      organization_id UUID,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(20) DEFAULT 'lecture',
      status VARCHAR(20) DEFAULT 'scheduled',
      start_at TIMESTAMP NOT NULL,
      end_at TIMESTAMP NOT NULL,
      timezone VARCHAR(100),
      location VARCHAR(500),
      online_url VARCHAR(500),
      is_online BOOLEAN DEFAULT false,
      instructor_id UUID,
      requires_attendance BOOLEAN DEFAULT false,
      attendance_code VARCHAR(20),
      attendance_count INTEGER DEFAULT 0,
      max_attendees INTEGER,
      current_attendees INTEGER DEFAULT 0,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[lms-core] Created lms_events table');

  // ============================================
  // 7. lms_attendance table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS lms_attendance (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_id UUID REFERENCES lms_events(id) ON DELETE CASCADE,
      user_id UUID NOT NULL,
      status VARCHAR(20) DEFAULT 'absent',
      checked_in_at TIMESTAMP,
      used_code VARCHAR(20),
      check_in_method VARCHAR(100),
      check_in_location VARCHAR(500),
      geo_location JSONB,
      notes TEXT,
      marked_by UUID,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP,
      UNIQUE(event_id, user_id)
    );
  `);
  console.log('[lms-core] Created lms_attendance table');

  // ============================================
  // 8. lms_content_bundles table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS lms_content_bundles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(20) DEFAULT 'education',
      metadata JSONB DEFAULT '{}',
      content_items JSONB DEFAULT '[]',
      is_published BOOLEAN DEFAULT false,
      published_at TIMESTAMP,
      organization_id UUID,
      created_by UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[lms-core] Created lms_content_bundles table');
}

/**
 * Create indexes for LMS tables
 */
async function createIndexes(dataSource: DataSource): Promise<void> {
  console.log('[lms-core] Creating indexes...');

  await dataSource.query(`
    -- lms_courses indexes
    CREATE INDEX IF NOT EXISTS idx_lms_courses_organization ON lms_courses(organization_id, status);
    CREATE INDEX IF NOT EXISTS idx_lms_courses_instructor ON lms_courses(instructor_id);
    CREATE INDEX IF NOT EXISTS idx_lms_courses_status ON lms_courses(status);

    -- lms_lessons indexes
    CREATE INDEX IF NOT EXISTS idx_lms_lessons_course_order ON lms_lessons(course_id, "order");

    -- lms_enrollments indexes
    CREATE INDEX IF NOT EXISTS idx_lms_enrollments_organization ON lms_enrollments(organization_id);
    CREATE INDEX IF NOT EXISTS idx_lms_enrollments_user ON lms_enrollments(user_id);
    CREATE INDEX IF NOT EXISTS idx_lms_enrollments_course ON lms_enrollments(course_id);
    CREATE INDEX IF NOT EXISTS idx_lms_enrollments_status ON lms_enrollments(status);

    -- lms_progress indexes
    CREATE INDEX IF NOT EXISTS idx_lms_progress_enrollment ON lms_progress(enrollment_id);
    CREATE INDEX IF NOT EXISTS idx_lms_progress_lesson ON lms_progress(lesson_id);

    -- lms_certificates indexes
    CREATE INDEX IF NOT EXISTS idx_lms_certificates_user ON lms_certificates(user_id);
    CREATE INDEX IF NOT EXISTS idx_lms_certificates_course ON lms_certificates(course_id);
    CREATE INDEX IF NOT EXISTS idx_lms_certificates_number ON lms_certificates(certificate_number);

    -- lms_events indexes
    CREATE INDEX IF NOT EXISTS idx_lms_events_course_start ON lms_events(course_id, start_at);
    CREATE INDEX IF NOT EXISTS idx_lms_events_organization ON lms_events(organization_id);
    CREATE INDEX IF NOT EXISTS idx_lms_events_status ON lms_events(status);

    -- lms_attendance indexes
    CREATE INDEX IF NOT EXISTS idx_lms_attendance_event ON lms_attendance(event_id);
    CREATE INDEX IF NOT EXISTS idx_lms_attendance_user ON lms_attendance(user_id);

    -- lms_content_bundles indexes
    CREATE INDEX IF NOT EXISTS idx_lms_content_bundles_type_published ON lms_content_bundles(type, is_published);
    CREATE INDEX IF NOT EXISTS idx_lms_content_bundles_organization ON lms_content_bundles(organization_id);
    CREATE INDEX IF NOT EXISTS idx_lms_content_bundles_created_at ON lms_content_bundles(created_at);
  `);

  console.log('[lms-core] Indexes created successfully');
}

/**
 * LMS-Core Uninstall Hook
 */
export async function onUninstall(dataSource: DataSource): Promise<void> {
  console.log('[lms-core] Uninstalling LMS core...');

  // Cleanup logic here (tables are kept by default per uninstallPolicy)

  console.log('[lms-core] LMS core uninstalled successfully');
}
