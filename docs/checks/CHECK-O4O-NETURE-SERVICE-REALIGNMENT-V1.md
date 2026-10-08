# CHECK — Neture 서비스 재배치

> 상태: branch 구현·로컬 검증 완료, 통합·운영 적용 진행 대상
> 작성일: 2026-10-08
> 작업: [전체 WO와 T01~T13](../work-orders/WO-O4O-NETURE-SERVICE-REALIGNMENT-V1.md)
> 기준: main `0795464cc5` · branch `wo/neture-service-realignment-v1`

## 1. 구현 범위

| 영역 | branch 결과 |
|---|---|
| 가입 원장 | Neture/KPA 정지·복구가 독립 매장·공급자 승인 표식을 회수하거나 신규 부여하지 않음 |
| 운영 위치 | supplier·funding·community는 자기 호스트, 내 매장 심사는 store, pharmacy 담당 사업 관리는 pharmacy. 플랫폼 계정·역할·서비스 정책과 사업 등록/담당 지정은 admin |
| 내 매장 | 약국 하나의 복수 사업 가입·조건·출처 구획. 공급·이벤트·모집 직접 이용, 사업/일반 자료함 직접 배치. 기존 HUB 주소는 기능별 adapter |
| 모집 | 지정 사업 가입, 미지정 약국 모집은 pharmacy 가입. 생성·목록·신청·공급에 같은 SQL 대상 해석 적용 |
| 커뮤니티 | 독립 약사 승인 원장 보존, 사업 회원 포럼 별도. DB 공간의 기존 Forum 연결·개설 심사·글/댓글·회원 관리·중재, 주소 충돌 차단과 UUID 저장 범위 |
| 강좌 | 커뮤니티 capability·강좌 문의·회원 안내 제거. study 문의 접수/운영 처리. 기존 독립 LMS·가입 문의 계약과 분회 학점/자격 보존 |
| 인덱스 | 자동 migration에 넣지 않은 수동 2단계 전환 도구와 실제 schema 상태별 이벤트 API. 운영 확인 전에는 1단계 유지 |
| 퇴역 | 미사용 KPA 매장 생성 정의·테스트와 retail CORS 제거. 옛 원장/FK 조회 도구·PH QR 302 초안 생성 도구 준비. 외부 처분 미실행 |

병원약국 파일·운영 기능은 변경하지 않았다. 기존 `SETUP.md` 수정은 별도 작업으로 보존하고 이 PR에서 제외한다. 실제 PG·미래 사업자의 고유 업무는 새로 구현하지 않았다.

## 2. 검증 환경과 결과

- Node 22.18.0 · pnpm 10.25.0, frozen lockfile 및 store integrity 활성화. 추가 의존성은 기존 workspace 모듈과 저장소에 이미 고정된 study 스타일 도구다.
- 운영과 분리한 PostgreSQL 15, loopback의 별도 포트·DB에 정본 baseline과 현행 incremental migration을 적용했다. 운영 DB나 공유 staging에는 연결하지 않았다.
- 실제 API는 tsc 산출물에 `node --import tsx dist/main.js`를 사용했다. 소스 직접 tsx 실행의 TypeORM metadata 누락과 일반 Node의 공통 package ESM 경로 문제를 피하는 로컬 실행 조합이다. API readiness 200을 확인했다.
- API 가입·권한 회귀: 가입 정지/handoff/카탈로그/커뮤니티 접근 105건, lifecycle/Forum 경계/모집 74건, 약국 규칙/증빙/퇴역 배포 계약 45건 PASS. 실제 commerce DB 회귀 23건 및 조직 식별 5건 PASS. 이후 수정한 Forum 경계·현재 DB 접근 81건과 API 오류 재귀 방지 1건도 PASS.
- Neture 43개 파일 365건, pharmacy 7개 파일 69건, 분회 3개 파일 34건, operator-core-ui 46건, shared-space-ui 85건 PASS. Admin 15개 파일 340건 PASS: 새 플랫폼 메뉴의 deny-by-default 권한 registry 포함.
- 주요 앱 Neture·store·pharmacy·study·admin 빌드와 전체 frontend 타입 검사 PASS. 기존 큰 chunk 경고는 남아 있다. lint ratchet 46 errors = 기존 baseline, admin lint 신규 error 0. unsafe route·entity registry·migration contract 검사 PASS.
- 읽기 전용 퇴역 census를 격리 DB에서 실행했다. 옛 테이블 14개와 FK 5개를 식별했다. 로컬 공유 scope 데이터 0건은 운영 데이터가 없다는 근거가 아니다. URL map 초안 테스트 2건은 다른 호스트·병원 경로·기존 backend 보존과 충돌 차단을 확인한다.

