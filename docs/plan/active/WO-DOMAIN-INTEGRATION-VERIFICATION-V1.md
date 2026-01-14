# Work Order: Domain Integration Verification V1

**Status**: ✅ COMPLETED
**Priority**: High
**Type**: Verification / Stability
**Created**: 2026-01-11
**Completed**: 2026-01-11
**Assignee**: Claude Code
**Parent Issue**: ESM Circular Dependency Resolution (COMPLETED)
**Result**: Phase 1 PASSED - ESM entity pattern verified in production

---

## 🎯 Objective

Verify that all domain services (Neture, Glycopharm, GlucoseView, Yaksa) operate correctly with the newly fixed ESM-compatible entity structure through **actual API flow testing**.

### Success Criteria

- All CRUD operations execute without entity loading errors
- Bidirectional relationships load correctly via TypeORM lazy loading
- No runtime circular dependency errors in production-like scenarios
- All domain-specific business logic functions as expected

---

## 📋 Background

### What Was Fixed

Phase 2 (ESM Circular Dependency Resolution) fixed 22 entity files:
- Cosmetics: 4 files
- Yaksa: 3 files
- Glycopharm: 5 files
- GlucoseView: 6 files
- Neture: 4 files

**Pattern Applied**:
```typescript
// Before (BROKEN)
import { RelatedEntity } from './related.entity.js';
@ManyToOne(() => RelatedEntity, (e) => e.property)

// After (FIXED)
import type { RelatedEntity } from './related.entity.js';
@ManyToOne('RelatedEntity', 'property')
```

### What Needs Verification

While **entity initialization** now succeeds (TypeORM AppDataSource loads without errors), we have NOT verified:
1. Actual query execution with relations
2. Service-level business logic compatibility
3. End-to-end API flow (create → read → join → delete)

---

## 🔍 Investigation Plan

### Phase 1: Entity Relation Loading Test

**Objective**: Verify TypeORM can load relationships correctly using string-based decorators.

**Test Cases**:

1. **Glycopharm Domain**
   ```typescript
   // Test: Load Pharmacy with Products
   const pharmacy = await pharmacyRepo.findOne({
     where: { id: testId },
     relations: ['products']
   });

   // Test: Load Product with Pharmacy (inverse)
   const product = await productRepo.findOne({
     where: { id: testId },
     relations: ['pharmacy']
   });
   ```

2. **GlucoseView Domain**
   ```typescript
   // Test: Load Branch with Chapters
   const branch = await branchRepo.findOne({
     where: { id: testId },
     relations: ['chapters']
   });

   // Test: Load Vendor with Connections
   const vendor = await vendorRepo.findOne({
     where: { id: testId },
     relations: ['connections']
   });
   ```

3. **Neture Domain**
   ```typescript
   // Test: Load Supplier with Products
   const supplier = await supplierRepo.findOne({
     where: { slug: 'test-supplier' },
     relations: ['products']
   });

   // Test: Load Partnership with Products
   const partnership = await partnershipRepo.findOne({
     where: { id: testId },
     relations: ['products']
   });
   ```

4. **Yaksa Domain**
   ```typescript
   // Test: Load Category with Posts
   const category = await categoryRepo.findOne({
     where: { slug: 'announcements' },
     relations: ['posts']
   });

   // Test: Load Post with Logs
   const post = await postRepo.findOne({
     where: { id: testId },
     relations: ['logs', 'category']
   });
   ```

**Expected Results**:
- All queries return data without errors
- Relations are loaded (not undefined)
- No circular dependency errors at runtime

---

### Phase 2: Service Logic Integration Test

**Objective**: Verify business logic operates correctly with new entity structure.

**Test Scenarios**:

1. **Neture P1 Integration (Read-Only Hub)**
   - Verify existing supplier/partnership data loads
   - Confirm product listings display correctly
   - Test search/filter operations
   - Validate Read-Only Hub identity (no commerce functions)

2. **Glycopharm Product Management**
   - Create pharmacy → Create product
   - Load pharmacy with products
   - Update product → Verify audit log creation
   - Delete product → Verify cascade behavior

3. **GlucoseView Application Workflow**
   - Submit application
   - Load application with User relation
   - Approve application → Create GlucoseView Pharmacy
   - Verify service enablement

4. **Yaksa Forum Operations**
   - Create category
   - Create post in category
   - Load category with posts
   - Update post → Verify log creation

**Expected Results**:
- All CRUD operations succeed
- Cascade deletes work as designed
- Audit logs are created correctly
- Soft FK references (user_id, pharmacy_id) work

---

### Phase 3: API Endpoint Validation

**Objective**: Verify end-to-end API flows using actual HTTP requests.

**Critical Endpoints to Test**:

1. **Neture**
   - `GET /neture/suppliers` - List suppliers
   - `GET /neture/suppliers/:slug` - Get supplier with products
   - `GET /neture/partnerships` - List partnerships
   - `GET /neture/partnerships/:id` - Get partnership with products

2. **Glycopharm**
   - `POST /glycopharm/products` - Create product
   - `GET /glycopharm/products/:id` - Get product with pharmacy
   - `GET /glycopharm/pharmacies/:id` - Get pharmacy with products
   - `DELETE /glycopharm/products/:id` - Delete product

3. **GlucoseView**
   - `GET /glucoseview/branches` - List branches with chapters
   - `GET /glucoseview/vendors/:id` - Get vendor with connections
   - `POST /glucoseview/applications` - Submit application
   - `GET /glucoseview/applications/:id` - Get application with user

