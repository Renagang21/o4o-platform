import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NeturePartnershipRequest } from './NeturePartnershipRequest.entity';

@Entity('neture_partnership_products')
export class NeturePartnershipProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'partnership_request_id' })
  partnershipRequestId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  category: string;

  @ManyToOne(() => NeturePartnershipRequest, (request) => request.products, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'partnership_request_id' })
  partnershipRequest: NeturePartnershipRequest;
}
