# O4O 계정 제거 domain/file inventory — 재개 조사

> 상태: INVESTIGATION / 운영 활성화 미승인
> 작성: 2026-10-13
> 근거: [Core WO §10.2·§10.7](../work-orders/WO-O4O-TWO-STAGE-ACCOUNT-ERASURE-CORE-V1.md), [통합 후속 TODO](../work-orders/TODO-O4O-INTEGRATED-PRIVACY-FOLLOWUP-V1.md)

## 1. 현재 상태와 이번 범위

계정 제거 Core·두 DELETE 경로·Admin 상태 표시와 기능 OFF 운영 준비는 기존 작업에서 완료됐다.
이번에는 지금 효과가 있는 내부 중복만 정리하고, 원래 남은 domain/file/producer 분류를 재개했다.
request/resume transaction의 동일 caller 검사를 기존 private assertActor로 모았다.
초입 non-locking 검사, 각 transaction의 검사 시점·FOR SHARE, 예정 super-admin target 보호는 유지한다.

실제 producer의 `gcs://`/camelCase `fileUrl`을 기존 첨부 검사가 놓치는 문제를 합성 데이터로 재현했다.
검토하지 않은 KYC manifest를 삭제하고 completed로 응답하던 조건을, 기존
PRIVATE_ATTACHMENT_MANIFEST_REVIEW_REQUIRED 규칙으로 처리하도록 표기 누락만 보완했다.
파일 소유 추정·새 삭제 handler·보존기간·법률 본문·권한/API/DDL 변경은 도입하지 않았다.

## 2. 재현 가능한 schema inventory

조사 시작 main: `38d0eb81df`. 격리 PostgreSQL 15, loopback 55469, 새 조사 전용 DB에서
공식 `src/migrate.ts`로 canonical baseline + 현재 incremental 25개를 적용했다.
현재 지문은 `9f5faca8de1ce52bffb855460715a98129326c6caa0de0bb5de4c55551e02641`, 6,618 lines다.
정식 post-migration assertion과 수집기의 지문·ordered history 비교 모두 일치했다.
운영 DB schema 지문 또는 운영 데이터 조사 결과로 표시하지 않는다.

[수집기](../../scripts/privacy/collect-erasure-inventory.mjs)는 전용 local DB만 허용하며,
READ ONLY / REPEATABLE READ transaction과 statement timeout을 사용한다.
pg_catalog와 migration history만 읽고 계정 행 값·GCS 객체·파일 내용은 읽지 않는다.
runtime PRIVATE_OWNERS는 TypeScript AST에서 추출하고 실제 owner column 존재를 대조한다.
JSON 산출물에는 table/column/type/FK/후보 분류와 schema/source hash만 포함한다.

| 항목 | 현재 결과 | 해석 |
|---|---:|---|
| public/neture/cosmetics의 일반 table·materialized view | 307 | bookkeeping 관계 2개 제외; 실제 개인정보를 가진 관계 수가 아님 |
| 전체 column metadata | 3,944 | 계정 행/개인정보 값 수가 아님 |
| users 직접 FK | 44관계 / 60 constraints | CASCADE 30·SET NULL 23·NO ACTION 6·RESTRICT 1. FK가 보존/소유 정책은 아님 |
| 기존 runtime private owner 관계 | 27 | owner column 전부 존재. 모든 field/file의 분류 완료를 뜻하지 않음 |
| identity core / community evidence 이관 / erasure state·증빙 | 1 / 1 / 5 | 기존 runtime 구조 확인. 법정 보유 근거 확정과 구분 |
| 추가 domain review 관계 | 273 | 무관한 사업·시스템·공유 자료도 포함; 273개 결함이나 자동 삭제 대상이 아님 |
| 신원·문자열·JSON 후보 column | 2,595 | 일반 텍스트·콘텐츠 포함. 이전 이름 중심 415개 후보와 기준이 달라 진척률로 비교하지 않음 |
| 파일/metadata/body/content 이름 후보 column | 222 | 포인터 후보이며 실제 파일·개인 첨부 수가 아님 |

기본 재현 명령(저장소 root, Node/pnpm activation 후):

```sh
NODE_ENV=development DB_HOST=127.0.0.1 DB_PORT=55469 \
DB_NAME=o4o_erasure_inventory_38d0eb81 \
pnpm exec tsx scripts/privacy/collect-erasure-inventory.mjs --out /tmp/o4o-erasure-inventory.json
```

