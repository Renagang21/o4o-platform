# CHECK-O4O-KPA-OPERATOR-P2-P3-USABILITY-AND-ERROR-CLEANUP-CONSOLIDATED-V1

> WO: `WO-O4O-KPA-OPERATOR-P2-P3-USABILITY-AND-ERROR-CLEANUP-CONSOLIDATED-V1`
> 성격: KPA 운영자 콘솔 P2/P3 UX·오류계약 통합 정비 (라벨·다이얼로그·경로노출·명칭·403·오류계약).
> **backend/DB/업무정책 불변 · route 계약 불변.** Date: 2026-07-27

## 0. 결론 — ✅ PASS (일부 정당 HOLD)

read-only 전수 조사(2 에이전트) 후 의미·정책이 명확한 6개 영역 중 4개 영역 전량 구현 + 2개 영역 판정.
- **구현**: ① AuditLog 라벨 커버리지(6→16키) · ② alert/confirm 9파일 ConfirmActionDialog/toast 변환 · ③ 상품 신청 화면 raw 문서경로 제거 · ④ 대시보드 KPI/ActionQueue/H1 명칭 정합.
- **판정/HOLD**: ⑤ working-content 403 = store-scoped 설계, operator publish 배선은 권한 확대 → HOLD · ⑥ P2 오류계약 = 심각 offender 0(이미 정비됨) → 무변경.
- alert/confirm: 실호출 기준 파괴적·에러·발행 확인 9파일 변환. 잔여 11 confirm(List runBulk 5 + working-content 2)은 **정당 근거 HOLD**.

## 1. AuditLog 라벨 보완 (영역 1)

- `AuditLogPage.tsx` `ACTION_LABELS` 6키 → **16키**로 확장. 프로덕션 `kpa_operator_audit_logs.action_type`
  라이브 14종 중 8종이 미매핑(raw key 표시)이었음. **추정 등록 없이** 각 키를 api-server emitter 확인분으로만 추가:
  - member: `MEMBER_INFO_UPDATED`(신규) — member.controller
  - content: `CONTENT_HARD_DELETED`·`CONTENT_BATCH_PUBLISHED`·`CONTENT_BATCH_ARCHIVED`·`CONTENT_BATCH_HARD_DELETED` — kpa.routes writeAuditLog
  - course/resource: `COURSE_HARD_DELETED`·`RESOURCE_STATUS_CHANGED`·`RESOURCE_DELETED`
  - store/pharmacy: `STOREFRONT_CONFIG_UPDATED`(pharmacy-store-config)·`PHARMACY_INFO_UPDATED`(pharmacy-info)
  - legacy: `APPLICATION_REVIEWED`(retired flow, 잔존 3행 라벨 유지)
- `ACTION_COLORS` 동일 16키 매핑(hard-delete=진한 red, archive=gray, publish=blue 등). 미매핑 키는 기존대로 `bg-gray-100` fallback.
- `TARGET_LABELS` 에 `kpa_content`·`course`·`resource`·`pharmacy`·`storefront` 추가(기존 raw `kpa_content` 노출 해소).
- **필터 드롭다운**은 `ACTION_LABELS` 기반 → 확장으로 미매핑 액션도 필터 가능(부수 개선).
- 렌더 fallback(`ACTION_LABELS[key] || key`)은 기존대로 유지 — 미래 신규 키도 raw 안전 표시.

## 2. alert/confirm 교체 내역 (영역 2)

공용 `ConfirmActionDialog`(@o4o/ui, CommunityManagementPage 패턴) + `toast`(@o4o/error-handling) 재사용.
window.confirm 은 동기 blocking → 상태기반 defer 패턴(대상 보관 후 확인 시 실행)으로 변환. API·상태전이·비즈니스 로직 불변.

**변환 완료 (9파일):**

| 파일 | 기존 | 변환 |
|---|---|---|
| RecruitmentExposureApprovalPage | `window.alert`(처리 실패) | `toast.error` |
| OperatorContentHubPage | `window.confirm`(삭제) | ConfirmActionDialog **danger** |
| signage/TemplateDetailPage | `confirm`(템플릿 삭제) | ConfirmActionDialog **danger** |
| OperatorStoreDetailPage | `window.confirm`(채널 영구 종료) | ConfirmActionDialog **danger** (TERMINATED 만 게이트, 타 전이 즉시) |
| QualificationRequestsPage | `window.confirm` ×2(단건/일괄 삭제) | ConfirmActionDialog **danger** (mode 분기, batch 계약 불변) |
| event-offer/EventOfferManagePage | `window.confirm`(제외/승인) + `window.prompt`(반려 사유) | ConfirmActionDialog 통일 (제외/반려 danger, 승인 default, 반려 **requireReason**) |
| blog/OperatorBlogWritePage | `window.confirm`(발행) | ConfirmActionDialog (default, 발행) |
| pop/OperatorPopWritePage | `window.confirm`(발행) | ConfirmActionDialog |
| qr/OperatorQrWritePage | `window.confirm`(발행) | ConfirmActionDialog |
| video/OperatorVideoWritePage | `window.confirm`(발행) | ConfirmActionDialog |

