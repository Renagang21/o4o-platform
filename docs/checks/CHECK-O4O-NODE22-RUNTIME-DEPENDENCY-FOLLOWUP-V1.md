# Node 22 실행 의존성 후속 정비 검증

> **상태**: COMPLETED
> **작성일**: 2026-11-04 · **최종 갱신**: 2026-11-04
> **근거**: 사용자 요청 — TypeORM 공동 버전 정렬, 운영 전용 Nest adapter 필요성, 전이 의존성·기존 보안 공지 검토

## 범위와 판정

PR #939 이후 main `893b9c37d50d144d16a3834792f344d28c6747d8` 기준이다.
Node 22.23.4 / npm 10.9.9 / pnpm 10.25.0을 유지했다. Windows 내장 Node 22.18.0, 업무 로직,
스키마·migration·운영 데이터·권한·UI 정책은 변경하지 않았다. 이 기록은 로컬 개발 검증이며 신규 운영 배포 증적이 아니다.

## TypeORM 공동 정렬

API만 0.3.31로 올리면 공통 패키지가 0.3.27을 읽어 DataSource 타입 identity가 갈리던 문제를,
루트 `pnpm.overrides.typeorm=0.3.31`과 API 정확한 pin으로 해결했다. 기존 공통 패키지의 호환 peer 범위는 유지한다.
lockfile의 API와 공통 패키지 19곳이 함께 0.3.31로 바뀌었으며 다른 importer 직접 의존성의 기본 버전은 바뀌지 않았다.
실제 설치에서도 20개 소비처가 하나의 물리적 TypeORM 경로를 해석했다.

기존 운영 TypeORM은 이미 0.3.31이므로 운영 버전 하향·상향이 없다. 기존 버전 예외를 제거하고
검사기가 workspace override, 모든 importer의 TypeORM 해석, lockfile의 중복 버전을 검사하도록 했다.

## Nest adapter 필요성

API main은 `express()`와 Node HTTP server를 직접 생성한다. API·공통 패키지 소스 및 API 배포 번들에서
Nest HTTP factory / ExpressAdapter 소비처가 없었다. `@nestjs/core@10.4.22`의 adapter peer는 optional이며,
동적 로딩은 NestFactory의 HTTP adapter 생성 경로 안에 있다. core import 자체에 adapter가 필요하지 않다.

운영 전용 `@nestjs/platform-express@10.4.22` 선언, 번들 external 목록, npm lock의 사용되지 않는 설치 항목을 제거했다.
기존 npm lock은 optional peer를 유지할 수 있어 manifest 삭제만으로는 충분하지 않았다. 해당 adapter 하위 항목을
제거하고 npm으로 lock을 다시 계산해, 불필요한 adapter 및 고립 의존성 12개 항목을 정리했다.
남는 npm 패키지 항목의 내용은 변경하지 않았다(root dependency 목록 제외).
앞으로 Nest HTTP 기동을 추가한다면 API 직접 의존성과 검증을 함께 추가해야 한다.

## Shared Module Change Verification

변경은 공통 모듈 소스/contract가 아닌 TypeORM 해석이다. API dependency closure와 전체 공통 build를 확인했다.

| 소비처 | 영향 | 검증 방식 | 결과 |
|---|---|---|---|
| API 및 auth/platform/organization 등 TypeORM 소비처 20곳 | 동일 ORM 버전·타입 해석 | 실제 resolve 전수 확인, 공통 build, API type-check·TSC·tsup | PASS |
| 관리자 초대·위임·계정 삭제 서버 경로 | ORM transaction | 일회용 PostgreSQL 15 schema fixture + integration 54개 | PASS |
| Neture 후보·상품 휴지통 | ORM transaction | 일회용 PostgreSQL integration 21개 | PASS |
| AI entity 등록·store policy·market-trial forum | 공유 entity metadata | 기존 Jest 38개 | PASS |
| 운영 npm dependency tree | adapter 없는 로딩 | frozen npm ci, 73개 runtime import, Sharp PNG 생성 | PASS |
| KPA/Neture/admin 등 화면 소비처 | route/role/capability/UI 변경 없음 | 소스 영향 조사; 브라우저 검증 미실행 | 해당 없음 |
| 퇴역 K-Cosmetics 화면 | runtime 재생성 없음 | 기존 peer 소비처는 버전 해석만 확인 | 해당 없음 |

공통 package build와 API 번들 생성은 UI 동작·실제 운영 readiness 검증을 대신하지 않는다.

