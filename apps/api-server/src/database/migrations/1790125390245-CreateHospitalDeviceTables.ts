import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hospital Pharmacy — Device Enrollment 최소 스키마
 *
 * WO-O4O-HOSPITAL-PHARMACY-DEVICE-ENROLLMENT-AND-LOGINLESS-ACCESS-V1 §8·§9
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 배경 — 왜 새 테이블인가 (§8 census 결과)
 *
 *   병원약국은 **개인 로그인 서비스가 아니다.** 병동·약제부 공용 PC 한 대를 여러 직원이
 *   로그인 없이 함께 쓴다. 서비스(hospital-pharmacy) 축으로 device 를 신뢰한다.
 *
 *   재사용 후보를 census 했으나 축이 맞지 않았다:
 *     - `store_tablet_devices` : 조직(store) 축 — 매장 slug/organization 에 묶인다.
 *     - `local_agent_devices`  : 사용자(user) 축 — user_id NOT NULL, 개인 PC agent.
 *   둘 다 hospital 의 **service 축 · 로그인리스** 모델에 맞지 않아 최소 additive 테이블을 만든다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 저장하지 않는 것 (§4·§8)
 *
 *   원내 약품 데이터 · 환자정보 · 처방전 · 파일 내용 · 평문 device token · 평문 enrollment code.
 *   비밀값은 전부 SHA-256 해시로만 들어온다(`*_hash`). 평문은 어느 컬럼에도 없다.
 *   device token 은 서버가 만든 random 값이며 HttpOnly 쿠키로만 브라우저에 내려간다(§4).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 등록 상태 (WO deployment gate)
 *
 *   이 파일은 존재하지만 이 커밋 시점에는 incremental manifest 에 **등록하지 않는다.**
 *   append-only migration registry(`manifest.ts`)가 다른 세션(ADMIN-OPERATOR WO)의
 *   미커밋 작업으로 오염돼 있어, 그 위에 순서/fingerprint 를 강제 확정하면 production
 *   deploy Job(POST_MIGRATION_SCHEMA_ASSERTION)이 영구 실패할 수 있다. 그 WO 가
 *   origin/main 에 정상 landing 된 뒤 최신 순서로 등록 + fingerprint 생성 + deploy 한다
 *   (동일 WO 의 일시적 deployment gate). foreign migration/manifest 는 수정하지 않는다.
 */
export class CreateHospitalDeviceTables1790125390245 implements MigrationInterface {
  name = 'CreateHospitalDeviceTables1790125390245';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. 발급된 1회용 연결 코드 ────────────────────────────────────────────
    // 관리자가 발급한다. code_hash 로만 조회하고, consumed_at 이 1회용을 보장한다(조건부 UPDATE).
    // 짧은 만료(기본 10분)와 결합해 추측 공격 창을 최소화한다(§5·§9).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hospital_device_enrollment_codes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "service_key" varchar(40) NOT NULL DEFAULT 'hospital-pharmacy',
        "code_hash" varchar(64) NOT NULL,
        "label" varchar(80),
        "created_by" uuid,
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz,
        "consumed_device_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    // 해시로 조회하므로 UNIQUE — 충돌 시 조용히 남의 코드를 소모하는 일을 막는다.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_hospital_enrollment_codes_hash"
        ON "hospital_device_enrollment_codes" ("code_hash")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_hospital_enrollment_codes_service"
        ON "hospital_device_enrollment_codes" ("service_key", "consumed_at")
    `);

    // ── 2. 연결된 공용 PC(브라우저 프로필) ───────────────────────────────────
    // id 는 서버가 만드는 random UUID (§3 — 하드웨어 fingerprint 파생 아님).
    // token_hash 는 서버가 만든 random device token 의 SHA-256. 평문 token 은 저장하지 않는다(§4·§8).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hospital_devices" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "service_key" varchar(40) NOT NULL DEFAULT 'hospital-pharmacy',
        "label" varchar(80),
        "token_hash" varchar(64) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "last_seen_at" timestamptz,
        "revoked_at" timestamptz
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_hospital_devices_token"
        ON "hospital_devices" ("token_hash")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_hospital_devices_service_status"
        ON "hospital_devices" ("service_key", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hospital_devices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hospital_device_enrollment_codes"`);
  }
}
