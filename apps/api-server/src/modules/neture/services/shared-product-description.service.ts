/**
 * SharedProductDescriptionService — O4O 공용 상품설명 후보 풀 / canonical 대표 설명
 *
 * WO-O4O-PRODUCT-DESCRIPTION-SHARED-CANDIDATE-STORAGE-V1
 * 정책: docs/investigations/IR-O4O-PRODUCT-DESCRIPTION-SHARED-ASSET-AND-CANONICAL-DESCRIPTION-POLICY-V1.md
 *
 * - ProductMaster 기준 후보 저장/조회.
 * - canonical 대표 설명은 master 당 1개 (setCanonical 은 transaction 으로 기존 canonical 강등).
 * - soft delete 우선. product_ai_contents 는 건드리지 않는다.
 */

import type { DataSource, Repository } from 'typeorm';
import { SharedProductDescription } from '../entities/SharedProductDescription.entity.js';
import type {
  SharedProductDescriptionSourceType,
  SharedProductDescriptionStatus,
} from '../entities/SharedProductDescription.entity.js';

export interface CreateCandidateInput {
  masterId: string;
  content: string;
  summary?: string | null;
  sourceType: SharedProductDescriptionSourceType;
  sourceRefId?: string | null;
  language?: string | null;
  qualityScore?: string | number | null;
  createdBy?: string | null;
  /** 생성 직후 상태 (기본 candidate). canonical 은 setCanonical 경유 권장 */
  status?: SharedProductDescriptionStatus;
}

export class SharedProductDescriptionService {
  private repo: Repository<SharedProductDescription>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(SharedProductDescription);
  }

  /** master 의 후보 목록 (soft-deleted 제외). 기본적으로 hidden/deprecated 포함 — UI 에서 필터 */
  async listByMaster(masterId: string): Promise<SharedProductDescription[]> {
    return this.repo.find({
      where: { masterId },
      order: { status: 'ASC', updatedAt: 'DESC' },
    });
  }

  /** master 의 canonical 대표 설명 (없으면 null) */
  async getCanonical(masterId: string): Promise<SharedProductDescription | null> {
    return this.repo.findOne({ where: { masterId, status: 'canonical' } });
  }

  async getById(id: string): Promise<SharedProductDescription | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** 후보 생성 (기본 status='candidate') */
  async createCandidate(input: CreateCandidateInput): Promise<SharedProductDescription> {
    const entity = this.repo.create({
      masterId: input.masterId,
      content: input.content,
      summary: input.summary ?? null,
      sourceType: input.sourceType,
      sourceRefId: input.sourceRefId ?? null,
      language: input.language ?? 'ko',
      qualityScore:
        input.qualityScore === undefined || input.qualityScore === null
          ? null
          : String(input.qualityScore),
      status: input.status ?? 'candidate',
      createdBy: input.createdBy ?? null,
      updatedBy: input.createdBy ?? null,
    });
    return this.repo.save(entity);
  }

  /**
   * 선택 row 를 canonical 로 승격. 같은 master 의 기존 canonical 은 candidate 로 강등.
   * transaction 으로 partial-unique 충돌 없이 1개/master 보장.
   */
  async setCanonical(id: string, actorId?: string | null): Promise<SharedProductDescription> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(SharedProductDescription);
      const target = await repo.findOne({ where: { id } });
      if (!target) {
        throw new Error('SharedProductDescription not found');
      }
      if (target.deletedAt) {
        throw new Error('Cannot set a deleted description as canonical');
      }

      // 기존 canonical 강등 (대상 자신 제외)
      await repo
        .createQueryBuilder()
        .update(SharedProductDescription)
        .set({ status: 'candidate', updatedBy: actorId ?? null })
        .where('master_id = :masterId', { masterId: target.masterId })
        .andWhere('status = :status', { status: 'canonical' })
        .andWhere('id != :id', { id })
        .andWhere('deleted_at IS NULL')
        .execute();

      target.status = 'canonical';
      target.curatedBy = actorId ?? null;
      target.curatedAt = new Date();
      target.updatedBy = actorId ?? null;
      return repo.save(target);
    });
  }

  /** 상태 변경 (hidden / needs_review / deprecated / candidate). canonical 승격은 setCanonical 사용 */
  async setStatus(
    id: string,
    status: Exclude<SharedProductDescriptionStatus, 'canonical'>,
    actorId?: string | null,
  ): Promise<SharedProductDescription> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new Error('SharedProductDescription not found');
    }
    entity.status = status;
    entity.updatedBy = actorId ?? null;
    return this.repo.save(entity);
  }

  /** soft delete */
  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}
