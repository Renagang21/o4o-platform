import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToMany
} from 'typeorm';
import { Role } from './Role';

@Entity('permissions')
@Index(['key'], { unique: true })
@Index(['category'])
@Index(['isActive'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Permission key (e.g., 'users.view', 'content.create')
  @Column({ type: 'varchar', length: 100, unique: true })
  key!: string;

  // Human-readable description
  @Column({ type: 'varchar', length: 255 })
  description!: string;

  // Permission category (e.g., 'users', 'content', 'admin')
  @Column({ type: 'varchar', length: 50 })
  category!: string;

  // Active status
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToMany('Role', 'permissions')
  roles?: Role[];

  // Helper methods
  static parseKey(key: string): { category: string; action: string } {
    const [category, action] = key.split('.');
    return { category, action };
  }

  getCategory(): string {
    return Permission.parseKey(this.key).category;
  }

  getAction(): string {
    return Permission.parseKey(this.key).action;
  }
}
