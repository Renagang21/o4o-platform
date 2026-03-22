import type { DataSource, Repository } from 'typeorm';
import { execute } from '@o4o/ai-core';
import { STORE_PRODUCT_INSIGHT_SYSTEM } from '@o4o/ai-prompts/store';
import { StoreAiProductInsight } from '../entities/store-ai-product-insight.entity.js';
import type { StoreAiProductSnapshot } from '../entities/store-ai-product-snapshot.entity.js';
import { buildConfigResolver } from '../../../utils/ai-config-resolver.js';

/**
 * StoreAiProductInsightService — WO-O4O-PRODUCT-STORE-AI-INSIGHT-V1
 *
 * 상품별 스냅샷 데이터를 LLM으로 요약/하이라이트/이슈/액션 생성.
 *
 * 핵심 원칙:
 * - LLM = 설명 (가격 조정/상품 삭제 등 자동 실행 금지)
 * - fire-and-forget: 실패해도 매장 데이터에 영향 없음
 * - org+date 당 1회 호출 (dedup)
 * - execute() 내부 retry (2회, 2초 delay)
 */

interface LlmResponse {
  summary: string;
  productHighlights: Array<{ productId: string; productName: string; highlight: string; metric?: string }>;
  issues: Array<{ type: string; severity: string; message: string; productId?: string; productName?: string }>;
  actions: Array<{ label: string; priority: string; reason: string; productId?: string }>;
}

export class StoreAiProductInsightService {
  private insightRepo: Repository<StoreAiProductInsight>;
  private configResolver: () => Promise<import('@o4o/ai-core').AIProviderConfig>;

  constructor(private dataSource: DataSource) {
    this.insightRepo = dataSource.getRepository(StoreAiProductInsight);
    this.configResolver = buildConfigResolver(dataSource, 'store');
  }

  /**
   * Fire-and-forget: generate + cache LLM product insight for a snapshot batch.
   */
  async generateAndCache(
    snapshots: StoreAiProductSnapshot[],
    organizationId: string,
  ): Promise<void> {
    try {
      if (snapshots.length === 0) {
        return;
      }

      const today = new Date().toISOString().slice(0, 10);

      // Dedup: 오늘 이 조직에 대해 이미 insight가 있으면 skip
      const existing = await this.insightRepo.findOne({
        where: { organizationId, snapshotDate: today },
        select: ['id'],
      });
      if (existing) {
        return;
      }

      const userPrompt = this.buildUserPrompt(snapshots);

      const result = await execute({
        systemPrompt: STORE_PRODUCT_INSIGHT_SYSTEM,
        userPrompt,
        config: this.configResolver,
        meta: { service: 'store', callerName: 'StoreAiProductInsightService' },
      });
      const parsed = JSON.parse(result.content) as LlmResponse;

      if (!parsed.summary) {
        console.error('[StoreAiProductInsight] Invalid LLM response: missing summary', {
          organizationId,
          content: result.content.slice(0, 200),
        });
        return;
      }

      const insight = this.insightRepo.create({
        organizationId,
        snapshotDate: today,
        summary: parsed.summary,
        productHighlights: parsed.productHighlights || [],
        issues: parsed.issues || [],
        actions: parsed.actions || [],
        model: result.model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      });
      await this.insightRepo.save(insight);
    } catch (error) {
      // Quiet fail: LLM 실패가 매장 데이터에 영향 없음
      console.error('[StoreAiProductInsight] unexpected error:', error);
    }
  }

  /**
   * Get latest cached product insight for an organization.
   */
  async getLatestInsight(organizationId: string): Promise<StoreAiProductInsight | null> {
    return this.insightRepo.findOne({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  private buildUserPrompt(snapshots: StoreAiProductSnapshot[]): string {
    const parts: string[] = [];
    const periodDays = snapshots[0]?.periodDays || 7;

    parts.push(`[상품 성과 분석 (최근 ${periodDays}일, 총 ${snapshots.length}개 상품)]`);
    parts.push('');

    // 전체 요약 지표
    let totalQrScans = 0;
    let totalOrders = 0;
    let totalRevenue = 0;
    for (const s of snapshots) {
      totalQrScans += s.qrScans;
      totalOrders += s.orders;
      totalRevenue += Number(s.revenue);
    }
    parts.push(`[전체 요약]`);
    parts.push(`- 총 QR 스캔: ${totalQrScans}회`);
    parts.push(`- 총 주문: ${totalOrders}건`);
    parts.push(`- 총 매출: ${totalRevenue.toLocaleString()}원`);
    parts.push(`- 전체 전환율: ${totalQrScans > 0 ? ((totalOrders / totalQrScans) * 100).toFixed(1) : 'N/A'}%`);
    parts.push('');

    // 상품별 상세
    parts.push(`[상품별 상세]`);
    for (const s of snapshots) {
      parts.push(`- ${s.productName} (ID: ${s.productId})`);
      parts.push(`  QR스캔: ${s.qrScans}회 | 주문: ${s.orders}건 | 매출: ${Number(s.revenue).toLocaleString()}원 | 전환율: ${Number(s.conversionRate).toFixed(1)}%`);
    }

    return parts.join('\n');
  }
}
