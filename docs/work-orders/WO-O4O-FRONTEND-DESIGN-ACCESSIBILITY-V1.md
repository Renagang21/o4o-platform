# 프론트엔드 디자인 잔여 — 공급자 접근성

> **상태**: ACTIVE · **작성일**: 2026-10-14 · **최종 갱신**: 2026-10-14
> **근거**: 사용자 요청 — 프론트엔드 디자인 진행/잔여 조사 후 진행

## 범위와 기준

첫 작업은 Neture 공급자 입력 라벨과 이미지 조작 접근성이다. 프로필·서류·배송·가져오기·상품 편집의 보이는 라벨과 실제 입력을 연결한다. 같은 컴포넌트가 두 번 렌더되어도 ID가 충돌하지 않는다. 이미지 업로드는 키보드로 접근하고 삭제 버튼은 이름·초점 표시·터치 영역을 제공한다.

Design Reference: `Service.Professional` ([기준](../../ui-guidelines/theme-profiles/service.professional.md)). [Design Core](../rules/DESIGN-CORE-GOVERNANCE.md)와 [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)을 따른다. 기존 공통 컴포넌트를 소비하며 새로운 공통 API·정책·권한·저장 payload를 만들지 않는다.

착수 main `7f2956b0c`. 다른 세션의 공급자 등록/가져오기 라벨 정비가 후속 PR #556에 포함되었다. 통합 전 최신 main을 반영해 해당 중복 변경을 제거한다. 최초 조사에서의 완료/미완료 판정은 후속 배포와 코드 증거에 따라 갱신한다.

## 검증과 종료

- 라벨 기반 실제 값 변경과 기존 profile/onboarding 저장 분리, 상품 등록/import 회귀 검사.
- Neture 타입 포함 빌드와 수정 파일 lint.
- 실제 컴포넌트·CSS Chromium 1440/390/320px. 라벨 클릭 초점, 인스턴스별 ID/값 격리, 업로드 초점, 이미지 삭제, 터치 영역, overflow 검사.
- required CI와 리뷰 gate 후 정상 PR 병합. 자동 배포/통제 배포 상태를 실제 job과 serving 결과로 구분한다.
- 운영 실계정 검증과 쓰기 작업을 합성 fixture 검사로 대체해 완료 표시하지 않는다.

## 독립 후속 요건

| 항목 | 현재 요건 |
|---|---|
| 최신 운영자 개선 배포 | 최근 성공 Promote도 배포 job이 전부 skipped인 사례가 있다. API dependency와 현재 main CI, 실제 배포 job/serving 판정을 확인한다 |
| 운영 로그인 검증 | `docs/local/TEST-ACCOUNT.txt`가 현재 클라우드에 없다. 승인된 비공개 전달/환경 바인딩이 필요하며 채팅에 값을 요청하지 않는다 |
| O4O 약국 자산 | `PHARMACY_BRAND_ASSETS_READY=false`, 기존 slot 유지. 사용자 제작 로고/favicon/OG/PWA 자산이 필요하다. 임의 심볼을 제작하지 않는다 |
| 정적 host SEO | Neture 공용 HTML의 runtime SEO는 정적 crawler를 해결하지 않는다. supplier/funding/community HTML 선택을 nginx/edge에서 처리해야 하므로 Docker/배포 인프라 변경은 별도 명시 범위로 준비한다 |
| 내부 화면 구조 정비 | 최신 운영자·공급자 TODO와 동시 진행 결과를 재조사해 작은 업무 단위로 확정한다. 과거 미병합/결함 기록을 현재 상태로 재사용하지 않는다 |

검증 결과와 남은 요건은 [CHECK](../checks/CHECK-O4O-FRONTEND-DESIGN-ACCESSIBILITY-V1.md)에 기록한다.
