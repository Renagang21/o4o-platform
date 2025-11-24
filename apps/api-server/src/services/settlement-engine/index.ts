/**
 * Settlement Engine Module
 * R-8-8-2: SettlementEngine v1 - Automatic settlement generation
 *
 * Exports:
 * - SettlementEngine: Main facade for settlement generation
 * - SettlementCalculator: Converts OrderItems to SettlementItemInputs
 * - SettlementAggregator: Aggregates items into Settlements
 */

export { SettlementEngine } from './SettlementEngine.js';
export { SettlementCalculator, type SettlementItemInput } from './SettlementCalculator.js';
export { SettlementAggregator } from './SettlementAggregator.js';
