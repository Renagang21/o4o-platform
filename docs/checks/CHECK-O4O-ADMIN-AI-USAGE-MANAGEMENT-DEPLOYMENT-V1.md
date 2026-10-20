# 관리자 AI 운영 조회 기반 1단계 통합·배포 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-20 · **최종 갱신**: 2026-10-20 (Asia/Seoul)
> **근거 WO/IR**: [구현 WO](../work-orders/WO-O4O-ADMIN-AI-USAGE-MANAGEMENT-V1.md) · 사용자 main 병합 → 배포 승인
> **관련 정본**: [AI Core + Extension 공통 기반 §12](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md#12-관리자-ai-운영-조회-기반--main운영-반영-2026-10-20)

## 1. 판정과 범위

조회 기반 1단계의 main 통합·API/관리자 운영 배포를 완료했다. 관리자 `/settings`에서 사용처·현재 설정, API·모델 연결, 기존 기록의 사용량·비용을 조회하는 범위다. 기능별 모델 변경·중지의 실제 실행 적용, 직접 호출 회계 이관, DeepSeek/STT 연결은 후속 TODO이며 이번 COMPLETED 판정에 포함하지 않는다.

| 증거 | 결과 |
| --- | --- |
| 구현 PR | [#724](https://github.com/Renagang21/o4o-platform/pull/724), 2026-10-20 13:42:23 Asia/Seoul 병합 |
| 병합 SHA | `653178d0b884d545f60d472311436ea7a8f3e727` |
| 최신 개발 HEAD | `0a7dd9438c9d45b54ab943f00542ae0dd7ad63b6` |
| PR CI / CodeQL | [39370012045](https://github.com/Renagang21/o4o-platform/actions/runs/39370012045) / [39370011989](https://github.com/Renagang21/o4o-platform/actions/runs/39370011989), 모두 SUCCESS |
| Codex 재리뷰 | 최신 개발 HEAD completed, findings 없음; 병합 전 미해결 스레드 0 |
| main CI / CodeQL | [39370985041](https://github.com/Renagang21/o4o-platform/actions/runs/39370985041) / [39370985103](https://github.com/Renagang21/o4o-platform/actions/runs/39370985103), 모두 SUCCESS |
| 자동 Delivery | [39371832247](https://github.com/Renagang21/o4o-platform/actions/runs/39371832247), LEVEL 2·API → admin·SUCCESS |
| 최종 production 상태 | 2026-10-20 14:02:34 Asia/Seoul, DEPLOYED |

freeze·CI·main HEAD·서빙 범위 판정은 기존 Delivery에서 통과했다. 수동 dispatch·promote·우회·workflow/인프라 변경은 없었다.

## 2. 실제 서빙과 공개 운영 점검

Delivery의 리비전 라벨과 트래픽 검증 결과:

| 서비스 | serving revision | source SHA | traffic |
| --- | --- | --- | --- |
| o4o-core-api | `o4o-core-api-04098-sit` | `653178d0b884d545f60d472311436ea7a8f3e727` | 단일 리비전 100% |
| o4o-admin-dashboard | `o4o-admin-dashboard-01520-mac` | `653178d0b884d545f60d472311436ea7a8f3e727` | 단일 리비전 100% |

그 외 웹 서비스는 NO_DEPLOY다. API의 새 리비전 readiness 확인 후 트래픽을 전환했고, 관리자도 새 리비전 HTML smoke 후 전환했다. 최종 보고서는 두 서비스를 DEPLOYED로 확정했다.

2026-10-20 14:03:02 Asia/Seoul, credential 없이 TLS 검증을 유지한 GET 점검:

| 점검 | 결과 |
| --- | --- |
| `api.neture.co.kr/health` · `/health/ready` | 각각 200 |
| `/api/ai/admin/management` · `/api/ai/admin/management/usage?days=7` | 각각 401, 비로그인 접근 차단 |
| `admin.neture.co.kr/settings` · `/settings/ai-query` | 각각 200 |
| 운영 HTML의 entry JS와 실제 `Settings-D3YDxDD4.js` | 200 |
| Settings 자산 | AI 운영 관리·사용량/비용 문구, `/ai/admin/management` 연결 경로 확인 |

최초 로컬 점검 스크립트가 다른 설정 파일명의 일부를 잘라 가상 경로로 요청하면서 404를 만들었다. 실제 entry의 따옴표로 구분된 전체 Settings 경로만 선택하도록 보정 후 위 점검을 통과했다. 제품 코드나 배포 자산의 404 결함으로 판정하지 않았다. HTML/자산 확인은 Google 로그인 후 화면·실제 통계 조회 성공을 뜻하지 않는다.

## 3. 검증·데이터 변경과 한계

- 로컬 API focused tests 4 suites / 48 tests, 관리자 Vitest 17 tests, fixture API를 사용하는 데스크톱·모바일 Chromium 12 tests 및 API/관리자 타입·build PASS. 최초 CI의 기존 권한 소스 검사와 Codex의 0/0 사용량 누락 finding을 보완한 뒤 전체 PR/main CI가 통과했다.
- SQL 회귀 중 4건은 in-memory SQLite adapter다. 실제 PostgreSQL schema/데이터 검증으로 취급하지 않는다. 기존 사용량 0/0 기록을 미확인으로 분류하며 저장 원장을 재계산하지 않았다.
- 신규 schema/migration/seed·정책 쓰기·키 변경·한도 변경·유료 AI 호출을 추가하지 않았다. 기존 배포 절차의 migration Job 실행은 성공했다. DB 직접 조회·pending 적용 건수 확인은 미실시이므로 DB 무변경을 별도로 입증한 것은 아니다.
- 실제 Google 관리자 로그인, 운영 DB에서 반환되는 정책/연결 유무/통계, 공급자 인증, 실제 청구 대조는 미검증이다. 비밀값·사용자별 기록·운영 응답 원문은 이 문서에 기록하지 않는다.
- 같은 WO의 문서 증적 후속은 runtime 배포 대상이 아니다. 이후 문서-only main SHA와 위 serving 코드 SHA를 혼동하지 않는다.

문서 정합: 구현 WO에 통합·배포 결과를 추가하고 정본 §12의 작업 branch 상태를 main·운영 반영 상태로 갱신했다. 기능별 제어·회계·실계정 검증 TODO는 유지했다.
