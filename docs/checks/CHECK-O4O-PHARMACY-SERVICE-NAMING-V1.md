# CHECK-O4O-PHARMACY-SERVICE-NAMING-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-09 · **최종 갱신**: 2026-10-09
> **근거 WO/IR**: 사용자 직접 지시 — 대표 홈 약국 경영지원 명칭·소개 정비 및 파머시 허브 삭제 대상 반영

대표 홈의 `kpa-society` 표시를 **O4O 약국 경영지원**으로 통일했다. 공개 소개는 **O4O를 이용하는 약국 내 업무를 지원하는 약국 개설자 서비스**다. 서버 catalog가 옛 명칭을 반환해도 개인화 표시에서 새 명칭을 사용한다. serviceKey·가입 원장·승인 조건·handoff 계약은 변경하지 않았다.

삭제 대상 `pharmacy-hub`는 기존 membership, 매장, 운영 목록, 커뮤니티 surface가 남아 있어도 대표 홈 진입에서 제외한다. 신청 상태·가입 안내도 제외한다. 이 변경은 대표 홈 노출 정리이며 서비스 앱·DB·배포 대상 전체 삭제가 아니다. 커뮤니티 자체의 이름과 참여 판정은 기존 API 계약을 따른다.

주요 서비스는 약국 경영지원·공급자 두 항목에 맞춰 desktop 2열, mobile 1열로 표시한다. 별도 사업인 커뮤니티·강의·펀딩은 기존 독립 진입을 유지한다.

검증: Neture Vitest 45 files / 371 tests PASS, TypeScript 및 Vite production build PASS. 변경 production 소스 ESLint error 0 · 기존 unused-disable warning 1. 초기 빌드는 새 worktree의 공통 패키지 산출물 부재로 실패하여 동일 소스의 기존 dependency 산출물을 연결 후 통과했다. dependency·lockfile 변경 없음. 초기 회귀 실패는 옛 명칭·PH 진입 기대값을 현 정책으로 수정했으며 bfcache 검증은 활성 서비스 fixture로 유지했다.

Chromium 로컬 빌드 검증: 로그인 전/후 × 390/1280 총 4회 PASS. API는 과거 KPA 명칭과 활성 PH membership을 포함한 합성 fixture이며 실제 운영 계정 검증은 아니다. 새 서비스 명칭·소개, PH 버튼 비노출, 가로 overflow 0, pageerror 0 확인.

작업은 최신 `origin/main`의 전용 worktree `/workspace/o4o-wt/pharmacy-service-naming`, branch `wo/pharmacy-service-naming`에서 수행했다. 이전 PR #366의 작업공간은 수정하지 않았다. 기존 PR의 대표 홈 후속 변경과 이 PR을 통합할 때에는 표시명과 PH 제외를 유지한다.

문서 정합: 사용자 명시 사업 설명을 대표 홈 표시로 반영했으며 내부 legacy serviceKey와 서비스 이름의 차이를 구분했다. 정책 정본 및 과거 기록은 수정하지 않았다. 운영 배포는 이 코드 검증과 별개다.