- 취소 시 mutation 미실행(대상 null화 → onConfirm 만 실행). destructive 는 danger variant + 명확 문구(되돌릴 수 없음).
- 저장→발행 순서(발행 전 handleSave) 보존 — 저장/상태검사 후에만 다이얼로그 오픈, 확인 시 발행.

## 3. Product application 경로 노출 처리 (영역 3)

- 상품 신청 화면(`ProductApplicationManagementConsole`, @o4o/operator-core-ui)의 승인 흐름 안내 드로어에서
  내부 저장소 문서 경로 `docs/guides/O4O-SUPPLY-CATALOG-APPROVAL-FLOW-GUIDE-V1.md` 를 `<code>` 로 사용자 노출하던 지점 → **사용자 안내 문구로 대체**.
- 조사 결과 **레코드별 파일/버킷/서버 경로 노출 없음**: 리스트/드로어 컬럼(org·product_name·supplier·price·category·status·reason)에 raw path 필드 부재,
  API(`GET /kpa/operator/product-applications`) 응답에도 storage/bucket/server 경로 컬럼 없음 → **보안 민감 경로 노출 0**. 정적 안내 파일명 1건만 제거.
- 공유 모듈(KPA/GlycoPharm/Cosmetics/Neture operator 공통) — 정적 안내 텍스트 변경, 회귀 위험 없음.

## 4. KPI·메뉴 용어 정합 (영역 4)

route 불변, 라벨/제목만 canonical(사이드바 기준) 정합. `operator-dashboard.service.ts`(KPI+ActionQueue) + 페이지 H1.

| 도메인 | KPI(기존→정합) | ActionQueue | H1(기존→정합) | 사이드바(canonical) |
|---|---|---|---|---|
| 콘텐츠 | 콘텐츠 발행 대기 → **공지사항/뉴스 발행 대기** | 동일 | 공지사항/뉴스 관리(유지) | 공지사항/뉴스 |
| 사이니지 | 사이니지 미디어 대기 → **HQ 미디어 검수 대기** / 플레이리스트 → **HQ 플레이리스트 검수 대기** | HQ 미디어 검수 / HQ 플레이리스트 검수 | HQ 미디어 관리(유지) | HQ 미디어 |
| 상품 | 상품 신청 대기 → **공급 상품 신청 대기** | 공급 상품 신청 검토 | 상품 판매 신청 관리 → **공급 상품 신청 관리** | 공급 상품 신청 승인 |
| 이벤트 | 이벤트 오퍼 승인 대기(유지) | 이벤트 오퍼 승인 검토(유지) | 이벤트 관리 → **이벤트 오퍼 관리** | 이벤트 오퍼 승인 |

- 원칙: 도메인 토큰(공지사항/뉴스·HQ·공급 상품·이벤트 오퍼)을 KPI·큐·제목·메뉴에 일관 적용.
  페이지는 등록+관리 범위이므로 '승인'으로 억지 축소하지 않고 '관리' 유지(억지 통일 금지).
- 회원/포럼/판매자모집 = minor 차이(대기/관리) — 정책 의미 동일, 과잉 변경 회피.

## 5. working-content 403(NO_STORE) 판정 — HOLD (영역 5)

- `/operator/working-content`(List/Edit)는 **store-owner 기능이 /operator 네임스페이스에 위치**. list/edit/delete 는 `owner_id=userId`
  개인 작업본 스코프, publish 는 `o4o_asset_snapshots` 를 `organization_id` 키로 삽입(매장 콘텐츠 SSOT).
- 403 원인: publish 가 `isStoreOwner(dataSource,userId)` 로 매장 해석 → 매장 없으면 `NO_STORE`. 발행은 대상 매장 없이는 의미 없음.
- 운영자 콘텐츠 SSOT(canonical CMS/content-hub) ≠ 매장 콘텐츠 SSOT(asset_snapshots). working-content 는 개인 draft-staging 이 매장 스냅샷으로 발행되는 **본질적 store-scoped** 기능.
- 사이드바 **미노출**(데드메뉴 아님, `/operator/docs` 복사 흐름 진입) → 잘못 노출된 메뉴 없음.
- **판정: HOLD.** operator-safe publish 대상이 없어 배선 시 권한 확대. route 제거 시 `/operator/docs` 복사 흐름 파손 위험.
  단순 403 catch 은닉 하지 않음. 정책(운영자에게 발행 허용 여부) 결정 전까지 **기능·route·confirm 무변경**.
  (working-content 의 confirm 2건도 이 HOLD 표면이라 미변환.)

