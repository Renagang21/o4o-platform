/**
 * StorePopV2Page (K-Cosmetics adapter) — WO-O4O-KCOS-POP-V2-CANONICAL-ADOPTION-V1
 *
 * 화면 본체는 `@o4o/store-ui-core` 의 공통 POP V2 Core 다.
 * 이 파일은 accent / 템플릿 / notify / api 를 주입하고 목록↔편집 전환만 담당한다.
 * KPA / PH adapter 와 같은 Core 를 같은 방식으로 쓴다 — 서비스별 본체 복제 없음.
 *
 * 기존 `StorePopPage`(/store/marketing/pop) 는 그대로 둔다.
 * 과거 산출물 이력(store_execution_assets usage_type='pop')도 건드리지 않는다.
 */

import { useState } from 'react';
import { toast } from '@o4o/error-handling';
import {
  StorePopV2EditorView,
  StorePopV2ListView,
  type PopV2Document,
  type PopV2TemplateOption,
} from '@o4o/store-ui-core';
import { popV2Api } from '@/api/popV2';

// 기존 KCos POP 화면과 동일한 accent — 서비스 색을 새로 만들지 않는다.
const ACCENT = { color: '#db2777', softBg: '#fdf2f8' };

// 기존 POP 템플릿 id 를 그대로 쓴다 — 신규 어휘를 만들지 않는다.
const TEMPLATES: PopV2TemplateOption[] = [
  { id: 'pop-modern', label: '모던', desc: '헤드라인 강조, 미니멀' },
  { id: 'pop-soft', label: '소프트', desc: '부드러운 설명형' },
  { id: 'pop-pharmacy-pro', label: '매장 전문형', desc: '전문 매장 스타일' },
];

const notify = {
  success: (m: string) => toast.success(m),
  error: (m: string) => toast.error(m),
};

type View = { mode: 'list' } | { mode: 'edit'; documentId?: string };

export function StorePopV2Page() {
  const [view, setView] = useState<View>({ mode: 'list' });

  if (view.mode === 'edit') {
    return (
      <StorePopV2EditorView
        api={popV2Api}
        notify={notify}
        accent={ACCENT}
        templates={TEMPLATES}
        defaultTemplateId={TEMPLATES[0].id}
        documentId={view.documentId}
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
