/**
 * 노드 원장 소유 주체 키 (Phase D · V2 §3-1 · §9-2)
 *
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-D-EXECUTION-NODE-RUNTIME-STATE-COORDINATION-V1
 *
 * 실행 노드의 local.db 가 경험을 소유 주체(사용자 · 조직)별로 나눠 두도록 서버가 주는 키다.
 * 노드에는 원 사용자/조직 id 를 내려보내지 않는다 — `o_` + sha256("<scope>:<id>") 앞 32자.
 * 같은 소유 주체면 어느 노드에서든 같은 키, 다른 소유 주체면 다른 키다.
 */

import { createHash } from 'crypto';

export type NodeLedgerOwnerScope = 'USER' | 'ORGANIZATION';

export function nodeLedgerOwnerKey(scope: NodeLedgerOwnerScope, id: string): string {
  return `o_${createHash('sha256').update(`${scope}:${id}`).digest('hex').slice(0, 32)}`;
}
