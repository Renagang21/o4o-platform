import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * GlucoseView Pharmacist Membership Tables Migration
 *
 * Creates:
 * - glucoseview_branches (지부)
 * - glucoseview_chapters (분회)
 * - glucoseview_pharmacists (약사 프로필)
 */
export class CreateGlucoseViewPharmacistTables9970000000001 implements MigrationInterface {
  name = 'CreateGlucoseViewPharmacistTables9970000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create branches table (지부)
    await queryRunner.createTable(
      new Table({
        name: 'glucoseview_branches',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          {
            name: 'sort_order',
            type: 'int',
            default: 0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // 2. Create chapters table (분회)
    await queryRunner.createTable(
      new Table({
        name: 'glucoseview_chapters',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'branch_id',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          {
            name: 'sort_order',
            type: 'int',
            default: 0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Add FK for chapters -> branches
    await queryRunner.createForeignKey(
      'glucoseview_chapters',
      new TableForeignKey({
        columnNames: ['branch_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'glucoseview_branches',
        onDelete: 'CASCADE',
      })
    );

    // Add unique index for branch_id + name
    await queryRunner.createIndex(
      'glucoseview_chapters',
      new TableIndex({
        name: 'IDX_glucoseview_chapters_branch_name',
        columnNames: ['branch_id', 'name'],
        isUnique: true,
      })
    );

    // 3. Create pharmacists table (약사 프로필)
    await queryRunner.createTable(
      new Table({
        name: 'glucoseview_pharmacists',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'license_number',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'real_name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'display_name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'chapter_id',
            type: 'uuid',
          },
          {
            name: 'pharmacy_name',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'role',
            type: 'varchar',
            length: '20',
            default: "'pharmacist'",
          },
          {
            name: 'approval_status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'approved_by',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'approved_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'rejection_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Add FK for pharmacists -> chapters
    await queryRunner.createForeignKey(
      'glucoseview_pharmacists',
      new TableForeignKey({
        columnNames: ['chapter_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'glucoseview_chapters',
        onDelete: 'RESTRICT',
      })
    );

    // Add indexes
    await queryRunner.createIndex(
      'glucoseview_pharmacists',
      new TableIndex({
        name: 'IDX_glucoseview_pharmacists_user_id',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'glucoseview_pharmacists',
      new TableIndex({
        name: 'IDX_glucoseview_pharmacists_license',
        columnNames: ['license_number'],
      })
    );

    await queryRunner.createIndex(
      'glucoseview_pharmacists',
      new TableIndex({
        name: 'IDX_glucoseview_pharmacists_email',
        columnNames: ['email'],
      })
    );

    await queryRunner.createIndex(
      'glucoseview_pharmacists',
      new TableIndex({
        name: 'IDX_glucoseview_pharmacists_chapter',
        columnNames: ['chapter_id'],
      })
    );

    // Unique constraint for pharmacy_name within same chapter
    await queryRunner.createIndex(
      'glucoseview_pharmacists',
      new TableIndex({
        name: 'IDX_glucoseview_pharmacists_chapter_pharmacy',
        columnNames: ['chapter_id', 'pharmacy_name'],
        isUnique: true,
      })
    );

    // 4. Seed sample data for branches and chapters
    await this.seedSampleData(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('glucoseview_pharmacists');
    await queryRunner.dropTable('glucoseview_chapters');
    await queryRunner.dropTable('glucoseview_branches');
  }

  private async seedSampleData(queryRunner: QueryRunner): Promise<void> {
    // Insert branches
    await queryRunner.query(`
      INSERT INTO glucoseview_branches (id, name, code, sort_order) VALUES
      ('11111111-1111-1111-1111-111111111111', '서울지부', 'SEOUL', 1),
      ('22222222-2222-2222-2222-222222222222', '경기지부', 'GYEONGGI', 2),
      ('33333333-3333-3333-3333-333333333333', '부산지부', 'BUSAN', 3)
    `);

    // Insert chapters for Seoul
    await queryRunner.query(`
      INSERT INTO glucoseview_chapters (id, branch_id, name, code, sort_order) VALUES
      ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '강남분회', 'SEOUL-GANGNAM', 1),
      ('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '서초분회', 'SEOUL-SEOCHO', 2),
      ('a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '송파분회', 'SEOUL-SONGPA', 3)
    `);

    // Insert chapters for Gyeonggi
    await queryRunner.query(`
      INSERT INTO glucoseview_chapters (id, branch_id, name, code, sort_order) VALUES
      ('b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '수원분회', 'GYEONGGI-SUWON', 1),
      ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '성남분회', 'GYEONGGI-SEONGNAM', 2),
      ('b3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '용인분회', 'GYEONGGI-YONGIN', 3)
    `);

    // Insert chapters for Busan
    await queryRunner.query(`
      INSERT INTO glucoseview_chapters (id, branch_id, name, code, sort_order) VALUES
      ('c1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '해운대분회', 'BUSAN-HAEUNDAE', 1),
      ('c2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '동래분회', 'BUSAN-DONGNAE', 2),
      ('c3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '사상분회', 'BUSAN-SASANG', 3)
    `);
  }
}
