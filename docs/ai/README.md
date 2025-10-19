# O4O Platform AI Documentation

> **Purpose**: Reference documentation for AI-powered content editors to understand and use O4O Platform features.

---

## 📚 Documentation Structure

### Shortcode Documentation

| Document | Purpose | Use When |
|----------|---------|----------|
| [shortcode-system.md](./shortcode-system.md) | System architecture & technical overview | Understanding how shortcodes work |
| [shortcode-registry.md](./shortcode-registry.md) | Complete list of all shortcodes with attributes | Looking up available shortcodes |
| [shortcode-best-practices.md](./shortcode-best-practices.md) | Rules and guidelines for AI | Generating shortcode content |
| [shortcode-examples.md](./shortcode-examples.md) | Real-world usage examples | Finding patterns and combinations |

### Block Documentation

| Document | Purpose | Use When |
|----------|---------|----------|
| [AI_BLOCK_REFERENCE_SYSTEM.md](./AI_BLOCK_REFERENCE_SYSTEM.md) | Block system reference for AI | Understanding block architecture |
| [AI_DYNAMIC_REFERENCE_SUMMARY.md](./AI_DYNAMIC_REFERENCE_SUMMARY.md) | Dynamic content reference | Using CPT/ACF dynamic fields |

---

## 🎯 Quick Start for AI

### Working with Shortcodes

#### Step 1: Understand User Intent

Parse user request to determine what type of content they need:

```
User: "Show recent blog posts"
→ Intent: Display content
→ Category: Content shortcodes
→ Best match: [recent_posts]
```

#### Step 2: Look Up Shortcode

Refer to `shortcode-registry.md` to find:
- Shortcode name
- Required attributes
- Optional attributes with defaults
- Permission requirements

#### Step 3: Generate Shortcode

Follow rules in `shortcode-best-practices.md`:
- Include all required attributes
- Use sensible defaults for optional attributes
- Respect permission requirements
- Provide helpful notes

#### Step 4: Verify Pattern

Check `shortcode-examples.md` for similar use cases to ensure your output matches established patterns.

---

### Working with Blocks

Refer to `AI_BLOCK_REFERENCE_SYSTEM.md` for:
- Available block types
- Block attributes and configuration
- Block usage patterns

---

## 📦 AI가 참조하는 데이터베이스

AI 페이지 생성 시스템이 참조하는 데이터는 **두 가지 소스**가 있습니다.

### 실시간 데이터 (권장)

**위치**: API 서버
- `/apps/api-server/src/services/block-registry.service.ts`
- `/apps/api-server/src/services/shortcode-registry.service.ts`

**API 엔드포인트**:
- `GET /api/ai/blocks/reference` - 모든 블록 정보
- `GET /api/ai/shortcodes/reference` - 모든 숏코드 정보

**장점**:
- 항상 최신 데이터 제공
- 서버에서 동적으로 관리
- ETag 캐싱으로 성능 최적화
- 인증 및 권한 관리

**사용 방법**:
```typescript
// reference-fetcher.service.ts가 자동으로 처리
const reference = await referenceFetcher.fetchCompleteReference();
```

### 정적 문서 (백업/가이드)

**위치**: 이 폴더 (`/docs/ai/`)
- 숏코드: `shortcode-registry.md`
- 블록: `AI_BLOCK_REFERENCE_SYSTEM.md`

**용도**:
- AI 어시스턴트(Claude Code 등)용 가이드
- 서버 다운 시 폴백
- 개발자 레퍼런스

**작동 방식**:
```typescript
// 서버 실패 시 자동 폴백
try {
  return await this.fetchFromServer();
} catch (error) {
  console.warn('서버 실패 - 로컬 폴백 사용');
  return this.fetchLocalFallback();
}
```

### 더 자세한 정보

시스템 아키텍처 및 작동 원리는 [AI 기술 가이드](/docs/manual/ai-technical-guide.md)를 참조하세요.

---

## 🔍 Finding the Right Feature

### Shortcodes by Category

**Content**: `[recent_posts]`, `[author]`
**Media**: `[gallery]`, `[video]`
**E-commerce**: `[product]`, `[product_grid]`, `[add_to_cart]`, `[featured_products]`
**Forms**: `[form]`, `[view]`
**Dropshipping**: `[partner_*]`, `[supplier_*]`, `[seller_*]`
**Dynamic**: `[cpt_list]`, `[cpt_field]`, `[acf_field]`

### By User Role

**Public** (no login): Content, Media, E-commerce, Forms
**Partner**: Partner shortcodes
**Supplier**: Supplier shortcodes
**Seller**: Seller shortcodes
**Admin**: Admin shortcodes

---

## ✅ Validation Checklist

Before outputting content:

### For Shortcodes
- [ ] Shortcode exists in registry
- [ ] All required attributes are provided
- [ ] Attribute values are in correct format
- [ ] Permission requirements are met
- [ ] Shortcode makes sense in context
- [ ] Examples show similar usage patterns

### For Blocks
- [ ] Block type exists
- [ ] Block attributes are valid
- [ ] Block is appropriate for context
- [ ] Nested blocks (if any) are supported

---

## 🚀 Common Patterns

### Product Page (Shortcodes)
```
[product id="123" show_description="true"]
[product_grid category="related" limit="4"]
```

### Blog Homepage (Shortcodes)
```
[recent_posts limit="10" show_excerpt="true"]
```

### Partner Portal (Shortcodes)
```
[partner_dashboard]
[partner_products featured="true"]
[partner_commissions period="30d"]
```

### Contact Page (Shortcodes)
```
[form id="contact-form"]
```

---

## 🎓 Training Recommendations

### Shortcodes - Priority 1: Learn These First
1. `[product_grid]` - Most versatile e-commerce shortcode
2. `[recent_posts]` - Essential content shortcode
3. `[form]` - Required for user interaction
4. `[partner_dashboard]` - Complex but frequently used

### Shortcodes - Priority 2: Common Variants
1. `[product]` - Single product display
2. `[gallery]` - Image galleries
3. `[video]` - Video embeds
4. `[author]` - Author profiles

### Shortcodes - Priority 3: Advanced
1. `[cpt_list]` - Dynamic CPT display
2. `[partner_products]` - Partner-specific features
3. `[supplier_products]` - Supplier management

---

## 📊 Statistics

### Shortcodes
- **Total Shortcodes**: 19+
- **Categories**: 7
- **Permission Levels**: 4 (Public, Partner, Supplier, Seller/Admin)
- **Most Used**: `[product_grid]`, `[recent_posts]`, `[partner_dashboard]`

### Blocks
- See `AI_BLOCK_REFERENCE_SYSTEM.md` for block inventory

---

## 🔗 Related Documentation

### User Manuals
- **Shortcodes**: `/SHORTCODES.md` - End-user documentation
- **Blocks**: `/docs/manual/blocks-reference.md` - Block user guide

### Developer Guides
- **Package Source**: `/packages/shortcodes/` - Shortcode implementation
- **Block Development**: `/BLOCKS_DEVELOPMENT.md` - Block development guide

---

## 📞 Support

For questions or updates to this documentation:
- File an issue in the repository
- Contact the development team
- Refer to package source code for implementation details

---

**Version**: 2.0
**Last Updated**: 2025-10-19
**Maintained By**: O4O Platform Team
