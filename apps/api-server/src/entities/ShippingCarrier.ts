import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('shipping_carriers')
export class ShippingCarrier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  code!: string; // cj, hanjin, logen, koreanpost

  @Column({ type: 'varchar' })
  name!: string; // CJ대한통운, 한진택배, 로젠택배, 우체국택배

  @Column({ type: 'varchar', nullable: true })
  apiUrl?: string;

  @Column({ type: 'varchar', nullable: true })
  apiKey?: string;

  @Column({ type: 'varchar', nullable: true })
  apiSecret?: string;

  @Column({ type: 'varchar', nullable: true })
  webhookUrl?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  supportsCod!: boolean; // Cash on delivery

  @Column({ type: 'boolean', default: false })
  supportsInsurance!: boolean;

  @Column({ type: 'boolean', default: false })
  supportsInternational!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  baseRate?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  weightRate?: number; // Rate per kg

  @Column({ type: 'json', nullable: true })
  regionRates?: Record<string, number>; // Additional rates by region

  @Column({ type: 'json', nullable: true })
  settings?: Record<string, any>;

  @Column({ type: 'integer', default: 999 })
  priority!: number; // Lower number = higher priority

  @Column({ type: 'varchar', nullable: true })
  trackingUrlTemplate?: string; // e.g., https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo={{trackingNumber}}

  @Column({ type: 'json', nullable: true })
  workingHours?: {
    weekdays: { start: string; end: string };
    saturday?: { start: string; end: string };
    sunday?: { start: string; end: string };
  };

  @Column({ type: 'json', nullable: true })
  serviceAreas?: string[]; // List of supported regions

  @Column({ type: 'varchar', nullable: true })
  customerServicePhone?: string;

  @Column({ type: 'varchar', nullable: true })
  customerServiceEmail?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}