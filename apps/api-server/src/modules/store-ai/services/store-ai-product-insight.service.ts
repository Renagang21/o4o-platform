import type { DataSource, Repository } from 'typeorm';
import { GeminiProvider } from '@o4o/ai-core';
import type { AIProviderConfig } from '@o4o/ai-core';
import { StoreAiProductInsight } from '../entities/store-ai-product-insight.entity.js';
import { AiModelSetting } from '../../care/entities/ai-model-setting.entity.js';
import type { StoreAiProductSnapshot } from '../entities/store-ai-product-snapshot.entity.js';

/**
 * StoreAiProductInsightService — WO-O4O-PRODUCT-STORE-AI-INSIGHT-V1
 *
 * 상품별 스냅샷 데이터를 LLM으로 요약/하이라이트/이슈/액션 생성.
 *
 * 핵심 원칙:
 * - LLM = 설명 (가격 조정/상품 삭제 등 자동 실행 금지)
 * - fire-and-forget: 실패해도 매장 데이터에 영향 없음
 * - org+date 당 1회 호출 (dedup)
 * - 1회 retry (2초 delay) — Store AI 패턴 복제
 */

const RETRY_DELAY_MS = 2_000;
const MAX_ATTEMPTS = 2;

const SYSTEM_PROMPT = `당신은 매장 상품별 판매 성과를 분석하여 설명하는 전문 도우미입니다.

역할:
- 각 상품의 QR 스캔, 주문, 매출, 전환율 데이터를 쉬운 한국어로 요약합니다.
- 성과가 우수하거나 주의가 필요한 상품을 식별합니다.
- 구체적인 행동 제안을 합니다.
- 자동으로 가격을 조정하거나, 상품을 삭제/비활성화하거나, 판단하지 않습니다. 설명과 제안만 합니다.

출력 형식 (반드시 아래 JSON만 출력):
{
  "summary": "전체 상품 성과 요약 (1~3문장, 한국어)",
  "productHighlights": [
    { "productId": "uuid", "productName": "상품명", "highlight": "주목할 점 설명", "metric": "핵심 지표 (예: 전환율 15.2%)" }
  ],
  "issues": [
    { "type": "conversion|exposure|revenue|inventory", "severity": "high|medium|low", "message": "이슈 설명", "productId": "uuid", "productName": "상품명" }
  ],
  "actions": [
    { "label": "행동 제안 (짧은 문구)", "priority": "high|medium|low", "reason": "이유 설명", "productId": "uuid" }
  ]
}

제약:
- 반드시 위 JSON 형식만 출력하세요. JSON 외의 텍스트를 포함하지 마세요.
- productHighlights는 0~5개, issues는 0~5개, actions는 0~5개로 제한하세요.
- 데이터가 부족하면 짧게 요약하고 "데이터가 더 쌓이면 정확한 분석이 가능합니다" 언급.
- 매출 금액은 원 단위로 표시하세요.
- 전환율 = (주문수 / QR스캔수) × 100 (QR스캔이 0이면 전환율 계산 불가 언급).`;

interface LlmResponse {
  summary: string;
  productHighlights: Array<{ productId: string; productName: string; highlight: string; metric?: string }>;
  issues: Array<{ type: string; severity: string; message: string; productId?: string; productName?: string }>;
  actions: Array<{ label: string; priority: string; reason: string; productId?: string }>;
}

export class StoreAiProductInsightService {
  private insightRepo: Repository<StoreAiProductInsight>;
  private settingRepo: Repository<AiModelSetting>;
  private gemini: GeminiProvider;

  constructor(private dataSource: DataSource) {
    this.insightRepo = dataSource.getRepository(StoreAiProductInsight);
    this.settingRepo = dataSource.getRepository(AiModelSetting);
    this.gemini = new GeminiProvider();
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

      const config = await this.buildProviderConfig();

      if (!config.apiKey) {
        console.warn('[StoreAiProductInsight] No API key configured, skipping insight generation');
        return;
      }

      const userPrompt = this.buildUserPrompt(snapshots);

      // Retry loop
      let lastError: unknown = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const response = await this.gemini.complete(SYSTEM_PROMPT, userPrompt, config);
          const parsed = JSON.parse(response.content) as LlmResponse;

          if (!parsed.summary) {
            console.error('[StoreAiProductInsight] Invalid LLM response: missing summary', {
              organizationId,
              content: response.content.slice(0, 200),
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
            console.error('[StoreAiProductInsight] non-retryable error:', { organizationId, error: msg });
            return;
          }

          // Retryable: timeout, 5xx, network, JSON parse
          if (attempt < MAX_ATTEMPTS) {
            console.warn(`[StoreAiProductInsight] attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS}ms:`, msg);
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          }
        }
      }

      // All attempts exhausted
      const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
      console.error('[StoreAiProductInsight] generation failed after all attempts:', {
        organizationId,
        attempts: MAX_ATTEMPTS,
        lastError: errMsg,
      });
    } catch (error) {
      // Outer guard
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
