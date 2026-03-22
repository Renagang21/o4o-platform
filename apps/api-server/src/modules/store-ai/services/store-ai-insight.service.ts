import type { DataSource, Repository } from 'typeorm';
import { execute } from '@o4o/ai-core';
import { STORE_INSIGHT_SYSTEM } from '@o4o/ai-prompts/store';
import { StoreAiInsight } from '../entities/store-ai-insight.entity.js';
import type { StoreAiSnapshot } from '../entities/store-ai-snapshot.entity.js';
import { buildConfigResolver } from '../../../utils/ai-config-resolver.js';

/**
 * StoreAiInsightService — WO-O4O-STORE-HUB-AI-SUMMARY-V1
 *
 * 매장 스냅샷 데이터를 LLM으로 요약/이슈/액션 생성.
 *
 * 핵심 원칙:
 * - LLM = 설명 (운영 판단/자동 실행 금지)
 * - fire-and-forget: 실패해도 매장 데이터에 영향 없음
 * - snapshot 당 1회 호출 (dedup)
 * - execute() 내부 retry (2회, 2초 delay)
 */

interface LlmResponse {
  summary: string;
  issues: Array<{ type: string; severity: string; message: string; metric?: string }>;
  actions: Array<{ label: string; priority: string; reason: string }>;
}

export class StoreAiInsightService {
  private insightRepo: Repository<StoreAiInsight>;
  private configResolver: () => Promise<import('@o4o/ai-core').AIProviderConfig>;

  constructor(private dataSource: DataSource) {
    this.insightRepo = dataSource.getRepository(StoreAiInsight);
    this.configResolver = buildConfigResolver(dataSource, 'store');
  }

  /**
   * Fire-and-forget: generate + cache LLM insight for a snapshot.
   */
  async generateAndCache(
    snapshot: StoreAiSnapshot,
    organizationId: string,
  ): Promise<void> {
    try {
      // Dedup: 이 snapshot에 대해 이미 insight가 있으면 skip
      const existing = await this.insightRepo.findOne({
        where: { snapshotId: snapshot.id },
        select: ['id'],
      });
      if (existing) {
        return;
      }

      const userPrompt = this.buildUserPrompt(snapshot.data);

      const result = await execute({
        systemPrompt: STORE_INSIGHT_SYSTEM,
        userPrompt,
        config: this.configResolver,
        meta: { service: 'store', callerName: 'StoreAiInsightService' },
      });
      const parsed = JSON.parse(result.content) as LlmResponse;

      if (!parsed.summary) {
        console.error('[StoreAiInsight] Invalid LLM response: missing summary', {
          snapshotId: snapshot.id,
          content: result.content.slice(0, 200),
        });
        return;
      }

      const insight = this.insightRepo.create({
        snapshotId: snapshot.id,
        organizationId,
        summary: parsed.summary,
        issues: parsed.issues || [],
        actions: parsed.actions || [],
        model: result.model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      });
      await this.insightRepo.save(insight);
    } catch (error) {
      // Quiet fail: LLM 실패가 매장 데이터에 영향 없음
      console.error('[StoreAiInsight] unexpected error:', error);
    }
  }

  /**
   * Get latest cached insight for an organization.
   */
  async getLatestInsight(organizationId: string): Promise<StoreAiInsight | null> {
    return this.insightRepo.findOne({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  private buildUserPrompt(data: Record<string, unknown>): string {
    const parts: string[] = [];
    const d = data as any;

    if (d.orders) {
      parts.push(`[주문 현황 (최근 ${d.periodDays || 7}일)]`);
      parts.push(`- 총 주문: ${d.orders.totalOrders}건`);
      parts.push(`- 총 매출: ${Number(d.orders.totalRevenue).toLocaleString()}원`);
      parts.push(`- 평균 주문가: ${Number(d.orders.avgOrderValue).toLocaleString()}원`);
      parts.push(`- 오늘 주문: ${d.orders.todayOrders}건 (${Number(d.orders.todayRevenue).toLocaleString()}원)`);
    }

    if (d.qrScans) {
      parts.push(`\n[QR 스캔]`);
      parts.push(`- 기간 내 스캔: ${d.qrScans.totalScans}회`);
      parts.push(`- 오늘 스캔: ${d.qrScans.todayScans}회`);
    }

    if (d.products) {
      parts.push(`\n[상품]`);
      parts.push(`- 전체 상품: ${d.products.totalProducts}개`);
      parts.push(`- 활성 상품: ${d.products.activeProducts}개`);
      if (d.products.byService && Object.keys(d.products.byService).length > 0) {
        parts.push(`- 서비스별: ${JSON.stringify(d.products.byService)}`);
      }
    }

    if (d.channels) {
      parts.push(`\n[채널]`);
      parts.push(`- 활성 채널: ${d.channels.activeChannels}개`);
      if (d.channels.details && d.channels.details.length > 0) {
        for (const ch of d.channels.details) {
          parts.push(`  - ${ch.type}: ${ch.status} (${ch.count}개)`);
        }
      }
    }

    return parts.join('\n');
  }
}
