/**
 * VaultDocsPage - 기존 설명서 이동 대상
 *
 * Work Order: WO-O4O-ADMIN-VAULT-ACCESS-V1
 *
 * 콘텐츠는 다음 단계에서 이동·정리
 */

import { FileText } from 'lucide-react';

export default function VaultDocsPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-8 h-8 text-amber-500" />
          <h1 className="text-2xl font-bold text-white">Docs</h1>
        </div>
        <p className="text-slate-400">
          기존 설명서 이동 대상
        </p>
      </div>

      {/* Empty State */}
      <div className="bg-slate-800 border border-dashed border-slate-600 rounded-xl p-12 text-center">
        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500 text-lg mb-2">정리 예정</p>
        <p className="text-slate-600 text-sm">
          기존 공개 설명서 중 설계 노출 가능성이 있는 문서가
          이곳으로 이동됩니다.
        </p>
      </div>
    </div>
  );
}
