import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-QR-PAGE-CONSULTATION-CTA-V1
 *
 * 1) store_qr_codes 에 상담 CTA 설정 컬럼 추가 (page 콘텐츠 하단 상담 버튼 옵션).
 *    - consultation_cta_enabled boolean NOT NULL DEFAULT false  → 기존 QR 은 CTA OFF (회귀 0)
 *    - consultation_cta_label   varchar(100) NULL              → 버튼 문구 (없으면 프론트 기본값 '상담 요청하기')
 *
 * 2) tablet_interest_requests.master_id 를 nullable 로 완화.
 *    - QR page(콘텐츠) 상담 요청은 상품(ProductMaster)이 없으므로 master_id=NULL 허용.
 *    - 기존 태블릿 상품 상담 요청은 그대로 master_id 저장 (NOT NULL → NULL 허용은 하위호환, 기존 데이터 보정 불필요).
 *    - 처리/목록/통계 쿼리는 product_name(저장값) 기반이라 master JOIN 의존 없음(회귀 0).
 */
export class AddQrConsultationCtaAndNullableInterestMaster20261125000000 implements MigrationInterface {
  name = 'AddQrConsultationCtaAndNullableInterestMaster20261125000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "store_qr_codes" ADD COLUMN IF NOT EXISTS "consultation_cta_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "store_qr_codes" ADD COLUMN IF NOT EXISTS "consultation_cta_label" varchar(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "tablet_interest_requests" ALTER COLUMN "master_id" DROP NOT NULL`,
    );
    console.log('[Migration] store_qr_codes consultation CTA columns added + tablet_interest_requests.master_id nullable');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // master_id 를 다시 NOT NULL 로 되돌리면 nullable 동안 생성된 QR 상담 행이 있을 경우 실패하므로
    // 안전을 위해 NULL 행을 막지 않는다(되돌림은 CTA 컬럼만 정리). master_id 제약 복원은 수동 검토 대상.
    await queryRunner.query(`ALTER TABLE "store_qr_codes" DROP COLUMN IF EXISTS "consultation_cta_label"`);
    await queryRunner.query(`ALTER TABLE "store_qr_codes" DROP COLUMN IF EXISTS "consultation_cta_enabled"`);
    console.log('[Migration] store_qr_codes consultation CTA columns dropped (master_id NOT NULL 복원은 수동)');
  }
}
