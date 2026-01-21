/**
 * VaultNotesPage - 임시 보관
 *
 * Work Order: WO-O4O-ADMIN-VAULT-ACCESS-V1
 *
 * 콘텐츠는 다음 단계에서 정리
 */

import { StickyNote } from 'lucide-react';

export default function VaultNotesPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <StickyNote className="w-8 h-8 text-amber-500" />
          <h1 className="text-2xl font-bold text-white">Notes</h1>
        </div>
        <p className="text-slate-400">
          임시 보관
        </p>
      </div>

      {/* Empty State */}
      <div className="bg-slate-800 border border-dashed border-slate-600 rounded-xl p-12 text-center">
        <StickyNote className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500 text-lg mb-2">정리 예정</p>
        <p className="text-slate-600 text-sm">
          분류 대기 중인 문서가 임시 보관됩니다.
        </p>
      </div>
    </div>
  );
}