전용 DB는 source의 현재 공식 schema 상태로 먼저 준비해야 한다. 실제 운영 connection이나
기존 개발/사용자 DB 이름으로 대체하지 않는다. remote host·5432·다른 DB 이름 거절/출력 미생성 검증 PASS.
새 schema 도입 시 지문/history mismatch가 실패하므로 현재 source 기준으로 조사 DB를 새로 준비한다.

## 3. 확인한 producer와 미완료 계약

| 경로 | 현재 저장 방식/근거 | 남은 처리 |
|---|---|---|
| 약국 사업자 증빙 `business-registration-document.service.ts` | `business-registration/<userId>/...`, KYC `fileUrl=gcs://...`; 업로드 실패 뒤 DB 실패 시 객체 제거 시도 | 사업자료/개인 원장 목적 분류, 회사·신청 참조와 최소 보존 근거. uploader만으로 계정 제거 객체로 승인하지 않음 |
| 공급자 KYC `supplier-onboarding.service.ts` | supplier별 KYC 경로, 동일 camelCase fileUrl; supplier의 document ID에 연결 | supplier·사업 참조 이관과 DB 저장 실패 시 orphan 처리 계약 조사 |
| 규제 카테고리 증빙 `supplier-regulated-category.service.ts` | supplier/category 경로, KYC id 및 category evidence id 연결 | 타인/사업 증빙 목적·미완료 업로드·책임 이전 계약 |
| MediaLibrary `media-library.service.ts` | 공통 media 경로, 공개 cache, DB asset 원장 | uploader·owner·공유 usage를 구분. 개인 avatar와 사업/shared asset을 같은 삭제 범위로 합치지 않음 |
| 제품 이미지 `image-storage.service.ts` | product master별 경로·공개 cache | 상품/타인 자료 보존과 책임 주체 분류. 계정 삭제로 일괄 제거하지 않음 |
| erasure avatar adapter `account-erasure.http.ts` | object owner/purpose metadata와 generation을 확인하는 조건부 제거 | 실제 producer/tag·legacy 객체·version/soft-delete/cache/backup/IAM 전수 확인 전 미완료 |

현재 저장소의 명시적 `o4o_owner_user_id`/`o4o_asset_purpose` 검색에서는 검증 측 사용만 확인했다.
실제 GCS 객체의 tag 존재/부재를 조사한 결과가 아니며 외부 producer 완료로 단정하지 않는다.
KYC의 gcs:// 및 외부 HTTPS fileUrl은 이번 보완 후 검토 상태로 남고 manifest를 보존한다.
이 문제 해결이 KYC·공유 파일·외부 객체 전체 handler 구현 완료를 의미하지 않는다.

## 4. 검증과 다음 큰 묶음

- 기존 native PG/SDK mock: 수정 전 41 PASS. 기본 5초 테스트 예산에서 인증 route 1건의 일시 timeout도 기록했다.
- 실제 KYC fileUrl 회귀: 수정 전 gcs://·외부 HTTPS 2건 RED(completed/erased=true), 기존 gs:// 1건 PASS.
- 표기 보완 후 전체 44 PASS. local 실제 HTTP+전수 schema 검증에는 CLI testTimeout=15000을 사용했다.
  test source/실제 assertions·운영 SLA를 변경하지 않았고, native PG 실행을 required CI 실행으로 표시하지 않는다.
- schema collector: 현재 prefix/fingerprint/owner 대조 및 제한된 connection 거절 PASS.

다음 작업은 아래 큰 묶음으로 진행한다.

1. **domain 처리 계약**: 현재 후보에서 실제 신원 참조·사업/타인 자료·법정 최소 증빙을 source/정본과 대조한다.
   보존 승인 없이 일반 프로필을 남기는 guard를 만들지 않는다. 분회는 공통 참조 영향만 확인하고 전용 원장 기간은 미확정으로 유지한다.
2. **개인 파일/producer 계약**: 개인 소유 증빙, DB commit 전 upload/orphan, 공유 참조, generation/version/cache/backup,
   재시도·동시성·전역 barrier의 운영 규모 영향을 구체안과 합성 검증으로 닫는다.
3. **기간/시행/마지막 사용자 검증**: 커뮤니티 생성 후 달력 1년·해당 시 2년의 적용 근거, 예외 종료와 최소 로그,
   실제 공고 본문·2026-11-13 시행 조건을 기존 법률 트랙에서 확인한다. 마지막 사용자 실계정/OAuth 검증을 별도로 수행한다.

이번 조사로 ACCOUNT_ERASURE inventory confirmed/apply flags·자동 파기 job·새 정책 게시·재동의를 설정하지 않는다.
실제 운영 계정/GCS 제거, 분회 개발/배포, 이전 환경 삭제도 수행하지 않는다.
