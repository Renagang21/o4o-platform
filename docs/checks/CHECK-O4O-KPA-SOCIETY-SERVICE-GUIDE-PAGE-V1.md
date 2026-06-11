# CHECK-O4O-KPA-SOCIETY-SERVICE-GUIDE-PAGE-V1

> WO: WO-O4O-KPA-SOCIETY-SERVICE-GUIDE-PAGE-V1
> 작업일: 2026-06-11
> 상태: PASS

## 작업 목적

KPA Society에 "서비스 안내" 페이지를 추가한다. KPA Society의 공개 서비스 안내는 약국 경영지원 서비스가 아니라 **약사·약대생 커뮤니티 서비스**를 중심으로 설명한다. 약국 경영자에게 제공되는 경영지원 기능은 권한 기반 부가 기능이므로 공개 안내에서는 상세 기능을 나열하지 않고 간단히 언급한다.

상단 메뉴에는 About / Contact Us를 분리해 추가하지 않고 "서비스 안내" 메뉴 1개만 추가한다. 이번 작업은 구조와 기본 문구 우선이며 세부 문안은 후속 작업에서 정비한다.

## 적용 서비스

- `services/web-kpa-society` 만 수정

## 제외 서비스와 제외 사유

- `services/web-glycopharm` — 별도 WO(WO-O4O-GLYCOPHARM-SERVICE-GUIDE-PAGE-V1) 완료
- `services/web-k-cosmetics` — 별도 WO(WO-O4O-KCOS-SERVICE-GUIDE-PAGE-V1) 완료
- `services/web-neture` — O4O 전체 이용안내 성격이 있어 별도 작업으로 정비
- **외부 working tree 변경 미포함**: 내 매장 메뉴 문구 정렬 / `O4O 주문 가능 상품` 문구 주입 / `자체 상품 관리` → `매장 취급 상품` relabeling (`WO-O4O-MY-STORE-CANONICAL-MENU-LABEL-ALIGNMENT-3SERVICES-V1` 성격) — 본 WO에서 stage/commit 하지 않음. 작업 시작 시 working tree clean 확인됨.

## 추가 라우트

- `/service-guide` (공개, `<Layout serviceName={SERVICE_NAME}>` 하위 — KpaGlobalHeader + Footer 제공)
- 브라우저 확인 대상: `https://kpa-society.co.kr/service-guide`

## 상단 메뉴 반영 여부

- 반영됨. `src/config/navigation.ts`에 `KPA_SERVICE_GUIDE_NAV_ITEM = { label: '서비스 안내', href: '/service-guide' }` 추가
- `KpaGlobalHeader.tsx`의 `computedNav`에서 contextual(내 매장 / 약국 HUB) 항목 뒤, About 앞에 삽입
- 렌더 순서:
  - 비로그인: 커뮤니티 / 서비스 안내 / About / Contact
  - 로그인(store_owner): 커뮤니티 / 내 매장 / 약국 HUB / 서비스 안내 / About
- WO 권장 순서("커뮤니티 / 매장 운영 허브 / 내 약국 / 서비스 안내")에 맞춰 contextual 항목 뒤에 배치
- About / Contact 분리 메뉴는 **추가하지 않음**. KPA에 기존 존재하던 About(상시) · Contact(비로그인) 메뉴는 기존 UX 유지 차원에서 그대로 보존(제거는 본 WO 범위 외)

## 모바일 메뉴 반영 여부

- 반영됨. KPA는 `GlobalHeader`에 `publicNav={computedNav}`만 전달(contextualNav prop 미사용)하므로, 모바일 햄버거 메뉴(`allNav = [...publicNav]`)에 "서비스 안내"가 노출됨
- `MobileBottomNav`(하단 고정 4-탭: 커뮤니티/약국 경영/알림/내정보)는 고정 구조로 변경하지 않음 — 햄버거 메뉴로 접근 보장

## 페이지 섹션 구조

1. Hero — 제목 + 설명 + CTA(커뮤니티 보기 / 문의하기)
2. 서비스 소개
3. 이용 대상 (카드 3개: 약사 / 약대생 / 약국 경영자)
4. 주요 기능 (카드 4개: 약사·약대생 커뮤니티 / 정보 공유 / 참여와 소통 / 경영지원 기능 안내)
5. 이용 흐름 (Step 5개)
6. 문의 안내 (CTA — `/contact` 연결)

GlycoPharm / K-Cosmetics 서비스 안내 페이지와 동일한 Tailwind 형식을 재사용하여 "서비스 안내" 페이지 family 일관성 확보. KPA `tailwind.config`의 `primary-*`가 blue(#2563eb)로 매핑되어 동일 클래스로 KPA 브랜드 톤 자동 반영.

## KPA Society 문구 기준

- 약사·약대생 커뮤니티 / 정보 공유 / 참여와 소통 / 전문 정보 / 약국 현장 정보 / 커뮤니티 활동 / 약국 경영자에게 제공되는 일부 경영지원 기능 표현 사용
- KPA Society를 약국 경영지원 서비스 중심으로 설명하지 않음
- 약사회 지부/분회 운영 서비스처럼 표현하지 않음

## 약국 경영지원 기능을 상세 나열하지 않은 이유

- WO §4-5/4-6/4-7/§7: KPA Society의 공개 정체성은 약사·약대생 커뮤니티 서비스이며, 경영지원 기능은 권한 기반 부가 기능
- 매장 운영 허브 / 이벤트 오퍼 / POP / QR / 사이니지 등 경영자 전용 기능을 상세 기능 카드로 나열하지 않고, "경영지원 기능 안내" 1개 카드로만 간단히 언급
- 주요 기능 섹션 하단에 "경영지원 기능은 권한 기반 부가 기능으로 세부 기능을 나열하지 않습니다" 명시 문구 추가

## 문의 폼 제외 사유

- WO §4-9: 문의 폼 신규 구현은 범위 외
- 기존 `/contact` (ContactPage) 경로가 존재하여 문의 안내 CTA를 해당 경로로 연결 — 새 기능 미구현

## 푸터 정비 후속 분리 사유

- WO §4-12: 푸터 정비는 범위 외. 문의 수신 경로·푸터 문의 링크 정리는 후속 푸터/문의 정비 작업으로 분리
- 페이지 문구에 후속 정비 예정임을 명시

## 검증 결과

- TypeScript: `npx tsc --noEmit` (direct-include 패턴) → EXIT 0 (PASS)
- Build: `npx vite build` → ✓ built (PASS)
- 기존 커뮤니티 메뉴 / 매장 운영 허브 / 권한 기반 메뉴 동작 영향 없음 (nav 항목 추가만)
- GlycoPharm / K-Cosmetics / Neture 파일 미수정
- 외부 working tree 변경(매장 취급 상품 relabeling 등) stage/commit 안 함 — staged 가드로 확인

## 변경 파일

- `services/web-kpa-society/src/pages/service-guide/ServiceGuidePage.tsx` (신규)
- `services/web-kpa-society/src/App.tsx` (lazy import + route 추가)
- `services/web-kpa-society/src/config/navigation.ts` (서비스 안내 nav item 추가)
- `services/web-kpa-society/src/components/KpaGlobalHeader.tsx` (computedNav 삽입)
- `docs/checks/CHECK-O4O-KPA-SOCIETY-SERVICE-GUIDE-PAGE-V1.md` (신규)

## commit hash

- `78f21d0f6` — feat(kpa-society): add community-centric service guide page (WO-O4O-KPA-SOCIETY-SERVICE-GUIDE-PAGE-V1)
