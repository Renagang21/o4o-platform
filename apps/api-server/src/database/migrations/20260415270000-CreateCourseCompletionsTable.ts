import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: Create course_completions table
 *
 * WO-O4O-COMPLETION-V1
 * Records course completion facts (separate from certificates).
 */
export class CreateCourseCompletionsTable20260415270000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'course_completions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'userId', type: 'uuid' },
          { name: 'courseId', type: 'uuid' },
          { name: 'enrollmentId', type: 'uuid' },
          { name: 'completedAt', type: 'timestamp' },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
        uniques: [
          { name: 'UQ_course_completions_user_course', columnNames: ['userId', 'courseId'] },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'course_completions',
      new TableIndex({ name: 'IDX_course_completions_user', columnNames: ['userId'] }),
    );

    await queryRunner.createIndex(
      'course_completions',
      new TableIndex({ name: 'IDX_course_completions_course', columnNames: ['courseId'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('course_completions', true);
  }
}
