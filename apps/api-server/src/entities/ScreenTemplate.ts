import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TemplateStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

@Entity('screen_templates')
export class ScreenTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'json' })
  layout!: {
    zones: Array<{
      id: string;
      name: string;
      type: 'video' | 'image';
      position: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      zIndex: number;
      isMain: boolean;
    }>;
    resolution: {
      width: number;
      height: number;
    };
  };

  @Column({
    type: 'enum',
    enum: TemplateStatus,
    default: TemplateStatus.ACTIVE
  })
  status!: TemplateStatus;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'varchar', nullable: true })
  previewImage?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Business logic methods
  isActive(): boolean {
    return this.status === TemplateStatus.ACTIVE;
  }

  getMainZone() {
    return this.layout.zones.find((zone: any) => zone.isMain);
  }

  getSubZones() {
    return this.layout.zones.filter((zone: any) => !zone.isMain);
  }

  getZoneById(zoneId: string) {
    return this.layout.zones.find((zone: any) => zone.id === zoneId);
  }
}