/**
 * CareMessageService — 환자 ↔ 약사 메시지 CRUD
 * WO-O4O-CARE-QNA-SYSTEM-V1
 */

import type { DataSource, Repository } from 'typeorm';
import { CareMessage } from '../entities/care-message.entity.js';

export interface CreateMessageDto {
  patientId: string;
  pharmacyId: string;
  senderType: 'patient' | 'pharmacist';
  senderId: string;
  content: string;
  messageType?: 'text' | 'coaching_ref';
  coachingId?: string | null;
}

export class CareMessageService {
  private repo: Repository<CareMessage>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(CareMessage);
  }

  async createMessage(dto: CreateMessageDto): Promise<CareMessage> {
    const message = this.repo.create({
      patientId: dto.patientId,
      pharmacyId: dto.pharmacyId,
      senderType: dto.senderType,
      senderId: dto.senderId,
      content: dto.content,
      messageType: dto.messageType || 'text',
      coachingId: dto.coachingId || null,
      status: 'sent',
    });
    return this.repo.save(message);
  }

  async getThread(
    patientId: string,
    pharmacyId: string,
    limit = 50,
  ): Promise<CareMessage[]> {
    return this.repo.find({
      where: { patientId, pharmacyId },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async markAsRead(
    patientId: string,
    pharmacyId: string,
    readerType: 'patient' | 'pharmacist',
  ): Promise<number> {
    // reader가 patient이면 pharmacist가 보낸 메시지를 읽음 처리, 반대도 마찬가지
    const senderType = readerType === 'patient' ? 'pharmacist' : 'patient';
    const result = await this.dataSource.query(
      `UPDATE care_messages
       SET status = 'read', read_at = NOW()
       WHERE patient_id = $1 AND pharmacy_id = $2
         AND sender_type = $3 AND status = 'sent'`,
      [patientId, pharmacyId, senderType],
    );
    return result[1] ?? 0; // affected rows
  }

  async getUnreadCount(
    userId: string,
    userType: 'patient' | 'pharmacist',
    pharmacyId?: string | null,
  ): Promise<number> {
    // 본인이 받는 메시지 중 안읽은 수
    const senderType = userType === 'patient' ? 'pharmacist' : 'patient';
    const idColumn = userType === 'patient' ? 'patient_id' : 'pharmacy_id';
    const idValue = userType === 'patient' ? userId : pharmacyId;

    if (!idValue) return 0;

    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count
       FROM care_messages
       WHERE ${idColumn} = $1
         AND sender_type = $2
         AND status = 'sent'`,
      [idValue, senderType],
    );
    return rows[0]?.count ?? 0;
  }

  /** 약국 전체 안읽은 메시지 수 (환자→약사) */
  async getPharmacyUnreadCount(pharmacyId: string): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count
       FROM care_messages
       WHERE pharmacy_id = $1
         AND sender_type = 'patient'
         AND status = 'sent'`,
      [pharmacyId],
    );
    return rows[0]?.count ?? 0;
  }

  /** 환자별 안읽은 메시지 수 (약사 목록 배지용) */
  async getPharmacyUnreadByPatient(
    pharmacyId: string,
  ): Promise<Array<{ patientId: string; count: number }>> {
    return this.dataSource.query(
      `SELECT patient_id AS "patientId", COUNT(*)::int AS count
       FROM care_messages
       WHERE pharmacy_id = $1
         AND sender_type = 'patient'
         AND status = 'sent'
       GROUP BY patient_id`,
      [pharmacyId],
    );
  }
}
