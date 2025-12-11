import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * ExtendYaksaMemberFields Migration
 *
 * Phase 1: Extends yaksa_members table with Yaksa-specific fields:
 * - gender: 성별
 * - licenseIssuedAt: 면허 발급일
 * - licenseRenewalAt: 면허 갱신일
 * - pharmacistType: 약사 유형 (working/owner/hospital/public/industry/retired/other)
 * - workplaceName: 근무지명
 * - workplaceAddress: 근무지 주소
 * - workplaceType: 근무지 유형 (pharmacy/hospital/public/company/education/research/other)
 * - yaksaJoinDate: 약사회 가입일
 * - officialRole: 약사회 공식 직책
 * - registrationNumber: 회원등록번호
 * - memo: 메모
 */
export class ExtendYaksaMemberFields1733600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists
    const tableExists = await queryRunner.hasTable('yaksa_members');
    if (!tableExists) {
      console.log('yaksa_members table does not exist, skipping migration');
      return;
    }

    // Add Phase 1 columns
    await queryRunner.addColumns('yaksa_members', [
      // 성별
      new TableColumn({
        name: 'gender',
        type: 'varchar',
        length: '10',
        isNullable: true,
      }),
      // 면허 발급일
      new TableColumn({
        name: 'licenseIssuedAt',
        type: 'date',
        isNullable: true,
      }),
      // 면허 갱신일
      new TableColumn({
        name: 'licenseRenewalAt',
        type: 'date',
        isNullable: true,
      }),
      // 약사 유형
      new TableColumn({
        name: 'pharmacistType',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
      // 근무지명
      new TableColumn({
        name: 'workplaceName',
        type: 'varchar',
        length: '200',
        isNullable: true,
      }),
      // 근무지 주소
      new TableColumn({
        name: 'workplaceAddress',
        type: 'text',
        isNullable: true,
      }),
      // 근무지 유형
      new TableColumn({
        name: 'workplaceType',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
      // 약사회 가입일
      new TableColumn({
        name: 'yaksaJoinDate',
        type: 'date',
        isNullable: true,
      }),
      // 약사회 공식 직책
      new TableColumn({
        name: 'officialRole',
        type: 'varchar',
        length: '50',
        isNullable: true,
        default: "'none'",
      }),
      // 회원등록번호 (unique)
      new TableColumn({
        name: 'registrationNumber',
        type: 'varchar',
        length: '50',
        isNullable: true,
        isUnique: true,
      }),
      // 메모
      new TableColumn({
        name: 'memo',
        type: 'text',
        isNullable: true,
      }),
    ]);

    // Add indexes for frequently queried fields
    await queryRunner.createIndex(
      'yaksa_members',
      new TableIndex({
        name: 'IDX_yaksa_members_pharmacistType',
        columnNames: ['pharmacistType'],
      })
    );

    await queryRunner.createIndex(
      'yaksa_members',
      new TableIndex({
        name: 'IDX_yaksa_members_workplaceType',
        columnNames: ['workplaceType'],
      })
    );

    await queryRunner.createIndex(
      'yaksa_members',
      new TableIndex({
        name: 'IDX_yaksa_members_officialRole',
        columnNames: ['officialRole'],
      })
    );

    await queryRunner.createIndex(
      'yaksa_members',
      new TableIndex({
        name: 'IDX_yaksa_members_registrationNumber',
        columnNames: ['registrationNumber'],
        isUnique: true,
      })
    );

    console.log('Successfully added Phase 1 fields to yaksa_members table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.dropIndex('yaksa_members', 'IDX_yaksa_members_pharmacistType');
    await queryRunner.dropIndex('yaksa_members', 'IDX_yaksa_members_workplaceType');
    await queryRunner.dropIndex('yaksa_members', 'IDX_yaksa_members_officialRole');
    await queryRunner.dropIndex('yaksa_members', 'IDX_yaksa_members_registrationNumber');

    // Drop columns
    await queryRunner.dropColumn('yaksa_members', 'memo');
    await queryRunner.dropColumn('yaksa_members', 'registrationNumber');
    await queryRunner.dropColumn('yaksa_members', 'officialRole');
    await queryRunner.dropColumn('yaksa_members', 'yaksaJoinDate');
    await queryRunner.dropColumn('yaksa_members', 'workplaceType');
    await queryRunner.dropColumn('yaksa_members', 'workplaceAddress');
    await queryRunner.dropColumn('yaksa_members', 'workplaceName');
    await queryRunner.dropColumn('yaksa_members', 'pharmacistType');
    await queryRunner.dropColumn('yaksa_members', 'licenseRenewalAt');
    await queryRunner.dropColumn('yaksa_members', 'licenseIssuedAt');
    await queryRunner.dropColumn('yaksa_members', 'gender');

    console.log('Successfully reverted Phase 1 fields from yaksa_members table');
  }
}
