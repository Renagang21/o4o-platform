/**
 * CreateCarePharmacyLinkRequests
 * WO-GLYCOPHARM-PATIENT-PHARMACY-LINK-FLOW-V1
 *
 * 환자 → 약국 연결 요청 테이블.
 * 승인 시 glucoseview_customers 레코드 생성으로 기존 시스템과 통합.
 */

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCarePharmacyLinkRequests1720868400000 implements MigrationInterface {
  name = 'CreateCarePharmacyLinkRequests1720868400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'care_pharmacy_link_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'patient_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'patient_email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'patient_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'pharmacy_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'pharmacy_name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reject_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'handled_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'handled_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'care_pharmacy_link_requests',
      new TableIndex({
        name: 'idx_cplr_patient_id',
        columnNames: ['patient_id'],
      }),
    );

    await queryRunner.createIndex(
      'care_pharmacy_link_requests',
      new TableIndex({
        name: 'idx_cplr_pharmacy_status',
        columnNames: ['pharmacy_id', 'status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('care_pharmacy_link_requests', true);
  }
}
