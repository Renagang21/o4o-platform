# 내 매장 상담·상품 근거·채널 운영 통합 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-25 · **최종 갱신**: 2026-10-25
> **범위**: 개발·로컬 검증·branch push. PR·main 병합·배포·운영 업무 write는 제외.
> **기준 main**: `b7d2cfd86edf4d26d19d1e954fa754f74faf8f7d` (push 전 재조회도 동일)
> **branch**: `wo/store-consultation-content-channel-completion`
> **작업**: [TODO](../work-orders/TODO-O4O-STORE-CONSULTATION-CONTENT-CHANNEL-COMPLETION-V1.md) · [데이터 범위](../design/DESIGN-O4O-STORE-CONSULTATION-DATA-SCOPE-V1.md)

## 1. 조사와 변경

사용자는 장기 재사용 범위를 **상담 원문 없이 확인한 상품·컨텐츠와 업무 결과**로 선택했다. 새 전용 worktree에서 최신 main을 기준으로 선행 사용성 개발 `03b9a127d4`·기록 `963cb3df87`을 포함했다. 기존 작업공간은 수정/삭제하지 않았다. 이전 CHECK의 수치를 이번 실행에 합산하지 않는다.

| 연결 | 코드에서 확인한 부족함과 이번 결과 |
|---|---|
| 상품 근거 → 전문 판단 | 기존 상담은 게시 문단 선택/번역 중심. 새 약사 전용 `pharmacy.consultation.support`가 상품 사실·전문 참고/판단·질문 최대 하나·고객 설명을 구분. 인용 ID/상품 사실의 자료 유형/근거에 없는 수치를 검증 |
| 약사 확인 → 고객 전달 | 초안은 비공개 화면 상태. 사용자가 고객 설명만 채택하면 비용 없는 현재 권한/자료 버전 검증 후 기존 한국어 전달 입력을 채움. 번역·공유는 별도로 확인. 401/403은 입력/참고자료를 비우고 409는 예전 초안을 폐기 |
| 자료 부족·실패·전환 | 게시 자료 없음과 provider 실패를 구분. 출처/확인한 직접 참고자료를 사용 가능. 실패는 입력/선택을 보존해 수동 재시도. 상품·매장·모드·상담 세대 변경의 늦은 응답 차단 |
| 상품 자료 → 매장 컨텐츠 | 상담 상품에서 기존 다국어 편집기로 새 탭 연결. 기존 로컬 상품 상세/게시 상품 설명 조회·sanitize·원문 확인·명시 삽입. 현재 본문을 보존하고 저장/발행은 별도. ProductDescriptionAssist의 목적/근거/전문 참고 입력 재사용 |
| 발행 컨텐츠 → QR | scope/그룹 ID/언어만 이동. 기존 그룹 GET과 이미 발급된 QR GET으로 재확인하고 기존 QR 폼만 채움. 공개 키 자동 발급·자동 저장 없음. 생성 진입과 최종 ‘QR 저장’을 구분 |
| 태블릿/사이니지 | 기존 관리 탭으로 연결. 태블릿의 이전 되돌리기가 새 적용/다른 위치/매장 문맥을 덮어쓰지 않도록 현재 할당 재조회. 모바일 preview 보조 메뉴·44px 조작·native dialog·닫은 뒤 초점 복귀. 사이니지 이전/다음·선택 ID 유지 |
| 방치된 현재 상담 | 기존 90초 연결 만료를 사용하는 정리 job. 기본 dry-run, apply 명시 때만 본문/연결 코드를 비우고 epoch 교체. 기기/자리·업무 자산 보존, 회당 최대 200행·동시 잠금 건너뛰기 |

서버는 기존 도메인 guard/권한·약사 사용 확인과 Core 실행기/PRODUCT_CONTENT 모델 정책·플랫폼 부담·quota/회계를 재사용한다. 공통 Core runtime·개인 이력·DB schema/migration·의존성/lockfile·workflow·Dockerfile 변경은 없다. 소비자 commerce 금지 경계를 유지한다. 직접 입력한 전문 자료의 영구 공식 지식 기반 승인이나 기존 QR 설명서의 자동 채택은 없다.

