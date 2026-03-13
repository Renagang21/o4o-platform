/**
 * Migration: Create care_appointments table
 * WO-GLYCOPHARM-APPOINTMENT-SYSTEM-V1
 *
 * 환자-약사 상담 예약 테이블.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableIndex } from 'typeorm';

export class CreateCareAppointments1720954800000 implements MigrationInterface {
  name = 'CreateCareAppointments1720954800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'care_appointments',
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
            name: 'pharmacist_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'scheduled_at',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'requested'",
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reject_reason',
            type: 'text',
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
      true, // skipIfExists
    );

    await queryRunner.createIndex(
      'care_appointments',
      new TableIndex({
        name: 'idx_ca_patient_id',
        columnNames: ['patient_id'],
      }),
    );

    await queryRunner.createIndex(
      'care_appointments',
      new TableIndex({
        name: 'idx_ca_pharmacy_status',
        columnNames: ['pharmacy_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'care_appointments',
      new TableIndex({
        name: 'idx_ca_scheduled_at',
        columnNames: ['scheduled_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('care_appointments', true);
  }
}
