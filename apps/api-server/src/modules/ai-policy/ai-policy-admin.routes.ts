/**
 * AI LLM Policy Admin Routes — WO-O4O-AI-POLICY-SYSTEM-V1
 *
 * Scope 기반 LLM 정책 CRUD + 캐시 무효화.
 *
 * GET  /api/ai/admin/llm-policies             — 전체 정책 목록
 * GET  /api/ai/admin/llm-policies/:scope       — 단일 정책 조회
 * PUT  /api/ai/admin/llm-policies/:scope       — 정책 수정 (partial)
 * POST /api/ai/admin/llm-policies/cache/invalidate — 캐시 강제 초기화
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { DataSource } from 'typeorm';
import { AiLlmPolicy } from './entities/ai-llm-policy.entity.js';
import type { AiPolicyExecutorService } from './ai-policy-executor.service.js';

// 허용된 업데이트 필드
const ALLOWED_FIELDS = new Set([
  'provider', 'model', 'temperature', 'maxTokens',
  'topP', 'topK', 'timeoutMs', 'responseMode',
  'fallbackProvider', 'fallbackModel', 'isEnabled',
  'retryMax', 'retryDelayMs',
]);

export function createLlmPolicyAdminRouter(
  dataSource: DataSource,
  policyExecutor: AiPolicyExecutorService,
): Router {
  const router = Router();

  // GET / — 전체 정책 목록
  router.get('/', async (_req, res: Response) => {
    try {
      const repo = dataSource.getRepository(AiLlmPolicy);
      const policies = await repo.find({ order: { scope: 'ASC' } });
      return res.json({ success: true, data: policies });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'LLM 정책 목록 조회 실패',
      });
    }
  });

  // GET /:scope — 단일 정책 조회
  router.get('/:scope', async (req, res: Response) => {
    try {
      const { scope } = req.params;
      const repo = dataSource.getRepository(AiLlmPolicy);
      const policy = await repo.findOne({ where: { scope } });

      if (!policy) {
        return res.status(404).json({
          success: false,
          error: `Scope '${scope}' not found`,
        });
      }

      return res.json({ success: true, data: policy });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'LLM 정책 조회 실패',
      });
    }
  });

  // PUT /:scope — 정책 수정 (partial update)
  router.put('/:scope', async (req, res: Response) => {
    try {
      const { scope } = req.params;
      const repo = dataSource.getRepository(AiLlmPolicy);
      const policy = await repo.findOne({ where: { scope } });

      if (!policy) {
        return res.status(404).json({
          success: false,
          error: `Scope '${scope}' not found`,
        });
      }

      // Filter to allowed fields only
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (ALLOWED_FIELDS.has(key)) {
          updates[key] = value;
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update',
        });
      }

      Object.assign(policy, updates);
      const saved = await repo.save(policy);

      // Invalidate cache for this scope
      policyExecutor.invalidateCache(scope);

      return res.json({
        success: true,
        data: saved,
        message: `Scope '${scope}' updated`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'LLM 정책 수정 실패',
      });
    }
  });

  // POST /cache/invalidate — 캐시 강제 초기화
  router.post('/cache/invalidate', async (req, res: Response) => {
    try {
      const { scope } = req.body || {};
      policyExecutor.invalidateCache(scope || undefined);

      return res.json({
        success: true,
        message: scope ? `Cache invalidated for '${scope}'` : 'All caches invalidated',
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || '캐시 초기화 실패',
      });
    }
  });

  return router;
}
