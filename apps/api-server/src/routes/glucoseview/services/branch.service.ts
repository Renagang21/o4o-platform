/**
 * GlucoseView Branch Service
 *
 * Phase C-3: Pharmacist Membership - 지부/분회 관리
 */

import { DataSource, Repository } from 'typeorm';
import { GlucoseViewBranch, GlucoseViewChapter } from '../entities/index.js';
import type {
  BranchDto,
  ChapterDto,
  ListBranchesQueryDto,
  ListChaptersQueryDto,
} from '../dto/index.js';

export class BranchService {
  private branchRepository: Repository<GlucoseViewBranch>;
  private chapterRepository: Repository<GlucoseViewChapter>;

  constructor(dataSource: DataSource) {
    this.branchRepository = dataSource.getRepository(GlucoseViewBranch);
    this.chapterRepository = dataSource.getRepository(GlucoseViewChapter);
  }

  /**
   * 지부 목록 조회
   */
  async listBranches(query: ListBranchesQueryDto): Promise<BranchDto[]> {
    const qb = this.branchRepository.createQueryBuilder('branch');

    if (query.active_only !== false) {
      qb.where('branch.is_active = :isActive', { isActive: true });
    }

    qb.orderBy('branch.sort_order', 'ASC');

    const branches = await qb.getMany();

    // 분회 포함 여부
    if (query.include_chapters) {
      const branchIds = branches.map(b => b.id);
      const chapters = await this.chapterRepository
        .createQueryBuilder('chapter')
        .where('chapter.branch_id IN (:...branchIds)', { branchIds })
        .andWhere('chapter.is_active = :isActive', { isActive: true })
        .orderBy('chapter.sort_order', 'ASC')
        .getMany();

      const chaptersByBranch = new Map<string, GlucoseViewChapter[]>();
      chapters.forEach(ch => {
        const list = chaptersByBranch.get(ch.branch_id) || [];
        list.push(ch);
        chaptersByBranch.set(ch.branch_id, list);
      });

      return branches.map(branch => ({
        ...this.toBranchDto(branch),
        chapters: (chaptersByBranch.get(branch.id) || []).map(ch => this.toChapterDto(ch)),
      }));
    }

    return branches.map(branch => this.toBranchDto(branch));
  }

  /**
   * 지부 단일 조회
   */
  async getBranchById(id: string): Promise<BranchDto | null> {
    const branch = await this.branchRepository.findOne({
      where: { id },
      relations: ['chapters'],
    });

    if (!branch) return null;

    return {
      ...this.toBranchDto(branch),
      chapters: branch.chapters?.map(ch => this.toChapterDto(ch)),
    };
  }

  /**
   * 분회 목록 조회
   */
  async listChapters(query: ListChaptersQueryDto): Promise<ChapterDto[]> {
    const qb = this.chapterRepository.createQueryBuilder('chapter')
      .leftJoinAndSelect('chapter.branch', 'branch');

    if (query.branch_id) {
      qb.andWhere('chapter.branch_id = :branchId', { branchId: query.branch_id });
    }

    if (query.search) {
      qb.andWhere('chapter.name ILIKE :search', { search: `%${query.search}%` });
    }

    if (query.active_only !== false) {
      qb.andWhere('chapter.is_active = :isActive', { isActive: true });
    }

    qb.orderBy('branch.sort_order', 'ASC')
      .addOrderBy('chapter.sort_order', 'ASC');

    const chapters = await qb.getMany();

    return chapters.map(chapter => ({
      ...this.toChapterDto(chapter),
      branch: chapter.branch ? this.toBranchDto(chapter.branch) : undefined,
    }));
  }

  /**
   * 분회 단일 조회
   */
  async getChapterById(id: string): Promise<ChapterDto | null> {
    const chapter = await this.chapterRepository.findOne({
      where: { id },
      relations: ['branch'],
    });

    if (!chapter) return null;

    return {
      ...this.toChapterDto(chapter),
      branch: chapter.branch ? this.toBranchDto(chapter.branch) : undefined,
    };
  }

  private toBranchDto(branch: GlucoseViewBranch): BranchDto {
    return {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      sort_order: branch.sort_order,
      is_active: branch.is_active,
    };
  }

  private toChapterDto(chapter: GlucoseViewChapter): ChapterDto {
    return {
      id: chapter.id,
      branch_id: chapter.branch_id,
      name: chapter.name,
      code: chapter.code,
      sort_order: chapter.sort_order,
      is_active: chapter.is_active,
    };
  }
}
