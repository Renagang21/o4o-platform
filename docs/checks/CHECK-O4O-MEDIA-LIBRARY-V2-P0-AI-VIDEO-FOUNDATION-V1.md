# CHECK-O4O-MEDIA-LIBRARY-V2-P0-AI-VIDEO-FOUNDATION-V1

Status: DEPLOYED — 로컬 검증 및 API/Admin 배포 완료, production browser smoke 미확인. CLOSED 아님.
WO: WO-O4O-MEDIA-LIBRARY-V2-P0-AI-VIDEO-FOUNDATION-V1
작성일: 2026-09-12

## 1. 시작 census

- 기준 main: `428bee0619de6b4fdfed8cf01961ee53ea6956cb`, fetch 후 origin/main과 일치.
- 기존 타 세션 dirty가 있어 pull은 생략. AI provider / drug image / pharmacy web 작업은 미접촉·커밋 제외.
- canonical core는 `media_assets` / `MediaAsset`, 관리 화면은 `/content-resource/media-assets`.
- 기존 GCS upload, metadata PATCH, tags/keywords 검색, folder, URL 사용처 추적, Screen Set delete guard 존재.
- Ownership / Dedup Hash / Versioning은 핸드오프 대기 WO. 현재 MediaAsset/migration에 해당 컬럼 구현 없음. 이번에 끌어오지 않음.
- MediaLibrary 소비처: Admin editor/resource 관리, Neture/K-Cosmetics media API 및 picker. 기존 Product 이미지 처리 함수와 URL 반환 계약 유지.
- 운영 DB census: 로컬 연결 설정으로 읽기 전용 연결 시도했으나 인증 오류 `28P01`. 운영 스키마/건수를 확인한 것으로 간주하지 않음.

## 2. 구현 / 계약

- 기존 MediaAsset에 storage/provider/external URL·ID·thumbnail, lineage, AI reference, QA/정확성, rights 필드를 추가.
- `media_entity_links`: media asset 쪽만 FK(RESTRICT), target entity는 product/brand/content/service/video-production-job의 opaque type+ID+purpose.
- 다른 도메인 테이블에 hard FK/JOIN을 만들지 않으며, target ID 연결 자체가 target 접근 권한을 부여하지 않음. target 존재 검증·선택기는 별도 후속.
- 신규 관리 API와 Entity 역조회는 `platform:admin` / `platform:super_admin` 전용. 기존 upload/list/metadata 권한은 유지.
- 파생 관계는 parent 지정 시 서버가 root 계산. 원본의 저장 root는 NULL, 관계 조회의 effective root는 자신 ID.
- 최소 lineage 보존을 위해 parent 재지정/해제, 후손이 있는 원본의 재부모 지정은 거부. cycle/self-link 거부.
- 명시 연결 또는 후손이 있으면 GCS/DB 삭제 전에 409. link 생성과 삭제는 동일 media row lock으로 직렬화. FK RESTRICT도 유지.
- 기존 Screen Set 가드와 HTML img/video/source URL trace 유지. 명시 연결/파생 자산은 상세 패널에서 별도 조회.
- 외부 자산은 GCS object를 만들거나 삭제하지 않음. YouTube watch/shorts/embed/youtu.be URL 정규화, 11자 ID 검증.
- O4O 외부 참조는 neture.co.kr 및 하위 도메인의 HTTPS 영구 주소. 토큰 query/hash 제외. 원격 URL fetch/자동 업로드 없음.
- 공용 카탈로그 등록 동의 필수. 연결된 영상의 실제 접근 통제는 원래 자료실이 담당하며 이번 변경이 비공개 저장소를 새로 만들지는 않음.
- QA 상태: PENDING/APPROVED/REJECTED. 정확성: EXACT/ACCEPTABLE/SUPPORT_ONLY/REJECTED.
- 권리 유형은 설명값, commercialUseAllowed/attributionRequired는 nullable boolean. 미확인을 허용으로 추정하지 않음.
- prompt 본문 저장 필드 없음. promptRef/generationJobId만 보존.
- Admin 기존 화면에 외부 등록, 제작 정보 편집, Entity link CRUD, parent/root/직접 후손, 필터, 20건 pagination 추가.
- folder는 보조 분류로 유지. 상품별 폴더 트리, 새 Core, 생성 작업 시스템, dedup, revision history는 추가하지 않음.

## 3. Migration

`apps/api-server/src/database/migrations/20270407000000-MediaLibraryV2Foundation.ts`

- gcs_path nullable 전환, internal/gcs 기본값, 신규 metadata nullable, 링크 테이블/제약 추가.
- 기존 URL·파일 속성 backfill/대량 update 없음.
- internal은 gcs_path 필수, external은 external_url 필수 + gcs_path NULL이라는 CHECK 제약.
- 링크 target lookup, parent/root 보호, 공개 목록 정렬 인덱스만 추가.
- 내구성 있는 링크/lineage 삭제를 방지하도록 down 자동 철거 불가. 롤백 필요 시 별도 검토한 forward migration 사용.
- localhost의 일회성 PostgreSQL 17에서 기존 3개 media migration → 기존 row 삽입 → V2 migration 순서로 실제 적용 검증.
- production 수동 migration 실행 없음. 배포 workflow의 자동 적용 결과는 아래 운영 검증 항목에서 구분.

## 4. API

기존 `/api/v1/platform/media-library` 하위:

| Method / suffix | 동작 |
|---|---|
| POST `/external` | 동의 기반 외부 영상 등록 |
| GET `/:id/relations` | 명시 연결, parent/root, 직접 후손(최대 100) |
| PATCH `/:id/catalog` | 제작·QA·권리·최초 parent 지정 |
| POST `/:id/links` | Entity 연결 생성(동일 연결 idempotent) |
| PATCH `/:id/links/:linkId` | Entity 연결 수정 |
| DELETE `/:id/links/:linkId` | Entity 연결 해제 |