검증 수치는 서로 다른 실행의 단순 합계를 전체 테스트 수로 보고하지 않는다. 최신 PR의 `CI Gate`와 리뷰 결과는 로컬 결과와 별도다.

### 2-1. 신규 계정부터 실제 로컬 API 확인

실제 HTTP 요청 34건으로 이메일 가입·이메일 확인·로그인, 독립 커뮤니티 신청/담당 승인, 게시판·글·개설 신청/심사·권한 차단, 내 매장 신청/운영자 승인과 pharmacy 사업 신청/승인을 확인했다. 다른 회원의 직접 접근과 일반 공개 Forum 경로로 신규 회원 공간을 열람하는 시도도 차단됐다.

메일 전달과 문서 저장소는 **로컬 fixture**다. 로컬 verification nonce와 합성 증빙 경로를 사용했으며 운영 메일 수신·Google 인증·GCS 업로드를 성공했다고 기록하지 않는다. 검토 운영자 역할과 검증용 독립/두 번째 사업 등록은 격리 DB fixture로만 준비했다. 로그인·승인이 다른 서비스 역할을 자동 만드는 구현은 추가하지 않았다.

같은 약국 조직으로 pharmacy와 두 번째 검증 사업에 실제 신청·승인했다. 두 번째 사업 정지 후 해당 포럼은 403이며 목록에서 사라지고, 독립 커뮤니티와 pharmacy 공급 조회는 유지됐다. 실제 운영자 API로 재활성화하여 포럼 접근을 복구했다. 원본 차단·사본 독립성과 기존 주문 처리는 commerce DB 회귀로 확인했다.

### 2-2. 브라우저

Chromium으로 실제 로컬 Vite·API를 이용했다. canonical HTTPS 호스트를 로컬 서버로 연결하는 테스트 proxy를 사용하며 운영 서버에 요청하지 않았다. API 주소 재작성은 이 테스트 proxy에서만 수행하고 제품 코드의 인증·CORS를 완화하지 않았다.

10개 흐름 PASS, page JavaScript error 0: 승인된 독립 커뮤니티, 실제 글 작성·상세, 한 약국의 두 사업 진입, 내 매장 자료함, 공통 제공 자료 화면, 옛 HUB 자료 handoff의 실제 자료함 도착, 약국을 소유하지 않은 운영자의 모바일 신청 심사, pharmacy 담당 운영 화면, 모바일 커뮤니티 목록, study 독립 문의 화면. 담당 운영자의 비공개 사업 게시판 열람·중재도 실제 로컬 API로 추가 확인했다. 전체관리자 메뉴는 권한 registry 회귀와 아래 적용 전 확인 항목을 함께 따른다.

### 2-3. PR 검토 후 보완