## 2. 로컬 검사

| 검증 | 최종 결과 |
|---|---|
| 환경/설치 | Node 22.18.0 / pnpm 10.25.0. `pnpm install --frozen-lockfile` PASS, 무결성 유지·lockfile 변경 없음 |
| 패키지 | `pnpm run build:packages` PASS |
| Store 전체 | `pnpm --filter store-web test`: **77 files / 845 tests PASS**. 상담 음성 테스트에도 판단 지원 패널을 함께 렌더해 중복 key 회귀 검사 |
| 약국 API 업무 | `pnpm --filter @o4o/api-server exec jest --runInBand --testPathPattern=src/modules/neture-pharmacy/__tests__`: **27 suites / 186 tests PASS**, 기존 환경 조건 **14 suites / 187 tests SKIP** |
| API 시작/QR 계약 | migration ownership/startup health·QR canonical/placement/clone 4 suites / **91 tests PASS** |
| 실제 타입/빌드 | API `pnpm --filter @o4o/api-server build`, Store `pnpm --filter store-web build` 모두 PASS. Store의 기존 큰 chunk 안내는 남음 |
| 변경 파일 lint | 변경 TS/TSX **35개**, 오류 0·경고 1. 기존 route helper의 `_next` 미사용 경고이며 HEAD에도 같은 코드가 있음을 확인. 신규 경고 없음 |

API 전체 저장소 테스트나 운영 외부 AI 호출을 실행한 결과는 아니다. 신규 support/cleanup의 3 suites / 22 tests와 중간 UI 집중 검사는 위 최종 범위에 포함되므로 더하지 않는다.

검사 중 실제 회귀를 수정했다. 약사 보조와 기존 안내 패널의 같은 sibling key가 음성 rerender 후 중복 화면을 만들던 문제는 key 접두어를 분리했다. 다국어 assist/editor도 key를 구분했다. native dialog 미지원 테스트 환경의 close/Escape fallback을 보완했다. 최초 API 조립 변수 충돌·QR 응답 필드 가정도 현행 계약에 맞췄다. 테스트 fixture의 미지원 MP4 미리보기는 기존 지원 형식인 YouTube로 수정했으며 제품의 지원 소스를 확장하지 않았다.

## 3. 브라우저 연결 검증

Chromium, **1440×1000·1280×800·390×844**에서 실제 Store 화면·API client·편집기·tablet-kiosk-core를 연결했다. 판단 지원 경로는 실제 Express route → 도메인 service → Core Extension prepare/parse를 거치고 인증/SQL 응답/provider는 합성이다. 다른 API도 합성 응답이며 네트워크는 loopback만 허용했다. 화면 문구/입력/명시 버튼/요청 body와 현재 상태를 검사했다.

각 화면 크기에서 15개 흐름, 총 **45/45 PASS**, page error 0·수평 overflow 0:

- 음성 요청 시작/마침·문장 보존·자동 키보드 열림 방지, AI 문단 선택/번역 재시도 구분.
- 상품 근거와 직접 확인 참고자료로 약사 초안 준비, 출처별 결과·질문 하나, 고객 전달 전 확인. 초안 채택은 AI 재호출 없이 검증만 함. 자료 버전 변경과 권한 거부 뒤 폐기.
- 한 기기의 고객 dialog와 별도 고객 브라우저의 공유. 고객 요청에는 직원 cookie/Bearer/매장 header가 없고 직원 요청에만 합성 직원 문맥이 있음.
- 종료 실패가 정상 heartbeat에도 남음, 성공 종료/다음 고객에서 이전 내용 제거, 접근 거부 후 입력·연결 코드·지연 음성 폐기.
- 기존 상품 원문 → 현재 본문 보존/삽입 → 명시 발행 → scoped QR 인계 → 발급 상태 재확인 → 명시 QR 저장 1회. 원문/비밀 토큰 이동과 자동 공개 키 POST 없음, 요청 locale 유지.
- 실제 kiosk 미리보기의 모바일 보조 메뉴/크기, native modal의 배경 초점 차단, Escape/초점 복귀. 브라우저 chrome으로의 Tab 이동은 native 동작이며 배경 업무 요소에 초점이 가지 않는지 검사.
- 사이니지 이전/다음과 저장 순서 변경 후 선택 ID 유지. 외부 iframe 통신을 차단했으므로 실제 영상 재생 검증은 아님.