기존 list에 originType/provider/storageType/qaStatus/productAccuracyLevel/rightsType/entityType/entityId/commercialUseAllowed/attributionRequired AND 필터 추가.
기존 metadata PATCH는 URL·파일 속성 불변. 기존 삭제 endpoint는 MEDIA_IN_USE_LINK / MEDIA_IN_USE_DERIVATION 409 추가.

## 5. 검증

- API typecheck: PASS. 처음 stale 패키지 타입 5건 → `build:api-deps` 후 재실행 통과. 무관 소스 수정 없음.
- Admin typecheck: PASS.
- Admin production build: PASS. 처음 auth-context dist의 export 부재 → 해당 패키지 사전 빌드 후 통과.
- 새 파일 및 Admin 변경 파일 focused ESLint: PASS.
- 기존 media-library.service 전체 lint: 기존 `decodeOriginalName`의 no-control-regex 1건 존재. 해당 줄은 변경하지 않았고 새 오류 없음.
- git diff --check: PASS.
- Jest 2 suites / 23 tests PASS: URL 검증, 권리 타입, migration 기존 자산 보존, upload/metadata/search/folder/usage, 상품 이미지 preserve-original 및 thumbnail-1000, link CRUD/중복/역조회, lineage/cycle/보호, AI·QA·권리 저장/필터, Screen Set 가드, pagination, link/delete 동시성, HTTP 인증/권한/입력 검증, 합성 query plan.
- 재현: `MEDIA_V2_TEST_PORT=55439`를 명시하고 localhost 일회성 PostgreSQL(media_test 역할)에서 `pnpm exec jest --config apps/api-server/jest.config.cjs --runInBand --runTestsByPath apps/api-server/src/__tests__/media-library-v2.spec.ts apps/api-server/src/__tests__/media-library-v2-http.spec.ts`.
- 테스트는 repository .env를 읽지 않으며 opt-in 없으면 DB integration은 SKIP. GCS upload/delete는 mock, 이미지 처리는 실제 sharp, DB/service/migration은 실제 PostgreSQL.
- Product의 실제 브라우저 선택/등록, 실제 GCS 업로드, 실제 YouTube 재생은 위 테스트로 대체 판정하지 않음.

## 6. 검색 규모 baseline

10만 media + 약 10만 명시 연결의 합성 데이터, EXPLAIN ANALYZE BUFFERS JSON:

| query | plan / 로컬 실행 시간 |
|---|---|
| 공개 목록 전체 컬럼 + created_at/id DESC LIMIT 20 | media_public_created_idx Index Scan / 0.085 ms |
| Entity EXISTS 역조회 + media 목록 | media_entity_target_idx + media_assets_pkey / 0.146 ms |
| language/source/status/usage_type + title/description/memo/keywords/tags ILIKE count | Parallel Seq Scan / 146.332 ms |

실제 운영 건수·텍스트 분포·동시 부하는 미확인. 생산 성능 보장 수치가 아님. 문자열 검색에는 이번에 speculative index/extension을 추가하지 않음. 실데이터에서 지연·선택도 확인 후 trigram/정확 태그 인덱스를 후속 검토.

## 7. 운영 검증 / 종료 판정

- Browser runtime bootstrap 2회 및 기본 연결 확인 1회가 모두 timeout. in-app browser smoke 실행 불가.
- production browser의 toast/API/console error 0, 실제 Product 선택/등록은 NOT VERIFIED.
- production DB authentication 실패로 시작 운영 census는 NOT VERIFIED.
- 구현 커밋: `0e4d35e0d`. 다른 세션의 후속 문서 커밋을 포함한 `5ce930426`으로 배포됨.
- [API 배포](https://github.com/Renagang21/o4o-platform/actions/runs/34676867860): SUCCESS. Run database migrations 및 Verify deployment 단계 SUCCESS.
- [Admin 배포](https://github.com/Renagang21/o4o-platform/actions/runs/34676867846): SUCCESS.
- [CodeQL](https://github.com/Renagang21/o4o-platform/actions/runs/34676867847): SUCCESS.
- [전체 CI](https://github.com/Renagang21/o4o-platform/actions/runs/34676867842): SUCCESS. Code Quality Check(타입·lint ratchet·전체 테스트) 및 Admin build 통과.
- 배포 후 읽기 전용 HTTP: API /health 200, 기존 media 목록과 신규 /:id/relations 비로그인 요청 401, Admin canonical 주소 200. 로그인 CRUD/UI/console 검증을 대체하지 않음.
- 임시 localhost PostgreSQL 테스트 서버 종료 완료.
- 로컬 기능 검증을 production smoke PASS로 보고하지 않음. `PRODUCTION_SMOKE != PASS`이므로 WO는 CLOSED 아님.

## 8. 남은 P1/P2 및 문서 정합

- 이번 P0 완료에 남은 검증: 브라우저 접속 복구 후 Admin/기존 Product/GCS/외부 영상 실데이터 smoke.
- P1/P2: entity picker/target 존재 검증, 추가 O4O 도메인 정책, 실제 볼륨 검색 최적화, 후손/연결의 대규모 탐색, 별도 Ownership/Dedup/Revision WO.
- 영상 생성, Production Job 전체, YouTube 자동 업로드 등 제외 범위는 미구현.
- 문서 정합: 이번 CHECK만 작성. 기존 핸드오프 WO·canonical 본문·과거 CHECK는 수정하지 않음. SETUP의 기존 환경/CI 수치 Drift는 앞선 감사의 후속 정비 대상으로 유지.
