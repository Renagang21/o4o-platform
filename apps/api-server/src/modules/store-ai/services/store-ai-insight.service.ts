import type { DataSource, Repository } from 'typeorm';
import { GeminiProvider } from '@o4o/ai-core';
import type { AIProviderConfig } from '@o4o/ai-core';
import { STORE_INSIGHT_SYSTEM } from '@o4o/ai-prompts/store';
import { StoreAiInsight } from '../entities/store-ai-insight.entity.js';
import { AiModelSetting } from '../../care/entities/ai-model-setting.entity.js';
import type { StoreAiSnapshot } from '../entities/store-ai-snapshot.entity.js';

/**
 * StoreAiInsightService — WO-O4O-STORE-HUB-AI-SUMMARY-V1
 *
 * 매장 스냅샷 데이터를 LLM으로 요약/이슈/액션 생성.
 *
 * 핵심 원칙:
 * - LLM = 설명 (운영 판단/자동 실행 금지)
 * - fire-and-forget: 실패해도 매장 데이터에 영향 없음
 * - snapshot 당 1회 호출 (dedup)
 * - 1회 retry (2초 delay) — Care AI 패턴 복제
 */

const RETRY_DELAY_MS = 2_000;
const MAX_ATTEMPTS = 2;

interface LlmResponse {
  summary: string;
  issues: Array<{ type: string; severity: string; message: string; metric?: string }>;
  actions: Array<{ label: string; priority: string; reason: string }>;
}

export class StoreAiInsightService {
  private insightRepo: Repository<StoreAiInsight>;
  private settingRepo: Repository<AiModelSetting>;
  private gemini: GeminiProvider;

  constructor(private dataSource: DataSource) {
    this.insightRepo = dataSource.getRepository(StoreAiInsight);
    this.settingRepo = dataSource.getRepository(AiModelSetting);
    this.gemini = new GeminiProvider();
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

      const config = await this.buildProviderConfig();

      if (!config.apiKey) {
        console.warn('[StoreAiInsight] No API key configured, skipping insight generation');
        return;
      }

      const userPrompt = this.buildUserPrompt(snapshot.data);

      // Retry loop
      let lastError: unknown = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const response = await this.gemini.complete(STORE_INSIGHT_SYSTEM, userPrompt, config);
          const parsed = JSON.parse(response.content) as LlmResponse;

          if (!parsed.summary) {
            console.error('[StoreAiInsight] Invalid LLM response: missing summary', {
              snapshotId: snapshot.id,
              content: response.content.slice(0, 200),
            });
            return;
          }

          const insight = this.insightRepo.create({
            snapshotId: snapshot.id,
            organizationId,
            summary: parsed.summary,
            issues: parsed.issues || [],
            actions: parsed.actions || [],
            model: response.model,
            promptTokens: response.promptTokens,
            completionTokens: response.completionTokens,
          });
          await this.insightRepo.save(insight);
          return; // success
        } catch (err) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);

          // Non-retryable
          if (msg.includes('not configured') || msg.includes('INVALID_ARGUMENT')) {
            console.error('[StoreAiInsight] non-retryable error:', { snapshotId: snapshot.id, error: msg });
            return;
          }

          // Retryable: timeout, 5xx, network, JSON parse
          if (attempt < MAX_ATTEMPTS) {
            console.warn(`[StoreAiInsight] attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS}ms:`, msg);
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          }
        }
      }

      // All attempts exhausted
      const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
      console.error('[StoreAiInsight] generation failed after all attempts:', {
        snapshotId: snapshot.id,
        organizationId,
        attempts: MAX_ATTEMPTS,
        lastError: errMsg,
      });
    } catch (error) {
      // Outer guard
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

  private async buildProviderConfig(): Promise<AIProviderConfig> {
    const setting = await this.settingRepo.findOne({ where: { service: 'store' } });
    const model = setting?.model || 'gemini-2.0-flash';
    const temperature = setting ? Number(setting.temperature) : 0.3;
    const maxTokens = setting?.maxTokens || 2048;

    let apiKey = '';
    try {
      const rows = await this.dataSource.query(
        `SELECT apikey FROM ai_settings WHERE provider = 'gemini' AND isactive = true LIMIT 1`,
      );
      if (rows[0]?.apikey) {
        apiKey = rows[0].apikey;
      }
    } catch {
      // DB read failed, fall through to env
    }

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY || '';
    }

    return { apiKey, model, temperature, maxTokens };
  }
}
