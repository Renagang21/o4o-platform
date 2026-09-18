/**
 * InMemory PromotionStore — Promotion Core 단위테스트용 (실 DB 없음)
 * WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1 §6.1
 *
 * write 호출 횟수를 세어 conflict / hold 에서 "write 0" 을 직접 검증할 수 있게 한다.
 */

import type { ProductIdentifierType } from '../../entities/ProductIdentifier.entity.js';
import {
  identifierKey,
  type NormalizedIdentifier,
  type PromotionCandidateState,
  type PromotionMasterFields,
  type PromotionMasterRef,
  type PromotionStore,
} from '../product-promotion.types.js';

export type MemMaster = PromotionMasterRef;
export interface MemIdentifier { masterId: string; type: string; normalized: string; value: string; isPrimary: boolean }
export interface MemCandidate extends PromotionCandidateState { reviewedBy?: string | null; approval?: Record<string, unknown> }

export class InMemoryPromotionStore implements PromotionStore {
  masters: MemMaster[] = [];
  identifiers: MemIdentifier[] = [];
  candidates = new Map<string, MemCandidate>();
  writes = { createMaster: 0, createIdentifier: 0, updateCandidate: 0 };
  reads = { byBarcode: 0, byIdentifier: 0, byNameManufacturer: 0 };
  private seq = 0;

  get writeCount(): number {
    return this.writes.createMaster + this.writes.createIdentifier + this.writes.updateCandidate;
  }

  addMaster(partial: Partial<MemMaster> & { id: string }): MemMaster {
    const m: MemMaster = {
      name: null, barcode: null, manufacturerName: null, specification: null, regulatoryType: 'GENERAL', drugCategory: null,
      ...partial,
    };
    this.masters.push(m);
    return m;
  }

  addIdentifier(masterId: string, type: string, normalized: string): void {
    this.identifiers.push({ masterId, type, normalized, value: normalized, isPrimary: false });
  }

  addCandidate(id: string, state: Partial<MemCandidate> = {}): void {
    this.candidates.set(id, { candidateStatus: 'pending', matchedProductMasterId: null, ...state });
  }

  async loadCandidateState(candidateId: string): Promise<PromotionCandidateState | null> {
    const c = this.candidates.get(candidateId);
    return c ? { candidateStatus: c.candidateStatus, matchedProductMasterId: c.matchedProductMasterId } : null;
  }

  async findMastersByBarcode(barcode: string): Promise<PromotionMasterRef[]> {
    this.reads.byBarcode += 1;
    return this.masters.filter((m) => m.barcode === barcode);
  }

  async findMastersByIdentifier(type: ProductIdentifierType, normalized: string): Promise<PromotionMasterRef[]> {
    this.reads.byIdentifier += 1;
    const ids = new Set(this.identifiers.filter((i) => i.type === type && i.normalized === normalized).map((i) => i.masterId));
    return this.masters.filter((m) => ids.has(m.id));
  }

  async findMastersByNameManufacturer(name: string, manufacturerName: string): Promise<PromotionMasterRef[]> {
    this.reads.byNameManufacturer += 1;
    const n = name.trim().toLowerCase();
    const mf = manufacturerName.trim().toLowerCase();
    return this.masters.filter(
      (m) => (m.name ?? '').trim().toLowerCase() === n && (m.manufacturerName ?? '').trim().toLowerCase() === mf,
    );
  }

  async findIdentifierKeysOfMaster(masterId: string): Promise<Set<string>> {
    return new Set(this.identifiers.filter((i) => i.masterId === masterId).map((i) => identifierKey(i.type, i.normalized)));
  }

  async createMaster(f: PromotionMasterFields): Promise<string> {
    this.writes.createMaster += 1;
    const id = `m-${++this.seq}`;
    this.masters.push({
      id, name: f.name, barcode: f.barcode, manufacturerName: f.manufacturerName, specification: f.specification,
      regulatoryType: f.regulatoryType, drugCategory: f.drugCategory,
    });
    return id;
  }

  async createIdentifier(masterId: string, id: NormalizedIdentifier): Promise<void> {
    this.writes.createIdentifier += 1;
    this.identifiers.push({ masterId, type: id.type, normalized: id.normalized, value: id.value, isPrimary: id.isPrimary });
  }

  async updateCandidate(
    candidateId: string,
    patch: { matchedProductMasterId: string; candidateStatus: 'approved_new_master' | 'matched'; reviewedBy: string | null; approval: Record<string, unknown> },
  ): Promise<void> {
    this.writes.updateCandidate += 1;
    const c = this.candidates.get(candidateId);
    if (!c) throw new Error('candidate missing in store');
    c.matchedProductMasterId = patch.matchedProductMasterId;
    c.candidateStatus = patch.candidateStatus;
    c.reviewedBy = patch.reviewedBy;
    c.approval = patch.approval;
  }
}
