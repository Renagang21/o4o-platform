# CHECK-O4O-GLYCOPHARM-SERVICE-GUIDE-PAGE-V1

> WO: WO-O4O-GLYCOPHARM-SERVICE-GUIDE-PAGE-V1
> 작업일: 2026-06-11
> 상태: PASS

## 작업 목적

GlycoPharm에 "서비스 안내" 페이지를 추가한다. 상단 메뉴에는 About / Contact Us를 분리해 추가하지 않고 "서비스 안내" 메뉴 1개만 추가한다. 서비스 안내 페이지는 GlycoPharm의 기본 소개, 이용 대상, 주요 기능, 이용 흐름, 문의 안내를 제공한다.

이번 작업은 페이지 구조와 기본 문구를 우선 만드는 것이 목적이며, 세부 문안은 후속 작업에서 다시 정비한다.

## 적용 서비스

- `services/web-glycopharm` 만 수정

## 제외 서비스와 제외 사유

- `services/web-k-cosmetics` — 별도 WO(WO-O4O-KCOS-SERVICE-GUIDE-PAGE-V1)로 진행
- `services/web-kpa-society` — 약사·약대생 커뮤니티 중심 서비스로 문구 정리가 더 필요하므로 별도 작업
- `services/web-neture` — O4O 전체 이용안내 성격이 있어 별도 작업으로 정비

## 추가 라우트

- `/service-guide` (공개, MainLayout 하위)
- 브라우저 확인 대상: `https://glycopharm.co.kr/service-guide`

## 상단 메뉴 반영 여부

- 반영됨. `src/config/navigation.ts`의 `GLYCO_PUBLIC_NAV`에 `{ label: '서비스 안내', href: '/service-guide' }` 추가
- 공개 메뉴(모든 사용자 노출)로 배치 — 정보성 안내 페이지의 canonical 위치
- 렌더 순서: 커뮤니티 / 서비스 안내 (public) → divider → 매장 운영 허브 / 내 약국 (contextual, store_owner·operator 한정)
- WO 권장 순서("커뮤니티 / 매장 운영 허브 / 내 약국 / 서비스 안내")는 contextual nav(역할 조건부)와 public nav(전체 노출)가 헤더 컴포넌트에서 분리·구분선으로 렌더되는 기존 구조상, 전체 노출 항목인 "서비스 안내"를 public nav에 두는 것이 기존 UX를 깨지 않는 위치이므로 public nav 후순위(커뮤니티 다음)에 배치함. About/Contact 분리 메뉴는 추가하지 않음.

## 모바일 메뉴 반영 여부

- 반영됨. `@o4o/ui` `GlobalHeader`의 모바일 햄버거 메뉴는 `[...publicNav, ...contextualNav]`를 렌더하므로 public nav에 추가된 "서비스 안내"가 모바일에서도 노출됨
- `MobileBottomNav`(하단 고정 4-탭: 커뮤니티/약국 경영/알림/내정보)는 고정 구조로 변경하지 않음 — 햄버거 메뉴로 접근 보장

## 페이지 섹션 구조

1. Hero — 제목 + 설명 + CTA(매장 운영 허브 보기 / 문의하기)
2. 서비스 소개
3. 이용 대상 (카드 3개: 약국 경영자 / 약국 운영 담당자 / 공급·제휴 사업자)
4. 주요 기능 (카드 6개: 약국 운영 지원 / 매장 운영 허브 / 내 약국 / 콘텐츠 활용 / 디지털 안내 도구 / 문의 안내)
5. 이용 흐름 (Step 5개)
6. 문의 안내 (CTA — `/contact` 연결)

기존 GlycoPharm 공개 페이지(`BusinessHubPage`)의 디자인 톤(Tailwind, `primary-*` 컬러, slate 카드, hero gradient)을 재사용.

## GlycoPharm 문구 기준

- 약국 / 약국 경영자 / 약국 운영 / 내 약국 / 약국 현장 / 매장 운영 허브 표현 우선 사용
- "내 매장" 일괄 표현 사용하지 않음 (약국 전용 서비스 성격에 맞게 "내 약국" 우선)

## 문의 폼 제외 사유

- WO §4-5: 문의 폼 신규 구현은 이번 작업 범위 외
- 기존 `/contact` (ContactPage) 경로가 존재하여 문의 안내 CTA를 해당 경로로 연결 — 새 기능 미구현

## 푸터 정비 후속 분리 사유

- WO §4-8: 푸터 정비는 범위 외. 문의 수신 경로·푸터 문의 링크 정리는 후속 푸터/문의 정비 작업으로 분리
- 페이지 문구에 후속 정비 예정임을 명시

## 검증 결과

- TypeScript: `npx tsc -b --noEmit` → EXIT 0 (PASS)
- Build: `npx vite build` → ✓ built (PASS)
- 기존 커뮤니티 / 매장 운영 허브 / 내 약국 메뉴 동작 영향 없음 (public nav 항목 추가만)
- K-Cosmetics / KPA Society / Neture 파일 미수정

## 변경 파일

- `services/web-glycopharm/src/pages/ServiceGuidePage.tsx` (신규)
- `services/web-glycopharm/src/App.tsx` (lazy import + route 추가)
- `services/web-glycopharm/src/config/navigation.ts` (public nav 항목 추가)
- `docs/checks/CHECK-O4O-GLYCOPHARM-SERVICE-GUIDE-PAGE-V1.md` (신규)

## commit hash

- `d63aa54c2` — feat(glycopharm): add service guide page (WO-O4O-GLYCOPHARM-SERVICE-GUIDE-PAGE-V1)
