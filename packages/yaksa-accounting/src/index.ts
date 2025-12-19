/**
 * @o4o/yaksa-accounting
 *
 * Digital Cashbook for Yaksa Division/Branch Office Expenses
 * (지부/분회 사무실 운영비 디지털 출납 기록장)
 *
 * Phase 1: Expense Entry & Cashbook Core
 *
 * === 정체성 고정 ===
 * - ERP 아님 ❌
 * - 복식부기 아님 ❌
 * - 세무/급여 시스템 아님 ❌
 * - 단식 기록 + 집계 + 출력 ⭕
 */

// Manifest
export { manifest } from './manifest';

// Lifecycle
export { install, activate, deactivate } from './lifecycle';
export { getEntities } from './lifecycle/install';

// Backend
export * from './backend';
