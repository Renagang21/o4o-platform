# CHECK-O4O-STORE-WORKSPACE-PANELS-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (한국시간)
> **근거 WO**: [WO](../work-orders/WO-O4O-STORE-WORKSPACE-PANELS-V1.md)

## 변경과 검증

사이니지 스케줄, 태블릿 운영 패널, QR 출력, 채널 공개 주소 편집을 분리했다.
공개 주소의 작업 호스트 사용, 스케줄 저장 실패 무응답, QR raw 출력 요청의 선택 매장 헤더 누락을 수정했다.
공통 Core·서버·schema·인증·AI 코드는 변경하지 않았다.

| 검증 | 결과 |
|---|---|
| frozen 의존성 설치·선행 패키지 build | PASS, lock 변경 없음 |
| store-web type-check 및 최종 앱 build | PASS, 기존 큰 chunk 경고 유지 |
| 단위·회귀 테스트 | 11개 파일 81개 PASS, 이번 패널 테스트 8개 포함 |
| lint ratchet | PASS, 오류 46개 / 기준 46개, 경고 1009개 |
| 변경 코드 집중 lint | 오류 0개, 기존 태블릿 경고 3개 유지 |
| 실제 build 브라우저 | 480개 항목 PASS, 1280·375·320px × 경영자·직원 |
| diff 공백 검사 | PASS |

브라우저는 모든 API를 합성 응답으로 대체했다. 네 메뉴·기존 경로·서비스 문맥·직원 구성원 관리 제한,
스케줄 실패 후 입력 보존·재시도, 공개 주소 중복 실패·재시도·변경 제한, QR 출력 안내 Escape,
일괄 출력과 상품 안내문 요청의 선택 매장 헤더·blob 흐름을 확인했다. 페이지 오류와 전체 가로 넘침은 없었다.
1280·375px 스케줄 화면을 시각적으로 확인했다.

초기 브라우저 실행의 닫힌 공통 drawer 저장 버튼 중복 선택은 테스트 locator를 좁혀 해결했다.
화면 이동 후 blob 수집 상태 초기화도 fixture 기대값을 수정했다. 이 과정에서 발견한 실제 QR 헤더 누락은 코드 수정 후
재build·테스트·브라우저 전체 재검증했다. 실패 실행을 통과로 계산하지 않았다.

## 한계와 종료 범위

실계정 로그인·운영 DB·실기기 재생·실제 PDF 내용 및 인쇄 품질·외부 AI 호출은 검증하지 않았다.
로컬 로그와 스크린샷은 `/tmp/store-workspace-panels-*`에 있으며 Git 산출물이 아니다.
합성 테스트는 운영 배포 증거가 아니다.

브랜치 `wo/store-workspace-panels`를 push하며 main merge·배포하지 않는다. PR CI는 아직 실행하지 않았다.
DEPLOYMENT = REQUIRED: 런타임 변경이므로 추후 main 통합 승인 후 해당 Delivery가 필요하다. 현재 미배포다.
자기 이전 브랜치의 로컬 merge만 포함하며 다른 세션 작업 공간은 수정하지 않았다. 작업 공간·브랜치는 KEEP이다.

문서 정합: WO 종료 상태와 [웹 기획](../platform/store/DESIGN-O4O-STORE-WORKSPACE-WEB-V1.md) §13을 반영했다.
