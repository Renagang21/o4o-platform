/**
 * usePublishedPolicyDocument — 가입 화면용 published 정책 문서 식별자 조회 (공통)
 *
 * WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §9 · §11~§13
 *
 * 가입 화면은 "보여준 약관 그대로" 승낙이 저장되도록 published terms 의 `id`(policyDocumentId) 와 `version` 을
 * 알고 있어야 하고, 가입 요청에 `policyDocumentId` · `policyVersion` 으로 실어 보낸다(서버가 재검증).
 *
 *   - status 'ok'      → doc.id / doc.version 을 payload 에 싣는다.
 *   - status 'empty'   → 아직 게시 전(또는 이 서비스에 문서 없음). payload 에 싣지 않는다 — 서버도 요구하지 않는다.
 *   - status 'error'   → 조회 실패. 서버가 문서를 요구하면 TERMS_DOCUMENT_REQUIRED(400) 로 거부되므로
 *                        화면은 재시도 안내를 보여줄 수 있다(가입 버튼 자체를 막지는 않는다 — 게시 전 서비스 호환).
 *
 * 실제 HTTP 호출은 service 측 `loadPolicy` 주입(PolicyDocumentViewer 와 동일 계약).
 */

import { useEffect, useState } from 'react';
import type { PolicyDocumentDto } from './PolicyDocumentViewer';

export type PublishedPolicyDocument = PolicyDocumentDto & { id?: string; contentHash?: string };

export interface PublishedPolicyDocumentState {
  status: 'loading' | 'ok' | 'empty' | 'error';
  doc: PublishedPolicyDocument | null;
  /** 가입 payload 에 그대로 spread 한다. 문서가 없으면 {} */
  signupFields: { policyDocumentId?: string; policyVersion?: number };
}

export function usePublishedPolicyDocument(
  serviceKey: string,
  documentType: string,
  loadPolicy: (serviceKey: string, documentType: string) => Promise<PublishedPolicyDocument | null>,
): PublishedPolicyDocumentState {
  const [state, setState] = useState<PublishedPolicyDocumentState>({ status: 'loading', doc: null, signupFields: {} });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', doc: null, signupFields: {} });
    loadPolicy(serviceKey, documentType)
      .then((doc) => {
        if (cancelled) return;
        if (!doc || !doc.id) {
          setState({ status: 'empty', doc: null, signupFields: {} });
          return;
        }
        setState({ status: 'ok', doc, signupFields: { policyDocumentId: doc.id, policyVersion: doc.version } });
      })
      .catch(() => { if (!cancelled) setState({ status: 'error', doc: null, signupFields: {} }); });
    return () => { cancelled = true; };
  }, [serviceKey, documentType, loadPolicy]);

  return state;
}