[PR #364](https://github.com/Renagang21/o4o-platform/pull/364)의 첫 HEAD에서 앱 빌드·CodeQL·Guard Policy·SonarCloud는 PASS였고, 전체 API CI는 실패했으며 로컬 전체 suite 대조로 옛 HUB·강좌·포럼·문서/모집 경로를 고정한 검사와 Forum 위임 모듈의 ESM 테스트 경계를 확인했다. 로컬 전체 실행은 412개 suite PASS·7개 실패였고 실패한 7개 suite와 새 경계 검사를 묶은 재검증 336건은 PASS였다. 해당 검사의 배치 기준을 현행 구조에 맞춰 정정하고 기존 조직·권한·기기 경로 보존 검사는 유지한다. 최신 HEAD의 required CI와 Codex 재검토가 끝나기 전에는 integration-ready로 기록하지 않는다.

Codex의 P1(공용 Forum 조회를 통한 비공개 자료 노출)을 반영했다. 통계의 게시판·댓글·작성자 집계와 인기 태그에 동일한 경계를 적용하고 공용 검토 대기열·중재는 전체 관리자 전용으로 제한했다. 공용 AI 메타데이터·추천 및 관련 글의 기준 게시글에도 비공개 경계를 적용한다. 새 비공개 공간과 기존 4개 커뮤니티 저장 코드를 포함한 경계 회귀 24건과 실제 로컬 HTTP에서 익명·일반 회원·서비스 운영자의 통계/태그/글/AI/추천/검토 대기열 차단 및 가입자의 해당 공간 조회를 확인했다.

옛 HUB 자료 handoff는 실제 공통 `/store/library/*` 경로를 보존한다. 매장 자체 콘텐츠는 기존 서비스 경로를 유지하며 경로 회귀 4건과 브라우저 실제 도착으로 확인했다. Store handoff의 React StrictMode 중복 교환을 차단하여 일회용 토큰을 한 번만 교환한다(StrictMode 회귀 1건 PASS). 수동 이벤트 CLI는 tsc 산출물에 포함되는 operations 경로로 옮기고 기본 dry-run이 phase-one을 조회하는 것을 확인했다. 인덱스 판정은 추가 predicate가 섞인 구조를 phase-two로 인정하지 않으며 실제 DB·판정 회귀 25건이 PASS다.

두 번째 HEAD에서는 API Jest 3개 shard가 모두 PASS였고 SonarCloud·앱 빌드도 PASS였다. Code Quality는 라우트 테스트의 CommonJS `require`로 신규 lint error가 발생해 실패했다. ES import로 수정한 뒤 로컬 lint ratchet은 기존 baseline 46 errors로 PASS다. 이후 변경을 포함한 최신 HEAD의 CI와 리뷰는 별도로 확인한다.

후속 Codex P1 두 건을 보완했다. 강좌·내 매장 Dockerfile에 `operator-core-ui`와 전이 의존성의 manifest/source를 포함하고 Node/pnpm 버전·frozen lockfile·일치하는 filter를 고정했다. 선언된 workspace 의존 그래프 전체의 COPY 회귀 2건은 PASS다. 로컬 Docker의 vfs 저장 방식과 네트워크 신뢰 환경에 맞춰 **저장소 밖 검토용 Dockerfile**에 공개 CA secret과 layer 병합을 적용해 두 이미지를 빌드하고 root·생성 JS asset의 HTTP 200을 확인했다. TLS·패키지 integrity는 유지했으며, 실제 운영 빌더·배포 성공으로 기록하지 않는다.

옛 KPA Forum의 읽기와 홈 요약에도 현재 독립 약사 커뮤니티 승인을 적용했다. PharmacyHub 최신 활동과 Neture 홈 미리보기, 옛 운영 대시보드의 포럼 부분까지 대조했으며 미승인자는 글·통계가 노출되지 않는다. 승인된 운영 요약·분석도 해당 커뮤니티 저장 코드와 조직 범위만 집계한다. 관련 라우트/공용 접근/이미지 회귀 81건과 별도 카탈로그·실제 PostgreSQL 집계 검사 33건은 PASS다. 실제 로컬 HTTP로 pharmacy 사업 가입만 한 계정의 독립 약사 Forum 차단, 독립 신청·승인 후 조회, 탈퇴 후 즉시 차단과 다른 사업 공급 유지, 일반 커뮤니티 승인 전후 운영 요약의 격리를 확인했다.

## 3. 적용·복구 순서

1. 최신 main/HEAD의 required `CI Gate`, SonarCloud 실행 여부·결과, Codex 지적·미해결 스레드를 확인한다. 저장소 §4-1(e)에 따라 integration-ready를 보고하고 사용자 main 통합 승인 후 PR로 통합한다.
2. 현재 Delivery 정책으로 영향 서비스 API·공통 Neture 번들·store·pharmacy·study·admin을 배포한다. `VITE_UNIFIED_STORE_HANDOFF=true`는 pharmacy 앱에 적용하며 다른 서비스·PH 플래그를 일괄 바꾸지 않는다. 공급자·펀딩 공개 호스트 전환은 해당 빌드 플래그를 명시적 false로 돌릴 수 있다.
3. 전체관리자가 pharmacy 사업의 별도 community_key와 담당 운영자를 설정하고 독립 약사 key와 충돌하지 않음을 확인한다. 신규 실제 계정 가입/메일 확인 → 증빙 업로드/담당 승인 → 한 약국의 복수 사업 → 공급자/제품 승인 → 모집·주문·test 결제·처리와 독립/사업 커뮤니티·사본·QR·태블릿·사이니지를 운영에서 확인한다. 실제 PG는 계약 후 별도 연결이며 test 모드 성공과 구분한다.
4. 1단계 API 안정·구버전 `ON CONFLICT` 소비처·rollback-floor를 확인한 뒤 수동 이벤트 인덱스를 전환한다. 단순 flag 입력은 업무 검증 증거가 아니다.
5. PH 네 QR 경로를 실제 새 호스트에서 확인 → 실제 URL map export로 302 초안을 검토/적용 → 옛 주문·공급 설정의 소유권/FK/처분/복구 확인 → 조건 충족 후 301·서버 종료. 인쇄 QR의 기존 도메인·인증서 보존은 서버 종료와 별도로 판단한다.

### 3-1. 수동 도구

API 디렉터리에서 올바른 대상 DB 환경을 먼저 확인한다. 검토하지 않은 운영 대상에 적용하지 않는다.

```bash
pnpm --filter @o4o/api-server run build
# 검토한 checkout에서 API tsc 빌드 후 실행(Docker bundle 포함을 전제하지 않음)
# 기본: 인덱스 상태 조회만
node --import tsx dist/modules/neture-pharmacy/operations/event-index-transition-cli.js
# 운영 검증·복구 기준을 확정한 뒤의 적용 형식
node --import tsx dist/modules/neture-pharmacy/operations/event-index-transition-cli.js --apply --phase-one-verified --rollback-floor=<reviewed-api-commit>
# 옛 데이터 수량과 FK만 조회 (READ ONLY transaction, 개인정보 출력 없음)
pnpm exec tsx src/scripts/neture-pharmacy/retirement-census.ts
```

인덱스 교체는 한 transaction의 테이블 잠금 아래 수행한다. `--down --apply`도 같은 검증 인수를 요구하며 중복 행이 있으면 원복을 차단한다. 중복 데이터를 자동 삭제하지 않는다. 2단계 이후 API 롤백은 검토한 floor 이상으로 제한하며 구버전 전체 인덱스 의존 API로 되돌리지 않는다.

저장소 루트의 `node scripts/deployment/pharmacy-hub-qr-redirect.mjs exported-map.json review-map.json`은 **새 초안 파일 생성만** 한다. 외부 설정을 import하지 않는다. live map·QR 확인 뒤 실제 적용 대상과 복구용 export를 확정한다.

## 4. 완료로 기록하지 않은 항목

main 통합·배포·운영 업무·수동 운영 인덱스 전환·운영 데이터 처분·외부 LB/DNS/이미지/서버 변경은 이 로컬 검증에서 실행하지 않았다. 외부 OAuth/메일/증빙 저장소·운영 계정·URL map·실제 인쇄 QR 검증 결과가 아직 없다. 이 항목들은 같은 전체 WO에서 계속 처리하며 일부 구현 PASS를 전체 종료로 해석하지 않는다.

문서 정합: 역할·서브도메인·commerce 설계·canonical index·퇴역 잔여 계약을 실제 branch에 맞춰 수정했다. 잘못된 여러 약국 통합, HUB 보존, 강좌의 커뮤니티 귀속, 사업 포럼의 독립 가입 동기화 및 후속 미구현 설명을 정정했다. 과거 WO/CHECK의 당시 기록은 보존한다.