4. **Yaksa**
   - `GET /yaksa/categories` - List categories
   - `GET /yaksa/posts?category_id=:id` - Get posts by category
   - `POST /yaksa/posts` - Create post
   - `PATCH /yaksa/posts/:id` - Update post (should create log)

**Verification Method**:
- Manual API testing with Postman/curl
- OR automated test script (Node.js fetch)
- OR Playwright-based integration test

**Expected Results**:
- All endpoints return 200/201/204 as appropriate
- Response data includes correctly loaded relations
- No 500 errors related to entity loading
- Console shows no TypeORM warnings

---

## 📝 Execution Steps

### Step 1: Create Test Script

```typescript
// test-domain-integration.mjs
import { AppDataSource } from './dist/database/connection.js';

async function testEntityRelations() {
  await AppDataSource.initialize();

  // Phase 1: Relation Loading Tests
  const results = {
    glycopharm: await testGlycopharmRelations(),
    glucoseview: await testGlucoseViewRelations(),
    neture: await testNetureRelations(),
    yaksa: await testYaksaRelations(),
  };

  console.log('Test Results:', JSON.stringify(results, null, 2));

  await AppDataSource.destroy();
}

testEntityRelations().catch(console.error);
```

### Step 2: Run Relation Tests

```bash
cd apps/api-server
node test-domain-integration.mjs
```

**Expected Output**:
```json
{
  "glycopharm": { "status": "PASS", "tests": 5 },
  "glucoseview": { "status": "PASS", "tests": 4 },
  "neture": { "status": "PASS", "tests": 3 },
  "yaksa": { "status": "PASS", "tests": 3 }
}
```

### Step 3: Service Logic Verification

For each domain:
1. Start API server: `pnpm run dev`
2. Execute service-specific test scenarios
3. Monitor console for TypeORM errors
4. Verify database state matches expectations

### Step 4: API Endpoint Verification

**Option A: Manual Testing**
```bash
# Test Neture Supplier with Products
curl http://localhost:4000/api/neture/suppliers/test-supplier

# Test Glycopharm Pharmacy with Products
curl http://localhost:4000/api/glycopharm/pharmacies/{id}

# Test Yaksa Category with Posts
curl http://localhost:4000/api/yaksa/categories/{slug}/posts
```

**Option B: Automated Test**
- Create Playwright test suite for critical flows
- Run once to verify all endpoints work
- Keep as regression test

### Step 5: Report Generation

Document findings in:
```
docs/reports/DOMAIN-INTEGRATION-VERIFICATION-RESULTS-V01.md
```

**Report Structure**:
```md
# Domain Integration Verification Results

## Executive Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Critical Issues: N

## Domain-by-Domain Results
### Glycopharm
- Entity Loading: ✅/❌
- Service Logic: ✅/❌
- API Endpoints: ✅/❌
- Issues Found: [list]

[... repeat for each domain ...]

## Recommendations
- [Issues requiring immediate fix]
- [Issues for future work]
- [Architectural improvements]

## Conclusion
[PASS/FAIL with justification]
```

---

## 🚨 Failure Criteria

**Stop and escalate if**:
- Any relation loading fails with entity errors
- Cascade deletes don't work as designed
- API returns 500 errors related to TypeORM
- Data corruption occurs during testing

**Minor issues (document but continue)**:
- Performance concerns with lazy loading
- Missing indexes
- Non-critical validation errors

---

## ✅ Definition of Done

- [ ] All entity relation loading tests pass
- [ ] All service logic tests pass
- [ ] All critical API endpoints return valid responses
- [ ] No TypeORM circular dependency errors in logs
- [ ] Verification report generated
- [ ] Any issues documented for follow-up
- [ ] API server runs stable for 5+ minutes without errors

---

## 📊 Risk Assessment

### Low Risk
- Entity initialization (already verified in Phase 2)
- Simple CRUD without relations

### Medium Risk
- Lazy loading with multiple levels of relations
- Cascade operations with soft FKs
- Audit log generation on entity changes

### High Risk
- Complex queries with multiple joins
- Concurrent operations on related entities
- Edge cases in business logic not covered by existing tests

---

## 🔄 Contingency Plan

**If critical failures are found**:

1. Isolate the failing domain
2. Add detailed logging to identify root cause
3. Verify entity decorator configuration
4. Check migration state matches entity definitions
5. Test with direct TypeORM query (bypass service layer)

**If issues are entity-related**:
- Revisit Phase 2 fixes for that domain
- Verify string-based decorator syntax is correct
- Check for typos in entity/property names

**If issues are service-related**:
- Problem is NOT from ESM fix
- Create separate work order for service fix
- Continue verification for other domains

---

## 📎 Related Documents

- `docs/reports/ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01.md` - Root cause analysis
- `docs/reports/STEP3-EXECUTION-RESULTS-V01.md` - Entity fix results
- `CLAUDE.md` - Platform constitution (will add ESM rules after verification)

---

## 🎯 Next Steps After Completion

**If PASS**:
1. Add ESM entity rules to CLAUDE.md (mandatory)
2. Close ESM circular dependency issue permanently
3. Proceed to feature development with confidence
4. Optional: Add CI lint rule to prevent violations

**If FAIL**:
1. Document failures in detail
2. Create targeted fix work orders
3. Re-run verification after fixes
4. Do NOT proceed to new features until stable

---

## Estimated Effort

- **Phase 1 (Entity Tests)**: 1-2 hours
- **Phase 2 (Service Tests)**: 2-3 hours
- **Phase 3 (API Tests)**: 1-2 hours
- **Reporting**: 1 hour

**Total**: 5-8 hours for comprehensive verification

---

**Work Order Ready for Execution**

Should I proceed with creating the test script for Phase 1?