모바일·데스크톱 스크린샷을 직접 확인했다. 로컬 증거는 작업공간 밖의 `/workspace/.o4o-store-completion-20261025/`에 있으며 합성 fixture만 사용했다. 공용 인증과 실제 기기를 연결한 실사용 검증으로 표시하지 않는다.

## 4. PostgreSQL 정리 SQL 검증

격리 PostgreSQL 15 tmpfs 컨테이너에서 기존 `CreateStoreConsultationStations1792815861315`를 최소 부모 fixture 테이블과 함께 실행하고 **실제 컴파일한 cleanup service**를 호출했다. 전체 운영 migration prefix 검증은 아니다.

1. dry-run의 만료 수는 맞고 행 전체는 불변.
2. apply는 만료 본문/연결 코드만 비우고 epoch를 교체. 신선한 상담·기기 등록 유지, 다른 transaction 잠금 행은 건너뜀.
3. 이전 epoch의 지연 update가 0행으로 거절되어 지운 본문을 되살리지 못함.
4. 동시 heartbeat 갱신은 정리 job이 덮어쓰거나 만료시키지 않음.
5. 만료 205행을 두 worker가 겹침 없이 처리. 회당 최대 200·잔여 0.

**5/5 PASS**. fixture DB 삭제·잔여 0 확인 후 이 작업 컨테이너만 중지/삭제했다. 운영 DB·업무 자료는 사용하지 않았다.

## 5. 통합·운영 담당 인계

- **DEPLOYMENT = REQUIRED**: API + Store 코드이며 현재 개발 종료점은 push다. PR·main 병합·배포는 수행하지 않는다. 새 branch의 원격 SHA/CI 상태는 push 후 기록한다.
- **정리 job 활성화는 미실행**: 기본 dry-run은 읽기/집계뿐이다. 배포 후 aggregate count/오류를 관측하고 적용 시 `CONSULTATION_STATE_CLEANUP_MODE=apply`, 중지는 `CONSULTATION_STATE_CLEANUP_ENABLED=false`. 본문이나 실제 계정값은 로그에 넣지 않는다. 60초 주기·batch 적체를 포함한 운영 정리 완료를 아직 주장하지 않는다.
- **실계정/현장 미확인**: 현행 직원 Secret은 선행 읽기 전용 확인에서 로그인 거부였다. 갱신 없이 재시도·비밀번호 변경·역할 발급하지 않았다. 실제 직원 초대/승인/해제·매장 격리, 물리 QR 인쇄/스캔, 별도 태블릿/사이니지 연결·재생, 현장 마이크·언어/약사 품질·유료 provider 결과/비용은 검증하지 않았다.
- 태블릿 undo의 재조회는 낡은 작업을 막지만 다른 작업자와의 서버 원자적 CAS를 제공하지 않는다. 실제 적용 직후 화면/기기 확인은 필요하다.
- 보존 정본의 과거 `ai_query_logs` 미사용 서술과 현행 사용자 질의 저장/조회 코드가 다르다. 운영 row/이용량은 조회하지 않았으며 공통 개인정보/AI 담당의 현재 사용 상태 확인 항목이다. 이번 원문 없는 재사용 결정으로 공통 개인 이력 계약을 바꾸지는 않는다.

문서 정합: 발견 2건(상담절 anchor 이동, 개인 질의 이력의 과거 운영 서술과 코드 차이) / SUPERSEDED 표기 0건 / 링크 수정 2건 / 별도 WO 제안 0건. 업무 범위·약국 설계·Core 적용 기록을 보완했으며 개인정보 정본의 운영 수치를 추정해 수정하지 않았다.
