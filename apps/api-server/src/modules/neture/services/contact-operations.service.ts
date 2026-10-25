import type { DataSource } from 'typeorm';
import { NetureContactMessage } from '../entities/NetureContactMessage.entity.js';
import { OperationError, recordOperation } from '../../../services/operations/operation-audit.js';

/** Security telemetry and full entities never enter the daily operations response. */
export function contactDetail(m: NetureContactMessage) {
  return { id: m.id, contactType: m.contactType, name: m.name, email: m.email, phone: m.phone,
    subject: m.subject, message: m.message, status: m.status, adminNotes: m.adminNotes,
    createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString(), resolvedAt: m.resolvedAt?.toISOString() ?? null };
}
export async function updateOperatorContact(db: DataSource, id: string, actorId: string, body: any) {
  if (!['new', 'in_progress', 'resolved'].includes(body?.status) || typeof body?.adminNotes !== 'string' || [...body.adminNotes].length > 10000 || body.adminNotes.includes('\0') || typeof body?.expectedUpdatedAt !== 'string') {
    throw new OperationError(400, 'INVALID_CONTACT_UPDATE', '상태·내부 메모(10,000자 이하)·조회 시점을 확인해 주세요.');
  }
  return db.transaction(async manager => {
    const repo = manager.getRepository(NetureContactMessage);
    const message = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!message) throw new OperationError(404, 'NOT_FOUND', '문의를 찾을 수 없습니다.');
    if (message.updatedAt.toISOString() !== body.expectedUpdatedAt) throw new OperationError(409, 'CONTACT_CHANGED', '다른 처리가 반영됐습니다. 입력을 보관한 뒤 최신 내용을 다시 조회해 주세요.');
    const previousStatus = message.status;
    message.resolvedAt = body.status === 'resolved' ? message.resolvedAt ?? new Date() : null;
    message.status = body.status;
    message.adminNotes = body.adminNotes.trim() || null;
    const saved = await repo.save(message);
    await recordOperation(manager, 'neture', actorId, 'contact.operator.update', { contactId: id, previousStatus, status: saved.status, notesChanged: true });
    return contactDetail(saved);
  });
}
