/**
 * Operator AI Action Recommendation Service
 *
 * WO-O4O-AI-ACTION-INTEGRATION-V2
 *
 * Rule 기반 AI 추천 레이어.
 * 기존 Action Queue 데이터(OperatorContext)를 분석하여
 * 우선순위·이유·추천 Action을 생성한다.
 *
 * 단계: Rule → (향후) LLM
 */

export interface OperatorContext {
  pendingApprovals: number;
  pendingSuppliers: number;
  uncuratedProducts: number;
  pendingInquiries: number;
  activeProducts: number;
  pendingRegs: number;
  partnerRequests: number;
}

export interface AiActionItem {
  id: string;
  source: 'AI';
  type: 'approval' | 'curation' | 'inquiry' | 'product';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  actionType: 'EXECUTE' | 'NAVIGATE';
  actionUrl: string;
  actionLabel: string;
  actionApi?: string;
  actionMethod?: string;
}

export class OperatorAiActionService {
  generateActions(ctx: OperatorContext): AiActionItem[] {
    const actions: AiActionItem[] = [];

    // Rule A — 큐레이션 부족: 승인 상품 대비 큐레이션 미등록 비율 높음
    if (ctx.uncuratedProducts >= 5) {
      actions.push({
        id: 'ai-curation',
        source: 'AI',
        type: 'curation',
        title: '상품 노출이 부족합니다',
        description: `큐레이션 미등록 ${ctx.uncuratedProducts}건 — 큐레이션을 추가하면 상품 노출이 증가합니다`,
        priority: 'high',
        confidence: 0.8,
        actionType: 'EXECUTE',
        actionUrl: '/operator/curation',
        actionLabel: '일괄 큐레이션',
        actionApi: '/neture/operator/actions/execute/curate-all',
        actionMethod: 'POST',
      });
    }

    // Rule B — 문의 지연: 미처리 문의 존재
    if (ctx.pendingInquiries > 0) {
      actions.push({
        id: 'ai-inquiry',
        source: 'AI',
        type: 'inquiry',
        title: '고객 응답이 지연되고 있습니다',
        description: `미처리 문의 ${ctx.pendingInquiries}건 — 빠른 응답이 전환율에 영향을 줍니다`,
        priority: 'high',
        confidence: 0.9,
        actionType: 'EXECUTE',
        actionUrl: '/operator/contact-messages',
        actionLabel: '일괄 확인처리',
        actionApi: '/neture/operator/actions/execute/inquiries-mark-read',
        actionMethod: 'POST',
      });
    }

    // Rule C — 상품 승인 적체: 승인 대기 상품이 쌓임
    if (ctx.pendingApprovals > 0 && ctx.activeProducts === 0) {
      actions.push({
        id: 'ai-product-activate',
        source: 'AI',
        type: 'product',
        title: '판매 가능한 상품이 없습니다',
        description: `승인 대기 ${ctx.pendingApprovals}건 — 상품을 승인해야 판매가 가능합니다`,
        priority: 'high',
        confidence: 1.0,
        actionType: 'EXECUTE',
        actionUrl: '/operator/product-service-approvals',
        actionLabel: '일괄 승인',
        actionApi: '/neture/operator/actions/execute/approve-pending-products',
        actionMethod: 'POST',
      });
    } else if (ctx.pendingApprovals >= 3) {
      actions.push({
        id: 'ai-product-backlog',
        source: 'AI',
        type: 'product',
        title: '상품 승인이 적체되고 있습니다',
        description: `승인 대기 ${ctx.pendingApprovals}건 — 빠른 처리가 공급사 만족도에 영향을 줍니다`,
        priority: 'medium',
        confidence: 0.7,
        actionType: 'EXECUTE',
        actionUrl: '/operator/product-service-approvals',
        actionLabel: '일괄 승인',
        actionApi: '/neture/operator/actions/execute/approve-pending-products',
        actionMethod: 'POST',
      });
    }

    // Rule D — 공급사 승인 지연
    if (ctx.pendingSuppliers >= 2) {
      actions.push({
        id: 'ai-supplier-delay',
        source: 'AI',
        type: 'approval',
        title: '공급사 온보딩이 지연되고 있습니다',
        description: `대기 ${ctx.pendingSuppliers}건 — 신규 공급사 활성화가 네트워크 확장에 필요합니다`,
        priority: 'medium',
        confidence: 0.75,
        actionType: 'NAVIGATE',
        actionUrl: '/operator/admin-suppliers',
        actionLabel: '공급사 관리',
      });
    }

    return actions;
  }
}
