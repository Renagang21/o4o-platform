# CHECK-O4O-DEMO-DATA-RECOVERY-V1

> 상태: ACTIVE · 작성일: 2026-10-09 KST
> 근거: 사용자 승인 — main 통합·운영 데이터 복구·배포 후 전체 서비스 smoke 재개
> 상위: [Demo 복구 WO](../work-orders/WO-O4O-DEMO-EXPERIENCE-REPAIR-V1.md)

## 복구 범위

PR #365의 매장 진입 수정은 main에 통합됐다. 데이터 변경은 기존 `deploy-api.yml`의
`o4o-api-migrations`가 소유한다. 새 GCP credential·HTTP repair route·권한 우회는 추가하지 않는다.

Migration `RepairCanonicalDemoExperience1791501198171`은 활성 Demo registry가 정확히 두 유형 각
1개인지 확인한다. 기존 매장 Demo 조직과 공급자 Demo 조직·소유 관계가 유일한지 조회한다.
일반 약국 승인 원장이나 다른 승인 약국의 소유 관계가 발견되면 쓰기 전에 중단한다.
빈 신규 DB에는 백업 테이블만 생성하고 계정 seed는 수행하지 않는다.

매장 Demo의 조직 소유 관계, 합성 약국 승인 원장, `neture:store_owner` 역할과
기존 `pharmacy` 세미프랜차이즈 이용 승인을 복구한다. 활성 세미프랜차이즈가 유일하지 않으면 중단한다.
대상 매장 이름의 테스트/Demo 표식을 확인하고 다른 생존 사용자의 활성 owner/admin/manager가
있으면 중단한다. 삭제된 사용자의 orphan 관계는 접근 자격이 아니며 수정하지 않는다.
샘플 출처는 이전 Demo CHECK에서 명시적 테스트 공급자로 측정한 조직 prefix `95aad740`과
현재 테스트 이름 표식이 동시에 일치하는 유일한 공급자에 한정한다. 그 밖의 비공개 자료는 읽거나 복사하지 않는다.
샘플이 없는 공급자 Demo에는 해당 출처의 상품 offer와 자료에서 최대 5개씩 복사해 연결한다.
상품 master는 재사용하고 상품은 비공개·미승인·비활성 draft로 둔다. 자료도 비공개 personal이다.
다른 조직의 원본, 기존 주문, 비밀번호, 일반 계정, 전체관리자 권한은 변경하지 않는다.
원본 샘플이 없으면 생성 수는 0이며 체험 완료로 판정하지 않는다. 무관한 데이터 삭제는 없다.

변경 전 소속·승인·역할과 변경 후 자료·생성 ID는 `canonical_demo_repair_snapshots`에 보관한다.
출력은 건수뿐이다. migration runner의 트랜잭션에서 실패하면 변경과 백업 모두 rollback된다.
운영 중 새 참조가 생길 수 있어 unattended `down()`은 차단한다. 복구가 필요하면 백업의
before/after와 최신 의존 관계를 확인한 후 승인된 migration 경로로 적용한다.

## 검증

- 격리 PostgreSQL 15에서 canonical bootstrap + incremental 18개 실행, 새 schema fingerprint
  `702c212dfaa42db0e0c5076ab4afb76f382e70992929aeda69d09c314d8112bf`, 6163 lines 확인.
- 같은 격리 DB 재실행에서 pending 0·schema assertion PASS 확인.
- migration contract 21 PASS, 실패 0.
- 실제 SQL 통합 검증: 승인·소유 연결, 비공개 샘플과 원본 보존, 일반 원장 거절,
  합성 원장 재활성화 및 before-image, 연결된 샘플 유지, 후속 insert 실패의 transaction rollback.
  실행: `O4O_DEMO_REPAIR_TEST_PORT=<isolated-port> pnpm --filter @o4o/api-server exec jest
  --runInBand --runTestsByPath src/database/__tests__/canonical-demo-repair.integration.test.ts`.
  대상은 loopback의 전용 `o4o_demo_recovery_test` DB이며 앱 `.env`는 로드하지 않는다.

## 운영 상태

이 기록 작성 시 데이터 복구의 운영 실행·후속 배포·전체 서비스 smoke는 대기 중이다.
CI·merge·배포·운영 결과는 아래에 실제 실행 후 추가한다. 같은 서브도메인의 다른 브라우저
refresh 폐기 문제는 별도 세션 변경이 필요하며 이 migration으로 해결되지 않는다.
Pharmacy-Hub는 사용자 지정 삭제 대상이라 smoke에서 제외한다. 유지하는 약국 서비스는 포함한다.
