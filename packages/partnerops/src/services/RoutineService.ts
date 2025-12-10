/**
 * Routine Service
 *
 * 파트너 루틴(콘텐츠) 관리 서비스
 */

import type { DataSource } from 'typeorm';

export interface PartnerRoutine {
  id: string;
  partnerId: string;
  title: string;
  description?: string;
  content: string;
  products: string[]; // 연결된 상품 ID 목록
  status: 'draft' | 'published' | 'archived';
  viewCount: number;
  clickCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoutineDto {
  title: string;
  description?: string;
  content: string;
  products?: string[];
}

export interface UpdateRoutineDto {
  title?: string;
  description?: string;
  content?: string;
  products?: string[];
  status?: 'draft' | 'published' | 'archived';
}

export class RoutineService {
  constructor(private readonly dataSource?: DataSource) {}

  /**
   * 루틴 목록 조회
   */
  async list(tenantId: string, partnerId: string, filters?: { status?: string }): Promise<PartnerRoutine[]> {
    if (!this.dataSource) {
      return [];
    }

    try {
      let query = `
        SELECT id, partner_id as "partnerId", title, description, content,
               products, status, view_count as "viewCount", click_count as "clickCount",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM partnerops_routines
        WHERE partner_id = $1 AND tenant_id = $2
      `;
      const params: any[] = [partnerId, tenantId];

      if (filters?.status) {
        query += ` AND status = $3`;
        params.push(filters.status);
      }

      query += ` ORDER BY created_at DESC`;

      const result = await this.dataSource.query(query, params);
      return result.map((r: any) => ({
        ...r,
        products: r.products || [],
      }));
    } catch (error) {
      console.error('RoutineService list error:', error);
      return [];
    }
  }

  /**
   * 루틴 상세 조회
   */
  async detail(tenantId: string, id: string): Promise<PartnerRoutine | null> {
    if (!this.dataSource) {
      return null;
    }

    try {
      const result = await this.dataSource.query(
        `SELECT id, partner_id as "partnerId", title, description, content,
                products, status, view_count as "viewCount", click_count as "clickCount",
                created_at as "createdAt", updated_at as "updatedAt"
         FROM partnerops_routines
         WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      if (!result[0]) return null;
      return {
        ...result[0],
        products: result[0].products || [],
      };
    } catch (error) {
      console.error('RoutineService detail error:', error);
      return null;
    }
  }

  /**
   * 루틴 상세 조회 (별칭)
   */
  async getById(tenantId: string, id: string): Promise<PartnerRoutine | null> {
    return this.detail(tenantId, id);
  }

  /**
   * 루틴 생성
   */
  async create(tenantId: string, partnerId: string, dto: CreateRoutineDto): Promise<PartnerRoutine> {
    if (!this.dataSource) {
      return this.createEmptyRoutine(partnerId, dto);
    }

    try {
      const result = await this.dataSource.query(
        `INSERT INTO partnerops_routines
         (tenant_id, partner_id, title, description, content, products, status,
          view_count, click_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'draft', 0, 0, NOW(), NOW())
         RETURNING id, partner_id as "partnerId", title, description, content,
                   products, status, view_count as "viewCount", click_count as "clickCount",
                   created_at as "createdAt", updated_at as "updatedAt"`,
        [tenantId, partnerId, dto.title, dto.description || null, dto.content, JSON.stringify(dto.products || [])]
      );
      return {
        ...result[0],
        products: result[0].products || [],
      };
    } catch (error) {
      console.error('RoutineService create error:', error);
      return this.createEmptyRoutine(partnerId, dto);
    }
  }

  /**
   * 루틴 수정
   */
  async update(tenantId: string, id: string, dto: UpdateRoutineDto): Promise<PartnerRoutine> {
    if (!this.dataSource) {
      throw new Error('DataSource not available');
    }

    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (dto.title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(dto.title);
      }
      if (dto.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(dto.description);
      }
      if (dto.content !== undefined) {
        updates.push(`content = $${paramIndex++}`);
        values.push(dto.content);
      }
      if (dto.products !== undefined) {
        updates.push(`products = $${paramIndex++}`);
        values.push(JSON.stringify(dto.products));
      }
      if (dto.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(dto.status);
      }

      updates.push(`updated_at = NOW()`);
      values.push(id, tenantId);

      const result = await this.dataSource.query(
        `UPDATE partnerops_routines
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
         RETURNING id, partner_id as "partnerId", title, description, content,
                   products, status, view_count as "viewCount", click_count as "clickCount",
                   created_at as "createdAt", updated_at as "updatedAt"`,
        values
      );
      return {
        ...result[0],
        products: result[0].products || [],
      };
    } catch (error) {
      console.error('RoutineService update error:', error);
      throw error;
    }
  }

  /**
   * 루틴 삭제
   */
  async delete(tenantId: string, id: string): Promise<boolean> {
    if (!this.dataSource) {
      return false;
    }

    try {
      await this.dataSource.query(
        `DELETE FROM partnerops_routines WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      return true;
    } catch (error) {
      console.error('RoutineService delete error:', error);
      return false;
    }
  }

  private createEmptyRoutine(partnerId: string, dto: CreateRoutineDto): PartnerRoutine {
    return {
      id: '',
      partnerId,
      title: dto.title,
      description: dto.description,
      content: dto.content,
      products: dto.products || [],
      status: 'draft',
      viewCount: 0,
      clickCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export const routineService = new RoutineService();
export default routineService;
