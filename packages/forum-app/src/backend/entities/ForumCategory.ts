import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';

@Entity('forum_category')
@Index(['isActive', 'sortOrder'])
@Index(['organizationId', 'isActive'])
export class ForumCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color?: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  requireApproval!: boolean;

  @Column({ type: 'enum', enum: ['all', 'member', 'business', 'admin'], default: 'all' })
  accessLevel!: string;

  @Column({ type: 'int', default: 0 })
  postCount!: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string;

  @Column({ name: 'is_organization_exclusive', type: 'boolean', default: false })
  isOrganizationExclusive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: any; // Type resolved at runtime via TypeORM

  @ManyToOne('Organization', { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: any; // Type will be resolved at runtime

  // Note: OneToMany relationship with ForumPost removed to prevent circular dependency
  // Use ForumPostRepository.find({ where: { categoryId: category.id } }) to get posts

  // Methods
  canUserAccess(userRole: string): boolean {
    if (!this.isActive) return false;
    
    switch (this.accessLevel) {
      case 'all':
        return true;
      case 'member':
        return ['customer', 'business', 'affiliate', 'admin', 'manager'].includes(userRole);
      case 'business':
        return ['business', 'affiliate', 'admin', 'manager'].includes(userRole);
      case 'admin':
        return ['admin', 'manager'].includes(userRole);
      default:
        return false;
    }
  }

  canUserPost(userRole: string): boolean {
    return this.canUserAccess(userRole);
  }

  incrementPostCount(): void {
    this.postCount++;
  }

  decrementPostCount(): void {
    this.postCount = Math.max(0, this.postCount - 1);
  }

  incrementCommentCount(): void {
    // 댓글 수는 별도로 관리하지 않음 (포스트 수만 관리)
  }

  decrementCommentCount(): void {
    // 댓글 수는 별도로 관리하지 않음 (포스트 수만 관리)
  }
}