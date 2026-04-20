/**
 * KpaResource Entity
 * KPA Society 자료실
 *
 * WO-KPA-RESOURCE-LIBRARY-AI-WORKFLOW-V1
 *
 * 파일 / 텍스트 / 외부링크 자료를 단일 테이블로 통합.
 * 세션형 작업바구니 → AI 전달 워크플로우의 기반 데이터.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('kpa_resources')
@Index(['created_by', 'is_deleted'])
@Index(['type', 'is_deleted'])
export class KpaResource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  /** 텍스트 자료 본문 */
  @Column({ type: 'text', nullable: true })
  content: string | null;

  /** 파일/이미지 URL */
  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  file_url: string | null;

  /** 외부 URL 자료 */
  @Column({ name: 'external_url', type: 'varchar', length: 500, nullable: true })
  external_url: string | null;

  /** FILE | TEXT */
  @Column({ type: 'varchar', length: 20, default: 'TEXT' })
  type: string;

  /** 자유 태그 배열 */
  @Column({ type: 'jsonb', default: '[]' })
  tags: string[];

  /** 자료 역할 (선택) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  role: string | null;

  /** 메모 */
  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by: string | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  is_deleted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