## 6. 추가 P2 오류계약 정리 — 무변경 (영역 6)

- silent catch / console.error only / 실패→빈목록 / mutation 실패 후 성공 toast / 403→"데이터 없음" 패턴 전수 검색.
- 후보 전부 **정상 계약**으로 판명: RecruitmentExposure·SupplierContentApproval 은 오류 상태 + 재시도 노출("빈 목록 위장 안 함" 주석),
  EventOffer/ProductApplication/WorkingContent mutation 은 실패 시 `toast.error` + refetch. **판단 흐리는 offender 0.**
- 단 1건 minor: `ProductApplicationManagementConsole.loadStats` silent catch(통계 배지 fetch 실패 시 0 표시). 리스트 본문은 자체 오류 표면화 →
  판단 왜곡 아님, 저심각. 이미 정비된 Analytics·Community·StoreDetail·signage-usage 는 미접촉(WO 지시).

## 7. HOLD·정책 결정 항목

1. **working-content operator publish** (영역 5) — store-scoped 설계. 권한 확대 없이 HOLD.
2. **List runBulk confirm** (blog/pop/qr/video/multilingual ListPage) — `runBulk(ids,op,opts)` 공유 useCallback 상단의
   `window.confirm(opts.confirm)` 은 publish/archive/delete 다수 핸들러가 서로 다른 문구로 호출 → ConfirmActionDialog 전환은
   async/defer 재구조화 필요(STOP 조건: confirm 이 business logic 과 entangled). 같은 파일의 단건 발행 confirm 도 confirm 메커니즘
   일관성 위해 함께 후속 처리로 이관. → **의도적 잔존**.
3. **AuditLog entity 타입 union** — api-server `kpa-audit-log.entity.ts` 의 action_type union 이 원본 6키만 선언(신규는 `as any` write).
   본 WO는 frontend 라벨 커버리지 범위 → entity 타입 정합은 backend 후속(무변경).

## 8. 배포·실브라우저 smoke

- **typecheck**: web-kpa-society `tsc --noEmit` **0 error**. api-server 변경파일(operator-dashboard.service) **0**(잔존 11 error 전부 `src/scripts/*` 병렬 세션 일회성 스크립트, 서버 빌드 엔트리 무관 사전 baseline).
- **배포**: 커밋 `1fcb010f5` → Deploy Web Services **success** · Deploy API Server **success**.
- **API smoke**(배포 대시보드): KPI 라벨 라이브 정합 확인 — `content=공지사항/뉴스 발행 대기` · `signage-media=HQ 미디어 검수 대기` ·
  `signage-playlists=HQ 플레이리스트 검수 대기` · `event-offers=이벤트 오퍼 승인 대기` · `product-applications=공급 상품 신청 대기`.
  (ActionQueue 는 대기건 0 이라 비어있음 — 동일 배포 코드.)
- **실브라우저 smoke**(kpa-society.co.kr, 운영자 로그인):
  - AuditLog: 신규 라벨 8종 렌더(회원 정보 수정·콘텐츠 영구 삭제·강의 영구 삭제·자료 삭제·약국 정보 수정·매장 설정 변경 등),
    **raw UPPER action_type 잔존 false**.
  - 상품 신청 화면 H1 **"공급 상품 신청 관리"** true · **내부 문서경로 노출 false**.
  - 이벤트 오퍼 화면 H1 **"이벤트 오퍼 관리"** true.
  - 대시보드 KPI **"HQ 미디어 검수 대기"·"공지사항/뉴스 발행 대기"** true.
  - console 404 4건 = 배포 직후 asset/chunk 캐시 지연(기능 무관, 전 assertion PASS).
- ConfirmActionDialog 전환분은 tsc 0 + 기존 검증 완료 컴포넌트(@o4o/ui, CommunityManagementPage 패턴) 재사용 — defer 패턴 정합.

## 9. 잔여 alert/confirm/action key census

- **window.alert 실호출: 0** (operator/ 전 영역).
- **window.confirm/prompt 실호출: 11** — 전부 §7-2 HOLD 대상(blog/pop/qr/video/multilingual ListPage runBulk+단건발행 9,
  WorkingContent Edit/List 2). 그 외 0.
- action key: 라이브 14종 전부 라벨 매핑, code-emittable 16종 전부 매핑, 미래 신규 키 raw fallback.

## 10. 커밋 SHA

- 코드 `1fcb010f5`(14파일, +330/-60): AuditLogPage · operator-dashboard.service · EventOfferManagePage ·
  ProductApplicationManagementPage · ProductApplicationManagementConsole(operator-core-ui) · RecruitmentExposureApprovalPage ·
  OperatorContentHubPage · signage/TemplateDetailPage · OperatorStoreDetailPage · QualificationRequestsPage ·
  blog/pop/qr/video OperatorXWritePage.
- CHECK `(본 커밋)`.
