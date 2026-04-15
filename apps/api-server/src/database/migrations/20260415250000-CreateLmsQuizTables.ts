import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create LMS Quiz Tables
 *
 * WO-O4O-QUIZ-SYSTEM-V1
 * Creates lms_quizzes and lms_quiz_attempts tables for the quiz evaluation system.
 */
export class CreateLmsQuizTables20260415250000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Create lms_quizzes table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'lms_quizzes',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'title', type: 'varchar', length: '255' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'questions', type: 'jsonb', default: "'[]'" },
          { name: 'isPublished', type: 'boolean', default: false },
          { name: 'publishedAt', type: 'timestamp', isNullable: true },
          { name: 'bundleId', type: 'uuid', isNullable: true },
          { name: 'courseId', type: 'uuid', isNullable: true },
          { name: 'lessonId', type: 'uuid', isNullable: true },
          { name: 'passingScore', type: 'integer', default: 70 },
          { name: 'timeLimit', type: 'integer', isNullable: true },
          { name: 'maxAttempts', type: 'integer', isNullable: true },
          { name: 'showResultsImmediately', type: 'boolean', default: true },
          { name: 'showCorrectAnswers', type: 'boolean', default: false },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'createdBy', type: 'uuid', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'lms_quizzes',
      new TableIndex({
        name: 'IDX_lms_quizzes_published_created',
        columnNames: ['isPublished', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'lms_quizzes',
      new TableIndex({
        name: 'IDX_lms_quizzes_bundle',
        columnNames: ['bundleId'],
      }),
    );

    await queryRunner.createIndex(
      'lms_quizzes',
      new TableIndex({
        name: 'IDX_lms_quizzes_lesson',
        columnNames: ['lessonId'],
      }),
    );

    await queryRunner.createForeignKey(
      'lms_quizzes',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'lms_courses',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'lms_quizzes',
      new TableForeignKey({
        columnNames: ['lessonId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'lms_lessons',
        onDelete: 'SET NULL',
      }),
    );

    // ============================================
    // 2. Create lms_quiz_attempts table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'lms_quiz_attempts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'quizId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'answers', type: 'jsonb', default: "'[]'" },
          { name: 'status', type: 'varchar', length: '20', default: "'in_progress'" },
          { name: 'score', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'earnedPoints', type: 'integer', default: 0 },
          { name: 'totalPoints', type: 'integer', default: 0 },
          { name: 'passed', type: 'boolean', isNullable: true },
          { name: 'startedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'completedAt', type: 'timestamp', isNullable: true },
          { name: 'timeSpent', type: 'integer', isNullable: true },
          { name: 'attemptNumber', type: 'integer', default: 1 },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'lms_quiz_attempts',
      new TableIndex({
        name: 'IDX_lms_quiz_attempts_quiz_created',
        columnNames: ['quizId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'lms_quiz_attempts',
      new TableIndex({
        name: 'IDX_lms_quiz_attempts_user_quiz',
        columnNames: ['userId', 'quizId'],
      }),
    );

    await queryRunner.createIndex(
      'lms_quiz_attempts',
      new TableIndex({
        name: 'IDX_lms_quiz_attempts_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createForeignKey(
      'lms_quiz_attempts',
      new TableForeignKey({
        columnNames: ['quizId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'lms_quizzes',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('lms_quiz_attempts', true);
    await queryRunner.dropTable('lms_quizzes', true);
  }
}