## 전이 의존성 및 보안 검토

동일한 npm 10.9.9에서 변경 전후 production lock의 `npm audit --omit=dev --package-lock-only --json`을 비교했다.
집계는 advisory 개수나 실제 취약 endpoint 수가 아닌 audit의 affected package 집계다.

| 기준 | high | moderate | 합계 |
|---|---:|---:|---:|
| 변경 전 | 12 | 50 | 62 |
| adapter 정리 후 | 9 | 49 | 58 |

critical은 전후 모두 0, 새 advisory source ID는 0개다. adapter·구형 body-parser/multer/qs의 보고 경로가 사라졌다.
API의 직접 multer 2.5.0과 Express의 현행 파서는 보존했다. npm/pnpm 전체 전이 그래프는 여전히 별개다.

### 남은 주요 검토 결과

| 패키지/그룹 | 실제 소비 경로·판정 | 후속 범위 |
|---|---|---|
| adm-zip / xlsx | `services/ai-tools/attachment-reader.ts`의 DOCX/스프레드시트 파싱, file-understanding-core, Neture Excel 처리 | 외부 문서 입력 경로 우선 검토. 결과 행·문자 수 제한만으로 압축 해제/파싱 중 메모리 공지가 해결됐다고 볼 수 없음. adm-zip 0.6.1 호환 전환 및 xlsx 대체/공식 배포원 검토·파서 회귀 필요. npm audit은 xlsx 수정 버전 제공 안 함. |
| nodemailer | 공통 mail-core transport, 개인 메일/알림 경로 | 7→10 계열 전환은 SMTP·주소 파싱·TLS·파일/URL 정책 회귀와 공통 소비처 검증 필요. 실제 메일 발송 없이 격리 테스트부터 수행. |
| sharp | media library·상품 이미지·POP 렌더링 | 0.34→0.35 계열 및 내장 native 라이브러리 변경, 포맷/리소스 제한·이미지 처리 회귀 필요. 이번 PNG smoke가 전체 보안 해소 증거는 아님. |
| zod | external-ai/MCP·personal-mail·상품 correction·work-data 계약 | 3→4 전환과 SDK 호환성 검증 필요. 루트 override가 있어 API만 변경하면 정렬되지 않음. 입력 schema 계약 영향 조사 필요. |
| OpenTelemetry | `utils/telemetry.ts`의 SDK·HTTP/Express 자동 instrumentation | 안정/실험 패키지 버전군 공동 전환 필요. OTLP endpoint 설정에 따라 활성화되므로 운영에서 미사용이라 단정하지 않음. Prometheus/Jaeger 및 DB instrumentation 공지 검토. |
| Nest common/core/typeorm | adapter 제거 후에도 기존 패키지/peer 경로 존재 | core injection/file-type/uuid 공지 잔여. 전체 Nest 사용·제거 또는 major 전환은 adapter 제거와 다른 범위로 검토. |
| glob/minimatch·uuid·csv-parse·GCS 하위 의존성 | TypeORM/Swagger/GCS 등에서 전이·직접 의존 | 구버전과 API가 다른 major를 강제 override하지 않음. upstream 호환 수정/직접 사용 여부를 기준으로 개별 전환. TypeORM의 glob 잔여 공지가 0.3.31 정렬로 모두 해결됐다고 보지 않음. |

`npm audit fix`, 무관한 major 일괄 변경, 보안 예외 추가·검사 억제는 하지 않았다.
위 잔여 항목은 검토 완료이지 보안 수정 완료가 아니다. 새 공지가 생길 수 있으므로 후속 착수 시 audit을 다시 실행한다.

## 추가 검증과 Git 상태

관련 node:test 405개 통과. 런타임 정합·직접 의존성 73개 일치 검사, focused ESLint 통과.
전체 API Jest / 브라우저 / 새로운 운영 rollout은 이 로컬 검증에 포함하지 않았다.
시험 DB는 본 작업이 만든 별도 컨테이너이며 운영 DB에 연결하지 않았다.

설치·pin 생성·검사 절차의 현재 기준은 [SETUP.md](../../SETUP.md#api-테스트운영-의존성-일치)다.
검증 로그와 전후 audit JSON은 작업환경의 `/workspace/scratch/node22-runtime-followup/`에 보존한다.

문서 정합: SETUP의 TypeORM/adapter 예외를 제거하고 공동 정렬 기준 및 전이 의존성 한계를 반영했다.
