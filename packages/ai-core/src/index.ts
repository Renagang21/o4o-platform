/**
 * FROZEN CORE PACKAGE
 * Baseline: o4o-operator-os-baseline-v1
 * Structural changes require explicit Work Order.
 *
 * AI Core - Main Entry Point
 *
 * AI의 정책, 계약, 로그 기준을 정의하는 Core App입니다.
 * 공통 실행을 제공하며 업무 규칙과 권한·저장은 호스트/Extension에 위임합니다.
 *
 * @package @o4o/ai-core
 * @workorder WO-AI-CORE-APP-SCAFFOLD-V0
 *
 * @example
 * ```typescript
 * // Contracts
 * import { AiRequestContract, AiResponseContract } from '@o4o/ai-core/contracts';
 *
 * // Policies
 * import { AiPolicy, isAiFeatureAllowed } from '@o4o/ai-core/policies';
 *
 * // Logs
 * import { AiLogEntry, AiExplainability } from '@o4o/ai-core/logs';
 * ```
 */

// Re-export all modules
export * from './contracts/index.js';
export * from './policies/index.js';
export * from './ai-logs/index.js';
export * from './cards/index.js';
export * from './operations/index.js';

// AI Orchestration Layer (WO-PLATFORM-AI-ORCHESTRATION-LAYER-V1)
export * from './orchestration/index.js';
