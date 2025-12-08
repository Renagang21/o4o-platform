import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create LMS Core Tables
 *
 * Creates all tables for the LMS system with organization support.
 *
 * @version 1.0.0
 * @date 2025-11-30
 */
export class CreateLMSTables9200000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Create lms_courses table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'lms_courses',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'title', type: 'varchar', length: '255' },
          { name: 'description', type: 'text' },
          { name: 'thumbnail', type: 'varchar', length: '500', isNullable: true },
          { name: 'level', type: 'varchar', length: '20', default: "'beginner'" },
          { name: 'status', type: 'varchar', length: '20', default: "'draft'" },
          { name: 'duration', type: 'integer', default: 0 },
          { name: 'instructorId', type: 'uuid' },
          { name: 'organizationId', type: 'uuid', isNullable: true },
          { name: 'isOrganizationExclusive', type: 'boolean', default: false },
          { name: 'isRequired', type: 'boolean', default: false },
          { name: 'isPublished', type: 'boolean', default: true },
          { name: 'requiresApproval', type: 'boolean', default: false },
          { name: 'maxEnrollments', type: 'integer', isNullable: true },
          { name: 'currentEnrollments', type: 'integer', default: 0 },
          { name: 'startAt', type: 'timestamp', isNullable: true },
          { name: 'endAt', type: 'timestamp', isNullable: true },
          { name: 'credits', type: 'decimal', precision: 5, scale: 2, default: 0 },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'tags', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'publishedAt', type: 'timestamp', isNullable: true },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'lms_courses',
      new TableIndex({
        name: 'IDX_lms_courses_organization',
        columnNames: ['organizationId', 'status'],
      })
    );

    await queryRunner.createIndex(
      'lms_courses',
      new TableIndex({
        name: 'IDX_lms_courses_instructor',
        columnNames: ['instructorId'],
      })
    );

    await queryRunner.createForeignKey(
      'lms_courses',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organization',
        onDelete: 'SET NULL',
      })
    );

    // ============================================
    // 2. Create lms_lessons table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'lms_lessons',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'courseId', type: 'uuid' },
          { name: 'title', type: 'varchar', length: '255' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'type', type: 'varchar', length: '20', default: "'article'" },
          { name: 'content', type: 'jsonb', isNullable: true },
          { name: 'videoUrl', type: 'varchar', length: '500', isNullable: true },
          { name: 'videoThumbnail', type: 'varchar', length: '500', isNullable: true },
          { name: 'videoDuration', type: 'integer', isNullable: true },
          { name: 'attachments', type: 'jsonb', isNullable: true },
          { name: 'order', type: 'integer', default: 0 },
          { name: 'duration', type: 'integer', default: 0 },
          { name: 'quizData', type: 'jsonb', isNullable: true },
          { name: 'isPublished', type: 'boolean', default: true },
          { name: 'isFree', type: 'boolean', default: false },
          { name: 'requiresCompletion', type: 'boolean', default: false },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'lms_lessons',
      new TableIndex({
        name: 'IDX_lms_lessons_course_order',
        columnNames: ['courseId', 'order'],
      })
    );

    await queryRunner.createForeignKey(
      'lms_lessons',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'lms_courses',
        onDelete: 'CASCADE',
      })
    );

    // ============================================
    // 3. Create lms_enrollments table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'lms_enrollments',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'userId', type: 'uuid' },
          { name: 'courseId', type: 'uuid' },
          { name: 'organizationId', type: 'uuid', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'pending'" },
          { name: 'progressPercentage', type: 'decimal', precision: 5, scale: 2, default: 0 },
          { name: 'completedLessons', type: 'integer', default: 0 },
          { name: 'totalLessons', type: 'integer', default: 0 },
          { name: 'timeSpent', type: 'integer', default: 0 },
          { name: 'finalScore', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'averageQuizScore', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'enrolledAt', type: 'timestamp', isNullable: true },
          { name: 'startedAt', type: 'timestamp', isNullable: true },
          { name: 'completedAt', type: 'timestamp', isNullable: true },
          { name: 'expiresAt', type: 'timestamp', isNullable: true },
          { name: 'certificateId', type: 'uuid', isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'lms_enrollments',
      new TableIndex({
        name: 'IDX_lms_enrollments_user_course',
        columnNames: ['userId', 'courseId'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'lms_enrollments',
      new TableIndex({
        name: 'IDX_lms_enrollments_organization',
        columnNames: ['organizationId'],
      })
    );

    await queryRunner.createForeignKey(
      'lms_enrollments',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'lms_courses',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'lms_enrollments',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organization',
        onDelete: 'SET NULL',
      })
    );

    // Continue in next migration file...
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('lms_enrollments', true);
    await queryRunner.dropTable('lms_lessons', true);
    await queryRunner.dropTable('lms_courses', true);
  }
}
