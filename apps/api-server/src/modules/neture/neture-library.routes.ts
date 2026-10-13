/**
 * Neture Library Routes
 *
 * 공급자 canonical 콘텐츠 원장(neture_supplier_library_items) CRUD API
 *
 * WO-O4O-NETURE-LIBRARY-FOUNDATION-V1
 * WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1 (2026-09-16):
 *   종전 "독립 도메인 — HUB/Signage/CMS 연동 없음" 은 폐기. 이 원장은 Supplier Content 의 단일 원천이며
 *   두 공식 제공 경로(ROLE-WORKSPACE-ARCHITECTURE §2-1)의 Supplier 측 계약이 여기 있다.
 *     - Supplier → Store Hub      : is_public=true 행을 Hub source adapter('supplier-library')가 조회
 *                                   (modules/hub-content/hub-content.service.ts). 별도 발송 없음.
 *     - Supplier → Service Operator: POST /library/:id/handoff { serviceKey } (아래).
 *   불변식: 소유 · 작성 · 수정은 Supplier 만 (producer=supplier). 특정 매장 대상 제공 경로 없음.
 */

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { NetureService } from './neture.service.js';
import { NetureLibraryService } from './services/neture-library.service.js';
import { AppDataSource } from '../../database/connection.js';
import { SupplierLibraryHandoffService } from './services/supplier-library-handoff.service.js';

import { createSupplierLibraryAccess } from './controllers/supplier-library/access.js';
import { createSupplierLibraryReadHandlers } from './controllers/supplier-library/read-handlers.js';
import { createSupplierLibraryWriteHandlers } from './controllers/supplier-library/write-handlers.js';
import { createSupplierLibraryHandoffHandlers } from './controllers/supplier-library/handoff-handlers.js';
const router: ExpressRouter = Router();
const netureService = new NetureService();
const libraryService = new NetureLibraryService(AppDataSource);
const handoffService = new SupplierLibraryHandoffService(AppDataSource);
const { requireActiveSupplier, requireLinkedSupplier } = createSupplierLibraryAccess(netureService);
const readHandlers = createSupplierLibraryReadHandlers(libraryService);
const writeHandlers = createSupplierLibraryWriteHandlers(libraryService);
const handoffHandlers = createSupplierLibraryHandoffHandlers(handoffService);

// ============================================================================
// Request Types
// ============================================================================

// ============================================================================
// Supplier Middleware (동일 패턴: neture.routes.ts lines 184-225)
// ============================================================================

/**
 * 쓰기 작업용 — ACTIVE 상태만 허용
 */

/**
 * 읽기 작업용 — 모든 상태 허용 (PENDING 포함)
 */

// ============================================================================
// Public Endpoint (인증 불필요)
// ============================================================================

router.get('/library/public', readHandlers.listPublic);

// ============================================================================
// Authenticated Endpoints
// ============================================================================

/**
 * GET /library — 내 자료 목록
 */
router.get('/library', requireAuth, requireLinkedSupplier, readHandlers.listOwn);

/**
 * GET /library/:id — 내 자료 단건 조회
 *
 * WO-O4O-NETURE-SUPPLIER-LIBRARY-EDIT-ITEM-LOOKUP-PAGINATION-V1:
 *   수정 화면이 목록(limit 100) 을 훑어 find(id) 하던 구조를 대체한다.
 *   `/library/public` 은 이 라우트보다 앞에 등록되어 있어 shadow 되지 않는다.
 *   read 정책은 목록(GET /library)과 동일하게 requireLinkedSupplier 를 쓴다.
 *   소유권은 service 의 `where: { id, supplierId }` 로 강제되며,
 *   타인 소유·미존재는 모두 404 로 숨긴다(PATCH/DELETE 와 동일 관례).
 */
/**
 * GET /library/handoff-targets — 콘텐츠를 제공할 수 있는 서비스 목록
 * WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1 §10: canonical catalog 에서 파생 (임의 키 없음).
 * `/library/:id` 보다 먼저 등록해야 'handoff-targets' 가 id 로 잡히지 않는다.
 */
router.get('/library/handoff-targets', requireAuth, requireLinkedSupplier, readHandlers.targets);

router.get('/library/:id', requireAuth, requireLinkedSupplier, readHandlers.getOwn);

/**
 * POST /library/:id/handoff — 서비스 운영자에게 제공 (Supplier → Service Operator)
 * WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1 §9:
 *   body { serviceKey } · ACTIVE 공급자 · 본인 소유 항목만. 제공 후 Supplier 책임 종료.
 */
router.post('/library/:id/handoff', requireAuth, requireActiveSupplier, handoffHandlers.handoff);

/**
 * POST /library — 자료 생성
 */
router.post('/library', requireAuth, requireActiveSupplier, writeHandlers.create);

/**
 * PATCH /library/:id — 자료 수정
 */
router.patch('/library/:id', requireAuth, requireActiveSupplier, writeHandlers.update);

/**
 * DELETE /library/:id — 자료 삭제
 */
router.delete('/library/:id', requireAuth, requireActiveSupplier, writeHandlers.remove);

export default router;
