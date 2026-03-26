/**
 * Action Queue Factory — buildActionQueue()
 *
 * WO-O4O-OPERATOR-ACTION-LAYER-V1
 *
 * 정의 배열 → 병렬 쿼리 → 우선순위 정렬 → AI 병합 → ActionQueueResponse
 * Neture operator-action-queue.controller.ts (lines 66–307) 패턴 추출.
 */

import type { DataSource } from 'typeorm';
import type {
  ActionQueueItem,
  ActionQueueResponse,
  ActionQueueSummary,
  ActionDefinition,
  AiRuleAction,
  ActionPriority,
} from './action-queue.types.js';
import logger from '../../utils/logger.js';

export async function buildActionQueue(
  dataSource: DataSource,
  definitions: ActionDefinition[],
  aiActions: AiRuleAction[],
  dismissedIds?: Set<string>,
): Promise<ActionQueueResponse> {
  // ── 1. 병렬 count 쿼리 실행 ──
  const results = await Promise.all(
    definitions.map(async (def) => {
      try {
        const rows = await dataSource.query(def.query, def.queryParams);
        return { def, cnt: rows[0]?.cnt || 0, oldest: rows[0]?.oldest || null };
      } catch (err: any) {
        logger.warn(`[ActionQueue] Query failed for ${def.id}: ${err.message}`);
        return { def, cnt: 0, oldest: null };
      }
    }),
  );

  // ── 2. SYSTEM items (count > 0, dismiss 필터) ──
  const systemItems: ActionQueueItem[] = results
    .filter((r) => r.cnt > 0)
    .filter((r) => !dismissedIds?.has(r.def.id))
    .map((r) => {
      const threshold = r.def.highThreshold ?? 5;
      const priority: ActionPriority =
        r.def.alwaysHigh || r.cnt >= threshold ? 'high' : 'medium';
      const item: ActionQueueItem = {
        id: r.def.id,
        source: 'SYSTEM',
        type: r.def.type,
        title: r.def.title,
        description: r.def.description,
        priority,
        count: r.cnt,
        oldestAt: r.oldest ? new Date(r.oldest).toISOString() : null,
        actionUrl: r.def.actionUrl,
        actionLabel: r.def.actionLabel,
        actionType: r.def.actionType,
      };
      if (r.def.actionApi) item.actionApi = r.def.actionApi;
      if (r.def.actionMethod) item.actionMethod = r.def.actionMethod;
      return item;
    });

  // ── 3. AI items (type 기준 중복 제거, SYSTEM 우선) ──
  const systemTypes = new Set(systemItems.map((i) => i.type));
  const aiItems: ActionQueueItem[] = aiActions
    .filter((a) => !systemTypes.has(a.type))
    .filter((a) => !dismissedIds?.has(a.id))
    .map((a) => ({
      id: a.id,
      source: 'AI' as const,
      type: a.type,
      title: a.title,
      description: a.description,
      priority: a.priority,
      count: 0,
      oldestAt: null,
      confidence: a.confidence,
      actionUrl: a.actionUrl,
      actionLabel: a.actionLabel,
      actionType: a.actionType,
      ...(a.actionApi ? { actionApi: a.actionApi } : {}),
      ...(a.actionMethod ? { actionMethod: a.actionMethod } : {}),
    }));

  // ── 4. 병합 + 정렬 (priority → confidence → count) ──
  const merged = [...systemItems, ...aiItems];
  const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  merged.sort((a, b) => {
    if (pOrder[a.priority] !== pOrder[b.priority])
      return pOrder[a.priority] - pOrder[b.priority];
    const confA = a.confidence ?? 0;
    const confB = b.confidence ?? 0;
    if (confA !== confB) return confB - confA;
    return b.count - a.count;
  });

  // ── 5. Summary ──
  const summary: ActionQueueSummary = {
    total: merged.reduce((sum, i) => sum + i.count, 0),
    high: merged
      .filter((i) => i.priority === 'high')
      .reduce((sum, i) => sum + i.count, 0),
    today: merged.filter((i) => {
      if (!i.oldestAt) return false;
      return new Date(i.oldestAt).toDateString() === new Date().toDateString();
    }).length,
    aiCount: merged.filter((i) => i.source === 'AI').length,
  };

  return { summary, items: merged };
}
