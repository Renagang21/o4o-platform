# WO-O4O-PRODUCT-DESCRIPTION-PROFESSIONAL-USE-POLICY-V1

> **상태**: ACTIVE — 개발·로컬 검증 완료, 통합 인계
> **작성일**: 2026-10-24 · **최종 갱신**: 2026-10-24
> **근거**: 사용자 요청 — 설명서 목적·입력 구분, 근거 분리, 프롬프트·검수 조정, 문서 정합을 함께 수행
> **결정**: [ADR-0003](../adr/ADR-0003-product-description-professional-and-ai-use.md)
> **운영 SSOT**: [전문 판단·AI 활용 원칙](../guides/products/O4O-PRODUCT-DESCRIPTION-PROFESSIONAL-USE-POLICY-V1.md) · CR-022 · AR-007

## 변경 범위

- 매장 상품 설명·QR·직접 상품 등록·상품 연결 자료 제작·상품 설명 제작에서 이용 목적과 상품/전문 근거 입력을 연결했다. 입력은 편집 세션에 사용하며 공식 DB에 자동 저장하지 않는다.
- 공유 작성 프롬프트와 기존 상품 콘텐츠 생성기에서 상품 사실·전문 참고정보를 구분한다. 목적별 전문 분량과 소비자용 간결한 표현을 구분하고, 출처 미확인·검수 대기 자료는 확정 근거에서 제외하도록 지시한다.
- 건강 콘텐츠의 고정 상담 톤·일괄 치료/예방 표현 제한을 근거와 맥락에 맞게 조정했다. 작업 창의 고정 안내도 정합화했다.
- 기존 건기식 seed 파이프라인의 상품 효능 근거 제한은 유지한다. 처방·진단 같은 단어 자체 대신 효과 단정·의약품 오인 표현을 검출한다.
- B2B 정의, STORE 사본의 재구성·검수 지침, grounding·검수 문서를 정합화했다. 이전 사용자 지시로 삭제한 약사회 서비스 제한 문구도 같은 작업 인계에 포함한다.

## 검증

| 대상 | 결과 |
|---|---|
| store-ui-core | 8개 파일 · 124 tests PASS |
| store-web | 66개 파일 · 792 tests PASS |
| API 건기식 검수·설명서 정책·홈 채팅 | 4 suites · 73 tests PASS |
| ai-prompts / content-editor / store-web 빌드 | PASS |
| API `tsc -p tsconfig.build.json --noEmit` | PASS |
| 변경 코드 focused ESLint / diff 형식 / 문서 링크·민감정보 검사 | PASS |
| Chromium 실제 작성 컴포넌트 fixture | 1440px·390px에서 목적 선택·근거 입력·요청문 복사·결과 적용 PASS. 페이지 오류·가로 넘침 없음 |

공통 프롬프트·입력 컴포넌트의 마지막 수정 후 focused 테스트와 웹 빌드를 재확인했다. 검사에서 전문 설명은 허용하면서 근거 없는 제품 효과 단정은 검출하는지 함께 확인했다.

## 인계와 미검증

- 클라우드에서 준비한 격리 checkout의 기존 `work` branch를 사용했다. 추가 worktree는 만들지 않았다.
- 개발 기준 HEAD는 `f196b3cf22`. 인계 전 fetch 결과 `origin/main`은 `2234598f36`으로 14개 커밋 앞서 있으며, 수정 대상 파일에는 겹치는 변경이 없었다. 통합 담당은 병합 시 최신 상태를 다시 확인한다.
- 실제 LLM 응답의 정확성·임상적 유용성, 로그인한 운영 화면, 운영 DB·배포는 검증하지 않았다. 브라우저 검증은 컴포넌트 fixture다.
- 기존 QR 설명서의 공식 DB 채택은 보류다. 기존 설명서 재작성·대량 데이터 변경·migration은 수행하지 않았다.
- PR 생성·병합·배포는 통합 담당의 후속 범위다.
