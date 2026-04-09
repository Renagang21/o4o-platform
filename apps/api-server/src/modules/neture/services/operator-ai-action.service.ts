/**
 * Operator AI Action Recommendation Service
 *
 * WO-O4O-AI-ACTION-INTEGRATION-V2
 * WO-O4O-AI-ACTION-LLM-UPGRADE-V3
 *
 * 3-tier 구조: Rule → LLM → Fallback
 *
 * 1. Rule 기반 분석 (빠름, 결정적)
 * 2. Rule 결과가 충분하면(>=2) LLM skip
 * 3. Rule 부족 시 LLM 보완 호출
 * 4. LLM 실패 시 Rule 결과만 반환 (graceful fallback)
 *
 * 병합: type 기준 중복 제거, LLM 항목 보완 추가
 */

import { OperatorAiLlmService } from './operator-ai-llm.service.js';
import logger from '../../../utils/logger.js';

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
  private llmService = new OperatorAiLlmService();

  /**
   * Rule → LLM → Fallback 3-tier 추천 생성
   */
  async generateActions(ctx: OperatorContext): Promise<AiActionItem[]> {
    // 1. Rule 기반 (항상 실행, 빠름)
    const ruleActions = this.generateRuleActions(ctx);

    // 2. Rule 충분하면 LLM skip
    if (ruleActions.length >= 2) {
      return ruleActions;
    }

    // 3. LLM 보완 호출
    try {
      const llmActions = await this.llmService.generate(ctx);

      if (llmActions.length > 0) {
        // 병합: Rule 기존 type과 중복되지 않는 LLM 항목만 추가
        const ruleTypes = new Set(ruleActions.map((a) => a.type));
        const uniqueLlm = llmActions.filter((a) => !ruleTypes.has(a.type));
        const merged = [...ruleActions, ...uniqueLlm];

        logger.info(`[OperatorAiAction] Merged: rule=${ruleActions.length}, llm_new=${uniqueLlm.length}, total=${merged.length}`);
        return merged;
      }
    } catch (error) {
      // LLM 실패 → Rule fallback (이미 수집됨)
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn(`[OperatorAiAction] LLM fallback: ${msg}`);
    }

    // 4. Fallback: Rule 결과만 반환
    return ruleActions;
  }

  /**
   * Rule 기반 Action 생성 (결정적, 동기)
   */
  private generateRuleActions(ctx: OperatorContext): AiActionItem[] {
    const actions: AiActionItem[] = [];

    // WO-NETURE-CURATION-PHASE1-DECISION-PRESSURE-REMOVE-V1:
    // Rule A (큐레이션 부족) 제거 — 운영자에게 큐레이션 결정을 강요하지 않음

    // Rule B — 문의 지연
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

    // Rule C — 상품 승인 적체
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
