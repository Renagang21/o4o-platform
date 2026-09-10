/**
 * StorePopV2Page (KPA adapter) — WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1
 *
 * 화면 본체는 `@o4o/store-ui-core` 의 공통 POP V2 Core 다.
 * 이 파일은 accent / 템플릿 / notify / api 를 주입하고 목록↔편집 전환만 담당한다.
 * PH adapter 도 같은 Core 를 같은 방식으로 쓴다 — 서비스별 본체 복제 없음.
 *
 * 기존 `StorePopPage`(/pharmacy/marketing/pop) 는 그대로 둔다.
 * 과거 산출물 이력(store_execution_assets usage_type='pop')도 건드리지 않는다.
 */

import { useState } from 'react';
import { toast } from '@o4o/error-handling';
import {
  StorePopV2EditorView,
  StorePopV2ListView,
  usePopV2Handoff,
  type PopV2Document,
  type PopV2TemplateOption,
} from '@o4o/store-ui-core';
import { popV2Api } from '../../api/popV2';

const ACCENT = { color: '#0ea5e9', softBg: '#f0f9ff' };

// 기존 POP 템플릿 id 를 그대로 쓴다 — 신규 어휘를 만들지 않는다.
const TEMPLATES: PopV2TemplateOption[] = [
  { id: 'pop-modern', label: '모던', desc: '깔끔한 기본형' },
  { id: 'pop-soft', label: '소프트', desc: '부드러운 색감' },
  { id: 'pop-pharmacy-pro', label: '약국 프로', desc: '상담·안내 중심' },
];

const notify = {
  success: (m: string) => toast.success(m),
  error: (m: string) => toast.error(m),
};

type View = { mode: 'list' } | { mode: 'edit'; documentId?: string };

export function StorePopV2Page() {
  // HUB / 자료함 / 상품 화면에서 "POP 만들기" 로 들어오면 곧바로 편집기로 진입한다.
  //   WO-O4O-POP-HUB-LIBRARY-HANDOFF-TO-V2-CANONICAL-V1
  const handoff = usePopV2Handoff();
  const [view, setView] = useState<View>(handoff ? { mode: 'edit' } : { mode: 'list' });

  if (view.mode === 'edit') {
    return (
      <StorePopV2EditorView
        api={popV2Api}
        notify={notify}
        accent={ACCENT}
        templates={TEMPLATES}
        defaultTemplateId={TEMPLATES[0].id}
        documentId={view.documentId}
        handoff={handoff}
        onBack={() => setView({ mode: 'list' })}
      />
    );
  }

  return (
    <StorePopV2ListView
      api={popV2Api}
      notify={notify}
      accent={ACCENT}
      onCreate={() => setView({ mode: 'edit' })}
      onEdit={(doc: PopV2Document) => setView({ mode: 'edit', documentId: doc.id })}
    />
  );
}

export default StorePopV2Page;
