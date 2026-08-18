import { DataSource, Repository, Like } from 'typeorm';
import { Organization } from '../entities/Organization.js';
import { OrganizationMember } from '../entities/OrganizationMember.js';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  ListOrganizationDto,
} from '../types/dtos.js';

/**
 * OrganizationService
 *
 * 조직 관리 핵심 서비스
 */
export class OrganizationService {
  private organizationRepo: Repository<Organization>;
  private memberRepo: Repository<OrganizationMember>;

  constructor(private dataSource: DataSource) {
    this.organizationRepo = dataSource.getRepository(Organization);
    this.memberRepo = dataSource.getRepository(OrganizationMember);
  }

  /**
   * 조직 생성
   *
   * parentId 기반으로 level/path를 자동 계산합니다.
   */
  async createOrganization(dto: CreateOrganizationDto): Promise<Organization> {
    // 1. 코드 중복 검사
    const existing = await this.organizationRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new Error(`Organization code "${dto.code}" already exists`);
    }

    // 2. parentId 유효성 검사
    let parent: Organization | null = null;
    if (dto.parentId) {
      parent = await this.organizationRepo.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new Error(`Parent organization "${dto.parentId}" not found`);
      }

      // 자기 자신을 상위 조직으로 지정 불가
      if (parent.id === dto.parentId) {
        throw new Error('Cannot set self as parent organization');
      }
    }

    // 3. level/path 자동 계산
    const level = this.calculateLevel(parent);
    const path = this.calculatePath(parent, dto.code);

    // 4. 조직 생성
    const org = new Organization();
    org.name = dto.name;
    org.code = dto.code;
    org.type = dto.type;
    org.parentId = dto.parentId;
    org.level = level;
    org.path = path;
    org.metadata = dto.metadata;
    org.isActive = true;
    org.childrenCount = 0;

    const saved = await this.organizationRepo.save(org);

    // 5. 상위 조직의 childrenCount 업데이트
    if (parent) {
      await this.organizationRepo.update(
        { id: parent.id },
        { childrenCount: parent.childrenCount + 1 }
      );
    }

    return saved;
  }

  /**
   * 조직 수정
   *
   * name, metadata, isActive만 수정 가능 (code, type, parentId는 불변)
   */
  async updateOrganization(
    id: string,
    dto: UpdateOrganizationDto
  ): Promise<Organization> {
    const org = await this.organizationRepo.findOne({ where: { id } });
    if (!org) {
      throw new Error(`Organization "${id}" not found`);
    }

    // 이름 수정
    if (dto.name !== undefined) {
      org.name = dto.name;
    }

    // metadata 병합 (기존 값 유지)
    if (dto.metadata !== undefined) {
      org.metadata = {
        ...org.metadata,
        ...dto.metadata,
      };
    }

    // 활성 여부 수정
    if (dto.isActive !== undefined) {
      org.isActive = dto.isActive;
    }

    return await this.organizationRepo.save(org);
  }

  /**
   * 조직 삭제
   *
   * 하위 조직이나 소속 멤버가 있으면 삭제 불가
   *
   * WO-O4O-KPA-STORE-ORPHAN-SLUG-INTEGRITY-CLEANUP-V1 §4
   *   organizations 를 hard delete 하면 이 조직을 가리키던 매장 slug
   *   (`platform_store_slugs.store_id`, `platform_store_slug_history.store_id`) 가
   *   그대로 남아 orphan 이 된다. 두 테이블에는 FK 가 없어 DB 가 막아 주지 않는다
   *   (같은 계열의 `organization_service_enrollments` 는 FK ON DELETE CASCADE 라 자동 정리된다).
   *
   *   orphan slug 는 조회 경로 대부분에서 404 로 끝나지만, UNIQUE(slug) 네임스페이스를
   *   영구 점유하고 store-policy 경로에서는 404 대신 403 을 만든다.
   *   → 조직 삭제와 같은 트랜잭션에서 slug 잔재를 함께 정리한다.
   *
   *   organization-core 는 platform-core 에 의존하지 않으므로 entity import 없이
   *   `to_regclass` 로 테이블 존재를 확인한 뒤 raw SQL 로만 접근한다
   *   (해당 테이블이 없는 배포에서도 조직 삭제가 깨지지 않는다).
   */
  async deleteOrganization(id: string): Promise<void> {
    const org = await this.organizationRepo.findOne({ where: { id } });
    if (!org) {
      throw new Error(`Organization "${id}" not found`);
    }

    // 1. 하위 조직 체크
    if (org.childrenCount > 0) {
      throw new Error(
        `Cannot delete organization with ${org.childrenCount} child organizations`
      );
    }

    // 2. 소속 멤버 체크
    const memberCount = await this.memberRepo.count({
      where: { organizationId: id, leftAt: null as any },
    });
    if (memberCount > 0) {
      throw new Error(
        `Cannot delete organization with ${memberCount} active members`
      );
    }

    await this.dataSource.transaction(async (manager) => {
      // 3. 삭제 전 상위 조직의 childrenCount 감소
      if (org.parentId) {
        const parent = await manager.getRepository(Organization).findOne({
          where: { id: org.parentId },
        });
        if (parent) {
          await manager.getRepository(Organization).update(
            { id: parent.id },
            { childrenCount: Math.max(0, parent.childrenCount - 1) }
          );
        }
      }

      // 4. 매장 slug 잔재 정리 (FK 부재 보완 — 위 doc comment 참조)
      for (const table of ['platform_store_slugs', 'platform_store_slug_history']) {
        const exists = await manager.query(
          `SELECT to_regclass($1) IS NOT NULL AS present`,
          [`public.${table}`]
        );
        if (exists?.[0]?.present) {
          await manager.query(`DELETE FROM ${table} WHERE store_id = $1`, [id]);
        }
      }

      // 5. 삭제
      await manager.getRepository(Organization).delete({ id });
    });
  }

  /**
   * 조직 상세 조회
   */
  async getOrganization(
    id: string,
    options?: {
      includeParent?: boolean;
      includeChildren?: boolean;
      includeMemberCount?: boolean;
    }
  ): Promise<Organization & { memberCount?: number }> {
    const qb = this.organizationRepo.createQueryBuilder('org');

    if (options?.includeParent) {
      qb.leftJoinAndSelect('org.parent', 'parent');
    }

    if (options?.includeChildren) {
      qb.leftJoinAndSelect('org.children', 'children');
    }

    qb.where('org.id = :id', { id });

    const org = await qb.getOne();
    if (!org) {
      throw new Error(`Organization "${id}" not found`);
    }

    // 멤버 수 조회
    if (options?.includeMemberCount) {
      const memberCount = await this.memberRepo.count({
        where: { organizationId: id, leftAt: null as any },
      });
      return { ...org, memberCount };
    }

    return org;
  }

  /**
   * 조직 목록 조회
   */
  async listOrganizations(filter: ListOrganizationDto = {}): Promise<{
    items: Organization[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.organizationRepo.createQueryBuilder('org');

    // 조직 유형 필터
    if (filter.type) {
      qb.andWhere('org.type = :type', { type: filter.type });
    }

    // 상위 조직 필터 (하위 조직만 조회)
    if (filter.parentId) {
      qb.andWhere('org.parentId = :parentId', { parentId: filter.parentId });
    }

    // 활성 여부 필터
    if (filter.isActive !== undefined) {
      qb.andWhere('org.isActive = :isActive', { isActive: filter.isActive });
    }

    // 검색어 (조직명/코드)
    if (filter.search) {
      qb.andWhere('(org.name LIKE :search OR org.code LIKE :search)', {
        search: `%${filter.search}%`,
      });
    }

    // 페이지네이션
    const page = filter.page || 1;
    const limit = Math.min(filter.limit || 20, 100); // 최대 100개
    const offset = (page - 1) * limit;

    // 정렬: level → name
    qb.orderBy('org.level', 'ASC').addOrderBy('org.name', 'ASC');

    // 총 개수
    const total = await qb.getCount();

    // 페이지네이션 적용
    qb.skip(offset).take(limit);

    const items = await qb.getMany();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * 하위 조직 조회 (재귀)
   *
   * path LIKE 방식으로 모든 하위 조직을 조회합니다.
   */
  async getDescendants(
    organizationId: string,
    options?: {
      maxDepth?: number;
      includeInactive?: boolean;
    }
  ): Promise<Organization[]> {
    const org = await this.organizationRepo.findOne({
      where: { id: organizationId },
    });
    if (!org) {
      throw new Error(`Organization "${organizationId}" not found`);
    }

    const qb = this.organizationRepo.createQueryBuilder('org');

    // path LIKE 방식으로 하위 조직 조회
    qb.where('org.path LIKE :path', { path: `${org.path}/%` });

    // 최대 깊이 제한
    if (options?.maxDepth !== undefined) {
      qb.andWhere('org.level <= :maxLevel', {
        maxLevel: org.level + options.maxDepth,
      });
    }

    // 활성 여부
    if (!options?.includeInactive) {
      qb.andWhere('org.isActive = :isActive', { isActive: true });
    }

    // 정렬
    qb.orderBy('org.level', 'ASC').addOrderBy('org.name', 'ASC');

    return await qb.getMany();
  }

  /**
   * 조직 트리 구조 빌드
   *
   * 전체 조직을 계층 구조로 반환합니다.
   */
  async buildTree(): Promise<Organization[]> {
    const all = await this.organizationRepo.find({
      where: { isActive: true },
      order: { level: 'ASC', name: 'ASC' },
    });

    const map = new Map<string, Organization & { children: Organization[] }>();
    const roots: (Organization & { children: Organization[] })[] = [];

    // 1. Map 생성
    for (const org of all) {
      map.set(org.id, { ...org, children: [] });
    }

    // 2. 계층 구조 구성
    for (const org of all) {
      const node = map.get(org.id)!;
      if (org.parentId) {
        const parent = map.get(org.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * level 자동 계산
   */
  private calculateLevel(parent: Organization | null): number {
    if (!parent) {
      return 0; // 최상위
    }
    return parent.level + 1;
  }

  /**
   * path 자동 계산
   */
  private calculatePath(parent: Organization | null, code: string): string {
    const normalizedCode = code.toLowerCase();
    if (!parent) {
      return `/${normalizedCode}`; // 최상위
    }
    return `${parent.path}/${normalizedCode}`;
  }
}
