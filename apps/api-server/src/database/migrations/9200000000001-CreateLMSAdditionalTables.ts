import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create LMS Additional Tables
 *
 * Creates Progress, Certificate, LMSEvent, and Attendance tables.
 *
 * @version 1.0.0
 * @date 2025-11-30
 */
export class CreateLMSAdditionalTables9200000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Create lms_progress table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'lms_progress',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'enrollmentId', type: 'uuid' },
          { name: 'lessonId', type: 'uuid' },
          { name: 'status', type: 'varchar', length: '20', default: "'not_started'" },
          { name: 'timeSpent', type: 'integer', default: 0 },
          { name: 'completionPercentage', type: 'decimal', precision: 5, scale: 2, default: 0 },
          { name: 'score', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'attempts', type: 'integer', isNullable: true },
          { name: 'quizAnswers', type: 'jsonb', isNullable: true },
          { name: 'startedAt', type: 'timestamp', isNullable: true },
          { name: 'completedAt', type: 'timestamp', isNullable: true },
          { name: 'lastAccessedAt', type: 'timestamp', isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'lms_progress',
      new TableIndex({
        name: 'IDX_lms_progress_enrollment_lesson',
        columnNames: ['enrollmentId', 'lessonId'],
        isUnique: true,
      })
    );

    await queryRunner.createForeignKey(
      'lms_progress',
      new TableForeignKey({
        columnNames: ['enrollmentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'lms_enrollments',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'lms_progress',
      new TableForeignKey({
        columnNames: ['lessonId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'lms_lessons',
        onDelete: 'CASCADE',
      })
    );

    // ============================================
    // 2. Create lms_certificates table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'lms_certificates',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'userId', type: 'uuid' },
          { name: 'courseId', type: 'uuid' },
          { name: 'certificateNumber', type: 'varchar', length: '100', isUnique: true },
          { name: 'certificateUrl', type: 'varchar', length: '500', isNullable: true },
          { name: 'badgeUrl', type: 'varchar', length: '500', isNullable: true },
          { name: 'finalScore', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'credits', type: 'decimal', precision: 5, scale: 2, default: 0 },
          { name: 'completedAt', type: 'timestamp' },
          { name: 'expiresAt', type: 'timestamp', isNullable: true },
          { name: 'isValid', type: 'boolean', default: true },
          { name: 'issuedBy', type: 'uuid', isNullable: true },
          { name: 'issuerName', type: 'varchar', length: '255', isNullable: true },
          { name: 'issuerTitle', type: 'varchar', length: '255', isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'verificationCode', type: 'varchar', length: '255', isNullable: true },
          { name: 'verificationUrl', type: 'varchar', length: '500', isNullable: true },
          { name: 'issuedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'lms_certificates',
      new TableIndex({
        name: 'IDX_lms_certificates_user_course',
        columnNames: ['userId', 'courseId'],
        isUnique: true,
      })
    );

    await queryRunner.createForeignKey(
      'lms_certificates',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'lms_courses',
        onDelete: 'CASCADE',
      })
    );

    // ============================================
    // 3. Create lms_events table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'lms_events',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'courseId', type: 'uuid' },
          { name: 'organizationId', type: 'uuid', isNullable: true },
          { name: 'title', type: 'varchar', length: '255' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'type', type: 'varchar', length: '20', default: "'lecture'" },
          { name: 'status', type: 'varchar', length: '20', default: "'scheduled'" },
          { name: 'startAt', type: 'timestamp' },
          { name: 'endAt', type: 'timestamp' },
          { name: 'timezone', type: 'varchar', length: '100', isNullable: true },
          { name: 'location', type: 'varchar', length: '500', isNullable: true },
          { name: 'onlineUrl', type: 'varchar', length: '500', isNullable: true },
          { name: 'isOnline', type: 'boolean', default: false },
          { name: 'instructorId', type: 'uuid', isNullable: true },
          { name: 'requiresAttendance', type: 'boolean', default: false },
          { name: 'attendanceCode', type: 'varchar', length: '20', isNullable: true },
          { name: 'attendanceCount', type: 'integer', default: 0 },
          { name: 'maxAttendees', type: 'integer', isNullable: true },
          { name: 'currentAttendees', type: 'integer', default: 0 },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'lms_events',
      new TableIndex({
        name: 'IDX_lms_events_course_start',
        columnNames: ['courseId', 'startAt'],
      })
    );

    await queryRunner.createIndex(
      'lms_events',
      new TableIndex({
        name: 'IDX_lms_events_organization',
        columnNames: ['organizationId'],
      })
    );

    await queryRunner.createForeignKey(
      'lms_events',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'lms_courses',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'lms_events',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organization',
        onDelete: 'SET NULL',
      })
    );

    // ============================================
    // 4. Create lms_attendance table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'lms_attendance',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'eventId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'status', type: 'varchar', length: '20', default: "'absent'" },
          { name: 'checkedInAt', type: 'timestamp', isNullable: true },
          { name: 'usedCode', type: 'varchar', length: '20', isNullable: true },
          { name: 'checkInMethod', type: 'varchar', length: '100', isNullable: true },
          { name: 'checkInLocation', type: 'varchar', length: '500', isNullable: true },
          { name: 'geoLocation', type: 'jsonb', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'markedBy', type: 'uuid', isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', isNullable: true },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'lms_attendance',
      new TableIndex({
        name: 'IDX_lms_attendance_event_user',
        columnNames: ['eventId', 'userId'],
        isUnique: true,
      })
    );

    await queryRunner.createForeignKey(
      'lms_attendance',
      new TableForeignKey({
        columnNames: ['eventId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'lms_events',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('lms_attendance', true);
    await queryRunner.dropTable('lms_events', true);
    await queryRunner.dropTable('lms_certificates', true);
    await queryRunner.dropTable('lms_progress', true);
  }
}
