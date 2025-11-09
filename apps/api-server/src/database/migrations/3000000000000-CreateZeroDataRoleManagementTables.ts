import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey, TableUnique } from 'typeorm';

/**
 * P0 Zero-Data: 역할 관리 시스템 테이블 생성
 *
 * 생성 테이블:
 * - role_enrollments: 역할 신청
 * - role_assignments: 역할 할당
 * - supplier_profiles: 공급자 프로필
 * - seller_profiles: 판매자 프로필
 * - partner_profiles: 파트너 프로필
 * - kyc_documents: KYC 서류
 *
 * @see docs/dev/investigations/user-refactor_2025-11/zerodata/01_schema_baseline.md
 * @see docs/dev/investigations/user-refactor_2025-11/zerodata/p0_execution_order.md
 *
 * Schema Tag: schema_tag_user_refactor_v2_p0
 */
export class CreateZeroDataRoleManagementTables3000000000000 implements MigrationInterface {
  name = 'CreateZeroDataRoleManagementTables3000000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===========================
    // 1. role_enrollments 테이블 생성
    // ===========================
    await queryRunner.createTable(
      new Table({
        name: 'role_enrollments',
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
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: 'application_data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'reviewed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'reviewed_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'review_note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // role_enrollments 인덱스
    await queryRunner.createIndex(
      'role_enrollments',
      new TableIndex({
        name: 'IDX_role_enrollments_user_id',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'role_enrollments',
      new TableIndex({
        name: 'IDX_role_enrollments_role',
        columnNames: ['role'],
      })
    );

    await queryRunner.createIndex(
      'role_enrollments',
      new TableIndex({
        name: 'IDX_role_enrollments_status',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'role_enrollments',
      new TableIndex({
        name: 'IDX_role_enrollments_created_at',
        columnNames: ['created_at'],
      })
    );

    await queryRunner.createIndex(
      'role_enrollments',
      new TableIndex({
        name: 'IDX_role_enrollments_user_role_status',
        columnNames: ['user_id', 'role', 'status'],
      })
    );

    // role_enrollments FK
    await queryRunner.createForeignKey(
      'role_enrollments',
      new TableForeignKey({
        name: 'FK_role_enrollments_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'role_enrollments',
      new TableForeignKey({
        name: 'FK_role_enrollments_reviewed_by',
        columnNames: ['reviewed_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // ===========================
    // 2. role_assignments 테이블 생성
    // ===========================
    await queryRunner.createTable(
      new Table({
        name: 'role_assignments',
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
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'enrollment_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'valid_from',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'valid_until',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'assigned_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'assigned_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // role_assignments 인덱스
    await queryRunner.createIndex(
      'role_assignments',
      new TableIndex({
        name: 'IDX_role_assignments_user_id',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'role_assignments',
      new TableIndex({
        name: 'IDX_role_assignments_role',
        columnNames: ['role'],
      })
    );

    await queryRunner.createIndex(
      'role_assignments',
      new TableIndex({
        name: 'IDX_role_assignments_is_active',
        columnNames: ['is_active'],
      })
    );

    await queryRunner.createIndex(
      'role_assignments',
      new TableIndex({
        name: 'IDX_role_assignments_user_active',
        columnNames: ['user_id', 'is_active'],
      })
    );

    await queryRunner.createIndex(
      'role_assignments',
      new TableIndex({
        name: 'IDX_role_assignments_user_role',
        columnNames: ['user_id', 'role'],
      })
    );

    // role_assignments UNIQUE 제약 (active role per user)
    // Note: Partial unique index is not supported by TypeORM TableUnique, using raw SQL
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_role_assignments_user_role_active"
      ON "role_assignments" ("user_id", "role")
      WHERE "is_active" = true
    `);

    // role_assignments FK
    await queryRunner.createForeignKey(
      'role_assignments',
      new TableForeignKey({
        name: 'FK_role_assignments_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'role_assignments',
      new TableForeignKey({
        name: 'FK_role_assignments_enrollment_id',
        columnNames: ['enrollment_id'],
        referencedTableName: 'role_enrollments',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createForeignKey(
      'role_assignments',
      new TableForeignKey({
        name: 'FK_role_assignments_assigned_by',
        columnNames: ['assigned_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // ===========================
    // 3. kyc_documents 테이블 생성
    // ===========================
    await queryRunner.createTable(
      new Table({
        name: 'kyc_documents',
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
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'enrollment_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'document_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'file_url',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'file_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'file_size',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'verification_status',
            type: 'varchar',
            length: '50',
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: 'verified_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'verified_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'verification_note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // kyc_documents 인덱스
    await queryRunner.createIndex(
      'kyc_documents',
      new TableIndex({
        name: 'IDX_kyc_documents_user_id',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'kyc_documents',
      new TableIndex({
        name: 'IDX_kyc_documents_enrollment_id',
        columnNames: ['enrollment_id'],
      })
    );

    await queryRunner.createIndex(
      'kyc_documents',
      new TableIndex({
        name: 'IDX_kyc_documents_verification_status',
        columnNames: ['verification_status'],
      })
    );

    await queryRunner.createIndex(
      'kyc_documents',
      new TableIndex({
        name: 'IDX_kyc_documents_document_type',
        columnNames: ['document_type'],
      })
    );

    // kyc_documents FK
    await queryRunner.createForeignKey(
      'kyc_documents',
      new TableForeignKey({
        name: 'FK_kyc_documents_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'kyc_documents',
      new TableForeignKey({
        name: 'FK_kyc_documents_enrollment_id',
        columnNames: ['enrollment_id'],
        referencedTableName: 'role_enrollments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'kyc_documents',
      new TableForeignKey({
        name: 'FK_kyc_documents_verified_by',
        columnNames: ['verified_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // ===========================
    // 4. supplier_profiles 테이블 생성
    // ===========================
    await queryRunner.createTable(
      new Table({
        name: 'supplier_profiles',
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
            type: 'uuid',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'company_name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'tax_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'business_registration',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'business_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'business_phone',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'business_address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'bank_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'account_number',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'account_holder',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'warehouse_name',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'warehouse_address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'warehouse_phone',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'default_shipping_fee',
            type: 'integer',
            default: 0,
            isNullable: true,
          },
          {
            name: 'free_shipping_threshold',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'return_address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'return_policy',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // supplier_profiles 인덱스
    await queryRunner.createIndex(
      'supplier_profiles',
      new TableIndex({
        name: 'IDX_supplier_profiles_user_id',
        columnNames: ['user_id'],
        isUnique: true,
      })
    );

    // supplier_profiles FK
    await queryRunner.createForeignKey(
      'supplier_profiles',
      new TableForeignKey({
        name: 'FK_supplier_profiles_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // ===========================
    // 5. seller_profiles 테이블 생성
    // ===========================
    await queryRunner.createTable(
      new Table({
        name: 'seller_profiles',
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
            type: 'uuid',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'store_name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'store_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'sales_channel',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'company_name',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'tax_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'business_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'business_phone',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'bank_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'account_number',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'account_holder',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'default_shipping_address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'return_address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'return_policy',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'total_sales',
            type: 'integer',
            default: 0,
            isNullable: true,
          },
          {
            name: 'avg_monthly_sales',
            type: 'integer',
            default: 0,
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // seller_profiles 인덱스
    await queryRunner.createIndex(
      'seller_profiles',
      new TableIndex({
        name: 'IDX_seller_profiles_user_id',
        columnNames: ['user_id'],
        isUnique: true,
      })
    );

    // seller_profiles FK
    await queryRunner.createForeignKey(
      'seller_profiles',
      new TableForeignKey({
        name: 'FK_seller_profiles_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // ===========================
    // 6. partner_profiles 테이블 생성
    // ===========================
    await queryRunner.createTable(
      new Table({
        name: 'partner_profiles',
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
            type: 'uuid',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'partner_type',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'platform',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'channel_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'follower_count',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'is_business',
            type: 'boolean',
            default: false,
            isNullable: true,
          },
          {
            name: 'company_name',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'tax_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'contact_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'contact_phone',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'bank_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'account_number',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'account_holder',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'default_commission_rate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'settlement_cycle',
            type: 'varchar',
            length: '50',
            default: "'monthly'",
            isNullable: true,
          },
          {
            name: 'total_referrals',
            type: 'integer',
            default: 0,
            isNullable: true,
          },
          {
            name: 'total_conversions',
            type: 'integer',
            default: 0,
            isNullable: true,
          },
          {
            name: 'conversion_rate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // partner_profiles 인덱스
    await queryRunner.createIndex(
      'partner_profiles',
      new TableIndex({
        name: 'IDX_partner_profiles_user_id',
        columnNames: ['user_id'],
        isUnique: true,
      })
    );

    // partner_profiles FK
    await queryRunner.createForeignKey(
      'partner_profiles',
      new TableForeignKey({
        name: 'FK_partner_profiles_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 역순으로 삭제

    // partner_profiles
    await queryRunner.dropTable('partner_profiles', true);

    // seller_profiles
    await queryRunner.dropTable('seller_profiles', true);

    // supplier_profiles
    await queryRunner.dropTable('supplier_profiles', true);

    // kyc_documents
    await queryRunner.dropTable('kyc_documents', true);

    // role_assignments
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_role_assignments_user_role_active"');
    await queryRunner.dropTable('role_assignments', true);

    // role_enrollments
    await queryRunner.dropTable('role_enrollments', true);
  }
}
