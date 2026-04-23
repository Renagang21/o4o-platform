import { DataSource, Repository } from 'typeorm';
import {
  SignagePlaylist,
  SignageMedia,
} from '@o4o-apps/digital-signage-core/entities';
import type { GlobalContentQueryDto, ScopeFilter } from '../dto/index.js';

export class SignageGlobalContentRepository {
  private playlistRepo: Repository<SignagePlaylist>;
  private mediaRepo: Repository<SignageMedia>;

  constructor(private dataSource: DataSource) {
    this.playlistRepo = dataSource.getRepository(SignagePlaylist);
    this.mediaRepo = dataSource.getRepository(SignageMedia);
  }

  async findGlobalPlaylists(
    query: GlobalContentQueryDto,
    scope: ScopeFilter,
  ): Promise<{ data: SignagePlaylist[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.playlistRepo.createQueryBuilder('playlist');

    qb.where('playlist.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    qb.andWhere("playlist.scope = 'global'");
    qb.andWhere('playlist.deletedAt IS NULL');

    if (query.source) {
      qb.andWhere('playlist.source = :source', { source: query.source });
    } else {
      qb.andWhere("playlist.source IN ('hq', 'supplier', 'community')");
    }

    if (query.search) {
      qb.andWhere('(playlist.name ILIKE :search OR playlist.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    if (sortBy === 'likeCount' || sortBy === 'downloadCount') {
      qb.orderBy(`playlist.${sortBy}`, sortOrder);
    } else {
      qb.orderBy(`playlist.${sortBy}`, sortOrder);
    }

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findGlobalMedia(
    query: GlobalContentQueryDto,
    scope: ScopeFilter,
  ): Promise<{ data: SignageMedia[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.mediaRepo.createQueryBuilder('media');

    qb.where('media.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    qb.andWhere("media.scope = 'global'");
    qb.andWhere('media.deletedAt IS NULL');
    qb.andWhere('media.status = :status', { status: 'active' });

    if (query.source) {
      qb.andWhere('media.source = :source', { source: query.source });
    } else {
      qb.andWhere("media.source IN ('hq', 'supplier', 'community')");
    }

    if (query.mediaType) {
      qb.andWhere('media.mediaType = :mediaType', { mediaType: query.mediaType });
    }

    if (query.tags && query.tags.length > 0) {
      qb.andWhere('media.tags && :tags', { tags: query.tags });
    }

    if (query.search) {
      qb.andWhere('(media.name ILIKE :search OR media.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`media.${sortBy}`, sortOrder);

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findPlaylistByIdGlobal(id: string, serviceKey: string): Promise<SignagePlaylist | null> {
    return this.playlistRepo.findOne({
      where: {
        id,
        serviceKey,
      },
      relations: ['items', 'items.media'],
    });
  }

  async findMediaByIdGlobal(id: string, serviceKey: string): Promise<SignageMedia | null> {
    return this.mediaRepo.findOne({
      where: {
        id,
        serviceKey,
      },
    });
  }

  async incrementPlaylistDownloadCount(playlistId: string, serviceKey: string): Promise<void> {
    await this.playlistRepo
      .createQueryBuilder()
      .update(SignagePlaylist)
      .set({ downloadCount: () => '"downloadCount" + 1' })
      .where('id = :id AND "serviceKey" = :serviceKey', { id: playlistId, serviceKey })
      .execute();
  }

  async incrementPlaylistLikeCount(playlistId: string, serviceKey: string): Promise<void> {
    await this.playlistRepo
      .createQueryBuilder()
      .update(SignagePlaylist)
      .set({ likeCount: () => '"likeCount" + 1' })
      .where('id = :id AND "serviceKey" = :serviceKey', { id: playlistId, serviceKey })
      .execute();
  }
}
