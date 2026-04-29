import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * WO-O4O-GUIDE-INLINE-EDIT-V1
 *
 * 가이드/서비스 페이지 본문 텍스트 오버라이드 저장소.
 * serviceKey + pageKey + sectionKey 로 unique 식별.
 */
@Entity('guide_contents')
export class GuideContent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'service_key', length: 100 })
  serviceKey!: string;

  @Column({ name: 'page_key', length: 300 })
  pageKey!: string;

  @Column({ name: 'section_key', length: 100 })
  sectionKey!: string;

  @Column({ type: 'text', default: '' })
  content!: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
