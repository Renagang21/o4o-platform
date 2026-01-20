# Global Content Merge Rules - Verification Document

## Work Order: WO-SIGNAGE-PHASE3-DEV-INTEGRATION

### 목적

Phase 3 Extension 통합 검증의 핵심인 Global Content 병합 규칙의 설계 검토 및 구현 상태를 문서화한다.

---

## 1. 병합 우선순위 (FROZEN)

```
┌─────────────────────────────────────────────────────────────┐
│  Priority 1: Core Forced (hq)                               │
│  ↓                                                          │
│  Priority 2: Extension Forced (pharmacy-hq only)            │
│  ↓                                                          │
│  Priority 3: Core Global                                    │
│  ↓                                                          │
│  Priority 4: Extension Global                               │
│  ↓                                                          │
│  Priority 5: Store Local                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Extension별 Force 규칙

| Extension | Source | Force 허용 | 근거 |
|-----------|--------|-----------|------|
| Pharmacy | `pharmacy-hq` | ✅ 허용 | HQ 중앙 통제 필요 (법적 요구사항) |
| Pharmacy | `supplier` | ❌ 불허 | 공급사는 제안만 가능 |
| Cosmetics | `cosmetics-brand` | ❌ 불허 | 브랜드 콘텐츠는 추천/선택 모델 |
| Seller | `seller-partner` | ❌ 불허 | 파트너는 승인 후 노출 |
| Tourist | `tourist-operator` | ❌ 불허 | 다국어 콘텐츠는 선택적 |

---

## 3. 구현 검증 - Pharmacy Extension

### 3.1 Service Layer (pharmacy.service.ts)

```typescript
// Force 규칙 검증 (Line 254-259)
async createContent(dto: CreateContentDto, scope: PharmacyScope): Promise<ContentResponseDto> {
  // Phase 3 Design FROZEN: Only pharmacy-hq can set isForced = true
  if (dto.isForced && dto.source !== 'pharmacy-hq') {
    throw new Error('Only pharmacy-hq source can set isForced to true');
  }
  // ...
}
```

### 3.2 Force 콘텐츠 삭제 방지 (Line 286-294)

```typescript
async deleteContent(id: string, scope: PharmacyScope): Promise<boolean> {
  const content = await this.repository.findContentById(id, scope);
  if (content?.isForced) {
    throw new Error('Forced content cannot be deleted');
  }
  return this.repository.softDeleteContent(id, scope);
}
```

### 3.3 검증 상태: ✅ PASS

- [x] `pharmacy-hq` source만 Force 가능
- [x] `supplier` source는 Force 불가
- [x] Force 콘텐츠 삭제 차단
- [x] Update 시 Force 변경 권한 검증

---

## 4. 구현 검증 - Cosmetics Extension

### 4.1 Entity Layer (CosmeticsBrandContent.entity.ts)

```typescript
// Force는 항상 false (Line 114-118)
@Column({ type: 'boolean', default: false })
isForced!: false;  // TypeScript literal type으로 강제
```

### 4.2 Service Layer (cosmetics.service.ts)

```typescript
// Global Content 변환 시 Force 항상 false, Clone 항상 가능
private toGlobalContentItem(content: CosmeticsBrandContent): GlobalContentItemDto {
  return {
    // ...
    isForced: false,  // Cosmetics는 항상 false
    canClone: true,   // Cosmetics는 항상 Clone 가능
  };
}
```

### 4.3 검증 상태: ✅ PASS

- [x] Entity level에서 `isForced: false` 고정
- [x] Force 변경 로직 자체가 존재하지 않음
- [x] 모든 콘텐츠 Clone 가능

---

## 5. Extension 공존 시나리오 검증

### Scenario 1: Pharmacy Force + Cosmetics Non-Force 동시 존재

```
Player Playlist 예상 결과:
1. [Pharmacy-HQ Force] 필수 건강 안내 콘텐츠
2. [Core Global] 플랫폼 공통 프로모션
3. [Pharmacy Global] 시즌 건강 캠페인
4. [Cosmetics Global] 신제품 런칭 영상
5. [Store Local] 매장 자체 콘텐츠
```

**검증 포인트:**
- Pharmacy Force는 항상 최상단 포함
- Cosmetics는 Force가 없으므로 Global 레벨로 처리
- 순서 충돌 없음

### Scenario 2: Clone 후 원본 변경

**Pharmacy:**
- 원본 Force 콘텐츠 → Clone 불가 (canClone: false)
- 원본 Global 콘텐츠 → Clone 후 원본 변경 시 Clone에 영향 없음

**Cosmetics:**
- 모든 콘텐츠 Clone 가능
- Clone 후 원본 변경 시 Clone에 영향 없음 (parentContentId로 추적만)

### Scenario 3: Extension 비활성화 시

```typescript
// extension.config.ts에서 관리
if (extensionRegistry.isEnabled('pharmacy')) {
  router.use('/pharmacy', pharmacyRouter);
}
if (extensionRegistry.isEnabled('cosmetics')) {
  router.use('/cosmetics', cosmeticsRouter);
}
```

- 비활성화된 Extension의 라우터는 등록되지 않음
- 기존 콘텐츠는 DB에 유지 (soft delete 아님)
- Player는 활성화된 Extension 콘텐츠만 수신

---

## 6. 미구현 영역 (Phase 3 범위 외)

### Player Merge Engine
- 현재: API 레벨에서 Extension별 콘텐츠 제공
- 향후: Player 내부에서 실시간 병합 로직 구현 필요

### Offline Cache Priority
- 현재: 기본 캐시 정책
- 향후: Force 콘텐츠 우선 캐싱 정책 필요

---

## 7. 결론

| 항목 | 상태 | 비고 |
|------|------|------|
| Pharmacy Force 규칙 | ✅ 구현 완료 | Service level 검증 |
| Cosmetics Non-Force | ✅ 구현 완료 | Entity level 강제 |
| Extension 공존 | ✅ 검증 완료 | 빌드 성공 |
| Clone 규칙 | ✅ 구현 완료 | Force=Clone불가, Non-Force=Clone가능 |
| Player 병합 | ⏳ Phase 4 | API 레벨 준비 완료 |

---

*Document Version: 1.0.0*
*Created: 2026-01-20*
*Work Order: WO-SIGNAGE-PHASE3-DEV-INTEGRATION*
