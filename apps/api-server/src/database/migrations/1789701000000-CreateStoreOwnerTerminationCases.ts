import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1
 *
 * 매장 경영자 계약 종료·정보 반환·7일 파기 진행상태 SSOT.
 * 반환 파일/개인정보 본문은 저장하지 않고 상태·시각·대상 식별자만 저장한다.
 */
export class CreateStoreOwnerTerminationCases1789701000000 implements MigrationInterface {
  name = 'CreateStoreOwnerTerminationCases1789701000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE public.store_owner_termination_cases (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_key varchar(100) NOT NULL,
        organization_id uuid NOT NULL,
        user_id uuid NOT NULL,
        status varchar(40) NOT NULL DEFAULT 'requested',
        requested_at timestamptz NOT NULL DEFAULT NOW(),
        requested_by uuid NULL,
        return_requested boolean NOT NULL DEFAULT false,
        return_completed_at timestamptz NULL,
        termination_effective_at timestamptz NULL,
        purge_due_at timestamptz NULL,
        purge_completed_at timestamptz NULL,
        cancelled_at timestamptz NULL,
        failure_reason varchar(500) NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_store_owner_termination_org"
          FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
        CONSTRAINT "FK_store_owner_termination_user"
          FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT,
        CONSTRAINT "FK_store_owner_termination_requested_by"
          FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE SET NULL,
        CONSTRAINT "CHK_store_owner_termination_status"
          CHECK (status IN (
            'requested','return_pending','return_completed','termination_scheduled',
            'terminated','purge_completed','cancelled','failed'
          ))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_store_owner_termination_status_due"
        ON public.store_owner_termination_cases(status, purge_due_at)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_store_owner_termination_org_service"
        ON public.store_owner_termination_cases(organization_id, service_key)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_store_owner_termination_open_case"
        ON public.store_owner_termination_cases(user_id, organization_id, service_key)
        WHERE status NOT IN ('purge_completed','cancelled')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS public.store_owner_termination_cases');
  }
}
