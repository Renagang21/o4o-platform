# CHECK-O4O-KCOS-SERVICE-GUIDE-PAGE-V1

> WO: WO-O4O-KCOS-SERVICE-GUIDE-PAGE-V1
> 작업일: 2026-06-11
> 상태: PASS

## 작업 목적

K-Cosmetics에 "서비스 안내" 페이지를 추가한다. 상단 메뉴에는 About / Contact Us를 분리해 추가하지 않고 "서비스 안내" 메뉴 1개만 추가한다. 서비스 안내 페이지는 K-Cosmetics의 기본 소개, 이용 대상, 주요 기능, 이용 흐름, 문의 안내를 제공한다.

이번 작업은 페이지 구조와 기본 문구를 우선 만드는 것이 목적이며, 세부 문안은 후속 작업에서 다시 정비한다. GlycoPharm 서비스 안내 페이지(WO-O4O-GLYCOPHARM-SERVICE-GUIDE-PAGE-V1)와 같은 형식으로 구성하되 문구는 K-Cosmetics에 맞게 조정했다.

## 적용 서비스

- `services/web-k-cosmetics` 만 수정

## 제외 서비스와 제외 사유

- `services/web-glycopharm` — 별도 WO(WO-O4O-GLYCOPHARM-SERVICE-GUIDE-PAGE-V1)로 선행 완료
- `services/web-kpa-society` — 약사·약대생 커뮤니티 중심 서비스로 문구 정리가 더 필요하므로 별도 작업
- `services/web-neture` — O4O 전체 이용안내 성격이 있어 별도 작업으로 정비

## 추가 라우트

- `/service-guide` (공개, MainLayout 하위)
- 브라우저 확인 대상: `https://k-cosmetics.co.kr/service-guide`

## 상단 메뉴 반영 여부

- 반영됨. `src/config/navigation.ts`의 `KCOS_PUBLIC_NAV`에 `{ label: '서비스 안내', href: '/service-guide' }` 추가
- 공개 메뉴(모든 사용자 노출)로 배치 — GlycoPharm과 동일 정책
- 렌더 순서: 커뮤니티 / 서비스 안내 (public) → divider → 매장 운영 허브 / 내 매장 (contextual, store_manager·operator 한정)
- WO 권장 순서("커뮤니티 / 매장 운영 허브 / 내 매장 / 서비스 안내")는 contextual/public 분리·구분선 렌더 구조상, 전체 노출 항목인 "서비스 안내"를 public nav 후순위(커뮤니티 다음)에 배치하는 것이 기존 UX를 깨지 않는 위치이므로 public nav에 배치함. About/Contact 분리 메뉴는 추가하지 않음.

## 모바일 메뉴 반영 여부

- 반영됨. `@o4o/ui` `GlobalHeader`의 모바일 햄버거 메뉴는 `[...publicNav, ...contextualNav]`를 렌더하므로 public nav에 추가된 "서비스 안내"가 모바일에서도 노출됨

## 페이지 섹션 구조

1. Hero — 제목 + 설명 + CTA(매장 운영 허브 보기 / 문의하기)
2. 서비스 소개
3. 이용 대상 (카드 3개: 화장품 매장 경영자 / 매장 운영 담당자 / 공급·제휴 사업자)
4. 주요 기능 (카드 6개: 매장 운영 지원 / 매장 운영 허브 / 내 매장 / 콘텐츠 활용 / 디지털 안내 도구 / 문의 안내)
5. 이용 흐름 (Step 5개)
6. 문의 안내 (CTA — `/contact` 연결)

GlycoPharm 서비스 안내 페이지와 동일한 Tailwind 구조를 재사용. K-Cosmetics `tailwind.config`에서 `primary-*`가 pink(#db2777)로 매핑되어 있어 동일 클래스로 브랜드 톤 자동 반영.

## K-Cosmetics 문구 기준

- 화장품 매장 / 매장 경영자 / 매장 운영 / 내 매장 / 매장 현장 / 매장 운영 허브 표현 사용
- 약국 관련 표현 미사용. "내 약국"이 아니라 "내 매장" 표현 사용.

## 문의 폼 제외 사유

- WO §4-5: 문의 폼 신규 구현은 이번 작업 범위 외
- 기존 `/contact` (ContactPage) 경로가 존재하여 문의 안내 CTA를 해당 경로로 연결 — 새 기능 미구현

## 푸터 정비 후속 분리 사유

- WO §4-8: 푸터 정비는 범위 외. 문의 수신 경로·푸터 문의 링크 정리는 후속 푸터/문의 정비 작업으로 분리
- 페이지 문구에 후속 정비 예정임을 명시

## 검증 결과

- TypeScript: `npx tsc --noEmit` (direct-include 패턴) → EXIT 0 (PASS)
- Build: `npx vite build` → ✓ built (PASS)
- 기존 커뮤니티 / 매장 운영 허브 / 내 매장 메뉴 동작 영향 없음 (public nav 항목 추가만)
- GlycoPharm / KPA Society / Neture 파일 미수정

## 변경 파일

- `services/web-k-cosmetics/src/pages/ServiceGuidePage.tsx` (신규)
- `services/web-k-cosmetics/src/App.tsx` (lazy import + route 추가)
- `services/web-k-cosmetics/src/config/navigation.ts` (public nav 항목 추가)
- `docs/checks/CHECK-O4O-KCOS-SERVICE-GUIDE-PAGE-V1.md` (신규)

## commit hash

- `7bda9ece9` — feat(k-cosmetics): add service guide page (WO-O4O-KCOS-SERVICE-GUIDE-PAGE-V1)
